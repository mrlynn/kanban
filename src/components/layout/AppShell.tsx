'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, useMediaQuery, useTheme, Drawer, IconButton } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { Sidebar } from './Sidebar';
import { ChatPanel } from './ChatPanel';
import { FloatingChatButton } from './FloatingChatButton';

interface AppShellProps {
  children: React.ReactNode;
}

const SIDEBAR_WIDTH = 280;

export function AppShell({ children }: AppShellProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Chat state - lifted here so floating button and panel can share it
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCheckedRef = useRef<string | null>(null);

  // Poll for unread messages when chat is closed
  useEffect(() => {
    if (chatOpen) {
      setUnreadCount(0);
      return;
    }

    const pollUnread = async () => {
      try {
        const res = await fetch('/api/chat?limit=10');
        if (res.ok) {
          const data = await res.json();
          const messages = data.messages || [];
          // Count agent messages we haven't seen (handles legacy 'moltbot' author too)
          const newAgentMessages = messages.filter(
            (m: { author: string; createdAt: string }) =>
              (m.author === 'agent' || m.author === 'moltbot') &&
              lastCheckedRef.current &&
              new Date(m.createdAt) > new Date(lastCheckedRef.current)
          );
          if (newAgentMessages.length > 0) {
            setUnreadCount((prev) => prev + newAgentMessages.length);
          }
          if (messages.length > 0) {
            lastCheckedRef.current = messages[messages.length - 1].createdAt;
          }
        }
      } catch (error) {
        console.error('Failed to poll messages:', error);
      }
    };

    const interval = setInterval(pollUnread, 15000);
    return () => clearInterval(interval);
  }, [chatOpen]);

  const toggleChat = () => setChatOpen((prev) => !prev);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          onClick={() => setMobileMenuOpen(true)}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: theme.zIndex.appBar + 1,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              bgcolor: 'background.paper',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Sidebar - Persistent on desktop, Drawer on mobile */}
      {isMobile ? (
        <Drawer
          anchor="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              bgcolor: 'background.default',
            },
          }}
        >
          <Sidebar width={SIDEBAR_WIDTH} onNavigate={() => setMobileMenuOpen(false)} />
        </Drawer>
      ) : (
        <Sidebar width={SIDEBAR_WIDTH} />
      )}

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          ml: isMobile ? 0 : `${SIDEBAR_WIDTH}px`,
          pt: isMobile ? 8 : 0, // Space for mobile menu button
          px: isMobile ? 2 : 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>

      {/* Floating Chat Button - bottom right */}
      <FloatingChatButton
        open={chatOpen}
        onClick={toggleChat}
        unreadCount={unreadCount}
      />

      {/* Chat Panel - slides from right */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </Box>
  );
}
