'use client';

import { createTheme, ThemeOptions } from '@mui/material/styles';

// Design guidelines colors converted to MUI theme
const lightTheme: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: 'hsl(0, 0%, 9%)', // near-black for CTAs, headers
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: 'hsl(0, 0%, 45%)', // medium gray for supporting text
      contrastText: '#FFFFFF',
    },
    background: {
      default: 'hsl(0, 0%, 100%)', // pure white
      paper: 'hsl(0, 0%, 98%)', // off-white cards
    },
    text: {
      primary: 'hsl(0, 0%, 9%)', // near-black
      secondary: 'hsl(0, 0%, 45%)', // medium gray
    },
    divider: 'hsl(0, 0%, 90%)', // subtle dividers
    success: {
      main: 'hsl(142, 71%, 45%)', // green for confirmations
    },
    info: {
      main: 'hsl(217, 91%, 60%)', // blue for links, badges
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    h1: {
      fontSize: '3.75rem', // 60px - Hero/Display
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '3rem', // 48px - Display
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.875rem', // 30px - Section Headers
      fontWeight: 700,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem', // 24px - Product Titles
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem', // 16px - Body
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem', // 14px - Labels/Meta
      fontWeight: 500,
      lineHeight: 1.43,
    },
    caption: {
      fontSize: '0.75rem', // 12px - Captions
      fontWeight: 400,
      lineHeight: 1.66,
    },
  },
  spacing: 8, // Base spacing unit
  shape: {
    borderRadius: 8, // rounded-lg
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: '0.5rem',
          padding: '0.75rem 1.5rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.5rem',
          },
        },
      },
    },
  },
};

const darkTheme: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: 'hsl(0, 0%, 98%)', // near-white for CTAs, headers
      contrastText: 'hsl(0, 0%, 9%)',
    },
    secondary: {
      main: 'hsl(0, 0%, 65%)', // light gray for supporting text
      contrastText: '#000000',
    },
    background: {
      default: 'hsl(0, 0%, 7%)', // deep charcoal
      paper: 'hsl(0, 0%, 12%)', // elevated cards
    },
    text: {
      primary: 'hsl(0, 0%, 98%)', // near-white
      secondary: 'hsl(0, 0%, 65%)', // light gray
    },
    divider: 'hsl(0, 0%, 20%)', // subtle dividers
    success: {
      main: 'hsl(142, 71%, 45%)', // same green
    },
    info: {
      main: 'hsl(217, 91%, 60%)', // same blue
    },
  },
  typography: lightTheme.typography,
  spacing: lightTheme.spacing,
  shape: lightTheme.shape,
  components: lightTheme.components,
};

// Create theme instances
export const muiLightTheme = createTheme(lightTheme);
export const muiDarkTheme = createTheme(darkTheme);
