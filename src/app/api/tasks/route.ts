import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Task } from '@/types/kanban';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { logActivity, detectActor } from '@/lib/activity';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// GET tasks (optionally filtered by boardId)
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
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
    
    // Build query
    const query: Record<string, unknown> = {};
    if (boardId) query.boardId = boardId;
    
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
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST create new task
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
    const { title, description, columnId, boardId, labels, dueDate, priority } = await request.json();
    
    if (!title || !columnId || !boardId) {
      return NextResponse.json(
        { error: 'Title, columnId, and boardId are required' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    
    // Detect actor
    const apiKey = request.headers.get('x-api-key');
    const actor = detectActor(apiKey);
    
    // Get the highest order in this column
    const lastTask = await db
      .collection<Task>('tasks')
      .findOne({ columnId }, { sort: { order: -1 } });
    
    const order = lastTask ? lastTask.order + 1 : 0;
    
    const task: Task = {
      id: generateId('task'),
      title,
      description,
      columnId,
      boardId,
      order,
      labels: labels || [],
      priority: priority || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: actor,
    };
    
    await db.collection<Task>('tasks').insertOne(task);
    
    // Log activity
    await logActivity({
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
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
