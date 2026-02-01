'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  TextField,
  InputAdornment,
  Collapse,
  Snackbar,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Warning,
  CheckCircle,
  Schedule,
  Flag,
  Refresh,
  Error as ErrorIcon,
  ArrowForward,
  Terminal,
  Send,
  KeyboardArrowUp,
  KeyboardArrowDown,
  HelpOutline,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import Link from 'next/link';
import { useHelp } from '@/contexts/HelpContext';

interface MetricsData {
  velocity: {
    daily: { date: string; completed: number }[];
    weeklyAverage: number;
    trend: 'up' | 'down' | 'stable';
  };
  tasksByPriority: Record<string, number>;
  tasksByColumn: Record<string, { count: number; title: string }>;
  overdue: Array<{ id: string; title: string; dueDate: string; priority?: string }>;
  stuck: Array<{ id: string; title: string; updatedAt: string; priority?: string }>;
  recentCompletions: Array<{ id: string; title: string; updatedAt: string }>;
  summary: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    archived: number;
    avgCycleTimeHours: number | null;
  };
  health: {
    score: number;
    issues: string[];
  };
}

const PRIORITY_COLORS: Record<string, string> = {
  p0: '#DC2626',
  p1: '#F97316',
  p2: '#EAB308',
  p3: '#6B7280',
  none: '#94a3b8',
};

const PRIORITY_LABELS: Record<string, string> = {
  p0: 'Critical',
  p1: 'High',
  p2: 'Medium',
  p3: 'Low',
  none: 'None',
};

export default function DashboardPage() {
  const theme = useTheme();
  const { openHelp } = useHelp();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Command bar state
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandResult, setCommandResult] = useState<{ message: string; success: boolean } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [showCommandBar, setShowCommandBar] = useState(true);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Execute command
  const executeCommand = async (cmd: string) => {
    if (!cmd.trim() || executing) return;
    
    // Check for help commands
    const helpCommands = ['?', 'help', '/help', '/?'];
    if (helpCommands.includes(cmd.trim().toLowerCase())) {
      setCommand('');
      openHelp();
      return;
    }
    
    setExecuting(true);
    setCommandResult(null);
    
    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cmd }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setCommandResult({ message: data.result?.message || data.message || 'Done', success: true });
        setCommandHistory(prev => [cmd, ...prev.slice(0, 19)]);
        setCommand('');
        setHistoryIndex(-1);
        // Refresh metrics after command execution
        fetchMetrics();
      } else {
        setCommandResult({ message: data.error || 'Command failed', success: false });
      }
    } catch (err) {
      setCommandResult({ message: 'Failed to execute command', success: false });
    } finally {
      setExecuting(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand(command);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/metrics?range=14d');
      if (!res.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Global keyboard shortcut: Cmd+K to focus command bar
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandBar(true);
        commandInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  if (loading && !metrics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!metrics) return null;

  const TrendIcon = metrics.velocity.trend === 'up' ? TrendingUp : 
                    metrics.velocity.trend === 'down' ? TrendingDown : TrendingFlat;
  const trendColor = metrics.velocity.trend === 'up' ? 'success.main' : 
                     metrics.velocity.trend === 'down' ? 'error.main' : 'text.secondary';

  // Prepare chart data
  const velocityData = metrics.velocity.daily.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    completed: d.completed,
  }));

  const priorityData = Object.entries(metrics.tasksByPriority)
    .filter(([, count]) => count > 0)
    .map(([priority, count]) => ({
      name: PRIORITY_LABELS[priority] || priority,
      value: count,
      color: PRIORITY_COLORS[priority] || '#666',
    }));

  const columnData = Object.entries(metrics.tasksByColumn)
    .sort((a, b) => a[1].title.localeCompare(b[1].title))
    .map(([, data]) => ({
      name: data.title,
      count: data.count,
    }));

  const healthColor = metrics.health.score >= 80 ? 'success' :
                      metrics.health.score >= 50 ? 'warning' : 'error';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            🎛️ Control Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your work at a glance
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={showCommandBar ? 'Hide command bar' : 'Show command bar'}>
            <IconButton onClick={() => setShowCommandBar(!showCommandBar)}>
              <Terminal />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchMetrics} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Command Bar */}
      <Collapse in={showCommandBar}>
        <Paper
          sx={{
            p: 2,
            mb: 3,
            bgcolor: alpha(theme.palette.background.paper, 0.7),
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.2),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Terminal sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" color="primary.main">
              Command Center
            </Typography>
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                ⌘K focus • Enter execute • ↑↓ history
              </Typography>
              <Tooltip title="Help (? or ⌘/)">
                <IconButton size="small" onClick={openHelp}>
                  <HelpOutline fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <TextField
            fullWidth
            size="small"
            placeholder="Try: create task Fix the bug, priority high, due tomorrow"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={executing}
            inputRef={commandInputRef}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography sx={{ fontFamily: 'monospace', color: 'primary.main' }}>{'>'}</Typography>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => executeCommand(command)}
                    disabled={!command.trim() || executing}
                  >
                    {executing ? <CircularProgress size={18} /> : <Send fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                fontFamily: 'monospace',
                bgcolor: alpha('#000', 0.3),
              },
            }}
          />
          
          {commandResult && (
            <Alert
              severity={commandResult.success ? 'success' : 'error'}
              sx={{ mt: 1 }}
              onClose={() => setCommandResult(null)}
            >
              {commandResult.message}
            </Alert>
          )}
          
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Examples:
            </Typography>
            {[
              '?',
              'show P1 tasks',
              'move "task name" to done',
              'create task: New feature, p2',
            ].map((example) => (
              <Chip
                key={example}
                label={example}
                size="small"
                variant="outlined"
                onClick={() => {
                  setCommand(example);
                  commandInputRef.current?.focus();
                }}
                sx={{
                  fontSize: '0.7rem',
                  height: 22,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                }}
              />
            ))}
          </Box>
        </Paper>
      </Collapse>

      <Grid container spacing={3}>
        {/* Health Score Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Health
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={metrics.health.score}
                    size={100}
                    thickness={6}
                    color={healthColor}
                    sx={{ 
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      }
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h4" fontWeight="bold">
                      {metrics.health.score}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  {metrics.health.issues.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                      <CheckCircle />
                      <Typography>All good!</Typography>
                    </Box>
                  ) : (
                    metrics.health.issues.slice(0, 3).map((issue, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Warning fontSize="small" color="warning" />
                        <Typography variant="body2">{issue}</Typography>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Stats */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h3" fontWeight="bold" color="primary">
                      {metrics.summary.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Tasks
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h3" fontWeight="bold" color="info.main">
                      {metrics.summary.inProgress}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      In Progress
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h3" fontWeight="bold" color="success.main">
                      {metrics.summary.completed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <Typography variant="h3" fontWeight="bold">
                        {metrics.velocity.weeklyAverage.toFixed(1)}
                      </Typography>
                      <TrendIcon sx={{ color: trendColor, fontSize: 28 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Weekly Velocity
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Velocity Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Velocity (Last 14 Days)
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={velocityData}>
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke={theme.palette.primary.main}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCompleted)"
                      name="Tasks Completed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Priority Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                By Priority
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value) => <span style={{ color: theme.palette.text.primary }}>{value}</span>}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tasks by Column */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                By Column
              </Typography>
              <Box sx={{ height: 250, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={columnData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                    <Bar dataKey="count" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts: Overdue & Stuck */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="error.main">
                ⚠️ Needs Attention
              </Typography>

              {metrics.overdue.length === 0 && metrics.stuck.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 3, justifyContent: 'center' }}>
                  <CheckCircle color="success" />
                  <Typography color="text.secondary">No urgent issues</Typography>
                </Box>
              ) : (
                <List dense>
                  {metrics.overdue.slice(0, 5).map((task) => (
                    <ListItem
                      key={task.id}
                      sx={{
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ErrorIcon color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        secondary={`Overdue: ${new Date(task.dueDate).toLocaleDateString()}`}
                        primaryTypographyProps={{ noWrap: true, fontSize: 14 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                      />
                      {task.priority && (
                        <Chip
                          label={task.priority.toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: PRIORITY_COLORS[task.priority],
                            color: 'white',
                            fontSize: 10,
                            height: 20,
                          }}
                        />
                      )}
                    </ListItem>
                  ))}
                  {metrics.stuck.slice(0, 5).map((task) => (
                    <ListItem
                      key={task.id}
                      sx={{
                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Schedule color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        secondary={`Stuck since: ${new Date(task.updatedAt).toLocaleDateString()}`}
                        primaryTypographyProps={{ noWrap: true, fontSize: 14 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                      />
                      {task.priority && (
                        <Chip
                          label={task.priority.toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: PRIORITY_COLORS[task.priority],
                            color: 'white',
                            fontSize: 10,
                            height: 20,
                          }}
                        />
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Completions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  ✅ Recent Completions
                </Typography>
                <Link href="/" passHref>
                  <Chip
                    label="View Board"
                    icon={<ArrowForward fontSize="small" />}
                    clickable
                    size="small"
                    sx={{ '& .MuiChip-icon': { order: 1, ml: 0.5, mr: -0.5 } }}
                  />
                </Link>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {metrics.recentCompletions.slice(0, 10).map((task) => (
                  <Chip
                    key={task.id}
                    label={task.title}
                    size="small"
                    variant="outlined"
                    sx={{ maxWidth: 200 }}
                  />
                ))}
                {metrics.recentCompletions.length === 0 && (
                  <Typography color="text.secondary" variant="body2">
                    No recent completions
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
