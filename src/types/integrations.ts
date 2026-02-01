import { ObjectId } from 'mongodb';

/**
 * Project - Maps a board to external integrations
 */
export interface Project {
  _id?: ObjectId;
  id: string;
  tenantId: string;
  boardId: string;
  name: string;
  color: string;
  
  // GitHub integration
  github?: {
    owner: string;
    repo: string;
    installationId?: number;
    webhookSecret?: string;
    syncEnabled: boolean;
    autoLinkPRs: boolean;      // Auto-link PRs that mention task IDs
    autoMoveTasks: boolean;    // Move tasks when PRs are merged
    createTasksFromIssues: boolean;
  };
  
  // NetPad integration (future)
  netpad?: {
    applicationId: string;
    syncForms: boolean;
  };
  
  // Calendar integration (future)
  calendar?: {
    calendarId: string;
    syncEvents: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * External Link - Links a task to external resources
 */
export type ExternalLinkType = 
  | 'github_pr'
  | 'github_issue'
  | 'github_commit'
  | 'calendar_event'
  | 'netpad_form'
  | 'url';

export type ExternalLinkStatus = 
  | 'open'
  | 'closed'
  | 'merged'
  | 'draft'
  | 'unknown';

export interface ExternalLink {
  _id?: ObjectId;
  id: string;
  tenantId: string;
  taskId: string;
  boardId: string;
  
  type: ExternalLinkType;
  externalId: string;        // e.g., PR number, issue number
  url: string;
  title: string;
  status: ExternalLinkStatus;
  
  // GitHub-specific metadata
  github?: {
    owner: string;
    repo: string;
    number: number;
    author?: string;
    labels?: string[];
    headBranch?: string;
    baseBranch?: string;
    checksStatus?: 'pending' | 'success' | 'failure';
  };
  
  createdAt: Date;
  updatedAt: Date;
  syncedAt: Date;
}

/**
 * Automation Rule - Triggers actions based on events
 */
export type AutomationTrigger = 
  | 'github_pr_opened'
  | 'github_pr_merged'
  | 'github_pr_closed'
  | 'github_issue_opened'
  | 'github_issue_closed'
  | 'github_push'
  | 'task_created'
  | 'task_moved'
  | 'task_stuck'
  | 'due_date_approaching'
  | 'due_date_passed';

export type AutomationAction = 
  | 'move_task'
  | 'create_task'
  | 'update_task'
  | 'add_label'
  | 'remove_label'
  | 'set_priority'
  | 'notify'
  | 'add_comment';

export interface AutomationRule {
  _id?: ObjectId;
  id: string;
  tenantId: string;
  projectId?: string;        // Optional - if not set, applies to all projects
  boardId?: string;
  
  name: string;
  description?: string;
  enabled: boolean;
  
  trigger: AutomationTrigger;
  conditions?: {
    // For GitHub triggers
    branches?: string[];     // e.g., ['main', 'master']
    labels?: string[];       // PR/issue must have these labels
    titlePattern?: string;   // Regex to match title
    
    // For task triggers
    columns?: string[];      // Column IDs
    priorities?: string[];   // p0, p1, p2, p3
    stuckDays?: number;      // For task_stuck trigger
    dueDaysAhead?: number;   // For due_date_approaching
  };
  
  action: AutomationAction;
  actionParams: {
    // For move_task
    toColumn?: string;       // Column ID or name
    
    // For create_task / update_task
    title?: string;          // Can use {{variables}}
    column?: string;
    priority?: string;
    labels?: string[];
    
    // For notify
    message?: string;        // Can use {{variables}}
    notifyChannel?: string;  // 'moltboard' | 'signal' | 'telegram' etc.
    
    // For add_comment
    comment?: string;        // Can use {{variables}}
  };
  
  // Stats
  lastTriggeredAt?: Date;
  triggerCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GitHub Webhook Event (simplified)
 */
export interface GitHubWebhookPayload {
  action: string;
  repository: {
    full_name: string;
    owner: { login: string };
    name: string;
  };
  sender: {
    login: string;
    avatar_url: string;
  };
  
  // PR events
  pull_request?: {
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    merged: boolean;
    draft: boolean;
    html_url: string;
    head: { ref: string };
    base: { ref: string };
    user: { login: string };
    labels: Array<{ name: string }>;
  };
  
  // Issue events
  issue?: {
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    html_url: string;
    user: { login: string };
    labels: Array<{ name: string }>;
  };
  
  // Push events
  ref?: string;
  commits?: Array<{
    id: string;
    message: string;
    url: string;
    author: { name: string; email: string };
  }>;
}
