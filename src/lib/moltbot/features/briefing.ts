/**
 * Daily Briefing Feature
 *
 * Moltbot reviews the board each morning and provides a personalized summary.
 * This is the first "proactive" feature that makes Moltbot feel like a teammate.
 */

import { MoltbotAgent, BoardAnalysis, StuckTask } from '../core/agent';
import { getDb } from '@/lib/mongodb';
import type { Task, Board } from '@/types/kanban';

export interface BriefingResult {
  success: boolean;
  boardsProcessed: number;
  messagesPosted: number;
  errors?: string[];
}

export interface BriefingContent {
  greeting: string;
  summary: string;
  priorities: Task[];
  stuckAlerts: StuckTask[];
  suggestions: string[];
}

/**
 * Generate and post daily briefings for all active boards
 */
export async function generateDailyBriefings(): Promise<BriefingResult> {
  const db = await getDb();
  const errors: string[] = [];
  let messagesPosted = 0;

  // Get all boards
  const boards = (await db
    .collection('boards')
    .find({ archived: { $ne: true } })
    .toArray()) as unknown as Board[];

  // If no boards, use default
  const boardIds = boards.length > 0 ? boards.map((b) => b.id) : ['general'];

  for (const boardId of boardIds) {
    try {
      const agent = new MoltbotAgent({
        userId: 'mike', // TODO: Multi-user support
        boardId,
      });

      const analysis = await agent.analyzeBoardState();
      const briefing = formatBriefing(agent, analysis);

      await agent.sendProactiveMessage(briefing, {
        type: 'daily-briefing',
        generatedAt: new Date().toISOString(),
        stats: {
          totalTasks: analysis.totalTasks,
          inProgress: analysis.inProgress,
          overdue: analysis.overdue,
          stuckCount: analysis.stuckTasks.length,
        },
      });

      messagesPosted++;
    } catch (error) {
      errors.push(`Board ${boardId}: ${String(error)}`);
    }
  }

  return {
    success: errors.length === 0,
    boardsProcessed: boardIds.length,
    messagesPosted,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Format the briefing message
 */
function formatBriefing(agent: MoltbotAgent, analysis: BoardAnalysis): string {
  const greeting = agent.getGreeting();
  const lines: string[] = [];

  // Header
  lines.push(`${greeting}, Mike! 🔥\n`);
  lines.push(`Here's your board overview:\n`);

  // Summary stats
  lines.push(`**📊 Status**`);
  lines.push(`• ${analysis.totalTasks} total tasks`);
  lines.push(`• ${analysis.inProgress} in progress`);

  if (analysis.overdue > 0) {
    lines.push(`• ⚠️ **${analysis.overdue} overdue**`);
  }

  if (analysis.dueToday > 0) {
    lines.push(`• 📅 ${analysis.dueToday} due today`);
  }

  if (analysis.dueSoon > 0 && analysis.dueSoon !== analysis.dueToday) {
    lines.push(`• 🗓️ ${analysis.dueSoon} due in next 3 days`);
  }

  // Stuck tasks alert
  if (analysis.stuckTasks.length > 0) {
    lines.push(`\n**🚨 Stuck Tasks**`);
    for (const stuck of analysis.stuckTasks.slice(0, 3)) {
      lines.push(
        `• "${stuck.task.title}" — ${stuck.daysStuck} days without activity`
      );
    }
    if (analysis.stuckTasks.length > 3) {
      lines.push(`• ...and ${analysis.stuckTasks.length - 3} more`);
    }
  }

  // Priorities - find high priority or overdue tasks
  const priorities = analysis.tasks
    .filter(
      (t) =>
        t.priority === 'p0' ||
        t.priority === 'p1' ||
        (t.dueDate && new Date(t.dueDate) < new Date())
    )
    .slice(0, 3);

  if (priorities.length > 0) {
    lines.push(`\n**🎯 Suggested Focus**`);
    for (const task of priorities) {
      lines.push(agent.formatTask(task));
    }
  }

  // Suggestions based on state
  const suggestions = generateSuggestions(analysis);
  if (suggestions.length > 0) {
    lines.push(`\n**💡 Suggestions**`);
    for (const suggestion of suggestions) {
      lines.push(`• ${suggestion}`);
    }
  }

  // Sign off
  lines.push(`\n---`);
  lines.push(`Ready to help! Just ask. 🔥`);

  return lines.join('\n');
}

/**
 * Generate contextual suggestions based on board state
 */
function generateSuggestions(analysis: BoardAnalysis): string[] {
  const suggestions: string[] = [];

  // Too many in progress
  if (analysis.inProgress > 5) {
    suggestions.push(
      `You have ${analysis.inProgress} tasks in progress. Consider finishing some before starting new ones.`
    );
  }

  // Stuck tasks
  if (analysis.stuckTasks.length > 0) {
    const stuckest = analysis.stuckTasks[0];
    suggestions.push(
      `"${stuckest.task.title}" has been stuck for ${stuckest.daysStuck} days. Want me to help break it down?`
    );
  }

  // Overdue tasks
  if (analysis.overdue > 0) {
    suggestions.push(
      `${analysis.overdue} tasks are overdue. Should I reschedule them or mark as blocked?`
    );
  }

  // No due dates on tasks
  const tasksWithoutDueDate = analysis.tasks.filter(
    (t) => !t.dueDate && t.columnId?.includes('progress')
  ).length;
  if (tasksWithoutDueDate > 2) {
    suggestions.push(
      `${tasksWithoutDueDate} in-progress tasks have no due date. Want me to suggest deadlines?`
    );
  }

  return suggestions.slice(0, 2); // Max 2 suggestions
}

/**
 * Generate a briefing for a specific board (for manual trigger)
 */
export async function generateBriefingForBoard(
  boardId: string
): Promise<string> {
  const agent = new MoltbotAgent({
    userId: 'mike',
    boardId,
  });

  const analysis = await agent.analyzeBoardState();
  return formatBriefing(agent, analysis);
}
