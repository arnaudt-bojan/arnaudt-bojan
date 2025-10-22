'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { CREATE_WHOLESALE_PRODUCT } from '@/lib/graphql/wholesale';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { ArrowLeft, Save } from 'lucide-react';

export default function CreateWholesaleProduct() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    wholesalePrice: '',
    moq: '',
    stock: '',
    depositPercentage: '',
    paymentTerms: 'NET_30',
    requiresDeposit: false,
  });

  const [createProduct, { loading, error }] = useMutation(CREATE_WHOLESALE_PRODUCT, {
    onCompleted: () => {
      router.push('/wholesale/products');
    },
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = (e.target as HTMLInputElement).type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [field]: value });
  };

  const handleSelectChange = (field: string) => (e: { target: { value: string } }) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const input = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      wholesalePrice: parseFloat(formData.wholesalePrice) * 100,
      moq: parseInt(formData.moq),
      stock: parseInt(formData.stock),
      depositPercentage: formData.requiresDeposit ? parseFloat(formData.depositPercentage) : null,
      paymentTerms: formData.paymentTerms,
    };

    createProduct({ variables: { input } });
  };

  const isFormValid = 
    formData.name &&
    formData.description &&
    formData.category &&
    formData.wholesalePrice &&
    formData.moq &&
    formData.stock &&
    (!formData.requiresDeposit || formData.depositPercentage);

  return (
    <DashboardLayout>
      <Container maxWidth="md" sx={{ py: 4 }} data-testid="page-create-wholesale-product">
        {/* Header */}
        <Box mb={4}>
          <Button
            startIcon={<ArrowLeft />}
            onClick={() => router.push('/wholesale/products')}
            sx={{ mb: 2 }}
            data-testid="button-back"
          >
            Back to Products
          </Button>
          <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
            Create Wholesale Product
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Add a new product to your B2B wholesale catalog
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to create product. Please try again.
          </Alert>
        )}

        <Paper sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Name */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  required
                  label="Product Name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  data-testid="input-name"
                />
              </Grid>

              {/* Description */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={4}
                  label="Description"
                  value={formData.description}
                  onChange={handleChange('description')}
                  data-testid="input-description"
                />
              </Grid>

              {/* Category */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={handleSelectChange('category')}
                    label="Category"
                    data-testid="select-category"
                  >
                    <MenuItem value="Electronics">Electronics</MenuItem>
                    <MenuItem value="Clothing">Clothing</MenuItem>
                    <MenuItem value="Food & Beverage">Food & Beverage</MenuItem>
                    <MenuItem value="Home & Garden">Home & Garden</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Wholesale Price */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Wholesale Price"
                  value={formData.wholesalePrice}
                  onChange={handleChange('wholesalePrice')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  data-testid="input-wholesale-price"
                />
              </Grid>

              {/* MOQ */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Minimum Order Quantity (MOQ)"
                  value={formData.moq}
                  onChange={handleChange('moq')}
                  data-testid="input-moq"
                />
              </Grid>

              {/* Stock */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Stock Available"
                  value={formData.stock}
                  onChange={handleChange('stock')}
                  data-testid="input-stock"
                />
              </Grid>

              {/* Payment Terms */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Terms</InputLabel>
                  <Select
                    value={formData.paymentTerms}
                    onChange={handleSelectChange('paymentTerms')}
                    label="Payment Terms"
                    data-testid="select-payment-terms"
                  >
                    <MenuItem value="NET_30">Net 30</MenuItem>
                    <MenuItem value="NET_60">Net 60</MenuItem>
                    <MenuItem value="NET_90">Net 90</MenuItem>
                    <MenuItem value="IMMEDIATE">Immediate Payment</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Requires Deposit */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.requiresDeposit}
                      onChange={handleChange('requiresDeposit')}
                      data-testid="checkbox-requires-deposit"
                    />
                  }
                  label="Requires Deposit"
                />
              </Grid>

              {/* Deposit Percentage (conditional) */}
              {formData.requiresDeposit && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    label="Deposit Percentage"
                    value={formData.depositPercentage}
                    onChange={handleChange('depositPercentage')}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ min: 0, max: 100 }}
                    data-testid="input-deposit-percentage"
                  />
                </Grid>
              )}

              {/* Submit Button */}
              <Grid size={{ xs: 12 }}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => router.push('/wholesale/products')}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={!isFormValid || loading}
                    data-testid="button-save-product"
                  >
                    {loading ? 'Creating...' : 'Create Product'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </DashboardLayout>
  );
}
