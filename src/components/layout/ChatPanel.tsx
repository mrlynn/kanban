'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Badge,
  CircularProgress,
  alpha,
  Slide,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Close,
  Send,
  Person,
  ExpandMore,
} from '@mui/icons-material';
import { ChatMessage } from '@/types/chat';
import { Actor } from '@/types/kanban';

const PANEL_WIDTH = 400;

const actorConfig: Record<Actor, { name: string; color: string; avatar: React.ReactNode }> = {
  mike: { name: 'Mike', color: '#3B82F6', avatar: <Person fontSize="small" /> },
  moltbot: { name: 'Moltbot', color: '#F97316', avatar: '🔥' },
  system: { name: 'System', color: '#6B7280', avatar: 'S' },
  api: { name: 'API', color: '#8B5CF6', avatar: 'A' },
};

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Handle scroll to show/hide scroll button
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat?limit=100');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [open, fetchMessages]);

  // Scroll to bottom when messages change or panel opens
  useEffect(() => {
    if (open && messages.length > 0) {
      setTimeout(() => scrollToBottom('auto'), 100);
    }
  }, [open, messages.length]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error) {
      console.error('Failed to send:', error);
    } finally {
      setSending(false);
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  return (
    <Slide direction="left" in={open} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: PANEL_WIDTH,
          height: '100vh',
          bgcolor: 'background.paper',
          borderLeft: '1px solid',
          borderColor: alpha('#ffffff', 0.1),
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1200,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: '1px solid',
            borderColor: alpha('#ffffff', 0.1),
            background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) 100%)',
          }}
        >
          <Avatar 
            sx={{ 
              bgcolor: '#F97316', 
              width: 40, 
              height: 40,
              fontSize: '1.25rem',
            }}
          >
            🔥
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Moltbot
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Your AI Co-founder
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <Close />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box
          ref={messagesContainerRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <CircularProgress size={32} sx={{ color: '#F97316' }} />
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
              <Typography variant="h1" sx={{ fontSize: 48, mb: 2 }}>👋</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Hey! I'm Moltbot.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ask me anything or tell me what you need.
              </Typography>
            </Box>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <Box key={date}>
                {/* Date separator */}
                <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                  <Box sx={{ flex: 1, height: '1px', bgcolor: alpha('#ffffff', 0.1) }} />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      px: 2, 
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                    }}
                  >
                    {date}
                  </Typography>
                  <Box sx={{ flex: 1, height: '1px', bgcolor: alpha('#ffffff', 0.1) }} />
                </Box>

                {/* Messages for this date */}
                {msgs.map((message, idx) => {
                  const actor = actorConfig[message.author];
                  const isMike = message.author === 'mike';
                  const showAvatar = idx === 0 || msgs[idx - 1]?.author !== message.author;

                  return (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        flexDirection: isMike ? 'row-reverse' : 'row',
                        gap: 1,
                        mb: 1,
                        alignItems: 'flex-end',
                      }}
                    >
                      {/* Avatar */}
                      <Box sx={{ width: 32, flexShrink: 0 }}>
                        {showAvatar && (
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: actor.color,
                              fontSize: '0.875rem',
                            }}
                          >
                            {typeof actor.avatar === 'string' ? actor.avatar : <Person sx={{ fontSize: 18 }} />}
                          </Avatar>
                        )}
                      </Box>

                      {/* Message bubble */}
                      <Box
                        sx={{
                          maxWidth: '75%',
                          px: 2,
                          py: 1,
                          borderRadius: 2.5,
                          bgcolor: isMike 
                            ? alpha('#3B82F6', 0.2) 
                            : alpha('#F97316', 0.15),
                          borderTopRightRadius: isMike ? 4 : 20,
                          borderTopLeftRadius: isMike ? 20 : 4,
                        }}
                      >
                        {showAvatar && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 600, 
                              color: actor.color,
                              display: 'block',
                              mb: 0.25,
                            }}
                          >
                            {actor.name}
                          </Typography>
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.5,
                          }}
                        >
                          {message.content}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ fontSize: '0.65rem' }}
                          >
                            {formatTime(message.createdAt)}
                          </Typography>
                          {message.status === 'pending' && (
                            <Chip 
                              label="pending" 
                              size="small" 
                              sx={{ 
                                height: 16, 
                                fontSize: '0.6rem',
                                bgcolor: alpha('#F59E0B', 0.3),
                              }} 
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <IconButton
            onClick={() => scrollToBottom()}
            sx={{
              position: 'absolute',
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: alpha('#F97316', 0.9),
              color: 'white',
              '&:hover': { bgcolor: '#F97316' },
              boxShadow: 2,
            }}
            size="small"
          >
            <ExpandMore />
          </IconButton>
        )}

        {/* Input */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: alpha('#ffffff', 0.1),
            bgcolor: alpha('#000', 0.2),
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Message Moltbot..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    sx={{
                      bgcolor: newMessage.trim() ? '#F97316' : 'transparent',
                      color: newMessage.trim() ? 'white' : 'text.secondary',
                      '&:hover': { bgcolor: newMessage.trim() ? '#EA580C' : 'transparent' },
                      '&:disabled': { bgcolor: 'transparent', color: 'text.disabled' },
                    }}
                  >
                    {sending ? <CircularProgress size={20} color="inherit" /> : <Send />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 3,
                bgcolor: alpha('#ffffff', 0.05),
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha('#ffffff', 0.1),
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha('#ffffff', 0.2),
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#F97316',
                },
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
            Press Enter to send, Shift+Enter for new line
          </Typography>
        </Box>
      </Box>
    </Slide>
  );
}
