'use client';

import { useState, useEffect } from 'react';
import {
  Container,
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
} from '@mui/material';
import {
  Add,
  Dashboard,
  Delete,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Board } from '@/types/kanban';

export default function HomePage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch boards
  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/boards');
      if (!res.ok) throw new Error('Failed to fetch boards');
      const data = await res.json();
      setBoards(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
      
      // Navigate to the new board
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 4,
          }}
        >
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00ED64 0%, #00D9FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5,
              }}
            >
              Kanban
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Simple, beautiful task management
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{
              bgcolor: 'primary.main',
              color: 'background.default',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'primary.light',
              },
            }}
          >
            New Board
          </Button>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        )}

        {/* Boards Grid */}
        {!loading && (
          <Grid container spacing={3}>
            {boards.map((board) => (
              <Grid item xs={12} sm={6} md={4} key={board.id}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: alpha('#ffffff', 0.03),
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: 'primary.main',
                      '& .delete-btn': {
                        opacity: 1,
                      },
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => router.push(`/board/${board.id}`)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: alpha('#00ED64', 0.15),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Dashboard sx={{ color: 'primary.main' }} />
                        </Box>
                        <IconButton
                          className="delete-btn"
                          size="small"
                          onClick={(e) => handleDeleteBoard(board.id, e)}
                          sx={{
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            color: 'error.main',
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, mb: 1 }}
                      >
                        {board.name}
                      </Typography>
                      
                      {board.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {board.description}
                        </Typography>
                      )}
                      
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ mt: 2, display: 'block' }}
                      >
                        {board.columns.length} columns
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}

            {/* Empty State */}
            {boards.length === 0 && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    color: 'text.secondary',
                  }}
                >
                  <Dashboard
                    sx={{ fontSize: 64, mb: 2, color: 'text.disabled' }}
                  />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    No boards yet
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    Create your first board to get started
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => setDialogOpen(true)}
                  >
                    Create Board
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        )}

        {/* Create Board Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
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
            <Button onClick={() => setDialogOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleCreateBoard}
              variant="contained"
              disabled={!newBoardName.trim() || creating}
            >
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
