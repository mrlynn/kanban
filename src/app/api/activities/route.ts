import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { TaskActivity, TaskComment, Task } from '@/types/kanban';
import { requireScope, AuthError } from '@/lib/tenant-auth';

/**
 * Global Activity Feed
 * 
 * GET /api/activities - Fetch recent activities across all boards for tenant
 * 
 * Query params:
 *   - since: ISO timestamp to fetch activities after (for polling)
 *   - limit: Max activities to return (default 50)
 *   - boardId: Filter to specific board
 *   - includeComments: Include comments in feed (default true)
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireScope(request, 'tasks:read');
    
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const boardId = searchParams.get('boardId');
    const includeComments = searchParams.get('includeComments') !== 'false';

    const db = await getDb();
    
    // Build query - always filter by tenant
    const activityQuery: Record<string, unknown> = { tenantId: context.tenantId };
    const commentQuery: Record<string, unknown> = { tenantId: context.tenantId };
    
    if (since) {
      const sinceDate = new Date(since);
      activityQuery.timestamp = { $gt: sinceDate };
      commentQuery.createdAt = { $gt: sinceDate };
    }
    
    if (boardId) {
      activityQuery.boardId = boardId;
      commentQuery.boardId = boardId;
    }

    // Fetch activities
    const activities = await db
      .collection<TaskActivity>('activities')
      .find(activityQuery)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    // Fetch comments if requested
    let comments: TaskComment[] = [];
    if (includeComments) {
      comments = await db
        .collection<TaskComment>('comments')
        .find(commentQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    }

    // Get task titles for context
    const taskIdSet = new Set<string>();
    activities.forEach(a => taskIdSet.add(a.taskId));
    comments.forEach(c => taskIdSet.add(c.taskId));
    const taskIds = Array.from(taskIdSet);
    
    const tasks = await db
      .collection<Task>('tasks')
      .find({ tenantId: context.tenantId, id: { $in: taskIds } })
      .project<{ id: string; title: string }>({ id: 1, title: 1 })
      .toArray();
    
    const taskTitleMap: Record<string, string> = {};
    for (const t of tasks) {
      taskTitleMap[t.id] = t.title;
    }

    // Combine and sort by timestamp
    const feed = [
      ...activities.map(a => ({
        type: 'activity' as const,
        id: a.id,
        taskId: a.taskId,
        taskTitle: taskTitleMap[a.taskId] || 'Unknown Task',
        boardId: a.boardId,
        action: a.action,
        actor: a.actor,
        details: a.details,
        timestamp: a.timestamp,
      })),
      ...comments.map(c => ({
        type: 'comment' as const,
        id: c.id,
        taskId: c.taskId,
        taskTitle: taskTitleMap[c.taskId] || 'Unknown Task',
        boardId: c.boardId,
        action: 'commented' as const,
        actor: c.author,
        details: { note: c.content },
        timestamp: c.createdAt,
      })),
    ].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, limit);

    return NextResponse.json({
      feed,
      meta: {
        count: feed.length,
        since: since || null,
        latestTimestamp: feed[0]?.timestamp || null,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching global activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
