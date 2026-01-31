'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  alpha,
  IconButton,
  Avatar,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import {
  Add,
  Dashboard,
  Delete,
  TrendingUp,
  CheckCircle,
  Schedule,
  Timeline,
  SwapHoriz,
  Comment,
  PriorityHigh,
  Archive,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Board, Actor } from '@/types/kanban';

const actorConfig: Record<Actor, { name: string; color: string }> = {
  mike: { name: 'Mike', color: '#3B82F6' },
  moltbot: { name: 'Moltbot', color: '#F97316' },
  system: { name: 'System', color: '#6B7280' },
  api: { name: 'API', color: '#8B5CF6' },
};

interface ActivityItem {
  id: string;
  taskId: string;
  taskTitle: string;
  boardId: string;
  action: string;
  actor: Actor;
  details?: { from?: string; to?: string; note?: string };
  timestamp: string;
}

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function ActionIcon({ action }: { action: string }) {
  const iconSx = { fontSize: 16 };
  switch (action) {
    case 'created': return <Add sx={iconSx} />;
    case 'moved': return <SwapHoriz sx={iconSx} />;
    case 'commented': return <Comment sx={iconSx} />;
    case 'priority_changed': return <PriorityHigh sx={iconSx} />;
    case 'archived':
    case 'restored': return <Archive sx={iconSx} />;
    default: return <Timeline sx={iconSx} />;
  }
}

export default function HomePage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<TaskStats>({ total: 0, completed: 0, inProgress: 0, todo: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch boards, activities, and calculate stats in parallel
        const [boardsRes, activitiesRes, tasksRes] = await Promise.all([
          fetch('/api/boards'),
          fetch('/api/activities?limit=10'),
          fetch('/api/tasks'),
        ]);

        if (boardsRes.ok) {
          const boardsData = await boardsRes.json();
          setBoards(boardsData);
        }

        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setActivities(activitiesData.feed || []);
        }

        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          const tasks = tasksData.tasks || tasksData || [];
          
          // Calculate stats based on column positions
          let completed = 0, inProgress = 0, todo = 0;
          tasks.forEach((task: { columnId: string }) => {
            const colId = task.columnId?.toLowerCase() || '';
            if (colId.includes('done')) completed++;
            else if (colId.includes('progress') || colId.includes('review')) inProgress++;
            else todo++;
          });
          
          setStats({
            total: tasks.length,
            completed,
            inProgress,
            todo,
          });
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    
    setCreating(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBoardName.trim(),
          description: newBoardDescription.trim() || undefined,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to create board');
      
      const newBoard = await res.json();
      setBoards((prev) => [newBoard, ...prev]);
      setDialogOpen(false);
      setNewBoardName('');
      setNewBoardDescription('');
      router.push(`/board/${newBoard.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoard = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this board?')) return;
    
    try {
      await fetch(`/api/boards/${boardId}`, { method: 'DELETE' });
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, px: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          {greeting()}, Mike 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's what's happening across your boards
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: alpha('#ffffff', 0.03), borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: alpha('#3B82F6', 0.2), color: '#3B82F6' }}>
                <Dashboard />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.total}</Typography>
                <Typography variant="caption" color="text.secondary">Total Tasks</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: alpha('#ffffff', 0.03), borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: alpha('#F59E0B', 0.2), color: '#F59E0B' }}>
                <Schedule />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.todo}</Typography>
                <Typography variant="caption" color="text.secondary">To Do</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: alpha('#ffffff', 0.03), borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: alpha('#8B5CF6', 0.2), color: '#8B5CF6' }}>
                <TrendingUp />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.inProgress}</Typography>
                <Typography variant="caption" color="text.secondary">In Progress</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: alpha('#ffffff', 0.03), borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: alpha('#00ED64', 0.2), color: '#00ED64' }}>
                <CheckCircle />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.completed}</Typography>
                <Typography variant="caption" color="text.secondary">Completed</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, bgcolor: alpha('#ffffff', 0.03), borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Timeline sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Recent Activity</Typography>
            </Box>
            
            {activities.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No recent activity
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {activities.slice(0, 8).map((activity) => {
                  const actor = actorConfig[activity.actor];
                  return (
                    <Box
                      key={activity.id}
                      onClick={() => router.push(`/board/${activity.boardId}`)}
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        p: 1,
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: alpha('#ffffff', 0.05) },
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
                        <ActionIcon action={activity.action} />
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
                          {activity.taskTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {actor.name} {activity.action} • {formatTimeAgo(activity.timestamp)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Boards */}
        <Grid item xs={12} md={7}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Your Boards</Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => setDialogOpen(true)}
              sx={{
                bgcolor: 'primary.main',
                color: 'background.default',
                '&:hover': { bgcolor: 'primary.light' },
              }}
            >
              New Board
            </Button>
          </Box>

          <Grid container spacing={2}>
            {boards.map((board) => (
              <Grid item xs={12} sm={6} key={board.id}>
                <Card
                  sx={{
                    bgcolor: alpha('#ffffff', 0.03),
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      borderColor: 'primary.main',
                      '& .delete-btn': { opacity: 1 },
                    },
                  }}
                >
                  <CardActionArea onClick={() => router.push(`/board/${board.id}`)}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1.5,
                              bgcolor: alpha('#00ED64', 0.15),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Dashboard sx={{ color: 'primary.main' }} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {board.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {board.columns.length} columns
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton
                          className="delete-btn"
                          size="small"
                          onClick={(e) => handleDeleteBoard(board.id, e)}
                          sx={{ opacity: 0, transition: 'opacity 0.2s', color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                      {board.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            mt: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {board.description}
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}

            {boards.length === 0 && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <Dashboard sx={{ fontSize: 48, mb: 2, color: 'text.disabled' }} />
                  <Typography variant="body1" sx={{ mb: 1 }}>No boards yet</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>Create your first board to get started</Typography>
                  <Button variant="outlined" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
                    Create Board
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      {/* Create Board Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Board</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Board Name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              fullWidth
              autoFocus
              required
            />
            <TextField
              label="Description (optional)"
              value={newBoardDescription}
              onChange={(e) => setNewBoardDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCreateBoard} variant="contained" disabled={!newBoardName.trim() || creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
