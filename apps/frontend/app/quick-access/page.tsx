'use client';

import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Search,
  Add,
  Inventory,
  ShoppingCart,
  Visibility,
  Edit,
  Email,
  Receipt,
  TrendingUp,
  Star,
  History,
  Keyboard,
  ShoppingBag,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
}

interface FavoriteProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
}

interface RecentActivity {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'product' | 'order' | 'customer';
}

interface KeyboardShortcut {
  keys: string;
  description: string;
}

export default function QuickAccessPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const quickActions: QuickAction[] = [
    {
      id: '1',
      icon: <Add />,
      title: 'Create Product',
      description: 'Add a new product to your catalog',
      href: '/products/create',
      color: '#4caf50',
    },
    {
      id: '2',
      icon: <Receipt />,
      title: 'Create Quotation',
      description: 'Generate a new quotation',
      href: '/trade/quotations/new',
      color: '#2196f3',
    },
    {
      id: '3',
      icon: <Email />,
      title: 'Send Newsletter',
      description: 'Create and send newsletter campaign',
      href: '/newsletter',
      color: '#ff9800',
    },
    {
      id: '4',
      icon: <ShoppingCart />,
      title: 'View Pending Orders',
      description: 'See all pending orders',
      href: '/orders?status=pending',
      color: '#f44336',
    },
    {
      id: '5',
      icon: <TrendingUp />,
      title: 'View Analytics',
      description: 'Check your store performance',
      href: '/analytics',
      color: '#9c27b0',
    },
    {
      id: '6',
      icon: <ShoppingBag />,
      title: 'Manage Products',
      description: 'View and edit all products',
      href: '/products',
      color: '#00bcd4',
    },
  ];

  const favoriteProducts: FavoriteProduct[] = [
    {
      id: '1',
      name: 'Premium Headphones',
      price: 299.99,
      stock: 45,
      image: 'https://via.placeholder.com/150',
    },
    {
      id: '2',
      name: 'Wireless Mouse',
      price: 49.99,
      stock: 120,
      image: 'https://via.placeholder.com/150',
    },
    {
      id: '3',
      name: 'USB-C Cable',
      price: 19.99,
      stock: 8,
      image: 'https://via.placeholder.com/150',
    },
    {
      id: '4',
      name: 'Laptop Stand',
      price: 89.99,
      stock: 32,
      image: 'https://via.placeholder.com/150',
    },
  ];

  const recentActivity: RecentActivity[] = [
    {
      id: '1',
      action: 'Created product',
      target: 'Premium Headphones',
      timestamp: '2 minutes ago',
      type: 'product',
    },
    {
      id: '2',
      action: 'Processed order',
      target: 'Order #12345',
      timestamp: '15 minutes ago',
      type: 'order',
    },
    {
      id: '3',
      action: 'Updated product',
      target: 'Wireless Mouse',
      timestamp: '1 hour ago',
      type: 'product',
    },
    {
      id: '4',
      action: 'Sent quotation',
      target: 'Quote #QT-001',
      timestamp: '2 hours ago',
      type: 'order',
    },
    {
      id: '5',
      action: 'Created customer',
      target: 'John Smith',
      timestamp: '3 hours ago',
      type: 'customer',
    },
  ];

  const keyboardShortcuts: KeyboardShortcut[] = [
    { keys: 'Cmd/Ctrl + K', description: 'Open universal search' },
    { keys: 'Cmd/Ctrl + N', description: 'Create new product' },
    { keys: 'Cmd/Ctrl + O', description: 'View orders' },
    { keys: 'Cmd/Ctrl + P', description: 'View products' },
    { keys: 'Cmd/Ctrl + S', description: 'Open settings' },
    { keys: 'Cmd/Ctrl + /', description: 'Show keyboard shortcuts' },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      // Mock search results
      setSearchResults([
        { id: '1', type: 'product', name: 'Premium Headphones', price: '$299.99' },
        { id: '2', type: 'order', name: 'Order #12345', status: 'Pending' },
        { id: '3', type: 'customer', name: 'John Doe', email: 'john@example.com' },
      ]);
    } else {
      setSearchResults([]);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'product':
        return <Inventory />;
      case 'order':
        return <ShoppingCart />;
      case 'customer':
        return <Star />;
      default:
        return <History />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Quick Access
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quick shortcuts and frequently used tools
          </Typography>
        </Box>
        <Button component={Link} href="/dashboard" variant="outlined">
          Back to Dashboard
        </Button>
      </Box>

      {/* Universal Search */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search products, orders, customers..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Chip label="Cmd+K" size="small" />
              </InputAdornment>
            ),
          }}
          data-testid="input-universal-search"
        />
        
        {searchResults.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Search Results
            </Typography>
            <List>
              {searchResults.map((result) => (
                <ListItem
                  key={result.id}
                  secondaryAction={
                    <Button size="small">View</Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar>
                      {result.type === 'product' ? <Inventory /> : result.type === 'order' ? <ShoppingCart /> : <Star />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={result.name}
                    secondary={`Type: ${result.type}`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Quick Actions Panel */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2} data-testid="panel-quick-actions">
              {quickActions.map((action) => (
                <Grid item xs={12} sm={6} md={4} key={action.id}>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3,
                      },
                    }}
                    onClick={() => router.push(action.href)}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: action.color,
                          color: 'white',
                          mb: 2,
                        }}
                      >
                        {action.icon}
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {action.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {action.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Keyboard Shortcuts */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Keyboard sx={{ mr: 1 }} />
              <Typography variant="h6">
                Keyboard Shortcuts
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Keys</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {keyboardShortcuts.map((shortcut, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip label={shortcut.keys} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{shortcut.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Favorite Products */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Favorite Products
            </Typography>
            <Grid container spacing={2} data-testid="grid-favorite-products">
              {favoriteProducts.map((product) => (
                <Grid item xs={12} key={product.id}>
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box
                          component="img"
                          src={product.image}
                          sx={{ width: 60, height: 60, borderRadius: 1, objectFit: 'cover' }}
                        />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" noWrap>
                            {product.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ${product.price}
                          </Typography>
                          <Chip
                            label={`Stock: ${product.stock}`}
                            size="small"
                            color={product.stock < 20 ? 'error' : 'success'}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ p: 1, pt: 0 }}>
                      <IconButton size="small">
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton size="small">
                        <Edit fontSize="small" />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Recent Activity */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List dense data-testid="list-recent-activity">
              {recentActivity.map((activity, index) => (
                <Box key={activity.id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        {getActivityIcon(activity.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2">
                          <strong>{activity.action}</strong> {activity.target}
                        </Typography>
                      }
                      secondary={activity.timestamp}
                    />
                  </ListItem>
                  {index < recentActivity.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
