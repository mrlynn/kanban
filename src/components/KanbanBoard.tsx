'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Badge,
} from '@mui/material';
import { Archive } from '@mui/icons-material';
import { Board, Task, Column } from '@/types/kanban';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskDialog } from './TaskDialog';
import { TaskDetailDialog } from './TaskDetailDialog';
import { ArchiveDrawer } from './ArchiveDrawer';

interface KanbanBoardProps {
  boardId: string;
}

export function KanbanBoard({ boardId }: KanbanBoardProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogColumnId, setDialogColumnId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Archive drawer state
  const [archiveDrawerOpen, setArchiveDrawerOpen] = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Column names map for activity display
  const columnNames = useMemo(() => {
    if (!board) return {};
    return board.columns.reduce((acc, col) => {
      acc[col.id] = col.title;
      return acc;
    }, {} as Record<string, string>);
  }, [board]);

  // Fetch board and tasks
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [boardRes, tasksRes, archiveRes] = await Promise.all([
        fetch(`/api/boards/${boardId}`),
        fetch(`/api/tasks?boardId=${boardId}`),
        fetch(`/api/boards/${boardId}/archive`),
      ]);

      if (!boardRes.ok) throw new Error('Failed to fetch board');
      if (!tasksRes.ok) throw new Error('Failed to fetch tasks');

      const [boardData, tasksData] = await Promise.all([
        boardRes.json(),
        tasksRes.json(),
      ]);

      setBoard(boardData);
      setTasks(tasksData);
      
      if (archiveRes.ok) {
        const archiveData = await archiveRes.json();
        setArchivedCount(archiveData.count || 0);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get tasks for a specific column
  const getTasksByColumn = (columnId: string) => {
    return tasks
      .filter((task) => task.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Determine target column
    let targetColumnId = over.id as string;
    
    // If dropped on another task, get its column
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      targetColumnId = overTask.columnId;
    }

    // Calculate new order
    const tasksInTargetColumn = getTasksByColumn(targetColumnId);
    let newOrder = 0;

    if (overTask) {
      // If dropped on a task, insert at that position
      newOrder = overTask.order;
      if (activeTask.columnId === targetColumnId && activeTask.order < overTask.order) {
        // Moving down in same column
        newOrder = overTask.order;
      }
    } else {
      // Dropped on empty column or at the end
      newOrder = tasksInTargetColumn.length;
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeTask.id
          ? { ...t, columnId: targetColumnId, order: newOrder }
          : t
      )
    );

    // Send to API
    try {
      await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: activeTask.id,
          targetColumnId,
          newOrder,
        }),
      });
      // Refetch to ensure consistency
      fetchData();
    } catch (err) {
      console.error('Failed to reorder:', err);
      fetchData(); // Revert on error
    }
  };

  // Add task handler
  const handleAddTask = (columnId: string) => {
    setDialogColumnId(columnId);
    setEditingTask(null);
    setDialogOpen(true);
  };

  // Edit task handler
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDialogColumnId(task.columnId);
    setDialogOpen(true);
  };

  // Delete task handler
  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Open task details
  const handleOpenDetails = (task: Task) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  // Archive task handler
  const handleArchiveTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/archive`, { method: 'POST' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setArchivedCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Failed to archive task:', err);
    }
  };

  // Restore task handler
  const handleRestoreTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/archive`, { method: 'DELETE' });
      if (res.ok) {
        const restored = await res.json();
        setTasks((prev) => [...prev, restored]);
        setArchivedCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to restore task:', err);
    }
  };

  // Bulk archive handler
  const handleBulkArchive = async (columnId: string) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId }),
      });
      if (res.ok) {
        const result = await res.json();
        // Remove archived tasks from state
        setTasks((prev) => prev.filter((t) => !result.taskIds?.includes(t.id)));
        setArchivedCount((prev) => prev + (result.count || 0));
      }
    } catch (err) {
      console.error('Failed to bulk archive:', err);
    }
  };

  // Get Done column ID
  const doneColumnId = useMemo(() => {
    return board?.columns.find((c) => c.title.toLowerCase() === 'done')?.id || '';
  }, [board]);

  // Save task handler
  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        // Update existing
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        if (res.ok) {
          const updated = await res.json();
          setTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
          );
          // Update selected task if detail dialog is open
          if (selectedTask?.id === updated.id) {
            setSelectedTask(updated);
          }
        }
      } else {
        // Create new
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...taskData,
            columnId: dialogColumnId,
            boardId,
          }),
        });
        if (res.ok) {
          const newTask = await res.json();
          setTasks((prev) => [...prev, newTask]);
        }
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    }
    setDialogOpen(false);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
        }}
      >
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error || !board) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error || 'Board not found'}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            {board.name}
          </Typography>
          {board.description && (
            <Typography variant="body2" color="text.secondary">
              {board.description}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={
            <Badge badgeContent={archivedCount} color="primary" max={99}>
              <Archive />
            </Badge>
          }
          onClick={() => setArchiveDrawerOpen(true)}
          sx={{ minWidth: 120 }}
        >
          Archive
        </Button>
      </Box>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flex: 1,
            overflowX: 'auto',
            pb: 2,
          }}
        >
          {board.columns.map((column) => {
            const isDoneColumn = column.id === doneColumnId;
            return (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={getTasksByColumn(column.id)}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onOpenDetails={handleOpenDetails}
                onArchive={handleArchiveTask}
                onBulkArchive={isDoneColumn ? handleBulkArchive : undefined}
                collapsible={isDoneColumn}
                defaultVisibleCount={10}
              />
            );
          })}
        </Box>

        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        open={dialogOpen}
        task={editingTask}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveTask}
      />

      <TaskDetailDialog
        open={detailDialogOpen}
        task={selectedTask}
        onClose={() => setDetailDialogOpen(false)}
        onEdit={(task) => {
          setDetailDialogOpen(false);
          handleEditTask(task);
        }}
        columnNames={columnNames}
      />

      <ArchiveDrawer
        open={archiveDrawerOpen}
        onClose={() => setArchiveDrawerOpen(false)}
        boardId={boardId}
        onRestore={handleRestoreTask}
        onDelete={handleDeleteTask}
        onBulkArchive={handleBulkArchive}
        doneColumnId={doneColumnId}
      />
    </Box>
  );
}
