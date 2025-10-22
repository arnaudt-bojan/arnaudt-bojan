'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@/lib/apollo-client';
import { GET_PRODUCT } from '@/lib/graphql/queries/products';
import { UPDATE_PRODUCT } from '@/lib/graphql/mutations/products';
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
  Skeleton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import DashboardLayout from '@/components/DashboardLayout';

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

export default function EditProductPage({ params }: { params: { id: string } }) {
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
    reset,
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

  interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    productType: string;
    stock: number;
    sku?: string;
    image: string;
    images?: string[];
    shippingType?: string;
    flatShippingRate?: number;
  }

  interface GetProductData {
    getProduct: Product;
  }

  const { data, loading: queryLoading, error: queryError } = useQuery<GetProductData>(GET_PRODUCT, {
    variables: { id: params.id },
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (data?.getProduct) {
      const product = data.getProduct;
      reset({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        category: product.category || '',
        productType: product.productType || 'in-stock',
        stock: product.stock || 0,
        sku: product.sku || '',
        image: product.image || '',
        images: Array.isArray(product.images) ? product.images.join(', ') : '',
        shippingType: product.shippingType || '',
        flatShippingRate: product.flatShippingRate || 0,
      });
    }
  }, [data, reset]);

  const [updateProduct, { loading: mutationLoading }] = useMutation(UPDATE_PRODUCT, {
    onCompleted: () => {
      setSnackbar({
        open: true,
        message: 'Product updated successfully!',
        severity: 'success',
      });
      setTimeout(() => {
        router.push('/products');
      }, 1500);
    },
    onError: (error: { message: string }) => {
      console.error('Error updating product:', error);
      const errorMessage = error.message || 'Failed to update product';
      setErrorAlert(errorMessage);
      
      if (errorMessage.toLowerCase().includes('unique') || errorMessage.toLowerCase().includes('duplicate')) {
        setError('name', {
          type: 'manual',
          message: 'A product with this name already exists',
        });
      }
    },
  });

  const onSubmit = async (formData: ProductFormData) => {
    setErrorAlert(null);

    if (!formData.name.trim()) {
      setError('name', { type: 'manual', message: 'Name is required' });
      return;
    }
    if (!formData.description.trim() || formData.description.length < 10) {
      setError('description', {
        type: 'manual',
        message: 'Description must be at least 10 characters',
      });
      return;
    }
    if (formData.price <= 0) {
      setError('price', { type: 'manual', message: 'Price must be greater than $0' });
      return;
    }
    if (!formData.category) {
      setError('category', { type: 'manual', message: 'Category is required' });
      return;
    }
    if (!formData.image.trim()) {
      setError('image', { type: 'manual', message: 'Main image URL is required' });
      return;
    }
    if (formData.stock < 0) {
      setError('stock', { type: 'manual', message: 'Stock cannot be negative' });
      return;
    }

    const imageUrls = formData.images
      ? formData.images.split(',').map((url) => url.trim()).filter(Boolean)
      : [];

    interface ProductUpdateInput {
      name: string;
      description: string;
      price: number;
      category: string;
      stock: number;
      image: string;
      images: string[];
    }

    const input: ProductUpdateInput = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price.toString()),
      category: formData.category,
      stock: parseInt(formData.stock.toString(), 10),
      image: formData.image.trim(),
      images: imageUrls,
    };

    try {
      await updateProduct({ 
        variables: { 
          id: params.id,
          input 
        } 
      });
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

  if (queryLoading) {
    return (
      <DashboardLayout title="Edit Product">
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ mb: 4 }}>
            <Skeleton variant="text" width={200} height={40} />
            <Skeleton variant="text" width={300} height={60} />
          </Box>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Skeleton variant="rectangular" height={400} />
            </CardContent>
          </Card>
        </Container>
      </DashboardLayout>
    );
  }

  if (queryError || !data?.getProduct) {
    return (
      <DashboardLayout title="Edit Product">
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleCancel}
            sx={{ mb: 2 }}
            data-testid="button-back"
          >
            Back to Products
          </Button>
          <Alert severity="error" data-testid="alert-error">
            {queryError ? queryError.message : 'Product not found'}
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  const loading = mutationLoading;

  return (
    <DashboardLayout title="Edit Product">
      <Container maxWidth="lg" sx={{ py: 4 }}>
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
            Edit Product
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update product information
          </Typography>
        </Box>

        {errorAlert && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorAlert(null)} data-testid="alert-error">
            {errorAlert}
          </Alert>
        )}

        <Card>
          <CardContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit(onSubmit)}>
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
                  {loading ? 'Updating...' : 'Update Product'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>

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
    </DashboardLayout>
  );
}
