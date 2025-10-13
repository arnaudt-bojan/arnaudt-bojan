import { Resend } from 'resend';
import crypto from 'crypto';
import type { User, Order, Product, Notification, InsertNotification, OrderItem } from '../shared/schema';
import { PDFService } from './pdf-service';
import { logger } from './logger';
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
  generateCTAButton
} from './utils/email-templates';
import { EmailType } from './services/email-metadata.service';

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
  
  // Balance Payment Request
  sendBalancePaymentRequest(order: Order, seller: User, paymentLink: string): Promise<void>;
  
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
  private pdfService: PDFService;
  private emailConfig: EmailConfigService;
  private emailProvider: IEmailProvider;
  private messages: NotificationMessagesService;

  constructor(
    storage: any, 
    pdfService: PDFService,
    emailConfig?: EmailConfigService,
    emailProvider?: IEmailProvider,
    messages?: NotificationMessagesService
  ) {
    this.storage = storage;
    this.pdfService = pdfService;
    
    // Use injected services or create defaults (for backward compatibility)
    this.emailConfig = emailConfig || new EmailConfigService();
    this.emailProvider = emailProvider || new ResendEmailProvider(
      process.env.RESEND_API_KEY || 'dummy-key-not-configured'
    );
    this.messages = messages || new NotificationMessagesService();
  }

  /**
   * Build Stripe business details with fallback
   */
  private async getStripeBusinessDetails(seller: User): Promise<any> {
    if (seller.stripeConnectedAccountId) {
      try {
        return await this.pdfService.getStripeBusinessDetails(seller.stripeConnectedAccountId);
      } catch (error) {
        logger.error("[Notifications] Failed to fetch Stripe business details:", error);
      }
    }
    
    // Fallback if Stripe details unavailable
    return {
      businessName: [seller.firstName, seller.lastName].filter(Boolean).join(' ') || seller.username || 'Store',
      email: seller.email || undefined,
    };
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
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save auth token to database with seller context
    await this.storage.createAuthToken({
      email: email.toLowerCase().trim(),
      token,
      code: null, // No code for magic links from emails
      expiresAt,
      used: 0,
      sellerContext: sellerContext || null, // Preserve seller context for buyer emails
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

    // Generate branded email HTML with magic link
    const emailHtml = this.generateOrderConfirmationEmail(order, seller, products, buyerName, magicLink);

    // Generate invoice PDF
    let attachments: EmailAttachment[] = [];
    try {
      // Fetch order items
      const orderItems = await this.storage.getOrderItems(order.id);
      
      // Get Stripe business details
      const stripeDetails = await this.getStripeBusinessDetails(seller);
      
      // Build invoice data
      const invoiceData = {
        order,
        orderItems,
        seller,
        buyer: {
          name: order.customerName,
          email: order.customerEmail,
          address: order.customerAddress,
        },
        stripeDetails,
      };
      
      const invoiceBuffer = await this.pdfService.generateInvoice(invoiceData);
      attachments.push({
        filename: `invoice-${order.id.slice(0, 8)}.pdf`,
        content: invoiceBuffer,
        contentType: 'application/pdf',
      });
      logger.info(`[Notifications] Invoice PDF generated for order ${order.id}`);
    } catch (error) {
      logger.error("[Notifications] Failed to generate invoice PDF:", error);
      // Continue sending email without attachment
    }

    // Send email from verified domain with seller as reply-to
    const template = this.messages.orderConfirmation(order, seller.firstName || seller.username || 'Store');
    const result = await this.sendEmail({
      to: buyerEmail,
      replyTo: seller.email || undefined,
      subject: template.emailSubject,
      html: emailHtml,
      attachments,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          recipientEmail: buyerEmail,
          subject: template.emailSubject,
          sentAt: new Date(),
          metadata: JSON.stringify({
            emailType: 'order_confirmation',
            sellerName: seller.firstName || seller.username || 'Store',
            total: order.total,
            currency: order.currency,
          }),
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log order confirmation event:", error);
      }
    }

    // Create in-app notification for seller
    if (seller.id) {
      await this.createNotification({
        userId: seller.id,
        type: 'order_placed',
        title: 'New Order Received!',
        message: `Order #${order.id.slice(0, 8)} from ${buyerName} - $${order.total}`,
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
    const emailHtml = this.generateOrderShippedEmail(order, seller);
    const template = this.messages.orderShipped(order, seller.firstName || seller.username || 'Store', order.trackingNumber || undefined);

    const result = await this.sendEmail({
      to: order.customerEmail,
      replyTo: seller.email || undefined,
      subject: template.emailSubject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          recipientEmail: order.customerEmail,
          subject: template.emailSubject,
          sentAt: new Date(),
          metadata: JSON.stringify({
            emailType: 'order_shipped',
            trackingNumber: order.trackingNumber,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log order shipped event:", error);
      }
    }

    // Create in-app notification for buyer (if they have an account)
    if (order.userId) {
      await this.createNotification({
        userId: order.userId,
        type: 'order_shipped',
        title: 'Order Shipped!',
        message: `Your order #${order.id.slice(0, 8)} has been shipped${order.trackingNumber ? ` - Tracking: ${order.trackingNumber}` : ''}`,
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
    const emailHtml = this.generateItemTrackingEmail(order, item, seller);
    const template = this.messages.itemShipped(order.id, item.productName);

    // Generate packing slip PDF for this specific item
    let attachments: EmailAttachment[] = [];
    try {
      // Build packing slip data
      const packingSlipData = {
        order,
        orderItems: [item], // Just this item
        seller,
        shippingAddress: order.customerAddress,
      };
      
      const packingSlipBuffer = await this.pdfService.generatePackingSlip(packingSlipData);
      attachments.push({
        filename: `packing-slip-${order.id.slice(0, 8)}-${item.id.slice(0, 8)}.pdf`,
        content: packingSlipBuffer,
        contentType: 'application/pdf',
      });
      logger.info(`[Notifications] Packing slip PDF generated for item ${item.id}`);
    } catch (error) {
      logger.error("[Notifications] Failed to generate packing slip PDF:", error);
      // Continue sending email without attachment
    }

    const result = await this.sendEmail({
      to: order.customerEmail,
      replyTo: seller.email || undefined,
      subject: template.emailSubject,
      html: emailHtml,
      attachments,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'tracking_updated',
          recipientEmail: order.customerEmail,
          subject: template.emailSubject,
          sentAt: new Date(),
          metadata: JSON.stringify({
            itemId: item.id,
            productName: item.productName,
            trackingNumber: item.trackingNumber,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log item tracking event:", error);
      }
    }

    // Create in-app notification for buyer (if they have an account)
    if (order.userId) {
      await this.createNotification({
        userId: order.userId,
        type: 'order_shipped',
        title: 'Item Shipped!',
        message: `${item.productName} from order #${order.id.slice(0, 8)} has shipped${item.trackingNumber ? ` - Tracking: ${item.trackingNumber}` : ''}`,
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
   * Send item delivered notification (Seller → Buyer)
   */
  async sendItemDelivered(order: Order, item: OrderItem, seller: User): Promise<void> {
    const emailHtml = this.generateItemDeliveredEmail(order, item, seller);
    const template = this.messages.itemDelivered(order.id, item.productName);

    const result = await this.sendEmail({
      to: order.customerEmail,
      replyTo: seller.email || undefined,
      subject: template.emailSubject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          recipientEmail: order.customerEmail,
          subject: template.emailSubject,
          sentAt: new Date(),
          metadata: JSON.stringify({
            emailType: 'item_delivered',
            itemId: item.id,
            productName: item.productName,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log item delivered event:", error);
      }
    }

    // Create in-app notification for buyer
    if (order.userId) {
      await this.createNotification({
        userId: order.userId,
        type: 'order_delivered',
        title: 'Item Delivered!',
        message: `${item.productName} from order #${order.id.slice(0, 8)} has been delivered`,
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
   */
  async sendItemCancelled(order: Order, item: OrderItem, seller: User, reason?: string): Promise<void> {
    const emailHtml = this.generateItemCancelledEmail(order, item, seller, reason);
    const template = this.messages.itemCancelled(order.id, item.productName, reason);

    const result = await this.sendEmail({
      to: order.customerEmail,
      replyTo: seller.email || undefined,
      subject: template.emailSubject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          recipientEmail: order.customerEmail,
          subject: template.emailSubject,
          sentAt: new Date(),
          metadata: JSON.stringify({
            emailType: 'item_cancelled',
            itemId: item.id,
            productName: item.productName,
            reason: reason || null,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log item cancelled event:", error);
      }
    }

    // Create in-app notification for buyer
    if (order.userId) {
      await this.createNotification({
        userId: order.userId,
        type: 'order_cancelled',
        title: 'Item Cancelled',
        message: `${item.productName} from order #${order.id.slice(0, 8)} has been cancelled${reason ? `: ${reason}` : ''}`,
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
   */
  async sendItemRefunded(order: Order, item: OrderItem, seller: User, refundAmount: number, refundedQuantity: number, currency: string = 'USD'): Promise<void> {
    const emailHtml = this.generateItemRefundedEmail(order, item, seller, refundAmount, refundedQuantity);
    const template = this.messages.itemRefunded(order.id, item.productName, refundAmount, currency);

    const result = await this.sendEmail({
      to: order.customerEmail,
      replyTo: seller.email || undefined,
      subject: template.emailSubject,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'email_sent',
          recipientEmail: order.customerEmail,
          subject: template.emailSubject,
          sentAt: new Date(),
          metadata: JSON.stringify({
            emailType: 'item_refunded',
            itemId: item.id,
            productName: item.productName,
            refundAmount,
            refundedQuantity,
            currency,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log item refunded event:", error);
      }
    }

    // Create in-app notification for buyer
    if (order.userId) {
      await this.createNotification({
        userId: order.userId,
        type: 'order_refunded',
        title: 'Refund Processed',
        message: `$${refundAmount.toFixed(2)} refund processed for ${item.productName} from order #${order.id.slice(0, 8)}`,
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
      from: 'UPPFIRST <noreply@upfirst.com>',
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
      const template = this.messages.authCode(code);
      logger.info(`[Notifications] Attempting to send auth code to ${email}`);
      logger.info(`[Notifications] Environment: ${process.env.NODE_ENV}`);
      
      const emailHtml = this.generateAuthCodeEmail(code, magicLinkToken);

      const result = await this.sendEmail({
        to: email,
        subject: template.emailSubject,
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
      const template = this.messages.magicLink();
      logger.info(`[Notifications] Attempting to send magic link to ${email}`);
      logger.info(`[Notifications] Environment: ${process.env.NODE_ENV}`);
      
      const emailHtml = this.generateMagicLinkEmail(link);

      const result = await this.sendEmail({
        to: email,
        subject: template.emailSubject,
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
   * DARK MODE SAFE - Works across all email clients
   */
  private generateOrderConfirmationEmail(order: Order, seller: User, products: Product[], buyerName: string, magicLink: string): string {
    const items = JSON.parse(order.items);
    const bannerUrl = seller.storeBanner || '';
    const logoUrl = seller.storeLogo || '';
    const storeName = seller.firstName || seller.username || 'Store';

    // Build order items table
    const orderItemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="width: 80px; vertical-align: top;">
                ${item.image ? `<img src="${item.image}" alt="${item.name}" style="display: block; width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 0;">` : ''}
              </td>
              <td style="padding-left: 15px; vertical-align: top;">
                <p style="margin: 0 0 5px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                  ${item.name}
                </p>
                <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Quantity: ${item.quantity} × $${item.price}
                  ${item.variant ? `<br>Variant: ${item.variant}` : ''}
                </p>
              </td>
              <td style="text-align: right; vertical-align: top; white-space: nowrap;">
                <p style="margin: 0; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                  $${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');

    // Build content
    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Order Confirmation
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Thank you for your order, ${buyerName}!
      </p>

      <!-- Order Details Box -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
        <tr>
          <td style="padding: 20px;">
            <h3 style="margin: 0 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              Order #${order.id.slice(0, 8)}
            </h3>
            <p style="margin: 0 0 8px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              <strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}
            </p>
            <p style="margin: 0 0 8px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              <strong>Payment Status:</strong> ${order.paymentStatus}
            </p>
            ${order.paymentType === 'deposit' ? `
              <p style="margin: 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                <strong>Deposit Paid:</strong> $${order.amountPaid}<br>
                <strong>Remaining Balance:</strong> $${order.remainingBalance}
              </p>
            ` : ''}
          </td>
        </tr>
      </table>

      <h3 style="margin: 30px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Order Items
      </h3>

      <!-- Order Items Table -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${orderItemsHtml}
      </table>

      <!-- Total -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="padding: 20px 0; border-top: 2px solid #1a1a1a; text-align: right;">
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
              Total: $${order.total}
            </p>
          </td>
        </tr>
      </table>

      <!-- View Order Button -->
      <div style="text-align: center; margin: 30px 0;">
        ${createEmailButton('View Order Status', magicLink, '#1a1a1a')}
      </div>

      <h3 style="margin: 30px 0 15px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Shipping Address
      </h3>
      <p style="margin: 0 0 30px; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; white-space: pre-line;" class="dark-mode-text-dark">
        ${order.customerAddress}
      </p>

      <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb !important; border-radius: 8px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">
        If you have any questions about your order, please reply to this email or contact us at ${seller.email || this.emailConfig.getSupportEmail()}.
      </p>
    `;

    return createEmailTemplate({
      preheader: `Order confirmation - Order #${order.id.slice(0, 8)}`,
      bannerUrl,
      logoUrl,
      storeName,
      content,
      footerText: `© ${new Date().getFullYear()} ${storeName}. All rights reserved.${seller.username ? ` | ${seller.username}.upfirst.io` : ''}`,
    });
  }

  /**
   * Generate order shipped email
   */
  private generateOrderShippedEmail(order: Order, seller: User): string {
    const bannerUrl = seller.storeBanner || '';
    const logoUrl = seller.storeLogo || '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .banner { width: 100%; height: 200px; object-fit: cover; }
            .header { padding: 30px; text-align: center; }
            .logo { max-width: 120px; height: auto; margin-bottom: 20px; }
            .content { padding: 0 30px 30px; }
            .tracking-box { background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .tracking-number { font-size: 24px; font-weight: bold; margin: 15px 0; letter-spacing: 1px; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .footer { padding: 30px; text-align: center; color: #666; font-size: 14px; background: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="container">
            ${bannerUrl ? `<img src="${bannerUrl}" alt="Store Banner" class="banner">` : ''}
            
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="${seller.firstName || 'Store'} Logo" class="logo">` : ''}
              <h1>Your Order Has Shipped!</h1>
              <p>Great news! Your order is on its way.</p>
            </div>

            <div class="content">
              <p>Hi ${order.customerName},</p>
              <p>Your order <strong>#${order.id.slice(0, 8)}</strong> has been shipped and is on its way to you!</p>

              ${order.trackingNumber ? `
                <div class="tracking-box">
                  <p style="margin: 0 0 10px; color: #666;">Tracking Number</p>
                  <div class="tracking-number">${order.trackingNumber}</div>
                  ${order.trackingLink ? `
                    <a href="${order.trackingLink}" class="button">Track Your Package</a>
                  ` : ''}
                </div>
              ` : `
                <p>You'll receive tracking information shortly.</p>
              `}

              <p><strong>Shipping Address:</strong><br>${order.customerAddress}</p>

              <p style="margin-top: 30px; color: #666;">
                Questions? Reply to this email or contact us at ${seller.email || this.emailConfig.getSupportEmail()}.
              </p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${seller.firstName || 'Upfirst'}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate item tracking email (Seller → Buyer) for individual item shipment
   */
  private generateItemTrackingEmail(order: Order, item: OrderItem, seller: User): string {
    const bannerUrl = seller.storeBanner || '';
    const logoUrl = seller.storeLogo || '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .banner { width: 100%; height: 200px; object-fit: cover; }
            .header { padding: 30px; text-align: center; }
            .logo { max-width: 120px; height: auto; margin-bottom: 20px; }
            .content { padding: 0 30px 30px; }
            .item-box { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .item-image { max-width: 100px; height: auto; border-radius: 6px; margin-right: 15px; }
            .item-details { display: flex; align-items: center; }
            .tracking-box { background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .tracking-number { font-size: 24px; font-weight: bold; margin: 15px 0; letter-spacing: 1px; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .footer { padding: 30px; text-align: center; color: #666; font-size: 14px; background: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="container">
            ${bannerUrl ? `<img src="${bannerUrl}" alt="Store Banner" class="banner">` : ''}
            
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="${seller.firstName || 'Store'} Logo" class="logo">` : ''}
              <h1>Item Shipped!</h1>
              <p>An item from your order has been shipped.</p>
            </div>

            <div class="content">
              <p>Hi ${order.customerName},</p>
              <p>We've shipped an item from your order <strong>#${order.id.slice(0, 8)}</strong>!</p>

              <div class="item-box">
                <div class="item-details">
                  ${item.productImage ? `<img src="${item.productImage}" alt="${item.productName}" class="item-image">` : ''}
                  <div>
                    <h3 style="margin: 0 0 10px;">${item.productName}</h3>
                    <p style="margin: 0; color: #666;">Quantity: ${item.quantity}</p>
                    ${item.variant ? `<p style="margin: 5px 0 0; color: #666;">Variant: ${JSON.stringify(item.variant).replace(/[{}"]/g, '').replace(/,/g, ', ')}</p>` : ''}
                  </div>
                </div>
              </div>

              ${item.trackingNumber ? `
                <div class="tracking-box">
                  <p style="margin: 0 0 10px; color: #666;">Tracking Number</p>
                  <div class="tracking-number">${item.trackingNumber}</div>
                  ${item.trackingLink ? `
                    <a href="${item.trackingLink}" class="button">Track Your Package</a>
                  ` : ''}
                </div>
              ` : `
                <p>You'll receive tracking information shortly.</p>
              `}

              <p><strong>Shipping Address:</strong><br>${order.customerAddress}</p>

              <p style="margin-top: 30px; color: #666;">
                Questions? Reply to this email or contact us at ${seller.email || this.emailConfig.getSupportEmail()}.
              </p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${seller.firstName || 'Upfirst'}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
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
   */
  private generateItemDeliveredEmail(order: Order, item: OrderItem, seller: User): string {
    const bannerUrl = seller.storeBanner || '';
    const logoUrl = seller.storeLogo || '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .banner { width: 100%; height: 200px; object-fit: cover; }
            .header { padding: 30px; text-align: center; }
            .logo { max-width: 120px; height: auto; margin-bottom: 20px; }
            .content { padding: 0 30px 30px; }
            .product-item { display: flex; gap: 15px; padding: 20px; background: #f9f9f9; border-radius: 8px; margin: 20px 0; }
            .product-image { width: 100px; height: 100px; object-fit: cover; border-radius: 6px; }
            .status-badge { display: inline-block; padding: 6px 12px; background: #22c55e; color: white; border-radius: 4px; font-size: 12px; font-weight: 600; margin: 10px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 30px; background: #f9f9f9; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${bannerUrl ? `<img src="${bannerUrl}" alt="Store Banner" class="banner">` : ''}
            
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="Store Logo" class="logo">` : ''}
              <h1>Item Delivered! 📦</h1>
              <p>Your item from order #${order.id.slice(0, 8)} has been delivered</p>
            </div>

            <div class="content">
              <div class="product-item">
                ${item.productImage ? `<img src="${item.productImage}" alt="${item.productName}" class="product-image">` : ''}
                <div style="flex: 1;">
                  <h3 style="margin: 0 0 10px 0;">${item.productName}</h3>
                  <span class="status-badge">DELIVERED</span>
                  <p style="color: #666; margin: 10px 0 0 0;">Quantity: ${item.quantity} • $${parseFloat(item.price).toFixed(2)} each</p>
                </div>
              </div>

              <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: 600; color: #0369a1;">We hope you love your purchase!</p>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">If you have any questions or concerns, please reply to this email.</p>
              </div>
            </div>

            <div class="footer">
              <p style="margin: 0 0 10px 0;">Thank you for shopping with ${seller.firstName || 'us'}!</p>
              <p style="margin: 0; color: #999; font-size: 12px;">© ${new Date().getFullYear()} ${seller.firstName || 'Store'}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate item cancelled email (Seller → Buyer, branded)
   */
  private generateItemCancelledEmail(order: Order, item: OrderItem, seller: User, reason?: string): string {
    const bannerUrl = seller.storeBanner || '';
    const logoUrl = seller.storeLogo || '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .banner { width: 100%; height: 200px; object-fit: cover; }
            .header { padding: 30px; text-align: center; }
            .logo { max-width: 120px; height: auto; margin-bottom: 20px; }
            .content { padding: 0 30px 30px; }
            .product-item { display: flex; gap: 15px; padding: 20px; background: #f9f9f9; border-radius: 8px; margin: 20px 0; }
            .product-image { width: 100px; height: 100px; object-fit: cover; border-radius: 6px; }
            .status-badge { display: inline-block; padding: 6px 12px; background: #ef4444; color: white; border-radius: 4px; font-size: 12px; font-weight: 600; margin: 10px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 30px; background: #f9f9f9; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${bannerUrl ? `<img src="${bannerUrl}" alt="Store Banner" class="banner">` : ''}
            
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="Store Logo" class="logo">` : ''}
              <h1>Item Cancelled</h1>
              <p>An item from your order #${order.id.slice(0, 8)} has been cancelled</p>
            </div>

            <div class="content">
              <div class="product-item">
                ${item.productImage ? `<img src="${item.productImage}" alt="${item.productName}" class="product-image">` : ''}
                <div style="flex: 1;">
                  <h3 style="margin: 0 0 10px 0;">${item.productName}</h3>
                  <span class="status-badge">CANCELLED</span>
                  <p style="color: #666; margin: 10px 0 0 0;">Quantity: ${item.quantity} • $${parseFloat(item.price).toFixed(2)} each</p>
                </div>
              </div>

              ${reason ? `
                <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                  <p style="margin: 0; font-weight: 600; color: #991b1b;">Cancellation Reason:</p>
                  <p style="margin: 10px 0 0 0; color: #666;">${reason}</p>
                </div>
              ` : ''}

              <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: 600; color: #0369a1;">Refund Information</p>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">If you were charged for this item, you'll receive a refund within 5-10 business days.</p>
              </div>

              <p style="color: #666;">If you have any questions, please reply to this email and we'll be happy to help.</p>
            </div>

            <div class="footer">
              <p style="margin: 0 0 10px 0;">Thank you for shopping with ${seller.firstName || 'us'}.</p>
              <p style="margin: 0; color: #999; font-size: 12px;">© ${new Date().getFullYear()} ${seller.firstName || 'Store'}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate item refunded email (Seller → Buyer, branded)
   */
  private generateItemRefundedEmail(order: Order, item: OrderItem, seller: User, refundAmount: number, refundedQuantity: number): string {
    const bannerUrl = seller.storeBanner || '';
    const logoUrl = seller.storeLogo || '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .banner { width: 100%; height: 200px; object-fit: cover; }
            .header { padding: 30px; text-align: center; }
            .logo { max-width: 120px; height: auto; margin-bottom: 20px; }
            .content { padding: 0 30px 30px; }
            .product-item { display: flex; gap: 15px; padding: 20px; background: #f9f9f9; border-radius: 8px; margin: 20px 0; }
            .product-image { width: 100px; height: 100px; object-fit: cover; border-radius: 6px; }
            .status-badge { display: inline-block; padding: 6px 12px; background: #3b82f6; color: white; border-radius: 4px; font-size: 12px; font-weight: 600; margin: 10px 0; }
            .refund-amount { font-size: 32px; font-weight: bold; color: #22c55e; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 30px; background: #f9f9f9; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${bannerUrl ? `<img src="${bannerUrl}" alt="Store Banner" class="banner">` : ''}
            
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="Store Logo" class="logo">` : ''}
              <h1>Refund Processed</h1>
              <p>Your refund for order #${order.id.slice(0, 8)} has been processed</p>
            </div>

            <div class="content">
              <div style="text-align: center; padding: 30px; background: #f0fdf4; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #166534; font-weight: 600;">Refund Amount</p>
                <div class="refund-amount">$${refundAmount.toFixed(2)}</div>
                <p style="margin: 0; color: #666; font-size: 14px;">This amount will appear in your account within 5-10 business days</p>
              </div>

              <div class="product-item">
                ${item.productImage ? `<img src="${item.productImage}" alt="${item.productName}" class="product-image">` : ''}
                <div style="flex: 1;">
                  <h3 style="margin: 0 0 10px 0;">${item.productName}</h3>
                  <span class="status-badge">REFUNDED</span>
                  <p style="color: #666; margin: 10px 0 0 0;">Refunded Quantity: ${refundedQuantity} • $${(refundAmount / refundedQuantity).toFixed(2)} each</p>
                </div>
              </div>

              <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: 600; color: #0369a1;">Refund Details</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #666; font-size: 14px;">
                  <li>The refund has been issued to your original payment method</li>
                  <li>Processing time: 5-10 business days</li>
                  <li>You'll see the credit from your bank or card issuer</li>
                </ul>
              </div>

              <p style="color: #666;">If you have any questions about this refund, please reply to this email.</p>
            </div>

            <div class="footer">
              <p style="margin: 0 0 10px 0;">Thank you for shopping with ${seller.firstName || 'us'}.</p>
              <p style="margin: 0; color: #999; font-size: 12px;">© ${new Date().getFullYear()} ${seller.firstName || 'Store'}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate auth code email with auto-login button
   */
  /**
   * Generate auth code email - DARK MODE SAFE
   */
  private generateAuthCodeEmail(code: string, magicLinkToken?: string): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    const magicLink = magicLinkToken ? `${baseUrl}/api/auth/email/verify-magic-link?token=${magicLinkToken}` : null;

    const content = `
      <div style="text-align: center;">
        <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Sign in to Upfirst
        </h1>
        
        ${magicLink ? `
          <p style="margin: 20px 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px;" class="dark-mode-text-dark">
            Click the button below to sign in instantly:
          </p>
          ${createEmailButton('Sign In to Upfirst', magicLink, '#1a1a1a')}
          
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

    return createEmailTemplate({
      preheader: `Your login code is ${code}`,
      storeName: 'Upfirst',
      content,
      footerText: `© ${new Date().getFullYear()} Upfirst. All rights reserved.`,
    });
  }

  /**
   * Generate magic link email
   */
  private generateMagicLinkEmail(link: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; text-align: center; }
            .button { display: inline-block; padding: 15px 40px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 30px 0; font-weight: 600; }
            .link-box { background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; word-break: break-all; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Sign in to Upfirst</h1>
            <p>Click the button below to securely sign in to your account:</p>
            
            <a href="${link}" class="button">Sign In to Upfirst</a>

            <p style="color: #666; font-size: 14px;">This link expires in 15 minutes and can only be used once.</p>

            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <div class="link-box">${link}</div>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you didn't request this link, please ignore this email.
            </p>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              © ${new Date().getFullYear()} Upfirst. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
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
    const template = this.messages.sellerWelcome(seller);

    const result = await this.sendEmail({
      from: 'UPPFIRST <noreply@upfirst.com>',
      to: seller.email || '',
      replyTo: this.emailConfig.getSupportEmail(),
      subject: template.emailSubject,
      html: emailHtml,
    });

    if (seller.id) {
      await this.createNotification({
        userId: seller.id,
        type: 'seller_welcome',
        title: 'Welcome to Upfirst!',
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
    const template = this.messages.stripeOnboardingIncomplete(seller);

    const result = await this.sendEmail({
      from: 'UPPFIRST <noreply@upfirst.com>',
      to: seller.email || '',
      replyTo: this.emailConfig.getSupportEmail(),
      subject: template.emailSubject,
      html: emailHtml,
    });

    if (seller.id) {
      await this.createNotification({
        userId: seller.id,
        type: 'stripe_onboarding_incomplete',
        title: 'Complete Stripe Setup',
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
      await this.createNotification({
        userId: seller.id,
        type: 'order_payment_failed',
        title: 'Order Payment Failed',
        message: `Payment of $${amount} failed for order #${orderId.slice(0, 8)} - ${reason}`,
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
      await this.createNotification({
        userId: seller.id,
        type: 'subscription_payment_failed',
        title: 'Subscription Payment Failed',
        message: `Your subscription payment of $${amount} failed - ${reason}. Please update your payment method.`,
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
      from: 'UPPFIRST <noreply@upfirst.com>',
      to: seller.email,
      replyTo: this.emailConfig.getSupportEmail(),
      subject: currentStock === 0 ? `Out of Stock: ${product.name}` : `Low Stock Alert: ${product.name}`,
      html: emailHtml,
    });

    if (seller.id) {
      await this.createNotification({
        userId: seller.id,
        type: currentStock === 0 ? 'inventory_out_of_stock' : 'low_inventory',
        title: currentStock === 0 ? 'Product Out of Stock' : 'Low Inventory Alert',
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
      from: 'UPPFIRST <noreply@upfirst.com>',
      to: seller.email,
      replyTo: this.emailConfig.getSupportEmail(),
      subject: `Your UPPFIRST Trial Ends in ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}`,
      html: emailHtml,
    });

    if (seller.id) {
      await this.createNotification({
        userId: seller.id,
        type: 'subscription_trial_ending',
        title: 'Trial Ending Soon',
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
      from: 'UPPFIRST <noreply@upfirst.com>',
      to: seller.email,
      replyTo: this.emailConfig.getSupportEmail(),
      subject: 'Your UPPFIRST Subscription is Active',
      html: emailHtml,
    });

    if (seller.id) {
      await this.createNotification({
        userId: seller.id,
        type: 'subscription_activated',
        title: 'Subscription Activated',
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
      from: 'UPPFIRST <noreply@upfirst.com>',
      to: seller.email,
      replyTo: this.emailConfig.getSupportEmail(),
      subject: 'Your UPPFIRST Subscription Has Been Cancelled',
      html: emailHtml,
    });

    if (seller.id) {
      await this.createNotification({
        userId: seller.id,
        type: 'subscription_cancelled',
        title: 'Subscription Cancelled',
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
      await this.createNotification({
        userId: seller.id,
        type: 'payout_failed',
        title: 'Payout Failed',
        message: `Your payout of $${amount} failed - ${reason}. Please update your bank account details.`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { amount, reason },
      });
    }

    console.log(`[Notifications] Payout failed sent to ${seller.email}:`, result.success);
  }

  /**
   * Send balance payment request (Seller → Buyer)
   */
  async sendBalancePaymentRequest(order: Order, seller: User, paymentLink: string): Promise<void> {
    const emailHtml = this.generateBalancePaymentRequestEmail(order, seller, paymentLink);

    const result = await this.sendEmail({
      to: order.customerEmail,

      replyTo: seller.email || undefined,
      subject: `Balance Payment Due - Order #${order.id.slice(0, 8)}`,
      html: emailHtml,
    });

    // Log email event to order_events table
    if (result.success) {
      try {
        await this.storage.createOrderEvent({
          orderId: order.id,
          eventType: 'balance_payment_requested',
          recipientEmail: order.customerEmail,
          subject: `Balance Payment Due - Order #${order.id.slice(0, 8)}`,
          sentAt: new Date(),
          metadata: JSON.stringify({
            emailType: 'balance_payment_request',
            remainingBalance: order.remainingBalance,
            currency: order.currency,
            paymentLink,
            sellerName: seller.firstName || seller.username || 'Store',
          }),
        });
      } catch (error) {
        logger.error("[Notifications] Failed to log balance payment request event:", error);
      }
    }

    // Create in-app notification for buyer (if they have an account)
    if (order.userId) {
      await this.createNotification({
        userId: order.userId,
        type: 'preorder_balance_due',
        title: 'Balance Payment Due',
        message: `Your remaining balance of $${order.remainingBalance} is now due for order #${order.id.slice(0, 8)}`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { orderId: order.id, amount: order.remainingBalance, paymentLink },
      });
    }

    console.log(`[Notifications] Balance payment request sent to ${order.customerEmail}:`, result.success);
  }

  /**
   * Send seller order notification (Platform → Seller) when buyer places order
   */
  async sendSellerOrderNotification(order: Order, seller: User, products: Product[]): Promise<void> {
    if (!seller.email) {
      logger.error("[Notifications] Cannot send seller order notification - no seller email");
      return;
    }

    // Get Stripe business details for footer
    const stripeDetails = await this.getStripeBusinessDetails(seller);

    // Generate email HTML
    const emailHtml = await this.generateSellerOrderEmail(order, seller, products, stripeDetails);

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
          recipientEmail: seller.email,
          subject,
          sentAt: new Date(),
          metadata: JSON.stringify({
            emailType: 'seller_order_notification',
            buyerName: order.customerName,
            buyerEmail: order.customerEmail,
            total: order.total,
            currency: order.currency,
            productCount: products.length,
          }),
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
    await this.createNotification({
      userId: user.id,
      type: 'subscription_charged',
      title: 'Subscription Payment Processed',
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
   * Generate balance payment request email (Seller → Buyer)
   */
  private generateBalancePaymentRequestEmail(order: Order, seller: User, paymentLink: string): string {
    const bannerUrl = seller.storeBanner || '';
    const logoUrl = seller.storeLogo || '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .banner { width: 100%; height: 200px; object-fit: cover; }
            .header { padding: 30px; text-align: center; }
            .logo { max-width: 120px; height: auto; margin-bottom: 20px; }
            .content { padding: 0 30px 30px; }
            .payment-box { background: #f0f7ff; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center; }
            .amount { font-size: 32px; font-weight: bold; color: #000; margin: 15px 0; }
            .button { display: inline-block; padding: 14px 40px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .button:hover { background: #333; }
            .order-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { padding: 30px; text-align: center; color: #666; font-size: 14px; background: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="container">
            ${bannerUrl ? `<img src="${bannerUrl}" alt="Store Banner" class="banner">` : ''}
            
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="${seller.firstName || 'Store'} Logo" class="logo">` : ''}
              <h1>Balance Payment Due</h1>
            </div>

            <div class="content">
              <p>Hi ${order.customerName},</p>
              
              <p>Your order is ready, and the remaining balance is now due.</p>

              <div class="order-details">
                <h3>Order #${order.id.slice(0, 8)}</h3>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Deposit Paid:</strong> $${order.amountPaid}</p>
              </div>

              <div class="payment-box">
                <p style="margin: 0 0 10px; color: #666;">Amount Due</p>
                <div class="amount">$${order.remainingBalance}</div>
                <a href="${paymentLink}" class="button">Pay Balance Now</a>
              </div>

              <p><strong>What happens next?</strong></p>
              <ol>
                <li>Click the button above to complete payment</li>
                <li>Once paid, your order will be shipped immediately</li>
                <li>You'll receive tracking information via email</li>
              </ol>

              <p style="margin-top: 30px; color: #666;">
                Questions? Reply to this email or contact ${seller.email || this.emailConfig.getSupportEmail()}
              </p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${seller.firstName || 'Upfirst'}. All rights reserved.</p>
              <p>${seller.username ? `${seller.username}.upfirst.io` : 'upfirst.io'}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate seller order notification email - DARK MODE SAFE
   * Sent to seller when buyer places order
   */
  private async generateSellerOrderEmail(order: Order, seller: User, products: Product[], stripeDetails: any): string {
    const items = JSON.parse(order.items);
    const bannerUrl = seller.storeBanner || '';
    const logoUrl = seller.storeLogo || '';
    const businessName = stripeDetails?.businessName || seller.firstName || seller.username || 'Store';
    const businessAddress = stripeDetails?.address?.line1 ? `${stripeDetails.address.line1}, ${stripeDetails.address.city}, ${stripeDetails.address.state} ${stripeDetails.address.postal_code}` : '';

    // Get base URL for dashboard link
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;

    // Build product items HTML with thumbnails
    const productItemsHtml = items.map((item: any) => {
      const product = products.find(p => p.id === item.productId);
      const productImage = product?.image || item.image;
      
      return `
        <tr>
          <td style="padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="width: 80px; vertical-align: top;">
                  ${productImage ? `<img src="${productImage}" alt="${item.name}" style="display: block; width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 0;">` : '<div style="width: 80px; height: 80px; background-color: #f3f4f6; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #9ca3af;">No image</div>'}
                </td>
                <td style="padding-left: 15px; vertical-align: top;">
                  <p style="margin: 0 0 5px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${item.name}
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Qty: ${item.quantity} × $${item.price}
                    ${item.variant ? `<br>Variant: ${JSON.stringify(item.variant)}` : ''}
                  </p>
                </td>
                <td style="text-align: right; vertical-align: top; white-space: nowrap;">
                  <p style="margin: 0; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    $${(parseFloat(item.price) * item.quantity).toFixed(2)}
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

    const content = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <!-- Header Banner/Logo -->
        ${bannerUrl ? `
          <tr>
            <td style="padding: 0;">
              <img src="${bannerUrl}" alt="${businessName}" style="display: block; width: 100%; height: 200px; object-fit: cover; border: 0;">
            </td>
          </tr>
        ` : ''}
        
        <!-- Logo and Title -->
        <tr>
          <td style="padding: 30px; text-align: center; background-color: #ffffff !important;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${businessName} Logo" style="display: block; width: 120px; height: auto; margin: 0 auto 20px; border: 0;">` : ''}
            <h1 style="margin: 0 0 10px; font-size: 32px; font-weight: 700; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              New Order Received!
            </h1>
            <p style="margin: 0; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              You have a new order from ${order.customerName}
            </p>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding: 0 30px 30px; background-color: #ffffff !important;">
            
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
                    <strong>Payment Status:</strong> <span style="background-color: #bbf7d0; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${order.paymentStatus.toUpperCase()}</span>
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
                  <p style="margin: 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <strong>Shipping Address:</strong><br>
                    <span style="white-space: pre-line; color: #6b7280 !important;">${order.customerAddress}</span>
                  </p>
                </td>
              </tr>
            </table>

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
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
              <tr>
                <td style="text-align: center;">
                  ${createEmailButton('View Order Details', `${baseUrl}/seller/orders/${order.id}`, '#1a1a1a')}
                  <p style="margin: 20px 0 0; font-size: 14px;">
                    <a href="${baseUrl}/seller" style="color: #2563eb !important; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Go to Dashboard →</a>
                  </p>
                </td>
              </tr>
            </table>

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

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 30px; background-color: #f9fafb !important; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${businessName}
              ${businessAddress ? `<br>${businessAddress}` : ''}
              ${seller.email ? `<br><a href="mailto:${seller.email}" style="color: #2563eb !important; text-decoration: none;">${seller.email}</a>` : ''}
            </p>
            ${seller.instagram || seller.facebook || seller.twitter || seller.tiktok ? `
              <p style="margin: 15px 0 0; font-size: 14px;">
                ${seller.instagram ? `<a href="${seller.instagram}" style="color: #6b7280 !important; text-decoration: none; margin: 0 8px;">Instagram</a>` : ''}
                ${seller.facebook ? `<a href="${seller.facebook}" style="color: #6b7280 !important; text-decoration: none; margin: 0 8px;">Facebook</a>` : ''}
                ${seller.twitter ? `<a href="${seller.twitter}" style="color: #6b7280 !important; text-decoration: none; margin: 0 8px;">Twitter</a>` : ''}
                ${seller.tiktok ? `<a href="${seller.tiktok}" style="color: #6b7280 !important; text-decoration: none; margin: 0 8px;">TikTok</a>` : ''}
              </p>
            ` : ''}
            <p style="margin: 20px 0 0; font-size: 12px; color: #9ca3af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Powered by <a href="https://upfirst.com" style="color: #2563eb !important; text-decoration: none;">Upfirst</a>
            </p>
            <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              © ${new Date().getFullYear()} ${businessName}. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    `;

    return createEmailTemplate({
      preheader: `New order #${order.id.slice(0, 8)} from ${order.customerName} - $${total.toFixed(2)}`,
      content,
      footerText: '', // Footer is included in content
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
}

export const createNotificationService = (storage: any, pdfService: PDFService): NotificationService => {
  return new NotificationServiceImpl(storage, pdfService);
};
