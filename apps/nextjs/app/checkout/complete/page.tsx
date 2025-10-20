'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, ShoppingBag, Home } from '@mui/icons-material';
import Link from 'next/link';

export default function CheckoutCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate payment processing check
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h5" gutterBottom>
              Processing your order...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we confirm your payment.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          {/* Success Icon */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 3,
            }}
          >
            <CheckCircle sx={{ fontSize: 48, color: 'white' }} />
          </Box>

          {/* Thank You Message */}
          <Typography variant="h4" gutterBottom data-testid="text-order-confirmed">
            Thank you for your order!
          </Typography>

          <Typography variant="body1" color="text.secondary" paragraph>
            Your order has been successfully placed.
          </Typography>

          {orderId && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Order ID: <strong>{orderId}</strong>
            </Typography>
          )}

          {/* Next Steps */}
          <Box
            sx={{
              bgcolor: 'background.default',
              borderRadius: 2,
              p: 3,
              mb: 4,
              textAlign: 'left',
            }}
          >
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              What's Next?
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • You'll receive an email confirmation shortly
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • Track your order status in your account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • We'll notify you when your order ships
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {orderId && (
              <Button
                variant="contained"
                size="large"
                startIcon={<ShoppingBag />}
                component={Link}
                href={`/order-success/${orderId}`}
                data-testid="button-view-order"
              >
                View Order Details
              </Button>
            )}
            <Button
              variant="outlined"
              size="large"
              startIcon={<Home />}
              component={Link}
              href="/"
              data-testid="button-continue-shopping"
            >
              Continue Shopping
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
