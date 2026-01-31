'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  TextField,
  Button,
  Divider,
  Avatar,
  alpha,
  IconButton,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Close,
  CalendarToday,
  Send,
  Edit,
  ArrowForward,
  Add,
  Update,
  Delete,
  Comment as CommentIcon,
  PriorityHigh,
} from '@mui/icons-material';
import { Task, TaskComment, TaskActivity, PriorityConfig, Actor } from '@/types/kanban';

interface TaskDetailDialogProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  columnNames: Record<string, string>;
}

const actorConfig: Record<Actor, { name: string; color: string; avatar: string }> = {
  mike: { name: 'Mike', color: '#3B82F6', avatar: 'M' },
  moltbot: { name: 'Moltbot', color: '#F97316', avatar: '🔥' },
  system: { name: 'System', color: '#6B7280', avatar: 'S' },
  api: { name: 'API', color: '#8B5CF6', avatar: 'A' },
};

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

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function ActivityIcon({ action }: { action: string }) {
  switch (action) {
    case 'created':
      return <Add fontSize="small" />;
    case 'moved':
      return <ArrowForward fontSize="small" />;
    case 'updated':
      return <Update fontSize="small" />;
    case 'deleted':
      return <Delete fontSize="small" />;
    case 'commented':
      return <CommentIcon fontSize="small" />;
    case 'priority_changed':
      return <PriorityHigh fontSize="small" />;
    default:
      return <Update fontSize="small" />;
  }
}

export function TaskDetailDialog({
  open,
  task,
  onClose,
  onEdit,
  columnNames,
}: TaskDetailDialogProps) {
  const [tabValue, setTabValue] = useState(0);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch comments and activities when task changes
  useEffect(() => {
    if (task && open) {
      setLoading(true);
      Promise.all([
        fetch(`/api/tasks/${task.id}/comments`).then((r) => r.json()),
        fetch(`/api/tasks/${task.id}/activities`).then((r) => r.json()),
      ])
        .then(([commentsData, activitiesData]) => {
          setComments(commentsData);
          setActivities(activitiesData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [task, open]);

  const handleSubmitComment = async () => {
    if (!task || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewComment('');
        // Refresh activities
        const activitiesRes = await fetch(`/api/tasks/${task.id}/activities`);
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData);
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!task) return null;

  const priorityConfig = task.priority ? PriorityConfig[task.priority] : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          minHeight: '60vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          pb: 1,
        }}
      >
        <Box sx={{ flex: 1, pr: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {priorityConfig && (
              <Chip
                label={`${priorityConfig.icon} ${priorityConfig.label}`}
                size="small"
                sx={{
                  bgcolor: alpha(priorityConfig.color, 0.2),
                  color: priorityConfig.color,
                  fontWeight: 600,
                }}
              />
            )}
            {task.labels?.map((label) => (
              <Chip
                key={label}
                label={label}
                size="small"
                sx={{
                  bgcolor: alpha(labelColors[label] || '#6B7280', 0.2),
                  color: labelColors[label] || '#6B7280',
                }}
              />
            ))}
          </Box>
          <Typography variant="h6">{task.title}</Typography>
          {task.dueDate && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              <CalendarToday sx={{ fontSize: 16 }} />
              <Typography variant="body2">
                Due {new Date(task.dueDate).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" onClick={() => onEdit(task)}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {task.description && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {task.description}
            </Typography>
          </Box>
        )}

        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label={`Comments (${comments.length})`} />
          <Tab label={`Activity (${activities.length})`} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {/* Comments Tab */}
            {tabValue === 0 && (
              <Box>
                {/* Comment input */}
                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                    multiline
                    maxRows={4}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    <Send fontSize="small" />
                  </Button>
                </Box>

                {/* Comments list */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {comments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      No comments yet. Be the first to comment!
                    </Typography>
                  ) : (
                    comments.map((comment) => {
                      const actor = actorConfig[comment.author];
                      return (
                        <Box key={comment.id} sx={{ display: 'flex', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: actor.color,
                              fontSize: '0.875rem',
                            }}
                          >
                            {actor.avatar}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {actor.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatTimeAgo(comment.createdAt)}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {comment.content}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })
                  )}
                </Box>
              </Box>
            )}

            {/* Activity Tab */}
            {tabValue === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {activities.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No activity recorded yet.
                  </Typography>
                ) : (
                  activities.map((activity) => {
                    const actor = actorConfig[activity.actor];
                    return (
                      <Box
                        key={activity.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: alpha(actor.color, 0.2),
                            color: actor.color,
                          }}
                        >
                          <ActivityIcon action={activity.action} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2">
                            <strong>{actor.name}</strong>{' '}
                            {activity.action === 'created' && 'created this task'}
                            {activity.action === 'moved' && (
                              <>
                                moved from{' '}
                                <Chip
                                  label={columnNames[activity.details?.from || ''] || activity.details?.from}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />{' '}
                                to{' '}
                                <Chip
                                  label={columnNames[activity.details?.to || ''] || activity.details?.to}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              </>
                            )}
                            {activity.action === 'updated' && (
                              <>updated {activity.details?.field}</>
                            )}
                            {activity.action === 'priority_changed' && (
                              <>
                                changed priority from{' '}
                                <strong>{activity.details?.from}</strong> to{' '}
                                <strong>{activity.details?.to}</strong>
                              </>
                            )}
                            {activity.action === 'commented' && 'added a comment'}
                            {activity.action === 'deleted' && 'deleted this task'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(activity.timestamp)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
