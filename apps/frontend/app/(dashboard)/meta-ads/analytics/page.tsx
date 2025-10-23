'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import GrowthStatsGrid, { StatItem } from '@/components/growth/GrowthStatsGrid';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  TrendingUp,
  TrendingDown,
  Download,
  ArrowBack,
  Visibility,
  MouseOutlined,
  PercentOutlined,
  MonetizationOn,
  ShoppingCart,
  AttachMoney,
  Insights,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { subDays } from 'date-fns';
import { GET_CAMPAIGN_ANALYTICS, LIST_CAMPAIGNS } from '@/lib/graphql/meta-ads';

interface DailyMetric {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
}

interface Analytics {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  dailyMetrics: DailyMetric[];
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  testId,
}: {
  title: string;
  value: string;
  change?: { value: string; isPositive: boolean };
  icon: React.ComponentType<{ sx?: object }>;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography color="text.secondary" variant="body2">
            {title}
          </Typography>
          <Box sx={{ p: 1, bgcolor: 'primary.main', borderRadius: 1, color: 'white' }}>
            <Icon sx={{ fontSize: 20 }} />
          </Box>
        </Box>
        <Typography variant="h4" component="div" sx={{ mb: 1 }}>
          {value}
        </Typography>
        {change && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {change.isPositive ? (
              <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
            ) : (
              <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
            )}
            <Typography
              variant="body2"
              sx={{ color: change.isPositive ? 'success.main' : 'error.main' }}
            >
              {change.value}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function MetaAdsAnalytics() {
  const router = useRouter();
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7days');
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const { data: campaignsData, loading: campaignsLoading } = useQuery<{ listMetaCampaigns: Campaign[] }>(LIST_CAMPAIGNS);

  const { data: analyticsData, loading: analyticsLoading } = useQuery<{ campaignAnalytics: Analytics }>(
    GET_CAMPAIGN_ANALYTICS,
    {
      variables: {
        campaignId: selectedCampaign === 'all' ? null : selectedCampaign,
        startDate: startDate?.toISOString().split('T')[0] || '',
        endDate: endDate?.toISOString().split('T')[0] || '',
      },
      skip: !startDate || !endDate,
    }
  );

  const campaigns = campaignsData?.listMetaCampaigns || [];
  const analytics = analyticsData?.campaignAnalytics;

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    const end = new Date();
    let start = new Date();

    if (value === '7days') {
      start = subDays(end, 7);
    } else if (value === '30days') {
      start = subDays(end, 30);
    } else if (value === '90days') {
      start = subDays(end, 90);
    }

    setStartDate(start);
    setEndDate(end);
  };

  const handleExportCSV = () => {
    if (!analytics?.dailyMetrics) return;

    const headers = ['Date', 'Spend', 'Impressions', 'Clicks', 'Conversions', 'CTR'];
    const rows = analytics.dailyMetrics.map((metric) => [
      metric.date,
      metric.spend,
      metric.impressions,
      metric.clicks,
      metric.conversions,
      metric.ctr,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meta-ads-analytics.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const topCampaignsData = [
    { name: 'Summer Sale', spend: 450, conversions: 89 },
    { name: 'Product Launch', spend: 380, conversions: 76 },
    { name: 'Brand Awareness', spend: 320, conversions: 45 },
    { name: 'Retargeting', spend: 280, conversions: 102 },
  ];

  if (analyticsLoading || campaignsLoading) {
    return (
      <DashboardLayout title="Meta Ads Analytics">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  const metricCards: StatItem[] = [
    {
      title: 'Total Spend',
      value: `$${analytics?.totalSpend?.toFixed(2) || '0.00'}`,
      icon: MonetizationOn,
      testId: 'card-metric-spend',
    },
    {
      title: 'Impressions',
      value: analytics?.totalImpressions?.toLocaleString() || '0',
      icon: Visibility,
      testId: 'card-metric-impressions',
    },
    {
      title: 'Clicks',
      value: analytics?.totalClicks?.toLocaleString() || '0',
      icon: MouseOutlined,
      testId: 'card-metric-clicks',
    },
    {
      title: 'CTR',
      value: `${((analytics?.ctr || 0) * 100).toFixed(2)}%`,
      icon: PercentOutlined,
      testId: 'card-metric-ctr',
    },
    {
      title: 'Conversions',
      value: analytics?.totalConversions?.toLocaleString() || '0',
      icon: ShoppingCart,
      testId: 'card-metric-conversions',
    },
    {
      title: 'CPC',
      value: `$${analytics?.cpc?.toFixed(2) || '0.00'}`,
      icon: AttachMoney,
      testId: 'card-metric-cpc',
    },
    {
      title: 'CPM',
      value: `$${analytics?.cpm?.toFixed(2) || '0.00'}`,
      icon: Insights,
      testId: 'card-metric-cpm',
    },
    {
      title: 'ROAS',
      value: `${analytics?.roas?.toFixed(2) || '0.00'}x`,
      icon: TrendingUp,
      testId: 'card-metric-roas',
    },
  ];

  return (
    <DashboardLayout title="Meta Ads Analytics">
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ mb: 4 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => router.push('/meta-ads/dashboard')}
              sx={{ mb: 2 }}
            >
              Back to Dashboard
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" gutterBottom>
                  Meta Ads Analytics
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Track and analyze your advertising performance
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExportCSV}
                data-testid="button-export-csv"
              >
                Export CSV
              </Button>
            </Box>
          </Box>

          <Paper sx={{ p: 3, mb: 4 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Campaign</InputLabel>
                  <Select
                    value={selectedCampaign}
                    label="Campaign"
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    data-testid="select-campaign"
                  >
                    <MenuItem value="all">All Campaigns</MenuItem>
                    {campaigns.map((campaign) => (
                      <MenuItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Date Range</InputLabel>
                  <Select
                    value={dateRange}
                    label="Date Range"
                    onChange={(e) => handleDateRangeChange(e.target.value)}
                    data-testid="select-date-range"
                  >
                    <MenuItem value="7days">Last 7 Days</MenuItem>
                    <MenuItem value="30days">Last 30 Days</MenuItem>
                    <MenuItem value="90days">Last 90 Days</MenuItem>
                    <MenuItem value="custom">Custom Range</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {dateRange === 'custom' && (
                <>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={(date) => setStartDate(date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                        },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={(date) => setEndDate(date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                        },
                      }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>

          <GrowthStatsGrid stats={metricCards} />

          <Grid container spacing={3} sx={{ my: 4 }}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Spend Over Time
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics?.dailyMetrics || []} data-testid="chart-spend-over-time">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="spend" stroke="#1976d2" strokeWidth={2} name="Spend ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Impressions vs Clicks
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={analytics?.dailyMetrics || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="impressions" fill="#4caf50" name="Impressions" />
                      <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#f57c00" strokeWidth={2} name="Clicks" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    CTR Trend
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics?.dailyMetrics || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="ctr" stroke="#9c27b0" strokeWidth={2} name="CTR (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Performing Campaigns
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topCampaignsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="spend" fill="#1976d2" name="Spend ($)" />
                      <Bar dataKey="conversions" fill="#2e7d32" name="Conversions" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Campaign Performance Comparison
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Campaign</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Spend</TableCell>
                      <TableCell align="right">Impressions</TableCell>
                      <TableCell align="right">Clicks</TableCell>
                      <TableCell align="right">CTR</TableCell>
                      <TableCell align="right">Conversions</TableCell>
                      <TableCell align="right">ROAS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {campaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography color="text.secondary" sx={{ py: 4 }}>
                            No campaign data available
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>{campaign.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={campaign.status.toUpperCase()}
                              color={campaign.status === 'active' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">$0.00</TableCell>
                          <TableCell align="right">0</TableCell>
                          <TableCell align="right">0</TableCell>
                          <TableCell align="right">0.00%</TableCell>
                          <TableCell align="right">0</TableCell>
                          <TableCell align="right">0.00x</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Container>
      </LocalizationProvider>
    </DashboardLayout>
  );
}
