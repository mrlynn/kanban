'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Chip,
  alpha,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  IconButton,
  Autocomplete,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Clear } from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import { Task, Priority, PriorityConfig, USERS } from '@/types/kanban';
import { AssignableUser } from '@/types/team';

interface TaskDialogProps {
  open: boolean;
  task: Task | null;
  boardId?: string;
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
}

const availableLabels = [
  { name: 'bug', color: '#EF4444' },
  { name: 'feature', color: '#3B82F6' },
  { name: 'improvement', color: '#10B981' },
  { name: 'urgent', color: '#F59E0B' },
  { name: 'documentation', color: '#8B5CF6' },
  { name: 'research', color: '#EC4899' },
  { name: 'ux', color: '#06B6D4' },
  { name: 'infra', color: '#6366F1' },
  { name: 'marketing', color: '#14B8A6' },
  { name: 'growth', color: '#84CC16' },
  { name: 'product', color: '#F97316' },
  { name: 'priority', color: '#DC2626' },
  { name: 'skill', color: '#A855F7' },
  { name: 'mongodb', color: '#00ED64' },
  { name: 'completed', color: '#22C55E' },
];

const priorities: Priority[] = ['p0', 'p1', 'p2', 'p3'];

export function TaskDialog({ open, task, boardId, onClose, onSave }: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority | ''>('');
  const [dueDate, setDueDate] = useState<Dayjs | null>(null);
  const [assignee, setAssignee] = useState<AssignableUser | null>(null);
  
  // Board members for assignment
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch assignable users when dialog opens
  useEffect(() => {
    const fetchBoardId = boardId || task?.boardId;
    if (open && fetchBoardId) {
      fetchAssignableUsers(fetchBoardId);
    }
  }, [open, boardId, task?.boardId]);

  const fetchAssignableUsers = async (bId: string) => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/boards/${bId}/members`);
      if (res.ok) {
        const data = await res.json();
        setAssignableUsers(data.assignableUsers || []);
      } else {
        // Fallback to hardcoded users if API fails
        setAssignableUsers(USERS.map(u => ({ ...u, email: '' })));
      }
    } catch (err) {
      console.error('Failed to fetch assignable users:', err);
      // Fallback to hardcoded users
      setAssignableUsers(USERS.map(u => ({ ...u, email: '' })));
    } finally {
      setLoadingUsers(false);
    }
  };

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setLabels(task.labels || []);
      setPriority(task.priority || '');
      setDueDate(task.dueDate ? dayjs(task.dueDate) : null);
      // Set assignee from loaded users or find from task
      const foundUser = assignableUsers.find(u => u.id === task.assigneeId);
      setAssignee(foundUser || null);
    } else {
      setTitle('');
      setDescription('');
      setLabels([]);
      setPriority('');
      setDueDate(null);
      setAssignee(null);
    }
  }, [task, open, assignableUsers]);

  const handleToggleLabel = (label: string) => {
    setLabels((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  const handlePriorityChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPriority: Priority | null
  ) => {
    setPriority(newPriority || '');
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      labels: labels.length > 0 ? labels : undefined,
      priority: priority || undefined,
      dueDate: dueDate ? dueDate.toDate() : undefined,
      assigneeId: assignee?.id || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle>
        {task ? 'Edit Task' : 'New Task'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            autoFocus
            required
          />
          
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
          
          {/* Priority Selection */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Priority
            </Typography>
            <ToggleButtonGroup
              value={priority}
              exclusive
              onChange={handlePriorityChange}
              size="small"
              sx={{ flexWrap: 'wrap' }}
            >
              {priorities.map((p) => (
                <ToggleButton
                  key={p}
                  value={p}
                  sx={{
                    px: 2,
                    color: PriorityConfig[p].color,
                    borderColor: alpha(PriorityConfig[p].color, 0.5),
                    '&.Mui-selected': {
                      bgcolor: alpha(PriorityConfig[p].color, 0.2),
                      color: PriorityConfig[p].color,
                      borderColor: PriorityConfig[p].color,
                      '&:hover': {
                        bgcolor: alpha(PriorityConfig[p].color, 0.3),
                      },
                    },
                    '&:hover': {
                      bgcolor: alpha(PriorityConfig[p].color, 0.1),
                    },
                  }}
                >
                  {PriorityConfig[p].icon} {PriorityConfig[p].label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          
          {/* Due Date */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Due Date
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DatePicker
                value={dueDate}
                onChange={(newValue) => setDueDate(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    placeholder: 'Select date',
                  },
                }}
              />
              {dueDate && (
                <IconButton 
                  size="small" 
                  onClick={() => setDueDate(null)}
                  sx={{ color: 'text.secondary' }}
                >
                  <Clear fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>
          
          {/* Assignee */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Assignee
            </Typography>
            <Autocomplete
              value={assignee}
              onChange={(_, newValue) => setAssignee(newValue)}
              options={assignableUsers}
              loading={loadingUsers}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar 
                    src={option.avatar}
                    sx={{ 
                      width: 28, 
                      height: 28, 
                      bgcolor: option.color,
                      fontSize: '0.875rem',
                    }}
                  >
                    {option.name[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2">{option.name}</Typography>
                    {option.email && (
                      <Typography variant="caption" color="text.secondary">
                        {option.email}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder={loadingUsers ? 'Loading...' : 'Unassigned'}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: assignee ? (
                      <Avatar 
                        src={assignee.avatar}
                        sx={{ 
                          width: 24, 
                          height: 24, 
                          bgcolor: assignee.color,
                          fontSize: '0.75rem',
                          ml: 0.5,
                          mr: -0.5,
                        }}
                      >
                        {assignee.name[0]}
                      </Avatar>
                    ) : null,
                    endAdornment: (
                      <>
                        {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>
          
          {/* Labels */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Labels
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {availableLabels.map((label) => (
                <Chip
                  key={label.name}
                  label={label.name}
                  onClick={() => handleToggleLabel(label.name)}
                  size="small"
                  sx={{
                    bgcolor: labels.includes(label.name)
                      ? alpha(label.color, 0.3)
                      : alpha(label.color, 0.1),
                    color: label.color,
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: labels.includes(label.name)
                      ? label.color
                      : 'transparent',
                    '&:hover': {
                      bgcolor: alpha(label.color, 0.2),
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!title.trim()}
        >
          {task ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
