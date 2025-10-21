'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Alert,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
} from '@mui/material';
import { Menu as MenuIcon, ArrowLeft, AlertCircle } from 'lucide-react';

const sections = [
  { id: 'acceptance', title: 'Acceptance of Terms' },
  { id: 'description', title: 'Description of Service' },
  { id: 'user-accounts', title: 'User Accounts' },
  { id: 'seller-obligations', title: 'Seller Obligations' },
  { id: 'prohibited-activities', title: 'Prohibited Activities' },
  { id: 'fees-payments', title: 'Fees and Payments' },
  { id: 'intellectual-property', title: 'Intellectual Property' },
  { id: 'data-privacy', title: 'Data and Privacy' },
  { id: 'third-party', title: 'Third-Party Services' },
  { id: 'limitation-liability', title: 'Limitation of Liability' },
  { id: 'indemnification', title: 'Indemnification' },
  { id: 'dispute-resolution', title: 'Dispute Resolution' },
  { id: 'termination', title: 'Termination' },
  { id: 'changes', title: 'Changes to Terms' },
  { id: 'contact', title: 'Contact Information' },
];

export default function TermsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setMobileMenuOpen(false);
    }
  };

  const TableOfContents = () => (
    <Paper
      sx={{
        p: 3,
        position: isMobile ? 'static' : 'sticky',
        top: 100,
        maxHeight: isMobile ? 'auto' : 'calc(100vh - 120px)',
        overflowY: 'auto',
      }}
      data-testid="nav-table-of-contents"
    >
      <Typography variant="h6" gutterBottom fontWeight="bold">
        Table of Contents
      </Typography>
      <List dense>
        {sections.map((section, index) => (
          <ListItem key={section.id} disablePadding>
            <ListItemButton
              onClick={() => scrollToSection(section.id)}
              sx={{ borderRadius: 1 }}
            >
              <ListItemText
                primary={`${index + 1}. ${section.title}`}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, cursor: 'pointer' }}>
              <ArrowLeft size={20} />
              <Typography variant="body2">Back to Home</Typography>
            </Box>
          </Link>
        </Box>

        <Box sx={{ display: 'flex', gap: 4, position: 'relative' }}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              onClick={() => setMobileMenuOpen(true)}
              sx={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                zIndex: 1000,
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              <MenuIcon size={24} />
            </IconButton>
          )}

          {/* Mobile Drawer */}
          {isMobile && (
            <Drawer
              anchor="right"
              open={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
            >
              <Box sx={{ width: 280, p: 2 }}>
                <TableOfContents />
              </Box>
            </Drawer>
          )}

          {/* Desktop TOC */}
          {!isMobile && (
            <Box sx={{ width: 280, flexShrink: 0 }}>
              <TableOfContents />
            </Box>
          )}

          {/* Main Content */}
          <Box sx={{ flexGrow: 1, maxWidth: isMobile ? '100%' : 'calc(100% - 312px)' }}>
            <Paper sx={{ p: { xs: 3, md: 5 } }}>
              {/* Document Header */}
              <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
                Terms of Service
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 1 }}
                data-testid="text-last-updated"
              >
                Last updated: October 20, 2025
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Effective date: October 20, 2025
              </Typography>

              {/* Important Notice Alert */}
              <Alert
                severity="warning"
                icon={<AlertCircle size={20} />}
                sx={{ mb: 4 }}
                data-testid="alert-important-notice"
              >
                <Typography variant="body2" fontWeight="medium">
                  Please read these Terms of Service carefully before using the Upfirst platform. By
                  accessing or using our service, you agree to be bound by these terms.
                </Typography>
              </Alert>

              <Divider sx={{ mb: 4 }} />

              {/* Section 1: Acceptance of Terms */}
              <Box id="acceptance" data-testid="section-1" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  1. Acceptance of Terms
                </Typography>
                <Typography variant="body1" paragraph>
                  By accessing and using Upfirst ("we," "our," or "the platform"), you accept and
                  agree to be bound by the terms and conditions of this agreement. If you do not agree
                  to these terms, you should not use our platform.
                </Typography>
                <Typography variant="body1" paragraph>
                  These Terms of Service ("Terms") constitute a legally binding agreement between you
                  and Upfirst Inc. Your continued use of the platform constitutes your acceptance of
                  these Terms and any modifications to them.
                </Typography>
              </Box>

              {/* Section 2: Description of Service */}
              <Box id="description" data-testid="section-2" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  2. Description of Service
                </Typography>
                <Typography variant="body1" paragraph>
                  Upfirst is a multi-seller e-commerce platform that provides tools and services for
                  online commerce. Our platform offers three integrated solutions:
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  B2C Retail Storefront
                </Typography>
                <Typography variant="body1" paragraph>
                  Create and manage online stores to sell products directly to individual consumers.
                  Features include customizable storefronts, product catalogs, shopping cart
                  functionality, and payment processing.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  B2B Wholesale Platform
                </Typography>
                <Typography variant="body1" paragraph>
                  Manage wholesale relationships with business buyers. Features include minimum order
                  quantities (MOQ), bulk pricing, net payment terms, buyer invitations, and wholesale
                  catalogs.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Trade Quotations System
                </Typography>
                <Typography variant="body1" paragraph>
                  Create professional quotations for international trade. Features include Incoterms,
                  multi-currency support, payment terms, and secure quotation sharing with potential
                  buyers.
                </Typography>
              </Box>

              {/* Section 3: User Accounts */}
              <Box id="user-accounts" data-testid="section-3" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  3. User Accounts
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Registration Requirements
                </Typography>
                <Typography variant="body1" paragraph>
                  To use certain features of our platform, you must create an account. You agree to:
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Provide accurate, current, and complete information during registration
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Maintain and promptly update your account information
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Be at least 18 years old or the age of majority in your jurisdiction
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Not have been previously banned from using Upfirst
                    </Typography>
                  </ListItem>
                </List>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Account Security
                </Typography>
                <Typography variant="body1" paragraph>
                  You are responsible for maintaining the confidentiality of your account credentials
                  and for all activities that occur under your account. You must:
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Use a strong, unique password
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Not share your password with others
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Notify us immediately of any unauthorized access or security breach
                    </Typography>
                  </ListItem>
                </List>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Account Termination
                </Typography>
                <Typography variant="body1" paragraph>
                  You may close your account at any time. We reserve the right to suspend or terminate
                  accounts that violate these Terms or engage in fraudulent, illegal, or harmful
                  activities.
                </Typography>
              </Box>

              {/* Section 4: Seller Obligations */}
              <Box id="seller-obligations" data-testid="section-4" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  4. Seller Obligations
                </Typography>
                <Typography variant="body1" paragraph>
                  As a seller on Upfirst, you agree to:
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Product Listing Accuracy
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Provide accurate and truthful product descriptions
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Use genuine product images that accurately represent the items
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Set fair and accurate pricing
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Maintain accurate inventory levels
                    </Typography>
                  </ListItem>
                </List>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Order Fulfillment
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Process and ship orders within your stated timeframe
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Package items securely to prevent damage during shipping
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Provide tracking information when available
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Honor your stated return and refund policies
                    </Typography>
                  </ListItem>
                </List>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Customer Service
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Respond to customer inquiries promptly and professionally
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Address customer complaints and issues in good faith
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Process returns and refunds according to your policies
                    </Typography>
                  </ListItem>
                </List>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Compliance with Laws
                </Typography>
                <Typography variant="body1" paragraph>
                  You must comply with all applicable laws and regulations, including but not limited
                  to consumer protection laws, tax obligations, import/export regulations, and product
                  safety requirements.
                </Typography>
              </Box>

              {/* Section 5: Prohibited Activities */}
              <Box id="prohibited-activities" data-testid="section-5" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  5. Prohibited Activities
                </Typography>
                <Typography variant="body1" paragraph>
                  You may not use our platform for any illegal or unauthorized purpose. Prohibited
                  activities include:
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Illegal Products and Services
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Selling illegal, prohibited, or restricted items
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Selling counterfeit or pirated products
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Selling stolen goods or items that infringe intellectual property rights
                    </Typography>
                  </ListItem>
                </List>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Fraudulent Activities
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Engaging in fraudulent transactions or payment disputes
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Creating fake accounts or impersonating others
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Manipulating reviews, ratings, or feedback
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Attempting to circumvent platform fees
                    </Typography>
                  </ListItem>
                </List>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Abusive Behavior
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Harassing, threatening, or abusing other users
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Posting offensive, discriminatory, or hateful content
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Spamming or sending unsolicited commercial messages
                    </Typography>
                  </ListItem>
                </List>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Platform Abuse
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Attempting to hack, disrupt, or compromise platform security
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Using automated systems (bots, scrapers) without authorization
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Reverse engineering or accessing the platform's source code
                    </Typography>
                  </ListItem>
                </List>
              </Box>

              {/* Section 6: Fees and Payments */}
              <Box id="fees-payments" data-testid="section-6" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  6. Fees and Payments
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Subscription Plans
                </Typography>
                <Typography variant="body1" paragraph>
                  Upfirst offers various subscription plans with different features and pricing. Fees
                  are charged on a recurring basis (monthly or annually) and are non-refundable except
                  as required by law or as explicitly stated in our refund policy.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Transaction Fees
                </Typography>
                <Typography variant="body1" paragraph>
                  In addition to subscription fees, we charge transaction fees on sales made through
                  the platform. Transaction fees are calculated as a percentage of the sale amount and
                  are automatically deducted from seller payouts.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Payment Processing (Stripe)
                </Typography>
                <Typography variant="body1" paragraph>
                  All payments are processed through Stripe. Stripe charges separate payment processing
                  fees. Sellers must create a Stripe Connect account to receive payouts. By using our
                  platform, you agree to Stripe's terms of service.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Refund Policy
                </Typography>
                <Typography variant="body1" paragraph>
                  Subscription fees are generally non-refundable. We may provide refunds on a
                  case-by-case basis for technical issues, billing errors, or service disruptions.
                  Contact our support team to request a refund.
                </Typography>
              </Box>

              {/* Section 7: Intellectual Property */}
              <Box id="intellectual-property" data-testid="section-7" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  7. Intellectual Property
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Platform Ownership
                </Typography>
                <Typography variant="body1" paragraph>
                  The Upfirst platform, including all software, designs, text, graphics, logos, and
                  trademarks, is owned by Upfirst Inc. and protected by intellectual property laws.
                  You may not copy, modify, distribute, or create derivative works without our express
                  written permission.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  User Content Rights
                </Typography>
                <Typography variant="body1" paragraph>
                  You retain ownership of content you upload to the platform (product images,
                  descriptions, etc.). By uploading content, you grant Upfirst a worldwide,
                  non-exclusive, royalty-free license to use, display, reproduce, and distribute your
                  content for the purpose of operating and promoting the platform.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Trademark Usage
                </Typography>
                <Typography variant="body1" paragraph>
                  You may not use Upfirst trademarks, logos, or branding without our prior written
                  consent. Any use of our trademarks must comply with our brand guidelines.
                </Typography>
              </Box>

              {/* Section 8: Data and Privacy */}
              <Box id="data-privacy" data-testid="section-8" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  8. Data and Privacy
                </Typography>
                <Typography variant="body1" paragraph>
                  Your use of Upfirst is subject to our Privacy Policy, which describes how we
                  collect, use, and protect your personal information. By using our platform, you
                  consent to our data practices as described in the Privacy Policy.
                </Typography>
                <Typography variant="body1" paragraph>
                  Sellers own the customer data collected through their stores, subject to applicable
                  privacy laws. Sellers are responsible for complying with data protection regulations
                  (such as GDPR, CCPA) when handling customer data.
                </Typography>
                <Typography variant="body1" paragraph>
                  Please review our{' '}
                  <Link
                    href="/privacy"
                    style={{ color: theme.palette.primary.main, textDecoration: 'none' }}
                  >
                    Privacy Policy
                  </Link>{' '}
                  for complete information about our data practices.
                </Typography>
              </Box>

              {/* Section 9: Third-Party Services */}
              <Box id="third-party" data-testid="section-9" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  9. Third-Party Services
                </Typography>
                <Typography variant="body1" paragraph>
                  Upfirst integrates with various third-party services to provide functionality:
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Stripe:</strong> Payment processing and payouts
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Shippo:</strong> Shipping labels and tracking
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Meta (Facebook/Instagram):</strong> Advertising campaigns
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Email Providers:</strong> Transactional and marketing emails
                    </Typography>
                  </ListItem>
                </List>
                <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                  Your use of these third-party services is subject to their respective terms of
                  service and privacy policies. We are not responsible for the practices of third-party
                  services.
                </Typography>
              </Box>

              {/* Section 10: Limitation of Liability */}
              <Box id="limitation-liability" data-testid="section-10" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  10. Limitation of Liability
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, UPFIRST SHALL NOT BE LIABLE FOR ANY
                    INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
                    PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA,
                    USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                  </strong>
                </Typography>
                <Typography variant="body1" paragraph>
                  Upfirst is a platform that facilitates transactions between sellers and buyers. We
                  are not responsible for:
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      The quality, safety, legality, or accuracy of products listed by sellers
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      The ability of sellers to complete transactions or deliver products
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Disputes between buyers and sellers
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Actions or omissions of third-party service providers
                    </Typography>
                  </ListItem>
                </List>
                <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                  Our total liability for any claims arising from your use of the platform shall not
                  exceed the amount you paid to Upfirst in the 12 months preceding the claim.
                </Typography>
              </Box>

              {/* Section 11: Indemnification */}
              <Box id="indemnification" data-testid="section-11" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  11. Indemnification
                </Typography>
                <Typography variant="body1" paragraph>
                  You agree to indemnify, defend, and hold harmless Upfirst, its officers, directors,
                  employees, and agents from and against any claims, liabilities, damages, losses, and
                  expenses, including reasonable attorneys' fees, arising out of or in any way
                  connected with:
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Your violation of these Terms
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Your violation of any law or the rights of a third party
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Products you sell through the platform
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Your use of third-party services
                    </Typography>
                  </ListItem>
                </List>
              </Box>

              {/* Section 12: Dispute Resolution */}
              <Box id="dispute-resolution" data-testid="section-12" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  12. Dispute Resolution
                </Typography>
                <Typography variant="body1" paragraph>
                  Buyers and sellers should first attempt to resolve disputes directly with each other.
                  Upfirst may provide mediation services to help resolve disputes, but we are not
                  obligated to do so.
                </Typography>
                <Typography variant="body1" paragraph>
                  For disputes with Upfirst, you agree to first contact us to attempt to resolve the
                  dispute informally. If we cannot resolve the dispute informally, both parties agree
                  to binding arbitration in accordance with the rules of the American Arbitration
                  Association, with arbitration to take place in San Francisco, California.
                </Typography>
                <Typography variant="body1" paragraph>
                  These Terms are governed by the laws of the State of California, without regard to
                  its conflict of law provisions.
                </Typography>
              </Box>

              {/* Section 13: Termination */}
              <Box id="termination" data-testid="section-13" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  13. Termination
                </Typography>
                <Typography variant="body1" paragraph>
                  We reserve the right to suspend or terminate your account and access to the platform
                  at any time, with or without notice, for:
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Violation of these Terms
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Fraudulent, illegal, or harmful activities
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Non-payment of fees
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Extended inactivity
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      Our business or legal requirements
                    </Typography>
                  </ListItem>
                </List>
                <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                  Upon termination, your right to use the platform ceases immediately. Sections of
                  these Terms that by their nature should survive termination shall survive, including
                  payment obligations, intellectual property provisions, disclaimer of warranties, and
                  limitation of liability.
                </Typography>
              </Box>

              {/* Section 14: Changes to Terms */}
              <Box id="changes" data-testid="section-14" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  14. Changes to These Terms
                </Typography>
                <Typography variant="body1" paragraph>
                  We reserve the right to modify these Terms at any time. We will notify you of
                  material changes by email and/or a prominent notice on our platform prior to the
                  changes taking effect.
                </Typography>
                <Typography variant="body1" paragraph>
                  Your continued use of the platform after changes to these Terms constitutes your
                  acceptance of the modified Terms. If you do not agree to the modified Terms, you must
                  stop using the platform and may close your account.
                </Typography>
                <Typography variant="body1" paragraph>
                  We encourage you to review these Terms periodically to stay informed of any updates.
                </Typography>
              </Box>

              {/* Section 15: Contact Information */}
              <Box id="contact" data-testid="section-15" sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  15. Contact Information
                </Typography>
                <Typography variant="body1" paragraph>
                  If you have questions about these Terms of Service, please contact us:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body1" paragraph>
                    <strong>Upfirst Legal Team</strong>
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Email:{' '}
                    <Link
                      href="mailto:legal@upfirst.com"
                      style={{ color: theme.palette.primary.main, textDecoration: 'none' }}
                    >
                      legal@upfirst.com
                    </Link>
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Address: Upfirst Inc., 123 Commerce Street, San Francisco, CA 94102, United
                    States
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Phone: +1 (415) 555-0123
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 4 }} />

              {/* Final Notice */}
              <Box sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  By using Upfirst, you acknowledge that you have read, understood, and agree to be
                  bound by these Terms of Service.
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
