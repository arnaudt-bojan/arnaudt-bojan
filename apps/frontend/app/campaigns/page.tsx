'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Tab,
  Tabs,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Add as AddIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FileCopy as FileCopyIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Email as EmailIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useRouter } from 'next/navigation';
import { Editor } from '@tinymce/tinymce-react';

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
  const router = useRouter();
  const editorRef = useRef<any>(null);
  
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

  // Campaign Builder Dialog
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

  // Analytics Dialog
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics | null>(null);

  const steps = ['Campaign Details', 'Select Recipients', 'Create Content', 'Schedule & Send'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
  };

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
      const campaignData: any = {
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
        
        // Send or schedule
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
    } catch (error) {
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
    } catch (error) {
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
    if (editorRef.current) {
      editorRef.current.setContent(template.content);
    }
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
        const colorMap: any = {
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
            >
              <BarChartIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteCampaign(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  // Calculate stats
  const totalCampaigns = campaigns.length;
  const sentCampaigns = campaigns.filter(c => c.status === 'sent').length;
  const avgOpenRate = analytics.length > 0
    ? (analytics.reduce((sum, a) => sum + parseFloat(a.openRate || '0'), 0) / analytics.length).toFixed(2)
    : '0';
  const avgClickRate = analytics.length > 0
    ? (analytics.reduce((sum, a) => sum + parseFloat(a.clickRate || '0'), 0) / analytics.length).toFixed(2)
    : '0';

  // Generate mock data for charts
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => router.push('/dashboard')}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Email Campaigns
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid xs={12} sm={6} md={3}>
              <Card data-testid="card-stat-total-campaigns">
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Total Campaigns
                      </Typography>
                      <Typography variant="h4">{totalCampaigns}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {sentCampaigns} sent
                      </Typography>
                    </Box>
                    <EmailIcon color="primary" sx={{ fontSize: 48, opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid xs={12} sm={6} md={3}>
              <Card data-testid="card-stat-open-rate">
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Avg Open Rate
                      </Typography>
                      <Typography variant="h4">{avgOpenRate}%</Typography>
                    </Box>
                    <TrendingUpIcon color="success" sx={{ fontSize: 48, opacity: 0.3 }} />
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
                        Avg Click Rate
                      </Typography>
                      <Typography variant="h4">{avgClickRate}%</Typography>
                    </Box>
                    <BarChartIcon color="info" sx={{ fontSize: 48, opacity: 0.3 }} />
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
                        Total Sent
                      </Typography>
                      <Typography variant="h4">
                        {analytics.reduce((sum, a) => sum + a.totalSent, 0)}
                      </Typography>
                    </Box>
                    <SendIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Campaigns DataGrid */}
          <Card>
            <CardContent>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <TextField
                    size="small"
                    placeholder="Search campaigns..."
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
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                      <MenuItem value="sent">Sent</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setBuilderOpen(true)}
                  data-testid="button-create-campaign"
                >
                  Create Campaign
                </Button>
              </Box>

              <DataGrid
                rows={filteredCampaigns}
                columns={columns}
                disableRowSelectionOnClick
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 25 } },
                }}
                sx={{ minHeight: 500 }}
                data-testid="datagrid-campaigns"
              />
            </CardContent>
          </Card>
        </Container>

        {/* Campaign Builder Dialog */}
        <Dialog 
          open={builderOpen} 
          onClose={resetBuilder} 
          maxWidth="lg" 
          fullWidth
          fullScreen
        >
          <AppBar position="static" elevation={0}>
            <Toolbar>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Create Email Campaign
              </Typography>
              <IconButton edge="end" color="inherit" onClick={resetBuilder}>
                <CloseIcon />
              </IconButton>
            </Toolbar>
          </AppBar>

          <DialogContent sx={{ p: 3 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }} data-testid="stepper-create-campaign">
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Step 1: Campaign Details */}
            {activeStep === 0 && (
              <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Campaign Details
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
                  <TextField
                    label="Campaign Name (Internal)"
                    fullWidth
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    helperText="This is for your reference only"
                    data-testid="input-campaign-name"
                  />
                  <TextField
                    label="Subject Line"
                    fullWidth
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    helperText="This will be the email subject"
                    data-testid="input-subject-line"
                  />
                  <TextField
                    label="Preview Text"
                    fullWidth
                    multiline
                    rows={2}
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    helperText="Short preview text shown in inbox"
                  />
                </Box>
              </Box>
            )}

            {/* Step 2: Recipients */}
            {activeStep === 1 && (
              <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Select Recipients
                </Typography>
                <FormControl component="fieldset" sx={{ mt: 3 }}>
                  <FormLabel component="legend">Who should receive this campaign?</FormLabel>
                  <RadioGroup
                    value={recipientType}
                    onChange={(e) => setRecipientType(e.target.value)}
                    data-testid="select-recipients"
                  >
                    <FormControlLabel
                      value="all"
                      control={<Radio />}
                      label="All Subscribers"
                    />
                    <FormControlLabel
                      value="tags"
                      control={<Radio />}
                      label="Segment by Tags"
                    />
                    <FormControlLabel
                      value="custom"
                      control={<Radio />}
                      label="Custom List"
                    />
                  </RadioGroup>
                </FormControl>

                {recipientType === 'tags' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Tag-based segmentation allows you to target specific subscriber groups.
                  </Alert>
                )}
              </Box>
            )}

            {/* Step 3: Content */}
            {activeStep === 2 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Create Email Content
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Use Template</InputLabel>
                    <Select
                      value={selectedTemplate || ''}
                      label="Use Template"
                      onChange={(e) => {
                        const template = CAMPAIGN_TEMPLATES.find(t => t.id === e.target.value);
                        if (template) handleTemplateSelect(template);
                      }}
                    >
                      <MenuItem value="">Custom (Blank)</MenuItem>
                      {CAMPAIGN_TEMPLATES.map(template => (
                        <MenuItem key={template.id} value={template.id}>
                          {template.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  Use template variables like {'{{customer_name}}'} and {'{{product_name}}'} for personalization.
                </Alert>

                <Box data-testid="editor-campaign-content">
                  <Editor
                    apiKey="no-api-key"
                    onInit={(evt, editor) => editorRef.current = editor}
                    value={content}
                    onEditorChange={(newContent) => setContent(newContent)}
                    init={{
                      height: 500,
                      menubar: true,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                        'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
                        'fullscreen', 'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                      ],
                      toolbar: 'undo redo | formatselect | ' +
                        'bold italic backcolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'removeformat | image | help',
                      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* Step 4: Schedule & Send */}
            {activeStep === 3 && (
              <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Schedule & Send
                </Typography>

                <Paper sx={{ p: 3, mb: 3, backgroundColor: 'background.default' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Campaign Summary
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Subject"
                        secondary={subject || 'No subject'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Recipients"
                        secondary={recipientType === 'all' ? 'All Subscribers' : `Segmented (${recipientType})`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Content"
                        secondary={content ? `${content.length} characters` : 'No content'}
                      />
                    </ListItem>
                  </List>
                </Paper>

                <FormControl component="fieldset">
                  <FormLabel component="legend">When should this campaign be sent?</FormLabel>
                  <RadioGroup
                    value={sendOption}
                    onChange={(e) => setSendOption(e.target.value)}
                  >
                    <FormControlLabel
                      value="now"
                      control={<Radio />}
                      label="Send immediately"
                    />
                    <FormControlLabel
                      value="schedule"
                      control={<Radio />}
                      label="Schedule for later"
                    />
                  </RadioGroup>
                </FormControl>

                {sendOption === 'schedule' && (
                  <Box sx={{ mt: 3 }}>
                    <DateTimePicker
                      label="Schedule Date & Time"
                      value={scheduledDate}
                      onChange={(newValue) => setScheduledDate(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                        },
                      }}
                    />
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={resetBuilder}>
              Cancel
            </Button>
            <Box sx={{ flex: 1 }} />
            {activeStep > 0 && (
              <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
                Back
              </Button>
            )}
            {activeStep < steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForwardIcon />}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleCreateCampaign}
                startIcon={sendOption === 'now' ? <SendIcon /> : <ScheduleIcon />}
                data-testid={sendOption === 'now' ? 'button-send-campaign' : 'button-schedule-campaign'}
              >
                {sendOption === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Analytics Dialog */}
        <Dialog
          open={analyticsDialogOpen}
          onClose={() => setAnalyticsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Campaign Analytics
            <Typography variant="body2" color="text.secondary">
              {selectedCampaign?.subject}
            </Typography>
          </DialogTitle>
          <DialogContent>
            {campaignAnalytics && (
              <Grid container spacing={3}>
                <Grid xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Open Rate
                      </Typography>
                      <Typography variant="h4">
                        {campaignAnalytics.openRate}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {campaignAnalytics.totalOpened} of {campaignAnalytics.totalSent} opened
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Click Rate
                      </Typography>
                      <Typography variant="h4">
                        {campaignAnalytics.clickRate}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {campaignAnalytics.totalClicked} clicks
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Opens Over Time
                      </Typography>
                      <ResponsiveContainer width="100%" height={250} data-testid="chart-opens-over-time">
                        <LineChart data={opensOverTime}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="opens" stroke="#1976d2" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Device Breakdown
                      </Typography>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={deviceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
                    </CardContent>
                  </Card>
                </Grid>

                <Grid xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Delivery Stats
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Sent</Typography>
                          <Typography variant="h6">{campaignAnalytics.totalSent}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Delivered</Typography>
                          <Typography variant="h6">{campaignAnalytics.totalDelivered}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Bounced</Typography>
                          <Typography variant="h6">{campaignAnalytics.totalSent - campaignAnalytics.totalDelivered}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAnalyticsDialogOpen(false)}>Close</Button>
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
    </LocalizationProvider>
  );
}
