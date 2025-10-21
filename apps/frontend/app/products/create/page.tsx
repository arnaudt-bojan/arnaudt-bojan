'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, gql } from '@/lib/apollo-client';
import { useForm, Controller } from 'react-hook-form';
import {
  Container,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Card,
  CardContent,
  FormHelperText,
  InputAdornment,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      description
      price
      category
      productType
      stock
      image
      images
    }
  }
`;

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  productType: string;
  stock: number;
  sku?: string;
  image: string;
  images?: string;
  shippingType?: string;
  flatShippingRate?: number;
}

const categories = [
  'Clothing',
  'Electronics',
  'Home & Garden',
  'Beauty & Personal Care',
  'Sports & Outdoors',
  'Books & Media',
  'Toys & Games',
  'Food & Beverages',
  'Jewelry & Accessories',
  'Other',
];

const productTypes = [
  { value: 'in-stock', label: 'In Stock' },
  { value: 'pre-order', label: 'Pre-Order' },
  { value: 'made-to-order', label: 'Made to Order' },
  { value: 'wholesale', label: 'Wholesale' },
];

const shippingTypes = [
  { value: 'flat-rate', label: 'Flat Rate' },
  { value: 'weight-based', label: 'Weight Based' },
  { value: 'free', label: 'Free Shipping' },
];

export default function CreateProductPage() {
  const router = useRouter();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      category: '',
      productType: 'in-stock',
      stock: 0,
      sku: '',
      image: '',
      images: '',
      shippingType: '',
      flatShippingRate: 0,
    },
  });

  const watchShippingType = watch('shippingType');

  const [createProduct, { loading }] = useMutation(CREATE_PRODUCT, {
    onCompleted: () => {
      setSnackbar({
        open: true,
        message: 'Product created successfully!',
        severity: 'success',
      });
      setTimeout(() => {
        router.push('/products');
      }, 1500);
    },
    onError: (error: { message: string }) => {
      console.error('Error creating product:', error);
      const errorMessage = error.message || 'Failed to create product';
      setErrorAlert(errorMessage);
      
      if (errorMessage.toLowerCase().includes('unique') || errorMessage.toLowerCase().includes('duplicate')) {
        setError('name', {
          type: 'manual',
          message: 'A product with this name already exists',
        });
      }
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    setErrorAlert(null);

    // Validate required fields
    if (!data.name.trim()) {
      setError('name', { type: 'manual', message: 'Name is required' });
      return;
    }
    if (!data.description.trim() || data.description.length < 10) {
      setError('description', {
        type: 'manual',
        message: 'Description must be at least 10 characters',
      });
      return;
    }
    if (data.price <= 0) {
      setError('price', { type: 'manual', message: 'Price must be greater than $0' });
      return;
    }
    if (!data.category) {
      setError('category', { type: 'manual', message: 'Category is required' });
      return;
    }
    if (!data.image.trim()) {
      setError('image', { type: 'manual', message: 'Main image URL is required' });
      return;
    }
    if (data.stock < 0) {
      setError('stock', { type: 'manual', message: 'Stock cannot be negative' });
      return;
    }

    // Parse additional images (comma-separated URLs)
    const imageUrls = data.images
      ? data.images.split(',').map((url) => url.trim()).filter(Boolean)
      : [];

    // Prepare input for GraphQL mutation
    const input: any = {
      name: data.name.trim(),
      description: data.description.trim(),
      price: parseFloat(data.price.toString()),
      category: data.category,
      productType: data.productType,
      stock: parseInt(data.stock.toString(), 10),
      image: data.image.trim(),
      images: imageUrls,
    };

    if (data.sku?.trim()) {
      input.sku = data.sku.trim();
    }

    if (data.shippingType) {
      input.shippingType = data.shippingType;
    }

    if (data.shippingType === 'flat-rate' && data.flatShippingRate) {
      input.flatShippingRate = parseFloat(data.flatShippingRate.toString());
    }

    try {
      await createProduct({ variables: { input } });
    } catch (err) {
      console.error('Mutation error:', err);
    }
  };

  const handleCancel = () => {
    router.push('/products');
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleCancel}
          sx={{ mb: 2 }}
          data-testid="button-back"
        >
          Back to Products
        </Button>
        <Typography variant="h4" gutterBottom data-testid="text-page-title">
          Create New Product
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add a new product to your catalog
        </Typography>
      </Box>

      {/* Error Alert */}
      {errorAlert && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorAlert(null)} data-testid="alert-error">
          {errorAlert}
        </Alert>
      )}

      {/* Form Card */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Product Details Section */}
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Product Details
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 300px' }}>
                  <Controller
                    name="name"
                    control={control}
                    rules={{
                      required: 'Name is required',
                      maxLength: { value: 200, message: 'Name cannot exceed 200 characters' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Product Name"
                        required
                        fullWidth
                        error={!!errors.name}
                        helperText={errors.name?.message}
                        inputProps={{ maxLength: 200, 'data-testid': 'input-name' }}
                      />
                    )}
                  />
                </Box>

                <Box sx={{ flex: '1 1 300px' }}>
                  <Controller
                    name="category"
                    control={control}
                    rules={{ required: 'Category is required' }}
                    render={({ field }) => (
                      <FormControl fullWidth required error={!!errors.category}>
                        <InputLabel id="category-label">Category</InputLabel>
                        <Select
                          {...field}
                          labelId="category-label"
                          label="Category"
                          inputProps={{ 'data-testid': 'select-category' }}
                        >
                          <MenuItem value="" data-testid="option-category-none">
                            <em>Select a category</em>
                          </MenuItem>
                          {categories.map((cat) => (
                            <MenuItem key={cat} value={cat} data-testid={`option-category-${cat}`}>
                              {cat}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.category && (
                          <FormHelperText>{errors.category.message}</FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Box>
              </Box>

              <Box>
                <Controller
                  name="description"
                  control={control}
                  rules={{
                    required: 'Description is required',
                    minLength: { value: 10, message: 'Description must be at least 10 characters' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description"
                      required
                      fullWidth
                      multiline
                      rows={4}
                      error={!!errors.description}
                      helperText={errors.description?.message}
                      inputProps={{ 'data-testid': 'input-description' }}
                    />
                  )}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Pricing & Inventory Section */}
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Pricing & Inventory
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 300px' }}>
                  <Controller
                    name="price"
                    control={control}
                    rules={{
                      required: 'Price is required',
                      min: { value: 0.01, message: 'Price must be at least $0.01' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Price"
                        required
                        fullWidth
                        type="number"
                        inputProps={{
                          step: '0.01',
                          min: '0.01',
                          'data-testid': 'input-price',
                        }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        error={!!errors.price}
                        helperText={errors.price?.message}
                      />
                    )}
                  />
                </Box>

                <Box sx={{ flex: '1 1 300px' }}>
                  <Controller
                    name="stock"
                    control={control}
                    rules={{
                      required: 'Stock quantity is required',
                      min: { value: 0, message: 'Stock cannot be negative' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Stock Quantity"
                        required
                        fullWidth
                        type="number"
                        inputProps={{
                          min: '0',
                          step: '1',
                          'data-testid': 'input-stock',
                        }}
                        error={!!errors.stock}
                        helperText={errors.stock?.message}
                      />
                    )}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 300px' }}>
                  <Controller
                    name="sku"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="SKU"
                        fullWidth
                        inputProps={{ 'data-testid': 'input-sku' }}
                        helperText="Optional product identifier"
                      />
                    )}
                  />
                </Box>

                <Box sx={{ flex: '1 1 300px' }}>
                  <Controller
                    name="productType"
                    control={control}
                    rules={{ required: 'Product type is required' }}
                    render={({ field }) => (
                      <FormControl fullWidth required error={!!errors.productType}>
                        <InputLabel id="product-type-label">Product Type</InputLabel>
                        <Select
                          {...field}
                          labelId="product-type-label"
                          label="Product Type"
                          inputProps={{ 'data-testid': 'select-product-type' }}
                        >
                          {productTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value} data-testid={`option-type-${type.value}`}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.productType && (
                          <FormHelperText>{errors.productType.message}</FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Images Section */}
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Images
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Controller
                  name="image"
                  control={control}
                  rules={{ required: 'Main image URL is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Main Image URL"
                      required
                      fullWidth
                      error={!!errors.image}
                      helperText={errors.image?.message || 'Enter the URL of the main product image'}
                      placeholder="https://example.com/image.jpg"
                      inputProps={{ 'data-testid': 'input-image' }}
                    />
                  )}
                />
              </Box>

              <Box>
                <Controller
                  name="images"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Additional Image URLs"
                      fullWidth
                      multiline
                      rows={2}
                      helperText="Enter additional image URLs separated by commas (optional)"
                      placeholder="https://example.com/image2.jpg, https://example.com/image3.jpg"
                      inputProps={{ 'data-testid': 'input-images' }}
                    />
                  )}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Shipping Section */}
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Shipping (Optional)
            </Typography>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 300px' }}>
                <Controller
                  name="shippingType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id="shipping-type-label">Shipping Type</InputLabel>
                      <Select
                        {...field}
                        labelId="shipping-type-label"
                        label="Shipping Type"
                        inputProps={{ 'data-testid': 'select-shipping-type' }}
                      >
                        <MenuItem value="" data-testid="option-shipping-none">
                          <em>None</em>
                        </MenuItem>
                        {shippingTypes.map((type) => (
                          <MenuItem key={type.value} value={type.value} data-testid={`option-shipping-${type.value}`}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              {watchShippingType === 'flat-rate' && (
                <Box sx={{ flex: '1 1 300px' }}>
                  <Controller
                    name="flatShippingRate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Flat Shipping Rate"
                        fullWidth
                        type="number"
                        inputProps={{
                          step: '0.01',
                          min: '0',
                          'data-testid': 'input-flat-shipping-rate',
                        }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        helperText="Enter the flat shipping rate for this product"
                      />
                    )}
                  />
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={loading || isSubmitting}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={loading || isSubmitting}
                data-testid="button-submit"
              >
                {loading ? 'Creating...' : 'Create Product'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          data-testid="alert-snackbar"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
