'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Email,
  Error as ErrorIcon,
  Business,
} from '@mui/icons-material';
import { GET_WHOLESALE_INVITATION, ACCEPT_WHOLESALE_INVITATION } from '@/lib/graphql/wholesale-buyer';
import { GetWholesaleInvitationQuery } from '@/lib/generated/graphql';

export default function AcceptWholesaleInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { data, loading, error } = useQuery<GetWholesaleInvitationQuery>(GET_WHOLESALE_INVITATION, {
    variables: { token },
    skip: !token,
  });

  const [acceptInvitation, { loading: accepting }] = useMutation(
    ACCEPT_WHOLESALE_INVITATION,
    {
      onCompleted: () => {
        setTimeout(() => {
          router.push('/wholesale/catalog');
        }, 1500);
      },
      onError: (err) => {
        console.error('Error accepting invitation:', err);
      },
    }
  );

  const invitation = data?.getWholesaleInvitation;

  const handleAccept = async () => {
    try {
      await acceptInvitation({ variables: { token } });
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress data-testid="loading-invitation" />
        </Box>
      </Container>
    );
  }

  if (error || !invitation) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Card>
          <CardHeader
            avatar={<ErrorIcon color="error" sx={{ fontSize: 40 }} />}
            title={
              <Typography variant="h5" color="error">
                Invalid Invitation
              </Typography>
            }
          />
          <CardContent>
            <Typography variant="body1" color="text.secondary" paragraph data-testid="text-error-message">
              This invitation link is invalid or has expired.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/')} fullWidth data-testid="button-go-home">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (invitation.status === 'ACCEPTED') {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Card>
          <CardHeader
            avatar={<CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />}
            title={
              <Typography variant="h5" color="success.main">
                Already Accepted
              </Typography>
            }
          />
          <CardContent>
            <Typography variant="body1" color="text.secondary" paragraph data-testid="text-already-accepted">
              This invitation has already been accepted.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You can access the wholesale catalog at any time.
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/wholesale/catalog')}
              fullWidth
              data-testid="button-go-to-catalog"
            >
              Go to Wholesale Catalog
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Card>
        <CardHeader
          avatar={<Email sx={{ fontSize: 40, color: 'primary.main' }} />}
          title={
            <Typography variant="h5">
              Wholesale Invitation
            </Typography>
          }
          subheader="You've been invited to access the wholesale B2B catalog"
        />
        <CardContent>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                From Seller
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <Business fontSize="small" color="action" />
                <Typography variant="body1" fontWeight="medium" data-testid="text-seller-name">
                  {invitation.seller?.sellerAccount?.businessName || invitation.seller?.sellerAccount?.storeName || 'Seller'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Buyer Email
              </Typography>
              <Typography variant="body1" fontWeight="medium" data-testid="text-buyer-email">
                {invitation.buyerEmail}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={invitation.status}
                color={invitation.status === 'PENDING' ? 'warning' : 'default'}
                size="small"
                sx={{ mt: 0.5 }}
                data-testid="chip-status"
              />
            </Box>

            {invitation.expiresAt && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Expires
                </Typography>
                <Typography variant="body2" data-testid="text-expiry-date">
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </Typography>
              </Box>
            )}
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              By accepting this invitation, you will gain access to the wholesale catalog with special B2B pricing and terms.
            </Typography>
          </Alert>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleAccept}
            disabled={accepting}
            data-testid="button-accept-invitation"
          >
            {accepting ? <CircularProgress size={24} /> : 'Accept Invitation'}
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
