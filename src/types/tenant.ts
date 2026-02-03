import { ObjectId } from 'mongodb';

/**
 * Subscription plans
 */
export type PlanType = 'free' | 'pro' | 'team';

/**
 * API Key scopes
 */
export type ApiKeyScope = 
  | 'chat:read' 
  | 'chat:write' 
  | 'tasks:read' 
  | 'tasks:write'
  | 'boards:read'
  | 'boards:write';

/**
 * All scopes for reference
 */
export const ALL_SCOPES: ApiKeyScope[] = [
  'chat:read',
  'chat:write',
  'tasks:read',
  'tasks:write',
  'boards:read',
  'boards:write',
];

/**
 * Default scopes for new API keys
 */
export const DEFAULT_SCOPES: ApiKeyScope[] = [
  'chat:read',
  'chat:write',
  'tasks:read',
  'boards:read',
];

/**
 * Plan limits configuration
 */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxBoards: 3,
    maxTasksPerBoard: 50,
    maxMembers: 1,
    maxApiKeys: 1,
    maxAttachmentBytes: 0,
    maxAiMessagesPerMonth: 0, // BYOB only
  },
  pro: {
    maxBoards: 20,
    maxTasksPerBoard: 500,
    maxMembers: 1,
    maxApiKeys: 5,
    maxAttachmentBytes: 1024 * 1024 * 1024, // 1GB
    maxAiMessagesPerMonth: 3000, // ~100/day
  },
  team: {
    maxBoards: -1, // Unlimited
    maxTasksPerBoard: -1,
    maxMembers: 10,
    maxApiKeys: 20,
    maxAttachmentBytes: 10 * 1024 * 1024 * 1024, // 10GB
    maxAiMessagesPerMonth: -1, // Unlimited
  },
};

/**
 * Plan limits
 */
export interface PlanLimits {
  maxBoards: number;           // -1 = unlimited
  maxTasksPerBoard: number;
  maxMembers: number;
  maxApiKeys: number;
  maxAttachmentBytes: number;
  maxAiMessagesPerMonth: number;
}

/**
 * Usage tracking
 */
export interface TenantUsage {
  boards: number;
  tasks: number;
  attachmentBytes: number;
  aiMessagesThisMonth: number;
  apiKeys: number;
}

/**
 * Tenant (workspace)
 */
export interface Tenant {
  _id?: ObjectId;
  id: string;
  name: string;
  slug: string;                  // URL-friendly name
  ownerId: string;               // User who created it
  
  // Plan & billing
  plan: PlanType;
  planExpiresAt?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  
  // Usage tracking
  usage: TenantUsage;
  
  // Limits (from plan, can be overridden for special cases)
  limits: PlanLimits;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User with tenant memberships
 */
export interface TenantUser {
  _id?: ObjectId;
  id: string;
  email: string;
  name: string;
  avatar?: string;
  
  // Auth provider info
  provider: 'github' | 'google';
  providerId: string;
  
  // Tenant memberships
  memberships: TenantMembership[];
  
  // Currently active tenant
  activeTenantId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant membership role
 */
export type TenantRole = 'owner' | 'admin' | 'member';

/**
 * Tenant membership
 */
export interface TenantMembership {
  tenantId: string;
  role: TenantRole;
  joinedAt: Date;
}

/**
 * Tenant invitation - pending email invite to workspace
 */
export interface TenantInvitation {
  _id?: ObjectId;
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'member';  // Can't invite as owner
  token: string;             // Secure token for accept link
  expiresAt: Date;
  createdAt: Date;
  createdBy: string;         // User ID who sent invite
  acceptedAt?: Date;
  declinedAt?: Date;
}

/**
 * Tenant team member view for UI
 */
export interface TenantTeamMember {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: TenantRole;
  status: 'active' | 'pending';
  joinedAt: Date;
  // Only for pending
  invitationId?: string;
  expiresAt?: Date;
}

/**
 * Tenant role permissions
 */
export const TENANT_ROLE_PERMISSIONS: Record<TenantRole, {
  canManageMembers: boolean;
  canManageAdmins: boolean;
  canManageBilling: boolean;
  canDeleteWorkspace: boolean;
  canAccessAllBoards: boolean;
}> = {
  owner: {
    canManageMembers: true,
    canManageAdmins: true,
    canManageBilling: true,
    canDeleteWorkspace: true,
    canAccessAllBoards: true,
  },
  admin: {
    canManageMembers: true,
    canManageAdmins: false,
    canManageBilling: false,
    canDeleteWorkspace: false,
    canAccessAllBoards: true,
  },
  member: {
    canManageMembers: false,
    canManageAdmins: false,
    canManageBilling: false,
    canDeleteWorkspace: false,
    canAccessAllBoards: true,  // Access as editor
  },
};

/**
 * API Key (stored in DB)
 */
export interface TenantApiKey {
  _id?: ObjectId;
  id: string;
  tenantId: string;
  
  // Key info (actual key is hashed)
  keyHash: string;             // SHA-256 hash of the key
  keyPrefix: string;           // First 12 chars for display: "moltboard_sk_Fg4S..."
  
  // Metadata
  name: string;                // "My OpenClaw", "Production Bot"
  scopes: ApiKeyScope[];
  
  // Tracking
  lastUsedAt?: Date;
  lastUsedIp?: string;
  usageCount: number;
  
  // Lifecycle
  createdAt: Date;
  createdBy: string;           // User ID who created it
  expiresAt?: Date;            // Optional expiration
  revokedAt?: Date;            // Soft delete
}

/**
 * Auth context returned after validating API key or session
 */
export interface AuthContext {
  type: 'apiKey' | 'session';
  
  // Tenant info
  tenantId: string;
  tenant: Tenant;
  
  // User info (if session auth)
  userId?: string;
  user?: TenantUser;
  
  // API key info (if key auth)
  apiKeyId?: string;
  scopes?: ApiKeyScope[];
}

/**
 * Check if a scope is allowed
 */
export function hasScope(context: AuthContext, scope: ApiKeyScope): boolean {
  // Session auth has all scopes
  if (context.type === 'session') return true;
  
  // API key auth - check scopes
  return context.scopes?.includes(scope) ?? false;
}

/**
 * Check if limit is exceeded (-1 = unlimited)
 */
export function isLimitExceeded(current: number, limit: number): boolean {
  if (limit === -1) return false;
  return current >= limit;
}
