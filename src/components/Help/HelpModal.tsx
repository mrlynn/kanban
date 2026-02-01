'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close,
  Help,
  Keyboard,
  Terminal,
  Dashboard,
  GitHub,
  AutoFixHigh,
  ViewKanban,
  LightbulbOutlined,
  ChevronRight,
} from '@mui/icons-material';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{ py: 2 }}
    >
      {value === index && children}
    </Box>
  );
}

const KEYBOARD_SHORTCUTS = [
  { keys: ['⌘', '/'], description: 'Open this help', category: 'General' },
  { keys: ['?'], description: 'Open help (in command bar)', category: 'General' },
  { keys: ['⌘', 'K'], description: 'Focus command bar', category: 'General' },
  { keys: ['Esc'], description: 'Close dialogs / Cancel', category: 'General' },
  { keys: ['↑', '↓'], description: 'Navigate command history', category: 'Command Bar' },
  { keys: ['Enter'], description: 'Execute command', category: 'Command Bar' },
  { keys: ['D'], description: 'Open task details (when hovering)', category: 'Board' },
  { keys: ['E'], description: 'Edit task (when hovering)', category: 'Board' },
  { keys: ['Delete'], description: 'Archive task (when selected)', category: 'Board' },
];

const COMMAND_EXAMPLES = [
  { command: 'create task: Fix the login bug', description: 'Create a new task' },
  { command: 'create task: Review PR, priority high, due tomorrow', description: 'Create with priority and due date' },
  { command: 'move "login bug" to done', description: 'Move task to Done column' },
  { command: 'complete the demo video task', description: 'Mark task as complete' },
  { command: 'set priority of API docs to p1', description: 'Change task priority' },
  { command: 'show P1 tasks', description: 'List high-priority tasks' },
  { command: 'show overdue tasks', description: 'List overdue tasks' },
  { command: 'show stuck tasks', description: 'Tasks in progress > 3 days' },
  { command: 'archive all done tasks', description: 'Bulk archive completed work' },
];

const FEATURES = [
  {
    icon: <ViewKanban />,
    title: 'Kanban Board',
    description: 'Drag-and-drop task management with customizable columns, priorities, and labels.',
  },
  {
    icon: <Terminal />,
    title: 'Command Bar',
    description: 'Natural language task management. Create, move, and query tasks without leaving your keyboard.',
  },
  {
    icon: <Dashboard />,
    title: 'Control Center',
    description: 'Dashboard with velocity charts, health scores, and actionable insights about your work.',
  },
  {
    icon: <GitHub />,
    title: 'GitHub Integration',
    description: 'Auto-link PRs to tasks, move tasks when PRs merge, and create tasks from issues.',
  },
  {
    icon: <AutoFixHigh />,
    title: 'Automations',
    description: 'Create custom rules to automate repetitive workflows based on triggers and actions.',
  },
];

const TIPS = [
  'Use task IDs (e.g., task_abc123) in PR titles to auto-link them',
  'The command bar supports fuzzy matching — partial task names work',
  'Priority levels: P0 (critical) → P1 (high) → P2 (medium) → P3 (low)',
  'Due dates support natural language: "tomorrow", "next Monday", "in 3 days"',
  'Stuck tasks are those in progress for more than 3 days without updates',
];

export function HelpModal({ open, onClose }: HelpModalProps) {
  const theme = useTheme();
  const [tab, setTab] = useState(0);

  const renderKeyboardShortcuts = () => {
    const categories = Array.from(new Set(KEYBOARD_SHORTCUTS.map(s => s.category)));
    
    return (
      <Box>
        {categories.map((category) => (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 1 }}>
              {category}
            </Typography>
            {KEYBOARD_SHORTCUTS.filter(s => s.category === category).map((shortcut, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {shortcut.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {shortcut.keys.map((key, j) => (
                    <Box
                      key={j}
                      component="kbd"
                      sx={{
                        px: 1,
                        py: 0.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        border: '1px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        minWidth: 24,
                        textAlign: 'center',
                      }}
                    >
                      {key}
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  };

  const renderCommands = () => (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Type natural language commands in the command bar on the Dashboard. The AI parser understands context and fuzzy matches task names.
      </Typography>
      
      <Paper
        elevation={0}
        sx={{
          bgcolor: alpha('#000', 0.3),
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {COMMAND_EXAMPLES.map((example, i) => (
          <Box
            key={i}
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: i < COMMAND_EXAMPLES.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                color: theme.palette.primary.main,
                mb: 0.5,
              }}
            >
              {example.command}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {example.description}
            </Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );

  const renderFeatures = () => (
    <List disablePadding>
      {FEATURES.map((feature, i) => (
        <ListItem
          key={i}
          sx={{
            px: 0,
            py: 1.5,
            borderBottom: i < FEATURES.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
            alignItems: 'flex-start',
          }}
        >
          <ListItemIcon sx={{ mt: 0.5, minWidth: 40, color: 'primary.main' }}>
            {feature.icon}
          </ListItemIcon>
          <ListItemText
            primary={feature.title}
            secondary={feature.description}
            primaryTypographyProps={{ fontWeight: 600, mb: 0.5 }}
            secondaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItem>
      ))}
    </List>
  );

  const renderTips = () => (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: alpha(theme.palette.warning.main, 0.08),
          border: '1px solid',
          borderColor: alpha(theme.palette.warning.main, 0.2),
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <LightbulbOutlined sx={{ color: 'warning.main' }} />
          <Typography variant="subtitle2" fontWeight={600}>
            Pro Tips
          </Typography>
        </Box>
        <List dense disablePadding>
          {TIPS.map((tip, i) => (
            <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 24 }}>
                <ChevronRight fontSize="small" sx={{ color: 'warning.main' }} />
              </ListItemIcon>
              <ListItemText
                primary={tip}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Need More Help?
      </Typography>
      <Typography variant="body2" color="text.secondary">
        • Visit the Settings page to configure GitHub integrations and automations
        <br />
        • Check the Dashboard for metrics and insights about your work
        <br />
        • Use the API for programmatic access (create API keys in Settings)
      </Typography>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Help sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>
            Help & Shortcuts
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Keyboard />} iconPosition="start" label="Shortcuts" sx={{ minHeight: 56 }} />
          <Tab icon={<Terminal />} iconPosition="start" label="Commands" sx={{ minHeight: 56 }} />
          <Tab icon={<Dashboard />} iconPosition="start" label="Features" sx={{ minHeight: 56 }} />
          <Tab icon={<LightbulbOutlined />} iconPosition="start" label="Tips" sx={{ minHeight: 56 }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ minHeight: 400 }}>
        <TabPanel value={tab} index={0}>
          {renderKeyboardShortcuts()}
        </TabPanel>
        <TabPanel value={tab} index={1}>
          {renderCommands()}
        </TabPanel>
        <TabPanel value={tab} index={2}>
          {renderFeatures()}
        </TabPanel>
        <TabPanel value={tab} index={3}>
          {renderTips()}
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
          Press <kbd>⌘/</kbd> anytime to open this help
        </Typography>
        <Button onClick={onClose} variant="contained">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
