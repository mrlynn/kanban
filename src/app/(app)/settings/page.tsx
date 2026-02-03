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
  SmartToy,
  ArrowForward,
  CreditCard,
  Rocket,
  Group,
  PersonAdd,
  AdminPanelSettings,
  Person,
  Schedule,
} from '@mui/icons-material';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'team';
  stripeCustomerId?: string;
  planExpiresAt?: string;
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

interface Automation {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: string;
  action: string;
  actionParams?: Record<string, unknown>;
  triggerCount: number;
  createdAt: string;
  project?: { name: string };
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending';
  joinedAt: string;
  invitationId?: string;
  expiresAt?: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  github_pr_opened: 'PR Opened',
  github_pr_merged: 'PR Merged',
  github_pr_closed: 'PR Closed',
  github_issue_opened: 'Issue Opened',
  github_issue_closed: 'Issue Closed',
  task_created: 'Task Created',
  task_moved: 'Task Moved',
  task_completed: 'Task Completed',
  due_date_approaching: 'Due Date Approaching',
  due_date_passed: 'Due Date Passed',
};

const ACTION_LABELS: Record<string, string> = {
  create_task: 'Create Task',
  move_task: 'Move Task',
  update_task: 'Update Task',
  add_label: 'Add Label',
  add_comment: 'Add Comment',
  notify: 'Send Notification',
  archive_task: 'Archive Task',
};

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
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [canManageAdmins, setCanManageAdmins] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Team member invite dialog
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  
  // Automation dialog
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [automationName, setAutomationName] = useState('');
  const [automationDescription, setAutomationDescription] = useState('');
  const [automationTrigger, setAutomationTrigger] = useState('');
  const [automationAction, setAutomationAction] = useState('');
  const [creatingAutomation, setCreatingAutomation] = useState(false);
  
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
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch tenant info, API keys, projects, boards, automations, and team members
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantRes, keysRes, projectsRes, boardsRes, automationsRes, membersRes] = await Promise.all([
        fetch('/api/tenant'),
        fetch('/api/tenant/api-keys'),
        fetch('/api/projects'),
        fetch('/api/boards'),
        fetch('/api/automations?includeDisabled=true'),
        fetch('/api/tenant/members'),
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
      
      if (automationsRes.ok) {
        const data = await automationsRes.json();
        setAutomations(data || []);
      }
      
      if (membersRes.ok) {
        const data = await membersRes.json();
        setTeamMembers(data.members || []);
        setCanManageMembers(data.canManageMembers || false);
        setCanManageAdmins(data.canManageAdmins || false);
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

  // Create automation
  const handleCreateAutomation = async () => {
    if (!automationName.trim() || !automationTrigger || !automationAction || creatingAutomation) return;
    
    setCreatingAutomation(true);
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: automationName.trim(),
          description: automationDescription.trim() || undefined,
          trigger: automationTrigger,
          action: automationAction,
          actionParams: {},
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setAutomations(prev => [data, ...prev]);
        resetAutomationDialog();
        setSnackbar({ open: true, message: 'Automation created', severity: 'success' });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create automation');
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to create automation',
        severity: 'error',
      });
    } finally {
      setCreatingAutomation(false);
    }
  };

  // Toggle automation enabled
  const handleToggleAutomation = async (automationId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/automations?id=${automationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      
      if (res.ok) {
        setAutomations(prev =>
          prev.map(a => (a.id === automationId ? { ...a, enabled } : a))
        );
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to update automation',
        severity: 'error',
      });
    }
  };

  // Delete automation
  const handleDeleteAutomation = async (automationId: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;
    
    try {
      const res = await fetch(`/api/automations?id=${automationId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setAutomations(prev => prev.filter(a => a.id !== automationId));
        setSnackbar({ open: true, message: 'Automation deleted', severity: 'success' });
      } else {
        throw new Error('Failed to delete automation');
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete automation',
        severity: 'error',
      });
    }
  };

  // Reset automation dialog
  const resetAutomationDialog = () => {
    setAutomationDialogOpen(false);
    setAutomationName('');
    setAutomationDescription('');
    setAutomationTrigger('');
    setAutomationAction('');
  };

  // Invite team member
  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || inviting) return;
    
    setInviting(true);
    try {
      const res = await fetch('/api/tenant/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Add pending invitation to list
        setTeamMembers(prev => [...prev, {
          id: data.invitation.id,
          email: data.invitation.email,
          name: data.invitation.email.split('@')[0],
          role: data.invitation.role,
          status: 'pending' as const,
          joinedAt: new Date().toISOString(),
          invitationId: data.invitation.id,
          expiresAt: data.invitation.expiresAt,
        }]);
        setInviteDialogOpen(false);
        setInviteEmail('');
        setInviteRole('member');
        setSnackbar({
          open: true,
          message: data.emailSent 
            ? 'Invitation sent successfully' 
            : 'Invitation created (email could not be sent)',
          severity: data.emailSent ? 'success' : 'warning',
        });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to send invitation',
        severity: 'error',
      });
    } finally {
      setInviting(false);
    }
  };

  // Update member role
  const handleUpdateMemberRole = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      const res = await fetch(`/api/tenant/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (res.ok) {
        setTeamMembers(prev =>
          prev.map(m => (m.id === userId ? { ...m, role: newRole } : m))
        );
        setSnackbar({ open: true, message: 'Role updated', severity: 'success' });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to update role',
        severity: 'error',
      });
    }
  };

  // Remove member
  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the workspace?`)) return;
    
    try {
      const res = await fetch(`/api/tenant/members/${userId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setTeamMembers(prev => prev.filter(m => m.id !== userId));
        setSnackbar({ open: true, message: 'Member removed', severity: 'success' });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member');
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to remove member',
        severity: 'error',
      });
    }
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

        {/* Billing & Plan */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditCard sx={{ color: 'accent.secondary' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Billing
                </Typography>
              </Box>
              {tenant?.plan !== 'free' && tenant?.stripeCustomerId && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/billing/portal', { method: 'POST' });
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                    } catch (err) {
                      console.error('Failed to open billing portal:', err);
                    }
                  }}
                >
                  Manage
                </Button>
              )}
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                Current Plan
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={tenant?.plan === 'free' ? 'Free' : tenant?.plan === 'pro' ? 'Pro' : 'Team'}
                  sx={{
                    bgcolor: (theme) => alpha(planColors[tenant?.plan || 'free'], 0.15),
                    color: planColors[tenant?.plan || 'free'],
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    px: 1,
                  }}
                />
                {tenant?.plan === 'free' && (
                  <Typography variant="body2" color="text.secondary">
                    Free forever • Upgrade anytime
                  </Typography>
                )}
              </Box>
            </Box>

            {tenant?.plan === 'free' ? (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.accent.secondary, 0.08),
                  border: '1px solid',
                  borderColor: (theme) => alpha(theme.palette.accent.secondary, 0.2),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Rocket sx={{ color: 'accent.secondary', mt: 0.5 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Unlock more with Pro
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Get GitHub integration, Clawdbot AI, more boards, and automations.
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      href="/pricing"
                      sx={{
                        bgcolor: 'accent.secondary',
                        color: 'background.default',
                        '&:hover': {
                          bgcolor: (theme) => alpha(theme.palette.accent.secondary, 0.85),
                        },
                      }}
                    >
                      View Plans
                    </Button>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Thank you for supporting Moltboard! Your subscription helps us keep building.
                </Typography>
                {tenant?.planExpiresAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Renews: {new Date(tenant.planExpiresAt).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Team Members */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Group sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Team Members
                </Typography>
              </Box>
              {canManageMembers && (
                <Button
                  startIcon={<PersonAdd />}
                  variant="contained"
                  size="small"
                  onClick={() => setInviteDialogOpen(true)}
                >
                  Invite
                </Button>
              )}
            </Box>
            
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Team members have access to all boards in this workspace.
            </Typography>
            
            {teamMembers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Group sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">
                  No team members yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Invite people to collaborate on all boards
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {teamMembers.map((member) => (
                  <ListItem
                    key={member.id}
                    sx={{
                      bgcolor: alpha('#ffffff', 0.02),
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: member.status === 'pending' 
                        ? alpha('#FFA500', 0.3) 
                        : alpha('#ffffff', 0.1),
                      opacity: member.status === 'pending' ? 0.8 : 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                      {/* Avatar placeholder */}
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: member.role === 'owner' 
                            ? '#F97316' 
                            : member.role === 'admin' 
                              ? '#3B82F6' 
                              : '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '1rem',
                        }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </Box>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography fontWeight={600} sx={{ 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {member.name}
                            </Typography>
                            <Chip
                              size="small"
                              icon={
                                member.role === 'owner' ? <AdminPanelSettings sx={{ fontSize: 14 }} /> :
                                member.role === 'admin' ? <AdminPanelSettings sx={{ fontSize: 14 }} /> :
                                <Person sx={{ fontSize: 14 }} />
                              }
                              label={member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              sx={{
                                height: 22,
                                fontSize: '0.7rem',
                                bgcolor: member.role === 'owner'
                                  ? alpha('#F97316', 0.2)
                                  : member.role === 'admin'
                                    ? alpha('#3B82F6', 0.2)
                                    : alpha('#6B7280', 0.2),
                                color: member.role === 'owner'
                                  ? '#F97316'
                                  : member.role === 'admin'
                                    ? '#3B82F6'
                                    : '#9CA3AF',
                              }}
                            />
                            {member.status === 'pending' && (
                              <Chip
                                size="small"
                                icon={<Schedule sx={{ fontSize: 14 }} />}
                                label="Pending"
                                sx={{
                                  height: 22,
                                  fontSize: '0.7rem',
                                  bgcolor: alpha('#FFA500', 0.2),
                                  color: '#FFA500',
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            {member.email}
                            {member.status === 'active' && ` • Joined ${new Date(member.joinedAt).toLocaleDateString()}`}
                            {member.status === 'pending' && member.expiresAt && 
                              ` • Expires ${new Date(member.expiresAt).toLocaleDateString()}`}
                          </Typography>
                        }
                      />
                    </Box>
                    
                    {canManageMembers && member.role !== 'owner' && (
                      <ListItemSecondaryAction>
                        {/* Role change dropdown */}
                        {(canManageAdmins || member.role !== 'admin') && (
                          <Tooltip title="Change role">
                            <IconButton
                              size="small"
                              onClick={() => {
                                const newRole = member.role === 'admin' ? 'member' : 'admin';
                                handleUpdateMemberRole(member.id, newRole);
                              }}
                              sx={{ mr: 0.5 }}
                            >
                              {member.role === 'admin' ? (
                                <Person fontSize="small" />
                              ) : (
                                <AdminPanelSettings fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={member.status === 'pending' ? 'Cancel invitation' : 'Remove from workspace'}>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            sx={{ color: 'error.main' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
            
            {tenant?.plan === 'free' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Free plan is limited to 1 member. <a href="/pricing" style={{ color: '#F97316' }}>Upgrade to Team</a> for up to 10 members.
                </Typography>
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* API Keys */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
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

        {/* Clawdbot AI Integration */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SmartToy sx={{ color: '#FF6B35' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Clawdbot AI Integration
                </Typography>
              </Box>
              <Button
                startIcon={<ArrowForward />}
                variant="contained"
                size="small"
                href="/integrations/clawdbot"
                sx={{
                  background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #E5612F 0%, #DE841B 100%)',
                  },
                }}
              >
                Configure
              </Button>
            </Box>
            
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Connect your personal Clawdbot AI assistant to manage tasks with natural language commands.
            </Typography>
            
            <Box sx={{ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: alpha('#FF6B35', 0.08),
              border: '1px solid',
              borderColor: alpha('#FF6B35', 0.2),
            }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>What you can do:</strong>
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li><Typography variant="body2" color="text.secondary">Chat with AI about your tasks and projects</Typography></li>
                <li><Typography variant="body2" color="text.secondary">Create, move, and update tasks using natural language</Typography></li>
                <li><Typography variant="body2" color="text.secondary">Get notified about task changes via your AI</Typography></li>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Automations */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoFixHigh sx={{ color: 'warning.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Automations
                </Typography>
              </Box>
              <Button
                startIcon={<Add />}
                variant="contained"
                size="small"
                onClick={() => setAutomationDialogOpen(true)}
              >
                New Rule
              </Button>
            </Box>
            
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Create custom automation rules to streamline your workflow.
            </Typography>
            
            {automations.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AutoFixHigh sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">
                  No automations yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create rules to automate task management
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {automations.map((automation) => (
                  <ListItem
                    key={automation.id}
                    sx={{
                      bgcolor: alpha('#ffffff', 0.02),
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: automation.enabled 
                        ? alpha('#ffffff', 0.1) 
                        : alpha('#ffffff', 0.05),
                      opacity: automation.enabled ? 1 : 0.6,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight={600}>{automation.name}</Typography>
                          {!automation.enabled && (
                            <Chip label="Disabled" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                          <Typography variant="body2" component="span">
                            When <Chip label={TRIGGER_LABELS[automation.trigger] || automation.trigger} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            {' → '}
                            <Chip label={ACTION_LABELS[automation.action] || automation.action} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                          </Typography>
                          {automation.description && (
                            <Typography variant="caption" color="text.secondary" component="span">
                              {automation.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" component="span">
                            Triggered {automation.triggerCount} times
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title={automation.enabled ? 'Disable' : 'Enable'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleAutomation(automation.id, !automation.enabled)}
                        >
                          {automation.enabled ? (
                            <CheckCircle fontSize="small" color="success" />
                          ) : (
                            <Sync fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteAutomation(automation.id)}
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

      {/* Automation Dialog */}
      <Dialog open={automationDialogOpen} onClose={resetAutomationDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoFixHigh color="warning" />
          Create Automation
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            placeholder="e.g., Review task for new PRs"
            value={automationName}
            onChange={(e) => setAutomationName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Description (optional)"
            placeholder="What does this automation do?"
            value={automationDescription}
            onChange={(e) => setAutomationDescription(e.target.value)}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            When this happens...
          </Typography>
          <TextField
            select
            fullWidth
            value={automationTrigger}
            onChange={(e) => setAutomationTrigger(e.target.value)}
            size="small"
            sx={{ mb: 2 }}
            SelectProps={{ native: true }}
          >
            <option value="">Select a trigger...</option>
            <optgroup label="GitHub Events">
              <option value="github_pr_opened">PR Opened</option>
              <option value="github_pr_merged">PR Merged</option>
              <option value="github_pr_closed">PR Closed</option>
              <option value="github_issue_opened">Issue Opened</option>
              <option value="github_issue_closed">Issue Closed</option>
            </optgroup>
            <optgroup label="Task Events">
              <option value="task_created">Task Created</option>
              <option value="task_moved">Task Moved</option>
              <option value="task_completed">Task Completed</option>
            </optgroup>
            <optgroup label="Time-Based">
              <option value="due_date_approaching">Due Date Approaching</option>
              <option value="due_date_passed">Due Date Passed</option>
            </optgroup>
          </TextField>
          
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Do this...
          </Typography>
          <TextField
            select
            fullWidth
            value={automationAction}
            onChange={(e) => setAutomationAction(e.target.value)}
            size="small"
            SelectProps={{ native: true }}
          >
            <option value="">Select an action...</option>
            <option value="create_task">Create Task</option>
            <option value="move_task">Move Task</option>
            <option value="update_task">Update Task</option>
            <option value="add_label">Add Label</option>
            <option value="add_comment">Add Comment</option>
            <option value="notify">Send Notification</option>
            <option value="archive_task">Archive Task</option>
          </TextField>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              Advanced action parameters can be configured via the API. This UI covers basic rule creation.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetAutomationDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleCreateAutomation}
            variant="contained"
            disabled={!automationName.trim() || !automationTrigger || !automationAction || creatingAutomation}
          >
            {creatingAutomation ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Team Member Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAdd color="primary" />
          Invite Team Member
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Invite someone to join your workspace. They'll have access to all boards.
          </Typography>
          
          <TextField
            autoFocus
            fullWidth
            label="Email Address"
            type="email"
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            select
            fullWidth
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
            SelectProps={{ native: true }}
            helperText={
              inviteRole === 'admin' 
                ? 'Admins can manage team members and access all boards'
                : 'Members have access to all boards as editors'
            }
          >
            <option value="member">Member</option>
            {canManageAdmins && <option value="admin">Admin</option>}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleInviteMember}
            variant="contained"
            disabled={!inviteEmail.trim() || inviting}
          >
            {inviting ? 'Sending...' : 'Send Invitation'}
          </Button>
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
