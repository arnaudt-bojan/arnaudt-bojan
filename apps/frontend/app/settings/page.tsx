'use client';

import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Store,
  Palette,
  LocalShipping,
  CreditCard,
  Notifications,
  Settings as SettingsIcon,
  Save,
  Refresh,
  ContentCopy,
  CheckCircle,
  CloudUpload,
  Delete,
} from '@mui/icons-material';
import Link from 'next/link';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const [currentTab, setCurrentTab] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Store Settings
  const [businessName, setBusinessName] = useState('My Store');
  const [storeDescription, setStoreDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('contact@mystore.com');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [storeLogo, setStoreLogo] = useState('');
  const [storeBanner, setStoreBanner] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('America/New_York');

  // Storefront Settings
  const [subdomain, setSubdomain] = useState('mystore');
  const [customDomain, setCustomDomain] = useState('');
  const [themeColor, setThemeColor] = useState('#000000');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialTwitter, setSocialTwitter] = useState('');
  const [footerContent, setFooterContent] = useState('');

  // Shipping Settings
  const [defaultShippingRate, setDefaultShippingRate] = useState('10.00');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('50.00');
  const [shippoConnected, setShippoConnected] = useState(false);
  const [processingTime, setProcessingTime] = useState('1-3');
  const [returnPolicy, setReturnPolicy] = useState('');

  // Payment Settings
  const [stripeConnected, setStripeConnected] = useState(true);
  const [autoTax, setAutoTax] = useState(true);

  // Notification Settings
  const [emailNewOrder, setEmailNewOrder] = useState(true);
  const [emailLowStock, setEmailLowStock] = useState(true);
  const [emailCustomerMessage, setEmailCustomerMessage] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  // Advanced Settings
  const [apiKey] = useState('sk_test_xxxxxxxxxxxxxxxxxx');
  const [webhookUrl, setWebhookUrl] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      // Reset logic here
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteAccount = () => {
    // Delete account logic
    setShowDeleteDialog(false);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your store configuration and preferences
          </Typography>
        </Box>
        <Button component={Link} href="/dashboard" variant="outlined">
          Back to Dashboard
        </Button>
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaveSuccess(false)}>
          Settings saved successfully!
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          data-testid="tabs-settings"
        >
          <Tab icon={<Store />} iconPosition="start" label="Store" />
          <Tab icon={<Palette />} iconPosition="start" label="Storefront" />
          <Tab icon={<LocalShipping />} iconPosition="start" label="Shipping" />
          <Tab icon={<CreditCard />} iconPosition="start" label="Payment" />
          <Tab icon={<Notifications />} iconPosition="start" label="Notifications" />
          <Tab icon={<SettingsIcon />} iconPosition="start" label="Advanced" />
        </Tabs>

        {/* Store Settings Tab */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>
                Store Information
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Business Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                data-testid="input-business-name"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Contact Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Tax ID"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Store Description"
                multiline
                rows={4}
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                data-testid="input-store-description"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Business Address"
                multiline
                rows={3}
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={currency}
                  label="Currency"
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <MenuItem value="USD">USD - US Dollar</MenuItem>
                  <MenuItem value="EUR">EUR - Euro</MenuItem>
                  <MenuItem value="GBP">GBP - British Pound</MenuItem>
                  <MenuItem value="JPY">JPY - Japanese Yen</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={timezone}
                  label="Timezone"
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
                  <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
                  <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
                  <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSave} data-testid="button-save-settings">
                  Save Changes
                </Button>
                <Button variant="outlined" startIcon={<Refresh />} onClick={handleReset}>
                  Reset to Default
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Storefront Settings Tab */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>
                Domain & Branding
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                helperText="Your store will be available at: mystore.upfirst.io"
                InputProps={{
                  endAdornment: <Typography color="text.secondary">.upfirst.io</Typography>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Custom Domain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                helperText="Enter your custom domain (e.g., shop.mystore.com)"
              />
              {customDomain && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Configure DNS: CNAME record pointing to stores.upfirst.io
                </Alert>
              )}
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Theme Customization
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Primary Color"
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                SEO Settings
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Meta Title"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                helperText="Recommended: 50-60 characters"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Meta Description"
                multiline
                rows={3}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                helperText="Recommended: 150-160 characters"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Social Media Links
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Instagram"
                value={socialInstagram}
                onChange={(e) => setSocialInstagram(e.target.value)}
                placeholder="@username"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Twitter"
                value={socialTwitter}
                onChange={(e) => setSocialTwitter(e.target.value)}
                placeholder="@username"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Footer Content"
                multiline
                rows={3}
                value={footerContent}
                onChange={(e) => setFooterContent(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                Save Changes
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Shipping Settings Tab */}
        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>
                Shipping Configuration
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Default Shipping Rate"
                type="number"
                value={defaultShippingRate}
                onChange={(e) => setDefaultShippingRate(e.target.value)}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Free Shipping Threshold"
                type="number"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
                helperText="Orders above this amount get free shipping"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Shippo Integration
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Connect to Shippo for automated shipping labels
                      </Typography>
                    </Box>
                    <Chip
                      label={shippoConnected ? 'Connected' : 'Not Connected'}
                      color={shippoConnected ? 'success' : 'default'}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Processing Time</InputLabel>
                <Select
                  value={processingTime}
                  label="Processing Time"
                  onChange={(e) => setProcessingTime(e.target.value)}
                >
                  <MenuItem value="1">1 day</MenuItem>
                  <MenuItem value="1-3">1-3 days</MenuItem>
                  <MenuItem value="3-5">3-5 days</MenuItem>
                  <MenuItem value="5-7">5-7 days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Return Policy"
                multiline
                rows={4}
                value={returnPolicy}
                onChange={(e) => setReturnPolicy(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                Save Changes
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Payment Settings Tab */}
        <TabPanel value={currentTab} index={3}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>
                Payment Configuration
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Stripe Connect
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Receive payments directly to your bank account
                      </Typography>
                    </Box>
                    <Chip
                      icon={<CheckCircle />}
                      label={stripeConnected ? 'Connected' : 'Not Connected'}
                      color={stripeConnected ? 'success' : 'default'}
                    />
                  </Box>
                  {!stripeConnected && (
                    <Button variant="contained" sx={{ mt: 2 }}>
                      Connect Stripe
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoTax}
                    onChange={(e) => setAutoTax(e.target.checked)}
                  />
                }
                label="Enable automatic tax calculation"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Automatically calculate sales tax based on customer location
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                Save Changes
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notification Settings Tab */}
        <TabPanel value={currentTab} index={4}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>
                Email Notifications
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailNewOrder}
                    onChange={(e) => setEmailNewOrder(e.target.checked)}
                  />
                }
                label="New order received"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailLowStock}
                    onChange={(e) => setEmailLowStock(e.target.checked)}
                  />
                }
                label="Low stock alerts"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailCustomerMessage}
                    onChange={(e) => setEmailCustomerMessage(e.target.checked)}
                  />
                }
                label="Customer messages"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                SMS Notifications
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={smsEnabled}
                    onChange={(e) => setSmsEnabled(e.target.checked)}
                  />
                }
                label="Enable SMS notifications (Premium feature)"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                Save Changes
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Advanced Settings Tab */}
        <TabPanel value={currentTab} index={5}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>
                API Configuration
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="API Key"
                value={apiKey}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton size="small" onClick={() => navigator.clipboard.writeText(apiKey)}>
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  ),
                }}
                helperText="Read-only API key for integrations"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Webhook URL"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                helperText="Receive real-time updates about orders and products"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Data Management
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" startIcon={<CloudUpload />}>
                  Export Data
                </Button>
                <Button variant="outlined" startIcon={<CloudUpload />}>
                  Import Data
                </Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="error.main">
                Danger Zone
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Alert severity="error">
                Deleting your account is permanent and cannot be undone. All your data will be permanently deleted.
              </Alert>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                sx={{ mt: 2 }}
                onClick={handleDeleteAccount}
              >
                Delete Account
              </Button>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you absolutely sure you want to delete your account? This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ mt: 2 }}>
            All your products, orders, and customer data will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDeleteAccount} color="error" variant="contained">
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
