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
} from '@mui/material';
import {
  DragIndicator,
  Delete,
  Edit,
  CalendarToday,
  Comment,
  Archive,
  Unarchive,
} from '@mui/icons-material';
import { Task, PriorityConfig } from '@/types/kanban';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onOpenDetails?: (task: Task) => void;
  onArchive?: (taskId: string) => void;
  onRestore?: (taskId: string) => void;
  commentCount?: number;
  showArchiveButton?: boolean;
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

export function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onOpenDetails, 
  onArchive,
  onRestore,
  commentCount = 0,
  showArchiveButton = true,
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1.5,
        cursor: 'grab',
        bgcolor: 'background.paper',
        borderLeft: priorityConfig ? `4px solid ${priorityConfig.color}` : undefined,
        '&:hover': {
          borderColor: 'primary.main',
          '& .task-actions': {
            opacity: 1,
          },
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
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
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {task.dueDate && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  <CalendarToday sx={{ fontSize: 14 }} />
                  <Typography variant="caption">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
              
              {commentCount > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  <Comment sx={{ fontSize: 14 }} />
                  <Typography variant="caption">{commentCount}</Typography>
                </Box>
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
