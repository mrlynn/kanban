/**
 * Enhanced Briefing Generator
 * 
 * Generates comprehensive daily and weekly briefings
 * that can be pushed to various channels.
 */

import { getDb } from '@/lib/mongodb';
import { Task, Board, TaskActivity } from '@/types/kanban';
import { ExternalLink, Project } from '@/types/integrations';

export interface BriefingData {
  tenantId: string;
  boardId?: string;
  type: 'daily' | 'weekly';
  generatedAt: Date;
  
  summary: {
    totalTasks: number;
    completedToday: number;
    completedThisWeek: number;
    inProgress: number;
    overdue: number;
    stuck: number;
    velocity: number; // tasks/day avg
  };
  
  focus: Task[];           // Top priority tasks to focus on
  overdue: Task[];         // Overdue tasks
  stuck: Task[];           // Tasks stuck in progress
  recentCompletions: Task[];
  upcomingDue: Task[];     // Due in next 3 days
  
  // GitHub activity
  github?: {
    prsOpened: number;
    prsMerged: number;
    prsPending: number;
    issuesOpened: number;
    issuesClosed: number;
    links: ExternalLink[];
  };
  
  // Insights
  insights: string[];      // AI-generated observations
  alerts: string[];        // Important warnings
}

export interface BriefingOptions {
  tenantId: string;
  boardId?: string;
  type?: 'daily' | 'weekly';
  includeGitHub?: boolean;
}

/**
 * Generate a briefing for a tenant/board
 */
export async function generateBriefing(opts: BriefingOptions): Promise<BriefingData> {
  const db = await getDb();
  const { tenantId, boardId, type = 'daily', includeGitHub = true } = opts;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAhead = new Date(today);
  threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);
  
  // Base query
  const baseQuery: Record<string, unknown> = { tenantId };
  if (boardId) baseQuery.boardId = boardId;
  
  // Get boards for column info
  const boardQuery = boardId ? { id: boardId, tenantId } : { tenantId };
  const boards = await db.collection<Board>('boards').find(boardQuery).toArray();
  
  const doneColumnIds: string[] = [];
  const inProgressColumnIds: string[] = [];
  
  for (const board of boards) {
    for (const col of board.columns || []) {
      const title = col.title.toLowerCase();
      if (title.includes('done') || title.includes('complete')) {
        doneColumnIds.push(col.id);
      } else if (title.includes('progress') || title.includes('doing')) {
        inProgressColumnIds.push(col.id);
      }
    }
  }
  
  // Get all active tasks
  const activeTasks = await db
    .collection<Task>('tasks')
    .find({
      ...baseQuery,
      $or: [{ archived: { $exists: false } }, { archived: false }],
    })
    .toArray();
  
  // Completions today
  const todayActivities = await db
    .collection<TaskActivity>('activities')
    .find({
      tenantId,
      action: 'moved',
      timestamp: { $gte: today },
      ...(boardId ? { boardId } : {}),
    })
    .toArray();
  
  const completedToday = todayActivities.filter(a => 
    a.details?.to?.toLowerCase().includes('done')
  ).length;
  
  // Completions this week
  const weekActivities = await db
    .collection<TaskActivity>('activities')
    .find({
      tenantId,
      action: 'moved',
      timestamp: { $gte: weekAgo },
      ...(boardId ? { boardId } : {}),
    })
    .toArray();
  
  const completedThisWeek = weekActivities.filter(a => 
    a.details?.to?.toLowerCase().includes('done')
  ).length;
  
  // In progress count
  const inProgress = activeTasks.filter(t => inProgressColumnIds.includes(t.columnId)).length;
  
  // Overdue tasks
  const overdue = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    if (doneColumnIds.includes(t.columnId)) return false;
    return new Date(t.dueDate) < today;
  }).sort((a, b) => 
    new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
  );
  
  // Stuck tasks (in progress > 3 days)
  const stuck = activeTasks.filter(t => {
    if (!inProgressColumnIds.includes(t.columnId)) return false;
    return new Date(t.updatedAt) < threeDaysAgo;
  }).sort((a, b) => 
    new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  );
  
  // Focus tasks (P0, P1 not in done)
  const focus = activeTasks
    .filter(t => 
      !doneColumnIds.includes(t.columnId) &&
      (t.priority === 'p0' || t.priority === 'p1')
    )
    .sort((a, b) => {
      // P0 first, then by due date
      if (a.priority !== b.priority) {
        return a.priority === 'p0' ? -1 : 1;
      }
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return a.dueDate ? -1 : 1;
    })
    .slice(0, 5);
  
  // Upcoming due (next 3 days)
  const upcomingDue = activeTasks
    .filter(t => {
      if (!t.dueDate) return false;
      if (doneColumnIds.includes(t.columnId)) return false;
      const due = new Date(t.dueDate);
      return due >= today && due <= threeDaysAhead;
    })
    .sort((a, b) => 
      new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
    );
  
  // Recent completions
  const recentCompletions = activeTasks
    .filter(t => doneColumnIds.includes(t.columnId))
    .sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 5);
  
  // Velocity (tasks completed per day, last 7 days)
  const velocity = Math.round((completedThisWeek / 7) * 10) / 10;
  
  // GitHub data
  let githubData: BriefingData['github'];
  if (includeGitHub) {
    const links = await db
      .collection<ExternalLink>('external_links')
      .find({
        tenantId,
        type: { $in: ['github_pr', 'github_issue'] },
        ...(boardId ? { boardId } : {}),
      })
      .sort({ syncedAt: -1 })
      .limit(20)
      .toArray();
    
    const prLinks = links.filter(l => l.type === 'github_pr');
    const issueLinks = links.filter(l => l.type === 'github_issue');
    
    // Count recent activity (from link creation dates)
    const recentPRs = prLinks.filter(l => new Date(l.createdAt) >= weekAgo);
    const recentIssues = issueLinks.filter(l => new Date(l.createdAt) >= weekAgo);
    
    githubData = {
      prsOpened: recentPRs.filter(l => l.status === 'open' || l.status === 'draft').length,
      prsMerged: recentPRs.filter(l => l.status === 'merged').length,
      prsPending: prLinks.filter(l => l.status === 'open').length,
      issuesOpened: recentIssues.filter(l => l.status === 'open').length,
      issuesClosed: recentIssues.filter(l => l.status === 'closed').length,
      links: links.slice(0, 10),
    };
  }
  
  // Generate insights
  const insights: string[] = [];
  const alerts: string[] = [];
  
  // Velocity insight
  if (velocity >= 3) {
    insights.push(`🚀 Strong velocity: ${velocity} tasks/day average`);
  } else if (velocity < 1) {
    insights.push(`📉 Low velocity: ${velocity} tasks/day - focus on completing in-progress work`);
  }
  
  // Overdue alert
  if (overdue.length > 0) {
    alerts.push(`⚠️ ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} need attention`);
  }
  
  // Stuck alert
  if (stuck.length > 0) {
    alerts.push(`🔒 ${stuck.length} task${stuck.length > 1 ? 's' : ''} stuck in progress > 3 days`);
  }
  
  // P0 alert
  const p0Count = activeTasks.filter(t => t.priority === 'p0' && !doneColumnIds.includes(t.columnId)).length;
  if (p0Count > 0) {
    alerts.push(`🔴 ${p0Count} critical (P0) task${p0Count > 1 ? 's' : ''} active`);
  }
  
  // Upcoming due insight
  if (upcomingDue.length > 0) {
    insights.push(`📅 ${upcomingDue.length} task${upcomingDue.length > 1 ? 's' : ''} due in the next 3 days`);
  }
  
  // GitHub insights
  if (githubData) {
    if (githubData.prsPending > 0) {
      insights.push(`🔀 ${githubData.prsPending} PR${githubData.prsPending > 1 ? 's' : ''} awaiting review`);
    }
    if (githubData.prsMerged > 0) {
      insights.push(`✅ ${githubData.prsMerged} PR${githubData.prsMerged > 1 ? 's' : ''} merged this week`);
    }
  }
  
  return {
    tenantId,
    boardId,
    type,
    generatedAt: now,
    summary: {
      totalTasks: activeTasks.length - recentCompletions.length,
      completedToday,
      completedThisWeek,
      inProgress,
      overdue: overdue.length,
      stuck: stuck.length,
      velocity,
    },
    focus,
    overdue,
    stuck,
    recentCompletions,
    upcomingDue,
    github: githubData,
    insights,
    alerts,
  };
}

/**
 * Format briefing as markdown text
 */
export function formatBriefingMarkdown(data: BriefingData): string {
  const lines: string[] = [];
  const now = data.generatedAt;
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  
  // Header
  if (data.type === 'daily') {
    lines.push(`## 🌅 Good morning! Here's your ${dayOfWeek} briefing`);
    lines.push(`*${dateStr}*`);
  } else {
    lines.push(`## 📊 Weekly Summary`);
    lines.push(`*Week ending ${dateStr}*`);
  }
  lines.push('');
  
  // Alerts (if any)
  if (data.alerts.length > 0) {
    lines.push('### 🚨 Alerts');
    for (const alert of data.alerts) {
      lines.push(`- ${alert}`);
    }
    lines.push('');
  }
  
  // Focus tasks
  if (data.focus.length > 0) {
    lines.push("### 🎯 Today's Focus");
    for (const task of data.focus) {
      const priority = task.priority?.toUpperCase() || '';
      const due = task.dueDate 
        ? ` (due ${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
        : '';
      lines.push(`- [${priority}] ${task.title}${due}`);
    }
    lines.push('');
  }
  
  // Summary stats
  lines.push('### 📈 Summary');
  lines.push(`- **Active tasks:** ${data.summary.totalTasks}`);
  lines.push(`- **In progress:** ${data.summary.inProgress}`);
  if (data.type === 'daily') {
    lines.push(`- **Completed today:** ${data.summary.completedToday}`);
  }
  lines.push(`- **Completed this week:** ${data.summary.completedThisWeek}`);
  lines.push(`- **Velocity:** ${data.summary.velocity} tasks/day`);
  lines.push('');
  
  // Overdue tasks
  if (data.overdue.length > 0) {
    lines.push('### ⏰ Overdue');
    for (const task of data.overdue.slice(0, 5)) {
      const due = new Date(task.dueDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      lines.push(`- ${task.title} *(was due ${due})*`);
    }
    if (data.overdue.length > 5) {
      lines.push(`- *...and ${data.overdue.length - 5} more*`);
    }
    lines.push('');
  }
  
  // Upcoming due
  if (data.upcomingDue.length > 0) {
    lines.push('### 📅 Coming Up');
    for (const task of data.upcomingDue.slice(0, 5)) {
      const due = new Date(task.dueDate!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      lines.push(`- ${task.title} *(${due})*`);
    }
    lines.push('');
  }
  
  // Recent completions
  if (data.recentCompletions.length > 0) {
    lines.push('### ✅ Recent Wins');
    for (const task of data.recentCompletions) {
      lines.push(`- ${task.title}`);
    }
    lines.push('');
  }
  
  // GitHub
  if (data.github && (data.github.prsPending > 0 || data.github.prsMerged > 0)) {
    lines.push('### 🐙 GitHub');
    if (data.github.prsMerged > 0) {
      lines.push(`- ${data.github.prsMerged} PR${data.github.prsMerged > 1 ? 's' : ''} merged`);
    }
    if (data.github.prsPending > 0) {
      lines.push(`- ${data.github.prsPending} PR${data.github.prsPending > 1 ? 's' : ''} awaiting review`);
    }
    lines.push('');
  }
  
  // Insights
  if (data.insights.length > 0) {
    lines.push('### 💡 Insights');
    for (const insight of data.insights) {
      lines.push(`- ${insight}`);
    }
    lines.push('');
  }
  
  // Footer
  lines.push('---');
  lines.push('*Generated by Moltboard Control Center*');
  
  return lines.join('\n');
}
