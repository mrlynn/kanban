import { getDb } from './mongodb';
import { TaskActivity, ActivityAction, Actor } from '@/types/kanban';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Log an activity for a task
 */
export async function logActivity(params: {
  taskId: string;
  boardId: string;
  action: ActivityAction;
  actor: Actor;
  details?: {
    field?: string;
    from?: string;
    to?: string;
    note?: string;
  };
}): Promise<TaskActivity> {
  const db = await getDb();
  
  const activity: TaskActivity = {
    id: generateId('act'),
    taskId: params.taskId,
    boardId: params.boardId,
    action: params.action,
    actor: params.actor,
    timestamp: new Date(),
    details: params.details,
  };
  
  await db.collection<TaskActivity>('activities').insertOne(activity);
  
  return activity;
}

/**
 * Get activities for a task
 */
export async function getTaskActivities(taskId: string, limit = 50): Promise<TaskActivity[]> {
  const db = await getDb();
  
  return db
    .collection<TaskActivity>('activities')
    .find({ taskId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get recent activities for a board
 */
export async function getBoardActivities(boardId: string, limit = 100): Promise<TaskActivity[]> {
  const db = await getDb();
  
  return db
    .collection<TaskActivity>('activities')
    .find({ boardId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Detect actor from request headers
 */
export function detectActor(apiKey?: string | null): Actor {
  // If authenticated via API key, check if it's Moltbot
  if (apiKey) {
    return 'moltbot';
  }
  // Session auth = Mike
  return 'mike';
}
