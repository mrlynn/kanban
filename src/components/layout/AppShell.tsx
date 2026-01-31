'use client';

import { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { Sidebar } from './Sidebar';
import { ChatPanel } from './ChatPanel';
import { FloatingChatButton } from './FloatingChatButton';

interface AppShellProps {
  children: React.ReactNode;
}

const SIDEBAR_WIDTH = 280;

export function AppShell({ children }: AppShellProps) {
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
          // Count moltbot messages we haven't seen
          const newMoltbotMessages = messages.filter(
            (m: { author: string; createdAt: string }) =>
              m.author === 'moltbot' &&
              lastCheckedRef.current &&
              new Date(m.createdAt) > new Date(lastCheckedRef.current)
          );
          if (newMoltbotMessages.length > 0) {
            setUnreadCount((prev) => prev + newMoltbotMessages.length);
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
      {/* Persistent Sidebar */}
      <Sidebar width={SIDEBAR_WIDTH} />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          ml: `${SIDEBAR_WIDTH}px`,
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
