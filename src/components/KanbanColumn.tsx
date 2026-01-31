'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  alpha,
  Chip,
  Button,
} from '@mui/material';
import { Add, ExpandMore, ExpandLess, Archive } from '@mui/icons-material';
import { Column, Task } from '@/types/kanban';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenDetails?: (task: Task) => void;
  onArchive?: (taskId: string) => void;
  onBulkArchive?: (columnId: string) => void;
  collapsible?: boolean;
  defaultVisibleCount?: number;
  commentStats?: Record<string, { total: number; unreadMoltbot: number }>;
  isMobile?: boolean;
}

const columnColors: Record<string, string> = {
  default: '#6B7280',
  primary: '#00ED64',
  secondary: '#7C3AED',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  success: '#10B981',
};

export function KanbanColumn({
  column,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onOpenDetails,
  onArchive,
  onBulkArchive,
  collapsible = false,
  defaultVisibleCount = 10,
  commentStats = {},
  isMobile = false,
}: KanbanColumnProps) {
  const [expanded, setExpanded] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const accentColor = columnColors[column.color || 'default'];
  
  // Determine which tasks to show
  const shouldCollapse = collapsible && tasks.length > defaultVisibleCount && !expanded;
  const visibleTasks = shouldCollapse 
    ? tasks.slice(-defaultVisibleCount) // Show last N tasks (most recent)
    : tasks;
  const hiddenCount = tasks.length - visibleTasks.length;

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        // Responsive width: full screen on mobile, fixed on desktop
        width: isMobile ? 'calc(100vw - 32px)' : 320,
        minWidth: isMobile ? 'calc(100vw - 32px)' : 320,
        flexShrink: 0,
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: alpha('#ffffff', 0.02),
        border: '1px solid',
        borderColor: isOver ? 'primary.main' : alpha('#ffffff', 0.1),
        transition: 'border-color 0.2s',
        // Mobile: snap to center
        scrollSnapAlign: isMobile ? 'center' : 'none',
        mx: isMobile ? 2 : 0,
      }}
    >
      {/* Column Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: alpha('#ffffff', 0.1),
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: accentColor,
          }}
        />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
          {column.title}
        </Typography>
        <Chip
          label={tasks.length}
          size="small"
          sx={{
            height: 22,
            minWidth: 28,
            bgcolor: alpha(accentColor, 0.2),
            color: accentColor,
            fontWeight: 600,
          }}
        />
        {collapsible && tasks.length > 0 && onBulkArchive && (
          <IconButton
            size="small"
            onClick={() => onBulkArchive(column.id)}
            sx={{ color: 'text.secondary' }}
            title="Archive all"
          >
            <Archive fontSize="small" />
          </IconButton>
        )}
        <IconButton
          size="small"
          onClick={() => onAddTask(column.id)}
          sx={{ color: 'text.secondary' }}
        >
          <Add fontSize="small" />
        </IconButton>
      </Box>

      {/* Tasks Container */}
      <Box
        sx={{
          flex: 1,
          p: 1.5,
          overflowY: 'auto',
          minHeight: 200,
        }}
      >
        {/* Show more button at top when collapsed */}
        {shouldCollapse && hiddenCount > 0 && (
          <Button
            size="small"
            onClick={() => setExpanded(true)}
            startIcon={<ExpandMore />}
            fullWidth
            sx={{
              mb: 1.5,
              color: 'text.secondary',
              borderColor: alpha('#ffffff', 0.2),
              '&:hover': {
                borderColor: alpha('#ffffff', 0.4),
                bgcolor: alpha('#ffffff', 0.05),
              },
            }}
            variant="outlined"
          >
            Show {hiddenCount} older {hiddenCount === 1 ? 'task' : 'tasks'}
          </Button>
        )}

        {/* Collapse button when expanded */}
        {collapsible && expanded && tasks.length > defaultVisibleCount && (
          <Button
            size="small"
            onClick={() => setExpanded(false)}
            startIcon={<ExpandLess />}
            fullWidth
            sx={{
              mb: 1.5,
              color: 'text.secondary',
              borderColor: alpha('#ffffff', 0.2),
              '&:hover': {
                borderColor: alpha('#ffffff', 0.4),
                bgcolor: alpha('#ffffff', 0.05),
              },
            }}
            variant="outlined"
          >
            Show less
          </Button>
        )}

        <SortableContext
          items={visibleTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {visibleTasks.map((task) => {
            const stats = commentStats[task.id];
            return (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onOpenDetails={onOpenDetails}
                onArchive={onArchive}
                commentCount={stats?.total || 0}
                unreadMoltbotComments={stats?.unreadMoltbot || 0}
                isMobile={isMobile}
              />
            );
          })}
        </SortableContext>
        
        {tasks.length === 0 && (
          <Box
            sx={{
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed',
              borderColor: alpha('#ffffff', 0.1),
              borderRadius: 2,
              color: 'text.disabled',
            }}
          >
            <Typography variant="caption">Drop tasks here</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
