'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Divider,
  Collapse,
  Tooltip,
  CircularProgress,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import {
  Dashboard,
  Add,
  Timeline,
  ExpandLess,
  ExpandMore,
  SwapHoriz,
  Comment,
  PriorityHigh,
  Delete,
  Archive,
  Logout,
  Settings,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Board, Actor } from '@/types/kanban';

interface SidebarProps {
  width: number;
  onNavigate?: () => void; // Called when a nav item is clicked (for closing mobile drawer)
}

// Actor config for activity
const actorConfig: Record<Actor, { name: string; color: string }> = {
  mike: { name: 'Mike', color: '#3B82F6' },
  moltbot: { name: 'Moltbot', color: '#F97316' },
  system: { name: 'System', color: '#6B7280' },
  api: { name: 'API', color: '#8B5CF6' },
};

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

function ActionIcon({ action }: { action: string }) {
  const iconSx = { fontSize: 14 };
  switch (action) {
    case 'created':
      return <Add sx={iconSx} />;
    case 'moved':
      return <SwapHoriz sx={iconSx} />;
    case 'commented':
      return <Comment sx={iconSx} />;
    case 'priority_changed':
      return <PriorityHigh sx={iconSx} />;
    case 'deleted':
      return <Delete sx={iconSx} />;
    case 'archived':
    case 'restored':
      return <Archive sx={iconSx} />;
    default:
      return <Timeline sx={iconSx} />;
  }
}

export function Sidebar({ width, onNavigate }: SidebarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const pathname = usePathname();
  
  // Board state
  const [boards, setBoards] = useState<Board[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Activity state
  const [activityExpanded, setActivityExpanded] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Navigation helper - closes mobile drawer after navigation
  const navigateTo = (path: string) => {
    router.push(path);
    onNavigate?.();
  };

  // Get current board ID from pathname
  const currentBoardId = pathname?.startsWith('/board/') 
    ? pathname.split('/')[2] 
    : null;

  // Fetch boards
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const res = await fetch('/api/boards');
        if (res.ok) {
          const data = await res.json();
          setBoards(data);
        }
      } catch (error) {
        console.error('Failed to fetch boards:', error);
      } finally {
        setLoadingBoards(false);
      }
    };
    fetchBoards();
  }, []);

  // Fetch global activities
  const fetchActivities = useCallback(async () => {
    try {
      setLoadingActivity(true);
      const res = await fetch('/api/activities?limit=15');
      if (res.ok) {
        const data = await res.json();
        setActivities(data.feed || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  // Create board
  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || creating) return;
    
    setCreating(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName.trim() }),
      });
      
      if (res.ok) {
        const newBoard = await res.json();
        setBoards(prev => [newBoard, ...prev]);
        setCreateDialogOpen(false);
        setNewBoardName('');
        navigateTo(`/board/${newBoard.id}`);
      }
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          width,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: alpha('#ffffff', 0.1),
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1100,
        }}
      >
        {/* Logo / Header - Clickable to go home */}
        <Box
          onClick={() => navigateTo('/')}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: '1px solid',
            borderColor: alpha('#ffffff', 0.1),
            cursor: 'pointer',
            transition: 'background 0.2s',
            '&:hover': {
              bgcolor: alpha('#ffffff', 0.03),
            },
          }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="Moltboard"
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              objectFit: 'cover',
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Moltboard
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Task Management
            </Typography>
          </Box>
        </Box>

        {/* Boards Section */}
        <Box sx={{ px: 1, pt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mb: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 1 }}>
              Boards
            </Typography>
            <Tooltip title="New Board">
              <IconButton size="small" onClick={() => setCreateDialogOpen(true)}>
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <List dense disablePadding>
            {loadingBoards ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : boards.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
                No boards yet
              </Typography>
            ) : (
              boards.map((board) => (
                <ListItem key={board.id} disablePadding>
                  <ListItemButton
                    selected={currentBoardId === board.id}
                    onClick={() => navigateTo(`/board/${board.id}`)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        bgcolor: alpha('#00ED64', 0.15),
                        '&:hover': { bgcolor: alpha('#00ED64', 0.2) },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Dashboard fontSize="small" sx={{ color: currentBoardId === board.id ? 'primary.main' : 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={board.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: currentBoardId === board.id ? 600 : 400,
                        noWrap: true,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Box>

        <Divider sx={{ my: 2, borderColor: alpha('#ffffff', 0.1) }} />

        {/* Activity Section */}
        <Box sx={{ px: 1 }}>
          <ListItemButton
            onClick={() => setActivityExpanded(!activityExpanded)}
            sx={{ borderRadius: 1, py: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Timeline fontSize="small" sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="Activity"
              primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            />
            {activityExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </ListItemButton>
          
          <Collapse in={activityExpanded}>
            <Box sx={{ maxHeight: 250, overflow: 'auto', mt: 1 }}>
              {loadingActivity ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={16} />
                </Box>
              ) : activities.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, display: 'block' }}>
                  No recent activity
                </Typography>
              ) : (
                activities.map((activity) => {
                  const actor = actorConfig[activity.actor];
                  return (
                    <Box
                      key={activity.id}
                      sx={{
                        display: 'flex',
                        gap: 1,
                        px: 1,
                        py: 0.75,
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: alpha('#ffffff', 0.03) },
                      }}
                      onClick={() => navigateTo(`/board/${activity.boardId}`)}
                    >
                      <Avatar
                        sx={{
                          width: 20,
                          height: 20,
                          bgcolor: alpha(actor.color, 0.2),
                          color: actor.color,
                          fontSize: '0.6rem',
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
                            fontSize: '0.7rem',
                          }}
                        >
                          {activity.taskTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {actor.name} • {formatTimeAgo(activity.timestamp)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Collapse>
        </Box>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Settings Link */}
        <Box sx={{ px: 1, mb: 1 }}>
          <ListItemButton
            onClick={() => navigateTo('/settings')}
            selected={pathname === '/settings'}
            sx={{
              borderRadius: 1,
              '&.Mui-selected': {
                bgcolor: alpha('#00ED64', 0.15),
                '&:hover': { bgcolor: alpha('#00ED64', 0.2) },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Settings fontSize="small" sx={{ color: pathname === '/settings' ? 'primary.main' : 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="Settings"
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: pathname === '/settings' ? 600 : 400,
              }}
            />
          </ListItemButton>
        </Box>

        {/* User Profile & Logout */}
        {session?.user && (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderTop: '1px solid',
              borderColor: alpha('#ffffff', 0.1),
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar
              src={session.user.image || undefined}
              sx={{
                width: 32,
                height: 32,
                bgcolor: '#3B82F6',
                fontSize: '0.875rem',
              }}
            >
              {session.user.name?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {session.user.name || 'User'}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {session.user.email}
              </Typography>
            </Box>
            <Tooltip title="Sign out">
              <IconButton
                size="small"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main' },
                }}
              >
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Footer Links */}
        <Box
          sx={{
            px: 2,
            pb: 1,
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            borderTop: session?.user ? 'none' : '1px solid',
            borderColor: alpha('#ffffff', 0.1),
            pt: 1.5,
          }}
        >
          <Typography
            variant="caption"
            onClick={() => navigateTo('/privacy')}
            sx={{
              color: 'text.secondary',
              cursor: 'pointer',
              '&:hover': { color: 'primary.main', textDecoration: 'underline' },
            }}
          >
            Privacy
          </Typography>
          <Typography variant="caption" color="text.secondary">•</Typography>
          <Typography
            variant="caption"
            onClick={() => navigateTo('/terms')}
            sx={{
              color: 'text.secondary',
              cursor: 'pointer',
              '&:hover': { color: 'primary.main', textDecoration: 'underline' },
            }}
          >
            Terms
          </Typography>
        </Box>

        {/* Create Board Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="Board Name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)} color="inherit">Cancel</Button>
            <Button onClick={handleCreateBoard} variant="contained" disabled={!newBoardName.trim() || creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
