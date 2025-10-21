'use client';

import { useState, useEffect } from 'react';
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
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  AccountBalance,
  TrendingUp,
  Sync,
  CheckCircle,
  Error as ErrorIcon,
  Info as InfoIcon,
  OpenInNew,
  Refresh,
} from '@mui/icons-material';

interface StripeStatus {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  currency?: string;
  country?: string;
  requirements?: any;
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

interface Transaction {
  id: string;
  type: 'debit' | 'credit' | 'adjustment';
  amountUsd: string;
  balanceAfter: string;
  source: string;
  metadata: any;
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

      // Fetch Stripe status
      const statusRes = await fetch('/api/stripe/account-status', {
        credentials: 'include',
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStripeStatus(statusData.data);
      }

      // Fetch wallet balance
      const balanceRes = await fetch('/api/seller/wallet/balance', {
        credentials: 'include',
      });
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData);
      }

      // Fetch transactions
      const transactionsRes = await fetch('/api/seller/credit-ledger', {
        credentials: 'include',
      });
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.ledgerEntries || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectStripe = async () => {
    try {
      setConnecting(true);
      setError(null);

      // Create Express account
      const accountRes = await fetch('/api/stripe/create-express-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ country: 'US' }),
      });

      if (!accountRes.ok) {
        throw new Error('Failed to create Stripe account');
      }

      // Create account session for onboarding
      const sessionRes = await fetch('/api/stripe/account-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ purpose: 'onboarding' }),
      });

      if (!sessionRes.ok) {
        throw new Error('Failed to create onboarding session');
      }

      const sessionData = await sessionRes.json();
      
      // In a real implementation, you would embed the Stripe Connect UI here
      // For now, we'll show a message
      alert('Stripe Connect onboarding initiated. Account session created.');
      
      // Refresh data
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to connect Stripe account');
    } finally {
      setConnecting(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: balance?.currency || 'USD',
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

  const getSourceLabel = (source: string, metadata: any) => {
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
      valueGetter: (params) => params?.note || '-',
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
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
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

      {/* Stripe Connection Status */}
      <Grid container spacing={3} mb={4}>
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

                  {stripeStatus.requirements && stripeStatus.requirements.currently_due?.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="body2" fontWeight="bold" mb={1}>
                        Action Required
                      </Typography>
                      <Typography variant="caption">
                        You need to complete additional information to enable payouts.
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<OpenInNew />}
                        sx={{ mt: 1 }}
                        onClick={() => alert('Redirect to Stripe onboarding')}
                      >
                        Complete Setup
                      </Button>
                    </Alert>
                  )}
                </Box>
              ) : (
                <Alert severity="info" icon={<InfoIcon />}>
                  Connect your Stripe account to start receiving payments from orders, enable
                  marketplace features, and manage payouts.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Balance Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Available Balance
                </Typography>
                <AccountBalance sx={{ color: 'primary.main' }} />
              </Box>
              <Typography
                variant="h4"
                component="div"
                fontWeight="bold"
                data-testid="text-available-balance"
              >
                {balance ? formatCurrency(balance.balance) : '$0.00'}
              </Typography>
              <Typography variant="caption" color="text.secondary" mt={1}>
                Ready for payout or spending
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Pending Balance
                </Typography>
                <Sync sx={{ color: 'primary.main' }} />
              </Box>
              <Typography
                variant="h4"
                component="div"
                fontWeight="bold"
                data-testid="text-pending-balance"
              >
                $0.00
              </Typography>
              <Typography variant="caption" color="text.secondary" mt={1}>
                Processing transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Lifetime Earnings
                </Typography>
                <TrendingUp sx={{ color: 'success.main' }} />
              </Box>
              <Typography
                variant="h4"
                component="div"
                fontWeight="bold"
                color="success.main"
                data-testid="text-lifetime-earnings"
              >
                {balance ? formatCurrency(balance.balance) : '$0.00'}
              </Typography>
              <Typography variant="caption" color="text.secondary" mt={1}>
                Total accumulated balance
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payout Section */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Payout Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configure how and when you receive payouts
                  </Typography>
                </Box>
                {stripeStatus?.connected && (
                  <Button
                    variant="outlined"
                    startIcon={<OpenInNew />}
                    data-testid="button-request-payout"
                  >
                    Manage Payouts
                  </Button>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {stripeStatus?.connected ? (
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Payout Method
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      Bank Account (****1234)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Update in Stripe Dashboard
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Schedule
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {stripeStatus.payoutSchedule?.interval || 'Manual'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stripeStatus.payoutSchedule?.delayDays
                        ? `${stripeStatus.payoutSchedule.delayDays} day delay`
                        : 'On demand'}
                    </Typography>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">
                  Connect your Stripe account to configure payout settings
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transaction History */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Transaction History
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                All wallet activity including top-ups, purchases, and refunds
              </Typography>

              {transactions.length > 0 ? (
                <Box sx={{ height: 400, width: '100%' }} data-testid="datagrid-transactions">
                  <DataGrid
                    rows={transactions}
                    columns={transactionColumns}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{
                      pagination: {
                        paginationModel: { pageSize: 10, page: 0 },
                      },
                    }}
                    disableRowSelectionOnClick
                    sx={{
                      '& .MuiDataGrid-cell': {
                        borderColor: 'divider',
                      },
                      '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: 'grey.50',
                        borderColor: 'divider',
                      },
                    }}
                  />
                </Box>
              ) : (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  py={8}
                >
                  <AccountBalance sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">No transactions yet</Typography>
                  <Typography variant="caption" color="text.secondary" mt={1}>
                    Your wallet activity will appear here
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payout History Table */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Payout History
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Track your payouts to your bank account
              </Typography>

              <TableContainer component={Paper} variant="outlined" data-testid="table-payout-history">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Arrival Date</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Box py={4}>
                          <Typography color="text.secondary">No payouts yet</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Payouts will appear here once processed
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
