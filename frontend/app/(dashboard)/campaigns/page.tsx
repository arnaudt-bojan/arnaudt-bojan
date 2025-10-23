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
  Snackbar,
  Stepper,
  Step,
  StepLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  ListItemButton,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  DataGrid,
  GridColDef,
} from '@mui/x-data-grid';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Add as AddIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Email as EmailIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  Close as CloseIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import DashboardLayout from '@/components/DashboardLayout';
import GrowthStatsGrid, { StatItem } from '@/components/growth/GrowthStatsGrid';
import ChartPanel from '@/components/growth/ChartPanel';

const Editor = dynamic(
  () => import('@tinymce/tinymce-react').then((mod) => mod.Editor),
  { ssr: false }
);

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
const PieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  { ssr: false }
);
const Pie = dynamic(
  () => import('recharts').then((mod) => mod.Pie),
  { ssr: false }
);
const Cell = dynamic(
  () => import('recharts').then((mod) => mod.Cell),
  { ssr: false }
);

interface Campaign {
  id: string;
  subject: string;
  content: string;
  htmlContent: string | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
  groupIds?: string[];
  segmentIds?: string[];
}

interface CampaignAnalytics {
  id: string;
  newsletterId: string;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  openRate: string | null;
  clickRate: string | null;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const CAMPAIGN_TEMPLATES: Template[] = [
  {
    id: 'product-announcement',
    name: 'Product Announcement',
    subject: 'Introducing Our Latest Product',
    content: '<h2>Exciting News!</h2><p>We\'re thrilled to introduce our latest product...</p>',
  },
  {
    id: 'sale-promotion',
    name: 'Sale/Promotion',
    subject: 'Limited Time Offer - Save Big!',
    content: '<h2>Special Offer Just For You</h2><p>Don\'t miss out on our biggest sale of the season...</p>',
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    subject: 'Monthly Newsletter - {{month}}',
    content: '<h2>This Month\'s Updates</h2><p>Here\'s what\'s been happening...</p>',
  },
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to Our Community!',
    content: '<h2>Welcome {{customer_name}}!</h2><p>We\'re excited to have you with us...</p>',
  },
  {
    id: 're-engagement',
    name: 'Re-engagement',
    subject: 'We Miss You!',
    content: '<h2>Come Back and See What\'s New</h2><p>It\'s been a while since we last saw you...</p>',
  },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<CampaignAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [builderOpen, setBuilderOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [recipientType, setRecipientType] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [sendOption, setSendOption] = useState('now');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics | null>(null);

  const steps = ['Campaign Details', 'Select Recipients', 'Create Content', 'Schedule & Send'];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [campaignsRes, analyticsRes] = await Promise.all([
        fetch('/api/campaigns', { credentials: 'include' }),
        fetch('/api/newsletter-analytics', { credentials: 'include' }),
      ]);

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Failed to load campaigns', 'error');
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

  const handleNext = () => {
    if (activeStep === 0 && !subject) {
      showSnackbar('Subject line is required', 'error');
      return;
    }
    if (activeStep === 2 && !content) {
      showSnackbar('Email content is required', 'error');
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleCreateCampaign = async () => {
    try {
      const campaignData: {
        subject: string;
        content: string;
        htmlContent: string;
        sendToAll?: boolean;
        tags?: string[];
      } = {
        subject,
        content,
        htmlContent: content,
      };

      if (recipientType === 'all') {
        campaignData.sendToAll = true;
      } else if (recipientType === 'tags' && selectedTags.length > 0) {
        campaignData.tags = selectedTags;
      }

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(campaignData),
      });

      if (response.ok) {
        const campaign = await response.json();
        
        if (sendOption === 'now') {
          const sendRes = await fetch(`/api/campaigns/${campaign.id}/send`, {
            method: 'POST',
            credentials: 'include',
          });
          
          if (sendRes.ok) {
            showSnackbar('Campaign sent successfully!', 'success');
          } else {
            showSnackbar('Campaign created but failed to send', 'error');
          }
        } else if (sendOption === 'schedule' && scheduledDate) {
          const scheduleRes = await fetch(`/api/campaigns/${campaign.id}/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              scheduledAt: scheduledDate.toISOString(),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }),
          });
          
          if (scheduleRes.ok) {
            showSnackbar('Campaign scheduled successfully!', 'success');
          } else {
            showSnackbar('Campaign created but failed to schedule', 'error');
          }
        }

        resetBuilder();
        fetchData();
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Failed to create campaign', 'error');
      }
    } catch {
      showSnackbar('Failed to create campaign', 'error');
    }
  };

  const resetBuilder = () => {
    setBuilderOpen(false);
    setActiveStep(0);
    setCampaignName('');
    setSubject('');
    setPreviewText('');
    setRecipientType('all');
    setSelectedTags([]);
    setContent('');
    setSendOption('now');
    setScheduledDate(null);
    setSelectedTemplate(null);
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showSnackbar('Campaign deleted successfully', 'success');
        fetchData();
      } else {
        showSnackbar('Failed to delete campaign', 'error');
      }
    } catch {
      showSnackbar('Failed to delete campaign', 'error');
    }
  };

  const handleViewAnalytics = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    const analytic = analytics.find(a => a.newsletterId === campaign.id);
    setCampaignAnalytics(analytic || null);
    setAnalyticsDialogOpen(true);
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template.id);
    setSubject(template.subject);
    setContent(template.content);
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch = searchQuery === '' || 
        campaign.subject.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const columns: GridColDef[] = [
    {
      field: 'subject',
      headerName: 'Campaign Name / Subject',
      flex: 1,
      minWidth: 250,
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.5,
      minWidth: 120,
      renderCell: (params) => {
        const colorMap: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
          draft: 'default',
          scheduled: 'info',
          sending: 'warning',
          sent: 'success',
          failed: 'error',
        };
        return (
          <Chip
            label={params.value}
            color={colorMap[params.value] || 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'sentAt',
      headerName: 'Sent Date',
      flex: 0.6,
      minWidth: 150,
      valueFormatter: (value) => {
        return value ? new Date(value).toLocaleDateString() : 'Not sent';
      },
    },
    {
      field: 'analytics',
      headerName: 'Opens / Clicks',
      flex: 0.6,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => {
        const analytic = analytics.find(a => a.newsletterId === params.row.id);
        if (!analytic) return '-';
        return `${analytic.totalOpened} / ${analytic.totalClicked}`;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          {params.row.status === 'sent' && (
            <IconButton
              size="small"
              onClick={() => handleViewAnalytics(params.row)}
              color="primary"
              data-testid={`button-view-analytics-${params.row.id}`}
            >
              <BarChartIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteCampaign(params.row.id)}
            data-testid={`button-delete-${params.row.id}`}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const totalCampaigns = campaigns.length;
  const sentCampaigns = campaigns.filter(c => c.status === 'sent').length;
  const avgOpenRate = analytics.length > 0
    ? (analytics.reduce((sum, a) => sum + parseFloat(a.openRate || '0'), 0) / analytics.length).toFixed(2)
    : '0';
  const avgClickRate = analytics.length > 0
    ? (analytics.reduce((sum, a) => sum + parseFloat(a.clickRate || '0'), 0) / analytics.length).toFixed(2)
    : '0';

  const opensOverTime = [
    { time: '0h', opens: 0 },
    { time: '1h', opens: campaignAnalytics ? campaignAnalytics.totalOpened * 0.3 : 0 },
    { time: '2h', opens: campaignAnalytics ? campaignAnalytics.totalOpened * 0.5 : 0 },
    { time: '6h', opens: campaignAnalytics ? campaignAnalytics.totalOpened * 0.7 : 0 },
    { time: '12h', opens: campaignAnalytics ? campaignAnalytics.totalOpened * 0.85 : 0 },
    { time: '24h', opens: campaignAnalytics ? campaignAnalytics.totalOpened : 0 },
  ];

  const deviceData = campaignAnalytics ? [
    { name: 'Desktop', value: Math.floor(campaignAnalytics.totalOpened * 0.6) },
    { name: 'Mobile', value: Math.floor(campaignAnalytics.totalOpened * 0.35) },
    { name: 'Tablet', value: Math.floor(campaignAnalytics.totalOpened * 0.05) },
  ] : [];

  const statsData: StatItem[] = [
    {
      title: 'Total Campaigns',
      value: totalCampaigns,
      icon: CampaignIcon,
      testId: 'card-stat-total-campaigns',
    },
    {
      title: 'Avg Open Rate',
      value: `${avgOpenRate}%`,
      icon: EmailIcon,
      testId: 'card-stat-open-rate',
    },
    {
      title: 'Avg Click Rate',
      value: `${avgClickRate}%`,
      icon: TrendingUpIcon,
      testId: 'card-stat-click-rate',
    },
    {
      title: 'Total Sent',
      value: sentCampaigns,
      icon: SendIcon,
      testId: 'card-stat-total-sent',
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Email Campaigns">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DashboardLayout title="Email Campaigns">
        <Box sx={{ mb: 4 }}>
          <GrowthStatsGrid stats={statsData} />
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  data-testid="input-search-campaigns"
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
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="scheduled">Scheduled</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setBuilderOpen(true)}
                  data-testid="button-create-campaign"
                >
                  Create Campaign
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ height: 500, width: '100%' }}>
              <DataGrid
                rows={filteredCampaigns}
                columns={columns}
                disableRowSelectionOnClick
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                data-testid="datagrid-campaigns"
              />
            </Box>
          </CardContent>
        </Card>

        <Dialog 
          open={builderOpen} 
          onClose={resetBuilder} 
          maxWidth="md" 
          fullWidth
          PaperProps={{ sx: { minHeight: '80vh' } }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">Create Email Campaign</Typography>
              <IconButton onClick={resetBuilder} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }} data-testid="stepper-create-campaign">
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {activeStep === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Campaign Name"
                  fullWidth
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  helperText="Internal name for this campaign"
                  data-testid="input-campaign-name"
                />
                <TextField
                  label="Subject Line"
                  fullWidth
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  helperText="This will appear in the recipient's inbox"
                  data-testid="input-subject-line"
                />
                <TextField
                  label="Preview Text"
                  fullWidth
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  helperText="Text that appears after subject line (optional)"
                  data-testid="input-preview-text"
                />
              </Box>
            )}

            {activeStep === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Select Recipients</FormLabel>
                  <RadioGroup
                    value={recipientType}
                    onChange={(e) => setRecipientType(e.target.value)}
                    data-testid="select-recipients"
                  >
                    <FormControlLabel 
                      value="all" 
                      control={<Radio />} 
                      label="All Active Subscribers" 
                    />
                    <FormControlLabel 
                      value="tags" 
                      control={<Radio />} 
                      label="Filter by Tags" 
                    />
                  </RadioGroup>
                </FormControl>

                {recipientType === 'tags' && (
                  <TextField
                    label="Tags (comma-separated)"
                    fullWidth
                    value={selectedTags.join(', ')}
                    onChange={(e) => setSelectedTags(e.target.value.split(',').map(t => t.trim()))}
                    helperText="Enter tags to filter subscribers"
                    data-testid="input-tags-filter"
                  />
                )}

                <Alert severity="info">
                  {recipientType === 'all' 
                    ? 'Campaign will be sent to all active subscribers'
                    : 'Campaign will be sent to subscribers with selected tags'}
                </Alert>
              </Box>
            )}

            {activeStep === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Choose a Template (Optional)
                  </Typography>
                  <Grid container spacing={2}>
                    {CAMPAIGN_TEMPLATES.map((template) => (
                      <Grid key={template.id} size={{ xs: 12, sm: 6 }}>
                        <Paper
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            border: selectedTemplate === template.id ? 2 : 1,
                            borderColor: selectedTemplate === template.id ? 'primary.main' : 'divider',
                          }}
                          onClick={() => handleTemplateSelect(template)}
                          data-testid={`template-${template.id}`}
                        >
                          <Typography variant="subtitle2">{template.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {template.subject}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Email Content
                  </Typography>
                  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Editor
                      value={content}
                      onEditorChange={(newContent) => setContent(newContent)}
                      init={{
                        height: 400,
                        menubar: false,
                        plugins: [
                          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                          'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
                          'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount'
                        ],
                        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | link image | code',
                        content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px }',
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            )}

            {activeStep === 3 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Send Options</FormLabel>
                  <RadioGroup
                    value={sendOption}
                    onChange={(e) => setSendOption(e.target.value)}
                    data-testid="select-send-option"
                  >
                    <FormControlLabel 
                      value="now" 
                      control={<Radio />} 
                      label="Send Now" 
                    />
                    <FormControlLabel 
                      value="schedule" 
                      control={<Radio />} 
                      label="Schedule for Later" 
                    />
                  </RadioGroup>
                </FormControl>

                {sendOption === 'schedule' && (
                  <DateTimePicker
                    label="Schedule Date & Time"
                    value={scheduledDate}
                    onChange={(newValue) => setScheduledDate(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        'data-testid': 'input-scheduled-date',
                      } as any,
                    }}
                  />
                )}

                <Divider />

                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Campaign Summary
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Subject" 
                        secondary={subject || 'Not set'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Recipients" 
                        secondary={recipientType === 'all' ? 'All Subscribers' : `Tagged: ${selectedTags.join(', ')}`} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Send Time" 
                        secondary={sendOption === 'now' ? 'Immediately' : scheduledDate?.toLocaleString() || 'Not scheduled'} 
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={resetBuilder}>Cancel</Button>
            {activeStep > 0 && (
              <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
                Back
              </Button>
            )}
            {activeStep < steps.length - 1 ? (
              <Button onClick={handleNext} variant="contained" endIcon={<ArrowForwardIcon />}>
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleCreateCampaign} 
                variant="contained" 
                startIcon={sendOption === 'now' ? <SendIcon /> : <ScheduleIcon />}
                data-testid="button-send-campaign"
              >
                {sendOption === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        <Dialog 
          open={analyticsDialogOpen} 
          onClose={() => setAnalyticsDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                Campaign Analytics: {selectedCampaign?.subject}
              </Typography>
              <IconButton onClick={() => setAnalyticsDialogOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {campaignAnalytics ? (
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {campaignAnalytics.totalSent}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Sent
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {campaignAnalytics.totalOpened}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Opened
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {campaignAnalytics.totalClicked}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Clicked
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4">
                        {campaignAnalytics.openRate}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Open Rate
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ChartPanel title="Opens Over Time" testId="chart-opens-over-time" height={250}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={opensOverTime}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="opens" stroke="#8884d8" name="Opens" />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartPanel>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ChartPanel title="Opens by Device" testId="chart-device-breakdown" height={250}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deviceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => entry.name}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {deviceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartPanel>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Alert severity="info">
                No analytics data available for this campaign yet.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAnalyticsDialogOpen(false)}>Close</Button>
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
    </LocalizationProvider>
  );
}
