'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  LinearProgress,
  Tooltip,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormGroup,
  FormControlLabel,
  Checkbox,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  Key,
  ContentCopy,
  Delete,
  Add,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Settings,
  Code,
  GitHub,
  Link as LinkIcon,
  Sync,
  AutoFixHigh,
} from '@mui/icons-material';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'team';
  usage: {
    boards: number;
    tasks: number;
    apiKeys: number;
    aiMessagesThisMonth: number;
  };
  limits: {
    maxBoards: number;
    maxTasksPerBoard: number;
    maxApiKeys: number;
    maxAiMessagesPerMonth: number;
  };
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

interface Board {
  id: string;
  name: string;
}

interface Project {
  id: string;
  boardId: string;
  name: string;
  color: string;
  github?: {
    owner: string;
    repo: string;
    webhookSecret?: string;
    syncEnabled: boolean;
    autoLinkPRs: boolean;
    autoMoveTasks: boolean;
    createTasksFromIssues: boolean;
  };
  board?: { id: string; name: string };
}

const SCOPE_LABELS: Record<string, string> = {
  'chat:read': 'Read chat messages',
  'chat:write': 'Send chat messages',
  'tasks:read': 'View tasks',
  'tasks:write': 'Create/update tasks',
  'boards:read': 'View boards',
  'boards:write': 'Create/update boards',
};

const DEFAULT_SCOPES = ['chat:read', 'chat:write', 'tasks:read', 'boards:read'];

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // GitHub project dialog
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectBoardId, setProjectBoardId] = useState('');
  const [projectGithubOwner, setProjectGithubOwner] = useState('');
  const [projectGithubRepo, setProjectGithubRepo] = useState('');
  const [projectAutoLink, setProjectAutoLink] = useState(true);
  const [projectAutoMove, setProjectAutoMove] = useState(true);
  const [projectCreateFromIssues, setProjectCreateFromIssues] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  
  // Create key dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(DEFAULT_SCOPES);
  const [creating, setCreating] = useState(false);
  
  // New key display
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch tenant info, API keys, projects, and boards
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantRes, keysRes, projectsRes, boardsRes] = await Promise.all([
        fetch('/api/tenant'),
        fetch('/api/tenant/api-keys'),
        fetch('/api/projects'),
        fetch('/api/boards'),
      ]);
      
      if (tenantRes.ok) {
        const data = await tenantRes.json();
        setTenant(data.tenant);
      } else {
        throw new Error('Failed to load workspace info');
      }
      
      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(data.keys || []);
      }
      
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data || []);
      }
      
      if (boardsRes.ok) {
        const data = await boardsRes.json();
        setBoards(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create new API key
  const handleCreateKey = async () => {
    if (!newKeyName.trim() || creating) return;
    
    setCreating(true);
    try {
      const res = await fetch('/api/tenant/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: newKeyScopes,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // API returns { key: { id, name, key, keyPrefix, scopes, ... } }
        setNewKeyValue(data.key.key);  // The raw key value
        setShowNewKey(true);
        // Add to list with the structure our UI expects
        setApiKeys(prev => [{
          id: data.key.id,
          name: data.key.name,
          keyPrefix: data.key.keyPrefix,
          scopes: data.key.scopes,
          createdAt: data.key.createdAt,
          usageCount: 0,
        }, ...prev]);
        setCreateDialogOpen(false);
        setNewKeyName('');
        setNewKeyScopes(DEFAULT_SCOPES);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create API key');
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to create API key',
        severity: 'error',
      });
    } finally {
      setCreating(false);
    }
  };

  // Revoke API key
  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/tenant/api-keys/${keyId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setApiKeys(prev => prev.filter(k => k.id !== keyId));
        setSnackbar({ open: true, message: 'API key revoked', severity: 'success' });
      } else {
        throw new Error('Failed to revoke API key');
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to revoke API key',
        severity: 'error',
      });
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: `${label} copied to clipboard`, severity: 'success' });
  };

  // Create new project with GitHub integration
  const handleCreateProject = async () => {
    if (!projectName.trim() || !projectBoardId || !projectGithubOwner || !projectGithubRepo || creatingProject) return;
    
    setCreatingProject(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName.trim(),
          boardId: projectBoardId,
          github: {
            owner: projectGithubOwner.trim(),
            repo: projectGithubRepo.trim(),
            syncEnabled: true,
            autoLinkPRs: projectAutoLink,
            autoMoveTasks: projectAutoMove,
            createTasksFromIssues: projectCreateFromIssues,
          },
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setNewWebhookSecret(data.github?.webhookSecret || null);
        setProjects(prev => [data, ...prev]);
        // Keep dialog open to show webhook secret
        if (!data.github?.webhookSecret) {
          resetProjectDialog();
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to create project',
        severity: 'error',
      });
    } finally {
      setCreatingProject(false);
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this integration? This will not delete the board.')) return;
    
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setSnackbar({ open: true, message: 'Integration removed', severity: 'success' });
      } else {
        throw new Error('Failed to delete project');
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete project',
        severity: 'error',
      });
    }
  };

  // Reset project dialog
  const resetProjectDialog = () => {
    setProjectDialogOpen(false);
    setProjectName('');
    setProjectBoardId('');
    setProjectGithubOwner('');
    setProjectGithubRepo('');
    setProjectAutoLink(true);
    setProjectAutoMove(true);
    setProjectCreateFromIssues(false);
    setNewWebhookSecret(null);
  };

  // Toggle scope
  const toggleScope = (scope: string) => {
    setNewKeyScopes(prev => 
      prev.includes(scope) 
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  // Usage percentage
  const getUsagePercent = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 2, borderRadius: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const planColors: Record<string, string> = {
    free: '#6B7280',
    pro: '#00ED64',
    team: '#3B82F6',
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Settings sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Settings
          </Typography>
          <Typography color="text.secondary">
            Manage your workspace and API access
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Workspace Info */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Workspace
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography color="text.secondary" variant="body2">Name</Typography>
              <Typography variant="h6">{tenant?.name}</Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography color="text.secondary" variant="body2">Plan</Typography>
              <Chip
                label={tenant?.plan.toUpperCase()}
                size="small"
                sx={{
                  bgcolor: alpha(planColors[tenant?.plan || 'free'], 0.2),
                  color: planColors[tenant?.plan || 'free'],
                  fontWeight: 600,
                  mt: 0.5,
                }}
              />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Usage
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Boards</Typography>
                <Typography variant="body2">
                  {tenant?.usage.boards} / {tenant?.limits.maxBoards === -1 ? '∞' : tenant?.limits.maxBoards}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getUsagePercent(tenant?.usage.boards || 0, tenant?.limits.maxBoards || 1)}
                sx={{ height: 6, borderRadius: 1 }}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Tasks</Typography>
                <Typography variant="body2">
                  {tenant?.usage.tasks}
                </Typography>
              </Box>
            </Box>
            
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">API Keys</Typography>
                <Typography variant="body2">
                  {apiKeys.length} / {tenant?.limits.maxApiKeys === -1 ? '∞' : tenant?.limits.maxApiKeys}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getUsagePercent(apiKeys.length, tenant?.limits.maxApiKeys || 1)}
                sx={{ height: 6, borderRadius: 1 }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* API Keys */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                API Keys
              </Typography>
              <Button
                startIcon={<Add />}
                variant="contained"
                size="small"
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Key
              </Button>
            </Box>
            
            {apiKeys.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Key sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">
                  No API keys yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create one to connect Clawdbot
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {apiKeys.map((key) => (
                  <ListItem
                    key={key.id}
                    sx={{
                      bgcolor: alpha('#ffffff', 0.02),
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: alpha('#ffffff', 0.1),
                    }}
                  >
                    <ListItemText
                      primary={key.name}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace' }}>
                            {key.keyPrefix}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="span">
                            Used {key.usageCount} times
                            {key.lastUsedAt && ` • Last: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Revoke">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleRevokeKey(key.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Clawdbot Integration */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Code sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Connect to Clawdbot
              </Typography>
            </Box>
            
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Add this to your <code>gateway.yaml</code> to enable the Moltboard channel:
            </Typography>
            
            <Box
              sx={{
                bgcolor: '#1a1a1a',
                borderRadius: 2,
                p: 2,
                position: 'relative',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                overflow: 'auto',
              }}
            >
              <IconButton
                size="small"
                onClick={() => copyToClipboard(
                  `channels:\n  kanban:\n    boardId: YOUR_BOARD_ID\n    apiKey: YOUR_API_KEY\n    baseUrl: https://moltboard.app`,
                  'Config'
                )}
                sx={{ position: 'absolute', top: 8, right: 8 }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
              <pre style={{ margin: 0, color: '#e0e0e0' }}>
{`channels:
  kanban:
    boardId: YOUR_BOARD_ID
    apiKey: YOUR_API_KEY
    baseUrl: https://moltboard.app`}
              </pre>
            </Box>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>boardId:</strong> Find this in the URL when viewing a board (e.g., <code>/board/board_xxx</code>)
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>apiKey:</strong> Create one above and paste the full key (starts with <code>moltboard_sk_</code>)
              </Typography>
            </Alert>
          </Paper>
        </Grid>

        {/* GitHub Integration */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GitHub sx={{ color: '#ffffff' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  GitHub Integration
                </Typography>
              </Box>
              <Button
                startIcon={<Add />}
                variant="contained"
                size="small"
                onClick={() => setProjectDialogOpen(true)}
              >
                Connect Repo
              </Button>
            </Box>
            
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Connect your GitHub repositories to automatically link PRs and issues to tasks.
            </Typography>
            
            {projects.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <GitHub sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">
                  No GitHub integrations yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect a repo to auto-link PRs to tasks
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {projects.filter(p => p.github).map((project) => (
                  <ListItem
                    key={project.id}
                    sx={{
                      bgcolor: alpha('#ffffff', 0.02),
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: alpha('#ffffff', 0.1),
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight={600}>{project.name}</Typography>
                          <Chip
                            size="small"
                            label={`${project.github?.owner}/${project.github?.repo}`}
                            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          {project.github?.autoLinkPRs && (
                            <Chip
                              icon={<LinkIcon sx={{ fontSize: 14 }} />}
                              label="Auto-link PRs"
                              size="small"
                              variant="outlined"
                              sx={{ height: 24 }}
                            />
                          )}
                          {project.github?.autoMoveTasks && (
                            <Chip
                              icon={<Sync sx={{ fontSize: 14 }} />}
                              label="Auto-move on merge"
                              size="small"
                              variant="outlined"
                              sx={{ height: 24 }}
                            />
                          )}
                          {project.github?.createTasksFromIssues && (
                            <Chip
                              icon={<AutoFixHigh sx={{ fontSize: 14 }} />}
                              label="Issues → Tasks"
                              size="small"
                              variant="outlined"
                              sx={{ height: 24 }}
                            />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Board: {project.board?.name || project.boardId}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Remove integration">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleDeleteProject(project.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Create Key Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Key Name"
            placeholder="e.g., My Clawdbot"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            sx={{ mt: 1, mb: 3 }}
          />
          
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Permissions
          </Typography>
          <FormGroup>
            {Object.entries(SCOPE_LABELS).map(([scope, label]) => (
              <FormControlLabel
                key={scope}
                control={
                  <Checkbox
                    checked={newKeyScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">{label}</Typography>}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleCreateKey}
            variant="contained"
            disabled={!newKeyName.trim() || creating || newKeyScopes.length === 0}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog open={!!newKeyValue} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle sx={{ color: 'success.main' }} />
          API Key Created
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Copy this key now — you won't be able to see it again!
          </Alert>
          
          <Box
            sx={{
              bgcolor: '#1a1a1a',
              borderRadius: 1,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                flex: 1,
                wordBreak: 'break-all',
              }}
            >
              {showNewKey ? newKeyValue : '•'.repeat(40)}
            </Typography>
            <IconButton size="small" onClick={() => setShowNewKey(!showNewKey)}>
              {showNewKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => newKeyValue && copyToClipboard(newKeyValue, 'API key')}
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              setNewKeyValue(null);
              setShowNewKey(false);
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* GitHub Project Dialog */}
      <Dialog open={projectDialogOpen} onClose={resetProjectDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GitHub />
          {newWebhookSecret ? 'Integration Created!' : 'Connect GitHub Repository'}
        </DialogTitle>
        <DialogContent>
          {newWebhookSecret ? (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                GitHub integration created! Now add the webhook to your repository.
              </Alert>
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                1. Go to your GitHub repo → Settings → Webhooks → Add webhook
              </Typography>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                2. Payload URL:
              </Typography>
              <Box
                sx={{
                  bgcolor: '#1a1a1a',
                  borderRadius: 1,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', flex: 1 }}>
                  https://kanban.mlynn.org/api/webhooks/github
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard('https://kanban.mlynn.org/api/webhooks/github', 'URL')}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                3. Secret:
              </Typography>
              <Box
                sx={{
                  bgcolor: '#1a1a1a',
                  borderRadius: 1,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', flex: 1, wordBreak: 'break-all' }}>
                  {newWebhookSecret}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(newWebhookSecret, 'Secret')}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                4. Select events:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Pull requests<br />
                • Issues (if you enabled "Create tasks from issues")
              </Typography>
              
              <Alert severity="warning" sx={{ mt: 2 }}>
                Save this secret now — you won't be able to see it again!
              </Alert>
            </>
          ) : (
            <>
              <TextField
                fullWidth
                label="Project Name"
                placeholder="e.g., NetPad"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                sx={{ mt: 1, mb: 2 }}
              />
              
              <TextField
                select
                fullWidth
                label="Board"
                value={projectBoardId}
                onChange={(e) => setProjectBoardId(e.target.value)}
                sx={{ mb: 2 }}
                SelectProps={{ native: true }}
              >
                <option value="">Select a board...</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </TextField>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GitHub fontSize="small" />
                GitHub Repository
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Owner"
                    placeholder="mrlynn"
                    value={projectGithubOwner}
                    onChange={(e) => setProjectGithubOwner(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Repository"
                    placeholder="netpad-v3"
                    value={projectGithubRepo}
                    onChange={(e) => setProjectGithubRepo(e.target.value)}
                    size="small"
                  />
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Automation Settings
              </Typography>
              
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={projectAutoLink}
                      onChange={(e) => setProjectAutoLink(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">Auto-link PRs to tasks</Typography>
                      <Typography variant="caption" color="text.secondary">
                        PRs mentioning task_xxx in title/body get linked
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={projectAutoMove}
                      onChange={(e) => setProjectAutoMove(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">Auto-move tasks when PRs merge</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Linked tasks move to Done when PR is merged
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={projectCreateFromIssues}
                      onChange={(e) => setProjectCreateFromIssues(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">Create tasks from GitHub issues</Typography>
                      <Typography variant="caption" color="text.secondary">
                        New issues automatically become tasks in To Do
                      </Typography>
                    </Box>
                  }
                />
              </FormGroup>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {newWebhookSecret ? (
            <Button variant="contained" onClick={resetProjectDialog}>
              Done
            </Button>
          ) : (
            <>
              <Button onClick={resetProjectDialog} color="inherit">
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                variant="contained"
                disabled={!projectName.trim() || !projectBoardId || !projectGithubOwner || !projectGithubRepo || creatingProject}
              >
                {creatingProject ? 'Creating...' : 'Connect'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
