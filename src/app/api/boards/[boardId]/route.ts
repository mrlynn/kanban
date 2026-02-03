import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Board } from '@/types/kanban';
import { requireAuth, requireScope, AuthError } from '@/lib/tenant-auth';
import { getBoardAccess, requireBoardAccess, BoardAccessError } from '@/lib/board-access';

// GET single board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { boardId } = await params;
    const db = await getDb();
    
    // Check if user has access (owner or member)
    const access = await getBoardAccess(boardId, context);
    
    if (!access) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    const board = await db.collection<Board>('boards').findOne({ id: boardId });
    
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    // Include user's role in response
    return NextResponse.json({ ...board, userRole: access.role });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BoardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching board:', error);
    return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}

// PATCH update board
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { boardId } = await params;
    
    // Only owners can update board settings
    await requireBoardAccess(boardId, context, 'owner');
    
    const updates = await request.json();
    const db = await getDb();
    
    // Don't allow updating tenantId
    delete updates.tenantId;
    
    const result = await db.collection<Board>('boards').findOneAndUpdate(
      { id: boardId },
      { 
        $set: { 
          ...updates,
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BoardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating board:', error);
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

// DELETE board
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { boardId } = await params;
    
    // Only owners can delete boards
    await requireBoardAccess(boardId, context, 'owner');
    
    const db = await getDb();
    
    const board = await db.collection<Board>('boards').findOne({ id: boardId });
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    // Delete board
    await db.collection<Board>('boards').deleteOne({ id: boardId });
    
    // Delete all tasks in this board
    const taskResult = await db.collection('tasks').deleteMany({ boardId });
    
    // Delete all activities for this board
    await db.collection('activities').deleteMany({ boardId });
    
    // Delete all chat messages for this board
    await db.collection('chatMessages').deleteMany({ boardId });
    
    // Delete all board members
    await db.collection('boardMembers').deleteMany({ boardId });
    
    // Delete all board invitations
    await db.collection('boardInvitations').deleteMany({ boardId });
    
    // Update tenant usage
    await db.collection('tenants').updateOne(
      { id: board.tenantId },
      { 
        $inc: { 
          'usage.boards': -1,
          'usage.tasks': -taskResult.deletedCount
        } 
      }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BoardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error deleting board:', error);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
