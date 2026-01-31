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
} from '@mui/material';
import { Task, Priority, PriorityConfig } from '@/types/kanban';

interface TaskDialogProps {
  open: boolean;
  task: Task | null;
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

export function TaskDialog({ open, task, onClose, onSave }: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority | ''>('');
  const [dueDate, setDueDate] = useState('');

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setLabels(task.labels || []);
      setPriority(task.priority || '');
      setDueDate(
        task.dueDate
          ? new Date(task.dueDate).toISOString().split('T')[0]
          : ''
      );
    } else {
      setTitle('');
      setDescription('');
      setLabels([]);
      setPriority('');
      setDueDate('');
    }
  }, [task, open]);

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
      dueDate: dueDate ? new Date(dueDate) : undefined,
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
          
          <Box>
            <Box sx={{ mb: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
              Labels
            </Box>
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
          
          <TextField
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
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
