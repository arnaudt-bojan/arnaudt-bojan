'use client';

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardMedia,
  Slider,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  ArrowBack,
  ArrowForward,
  AutoAwesome,
  Send,
  Campaign,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const GET_PRODUCTS = gql`
  query GetProducts {
    listProducts(first: 100) {
      edges {
        node {
          id
          name
          description
          price
          image
        }
      }
    }
  }
`;

const GENERATE_AD_COPY = gql`
  mutation GenerateAdCopy($productId: ID!, $objective: String!) {
    generateAdCopy(productId: $productId, objective: $objective) {
      headline
      description
      cta
    }
  }
`;

const CREATE_CAMPAIGN = gql`
  mutation CreateCampaign($input: CreateCampaignInput!) {
    createCampaign(input: $input) {
      id
      name
      status
    }
  }
`;

const steps = [
  'Campaign Objective',
  'Product Selection',
  'AI Ad Copy',
  'Targeting & Budget',
  'Review & Launch',
];

const objectives = [
  { value: 'awareness', label: 'Awareness', description: 'Reach more people and increase brand awareness' },
  { value: 'traffic', label: 'Traffic', description: 'Drive traffic to your website or store' },
  { value: 'engagement', label: 'Engagement', description: 'Get more post engagement and reactions' },
  { value: 'leads', label: 'Leads', description: 'Collect leads and build your audience' },
  { value: 'sales', label: 'Sales', description: 'Drive conversions and online sales' },
];

const ctaOptions = [
  'Shop Now',
  'Learn More',
  'Sign Up',
  'Get Quote',
  'Contact Us',
  'Download',
  'Book Now',
  'Subscribe',
];

const countries = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Italy',
];

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

export default function CreateAdCampaign() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);

  // Step 1: Objective
  const [objective, setObjective] = useState('');
  const [campaignName, setCampaignName] = useState('');

  // Step 2: Product
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Step 3: Ad Copy
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [cta, setCta] = useState('');
  const [generatingCopy, setGeneratingCopy] = useState(false);

  // Step 4: Targeting & Budget
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [ageRange, setAgeRange] = useState<number[]>([18, 65]);
  const [gender, setGender] = useState('all');
  const [interests, setInterests] = useState('');
  const [dailyBudget, setDailyBudget] = useState('10');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  const { data: productsData, loading: productsLoading } = useQuery(GET_PRODUCTS);
  const [generateAdCopy] = useMutation(GENERATE_AD_COPY);
  const [createCampaign] = useMutation(CREATE_CAMPAIGN);

  const products: Product[] = productsData?.listProducts?.edges?.map((edge: any) => edge.node) || [];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleGenerateAdCopy = async () => {
    if (!selectedProduct) return;

    setGeneratingCopy(true);
    try {
      const { data } = await generateAdCopy({
        variables: {
          productId: selectedProduct.id,
          objective,
        },
      });

      if (data?.generateAdCopy) {
        setHeadline(data.generateAdCopy.headline);
        setDescription(data.generateAdCopy.description);
        setCta(data.generateAdCopy.cta);
      }
    } catch (error) {
      console.error('Error generating ad copy:', error);
    } finally {
      setGeneratingCopy(false);
    }
  };

  const handleLaunchCampaign = async () => {
    try {
      await createCampaign({
        variables: {
          input: {
            name: campaignName,
            objective,
            productId: selectedProduct?.id,
            headline,
            description,
            cta,
            targetCountries,
            ageMin: ageRange[0],
            ageMax: ageRange[1],
            gender,
            interests: interests.split(',').map(i => i.trim()),
            dailyBudget: parseFloat(dailyBudget),
            startDate,
            endDate,
          },
        },
      });

      router.push('/meta-ads/dashboard');
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return objective && campaignName;
      case 1:
        return selectedProduct !== null;
      case 2:
        return headline && description && cta;
      case 3:
        return targetCountries.length > 0 && dailyBudget && parseFloat(dailyBudget) >= 5;
      default:
        return true;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Your Campaign Objective
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              What do you want to achieve with this campaign?
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {objectives.map((obj) => (
                <Grid xs={12} sm={6} key={obj.value}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: objective === obj.value ? '2px solid' : '1px solid',
                      borderColor: objective === obj.value ? 'primary.main' : 'divider',
                    }}
                    onClick={() => setObjective(obj.value)}
                    data-testid={`card-objective-${obj.value}`}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {obj.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {obj.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <TextField
              fullWidth
              label="Campaign Name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Summer Sale 2024"
              data-testid="input-campaign-name"
              sx={{ mt: 2 }}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Product to Promote
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose the product you want to advertise
            </Typography>

            {productsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {products.map((product) => (
                  <Grid xs={12} sm={6} md={4} key={product.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: selectedProduct?.id === product.id ? '2px solid' : '1px solid',
                        borderColor: selectedProduct?.id === product.id ? 'primary.main' : 'divider',
                      }}
                      onClick={() => setSelectedProduct(product)}
                      data-testid={`card-product-${product.id}`}
                    >
                      <CardMedia
                        component="img"
                        height="140"
                        image={product.image || 'https://via.placeholder.com/300x140'}
                        alt={product.name}
                      />
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {product.description?.substring(0, 80)}...
                        </Typography>
                        <Typography variant="h6" color="primary">
                          ${product.price}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              AI-Powered Ad Copy
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Generate optimized ad copy using AI, or write your own
            </Typography>

            <Button
              variant="contained"
              startIcon={<AutoAwesome />}
              onClick={handleGenerateAdCopy}
              disabled={generatingCopy || !selectedProduct}
              data-testid="button-generate-ad-copy"
              sx={{ mb: 3 }}
            >
              {generatingCopy ? 'Generating...' : 'Generate AI Ad Copy'}
            </Button>

            <Grid container spacing={3}>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Enter attention-grabbing headline"
                  multiline
                  rows={2}
                  data-testid="input-headline"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your product or offer"
                  multiline
                  rows={4}
                  data-testid="input-description"
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth>
                  <InputLabel>Call to Action</InputLabel>
                  <Select
                    value={cta}
                    label="Call to Action"
                    onChange={(e) => setCta(e.target.value)}
                    data-testid="select-cta"
                  >
                    {ctaOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Ad Preview
                  </Typography>
                  {selectedProduct && (
                    <Card sx={{ mt: 2 }}>
                      <CardMedia
                        component="img"
                        height="200"
                        image={selectedProduct.image || 'https://via.placeholder.com/300x200'}
                        alt={selectedProduct.name}
                      />
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {headline || 'Your headline here'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {description || 'Your description here'}
                        </Typography>
                        <Button variant="contained" fullWidth disabled>
                          {cta || 'Your CTA'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Targeting & Budget
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Define your target audience and set your budget
            </Typography>

            <Grid container spacing={3}>
              <Grid xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Target Countries</InputLabel>
                  <Select
                    multiple
                    value={targetCountries}
                    onChange={(e) => setTargetCountries(e.target.value as string[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                    data-testid="select-countries"
                  >
                    {countries.map((country) => (
                      <MenuItem key={country} value={country}>
                        {country}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography gutterBottom>Age Range: {ageRange[0]} - {ageRange[1]}</Typography>
                <Slider
                  value={ageRange}
                  onChange={(_, newValue) => setAgeRange(newValue as number[])}
                  valueLabelDisplay="auto"
                  min={18}
                  max={65}
                  data-testid="slider-age"
                  sx={{ mb: 3 }}
                />

                <FormControl component="fieldset" sx={{ mb: 3 }}>
                  <Typography gutterBottom>Gender</Typography>
                  <RadioGroup
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    data-testid="radio-gender"
                  >
                    <FormControlLabel value="all" control={<Radio />} label="All" />
                    <FormControlLabel value="male" control={<Radio />} label="Male" />
                    <FormControlLabel value="female" control={<Radio />} label="Female" />
                  </RadioGroup>
                </FormControl>

                <TextField
                  fullWidth
                  label="Interests (comma-separated)"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g., fashion, technology, fitness"
                  data-testid="input-interests"
                />
              </Grid>

              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Daily Budget"
                  type="number"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText="Minimum $5 per day"
                  data-testid="input-daily-budget"
                  sx={{ mb: 3 }}
                />

                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(date) => setStartDate(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: { mb: 2 },
                        'data-testid': 'input-start-date',
                      },
                    }}
                  />

                  <DatePicker
                    label="End Date (Optional)"
                    value={endDate}
                    onChange={(date) => setEndDate(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        'data-testid': 'input-end-date',
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Campaign
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Review all details before launching your campaign
            </Typography>

            <Grid container spacing={3}>
              <Grid xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Campaign Details
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">Campaign Name</Typography>
                    <Typography variant="body1" gutterBottom>{campaignName}</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Objective</Typography>
                    <Typography variant="body1" gutterBottom sx={{ textTransform: 'capitalize' }}>{objective}</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Product</Typography>
                    <Typography variant="body1" gutterBottom>{selectedProduct?.name}</Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Ad Content
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">Headline</Typography>
                    <Typography variant="body1" gutterBottom>{headline}</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Description</Typography>
                    <Typography variant="body1" gutterBottom>{description}</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>CTA</Typography>
                    <Typography variant="body1" gutterBottom>{cta}</Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Targeting
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">Countries</Typography>
                    <Typography variant="body1" gutterBottom>{targetCountries.join(', ')}</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Age Range</Typography>
                    <Typography variant="body1" gutterBottom>{ageRange[0]} - {ageRange[1]}</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Gender</Typography>
                    <Typography variant="body1" gutterBottom sx={{ textTransform: 'capitalize' }}>{gender}</Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Budget & Schedule
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">Daily Budget</Typography>
                    <Typography variant="body1" gutterBottom>${dailyBudget}</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Duration</Typography>
                    <Typography variant="body1" gutterBottom>
                      {startDate?.toLocaleDateString()} - {endDate ? endDate.toLocaleDateString() : 'Ongoing'}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/meta-ads/dashboard')}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          <Typography variant="h4" gutterBottom>
            Create Ad Campaign
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Launch your Facebook & Instagram advertising campaign
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }} data-testid="stepper-create-ad">
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper sx={{ p: 4, mb: 4 }}>
          {renderStepContent(activeStep)}
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBack />}
            data-testid="button-back"
          >
            Back
          </Button>

          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleLaunchCampaign}
              startIcon={<Send />}
              disabled={!isStepValid()}
              data-testid="button-launch-campaign"
            >
              Launch Campaign
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<ArrowForward />}
              disabled={!isStepValid()}
              data-testid="button-next"
            >
              Next
            </Button>
          )}
        </Box>
      </Container>
    </LocalizationProvider>
  );
}
