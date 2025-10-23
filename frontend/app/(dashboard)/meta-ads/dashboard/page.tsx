'use client';

import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import GrowthStatsGrid, { StatItem } from '@/components/growth/GrowthStatsGrid';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Box,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp as TrendingUpIcon,
  CampaignOutlined,
  Visibility,
  MouseOutlined,
  Add,
  BarChart,
  MoreVert,
  PlayArrow,
  Pause,
  Delete,
  Facebook,
  Instagram,
} from '@mui/icons-material';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  GET_META_STATS,
  LIST_CAMPAIGNS,
  PAUSE_CAMPAIGN,
  ACTIVATE_CAMPAIGN,
  DELETE_CAMPAIGN,
} from '@/lib/graphql/meta-ads';

// Dynamic imports for Recharts to avoid SSR issues
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

interface MetaAdsStats {
  activeCampaigns: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  connectionStatus: boolean;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  roas: number;
  createdAt: string;
  endDate?: string;
}

function getStatusColor(status: string): "default" | "success" | "warning" | "error" {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success';
    case 'paused':
      return 'warning';
    case 'completed':
      return 'default';
    case 'failed':
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

export default function MetaAdsDashboard() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const { loading: statsLoading, error: statsError, data: statsData } = useQuery<{ metaAdsStats: MetaAdsStats }>(GET_META_STATS);
  const { loading: campaignsLoading, error: campaignsError, data: campaignsData, refetch: refetchCampaigns } = useQuery<{ listMetaCampaigns: Campaign[] }>(LIST_CAMPAIGNS);

  const [pauseCampaign] = useMutation(PAUSE_CAMPAIGN, {
    onCompleted: () => refetchCampaigns(),
  });

  const [activateCampaign] = useMutation(ACTIVATE_CAMPAIGN, {
    onCompleted: () => refetchCampaigns(),
  });

  const [deleteCampaign] = useMutation(DELETE_CAMPAIGN, {
    onCompleted: () => refetchCampaigns(),
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, campaign: Campaign) => {
    setAnchorEl(event.currentTarget);
    setSelectedCampaign(campaign);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCampaign(null);
  };

  const handlePause = () => {
    if (selectedCampaign) {
      pauseCampaign({ variables: { id: selectedCampaign.id } });
    }
    handleMenuClose();
  };

  const handleResume = () => {
    if (selectedCampaign) {
      activateCampaign({ variables: { id: selectedCampaign.id } });
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedCampaign) {
      deleteCampaign({ variables: { id: selectedCampaign.id } });
    }
    handleMenuClose();
  };

  const spendData = [
    { date: 'Mon', spend: 120 },
    { date: 'Tue', spend: 150 },
    { date: 'Wed', spend: 180 },
    { date: 'Thu', spend: 160 },
    { date: 'Fri', spend: 200 },
    { date: 'Sat', spend: 190 },
    { date: 'Sun', spend: 220 },
  ];

  const impressionsData = [
    { date: 'Mon', impressions: 5000 },
    { date: 'Tue', impressions: 6200 },
    { date: 'Wed', impressions: 7100 },
    { date: 'Thu', impressions: 6800 },
    { date: 'Fri', impressions: 8500 },
    { date: 'Sat', impressions: 8200 },
    { date: 'Sun', impressions: 9300 },
  ];

  const stats = statsData?.metaAdsStats;
  const campaigns = campaignsData?.listMetaCampaigns || [];

  if (statsLoading || campaignsLoading) {
    return (
      <DashboardLayout title="Meta Ads Dashboard">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (statsError || campaignsError) {
    return (
      <DashboardLayout title="Meta Ads Dashboard">
        <Container sx={{ mt: 4 }}>
          <Alert severity="error">
            Error loading Meta Ads data: {statsError?.message || campaignsError?.message}
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  const statItems: StatItem[] = [
    {
      title: 'Active Campaigns',
      value: stats?.activeCampaigns?.toString() || '0',
      icon: CampaignOutlined,
      testId: 'card-stat-active-campaigns',
    },
    {
      title: 'Total Spend',
      value: `$${stats?.totalSpend?.toFixed(2) || '0.00'}`,
      icon: TrendingUpIcon,
      testId: 'card-stat-total-spend',
    },
    {
      title: 'Total Impressions',
      value: stats?.totalImpressions?.toLocaleString() || '0',
      icon: Visibility,
      testId: 'card-stat-impressions',
    },
    {
      title: 'Total Clicks',
      value: stats?.totalClicks?.toLocaleString() || '0',
      icon: MouseOutlined,
      testId: 'card-stat-clicks',
    },
  ];

  return (
    <DashboardLayout title="Meta Ads Dashboard">
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Meta Ads Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your Facebook & Instagram advertising campaigns
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<BarChart />}
              onClick={() => router.push('/meta-ads/analytics')}
              data-testid="button-view-analytics"
            >
              View Analytics
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/meta-ads/create')}
              data-testid="button-create-campaign"
            >
              Create Campaign
            </Button>
          </Box>
        </Box>

        {!stats?.connectionStatus && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" data-testid="button-connect-meta">
                Connect Meta
              </Button>
            }
          >
            Meta account not connected. Connect your account to start running campaigns.
          </Alert>
        )}

        <GrowthStatsGrid stats={statItems} />

        <Grid container spacing={3} sx={{ my: 4 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Spend Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={spendData} data-testid="chart-spend-over-time">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="spend" stroke="#1976d2" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Impressions Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={impressionsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="impressions" stroke="#2e7d32" fill="#4caf50" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Active Campaigns
            </Typography>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Campaign Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Objective</TableCell>
                    <TableCell align="right">Budget</TableCell>
                    <TableCell align="right">Spend</TableCell>
                    <TableCell align="right">Impressions</TableCell>
                    <TableCell align="right">Clicks</TableCell>
                    <TableCell align="right">CTR</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography color="text.secondary" sx={{ py: 4 }}>
                          No campaigns yet. Create your first campaign to get started!
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign) => (
                      <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {campaign.name}
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Facebook sx={{ fontSize: 16, color: '#1877F2' }} />
                              <Instagram sx={{ fontSize: 16, color: '#E4405F' }} />
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={campaign.status.toUpperCase()}
                            color={getStatusColor(campaign.status)}
                            size="small"
                            data-testid={`chip-status-${campaign.id}`}
                          />
                        </TableCell>
                        <TableCell>{campaign.objective}</TableCell>
                        <TableCell align="right">${campaign.budget.toFixed(2)}</TableCell>
                        <TableCell align="right">${campaign.spend.toFixed(2)}</TableCell>
                        <TableCell align="right">{campaign.impressions.toLocaleString()}</TableCell>
                        <TableCell align="right">{campaign.clicks.toLocaleString()}</TableCell>
                        <TableCell align="right">{(campaign.ctr * 100).toFixed(2)}%</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, campaign)}
                            data-testid={`button-menu-${campaign.id}`}
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {selectedCampaign?.status === 'active' ? (
            <MenuItem onClick={handlePause} data-testid="menu-pause">
              <Pause sx={{ mr: 1 }} /> Pause Campaign
            </MenuItem>
          ) : (
            <MenuItem onClick={handleResume} data-testid="menu-resume">
              <PlayArrow sx={{ mr: 1 }} /> Resume Campaign
            </MenuItem>
          )}
          <MenuItem onClick={handleDelete} data-testid="menu-delete" sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} /> Delete Campaign
          </MenuItem>
        </Menu>
      </Container>
    </DashboardLayout>
  );
}
