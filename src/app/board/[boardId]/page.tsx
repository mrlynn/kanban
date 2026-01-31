'use client';

import {
  Container,
  Box,
  Button,
  alpha,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import Link from 'next/link';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ActivityStream } from '@/components/ActivityStream';
import { FloatingChat } from '@/components/FloatingChat';

interface BoardPageProps {
  params: { boardId: string };
}

export default function BoardPage({ params }: BoardPageProps) {
  const { boardId } = params;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Nav */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid',
          borderColor: alpha('#ffffff', 0.1),
        }}
      >
        <Button
          component={Link}
          href="/"
          startIcon={<ArrowBack />}
          sx={{ color: 'text.secondary' }}
        >
          All Boards
        </Button>
      </Box>

      {/* Board Content */}
      <Container
        maxWidth={false}
        sx={{
          flex: 1,
          py: 3,
          pl: { xs: 3, md: 38 }, // Make room for activity stream
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <KanbanBoard boardId={boardId} />
      </Container>

      {/* Activity Stream - Left sidebar */}
      <ActivityStream boardId={boardId} />

      {/* Floating Chat with Moltbot */}
      <FloatingChat boardId={boardId} />
    </Box>
  );
}
