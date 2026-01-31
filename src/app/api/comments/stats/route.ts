import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { TaskComment } from '@/types/kanban';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

/**
 * Comment Stats API
 * 
 * GET /api/comments/stats - Get comment counts per task
 *   Query params:
 *   - boardId: Filter by board
 *   - since: Get moltbot comments newer than this timestamp (for unread tracking)
 */

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const since = searchParams.get('since');

    const db = await getDb();
    
    const matchStage: Record<string, unknown> = {};
    if (boardId) {
      matchStage.boardId = boardId;
    }

    // Get total comment counts per task
    const commentCounts = await db
      .collection<TaskComment>('comments')
      .aggregate<{ _id: string; total: number }>([
        { $match: matchStage },
        {
          $group: {
            _id: '$taskId',
            total: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Get moltbot comments since timestamp (for unread tracking)
    let unreadCounts: Array<{ _id: string; count: number }> = [];
    if (since) {
      const sinceDate = new Date(since);
      const unreadResults = await db
        .collection<TaskComment>('comments')
        .aggregate<{ _id: string; count: number }>([
          {
            $match: {
              ...matchStage,
              author: 'moltbot',
              createdAt: { $gt: sinceDate },
            },
          },
          {
            $group: {
              _id: '$taskId',
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();
      unreadCounts = unreadResults;
    }

    // Build response map
    const stats: Record<string, { total: number; unreadMoltbot: number }> = {};
    
    for (const item of commentCounts) {
      stats[item._id] = { total: item.total, unreadMoltbot: 0 };
    }
    
    for (const item of unreadCounts) {
      if (stats[item._id]) {
        stats[item._id].unreadMoltbot = item.count;
      } else {
        stats[item._id] = { total: item.count, unreadMoltbot: item.count };
      }
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching comment stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comment stats' },
      { status: 500 }
    );
  }
}
