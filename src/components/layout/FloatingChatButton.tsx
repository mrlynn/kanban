'use client';

import { useState, useEffect } from 'react';
import {
  Fab,
  Badge,
  Zoom,
  Tooltip,
  alpha,
} from '@mui/material';
import { Chat, Close } from '@mui/icons-material';

interface FloatingChatButtonProps {
  open: boolean;
  onClick: () => void;
  unreadCount?: number;
}

/**
 * Floating action button for chat - bottom right corner
 * Used for Option B (floating bubble + panel) UX pattern
 */
export function FloatingChatButton({ open, onClick, unreadCount = 0 }: FloatingChatButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Zoom in={mounted}>
      <Tooltip title={open ? 'Close chat' : 'Chat with AI Assistant'} placement="left">
        <Fab
          onClick={onClick}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 60,
            height: 60,
            bgcolor: open ? alpha('#F97316', 0.9) : '#F97316',
            color: 'white',
            boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: '#EA580C',
              transform: 'scale(1.05)',
              boxShadow: '0 6px 24px rgba(249, 115, 22, 0.5)',
            },
            // Hide when chat is open (optional - can toggle this)
            // opacity: open ? 0 : 1,
            // pointerEvents: open ? 'none' : 'auto',
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                top: -4,
                right: -4,
                fontSize: '0.7rem',
                minWidth: 18,
                height: 18,
              },
            }}
          >
            {open ? (
              <Close sx={{ fontSize: 28 }} />
            ) : (
              // Fire emoji as the icon
              <span style={{ fontSize: 28, lineHeight: 1 }}>🔥</span>
            )}
          </Badge>
        </Fab>
      </Tooltip>
    </Zoom>
  );
}
