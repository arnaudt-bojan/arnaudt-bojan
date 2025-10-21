'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@/lib/apollo-client';
import { LIST_WHOLESALE_INVITATIONS } from '@/lib/graphql/queries/wholesale';
import { CREATE_WHOLESALE_INVITATION, CANCEL_INVITATION } from '@/lib/graphql/mutations/wholesale';
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
import { useRouter } from 'next/navigation';

// GraphQL Response Types
interface ListWholesaleInvitationsData {
  listWholesaleInvitations: {
    edges: Array<{ node: any }>;
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

  const invitations = data?.listWholesaleInvitations?.edges?.map((edge: any) => edge.node) || [];

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
    // You could add a toast notification here
  };

  const handleDeleteClick = (id: string) => {
    setInvitationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (invitationToDelete) {
      cancelInvitation({ variables: { id: invitationToDelete } });
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
      headerName: 'Sent',
      width: 180,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    {
      field: 'expiresAt',
      headerName: 'Expires',
      width: 180,
      renderCell: (params: GridRenderCellParams) => 
        params.value ? formatDate(params.value) : '-',
    },
    {
      field: 'acceptedAt',
      headerName: 'Accepted',
      width: 180,
      renderCell: (params: GridRenderCellParams) => 
        params.value ? formatDate(params.value) : '-',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1}>
          {params.row.status === 'PENDING' && (
            <>
              <Tooltip title="Copy invitation link">
                <IconButton
                  size="small"
                  onClick={() => handleCopyLink(params.row.token)}
                  data-testid={`button-copy-${params.row.id}`}
                >
                  <Copy size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel invitation">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteClick(params.row.id)}
                  data-testid={`button-cancel-${params.row.id}`}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-wholesale-invitations">
      {/* Header */}
      <Box mb={4}>
        <Button
          startIcon={<ArrowLeft />}
          onClick={() => router.push('/wholesale/buyers')}
          sx={{ mb: 2 }}
        >
          Back to Buyers
        </Button>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Wholesale Invitations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Invite new wholesale buyers to your platform
        </Typography>
      </Box>

      {/* Invitation Form */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Send New Invitation
        </Typography>
        {createError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to send invitation. Please try again.
          </Alert>
        )}
        <Box display="flex" gap={2} alignItems="flex-start">
          <TextField
            fullWidth
            type="email"
            label="Buyer Email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="buyer@example.com"
            data-testid="input-email"
          />
          <Button
            variant="contained"
            startIcon={<Mail />}
            onClick={handleSendInvitation}
            disabled={!buyerEmail || creating}
            sx={{ minWidth: 150 }}
            data-testid="button-send-invitation"
          >
            {creating ? 'Sending...' : 'Send'}
          </Button>
        </Box>
      </Paper>

      {/* Invitations List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Invitation History
        </Typography>
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={invitations}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            disableRowSelectionOnClick
            data-testid="datagrid-invitations"
          />
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Cancel Invitation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this invitation? The invitation link will no longer be valid.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>No, Keep It</Button>
          <Button onClick={handleConfirmDelete} color="error" disabled={cancelling}>
            {cancelling ? 'Cancelling...' : 'Yes, Cancel It'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
