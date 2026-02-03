import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth, AuthError } from '@/lib/tenant-auth';
import { requireBoardAccess, BoardAccessError } from '@/lib/board-access';
import { BoardMember, BoardInvitation, BoardRole } from '@/types/team';

/**
 * PATCH /api/boards/[boardId]/members/[memberId]
 * Update a member's role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; memberId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { boardId, memberId } = await params;
    
    // Only owners can manage members
    await requireBoardAccess(boardId, context, 'owner');
    
    const { role } = await request.json();
    
    if (!role || !['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "editor" or "viewer"' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    
    const result = await db.collection<BoardMember>('boardMembers').findOneAndUpdate(
      { boardId, userId: memberId },
      { $set: { role: role as BoardRole } },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BoardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating member:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

/**
 * DELETE /api/boards/[boardId]/members/[memberId]
 * Remove a member from the board or cancel a pending invitation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; memberId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { boardId, memberId } = await params;
    
    // Only owners can remove members
    await requireBoardAccess(boardId, context, 'owner');
    
    const db = await getDb();
    
    // Try to delete as member first
    const memberResult = await db.collection<BoardMember>('boardMembers').deleteOne({
      boardId,
      userId: memberId,
    });
    
    if (memberResult.deletedCount > 0) {
      // Also unassign from any tasks
      await db.collection('tasks').updateMany(
        { boardId, assigneeId: memberId },
        { $unset: { assigneeId: '' } }
      );
      
      return NextResponse.json({ success: true, type: 'member' });
    }
    
    // Try to delete as invitation
    const inviteResult = await db.collection<BoardInvitation>('boardInvitations').deleteOne({
      boardId,
      id: memberId,
    });
    
    if (inviteResult.deletedCount > 0) {
      return NextResponse.json({ success: true, type: 'invitation' });
    }
    
    return NextResponse.json({ error: 'Member or invitation not found' }, { status: 404 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BoardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
