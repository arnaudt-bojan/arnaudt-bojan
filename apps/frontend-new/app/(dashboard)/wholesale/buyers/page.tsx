'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  LIST_WHOLESALE_INVITATIONS, 
  LIST_WHOLESALE_BUYERS,
  CREATE_WHOLESALE_INVITATION,
} from '@/lib/graphql/wholesale';
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
import Grid from '@mui/material/Grid2';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { UserPlus, Eye, Ban } from 'lucide-react';

interface WholesaleInvitation {
  id: string;
  buyerEmail: string;
  status: string;
  createdAt: string;
  acceptedAt?: string;
  buyer?: {
    id: string;
    email: string;
    fullName?: string;
  };
}

interface WholesaleBuyer {
  id: string;
  buyerId: string;
  sellerId: string;
  isActive: boolean;
  grantedAt: string;
  buyer?: {
    id: string;
    fullName?: string;
    email?: string;
  };
}

interface ListWholesaleInvitationsData {
  listWholesaleInvitations: {
    edges: Array<{ node: WholesaleInvitation }>;
  };
}

interface ListWholesaleBuyersData {
  listWholesaleBuyers: {
    edges: Array<{ node: WholesaleBuyer }>;
    totalCount: number;
  };
}

export default function WholesaleBuyers() {
  const router = useRouter();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState('');

  const { loading: loadingInvitations, data: invitationsData, refetch: refetchInvitations } = 
    useQuery<ListWholesaleInvitationsData>(LIST_WHOLESALE_INVITATIONS);
  
  const { loading: loadingBuyers, data: buyersData } = 
    useQuery<ListWholesaleBuyersData>(LIST_WHOLESALE_BUYERS);

  const [createInvitation, { loading: creating, error: createError }] = useMutation(CREATE_WHOLESALE_INVITATION, {
    onCompleted: () => {
      refetchInvitations();
      setInviteDialogOpen(false);
      setBuyerEmail('');
    },
  });

  const invitations = (invitationsData?.listWholesaleInvitations?.edges || []).map((edge) => edge.node);
  const buyers = (buyersData?.listWholesaleBuyers?.edges || []).map((edge) => edge.node);

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
      renderCell: (params: GridRenderCellParams) => {
        const buyer = params.row.buyer;
        return buyer?.fullName || buyer?.email || 'Unknown';
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => params.row.buyer?.email || '-',
    },
    {
      field: 'grantedAt',
      headerName: 'Access Granted',
      width: 150,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Active' : 'Suspended'}
          color={getStatusColor(params.value ? 'ACTIVE' : 'SUSPENDED')}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Eye size={16} />}
            onClick={() => router.push(`/wholesale/buyers/${params.row.id}`)}
            data-testid={`button-view-buyer-${params.row.id}`}
          >
            View
          </Button>
          {params.row.isActive && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Ban size={16} />}
              data-testid={`button-suspend-buyer-${params.row.id}`}
            >
              Suspend
            </Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-wholesale-buyers">
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
              Wholesale Buyers
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your B2B wholesale buyer relationships
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<UserPlus />}
            onClick={() => setInviteDialogOpen(true)}
            data-testid="button-invite-buyer"
          >
            Invite Buyer
          </Button>
        </Box>

        {/* Active Buyers Section */}
        <Box mb={4}>
          <Typography variant="h5" component="h2" gutterBottom fontWeight="medium" mb={2}>
            Active Buyers ({buyers.length})
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={buyers}
              columns={buyerColumns}
              loading={loadingBuyers}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              disableRowSelectionOnClick
              data-testid="grid-buyers"
            />
          </Box>
        </Box>

        {/* Pending Invitations Section */}
        <Box>
          <Typography variant="h5" component="h2" gutterBottom fontWeight="medium" mb={2}>
            Pending Invitations ({invitations.length})
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={invitations}
              columns={invitationColumns}
              loading={loadingInvitations}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              disableRowSelectionOnClick
              data-testid="grid-invitations"
            />
          </Box>
        </Box>

        {/* Invite Dialog */}
        <Dialog 
          open={inviteDialogOpen} 
          onClose={() => setInviteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          data-testid="dialog-invite-buyer"
        >
          <DialogTitle>Invite Wholesale Buyer</DialogTitle>
          <DialogContent>
            <Box pt={1}>
              {createError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Failed to send invitation. Please try again.
                </Alert>
              )}
              <TextField
                autoFocus
                fullWidth
                label="Buyer Email Address"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="buyer@company.com"
                data-testid="input-buyer-email"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setInviteDialogOpen(false)}
              data-testid="button-cancel-invite"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleInvite}
              disabled={!buyerEmail || creating}
              data-testid="button-send-invitation"
            >
              {creating ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
}
