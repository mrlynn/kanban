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
  tenantId: string;
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
    tenantId: params.tenantId,
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
export async function getTaskActivities(tenantId: string, taskId: string, limit = 50): Promise<TaskActivity[]> {
  const db = await getDb();
  
  return db
    .collection<TaskActivity>('activities')
    .find({ tenantId, taskId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get recent activities for a board
 */
export async function getBoardActivities(tenantId: string, boardId: string, limit = 100): Promise<TaskActivity[]> {
  const db = await getDb();
  
  return db
    .collection<TaskActivity>('activities')
    .find({ tenantId, boardId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get recent activities across all boards for a tenant
 */
export async function getTenantActivities(tenantId: string, limit = 100): Promise<TaskActivity[]> {
  const db = await getDb();
  
  return db
    .collection<TaskActivity>('activities')
    .find({ tenantId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Detect actor from request headers
 */
export function detectActor(apiKey?: string | null, forcedActor?: string): Actor {
  // Allow forcing actor for testing/flexibility
  if (forcedActor && ['mike', 'moltbot', 'system', 'api'].includes(forcedActor)) {
    return forcedActor as Actor;
  }
  // Session auth or API key without explicit actor = Mike (owner)
  return 'mike';
}
