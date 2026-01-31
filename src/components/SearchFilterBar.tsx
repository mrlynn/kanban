'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  Chip,
  InputAdornment,
  IconButton,
  Popover,
  Typography,
  Divider,
  Button,
  alpha,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  Search,
  FilterList,
  Close,
  CalendarToday,
  Warning,
  Person,
  Label,
  PriorityHigh,
} from '@mui/icons-material';
import { Priority, PriorityConfig, USERS } from '@/types/kanban';

export interface SearchFilters {
  q: string;
  labels: string[];
  assignees: string[];
  priorities: Priority[];
  overdue: boolean;
  hasDueDate: boolean | null;
}

interface SearchFilterBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableLabels: string[];
}

const defaultFilters: SearchFilters = {
  q: '',
  labels: [],
  assignees: [],
  priorities: [],
  overdue: false,
  hasDueDate: null,
};

export function SearchFilterBar({
  filters,
  onFiltersChange,
  availableLabels,
}: SearchFilterBarProps) {
  const [searchValue, setSearchValue] = useState(filters.q);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.q) {
        onFiltersChange({ ...filters, q: searchValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters, onFiltersChange]);

  // Keyboard shortcut: Cmd/Ctrl+K or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasActiveFilters =
    filters.labels.length > 0 ||
    filters.assignees.length > 0 ||
    filters.priorities.length > 0 ||
    filters.overdue ||
    filters.hasDueDate !== null;

  const activeFilterCount =
    filters.labels.length +
    filters.assignees.length +
    filters.priorities.length +
    (filters.overdue ? 1 : 0) +
    (filters.hasDueDate !== null ? 1 : 0);

  const handleClearFilters = () => {
    setSearchValue('');
    onFiltersChange(defaultFilters);
  };

  const toggleLabel = (label: string) => {
    const newLabels = filters.labels.includes(label)
      ? filters.labels.filter((l) => l !== label)
      : [...filters.labels, label];
    onFiltersChange({ ...filters, labels: newLabels });
  };

  const toggleAssignee = (assigneeId: string) => {
    const newAssignees = filters.assignees.includes(assigneeId)
      ? filters.assignees.filter((a) => a !== assigneeId)
      : [...filters.assignees, assigneeId];
    onFiltersChange({ ...filters, assignees: newAssignees });
  };

  const togglePriority = (priority: Priority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority];
    onFiltersChange({ ...filters, priorities: newPriorities });
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Search Input */}
      <TextField
        inputRef={searchRef}
        size="small"
        placeholder="Search tasks... (⌘K)"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        sx={{
          minWidth: 240,
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.paper',
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="small" sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: searchValue ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => {
                  setSearchValue('');
                  onFiltersChange({ ...filters, q: '' });
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {/* Filter Button */}
      <Tooltip title="Filters">
        <Button
          variant={hasActiveFilters ? 'contained' : 'outlined'}
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          startIcon={<FilterList />}
          sx={{
            minWidth: 'auto',
            bgcolor: hasActiveFilters ? 'primary.main' : 'background.paper',
          }}
        >
          {activeFilterCount > 0 ? activeFilterCount : 'Filter'}
        </Button>
      </Tooltip>

      {/* Active Filter Chips */}
      {filters.labels.map((label) => (
        <Chip
          key={`label-${label}`}
          label={label}
          size="small"
          icon={<Label sx={{ fontSize: 14 }} />}
          onDelete={() => toggleLabel(label)}
          sx={{ bgcolor: alpha('#3B82F6', 0.15) }}
        />
      ))}
      {filters.assignees.map((assigneeId) => {
        const user = USERS.find((u) => u.id === assigneeId);
        return (
          <Chip
            key={`assignee-${assigneeId}`}
            label={user?.name || assigneeId}
            size="small"
            avatar={
              <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem', bgcolor: user?.color }}>
                {user?.avatar || user?.name?.[0] || '?'}
              </Avatar>
            }
            onDelete={() => toggleAssignee(assigneeId)}
            sx={{ bgcolor: alpha(user?.color || '#6B7280', 0.15) }}
          />
        );
      })}
      {filters.priorities.map((priority) => {
        const config = PriorityConfig[priority];
        return (
          <Chip
            key={`priority-${priority}`}
            label={`${config.icon} ${config.label}`}
            size="small"
            onDelete={() => togglePriority(priority)}
            sx={{ bgcolor: alpha(config.color, 0.15), color: config.color }}
          />
        );
      })}
      {filters.overdue && (
        <Chip
          label="Overdue"
          size="small"
          icon={<Warning sx={{ fontSize: 14, color: '#DC2626' }} />}
          onDelete={() => onFiltersChange({ ...filters, overdue: false })}
          sx={{ bgcolor: alpha('#DC2626', 0.15), color: '#DC2626' }}
        />
      )}
      {filters.hasDueDate === true && (
        <Chip
          label="Has due date"
          size="small"
          icon={<CalendarToday sx={{ fontSize: 14 }} />}
          onDelete={() => onFiltersChange({ ...filters, hasDueDate: null })}
        />
      )}
      {filters.hasDueDate === false && (
        <Chip
          label="No due date"
          size="small"
          icon={<CalendarToday sx={{ fontSize: 14 }} />}
          onDelete={() => onFiltersChange({ ...filters, hasDueDate: null })}
        />
      )}

      {/* Clear All */}
      {(hasActiveFilters || searchValue) && (
        <Button size="small" onClick={handleClearFilters} sx={{ color: 'text.secondary' }}>
          Clear all
        </Button>
      )}

      {/* Filter Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: { p: 2, minWidth: 280, maxWidth: 360 },
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Label fontSize="small" /> Labels
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
          {availableLabels.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No labels found
            </Typography>
          ) : (
            availableLabels.map((label) => (
              <Chip
                key={label}
                label={label}
                size="small"
                onClick={() => toggleLabel(label)}
                variant={filters.labels.includes(label) ? 'filled' : 'outlined'}
                sx={{
                  bgcolor: filters.labels.includes(label) ? alpha('#3B82F6', 0.2) : 'transparent',
                }}
              />
            ))
          )}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person fontSize="small" /> Assignee
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
          {USERS.map((user) => (
            <Chip
              key={user.id}
              label={user.name}
              size="small"
              avatar={
                <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem', bgcolor: user.color }}>
                  {user.avatar || user.name[0]}
                </Avatar>
              }
              onClick={() => toggleAssignee(user.id)}
              variant={filters.assignees.includes(user.id) ? 'filled' : 'outlined'}
              sx={{
                bgcolor: filters.assignees.includes(user.id) ? alpha(user.color, 0.2) : 'transparent',
              }}
            />
          ))}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PriorityHigh fontSize="small" /> Priority
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
          {(Object.keys(PriorityConfig) as Priority[]).map((priority) => {
            const config = PriorityConfig[priority];
            return (
              <Chip
                key={priority}
                label={`${config.icon} ${config.label}`}
                size="small"
                onClick={() => togglePriority(priority)}
                variant={filters.priorities.includes(priority) ? 'filled' : 'outlined'}
                sx={{
                  bgcolor: filters.priorities.includes(priority) ? alpha(config.color, 0.2) : 'transparent',
                  color: config.color,
                  borderColor: config.color,
                }}
              />
            );
          })}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarToday fontSize="small" /> Due Date
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <Chip
            label="Overdue"
            size="small"
            icon={<Warning sx={{ fontSize: 14 }} />}
            onClick={() => onFiltersChange({ ...filters, overdue: !filters.overdue })}
            variant={filters.overdue ? 'filled' : 'outlined'}
            sx={{
              bgcolor: filters.overdue ? alpha('#DC2626', 0.2) : 'transparent',
              color: '#DC2626',
              borderColor: '#DC2626',
            }}
          />
          <Chip
            label="Has due date"
            size="small"
            onClick={() =>
              onFiltersChange({
                ...filters,
                hasDueDate: filters.hasDueDate === true ? null : true,
              })
            }
            variant={filters.hasDueDate === true ? 'filled' : 'outlined'}
          />
          <Chip
            label="No due date"
            size="small"
            onClick={() =>
              onFiltersChange({
                ...filters,
                hasDueDate: filters.hasDueDate === false ? null : false,
              })
            }
            variant={filters.hasDueDate === false ? 'filled' : 'outlined'}
          />
        </Box>
      </Popover>
    </Box>
  );
}

export { defaultFilters };
