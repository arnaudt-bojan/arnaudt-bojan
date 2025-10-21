'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  ArrowForward,
  ShoppingBag,
  Group as Users,
  Public as Globe,
  Bolt as Zap,
  Check,
  TrendingUp,
  Palette,
  Inventory as Package,
  CreditCard,
  BarChart,
  ExpandMore,
} from '@mui/icons-material';

export default function HomePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'pricing', label: 'Pricing' },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  const features = [
    {
      icon: ShoppingBag,
      title: 'Retail B2C Storefront',
      description: 'Launch your online store in minutes. Mobile-first design with AI-powered marketing and seamless checkout.',
    },
    {
      icon: Users,
      title: 'B2B Wholesale Platform',
      description: 'Manage wholesale buyers with MOQ, net payment terms, and bulk pricing. Like Joor, built for modern brands.',
    },
    {
      icon: Globe,
      title: 'Trade Quotations',
      description: 'Professional quotation system with Incoterms, multi-currency, and international trade compliance.',
    },
    {
      icon: Zap,
      title: 'AI Marketing',
      description: 'Run Meta Ads campaigns with AI optimization. Set budgets, target audiences, and track ROI automatically.',
    },
    {
      icon: Palette,
      title: 'Custom Branding',
      description: 'Your domain, your design. Branded emails, invoices, and storefront with no coding required.',
    },
    {
      icon: Package,
      title: 'Flexible Inventory',
      description: 'Sell pre-order, made-to-order, in-stock, or wholesale. Two-part payments for any business model.',
    },
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Sign Up & Setup',
      description: 'Create your account and customize your storefront in minutes. No technical skills needed.',
    },
    {
      step: '2',
      title: 'Add Products',
      description: 'Upload your catalog with images, descriptions, and pricing. Set MOQ and wholesale rules.',
    },
    {
      step: '3',
      title: 'Launch & Sell',
      description: 'Connect your domain, enable payments, and start selling. AI marketing tools help you grow.',
    },
    {
      step: '4',
      title: 'Scale Globally',
      description: 'Expand with wholesale buyers and trade quotations. Multi-currency and international shipping.',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Fashion Designer',
      text: 'Upfirst helped me launch my pre-order collection in 24 hours. The two-part payment feature is game-changing.',
      rating: 5,
    },
    {
      name: 'Marcus Johnson',
      role: 'Wholesale Distributor',
      text: 'Finally, a B2B platform that understands wholesale. MOQ, net terms, and bulk pricing all in one place.',
      rating: 5,
    },
    {
      name: 'Elena Rodriguez',
      role: 'Startup Founder',
      text: 'The AI marketing tools helped us reach customers we never thought possible. ROI has been incredible.',
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      features: [
        'Retail B2C Storefront',
        'Up to 100 products',
        'Basic analytics',
        'Email support',
        'Custom domain',
      ],
      cta: 'Start Free Trial',
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/month',
      features: [
        'All Starter features',
        'B2B Wholesale Platform',
        'Unlimited products',
        'AI Marketing Tools',
        'Priority support',
        'Advanced analytics',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      features: [
        'All Professional features',
        'Trade Quotations',
        'White-label solution',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
      ],
      cta: 'Contact Sales',
    },
  ];

  const faqs = [
    {
      question: 'Do I get access to all three platforms?',
      answer: 'Yes! Professional and Enterprise plans include access to all three platforms: Retail B2C, B2B Wholesale, and Trade Quotations.',
    },
    {
      question: 'Is there a free trial?',
      answer: 'Absolutely! We offer a 30-day free trial on all plans. No credit card required to start.',
    },
    {
      question: 'How do payments work?',
      answer: 'We use Stripe Connect for secure payment processing. You get paid directly to your bank account.',
    },
    {
      question: 'How long does setup take?',
      answer: 'Most sellers are up and running within 24 hours. The Retail B2C platform can be launched in minutes.',
    },
  ];

  return (
    <>
      {/* Navigation Header */}
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', flexGrow: isMobile ? 1 : 0 }}>
            <Zap sx={{ mr: 1 }} />
            <Typography variant="h6" component="div" fontWeight="bold">
              Upfirst
            </Typography>
          </Link>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, ml: 4 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  data-testid={`button-nav-${item.id}`}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {!isMobile ? (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                component={Link}
                href="/login"
                variant="text"
                data-testid="button-sign-in"
              >
                Sign In
              </Button>
              <Button
                component={Link}
                href="/login"
                variant="contained"
                endIcon={<ArrowForward />}
                data-testid="button-get-started"
              >
                Get Started
              </Button>
            </Box>
          ) : (
            <IconButton
              edge="end"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Menu Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      >
        <Box sx={{ width: 250, pt: 2 }}>
          <List>
            {navigationItems.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton onClick={() => scrollToSection(item.id)}>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/login">
                <ListItemText primary="Sign In" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/login">
                <ListItemText primary="Get Started" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" data-testid="section-hero">
            <Typography
              variant="h1"
              component="h1"
              gutterBottom
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                fontWeight: 800,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.info.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Three Platforms. One Ecosystem.
            </Typography>
            <Typography
              variant="h4"
              color="text.secondary"
              paragraph
              sx={{ maxWidth: 800, mx: 'auto', mb: 4, fontSize: { xs: '1.25rem', md: '1.5rem' } }}
            >
              Launch your Retail B2C store, scale with B2B Wholesale, and expand globally with Trade Quotations—all in one place.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/login"
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                data-testid="button-hero-start-trial"
                sx={{ px: 4, py: 1.5 }}
              >
                Start Free Trial
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => scrollToSection('how-it-works')}
                data-testid="button-hero-learn-more"
                sx={{ px: 4, py: 1.5 }}
              >
                Learn More
              </Button>
            </Box>
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Chip label="30-Day Free Trial" color="success" />
              <Chip label="No Credit Card Required" color="info" />
              <Chip label="Cancel Anytime" variant="outlined" />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }} id="features">
        <Box textAlign="center" mb={6}>
          <Typography variant="h2" component="h2" gutterBottom fontWeight="bold">
            Everything You Need to Sell Online
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
            From retail storefronts to wholesale management and trade quotations—built for modern commerce.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 4,
                  },
                }}
                data-testid={`card-feature-${index}`}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      mb: 2,
                    }}
                  >
                    <feature.icon sx={{ fontSize: 32, color: 'primary.main' }} />
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom fontWeight="bold">
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ bgcolor: 'background.paper', py: { xs: 8, md: 12 } }} id="how-it-works">
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography variant="h2" component="h2" gutterBottom fontWeight="bold">
              How It Works
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
              Get started in minutes and scale to global commerce
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {howItWorks.map((step, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                <Box textAlign="center" data-testid={`step-${index}`}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      mx: 'auto',
                      mb: 2,
                      fontSize: '2rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {step.step}
                  </Box>
                  <Typography variant="h6" component="h4" gutterBottom fontWeight="bold">
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }} id="testimonials">
        <Box textAlign="center" mb={6}>
          <Typography variant="h2" component="h2" gutterBottom fontWeight="bold">
            What Our Customers Say
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
            Join thousands of sellers growing their business with Upfirst
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid size={{ xs: 12, md: 4 }} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                data-testid={`card-testimonial-${index}`}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Box key={i} component="span" sx={{ color: 'warning.main', fontSize: '1.25rem' }}>
                        ★
                      </Box>
                    ))}
                  </Box>
                  <Typography variant="body1" paragraph>
                    &quot;{testimonial.text}&quot;
                  </Typography>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {testimonial.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {testimonial.role}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Pricing Section */}
      <Box sx={{ bgcolor: 'background.paper', py: { xs: 8, md: 12 } }} id="pricing">
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography variant="h2" component="h2" gutterBottom fontWeight="bold">
              Simple, Transparent Pricing
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
              Choose the plan that&apos;s right for your business
            </Typography>
          </Box>

          <Grid container spacing={4} justifyContent="center">
            {pricingPlans.map((plan, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: plan.highlighted ? 2 : 1,
                    borderColor: plan.highlighted ? 'primary.main' : 'divider',
                    position: 'relative',
                  }}
                  data-testid={`card-pricing-${index}`}
                >
                  {plan.highlighted && (
                    <Chip
                      label="Most Popular"
                      color="primary"
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1, pt: plan.highlighted ? 4 : 2 }}>
                    <Typography variant="h5" component="h3" gutterBottom fontWeight="bold" textAlign="center">
                      {plan.name}
                    </Typography>
                    <Box textAlign="center" mb={3}>
                      <Typography variant="h3" component="span" fontWeight="bold">
                        {plan.price}
                      </Typography>
                      <Typography variant="h6" component="span" color="text.secondary">
                        {plan.period}
                      </Typography>
                    </Box>
                    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                      {plan.features.map((feature, i) => (
                        <Box component="li" key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <Check sx={{ color: 'success.main', fontSize: 20 }} />
                          <Typography variant="body2">{feature}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      component={Link}
                      href="/login"
                      variant={plan.highlighted ? 'contained' : 'outlined'}
                      fullWidth
                      size="large"
                      data-testid={`button-pricing-${index}`}
                    >
                      {plan.cta}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Box textAlign="center" mb={6}>
          <Typography variant="h2" component="h2" gutterBottom fontWeight="bold">
            Frequently Asked Questions
          </Typography>
        </Box>

        {faqs.map((faq, index) => (
          <Accordion key={index} data-testid={`accordion-faq-${index}`}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" fontWeight="medium">
                {faq.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" color="text.secondary">
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>

      {/* Final CTA Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
          color: 'primary.contrastText',
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography variant="h2" component="h2" gutterBottom fontWeight="bold">
              Ready to Start Selling?
            </Typography>
            <Typography variant="h5" paragraph sx={{ opacity: 0.9 }}>
              Join thousands of sellers already growing with Upfirst
            </Typography>
            <Button
              component={Link}
              href="/login"
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'background.paper',
                color: 'primary.main',
                px: 6,
                py: 2,
                fontSize: '1.125rem',
                '&:hover': {
                  bgcolor: 'background.default',
                },
              }}
              endIcon={<ArrowForward />}
              data-testid="button-final-cta"
            >
              Start Your Free Trial
            </Button>
            <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
              No credit card required • 30-day free trial • Cancel anytime
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: 'background.paper', py: 4, borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              © 2025 Upfirst. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}
