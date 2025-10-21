'use client';

import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Skeleton,
  Alert,
  AlertTitle,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Description,
  AttachMoney,
  Send,
  CheckCircle,
  Visibility,
  Add,
  List as ListIcon,
  Warning,
} from '@mui/icons-material';
import { LIST_QUOTATIONS, Quotation } from '@/lib/graphql/trade-quotations';
import { format } from 'date-fns';

export default function TradeDashboard() {
  const router = useRouter();
  const { data, loading, error } = useQuery<{ listQuotations: Quotation[] }>(LIST_QUOTATIONS);

  const quotations = data?.listQuotations || [];

  // Calculate metrics
  const totalQuotations = quotations.length;
  const pendingQuotations = quotations.filter(q =>
    ['DRAFT', 'SENT', 'VIEWED'].includes(q.status)
  ).length;
  const acceptedQuotations = quotations.filter(q =>
    ['ACCEPTED', 'DEPOSIT_PAID', 'BALANCE_DUE', 'FULLY_PAID', 'COMPLETED'].includes(q.status)
  ).length;
  const totalRevenue = quotations
    .filter(q => ['DEPOSIT_PAID', 'BALANCE_DUE', 'FULLY_PAID', 'COMPLETED'].includes(q.status))
    .reduce((sum, q) => sum + parseFloat(q.total.toString()), 0);

  // Get recent quotations (last 5)
  const recentQuotations = [...quotations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
      DRAFT: { label: 'Draft', color: 'default' },
      SENT: { label: 'Sent', color: 'info' },
      VIEWED: { label: 'Viewed', color: 'primary' },
      ACCEPTED: { label: 'Accepted', color: 'success' },
      DEPOSIT_PAID: { label: 'Deposit Paid', color: 'success' },
      BALANCE_DUE: { label: 'Balance Due', color: 'warning' },
      FULLY_PAID: { label: 'Fully Paid', color: 'success' },
      COMPLETED: { label: 'Completed', color: 'success' },
    };

    const config = statusConfig[status] || { label: status, color: 'default' as const };
    return <Chip label={config.label} color={config.color} size="small" data-testid={`badge-status-${status.toLowerCase()}`} />;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const StatCard = ({ title, value, icon, testId }: { title: string; value: string | number; icon: React.ReactNode; testId: string }) => (
    <Card data-testid={testId}>
      <CardHeader
        title={
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        }
        avatar={icon}
        sx={{ pb: 0 }}
      />
      <CardContent>
        <Typography variant="h4" component="div">
          {loading ? <Skeleton width={80} /> : value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-trade-dashboard">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom data-testid="text-page-title">
          Trade Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your professional trade quotations
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Total Quotations"
            value={totalQuotations}
            icon={<Description color="action" />}
            testId="card-stat-total-quotations"
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Pending"
            value={pendingQuotations}
            icon={<Send color="action" />}
            testId="card-stat-pending-quotations"
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Accepted"
            value={acceptedQuotations}
            icon={<CheckCircle color="action" />}
            testId="card-stat-accepted-quotations"
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            icon={<AttachMoney color="action" />}
            testId="card-stat-total-revenue"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mb: 4 }}>
        <CardHeader title="Quick Actions" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid xs={12} sm={4}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<Send />}
                onClick={() => router.push('/trade/quotations/new')}
                data-testid="button-send-quotation"
              >
                Send New Quotation
              </Button>
            </Grid>
            <Grid xs={12} sm={4}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Description />}
                onClick={() => router.push('/trade/quotations')}
                data-testid="button-view-quotations"
              >
                View All Quotations
              </Button>
            </Grid>
            <Grid xs={12} sm={4}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<CheckCircle />}
                onClick={() => router.push('/trade/orders')}
                data-testid="button-view-trade-orders"
              >
                View Trade Orders
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Recent Quotations */}
      <Card>
        <CardHeader title="Recent Quotations" />
        <CardContent>
          {loading ? (
            <Box>
              <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" height={60} />
            </Box>
          ) : recentQuotations.length === 0 ? (
            <Alert severity="info">
              <AlertTitle>No quotations yet</AlertTitle>
              Click "Send New Quotation" to create your first quotation.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table data-testid="table-recent-quotations">
                <TableHead>
                  <TableRow>
                    <TableCell>Quotation #</TableCell>
                    <TableCell>Buyer</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentQuotations.map((quotation) => (
                    <TableRow key={quotation.id} data-testid={`row-quotation-${quotation.id}`}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {quotation.quotationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{quotation.buyerEmail}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(parseFloat(quotation.total.toString()), quotation.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(quotation.status)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(quotation.createdAt), 'MMM dd, yyyy')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => router.push(`/trade/quotations/${quotation.id}/edit`)}
                          data-testid={`button-view-quotation-${quotation.id}`}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
