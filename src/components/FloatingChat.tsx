'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
  CircularProgress,
  alpha,
  Chip,
  Paper,
} from '@mui/material';
import {
  Send,
  Close,
  Remove,
  OpenInFull,
  Person,
} from '@mui/icons-material';
import { ChatMessage } from '@/types/chat';
import { Actor } from '@/types/kanban';

const actorConfig: Record<Actor, { name: string; color: string; avatar: React.ReactNode }> = {
  mike: { name: 'Mike', color: '#3B82F6', avatar: <Person fontSize="small" /> },
  moltbot: { name: 'Moltbot', color: '#F97316', avatar: '🔥' },
  system: { name: 'System', color: '#6B7280', avatar: 'S' },
  api: { name: 'API', color: '#8B5CF6', avatar: 'A' },
};

interface FloatingChatProps {
  boardId: string;
}

export function FloatingChat({ boardId }: FloatingChatProps) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastCheckedRef = useRef<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

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
        
        // Count unread from moltbot
        if (isPolling && !open && lastCheckedRef.current) {
          const newBotMessages = newMessages.filter(
            m => m.author === 'moltbot' && 
            new Date(m.createdAt) > new Date(lastCheckedRef.current!)
          );
          if (newBotMessages.length > 0) {
            setUnreadCount(prev => prev + newBotMessages.length);
          }
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

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => fetchMessages(true), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(scrollToBottom, 100);
      setUnreadCount(0);
    }
  }, [messages, open, minimized]);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea')) return;
    setIsDragging(true);
    const rect = chatRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      // Constrain to viewport
      const maxX = window.innerWidth - 360;
      const maxY = window.innerHeight - 500;
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage, boardId }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to send:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Closed state - just the FAB
  if (!open) {
    return (
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        <Tooltip title="Chat with Moltbot">
          <Badge badgeContent={unreadCount} color="error">
            <IconButton
              onClick={() => setOpen(true)}
              sx={{
                width: 56,
                height: 56,
                bgcolor: '#F97316',
                color: 'white',
                boxShadow: 3,
                '&:hover': { bgcolor: '#EA580C' },
              }}
            >
              <Typography variant="h5">🔥</Typography>
            </IconButton>
          </Badge>
        </Tooltip>
      </Box>
    );
  }

  // Minimized state
  if (minimized) {
    return (
      <Paper
        ref={chatRef}
        elevation={8}
        onMouseDown={handleMouseDown}
        sx={{
          position: 'fixed',
          bottom: position.y || 24,
          right: position.x ? undefined : 24,
          left: position.x || undefined,
          top: position.y ? position.y : undefined,
          width: 200,
          zIndex: 1000,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <Box
          sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#F97316',
            color: 'white',
            borderRadius: '4px 4px 0 0',
          }}
        >
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
            🔥 Moltbot
          </Typography>
          <Badge badgeContent={unreadCount} color="error" sx={{ mr: 1 }}>
            <Box />
          </Badge>
          <IconButton size="small" onClick={() => setMinimized(false)} sx={{ color: 'white', p: 0.5 }}>
            <OpenInFull sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white', p: 0.5 }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Paper>
    );
  }

  // Full chat window
  return (
    <Paper
      ref={chatRef}
      elevation={8}
      onMouseDown={handleMouseDown}
      sx={{
        position: 'fixed',
        bottom: position.y ? undefined : 24,
        right: position.x ? undefined : 24,
        left: position.x || undefined,
        top: position.y || undefined,
        width: 360,
        height: 480,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      {/* Header - draggable */}
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: '#F97316',
          color: 'white',
          cursor: 'grab',
          borderRadius: '4px 4px 0 0',
        }}
      >
        <Avatar sx={{ bgcolor: 'white', color: '#F97316', width: 32, height: 32 }}>🔥</Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>Moltbot</Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>Your AI Co-founder</Typography>
        </Box>
        <IconButton size="small" onClick={() => setMinimized(true)} sx={{ color: 'white' }}>
          <Remove fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, bgcolor: alpha('#000', 0.2) }}>
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
                  mb: 1.5,
                  alignItems: 'flex-end',
                }}
              >
                <Avatar sx={{ width: 24, height: 24, bgcolor: actor.color, fontSize: '0.75rem' }}>
                  {actor.avatar}
                </Avatar>
                <Box
                  sx={{
                    maxWidth: '75%',
                    p: 1,
                    borderRadius: 2,
                    bgcolor: isMike ? alpha('#3B82F6', 0.3) : alpha('#F97316', 0.2),
                    borderBottomRightRadius: isMike ? 0 : 8,
                    borderBottomLeftRadius: isMike ? 8 : 0,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem' }}>
                    {message.content}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {formatTime(message.createdAt)}
                    </Typography>
                    {message.status === 'pending' && (
                      <Chip label="pending" size="small" sx={{ height: 14, fontSize: '0.55rem', bgcolor: alpha('#F59E0B', 0.3) }} />
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
      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: alpha('#fff', 0.1), display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          multiline
          maxRows={3}
          disabled={sending}
          sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          sx={{ bgcolor: '#F97316', color: 'white', '&:hover': { bgcolor: '#EA580C' }, '&:disabled': { bgcolor: 'action.disabled' } }}
        >
          {sending ? <CircularProgress size={20} color="inherit" /> : <Send fontSize="small" />}
        </IconButton>
      </Box>
    </Paper>
  );
}
