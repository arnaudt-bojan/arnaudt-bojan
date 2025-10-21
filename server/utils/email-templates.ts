/**
 * Email Template Infrastructure - Dark Mode Safe
 * 
 * Reusable email components and layouts for Upfirst platform emails
 * - Two template types: Upfirst → Seller and Seller → Buyer
 * - Dark mode safe with forced light mode rendering
 * - Mobile responsive table-based layouts
 * - Stripe business data integration for seller footers
 */

import Stripe from 'stripe';
import type { User, Order, Product, OrderItem } from '@shared/schema';
import { formatPrice } from '../email-template';

// Stripe instance for account retrieval (only created if STRIPE_SECRET_KEY is available)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-09-30.clover",
  });
}

/**
 * Convert relative image URLs to absolute URLs for email compatibility
 * Email clients require full URLs (http:// or https://)
 * 
 * @param url - Image URL (relative or absolute)
 * @returns Absolute URL for use in emails
 */
export function convertToAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Already absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Get base URL from environment
  const baseUrl = process.env.REPLIT_DOMAINS 
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
    : `http://localhost:${process.env.PORT || 5000}`;
  
  // Ensure URL starts with /
  const path = url.startsWith('/') ? url : `/${url}`;
  
  return `${baseUrl}${path}`;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface StripeBusinessDetails {
  businessName: string;
  businessEmail?: string;
  businessUrl?: string;
  businessPhone?: string;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  };
}

export interface EmailBaseLayoutOptions {
  header: string;
  content: string;
  footer: string;
  preheader?: string;
  darkModeSafe?: boolean;
}

// ============================================================================
// BASE LAYOUT GENERATOR
// ============================================================================

/**
 * Generate base email layout with dark mode safety
 * Wraps header, content, and footer with proper HTML structure
 * 
 * @param options - Layout configuration
 * @returns Complete HTML email string
 */
export function generateEmailBaseLayout(options: EmailBaseLayoutOptions): string {
  const {
    header,
    content,
    footer,
    preheader = '',
    darkModeSafe = true,
  } = options;

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  
  ${darkModeSafe ? `
  <!-- Force Light Mode - Critical for dark mode clients -->
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  ` : ''}
  
  <title>Upfirst</title>
  
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  
  <style type="text/css">
    ${darkModeSafe ? `
    /* Force Light Mode - Multiple approaches for different clients */
    :root {
      color-scheme: light only !important;
      supported-color-schemes: light only !important;
    }
    
    /* iOS/Gmail dark mode override */
    @media (prefers-color-scheme: dark) {
      body, .email-wrapper, .email-container, .email-content {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
      }
      h1, h2, h3, h4, h5, h6, p, td, span, a, div, li {
        color: #1a1a1a !important;
      }
      .dark-mode-bg-white {
        background-color: #ffffff !important;
      }
      .dark-mode-text-dark {
        color: #1a1a1a !important;
      }
    }
    ` : ''}
    
    /* Reset */
    body, table, td, a { 
      -webkit-text-size-adjust: 100% !important; 
      -ms-text-size-adjust: 100% !important; 
    }
    table, td { 
      mso-table-lspace: 0pt !important; 
      mso-table-rspace: 0pt !important; 
    }
    img { 
      -ms-interpolation-mode: bicubic !important; 
    }
    
    /* Apple Mail specific */
    @supports (-webkit-appearance: none) {
      body, .email-wrapper, .email-container {
        background-color: #ffffff !important;
      }
    }
  </style>
</head>

<body style="margin: 0 !important; padding: 0 !important; background-color: #f5f5f5 !important; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;" class="dark-mode-bg-white dark-mode-text-dark">
  
  <!-- Preheader (hidden text for email preview) -->
  ${preheader ? `
  <div style="display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: #f5f5f5; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>
  ` : ''}
  
  <!-- Email Wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #f5f5f5 !important;" class="email-wrapper dark-mode-bg-white">
    <tr>
      <td style="padding: 20px 0;" align="center" valign="top">
        
        <!-- Email Container - 600px max width -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff !important; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);" class="email-container dark-mode-bg-white">
          
          <!-- Header -->
          <tr>
            <td style="padding: 0;">
              ${header}
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 30px 40px; background-color: #ffffff !important; color: #1a1a1a !important;" class="email-content dark-mode-bg-white dark-mode-text-dark">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 0;">
              ${footer}
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim();
}

// ============================================================================
// HEADER GENERATORS
// ============================================================================

/**
 * Generate Upfirst platform header (Upfirst → Seller emails)
 * Black background with white "UPPFIRST" logo text
 * 
 * @returns HTML header string
 */
export function generateUpfirstHeader(): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #000000 !important;">
  <tr>
    <td style="padding: 40px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.5px;">
        UPPFIRST
      </h1>
    </td>
  </tr>
</table>
  `.trim();
}

/**
 * Generate seller branded header (Seller → Buyer emails)
 * Uses seller's storeBanner if available, otherwise storeLogo
 * Falls back to seller name if no branding assets
 * 
 * @param seller - Seller user object
 * @returns HTML header string
 */
export function generateSellerHeader(seller: User): string {
  const storeName = seller.first_name || seller.username || 'Store';
  
  // Priority 1: Store banner (full-width banner image)
  if (seller.store_banner) {
    const bannerUrl = convertToAbsoluteUrl(seller.store_banner);
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding: 0;">
      <img src="${bannerUrl}" alt="${storeName}" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none;">
    </td>
  </tr>
</table>
    `.trim();
  }
  
  // Priority 2: Store logo (centered logo)
  if (seller.store_logo) {
    const logoUrl = convertToAbsoluteUrl(seller.store_logo);
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff !important;" class="dark-mode-bg-white">
  <tr>
    <td style="padding: 40px; text-align: center;">
      <img src="${logoUrl}" alt="${storeName}" style="display: inline-block; max-width: 200px; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none;">
    </td>
  </tr>
</table>
    `.trim();
  }
  
  // Fallback: Text-based header with seller name
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff !important;" class="dark-mode-bg-white">
  <tr>
    <td style="padding: 40px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        ${storeName}
      </h1>
    </td>
  </tr>
</table>
  `.trim();
}

// ============================================================================
// FOOTER GENERATORS
// ============================================================================

/**
 * Generate Upfirst platform footer (Upfirst → Seller emails)
 * Includes company name, legal address, contact info, social links, and copyright
 * 
 * @returns HTML footer string
 */
export function generateUpfirstFooter(): string {
  const currentYear = new Date().getFullYear();
  
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb !important; border-top: 1px solid #e5e7eb;" class="dark-mode-bg-white">
  <tr>
    <td style="padding: 40px; text-align: center;">
      
      <!-- Company Name -->
      <p style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        UPPFIRST
      </p>
      
      <!-- Legal Address -->
      <p style="margin: 0 0 15px; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        UPPFIRST SG PTE LTD<br>
        6001 BEACH ROAD, #22-01 GOLDEN MILE TOWER<br>
        SINGAPORE (199589)
      </p>
      
      <!-- Contact Information -->
      <div style="margin: 20px 0;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <a href="mailto:support@upfirst.io" style="color: #6366f1 !important; text-decoration: underline;">
            support@upfirst.io
          </a>
        </p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Phone: +65 6001 2345
        </p>
      </div>
      
      <!-- Social Links -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 20px;">
        <tr>
          <td style="padding: 0 8px;">
            <a href="https://instagram.com/uppfirst" target="_blank" style="color: #6b7280 !important; text-decoration: none; font-size: 14px;">
              Instagram
            </a>
          </td>
          <td style="padding: 0 8px; color: #d1d5db;">|</td>
          <td style="padding: 0 8px;">
            <a href="https://tiktok.com/@uppfirst" target="_blank" style="color: #6b7280 !important; text-decoration: none; font-size: 14px;">
              TikTok
            </a>
          </td>
          <td style="padding: 0 8px; color: #d1d5db;">|</td>
          <td style="padding: 0 8px;">
            <a href="https://linkedin.com/company/uppfirst" target="_blank" style="color: #6b7280 !important; text-decoration: none; font-size: 14px;">
              LinkedIn
            </a>
          </td>
          <td style="padding: 0 8px; color: #d1d5db;">|</td>
          <td style="padding: 0 8px;">
            <a href="https://snapchat.com/add/uppfirst" target="_blank" style="color: #6b7280 !important; text-decoration: none; font-size: 14px;">
              Snapchat
            </a>
          </td>
        </tr>
      </table>
      
      <!-- Copyright -->
      <p style="margin: 0; font-size: 12px; color: #9ca3af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        © ${currentYear} UPPFIRST. All rights reserved.
      </p>
      
    </td>
  </tr>
</table>
  `.trim();
}

/**
 * Generate seller footer with Stripe business data (Seller → Buyer emails)
 * Includes seller business info from Stripe + seller social links + "Powered by Upfirst"
 * 
 * @param seller - Seller user object
 * @returns HTML footer string
 */
export async function generateSellerFooter(seller: User): Promise<string> {
  const currentYear = new Date().getFullYear();
  let stripeDetails: StripeBusinessDetails | null = null;
  
  // Fetch Stripe business details if connected account exists
  if (seller.stripeConnectedAccountId && stripe) {
    try {
      const account = await stripe.accounts.retrieve(seller.stripeConnectedAccountId);
      
      stripeDetails = {
        businessName: account.business_profile?.name || '',
        businessEmail: account.email || '',
        businessUrl: account.business_profile?.url || '',
        businessPhone: account.business_profile?.support_phone || '',
        address: account.business_profile?.support_address || undefined,
      };
    } catch (error) {
      console.error('[EmailTemplates] Failed to fetch Stripe business details:', error);
      // Will use fallback data below
    }
  }
  
  // Determine business/seller name
  const businessName = stripeDetails?.businessName || 
                       [seller.first_name, seller.last_name].filter(Boolean).join(' ') || 
                       seller.username || 
                       'Store';
  
  // Build address string
  let addressHtml = '';
  if (stripeDetails?.address) {
    const addr = stripeDetails.address;
    const addressParts = [
      addr.line1,
      addr.line2,
      [addr.city, addr.state].filter(Boolean).join(', '),
      addr.postal_code,
      addr.country
    ].filter(Boolean);
    
    if (addressParts.length > 0) {
      addressHtml = addressParts.join('<br>');
    }
  }
  
  // Extract business contact data from Stripe with fallbacks
  const businessEmail = stripeDetails?.businessEmail || seller.email;
  const businessPhone = stripeDetails?.businessPhone;
  const businessUrl = stripeDetails?.businessUrl;
  
  // Build seller social links (if any exist)
  const socialLinks: { name: string; url: string }[] = [];
  if (seller.socialInstagram) {
    socialLinks.push({ 
      name: 'Instagram', 
      url: seller.socialInstagram.startsWith('http') 
        ? seller.socialInstagram 
        : `https://instagram.com/${seller.socialInstagram.replace('@', '')}`
    });
  }
  if (seller.socialTwitter) {
    socialLinks.push({ 
      name: 'Twitter', 
      url: seller.socialTwitter.startsWith('http') 
        ? seller.socialTwitter 
        : `https://twitter.com/${seller.socialTwitter.replace('@', '')}`
    });
  }
  if (seller.socialTiktok) {
    socialLinks.push({ 
      name: 'TikTok', 
      url: seller.socialTiktok.startsWith('http') 
        ? seller.socialTiktok 
        : `https://tiktok.com/@${seller.socialTiktok.replace('@', '')}`
    });
  }
  
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb !important; border-top: 1px solid #e5e7eb;" class="dark-mode-bg-white">
  <tr>
    <td style="padding: 40px; text-align: center;">
      
      <!-- Seller Business Name -->
      <p style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        ${businessName}
      </p>
      
      <!-- Seller Address (if available) -->
      ${addressHtml ? `
      <p style="margin: 0 0 15px; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        ${addressHtml}
      </p>
      ` : ''}
      
      <!-- Seller Contact Information (from Stripe) -->
      <div style="margin: 20px 0;">
        ${businessEmail ? `
        <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <a href="mailto:${businessEmail}" style="color: #6366f1 !important; text-decoration: underline;">
            ${businessEmail}
          </a>
        </p>
        ` : ''}
        ${businessPhone ? `
        <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Phone: ${businessPhone}
        </p>
        ` : ''}
        ${businessUrl ? `
        <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <a href="${businessUrl}" target="_blank" style="color: #6366f1 !important; text-decoration: underline;">
            ${businessUrl}
          </a>
        </p>
        ` : ''}
      </div>
      
      <!-- Seller Social Links (if any) -->
      ${socialLinks.length > 0 ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 25px;">
        <tr>
          ${socialLinks.map((link, index) => `
            ${index > 0 ? '<td style="padding: 0 8px; color: #d1d5db;">|</td>' : ''}
            <td style="padding: 0 8px;">
              <a href="${link.url}" target="_blank" style="color: #6b7280 !important; text-decoration: none; font-size: 14px;">
                ${link.name}
              </a>
            </td>
          `).join('')}
        </tr>
      </table>
      ` : ''}
      
      <!-- Powered by Upfirst -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid #e5e7eb; margin-top: 25px; padding-top: 20px;">
        <tr>
          <td style="text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Powered by <strong style="color: #1a1a1a !important;" class="dark-mode-text-dark">UPPFIRST</strong>
            </p>
          </td>
        </tr>
      </table>
      
    </td>
  </tr>
</table>
  `.trim();
}

// ============================================================================
// COMPONENT HELPERS
// ============================================================================

/**
 * Generate product thumbnail with image, name, quantity, and price
 * Dark mode safe with explicit colors
 * 
 * @param product - Product object
 * @param quantity - Quantity ordered
 * @param variant - Optional variant info (size, color)
 * @returns HTML product thumbnail string
 */
export function generateProductThumbnail(
  product: Product, 
  quantity: number,
  variant?: { size?: string; color?: string } | null
): string {
  const productImage = convertToAbsoluteUrl(product.image || '');
  const productName = product.name;
  const productPrice = parseFloat(product.price.toString());
  const subtotal = productPrice * quantity;
  
  // Build variant display string
  let variantText = '';
  if (variant) {
    const parts = [];
    if (variant.size) parts.push(`Size: ${variant.size}`);
    if (variant.color) parts.push(`Color: ${variant.color}`);
    if (parts.length > 0) {
      variantText = `<br><span style="font-size: 13px; color: #9ca3af !important;">${parts.join(' • ')}</span>`;
    }
  }
  
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 10px 0; border-bottom: 1px solid #e5e7eb;">
  <tr>
    <td style="padding: 15px 0; vertical-align: top;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          ${productImage ? `
          <td style="width: 80px; vertical-align: top;">
            <img src="${productImage}" alt="${productName}" style="display: block; width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 0;">
          </td>
          ` : ''}
          <td style="padding-left: ${productImage ? '15px' : '0'}; vertical-align: top;">
            <p style="margin: 0 0 5px; font-weight: 600; font-size: 15px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              ${productName}
            </p>
            <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Quantity: ${quantity} × ${formatPrice(productPrice, 'USD')}${variantText}
            </p>
          </td>
          <td style="text-align: right; vertical-align: top; white-space: nowrap; padding-left: 15px;">
            <p style="margin: 0; font-weight: 600; font-size: 15px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              ${formatPrice(subtotal, 'USD')}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `.trim();
}

/**
 * Generate CTA button with dark mode safe colors
 * All colors explicitly set with !important flags
 * 
 * @param text - Button text
 * @param url - Button URL
 * @param color - Button background color (default: Upfirst primary)
 * @returns HTML button string
 */
export function generateCTAButton(
  text: string, 
  url: string, 
  color: string = '#6366f1'
): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 25px 0;">
  <tr>
    <td style="border-radius: 8px; background-color: ${color} !important;">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 8px; line-height: 1;">
        ${text}
      </a>
    </td>
  </tr>
</table>
  `.trim();
}

/**
 * Generate order summary table with totals, payment info, and deposit/balance
 * Includes subtotal, shipping, tax, deposit, balance, and total
 * 
 * @param order - Order object
 * @param items - Array of order items (optional, for detailed breakdown)
 * @returns HTML order summary string
 */
export function generateOrderSummary(order: Order, items?: OrderItem[]): string {
  const currency = order.currency || 'USD';
  
  // Calculate subtotal from order items if provided (more accurate than order.subtotalBeforeTax)
  let subtotal = 0;
  if (items && items.length > 0) {
    subtotal = items.reduce((sum, item) => {
      return sum + parseFloat(item.subtotal || '0');
    }, 0);
  } else {
    subtotal = parseFloat(order.subtotalBeforeTax?.toString() || order.total.toString());
  }
  
  const taxAmount = parseFloat(order.taxAmount?.toString() || '0');
  const total = parseFloat(order.total.toString());
  const amountPaid = parseFloat(order.amountPaid?.toString() || '0');
  const remainingBalance = parseFloat(order.remainingBalance?.toString() || '0');
  
  // Use order.shippingCost directly (most accurate source)
  const shippingAmount = order.shippingCost ? parseFloat(order.shippingCost.toString()) : 0;
  
  // Determine payment type display
  const isDeposit = order.paymentType === 'deposit';
  const isFullyPaid = order.paymentStatus === 'fully_paid';
  
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; border-top: 2px solid #e5e7eb; padding-top: 20px;">
  
  <!-- Subtotal -->
  <tr>
    <td style="padding: 8px 0; font-size: 15px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Subtotal
    </td>
    <td style="padding: 8px 0; text-align: right; font-size: 15px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
      ${formatPrice(subtotal, currency)}
    </td>
  </tr>
  
  <!-- Shipping -->
  ${shippingAmount > 0 ? `
  <tr>
    <td style="padding: 8px 0; font-size: 15px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Shipping
    </td>
    <td style="padding: 8px 0; text-align: right; font-size: 15px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
      ${formatPrice(shippingAmount, currency)}
    </td>
  </tr>
  ` : ''}
  
  <!-- Tax -->
  ${taxAmount > 0 ? `
  <tr>
    <td style="padding: 8px 0; font-size: 15px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Tax
    </td>
    <td style="padding: 8px 0; text-align: right; font-size: 15px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
      ${formatPrice(taxAmount, currency)}
    </td>
  </tr>
  ` : ''}
  
  <!-- Total (Border separator) -->
  <tr>
    <td colspan="2" style="padding-top: 15px; border-top: 1px solid #e5e7eb;"></td>
  </tr>
  <tr>
    <td style="padding: 12px 0; font-size: 17px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
      Total
    </td>
    <td style="padding: 12px 0; text-align: right; font-size: 17px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
      ${formatPrice(total, currency)}
    </td>
  </tr>
  
  <!-- Deposit/Balance Info (if applicable) -->
  ${isDeposit && amountPaid > 0 ? `
  <tr>
    <td colspan="2" style="padding-top: 10px; border-top: 1px solid #e5e7eb;"></td>
  </tr>
  <tr>
    <td style="padding: 8px 0; font-size: 14px; color: #059669 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      ${isFullyPaid ? 'Paid in Full' : 'Deposit Paid'}
    </td>
    <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #059669 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      ${formatPrice(amountPaid, currency)}
    </td>
  </tr>
  ` : ''}
  
  ${isDeposit && remainingBalance > 0 && !isFullyPaid ? `
  <tr>
    <td style="padding: 8px 0; font-size: 14px; color: #dc2626 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Remaining Balance
    </td>
    <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #dc2626 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      ${formatPrice(remainingBalance, currency)}
    </td>
  </tr>
  ` : ''}
  
</table>
  `.trim();
}

/**
 * Generate shipping address block
 * Formatted for email display with proper spacing
 * 
 * @param address - Address string or object
 * @returns HTML address block string
 */
export function generateShippingAddress(address: string | object): string {
  let addressHtml = '';
  
  if (typeof address === 'string') {
    // Simple string address - split by commas or newlines
    addressHtml = address.replace(/,/g, '<br>').replace(/\n/g, '<br>');
  } else if (typeof address === 'object' && address !== null) {
    // Structured address object
    const addr = address as any;
    const parts = [
      addr.line1,
      addr.line2,
      [addr.city, addr.state].filter(Boolean).join(', '),
      addr.postal_code || addr.zip,
      addr.country
    ].filter(Boolean);
    addressHtml = parts.join('<br>');
  }
  
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
  <tr>
    <td style="padding: 15px; background-color: #f9fafb !important; border-radius: 8px; border: 1px solid #e5e7eb;" class="dark-mode-bg-white">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.5px;">
        Shipping Address
      </p>
      <p style="margin: 0; font-size: 15px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;" class="dark-mode-text-dark">
        ${addressHtml}
      </p>
    </td>
  </tr>
</table>
  `.trim();
}

/**
 * Generate billing address block
 * Formatted for email display with proper spacing
 * 
 * @param address - Address string or object
 * @returns HTML address block string
 */
export function generateBillingAddress(address: string | object): string {
  let addressHtml = '';
  
  if (typeof address === 'string') {
    addressHtml = address.replace(/,/g, '<br>').replace(/\n/g, '<br>');
  } else if (typeof address === 'object' && address !== null) {
    const addr = address as any;
    const parts = [
      addr.line1,
      addr.line2,
      [addr.city, addr.state].filter(Boolean).join(', '),
      addr.postal_code || addr.zip,
      addr.country
    ].filter(Boolean);
    addressHtml = parts.join('<br>');
  }
  
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
  <tr>
    <td style="padding: 15px; background-color: #f9fafb !important; border-radius: 8px; border: 1px solid #e5e7eb;" class="dark-mode-bg-white">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.5px;">
        Billing Address
      </p>
      <p style="margin: 0; font-size: 15px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;" class="dark-mode-text-dark">
        ${addressHtml}
      </p>
    </td>
  </tr>
</table>
  `.trim();
}

/**
 * Generate tracking info block
 * Shows carrier, tracking number, and link
 * 
 * @param carrier - Carrier name (UPS, FedEx, USPS, etc.)
 * @param trackingNumber - Tracking number
 * @param trackingUrl - Tracking URL
 * @returns HTML tracking info string
 */
export function generateTrackingInfo(
  carrier: string | null | undefined,
  trackingNumber: string,
  trackingUrl?: string | null
): string {
  const trackingLink = trackingUrl || `https://www.google.com/search?q=${encodeURIComponent(trackingNumber)}`;
  
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
  <tr>
    <td style="padding: 20px; background-color: #eff6ff !important; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase; color: #1e40af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.5px;">
        ${carrier ? `${carrier} ` : ''}Tracking Number
      </p>
      <p style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        ${trackingNumber}
      </p>
      <a href="${trackingLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6 !important; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Track Package
      </a>
    </td>
  </tr>
</table>
  `.trim();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate magic link login button for buyer emails
 * Provides one-click login with proper styling
 * 
 * @param magicLink - Magic link URL
 * @param buttonText - Button text (default: "View Order")
 * @returns HTML magic link button string
 */
export function generateMagicLinkButton(
  magicLink: string,
  buttonText: string = 'View Order'
): string {
  return generateCTAButton(buttonText, magicLink, '#6366f1');
}

/**
 * Escape HTML special characters for safe email rendering
 * 
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================================================
// TEAM COLLABORATION EMAILS
// ============================================================================

/**
 * Generate collaborator invitation email
 * UPPFIRST → Invitee (platform email)
 * 
 * Shows store name, inviter name, what collaborator access means,
 * and centered CTA button with 7-day expiry notice
 * 
 * @param inviterName - Name of the person who sent the invitation
 * @param storeName - Name of the store they're being invited to
 * @param invitationLink - Full URL with invitation token
 * @returns Complete HTML email string
 */
export function generateCollaboratorInvitationEmail(
  inviterName: string,
  storeName: string,
  invitationLink: string
): string {
  // Email content
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0 0 20px; font-size: 28px; font-weight: 700; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.3;" class="dark-mode-text-dark">
        You've Been Invited!
      </h1>
      <p style="margin: 0 0 15px; font-size: 18px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;" class="dark-mode-text-dark">
        <strong style="font-weight: 600;">${escapeHtml(inviterName)}</strong> invited you to join their team
      </p>
      <p style="margin: 0; font-size: 24px; font-weight: 600; color: #6366f1 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${escapeHtml(storeName)}
      </p>
    </div>
    
    <!-- What Collaborator Access Means -->
    <div style="background-color: #f9fafb !important; border-radius: 8px; padding: 25px; margin: 30px 0;" class="dark-mode-bg-white">
      <h2 style="margin: 0 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        As a Collaborator, You Can:
      </h2>
      <ul style="margin: 0; padding-left: 20px; font-size: 15px; color: #4b5563 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.8;">
        <li style="margin-bottom: 8px;">Manage products and inventory</li>
        <li style="margin-bottom: 8px;">Process and fulfill orders</li>
        <li style="margin-bottom: 8px;">View store analytics and reports</li>
        <li style="margin-bottom: 8px;">Communicate with customers</li>
        <li style="margin-bottom: 0;">Help grow the business together</li>
      </ul>
    </div>
    
    <!-- Centered CTA Button -->
    <div style="text-align: center; margin: 35px 0;">
      ${generateCTAButton('Accept Invitation', invitationLink, '#6366f1')}
    </div>
    
    <!-- Expiry Notice -->
    <p style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; line-height: 1.6;">
      This invitation expires in <strong style="color: #6b7280 !important;">7 days</strong>.<br>
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  `.trim();
  
  // Generate complete email with Upfirst header/footer
  return generateEmailBaseLayout({
    header: generateUpfirstHeader(),
    content,
    footer: generateUpfirstFooter(),
    preheader: `${inviterName} invited you to join ${storeName}`,
    darkModeSafe: true,
  });
}

// ============================================================================
// REFUND CONFIRMATION EMAIL (Seller → Buyer)
// ============================================================================

export interface RefundEmailData {
  order: Order;
  seller: User;
  refundAmount: string;
  currency: string;
  reason?: string;
  lineItems: Array<{
    type: 'product' | 'shipping' | 'tax' | 'adjustment';
    description: string;
    amount: string;
    quantity?: number;
  }>;
  orderAccessToken?: string;
}

export async function generateRefundConfirmationEmail(data: RefundEmailData): Promise<string> {
  const { order, seller, refundAmount, currency, reason, lineItems, orderAccessToken } = data;
  
  // Get seller name for display
  const sellerName = [seller.first_name, seller.last_name].filter(Boolean).join(' ') || seller.username || "the seller";
  
  // CRITICAL: orderAccessToken is already a FULL magic link URL from generateMagicLinkForEmail
  // Don't reconstruct it - just use it directly
  const baseUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
    : `http://localhost:${process.env.PORT || 5000}`;
  
  const orderLink = orderAccessToken || `${baseUrl}/orders/${order.id}`;
  
  // CRITICAL: Safe parsing with proper field names from order schema
  const totalPaid = parseFloat(order.amountPaid || '0');
  const refunded = parseFloat(refundAmount);
  const remaining = totalPaid - refunded;
  
  // CRITICAL: Proper currency locale formatting using Intl.NumberFormat
  // Handles all currencies correctly with proper decimal places and symbols
  const formatCurrency = (amount: number, curr: string = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: curr.toUpperCase(),
      }).format(amount);
    } catch (error) {
      // Fallback for unsupported currencies
      const decimals = getCurrencyDecimals(curr);
      return `${curr} ${amount.toFixed(decimals)}`;
    }
  };

  // Helper to get currency decimal places
  const getCurrencyDecimals = (curr: string): number => {
    const upperCurr = curr.toUpperCase();
    const zeroDecimal = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
    const threeDecimal = ['BHD', 'JOD', 'KWD', 'OMR', 'TND'];
    if (zeroDecimal.includes(upperCurr)) return 0;
    if (threeDecimal.includes(upperCurr)) return 3;
    return 2;
  };
  
  // Build email content
  const content = `
    <h1 style="margin: 0 0 24px; font-size: 28px; font-weight: 600; color: #111827 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.3;">
      Refund Processed
    </h1>
    
    <p style="margin: 0 0 20px; font-size: 16px; color: #4b5563 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
      A refund of <strong style="color: #059669 !important;">${formatCurrency(refunded, currency)}</strong> has been processed for your order <strong style="color: #111827 !important;">#${order.id.slice(0, 8)}</strong>.
    </p>
    
    ${reason ? `
    <div style="margin: 0 0 24px; padding: 16px; background-color: #f3f4f6; border-left: 4px solid #6366f1; border-radius: 6px;">
      <p style="margin: 0; font-size: 14px; color: #4b5563 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        <strong style="color: #374151 !important;">Reason:</strong> ${reason}
      </p>
    </div>
    ` : ''}
    
    <!-- Refund Details Table -->
    <div style="margin: 0 0 30px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="padding: 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Refund Breakdown
        </h2>
      </div>
      
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        ${lineItems.map(item => `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
              <span style="font-size: 14px; color: #374151 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                ${item.description}${item.quantity ? ` (qty: ${item.quantity})` : ''}
              </span>
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: right;">
              <span style="font-size: 14px; font-weight: 500; color: #059669 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                ${formatCurrency(parseFloat(item.amount), currency)}
              </span>
            </td>
          </tr>
        `).join('')}
        
        <tr>
          <td style="padding: 16px; background-color: #f9fafb;">
            <span style="font-size: 16px; font-weight: 600; color: #111827 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Total Refunded
            </span>
          </td>
          <td style="padding: 16px; background-color: #f9fafb; text-align: right;">
            <span style="font-size: 18px; font-weight: 700; color: #059669 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${formatCurrency(refunded, currency)}
            </span>
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Order Summary -->
    <div style="margin: 0 0 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0;">
            <span style="font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Original Amount:
            </span>
          </td>
          <td style="padding: 6px 0; text-align: right;">
            <span style="font-size: 14px; font-weight: 500; color: #374151 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${formatCurrency(totalPaid, currency)}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">
            <span style="font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Refunded:
            </span>
          </td>
          <td style="padding: 6px 0; text-align: right;">
            <span style="font-size: 14px; font-weight: 500; color: #059669 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              -${formatCurrency(refunded, currency)}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0 0; border-top: 1px solid #e5e7eb;">
            <span style="font-size: 15px; font-weight: 600; color: #111827 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Remaining Balance:
            </span>
          </td>
          <td style="padding: 12px 0 0; border-top: 1px solid #e5e7eb; text-align: right;">
            <span style="font-size: 16px; font-weight: 700; color: #111827 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${formatCurrency(remaining, currency)}
            </span>
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Refund Timeline -->
    <div style="margin: 0 0 30px; padding: 16px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
      <p style="margin: 0; font-size: 14px; color: #1e40af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        <strong style="color: #1e3a8a !important;">💳 When will I receive my refund?</strong><br>
        Your refund will appear on your original payment method within <strong>5-10 business days</strong>. The exact timing depends on your bank or card issuer.
      </p>
    </div>
    
    <!-- View Order CTA -->
    <div style="text-align: center; margin: 35px 0;">
      ${generateCTAButton('View Order Details', orderLink, '#6366f1')}
    </div>
    
    <!-- Support Notice -->
    <p style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; line-height: 1.6;">
      If you have any questions about this refund, please contact ${sellerName}.
    </p>
  `.trim();
  
  // Generate complete email with seller branding
  return generateEmailBaseLayout({
    header: generateSellerHeader(seller),
    content,
    footer: await generateSellerFooter(seller),
    preheader: `Refund of ${formatCurrency(refunded, currency)} processed for order #${order.id.slice(0, 8)}`,
    darkModeSafe: true,
  });
}
