'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  AppBar,
  Toolbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  LinearProgress,
  Switch,
  FormControlLabel,
  Snackbar,
  Tabs,
  Tab,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
  GridToolbar,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  PersonOff as PersonOffIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useRouter } from 'next/navigation';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string;
  source?: string;
  tags?: string[];
}

interface SubscriberStats {
  total: number;
  active: number;
  unsubscribed: number;
  newThisMonth: number;
  growthData: { date: string; count: number }[];
}

export default function NewsletterPage() {
  const router = useRouter();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<SubscriberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newTags, setNewTags] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // Settings states
  const [checkoutSubscription, setCheckoutSubscription] = useState(true);
  const [subscriptionMessage, setSubscriptionMessage] = useState('Subscribe to our newsletter for updates and exclusive offers');
  const [privacyPolicyLink, setPrivacyPolicyLink] = useState('');

  // Fetch subscribers and stats
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subscribersRes, analyticsRes] = await Promise.all([
        fetch('/api/subscribers', { credentials: 'include' }),
        fetch('/api/newsletter-analytics', { credentials: 'include' }),
      ]);

      if (subscribersRes.ok) {
        const data = await subscribersRes.json();
        setSubscribers(data);
        
        // Calculate stats
        const active = data.filter((s: Subscriber) => s.status === 'active').length;
        const unsubscribed = data.filter((s: Subscriber) => s.status === 'unsubscribed').length;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newThisMonth = data.filter((s: Subscriber) => new Date(s.createdAt) >= startOfMonth).length;
        
        // Generate growth data (last 30 days)
        const growthData: { date: string; count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const count = data.filter((s: Subscriber) => 
            new Date(s.createdAt) <= date
          ).length;
          growthData.push({ date: dateStr, count });
        }

        setStats({
          total: data.length,
          active,
          unsubscribed,
          newThisMonth,
          growthData,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Failed to load subscribers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAddSubscriber = async () => {
    if (!newEmail) {
      showSnackbar('Email is required', 'error');
      return;
    }

    try {
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: newEmail,
          name: newName || undefined,
          tags: newTags ? newTags.split(',').map(t => t.trim()) : undefined,
        }),
      });

      if (response.ok) {
        showSnackbar('Subscriber added successfully', 'success');
        setAddDialogOpen(false);
        setNewEmail('');
        setNewName('');
        setNewTags('');
        fetchData();
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Failed to add subscriber', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to add subscriber', 'error');
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const preview = lines.slice(1, 6).map(line => {
      const values = line.split(',');
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index]?.trim() || '';
      });
      return obj;
    });
    
    setCsvPreview(preview);
  };

  const handleImportCsv = async () => {
    if (!csvFile) {
      showSnackbar('Please select a CSV file', 'error');
      return;
    }

    try {
      setImportLoading(true);
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const subscribers = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index]?.trim() || '';
        });
        return {
          email: obj.email || obj.Email,
          name: obj.name || obj.Name || undefined,
        };
      }).filter(s => s.email);

      const response = await fetch('/api/subscribers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subscribers }),
      });

      if (response.ok) {
        const result = await response.json();
        showSnackbar(`Imported ${result.count || subscribers.length} subscribers successfully`, 'success');
        setImportDialogOpen(false);
        setCsvFile(null);
        setCsvPreview([]);
        fetchData();
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Failed to import subscribers', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to import CSV', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportCsv = () => {
    const csv = [
      'Email,Name,Status,Source,Subscribed Date',
      ...filteredSubscribers.map(s => 
        `${s.email},${s.name || ''},${s.status},${s.source || 'manual'},${s.createdAt}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSnackbar('Subscribers exported successfully', 'success');
  };

  const handleUnsubscribe = async (id: string) => {
    try {
      const response = await fetch(`/api/subscribers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showSnackbar('Subscriber removed successfully', 'success');
        fetchData();
      } else {
        showSnackbar('Failed to remove subscriber', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to remove subscriber', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) {
      showSnackbar('No subscribers selected', 'error');
      return;
    }

    try {
      await Promise.all(
        selectedRows.map(id =>
          fetch(`/api/subscribers/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        )
      );
      showSnackbar(`Deleted ${selectedRows.length} subscribers`, 'success');
      setSelectedRows([]);
      fetchData();
    } catch (error) {
      showSnackbar('Failed to delete subscribers', 'error');
    }
  };

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(sub => {
      const matchesSearch = searchQuery === '' || 
        sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.name && sub.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [subscribers, searchQuery, statusFilter]);

  const columns: GridColDef[] = [
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 0.8,
      minWidth: 150,
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.5,
      minWidth: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'active' ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'source',
      headerName: 'Source',
      flex: 0.5,
      minWidth: 120,
    },
    {
      field: 'createdAt',
      headerName: 'Subscribed Date',
      flex: 0.7,
      minWidth: 150,
      valueFormatter: (value) => {
        return new Date(value).toLocaleDateString();
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.5,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleUnsubscribe(params.row.id)}
            data-testid={`button-unsubscribe-${params.row.id}`}
            color="error"
          >
            <PersonOffIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleUnsubscribe(params.row.id)}
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push('/dashboard')}
            sx={{ mr: 2 }}
            data-testid="button-back-dashboard"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Newsletter Management
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid xs={12} sm={6} md={3}>
            <Card data-testid="card-stat-total-subscribers">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Subscribers
                    </Typography>
                    <Typography variant="h4">{stats?.total || 0}</Typography>
                  </Box>
                  <PeopleIcon color="primary" sx={{ fontSize: 48, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={12} sm={6} md={3}>
            <Card data-testid="card-stat-active-subscribers">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Active Subscribers
                    </Typography>
                    <Typography variant="h4" color="success.main">{stats?.active || 0}</Typography>
                  </Box>
                  <PersonAddIcon color="success" sx={{ fontSize: 48, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Unsubscribed
                    </Typography>
                    <Typography variant="h4">{stats?.unsubscribed || 0}</Typography>
                  </Box>
                  <PersonOffIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      New This Month
                    </Typography>
                    <Typography variant="h4">{stats?.newThisMonth || 0}</Typography>
                  </Box>
                  <TrendingUpIcon color="success" sx={{ fontSize: 48, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Growth Chart */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Subscriber Growth (Last 30 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.growthData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#1976d2" strokeWidth={2} name="Total Subscribers" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscribers DataGrid */}
        <Card>
          <CardContent>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box display="flex" gap={2} flexWrap="wrap">
                <TextField
                  size="small"
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  sx={{ minWidth: 300 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="unsubscribed">Unsubscribed</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box display="flex" gap={2} flexWrap="wrap">
                {selectedRows.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleBulkDelete}
                  >
                    Delete Selected ({selectedRows.length})
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportCsv}
                >
                  Export CSV
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => setImportDialogOpen(true)}
                  data-testid="button-import-csv"
                >
                  Import CSV
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialogOpen(true)}
                  data-testid="button-add-subscriber"
                >
                  Add Subscriber
                </Button>
              </Box>
            </Box>

            <DataGrid
              rows={filteredSubscribers}
              columns={columns}
              checkboxSelection
              disableRowSelectionOnClick
              onRowSelectionModelChange={setSelectedRows}
              rowSelectionModel={selectedRows}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              sx={{ minHeight: 500 }}
              data-testid="datagrid-subscribers"
            />
          </CardContent>
        </Card>
      </Container>

      {/* Add Subscriber Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Subscriber</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              data-testid="input-subscriber-email"
            />
            <TextField
              label="Name"
              fullWidth
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <TextField
              label="Tags (comma-separated)"
              fullWidth
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              helperText="Example: vip, newsletter, promo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddSubscriber} variant="contained">
            Add Subscriber
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Subscribers from CSV</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              CSV file should have columns: email (required), name (optional)
            </Alert>
            
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ mb: 2 }}
            >
              Choose CSV File
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={handleCsvUpload}
              />
            </Button>

            {csvFile && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                Selected: {csvFile.name}
              </Typography>
            )}

            {csvPreview.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Preview (first 5 rows):
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                  {csvPreview.map((row, index) => (
                    <Typography key={index} variant="body2">
                      {row.email || row.Email} - {row.name || row.Name || 'No name'}
                    </Typography>
                  ))}
                </Box>
              </>
            )}

            {importLoading && <LinearProgress sx={{ mt: 2 }} />}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} disabled={importLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleImportCsv} 
            variant="contained" 
            disabled={!csvFile || importLoading}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
