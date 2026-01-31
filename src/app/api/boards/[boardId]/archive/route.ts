import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Task, TaskActivity } from '@/types/kanban';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// POST bulk archive tasks in a column
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const context = await requireScope(request, 'tasks:write');
    const { boardId } = await params;
    const { columnId } = await request.json();
    
    if (!columnId) {
      return NextResponse.json({ error: 'columnId is required' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Verify board belongs to tenant
    const board = await db.collection('boards').findOne({
      id: boardId,
      tenantId: context.tenantId
    });
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    // Detect actor
    const actor = context.type === 'apiKey' ? 'api' : 'mike';
    
    // Find all non-archived tasks in the column
    const tasksToArchive = await db
      .collection<Task>('tasks')
      .find({
        tenantId: context.tenantId,
        boardId,
        columnId,
        $or: [{ archived: { $exists: false } }, { archived: false }],
      })
      .toArray();
    
    if (tasksToArchive.length === 0) {
      return NextResponse.json({ message: 'No tasks to archive', count: 0 });
    }
    
    const now = new Date();
    const taskIds = tasksToArchive.map((t) => t.id);
    
    // Bulk archive
    await db.collection<Task>('tasks').updateMany(
      { tenantId: context.tenantId, id: { $in: taskIds } },
      {
        $set: {
          archived: true,
          archivedAt: now,
          archivedBy: actor,
          updatedAt: now,
        },
      }
    );
    
    // Bulk log activities
    const activities: TaskActivity[] = tasksToArchive.map((task) => ({
      id: generateId('act'),
      tenantId: context.tenantId,
      taskId: task.id,
      boardId,
      action: 'archived' as const,
      actor,
      timestamp: now,
      details: {
        note: `Bulk archived: ${task.title}`,
      },
    }));
    
    await db.collection<TaskActivity>('activities').insertMany(activities);
    
    return NextResponse.json({
      message: `Archived ${tasksToArchive.length} tasks`,
      count: tasksToArchive.length,
      taskIds,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error bulk archiving tasks:', error);
    return NextResponse.json({ error: 'Failed to archive tasks' }, { status: 500 });
  }
}

// GET archived tasks count for a board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const context = await requireScope(request, 'tasks:read');
    const { boardId } = await params;
    const db = await getDb();
    
    const count = await db.collection<Task>('tasks').countDocuments({
      tenantId: context.tenantId,
      boardId,
      archived: true,
    });
    
    return NextResponse.json({ count });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error getting archived count:', error);
    return NextResponse.json({ error: 'Failed to get archived count' }, { status: 500 });
  }
}
