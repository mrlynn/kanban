/**
 * Moltbot Agent - The AI Teammate
 *
 * Core interface for all Moltbot features.
 * Handles board analysis, proactive messaging, and context management.
 */

import { getDb } from '@/lib/mongodb';
import type { Task, Board } from '@/types/kanban';

export interface MoltbotContext {
  userId: string;
  boardId: string;
  tenantId?: string;
  recentTasks?: Task[];
  userPatterns?: UserPatterns;
}

export interface UserPatterns {
  bestWorkTime?: string;
  weakDays?: string[];
  taskPreferences?: Record<string, unknown>;
}

export interface BoardAnalysis {
  totalTasks: number;
  byColumn: Record<string, number>;
  inProgress: number;
  overdue: number;
  dueToday: number;
  dueSoon: number; // Next 3 days
  stuckTasks: StuckTask[];
  recentActivity: Activity[];
  tasks: Task[];
}

export interface StuckTask {
  task: Task;
  daysStuck: number;
  lastActivityAt?: Date;
}

export interface Activity {
  id: string;
  taskId: string;
  taskTitle: string;
  action: string;
  actor: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

function generateMessageId(): string {
  return `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export class MoltbotAgent {
  private context: MoltbotContext;

  constructor(context: MoltbotContext) {
    this.context = context;
  }

  /**
   * Send a proactive message to the chat
   */
  async sendProactiveMessage(
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const db = await getDb();
    const messageId = generateMessageId();

    await db.collection('chats').insertOne({
      id: messageId,
      tenantId: this.context.tenantId,
      boardId: this.context.boardId,
      author: 'moltbot',
      content: message,
      status: 'complete',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        proactive: true,
        ...metadata,
      },
    });

    return messageId;
  }

  /**
   * Analyze the current board state
   */
  async analyzeBoardState(): Promise<BoardAnalysis> {
    const db = await getDb();
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Build query with optional tenant filter
    const query: Record<string, unknown> = { 
      boardId: this.context.boardId, 
      archived: { $ne: true } 
    };
    if (this.context.tenantId) {
      query.tenantId = this.context.tenantId;
    }

    // Get all tasks for this board
    const tasks = (await db
      .collection('tasks')
      .find(query)
      .toArray()) as unknown as Task[];

    // Activity query
    const activityQuery: Record<string, unknown> = { boardId: this.context.boardId };
    if (this.context.tenantId) {
      activityQuery.tenantId = this.context.tenantId;
    }

    // Get recent activity
    const recentActivity = (await db
      .collection('activities')
      .find(activityQuery)
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray()) as unknown as Activity[];

    // Count by column
    const byColumn: Record<string, number> = {};
    for (const task of tasks) {
      const col = task.columnId || 'unknown';
      byColumn[col] = (byColumn[col] || 0) + 1;
    }

    // Find overdue tasks
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now
    ).length;

    // Due today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const dueToday = tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) >= todayStart &&
        new Date(t.dueDate) < todayEnd
    ).length;

    // Due soon (next 3 days)
    const dueSoon = tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) >= now &&
        new Date(t.dueDate) <= threeDaysFromNow
    ).length;

    // Find stuck tasks (in progress > 3 days with no recent activity)
    const stuckTasks = await this.findStuckTasks(tasks, recentActivity);

    // In progress count - check for common column IDs
    const inProgressColumns = ['in-progress', 'col_6650cbcc8b7e6e2b'];
    const inProgress = tasks.filter((t) =>
      inProgressColumns.some(
        (col) => t.columnId === col || t.columnId?.includes('progress')
      )
    ).length;

    return {
      totalTasks: tasks.length,
      byColumn,
      inProgress,
      overdue,
      dueToday,
      dueSoon,
      stuckTasks,
      recentActivity,
      tasks,
    };
  }

  /**
   * Find tasks that are stuck (in progress too long)
   */
  private async findStuckTasks(
    tasks: Task[],
    activities: Activity[]
  ): Promise<StuckTask[]> {
    const stuckTasks: StuckTask[] = [];
    // Lower threshold in dev for testing
    const stuckThresholdDays = process.env.NODE_ENV === 'development' ? 1 : 3;
    const thresholdDate = new Date(Date.now() - stuckThresholdDays * 24 * 60 * 60 * 1000);

    // In-progress column IDs
    const inProgressColumns = ['in-progress', 'col_6650cbcc8b7e6e2b'];

    for (const task of tasks) {
      // Check if task is in progress
      const isInProgress = inProgressColumns.some(
        (col) => task.columnId === col || task.columnId?.includes('progress')
      );

      if (!isInProgress) continue;

      // Find last activity for this task
      const taskActivities = activities.filter((a) => a.taskId === task.id);
      const lastActivity = taskActivities[0];
      const lastActivityAt = lastActivity
        ? new Date(lastActivity.timestamp)
        : task.createdAt
        ? new Date(task.createdAt)
        : undefined;

      // Check if stuck
      if (!lastActivityAt || lastActivityAt < thresholdDate) {
        const daysStuck = lastActivityAt
          ? Math.floor(
              (Date.now() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 999;

        stuckTasks.push({
          task,
          daysStuck,
          lastActivityAt,
        });
      }
    }

    return stuckTasks.sort((a, b) => b.daysStuck - a.daysStuck);
  }

  /**
   * Get greeting based on time of day
   */
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /**
   * Format a task for display
   */
  formatTask(task: Task): string {
    let result = `• **${task.title}**`;
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const isOverdue = due < new Date();
      result += ` (${isOverdue ? '⚠️ Overdue: ' : 'Due: '}${due.toLocaleDateString()})`;
    }
    if (task.priority === 'p0') result += ' 🔴';
    else if (task.priority === 'p1') result += ' 🟠';
    return result;
  }
}
