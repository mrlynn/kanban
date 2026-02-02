'use client';

import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import {
  DarkMode,
  LightMode,
  SettingsBrightness,
  Check,
} from '@mui/icons-material';
import { useState, MouseEvent } from 'react';
import { useThemeMode } from '@/contexts/ThemeContext';

type ThemeMode = 'dark' | 'light' | 'system';

const modes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Dark', icon: <DarkMode fontSize="small" /> },
  { value: 'light', label: 'Light', icon: <LightMode fontSize="small" /> },
  { value: 'system', label: 'System', icon: <SettingsBrightness fontSize="small" /> },
];

interface ThemeToggleProps {
  showMenu?: boolean;
}

export function ThemeToggle({ showMenu = true }: ThemeToggleProps) {
  const { mode, resolvedMode, setMode, toggleMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (showMenu) {
      setAnchorEl(event.currentTarget);
    } else {
      toggleMode();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (newMode: ThemeMode) => {
    setMode(newMode);
    handleClose();
  };

  const currentIcon = resolvedMode === 'dark' ? <DarkMode /> : <LightMode />;
  const label = mode === 'system' 
    ? `System (${resolvedMode})` 
    : mode.charAt(0).toUpperCase() + mode.slice(1);

  return (
    <>
      <Tooltip title={`Theme: ${label}`}>
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
            },
          }}
        >
          {currentIcon}
        </IconButton>
      </Tooltip>

      {showMenu && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {modes.map(({ value, label, icon }) => (
            <MenuItem
              key={value}
              onClick={() => handleSelect(value)}
              selected={mode === value}
            >
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText>{label}</ListItemText>
              {mode === value && (
                <Check fontSize="small" sx={{ ml: 1, color: 'primary.main' }} />
              )}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}
