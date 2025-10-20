'use client';

import { ReactNode, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { muiLightTheme, muiDarkTheme } from './theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const theme = useMemo(() => {
    return mode === 'light' ? muiLightTheme : muiDarkTheme;
  }, [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
