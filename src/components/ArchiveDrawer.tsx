'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Chip,
  alpha,
  CircularProgress,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Close,
  Unarchive,
  Delete,
  Archive,
} from '@mui/icons-material';
import { Task, PriorityConfig } from '@/types/kanban';

interface ArchiveDrawerProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  onRestore: (taskId: string) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onBulkArchive: (columnId: string) => Promise<void>;
  doneColumnId: string;
}

const labelColors: Record<string, string> = {
  bug: '#EF4444',
  feature: '#3B82F6',
  improvement: '#10B981',
  urgent: '#F59E0B',
  documentation: '#8B5CF6',
  research: '#EC4899',
  ux: '#06B6D4',
  infra: '#6366F1',
  marketing: '#14B8A6',
  growth: '#84CC16',
  product: '#F97316',
  priority: '#DC2626',
  skill: '#A855F7',
  mongodb: '#00ED64',
  completed: '#22C55E',
};

export function ArchiveDrawer({
  open,
  onClose,
  boardId,
  onRestore,
  onDelete,
  onBulkArchive,
  doneColumnId,
}: ArchiveDrawerProps) {
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchArchivedTasks = useCallback(async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?boardId=${boardId}&archivedOnly=true`);
      if (res.ok) {
        const data = await res.json();
        setArchivedTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch archived tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [open, boardId]);

  useEffect(() => {
    fetchArchivedTasks();
  }, [fetchArchivedTasks]);

  const handleRestore = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await onRestore(taskId);
      setArchivedTasks((prev) => prev.filter((t) => t.id !== taskId));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await onDelete(taskId);
      setArchivedTasks((prev) => prev.filter((t) => t.id !== taskId));
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkArchive = async () => {
    setActionLoading('bulk');
    try {
      await onBulkArchive(doneColumnId);
      await fetchArchivedTasks();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 400,
          maxWidth: '100vw',
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Archive sx={{ color: 'text.secondary' }} />
          <Typography variant="h6">Archived Tasks</Typography>
          <Chip
            label={archivedTasks.length}
            size="small"
            sx={{ ml: 1 }}
          />
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Button
          variant="outlined"
          startIcon={<Archive />}
          onClick={handleBulkArchive}
          disabled={actionLoading === 'bulk'}
          fullWidth
          sx={{ mb: 2 }}
        >
          {actionLoading === 'bulk' ? 'Archiving...' : 'Archive All Done Tasks'}
        </Button>
      </Box>

      <Divider />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : archivedTasks.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No archived tasks
          </Typography>
        </Box>
      ) : (
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {archivedTasks.map((task) => {
            const priorityConfig = task.priority ? PriorityConfig[task.priority] : null;
            
            return (
              <ListItem
                key={task.id}
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  opacity: actionLoading === task.id ? 0.5 : 1,
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {priorityConfig && (
                        <Chip
                          label={priorityConfig.icon}
                          size="small"
                          sx={{
                            height: 18,
                            minWidth: 24,
                            bgcolor: alpha(priorityConfig.color, 0.2),
                            color: priorityConfig.color,
                          }}
                        />
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {task.title}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      {task.labels && task.labels.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                          {task.labels.map((label) => (
                            <Chip
                              key={label}
                              label={label}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                bgcolor: alpha(labelColors[label] || '#6B7280', 0.2),
                                color: labelColors[label] || '#6B7280',
                              }}
                            />
                          ))}
                        </Box>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Archived {task.archivedAt ? new Date(task.archivedAt).toLocaleDateString() : 'recently'}
                        {task.archivedBy && ` by ${task.archivedBy}`}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Restore">
                    <IconButton
                      size="small"
                      onClick={() => handleRestore(task.id)}
                      disabled={actionLoading === task.id}
                      sx={{ color: 'success.main' }}
                    >
                      <Unarchive fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete permanently">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(task.id)}
                      disabled={actionLoading === task.id}
                      sx={{ color: 'error.main' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      )}
    </Drawer>
  );
}
