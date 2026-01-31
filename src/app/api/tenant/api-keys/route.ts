import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { 
  requireAuth, 
  generateApiKey, 
  AuthError,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/tenant-auth';
import { TenantApiKey, ApiKeyScope, DEFAULT_SCOPES, isLimitExceeded } from '@/types/tenant';

/**
 * GET /api/tenant/api-keys
 * List all API keys for the current tenant (keys are masked)
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireAuth(request);
    
    // Only session auth can manage keys
    if (context.type !== 'session') {
      return forbiddenResponse('API keys cannot be managed via API key auth');
    }
    
    const db = await getDb();
    
    const keys = await db.collection<TenantApiKey>('apiKeys')
      .find({
        tenantId: context.tenantId,
        revokedAt: { $exists: false },
      })
      .sort({ createdAt: -1 })
      .toArray();
    
    // Mask the keys (only show prefix)
    const maskedKeys = keys.map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
      createdAt: key.createdAt,
      createdBy: key.createdBy,
      expiresAt: key.expiresAt,
    }));
    
    return NextResponse.json({
      success: true,
      keys: maskedKeys,
      limits: {
        used: keys.length,
        max: context.tenant.limits.maxApiKeys,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listing API keys:', error);
    return Response.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}

/**
 * POST /api/tenant/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireAuth(request);
    
    // Only session auth can create keys
    if (context.type !== 'session') {
      return forbiddenResponse('API keys cannot be created via API key auth');
    }
    
    const db = await getDb();
    
    // Check limit
    const currentCount = await db.collection<TenantApiKey>('apiKeys').countDocuments({
      tenantId: context.tenantId,
      revokedAt: { $exists: false },
    });
    
    if (isLimitExceeded(currentCount, context.tenant.limits.maxApiKeys)) {
      return Response.json({
        error: 'API key limit reached',
        limit: context.tenant.limits.maxApiKeys,
        upgrade: context.tenant.plan === 'free' 
          ? 'Upgrade to Pro for up to 5 API keys'
          : context.tenant.plan === 'pro'
          ? 'Upgrade to Team for up to 20 API keys'
          : null,
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const name = body.name?.trim() || 'API Key';
    const scopes: ApiKeyScope[] = body.scopes || DEFAULT_SCOPES;
    const expiresInDays = body.expiresInDays; // Optional
    
    // Generate the key
    const { rawKey, apiKey } = await generateApiKey(
      context.tenantId,
      context.userId!,
      name,
      scopes
    );
    
    // Set expiration if requested
    if (expiresInDays && expiresInDays > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      apiKey.expiresAt = expiresAt;
    }
    
    // Store in database
    await db.collection<TenantApiKey>('apiKeys').insertOne(apiKey);
    
    // Update usage
    await db.collection('tenants').updateOne(
      { id: context.tenantId },
      { 
        $inc: { 'usage.apiKeys': 1 },
        $set: { updatedAt: new Date() },
      }
    );
    
    // Return the raw key (only time it's shown!)
    return NextResponse.json({
      success: true,
      message: '⚠️ Save this key now! It will not be shown again.',
      key: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey,  // Only returned on creation!
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      setup: {
        instructions: 'Add this to your Clawdbot config:',
        config: {
          channels: {
            moltboard: {
              enabled: true,
              apiUrl: 'https://moltboard.app',
              apiKey: rawKey,
            },
          },
        },
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating API key:', error);
    return Response.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
