import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth, AuthError } from '@/lib/tenant-auth';
import { requireBoardAccess, BoardAccessError } from '@/lib/board-access';
import { BoardMember, BoardInvitation, BoardTeamMember, AssignableUser } from '@/types/team';
import { TenantUser } from '@/types/tenant';

/**
 * GET /api/boards/[boardId]/members
 * List all members and pending invitations for a board
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { boardId } = await params;
    
    // Check access (any role can view members)
    const access = await requireBoardAccess(boardId, context, 'viewer');
    
    const db = await getDb();
    
    // Get board owner (tenant owner)
    const board = await db.collection('boards').findOne({ id: boardId });
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    // Get tenant owner info
    const tenant = await db.collection('tenants').findOne({ id: board.tenantId });
    const ownerUser = tenant 
      ? await db.collection<TenantUser>('users').findOne({ id: tenant.ownerId })
      : null;
    
    // Get all board members
    const members = await db
      .collection<BoardMember>('boardMembers')
      .find({ boardId })
      .sort({ addedAt: 1 })
      .toArray();
    
    // Get pending invitations
    const invitations = await db
      .collection<BoardInvitation>('boardInvitations')
      .find({ 
        boardId,
        acceptedAt: { $exists: false },
        declinedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .toArray();
    
    // Build unified response
    const teamMembers: BoardTeamMember[] = [];
    
    // Add board owner first
    if (ownerUser) {
      teamMembers.push({
        id: ownerUser.id,
        email: ownerUser.email,
        name: ownerUser.name,
        avatar: ownerUser.avatar,
        color: '#F97316', // Owner gets the Moltboard orange
        role: 'owner',
        status: 'active',
        addedAt: board.createdAt,
      });
    }
    
    // Add members
    for (const member of members) {
      teamMembers.push({
        id: member.userId,
        email: member.email,
        name: member.name,
        avatar: member.avatar,
        color: member.color,
        role: member.role,
        status: 'active',
        addedAt: member.addedAt,
      });
    }
    
    // Add pending invitations
    for (const invite of invitations) {
      teamMembers.push({
        id: invite.id,
        email: invite.email,
        name: invite.email.split('@')[0], // Use email prefix as placeholder name
        color: '#9CA3AF', // Gray for pending
        role: invite.role,
        status: 'pending',
        addedAt: invite.createdAt,
        invitationId: invite.id,
        expiresAt: invite.expiresAt,
      });
    }
    
    // Also return assignable users (for task assignment dropdown)
    const assignableUsers: AssignableUser[] = teamMembers
      .filter(m => m.status === 'active')
      .map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        avatar: m.avatar,
        color: m.color,
      }));
    
    return NextResponse.json({
      members: teamMembers,
      assignableUsers,
      currentUserRole: access.role,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BoardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching board members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}
