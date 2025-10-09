import { Resend } from 'resend';
import type { User, Order, Product, Notification, InsertNotification } from '../shared/schema';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'Uppfirst <noreply@uppfirst.com>'; // Update with your verified domain

export interface NotificationService {
  sendEmail(params: SendEmailParams): Promise<{ success: boolean; emailId?: string; error?: string }>;
  createNotification(notification: InsertNotification): Promise<Notification | null>;
  sendOrderConfirmation(order: Order, seller: User, products: Product[]): Promise<void>;
  sendOrderShipped(order: Order, seller: User): Promise<void>;
  sendProductListed(seller: User, product: Product): Promise<void>;
  sendAuthCode(email: string, code: string): Promise<void>;
  sendMagicLink(email: string, link: string): Promise<void>;
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
   * Send email using Resend
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

    // Send email with seller as sender
    const result = await this.sendEmail({
      to: buyerEmail,
      from: seller.email ? `${seller.firstName || 'Store'} <${seller.email}>` : FROM_EMAIL,
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
      from: seller.email ? `${seller.firstName || 'Store'} <${seller.email}>` : FROM_EMAIL,
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
   * Send product listed confirmation (Uppfirst → Seller)
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
   * Send authentication code (6-digit code)
   */
  async sendAuthCode(email: string, code: string): Promise<void> {
    const emailHtml = this.generateAuthCodeEmail(code);

    await this.sendEmail({
      to: email,
      subject: `Your Uppfirst Login Code: ${code}`,
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
      subject: 'Sign in to Uppfirst',
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
                If you have any questions about your order, please reply to this email or contact us at ${seller.email || 'support@uppfirst.com'}.
              </p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${seller.firstName || 'Uppfirst'}. All rights reserved.</p>
              <p>${seller.username ? `${seller.username}.uppfirst.com` : 'uppfirst.com'}</p>
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
              <h1>📦 Your Order Has Shipped!</h1>
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
                Questions? Reply to this email or contact us at ${seller.email || 'support@uppfirst.com'}.
              </p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${seller.firstName || 'Uppfirst'}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate product listed email (Uppfirst → Seller, no branding)
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
            <h1>✅ Product Listed Successfully</h1>
            <p>Hi ${seller.firstName || 'there'},</p>
            <p>Your product has been successfully listed on your Uppfirst store!</p>

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
              <p>© ${new Date().getFullYear()} Uppfirst. All rights reserved.</p>
              <p>This is an automated notification from Uppfirst.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate auth code email
   */
  private generateAuthCodeEmail(code: string): string {
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
            .warning { color: #666; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Your Login Code</h1>
            <p>Enter this code to sign in to Uppfirst:</p>
            
            <div class="code-box">
              <div class="code">${code}</div>
              <p style="color: #666; margin-top: 15px;">This code expires in 15 minutes</p>
            </div>

            <p class="warning">
              If you didn't request this code, please ignore this email.
            </p>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              © ${new Date().getFullYear()} Uppfirst. All rights reserved.
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
            <h1>🔗 Sign in to Uppfirst</h1>
            <p>Click the button below to securely sign in to your account:</p>
            
            <a href="${link}" class="button">Sign In to Uppfirst</a>

            <p style="color: #666; font-size: 14px;">This link expires in 15 minutes and can only be used once.</p>

            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <div class="link-box">${link}</div>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you didn't request this link, please ignore this email.
            </p>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              © ${new Date().getFullYear()} Uppfirst. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}

export const createNotificationService = (storage: any): NotificationService => {
  return new NotificationServiceImpl(storage);
};
