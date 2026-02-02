'use client';

import { SessionProvider } from 'next-auth/react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeContextProvider } from '@/contexts/ThemeContext';
import { HelpProvider } from '@/contexts/HelpContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppRouterCacheProvider>
        <ThemeContextProvider>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <HelpProvider>
              {children}
            </HelpProvider>
          </LocalizationProvider>
        </ThemeContextProvider>
      </AppRouterCacheProvider>
    </SessionProvider>
  );
}
