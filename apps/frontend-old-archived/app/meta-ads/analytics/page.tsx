'use client';

import { useState } from 'react';
import { useQuery, gql } from '@/lib/apollo-client';
import { useRouter } from 'next/navigation';
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
import Grid from '@mui/material/Grid';
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

const GET_CAMPAIGN_ANALYTICS = gql`
  query GetCampaignAnalytics($campaignId: ID, $startDate: String!, $endDate: String!) {
    campaignAnalytics(campaignId: $campaignId, dateRange: { startDate: $startDate, endDate: $endDate }) {
      totalSpend
      totalImpressions
      totalClicks
      totalConversions
      ctr
      cpc
      cpm
      roas
      dailyMetrics {
        date
        spend
        impressions
        clicks
        conversions
        ctr
      }
    }
  }
`;

const LIST_CAMPAIGNS = gql`
  query ListCampaigns {
    listMetaCampaigns {
      id
      name
      status
    }
  }
`;

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

  // Mock data for top campaigns chart
  const topCampaignsData = [
    { name: 'Summer Sale', spend: 450, conversions: 89 },
    { name: 'Product Launch', spend: 380, conversions: 76 },
    { name: 'Brand Awareness', spend: 320, conversions: 45 },
    { name: 'Retargeting', spend: 280, conversions: 102 },
  ];

  if (analyticsLoading || campaignsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
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

        {/* Filters */}
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

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="Total Spend"
              value={`$${analytics?.totalSpend?.toFixed(2) || '0.00'}`}
              change={{ value: '+12.5%', isPositive: true }}
              icon={MonetizationOn}
              testId="card-metric-spend"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="Impressions"
              value={analytics?.totalImpressions?.toLocaleString() || '0'}
              change={{ value: '+8.3%', isPositive: true }}
              icon={Visibility}
              testId="card-metric-impressions"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="Clicks"
              value={analytics?.totalClicks?.toLocaleString() || '0'}
              change={{ value: '+15.2%', isPositive: true }}
              icon={MouseOutlined}
              testId="card-metric-clicks"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="CTR"
              value={`${((analytics?.ctr || 0) * 100).toFixed(2)}%`}
              change={{ value: '+2.1%', isPositive: true }}
              icon={PercentOutlined}
              testId="card-metric-ctr"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="Conversions"
              value={analytics?.totalConversions?.toLocaleString() || '0'}
              change={{ value: '+18.7%', isPositive: true }}
              icon={ShoppingCart}
              testId="card-metric-conversions"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="CPC"
              value={`$${analytics?.cpc?.toFixed(2) || '0.00'}`}
              change={{ value: '-5.3%', isPositive: false }}
              icon={AttachMoney}
              testId="card-metric-cpc"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="CPM"
              value={`$${analytics?.cpm?.toFixed(2) || '0.00'}`}
              change={{ value: '-3.2%', isPositive: false }}
              icon={Insights}
              testId="card-metric-cpm"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="ROAS"
              value={`${analytics?.roas?.toFixed(2) || '0.00'}x`}
              change={{ value: '+22.4%', isPositive: true }}
              icon={TrendingUp}
              testId="card-metric-roas"
            />
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
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

        {/* Campaign Comparison Table */}
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
  );
}
