import { ObjectId } from 'mongodb';

/**
 * Board member roles
 */
export type BoardRole = 'owner' | 'editor' | 'viewer';

/**
 * Board member - tracks who has access to a specific board
 */
export interface BoardMember {
  _id?: ObjectId;
  id: string;
  boardId: string;
  tenantId: string;
  userId: string;           // TenantUser.id
  email: string;            // Denormalized for display
  name: string;             // Denormalized for display
  avatar?: string;
  role: BoardRole;
  color: string;            // For avatar/assignee display
  addedAt: Date;
  addedBy: string;          // User ID who added them
}

/**
 * Board invitation - pending email invite
 */
export interface BoardInvitation {
  _id?: ObjectId;
  id: string;
  boardId: string;
  tenantId: string;
  email: string;
  role: 'editor' | 'viewer';
  token: string;            // Secure token for accept link
  expiresAt: Date;
  createdAt: Date;
  createdBy: string;        // User ID who sent invite
  acceptedAt?: Date;
  declinedAt?: Date;
}

/**
 * Combined view for UI - shows both members and pending invites
 */
export interface BoardTeamMember {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  color: string;
  role: BoardRole | 'editor' | 'viewer';
  status: 'active' | 'pending';
  addedAt: Date;
  // Only for pending
  invitationId?: string;
  expiresAt?: Date;
}

/**
 * User info for task assignment (replaces hardcoded USERS)
 */
export interface AssignableUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
}

/**
 * Role permissions
 */
export const ROLE_PERMISSIONS: Record<BoardRole, {
  canView: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  canDelete: boolean;
}> = {
  owner: {
    canView: true,
    canEdit: true,
    canManageMembers: true,
    canDelete: true,
  },
  editor: {
    canView: true,
    canEdit: true,
    canManageMembers: false,
    canDelete: false,
  },
  viewer: {
    canView: true,
    canEdit: false,
    canManageMembers: false,
    canDelete: false,
  },
};

/**
 * Generate a random color for new members
 */
export function generateMemberColor(): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
    '#14B8A6', // teal
    '#6366F1', // indigo
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
