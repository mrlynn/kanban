import { ObjectId } from 'mongodb';

// Priority levels
export type Priority = 'p0' | 'p1' | 'p2' | 'p3';

export const PriorityConfig: Record<Priority, { label: string; color: string; icon: string }> = {
  p0: { label: 'Critical', color: '#DC2626', icon: '🔴' },
  p1: { label: 'High', color: '#F97316', icon: '🟠' },
  p2: { label: 'Medium', color: '#EAB308', icon: '🟡' },
  p3: { label: 'Low', color: '#6B7280', icon: '⚪' },
};

// Actor types for tracking who did what
export type Actor = 'mike' | 'moltbot' | 'system' | 'api';

// Checklist item for subtasks (supports nesting)
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  children?: ChecklistItem[];
}

// Helper to count checklist items recursively
export function countChecklistItems(items: ChecklistItem[]): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  
  for (const item of items) {
    total++;
    if (item.completed) completed++;
    if (item.children?.length) {
      const childCounts = countChecklistItems(item.children);
      completed += childCounts.completed;
      total += childCounts.total;
    }
  }
  
  return { completed, total };
}

// User type for assignees
export interface User {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

// Hardcoded users for MVP (can expand to DB later)
export const USERS: User[] = [
  { id: 'mike', name: 'Mike', color: '#3B82F6' },
  { id: 'moltbot', name: 'Moltbot', avatar: '🔥', color: '#F97316' },
];

export interface Task {
  _id?: ObjectId;
  id: string;
  title: string;
  description?: string;
  columnId: string;
  boardId: string;
  order: number;
  labels?: string[];
  priority?: Priority;
  dueDate?: Date;
  assigneeId?: string;
  checklist?: ChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Actor;
  // Archival
  archived?: boolean;
  archivedAt?: Date;
  archivedBy?: Actor;
}

export interface Column {
  _id?: ObjectId;
  id: string;
  title: string;
  boardId: string;
  order: number;
  color?: string;
}

export interface Board {
  _id?: ObjectId;
  id: string;
  name: string;
  description?: string;
  columns: Column[];
  createdAt: Date;
  updatedAt: Date;
}

export type ColumnColor = 
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success';

// Activity tracking
export type ActivityAction = 
  | 'created'
  | 'updated'
  | 'moved'
  | 'commented'
  | 'priority_changed'
  | 'deleted'
  | 'archived'
  | 'restored';

export interface TaskActivity {
  _id?: ObjectId;
  id: string;
  taskId: string;
  boardId: string;
  action: ActivityAction;
  actor: Actor;
  timestamp: Date;
  details?: {
    field?: string;
    from?: string;
    to?: string;
    note?: string;
  };
}

// Comments
export interface TaskComment {
  _id?: ObjectId;
  id: string;
  taskId: string;
  boardId: string;
  author: Actor;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}
