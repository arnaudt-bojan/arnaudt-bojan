'use client';

import { useQuery } from '@/lib/apollo-client';
import { LIST_PRODUCTS } from '@/lib/graphql/queries/products';
import { GET_CURRENT_USER } from '@/lib/graphql/queries/user';
import { ListProductsQuery, GetCurrentUserQuery } from '@/lib/generated/graphql';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  Email as EmailIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const drawerWidth = 240;

export default function DashboardPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  const { loading: productsLoading, error: productsError, data: productsData } = useQuery<ListProductsQuery>(LIST_PRODUCTS, {
    variables: { first: 10 },
  });

  const { loading: _userLoading, error: userError, data: userData } = useQuery<GetCurrentUserQuery>(GET_CURRENT_USER);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLogoutLoading(false);
    }
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Upfirst
        </Typography>
      </Toolbar>
      <List>
        <ListItem disablePadding>
          <ListItemButton selected data-testid="link-dashboard">
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/products')} data-testid="link-products">
            <ListItemIcon>
              <InventoryIcon />
            </ListItemIcon>
            <ListItemText primary="Products" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/orders')} data-testid="link-orders">
            <ListItemIcon>
              <ShoppingCartIcon />
            </ListItemIcon>
            <ListItemText primary="Orders" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/newsletter')} data-testid="link-newsletter">
            <ListItemIcon>
              <EmailIcon />
            </ListItemIcon>
            <ListItemText primary="Newsletter" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/campaigns')} data-testid="link-campaigns">
            <ListItemIcon>
              <CampaignIcon />
            </ListItemIcon>
            <ListItemText primary="Campaigns" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
            data-testid="button-menu"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Product Dashboard
          </Typography>
          {userData?.getCurrentUser ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">
                {userData.getCurrentUser.email}
              </Typography>
              <Button
                color="inherit"
                onClick={handleLogout}
                disabled={logoutLoading}
                startIcon={<LogoutIcon />}
                data-testid="button-logout"
              >
                {logoutLoading ? 'Logging out...' : 'Logout'}
              </Button>
            </Box>
          ) : (
            <Button
              color="inherit"
              href="/login"
              startIcon={<LoginIcon />}
              data-testid="link-login"
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        
        <Container maxWidth="xl">
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              Products
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Fetching data from GraphQL API at http://localhost:4000/graphql
            </Typography>
          </Box>

          {userError && (
            <Alert severity="info" sx={{ mb: 2 }}>
              User authentication: {userError.message}
            </Alert>
          )}

          {productsLoading && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}

          {productsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error loading products: {productsError.message}
            </Alert>
          )}

          {productsData?.listProducts && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Total Products: {productsData.listProducts.totalCount}
                </Typography>
              </Box>

              <Grid container spacing={3}>
                {productsData.listProducts.edges.map(({ node: product }) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="200"
                        image={product.image || 'https://via.placeholder.com/300x200?text=No+Image'}
                        alt={product.name}
                        sx={{ objectFit: 'cover' }}
                      />
                      <CardContent>
                        <Typography gutterBottom variant="h6" component="div">
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {product.description?.substring(0, 100)}
                          {product.description?.length > 100 ? '...' : ''}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                          <Chip label={product.category} size="small" color="primary" />
                          <Chip label={product.productType} size="small" />
                          {product.presentation?.badges?.map((badge: string, i: number) => (
                            <Chip key={i} label={badge} size="small" variant="outlined" />
                          ))}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h6" color="primary">
                            ${product.price}
                          </Typography>
                          <Chip
                            label={product.presentation?.availabilityText || product.status}
                            size="small"
                            color={product.presentation?.availableForPurchase ? 'success' : 'default'}
                          />
                        </Box>
                        
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Stock: {product.presentation?.stockQuantity || product.stock}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {!productsLoading && !productsError && (!productsData?.listProducts || productsData.listProducts.edges.length === 0) && (
            <Alert severity="info">
              No products found. The GraphQL API is working but returned no data.
            </Alert>
          )}
        </Container>
      </Box>
    </Box>
  );
}
