'use client';

import { Box } from '@mui/material';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

const SIDEBAR_WIDTH = 280;

export function AppShell({ children }: AppShellProps) {
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
    </Box>
  );
}
