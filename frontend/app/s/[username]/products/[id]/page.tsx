'use client';

import { useState } from 'react';
import { useQuery, useMutation, ApolloError } from '@apollo/client';
import { GET_PRODUCT } from '@/lib/graphql/queries/products';
import { ADD_TO_CART } from '@/lib/graphql/mutations/cart';
import { GetProductQuery, AddToCartMutation } from '@/lib/generated/graphql';
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
import Grid2 from '@mui/material/Grid2';
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
import { useRouter, useParams } from 'next/navigation';

interface PageProps {
  params: {
    username: string;
    id: string;
  };
}

export default function ProductDetailPage(_props: PageProps) {
  const _router = useRouter();
  const params = useParams();
  const username = params?.username as string;
  const id = params?.id as string;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  const { data, loading, error } = useQuery<GetProductQuery>(GET_PRODUCT, {
    variables: { id },
    skip: !id,
  });

  const [addToCart, { loading: addingToCart }] = useMutation<AddToCartMutation>(ADD_TO_CART, {
    onCompleted: (data) => {
      if (data.addToCart.id) {
        alert('Product added to cart!');
      }
    },
    onError: (error: ApolloError) => {
      alert(`Error: ${error.message}`);
    },
  });

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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 4 }} />
        <Grid2 container spacing={4}>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <Skeleton variant="rectangular" width="100%" height={500} sx={{ borderRadius: 2 }} />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <Skeleton variant="text" width="80%" height={60} />
            <Skeleton variant="text" width="40%" height={40} sx={{ mt: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 4 }} />
          </Grid2>
        </Grid2>
      </Container>
    );
  }

  if (error || !data?.getProduct) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Product not found
        </Typography>
        <Link href={`/s/${username}`}>
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            sx={{ mt: 2 }}
          >
            Back to Storefront
          </Button>
        </Link>
      </Container>
    );
  }

  const product = data.getProduct;
  const images = product.images || [product.image];
  const displayImage = images[selectedImageIndex] || images[0];

  const _variants = null;
  const sizes: string[] = [];
  const colors: string[] = [];

  const isInStock = product.productType === 'in-stock' ? (product.stock || 0) > 0 : true;
  const stockLabel = product.productType === 'in-stock'
    ? isInStock
      ? `${product.stock} in stock`
      : 'Out of stock'
    : product.productType === 'pre-order'
    ? 'Pre-order'
    : 'Made to order';

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Link href={`/s/${username}`}>
        <Button
          variant="text"
          startIcon={<ArrowBack />}
          sx={{ mb: 3 }}
          data-testid="button-back"
        >
          Back to Storefront
        </Button>
      </Link>

      <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 4 }}>
        <Link href={`/s/${username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <MuiLink underline="hover" color="inherit" sx={{ cursor: 'pointer' }}>
            Home
          </MuiLink>
        </Link>
        {product.category && (
          <MuiLink underline="hover" color="inherit">
            {product.category}
          </MuiLink>
        )}
        <Typography color="text.primary">{product.name}</Typography>
      </Breadcrumbs>

      <Grid2 container spacing={6}>
        <Grid2 size={{ xs: 12, md: 6 }}>
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

          {images.length > 1 && (
            <Grid2 container spacing={2}>
              {images.map((img: string, index: number) => (
                <Grid2 size={{ xs: 3 }} key={index}>
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
                </Grid2>
              ))}
            </Grid2>
          )}
        </Grid2>

        <Grid2 size={{ xs: 12, md: 6 }}>
          <Chip
            label={product.productType?.replace('-', ' ').toUpperCase()}
            size="small"
            color="primary"
            sx={{ mb: 2 }}
          />

          <Typography variant="h3" component="h1" gutterBottom data-testid="text-product-name">
            {product.name}
          </Typography>

          {product.category && (
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {product.category}
            </Typography>
          )}

          <Box sx={{ my: 3 }}>
            <Typography variant="h4" component="div" fontWeight="bold" data-testid="text-product-price">
              ${parseFloat(product.price as string).toFixed(2)}
            </Typography>
          </Box>

          <Chip
            icon={isInStock ? <CheckCircle /> : <Error />}
            label={stockLabel}
            color={isInStock ? 'success' : 'error'}
            sx={{ mb: 3 }}
            data-testid="badge-stock-status"
          />

          <Typography variant="body1" paragraph sx={{ mt: 3 }} data-testid="text-product-description">
            {product.description}
          </Typography>

          <Divider sx={{ my: 3 }} />

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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Typography variant="body2" fontWeight="600">
              Quantity:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                data-testid="button-decrease-quantity"
              >
                <Remove />
              </IconButton>
              <TextField
                value={quantity}
                size="small"
                sx={{ width: 60 }}
                inputProps={{
                  style: { textAlign: 'center' },
                  readOnly: true,
                }}
                data-testid="input-quantity"
              />
              <IconButton
                size="small"
                onClick={() => handleQuantityChange(1)}
                data-testid="button-increase-quantity"
              >
                <Add />
              </IconButton>
            </Box>
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<ShoppingCart />}
            onClick={handleAddToCart}
            disabled={!isInStock || addingToCart}
            sx={{ mb: 2 }}
            data-testid="button-add-to-cart"
          >
            {addingToCart ? 'Adding...' : 'Add to Cart'}
          </Button>

          {!isInStock && product.productType === 'in-stock' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This product is currently out of stock. Please check back later.
            </Alert>
          )}

          <Divider sx={{ my: 3 }} />

          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ border: 'none', pl: 0 }}>
                  <Typography variant="body2" color="text.secondary">
                    Product Type
                  </Typography>
                </TableCell>
                <TableCell sx={{ border: 'none' }}>
                  <Typography variant="body2" fontWeight="600">
                    {product.productType?.replace('-', ' ').toUpperCase()}
                  </Typography>
                </TableCell>
              </TableRow>
              {product.category && (
                <TableRow>
                  <TableCell sx={{ border: 'none', pl: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                      Category
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ border: 'none' }}>
                    <Typography variant="body2" fontWeight="600">
                      {product.category}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {product.productType === 'in-stock' && product.stock !== undefined && (
                <TableRow>
                  <TableCell sx={{ border: 'none', pl: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                      Stock
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ border: 'none' }}>
                    <Typography variant="body2" fontWeight="600">
                      {product.stock} units
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Grid2>
      </Grid2>
    </Container>
  );
}
