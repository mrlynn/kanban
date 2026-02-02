'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  Snackbar,
  Divider,
  Chip,
  IconButton,
  CircularProgress,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  alpha,
  Skeleton,
  Link,
} from '@mui/material';
import {
  SmartToy,
  ContentCopy,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error,
  Pending,
  Refresh,
  Delete,
  Speed,
  Code,
  Link as LinkIcon,
  ArrowForward,
} from '@mui/icons-material';

interface Integration {
  id: string;
  enabled: boolean;
  webhookUrl: string;
  apiKeyPrefix: string;
  status: 'pending' | 'connected' | 'error';
  lastConnectedAt?: string;
  lastError?: string;
  messagesReceived: number;
  messagesSent: number;
  lastMessageAt?: string;
  createdAt: string;
}

const STATUS_CONFIG = {
  pending: { icon: Pending, color: 'warning', label: 'Pending' },
  connected: { icon: CheckCircle, color: 'success', label: 'Connected' },
  error: { icon: Error, color: 'error', label: 'Error' },
};

export default function ClawdbotIntegrationPage() {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Form state
  const [webhookUrl, setWebhookUrl] = useState('');
  
  // Credentials (only shown after creation/regeneration)
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  
  // Test results
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    latencyMs?: number;
  } | null>(null);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Fetch integration
  const fetchIntegration = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/clawdbot');
      if (res.ok) {
        const data = await res.json();
        setIntegration(data.integration);
        if (data.integration?.webhookUrl) {
          setWebhookUrl(data.integration.webhookUrl);
        }
      }
    } catch (error) {
      console.error('Failed to fetch integration:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  // Create or update integration
  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      setSnackbar({ open: true, message: 'Webhook URL is required', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/integrations/clawdbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setIntegration(data.integration);
        if (data.apiKey) setNewApiKey(data.apiKey);
        if (data.webhookSecret) setNewSecret(data.webhookSecret);
        setSnackbar({ 
          open: true, 
          message: integration ? 'Integration updated!' : 'Integration created!', 
          severity: 'success' 
        });
      } else {
        setSnackbar({
          open: true,
          message: data.error || 'Failed to save integration',
          severity: 'error',
        });
        return;
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to save integration',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Regenerate API key
  const handleRegenerateApiKey = async () => {
    if (!confirm('This will invalidate your current API key. Continue?')) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/integrations/clawdbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateApiKey: true }),
      });

      const data = await res.json();
      if (res.ok && data.apiKey) {
        setNewApiKey(data.apiKey);
        setIntegration(data.integration);
        setSnackbar({ open: true, message: 'API key regenerated!', severity: 'success' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to regenerate key', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Test connection
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const res = await fetch('/api/integrations/clawdbot/test', { method: 'POST' });
      const data = await res.json();
      
      setTestResult({
        success: data.success,
        message: data.success ? 'Connection successful!' : data.error,
        latencyMs: data.latencyMs,
      });
      
      // Refresh integration to get updated status
      fetchIntegration();
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      });
    } finally {
      setTesting(false);
    }
  };

  // Delete integration
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to disconnect Clawdbot?')) return;
    
    try {
      const res = await fetch('/api/integrations/clawdbot', { method: 'DELETE' });
      if (res.ok) {
        setIntegration(null);
        setWebhookUrl('');
        setNewApiKey(null);
        setNewSecret(null);
        setSnackbar({ open: true, message: 'Integration removed', severity: 'success' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' });
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: `${label} copied!`, severity: 'info' });
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  const StatusIcon = integration ? STATUS_CONFIG[integration.status].icon : Pending;
  const statusColor = integration ? STATUS_CONFIG[integration.status].color : 'default';

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 4 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(255, 107, 53, 0.3)',
          }}
        >
          <SmartToy sx={{ fontSize: 40, color: 'white' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Clawdbot Integration
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Connect your personal AI assistant to manage tasks with natural language commands.
          </Typography>
          {integration && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                icon={<StatusIcon sx={{ fontSize: 16 }} />}
                label={STATUS_CONFIG[integration.status].label}
                color={statusColor as 'success' | 'warning' | 'error'}
                size="small"
              />
              {integration.lastConnectedAt && (
                <Typography variant="caption" color="text.secondary">
                  Last connected: {new Date(integration.lastConnectedAt).toLocaleString()}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Error Alert */}
      {integration?.status === 'error' && integration.lastError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Connection Error:</strong> {integration.lastError}
          </Typography>
        </Alert>
      )}

      {/* New Credentials Alert */}
      {(newApiKey || newSecret) && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => { setNewApiKey(null); setNewSecret(null); }}
            >
              Dismiss
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            ⚠️ Save these credentials now — you won't see them again!
          </Typography>
          
          {newApiKey && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                API Key (for your Clawdbot config):
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {showApiKey ? newApiKey : '•'.repeat(32)}
                </code>
                <IconButton size="small" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
                <IconButton size="small" onClick={() => copyToClipboard(newApiKey, 'API Key')}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          )}
          
          {newSecret && (
            <Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                Webhook Secret:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {showSecret ? newSecret : '•'.repeat(32)}
                </code>
                <IconButton size="small" onClick={() => setShowSecret(!showSecret)}>
                  {showSecret ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
                <IconButton size="small" onClick={() => copyToClipboard(newSecret, 'Secret')}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          )}
        </Alert>
      )}

      {/* Main Content */}
      <Paper sx={{ p: 4, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          {integration ? 'Connection Settings' : 'Connect Your Clawdbot'}
        </Typography>

        {/* Webhook URL */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Your Clawdbot Webhook URL
          </Typography>
          <TextField
            fullWidth
            placeholder="https://your-server:18789/webhook/moltboard"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            helperText="The URL where Moltboard will send messages to your Clawdbot"
          />
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !webhookUrl.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : <LinkIcon />}
          >
            {integration ? 'Update' : 'Connect'}
          </Button>

          {integration && (
            <>
              <Button
                variant="outlined"
                onClick={handleTest}
                disabled={testing}
                startIcon={testing ? <CircularProgress size={16} /> : <Speed />}
              >
                Test Connection
              </Button>
              
              <Button
                variant="outlined"
                color="warning"
                onClick={handleRegenerateApiKey}
                disabled={saving}
                startIcon={<Refresh />}
              >
                Regenerate API Key
              </Button>

              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                startIcon={<Delete />}
              >
                Disconnect
              </Button>
            </>
          )}
        </Box>

        {/* Test Results */}
        {testResult && (
          <Alert 
            severity={testResult.success ? 'success' : 'error'} 
            sx={{ mt: 2 }}
          >
            {testResult.message}
            {testResult.latencyMs && (
              <Typography variant="caption" sx={{ ml: 1 }}>
                ({testResult.latencyMs}ms)
              </Typography>
            )}
          </Alert>
        )}

        {/* Stats */}
        {integration && (
          <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Usage Statistics
            </Typography>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {integration.messagesReceived}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Messages Received
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {integration.messagesSent}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Responses Sent
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Setup Instructions */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Code />
          Setup Instructions
        </Typography>

        <Stepper orientation="vertical" sx={{ mt: 2 }}>
          <Step active expanded>
            <StepLabel>
              <Typography fontWeight={600}>Enter your Clawdbot webhook URL above</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                This is typically <code>http://your-server:18789/webhook/moltboard</code>
              </Typography>
            </StepContent>
          </Step>

          <Step active expanded>
            <StepLabel>
              <Typography fontWeight={600}>Add Moltboard to your Clawdbot config</Typography>
            </StepLabel>
            <StepContent>
              <Box
                sx={{
                  bgcolor: '#1a1a1a',
                  borderRadius: 2,
                  p: 2,
                  position: 'relative',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  mt: 1,
                  overflow: 'auto',
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(
                    `channels:
  moltboard:
    enabled: true
    apiUrl: "https://kanban.mlynn.org"
    apiKey: "${newApiKey || integration?.apiKeyPrefix || 'YOUR_API_KEY'}"
    webhookMode: true
    webhookSecret: "${newSecret || 'YOUR_WEBHOOK_SECRET'}"`,
                    'Config'
                  )}
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
                <pre style={{ margin: 0, color: '#e0e0e0' }}>
{`channels:
  moltboard:
    enabled: true
    apiUrl: "https://kanban.mlynn.org"
    apiKey: "${newApiKey || integration?.apiKeyPrefix || 'YOUR_API_KEY'}"
    webhookMode: true
    webhookSecret: "${newSecret || 'YOUR_WEBHOOK_SECRET'}"`}
                </pre>
              </Box>
            </StepContent>
          </Step>

          <Step active expanded>
            <StepLabel>
              <Typography fontWeight={600}>Restart your Clawdbot gateway</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                Run <code>clawdbot gateway restart</code> to apply the changes.
              </Typography>
            </StepContent>
          </Step>

          <Step active expanded>
            <StepLabel>
              <Typography fontWeight={600}>Test the connection</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                Click "Test Connection" above to verify everything is working.
              </Typography>
            </StepContent>
          </Step>
        </Stepper>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary">
          Need help? Check the{' '}
          <Link href="https://docs.clawd.bot" target="_blank" rel="noopener">
            Clawdbot documentation
          </Link>{' '}
          or reach out on{' '}
          <Link href="https://discord.com/invite/clawd" target="_blank" rel="noopener">
            Discord
          </Link>.
        </Typography>
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
