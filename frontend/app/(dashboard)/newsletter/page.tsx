'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  LinearProgress,
  Snackbar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
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
  Unsubscribe as UnsubscribeIcon,
} from '@mui/icons-material';
import DashboardLayout from '@/components/DashboardLayout';
import GrowthStatsGrid, { StatItem } from '@/components/growth/GrowthStatsGrid';
import ChartPanel from '@/components/growth/ChartPanel';

const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const LineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { ssr: false }
);
const Line = dynamic(
  () => import('recharts').then((mod) => mod.Line),
  { ssr: false }
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
);
const Legend = dynamic(
  () => import('recharts').then((mod) => mod.Legend),
  { ssr: false }
);

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

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newTags, setNewTags] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [subscribersRes] = await Promise.all([
        fetch('/api/subscribers', { credentials: 'include' }),
      ]);

      if (subscribersRes.ok) {
        const data = await subscribersRes.json();
        setSubscribers(data);
        
        const active = data.filter((s: Subscriber) => s.status === 'active').length;
        const unsubscribed = data.filter((s: Subscriber) => s.status === 'unsubscribed').length;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newThisMonth = data.filter((s: Subscriber) => new Date(s.createdAt) >= startOfMonth).length;
        
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    } catch {
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
      const obj: Record<string, string> = {};
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
        const obj: Record<string, string> = {};
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
    } catch {
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
    } catch {
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
    } catch {
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

  const statsData: StatItem[] = [
    {
      title: 'Total Subscribers',
      value: stats?.total || 0,
      icon: PeopleIcon,
      testId: 'card-stat-total-subscribers',
    },
    {
      title: 'Active Subscribers',
      value: stats?.active || 0,
      icon: PersonAddIcon,
      testId: 'card-stat-active-subscribers',
    },
    {
      title: 'Unsubscribed',
      value: stats?.unsubscribed || 0,
      icon: UnsubscribeIcon,
      testId: 'card-stat-unsubscribed',
    },
    {
      title: 'New This Month',
      value: stats?.newThisMonth || 0,
      icon: TrendingUpIcon,
      testId: 'card-stat-new-this-month',
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Newsletter Management">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Newsletter Management">
      <Box sx={{ mb: 4 }}>
        <GrowthStatsGrid stats={statsData} />
      </Box>

      <Box sx={{ mb: 4 }}>
        <ChartPanel title="Subscriber Growth (Last 30 Days)" testId="chart-subscriber-growth" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.growthData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" name="Subscribers" />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                data-testid="input-search-subscribers"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status Filter"
                  data-testid="select-status-filter"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="unsubscribed">Unsubscribed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setImportDialogOpen(true)}
                data-testid="button-import-csv"
              >
                Import CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportCsv}
                data-testid="button-export-csv"
              >
                Export CSV
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
                data-testid="button-add-subscriber"
              >
                Add Subscriber
              </Button>
            </Grid>
          </Grid>

          {selectedRows.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Alert 
                severity="info"
                action={
                  <Button color="inherit" size="small" onClick={handleBulkDelete}>
                    Delete Selected ({selectedRows.length})
                  </Button>
                }
              >
                {selectedRows.length} subscriber(s) selected
              </Alert>
            </Box>
          )}

          <Box sx={{ height: 500, width: '100%' }}>
            <DataGrid
              rows={filteredSubscribers}
              columns={columns}
              checkboxSelection
              disableRowSelectionOnClick
              onRowSelectionModelChange={(newSelection) => setSelectedRows(newSelection)}
              rowSelectionModel={selectedRows}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              data-testid="datagrid-subscribers"
            />
          </Box>
        </CardContent>
      </Card>

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
              data-testid="input-new-email"
            />
            <TextField
              label="Name"
              fullWidth
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              data-testid="input-new-name"
            />
            <TextField
              label="Tags (comma-separated)"
              fullWidth
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              helperText="e.g., newsletter, promotions"
              data-testid="input-new-tags"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddSubscriber} variant="contained" data-testid="button-submit-add">
            Add Subscriber
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Subscribers from CSV</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              CSV file should have headers: email, name (optional)
            </Alert>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              style={{ marginBottom: 16 }}
              data-testid="input-csv-file"
            />
            {csvPreview.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Preview (first 5 rows):
                </Typography>
                <Box sx={{ overflow: 'auto', maxHeight: 200 }}>
                  {csvPreview.map((row, index) => (
                    <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {JSON.stringify(row)}
                    </Typography>
                  ))}
                </Box>
              </Box>
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
            data-testid="button-submit-import"
          >
            {importLoading ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
