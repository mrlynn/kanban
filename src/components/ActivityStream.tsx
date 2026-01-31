'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Collapse,
  alpha,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Timeline,
  ExpandLess,
  ExpandMore,
  Comment,
  SwapHoriz,
  Add,
  PriorityHigh,
  Delete,
  Archive,
  Refresh,
} from '@mui/icons-material';
import { Actor } from '@/types/kanban';

interface ActivityItem {
  id: string;
  type: 'activity' | 'comment';
  taskId: string;
  taskTitle: string;
  boardId: string;
  action: string;
  actor: Actor;
  details?: {
    field?: string;
    from?: string;
    to?: string;
    note?: string;
  };
  timestamp: string;
}

const actorConfig: Record<Actor, { name: string; color: string; avatar: string }> = {
  mike: { name: 'Mike', color: '#3B82F6', avatar: 'M' },
  moltbot: { name: 'Moltbot', color: '#F97316', avatar: '🔥' },
  system: { name: 'System', color: '#6B7280', avatar: 'S' },
  api: { name: 'API', color: '#8B5CF6', avatar: 'A' },
};

function ActionIcon({ action }: { action: string }) {
  switch (action) {
    case 'created':
      return <Add fontSize="small" />;
    case 'moved':
      return <SwapHoriz fontSize="small" />;
    case 'commented':
      return <Comment fontSize="small" />;
    case 'priority_changed':
      return <PriorityHigh fontSize="small" />;
    case 'deleted':
      return <Delete fontSize="small" />;
    case 'archived':
    case 'restored':
      return <Archive fontSize="small" />;
    default:
      return <Timeline fontSize="small" />;
  }
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

interface ActivityStreamProps {
  boardId: string;
  columnNames?: Record<string, string>;
}

export function ActivityStream({ boardId, columnNames = {} }: ActivityStreamProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/activities?boardId=${boardId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        const newActivities = data.feed as ActivityItem[];
        
        // Count new items if collapsed
        if (!expanded && activities.length > 0) {
          const latestTimestamp = activities[0]?.timestamp;
          const newItems = newActivities.filter(
            a => new Date(a.timestamp) > new Date(latestTimestamp)
          );
          setNewCount(prev => prev + newItems.length);
        }
        
        setActivities(newActivities);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }, [boardId, expanded, activities]);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);  // Only run on mount, not on fetchActivities change

  // Clear new count when expanding
  useEffect(() => {
    if (expanded) setNewCount(0);
  }, [expanded]);

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 16,
        top: 80,
        width: expanded ? 280 : 48,
        maxHeight: 'calc(100vh - 100px)',
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha('#ffffff', 0.1),
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: alpha('#ffffff', 0.1),
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Badge badgeContent={newCount} color="primary" max={99}>
          <Timeline sx={{ color: 'primary.main' }} />
        </Badge>
        {expanded && (
          <>
            <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }}>
              Activity
            </Typography>
            <Tooltip title="Refresh">
              <IconButton 
                size="small" 
                onClick={(e) => { e.stopPropagation(); fetchActivities(); }}
                sx={{ color: 'text.secondary' }}
              >
                <Refresh fontSize="small" sx={{ 
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
                }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" sx={{ color: 'text.secondary' }}>
              {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          </>
        )}
      </Box>

      {/* Activity List */}
      <Collapse in={expanded}>
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            maxHeight: 400,
          }}
        >
          {activities.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                No recent activity
              </Typography>
            </Box>
          ) : (
            activities.map((activity) => {
              const actor = actorConfig[activity.actor];
              return (
                <Box
                  key={activity.id}
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    gap: 1,
                    borderBottom: '1px solid',
                    borderColor: alpha('#ffffff', 0.05),
                    '&:hover': {
                      bgcolor: alpha('#ffffff', 0.02),
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: alpha(actor.color, 0.2),
                      color: actor.color,
                      fontSize: '0.75rem',
                    }}
                  >
                    <ActionIcon action={activity.action} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {activity.taskTitle}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <strong>{actor.name}</strong>{' '}
                      {activity.action === 'moved' && (
                        <>
                          moved to{' '}
                          <Chip
                            label={columnNames[activity.details?.to || ''] || activity.details?.to}
                            size="small"
                            sx={{ height: 16, fontSize: '0.6rem' }}
                          />
                        </>
                      )}
                      {activity.action === 'commented' && 'commented'}
                      {activity.action === 'created' && 'created'}
                      {activity.action === 'priority_changed' && (
                        <>set priority to <strong>{activity.details?.to}</strong></>
                      )}
                    </Typography>
                    {activity.action === 'commented' && activity.details?.note && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          fontStyle: 'italic',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        "{activity.details.note}"
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                      {formatTimeAgo(activity.timestamp)}
                    </Typography>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
