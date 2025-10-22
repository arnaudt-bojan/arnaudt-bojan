'use client';

import { ReactNode } from 'react';
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';

interface ChartPanelProps {
  title: string;
  children: ReactNode;
  height?: number;
  testId: string;
  loading?: boolean;
  error?: string;
}

export default function ChartPanel({
  title,
  children,
  height = 300,
  testId,
  loading = false,
  error,
}: ChartPanelProps) {
  return (
    <Card data-testid={testId}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {error ? (
          <Box
            sx={{
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'error.main',
            }}
          >
            <Typography>{error}</Typography>
          </Box>
        ) : loading ? (
          <Skeleton variant="rectangular" height={height} />
        ) : (
          <Box sx={{ height, width: '100%' }}>{children}</Box>
        )}
      </CardContent>
    </Card>
  );
}
