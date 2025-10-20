'use client';

import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Alert,
} from '@mui/material';
import { ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CREATE_WHOLESALE_PRODUCT = gql`
  mutation CreateWholesaleProduct($input: CreateWholesaleProductInput!) {
    createWholesaleProduct(input: $input) {
      id
      name
    }
  }
`;

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

  const handleChange = (field: string) => (e: any) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const input = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      wholesalePrice: parseFloat(formData.wholesalePrice) * 100, // Convert to cents
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
    <Container maxWidth="md" sx={{ py: 4 }} data-testid="page-create-wholesale-product">
      {/* Header */}
      <Box mb={4}>
        <Button
          startIcon={<ArrowLeft />}
          onClick={() => router.push('/wholesale/products')}
          sx={{ mb: 2 }}
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
            <Grid item xs={12}>
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
            <Grid item xs={12}>
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={handleChange('category')}
                  label="Category"
                  data-testid="select-category"
                >
                  <MenuItem value="Apparel">Apparel</MenuItem>
                  <MenuItem value="Electronics">Electronics</MenuItem>
                  <MenuItem value="Home & Garden">Home & Garden</MenuItem>
                  <MenuItem value="Beauty">Beauty</MenuItem>
                  <MenuItem value="Sports">Sports</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Wholesale Price */}
            <Grid item xs={12} md={6}>
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
                inputProps={{ min: 0, step: 0.01 }}
                data-testid="input-wholesalePrice"
              />
            </Grid>

            {/* MOQ */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Minimum Order Quantity (MOQ)"
                value={formData.moq}
                onChange={handleChange('moq')}
                inputProps={{ min: 1 }}
                helperText="Minimum units buyers must purchase"
                data-testid="input-moq"
              />
            </Grid>

            {/* Stock */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Stock Quantity"
                value={formData.stock}
                onChange={handleChange('stock')}
                inputProps={{ min: 0 }}
                data-testid="input-stock"
              />
            </Grid>

            {/* Deposit Checkbox */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.requiresDeposit}
                    onChange={handleChange('requiresDeposit')}
                    data-testid="checkbox-requiresDeposit"
                  />
                }
                label="Require Deposit Payment"
              />
            </Grid>

            {/* Deposit Percentage */}
            {formData.requiresDeposit && (
              <Grid item xs={12} md={6}>
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
                  inputProps={{ min: 1, max: 100 }}
                  helperText="Percentage of total required as deposit"
                  data-testid="input-depositPercentage"
                />
              </Grid>
            )}

            {/* Payment Terms */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Terms</InputLabel>
                <Select
                  value={formData.paymentTerms}
                  onChange={handleChange('paymentTerms')}
                  label="Payment Terms"
                  data-testid="select-paymentTerms"
                >
                  <MenuItem value="NET_30">Net 30</MenuItem>
                  <MenuItem value="NET_60">Net 60</MenuItem>
                  <MenuItem value="NET_90">Net 90</MenuItem>
                  <MenuItem value="IMMEDIATE">Immediate</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => router.push('/wholesale/products')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={!isFormValid || loading}
                  data-testid="button-submit"
                >
                  {loading ? 'Creating...' : 'Create Product'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
