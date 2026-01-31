'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  alpha,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  DragIndicator,
  Delete,
  Edit,
  CalendarToday,
  Comment,
  Archive,
  Unarchive,
  LocalFireDepartment,
  Warning,
  CheckCircleOutline,
} from '@mui/icons-material';
import { LinearProgress } from '@mui/material';
import { Task, PriorityConfig, USERS, countChecklistItems } from '@/types/kanban';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onOpenDetails?: (task: Task) => void;
  onArchive?: (taskId: string) => void;
  onRestore?: (taskId: string) => void;
  commentCount?: number;
  unreadMoltbotComments?: number;
  showArchiveButton?: boolean;
  isMobile?: boolean;
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

// Helper functions for due date display
function formatDueDate(date: Date): string {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time for comparison
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  const compareDate = new Date(d);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) return 'Today';
  if (compareDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (compareDate.getTime() === yesterday.getTime()) return 'Yesterday';
  
  // Check if within this week
  const diffDays = Math.ceil((compareDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 0 && diffDays <= 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDueDateStatus(date: Date): 'overdue' | 'today' | 'soon' | 'normal' {
  const d = new Date(date);
  const today = new Date();
  
  // Reset time for comparison
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
  normal: { bg: 'transparent', text: 'text.secondary' },
};

export function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onOpenDetails, 
  onArchive,
  onRestore,
  commentCount = 0,
  unreadMoltbotComments = 0,
  showArchiveButton = true,
  isMobile = false,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityConfig = task.priority ? PriorityConfig[task.priority] : null;
  const dueDateStatus = task.dueDate ? getDueDateStatus(task.dueDate) : null;
  const dueDateStyle = dueDateStatus ? dueDateColors[dueDateStatus] : null;
  const assignee = task.assigneeId ? USERS.find(u => u.id === task.assigneeId) : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={isMobile && onOpenDetails ? () => onOpenDetails(task) : undefined}
      sx={{
        mb: 1.5,
        cursor: 'grab',
        bgcolor: 'background.paper',
        borderLeft: priorityConfig ? `4px solid ${priorityConfig.color}` : undefined,
        // Mobile: larger touch target, always show actions
        minHeight: isMobile ? 80 : 'auto',
        '&:hover': {
          borderColor: 'primary.main',
          '& .task-actions': {
            opacity: 1,
          },
        },
        // Mobile: actions always visible
        '& .task-actions': {
          opacity: isMobile ? 1 : undefined,
        },
      }}
    >
      <CardContent sx={{ p: isMobile ? 2.5 : 2, '&:last-child': { pb: isMobile ? 2.5 : 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box
            {...attributes}
            {...listeners}
            sx={{
              color: 'text.secondary',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              mt: 0.25,
            }}
          >
            <DragIndicator fontSize="small" />
          </Box>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Priority badge */}
            {priorityConfig && (
              <Tooltip title={`${priorityConfig.label} Priority`}>
                <Chip
                  label={`${priorityConfig.icon} ${task.priority?.toUpperCase()}`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    bgcolor: alpha(priorityConfig.color, 0.2),
                    color: priorityConfig.color,
                    mb: 0.5,
                  }}
                />
              </Tooltip>
            )}
            
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                mb: task.description || task.labels?.length ? 1 : 0,
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
              onClick={() => onOpenDetails?.(task)}
            >
              {task.title}
            </Typography>
            
            {task.description && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  mb: 1,
                }}
              >
                {task.description}
              </Typography>
            )}
            
            {task.labels && task.labels.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {task.labels.map((label) => (
                  <Chip
                    key={label}
                    label={label}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      bgcolor: alpha(labelColors[label] || '#6B7280', 0.2),
                      color: labelColors[label] || '#6B7280',
                    }}
                  />
                ))}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {/* Due Date Chip */}
              {task.dueDate && dueDateStyle && (
                <Tooltip title={new Date(task.dueDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}>
                  <Chip
                    icon={dueDateStatus === 'overdue' ? <Warning sx={{ fontSize: 14 }} /> : <CalendarToday sx={{ fontSize: 14 }} />}
                    label={formatDueDate(task.dueDate)}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      bgcolor: dueDateStatus === 'normal' 
                        ? alpha('#6B7280', 0.15) 
                        : alpha(dueDateStyle.bg, 0.9),
                      color: dueDateStatus === 'normal' ? 'text.secondary' : dueDateStyle.text,
                      '& .MuiChip-icon': {
                        color: dueDateStatus === 'normal' ? 'text.secondary' : dueDateStyle.text,
                      },
                    }}
                  />
                </Tooltip>
              )}
              
              {/* Checklist Progress */}
              {task.checklist && task.checklist.length > 0 && (() => {
                const { completed, total } = countChecklistItems(task.checklist);
                const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                const isComplete = completed === total;
                return (
                  <Tooltip title={`${completed}/${total} completed`}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        minWidth: 60,
                        color: isComplete ? 'success.main' : 'text.secondary',
                      }}
                    >
                      <CheckCircleOutline sx={{ fontSize: 14 }} />
                      <Typography variant="caption" fontWeight={500}>
                        {completed}/{total}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          minWidth: 24,
                          bgcolor: alpha(isComplete ? '#22C55E' : '#6B7280', 0.2),
                          '& .MuiLinearProgress-bar': {
                            bgcolor: isComplete ? '#22C55E' : '#3B82F6',
                          },
                        }}
                      />
                    </Box>
                  </Tooltip>
                );
              })()}
              
              {/* Comment Count */}
              {commentCount > 0 && (
                <Tooltip title={unreadMoltbotComments > 0 ? `${unreadMoltbotComments} new from Moltbot` : `${commentCount} comments`}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: unreadMoltbotComments > 0 ? '#F97316' : 'text.secondary',
                      bgcolor: unreadMoltbotComments > 0 ? alpha('#F97316', 0.15) : 'transparent',
                      px: unreadMoltbotComments > 0 ? 0.75 : 0,
                      py: unreadMoltbotComments > 0 ? 0.25 : 0,
                      borderRadius: 1,
                      animation: unreadMoltbotComments > 0 ? 'pulse 2s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.6 },
                      },
                    }}
                  >
                    {unreadMoltbotComments > 0 ? (
                      <LocalFireDepartment sx={{ fontSize: 14 }} />
                    ) : (
                      <Comment sx={{ fontSize: 14 }} />
                    )}
                    <Typography variant="caption" fontWeight={unreadMoltbotComments > 0 ? 600 : 400}>
                      {unreadMoltbotComments > 0 ? unreadMoltbotComments : commentCount}
                    </Typography>
                  </Box>
                </Tooltip>
              )}
              
              {/* Spacer to push assignee to right */}
              <Box sx={{ flex: 1 }} />
              
              {/* Assignee Avatar */}
              {assignee && (
                <Tooltip title={`Assigned to ${assignee.name}`}>
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: assignee.color,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {assignee.avatar || assignee.name[0]}
                  </Avatar>
                </Tooltip>
              )}
            </Box>
          </Box>
          
          <Box
            className="task-actions"
            sx={{
              display: 'flex',
              gap: 0.5,
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
          >
            <IconButton
              size="small"
              onClick={() => onEdit(task)}
              sx={{ color: 'text.secondary' }}
            >
              <Edit fontSize="small" />
            </IconButton>
            {showArchiveButton && !task.archived && onArchive && (
              <Tooltip title="Archive">
                <IconButton
                  size="small"
                  onClick={() => onArchive(task.id)}
                  sx={{ color: 'text.secondary' }}
                >
                  <Archive fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {task.archived && onRestore && (
              <Tooltip title="Restore">
                <IconButton
                  size="small"
                  onClick={() => onRestore(task.id)}
                  sx={{ color: 'success.main' }}
                >
                  <Unarchive fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              size="small"
              onClick={() => onDelete(task.id)}
              sx={{ color: 'error.main' }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
