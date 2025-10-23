'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
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
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  AccountBalance,
  Sync,
  CheckCircle,
  Error as ErrorIcon,
  Info as InfoIcon,
  OpenInNew,
  Refresh,
} from '@mui/icons-material';
import { DEFAULT_CURRENCY } from '@/lib/shared';

interface StripeRequirements {
  currentlyDue?: string[];
  eventuallyDue?: string[];
  pastDue?: string[];
}

interface StripeStatus {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  currency?: string;
  country?: string;
  requirements?: StripeRequirements;
  capabilities?: {
    card_payments?: string;
    transfers?: string;
  };
  payoutSchedule?: {
    interval?: string;
    delayDays?: number;
  };
}

interface WalletBalance {
  balance: number;
  currency: string;
}

interface TransactionMetadata {
  note?: string;
  [key: string]: unknown;
}

interface Transaction {
  id: string;
  type: 'debit' | 'credit' | 'adjustment';
  amountUsd: string;
  balanceAfter: string;
  source: string;
  metadata: TransactionMetadata;
  createdAt: string;
  orderId?: string;
}

export default function WalletPage() {
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const statusRes = await fetch('/api/stripe/account-status', {
        credentials: 'include',
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStripeStatus(statusData.data);
      }

      const balanceRes = await fetch('/api/seller/wallet/balance', {
        credentials: 'include',
      });
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData);
      }

      const transactionsRes = await fetch('/api/seller/credit-ledger', {
        credentials: 'include',
      });
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.ledgerEntries || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectStripe = async () => {
    try {
      setConnecting(true);
      setError(null);

      const accountRes = await fetch('/api/stripe/create-express-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ country: 'US' }),
      });

      if (!accountRes.ok) {
        throw new Error('Failed to create Stripe account');
      }

      const sessionRes = await fetch('/api/stripe/account-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ purpose: 'onboarding' }),
      });

      if (!sessionRes.ok) {
        throw new Error('Failed to create onboarding session');
      }

      const _sessionData = await sessionRes.json();
      
      alert('Stripe Connect onboarding initiated. Account session created.');
      
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Stripe account');
    } finally {
      setConnecting(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: balance?.currency || DEFAULT_CURRENCY,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSourceLabel = (source: string, metadata: TransactionMetadata) => {
    const isRollback = metadata?.note && 
      (metadata.note.toLowerCase().includes('rollback') || 
       metadata.note.toLowerCase().includes('failure'));
    
    switch (source) {
      case 'label_purchase':
        return 'Shipping Label';
      case 'label_refund':
        return 'Label Refund';
      case 'manual':
        return isRollback ? 'Refund' : 'Wallet Top-Up';
      case 'settlement_fix':
        return 'Adjustment';
      default:
        return source;
    }
  };

  const transactionColumns: GridColDef[] = [
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 180,
      valueFormatter: (params) => formatDate(params as string),
    },
    {
      field: 'source',
      headerName: 'Type',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={getSourceLabel(params.row.source, params.row.metadata)}
          size="small"
          color={params.row.type === 'credit' ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'metadata',
      headerName: 'Description',
      width: 200,
      valueGetter: (params) => (params as TransactionMetadata)?.note || '-',
    },
    {
      field: 'amountUsd',
      headerName: 'Amount',
      width: 130,
      renderCell: (params) => (
        <Typography
          color={params.row.type === 'credit' ? 'success.main' : 'error.main'}
          fontWeight="bold"
        >
          {params.row.type === 'credit' ? '+' : '-'}
          {formatCurrency(params.row.amountUsd)}
        </Typography>
      ),
    },
    {
      field: 'balanceAfter',
      headerName: 'Balance After',
      width: 150,
      valueFormatter: (params) => formatCurrency(params as string),
    },
  ];

  if (loading && !stripeStatus) {
    return (
      <DashboardLayout title="Wallet">
        <Container maxWidth="xl">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Wallet">
      <Container maxWidth="xl">
        <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
              Wallet
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your Stripe Connect account and view transactions
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12 }}>
            <Card data-testid="card-stripe-status">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                  <Box>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      Stripe Account Status
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Connect your Stripe account to receive payouts
                    </Typography>
                  </Box>
                  {!stripeStatus?.connected && (
                    <Button
                      variant="contained"
                      startIcon={<AccountBalance />}
                      onClick={handleConnectStripe}
                      disabled={connecting}
                      data-testid="button-connect-stripe"
                    >
                      {connecting ? 'Connecting...' : 'Connect Stripe'}
                    </Button>
                  )}
                </Box>

                {stripeStatus?.connected ? (
                  <Box>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Account ID
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {stripeStatus.accountId}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Status
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                            {stripeStatus.chargesEnabled && stripeStatus.payoutsEnabled ? (
                              <>
                                <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
                                <Typography variant="body1" fontWeight="bold" color="success.main">
                                  Active
                                </Typography>
                              </>
                            ) : (
                              <>
                                <ErrorIcon sx={{ fontSize: 20, color: 'warning.main' }} />
                                <Typography variant="body1" fontWeight="bold" color="warning.main">
                                  Pending Setup
                                </Typography>
                              </>
                            )}
                          </Box>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Capabilities
                          </Typography>
                          <Box display="flex" gap={1} mt={0.5}>
                            <Chip
                              label="Card Payments"
                              size="small"
                              color={
                                stripeStatus.capabilities?.card_payments === 'active'
                                  ? 'success'
                                  : 'default'
                              }
                            />
                            <Chip
                              label="Transfers"
                              size="small"
                              color={
                                stripeStatus.capabilities?.transfers === 'active'
                                  ? 'success'
                                  : 'default'
                              }
                            />
                          </Box>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Payout Schedule
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {stripeStatus.payoutSchedule?.interval || 'Manual'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {stripeStatus.requirements && (stripeStatus.requirements as { currently_due?: string[] }).currently_due && ((stripeStatus.requirements as { currently_due?: string[] }).currently_due?.length || 0) > 0 && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          Action Required
                        </Typography>
                        <Typography variant="body2">
                          Please complete your Stripe account setup to enable payouts.
                        </Typography>
                        {((stripeStatus.requirements as { currently_due?: string[] }).currently_due || []).map((req) => (
                          <Typography key={req} variant="caption" display="block" sx={{ mt: 0.5 }}>
                            • {req}
                          </Typography>
                        ))}
                        <Button
                          size="small"
                          variant="contained"
                          sx={{ mt: 2 }}
                          endIcon={<OpenInNew />}
                          data-testid="button-complete-setup"
                        >
                          Complete Setup
                        </Button>
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Alert severity="info" icon={<InfoIcon />}>
                    <Typography variant="body2">
                      Connect your Stripe account to start receiving payouts for your orders.
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card data-testid="card-balance">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    Current Balance
                  </Typography>
                  <Sync sx={{ color: 'text.secondary' }} />
                </Box>
                <Typography variant="h3" fontWeight="bold" color="primary.main">
                  {balance ? formatCurrency(balance.balance) : '-'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Available for withdrawal
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card data-testid="card-payout-info">
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Payout Information
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Next Payout:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      Pending
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Payout Method:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {stripeStatus?.connected ? 'Bank Transfer' : 'Not Set'}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Frequency:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {stripeStatus?.payoutSchedule?.interval || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">Transaction History</Typography>
          </Box>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={transactions}
              columns={transactionColumns}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              disableRowSelectionOnClick
              data-testid="datagrid-transactions"
            />
          </Box>
        </Paper>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Need Help?
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              If you have questions about your wallet or Stripe account, please contact support.
            </Typography>
            <Button variant="outlined" startIcon={<InfoIcon />}>
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </Container>
    </DashboardLayout>
  );
}
