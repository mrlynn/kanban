'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Fab,
  Badge,
  Tooltip,
  CircularProgress,
  alpha,
  Chip,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Send,
  Close,
  SmartToy,
  Person,
} from '@mui/icons-material';
import { ChatMessage } from '@/types/chat';
import { Actor } from '@/types/kanban';

const actorConfig: Record<Actor, { name: string; color: string; avatar: React.ReactNode }> = {
  mike: { name: 'Mike', color: '#3B82F6', avatar: <Person fontSize="small" /> },
  moltbot: { name: 'Moltbot', color: '#F97316', avatar: '🔥' },
  system: { name: 'System', color: '#6B7280', avatar: <SmartToy fontSize="small" /> },
  api: { name: 'API', color: '#8B5CF6', avatar: 'A' },
};

interface ChatSidebarProps {
  boardId: string;
}

export function ChatSidebar({ boardId }: ChatSidebarProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastCheckedRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      
      const url = new URL('/api/chat', window.location.origin);
      url.searchParams.set('boardId', boardId);
      url.searchParams.set('limit', '100');
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const newMessages = data.messages as ChatMessage[];
        
        // Count unread messages from moltbot since last check
        if (isPolling && !open && lastCheckedRef.current) {
          const newBotMessages = newMessages.filter(
            m => m.author === 'moltbot' && 
            new Date(m.createdAt) > new Date(lastCheckedRef.current!)
          );
          setUnreadCount(prev => prev + newBotMessages.length);
        }
        
        setMessages(newMessages);
        
        if (newMessages.length > 0) {
          lastCheckedRef.current = newMessages[newMessages.length - 1].createdAt.toString();
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [boardId, open]);

  // Initial fetch and polling
  useEffect(() => {
    fetchMessages();
    
    // Poll every 10 seconds
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Scroll to bottom when messages change or drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 100);
      setUnreadCount(0);
    }
  }, [messages, open]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage,
          boardId,
        }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        <Tooltip title="Chat with Moltbot">
          <Badge 
            badgeContent={unreadCount} 
            color="error"
            sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
          >
            <Fab
              color="primary"
              onClick={() => setOpen(true)}
              sx={{
                bgcolor: '#F97316',
                '&:hover': { bgcolor: '#EA580C' },
              }}
            >
              <ChatIcon />
            </Fab>
          </Badge>
        </Tooltip>
      </Box>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            bgcolor: 'background.paper',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: alpha('#F97316', 0.1),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: '#F97316', width: 36, height: 36 }}>🔥</Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Moltbot
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Your AI Co-founder
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setOpen(false)} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {loading && messages.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No messages yet. Say hi! 👋
              </Typography>
            </Box>
          ) : (
            messages.map((message) => {
              const actor = actorConfig[message.author];
              const isMike = message.author === 'mike';
              
              return (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    flexDirection: isMike ? 'row-reverse' : 'row',
                    gap: 1,
                    alignItems: 'flex-end',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      bgcolor: actor.color,
                      fontSize: '0.875rem',
                    }}
                  >
                    {actor.avatar}
                  </Avatar>
                  <Box
                    sx={{
                      maxWidth: '75%',
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: isMike
                        ? alpha('#3B82F6', 0.2)
                        : alpha('#F97316', 0.1),
                      borderBottomRightRadius: isMike ? 0 : 2,
                      borderBottomLeftRadius: isMike ? 2 : 0,
                    }}
                  >
                    {message.taskTitle && (
                      <Chip
                        label={message.taskTitle}
                        size="small"
                        sx={{ mb: 1, height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {message.content}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 0.5,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(message.createdAt)}
                      </Typography>
                      {message.status === 'pending' && (
                        <Chip
                          label="awaiting reply"
                          size="small"
                          sx={{ 
                            height: 16, 
                            fontSize: '0.6rem',
                            bgcolor: alpha('#F59E0B', 0.2),
                            color: '#F59E0B',
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 1,
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Message Moltbot..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            multiline
            maxRows={4}
            disabled={sending}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            sx={{
              bgcolor: '#F97316',
              color: 'white',
              '&:hover': { bgcolor: '#EA580C' },
              '&:disabled': { bgcolor: 'action.disabledBackground' },
            }}
          >
            {sending ? <CircularProgress size={20} color="inherit" /> : <Send />}
          </IconButton>
        </Box>
      </Drawer>
    </>
  );
}
