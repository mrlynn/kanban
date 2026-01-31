import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getDb } from './mongodb';
import { createHash, randomBytes } from 'crypto';
import { 
  AuthContext, 
  Tenant, 
  TenantUser, 
  TenantApiKey, 
  ApiKeyScope,
  DEFAULT_SCOPES,
  PLAN_LIMITS,
  hasScope,
} from '@/types/tenant';

/**
 * Generate a new API key
 * Returns the raw key (only shown once) and the key object for storage
 */
export async function generateApiKey(
  tenantId: string,
  createdBy: string,
  name: string,
  scopes: ApiKeyScope[] = DEFAULT_SCOPES
): Promise<{ rawKey: string; apiKey: TenantApiKey }> {
  const rawKey = `moltboard_sk_${randomBytes(32).toString('base64url')}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 20) + '...';
  
  const apiKey: TenantApiKey = {
    id: `key_${randomBytes(8).toString('hex')}`,
    tenantId,
    keyHash,
    keyPrefix,
    name,
    scopes,
    usageCount: 0,
    createdAt: new Date(),
    createdBy,
  };
  
  return { rawKey, apiKey };
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Validate an API key and return auth context
 */
async function validateApiKey(key: string): Promise<AuthContext | null> {
  const db = await getDb();
  const keyHash = hashApiKey(key);
  
  // Find the API key
  const apiKey = await db.collection<TenantApiKey>('apiKeys').findOne({
    keyHash,
    revokedAt: { $exists: false },
  });
  
  if (!apiKey) return null;
  
  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }
  
  // Get the tenant
  const tenant = await db.collection<Tenant>('tenants').findOne({
    id: apiKey.tenantId,
  });
  
  if (!tenant) return null;
  
  // Update last used
  await db.collection<TenantApiKey>('apiKeys').updateOne(
    { id: apiKey.id },
    { 
      $set: { lastUsedAt: new Date() },
      $inc: { usageCount: 1 },
    }
  );
  
  return {
    type: 'apiKey',
    tenantId: tenant.id,
    tenant,
    apiKeyId: apiKey.id,
    scopes: apiKey.scopes,
  };
}

/**
 * Validate session and return auth context
 */
async function validateSession(request: NextRequest): Promise<AuthContext | null> {
  const token = await getToken({ req: request });
  if (!token?.email) return null;
  
  const db = await getDb();
  
  // Find user
  const user = await db.collection<TenantUser>('users').findOne({
    email: token.email,
  });
  
  if (!user) {
    // Auto-create user and tenant on first login
    return await createUserWithTenant(token.email, token.name as string, token.picture as string);
  }
  
  // Get active tenant
  const tenantId = user.activeTenantId || user.memberships[0]?.tenantId;
  if (!tenantId) return null;
  
  const tenant = await db.collection<Tenant>('tenants').findOne({ id: tenantId });
  if (!tenant) return null;
  
  return {
    type: 'session',
    tenantId: tenant.id,
    tenant,
    userId: user.id,
    user,
  };
}

/**
 * Create a new user with their own tenant (first-time login)
 */
async function createUserWithTenant(
  email: string, 
  name: string,
  avatar?: string
): Promise<AuthContext> {
  const db = await getDb();
  
  const userId = `user_${randomBytes(8).toString('hex')}`;
  const tenantId = `tenant_${randomBytes(8).toString('hex')}`;
  const now = new Date();
  
  // Create tenant with free plan
  const tenant: Tenant = {
    id: tenantId,
    name: `${name}'s Workspace`,
    slug: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'),
    ownerId: userId,
    plan: 'free',
    usage: {
      boards: 0,
      tasks: 0,
      attachmentBytes: 0,
      aiMessagesThisMonth: 0,
      apiKeys: 0,
    },
    limits: PLAN_LIMITS.free,
    createdAt: now,
    updatedAt: now,
  };
  
  // Create user
  const user: TenantUser = {
    id: userId,
    email,
    name: name || email.split('@')[0],
    avatar,
    provider: 'google', // Could detect from token
    providerId: email,
    memberships: [{
      tenantId,
      role: 'owner',
      joinedAt: now,
    }],
    activeTenantId: tenantId,
    createdAt: now,
    updatedAt: now,
  };
  
  await db.collection<Tenant>('tenants').insertOne(tenant);
  await db.collection<TenantUser>('users').insertOne(user);
  
  return {
    type: 'session',
    tenantId,
    tenant,
    userId,
    user,
  };
}

/**
 * Main auth function - validates request and returns context
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  // Check for API key first
  const apiKey = request.headers.get('x-api-key') || 
                 request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (apiKey?.startsWith('moltboard_sk_')) {
    return await validateApiKey(apiKey);
  }
  
  // Fall back to legacy single API key (for backwards compatibility during migration)
  const legacyKey = process.env.KANBAN_API_KEY?.trim();
  if (apiKey && legacyKey && apiKey === legacyKey) {
    // Return a default context for legacy key
    // This should be migrated to tenant keys
    const db = await getDb();
    const tenant = await db.collection<Tenant>('tenants').findOne({});
    if (tenant) {
      return {
        type: 'apiKey',
        tenantId: tenant.id,
        tenant,
        scopes: ['chat:read', 'chat:write', 'tasks:read', 'tasks:write', 'boards:read', 'boards:write'],
      };
    }
  }
  
  // Fall back to session
  return await validateSession(request);
}

/**
 * Require auth - throws if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const context = await getAuthContext(request);
  if (!context) {
    throw new AuthError('Unauthorized', 401);
  }
  return context;
}

/**
 * Require specific scope
 */
export async function requireScope(
  request: NextRequest, 
  scope: ApiKeyScope
): Promise<AuthContext> {
  const context = await requireAuth(request);
  if (!hasScope(context, scope)) {
    throw new AuthError(`Missing required scope: ${scope}`, 403);
  }
  return context;
}

/**
 * Auth error class
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return Response.json({ error: message }, { status: 401 });
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message = 'Forbidden') {
  return Response.json({ error: message }, { status: 403 });
}
