import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Task, TaskActivity } from '@/types/kanban';
import { requireScope, AuthError } from '@/lib/tenant-auth';

interface MetricsResponse {
  velocity: {
    daily: { date: string; completed: number }[];
    weeklyAverage: number;
    trend: 'up' | 'down' | 'stable';
  };
  tasksByPriority: Record<string, number>;
  tasksByColumn: Record<string, { count: number; title: string }>;
  overdue: Task[];
  stuck: Task[];
  recentCompletions: Task[];
  summary: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    archived: number;
    avgCycleTimeHours: number | null;
  };
  health: {
    score: number; // 0-100
    issues: string[];
  };
}

// GET /api/metrics?boardId=xxx&range=7d|14d|30d
export async function GET(request: NextRequest) {
  try {
    const context = await requireScope(request, 'tasks:read');

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const range = searchParams.get('range') || '7d';

    const db = await getDb();

    // Parse range
    const rangeDays = parseInt(range.replace('d', ''), 10) || 7;
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - rangeDays);
    rangeStart.setHours(0, 0, 0, 0);

    // Base query - tenant + optional board filter
    const baseQuery: Record<string, unknown> = { tenantId: context.tenantId };
    if (boardId) baseQuery.boardId = boardId;

    // Get all tasks (non-archived) for counts
    const allTasks = await db
      .collection<Task>('tasks')
      .find({
        ...baseQuery,
        $or: [{ archived: { $exists: false } }, { archived: false }],
      })
      .toArray();

    // Get boards for column info
    const boards = await db
      .collection('boards')
      .find({ tenantId: context.tenantId, ...(boardId ? { id: boardId } : {}) })
      .toArray();

    const columnMap = new Map<string, { title: string; order: number }>();
    for (const board of boards) {
      for (const col of board.columns || []) {
        columnMap.set(col.id, { title: col.title, order: col.order });
      }
    }

    // Tasks by column - aggregate by title (not ID) to handle multiple boards
    const tasksByColumnTitle: Record<string, { count: number; title: string }> = {};
    for (const task of allTasks) {
      const colInfo = columnMap.get(task.columnId);
      const title = colInfo?.title || 'Unknown';
      const normalizedTitle = title.trim();
      
      if (!tasksByColumnTitle[normalizedTitle]) {
        tasksByColumnTitle[normalizedTitle] = {
          count: 0,
          title: normalizedTitle,
        };
      }
      tasksByColumnTitle[normalizedTitle].count++;
    }
    
    // Use title as key for cleaner output
    const tasksByColumn = tasksByColumnTitle;

    // Tasks by priority
    const tasksByPriority: Record<string, number> = { p0: 0, p1: 0, p2: 0, p3: 0, none: 0 };
    for (const task of allTasks) {
      const priority = task.priority || 'none';
      tasksByPriority[priority] = (tasksByPriority[priority] || 0) + 1;
    }

    // Overdue tasks (due date in past, not in Done column)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const doneColumnIds = Array.from(columnMap.entries())
      .filter(([, info]) => info.title.toLowerCase().includes('done'))
      .map(([id]) => id);

    const overdue = allTasks.filter((t) => {
      if (!t.dueDate) return false;
      if (doneColumnIds.includes(t.columnId)) return false;
      return new Date(t.dueDate) < today;
    });

    // Stuck tasks (in progress > 3 days)
    const inProgressColumnIds = Array.from(columnMap.entries())
      .filter(([, info]) => 
        info.title.toLowerCase().includes('progress') ||
        info.title.toLowerCase().includes('doing')
      )
      .map(([id]) => id);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const stuck = allTasks.filter((t) => {
      if (!inProgressColumnIds.includes(t.columnId)) return false;
      return new Date(t.updatedAt) < threeDaysAgo;
    });

    // Velocity - tasks completed per day
    const completionActivities = await db
      .collection<TaskActivity>('activities')
      .find({
        tenantId: context.tenantId,
        action: 'moved',
        'details.to': { $in: doneColumnIds.map(id => columnMap.get(id)?.title).filter(Boolean) },
        timestamp: { $gte: rangeStart },
        ...(boardId ? { boardId } : {}),
      })
      .sort({ timestamp: 1 })
      .toArray();

    // Group by date
    const dailyVelocity: { date: string; completed: number }[] = [];
    const velocityMap = new Map<string, number>();

    for (let i = 0; i < rangeDays; i++) {
      const date = new Date(rangeStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      velocityMap.set(dateStr, 0);
    }

    for (const activity of completionActivities) {
      const dateStr = new Date(activity.timestamp).toISOString().split('T')[0];
      velocityMap.set(dateStr, (velocityMap.get(dateStr) || 0) + 1);
    }

    Array.from(velocityMap.entries()).forEach(([date, completed]) => {
      dailyVelocity.push({ date, completed });
    });

    // Calculate weekly average and trend
    const totalCompleted = dailyVelocity.reduce((sum, d) => sum + d.completed, 0);
    const weeklyAverage = totalCompleted / (rangeDays / 7);

    // Trend: compare first half vs second half
    const midpoint = Math.floor(dailyVelocity.length / 2);
    const firstHalf = dailyVelocity.slice(0, midpoint).reduce((s, d) => s + d.completed, 0);
    const secondHalf = dailyVelocity.slice(midpoint).reduce((s, d) => s + d.completed, 0);
    const trend: 'up' | 'down' | 'stable' =
      secondHalf > firstHalf * 1.1 ? 'up' : secondHalf < firstHalf * 0.9 ? 'down' : 'stable';

    // Recent completions
    const archivedTasks = await db
      .collection<Task>('tasks')
      .find({
        ...baseQuery,
        $or: [
          { archived: true },
          { columnId: { $in: doneColumnIds } },
        ],
      })
      .sort({ updatedAt: -1 })
      .limit(10)
      .toArray();

    // Summary counts
    const summary = {
      total: allTasks.length,
      completed: allTasks.filter((t) => doneColumnIds.includes(t.columnId)).length,
      inProgress: allTasks.filter((t) => inProgressColumnIds.includes(t.columnId)).length,
      todo: allTasks.filter((t) => 
        !doneColumnIds.includes(t.columnId) && !inProgressColumnIds.includes(t.columnId)
      ).length,
      archived: await db.collection<Task>('tasks').countDocuments({
        ...baseQuery,
        archived: true,
      }),
      avgCycleTimeHours: null as number | null, // TODO: Calculate from activities
    };

    // Health score
    const issues: string[] = [];
    let healthScore = 100;

    if (overdue.length > 0) {
      issues.push(`${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`);
      healthScore -= Math.min(30, overdue.length * 10);
    }

    if (stuck.length > 0) {
      issues.push(`${stuck.length} stuck task${stuck.length > 1 ? 's' : ''} (>3 days in progress)`);
      healthScore -= Math.min(20, stuck.length * 5);
    }

    const p0Count = tasksByPriority.p0 || 0;
    if (p0Count > 2) {
      issues.push(`${p0Count} critical (P0) tasks need attention`);
      healthScore -= Math.min(20, (p0Count - 2) * 10);
    }

    if (trend === 'down') {
      issues.push('Velocity trending down');
      healthScore -= 10;
    }

    healthScore = Math.max(0, healthScore);

    const response: MetricsResponse = {
      velocity: {
        daily: dailyVelocity,
        weeklyAverage: Math.round(weeklyAverage * 10) / 10,
        trend,
      },
      tasksByPriority,
      tasksByColumn,
      overdue: overdue.slice(0, 10),
      stuck: stuck.slice(0, 10),
      recentCompletions: archivedTasks,
      summary,
      health: {
        score: healthScore,
        issues,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
