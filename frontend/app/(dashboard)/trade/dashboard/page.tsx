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
import Grid from '@mui/material/Grid2';
import {
  Description,
  AttachMoney,
  Send,
  CheckCircle,
  Visibility,
} from '@mui/icons-material';
import { LIST_QUOTATIONS, Quotation } from '@/lib/graphql/trade';
import { format } from 'date-fns';
import { DEFAULT_CURRENCY } from '@/lib/shared';
import DashboardLayout from '@/components/DashboardLayout';

export default function TradeDashboard() {
  const router = useRouter();
  const { data, loading, error: _error } = useQuery<{ listQuotations: { edges: Array<{ node: Quotation }> } }>(LIST_QUOTATIONS);

  const quotations = (data?.listQuotations?.edges || []).map(edge => edge.node);

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

  const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY) => {
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
    <DashboardLayout title="Trade Dashboard">
      <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-trade-dashboard">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom data-testid="text-page-title">
            Trade Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Overview of your professional trade quotations
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Quotations"
              value={totalQuotations}
              icon={<Description color="action" />}
              testId="card-stat-total-quotations"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending"
              value={pendingQuotations}
              icon={<Send color="action" />}
              testId="card-stat-pending-quotations"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Accepted"
              value={acceptedQuotations}
              icon={<CheckCircle color="action" />}
              testId="card-stat-accepted-quotations"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
              icon={<AttachMoney color="action" />}
              testId="card-stat-total-revenue"
            />
          </Grid>
        </Grid>

        <Card>
          <CardHeader
            title={<Typography variant="h5">Recent Quotations</Typography>}
            action={
              <Button
                variant="contained"
                onClick={() => router.push('/trade/quotations/new')}
                data-testid="button-create-quotation"
              >
                New Quotation
              </Button>
            }
          />
          <CardContent>
            {loading ? (
              <Box data-testid="skeleton-quotations">
                <Skeleton height={60} />
                <Skeleton height={60} />
                <Skeleton height={60} />
              </Box>
            ) : quotations.length === 0 ? (
              <Alert severity="info" data-testid="alert-no-quotations">
                <AlertTitle>No Quotations Yet</AlertTitle>
                Create your first trade quotation to get started.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" data-testid="table-recent-quotations">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Quotation #</TableCell>
                      <TableCell>Buyer</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Actions</TableCell>
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
                          {format(new Date(quotation.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => router.push(`/trade/quotations/${quotation.id}/edit`)}
                            data-testid={`button-view-${quotation.id}`}
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
    </DashboardLayout>
  );
}
