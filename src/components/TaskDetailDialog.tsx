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
  Checkbox,
  LinearProgress,
  Collapse,
  Tooltip,
  SwipeableDrawer,
  useMediaQuery,
  useTheme,
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
  Warning,
  CheckCircle,
  CheckCircleOutline,
  RadioButtonUnchecked,
  SubdirectoryArrowRight,
  ExpandMore,
  ChevronRight,
} from '@mui/icons-material';
import { Task, TaskComment, TaskActivity, PriorityConfig, Actor, USERS, ChecklistItem, countChecklistItems } from '@/types/kanban';

interface TaskDetailDialogProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  columnNames: Record<string, string>;
}

const actorConfig: Record<string, { name: string; color: string; avatar: string }> = {
  mike: { name: 'Mike', color: '#3B82F6', avatar: 'M' },
  agent: { name: 'AI Assistant', color: '#F97316', avatar: '🤖' },
  moltbot: { name: 'AI Assistant', color: '#F97316', avatar: '🤖' }, // Legacy alias
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

function formatDueDate(date: Date): string {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  const compareDate = new Date(d);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) return 'Today';
  if (compareDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
  
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDueDateStatus(date: Date): 'overdue' | 'today' | 'soon' | 'normal' {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(d);
  compareDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((compareDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 2) return 'soon';
  return 'normal';
}

const dueDateColors = {
  overdue: { bg: '#DC2626', text: '#FFF' },
  today: { bg: '#F97316', text: '#FFF' },
  soon: { bg: '#EAB308', text: '#000' },
  normal: { bg: '#6B7280', text: '#FFF' },
};

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

// Generate unique ID for checklist items
function generateChecklistItemId(): string {
  return `chk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function TaskDetailDialog({
  open,
  task,
  onClose,
  onEdit,
  onUpdate,
  columnNames,
}: TaskDetailDialogProps) {
  const [tabValue, setTabValue] = useState(0);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [checklistUpdating, setChecklistUpdating] = useState(false);

  // Fetch comments and activities when task changes
  useEffect(() => {
    if (task && open) {
      setLoading(true);
      setChecklist(task.checklist || []);
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

  // Checklist handlers - support nested items
  const updateChecklist = async (newChecklist: ChecklistItem[]) => {
    if (!task || !onUpdate) return;
    setChecklistUpdating(true);
    try {
      await onUpdate(task.id, { checklist: newChecklist });
      setChecklist(newChecklist);
    } catch (error) {
      console.error('Failed to update checklist:', error);
    } finally {
      setChecklistUpdating(false);
    }
  };

  // Recursively find and update an item
  const updateItemRecursive = (
    items: ChecklistItem[],
    itemId: string,
    updater: (item: ChecklistItem) => ChecklistItem | null
  ): ChecklistItem[] => {
    return items
      .map((item) => {
        if (item.id === itemId) {
          return updater(item);
        }
        if (item.children?.length) {
          return {
            ...item,
            children: updateItemRecursive(item.children, itemId, updater),
          };
        }
        return item;
      })
      .filter((item): item is ChecklistItem => item !== null)
      .map((item, idx) => ({ ...item, order: idx }));
  };

  // Check if all children are completed
  const allChildrenCompleted = (item: ChecklistItem): boolean => {
    if (!item.children?.length) return true;
    return item.children.every((child) => child.completed && allChildrenCompleted(child));
  };

  // Auto-bubble completion up to parents
  const bubbleCompletion = (items: ChecklistItem[]): ChecklistItem[] => {
    return items.map((item) => {
      if (item.children?.length) {
        const updatedChildren = bubbleCompletion(item.children);
        const shouldComplete = updatedChildren.every((c) => c.completed);
        return {
          ...item,
          children: updatedChildren,
          completed: shouldComplete,
        };
      }
      return item;
    });
  };

  const handleAddChecklistItem = async (parentId?: string) => {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
      id: generateChecklistItemId(),
      text: newChecklistItem.trim(),
      completed: false,
      order: 0,
    };

    let newChecklist: ChecklistItem[];
    if (parentId) {
      // Add as child of parent
      newChecklist = updateItemRecursive(checklist, parentId, (parent) => ({
        ...parent,
        completed: false, // Uncheck parent when adding child
        children: [...(parent.children || []), { ...newItem, order: (parent.children?.length || 0) }],
      }));
    } else {
      // Add at root level
      newChecklist = [...checklist, { ...newItem, order: checklist.length }];
    }
    await updateChecklist(newChecklist);
    setNewChecklistItem('');
    setAddingChildTo(null);
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    let newChecklist = updateItemRecursive(checklist, itemId, (item) => ({
      ...item,
      completed: !item.completed,
      // If unchecking, keep children as-is. If checking, also check all children
      children: !item.completed
        ? item.children?.map(function markComplete(c): ChecklistItem {
            return { ...c, completed: true, children: c.children?.map(markComplete) };
          })
        : item.children,
    }));
    // Auto-bubble: check if parents should auto-complete
    newChecklist = bubbleCompletion(newChecklist);
    await updateChecklist(newChecklist);
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    const newChecklist = updateItemRecursive(checklist, itemId, () => null);
    await updateChecklist(bubbleCompletion(newChecklist));
  };

  // State for adding child items
  const [addingChildTo, setAddingChildTo] = useState<string | null>(null);

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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!task) return null;

  const priorityConfig = task.priority ? PriorityConfig[task.priority] : null;
  const assignee = task.assigneeId ? USERS.find(u => u.id === task.assigneeId) : null;

  // Content shared between Dialog and Drawer
  const headerContent = (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        p: isMobile ? 2 : 0,
        pb: 1,
      }}
    >
      <Box sx={{ flex: 1, pr: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
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
        <Typography variant="h6" sx={{ fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
          {task.title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          {task.dueDate && (() => {
            const status = getDueDateStatus(task.dueDate);
            const colors = dueDateColors[status];
            return (
              <Chip
                icon={status === 'overdue' ? <Warning sx={{ fontSize: 16 }} /> : <CalendarToday sx={{ fontSize: 16 }} />}
                label={`Due ${formatDueDate(task.dueDate)}`}
                size="small"
                sx={{
                  fontWeight: 600,
                  bgcolor: alpha(colors.bg, status === 'normal' ? 0.2 : 0.9),
                  color: status === 'normal' ? 'text.secondary' : colors.text,
                  '& .MuiChip-icon': {
                    color: status === 'normal' ? 'text.secondary' : colors.text,
                  },
                }}
              />
            );
          })()}
          {assignee && (
            <Chip
              avatar={
                <Avatar sx={{ bgcolor: assignee.color, width: 24, height: 24, fontSize: '0.75rem' }}>
                  {assignee.avatar || assignee.name[0]}
                </Avatar>
              }
              label={assignee.name}
              size="small"
              sx={{
                bgcolor: alpha(assignee.color, 0.15),
                color: assignee.color,
                fontWeight: 500,
              }}
            />
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton size="small" onClick={() => onEdit(task)}>
          <Edit fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );

  // Mobile: Use SwipeableDrawer from bottom
  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        onOpen={() => {}}
        disableSwipeToOpen
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '90vh',
            overflow: 'hidden',
          },
        }}
      >
        {/* Swipe handle */}
        <Box
          sx={{
            width: 40,
            height: 4,
            bgcolor: 'grey.400',
            borderRadius: 2,
            mx: 'auto',
            mt: 1.5,
            mb: 0.5,
          }}
        />
        
        {headerContent}
        
        <Box sx={{ px: 2, pb: 3, overflow: 'auto', maxHeight: 'calc(90vh - 160px)' }}>
          {task.description && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {task.description}
              </Typography>
            </Box>
          )}

          {/* Checklist Section */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleOutline fontSize="small" />
                Checklist
                {checklist.length > 0 && (() => {
                  const { completed, total } = countChecklistItems(checklist);
                  return (
                    <Chip
                      label={`${completed}/${total}`}
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  );
                })()}
              </Typography>
              {checklistUpdating && <CircularProgress size={16} />}
            </Box>
            
            {/* Progress bar */}
            {checklist.length > 0 && (() => {
              const { completed, total } = countChecklistItems(checklist);
              const percent = total > 0 ? (completed / total) * 100 : 0;
              return (
                <LinearProgress
                  variant="determinate"
                  value={percent}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    mb: 2,
                    bgcolor: alpha('#6B7280', 0.2),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: completed === total ? '#22C55E' : '#3B82F6',
                    },
                  }}
                />
              );
            })()}

            {/* Simplified checklist for mobile - collapsed nested items */}
            {checklist.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.75,
                  px: 1,
                  borderRadius: 1,
                }}
              >
                <Checkbox
                  checked={item.completed}
                  onChange={() => handleToggleChecklistItem(item.id)}
                  size="small"
                  sx={{ p: 0.5 }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    textDecoration: item.completed ? 'line-through' : 'none',
                    color: item.completed ? 'text.disabled' : 'text.primary',
                  }}
                >
                  {item.text}
                  {item.children && item.children.length > 0 && (
                    <Chip
                      label={`+${item.children.length}`}
                      size="small"
                      sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                    />
                  )}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Tabs for Comments/Activity */}
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            sx={{ mb: 2, minHeight: 40 }}
          >
            <Tab label={`Comments (${comments.length})`} sx={{ minHeight: 40, py: 0 }} />
            <Tab label={`Activity (${activities.length})`} sx={{ minHeight: 40, py: 0 }} />
          </Tabs>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              {tabValue === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                      multiline
                      maxRows={3}
                    />
                    <IconButton
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || submitting}
                      color="primary"
                    >
                      {submitting ? <CircularProgress size={20} /> : <Send />}
                    </IconButton>
                  </Box>
                  {comments.map((comment) => {
                    const actor = actorConfig[comment.author];
                    return (
                      <Box key={comment.id} sx={{ display: 'flex', gap: 1.5 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(actor.color, 0.2), color: actor.color, fontSize: '0.8rem' }}>
                          {actor.avatar}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={600}>{actor.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{formatTimeAgo(comment.createdAt)}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{comment.content}</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
              {tabValue === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {activities.map((activity) => {
                    const actor = actorConfig[activity.actor];
                    return (
                      <Box key={activity.id} sx={{ display: 'flex', gap: 1.5, py: 0.5 }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: alpha(actor.color, 0.2), color: actor.color }}>
                          <ActivityIcon action={activity.action} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            <strong>{actor.name}</strong>{' '}
                            {activity.action === 'created' && 'created this task'}
                            {activity.action === 'moved' && `moved task`}
                            {activity.action === 'updated' && `updated ${activity.details?.field}`}
                            {activity.action === 'commented' && 'commented'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{formatTimeAgo(activity.timestamp)}</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </>
          )}
        </Box>
      </SwipeableDrawer>
    );
  }

  // Desktop: Use Dialog
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            {task.dueDate && (() => {
              const status = getDueDateStatus(task.dueDate);
              const colors = dueDateColors[status];
              return (
                <Chip
                  icon={status === 'overdue' ? <Warning sx={{ fontSize: 16 }} /> : <CalendarToday sx={{ fontSize: 16 }} />}
                  label={`Due ${formatDueDate(task.dueDate)}`}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    bgcolor: alpha(colors.bg, status === 'normal' ? 0.2 : 0.9),
                    color: status === 'normal' ? 'text.secondary' : colors.text,
                    '& .MuiChip-icon': {
                      color: status === 'normal' ? 'text.secondary' : colors.text,
                    },
                  }}
                />
              );
            })()}
            {assignee && (
              <Chip
                avatar={
                  <Avatar sx={{ bgcolor: assignee.color, width: 24, height: 24, fontSize: '0.75rem' }}>
                    {assignee.avatar || assignee.name[0]}
                  </Avatar>
                }
                label={assignee.name}
                size="small"
                sx={{
                  bgcolor: alpha(assignee.color, 0.15),
                  color: assignee.color,
                  fontWeight: 500,
                }}
              />
            )}
          </Box>
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

        {/* Checklist Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleOutline fontSize="small" />
              Checklist
              {checklist.length > 0 && (() => {
                const { completed, total } = countChecklistItems(checklist);
                return (
                  <Chip
                    label={`${completed}/${total}`}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                );
              })()}
            </Typography>
            {checklistUpdating && <CircularProgress size={16} />}
          </Box>
          
          {/* Progress bar */}
          {checklist.length > 0 && (() => {
            const { completed, total } = countChecklistItems(checklist);
            const percent = total > 0 ? (completed / total) * 100 : 0;
            return (
              <LinearProgress
                variant="determinate"
                value={percent}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  mb: 2,
                  bgcolor: alpha('#6B7280', 0.2),
                  '& .MuiLinearProgress-bar': {
                    bgcolor: completed === total ? '#22C55E' : '#3B82F6',
                  },
                }}
              />
            );
          })()}

          {/* Recursive Checklist Item Renderer */}
          {(() => {
            const renderChecklistItem = (item: ChecklistItem, depth: number = 0) => (
              <Box key={item.id}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    py: 0.5,
                    px: 1,
                    pl: 1 + depth * 3,
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: alpha('#6B7280', 0.1),
                      '& .item-actions': { opacity: 1 },
                    },
                  }}
                >
                  {depth > 0 && (
                    <SubdirectoryArrowRight 
                      sx={{ fontSize: 16, color: 'text.disabled', ml: -2 }} 
                    />
                  )}
                  <Checkbox
                    checked={item.completed}
                    onChange={() => handleToggleChecklistItem(item.id)}
                    size="small"
                    sx={{
                      p: 0.5,
                      color: 'text.secondary',
                      '&.Mui-checked': { color: '#22C55E' },
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      textDecoration: item.completed ? 'line-through' : 'none',
                      color: item.completed ? 'text.secondary' : 'text.primary',
                    }}
                  >
                    {item.text}
                  </Typography>
                  {item.children?.length ? (
                    <Chip
                      label={`${item.children.filter(c => c.completed).length}/${item.children.length}`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha('#6B7280', 0.15) }}
                    />
                  ) : null}
                  <Box
                    className="item-actions"
                    sx={{ display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 0.2s' }}
                  >
                    <Tooltip title="Add sub-item">
                      <IconButton
                        size="small"
                        onClick={() => setAddingChildTo(addingChildTo === item.id ? null : item.id)}
                        sx={{ 
                          color: addingChildTo === item.id ? 'primary.main' : 'text.secondary',
                          bgcolor: addingChildTo === item.id ? alpha('#3B82F6', 0.1) : 'transparent',
                        }}
                      >
                        <Add sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteChecklistItem(item.id)}
                    >
                      <Delete sx={{ fontSize: 16, color: 'error.main' }} />
                    </IconButton>
                  </Box>
                </Box>
                
                {/* Add child input */}
                <Collapse in={addingChildTo === item.id}>
                  <Box sx={{ display: 'flex', gap: 1, py: 1, pl: 4 + depth * 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Add sub-item..."
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddChecklistItem(item.id);
                        }
                        if (e.key === 'Escape') {
                          setAddingChildTo(null);
                          setNewChecklistItem('');
                        }
                      }}
                      autoFocus
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: alpha('#3B82F6', 0.05) } }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleAddChecklistItem(item.id)}
                      disabled={!newChecklistItem.trim() || checklistUpdating}
                    >
                      <Add fontSize="small" />
                    </Button>
                  </Box>
                </Collapse>
                
                {/* Render children */}
                {item.children?.map((child) => renderChecklistItem(child, depth + 1))}
              </Box>
            );

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {checklist.map((item) => renderChecklistItem(item, 0))}
              </Box>
            );
          })()}

          {/* Add new root item */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Add an item..."
              value={addingChildTo ? '' : newChecklistItem}
              onChange={(e) => {
                if (!addingChildTo) setNewChecklistItem(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !addingChildTo) {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
              disabled={!!addingChildTo}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: alpha('#6B7280', 0.05),
                },
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleAddChecklistItem()}
              disabled={!newChecklistItem.trim() || checklistUpdating || !!addingChildTo}
            >
              <Add fontSize="small" />
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

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
