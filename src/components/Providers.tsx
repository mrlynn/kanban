'use client';

import { SessionProvider } from 'next-auth/react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { theme } from '@/lib/theme';
import { HelpProvider } from '@/contexts/HelpContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppRouterCacheProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <HelpProvider>
              {children}
            </HelpProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </SessionProvider>
  );
}
