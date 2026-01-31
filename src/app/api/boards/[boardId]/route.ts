import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Board } from '@/types/kanban';
import { requireScope, AuthError } from '@/lib/tenant-auth';

// GET single board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const context = await requireScope(request, 'boards:read');
    const { boardId } = await params;
    const db = await getDb();
    
    const board = await db.collection<Board>('boards').findOne({ 
      id: boardId,
      tenantId: context.tenantId 
    });
    
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    return NextResponse.json(board);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
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
    const context = await requireScope(request, 'boards:write');
    const { boardId } = await params;
    const updates = await request.json();
    const db = await getDb();
    
    // Don't allow updating tenantId
    delete updates.tenantId;
    
    const result = await db.collection<Board>('boards').findOneAndUpdate(
      { id: boardId, tenantId: context.tenantId },
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
      return Response.json({ error: error.message }, { status: error.status });
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
    const context = await requireScope(request, 'boards:write');
    const { boardId } = await params;
    const db = await getDb();
    
    // Verify board belongs to tenant
    const board = await db.collection<Board>('boards').findOne({
      id: boardId,
      tenantId: context.tenantId
    });
    
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    // Delete board
    await db.collection<Board>('boards').deleteOne({ 
      id: boardId, 
      tenantId: context.tenantId 
    });
    
    // Delete all tasks in this board
    const taskResult = await db.collection('tasks').deleteMany({ 
      boardId, 
      tenantId: context.tenantId 
    });
    
    // Delete all activities for this board
    await db.collection('activities').deleteMany({ 
      boardId, 
      tenantId: context.tenantId 
    });
    
    // Delete all chat messages for this board
    await db.collection('chatMessages').deleteMany({ 
      boardId, 
      tenantId: context.tenantId 
    });
    
    // Update tenant usage
    await db.collection('tenants').updateOne(
      { id: context.tenantId },
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
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error deleting board:', error);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
