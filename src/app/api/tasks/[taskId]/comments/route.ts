import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { TaskComment, Task } from '@/types/kanban';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import { logActivity } from '@/lib/activity';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// GET comments for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const context = await requireScope(request, 'tasks:read');
    const { taskId } = await params;
    const db = await getDb();
    
    const comments = await db
      .collection<TaskComment>('comments')
      .find({ tenantId: context.tenantId, taskId })
      .sort({ createdAt: 1 })
      .toArray();
    
    return NextResponse.json(comments);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST create new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const context = await requireScope(request, 'tasks:write');
    const { taskId } = await params;
    const { content } = await request.json();
    
    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    
    // Get task to find boardId and verify tenant
    const task = await db.collection<Task>('tasks').findOne({ 
      id: taskId,
      tenantId: context.tenantId 
    });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Detect actor
    const actor = context.type === 'apiKey' ? 'api' : 'mike';
    
    const comment: TaskComment = {
      id: generateId('cmt'),
      tenantId: context.tenantId,
      taskId,
      boardId: task.boardId,
      author: actor,
      content: content.trim(),
      createdAt: new Date(),
    };
    
    await db.collection<TaskComment>('comments').insertOne(comment);
    
    // Log activity
    await logActivity({
      tenantId: context.tenantId,
      taskId,
      boardId: task.boardId,
      action: 'commented',
      actor,
      details: {
        note: content.length > 100 ? content.substring(0, 100) + '...' : content,
      },
    });
    
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
