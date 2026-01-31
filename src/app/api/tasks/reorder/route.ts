import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Task } from '@/types/kanban';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { logActivity, detectActor } from '@/lib/activity';

// POST reorder tasks (move between columns or reorder within column)
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
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
    const apiKey = request.headers.get('x-api-key');
    const actor = detectActor(apiKey);
    
    // Get the task being moved
    const task = await tasksCollection.findOne({ id: taskId });
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
            columnId: targetColumnId, 
            order: { $gt: sourceOrder, $lte: newOrder } 
          },
          { $inc: { order: -1 } }
        );
      } else if (newOrder < sourceOrder) {
        // Moving up: increase order of tasks between new and old position
        await tasksCollection.updateMany(
          { 
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
        { columnId: sourceColumnId, order: { $gt: sourceOrder } },
        { $inc: { order: -1 } }
      );
      
      // Increase order of tasks at and after the target position in target column
      await tasksCollection.updateMany(
        { columnId: targetColumnId, order: { $gte: newOrder } },
        { $inc: { order: 1 } }
      );
      
      // Log the move activity (only for column changes)
      await logActivity({
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
      { id: taskId },
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
    console.error('Error reordering tasks:', error);
    return NextResponse.json({ error: 'Failed to reorder tasks' }, { status: 500 });
  }
}
