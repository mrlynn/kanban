/**
 * Stuck Task Detection Feature
 *
 * Monitors tasks and alerts when they've been stagnant too long.
 * This is a key "proactive" feature - the agent notices problems before you do.
 */

import { AgentCore, StuckTask } from '../core/agent';
import { AGENT_ACTOR } from '@/lib/agent-identity';
import { getDb } from '@/lib/mongodb';

export interface StuckDetectionResult {
  success: boolean;
  tasksChecked: number;
  stuckFound: number;
  alertsSent: number;
  errors?: string[];
}

/**
 * Check all boards for stuck tasks and send alerts
 */
export async function detectAndAlertStuckTasks(): Promise<StuckDetectionResult> {
  const db = await getDb();
  const errors: string[] = [];
  let tasksChecked = 0;
  let stuckFound = 0;
  let alertsSent = 0;

  // Get all boards
  const boards = await db
    .collection('boards')
    .find({ archived: { $ne: true } })
    .toArray();

  const boardIds = boards.length > 0 ? boards.map((b) => b.id) : ['general'];

  for (const boardId of boardIds) {
    try {
      const agent = new AgentCore({
        userId: 'mike',
        boardId: boardId as string,
      });

      const analysis = await agent.analyzeBoardState();
      tasksChecked += analysis.totalTasks;

      // Filter to stuck tasks (configurable threshold)
      // Production: 5+ days, Testing: 1+ days
      const STUCK_THRESHOLD_DAYS = process.env.NODE_ENV === 'development' ? 1 : 5;
      const veryStuck = analysis.stuckTasks.filter((s) => s.daysStuck >= STUCK_THRESHOLD_DAYS);
      stuckFound += veryStuck.length;

      // Send individual alerts for very stuck tasks
      for (const stuck of veryStuck.slice(0, 3)) {
        // Max 3 alerts per check
        const alreadyAlerted = await hasRecentAlert(db, stuck.task.id);
        if (alreadyAlerted) continue;

        const message = formatStuckAlert(stuck);
        await agent.sendProactiveMessage(message, {
          type: 'stuck-task-alert',
          taskId: stuck.task.id,
          taskTitle: stuck.task.title,
          daysStuck: stuck.daysStuck,
        });

        alertsSent++;
      }
    } catch (error) {
      errors.push(`Board ${boardId}: ${String(error)}`);
    }
  }

  return {
    success: errors.length === 0,
    tasksChecked,
    stuckFound,
    alertsSent,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Check if we've already alerted about this task recently (within 24h)
 */
async function hasRecentAlert(
  db: Awaited<ReturnType<typeof getDb>>,
  taskId: string
): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentAlert = await db.collection('chats').findOne({
    author: { $in: [AGENT_ACTOR, 'moltbot'] },
    'metadata.type': 'stuck-task-alert',
    'metadata.taskId': taskId,
    createdAt: { $gt: oneDayAgo },
  });

  return !!recentAlert;
}

/**
 * Format a stuck task alert message
 */
function formatStuckAlert(stuck: StuckTask): string {
  const lines: string[] = [];

  lines.push(`🚨 **Task Alert**\n`);
  lines.push(`"**${stuck.task.title}**" has been in progress for **${stuck.daysStuck} days** without activity.\n`);

  if (stuck.lastActivityAt) {
    lines.push(
      `Last activity: ${stuck.lastActivityAt.toLocaleDateString()}\n`
    );
  }

  lines.push(`Need help? I can:`);
  lines.push(`• Break this into smaller subtasks`);
  lines.push(`• Research solutions or approaches`);
  lines.push(`• Mark it as blocked and move on`);
  lines.push(`• Draft content if it's a writing task\n`);

  lines.push(`Just let me know! 🔥`);

  return lines.join('\n');
}

/**
 * Get summary of stuck tasks without sending alerts (for inspection)
 */
export async function getStuckTasksSummary(boardId: string): Promise<{
  stuckTasks: StuckTask[];
  totalInProgress: number;
}> {
  const agent = new AgentCore({
    userId: 'mike',
    boardId,
  });

  const analysis = await agent.analyzeBoardState();

  return {
    stuckTasks: analysis.stuckTasks,
    totalInProgress: analysis.inProgress,
  };
}
