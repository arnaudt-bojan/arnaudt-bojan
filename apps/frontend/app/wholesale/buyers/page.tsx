'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@/lib/apollo-client';
import { LIST_WHOLESALE_INVITATIONS, LIST_WHOLESALE_BUYERS } from '@/lib/graphql/queries/wholesale';
import { CREATE_WHOLESALE_INVITATION } from '@/lib/graphql/mutations/wholesale';
import { ListWholesaleInvitationsQuery } from '@/lib/generated/graphql';
import {
  Container,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { UserPlus, Eye, Ban, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WholesaleBuyers() {
  const router = useRouter();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState('');

  const { loading: loadingInvitations, data: invitationsData, refetch: refetchInvitations } = useQuery<ListWholesaleInvitationsQuery>(LIST_WHOLESALE_INVITATIONS);
  const { loading: loadingBuyers, data: buyersData } = useQuery<any>(LIST_WHOLESALE_BUYERS);

  const [createInvitation, { loading: creating, error: createError }] = useMutation(CREATE_WHOLESALE_INVITATION, {
    onCompleted: () => {
      refetchInvitations();
      setInviteDialogOpen(false);
      setBuyerEmail('');
    },
  });

  const invitations = invitationsData?.listWholesaleInvitations?.edges?.map((edge: any) => edge.node) || [];
  const buyers = buyersData?.listWholesaleBuyers || [];

  const handleInvite = () => {
    if (buyerEmail) {
      createInvitation({
        variables: {
          input: {
            buyerEmail,
          },
        },
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      PENDING: 'warning',
      ACCEPTED: 'success',
      EXPIRED: 'default',
      CANCELLED: 'error',
      ACTIVE: 'success',
      SUSPENDED: 'error',
    };
    return statusColors[status] || 'default';
  };

  const invitationColumns: GridColDef[] = [
    {
      field: 'buyerEmail',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Sent Date',
      width: 120,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    {
      field: 'acceptedAt',
      headerName: 'Accepted Date',
      width: 120,
      renderCell: (params: GridRenderCellParams) => 
        params.value ? formatDate(params.value) : '-',
    },
  ];

  const buyerColumns: GridColDef[] = [
    {
      field: 'buyer',
      headerName: 'Buyer Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => 
        params.row.buyer?.fullName || params.row.buyer?.email || 'Unknown',
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => params.row.buyer?.email || '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Since',
      width: 120,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Eye size={14} />}
            onClick={() => router.push(`/wholesale/buyers/${params.row.id}`)}
            data-testid={`button-view-${params.row.id}`}
          >
            View
          </Button>
          {params.row.status === 'ACTIVE' && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<Ban size={14} />}
              data-testid={`button-suspend-${params.row.id}`}
            >
              Suspend
            </Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-wholesale-buyers">
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
            Wholesale Buyers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your B2B customer relationships
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<UserPlus />}
          onClick={() => setInviteDialogOpen(true)}
          data-testid="button-invite-buyer"
        >
          Invite New Buyer
        </Button>
      </Box>

      {/* Invited Buyers Section */}
      <Box mb={4}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Invited Buyers
        </Typography>
        <Box sx={{ height: 300, width: '100%' }}>
          <DataGrid
            rows={invitations}
            columns={invitationColumns}
            loading={loadingInvitations}
            pageSizeOptions={[5, 10]}
            initialState={{
              pagination: { paginationModel: { pageSize: 5 } },
            }}
            disableRowSelectionOnClick
            data-testid="datagrid-invitations"
          />
        </Box>
      </Box>

      {/* Active Buyers Section */}
      <Box>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Active Buyers
        </Typography>
        <Box sx={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={buyers}
            columns={buyerColumns}
            loading={loadingBuyers}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            disableRowSelectionOnClick
            data-testid="datagrid-buyers"
          />
        </Box>
      </Box>

      {/* Invite Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Invite New Buyer</DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to send invitation. Please try again.
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Buyer Email"
            type="email"
            fullWidth
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="buyer@example.com"
            data-testid="input-buyer-email"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleInvite}
            variant="contained"
            disabled={!buyerEmail || creating}
            data-testid="button-send-invitation"
          >
            {creating ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
