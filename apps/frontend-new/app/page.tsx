import { Box, Container, Typography, Button, Paper } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <StorefrontIcon sx={{ fontSize: 80, color: 'primary.main' }} />
        
        <Typography variant="h2" component="h1" gutterBottom align="center">
          Welcome to Upfirst
        </Typography>
        
        <Typography variant="h5" color="text.secondary" align="center" sx={{ maxWidth: 600 }}>
          Modern D2C e-commerce platform empowering creators and brands with
          individual storefronts
        </Typography>

        <Paper elevation={2} sx={{ p: 4, mt: 4, maxWidth: 800, width: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Platform Features:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Typography>B2C Retail, B2B Wholesale, and Professional Quotations</Typography>
            </li>
            <li>
              <Typography>Multi-seller payment processing with Stripe Connect</Typography>
            </li>
            <li>
              <Typography>Real-time updates with Socket.IO</Typography>
            </li>
            <li>
              <Typography>Multi-currency support and advanced tax system</Typography>
            </li>
            <li>
              <Typography>AI-optimized social media advertising</Typography>
            </li>
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            component={Link}
            href="/dashboard"
            variant="contained"
            size="large"
          >
            Go to Dashboard
          </Button>
          <Button
            component={Link}
            href="/products"
            variant="outlined"
            size="large"
          >
            View Products
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          Next.js 16 • React 19 • Material UI v7 • GraphQL • NestJS
        </Typography>
      </Box>
    </Container>
  );
}
