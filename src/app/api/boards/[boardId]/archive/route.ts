import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Task, TaskActivity } from '@/types/kanban';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { detectActor } from '@/lib/activity';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// POST bulk archive tasks in a column
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
    const { boardId } = await params;
    const { columnId } = await request.json();
    
    if (!columnId) {
      return NextResponse.json({ error: 'columnId is required' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Detect actor
    const apiKey = request.headers.get('x-api-key');
    const actor = detectActor(apiKey);
    
    // Find all non-archived tasks in the column
    const tasksToArchive = await db
      .collection<Task>('tasks')
      .find({
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
      { id: { $in: taskIds } },
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
    console.error('Error bulk archiving tasks:', error);
    return NextResponse.json({ error: 'Failed to archive tasks' }, { status: 500 });
  }
}

// GET archived tasks count for a board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
    const { boardId } = await params;
    const db = await getDb();
    
    const count = await db.collection<Task>('tasks').countDocuments({
      boardId,
      archived: true,
    });
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error getting archived count:', error);
    return NextResponse.json({ error: 'Failed to get archived count' }, { status: 500 });
  }
}
