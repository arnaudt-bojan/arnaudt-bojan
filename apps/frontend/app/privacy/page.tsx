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
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
} from '@mui/material';
import { Menu as MenuIcon, ArrowLeft } from 'lucide-react';

const sections = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'information-we-collect', title: 'Information We Collect' },
  { id: 'how-we-use', title: 'How We Use Your Information' },
  { id: 'information-sharing', title: 'Information Sharing' },
  { id: 'data-security', title: 'Data Security' },
  { id: 'your-rights', title: 'Your Rights' },
  { id: 'data-retention', title: 'Data Retention' },
  { id: 'international-transfers', title: 'International Data Transfers' },
  { id: 'children-privacy', title: "Children's Privacy" },
  { id: 'changes', title: 'Changes to Policy' },
  { id: 'contact', title: 'Contact Us' },
];

export default function PrivacyPage() {
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
                Privacy Policy
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

              <Divider sx={{ mb: 4 }} />

              {/* Section 1: Introduction */}
              <Box id="introduction" data-testid="section-introduction" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  1. Introduction
                </Typography>
                <Typography variant="body1" paragraph>
                  Welcome to Upfirst. We respect your privacy and are committed to protecting your
                  personal data. This privacy policy will inform you about how we look after your
                  personal data when you visit our platform and tell you about your privacy rights
                  and how the law protects you.
                </Typography>
                <Typography variant="body1" paragraph>
                  Upfirst operates a multi-seller e-commerce platform that enables sellers to
                  create online stores and sell products through B2C retail, B2B wholesale, and
                  international trade channels. This privacy policy applies to all users of the
                  platform, including sellers, buyers, and visitors.
                </Typography>
              </Box>

              {/* Section 2: Information We Collect */}
              <Box id="information-we-collect" data-testid="section-information-we-collect" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  2. Information We Collect
                </Typography>
                <Typography variant="body1" paragraph>
                  We collect several different types of information for various purposes to provide
                  and improve our service to you.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Account Information
                </Typography>
                <Typography variant="body1" paragraph>
                  When you create an account, we collect your name, email address, username,
                  password, and user type (seller or buyer). Sellers additionally provide business
                  information, tax identification numbers, and banking details for payment
                  processing.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Product Information
                </Typography>
                <Typography variant="body1" paragraph>
                  Sellers provide product listings including names, descriptions, images, pricing,
                  inventory levels, and shipping information. This data is displayed to potential
                  buyers on your storefront.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Customer Information
                </Typography>
                <Typography variant="body1" paragraph>
                  When buyers place orders, we collect shipping addresses, billing information,
                  order history, and communication preferences. This information is shared with the
                  relevant sellers to fulfill orders.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Usage Data
                </Typography>
                <Typography variant="body1" paragraph>
                  We automatically collect information about how you interact with our platform,
                  including IP addresses, browser types, pages visited, time spent on pages, and
                  referring websites. This helps us improve our services and user experience.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Cookies and Tracking Technologies
                </Typography>
                <Typography variant="body1" paragraph>
                  We use cookies, web beacons, and similar tracking technologies to track activity
                  on our platform and hold certain information. You can instruct your browser to
                  refuse all cookies or to indicate when a cookie is being sent.
                </Typography>
              </Box>

              {/* Section 3: How We Use Your Information */}
              <Box id="how-we-use" data-testid="section-how-we-use" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  3. How We Use Your Information
                </Typography>
                <Typography variant="body1" paragraph>
                  We use the collected data for various purposes:
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  To Provide and Maintain Our Service
                </Typography>
                <Typography variant="body1" paragraph>
                  We use your information to create and manage your account, process transactions,
                  fulfill orders, provide customer support, and deliver the core features of our
                  e-commerce platform.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  To Process Payments
                </Typography>
                <Typography variant="body1" paragraph>
                  We work with Stripe to process payments securely. Your payment information is
                  transmitted directly to Stripe and we do not store full credit card details on
                  our servers. We receive transaction information from Stripe to manage payouts to
                  sellers.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  For Marketing and Communications (With Consent)
                </Typography>
                <Typography variant="body1" paragraph>
                  With your explicit consent, we may send you newsletters, promotional materials,
                  and updates about our platform. You can opt out of marketing communications at
                  any time through your account settings or by clicking the unsubscribe link in our
                  emails.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  For Analytics and Improvements
                </Typography>
                <Typography variant="body1" paragraph>
                  We analyze usage patterns to understand how our platform is used, identify areas
                  for improvement, develop new features, and optimize the user experience.
                </Typography>
              </Box>

              {/* Section 4: Information Sharing */}
              <Box id="information-sharing" data-testid="section-information-sharing" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  4. Information Sharing
                </Typography>
                <Typography variant="body1" paragraph>
                  We may share your information with third parties in the following situations:
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Third-Party Service Providers
                </Typography>
                <Typography variant="body1" paragraph>
                  We work with trusted service providers to operate our platform:
                </Typography>
                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Stripe:</strong> Payment processing and payouts
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Shippo:</strong> Shipping label generation and tracking
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Meta (Facebook/Instagram):</strong> Advertising campaigns and
                      analytics
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Email Service Providers:</strong> Transactional and marketing emails
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Cloud Hosting:</strong> Data storage and platform infrastructure
                    </Typography>
                  </ListItem>
                </List>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Legal Requirements
                </Typography>
                <Typography variant="body1" paragraph>
                  We may disclose your information if required to do so by law or in response to
                  valid requests by public authorities (e.g., a court or government agency).
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Business Transfers
                </Typography>
                <Typography variant="body1" paragraph>
                  If Upfirst is involved in a merger, acquisition, or asset sale, your personal
                  data may be transferred. We will provide notice before your personal data is
                  transferred and becomes subject to a different privacy policy.
                </Typography>
              </Box>

              {/* Section 5: Data Security */}
              <Box id="data-security" data-testid="section-data-security" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  5. Data Security
                </Typography>
                <Typography variant="body1" paragraph>
                  The security of your data is important to us. We implement appropriate technical
                  and organizational measures to protect your personal information:
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Encryption
                </Typography>
                <Typography variant="body1" paragraph>
                  All data transmitted between your device and our servers is encrypted using SSL/TLS
                  protocols. Sensitive data is encrypted at rest in our databases.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Access Controls
                </Typography>
                <Typography variant="body1" paragraph>
                  We limit access to personal information to employees, contractors, and service
                  providers who need it to perform their job functions. All personnel are bound by
                  confidentiality obligations.
                </Typography>

                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                  Security Measures
                </Typography>
                <Typography variant="body1" paragraph>
                  We regularly update our security practices, conduct security audits, monitor for
                  vulnerabilities, and maintain incident response procedures. However, no method of
                  transmission over the Internet or electronic storage is 100% secure, and we cannot
                  guarantee absolute security.
                </Typography>
              </Box>

              {/* Section 6: Your Rights */}
              <Box id="your-rights" data-testid="section-your-rights" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  6. Your Rights
                </Typography>
                <Typography variant="body1" paragraph>
                  You have certain rights regarding your personal data:
                </Typography>

                <List sx={{ pl: 4 }}>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Access:</strong> Request copies of your personal data
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Correction:</strong> Request correction of inaccurate or incomplete
                      data
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Deletion:</strong> Request deletion of your personal data (subject to
                      legal requirements)
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Export:</strong> Receive a copy of your data in a portable format
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Opt-out:</strong> Unsubscribe from marketing communications
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
                    <Typography variant="body1">
                      <strong>Object:</strong> Object to processing of your personal data for certain
                      purposes
                    </Typography>
                  </ListItem>
                </List>

                <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                  To exercise these rights, please contact us using the information provided in the
                  Contact Us section.
                </Typography>
              </Box>

              {/* Section 7: Data Retention */}
              <Box id="data-retention" data-testid="section-data-retention" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  7. Data Retention
                </Typography>
                <Typography variant="body1" paragraph>
                  We retain your personal data only for as long as necessary to fulfill the purposes
                  for which we collected it, including for legal, accounting, or reporting
                  requirements.
                </Typography>
                <Typography variant="body1" paragraph>
                  Account information is retained for the duration of your account and for 7 years
                  after closure for tax and legal compliance. Transaction records are retained for 7
                  years. Marketing data is retained until you opt out or withdraw consent.
                </Typography>
              </Box>

              {/* Section 8: International Data Transfers */}
              <Box id="international-transfers" data-testid="section-international-transfers" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  8. International Data Transfers
                </Typography>
                <Typography variant="body1" paragraph>
                  Your information may be transferred to and maintained on computers located outside
                  of your state, province, country, or other governmental jurisdiction where data
                  protection laws may differ from those in your jurisdiction.
                </Typography>
                <Typography variant="body1" paragraph>
                  If you are located outside the United States and choose to provide information to
                  us, please note that we transfer the data, including personal data, to the United
                  States and process it there. We ensure appropriate safeguards are in place for
                  international transfers.
                </Typography>
              </Box>

              {/* Section 9: Children's Privacy */}
              <Box id="children-privacy" data-testid="section-children-privacy" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  9. Children's Privacy
                </Typography>
                <Typography variant="body1" paragraph>
                  Our service is not intended for use by children under the age of 13 (or 16 in the
                  European Economic Area). We do not knowingly collect personal information from
                  children under these ages. If you are a parent or guardian and you are aware that
                  your child has provided us with personal data, please contact us.
                </Typography>
                <Typography variant="body1" paragraph>
                  If we become aware that we have collected personal data from children without
                  verification of parental consent, we take steps to remove that information from our
                  servers.
                </Typography>
              </Box>

              {/* Section 10: Changes to Policy */}
              <Box id="changes" data-testid="section-changes" sx={{ mb: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  10. Changes to This Privacy Policy
                </Typography>
                <Typography variant="body1" paragraph>
                  We may update our privacy policy from time to time. We will notify you of any
                  changes by posting the new privacy policy on this page and updating the "Last
                  updated" date at the top of this policy.
                </Typography>
                <Typography variant="body1" paragraph>
                  We will notify you via email and/or a prominent notice on our platform prior to the
                  change becoming effective for material changes. We encourage you to review this
                  privacy policy periodically for any changes. Changes to this privacy policy are
                  effective when they are posted on this page.
                </Typography>
              </Box>

              {/* Section 11: Contact Us */}
              <Box id="contact" data-testid="section-contact" sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  11. Contact Us
                </Typography>
                <Typography variant="body1" paragraph>
                  If you have any questions about this privacy policy or our data practices, please
                  contact us:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body1" paragraph>
                    <strong>Upfirst Privacy Team</strong>
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Email:{' '}
                    <Link
                      href="mailto:privacy@upfirst.com"
                      style={{ color: theme.palette.primary.main, textDecoration: 'none' }}
                      data-testid="link-contact-email"
                    >
                      privacy@upfirst.com
                    </Link>
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Address: Upfirst Inc., 123 Commerce Street, San Francisco, CA 94102, United
                    States
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
