'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  Button,
  Typography,
  Avatar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  CircularProgress,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Close,
  PersonAdd,
  Delete,
  Schedule,
  Check,
  ContentCopy,
} from '@mui/icons-material';
import { BoardTeamMember, BoardRole } from '@/types/team';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
}

export function ShareDialog({ open, onClose, boardId, boardName }: ShareDialogProps) {
  const [members, setMembers] = useState<BoardTeamMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<BoardRole>('viewer');
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Fetch members when dialog opens
  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, boardId]);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/members`);
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      setMembers(data.members || []);
      setCurrentUserRole(data.currentUserRole || 'viewer');
    } catch (err) {
      setError('Failed to load team members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    
    setSending(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch(`/api/boards/${boardId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }
      
      if (data.emailSent) {
        setSuccess(`Invitation sent to ${inviteEmail}`);
      } else if (data.acceptUrl) {
        // Email failed but invitation created - show link
        setCopiedLink(data.acceptUrl);
        setSuccess(data.warning || 'Invitation created. Share the link manually.');
      }
      
      setInviteEmail('');
      fetchMembers(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/members/${memberId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member');
      }
      
      fetchMembers(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'editor' | 'viewer') => {
    try {
      const res = await fetch(`/api/boards/${boardId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }
      
      fetchMembers(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setSuccess('Link copied to clipboard!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const canManageMembers = currentUserRole === 'owner';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'background.paper', backgroundImage: 'none' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6">Share "{boardName}"</Typography>
          <Typography variant="body2" color="text.secondary">
            Invite people to collaborate on this board
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Invite Form */}
        {canManageMembers && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                size="small"
                fullWidth
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                >
                  <MenuItem value="editor">Editor</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleInvite}
                disabled={sending || !inviteEmail.trim()}
                startIcon={sending ? <CircularProgress size={16} /> : <PersonAdd />}
                sx={{ minWidth: 100 }}
              >
                Invite
              </Button>
            </Box>
            
            {/* Role explanation */}
            <Typography variant="caption" color="text.secondary">
              <strong>Editor:</strong> Can create and edit tasks &nbsp;•&nbsp; 
              <strong>Viewer:</strong> Can only view the board
            </Typography>
          </Box>
        )}

        {/* Alerts */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
            {copiedLink && (
              <Button
                size="small"
                startIcon={<ContentCopy />}
                onClick={() => copyLink(copiedLink)}
                sx={{ ml: 1 }}
              >
                Copy Link
              </Button>
            )}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Members List */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Team Members ({members.filter(m => m.status === 'active').length})
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List dense>
            {members.map((member) => (
              <ListItem
                key={member.id}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: member.status === 'pending' ? alpha('#FFA500', 0.1) : 'transparent',
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={member.avatar}
                    sx={{
                      bgcolor: member.color,
                      width: 36,
                      height: 36,
                      fontSize: '0.9rem',
                    }}
                  >
                    {member.avatar || member.name[0]?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{member.name}</span>
                      {member.status === 'pending' && (
                        <Chip
                          label="Pending"
                          size="small"
                          icon={<Schedule sx={{ fontSize: 14 }} />}
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            bgcolor: alpha('#FFA500', 0.2),
                            color: '#B45309',
                          }}
                        />
                      )}
                      {member.role === 'owner' && (
                        <Chip
                          label="Owner"
                          size="small"
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            bgcolor: alpha('#F97316', 0.2),
                            color: '#F97316',
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={member.email}
                />
                <ListItemSecondaryAction>
                  {member.role !== 'owner' && canManageMembers && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {member.status === 'active' && (
                        <Select
                          value={member.role}
                          size="small"
                          onChange={(e) => handleRoleChange(member.id, e.target.value as 'editor' | 'viewer')}
                          sx={{ minWidth: 90, height: 32 }}
                        >
                          <MenuItem value="editor">Editor</MenuItem>
                          <MenuItem value="viewer">Viewer</MenuItem>
                        </Select>
                      )}
                      <Tooltip title={member.status === 'pending' ? 'Cancel invitation' : 'Remove from board'}>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveMember(member.invitationId || member.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                  {member.role !== 'owner' && !canManageMembers && (
                    <Chip
                      label={member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      size="small"
                      sx={{ height: 24 }}
                    />
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
