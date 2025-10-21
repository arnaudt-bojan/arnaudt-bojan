'use client';

import { useState } from 'react';
import { useQuery, useMutation, ApolloError } from '@/lib/apollo-client';
import { GET_PRODUCT } from '@/lib/graphql/queries/products';
import { ADD_TO_CART } from '@/lib/graphql/mutations/cart';
import {
  Container,
  Card,
  CardMedia,
  Typography,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Breadcrumbs,
  Link as MuiLink,
  Skeleton,
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Divider,
  Alert,
  FormControl,
  InputLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Remove,
  ShoppingCart,
  ArrowBack,
  NavigateNext,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: {
    username: string;
    id: string;
  };
}

// GraphQL Response Types
interface GetProductData {
  getProduct: any;
}

interface AddToCartData {
  addToCart: {
    success: boolean;
  };
}

export default function ProductDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { username, id } = params;

  // State
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  // GraphQL Query
  const { data, loading, error } = useQuery<GetProductData>(GET_PRODUCT, {
    variables: { id },
  });

  // GraphQL Mutation
  const [addToCart, { loading: addingToCart }] = useMutation<AddToCartData>(ADD_TO_CART, {
    onCompleted: (data) => {
      if (data.addToCart.success) {
        alert('Product added to cart!');
      }
    },
    onError: (error: ApolloError) => {
      alert(`Error: ${error.message}`);
    },
  });

  // Handlers
  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = () => {
    if (!data?.getProduct) return;

    const variantId = selectedSize && selectedColor
      ? `${selectedSize}-${selectedColor}`
      : selectedSize || selectedColor || undefined;

    addToCart({
      variables: {
        productId: id,
        quantity,
        variantId,
      },
    });
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 4 }} />
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton variant="rectangular" width="100%" height={500} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton variant="text" width="80%" height={60} />
            <Skeleton variant="text" width="40%" height={40} sx={{ mt: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 4 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  // Error or not found
  if (error || !data?.getProduct) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Product not found
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          component={Link}
          href={`/s/${username}`}
          sx={{ mt: 2 }}
        >
          Back to Storefront
        </Button>
      </Container>
    );
  }

  const product = data.getProduct;
  const images = product.images || [product.image];
  const displayImage = images[selectedImageIndex] || images[0];

  // Parse variants
  const variants = product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : null;
  const sizes = variants?.sizes || [];
  const colors = variants?.colors || [];

  // Stock status
  const isInStock = product.product_type === 'in-stock' ? (product.stock_quantity || 0) > 0 : true;
  const stockLabel = product.product_type === 'in-stock'
    ? isInStock
      ? `${product.stock_quantity} in stock`
      : 'Out of stock'
    : product.product_type === 'pre-order'
    ? 'Pre-order'
    : 'Made to order';

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Back Button */}
      <Button
        variant="text"
        startIcon={<ArrowBack />}
        component={Link}
        href={`/s/${username}`}
        sx={{ mb: 3 }}
        data-testid="button-back"
      >
        Back to Storefront
      </Button>

      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 4 }}>
        <MuiLink component={Link} href={`/s/${username}`} underline="hover" color="inherit">
          Home
        </MuiLink>
        {product.category && (
          <MuiLink underline="hover" color="inherit">
            {product.category}
          </MuiLink>
        )}
        <Typography color="text.primary">{product.name}</Typography>
      </Breadcrumbs>

      <Grid container spacing={6}>
        {/* Image Gallery */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ mb: 2, overflow: 'hidden' }}>
            <CardMedia
              component="img"
              image={displayImage}
              alt={product.name}
              sx={{
                width: '100%',
                aspectRatio: '1/1',
                objectFit: 'cover',
              }}
              data-testid="img-product-main"
            />
          </Card>

          {/* Thumbnails */}
          {images.length > 1 && (
            <Grid container spacing={2}>
              {images.map((img: string, index: number) => (
                <Grid size={{ xs: 3 }} key={index}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: selectedImageIndex === index ? '2px solid' : '2px solid transparent',
                      borderColor: 'primary.main',
                      overflow: 'hidden',
                    }}
                    onClick={() => setSelectedImageIndex(index)}
                    data-testid={`button-thumbnail-${index}`}
                  >
                    <CardMedia
                      component="img"
                      image={img}
                      alt={`${product.name} - ${index + 1}`}
                      sx={{
                        width: '100%',
                        aspectRatio: '1/1',
                        objectFit: 'cover',
                      }}
                    />
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>

        {/* Product Details */}
        <Grid size={{ xs: 12, md: 6 }}>
          {/* Product Type Badge */}
          <Chip
            label={product.product_type?.replace('-', ' ').toUpperCase()}
            size="small"
            color="primary"
            sx={{ mb: 2 }}
          />

          {/* Product Name */}
          <Typography variant="h3" component="h1" gutterBottom data-testid="text-product-name">
            {product.name}
          </Typography>

          {/* Category */}
          {product.category && (
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {product.category}
            </Typography>
          )}

          {/* Price */}
          <Box sx={{ my: 3 }}>
            <Typography variant="h4" component="div" fontWeight="bold" data-testid="text-product-price">
              ${parseFloat(product.price).toFixed(2)}
            </Typography>
            {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
              <Typography
                variant="h6"
                component="div"
                color="text.secondary"
                sx={{ textDecoration: 'line-through', mt: 1 }}
              >
                ${parseFloat(product.compare_at_price).toFixed(2)}
              </Typography>
            )}
          </Box>

          {/* Stock Status */}
          <Chip
            icon={isInStock ? <CheckCircle /> : <Error />}
            label={stockLabel}
            color={isInStock ? 'success' : 'error'}
            sx={{ mb: 3 }}
            data-testid="badge-stock-status"
          />

          {/* SKU */}
          {product.sku && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              SKU: {product.sku}
            </Typography>
          )}

          {/* Description */}
          <Typography variant="body1" paragraph sx={{ mt: 3 }} data-testid="text-product-description">
            {product.description}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* Variant Selectors */}
          {colors.length > 0 && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Color</InputLabel>
              <Select
                value={selectedColor}
                label="Color"
                onChange={(e) => setSelectedColor(e.target.value)}
                data-testid="select-variant-color"
              >
                {colors.map((color: string) => (
                  <MenuItem key={color} value={color}>
                    {color}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {sizes.length > 0 && (
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Size</InputLabel>
              <Select
                value={selectedSize}
                label="Size"
                onChange={(e) => setSelectedSize(e.target.value)}
                data-testid="select-variant-size"
              >
                {sizes.map((size: string) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Quantity Selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Typography variant="body1">Quantity:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                data-testid="button-decrease-quantity"
              >
                <Remove />
              </IconButton>
              <TextField
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, style: { textAlign: 'center' } }}
                sx={{ width: 80 }}
                data-testid="input-quantity"
              />
              <IconButton
                onClick={() => handleQuantityChange(1)}
                data-testid="button-increase-quantity"
              >
                <Add />
              </IconButton>
            </Box>
          </Box>

          {/* Add to Cart Button */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<ShoppingCart />}
            onClick={handleAddToCart}
            disabled={!isInStock || addingToCart}
            data-testid="button-add-to-cart"
            sx={{ py: 1.5 }}
          >
            {addingToCart ? 'Adding...' : 'Add to Cart'}
          </Button>

          {/* Seller Information */}
          {product.seller && (
            <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Seller Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sold by: <strong>{product.seller.displayName || product.seller.username}</strong>
              </Typography>
            </Box>
          )}

          {/* Product Specifications */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Specifications
            </Typography>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell component="th" scope="row">
                    Product Type
                  </TableCell>
                  <TableCell>{product.product_type}</TableCell>
                </TableRow>
                {product.sku && (
                  <TableRow>
                    <TableCell component="th" scope="row">
                      SKU
                    </TableCell>
                    <TableCell>{product.sku}</TableCell>
                  </TableRow>
                )}
                {product.category && (
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Category
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Grid>
      </Grid>

      {/* Related Products Section - Placeholder */}
      <Box sx={{ mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          Related Products
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          Related products will be displayed here
        </Alert>
      </Box>
    </Container>
  );
}
