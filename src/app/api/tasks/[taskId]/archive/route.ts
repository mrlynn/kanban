import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Task } from '@/types/kanban';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import { logActivity } from '@/lib/activity';

// POST archive a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const context = await requireScope(request, 'tasks:write');
    const { taskId } = await params;
    const db = await getDb();
    
    // Detect actor
    const actor = context.type === 'apiKey' ? 'api' : 'mike';
    
    // Get current task - verify tenant
    const task = await db.collection<Task>('tasks').findOne({ 
      id: taskId,
      tenantId: context.tenantId 
    });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    if (task.archived) {
      return NextResponse.json({ error: 'Task is already archived' }, { status: 400 });
    }
    
    // Archive the task
    const result = await db.collection<Task>('tasks').findOneAndUpdate(
      { id: taskId, tenantId: context.tenantId },
      {
        $set: {
          archived: true,
          archivedAt: new Date(),
          archivedBy: actor,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to archive task' }, { status: 500 });
    }
    
    // Log activity
    await logActivity({
      tenantId: context.tenantId,
      taskId,
      boardId: task.boardId,
      action: 'archived',
      actor,
      details: {
        note: task.title,
      },
    });
    
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error archiving task:', error);
    return NextResponse.json({ error: 'Failed to archive task' }, { status: 500 });
  }
}

// DELETE restore a task (un-archive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const context = await requireScope(request, 'tasks:write');
    const { taskId } = await params;
    const db = await getDb();
    
    // Detect actor
    const actor = context.type === 'apiKey' ? 'api' : 'mike';
    
    // Get current task - verify tenant
    const task = await db.collection<Task>('tasks').findOne({ 
      id: taskId,
      tenantId: context.tenantId 
    });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    if (!task.archived) {
      return NextResponse.json({ error: 'Task is not archived' }, { status: 400 });
    }
    
    // Restore the task
    const result = await db.collection<Task>('tasks').findOneAndUpdate(
      { id: taskId, tenantId: context.tenantId },
      {
        $set: {
          archived: false,
          updatedAt: new Date(),
        },
        $unset: {
          archivedAt: '',
          archivedBy: '',
        },
      },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to restore task' }, { status: 500 });
    }
    
    // Log activity
    await logActivity({
      tenantId: context.tenantId,
      taskId,
      boardId: task.boardId,
      action: 'restored',
      actor,
      details: {
        note: task.title,
      },
    });
    
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error restoring task:', error);
    return NextResponse.json({ error: 'Failed to restore task' }, { status: 500 });
  }
}
