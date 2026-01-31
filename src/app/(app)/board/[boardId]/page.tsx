'use client';

import { Box } from '@mui/material';
import { KanbanBoard } from '@/components/KanbanBoard';

interface BoardPageProps {
  params: { boardId: string };
}

export default function BoardPage({ params }: BoardPageProps) {
  const { boardId } = params;

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 2,
      }}
    >
      <KanbanBoard boardId={boardId} />
    </Box>
  );
}
