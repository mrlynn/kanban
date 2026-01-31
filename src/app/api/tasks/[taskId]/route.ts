import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Task } from '@/types/kanban';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { logActivity, detectActor } from '@/lib/activity';

// GET single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
    const { taskId } = await params;
    const db = await getDb();
    
    const task = await db.collection<Task>('tasks').findOne({ id: taskId });
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// PATCH update task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
    const { taskId } = await params;
    const updates = await request.json();
    const db = await getDb();
    
    // Detect actor
    const apiKey = request.headers.get('x-api-key');
    const actor = detectActor(apiKey);
    
    // Get current task state for comparison
    const currentTask = await db.collection<Task>('tasks').findOne({ id: taskId });
    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Handle date conversion
    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate);
    }
    
    const result = await db.collection<Task>('tasks').findOneAndUpdate(
      { id: taskId },
      { 
        $set: { 
          ...updates,
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Log activities for specific changes
    const boardId = currentTask.boardId;
    
    // Track column move
    if (updates.columnId && updates.columnId !== currentTask.columnId) {
      await logActivity({
        taskId,
        boardId,
        action: 'moved',
        actor,
        details: {
          from: currentTask.columnId,
          to: updates.columnId,
        },
      });
    }
    
    // Track priority change
    if (updates.priority !== undefined && updates.priority !== currentTask.priority) {
      await logActivity({
        taskId,
        boardId,
        action: 'priority_changed',
        actor,
        details: {
          field: 'priority',
          from: currentTask.priority || 'none',
          to: updates.priority || 'none',
        },
      });
    }
    
    // Track checklist changes (supports nested items)
    if (updates.checklist !== undefined) {
      // Recursive counter for nested checklists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countItems = (items: any[]): { completed: number; total: number } => {
        let completed = 0, total = 0;
        for (const item of items) {
          total++;
          if (item.completed) completed++;
          if (item.children?.length) {
            const child = countItems(item.children);
            completed += child.completed;
            total += child.total;
          }
        }
        return { completed, total };
      };
      
      const oldChecklist = currentTask.checklist || [];
      const newChecklist = updates.checklist || [];
      const oldCounts = countItems(oldChecklist);
      const newCounts = countItems(newChecklist);
      
      // Determine what changed
      let checklistNote = '';
      if (newCounts.total > oldCounts.total) {
        checklistNote = 'added checklist item';
      } else if (newCounts.total < oldCounts.total) {
        checklistNote = 'removed checklist item';
      } else if (newCounts.completed !== oldCounts.completed) {
        checklistNote = newCounts.completed > oldCounts.completed ? 'completed checklist item' : 'uncompleted checklist item';
      }
      
      if (checklistNote) {
        await logActivity({
          taskId,
          boardId,
          action: 'updated',
          actor,
          details: {
            field: 'checklist',
            note: `${checklistNote} (${newCounts.completed}/${newCounts.total})`,
          },
        });
      }
    }
    
    // Track assignee change
    if (updates.assigneeId !== undefined && updates.assigneeId !== currentTask.assigneeId) {
      await logActivity({
        taskId,
        boardId,
        action: 'updated',
        actor,
        details: {
          field: 'assignee',
          from: currentTask.assigneeId || 'unassigned',
          to: updates.assigneeId || 'unassigned',
        },
      });
    }
    
    // Track general updates (title, description, labels, dueDate)
    const trackedFields = ['title', 'description', 'labels', 'dueDate'];
    const changedFields = trackedFields.filter(
      field => updates[field] !== undefined && 
               JSON.stringify(updates[field]) !== JSON.stringify(currentTask[field as keyof Task])
    );
    
    if (changedFields.length > 0 && !updates.columnId) {
      await logActivity({
        taskId,
        boardId,
        action: 'updated',
        actor,
        details: {
          field: changedFields.join(', '),
        },
      });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
    const { taskId } = await params;
    const db = await getDb();
    
    // Detect actor
    const apiKey = request.headers.get('x-api-key');
    const actor = detectActor(apiKey);
    
    // Get task for logging
    const task = await db.collection<Task>('tasks').findOne({ id: taskId });
    
    const result = await db.collection<Task>('tasks').deleteOne({ id: taskId });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Log deletion
    if (task) {
      await logActivity({
        taskId,
        boardId: task.boardId,
        action: 'deleted',
        actor,
        details: {
          note: task.title,
        },
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
