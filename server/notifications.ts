import { Resend } from 'resend';
import crypto from 'crypto';
import { format } from 'date-fns';
import type { User, Order, Product, Notification, InsertNotification, OrderItem, BalanceRequest } from '../shared/schema';
import { DocumentGenerator } from './services/document-generator';
import { logger } from './logger';
import { formatVariant } from '../shared/variant-formatter';
import { computeDeliveryDate } from '../shared/order-utils';
import { 
  createEmailTemplate, 
  createEmailButton, 
  createAlertBox, 
  createOrderItemsTable, 
  createContentSection,
  formatPrice
} from './email-template';
import { EmailConfigService } from './services/email-config.service';
import { IEmailProvider, ResendEmailProvider } from './services/email-provider.service';
import { NotificationMessagesService } from './services/notification-messages.service';
import { 
  generateEmailBaseLayout, 
  generateUpfirstHeader, 
  generateUpfirstFooter,
  generateSellerHeader,
  generateSellerFooter,
  generateCTAButton,
  generateProductThumbnail,
  generateOrderSummary,
  generateShippingAddress,
  generateBillingAddress,
  generateTrackingInfo,
  generateMagicLinkButton,
  generateRefundConfirmationEmail,
  type RefundEmailData
} from './utils/email-templates';
import { EmailType, EmailMetadataService } from './services/email-metadata.service';
import Stripe from 'stripe';

export interface NotificationService {
  sendEmail(params: SendEmailParams): Promise<{ success: boolean; emailId?: string; error?: string }>;
  createNotification(notification: InsertNotification): Promise<Notification | null>;
  sendOrderConfirmation(order: Order, seller: User, products: Product[]): Promise<void>;
  sendOrderShipped(order: Order, seller: User): Promise<void>;
  sendItemTracking(order: Order, item: OrderItem, seller: User): Promise<void>;
  sendProductListed(seller: User, product: Product): Promise<void>;
  sendAuthCode(email: string, code: string, magicLinkToken?: string): Promise<boolean>;
  sendMagicLink(email: string, link: string): Promise<boolean>;
  
  // Phase 1: Critical Revenue-Impacting Notifications
  sendSellerWelcome(seller: User): Promise<void>;
  sendStripeOnboardingIncomplete(seller: User): Promise<void>;
  sendOrderPaymentFailed(seller: User, orderId: string, amount: number, reason: string): Promise<void>;
  sendBuyerPaymentFailed(buyerEmail: string, buyerName: string, amount: number, reason: string, retryLink?: string): Promise<void>;
  sendSubscriptionPaymentFailed(seller: User, amount: number, reason: string): Promise<void>;
  sendInventoryOutOfStock(seller: User, product: Product): Promise<void>;
  sendPayoutFailed(seller: User, amount: number, reason: string): Promise<void>;
  
  // Subscription Management Emails
  sendSubscriptionTrialEnding(seller: User, daysRemaining: number): Promise<void>;
  sendSubscriptionActivated(seller: User, subscription: { plan: string; amount: number; nextBillingDate: Date }): Promise<void>;
  sendSubscriptionCancelled(seller: User, endDate: Date): Promise<void>;
  sendLowInventoryAlert(seller: User, product: Product, currentStock: number): Promise<void>;
  
  // Seller → Buyer Email Methods (Task 5f)
  sendOrderDelivered(order: Order, seller: User, products: Product[]): Promise<void>;
  sendOrderRefunded(order: Order, seller: User, refundAmount: number, refundedItemsData: Array<{ item: OrderItem; quantity: number; amount: number }>): Promise<void>;
  sendBalancePaymentRequest(order: Order, seller: User, balanceRequest: BalanceRequest, sessionToken: string): Promise<void>;
  sendBalancePaymentReceived(order: Order, seller: User, balanceAmount: number): Promise<void>;
  sendWelcomeEmailFirstOrder(order: Order, seller: User, products: Product[]): Promise<void>;
  
  // Refund Confirmation Email (Task 8)
  sendRefundConfirmation(
    order: Order, 
    seller: User, 
    refundData: {
      amount: string;
      currency: string;
      reason?: string;
      lineItems: Array<{
        type: 'product' | 'shipping' | 'tax' | 'adjustment';
        description: string;
        amount: string;
        quantity?: number;
      }>;
    }
  ): Promise<void>;
  
  // Seller Order Notification (when buyer places order)
  sendSellerOrderNotification(order: Order, seller: User, products: Product[]): Promise<void>;
  
  // Subscription Invoice Email
  sendSubscriptionInvoice(user: User, invoiceData: {
    amount: number;
    currency: string;
    invoiceNumber: string;
    invoiceUrl?: string;
    periodStart: string;
    periodEnd: string;
    plan: string;
  }): Promise<void>;
  
  // Newsletter Functions
  sendNewsletter(params: SendNewsletterParams): Promise<{ success: boolean; batchId?: string; error?: string }>;
  trackNewsletterEvent(
    newsletterId: string, 
    recipientEmail: string,
    eventType: 'open' | 'click' | 'bounce' | 'unsubscribe',
    webhookEventId?: string,
    eventData?: any
  ): Promise<void>;
  
  // Wholesale B2B Email Methods (Phase 4C)
  sendWholesaleOrderConfirmation(wholesaleOrder: any, seller: User, items: any[]): Promise<void>;
  sendWholesaleDepositReceived(wholesaleOrder: any, seller: User, buyer: User): Promise<void>;
  sendWholesaleBalanceReminder(wholesaleOrder: any, seller: User, paymentLink: string): Promise<void>;
  sendWholesaleBalanceOverdue(wholesaleOrder: any, seller: User, buyer: User, paymentLink: string): Promise<void>;
  sendWholesaleOrderShipped(wholesaleOrder: any, seller: User, trackingInfo: any): Promise<void>;
  sendWholesaleOrderFulfilled(wholesaleOrder: any, seller: User, fulfillmentType: 'shipped' | 'pickup', pickupDetails?: any): Promise<void>;
  
  // Delivery Date Update Email
  sendDeliveryDateChangeEmail(order: Order, orderItem: OrderItem, newDeliveryDate: Date): Promise<void>;
  
  // Customer Details Update Email
  sendOrderCustomerDetailsUpdated(order: Order, seller: User, previousDetails: any, newDetails: any): Promise<void>;
}

export interface SendNewsletterParams {
  userId: string;
  newsletterId: string;
  recipients: Array<{ email: string; name?: string }>;
  from: string;
  replyTo?: string;
  subject: string;
  htmlContent: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

interface SendEmailParams {
  to: string;
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

class NotificationServiceImpl implements NotificationService {
  private storage: any; // Will be injected
  private emailConfig: EmailConfigService;
  private emailProvider: IEmailProvider;
  private messages: NotificationMessagesService;
  private stripe: Stripe;
  private emailMetadata: EmailMetadataService;

  constructor(
    storage: any,
    emailConfig?: EmailConfigService,
    emailProvider?: IEmailProvider,
    messages?: NotificationMessagesService
  ) {
    this.storage = storage;
    
    // Use injected services or create defaults (for backward compatibility)
    this.emailConfig = emailConfig || new EmailConfigService();
    this.emailProvider = emailProvider || new ResendEmailProvider(
      process.env.RESEND_API_KEY || 'dummy-key-not-configured'
    );
    this.messages = messages || new NotificationMessagesService();
    
    // Initialize Stripe
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: "2025-09-30.clover",
    });
    
    // Initialize EmailMetadataService
    this.emailMetadata = new EmailMetadataService(storage, this.stripe);
  }


  /**
   * Generate magic link token for email auto-login
   * Creates a token, stores it in database, and returns the magic link URL
   * @param email - User email address
   * @param redirectPath - Optional redirect path after login
   * @param sellerContext - Seller username for buyer emails (null for seller emails)
   */
  private async generateMagicLinkForEmail(email: string, redirectPath?: string, sellerContext?: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days (3 months)

    // Save auth token to database with seller context
    await this.storage.createAuthToken({
      email: email.toLowerCase().trim(),
      token,
      code: null, // No code for magic links from emails
      expiresAt,
      used: 0,
      sellerContext: sellerContext || null, // Preserve seller context for buyer emails
      tokenType: 'magic_link', // Mark as reusable magic link token
    });

    // Generate magic link URL
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    let magicLink = `${baseUrl}/api/auth/email/verify-magic-link?token=${token}`;
    
    if (redirectPath) {
      magicLink += `&redirect=${encodeURIComponent(redirectPath)}`;
    }

    return magicLink;
  }

  /**
   * Send email using email provider (with development fallback)
   */
  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; emailId?: string; error?: string }> {
    try {
      // Use email config service for from address
      const fromEmail = params.from || this.emailConfig.getPlatformFrom();
      
      // Map attachments to provider format
      const attachments = params.attachments?.map(att => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
        contentType: att.contentType,
      }));

      // Send via provider abstraction
      const result = await this.emailProvider.sendEmail({
        to: params.to,
        from: fromEmail,
        replyTo: params.replyTo,
        subject: params.subject,
        html: params.html,
        attachments,
      });

      if (!result.success) {
        // Extract verification code if it's an auth email (for fallback logging)
        const codeMatch = params.html.match(/\b\d{6}\b/);
        if (codeMatch) {
          logger.info("\n═══════════════════════════════════════════════════════");
          logger.info("🔑 VERIFICATION CODE FALLBACK");
          logger.info("═══════════════════════════════════════════════════════");
          logger.info(`To: ${params.to}`);
          logger.info(`Code: ${codeMatch[0]}`);
          logger.info("═══════════════════════════════════════════════════════\n");
        }
        
        return { success: false, error: result.error };
      }

      return { success: true, emailId: result.emailId };
    } catch (error: any) {
      logger.error("[Notifications] Email send exception:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create in-app notification
   */
  async createNotification(notification: InsertNotification): Promise<Notification | null> {
    try {
      return await this.storage.createNotification(notification);
    } catch (error) {
      logger.error("[Notifications] Create notification error:", error);
      return null;
    }
  }

  /**
   * Send order confirmation (Seller → Buyer) with seller branding
   */
  async sendOrderConfirmation(order: Order, seller: User, products: Product[]): Promise<void> {
    const buyerEmail = order.customerEmail;
    const buyerName = order.customerName;

    // Generate magic link for auto-login with seller context (buyer email from seller's shop)
    // Use seller.username with fallback to seller.id to ensure sellerContext is never null for buyer emails
    const sellerContext = seller.username || seller.id;
    if (!sellerContext) {
      logger.error("[Notifications] Cannot generate buyer magic link - seller has no username or ID");
      throw new Error('Seller must have username or ID to send buyer emails');
    }
    
    const magicLink = await this.generateMagicLinkForEmail(buyerEmail, `/orders/${order.id}`, sellerContext);

    // Generate branded email HTML with magic link (ASYNC)
    const emailHtml = await this.generateOrderConfirmationEmail(order, seller, products, buyerName, magicLink);
    
    // Get email metadata using EmailMetadataService
    const fromName = await this.emailMetadata.getFromName(seller);
    const replyTo = await this.emailMetadata.getReplyToEmail(seller);
    const subject = this.emailMetadata.generateSubject(EmailType.ORDER_CONFIRMATION, {
      orderId: order.id
    });

    // Generate invoice PDF using centralized DocumentGeneratorService
    let attachments: EmailAttachment[] = [];
    try {
      // Fetch order items
      const orderItems = await this.storage.getOrderItems(order.id);
      
      // Get product SKUs for items and compute delivery dates
      const itemsWithSku = await Promise.all(orderItems.map(async (item: OrderItem) => {
        const product = await this.storage.getProduct(item.productId);
        
        return {
          name: item.productName,
          sku: product?.sku || item.productId.substring(0, 8).toUpperCase(),
          variant: formatVariant(item.variant) || undefined,
          quantity: item.quantity,
          price: parseFloat(item.price).toFixed(2),
          subtotal: parseFloat(item.subtotal).toFixed(2),
          deliveryDate: computeDeliveryDate(item, order.createdAt),
        };
      }));

      // Build seller address from warehouse data
      const sellerAddressParts = [];
      if (seller.warehouseStreet) sellerAddressParts.push(seller.warehouseStreet);
      if (seller.warehouseCity) sellerAddressParts.push(seller.warehouseCity);
      if (seller.warehouseState) sellerAddressParts.push(seller.warehouseState);
      if (seller.warehousePostalCode) sellerAddressParts.push(seller.warehousePostalCode);
      if (seller.warehouseCountry) sellerAddressParts.push(seller.warehouseCountry);
      const sellerAddress = sellerAddressParts.join(', ');

      // CRITICAL: Use stored pricing data (Architecture 3)
      const subtotal = order.subtotalBeforeTax 
        ? parseFloat(order.subtotalBeforeTax).toFixed(2)
        : parseFloat(order.total).toFixed(2);
      const shipping = order.shippingCost 
        ? parseFloat(order.shippingCost).toFixed(2)
        : '0.00';
      const tax = order.taxAmount 
        ? parseFloat(order.taxAmount).toFixed(2)
        : '0.00';
      const total = parseFloat(order.total).toFixed(2);
      
      // Build invoice data using DocumentGenerator format
      const invoiceData = {
        invoice: {
          number: order.id.substring(0, 8).toUpperCase(),
          date: new Date(order.createdAt),
        },
        seller: {
          businessName: seller.companyName || (seller.firstName && seller.lastName 
            ? `${seller.firstName} ${seller.lastName}` 
            : seller.email!),
          email: seller.contactEmail || seller.email!,
          phone: seller.businessPhone || undefined,
          address: sellerAddress || undefined,
          logo: seller.storeLogo || undefined,
        },
        customer: {
          name: order.customerName,
          email: order.customerEmail,
          address: order.customerAddress,
        },
        order: {
          id: order.id,
          orderNumber: order.id.substring(0, 8).toUpperCase(),
          date: new Date(order.createdAt),
          total,
          tax,
          subtotal,
          shipping,
          paymentStatus: order.paymentStatus || 'pending',
        },
        items: itemsWithSku,
        currency: seller.listingCurrency || 'USD',
      };
      
      const { buffer } = await DocumentGenerator.generateInvoice(invoiceData);
      attachments.push({
        filename: `invoice-${order.id.slice(0, 8)}.pdf`,
        content: buffer,
        contentType: 'application/pdf',
      });
      logger.info(`[Notifications] Invoice PDF generated for order ${order.id}`);
    } catch (error) {
      logger.error("[Notifications] Failed to generate invoice PDF:", error);
      // Continue sending email without attachment
    }

    // Send email with seller branding
    const result = await this.sendEmail({
      to: buyerEmail,
      from: `${fromName} <noreply@upfirst.io>`,
      replyTo: replyTo || undefined,
      subject: subject,
      html: emailHtml,
      attachments,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          description: `Order confirmation email sent to ${buyerEmail}`,
          payload: JSON.stringify({
            emailType: 'order_confirmation',
            recipientEmail: buyerEmail,
            subject: subject,
            sellerName: seller.firstName || seller.username || 'Store',
            total: order.total,
            currency: order.currency,
          }),
          performedBy: null,
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log order confirmation event:", error);
      }
    }

    // Create in-app notification for seller
    if (seller.id) {
      const sellerSubject = this.emailMetadata.generateSubject(EmailType.SELLER_NEW_ORDER, {
        orderId: order.id,
        buyerName
      });
      await this.createNotification({
        userId: seller.id,
        type: 'seller_new_order',
        title: sellerSubject,
        message: `Order from ${buyerName} - $${parseFloat(order.total).toFixed(2)} - View details`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { orderId: order.id, buyerEmail, total: order.total },
      });
    }

    console.log(`[Notifications] Order confirmation sent to ${buyerEmail}:`, result.success);
  }

  /**
   * Send order shipped notification (Seller → Buyer) with tracking
   */
  async sendOrderShipped(order: Order, seller: User): Promise<void> {
    // Get products from order items
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const productIds = items.map((item: any) => item.productId);
    const products = await this.storage.getProductsByIds(productIds);
    
    // Generate email HTML (ASYNC)
    const emailHtml = await this.generateOrderShippedEmail(order, seller, products);
    
    // Get email metadata using EmailMetadataService
    const fromName = await this.emailMetadata.getFromName(seller);
    const replyTo = await this.emailMetadata.getReplyToEmail(seller);
    const subject = this.emailMetadata.generateSubject(EmailType.ORDER_SHIPPED, {
      orderId: order.id
    });

    const result = await this.sendEmail({
      to: order.customerEmail,
      from: `${fromName} <noreply@upfirst.io>`,
      replyTo: replyTo || undefined,
      subject: subject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          description: `Order shipped notification sent to ${order.customerEmail}`,
          payload: JSON.stringify({
            emailType: 'order_shipped',
            recipientEmail: order.customerEmail,
            subject: subject,
            trackingNumber: order.trackingNumber,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
          performedBy: null,
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log order shipped event:", error);
      }
    }

    // Create in-app notification for buyer (if they have an account)
    if (order.userId) {
      const buyerSubject = this.emailMetadata.generateSubject(EmailType.ORDER_SHIPPED, {
        orderId: order.id
      });
      await this.createNotification({
        userId: order.userId,
        type: 'order_shipped',
        title: buyerSubject,
        message: `Your order has been shipped${order.trackingNumber ? ` - Tracking: ${order.trackingNumber}` : ''}`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { orderId: order.id, trackingNumber: order.trackingNumber },
      });
    }

    console.log(`[Notifications] Shipping notification sent:`, result.success);
  }

  /**
   * Send item tracking notification (Seller → Buyer) when individual item ships
   */
  async sendItemTracking(order: Order, item: OrderItem, seller: User): Promise<void> {
    // Generate email HTML (ASYNC)
    const emailHtml = await this.generateItemTrackingEmail(order, item, seller);
    
    // Get email metadata using EmailMetadataService
    const fromName = await this.emailMetadata.getFromName(seller);
    const replyTo = await this.emailMetadata.getReplyToEmail(seller);
    const subject = this.emailMetadata.generateSubject(EmailType.ITEM_TRACKING_UPDATE, {
      productName: item.productName,
      orderId: order.id
    });

    // Generate packing slip PDF using centralized DocumentGenerator
    let attachments: EmailAttachment[] = [];
    try {
      // Get product for this item
      const product = await this.storage.getProduct(item.productId);
      
      // Build seller address from warehouse data
      const sellerAddressParts = [];
      if (seller.warehouseStreet) sellerAddressParts.push(seller.warehouseStreet);
      if (seller.warehouseCity) sellerAddressParts.push(seller.warehouseCity);
      if (seller.warehouseState) sellerAddressParts.push(seller.warehouseState);
      if (seller.warehousePostalCode) sellerAddressParts.push(seller.warehousePostalCode);
      if (seller.warehouseCountry) sellerAddressParts.push(seller.warehouseCountry);
      const sellerAddress = sellerAddressParts.join(', ');
      
      // Build packing slip data using DocumentGenerator format
      const packingSlipData = {
        packingSlip: {
          number: `PS-${order.id.substring(0, 8).toUpperCase()}`,
          date: new Date(),
        },
        seller: {
          businessName: seller.companyName || (seller.firstName && seller.lastName 
            ? `${seller.firstName} ${seller.lastName}` 
            : seller.email!),
          email: seller.contactEmail || seller.email!,
          phone: seller.businessPhone || undefined,
          address: sellerAddress || undefined,
          logo: seller.storeLogo || undefined,
        },
        customer: {
          name: order.customerName,
          address: order.customerAddress,
          email: order.customerEmail,
        },
        order: {
          id: order.id,
          orderNumber: order.id.substring(0, 8).toUpperCase(),
          date: new Date(order.createdAt),
        },
        items: [{
          name: item.productName,
          sku: product?.sku || item.productId.substring(0, 8).toUpperCase(),
          variant: formatVariant(item.variant) || undefined,
          quantity: item.quantity,
          deliveryDate: computeDeliveryDate(item, order.createdAt),
        }],
      };
      
      const { buffer } = await DocumentGenerator.generatePackingSlip(packingSlipData);
      attachments.push({
        filename: `packing-slip-${order.id.slice(0, 8)}-${item.id.slice(0, 8)}.pdf`,
        content: buffer,
        contentType: 'application/pdf',
      });
      logger.info(`[Notifications] Packing slip PDF generated for item ${item.id}`);
    } catch (error) {
      logger.error("[Notifications] Failed to generate packing slip PDF:", error);
      // Continue sending email without attachment
    }

    const result = await this.sendEmail({
      to: order.customerEmail,
      from: `${fromName} <noreply@upfirst.io>`,
      replyTo: replyTo || undefined,
      subject: subject,
      html: emailHtml,
      attachments,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'tracking_updated',
          description: `Item tracking notification sent to ${order.customerEmail}`,
          payload: JSON.stringify({
            emailType: 'item_tracking',
            recipientEmail: order.customerEmail,
            subject: subject,
            itemId: item.id,
            productName: item.productName,
            trackingNumber: item.trackingNumber,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
          performedBy: null,
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log item tracking event:", error);
      }
    }

    // Create in-app notification for buyer (if they have an account)
    if (order.userId) {
      const trackingSubject = this.emailMetadata.generateSubject(EmailType.ITEM_TRACKING_UPDATE, {
        productName: item.productName,
        orderId: order.id
      });
      await this.createNotification({
        userId: order.userId,
        type: 'item_tracking',
        title: trackingSubject,
        message: `${item.productName} has shipped${item.trackingNumber ? ` - Tracking: ${item.trackingNumber}` : ''}`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { 
          orderId: order.id, 
          itemId: item.id,
          trackingNumber: item.trackingNumber,
          productName: item.productName
        },
      });
    }

    console.log(`[Notifications] Item tracking notification sent for ${item.productName}:`, result.success);
  }

  /**
   * Send order delivered notification (Seller → Buyer) - TASK 5f
   */
  async sendOrderDelivered(order: Order, seller: User, products: Product[]): Promise<void> {
    // Generate email HTML (ASYNC)
    const emailHtml = await this.generateOrderDeliveredEmail(order, seller, products);
    
    // Get email metadata using EmailMetadataService
    const fromName = await this.emailMetadata.getFromName(seller);
    const replyTo = await this.emailMetadata.getReplyToEmail(seller);
    const subject = this.emailMetadata.generateSubject(EmailType.ORDER_DELIVERED, {
      orderId: order.id
    });

    const result = await this.sendEmail({
      to: order.customerEmail,
      from: `${fromName} <noreply@upfirst.io>`,
      replyTo: replyTo || undefined,
      subject: subject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          description: `Order delivered notification sent to ${order.customerEmail}`,
          payload: JSON.stringify({
            emailType: 'order_delivered',
            recipientEmail: order.customerEmail,
            subject: subject,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
          performedBy: null,
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log order delivered event:", error);
      }
    }

    console.log(`[Notifications] Order delivered notification sent:`, result.success);
  }

  /**
   * Send order refunded notification (Seller → Buyer) - TASK 5f
   */
  async sendOrderRefunded(order: Order, seller: User, refundAmount: number, refundedItemsData: Array<{ item: OrderItem; quantity: number; amount: number }>): Promise<void> {
    // Generate email HTML (ASYNC)
    const emailHtml = await this.generateOrderRefundedEmail(order, seller, refundAmount, refundedItemsData);
    
    // Get email metadata using EmailMetadataService
    const fromName = await this.emailMetadata.getFromName(seller);
    const replyTo = await this.emailMetadata.getReplyToEmail(seller);
    const subject = this.emailMetadata.generateSubject(EmailType.ORDER_REFUNDED, {
      orderId: order.id
    });

    const result = await this.sendEmail({
      to: order.customerEmail,
      from: `${fromName} <noreply@upfirst.io>`,
      replyTo: replyTo || undefined,
      subject: subject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'refund_processed',
          description: `Order refund notification sent to ${order.customerEmail}`,
          payload: JSON.stringify({
            emailType: 'order_refunded',
            recipientEmail: order.customerEmail,
            subject: subject,
            refundAmount,
            refundedItems: refundedItems.length,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
          performedBy: null,
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log order refunded event:", error);
      }
    }

    console.log(`[Notifications] Order refunded notification sent:`, result.success);
  }

  /**
   * Send refund confirmation email (Seller → Buyer) - TASK 8
   * Sends itemized refund confirmation with magic link for buyer auto-login
   */
  async sendRefundConfirmation(
    order: Order, 
    seller: User, 
    refundData: {
      amount: string;
      currency: string;
      reason?: string;
      lineItems: Array<{
        type: 'product' | 'shipping' | 'tax' | 'adjustment';
        description: string;
        amount: string;
        quantity?: number;
      }>;
    }
  ): Promise<void> {
    try {
      const buyerEmail = order.customerEmail;
      
      // Generate magic link for auto-login with seller context (buyer email from seller's shop)
      // Use seller.username with fallback to seller.id to ensure sellerContext is never null for buyer emails
      const sellerContext = seller.username || seller.id;
      if (!sellerContext) {
        logger.error("[Notifications] Cannot generate buyer magic link - seller has no username or ID");
        throw new Error('Seller must have username or ID to send buyer emails');
      }
      
      const magicLink = await this.generateMagicLinkForEmail(buyerEmail, `/orders/${order.id}`, sellerContext);
      
      // Prepare refund email data for template
      const refundEmailData: RefundEmailData = {
        order,
        seller,
        refundAmount: refundData.amount,
        currency: refundData.currency,
        reason: refundData.reason,
        lineItems: refundData.lineItems,
        orderAccessToken: magicLink,
      };
      
      // Generate branded email HTML with magic link (ASYNC)
      const emailHtml = await generateRefundConfirmationEmail(refundEmailData);
      
      // Get email metadata using EmailMetadataService
      const fromName = await this.emailMetadata.getFromName(seller);
      const replyTo = await this.emailMetadata.getReplyToEmail(seller);
      const subject = this.emailMetadata.generateSubject(EmailType.ORDER_REFUNDED, {
        orderId: order.id,
        amount: parseFloat(refundData.amount),
        currency: refundData.currency,
      });

      const result = await this.sendEmail({
        to: buyerEmail,
        from: `${fromName} <noreply@upfirst.io>`,
        replyTo: replyTo || undefined,
        subject: subject,
        html: emailHtml,
      });

      // Log email event to order_events table
      if (result.success) {
        try {
          await this.storage.createOrderEvent({
            orderId: order.id,
            eventType: 'refund_confirmation_sent',
            description: `Refund confirmation email sent to ${buyerEmail}`,
            payload: JSON.stringify({
              emailType: 'refund_confirmation',
              recipientEmail: buyerEmail,
              subject: subject,
              refundAmount: refundData.amount,
              currency: refundData.currency,
              reason: refundData.reason,
              lineItemsCount: refundData.lineItems.length,
              sellerName: seller.firstName || seller.username || 'Store',
            }),
            performedBy: null,
          });
        } catch (error) {
          logger.error("[Notifications] Failed to log refund confirmation event:", error);
        }
      }

      logger.info(`[Notifications] Refund confirmation email sent: ${result.success}`);
    } catch (error: any) {
      // Handle errors gracefully - log but don't throw (refund already processed)
      logger.error(`[Notifications] Failed to send refund confirmation email for order ${order.id}:`, error);
      logger.error(`[Notifications] Error details:`, error.message);
      // Don't throw - email failure should not roll back the refund
    }
  }

  /**
   * Send balance payment received notification (Seller → Buyer) - TASK 5f
   */
  async sendBalancePaymentReceived(order: Order, seller: User, balanceAmount: number): Promise<void> {
    // Generate email HTML (ASYNC)
    const emailHtml = await this.generateBalancePaymentReceivedEmail(order, seller, balanceAmount);
    
    // Get email metadata using EmailMetadataService
    const fromName = await this.emailMetadata.getFromName(seller);
    const replyTo = await this.emailMetadata.getReplyToEmail(seller);
    const subject = this.emailMetadata.generateSubject(EmailType.BALANCE_PAYMENT_RECEIVED, {
      orderId: order.id
    });

    const result = await this.sendEmail({
      to: order.customerEmail,
      from: `${fromName} <noreply@upfirst.io>`,
      replyTo: replyTo || undefined,
      subject: subject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'balance_payment_received',
          description: `Balance payment received notification sent to ${order.customerEmail}`,
          payload: JSON.stringify({
            emailType: 'balance_payment_received',
            recipientEmail: order.customerEmail,
            subject: subject,
            balanceAmount,
            currency: order.currency,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
          performedBy: null,
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log balance payment received event:", error);
      }
    }

    console.log(`[Notifications] Balance payment received notification sent:`, result.success);
  }

  /**
   * Send welcome email for first order (Seller → Buyer) - TASK 5f
   */
  async sendWelcomeEmailFirstOrder(order: Order, seller: User, products: Product[]): Promise<void> {
    // Generate magic link for auto-login
    const sellerContext = seller.username || seller.id;
    if (!sellerContext) {
      logger.error("[Notifications] Cannot generate buyer magic link - seller has no username or ID");
      throw new Error('Seller must have username or ID to send buyer emails');
    }
    
    const magicLink = await this.generateMagicLinkForEmail(order.customerEmail, `/orders/${order.id}`, sellerContext);
    
    // Generate email HTML (ASYNC)
    const emailHtml = await this.generateWelcomeEmailFirstOrder(order, seller, products, magicLink);
    
    // Get email metadata using EmailMetadataService
    const fromName = await this.emailMetadata.getFromName(seller);
    const replyTo = await this.emailMetadata.getReplyToEmail(seller);
    const subject = this.emailMetadata.generateSubject(EmailType.WELCOME_ORDER, {
      orderId: order.id,
      sellerName: seller.firstName || seller.username || 'Store'
    });

    const result = await this.sendEmail({
      to: order.customerEmail,
      from: `${fromName} <noreply@upfirst.io>`,
      replyTo: replyTo || undefined,
      subject: subject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          description: `Welcome email sent to ${order.customerEmail}`,
          payload: JSON.stringify({
            emailType: 'welcome_email_first_order',
            recipientEmail: order.customerEmail,
            subject: subject,
            sellerName: seller.firstName || seller.username || 'Store',
            productCount: products.length,
          }),
          performedBy: null,
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log welcome email event:", error);
      }
    }

    console.log(`[Notifications] Welcome email sent:`, result.success);
  }

  /**
   * Send item delivered notification (Seller → Buyer)
   * MIGRATED: Uses EmailMetadataService for From/ReplyTo/Subject + seller branding
   */
  async sendItemDelivered(order: Order, item: OrderItem, seller: User): Promise<void> {
    // Generate email HTML with seller branding (ASYNC)
    const emailHtml = await this.generateItemDeliveredEmail(order, item, seller);
    
    // Get email metadata using EmailMetadataService
    const fromName = await this.emailMetadata.getFromName(seller);
    const replyTo = await this.emailMetadata.getReplyToEmail(seller);
    const subject = this.emailMetadata.generateSubject(EmailType.ITEM_DELIVERED, {
      productName: item.productName,
      orderId: order.id
    });

    const result = await this.sendEmail({
      to: order.customerEmail,
      from: `${fromName} <noreply@upfirst.io>`,
      replyTo: replyTo || undefined,
      subject: subject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          description: `Item delivered notification sent to ${order.customerEmail} for ${item.productName}`,
          payload: JSON.stringify({
            emailType: 'item_delivered',
            recipientEmail: order.customerEmail,
            subject: subject,
            itemId: item.id,
            productName: item.productName,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
          performedBy: null,
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log item delivered event:", error);
      }
    }

    // Create in-app notification for buyer
    if (order.userId) {
      const deliveredSubject = this.emailMetadata.generateSubject(EmailType.ITEM_DELIVERED, {
        productName: item.productName,
        orderId: order.id
      });
      await this.createNotification({
        userId: order.userId,
        type: 'item_delivered',
        title: deliveredSubject,
        message: `${item.productName} has been delivered`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { 
          orderId: order.id, 
          itemId: item.id,
          productName: item.productName
        },
      });
    }

    console.log(`[Notifications] Item delivered notification sent for ${item.productName}:`, result.success);
  }

  /**
   * Send item cancelled notification (Seller → Buyer)
   * MIGRATED: Uses EmailMetadataService for From/ReplyTo/Subject + seller branding
   */
  async sendItemCancelled(order: Order, item: OrderItem, seller: User, reason?: string): Promise<void> {
    // Generate email HTML with seller branding (ASYNC)
    const emailHtml = await this.generateItemCancelledEmail(order, item, seller, reason);
    
    // Get email metadata using EmailMetadataService
    const fromName = await this.emailMetadata.getFromName(seller);
    const replyTo = await this.emailMetadata.getReplyToEmail(seller);
    const subject = this.emailMetadata.generateSubject(EmailType.ITEM_CANCELLED, {
      productName: item.productName,
      orderId: order.id
    });

    const result = await this.sendEmail({
      to: order.customerEmail,
      from: `${fromName} <noreply@upfirst.io>`,
      replyTo: replyTo || undefined,
      subject: subject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          description: `Item cancelled notification sent to ${order.customerEmail} for ${item.productName}`,
          payload: JSON.stringify({
            emailType: 'item_cancelled',
            recipientEmail: order.customerEmail,
            subject: subject,
            itemId: item.id,
            productName: item.productName,
            reason: reason || null,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
          performedBy: null,
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log item cancelled event:", error);
      }
    }

    // Create in-app notification for buyer
    if (order.userId) {
      const cancelSubject = this.emailMetadata.generateSubject(EmailType.ITEM_CANCELLED, {
        productName: item.productName,
        orderId: order.id
      });
      await this.createNotification({
        userId: order.userId,
        type: 'item_cancelled',
        title: cancelSubject,
        message: `${item.productName} has been cancelled${reason ? `: ${reason}` : ''}`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { 
          orderId: order.id, 
          itemId: item.id,
          productName: item.productName,
          reason
        },
      });
    }

    console.log(`[Notifications] Item cancelled notification sent for ${item.productName}:`, result.success);
  }

  /**
   * Send item refunded notification (Seller → Buyer)
   * MIGRATED: Uses EmailMetadataService for From/ReplyTo/Subject + seller branding
   */
  async sendItemRefunded(order: Order, item: OrderItem, seller: User, refundAmount: number, refundedQuantity: number, currency: string = 'USD'): Promise<void> {
    // Generate email HTML with seller branding (ASYNC)
    const emailHtml = await this.generateItemRefundedEmail(order, item, seller, refundAmount, refundedQuantity);
    
    // Get email metadata using EmailMetadataService
    const fromName = await this.emailMetadata.getFromName(seller);
    const replyTo = await this.emailMetadata.getReplyToEmail(seller);
    const subject = this.emailMetadata.generateSubject(EmailType.ITEM_REFUNDED, {
      productName: item.productName,
      orderId: order.id,
      amount: refundAmount,
      currency: currency
    });

    const result = await this.sendEmail({
      to: order.customerEmail,
      from: `${fromName} <noreply@upfirst.io>`,
      replyTo: replyTo || undefined,
      subject: subject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'refund_processed',
          description: `Item refund notification sent to ${order.customerEmail} for ${item.productName}`,
          payload: JSON.stringify({
            emailType: 'item_refunded',
            recipientEmail: order.customerEmail,
            subject: subject,
            itemId: item.id,
            productName: item.productName,
            refundAmount,
            refundedQuantity,
            currency,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
          performedBy: null,
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log item refunded event:", error);
      }
    }

    // Create in-app notification for buyer
    if (order.userId) {
      const refundSubject = this.emailMetadata.generateSubject(EmailType.ITEM_REFUNDED, {
        productName: item.productName,
        orderId: order.id,
        amount: refundAmount,
        currency: currency
      });
      await this.createNotification({
        userId: order.userId,
        type: 'item_refunded',
        title: refundSubject,
        message: `$${refundAmount.toFixed(2)} refund processed for ${item.productName}`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { 
          orderId: order.id, 
          itemId: item.id,
          productName: item.productName,
          refundAmount,
          refundedQuantity
        },
      });
    }

    console.log(`[Notifications] Item refunded notification sent for ${item.productName}:`, result.success);
  }

  /**
   * Send product listed confirmation (Upfirst → Seller)
   */
  async sendProductListed(seller: User, product: Product): Promise<void> {
    const emailHtml = this.generateProductListedEmail(seller, product);
    const template = this.messages.productListed(product);

    const result = await this.sendEmail({
      from: 'UPPFIRST <noreply@upfirst.io>',
      to: seller.email!,
      replyTo: this.emailConfig.getSupportEmail(),
      subject: template.emailSubject,
      html: emailHtml,
    });

    await this.createNotification({
      userId: seller.id,
      type: 'product_listed',
      title: 'Product Listed Successfully',
      message: `${product.name} is now live on your store`,
      emailSent: result.success ? 1 : 0,
      emailId: result.emailId,
      metadata: { productId: product.id, productName: product.name },
    });

    console.log(`[Notifications] Product listed email sent:`, result.success);
  }

  /**
   * Send authentication code (6-digit code) with auto-login link
   * Returns true if email was sent successfully, false otherwise
   */
  async sendAuthCode(email: string, code: string, magicLinkToken?: string): Promise<boolean> {
    try {
      logger.info(`[Notifications] Attempting to send auth code to ${email}`);
      logger.info(`[Notifications] Environment: ${process.env.NODE_ENV}`);
      
      const emailHtml = this.generateAuthCodeEmail(code, magicLinkToken);
      
      // Generate subject using EmailMetadataService
      const subject = this.emailMetadata.generateSubject(EmailType.AUTH_CODE, {});

      const result = await this.sendEmail({
        to: email,
        from: 'noreply@upfirst.io', // Verified email address in Resend
        replyTo: this.emailConfig.getSupportEmail(),
        subject: subject,
        html: emailHtml,
      });

      console.log(`[Notifications] Send result:`, JSON.stringify({
        success: result.success,
        emailId: result.emailId,
        error: result.error
      }));

      if (!result.success) {
        console.error(`[Notifications] Failed to send auth code to ${email}:`, result.error);
        return false;
      } else {
        logger.info(`[Notifications] Auth code sent successfully to ${email}, emailId: ${result.emailId}`);
        return true;
      }
    } catch (error: any) {
      console.error(`[Notifications] Error in sendAuthCode:`, error);
      return false;
    }
  }

  /**
   * Send magic link authentication
   * Returns true if email was sent successfully, false otherwise
   */
  async sendMagicLink(email: string, link: string): Promise<boolean> {
    try {
      logger.info(`[Notifications] Attempting to send magic link to ${email}`);
      logger.info(`[Notifications] Environment: ${process.env.NODE_ENV}`);
      
      const emailHtml = this.generateMagicLinkEmail(link);
      
      // Generate subject using EmailMetadataService
      const subject = this.emailMetadata.generateSubject(EmailType.MAGIC_LINK, {});

      const result = await this.sendEmail({
        to: email,
        from: 'noreply@upfirst.io', // Verified email address in Resend
        replyTo: this.emailConfig.getSupportEmail(),
        subject: subject,
        html: emailHtml,
      });

      if (!result.success) {
        console.error(`[Notifications] Failed to send magic link to ${email}:`, result.error);
        return false;
      } else {
        logger.info(`[Notifications] Magic link sent successfully to ${email}, emailId: ${result.emailId}`);
        return true;
      }
    } catch (error: any) {
      console.error(`[Notifications] Error in sendMagicLink:`, error);
      return false;
    }
  }

  /**
   * Generate branded order confirmation email with seller banner and product images
   * SELLER → BUYER EMAIL - Uses seller branding infrastructure
   * DARK MODE SAFE - Works across all email clients
   */
  private async generateOrderConfirmationEmail(order: Order, seller: User, products: Product[], buyerName: string, magicLink: string): Promise<string> {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    
    // Fetch actual order items from database to get discount information
    const dbOrderItems = await this.storage.getOrderItems(order.id);
    
    // Compute delivery dates for each item
    const orderItems = dbOrderItems.map((dbItem: OrderItem) => ({
      ...dbItem,
      deliveryDate: computeDeliveryDate(dbItem, order.createdAt)
    }));
    
    // Generate seller header and footer
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    // Build product thumbnails using actual order items
    const productThumbnailsHtml = orderItems.map((orderItem: OrderItem) => {
      const itemPrice = parseFloat(orderItem.price);
      const originalPrice = orderItem.originalPrice ? parseFloat(orderItem.originalPrice) : null;
      const discountAmount = orderItem.discountAmount ? parseFloat(orderItem.discountAmount) : null;
      const subtotal = parseFloat(orderItem.subtotal);
      
      // Build product thumbnail HTML with discount info
      const formattedVariant = formatVariant(orderItem.variant);
      const variantText = formattedVariant 
        ? `<br><span style="font-size: 13px; color: #9ca3af !important;">${formattedVariant}</span>` 
        : '';
      
      const productImage = orderItem.productImage || '';
      const productName = orderItem.productName;
      
      // Format delivery date if available
      let deliveryDateHtml = '';
      if (orderItem.deliveryDate) {
        const formattedDate = format(new Date(orderItem.deliveryDate), 'MMMM d, yyyy');
        deliveryDateHtml = `
            <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <strong>Estimated Delivery:</strong> ${formattedDate}
            </p>`;
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
              Quantity: ${orderItem.quantity} × ${order.currency} ${itemPrice.toFixed(2)}${variantText}
            </p>
            ${deliveryDateHtml}
            ${originalPrice && discountAmount ? `
            <p style="margin: 5px 0 0; font-size: 13px; color: #10b981 !important; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <span style="text-decoration: line-through; color: #9ca3af !important;">${order.currency} ${originalPrice.toFixed(2)}</span> 
              Save ${order.currency} ${(discountAmount * orderItem.quantity).toFixed(2)}
            </p>
            ` : ''}
          </td>
          <td style="text-align: right; vertical-align: top; white-space: nowrap; padding-left: 15px;">
            <p style="margin: 0; font-weight: 600; font-size: 15px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              ${order.currency} ${subtotal.toFixed(2)}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
      `.trim();
    }).join('');
    
    // Build content
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Order Confirmation
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Thank you for your order, ${buyerName}!
      </p>

      <h3 style="margin: 20px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Order Items
      </h3>
      ${productThumbnailsHtml}
      
      ${generateOrderSummary(order, orderItems)}
      
      ${(() => {
        // Build billing address from individual fields
        const hasBilling = order.billingStreet;
        const billingAddr = hasBilling
          ? `${order.billingName}\n${order.billingStreet}\n${order.billingCity}, ${order.billingState} ${order.billingPostalCode}\n${order.billingCountry}`
          : order.customerAddress;
        
        // Build shipping address from individual fields  
        const hasShipping = order.shippingStreet;
        const shippingAddr = hasShipping
          ? `${order.shippingStreet}\n${order.shippingCity}, ${order.shippingState} ${order.shippingPostalCode}\n${order.shippingCountry}`
          : order.customerAddress;
        
        const billingHtml = generateBillingAddress(billingAddr);
        const shippingHtml = generateShippingAddress(shippingAddr);
        
        return billingHtml + '\n      ' + shippingHtml;
      })()}
      
      ${generateMagicLinkButton(magicLink, 'View Order')}
      
      <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        If you have any questions about your order, please reply to this email.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Order confirmation - Order #${order.id.slice(0, 8)}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate order shipped email - SELLER → BUYER EMAIL
   */
  private async generateOrderShippedEmail(order: Order, seller: User, products: Product[]): Promise<string> {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    // Build product thumbnails
    const productThumbnailsHtml = items.map((item: any) => {
      const product: Product = products.find((p: any) => p.id === item.productId) || {
        id: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
      } as Product;
      
      return generateProductThumbnail(product, item.quantity, formatVariant(item.variant));
    }).join('');
    
    // Generate tracking info if available
    const trackingHtml = order.trackingNumber 
      ? generateTrackingInfo(order.carrier || 'USPS', order.trackingNumber, order.trackingLink || '')
      : '<p style="margin: 20px 0; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">You\'ll receive tracking information shortly.</p>';
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Your Order Has Shipped!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Great news ${order.customerName}! Your order is on its way.
      </p>

      <h3 style="margin: 20px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Shipped Items
      </h3>
      ${productThumbnailsHtml}
      
      ${trackingHtml}
      
      ${generateShippingAddress(order.customerAddress)}
      
      ${order.trackingLink ? generateMagicLinkButton(order.trackingLink, 'Track Package') : ''}
      
      <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        Questions? Reply to this email for assistance.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Order #${order.id.slice(0, 8)} has shipped`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate order delivered email - SELLER → BUYER EMAIL
   */
  private async generateOrderDeliveredEmail(order: Order, seller: User, products: Product[]): Promise<string> {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    // Build product thumbnails
    const productThumbnailsHtml = items.map((item: any) => {
      const product: Product = products.find((p: any) => p.id === item.productId) || {
        id: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
      } as Product;
      
      return generateProductThumbnail(product, item.quantity, formatVariant(item.variant));
    }).join('');
    
    const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-US', { 
      month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : new Date().toLocaleDateString('en-US', { 
      month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Order Delivered!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Good news ${order.customerName}! Your order has been delivered.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5 !important; border-left: 4px solid #10b981; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0; color: #047857 !important; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Delivered on ${deliveredDate}
        </p>
      </div>

      <h3 style="margin: 20px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Delivered Items
      </h3>
      ${productThumbnailsHtml}
      
      ${generateShippingAddress(order.customerAddress)}
      
      <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        We hope you love your order! If you have any issues, please reply to this email.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Order #${order.id.slice(0, 8)} has been delivered`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate order refunded email - SELLER → BUYER EMAIL
   * Architecture 3: Uses actual refunded amounts from refund processing
   */
  private async generateOrderRefundedEmail(order: Order, seller: User, refundAmount: number, refundedItemsData: Array<{ item: OrderItem; quantity: number; amount: number }>): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    const currency = order.currency || 'USD';
    
    // Architecture 3: Calculate refund breakdown from actual refunded amounts
    // Sum up the ACTUAL refunded amounts (not full item subtotals)
    const itemsSubtotal = refundedItemsData.reduce((sum, data) => sum + data.amount, 0);
    
    // Determine refund components by comparing refundAmount to items
    const orderShipping = parseFloat(order.shippingCost || '0');
    const orderTax = parseFloat(order.taxAmount || '0');
    const orderTotal = parseFloat(order.total);
    
    // Calculate what portion of shipping/tax is refunded
    // If refundAmount > itemsSubtotal, the difference is shipping+tax
    const shippingTaxPortion = Math.max(0, refundAmount - itemsSubtotal);
    
    // Distribute shipping/tax portion (works for both full and partial refunds)
    let refundedShipping = 0;
    let refundedTax = 0;
    
    if (shippingTaxPortion > 0) {
      // Detect if this is a full refund
      const isFullRefund = refundAmount >= (orderTotal - 0.01);
      
      if (isFullRefund) {
        // Full refund: use exact order shipping and tax
        refundedShipping = orderShipping;
        refundedTax = orderTax;
      } else {
        // Partial refund: distribute shippingTaxPortion proportionally
        const totalShippingTax = orderShipping + orderTax;
        if (totalShippingTax > 0) {
          // Proportional distribution
          const shippingRatio = orderShipping / totalShippingTax;
          refundedShipping = Math.min(shippingTaxPortion * shippingRatio, orderShipping);
          refundedTax = Math.min(shippingTaxPortion - refundedShipping, orderTax);
        } else {
          // No shipping/tax on order, assign all to shipping (edge case)
          refundedShipping = shippingTaxPortion;
        }
      }
    }
    
    // Build refunded items list with ACTUAL refunded quantities
    const refundedItemsHtml = refundedItemsData.map(({ item, quantity }) => 
      generateProductThumbnail({
        id: item.productId,
        name: item.productName,
        image: item.productImage,
        price: item.price.toString(),
      } as Product, quantity, formatVariant(item.variant))
    ).join('');
    
    // Build refund breakdown - show components that sum to refundAmount
    const breakdownHtml = `
      <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
        <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Refund Breakdown
        </h3>
        <div style="margin: 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Items:</span>
            <span style="color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${currency} ${itemsSubtotal.toFixed(2)}</span>
          </div>
          ${refundedShipping > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Shipping:</span>
            <span style="color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${currency} ${refundedShipping.toFixed(2)}</span>
          </div>
          ` : ''}
          ${refundedTax > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Tax:</span>
            <span style="color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${currency} ${refundedTax.toFixed(2)}</span>
          </div>
          ` : ''}
          <div style="border-top: 1px solid #e5e7eb; margin: 12px 0; padding-top: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #1a1a1a !important; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">Total Refunded:</span>
              <span style="color: #1a1a1a !important; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${currency} ${refundAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Refund Processed
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${order.customerName}, your refund has been processed.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #eff6ff !important; border-left: 4px solid #3b82f6; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px; color: #1e40af !important; font-weight: 600; font-size: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          $${refundAmount.toFixed(2)} refunded
        </p>
        <p style="margin: 0; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Refund to your original payment method • Processing time: 5-10 business days
        </p>
      </div>

      <h3 style="margin: 20px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Refunded Items
      </h3>
      ${refundedItemsHtml}
      
      ${breakdownHtml}
      
      <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        Questions about your refund? Reply to this email for assistance.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Refund processed for Order #${order.id.slice(0, 8)}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate balance payment request email - SELLER → BUYER EMAIL
   * Comprehensive email with deposit/balance breakdown, shipping costs, and magic link
   */
  private async generateBalancePaymentRequestEmail(
    order: Order, 
    seller: User, 
    balanceRequest: BalanceRequest,
    sessionToken: string
  ): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    // Build magic link URL
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    const magicLinkUrl = `${baseUrl}/orders/${order.id}/pay-balance?token=${sessionToken}`;
    
    // Format currency helper
    const formatCurrency = (cents: number, currency: string = 'USD') => {
      const amount = cents / 100;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };
    
    // Extract amounts
    const depositAmount = order.depositAmountCents || 0;
    const balanceDue = balanceRequest.balanceDueCents || 0;
    const currency = balanceRequest.currency || order.currency || 'USD';
    
    // Extract shipping costs from shippingSnapshot if available
    let shippingCost = 0;
    if (balanceRequest.shippingSnapshot && typeof balanceRequest.shippingSnapshot === 'object') {
      const snapshot = balanceRequest.shippingSnapshot as any;
      shippingCost = snapshot.shippingCostCents || snapshot.shipping_cost_cents || 0;
    }
    
    // Calculate product balance (balance due minus shipping)
    const productBalance = balanceDue - shippingCost;
    
    // Format expiry date (7 days from now)
    const expiryDate = new Date(balanceRequest.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiryDateStr = expiryDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Complete Your Order - Balance Payment Required
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${order.customerName}, your pre-order is ready for final payment!
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
        <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Order Details
        </h3>
        <p style="margin: 0 0 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <strong>Order #:</strong> ${order.id.slice(0, 8)}
        </p>
        <p style="margin: 0 0 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <strong>Deposit Paid:</strong> ${formatCurrency(depositAmount, currency)}
        </p>
        <p style="margin: 0; color: #1a1a1a !important; font-weight: 600; font-size: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          <strong>Balance Due:</strong> ${formatCurrency(balanceDue, currency)}
        </p>
      </div>

      <div style="margin: 20px 0; padding: 20px; background-color: #fef3c7 !important; border-left: 4px solid #f59e0b; border-radius: 8px;" class="dark-mode-bg-white">
        <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #92400e !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Balance Breakdown
        </h3>
        <p style="margin: 0 0 8px; color: #78350f !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Product Balance: ${formatCurrency(productBalance, currency)}
        </p>
        <p style="margin: 0 0 8px; color: #78350f !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Shipping: ${formatCurrency(shippingCost, currency)}
        </p>
        <p style="margin: 0; padding-top: 8px; border-top: 1px solid #fbbf24; color: #92400e !important; font-weight: 600; font-size: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Total Balance Due: ${formatCurrency(balanceDue, currency)}
        </p>
      </div>

      ${(() => {
        console.log('[DEBUG] magicLinkUrl for balance payment:', magicLinkUrl);
        console.log('[DEBUG] magicLinkUrl type:', typeof magicLinkUrl);
        return generateMagicLinkButton(magicLinkUrl, 'Pay Balance Now');
      })()}
      
      <div style="margin: 30px 0; padding: 20px; background-color: #eff6ff !important; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px; color: #1e40af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">
          <strong>Note:</strong> You can update your shipping address before completing payment.
        </p>
        <p style="margin: 0; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">
          This payment link expires on <strong>${expiryDateStr}</strong> (7 days).
        </p>
      </div>
      
      <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        Questions? Contact ${seller.email || 'us'} for assistance.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Balance payment required: ${formatCurrency(balanceDue, currency)}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate balance payment reminder email - SELLER → BUYER EMAIL
   */
  private async generateBalancePaymentReminderEmail(order: Order, seller: User, paymentLink: string): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    const balanceAmount = parseFloat(order.remainingBalance) || 0;
    const depositAmount = parseFloat(order.amountPaid) || 0;
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Balance Payment Due
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${order.customerName}, your balance payment is now due for order #${order.id.slice(0, 8)}.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #fef3c7 !important; border-left: 4px solid #f59e0b; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px; color: #92400e !important; font-weight: 600; font-size: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          $${balanceAmount.toFixed(2)} due
        </p>
        <p style="margin: 0; color: #78350f !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Deposit paid: $${depositAmount.toFixed(2)} • Total order: $${order.total}
        </p>
      </div>

      ${generateMagicLinkButton(paymentLink, 'Pay Balance Now')}
      
      <p style="margin: 30px 0 0; padding: 20px; background-color: #fef2f2 !important; border-radius: 8px; color: #991b1b !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        <strong>Important:</strong> If payment is not received, your order may be cancelled.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Balance payment due: $${balanceAmount.toFixed(2)}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate balance payment received email - SELLER → BUYER EMAIL
   */
  private async generateBalancePaymentReceivedEmail(order: Order, seller: User, balanceAmount: number): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    const depositAmount = parseFloat(order.amountPaid) || 0;
    const totalPaid = depositAmount + balanceAmount;
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Balance Payment Received!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Thank you ${order.customerName}! Your balance payment has been received.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5 !important; border-left: 4px solid #10b981; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px; color: #047857 !important; font-weight: 600; font-size: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          $${balanceAmount.toFixed(2)} paid
        </p>
        <p style="margin: 0; color: #065f46 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Total paid: $${totalPaid.toFixed(2)} • Order complete
        </p>
      </div>

      <h3 style="margin: 30px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Next Steps
      </h3>
      <p style="margin: 0 0 20px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Your order is now complete and will be processed for shipping. You'll receive a shipping notification once your order is on its way.
      </p>
      
      <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        Questions? Reply to this email for assistance.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Balance payment received: $${balanceAmount.toFixed(2)}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate payment failed email - SELLER → BUYER EMAIL
   */
  private async generatePaymentFailedEmail(order: Order, seller: User, amount: number, reason: string, retryLink?: string): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Payment Failed
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${order.customerName}, we were unable to process your payment for order #${order.id.slice(0, 8)}.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #fef2f2 !important; border-left: 4px solid #ef4444; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px; color: #991b1b !important; font-weight: 600; font-size: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Payment of $${amount.toFixed(2)} failed
        </p>
        <p style="margin: 0; color: #7f1d1d !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Reason: ${reason}
        </p>
      </div>

      <h3 style="margin: 30px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Action Required
      </h3>
      <p style="margin: 0 0 20px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Please update your payment method to complete this order. If not resolved, your order will be cancelled.
      </p>

      ${retryLink ? generateMagicLinkButton(retryLink, 'Update Payment Method') : ''}
      
      <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        Need help? Reply to this email or contact support.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Payment failed for Order #${order.id.slice(0, 8)}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate welcome email for first order - SELLER → BUYER EMAIL
   */
  private async generateWelcomeEmailFirstOrder(order: Order, seller: User, products: Product[], magicLink: string): Promise<string> {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    // Build product thumbnails
    const productThumbnailsHtml = items.map((item: any) => {
      const product: Product = products.find((p: any) => p.id === item.productId) || {
        id: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
      } as Product;
      
      return generateProductThumbnail(product, item.quantity, formatVariant(item.variant));
    }).join('');
    
    const storeName = seller.firstName || seller.username || 'our store';
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Welcome to ${storeName}!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Thank you for your first order, ${order.customerName}! We're excited to have you as a customer.
      </p>

      ${seller.bio ? `
        <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
          <p style="margin: 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
            ${seller.bio}
          </p>
        </div>
      ` : ''}

      <h3 style="margin: 30px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Your Order
      </h3>
      ${productThumbnailsHtml}
      
      ${generateOrderSummary(order)}
      
      ${generateMagicLinkButton(magicLink, 'View Order')}
      
      <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        Stay connected! Follow us for updates, new products, and exclusive offers.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Welcome! Order #${order.id.slice(0, 8)} confirmed`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate item tracking email (Seller → Buyer) for individual item shipment - SELLER → BUYER EMAIL
   */
  private async generateItemTrackingEmail(order: Order, item: OrderItem, seller: User): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    // Build product thumbnail for shipped item
    const product: Product = {
      id: item.productId,
      name: item.productName,
      image: item.productImage,
      price: item.price.toString(),
    } as Product;
    
    const productThumbnailHtml = generateProductThumbnail(product, item.quantity, formatVariant(item.variant));
    
    // Generate tracking info if available
    const trackingHtml = item.trackingNumber 
      ? generateTrackingInfo(item.carrier || 'USPS', item.trackingNumber, item.trackingLink || '')
      : '<p style="margin: 20px 0; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">You\'ll receive tracking information shortly.</p>';
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Item Shipped!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${order.customerName}, an item from your order has been shipped.
      </p>

      <h3 style="margin: 20px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Shipped Item
      </h3>
      ${productThumbnailHtml}
      
      ${trackingHtml}
      
      ${generateShippingAddress(order.customerAddress)}
      
      ${item.trackingLink ? generateMagicLinkButton(item.trackingLink, 'Track Package') : ''}
      
      <p style="margin: 30px 0 0; padding: 20px; background-color: #eff6ff !important; border-radius: 8px; color: #1e40af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        <strong>Note:</strong> Other items from your order may ship separately.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `${item.productName} from Order #${order.id.slice(0, 8)} has shipped`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate product listed email (Upfirst → Seller) - Using new infrastructure
   */
  private generateProductListedEmail(seller: User, product: Product): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    const productUrl = `${baseUrl}/seller/products`;
    const storeUrl = seller.username ? `${baseUrl}/${seller.username}` : baseUrl;
    
    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Your Product is Live!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${seller.firstName || 'there'}, your product has been successfully listed on your UPPFIRST store.
      </p>

      <!-- Product Card -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
        <tr>
          <td style="padding: 25px;">
            ${product.image ? `
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${product.image}" alt="${product.name}" style="display: inline-block; max-width: 200px; height: auto; border-radius: 8px; border: 0;">
            </div>
            ` : ''}
            <h3 style="margin: 0 0 15px; font-size: 20px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              ${product.name}
            </h3>
            <p style="margin: 0 0 8px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              <strong>Price:</strong> $${product.price}
            </p>
            <p style="margin: 0 0 8px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              <strong>Type:</strong> ${product.productType}
            </p>
            ${product.category ? `
            <p style="margin: 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              <strong>Category:</strong> ${product.category}
            </p>
            ` : ''}
          </td>
        </tr>
      </table>

      ${generateCTAButton('View Product', productUrl)}

      <!-- Next Steps -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0; background-color: #f0f9ff !important; border-radius: 8px;" class="dark-mode-bg-white">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0 0 15px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              Next Steps:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6;">
              <li>Share your product on social media</li>
              <li>Add more products to grow your catalog</li>
              <li>View your storefront: <a href="${storeUrl}" style="color: #6366f1 !important; text-decoration: underline;">${seller.username ? seller.username + '.upfirst.io' : 'your store'}</a></li>
            </ul>
          </td>
        </tr>
      </table>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Your product "${product.name}" is now live on your store`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate item delivered email (Seller → Buyer, branded)
   * MIGRATED: Uses generateSellerHeader/Footer + generateEmailBaseLayout
   */
  private async generateItemDeliveredEmail(order: Order, item: OrderItem, seller: User): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Item Delivered! 📦
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Your item from order #${order.id.slice(0, 8)} has been delivered
      </p>

      <div style="display: flex; gap: 15px; padding: 20px; background: #f9fafb !important; border-radius: 8px; margin: 20px 0;" class="dark-mode-bg-white">
        ${item.productImage ? `<img src="${item.productImage}" alt="${item.productName}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px;">` : ''}
        <div style="flex: 1;">
          <h3 style="margin: 0 0 10px 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${item.productName}</h3>
          <span style="display: inline-block; padding: 6px 12px; background: #22c55e; color: white; border-radius: 4px; font-size: 12px; font-weight: 600;">DELIVERED</span>
          <p style="color: #6b7280 !important; margin: 10px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Quantity: ${item.quantity} • $${parseFloat(item.price).toFixed(2)} each</p>
        </div>
      </div>

      <div style="background: #f0f9ff !important; padding: 20px; border-radius: 8px; margin: 20px 0;" class="dark-mode-bg-white">
        <p style="margin: 0; font-weight: 600; color: #0369a1 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">We hope you love your purchase!</p>
        <p style="margin: 10px 0 0 0; color: #6b7280 !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">If you have any questions or concerns, please reply to this email.</p>
      </div>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Item delivered from order #${order.id.slice(0, 8)}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate item cancelled email (Seller → Buyer, branded)
   * MIGRATED: Uses generateSellerHeader/Footer + generateEmailBaseLayout
   */
  private async generateItemCancelledEmail(order: Order, item: OrderItem, seller: User, reason?: string): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Item Cancelled
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        An item from your order #${order.id.slice(0, 8)} has been cancelled
      </p>

      <div style="display: flex; gap: 15px; padding: 20px; background: #f9fafb !important; border-radius: 8px; margin: 20px 0;" class="dark-mode-bg-white">
        ${item.productImage ? `<img src="${item.productImage}" alt="${item.productName}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px;">` : ''}
        <div style="flex: 1;">
          <h3 style="margin: 0 0 10px 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${item.productName}</h3>
          <span style="display: inline-block; padding: 6px 12px; background: #ef4444; color: white; border-radius: 4px; font-size: 12px; font-weight: 600;">CANCELLED</span>
          <p style="color: #6b7280 !important; margin: 10px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Quantity: ${item.quantity} • $${parseFloat(item.price).toFixed(2)} each</p>
        </div>
      </div>

      ${reason ? `
        <div style="background: #fef2f2 !important; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;" class="dark-mode-bg-white">
          <p style="margin: 0; font-weight: 600; color: #991b1b !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Cancellation Reason:</p>
          <p style="margin: 10px 0 0 0; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${reason}</p>
        </div>
      ` : ''}

      <div style="background: #f0f9ff !important; padding: 20px; border-radius: 8px; margin: 20px 0;" class="dark-mode-bg-white">
        <p style="margin: 0; font-weight: 600; color: #0369a1 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Refund Information</p>
        <p style="margin: 10px 0 0 0; color: #6b7280 !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">If you were charged for this item, you'll receive a refund within 5-10 business days.</p>
      </div>

      <p style="color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">If you have any questions, please reply to this email and we'll be happy to help.</p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Item cancelled from order #${order.id.slice(0, 8)}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate item refunded email (Seller → Buyer, branded)
   * MIGRATED: Uses generateSellerHeader/Footer + generateEmailBaseLayout
   */
  private async generateItemRefundedEmail(order: Order, item: OrderItem, seller: User, refundAmount: number, refundedQuantity: number): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Refund Processed
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Your refund for order #${order.id.slice(0, 8)} has been processed
      </p>

      <div style="text-align: center; padding: 30px; background: #f0fdf4 !important; border-radius: 8px; margin: 20px 0;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px 0; color: #166534 !important; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Refund Amount</p>
        <div style="font-size: 32px; font-weight: bold; color: #22c55e !important; margin: 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">$${refundAmount.toFixed(2)}</div>
        <p style="margin: 0; color: #6b7280 !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">This amount will appear in your account within 5-10 business days</p>
      </div>

      <div style="display: flex; gap: 15px; padding: 20px; background: #f9fafb !important; border-radius: 8px; margin: 20px 0;" class="dark-mode-bg-white">
        ${item.productImage ? `<img src="${item.productImage}" alt="${item.productName}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px;">` : ''}
        <div style="flex: 1;">
          <h3 style="margin: 0 0 10px 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${item.productName}</h3>
          <span style="display: inline-block; padding: 6px 12px; background: #3b82f6; color: white; border-radius: 4px; font-size: 12px; font-weight: 600;">REFUNDED</span>
          <p style="color: #6b7280 !important; margin: 10px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Refunded Quantity: ${refundedQuantity} • $${(refundAmount / refundedQuantity).toFixed(2)} each</p>
        </div>
      </div>

      <div style="background: #f0f9ff !important; padding: 20px; border-radius: 8px; margin: 20px 0;" class="dark-mode-bg-white">
        <p style="margin: 0; font-weight: 600; color: #0369a1 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Refund Details</p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #6b7280 !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <li>The refund has been issued to your original payment method</li>
          <li>Processing time: 5-10 business days</li>
          <li>You'll see the credit from your bank or card issuer</li>
        </ul>
      </div>

      <p style="color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">If you have any questions about this refund, please reply to this email.</p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Refund processed for order #${order.id.slice(0, 8)} - $${refundAmount.toFixed(2)}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate auth code email - UPFIRST → USER - Uses new infrastructure
   * DARK MODE SAFE - Works across all email clients
   */
  private generateAuthCodeEmail(code: string, magicLinkToken?: string): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    const magicLink = magicLinkToken ? `${baseUrl}/api/auth/email/verify-magic-link?token=${magicLinkToken}` : null;

    // Generate Upfirst header and footer using infrastructure
    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();

    const content = `
      <div style="text-align: center;">
        <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Sign in to Upfirst
        </h1>
        
        ${magicLink ? `
          <p style="margin: 20px 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px;" class="dark-mode-text-dark">
            Click the button below to sign in instantly:
          </p>
          ${generateMagicLinkButton(magicLink, 'Sign In to Upfirst')}
          
          <div style="margin: 30px 0; padding: 20px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px;">
              OR
            </p>
          </div>
          
          <p style="margin: 20px 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px;" class="dark-mode-text-dark">
            Enter this code manually:
          </p>
        ` : `
          <p style="margin: 20px 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px;" class="dark-mode-text-dark">
            Enter this code to sign in:
          </p>
        `}
        
        <!-- Code Box -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto; background-color: #eff6ff !important; border-radius: 12px;" class="dark-mode-bg-white">
          <tr>
            <td style="padding: 40px;">
              <div style="font-size: 42px; font-weight: 700; letter-spacing: 10px; color: #1a1a1a !important; font-family: 'Courier New', monospace; margin: 10px 0;" class="dark-mode-text-dark">
                ${code}
              </div>
              <p style="margin: 15px 0 0; color: #6b7280 !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                This code expires in 15 minutes
              </p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 30px 0 0; color: #6b7280 !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Your login code is ${code}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate magic link email - UPFIRST → USER - Uses new infrastructure
   * DARK MODE SAFE - Works across all email clients
   */
  private generateMagicLinkEmail(link: string): string {
    // Generate Upfirst header and footer using infrastructure
    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();

    const content = `
      <div style="text-align: center;">
        <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Sign in to Upfirst
        </h1>
        
        <p style="margin: 20px 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px;" class="dark-mode-text-dark">
          Click the button below to securely sign in to your account:
        </p>
        
        ${generateMagicLinkButton(link, 'Sign In to Upfirst')}
        
        <p style="margin: 30px 0 15px; color: #6b7280 !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          This link expires in 15 minutes and can only be used once.
        </p>
        
        <p style="margin: 30px 0 10px; color: #9ca3af !important; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Or copy and paste this link into your browser:
        </p>
        
        <div style="background-color: #f9fafb !important; padding: 15px; border-radius: 6px; margin: 10px 0; word-break: break-all; color: #6b7280 !important; font-size: 14px; font-family: 'Courier New', monospace;" class="dark-mode-bg-white">
          ${link}
        </div>
        
        <p style="margin: 30px 0 0; color: #6b7280 !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          If you didn't request this link, please ignore this email.
        </p>
      </div>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: 'Your secure sign-in link to Upfirst',
      darkModeSafe: true,
    });
  }

  /**
   * ============================================
   * PHASE 1: CRITICAL REVENUE-IMPACTING NOTIFICATIONS
   * ============================================
   */

  /**
   * Send welcome email to new seller (Upfirst → Seller)
   */
  async sendSellerWelcome(seller: User): Promise<void> {
    // Generate magic link for auto-login (seller email, no seller context)
    const magicLink = await this.generateMagicLinkForEmail(seller.email || '', '/settings', undefined);
    
    const emailHtml = this.generateSellerWelcomeEmail(seller, magicLink);
    
    // Use EmailMetadataService for subject
    const subject = this.emailMetadata.generateSubject(EmailType.SELLER_WELCOME, {
      sellerName: seller.firstName || seller.username || 'Seller'
    });

    const result = await this.sendEmail({
      from: 'UPPFIRST <noreply@upfirst.io>',
      to: seller.email || '',
      replyTo: this.emailConfig.getSupportEmail(),
      subject: subject,
      html: emailHtml,
    });

    if (seller.id) {
      await this.createNotification({
        userId: seller.id,
        type: 'seller_welcome',
        title: subject,
        message: 'Get started by setting up your payment method and listing your first product',
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: {},
      });
    }

    console.log(`[Notifications] Welcome email sent to ${seller.email}:`, result.success);
  }

  /**
   * Send Stripe onboarding incomplete reminder (Upfirst → Seller)
   */
  async sendStripeOnboardingIncomplete(seller: User): Promise<void> {
    const emailHtml = this.generateStripeOnboardingIncompleteEmail(seller);
    
    // Use EmailMetadataService for subject
    const subject = this.emailMetadata.generateSubject(EmailType.SELLER_STRIPE_INCOMPLETE, {
      sellerName: seller.firstName || seller.username || 'Seller'
    });

    const result = await this.sendEmail({
      from: 'UPPFIRST <noreply@upfirst.io>',
      to: seller.email || '',
      replyTo: this.emailConfig.getSupportEmail(),
      subject: subject,
      html: emailHtml,
    });

    if (seller.id) {
      await this.createNotification({
        userId: seller.id,
        type: 'seller_stripe_incomplete',
        title: subject,
        message: 'Your Stripe account setup is incomplete. Complete it now to start accepting payments.',
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: {},
      });
    }

    console.log(`[Notifications] Stripe onboarding reminder sent to ${seller.email}:`, result.success);
  }

  /**
   * Send order payment failed notification (Upfirst → Seller)
   */
  async sendOrderPaymentFailed(seller: User, orderId: string, amount: number, reason: string): Promise<void> {
    const emailHtml = this.generateOrderPaymentFailedEmail(seller, orderId, amount, reason);

    const result = await this.sendEmail({
      to: seller.email || '',

      replyTo: this.emailConfig.getSupportEmail(),
      subject: `Payment Failed for Order #${orderId.slice(0, 8)}`,
      html: emailHtml,
    });

    if (seller.id) {
      const paymentSubject = this.emailMetadata.generateSubject(EmailType.PAYMENT_FAILED, {
        orderId,
        amount,
        currency: 'USD'
      });
      await this.createNotification({
        userId: seller.id,
        type: 'payment_failed',
        title: paymentSubject,
        message: `Payment of $${amount.toFixed(2)} failed - ${reason}`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { orderId, amount, reason },
      });
    }

    console.log(`[Notifications] Order payment failed sent to ${seller.email}:`, result.success);
  }

  /**
   * Send buyer payment failed notification (Upfirst → Buyer)
   */
  async sendBuyerPaymentFailed(buyerEmail: string, buyerName: string, amount: number, reason: string, retryLink?: string, currency: string = 'USD'): Promise<void> {
    const emailHtml = this.generateBuyerPaymentFailedEmail(buyerName, amount, reason, retryLink);
    const template = this.messages.buyerPaymentFailed(amount, currency, reason);

    await this.sendEmail({
      to: buyerEmail,
      replyTo: this.emailConfig.getSupportEmail(),
      subject: template.emailSubject,
      html: emailHtml,
    });

    logger.info(`[Notifications] Buyer payment failed sent to ${buyerEmail}`);
  }

  /**
   * Send subscription payment failed (Upfirst → Seller)
   */
  async sendSubscriptionPaymentFailed(seller: User, amount: number, reason: string, currency: string = 'USD'): Promise<void> {
    const emailHtml = this.generateSubscriptionPaymentFailedEmail(seller, amount, reason);
    const template = this.messages.subscriptionPaymentFailed(amount, currency, reason);

    const result = await this.sendEmail({
      to: seller.email || '',
      replyTo: this.emailConfig.getSupportEmail(),
      subject: template.emailSubject,
      html: emailHtml,
    });

    if (seller.id) {
      const subscriptionSubject = this.emailMetadata.generateSubject(EmailType.SELLER_SUBSCRIPTION_FAILED, {
        amount,
        currency
      });
      await this.createNotification({
        userId: seller.id,
        type: 'seller_subscription_failed',
        title: subscriptionSubject,
        message: `Your subscription payment of $${amount.toFixed(2)} failed - ${reason}. Please update your payment method.`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { amount, reason },
      });
    }

    console.log(`[Notifications] Subscription payment failed sent to ${seller.email}:`, result.success);
  }

  /**
   * Send inventory out of stock alert (Upfirst → Seller)
   */
  /**
   * DEPRECATED: Use sendLowInventoryAlert instead
   */
  async sendInventoryOutOfStock(seller: User, product: Product): Promise<void> {
    return this.sendLowInventoryAlert(seller, product, 0);
  }

  /**
   * Send low inventory alert email (Upfirst → Seller)
   */
  async sendLowInventoryAlert(seller: User, product: Product, currentStock: number): Promise<void> {
    if (!seller.email) {
      console.error('[Notifications] Cannot send low inventory alert - seller has no email');
      return;
    }

    const emailHtml = this.generateLowInventoryAlertEmail(seller, product, currentStock);

    const result = await this.sendEmail({
      from: 'UPPFIRST <noreply@upfirst.io>',
      to: seller.email,
      replyTo: this.emailConfig.getSupportEmail(),
      subject: currentStock === 0 ? `Out of Stock: ${product.name}` : `Low Stock Alert: ${product.name}`,
      html: emailHtml,
    });

    if (seller.id) {
      const inventorySubject = this.emailMetadata.generateSubject(EmailType.SELLER_INVENTORY_LOW, {
        productName: product.name,
        currentStock
      });
      await this.createNotification({
        userId: seller.id,
        type: 'seller_inventory_low',
        title: inventorySubject,
        message: currentStock === 0 
          ? `${product.name} is now out of stock and has been hidden from your store`
          : `${product.name} is running low (${currentStock} units remaining)`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { productId: product.id, productName: product.name, currentStock },
      });
    }

    console.log(`[Notifications] Low inventory alert sent to ${seller.email}:`, result.success);
  }

  /**
   * Send subscription trial ending email (Upfirst → Seller)
   */
  async sendSubscriptionTrialEnding(seller: User, daysRemaining: number): Promise<void> {
    if (!seller.email) {
      console.error('[Notifications] Cannot send trial ending email - seller has no email');
      return;
    }

    const emailHtml = this.generateSubscriptionTrialEndingEmail(seller, daysRemaining);

    const result = await this.sendEmail({
      from: 'UPPFIRST <noreply@upfirst.io>',
      to: seller.email,
      replyTo: this.emailConfig.getSupportEmail(),
      subject: `Your UPPFIRST Trial Ends in ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}`,
      html: emailHtml,
    });

    if (seller.id) {
      const trialSubject = this.emailMetadata.generateSubject(EmailType.SELLER_TRIAL_ENDING, {
        daysRemaining
      });
      await this.createNotification({
        userId: seller.id,
        type: 'seller_trial_ending',
        title: trialSubject,
        message: `Your trial ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { daysRemaining },
      });
    }

    console.log(`[Notifications] Trial ending email sent to ${seller.email}:`, result.success);
  }

  /**
   * Send subscription activated email (Upfirst → Seller)
   */
  async sendSubscriptionActivated(seller: User, subscription: { plan: string; amount: number; nextBillingDate: Date }): Promise<void> {
    if (!seller.email) {
      console.error('[Notifications] Cannot send subscription activated email - seller has no email');
      return;
    }

    const emailHtml = this.generateSubscriptionActivatedEmail(seller, subscription);

    const result = await this.sendEmail({
      from: 'UPPFIRST <noreply@upfirst.io>',
      to: seller.email,
      replyTo: this.emailConfig.getSupportEmail(),
      subject: 'Your UPPFIRST Subscription is Active',
      html: emailHtml,
    });

    if (seller.id) {
      const activatedSubject = this.emailMetadata.generateSubject(EmailType.SELLER_SUBSCRIPTION_ACTIVATED, {
        plan: subscription.plan
      });
      await this.createNotification({
        userId: seller.id,
        type: 'seller_subscription_activated',
        title: activatedSubject,
        message: `Your ${subscription.plan} subscription is now active`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: subscription,
      });
    }

    console.log(`[Notifications] Subscription activated email sent to ${seller.email}:`, result.success);
  }

  /**
   * Send subscription cancelled email (Upfirst → Seller)
   */
  async sendSubscriptionCancelled(seller: User, endDate: Date): Promise<void> {
    if (!seller.email) {
      console.error('[Notifications] Cannot send subscription cancelled email - seller has no email');
      return;
    }

    const emailHtml = this.generateSubscriptionCancelledEmail(seller, endDate);
    const endDateFormatted = endDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const result = await this.sendEmail({
      from: 'UPPFIRST <noreply@upfirst.io>',
      to: seller.email,
      replyTo: this.emailConfig.getSupportEmail(),
      subject: 'Your UPPFIRST Subscription Has Been Cancelled',
      html: emailHtml,
    });

    if (seller.id) {
      const cancelledSubject = this.emailMetadata.generateSubject(EmailType.SELLER_SUBSCRIPTION_CANCELLED, {
        endDate: endDate.toISOString()
      });
      await this.createNotification({
        userId: seller.id,
        type: 'seller_subscription_cancelled',
        title: cancelledSubject,
        message: `Your subscription has been cancelled. Access until ${endDateFormatted}`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { endDate: endDate.toISOString() },
      });
    }

    console.log(`[Notifications] Subscription cancelled email sent to ${seller.email}:`, result.success);
  }

  /**
   * Send payout failed notification (Upfirst → Seller)
   */
  async sendPayoutFailed(seller: User, amount: number, reason: string, currency: string = 'USD'): Promise<void> {
    const emailHtml = this.generatePayoutFailedEmail(seller, amount, reason);
    const template = this.messages.payoutFailed(amount, currency, reason);

    const result = await this.sendEmail({
      to: seller.email || '',
      replyTo: this.emailConfig.getSupportEmail(),
      subject: template.emailSubject,
      html: emailHtml,
    });

    if (seller.id) {
      const payoutSubject = this.emailMetadata.generateSubject(EmailType.SELLER_PAYOUT_FAILED, {
        amount,
        currency
      });
      await this.createNotification({
        userId: seller.id,
        type: 'seller_payout_failed',
        title: payoutSubject,
        message: `Your payout of $${amount.toFixed(2)} failed - ${reason}. Please update your bank account details.`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { amount, reason },
      });
    }

    console.log(`[Notifications] Payout failed sent to ${seller.email}:`, result.success);
  }

  /**
   * Send balance payment request (Seller → Buyer) - TASK 5f
   */
  async sendBalancePaymentRequest(
    order: Order, 
    seller: User, 
    balanceRequest: BalanceRequest,
    sessionToken: string
  ): Promise<void> {
    try {
      // Generate comprehensive email HTML with balance breakdown (ASYNC)
      const emailHtml = await this.generateBalancePaymentRequestEmail(
        order, 
        seller, 
        balanceRequest,
        sessionToken
      );
      
      // Get email metadata using EmailMetadataService
      const fromName = await this.emailMetadata.getFromName(seller);
      const replyTo = await this.emailMetadata.getReplyToEmail(seller);
      
      // Use fixed subject as per task requirements
      const subject = 'Complete Your Order - Balance Payment Required';
      
      // Build magic link for logging
      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';
      const magicLinkUrl = `${baseUrl}/orders/${order.id}/pay-balance?token=${sessionToken}`;

      const result = await this.sendEmail({
        to: order.customerEmail,
        from: `${fromName} <noreply@upfirst.io>`,
        replyTo: replyTo || undefined,
        subject: subject,
        html: emailHtml,
      });

      // Log email event to order_events table
      if (result.success) {
        try {
          await this.storage.createOrderEvent({
            orderId: order.id,
            eventType: 'balance_payment_requested',
            description: `Balance payment request sent to ${order.customerEmail}`,
            payload: JSON.stringify({
              emailType: 'balance_payment_request',
              recipientEmail: order.customerEmail,
              subject: subject,
              balanceRequestId: balanceRequest.id,
              balanceDueCents: balanceRequest.balanceDueCents,
              currency: balanceRequest.currency,
              depositAmountCents: order.depositAmountCents,
              magicLinkUrl,
              expiresAt: balanceRequest.expiresAt,
              sellerName: seller.firstName || seller.username || 'Store',
            }),
            performedBy: null,
          });
          
          logger.info('[Notifications] Balance payment request logged to order events', {
            orderId: order.id,
            balanceRequestId: balanceRequest.id,
          });
        } catch (error) {
          logger.error("[Notifications] Failed to log balance payment request event:", error);
        }
      }

      // Create in-app notification for buyer (if they have an account)
      if (order.userId) {
        const balanceAmountFormatted = `${balanceRequest.currency} ${(balanceRequest.balanceDueCents || 0) / 100}`;
        await this.createNotification({
          userId: order.userId,
          type: 'balance_payment_request',
          title: subject,
          message: `Your remaining balance of ${balanceAmountFormatted} is now due`,
          emailSent: result.success ? 1 : 0,
          emailId: result.emailId,
          metadata: { 
            orderId: order.id, 
            balanceRequestId: balanceRequest.id,
            balanceDueCents: balanceRequest.balanceDueCents,
            currency: balanceRequest.currency,
            magicLinkUrl 
          },
        });
      }

      logger.info(`[Notifications] Balance payment request email sent to ${order.customerEmail}:`, {
        success: result.success,
        emailId: result.emailId,
        balanceRequestId: balanceRequest.id,
      });
    } catch (error) {
      logger.error("[Notifications] Failed to send balance payment request email:", error);
      // Don't throw - email failures shouldn't break the flow
    }
  }

  /**
   * Send seller order notification (Platform → Seller) when buyer places order
   */
  async sendSellerOrderNotification(order: Order, seller: User, products: Product[]): Promise<void> {
    if (!seller.email) {
      logger.error("[Notifications] Cannot send seller order notification - no seller email");
      return;
    }

    // Generate email HTML (no Stripe details needed for seller notifications)
    const emailHtml = this.generateSellerOrderEmail(order, seller, products, null);

    // Build subject line
    const subject = `New Order #${order.id.slice(0, 8)} - ${order.customerName}`;

    const result = await this.sendEmail({
      to: seller.email,
      from: this.emailConfig.getPlatformFrom(),
      replyTo: order.customerEmail, // Seller can reply directly to buyer
      subject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          description: `Seller order notification sent to ${seller.email}`,
          payload: JSON.stringify({
            emailType: 'seller_order_notification',
            recipientEmail: seller.email,
            subject,
            buyerName: order.customerName,
            buyerEmail: order.customerEmail,
            total: order.total,
            currency: order.currency,
            productCount: products.length,
          }),
          performedBy: null,
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log seller order notification event:", error);
      }
    }

    logger.info(`[Notifications] Seller order notification sent to ${seller.email}:`, result.success);
  }

  async sendSubscriptionInvoice(user: User, invoiceData: {
    amount: number;
    currency: string;
    invoiceNumber: string;
    invoiceUrl?: string;
    periodStart: string;
    periodEnd: string;
    plan: string;
  }): Promise<void> {
    if (!user.email) {
      logger.error("[Notifications] Cannot send subscription invoice - no email");
      return;
    }

    const emailHtml = this.generateSubscriptionInvoiceEmail(user, invoiceData);

    const result = await this.sendEmail({
      to: user.email,
      subject: `Upfirst Subscription Invoice - ${invoiceData.invoiceNumber}`,
      html: emailHtml,
    });

    // Create in-app notification
    const invoiceSubject = this.emailMetadata.generateSubject(EmailType.SELLER_SUBSCRIPTION_INVOICE, {
      plan: invoiceData.plan,
      amount: invoiceData.amount / 100,
      currency: invoiceData.currency
    });
    await this.createNotification({
      userId: user.id,
      type: 'seller_subscription_invoice',
      title: invoiceSubject,
      message: `Your Upfirst ${invoiceData.plan} subscription has been charged $${(invoiceData.amount / 100).toFixed(2)}`,
      emailSent: result.success ? 1 : 0,
      emailId: result.emailId,
      metadata: invoiceData,
    });

    console.log(`[Notifications] Subscription invoice sent to ${user.email}:`, result.success);
  }

  /**
   * ============================================
   * EMAIL TEMPLATE GENERATORS - PHASE 1
   * ============================================
   */

  /**
   * Generate seller welcome email (Upfirst → Seller) - Using new infrastructure
   */
  private generateSellerWelcomeEmail(seller: User, magicLink: string): string {
    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 32px; font-weight: 700; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;" class="dark-mode-text-dark">
        Welcome to UPPFIRST!
      </h1>
      <p style="margin: 0 0 30px; font-size: 18px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
        Your e-commerce journey starts here
      </p>

      <p style="margin: 0 0 30px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Hi ${seller.firstName || 'there'},
      </p>
      <p style="margin: 0 0 30px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Congratulations! Your UPPFIRST store is ready to go. Here's how to get started:
      </p>

      <!-- Setup Steps -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
        <tr>
          <td style="padding: 20px 0 0 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb !important; border-radius: 8px; margin-bottom: 15px;" class="dark-mode-bg-white">
              <tr>
                <td style="padding: 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="width: 40px; vertical-align: top;">
                        <div style="width: 32px; height: 32px; background-color: #000000 !important; color: #ffffff !important; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">1</div>
                      </td>
                      <td style="padding-left: 15px;">
                        <p style="margin: 0 0 8px; font-weight: 600; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                          Connect Stripe for Payments
                        </p>
                        <p style="margin: 0; font-size: 15px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">
                          Start accepting payments with just 1.5% platform fee. Stripe handles secure payment processing.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb !important; border-radius: 8px; margin-bottom: 15px;" class="dark-mode-bg-white">
              <tr>
                <td style="padding: 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="width: 40px; vertical-align: top;">
                        <div style="width: 32px; height: 32px; background-color: #000000 !important; color: #ffffff !important; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">2</div>
                      </td>
                      <td style="padding-left: 15px;">
                        <p style="margin: 0 0 8px; font-weight: 600; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                          List Your First Product
                        </p>
                        <p style="margin: 0; font-size: 15px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">
                          Add products with flexible types: in-stock, pre-order, made-to-order, or wholesale.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
              <tr>
                <td style="padding: 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="width: 40px; vertical-align: top;">
                        <div style="width: 32px; height: 32px; background-color: #000000 !important; color: #ffffff !important; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">3</div>
                      </td>
                      <td style="padding-left: 15px;">
                        <p style="margin: 0 0 8px; font-weight: 600; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                          Customize Your Store
                        </p>
                        <p style="margin: 0; font-size: 15px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">
                          Add your logo, banner, and branding to make your store uniquely yours.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${generateCTAButton('Complete Your Store Setup', magicLink, '#000000')}

      <!-- Pro Tip -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0; background-color: #f0f9ff !important; border-radius: 8px;" class="dark-mode-bg-white">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0; font-size: 15px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              <strong>💡 Pro Tip:</strong> You have a 30-day free trial to explore all features. No payment method required to start!
            </p>
          </td>
        </tr>
      </table>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: 'Welcome to UPPFIRST - Your e-commerce journey starts here',
      darkModeSafe: true,
    });
  }

  /**
   * Generate Stripe onboarding incomplete email (Upfirst → Seller) - Using new infrastructure
   */
  private generateStripeOnboardingIncompleteEmail(seller: User): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    const settingsUrl = `${baseUrl}/settings?tab=payment`;
    
    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Action Required: Complete Your Payment Setup
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${seller.firstName || 'there'},
      </p>

      <!-- Alert Box -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #fff3cd !important; border-left: 4px solid #ffc107 !important; border-radius: 8px;" class="dark-mode-bg-white">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0; font-weight: 600; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              ⚠️ Your Stripe account setup is incomplete. You won't be able to accept payments until this is done.
            </p>
          </td>
        </tr>
      </table>

      <p style="margin: 0 0 20px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Completing your Stripe setup takes just a few minutes and allows you to:
      </p>

      <ul style="margin: 0 0 30px; padding-left: 20px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.8;">
        <li>Accept credit cards, Apple Pay, and Google Pay</li>
        <li>Receive automatic payouts to your bank account</li>
        <li>Start selling immediately with just 1.5% platform fee</li>
      </ul>

      ${generateCTAButton('Complete Stripe Setup', settingsUrl)}

      <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Need help? Contact our support team at ${this.emailConfig.getSupportEmail()}
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: 'Complete your Stripe setup to start accepting payments',
      darkModeSafe: true,
    });
  }

  private generateOrderPaymentFailedEmail(seller: User, orderId: string, amount: number, reason: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; }
            .error-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Order Payment Failed</h1>
            <p>Hi ${seller.firstName || 'there'},</p>
            
            <div class="error-box">
              <strong>Order #${orderId.slice(0, 8)}</strong><br>
              Payment of $${amount} failed<br>
              <small>Reason: ${reason}</small>
            </div>

            <p>The customer's payment did not go through. This could be due to:</p>
            <ul>
              <li>Insufficient funds</li>
              <li>Invalid card details</li>
              <li>Card declined by issuing bank</li>
            </ul>

            <p>The order has been marked as failed and the customer has been notified.</p>

            <a href="${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : `http://localhost:${process.env.PORT || 5000}`}/seller" class="button">
              View Order Details
            </a>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Upfirst. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateBuyerPaymentFailedEmail(buyerName: string, amount: number, reason: string, retryLink?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; }
            .error-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Payment Failed</h1>
            <p>Hi ${buyerName},</p>
            
            <div class="error-box">
              <strong>Your payment of $${amount} could not be processed</strong><br>
              <small>Reason: ${reason}</small>
            </div>

            <p>Don't worry! You can try again with:</p>
            <ul>
              <li>A different payment method</li>
              <li>A different card</li>
              <li>Contact your bank to authorize the payment</li>
            </ul>

            ${retryLink ? `
              <a href="${retryLink}" class="button">
                Try Again
              </a>
            ` : ''}

            <p style="color: #666; font-size: 14px;">
              Need help? Contact ${this.emailConfig.getSupportEmail()}
            </p>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Upfirst. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateSubscriptionPaymentFailedEmail(seller: User, amount: number, reason: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; }
            .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Subscription Payment Failed</h1>
            <p>Hi ${seller.firstName || 'there'},</p>
            
            <div class="alert-box">
              <strong>Action Required:</strong> Your Upfirst subscription payment of $${amount} failed.<br>
              <small>Reason: ${reason}</small>
            </div>

            <p>To avoid service interruption, please update your payment method immediately.</p>

            <p><strong>What happens next:</strong></p>
            <ul>
              <li>We'll retry the payment in 3 days</li>
              <li>If payment fails again, your account will be suspended</li>
              <li>Update your payment method now to avoid disruption</li>
            </ul>

            <a href="${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : `http://localhost:${process.env.PORT || 5000}`}/settings?tab=subscription" class="button">
              Update Payment Method
            </a>

            <div class="footer">
              <p>Questions? Contact ${this.emailConfig.getSupportEmail()}</p>
              <p>© ${new Date().getFullYear()} Upfirst. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate low inventory alert email (Upfirst → Seller) - Using new infrastructure
   */
  private generateLowInventoryAlertEmail(seller: User, product: Product, currentStock: number): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    const productUrl = `${baseUrl}/seller/products/${product.id}/edit`;
    
    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Low Stock Alert
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${seller.firstName || 'there'},
      </p>

      <!-- Alert Box -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #fff3cd !important; border-left: 4px solid #ffc107 !important; border-radius: 8px;" class="dark-mode-bg-white">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0; font-weight: 600; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              ⚠️ One of your products is running low on stock
            </p>
          </td>
        </tr>
      </table>

      <!-- Product Card -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
        <tr>
          <td style="padding: 25px;">
            <h3 style="margin: 0 0 15px; font-size: 20px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              ${product.name}
            </h3>
            <p style="margin: 0 0 8px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              <strong>Current Stock:</strong> ${currentStock} units remaining
            </p>
            <p style="margin: 0; font-size: 15px; color: ${currentStock === 0 ? '#dc2626 !important' : '#6b7280 !important'}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <strong>Status:</strong> ${currentStock === 0 ? 'Out of stock (hidden from store)' : 'Low stock warning'}
            </p>
          </td>
        </tr>
      </table>

      <p style="margin: 0 0 20px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        ${currentStock === 0 ? 'This product has been automatically hidden from your storefront to prevent new orders.' : 'Consider restocking soon to avoid running out.'}
      </p>

      <p style="margin: 0 0 10px; font-weight: 600; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Next steps:
      </p>
      <ul style="margin: 0 0 30px; padding-left: 20px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.8;">
        <li>Restock the product</li>
        <li>Update the inventory count</li>
        <li>${currentStock === 0 ? 'The product will be automatically shown again' : 'Prevent stockouts and lost sales'}</li>
      </ul>

      ${generateCTAButton('Update Inventory', productUrl)}
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Low stock alert: ${product.name} - ${currentStock} units remaining`,
      darkModeSafe: true,
    });
  }

  /**
   * DEPRECATED: Use generateLowInventoryAlertEmail instead
   */
  private generateInventoryOutOfStockEmail(seller: User, product: Product): string {
    return this.generateLowInventoryAlertEmail(seller, product, 0);
  }

  /**
   * Generate subscription trial ending email (Upfirst → Seller) - Using new infrastructure
   */
  private generateSubscriptionTrialEndingEmail(seller: User, daysRemaining: number): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    const billingUrl = `${baseUrl}/settings?tab=subscription`;
    
    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Your UPPFIRST Trial Ends in ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${seller.firstName || 'there'},
      </p>

      <p style="margin: 0 0 30px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Your 30-day free trial is coming to an end. Continue your UPPFIRST subscription to keep selling and growing your business.
      </p>

      <!-- Benefits -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #f0f9ff !important; border-radius: 8px;" class="dark-mode-bg-white">
        <tr>
          <td style="padding: 25px;">
            <p style="margin: 0 0 15px; font-weight: 600; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              With UPPFIRST you get:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.8;">
              <li>Just 1.5% platform fee on sales</li>
              <li>Unlimited products and orders</li>
              <li>Custom storefront with your branding</li>
              <li>Integrated shipping and payments</li>
              <li>24/7 seller support</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- Pricing -->
      <p style="margin: 30px 0 10px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        <strong>Simple Pricing:</strong> $29/month or $290/year (save 17%)
      </p>

      ${generateCTAButton('Continue Subscription', billingUrl)}

      <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
        Questions? Contact us at ${this.emailConfig.getSupportEmail()}
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Your trial ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} - Continue your subscription`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate subscription activated email (Upfirst → Seller) - Using new infrastructure
   */
  private generateSubscriptionActivatedEmail(seller: User, subscription: { plan: string; amount: number; nextBillingDate: Date }): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    const dashboardUrl = `${baseUrl}/seller`;
    
    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();
    
    const nextBillingFormatted = subscription.nextBillingDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Your UPPFIRST Subscription is Active
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${seller.firstName || 'there'},
      </p>

      <p style="margin: 0 0 30px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Great news! Your UPPFIRST subscription is now active and you're all set to sell.
      </p>

      <!-- Subscription Details -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
        <tr>
          <td style="padding: 25px;">
            <p style="margin: 0 0 12px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              <strong>Plan:</strong> ${subscription.plan}
            </p>
            <p style="margin: 0 0 12px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              <strong>Amount:</strong> $${(subscription.amount / 100).toFixed(2)}/${subscription.plan.toLowerCase().includes('annual') ? 'year' : 'month'}
            </p>
            <p style="margin: 0; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              <strong>Next Billing Date:</strong> ${nextBillingFormatted}
            </p>
          </td>
        </tr>
      </table>

      <!-- Features Unlocked -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #f0f9ff !important; border-radius: 8px;" class="dark-mode-bg-white">
        <tr>
          <td style="padding: 25px;">
            <p style="margin: 0 0 15px; font-weight: 600; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              ✨ Features Unlocked:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.8;">
              <li>Unlimited product listings</li>
              <li>Advanced analytics and reporting</li>
              <li>Custom domain support</li>
              <li>Priority customer support</li>
              <li>Marketing tools and automations</li>
            </ul>
          </td>
        </tr>
      </table>

      ${generateCTAButton('Go to Dashboard', dashboardUrl)}
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: 'Your UPPFIRST subscription is now active',
      darkModeSafe: true,
    });
  }

  /**
   * Generate subscription cancelled email (Upfirst → Seller) - Using new infrastructure
   */
  private generateSubscriptionCancelledEmail(seller: User, endDate: Date): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    const billingUrl = `${baseUrl}/settings?tab=subscription`;
    
    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();
    
    const endDateFormatted = endDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Your UPPFIRST Subscription Has Been Cancelled
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${seller.firstName || 'there'},
      </p>

      <p style="margin: 0 0 30px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        We're sorry to see you go. Your UPPFIRST subscription has been cancelled as requested.
      </p>

      <!-- Access Info -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
        <tr>
          <td style="padding: 25px;">
            <p style="margin: 0 0 15px; font-weight: 600; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              Important Information:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.8;">
              <li>You'll have full access until <strong>${endDateFormatted}</strong></li>
              <li>Your store will be deactivated after this date</li>
              <li>Your data will be retained for 90 days</li>
              <li>You can reactivate anytime before the end date</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- Reactivate Option -->
      <p style="margin: 30px 0 20px; font-size: 16px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Changed your mind? You can reactivate your subscription at any time.
      </p>

      ${generateCTAButton('Reactivate Subscription', billingUrl)}

      <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
        Need help or have feedback? Contact us at ${this.emailConfig.getSupportEmail()}
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Your subscription has been cancelled - Access until ${endDateFormatted}`,
      darkModeSafe: true,
    });
  }

  private generatePayoutFailedEmail(seller: User, amount: number, reason: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; }
            .error-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Payout Failed</h1>
            <p>Hi ${seller.firstName || 'there'},</p>
            
            <div class="error-box">
              <strong>Your payout of $${amount} failed</strong><br>
              <small>Reason: ${reason}</small>
            </div>

            <p>We were unable to transfer funds to your bank account. This could be due to:</p>
            <ul>
              <li>Invalid or closed bank account</li>
              <li>Incorrect routing or account numbers</li>
              <li>Bank verification required</li>
            </ul>

            <p><strong>What you need to do:</strong></p>
            <ol>
              <li>Log in to your Stripe dashboard</li>
              <li>Verify your bank account details</li>
              <li>Update any incorrect information</li>
            </ol>

            <a href="https://dashboard.stripe.com" class="button">
              Go to Stripe Dashboard
            </a>

            <p style="margin-top: 30px; padding: 20px; background: #f0f7ff; border-radius: 8px;">
              <strong>Note:</strong> Your funds are safe and will be retried once you update your bank details.
            </p>

            <div class="footer">
              <p>Need help? Contact ${this.emailConfig.getSupportEmail()}</p>
              <p>© ${new Date().getFullYear()} Upfirst. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send newsletter to multiple recipients using Resend Batch API
   */
  async sendNewsletter(params: SendNewsletterParams): Promise<{ success: boolean; batchId?: string; error?: string }> {
    try {
      const { recipients, from, replyTo, subject, htmlContent, newsletterId } = params;

      // Resend batch API - send to multiple recipients with personalized tracking
      const emails = recipients.map(recipient => {
        const encodedEmail = encodeURIComponent(recipient.email);
        
        // Add tracking pixel with recipient email for open tracking
        const baseUrl = process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
          : `http://localhost:${process.env.PORT || 5000}`;
        const trackingPixelUrl = `${baseUrl}/api/newsletters/track/${newsletterId}/open?email=${encodedEmail}`;
        const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

        // Add unsubscribe link to HTML
        const unsubscribeUrl = `${baseUrl}/api/newsletters/unsubscribe?email=${encodedEmail}`;
        const unsubscribeBlock = `<div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
        </div>`;

        // Inject tracking pixel and unsubscribe before </body>, or append if no </body>
        let finalHtml = htmlContent;
        if (finalHtml.includes('</body>')) {
          finalHtml = finalHtml.replace('</body>', `${trackingPixel}\n${unsubscribeBlock}</body>`);
        } else {
          finalHtml = finalHtml + trackingPixel + unsubscribeBlock;
        }

        return {
          from,
          to: recipient.email,
          replyTo,
          subject,
          html: finalHtml,
          tags: [
            { name: 'newsletter_id', value: newsletterId },
            { name: 'user_id', value: params.userId }
          ]
        };
      });

      const result = await this.emailProvider.sendBatch(emails);

      if (result.error) {
        console.error('[Newsletter] Batch send error:', result.error);
        
        // In development, if domain/validation error, log and succeed anyway
        const errorMsg = result.error || '';
        const isValidationError = errorMsg.includes('Invalid') || errorMsg.includes('test.com') || errorMsg.includes('testing email') || errorMsg.includes('not verified') || errorMsg.includes('Email provider not configured');
        
        if (process.env.NODE_ENV === 'development' && isValidationError) {
          logger.info("\n═══════════════════════════════════════════════════════");
          logger.info("📧 NEWSLETTER (Development Mode - Validation Error)");
          logger.info("═══════════════════════════════════════════════════════");
          logger.info(`Subject: ${subject}`);
          logger.info(`From: ${from}`);
          logger.info(`Recipients: ${recipients.map(r => r.email).join(', ')}`);
          logger.info("───────────────────────────────────────────────────────");
          logger.info("⚠️  Resend validation error (expected in development):");
          logger.info(`   ${errorMsg}`);
          logger.info("───────────────────────────────────────────────────────");
          logger.info("💡 Newsletter logged to console. To send real emails:");
          logger.info("   1. Use allowed test addresses (delivered@resend.dev)");
          logger.info("   2. Or verify your domain at: https://resend.com/domains");
          logger.info("═══════════════════════════════════════════════════════\n");
          
          // Still create analytics in development so the flow completes
          await this.storage.createNewsletterAnalytics({
            newsletterId,
            userId: params.userId,
            totalSent: recipients.length,
            totalDelivered: 0,
            totalOpened: 0,
            totalClicked: 0,
            totalBounced: 0,
            totalUnsubscribed: 0,
          });
          
          // Return success in development so newsletter flow continues
          return { success: true, batchId: 'dev-mode-' + Date.now() };
        }
        
        return { success: false, error: result.error };
      }

      // Initialize newsletter analytics
      await this.storage.createNewsletterAnalytics({
        newsletterId,
        userId: params.userId,
        totalSent: recipients.length,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalBounced: 0,
        totalUnsubscribed: 0,
      });

      logger.info(`[Newsletter] Batch sent to ${recipients.length} recipients`);
      return { success: true, batchId: result.batchId };
    } catch (error: any) {
      logger.error("[Newsletter] Send exception:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track newsletter events (opens, clicks, bounces, unsubscribes) with deduplication
   */
  async trackNewsletterEvent(
    newsletterId: string, 
    recipientEmail: string,
    eventType: 'open' | 'click' | 'bounce' | 'unsubscribe',
    webhookEventId?: string,
    eventData?: any
  ): Promise<void> {
    try {
      // Check for webhook idempotency
      if (webhookEventId) {
        const existingEvent = await this.storage.getNewsletterEventByWebhookId(webhookEventId);
        if (existingEvent) {
          logger.info(`[Newsletter] Duplicate webhook event ${webhookEventId}, skipping`);
          return;
        }
      }

      // Attempt to create event record (will fail silently if duplicate per recipient)
      const eventCreated = await this.storage.createNewsletterEvent({
        newsletterId,
        recipientEmail,
        eventType,
        webhookEventId,
        eventData,
      });

      // Only update analytics if this is a new unique event
      if (!eventCreated) {
        logger.info(`[Newsletter] Duplicate ${eventType} event for ${recipientEmail}, skipping analytics update`);
        return;
      }

      const analytics = await this.storage.getNewsletterAnalytics(newsletterId);
      if (!analytics) {
        console.error('[Newsletter] Analytics not found for newsletter:', newsletterId);
        return;
      }

      const updates: any = {};
      
      switch (eventType) {
        case 'open':
          updates.totalOpened = (analytics.totalOpened || 0) + 1;
          break;
        case 'click':
          updates.totalClicked = (analytics.totalClicked || 0) + 1;
          break;
        case 'bounce':
          updates.totalBounced = (analytics.totalBounced || 0) + 1;
          break;
        case 'unsubscribe':
          updates.totalUnsubscribed = (analytics.totalUnsubscribed || 0) + 1;
          break;
      }

      // Calculate rates
      const totalSent = analytics.totalSent || 1;
      updates.openRate = ((updates.totalOpened || analytics.totalOpened || 0) / totalSent * 100).toFixed(2);
      updates.clickRate = ((updates.totalClicked || analytics.totalClicked || 0) / totalSent * 100).toFixed(2);
      updates.bounceRate = ((updates.totalBounced || analytics.totalBounced || 0) / totalSent * 100).toFixed(2);
      updates.lastUpdated = new Date();

      await this.storage.updateNewsletterAnalytics(newsletterId, updates);
      console.log(`[Newsletter] Tracked unique ${eventType} for ${recipientEmail} in newsletter:`, newsletterId);
    } catch (error) {
      logger.error("[Newsletter] Track event error:", error);
    }
  }


  /**
   * Generate seller order notification email - MIGRATED
   * Upfirst → Seller notification when buyer places order
   * Uses generateUpfirstHeader/Footer + generateEmailBaseLayout
   */
  private generateSellerOrderEmail(order: Order, seller: User, products: Product[], stripeDetails: any): string {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    
    // Compute delivery dates for each item from order.items JSONB field
    const orderItems = items.map((item: any) => ({
      ...item,
      deliveryDate: computeDeliveryDate(item, order.createdAt)
    }));

    // Get base URL for dashboard link
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;

    // Build product items HTML with thumbnails using orderItems for delivery dates
    const productItemsHtml = orderItems.map((orderItem: OrderItem) => {
      const product = products.find(p => p.id === orderItem.productId);
      const productImage = product?.image || orderItem.productImage;
      
      // Format delivery date if available
      let deliveryDateHtml = '';
      if (orderItem.deliveryDate) {
        const formattedDate = format(new Date(orderItem.deliveryDate), 'MMMM d, yyyy');
        deliveryDateHtml = `<br><strong>Estimated Delivery:</strong> ${formattedDate}`;
      }
      
      // Format variant
      const formattedVariant = formatVariant(orderItem.variant);
      const variantHtml = formattedVariant ? `<br>Variant: ${formattedVariant}` : '';
      
      return `
        <tr>
          <td style="padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="width: 80px; vertical-align: top;">
                  ${productImage ? `<img src="${productImage}" alt="${orderItem.productName}" style="display: block; width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 0;">` : '<div style="width: 80px; height: 80px; background-color: #f3f4f6; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #9ca3af;">No image</div>'}
                </td>
                <td style="padding-left: 15px; vertical-align: top;">
                  <p style="margin: 0 0 5px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${orderItem.productName}
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Qty: ${orderItem.quantity} × $${orderItem.price}${variantHtml}${deliveryDateHtml}
                  </p>
                </td>
                <td style="text-align: right; vertical-align: top; white-space: nowrap;">
                  <p style="margin: 0; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    $${parseFloat(orderItem.subtotal).toFixed(2)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }).join('');

    // Calculate financial breakdown
    const subtotal = parseFloat(order.subtotalBeforeTax || order.total);
    const taxAmount = parseFloat(order.taxAmount || '0');
    const total = parseFloat(order.total);
    const deposit = order.paymentType === 'deposit' ? parseFloat(order.amountPaid || '0') : 0;
    const balance = order.paymentType === 'deposit' ? parseFloat(order.remainingBalance || '0') : 0;

    // Generate Upfirst header and footer (this is Upfirst → Seller)
    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();

    const bodyContent = `
      <h1 style="margin: 0 0 10px; font-size: 32px; font-weight: 700; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        New Order Received!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        You have a new order from ${order.customerName}
      </p>

      <!-- Order Summary Box -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background-color: #f0fdf4 !important; border-radius: 8px; border: 2px solid #22c55e;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="margin: 0 0 15px; font-size: 18px; font-weight: 600; color: #166534 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Order #${order.id.slice(0, 8)}
            </h3>
            <p style="margin: 0 0 8px; color: #166534 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p style="margin: 0 0 8px; color: #166534 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <strong>Payment Status:</strong> <span style="background-color: #bbf7d0; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${order.paymentStatus ? order.paymentStatus.toUpperCase() : 'PENDING'}</span>
            </p>
            ${order.paymentType === 'deposit' ? `
              <p style="margin: 0; color: #166534 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <strong>Payment Type:</strong> Deposit ($${deposit.toFixed(2)} paid, $${balance.toFixed(2)} balance due)
              </p>
            ` : ''}
          </td>
        </tr>
      </table>

      <!-- Customer Information -->
      <h3 style="margin: 30px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Customer Information
      </h3>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb !important; border-radius: 8px;">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0 0 8px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <strong>Name:</strong> ${order.customerName}
            </p>
            <p style="margin: 0 0 8px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <strong>Email:</strong> <a href="mailto:${order.customerEmail}" style="color: #2563eb !important; text-decoration: none;">${order.customerEmail}</a>
            </p>
          </td>
        </tr>
      </table>
      
      ${(() => {
        // Build billing address from individual fields
        const hasSellerBilling = order.billingStreet;
        const sellerBillingAddr = hasSellerBilling
          ? `${order.billingName}\n${order.billingStreet}\n${order.billingCity}, ${order.billingState} ${order.billingPostalCode}\n${order.billingCountry}`
          : order.customerAddress;
        
        // Build shipping address from individual fields
        const hasSellerShipping = order.shippingStreet;
        const sellerShippingAddr = hasSellerShipping
          ? `${order.shippingStreet}\n${order.shippingCity}, ${order.shippingState} ${order.shippingPostalCode}\n${order.shippingCountry}`
          : order.customerAddress;
        
        const sellerBillingHtml = generateBillingAddress(sellerBillingAddr);
        const sellerShippingHtml = generateShippingAddress(sellerShippingAddr);
        
        return sellerBillingHtml + '\n      ' + sellerShippingHtml;
      })()}

      <!-- Order Items -->
      <h3 style="margin: 30px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Order Items
      </h3>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${productItemsHtml}
      </table>

      <!-- Financial Summary -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0; background-color: #f9fafb !important; border-radius: 8px;">
        <tr>
          <td style="padding: 20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding: 8px 0; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Subtotal:</td>
                <td style="padding: 8px 0; text-align: right; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">$${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Tax:</td>
                <td style="padding: 8px 0; text-align: right; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">$${taxAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 16px 0 8px; border-top: 2px solid #e5e7eb; font-size: 20px; font-weight: 700; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Total:</td>
                <td style="padding: 16px 0 8px; border-top: 2px solid #e5e7eb; text-align: right; font-size: 20px; font-weight: 700; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">$${total.toFixed(2)}</td>
              </tr>
              ${deposit > 0 ? `
                <tr>
                  <td style="padding: 8px 0; color: #059669 !important; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Deposit Received:</td>
                  <td style="padding: 8px 0; text-align: right; color: #059669 !important; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">$${deposit.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #dc2626 !important; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Balance Due:</td>
                  <td style="padding: 8px 0; text-align: right; color: #dc2626 !important; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">$${balance.toFixed(2)}</td>
                </tr>
              ` : ''}
            </table>
          </td>
        </tr>
      </table>

      <!-- Action Buttons -->
      ${generateCTAButton('View Order Details', `${baseUrl}/seller/orders/${order.id}`)}
      <p style="margin: 20px 0 0; text-align: center; font-size: 14px;">
        <a href="${baseUrl}/seller" style="color: #2563eb !important; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Go to Dashboard →</a>
      </p>

      <!-- Important Note -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0; background-color: #fef3c7 !important; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0; font-weight: 600; color: #92400e !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ⚡ Action Required
            </p>
            <p style="margin: 10px 0 0; color: #92400e !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">
              ${order.paymentStatus === 'succeeded' ? 'Please prepare this order for fulfillment and update the tracking information when shipped.' : 'Payment is being processed. You\'ll be notified when payment is confirmed.'}
            </p>
          </td>
        </tr>
      </table>
    `;

    return generateEmailBaseLayout({
      header,
      bodyContent,
      footer,
      preheader: `New order #${order.id.slice(0, 8)} from ${order.customerName} - $${total.toFixed(2)}`,
    });
  }

  private generateSubscriptionInvoiceEmail(user: User, invoiceData: {
    amount: number;
    currency: string;
    invoiceNumber: string;
    invoiceUrl?: string;
    periodStart: string;
    periodEnd: string;
    plan: string;
  }): string {
    const formattedAmount = (invoiceData.amount / 100).toFixed(2);
    const planName = invoiceData.plan === 'annual' ? 'Annual' : 'Monthly';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; }
            .header { text-align: center; padding-bottom: 30px; border-bottom: 2px solid #f0f0f0; }
            .logo { font-size: 28px; font-weight: bold; color: #000; margin-bottom: 10px; }
            .content { padding: 30px 0; }
            .invoice-box { background: #f9f9f9; padding: 25px; border-radius: 8px; margin: 25px 0; }
            .invoice-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e5e5; }
            .invoice-row:last-child { border-bottom: none; font-weight: bold; font-size: 18px; }
            .total-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; }
            .total-amount { font-size: 36px; font-weight: bold; margin: 10px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 14px; text-align: center; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 20px 0; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Upfirst</div>
              <p style="color: #666; margin: 0;">Subscription Invoice</p>
            </div>

            <div class="content">
              <div class="success-badge">✓ Payment Successful</div>
              
              <p>Hi ${user.firstName || 'there'},</p>
              
              <p>Thank you for your continued subscription to Upfirst Pro! Your payment has been processed successfully.</p>

              <div class="invoice-box">
                <h3 style="margin-top: 0;">Invoice Details</h3>
                <div class="invoice-row">
                  <span>Invoice Number</span>
                  <span>${invoiceData.invoiceNumber}</span>
                </div>
                <div class="invoice-row">
                  <span>Plan</span>
                  <span>Upfirst Pro - ${planName}</span>
                </div>
                <div class="invoice-row">
                  <span>Billing Period</span>
                  <span>${invoiceData.periodStart} - ${invoiceData.periodEnd}</span>
                </div>
                <div class="invoice-row">
                  <span>Amount</span>
                  <span>$${formattedAmount} ${invoiceData.currency.toUpperCase()}</span>
                </div>
              </div>

              <div class="total-box">
                <p style="margin: 0 0 10px; opacity: 0.9;">Total Charged</p>
                <div class="total-amount">$${formattedAmount}</div>
              </div>

              ${invoiceData.invoiceUrl ? `
                <div style="text-align: center;">
                  <a href="${invoiceData.invoiceUrl}" class="button">View Full Invoice</a>
                </div>
              ` : ''}

              <p><strong>What's Included:</strong></p>
              <ul>
                <li>Unlimited product listings</li>
                <li>Multi-currency support</li>
                <li>Stripe Connect payments</li>
                <li>Advanced social media advertising</li>
                <li>Email notifications</li>
                <li>Custom domain support</li>
                <li>Analytics dashboard</li>
              </ul>

              <p style="margin-top: 30px; color: #666;">
                Questions about your subscription or billing? Contact us at ${this.emailConfig.getSupportEmail()}
              </p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Upfirst. All rights reserved.</p>
              <p>This is an automated receipt for your Upfirst Pro subscription.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // ============================================================================
  // WHOLESALE B2B EMAIL METHODS (Phase 4C)
  // ============================================================================

  /**
   * Generate wholesale order confirmation email - SELLER → BUYER
   */
  private async generateWholesaleOrderConfirmationEmail(
    wholesaleOrder: any,
    seller: User,
    items: any[]
  ): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);

    const totalCents = wholesaleOrder.totalCents || 0;
    const depositCents = wholesaleOrder.depositAmountCents || 0;
    const balanceCents = wholesaleOrder.balanceAmountCents || 0;
    const currency = wholesaleOrder.currency || 'USD';

    const formattedTotal = (totalCents / 100).toFixed(2);
    const formattedDeposit = (depositCents / 100).toFixed(2);
    const formattedBalance = (balanceCents / 100).toFixed(2);

    const expectedShipDate = wholesaleOrder.expectedShipDate 
      ? new Date(wholesaleOrder.expectedShipDate).toLocaleDateString()
      : 'TBD';

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1a1a1a !important;">${item.productName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #1a1a1a !important;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #1a1a1a !important;">$${(item.unitPriceCents / 100).toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #1a1a1a !important;">$${(item.subtotalCents / 100).toFixed(2)}</td>
      </tr>
    `).join('');

    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Your Order is Confirmed!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${wholesaleOrder.buyerName || wholesaleOrder.buyerEmail}, thank you for your wholesale order.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5 !important; border-left: 4px solid #10b981; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 5px; color: #047857 !important; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Order Number
        </p>
        <p style="margin: 0; color: #065f46 !important; font-size: 24px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${wholesaleOrder.orderNumber}
        </p>
      </div>

      <h3 style="margin: 30px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Order Items
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f9fafb !important;">
            <th style="padding: 12px; text-align: left; color: #1a1a1a !important; border-bottom: 2px solid #e5e7eb;">Product</th>
            <th style="padding: 12px; text-align: center; color: #1a1a1a !important; border-bottom: 2px solid #e5e7eb;">Quantity</th>
            <th style="padding: 12px; text-align: right; color: #1a1a1a !important; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
            <th style="padding: 12px; text-align: right; color: #1a1a1a !important; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: #1a1a1a !important; font-weight: 600;">Order Total:</span>
          <span style="color: #1a1a1a !important; font-weight: 600; font-size: 20px;">$${formattedTotal}</span>
        </div>
        ${depositCents > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
            <span style="color: #047857 !important;">Deposit Paid:</span>
            <span style="color: #047857 !important; font-weight: 600;">$${formattedDeposit}</span>
          </div>
        ` : ''}
        ${balanceCents > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #dc2626 !important;">Balance Due:</span>
            <span style="color: #dc2626 !important; font-weight: 600;">$${formattedBalance}</span>
          </div>
          ${wholesaleOrder.balancePaymentDueDate ? `
            <p style="margin: 10px 0 0; color: #6b7280 !important; font-size: 14px;">
              Due by: ${new Date(wholesaleOrder.balancePaymentDueDate).toLocaleDateString()}
            </p>
          ` : ''}
        ` : ''}
      </div>

      <h3 style="margin: 30px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Shipping Information
      </h3>
      <p style="margin: 0 0 20px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Expected Ship Date: <strong>${expectedShipDate}</strong>
      </p>

      <p style="margin: 30px 0 0; padding: 20px; background-color: #eff6ff !important; border-radius: 8px; color: #1e40af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        <strong>What's Next:</strong> We'll send you a shipping notification once your order is on its way.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Order ${wholesaleOrder.orderNumber} confirmed - $${formattedTotal}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate wholesale deposit received email - SELLER → BUYER/SELLER
   */
  private async generateWholesaleDepositReceivedEmail(
    wholesaleOrder: any,
    seller: User,
    recipient: 'buyer' | 'seller'
  ): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);

    const depositCents = wholesaleOrder.depositAmountCents || 0;
    const balanceCents = wholesaleOrder.balanceAmountCents || 0;
    const formattedDeposit = (depositCents / 100).toFixed(2);
    const formattedBalance = (balanceCents / 100).toFixed(2);

    const balanceDueDate = wholesaleOrder.balancePaymentDueDate
      ? new Date(wholesaleOrder.balancePaymentDueDate).toLocaleDateString()
      : 'TBD';

    const buyerContent = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Deposit Received!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Thank you ${wholesaleOrder.buyerName || ''}! Your deposit payment has been received.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5 !important; border-left: 4px solid #10b981; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px; color: #047857 !important; font-weight: 600; font-size: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          $${formattedDeposit} paid
        </p>
        <p style="margin: 0; color: #065f46 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Order: ${wholesaleOrder.orderNumber}
        </p>
      </div>

      ${balanceCents > 0 ? `
        <div style="margin: 20px 0; padding: 20px; background-color: #fef3c7 !important; border-left: 4px solid #f59e0b; border-radius: 8px;" class="dark-mode-bg-white">
          <p style="margin: 0 0 10px; color: #92400e !important; font-weight: 600; font-size: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Balance Due: $${formattedBalance}
          </p>
          <p style="margin: 0; color: #78350f !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Due Date: ${balanceDueDate}
          </p>
        </div>
      ` : ''}

      <p style="margin: 30px 0 0; padding: 20px; background-color: #eff6ff !important; border-radius: 8px; color: #1e40af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        We'll send you a reminder before the balance payment is due. Questions? Reply to this email.
      </p>
    `;

    const sellerContent = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Deposit Payment Received
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        A deposit payment has been received for wholesale order ${wholesaleOrder.orderNumber}.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5 !important; border-left: 4px solid #10b981; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px; color: #047857 !important; font-weight: 600; font-size: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          $${formattedDeposit} received
        </p>
        <p style="margin: 0; color: #065f46 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          From: ${wholesaleOrder.buyerEmail}
        </p>
      </div>

      ${balanceCents > 0 ? `
        <p style="margin: 20px 0; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Balance payment of <strong>$${formattedBalance}</strong> is due by ${balanceDueDate}.
        </p>
      ` : ''}
    `;

    return generateEmailBaseLayout({
      header,
      content: recipient === 'buyer' ? buyerContent : sellerContent,
      footer,
      preheader: `Deposit received for order ${wholesaleOrder.orderNumber}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate wholesale balance reminder email - SELLER → BUYER
   */
  private async generateWholesaleBalanceReminderEmail(
    wholesaleOrder: any,
    seller: User,
    paymentLink: string
  ): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);

    const balanceCents = wholesaleOrder.balanceAmountCents || 0;
    const formattedBalance = (balanceCents / 100).toFixed(2);

    const dueDate = wholesaleOrder.balancePaymentDueDate
      ? new Date(wholesaleOrder.balancePaymentDueDate).toLocaleDateString()
      : 'soon';

    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Balance Payment Reminder
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${wholesaleOrder.buyerName || wholesaleOrder.buyerEmail}, your balance payment will be due soon.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #fef3c7 !important; border-left: 4px solid #f59e0b; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px; color: #92400e !important; font-weight: 600; font-size: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          $${formattedBalance} due
        </p>
        <p style="margin: 0; color: #78350f !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Order: ${wholesaleOrder.orderNumber} • Due: ${dueDate}
        </p>
      </div>

      ${generateMagicLinkButton(paymentLink, 'Pay Balance Now')}

      <p style="margin: 30px 0 0; padding: 20px; background-color: #eff6ff !important; border-radius: 8px; color: #1e40af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        <strong>Reminder:</strong> Please complete your payment by ${dueDate} to avoid order cancellation.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Balance payment due: $${formattedBalance}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate wholesale balance overdue email - SELLER → BUYER/SELLER
   */
  private async generateWholesaleBalanceOverdueEmail(
    wholesaleOrder: any,
    seller: User,
    recipient: 'buyer' | 'seller',
    paymentLink?: string
  ): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);

    const balanceCents = wholesaleOrder.balanceAmountCents || 0;
    const formattedBalance = (balanceCents / 100).toFixed(2);

    const dueDate = wholesaleOrder.balancePaymentDueDate
      ? new Date(wholesaleOrder.balancePaymentDueDate)
      : new Date();
    const now = new Date();
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    const buyerContent = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #dc2626 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        OVERDUE: Balance Payment Required
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${wholesaleOrder.buyerName || wholesaleOrder.buyerEmail}, your balance payment is now overdue.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #fef2f2 !important; border-left: 4px solid #dc2626; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px; color: #991b1b !important; font-weight: 600; font-size: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          $${formattedBalance} OVERDUE
        </p>
        <p style="margin: 0; color: #7f1d1d !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Order: ${wholesaleOrder.orderNumber} • Overdue by: ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}
        </p>
      </div>

      ${paymentLink ? generateMagicLinkButton(paymentLink, 'Pay Now to Avoid Cancellation') : ''}

      <p style="margin: 30px 0 0; padding: 20px; background-color: #fef2f2 !important; border-radius: 8px; color: #991b1b !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        <strong>Urgent:</strong> If payment is not received immediately, your order will be cancelled.
      </p>
    `;

    const sellerContent = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #dc2626 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Balance Payment Overdue
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        The balance payment for order ${wholesaleOrder.orderNumber} is overdue by ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #fef2f2 !important; border-left: 4px solid #dc2626; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px; color: #991b1b !important; font-weight: 600; font-size: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          $${formattedBalance} overdue
        </p>
        <p style="margin: 0; color: #7f1d1d !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Buyer: ${wholesaleOrder.buyerEmail}
        </p>
      </div>

      <p style="margin: 20px 0; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        The buyer has been notified. You may need to follow up directly or cancel the order.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content: recipient === 'buyer' ? buyerContent : sellerContent,
      footer,
      preheader: `OVERDUE: Balance payment for ${wholesaleOrder.orderNumber}`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate wholesale order shipped email - SELLER → BUYER
   */
  private async generateWholesaleOrderShippedEmail(
    wholesaleOrder: any,
    seller: User,
    trackingInfo: any
  ): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);

    const trackingHtml = trackingInfo.trackingNumber ? `
      <div style="margin: 20px 0; padding: 20px; background-color: #eff6ff !important; border-left: 4px solid #3b82f6; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 10px; color: #1e40af !important; font-weight: 600; font-size: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Tracking Number
        </p>
        <p style="margin: 0; color: #1e3a8a !important; font-size: 20px; font-family: monospace;">
          ${trackingInfo.trackingNumber}
        </p>
        ${trackingInfo.carrier ? `
          <p style="margin: 10px 0 0; color: #1e40af !important; font-size: 14px;">
            Carrier: ${trackingInfo.carrier}
          </p>
        ` : ''}
      </div>
    ` : '';

    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Your Order Has Shipped!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${wholesaleOrder.buyerName || wholesaleOrder.buyerEmail}, great news! Your order is on its way.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5 !important; border-left: 4px solid #10b981; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 5px; color: #047857 !important; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Order Number
        </p>
        <p style="margin: 0; color: #065f46 !important; font-size: 20px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${wholesaleOrder.orderNumber}
        </p>
      </div>

      ${trackingHtml}

      ${trackingInfo.trackingUrl ? generateMagicLinkButton(trackingInfo.trackingUrl, 'Track Your Shipment') : ''}

      ${trackingInfo.estimatedDelivery ? `
        <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
          <strong>Estimated Delivery:</strong> ${new Date(trackingInfo.estimatedDelivery).toLocaleDateString()}
        </p>
      ` : ''}
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Order ${wholesaleOrder.orderNumber} has shipped`,
      darkModeSafe: true,
    });
  }

  /**
   * Generate wholesale order fulfilled email - SELLER → BUYER
   */
  private async generateWholesaleOrderFulfilledEmail(
    wholesaleOrder: any,
    seller: User,
    fulfillmentType: 'shipped' | 'pickup',
    pickupDetails?: any
  ): Promise<string> {
    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);

    const shippedContent = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Order Complete!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${wholesaleOrder.buyerName || wholesaleOrder.buyerEmail}, your order has been delivered.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5 !important; border-left: 4px solid #10b981; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0; color: #047857 !important; font-weight: 600; font-size: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Order ${wholesaleOrder.orderNumber} delivered
        </p>
      </div>

      <p style="margin: 30px 0 0; padding: 20px; background-color: #eff6ff !important; border-radius: 8px; color: #1e40af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;" class="dark-mode-bg-white">
        Thank you for your business! We hope to work with you again soon.
      </p>
    `;

    const pickupContent = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Order Ready for Pickup!
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi ${wholesaleOrder.buyerName || wholesaleOrder.buyerEmail}, your order is ready for pickup.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5 !important; border-left: 4px solid #10b981; border-radius: 8px;" class="dark-mode-bg-white">
        <p style="margin: 0 0 5px; color: #047857 !important; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Order Number
        </p>
        <p style="margin: 0; color: #065f46 !important; font-size: 20px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${wholesaleOrder.orderNumber}
        </p>
      </div>

      ${pickupDetails?.address ? `
        <h3 style="margin: 30px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Pickup Location
        </h3>
        <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
          <p style="margin: 0 0 10px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${pickupDetails.address}
          </p>
          ${pickupDetails.instructions ? `
            <p style="margin: 10px 0 0; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">
              <strong>Instructions:</strong> ${pickupDetails.instructions}
            </p>
          ` : ''}
        </div>
      ` : ''}
    `;

    return generateEmailBaseLayout({
      header,
      content: fulfillmentType === 'shipped' ? shippedContent : pickupContent,
      footer,
      preheader: `Order ${wholesaleOrder.orderNumber} ${fulfillmentType === 'shipped' ? 'delivered' : 'ready for pickup'}`,
      darkModeSafe: true,
    });
  }

  /**
   * Send wholesale order confirmation email
   */
  async sendWholesaleOrderConfirmation(wholesaleOrder: any, seller: User, items: any[]): Promise<void> {
    const emailHtml = await this.generateWholesaleOrderConfirmationEmail(wholesaleOrder, seller, items);

    const result = await this.sendEmail({
      to: wholesaleOrder.buyerEmail,
      replyTo: seller.email,
      subject: `Order Confirmed - ${wholesaleOrder.orderNumber}`,
      html: emailHtml,
    });

    logger.info('[Notifications] Wholesale order confirmation sent', {
      orderId: wholesaleOrder.id,
      orderNumber: wholesaleOrder.orderNumber,
      buyerEmail: wholesaleOrder.buyerEmail,
      success: result.success,
    });
  }

  /**
   * Send wholesale deposit received email
   */
  async sendWholesaleDepositReceived(wholesaleOrder: any, seller: User, buyer: User): Promise<void> {
    const buyerEmailHtml = await this.generateWholesaleDepositReceivedEmail(wholesaleOrder, seller, 'buyer');
    const sellerEmailHtml = await this.generateWholesaleDepositReceivedEmail(wholesaleOrder, seller, 'seller');

    const buyerResult = await this.sendEmail({
      to: wholesaleOrder.buyerEmail,
      replyTo: seller.email,
      subject: `Deposit Received - ${wholesaleOrder.orderNumber}`,
      html: buyerEmailHtml,
    });

    const sellerResult = await this.sendEmail({
      to: seller.email,
      subject: `Deposit Received - ${wholesaleOrder.orderNumber}`,
      html: sellerEmailHtml,
    });

    logger.info('[Notifications] Wholesale deposit received emails sent', {
      orderId: wholesaleOrder.id,
      orderNumber: wholesaleOrder.orderNumber,
      buyerSuccess: buyerResult.success,
      sellerSuccess: sellerResult.success,
    });
  }

  /**
   * Send wholesale balance reminder email
   */
  async sendWholesaleBalanceReminder(wholesaleOrder: any, seller: User, paymentLink: string): Promise<void> {
    const emailHtml = await this.generateWholesaleBalanceReminderEmail(wholesaleOrder, seller, paymentLink);

    const result = await this.sendEmail({
      to: wholesaleOrder.buyerEmail,
      replyTo: seller.email,
      subject: `Balance Payment Due - ${wholesaleOrder.orderNumber}`,
      html: emailHtml,
    });

    logger.info('[Notifications] Wholesale balance reminder sent', {
      orderId: wholesaleOrder.id,
      orderNumber: wholesaleOrder.orderNumber,
      buyerEmail: wholesaleOrder.buyerEmail,
      success: result.success,
    });
  }

  /**
   * Send wholesale balance overdue email
   */
  async sendWholesaleBalanceOverdue(wholesaleOrder: any, seller: User, buyer: User, paymentLink: string): Promise<void> {
    const buyerEmailHtml = await this.generateWholesaleBalanceOverdueEmail(wholesaleOrder, seller, 'buyer', paymentLink);
    const sellerEmailHtml = await this.generateWholesaleBalanceOverdueEmail(wholesaleOrder, seller, 'seller');

    const buyerResult = await this.sendEmail({
      to: wholesaleOrder.buyerEmail,
      replyTo: seller.email,
      subject: `OVERDUE: Balance Payment Required - ${wholesaleOrder.orderNumber}`,
      html: buyerEmailHtml,
    });

    const sellerResult = await this.sendEmail({
      to: seller.email,
      subject: `Balance Payment Overdue - ${wholesaleOrder.orderNumber}`,
      html: sellerEmailHtml,
    });

    logger.info('[Notifications] Wholesale balance overdue emails sent', {
      orderId: wholesaleOrder.id,
      orderNumber: wholesaleOrder.orderNumber,
      buyerSuccess: buyerResult.success,
      sellerSuccess: sellerResult.success,
    });
  }

  /**
   * Send wholesale order shipped email
   */
  async sendWholesaleOrderShipped(wholesaleOrder: any, seller: User, trackingInfo: any): Promise<void> {
    const emailHtml = await this.generateWholesaleOrderShippedEmail(wholesaleOrder, seller, trackingInfo);

    const result = await this.sendEmail({
      to: wholesaleOrder.buyerEmail,
      replyTo: seller.email,
      subject: `Order Shipped - ${wholesaleOrder.orderNumber}`,
      html: emailHtml,
    });

    logger.info('[Notifications] Wholesale order shipped email sent', {
      orderId: wholesaleOrder.id,
      orderNumber: wholesaleOrder.orderNumber,
      buyerEmail: wholesaleOrder.buyerEmail,
      success: result.success,
    });
  }

  /**
   * Send wholesale order fulfilled email
   */
  async sendWholesaleOrderFulfilled(
    wholesaleOrder: any,
    seller: User,
    fulfillmentType: 'shipped' | 'pickup',
    pickupDetails?: any
  ): Promise<void> {
    const emailHtml = await this.generateWholesaleOrderFulfilledEmail(wholesaleOrder, seller, fulfillmentType, pickupDetails);

    const result = await this.sendEmail({
      to: wholesaleOrder.buyerEmail,
      replyTo: seller.email,
      subject: `Order Ready - ${wholesaleOrder.orderNumber}`,
      html: emailHtml,
    });

    logger.info('[Notifications] Wholesale order fulfilled email sent', {
      orderId: wholesaleOrder.id,
      orderNumber: wholesaleOrder.orderNumber,
      fulfillmentType,
      buyerEmail: wholesaleOrder.buyerEmail,
      success: result.success,
    });
  }

  /**
   * Send delivery date change email (Seller → Buyer)
   */
  async sendDeliveryDateChangeEmail(order: Order, orderItem: OrderItem, newDeliveryDate: Date): Promise<void> {
    try {
      // Get seller info
      const seller = await this.storage.getUser(await this.getOrderSellerId(order));
      if (!seller) {
        logger.error("[Notifications] Seller not found for delivery date change email");
        return;
      }

      // Generate magic link for buyer auto-login
      const sellerContext = seller.username || seller.id;
      if (!sellerContext) {
        logger.error("[Notifications] Cannot generate buyer magic link - seller has no username or ID");
        throw new Error('Seller must have username or ID to send buyer emails');
      }
      const magicLink = await this.generateMagicLinkForEmail(order.customerEmail, `/orders/${order.id}`, sellerContext);

      // Generate email HTML with magic link
      const emailHtml = await this.generateDeliveryDateChangeEmail(order, orderItem, newDeliveryDate, seller, magicLink);
      
      // Get email metadata
      const fromName = await this.emailMetadata.getFromName(seller);
      const replyTo = await this.emailMetadata.getReplyToEmail(seller);
      const subject = `Updated Delivery Date - Order #${order.id.slice(-8).toUpperCase()}`;

      const result = await this.sendEmail({
        to: order.customerEmail,
        from: `${fromName} <noreply@upfirst.io>`,
        replyTo: replyTo || undefined,
        subject: subject,
        html: emailHtml,
      });

      // Log email event
      if (result.success) {
        try {
          await this.storage.createOrderEvent({
            orderId: order.id,
            eventType: 'email_sent',
            description: `Delivery date change notification sent to ${order.customerEmail}`,
            payload: JSON.stringify({
              emailType: 'delivery_date_change',
              recipientEmail: order.customerEmail,
              subject: subject,
              itemId: orderItem.id,
              productName: orderItem.productName,
              newDeliveryDate: newDeliveryDate.toISOString(),
            }),
            performedBy: seller.id,
          });
        } catch (error) {
          logger.error("[Notifications] Failed to log delivery date change event:", error);
        }
      }

      logger.info(`[Notifications] Delivery date change email sent to ${order.customerEmail}:`, result.success);
    } catch (error) {
      logger.error("[Notifications] Error sending delivery date change email:", error);
    }
  }

  /**
   * Send customer details updated notification email
   */
  async sendOrderCustomerDetailsUpdated(order: Order, seller: User, previousDetails: any, newDetails: any): Promise<void> {
    try {
      // Generate magic link for buyer auto-login
      const sellerContext = seller.username || seller.id;
      if (!sellerContext) {
        logger.error("[Notifications] Cannot generate buyer magic link - seller has no username or ID");
        throw new Error('Seller must have username or ID to send buyer emails');
      }
      const magicLink = await this.generateMagicLinkForEmail(order.customerEmail, `/orders/${order.id}`, sellerContext);

      // Generate email HTML with magic link
      const emailHtml = await this.generateCustomerDetailsUpdatedEmail(order, seller, previousDetails, newDetails, magicLink);
      
      // Get email metadata
      const fromName = await this.emailMetadata.getFromName(seller);
      const replyTo = await this.emailMetadata.getReplyToEmail(seller);
      const subject = `Updated Order Details - Order #${order.id.slice(-8).toUpperCase()}`;

      const result = await this.sendEmail({
        to: order.customerEmail,
        from: `${fromName} <noreply@upfirst.io>`,
        replyTo: replyTo || undefined,
        subject: subject,
        html: emailHtml,
      });

      // Log email event
      if (result.success) {
        try {
          await this.storage.createOrderEvent({
            orderId: order.id,
            eventType: 'email_sent',
            description: `Customer details update notification sent to ${order.customerEmail}`,
            payload: JSON.stringify({
              emailType: 'customer_details_update',
              recipientEmail: order.customerEmail,
              subject: subject,
              changedFields: this.calculateChangedFields(previousDetails, newDetails),
            }),
            performedBy: seller.id,
          });
        } catch (error) {
          logger.error("[Notifications] Failed to log customer details update event:", error);
        }
      }

      logger.info(`[Notifications] Customer details update email sent to ${order.customerEmail}:`, result.success);
    } catch (error) {
      logger.error("[Notifications] Error sending customer details update email:", error);
    }
  }

  /**
   * Generate customer details updated email HTML
   */
  private async generateCustomerDetailsUpdatedEmail(
    order: Order,
    seller: User,
    previousDetails: any,
    newDetails: any,
    magicLink: string
  ): Promise<string> {
    const storeName = seller.firstName || seller.username || 'Our Store';
    
    // Calculate what changed
    const changes = this.calculateChangedFields(previousDetails, newDetails, order);
    
    const content = `
        <div style="padding: 32px 24px;">
          <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 24px 0; color: #1a1a1a;">
            Order Details Updated
          </h1>
          
          <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin: 0 0 24px 0;">
            Hi ${order.customerName},
          </p>
          
          <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin: 0 0 24px 0;">
            The following details for your order have been updated:
          </p>
          
          ${changes.length > 0 ? `
            <div style="background: #f7fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0; color: #1a1a1a;">
                What Changed
              </h3>
              ${changes.map(change => `
                <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                  <p style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #1a1a1a;">
                    ${change.label}
                  </p>
                  <div style="display: flex; gap: 16px; align-items: center;">
                    <div style="flex: 1;">
                      <p style="font-size: 12px; margin: 0 0 4px 0; color: #718096;">Previous:</p>
                      <p style="font-size: 14px; margin: 0; color: #a0aec0; text-decoration: line-through;">
                        ${change.oldValue}
                      </p>
                    </div>
                    <div style="flex: 1;">
                      <p style="font-size: 12px; margin: 0 0 4px 0; color: #718096;">New:</p>
                      <p style="font-size: 14px; font-weight: 600; margin: 0; color: #3182ce;">
                        ${change.newValue}
                      </p>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div style="background: #edf2f7; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0; color: #1a1a1a;">
              Current Order Details
            </h3>
            
            <div style="margin-bottom: 16px;">
              <p style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #1a1a1a;">
                Customer Name
              </p>
              <p style="font-size: 14px; margin: 0; color: #4a5568;">
                ${order.customerName}
              </p>
            </div>
            
            <div style="margin-bottom: 16px;">
              <p style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #1a1a1a;">
                Shipping Address
              </p>
              <p style="font-size: 14px; margin: 0; color: #4a5568; white-space: pre-line;">
                ${order.shippingStreet}
${order.shippingCity}, ${order.shippingState} ${order.shippingPostalCode}
${order.shippingCountry}
              </p>
            </div>
            
            <div>
              <p style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #1a1a1a;">
                Billing Address
              </p>
              <p style="font-size: 14px; margin: 0; color: #4a5568; white-space: pre-line;">
                ${order.billingStreet}
${order.billingCity}, ${order.billingState} ${order.billingPostalCode}
${order.billingCountry}
              </p>
            </div>
          </div>
          
          <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin: 0 0 24px 0;">
            If you have any questions about these changes, please don't hesitate to reach out.
          </p>
          
          ${generateMagicLinkButton(magicLink, `View Order #${order.id.slice(-8).toUpperCase()}`)}
          
          <p style="font-size: 14px; line-height: 20px; color: #718096; margin: 24px 0 0 0;">
            Questions? Reply to this email and we'll be happy to help.
          </p>
        </div>
    `;

    return generateEmailBaseLayout({
      header: generateSellerHeader(seller),
      content,
      footer: await generateSellerFooter(seller),
      darkModeSafe: true
    });
  }

  /**
   * Calculate which fields changed for customer details update
   */
  private calculateChangedFields(previousDetails: any, newDetails: any, order: Order): Array<{ label: string; oldValue: string; newValue: string }> {
    const changes: Array<{ label: string; oldValue: string; newValue: string }> = [];
    
    const fieldLabels: Record<string, string> = {
      customerName: 'Customer Name',
      shippingStreet: 'Shipping Street',
      shippingCity: 'Shipping City',
      shippingState: 'Shipping State',
      shippingPostalCode: 'Shipping Postal Code',
      shippingCountry: 'Shipping Country',
      billingStreet: 'Billing Street',
      billingCity: 'Billing City',
      billingState: 'Billing State',
      billingPostalCode: 'Billing Postal Code',
      billingCountry: 'Billing Country',
    };
    
    // Check if billing was originally same as shipping
    const billingWasSameAsShipping = !previousDetails.billingStreet || previousDetails.billingStreet === previousDetails.shippingStreet;
    
    for (const [field, label] of Object.entries(fieldLabels)) {
      if (previousDetails[field] !== newDetails[field]) {
        let oldValue = previousDetails[field];
        let newValue = newDetails[field];
        
        // For billing fields, if previous value was empty, show "Same as shipping address"
        if (field.startsWith('billing') && !oldValue && billingWasSameAsShipping) {
          oldValue = 'Same as shipping address';
        } else if (!oldValue) {
          oldValue = 'Not set';
        }
        
        if (!newValue) {
          newValue = 'Not set';
        }
        
        changes.push({
          label,
          oldValue,
          newValue,
        });
      }
    }
    
    return changes;
  }

  /**
   * Generate delivery date change email HTML
   */
  private async generateDeliveryDateChangeEmail(
    order: Order,
    orderItem: OrderItem,
    newDeliveryDate: Date,
    seller: User,
    magicLink: string
  ): Promise<string> {
    const storeName = seller.firstName || seller.username || 'Our Store';
    const formattedNewDate = format(newDeliveryDate, 'MMMM d, yyyy');
    
    // Calculate previous delivery date using computeDeliveryDate
    // Convert preOrderDate from Date to string for compatibility
    const orderItemForCompute = {
      ...orderItem,
      preOrderDate: orderItem.preOrderDate instanceof Date 
        ? orderItem.preOrderDate.toISOString() 
        : orderItem.preOrderDate
    };
    const previousDeliveryDateStr = computeDeliveryDate(orderItemForCompute, order.createdAt);
    const formattedPreviousDate = previousDeliveryDateStr 
      ? format(new Date(previousDeliveryDateStr), 'MMMM d, yyyy')
      : 'Not set';
    
    // Determine product type label for buyer context
    const productTypeLabel = orderItem.productType === 'pre-order' 
      ? 'Pre-Order' 
      : orderItem.productType === 'made-to-order' 
        ? 'Made-to-Order' 
        : 'Standard';
    
    // Check if there's a balance payment pending
    const balancePayments = await this.storage.getBalancePaymentsByOrderId(order.id);
    const hasBalancePayment = balancePayments && balancePayments.some((bp: any) => bp.status === 'pending');
    
    const content = `
        <div style="padding: 32px 24px;">
          <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 24px 0; color: #1a1a1a;">
            Delivery Date Updated
          </h1>
          
          <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin: 0 0 24px 0;">
            Hi ${order.customerName},
          </p>
          
          <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin: 0 0 24px 0;">
            The delivery date for one of your items has been updated:
          </p>
          
          <div style="background: #f7fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 16px;">
              ${orderItem.productImage ? 
                `<img src="${orderItem.productImage}" alt="${orderItem.productName}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />` 
                : ''
              }
              <div style="flex: 1;">
                <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0; color: #1a1a1a;">
                  ${orderItem.productName}
                </h3>
                ${orderItem.variant ? 
                  `<p style="font-size: 14px; color: #718096; margin: 0 0 8px 0;">
                    ${formatVariant(orderItem.variant)}
                  </p>` 
                  : ''
                }
                <p style="font-size: 14px; color: #718096; margin: 0 0 4px 0;">
                  Quantity: ${orderItem.quantity}
                </p>
                ${orderItem.productType === 'pre-order' || orderItem.productType === 'made-to-order' ? `
                  <p style="font-size: 12px; color: #718096; margin: 0; background: #edf2f7; display: inline-block; padding: 2px 8px; border-radius: 4px;">
                    ${productTypeLabel} Item
                  </p>
                ` : ''}
              </div>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <div style="margin-bottom: 12px;">
                <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px 0; color: #718096;">
                  Previous Expected Delivery:
                </p>
                <p style="font-size: 16px; margin: 0; color: #a0aec0; text-decoration: line-through;">
                  ${formattedPreviousDate}
                </p>
              </div>
              <div>
                <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px 0; color: #718096;">
                  New Expected Delivery:
                </p>
                <p style="font-size: 18px; font-weight: 600; margin: 0; color: #3182ce; background: #ebf8ff; display: inline-block; padding: 4px 12px; border-radius: 6px;">
                  ${formattedNewDate}
                </p>
              </div>
            </div>
          </div>
          
          ${hasBalancePayment ? `
            <div style="background: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #c53030;">
                Balance Payment Required
              </p>
              <p style="font-size: 14px; line-height: 20px; color: #742a2a; margin: 0;">
                This item requires a balance payment before shipping. You can either pay the balance now or wait for the ready-for-pickup notification.
              </p>
            </div>
          ` : ''}
          
          <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin: 0 0 24px 0;">
            We appreciate your patience and will notify you when your item is ready.
          </p>
          
          ${generateMagicLinkButton(magicLink, `View Order #${order.id.slice(-8).toUpperCase()}`)}
          
          <p style="font-size: 14px; line-height: 20px; color: #718096; margin: 24px 0 0 0;">
            Questions? Reply to this email and we'll be happy to help.
          </p>
        </div>
    `;

    return generateEmailBaseLayout({
      header: generateSellerHeader(seller),
      content,
      footer: await generateSellerFooter(seller),
      darkModeSafe: true
    });
  }

  /**
   * Helper to get seller ID from order
   */
  private async getOrderSellerId(order: Order): Promise<string> {
    const orderItems = await this.storage.getOrderItems(order.id);
    if (orderItems.length > 0) {
      const product = await this.storage.getProduct(orderItems[0].productId);
      if (product) {
        return product.sellerId;
      }
    }
    throw new Error("Could not determine seller ID from order");
  }
}

export const createNotificationService = (storage: any): NotificationService => {
  return new NotificationServiceImpl(storage);
};
