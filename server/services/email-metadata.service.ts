/**
 * EmailMetadataService - Email Metadata Generation with Seller Branding
 * 
 * Architecture C (Service Layer Pattern):
 * - Service class with dependency injection
 * - Constructor receives dependencies (storage, stripe)
 * - Methods for metadata generation with proper fallback chains
 * - Proper TypeScript interfaces
 * 
 * Responsibilities:
 * - Generate "From" name with fallback chain (companyName → contactEmail → email)
 * - Generate "Reply-To" email with fallback chain (contactEmail → email)
 * - Fetch complete seller branding data (logo, banner, social links, Stripe details)
 * - Generate subject lines for all email types with consistent patterns
 */

import type { IStorage } from '../storage';
import type { User } from '@shared/schema';
import type Stripe from 'stripe';
import { logger } from '../logger';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

/**
 * Email type enumeration for subject line generation
 */
export enum EmailType {
  // Buyer → Seller emails
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_ITEM_SHIPPED = 'order_item_shipped',
  ORDER_REFUNDED = 'order_refunded',
  BALANCE_PAYMENT_REQUEST = 'balance_payment_request',
  BALANCE_PAYMENT_RECEIVED = 'balance_payment_received',
  PAYMENT_FAILED = 'payment_failed',
  
  // Seller → Platform emails
  SELLER_NEW_ORDER = 'seller_new_order',
  SELLER_WELCOME = 'seller_welcome',
  SELLER_STRIPE_INCOMPLETE = 'seller_stripe_incomplete',
  SELLER_PAYMENT_FAILED = 'seller_payment_failed',
  SELLER_SUBSCRIPTION_FAILED = 'seller_subscription_failed',
  SELLER_INVENTORY_LOW = 'seller_inventory_low',
  SELLER_PAYOUT_FAILED = 'seller_payout_failed',
  SELLER_SUBSCRIPTION_INVOICE = 'seller_subscription_invoice',
  SELLER_TRIAL_ENDING = 'seller_trial_ending',
  SELLER_SUBSCRIPTION_ACTIVATED = 'seller_subscription_activated',
  SELLER_SUBSCRIPTION_CANCELLED = 'seller_subscription_cancelled',
  
  // Auth emails
  AUTH_CODE = 'auth_code',
  MAGIC_LINK = 'magic_link',
  
  // Product emails
  PRODUCT_LISTED = 'product_listed',
  
  // Newsletter
  NEWSLETTER = 'newsletter',
}

/**
 * Email subject data for dynamic subject generation
 */
export interface EmailSubjectData {
  // Order data
  orderId?: string;
  orderNumber?: string;
  productName?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  
  // User data
  buyerName?: string;
  sellerName?: string;
  
  // Payment data
  amount?: number;
  currency?: string;
  
  // Product data
  itemCount?: number;
  
  // Generic data
  [key: string]: any;
}

/**
 * Stripe business details from connected account
 */
export interface StripeBusinessDetails {
  businessName?: string;
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

/**
 * Complete seller branding data
 */
export interface SellerBranding {
  // Store identification
  storeName: string;
  businessName?: string;
  
  // Visual assets
  storeLogo?: string;
  storeBanner?: string;
  
  // Contact information
  contactEmail: string;
  loginEmail: string;
  
  // Social links
  socialLinks: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    snapchat?: string;
    website?: string;
  };
  
  // Stripe business details (if available)
  stripeDetails?: StripeBusinessDetails;
}

/**
 * Service interface for email metadata operations
 */
export interface IEmailMetadataService {
  getFromName(seller: User): Promise<string>;
  getReplyToEmail(seller: User): Promise<string>;
  getSellerBranding(sellerId: string): Promise<SellerBranding>;
  generateSubject(emailType: EmailType, data: EmailSubjectData): string;
}

// ============================================================================
// EMAIL METADATA SERVICE
// ============================================================================

export class EmailMetadataService implements IEmailMetadataService {
  constructor(
    private storage: IStorage,
    private stripe: Stripe
  ) {}

  /**
   * Get "From" name with fallback chain
   * 
   * Fallback order:
   * 1. Seller company/store name (seller.companyName)
   * 2. → Seller contact email (seller.contactEmail)
   * 3. → Seller login email (seller.email)
   * 
   * @param seller - Seller user object
   * @returns From name for email
   */
  async getFromName(seller: User): Promise<string> {
    try {
      // 1. Company/business/store name
      if (seller.companyName) {
        logger.debug('[EmailMetadata] Using company name for From', { companyName: seller.companyName });
        return seller.companyName;
      }
      
      // 2. Contact email
      if (seller.contactEmail) {
        logger.debug('[EmailMetadata] Using contact email for From', { contactEmail: seller.contactEmail });
        return seller.contactEmail;
      }
      
      // 3. Login email (final fallback)
      logger.debug('[EmailMetadata] Using login email for From', { email: seller.email || 'Store' });
      return seller.email || 'Store';
      
    } catch (error) {
      logger.error('[EmailMetadata] Error getting From name', error);
      // Ultimate fallback
      return seller.email || 'Store';
    }
  }

  /**
   * Get "Reply-To" email with fallback chain
   * 
   * Fallback order:
   * 1. Seller contact email (if configured)
   * 2. → Seller login email (always available)
   * 
   * @param seller - Seller user object
   * @returns Reply-to email address
   */
  async getReplyToEmail(seller: User): Promise<string> {
    try {
      // 1. Check seller.contactEmail
      if (seller.contactEmail) {
        logger.debug('[EmailMetadata] Using contact email for Reply-To', { contactEmail: seller.contactEmail });
        return seller.contactEmail;
      }
      
      // 2. Fallback to login email
      logger.debug('[EmailMetadata] Using login email for Reply-To', { email: seller.email || '' });
      return seller.email || '';
      
    } catch (error) {
      logger.error('[EmailMetadata] Error getting Reply-To email', error);
      return seller.email || '';
    }
  }

  /**
   * Get complete seller branding data
   * Fetches seller info from database and Stripe, returns consolidated branding object
   * 
   * @param sellerId - Seller user ID
   * @returns Complete seller branding data
   */
  async getSellerBranding(sellerId: string): Promise<SellerBranding> {
    try {
      // Fetch seller from storage
      const seller = await this.storage.getUser(sellerId);
      if (!seller) {
        throw new Error(`Seller not found: ${sellerId}`);
      }

      // Fetch Stripe business details (if available)
      let stripeDetails: StripeBusinessDetails | undefined;
      if (seller.stripeConnectedAccountId) {
        try {
          const account = await this.stripe.accounts.retrieve(seller.stripeConnectedAccountId);
          stripeDetails = {
            businessName: account.business_profile?.name || undefined,
            businessEmail: account.email || undefined,
            businessUrl: account.business_profile?.url || undefined,
            businessPhone: account.business_profile?.support_phone || undefined,
            address: account.business_profile?.support_address || undefined,
          };
        } catch (error) {
          logger.warn('[EmailMetadata] Failed to fetch Stripe business details', {
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue without Stripe details
        }
      }

      // Build social links object
      const socialLinks: SellerBranding['socialLinks'] = {};
      if (seller.socialInstagram) {
        socialLinks.instagram = seller.socialInstagram.startsWith('http')
          ? seller.socialInstagram
          : `https://instagram.com/${seller.socialInstagram.replace('@', '')}`;
      }
      if (seller.socialTwitter) {
        socialLinks.twitter = seller.socialTwitter.startsWith('http')
          ? seller.socialTwitter
          : `https://twitter.com/${seller.socialTwitter.replace('@', '')}`;
      }
      if (seller.socialTiktok) {
        socialLinks.tiktok = seller.socialTiktok.startsWith('http')
          ? seller.socialTiktok
          : `https://tiktok.com/@${seller.socialTiktok.replace('@', '')}`;
      }
      if (seller.socialSnapchat) {
        socialLinks.snapchat = seller.socialSnapchat.startsWith('http')
          ? seller.socialSnapchat
          : `https://snapchat.com/add/${seller.socialSnapchat.replace('@', '')}`;
      }
      if (seller.socialWebsite) {
        socialLinks.website = seller.socialWebsite;
      }

      // Determine store name with fallbacks
      const storeName = 
        seller.companyName || 
        stripeDetails?.businessName || 
        [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 
        seller.username || 
        'Store';

      // Build complete branding object
      const branding: SellerBranding = {
        storeName,
        businessName: seller.companyName || undefined,
        storeLogo: seller.storeLogo || undefined,
        storeBanner: seller.storeBanner || undefined,
        contactEmail: seller.contactEmail || seller.email || '',
        loginEmail: seller.email || '',
        socialLinks,
        stripeDetails,
      };

      logger.debug('[EmailMetadata] Seller branding fetched', { sellerId, storeName });
      return branding;

    } catch (error) {
      logger.error('[EmailMetadata] Error fetching seller branding', error);
      throw error;
    }
  }

  /**
   * Generate subject line for email type
   * Returns action-oriented subject with important information (order ID, product, tracking, etc.)
   * 
   * @param emailType - Email type enum
   * @param data - Email subject data (orderId, productName, etc.)
   * @returns Email subject line
   */
  generateSubject(emailType: EmailType, data: EmailSubjectData): string {
    try {
      // Format order ID (use first 8 characters for readability)
      const shortOrderId = data.orderId?.slice(0, 8) || data.orderNumber || 'N/A';
      
      switch (emailType) {
        // Buyer-facing order emails
        case EmailType.ORDER_CONFIRMATION:
          return `Order Confirmation #${shortOrderId}`;
        
        case EmailType.ORDER_SHIPPED:
          if (data.trackingNumber) {
            return `Your order #${shortOrderId} has shipped - Track: ${data.trackingNumber}`;
          }
          return `Your order #${shortOrderId} has shipped`;
        
        case EmailType.ORDER_ITEM_SHIPPED:
          if (data.productName && data.trackingNumber) {
            return `${data.productName} has shipped - Track: ${data.trackingNumber}`;
          } else if (data.productName) {
            return `${data.productName} has shipped`;
          }
          return `Item from order #${shortOrderId} has shipped`;
        
        case EmailType.ORDER_DELIVERED:
          return `Your order #${shortOrderId} has been delivered`;
        
        case EmailType.ORDER_REFUNDED:
          if (data.amount && data.currency) {
            return `Refund processed for order #${shortOrderId} - ${data.currency} ${data.amount}`;
          }
          return `Refund processed for order #${shortOrderId}`;
        
        case EmailType.BALANCE_PAYMENT_REQUEST:
          if (data.amount && data.currency) {
            return `Balance payment required - ${data.currency} ${data.amount} for order #${shortOrderId}`;
          }
          return `Balance payment required for order #${shortOrderId}`;
        
        case EmailType.BALANCE_PAYMENT_RECEIVED:
          return `Balance payment received for order #${shortOrderId}`;
        
        case EmailType.PAYMENT_FAILED:
          return `Payment failed for order #${shortOrderId} - Action required`;
        
        // Seller-facing order emails
        case EmailType.SELLER_NEW_ORDER:
          if (data.buyerName && data.itemCount) {
            return `New Order #${shortOrderId} - ${data.buyerName} (${data.itemCount} item${data.itemCount > 1 ? 's' : ''})`;
          } else if (data.buyerName) {
            return `New Order #${shortOrderId} - ${data.buyerName}`;
          }
          return `New Order Received #${shortOrderId}`;
        
        // Seller platform emails
        case EmailType.SELLER_WELCOME:
          return 'Welcome to Upfirst - Get Started with Your Store';
        
        case EmailType.SELLER_STRIPE_INCOMPLETE:
          return 'Complete your Stripe setup to start receiving payments';
        
        case EmailType.SELLER_PAYMENT_FAILED:
          if (data.amount && data.currency) {
            return `Order payment failed - ${data.currency} ${data.amount} (Order #${shortOrderId})`;
          }
          return `Order payment failed for #${shortOrderId}`;
        
        case EmailType.SELLER_SUBSCRIPTION_FAILED:
          if (data.amount && data.currency) {
            return `Subscription payment failed - ${data.currency} ${data.amount} - Update payment method`;
          }
          return 'Subscription payment failed - Update payment method';
        
        case EmailType.SELLER_INVENTORY_LOW:
          if (data.productName) {
            return `Low stock alert: ${data.productName}`;
          }
          return 'Low stock alert for your product';
        
        case EmailType.SELLER_PAYOUT_FAILED:
          if (data.amount && data.currency) {
            return `Payout failed - ${data.currency} ${data.amount} - Action required`;
          }
          return 'Payout failed - Action required';
        
        case EmailType.SELLER_SUBSCRIPTION_INVOICE:
          if (data.amount && data.currency) {
            return `Upfirst subscription invoice - ${data.currency} ${data.amount}`;
          }
          return 'Upfirst subscription invoice';
        
        case EmailType.SELLER_TRIAL_ENDING:
          if (data.daysRemaining !== undefined) {
            return `Your UPPFIRST trial ends in ${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}`;
          }
          return 'Your UPPFIRST trial is ending soon';
        
        case EmailType.SELLER_SUBSCRIPTION_ACTIVATED:
          return 'Your UPPFIRST subscription is active';
        
        case EmailType.SELLER_SUBSCRIPTION_CANCELLED:
          return 'Your UPPFIRST subscription has been cancelled';
        
        // Auth emails
        case EmailType.AUTH_CODE:
          return 'Your Upfirst verification code';
        
        case EmailType.MAGIC_LINK:
          return 'Your Upfirst magic link to sign in';
        
        // Product emails
        case EmailType.PRODUCT_LISTED:
          if (data.productName) {
            return `Product listed successfully: ${data.productName}`;
          }
          return 'Product listed successfully';
        
        // Newsletter
        case EmailType.NEWSLETTER:
          // Newsletter subject should be provided in data
          return data.subject || 'Newsletter from Upfirst';
        
        default:
          logger.warn('[EmailMetadata] Unknown email type, using generic subject', { emailType });
          return 'Notification from Upfirst';
      }
      
    } catch (error) {
      logger.error('[EmailMetadata] Error generating subject', error);
      return 'Notification from Upfirst';
    }
  }
}
