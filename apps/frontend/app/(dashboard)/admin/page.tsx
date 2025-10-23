'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import {
  People,
  ShoppingCart,
  AttachMoney,
  TrendingUp,
  PersonAdd,
  Visibility,
  Block,
  Delete,
  CheckCircle,
  Error,
  Warning,
  Info,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface PlatformStats {
  totalSellers: number;
  totalOrders: number;
  platformRevenue: number;
  activeSubscriptions: number;
  newSignups: number;
}

interface Seller {
  id: string;
  businessName: string;
  username: string;
  joinDate: string;
  status: 'active' | 'suspended' | 'trial';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  revenue: number;
}

interface SystemHealth {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  stripe: 'healthy' | 'degraded' | 'down';
  email: 'healthy' | 'degraded' | 'down';
}

interface SystemLog {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, _setIsAdmin] = useState(true); // This should come from auth context
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data
  const stats: PlatformStats = {
    totalSellers: 1247,
    totalOrders: 8932,
    platformRevenue: 152340,
    activeSubscriptions: 983,
    newSignups: 47,
  };

  const sellers: Seller[] = [
    {
      id: '1',
      businessName: 'Fashion Store',
      username: 'fashionstore',
      joinDate: '2025-01-15',
      status: 'active',
      plan: 'pro',
      revenue: 45230,
    },
    {
      id: '2',
      businessName: 'Tech Gadgets',
      username: 'techgadgets',
      joinDate: '2025-02-10',
      status: 'active',
      plan: 'starter',
      revenue: 23120,
    },
    {
      id: '3',
      businessName: 'Home Decor',
      username: 'homedecor',
      joinDate: '2025-03-05',
      status: 'trial',
      plan: 'free',
      revenue: 0,
    },
    {
      id: '4',
      businessName: 'Sports Equipment',
      username: 'sportsequip',
      joinDate: '2024-12-20',
      status: 'active',
      plan: 'enterprise',
      revenue: 89560,
    },
  ];

  const systemHealth: SystemHealth = {
    api: 'healthy',
    database: 'healthy',
    stripe: 'healthy',
    email: 'degraded',
  };

  const systemLogs: SystemLog[] = [
    {
      id: '1',
      type: 'error',
      message: 'Failed to process payment for order #12345',
      timestamp: '2025-10-20 14:30:22',
    },
    {
      id: '2',
      type: 'warning',
      message: 'High API response time detected (avg: 450ms)',
      timestamp: '2025-10-20 14:25:15',
    },
    {
      id: '3',
      type: 'info',
      message: 'New seller registered: @newshop',
      timestamp: '2025-10-20 14:20:05',
    },
  ];

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return (
      <DashboardLayout title="Admin">
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <Alert severity="error">
            You do not have permission to access this page. Only platform admins can access the admin dashboard.
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  const columns: GridColDef[] = [
    {
      field: 'businessName',
      headerName: 'Business Name',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'username',
      headerName: 'Username',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'joinDate',
      headerName: 'Join Date',
      width: 120,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'active'
              ? 'success'
              : params.value === 'trial'
              ? 'info'
              : 'default'
          }
          size="small"
        />
      ),
    },
    {
      field: 'plan',
      headerName: 'Plan',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      field: 'revenue',
      headerName: 'Revenue',
      width: 120,
      renderCell: (params) => `$${params.value.toLocaleString()}`,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (_params) => [
        <GridActionsCellItem
          key="view"
          icon={<Visibility />}
          label="View Details"
          onClick={() => {}}
        />,
        <GridActionsCellItem
          key="suspend"
          icon={<Block />}
          label="Suspend"
          onClick={() => {}}
          showInMenu
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Delete />}
          label="Delete"
          onClick={() => {}}
          showInMenu
        />,
      ],
    },
  ];

  const getHealthIcon = (status: string) => {
    if (status === 'healthy') return <CheckCircle color="success" />;
    if (status === 'degraded') return <Warning color="warning" />;
    return <Error color="error" />;
  };

  const getLogIcon = (type: string) => {
    if (type === 'error') return <Error color="error" />;
    if (type === 'warning') return <Warning color="warning" />;
    return <Info color="info" />;
  };

  const filteredSellers = sellers.filter((seller) => {
    const matchesPlan = filterPlan === 'all' || seller.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || seller.status === filterStatus;
    const matchesSearch = seller.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlan && matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout title="Platform Admin">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Platform Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and manage the Upfirst platform
          </Typography>
        </Box>

        {/* Platform Overview Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card data-testid="card-stat-total-sellers">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <People sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography color="text.secondary" variant="body2">
                    Total Sellers
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalSellers.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="success.main">
                  +{stats.newSignups} this month
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ShoppingCart sx={{ mr: 1, color: 'info.main' }} />
                  <Typography color="text.secondary" variant="body2">
                    Total Orders
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalOrders.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  All sellers
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card data-testid="card-stat-platform-revenue">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AttachMoney sx={{ mr: 1, color: 'success.main' }} />
                  <Typography color="text.secondary" variant="body2">
                    Platform Revenue
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  ${stats.platformRevenue.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="success.main">
                  +12% vs last month
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography color="text.secondary" variant="body2">
                    Active Subscriptions
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.activeSubscriptions.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Paying customers
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonAdd sx={{ mr: 1, color: 'secondary.main' }} />
                  <Typography color="text.secondary" variant="body2">
                    New Signups
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.newSignups}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  This month
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Sellers Management */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper sx={{ mb: 3 }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom>
                  Sellers Management
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="Search by name or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ flexGrow: 1, minWidth: 200 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Plan</InputLabel>
                    <Select
                      value={filterPlan}
                      label="Plan"
                      onChange={(e) => setFilterPlan(e.target.value)}
                    >
                      <MenuItem value="all">All Plans</MenuItem>
                      <MenuItem value="free">Free</MenuItem>
                      <MenuItem value="starter">Starter</MenuItem>
                      <MenuItem value="pro">Pro</MenuItem>
                      <MenuItem value="enterprise">Enterprise</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filterStatus}
                      label="Status"
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="trial">Trial</MenuItem>
                      <MenuItem value="suspended">Suspended</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              <Box sx={{ height: 400, width: '100%' }}>
                <DataGrid
                  rows={filteredSellers}
                  columns={columns}
                  pageSizeOptions={[5, 10, 25]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                  disableRowSelectionOnClick
                  data-testid="datagrid-sellers"
                />
              </Box>
            </Paper>

            {/* Revenue Analytics */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Revenue Analytics
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" variant="body2">
                        MRR (Monthly Recurring Revenue)
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        $45,230
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        +8.2% from last month
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" variant="body2">
                        ARR (Annual Recurring Revenue)
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        $542,760
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        +15.3% from last year
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" variant="body2">
                        Churn Rate
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        2.3%
                      </Typography>
                      <Typography variant="caption" color="error.main">
                        +0.5% from last month
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" variant="body2">
                        Average Revenue Per User
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        $46
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        +3.1% from last month
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Platform Health & System Logs */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper sx={{ p: 3, mb: 3 }} data-testid="chart-platform-health">
              <Typography variant="h6" gutterBottom>
                Platform Health
              </Typography>
              <List>
                <ListItem>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getHealthIcon(systemHealth.api)}
                      <ListItemText primary="API Response" sx={{ ml: 1 }} />
                    </Box>
                    <Chip
                      label={systemHealth.api}
                      color={systemHealth.api === 'healthy' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </ListItem>
                <Divider />
                <ListItem>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getHealthIcon(systemHealth.database)}
                      <ListItemText primary="Database" sx={{ ml: 1 }} />
                    </Box>
                    <Chip
                      label={systemHealth.database}
                      color={systemHealth.database === 'healthy' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </ListItem>
                <Divider />
                <ListItem>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getHealthIcon(systemHealth.stripe)}
                      <ListItemText primary="Stripe Connection" sx={{ ml: 1 }} />
                    </Box>
                    <Chip
                      label={systemHealth.stripe}
                      color={systemHealth.stripe === 'healthy' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </ListItem>
                <Divider />
                <ListItem>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getHealthIcon(systemHealth.email)}
                      <ListItemText primary="Email Delivery" sx={{ ml: 1 }} />
                    </Box>
                    <Chip
                      label={systemHealth.email}
                      color={systemHealth.email === 'healthy' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </ListItem>
              </List>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                System Logs
              </Typography>
              <List dense>
                {systemLogs.map((log, index) => (
                  <Box key={log.id}>
                    <ListItem sx={{ px: 0 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          {getLogIcon(log.type)}
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            {log.message}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {log.timestamp}
                        </Typography>
                      </Box>
                    </ListItem>
                    {index < systemLogs.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
              <Button size="small" fullWidth sx={{ mt: 1 }}>
                View All Logs
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </DashboardLayout>
  );
}
