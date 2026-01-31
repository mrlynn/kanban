import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Task } from '@/types/kanban';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import { logActivity } from '@/lib/activity';

// POST reorder tasks (move between columns or reorder within column)
export async function POST(request: NextRequest) {
  try {
    const context = await requireScope(request, 'tasks:write');
    
    const { taskId, targetColumnId, newOrder } = await request.json();
    
    if (!taskId || !targetColumnId || newOrder === undefined) {
      return NextResponse.json(
        { error: 'taskId, targetColumnId, and newOrder are required' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    const tasksCollection = db.collection<Task>('tasks');
    
    // Detect actor
    const actor = context.type === 'apiKey' ? 'api' : 'mike';
    
    // Get the task being moved - verify tenant ownership
    const task = await tasksCollection.findOne({ 
      id: taskId,
      tenantId: context.tenantId 
    });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    const sourceColumnId = task.columnId;
    const sourceOrder = task.order;
    
    // If moving within the same column
    if (sourceColumnId === targetColumnId) {
      if (newOrder > sourceOrder) {
        // Moving down: decrease order of tasks between old and new position
        await tasksCollection.updateMany(
          { 
            tenantId: context.tenantId,
            columnId: targetColumnId, 
            order: { $gt: sourceOrder, $lte: newOrder } 
          },
          { $inc: { order: -1 } }
        );
      } else if (newOrder < sourceOrder) {
        // Moving up: increase order of tasks between new and old position
        await tasksCollection.updateMany(
          { 
            tenantId: context.tenantId,
            columnId: targetColumnId, 
            order: { $gte: newOrder, $lt: sourceOrder } 
          },
          { $inc: { order: 1 } }
        );
      }
    } else {
      // Moving to a different column
      // Decrease order of tasks after the source position in source column
      await tasksCollection.updateMany(
        { 
          tenantId: context.tenantId,
          columnId: sourceColumnId, 
          order: { $gt: sourceOrder } 
        },
        { $inc: { order: -1 } }
      );
      
      // Increase order of tasks at and after the target position in target column
      await tasksCollection.updateMany(
        { 
          tenantId: context.tenantId,
          columnId: targetColumnId, 
          order: { $gte: newOrder } 
        },
        { $inc: { order: 1 } }
      );
      
      // Log the move activity (only for column changes)
      await logActivity({
        tenantId: context.tenantId,
        taskId,
        boardId: task.boardId,
        action: 'moved',
        actor,
        details: {
          from: sourceColumnId,
          to: targetColumnId,
        },
      });
    }
    
    // Update the moved task
    await tasksCollection.updateOne(
      { id: taskId, tenantId: context.tenantId },
      { 
        $set: { 
          columnId: targetColumnId, 
          order: newOrder,
          updatedAt: new Date()
        } 
      }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error reordering tasks:', error);
    return NextResponse.json({ error: 'Failed to reorder tasks' }, { status: 500 });
  }
}
