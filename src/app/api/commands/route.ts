import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Task, Board } from '@/types/kanban';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import { logActivity } from '@/lib/activity';
import { parseCommand, describeCommand, ParsedCommand } from '@/lib/ai/command-parser';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

interface CommandResponse {
  success: boolean;
  command: {
    type: string;
    description: string;
    confidence: number;
  };
  result?: {
    action: string;
    task?: Task;
    tasks?: Task[];
    message: string;
  };
  error?: string;
}

/**
 * POST /api/commands
 * 
 * Execute a natural language command
 * 
 * Body: { text: string, boardId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireScope(request, 'tasks:write');

    const { text, boardId } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const db = await getDb();

    // Get default board if not specified
    let targetBoardId = boardId;
    if (!targetBoardId) {
      const defaultBoard = await db
        .collection<Board>('boards')
        .findOne({ tenantId: context.tenantId }, { sort: { createdAt: -1 } });
      targetBoardId = defaultBoard?.id;
    }

    if (!targetBoardId) {
      return NextResponse.json({ error: 'No board found' }, { status: 404 });
    }

    // Get board for column info
    const board = await db
      .collection<Board>('boards')
      .findOne({ id: targetBoardId, tenantId: context.tenantId });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Parse the command
    const cmd = parseCommand(text);
    cmd.params.boardId = targetBoardId;

    const response: CommandResponse = {
      success: false,
      command: {
        type: cmd.type,
        description: describeCommand(cmd),
        confidence: cmd.confidence,
      },
    };

    // Execute based on command type
    switch (cmd.type) {
      case 'create': {
        if (!cmd.params.title) {
          response.error = 'Could not extract task title from command';
          return NextResponse.json(response, { status: 400 });
        }

        // Find the "To Do" column
        const todoColumn = board.columns?.find(
          (c) => c.title.toLowerCase().includes('to do') || c.title.toLowerCase() === 'todo'
        ) || board.columns?.[0];

        if (!todoColumn) {
          response.error = 'No columns found on board';
          return NextResponse.json(response, { status: 400 });
        }

        // Get highest order in column
        const lastTask = await db
          .collection<Task>('tasks')
          .findOne(
            { tenantId: context.tenantId, columnId: todoColumn.id },
            { sort: { order: -1 } }
          );

        const task: Task = {
          id: generateId('task'),
          tenantId: context.tenantId,
          title: cmd.params.title,
          description: cmd.params.description,
          columnId: todoColumn.id,
          boardId: targetBoardId,
          order: lastTask ? lastTask.order + 1 : 0,
          priority: cmd.params.priority,
          dueDate: cmd.params.dueDate,
          labels: cmd.params.labels,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'api',
        };

        await db.collection<Task>('tasks').insertOne(task);

        await logActivity({
          tenantId: context.tenantId,
          taskId: task.id,
          boardId: targetBoardId,
          action: 'created',
          actor: 'api',
          details: { note: `Created via command: "${text}"` },
        });

        response.success = true;
        response.result = {
          action: 'created',
          task,
          message: `✅ Created task: "${task.title}"${task.priority ? ` (${task.priority.toUpperCase()})` : ''}${task.dueDate ? ` due ${new Date(task.dueDate).toLocaleDateString()}` : ''}`,
        };
        break;
      }

      case 'move':
      case 'complete': {
        if (!cmd.taskRef) {
          response.error = 'Could not identify which task to update';
          return NextResponse.json(response, { status: 400 });
        }

        // Find the task by title (fuzzy match)
        const tasks = await db
          .collection<Task>('tasks')
          .find({
            tenantId: context.tenantId,
            boardId: targetBoardId,
            $or: [{ archived: { $exists: false } }, { archived: false }],
          })
          .toArray();

        const taskRef = cmd.taskRef.toLowerCase();
        const matchedTask = tasks.find(
          (t) =>
            t.title.toLowerCase() === taskRef ||
            t.title.toLowerCase().includes(taskRef) ||
            t.id === cmd.taskRef
        );

        if (!matchedTask) {
          response.error = `Could not find task matching "${cmd.taskRef}"`;
          return NextResponse.json(response, { status: 404 });
        }

        // Find target column
        let targetColumn = cmd.type === 'complete' ? 
          board.columns?.find((c) => c.title.toLowerCase().includes('done')) :
          board.columns?.find((c) => {
            const colName = c.title.toLowerCase();
            const targetName = cmd.params.column?.toLowerCase() || '';
            return colName.includes(targetName) || targetName.includes(colName);
          });

        if (!targetColumn && cmd.params.column) {
          // Try column patterns
          const patterns: Record<string, string[]> = {
            'todo': ['to do', 'todo', 'backlog'],
            'in_progress': ['in progress', 'doing', 'progress'],
            'review': ['review', 'testing'],
            'done': ['done', 'complete', 'finished'],
          };
          
          for (const [, keywords] of Object.entries(patterns)) {
            if (keywords.some(k => cmd.params.column?.toLowerCase().includes(k))) {
              targetColumn = board.columns?.find(c => 
                keywords.some(k => c.title.toLowerCase().includes(k))
              );
              if (targetColumn) break;
            }
          }
        }

        if (!targetColumn) {
          response.error = `Could not find column "${cmd.params.column}"`;
          return NextResponse.json(response, { status: 404 });
        }

        const fromColumn = board.columns?.find(c => c.id === matchedTask.columnId);

        await db.collection<Task>('tasks').updateOne(
          { id: matchedTask.id, tenantId: context.tenantId },
          {
            $set: {
              columnId: targetColumn.id,
              updatedAt: new Date(),
            },
          }
        );

        await logActivity({
          tenantId: context.tenantId,
          taskId: matchedTask.id,
          boardId: targetBoardId,
          action: 'moved',
          actor: 'api',
          details: {
            from: fromColumn?.title,
            to: targetColumn.title,
            note: `Moved via command: "${text}"`,
          },
        });

        const updatedTask = { ...matchedTask, columnId: targetColumn.id };

        response.success = true;
        response.result = {
          action: 'moved',
          task: updatedTask,
          message: `✅ Moved "${matchedTask.title}" to ${targetColumn.title}`,
        };
        break;
      }

      case 'priority': {
        if (!cmd.taskRef || !cmd.params.priority) {
          response.error = 'Could not identify task or priority';
          return NextResponse.json(response, { status: 400 });
        }

        const tasks = await db
          .collection<Task>('tasks')
          .find({
            tenantId: context.tenantId,
            boardId: targetBoardId,
            $or: [{ archived: { $exists: false } }, { archived: false }],
          })
          .toArray();

        const taskRef = cmd.taskRef.toLowerCase();
        const matchedTask = tasks.find(
          (t) => t.title.toLowerCase().includes(taskRef) || t.id === cmd.taskRef
        );

        if (!matchedTask) {
          response.error = `Could not find task matching "${cmd.taskRef}"`;
          return NextResponse.json(response, { status: 404 });
        }

        const oldPriority = matchedTask.priority;

        await db.collection<Task>('tasks').updateOne(
          { id: matchedTask.id, tenantId: context.tenantId },
          { $set: { priority: cmd.params.priority, updatedAt: new Date() } }
        );

        await logActivity({
          tenantId: context.tenantId,
          taskId: matchedTask.id,
          boardId: targetBoardId,
          action: 'priority_changed',
          actor: 'api',
          details: {
            from: oldPriority || 'none',
            to: cmd.params.priority,
          },
        });

        response.success = true;
        response.result = {
          action: 'priority_changed',
          task: { ...matchedTask, priority: cmd.params.priority },
          message: `✅ Set priority of "${matchedTask.title}" to ${cmd.params.priority.toUpperCase()}`,
        };
        break;
      }

      case 'due': {
        if (!cmd.taskRef || !cmd.params.dueDate) {
          response.error = 'Could not identify task or due date';
          return NextResponse.json(response, { status: 400 });
        }

        const tasks = await db
          .collection<Task>('tasks')
          .find({
            tenantId: context.tenantId,
            boardId: targetBoardId,
            $or: [{ archived: { $exists: false } }, { archived: false }],
          })
          .toArray();

        const taskRef = cmd.taskRef.toLowerCase();
        const matchedTask = tasks.find(
          (t) => t.title.toLowerCase().includes(taskRef) || t.id === cmd.taskRef
        );

        if (!matchedTask) {
          response.error = `Could not find task matching "${cmd.taskRef}"`;
          return NextResponse.json(response, { status: 404 });
        }

        await db.collection<Task>('tasks').updateOne(
          { id: matchedTask.id, tenantId: context.tenantId },
          { $set: { dueDate: cmd.params.dueDate, updatedAt: new Date() } }
        );

        await logActivity({
          tenantId: context.tenantId,
          taskId: matchedTask.id,
          boardId: targetBoardId,
          action: 'updated',
          actor: 'api',
          details: {
            field: 'dueDate',
            to: cmd.params.dueDate.toISOString(),
          },
        });

        response.success = true;
        response.result = {
          action: 'due_set',
          task: { ...matchedTask, dueDate: cmd.params.dueDate },
          message: `✅ Set due date of "${matchedTask.title}" to ${cmd.params.dueDate.toLocaleDateString()}`,
        };
        break;
      }

      case 'archive': {
        if (cmd.params.query === 'all_done') {
          // Archive all done tasks
          const doneColumn = board.columns?.find((c) => c.title.toLowerCase().includes('done'));
          if (!doneColumn) {
            response.error = 'Could not find Done column';
            return NextResponse.json(response, { status: 404 });
          }

          const result = await db.collection<Task>('tasks').updateMany(
            {
              tenantId: context.tenantId,
              boardId: targetBoardId,
              columnId: doneColumn.id,
              $or: [{ archived: { $exists: false } }, { archived: false }],
            },
            { $set: { archived: true, archivedAt: new Date(), archivedBy: 'api' } }
          );

          response.success = true;
          response.result = {
            action: 'archived',
            message: `✅ Archived ${result.modifiedCount} completed task${result.modifiedCount !== 1 ? 's' : ''}`,
          };
        } else if (cmd.taskRef) {
          const tasks = await db
            .collection<Task>('tasks')
            .find({ tenantId: context.tenantId, boardId: targetBoardId })
            .toArray();

          const taskRef = cmd.taskRef.toLowerCase();
          const matchedTask = tasks.find(
            (t) => t.title.toLowerCase().includes(taskRef) || t.id === cmd.taskRef
          );

          if (!matchedTask) {
            response.error = `Could not find task matching "${cmd.taskRef}"`;
            return NextResponse.json(response, { status: 404 });
          }

          await db.collection<Task>('tasks').updateOne(
            { id: matchedTask.id, tenantId: context.tenantId },
            { $set: { archived: true, archivedAt: new Date(), archivedBy: 'api' } }
          );

          await logActivity({
            tenantId: context.tenantId,
            taskId: matchedTask.id,
            boardId: targetBoardId,
            action: 'archived',
            actor: 'api',
          });

          response.success = true;
          response.result = {
            action: 'archived',
            task: matchedTask,
            message: `✅ Archived "${matchedTask.title}"`,
          };
        }
        break;
      }

      case 'query':
      case 'list': {
        const query = cmd.params.query || 'all';
        let filter: Record<string, unknown> = {
          tenantId: context.tenantId,
          boardId: targetBoardId,
          $or: [{ archived: { $exists: false } }, { archived: false }],
        };

        // Apply query filters
        if (query === 'overdue') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filter.dueDate = { $lt: today };
        } else if (query === 'stuck') {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const inProgressCol = board.columns?.find(c => 
            c.title.toLowerCase().includes('progress')
          );
          if (inProgressCol) {
            filter.columnId = inProgressCol.id;
            filter.updatedAt = { $lt: threeDaysAgo };
          }
        } else if (query === 'in_progress') {
          const inProgressCol = board.columns?.find(c => 
            c.title.toLowerCase().includes('progress')
          );
          if (inProgressCol) filter.columnId = inProgressCol.id;
        } else if (query === 'todo') {
          const todoCol = board.columns?.find(c => 
            c.title.toLowerCase().includes('to do') || c.title.toLowerCase() === 'todo'
          );
          if (todoCol) filter.columnId = todoCol.id;
        } else if (query.startsWith('priority:')) {
          filter.priority = query.replace('priority:', '');
        }

        const tasks = await db
          .collection<Task>('tasks')
          .find(filter)
          .sort({ priority: 1, order: 1 })
          .limit(20)
          .toArray();

        response.success = true;
        response.result = {
          action: 'query',
          tasks,
          message: tasks.length === 0
            ? `No tasks found for "${query}"`
            : `Found ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`,
        };
        break;
      }

      default:
        response.error = `I didn't understand that command. Try: "create task: ...", "move X to done", "show overdue tasks"`;
        return NextResponse.json(response, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error executing command:', error);
    return NextResponse.json({ error: 'Failed to execute command' }, { status: 500 });
  }
}
