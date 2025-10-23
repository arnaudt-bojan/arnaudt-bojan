'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  LIST_WHOLESALE_INVITATIONS,
  CREATE_WHOLESALE_INVITATION, 
  CANCEL_INVITATION,
} from '@/lib/graphql/wholesale';
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { ArrowLeft, Mail, Copy, Trash2 } from 'lucide-react';

interface WholesaleInvitation {
  id: string;
  buyerEmail: string;
  status: string;
  token?: string;
  createdAt: string;
  acceptedAt?: string;
  buyer?: {
    id: string;
    email: string;
    fullName?: string;
  };
}

interface ListWholesaleInvitationsData {
  listWholesaleInvitations: {
    edges: Array<{ node: WholesaleInvitation }>;
  };
}

export default function WholesaleInvitations() {
  const router = useRouter();
  const [buyerEmail, setBuyerEmail] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<string | null>(null);

  const { loading, data, refetch } = useQuery<ListWholesaleInvitationsData>(LIST_WHOLESALE_INVITATIONS);

  const [createInvitation, { loading: creating, error: createError }] = useMutation(CREATE_WHOLESALE_INVITATION, {
    onCompleted: () => {
      refetch();
      setBuyerEmail('');
    },
  });

  const [cancelInvitation, { loading: cancelling }] = useMutation(CANCEL_INVITATION, {
    onCompleted: () => {
      refetch();
      setDeleteDialogOpen(false);
      setInvitationToDelete(null);
    },
  });

  const invitations = (data?.listWholesaleInvitations?.edges || []).map((edge) => edge.node);

  const handleSendInvitation = () => {
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

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/wholesale/accept/${token}`;
    navigator.clipboard.writeText(link);
  };

  const handleDeleteClick = (id: string) => {
    setInvitationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (invitationToDelete) {
      cancelInvitation({ variables: { invitationId: invitationToDelete } });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      PENDING: 'warning',
      ACCEPTED: 'success',
      EXPIRED: 'default',
      CANCELLED: 'error',
    };
    return statusColors[status] || 'default';
  };

  const columns: GridColDef[] = [
    {
      field: 'buyerEmail',
      headerName: 'Email',
      flex: 1,
      minWidth: 250,
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
      headerName: 'Sent Date',
      width: 180,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    {
      field: 'acceptedAt',
      headerName: 'Accepted Date',
      width: 180,
      renderCell: (params: GridRenderCellParams) => 
        params.value ? formatDate(params.value) : '-',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1}>
          {params.row.status === 'PENDING' && params.row.token && (
            <Tooltip title="Copy invitation link">
              <IconButton
                size="small"
                onClick={() => handleCopyLink(params.row.token)}
                data-testid={`button-copy-link-${params.row.id}`}
              >
                <Copy size={16} />
              </IconButton>
            </Tooltip>
          )}
          {params.row.status === 'PENDING' && (
            <Tooltip title="Cancel invitation">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteClick(params.row.id)}
                data-testid={`button-cancel-invitation-${params.row.id}`}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-wholesale-invitations">
        {/* Header */}
        <Box mb={4}>
          <Button
            startIcon={<ArrowLeft />}
            onClick={() => router.push('/wholesale/buyers')}
            sx={{ mb: 2 }}
            data-testid="button-back"
          >
            Back to Buyers
          </Button>
          <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
            Wholesale Invitations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Send and manage wholesale buyer invitations
          </Typography>
        </Box>

        {/* Invite Form */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Send New Invitation
          </Typography>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to send invitation. Please try again.
            </Alert>
          )}
          <Box display="flex" gap={2}>
            <TextField
              fullWidth
              label="Buyer Email Address"
              type="email"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              placeholder="buyer@company.com"
              data-testid="input-buyer-email"
            />
            <Button
              variant="contained"
              startIcon={<Mail />}
              onClick={handleSendInvitation}
              disabled={!buyerEmail || creating}
              sx={{ minWidth: 150 }}
              data-testid="button-send-invitation"
            >
              {creating ? 'Sending...' : 'Send Invite'}
            </Button>
          </Box>
        </Paper>

        {/* Invitations Grid */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={invitations}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            disableRowSelectionOnClick
            data-testid="grid-invitations"
          />
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          data-testid="dialog-cancel-invitation"
        >
          <DialogTitle>Cancel Invitation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to cancel this invitation? The buyer will no longer be able to use this invitation link.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-dialog"
            >
              Keep Invitation
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              disabled={cancelling}
              data-testid="button-confirm-cancel"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Invitation'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
}
