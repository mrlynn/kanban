/**
 * Task Creator Feature
 *
 * Creates tasks from chat messages using natural language parsing.
 * Integrates with the chat API to detect task intents and create tasks.
 */

import { getDb } from '@/lib/mongodb';
import { MoltbotAgent } from '../core/agent';
import {
  parseTaskIntent,
  formatTaskConfirmation,
  ParseResult,
} from './nlp-parser';
import type { Task, Priority } from '@/types/kanban';

export interface TaskCreationResult {
  created: boolean;
  task?: Task;
  confirmation?: string;
  intent: ParseResult;
}

/**
 * Generate a unique task ID
 */
function generateTaskId(): string {
  return `task_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Process a chat message and potentially create a task
 */
export async function processMessageForTask(
  message: string,
  boardId: string,
  userId: string
): Promise<TaskCreationResult> {
  // Parse the message for task intent
  const parseResult = parseTaskIntent(message);

  // Only create tasks for high or medium confidence
  if (
    parseResult.intent.action !== 'create' ||
    parseResult.intent.confidence === 'low'
  ) {
    return {
      created: false,
      intent: parseResult,
    };
  }

  // Create the task
  const task = await createTaskFromIntent(parseResult, boardId, userId);

  // Generate confirmation message
  const confirmation = formatTaskConfirmation(
    task.title,
    task.dueDate,
    task.priority,
    task.labels
  );

  return {
    created: true,
    task,
    confirmation,
    intent: parseResult,
  };
}

/**
 * Create a task from parsed intent
 */
async function createTaskFromIntent(
  parseResult: ParseResult,
  boardId: string,
  userId: string
): Promise<Task> {
  const db = await getDb();
  const intent = parseResult.intent;

  // Get the "To Do" column for this board
  const toDoColumnId = await getToDoColumnId(db, boardId);

  // Get max order for the column
  const maxOrderTask = await db
    .collection('tasks')
    .findOne(
      { boardId, columnId: toDoColumnId },
      { sort: { order: -1 } }
    );
  const order = (maxOrderTask?.order ?? 0) + 1;

  const task: Task = {
    id: generateTaskId(),
    title: intent.title || 'Untitled Task',
    description: `Created from chat: "${parseResult.originalMessage}"`,
    columnId: toDoColumnId,
    boardId,
    order,
    labels: intent.labels || [],
    priority: (intent.priority as Priority) || 'p2',
    dueDate: intent.dueDate,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'moltbot',
  };

  await db.collection('tasks').insertOne(task);

  // Log activity
  await db.collection('activities').insertOne({
    id: `act_${Date.now().toString(36)}`,
    taskId: task.id,
    taskTitle: task.title,
    boardId,
    action: 'created',
    actor: 'moltbot',
    timestamp: new Date(),
    details: {
      source: 'chat',
      intent: intent.context,
      confidence: intent.confidence,
    },
  });

  return task;
}

/**
 * Get the "To Do" column ID for a board
 */
async function getToDoColumnId(
  db: Awaited<ReturnType<typeof getDb>>,
  boardId: string
): Promise<string> {
  // Try to find the board and its columns
  const board = await db.collection('boards').findOne({ id: boardId });

  if (board?.columns && Array.isArray(board.columns)) {
    // Look for a "To Do" or similar column
    const toDoColumn = board.columns.find(
      (col: { id?: string; name?: string }) => {
        const name = col?.name?.toLowerCase() || '';
        return (
          name.includes('to do') ||
          name.includes('todo') ||
          name.includes('backlog')
        );
      }
    );
    if (toDoColumn?.id) return toDoColumn.id;

    // Fall back to first column with an ID
    const firstColumn = board.columns.find((col: { id?: string }) => col?.id);
    if (firstColumn?.id) return firstColumn.id;
  }

  // Default column ID for NetPad board
  return 'col_cc9883dfa1e8dced';
}

/**
 * Handle a chat message - check for task intent and respond
 */
export async function handleChatMessage(
  messageId: string,
  content: string,
  boardId: string,
  author: string
): Promise<{ taskCreated: boolean; responseMessageId?: string }> {
  // Only process messages from users (not moltbot)
  if (author === 'moltbot' || author === 'api' || author === 'system') {
    return { taskCreated: false };
  }

  const result = await processMessageForTask(content, boardId, author);

  if (result.created && result.confirmation) {
    // Post confirmation message
    const agent = new MoltbotAgent({
      userId: author,
      boardId,
    });

    const responseMessageId = await agent.sendProactiveMessage(
      result.confirmation,
      {
        type: 'task-created',
        taskId: result.task?.id,
        taskTitle: result.task?.title,
        intent: result.intent.intent.context,
        confidence: result.intent.intent.confidence,
        replyTo: messageId,
      }
    );

    return { taskCreated: true, responseMessageId };
  }

  return { taskCreated: false };
}
