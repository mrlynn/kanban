import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Task } from '@/types/kanban';
import { requireAuth, requireScope, AuthError } from '@/lib/tenant-auth';
import { getBoardAccess, requireBoardAccess, BoardAccessError } from '@/lib/board-access';
import { logActivity } from '@/lib/activity';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// GET tasks (optionally filtered by boardId)
export async function GET(request: NextRequest) {
  try {
    const context = await requireAuth(request);
    
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const archivedOnly = searchParams.get('archivedOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '0', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Search & Filter params
    const q = searchParams.get('q');
    const label = searchParams.get('label');
    const assignee = searchParams.get('assignee');
    const priority = searchParams.get('priority');
    const overdue = searchParams.get('overdue');
    const hasDueDate = searchParams.get('hasDueDate');
    
    const db = await getDb();
    
    // Build base query
    const query: Record<string, unknown> = {};
    
    // If boardId provided, check board access
    if (boardId) {
      const access = await getBoardAccess(boardId, context);
      if (!access) {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      }
      query.boardId = boardId;
    } else {
      // No boardId - return tasks from user's tenant only
      query.tenantId = context.tenantId;
    }
    
    // Text search (title and description)
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    
    // Filter by label
    if (label) {
      query.labels = label;
    }
    
    // Filter by assignee
    if (assignee) {
      query.assigneeId = assignee;
    }
    
    // Filter by priority
    if (priority) {
      query.priority = priority;
    }
    
    // Filter overdue tasks
    if (overdue === 'true') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      query.dueDate = { $lt: now };
    }
    
    // Filter tasks with due dates
    if (hasDueDate === 'true') {
      query.dueDate = { $exists: true, $ne: null };
    } else if (hasDueDate === 'false') {
      query.$or = [{ dueDate: { $exists: false } }, { dueDate: null }];
    }
    
    // Archive filtering (must be combined carefully with $or)
    const archiveCondition = archivedOnly
      ? { archived: true }
      : !includeArchived
      ? { $or: [{ archived: { $exists: false } }, { archived: false }] }
      : {};
    
    // Merge archive condition
    if (archiveCondition.$or && query.$or) {
      // Need $and to combine multiple $or conditions
      const textOr = query.$or;
      delete query.$or;
      query.$and = [{ $or: textOr }, archiveCondition];
    } else if (archiveCondition.$or) {
      query.$or = archiveCondition.$or;
    } else if (archiveCondition.archived !== undefined) {
      query.archived = archiveCondition.archived;
    }
    
    let cursor = db
      .collection<Task>('tasks')
      .find(query)
      .sort({ order: 1 });
    
    // Pagination
    if (offset > 0) cursor = cursor.skip(offset);
    if (limit > 0) cursor = cursor.limit(limit);
    
    const tasks = await cursor.toArray();
    
    // Get total count for pagination
    const total = await db.collection<Task>('tasks').countDocuments(query);
    
    // Return with pagination metadata if limit was specified
    if (limit > 0) {
      return NextResponse.json({
        tasks,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + tasks.length < total,
        },
      });
    }
    
    return NextResponse.json(tasks);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BoardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST create new task
export async function POST(request: NextRequest) {
  try {
    const context = await requireAuth(request);
    
    const { title, description, columnId, boardId, labels, dueDate, priority, assigneeId } = await request.json();
    
    if (!title || !columnId || !boardId) {
      return NextResponse.json(
        { error: 'Title, columnId, and boardId are required' },
        { status: 400 }
      );
    }
    
    // Check board access - need editor role to create tasks
    const access = await requireBoardAccess(boardId, context, 'editor');
    
    const db = await getDb();
    
    // Get the board to get its tenantId
    const board = await db.collection('boards').findOne({ id: boardId });
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    // Detect actor - for now, use 'mike' for session auth and 'api' for API keys
    // TODO: Support dynamic user actors when we have proper user IDs
    const actor = context.type === 'apiKey' ? 'api' : 'mike';
    
    // Get the highest order in this column
    const lastTask = await db
      .collection<Task>('tasks')
      .findOne(
        { boardId, columnId }, 
        { sort: { order: -1 } }
      );
    
    const order = lastTask ? lastTask.order + 1 : 0;
    
    const task: Task = {
      id: generateId('task'),
      tenantId: board.tenantId, // Use board's tenant, not user's tenant
      title,
      description,
      columnId,
      boardId,
      order,
      labels: labels || [],
      priority: priority || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assigneeId: assigneeId || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: actor,
    };
    
    await db.collection<Task>('tasks').insertOne(task);
    
    // Update tenant usage (board owner's tenant)
    await db.collection('tenants').updateOne(
      { id: board.tenantId },
      { $inc: { 'usage.tasks': 1 } }
    );
    
    // Log activity
    await logActivity({
      tenantId: board.tenantId,
      taskId: task.id,
      boardId,
      action: 'created',
      actor,
      details: {
        note: title,
      },
    });
    
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BoardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
