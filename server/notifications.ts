import { Resend } from 'resend';
import type { User, Order, Product, Notification, InsertNotification } from '../shared/schema';

const resend = new Resend(process.env.RESEND_API_KEY);
// Using verified domain upfirst.io
const FROM_EMAIL = process.env.FROM_EMAIL || 'Upfirst <hello@upfirst.io>';

export interface NotificationService {
  sendEmail(params: SendEmailParams): Promise<{ success: boolean; emailId?: string; error?: string }>;
  createNotification(notification: InsertNotification): Promise<Notification | null>;
  sendOrderConfirmation(order: Order, seller: User, products: Product[]): Promise<void>;
  sendOrderShipped(order: Order, seller: User): Promise<void>;
  sendProductListed(seller: User, product: Product): Promise<void>;
  sendAuthCode(email: string, code: string, magicLinkToken?: string): Promise<void>;
  sendMagicLink(email: string, link: string): Promise<void>;
  
  // Phase 1: Critical Revenue-Impacting Notifications
  sendSellerWelcome(seller: User): Promise<void>;
  sendStripeOnboardingIncomplete(seller: User): Promise<void>;
  sendOrderPaymentFailed(seller: User, orderId: string, amount: number, reason: string): Promise<void>;
  sendBuyerPaymentFailed(buyerEmail: string, buyerName: string, amount: number, reason: string, retryLink?: string): Promise<void>;
  sendSubscriptionPaymentFailed(seller: User, amount: number, reason: string): Promise<void>;
  sendInventoryOutOfStock(seller: User, product: Product): Promise<void>;
  sendPayoutFailed(seller: User, amount: number, reason: string): Promise<void>;
  
  // Balance Payment Request
  sendBalancePaymentRequest(order: Order, seller: User, paymentLink: string): Promise<void>;
  
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

interface SendEmailParams {
  to: string;
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
}

class NotificationServiceImpl implements NotificationService {
  private storage: any; // Will be injected

  constructor(storage: any) {
    this.storage = storage;
  }

  /**
   * Send email using Resend (with development fallback)
   */
  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; emailId?: string; error?: string }> {
    try {
      const result = await resend.emails.send({
        from: params.from || FROM_EMAIL,
        to: params.to,
        replyTo: params.replyTo,
        subject: params.subject,
        html: params.html,
      });

      if (result.error) {
        console.error('[Notifications] Email send error:', result.error);
        
        // In development, if domain is not verified, log email to console
        const errorMsg = result.error.message || '';
        const isDomainError = errorMsg.includes('not verified') || errorMsg.includes('domain') || result.error.statusCode === 403;
        
        if (process.env.NODE_ENV === 'development' && isDomainError) {
          console.log('\n═══════════════════════════════════════════════════════');
          console.log('📧 EMAIL (Development Mode - Domain Not Verified)');
          console.log('═══════════════════════════════════════════════════════');
          console.log(`To: ${params.to}`);
          console.log(`From: ${params.from || FROM_EMAIL}`);
          console.log(`Subject: ${params.subject}`);
          console.log('───────────────────────────────────────────────────────');
          
          // Extract verification code if it's an auth email
          const codeMatch = params.html.match(/\b\d{6}\b/);
          if (codeMatch) {
            console.log(`🔑 VERIFICATION CODE: ${codeMatch[0]}`);
          }
          
          console.log('───────────────────────────────────────────────────────');
          console.log('💡 To send real emails, verify your domain at:');
          console.log('   https://resend.com/domains');
          console.log('═══════════════════════════════════════════════════════\n');
          
          // Return success in development so auth flow continues
          return { success: true, emailId: 'dev-mode-' + Date.now() };
        }
        
        return { success: false, error: result.error.message };
      }

      return { success: true, emailId: result.data?.id };
    } catch (error: any) {
      console.error('[Notifications] Email send exception:', error);
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
      console.error('[Notifications] Create notification error:', error);
      return null;
    }
  }

  /**
   * Send order confirmation (Seller → Buyer) with seller branding
   */
  async sendOrderConfirmation(order: Order, seller: User, products: Product[]): Promise<void> {
    const buyerEmail = order.customerEmail;
    const buyerName = order.customerName;

    // Generate branded email HTML
    const emailHtml = this.generateOrderConfirmationEmail(order, seller, products, buyerName);

    // Send email from verified domain with seller as reply-to
    const result = await this.sendEmail({
      to: buyerEmail,
      from: `${seller.firstName || 'Store'} via Upfirst <hello@upfirst.io>`,
      replyTo: seller.email || undefined,
      subject: `Order Confirmation #${order.id.slice(0, 8)} - ${seller.firstName || 'Your'} Store`,
      html: emailHtml,
    });

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

    const result = await this.sendEmail({
      to: order.customerEmail,
      from: `${seller.firstName || 'Store'} via Upfirst <hello@upfirst.io>`,
      replyTo: seller.email || undefined,
      subject: `Your order has shipped! - Order #${order.id.slice(0, 8)}`,
      html: emailHtml,
    });

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
   * Send product listed confirmation (Upfirst → Seller)
   */
  async sendProductListed(seller: User, product: Product): Promise<void> {
    const emailHtml = this.generateProductListedEmail(seller, product);

    const result = await this.sendEmail({
      to: seller.email!,
      subject: `Product Listed: ${product.name}`,
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
   */
  async sendAuthCode(email: string, code: string, magicLinkToken?: string): Promise<void> {
    const emailHtml = this.generateAuthCodeEmail(code, magicLinkToken);

    await this.sendEmail({
      to: email,
      subject: `Your Upfirst Login Code: ${code}`,
      html: emailHtml,
    });

    console.log(`[Notifications] Auth code sent to ${email}`);
  }

  /**
   * Send magic link authentication
   */
  async sendMagicLink(email: string, link: string): Promise<void> {
    const emailHtml = this.generateMagicLinkEmail(link);

    await this.sendEmail({
      to: email,
      subject: 'Sign in to Upfirst',
      html: emailHtml,
    });

    console.log(`[Notifications] Magic link sent to ${email}`);
  }

  /**
   * Generate branded order confirmation email with seller banner and product images
   */
  private generateOrderConfirmationEmail(order: Order, seller: User, products: Product[], buyerName: string): string {
    const items = JSON.parse(order.items);
    const bannerUrl = seller.storeBanner || '';
    const logoUrl = seller.storeLogo || '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .banner { width: 100%; height: 200px; object-fit: cover; }
            .header { padding: 30px; text-align: center; }
            .logo { max-width: 120px; height: auto; margin-bottom: 20px; }
            .content { padding: 0 30px 30px; }
            .order-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .product-item { display: flex; gap: 15px; padding: 15px 0; border-bottom: 1px solid #eee; }
            .product-item:last-child { border-bottom: none; }
            .product-image { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; }
            .product-info { flex: 1; }
            .product-name { font-weight: 600; margin-bottom: 5px; }
            .product-details { font-size: 14px; color: #666; }
            .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #333; }
            .footer { padding: 30px; text-align: center; color: #666; font-size: 14px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${bannerUrl ? `<img src="${bannerUrl}" alt="Store Banner" class="banner">` : ''}
            
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="${seller.firstName || 'Store'} Logo" class="logo">` : ''}
              <h1>Order Confirmation</h1>
              <p>Thank you for your order, ${buyerName}!</p>
            </div>

            <div class="content">
              <div class="order-details">
                <h3>Order #${order.id.slice(0, 8)}</h3>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
                ${order.paymentType === 'deposit' ? `<p><strong>Deposit Paid:</strong> $${order.amountPaid}<br><strong>Remaining Balance:</strong> $${order.remainingBalance}</p>` : ''}
              </div>

              <h3>Order Items</h3>
              ${items.map((item: any) => `
                <div class="product-item">
                  ${item.image ? `<img src="${item.image}" alt="${item.name}" class="product-image">` : ''}
                  <div class="product-info">
                    <div class="product-name">${item.name}</div>
                    <div class="product-details">
                      Quantity: ${item.quantity} × $${item.price}
                      ${item.variant ? `<br>Variant: ${item.variant}` : ''}
                    </div>
                  </div>
                  <div style="text-align: right; font-weight: 600;">
                    $${(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </div>
                </div>
              `).join('')}

              <div class="total">
                Total: $${order.total}
              </div>

              <div style="text-align: center;">
                <a href="${process.env.VITE_BASE_URL || 'http://localhost:5000'}/orders/${order.id}" class="button">
                  View Order Status
                </a>
              </div>

              <h3>Shipping Address</h3>
              <p>${order.customerAddress}</p>

              <p style="margin-top: 30px; color: #666;">
                If you have any questions about your order, please reply to this email or contact us at ${seller.email || 'support@upfirst.com'}.
              </p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${seller.firstName || 'Upfirst'}. All rights reserved.</p>
              <p>${seller.username ? `${seller.username}.upfirst.com` : 'upfirst.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `;
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
                Questions? Reply to this email or contact us at ${seller.email || 'support@upfirst.com'}.
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
   * Generate product listed email (Upfirst → Seller, no branding)
   */
  private generateProductListedEmail(seller: User, product: Product): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; }
            h1 { color: #000; margin-bottom: 10px; }
            .product-card { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .product-image { width: 100%; max-width: 300px; height: auto; border-radius: 6px; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Product Listed Successfully</h1>
            <p>Hi ${seller.firstName || 'there'},</p>
            <p>Your product has been successfully listed on your Upfirst store!</p>

            <div class="product-card">
              <h3>${product.name}</h3>
              ${product.image ? `<img src="${product.image}" alt="${product.name}" class="product-image">` : ''}
              <p><strong>Price:</strong> $${product.price}</p>
              <p><strong>Type:</strong> ${product.productType}</p>
              <p><strong>Category:</strong> ${product.category}</p>
            </div>

            <a href="${process.env.VITE_BASE_URL || 'http://localhost:5000'}/products/${product.id}" class="button">
              View Product
            </a>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Upfirst. All rights reserved.</p>
              <p>This is an automated notification from Upfirst.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate auth code email with auto-login button
   */
  private generateAuthCodeEmail(code: string, magicLinkToken?: string): string {
    const baseUrl = process.env.VITE_BASE_URL || 'http://localhost:5000';
    const magicLink = magicLinkToken ? `${baseUrl}/api/auth/email/verify-magic-link?token=${magicLinkToken}` : null;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; text-align: center; }
            .code-box { background: #f0f7ff; padding: 30px; border-radius: 8px; margin: 30px 0; }
            .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #000; margin: 10px 0; }
            .button { display: inline-block; padding: 14px 40px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .button:hover { background: #333; }
            .divider { margin: 30px 0; color: #999; font-size: 14px; }
            .warning { color: #666; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Sign in to Upfirst</h1>
            
            ${magicLink ? `
              <p>Click the button below to sign in instantly:</p>
              <a href="${magicLink}" class="button">Sign In to Upfirst</a>
              
              <div class="divider">OR</div>
              
              <p>Enter this code manually:</p>
            ` : `
              <p>Enter this code to sign in:</p>
            `}
            
            <div class="code-box">
              <div class="code">${code}</div>
              <p style="color: #666; margin-top: 15px;">This code expires in 15 minutes</p>
            </div>

            <p class="warning">
              If you didn't request this code, please ignore this email.
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
    const emailHtml = this.generateSellerWelcomeEmail(seller);

    const result = await this.sendEmail({
      to: seller.email || '',
      from: FROM_EMAIL,
      replyTo: 'support@upfirst.com',
      subject: `Welcome to Upfirst, ${seller.firstName || 'Seller'}!`,
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

    const result = await this.sendEmail({
      to: seller.email || '',
      from: FROM_EMAIL,
      replyTo: 'support@upfirst.com',
      subject: 'Complete Your Stripe Setup to Start Accepting Payments',
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
      from: FROM_EMAIL,
      replyTo: 'support@upfirst.com',
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
  async sendBuyerPaymentFailed(buyerEmail: string, buyerName: string, amount: number, reason: string, retryLink?: string): Promise<void> {
    const emailHtml = this.generateBuyerPaymentFailedEmail(buyerName, amount, reason, retryLink);

    await this.sendEmail({
      to: buyerEmail,
      from: FROM_EMAIL,
      replyTo: 'support@upfirst.com',
      subject: 'Payment Failed - Please Try Again',
      html: emailHtml,
    });

    console.log(`[Notifications] Buyer payment failed sent to ${buyerEmail}`);
  }

  /**
   * Send subscription payment failed (Upfirst → Seller)
   */
  async sendSubscriptionPaymentFailed(seller: User, amount: number, reason: string): Promise<void> {
    const emailHtml = this.generateSubscriptionPaymentFailedEmail(seller, amount, reason);

    const result = await this.sendEmail({
      to: seller.email || '',
      from: FROM_EMAIL,
      replyTo: 'support@upfirst.com',
      subject: 'Your Upfirst Subscription Payment Failed',
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
  async sendInventoryOutOfStock(seller: User, product: Product): Promise<void> {
    const emailHtml = this.generateInventoryOutOfStockEmail(seller, product);

    const result = await this.sendEmail({
      to: seller.email || '',
      from: FROM_EMAIL,
      replyTo: 'support@upfirst.com',
      subject: `Product Out of Stock: ${product.name}`,
      html: emailHtml,
    });

    if (seller.id) {
      await this.createNotification({
        userId: seller.id,
        type: 'inventory_out_of_stock',
        title: 'Product Out of Stock',
        message: `${product.name} is now out of stock and has been hidden from your store`,
        emailSent: result.success ? 1 : 0,
        emailId: result.emailId,
        metadata: { productId: product.id, productName: product.name },
      });
    }

    console.log(`[Notifications] Inventory out of stock sent to ${seller.email}:`, result.success);
  }

  /**
   * Send payout failed notification (Upfirst → Seller)
   */
  async sendPayoutFailed(seller: User, amount: number, reason: string): Promise<void> {
    const emailHtml = this.generatePayoutFailedEmail(seller, amount, reason);

    const result = await this.sendEmail({
      to: seller.email || '',
      from: FROM_EMAIL,
      replyTo: 'support@upfirst.com',
      subject: 'Payout Failed - Action Required',
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
      from: `${seller.firstName || 'Store'} via Upfirst <hello@upfirst.io>`,
      replyTo: seller.email || undefined,
      subject: `Balance Payment Due - Order #${order.id.slice(0, 8)}`,
      html: emailHtml,
    });

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
   * ============================================
   * EMAIL TEMPLATE GENERATORS - PHASE 1
   * ============================================
   */

  private generateSellerWelcomeEmail(seller: User): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; }
            h1 { color: #000; margin-bottom: 10px; }
            .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
            .step { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 15px 0; }
            .step-number { display: inline-block; width: 30px; height: 30px; background: #000; color: white; border-radius: 50%; text-align: center; line-height: 30px; margin-right: 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="hero">
              <h1 style="color: white; margin: 0;">Welcome to Upfirst!</h1>
              <p style="font-size: 18px; margin: 10px 0 0;">Your e-commerce journey starts here</p>
            </div>

            <p>Hi ${seller.firstName || 'there'},</p>
            <p>Congratulations! Your Upfirst store is ready to go. Here's how to get started:</p>

            <div class="step">
              <span class="step-number">1</span>
              <strong>Set Up Payments</strong>
              <p style="margin: 10px 0 0;">Connect your Stripe account to start accepting payments (1.5% platform fee)</p>
            </div>

            <div class="step">
              <span class="step-number">2</span>
              <strong>List Your First Product</strong>
              <p style="margin: 10px 0 0;">Add products with flexible types: in-stock, pre-order, made-to-order, or wholesale</p>
            </div>

            <div class="step">
              <span class="step-number">3</span>
              <strong>Customize Your Store</strong>
              <p style="margin: 10px 0 0;">Add your logo, banner, and branding to make your store uniquely yours</p>
            </div>

            <a href="${process.env.VITE_BASE_URL || 'http://localhost:5000'}/settings" class="button">
              Get Started
            </a>

            <p style="margin-top: 30px; padding: 20px; background: #f0f7ff; border-radius: 8px;">
              <strong>Pro Tip:</strong> You have a 30-day free trial to explore all features. No payment method required to start!
            </p>

            <div class="footer">
              <p>Questions? Reply to this email or visit our help center.</p>
              <p>© ${new Date().getFullYear()} Upfirst. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateStripeOnboardingIncompleteEmail(seller: User): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; }
            .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Complete Your Stripe Setup</h1>
            <p>Hi ${seller.firstName || 'there'},</p>
            
            <div class="alert-box">
              <strong>Action Required:</strong> Your Stripe account setup is incomplete. You won't be able to accept payments until this is done.
            </div>

            <p>Completing your Stripe setup takes just a few minutes and allows you to:</p>
            <ul>
              <li>Accept credit cards, Apple Pay, and Google Pay</li>
              <li>Receive automatic payouts to your bank account</li>
              <li>Start selling immediately</li>
            </ul>

            <a href="${process.env.VITE_BASE_URL || 'http://localhost:5000'}/settings?tab=payment" class="button">
              Complete Stripe Setup
            </a>

            <p style="color: #666; font-size: 14px;">
              Need help? Our support team is here: support@upfirst.com
            </p>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Upfirst. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
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

            <a href="${process.env.VITE_BASE_URL || 'http://localhost:5000'}/seller" class="button">
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
              Need help? Contact support@upfirst.com
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

            <a href="${process.env.VITE_BASE_URL || 'http://localhost:5000'}/settings?tab=subscription" class="button">
              Update Payment Method
            </a>

            <div class="footer">
              <p>Questions? Contact support@upfirst.com</p>
              <p>© ${new Date().getFullYear()} Upfirst. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateInventoryOutOfStockEmail(seller: User, product: Product): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; }
            .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .product-card { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Product Out of Stock</h1>
            <p>Hi ${seller.firstName || 'there'},</p>
            
            <div class="alert-box">
              <strong>Action Required:</strong> One of your products is out of stock
            </div>

            <div class="product-card">
              <h3>${product.name}</h3>
              <p><strong>Current Stock:</strong> 0 units</p>
              <p><strong>Status:</strong> Hidden from store (automatically)</p>
            </div>

            <p>This product has been automatically hidden from your storefront to prevent new orders.</p>

            <p><strong>Next steps:</strong></p>
            <ul>
              <li>Restock the product</li>
              <li>Update the inventory count</li>
              <li>The product will be automatically shown again</li>
            </ul>

            <a href="${process.env.VITE_BASE_URL || 'http://localhost:5000'}/seller/products/${product.id}/edit" class="button">
              Update Inventory
            </a>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Upfirst. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
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
              <p>Need help? Contact support@upfirst.com</p>
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
        const trackingPixelUrl = `${process.env.VITE_BASE_URL || 'http://localhost:5000'}/api/newsletters/track/${newsletterId}/open?email=${encodedEmail}`;
        const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

        // Add unsubscribe link to HTML
        const unsubscribeUrl = `${process.env.VITE_BASE_URL || 'http://localhost:5000'}/api/newsletters/unsubscribe?email=${encodedEmail}`;
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

      const result = await resend.batch.send(emails);

      if (result.error) {
        console.error('[Newsletter] Batch send error:', result.error);
        
        // In development, if domain/validation error, log and succeed anyway
        const errorMsg = result.error.message || '';
        const isValidationError = errorMsg.includes('Invalid') || errorMsg.includes('test.com') || errorMsg.includes('testing email') || errorMsg.includes('not verified') || result.error.statusCode === 422 || result.error.statusCode === 403;
        
        if (process.env.NODE_ENV === 'development' && isValidationError) {
          console.log('\n═══════════════════════════════════════════════════════');
          console.log('📧 NEWSLETTER (Development Mode - Validation Error)');
          console.log('═══════════════════════════════════════════════════════');
          console.log(`Subject: ${subject}`);
          console.log(`From: ${from}`);
          console.log(`Recipients: ${recipients.map(r => r.email).join(', ')}`);
          console.log('───────────────────────────────────────────────────────');
          console.log('⚠️  Resend validation error (expected in development):');
          console.log(`   ${errorMsg}`);
          console.log('───────────────────────────────────────────────────────');
          console.log('💡 Newsletter logged to console. To send real emails:');
          console.log('   1. Use allowed test addresses (delivered@resend.dev)');
          console.log('   2. Or verify your domain at: https://resend.com/domains');
          console.log('═══════════════════════════════════════════════════════\n');
          
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
        
        return { success: false, error: result.error.message };
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

      console.log(`[Newsletter] Batch sent to ${recipients.length} recipients`);
      return { success: true, batchId: result.data?.id };
    } catch (error: any) {
      console.error('[Newsletter] Send exception:', error);
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
          console.log(`[Newsletter] Duplicate webhook event ${webhookEventId}, skipping`);
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
        console.log(`[Newsletter] Duplicate ${eventType} event for ${recipientEmail}, skipping analytics update`);
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
      console.error('[Newsletter] Track event error:', error);
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
                Questions? Reply to this email or contact ${seller.email || 'support@upfirst.com'}
              </p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${seller.firstName || 'Upfirst'}. All rights reserved.</p>
              <p>${seller.username ? `${seller.username}.upfirst.com` : 'upfirst.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export const createNotificationService = (storage: any): NotificationService => {
  return new NotificationServiceImpl(storage);
};
