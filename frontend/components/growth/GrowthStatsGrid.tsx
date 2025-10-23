'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';

export interface StatItem {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ sx?: object }>;
  testId: string;
  change?: {
    value: string;
    isPositive: boolean;
  };
}

interface GrowthStatsGridProps {
  stats: StatItem[];
}

export default function GrowthStatsGrid({ stats }: GrowthStatsGridProps) {
  return (
    <Grid container spacing={3}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Grid key={stat.testId} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card data-testid={stat.testId}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                    {stat.change && (
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1,
                          color: stat.change.isPositive ? 'success.main' : 'error.main',
                        }}
                      >
                        {stat.change.value}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ p: 2, bgcolor: 'primary.main', borderRadius: 2, color: 'white' }}>
                    <Icon sx={{ fontSize: 32 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
