import { getDb } from './mongodb';
import { Board } from '@/types/kanban';
import { BoardMember, BoardRole, ROLE_PERMISSIONS } from '@/types/team';
import { AuthContext, TenantUser } from '@/types/tenant';

/**
 * Check if user has access to a board
 * Returns the user's role if they have access, null otherwise
 * 
 * Access hierarchy:
 * 1. Tenant owner → owner role on all boards
 * 2. Tenant admin → editor role on all boards
 * 3. Tenant member → editor role on all boards
 * 4. Board member → their specific board role
 */
export async function getBoardAccess(
  boardId: string,
  context: AuthContext
): Promise<{ role: BoardRole; member: BoardMember | null } | null> {
  const db = await getDb();
  
  // Get the board first
  const board = await db.collection<Board>('boards').findOne({
    id: boardId,
  });
  
  if (!board) {
    return null;
  }
  
  // Check if user owns the board via tenant (the board belongs to user's active tenant)
  if (board.tenantId === context.tenantId) {
    // User is tenant owner - they have owner access to all boards
    return { role: 'owner', member: null };
  }
  
  // Check if user is a tenant member (workspace-wide access)
  if (context.userId) {
    const user = context.user || await db.collection<TenantUser>('users').findOne({
      id: context.userId,
    });
    
    if (user) {
      const tenantMembership = user.memberships.find(
        m => m.tenantId === board.tenantId
      );
      
      if (tenantMembership) {
        // Tenant members get editor access to all boards in the workspace
        // Owner gets owner role, admin/member get editor role
        if (tenantMembership.role === 'owner') {
          return { role: 'owner', member: null };
        } else {
          // Admin and member both get editor access to all boards
          return { role: 'editor', member: null };
        }
      }
    }
    
    // Check if user is a board member (individual board sharing)
    const member = await db.collection<BoardMember>('boardMembers').findOne({
      boardId,
      userId: context.userId,
    });
    
    if (member) {
      return { role: member.role, member };
    }
  }
  
  return null;
}

/**
 * Require board access with minimum role
 * Throws if user doesn't have access
 */
export async function requireBoardAccess(
  boardId: string,
  context: AuthContext,
  minRole: BoardRole = 'viewer'
): Promise<{ role: BoardRole; member: BoardMember | null }> {
  const access = await getBoardAccess(boardId, context);
  
  if (!access) {
    throw new BoardAccessError('Board not found or access denied', 404);
  }
  
  // Check if role has required permissions
  const permissions = ROLE_PERMISSIONS[access.role];
  const minPermissions = ROLE_PERMISSIONS[minRole];
  
  if (minRole === 'editor' && !permissions.canEdit) {
    throw new BoardAccessError('You do not have edit access to this board', 403);
  }
  
  if (minRole === 'owner' && !permissions.canManageMembers) {
    throw new BoardAccessError('Only board owners can perform this action', 403);
  }
  
  return access;
}

/**
 * Get board with access check
 */
export async function getBoardWithAccess(
  boardId: string,
  context: AuthContext,
  minRole: BoardRole = 'viewer'
): Promise<Board> {
  await requireBoardAccess(boardId, context, minRole);
  
  const db = await getDb();
  const board = await db.collection<Board>('boards').findOne({ id: boardId });
  
  if (!board) {
    throw new BoardAccessError('Board not found', 404);
  }
  
  return board;
}

/**
 * Board access error
 */
export class BoardAccessError extends Error {
  constructor(
    message: string,
    public status: number = 403
  ) {
    super(message);
    this.name = 'BoardAccessError';
  }
}
