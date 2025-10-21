'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  Search,
  ChevronDown,
  BookOpen,
  Package,
  ShoppingCart,
  Users,
  FileText,
  CreditCard,
  Megaphone,
  Settings,
  Mail,
  MessageCircle,
  Clock,
  Play,
} from 'lucide-react';

const categories = [
  {
    name: 'Getting Started',
    slug: 'getting-started',
    icon: BookOpen,
    description: 'Account setup, first product, and making your first sale',
    articleCount: 12,
    topics: ['Account Setup', 'First Product', 'First Sale', 'Store Customization'],
  },
  {
    name: 'Products & Inventory',
    slug: 'products-inventory',
    icon: Package,
    description: 'Adding products, managing variants, and tracking stock',
    articleCount: 18,
    topics: ['Add Products', 'Variants', 'Stock Management', 'Bulk Upload'],
  },
  {
    name: 'Orders & Fulfillment',
    slug: 'orders-fulfillment',
    icon: ShoppingCart,
    description: 'Processing orders, shipping, and handling refunds',
    articleCount: 15,
    topics: ['Process Orders', 'Shipping', 'Refunds', 'Order Tracking'],
  },
  {
    name: 'Wholesale & B2B',
    slug: 'wholesale-b2b',
    icon: Users,
    description: 'Setting up wholesale, MOQ rules, and buyer invitations',
    articleCount: 10,
    topics: ['Wholesale Setup', 'MOQ', 'Invitations', 'Bulk Pricing'],
  },
  {
    name: 'Trade & Quotations',
    slug: 'trade-quotations',
    icon: FileText,
    description: 'Creating quotations, Incoterms, and buyer access',
    articleCount: 8,
    topics: ['Quotations', 'Incoterms', 'Buyer Portal', 'International Trade'],
  },
  {
    name: 'Payments & Billing',
    slug: 'payments-billing',
    icon: CreditCard,
    description: 'Stripe Connect, subscription plans, and payouts',
    articleCount: 14,
    topics: ['Stripe Setup', 'Subscriptions', 'Payouts', 'Transaction Fees'],
  },
  {
    name: 'Marketing & Ads',
    slug: 'marketing-ads',
    icon: Megaphone,
    description: 'Meta ads, newsletters, and campaign management',
    articleCount: 9,
    topics: ['Meta Ads', 'Newsletters', 'Campaigns', 'Analytics'],
  },
  {
    name: 'Settings & Account',
    slug: 'settings-account',
    icon: Settings,
    description: 'Store settings, team management, and API access',
    articleCount: 11,
    topics: ['Store Settings', 'Team', 'API', 'Security'],
  },
];

const featuredArticles = [
  {
    title: 'How to Set Up Your First Product',
    category: 'Getting Started',
    views: '15.2k',
    type: 'article',
  },
  {
    title: 'Understanding Wholesale vs. B2C',
    category: 'Wholesale & B2B',
    views: '12.8k',
    type: 'article',
  },
  {
    title: 'Creating Professional Quotations',
    category: 'Trade & Quotations',
    views: '9.5k',
    type: 'video',
  },
  {
    title: 'Setting Up Stripe Connect',
    category: 'Payments & Billing',
    views: '18.3k',
    type: 'article',
  },
];

const faqs = [
  {
    question: 'How do I start selling on Upfirst?',
    answer: 'To start selling, create an account, complete your seller profile, add your first product, connect your payment method via Stripe, and publish your store. You can start with B2C retail and add B2B wholesale or trade features later.',
  },
  {
    question: 'What are the fees for using Upfirst?',
    answer: 'Upfirst offers subscription plans starting at $29/month for the Starter plan. We also charge a small transaction fee on sales. Payment processing fees from Stripe apply separately. Check our pricing page for detailed information.',
  },
  {
    question: 'How do payouts work?',
    answer: 'Payouts are processed through Stripe Connect directly to your bank account. You can set your payout schedule (daily, weekly, or monthly) in your payment settings. Funds are typically available 2-7 business days after a sale, depending on your country and bank.',
  },
  {
    question: 'Can I use my own domain?',
    answer: 'Yes! All plans include custom domain support. You can connect your existing domain or purchase a new one. We provide step-by-step instructions in your store settings to help you set up your custom domain with your DNS provider.',
  },
  {
    question: "What's the difference between B2C, B2B, and Trade?",
    answer: 'B2C (Retail) is for selling directly to individual customers. B2B (Wholesale) is for selling in bulk to business buyers with features like MOQ, net payment terms, and bulk pricing. Trade is for international quotations with Incoterms and multi-currency support.',
  },
  {
    question: 'How do I accept wholesale orders?',
    answer: 'Enable the B2B Wholesale feature in your settings, set up wholesale pricing rules and MOQ (Minimum Order Quantity), then invite wholesale buyers. Buyers can register and place orders through your dedicated wholesale portal.',
  },
  {
    question: 'What is MOQ?',
    answer: 'MOQ stands for Minimum Order Quantity. It\'s the smallest number of units a buyer must purchase in a wholesale transaction. You can set different MOQ values for different products or buyer groups.',
  },
  {
    question: 'How do I create quotations?',
    answer: 'Navigate to Trade > Quotations > New Quotation. Select your products, set quantities and pricing, choose Incoterms, add payment terms, and send to your buyer. They can review and accept the quotation through a secure link.',
  },
  {
    question: 'Can I run ads from Upfirst?',
    answer: 'Yes! Our AI Marketing tools let you create and manage Meta (Facebook/Instagram) ad campaigns directly from your dashboard. Set your budget, target audience, and let our AI optimize for best results. Available on Professional and Enterprise plans.',
  },
  {
    question: 'How do I manage team members?',
    answer: 'Go to Settings > Team to invite team members. You can assign different roles (Admin, Manager, Staff) with specific permissions for products, orders, customers, and settings. Team management is available on Professional and Enterprise plans.',
  },
];

export default function HelpPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.info.main} 100%)`,
          color: 'primary.contrastText',
          py: { xs: 8, md: 12 },
          position: 'relative',
        }}
      >
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              fontWeight="bold"
              sx={{ mb: 2 }}
            >
              How can we help you?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              Search our knowledge base or browse categories below
            </Typography>
            
            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-help-search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'transparent',
                  },
                },
              }}
            />

            {/* Popular Topics */}
            <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Chip label="Getting Started" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              <Chip label="Stripe Setup" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              <Chip label="Wholesale" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              <Chip label="Shipping" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Help Categories */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 4 }}>
            Browse by Category
          </Typography>
          <Grid container spacing={3} data-testid="grid-help-categories">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={category.slug}>
                  <Card
                    data-testid={`card-category-${category.slug}`}
                    sx={{
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardActionArea sx={{ height: '100%' }}>
                      <CardContent>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 1.5,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                          }}
                        >
                          <IconComponent size={24} />
                        </Box>
                        <Typography variant="h6" gutterBottom fontWeight="bold">
                          {category.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {category.description}
                        </Typography>
                        <Chip
                          label={`${category.articleCount} articles`}
                          size="small"
                          variant="outlined"
                        />
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* Featured Articles */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 1 }}>
            Featured Articles
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Most popular and helpful resources
          </Typography>
          <Grid container spacing={2}>
            {featuredArticles.map((article, index) => (
              <Grid size={{ xs: 12, sm: 6 }} key={index}>
                <Paper
                  sx={{
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'box-shadow 0.2s',
                    '&:hover': {
                      boxShadow: 2,
                      cursor: 'pointer',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: article.type === 'video' ? 'error.main' : 'info.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {article.type === 'video' ? <Play size={20} /> : <FileText size={20} />}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1" fontWeight="medium" gutterBottom>
                      {article.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {article.category}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        • {article.views} views
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Contact Support */}
        <Paper sx={{ p: 4, mb: 8, bgcolor: 'background.paper' }}>
          <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 1 }}>
            Need More Help?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Our support team is here to assist you
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Mail size={28} />
                </Box>
                <Typography variant="h6" gutterBottom>
                  Email Support
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Get help from our support team
                </Typography>
                <Button
                  variant="outlined"
                  href="mailto:support@upfirst.com"
                  data-testid="button-contact-support"
                >
                  Contact Support
                </Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <MessageCircle size={28} />
                </Box>
                <Typography variant="h6" gutterBottom>
                  Live Chat
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Chat with us in real-time
                </Typography>
                <Button variant="outlined" disabled>
                  Coming Soon
                </Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: 'info.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Clock size={28} />
                </Box>
                <Typography variant="h6" gutterBottom>
                  Response Time
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  We typically respond within
                </Typography>
                <Typography variant="h6" color="primary">
                  24 hours
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* FAQ Section */}
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 1 }}>
            Frequently Asked Questions
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Quick answers to common questions
          </Typography>
          <Box data-testid="accordion-faq">
            {faqs.map((faq, index) => (
              <Accordion key={index}>
                <AccordionSummary
                  expandIcon={<ChevronDown size={20} />}
                  aria-controls={`faq-${index}-content`}
                  id={`faq-${index}-header`}
                >
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
          </Box>
        </Box>

        {/* Bottom CTA */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Still have questions?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Can't find the answer you're looking for? Reach out to our support team.
          </Typography>
          <Button
            component={Link}
            href="/"
            variant="text"
            sx={{ mr: 2 }}
          >
            Back to Home
          </Button>
          <Button
            variant="contained"
            href="mailto:support@upfirst.com"
          >
            Contact Support
          </Button>
        </Box>
      </Container>
    </>
  );
}
