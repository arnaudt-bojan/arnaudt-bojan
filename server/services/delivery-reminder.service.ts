/**
 * Delivery Reminder Service
 * Sends email reminders to sellers 7 days before pre-order/made-to-order delivery dates
 */

import type { IStorage } from "../storage";
import type { IEmailProvider } from "./email-provider.service";
import { logger } from "../logger";
import crypto from "crypto";

export class DeliveryReminderService {
  private intervalHandle: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_HOURS = 6; // Check 4 times per day

  constructor(
    private storage: IStorage,
    private emailProvider: IEmailProvider
  ) {}

  /**
   * Start the background job
   */
  start(): void {
    logger.info(`[DeliveryReminder] Starting background reminder job`, {
      intervalHours: this.CHECK_INTERVAL_HOURS,
    });

    // Run immediately on start
    this.checkAndSendReminders().catch((error) => {
      logger.error("[DeliveryReminder] Initial check failed:", error);
    });

    // Then run every N hours
    this.intervalHandle = setInterval(
      () => {
        this.checkAndSendReminders().catch((error) => {
          logger.error("[DeliveryReminder] Scheduled check failed:", error);
        });
      },
      this.CHECK_INTERVAL_HOURS * 60 * 60 * 1000
    );

    logger.info(`[DeliveryReminder] Background job started`);
  }

  /**
   * Stop the background job
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      logger.info("[DeliveryReminder] Background job stopped");
    }
  }

  /**
   * Main logic: Check for orders with delivery dates 7 days from now
   */
  async checkAndSendReminders(): Promise<void> {
    logger.debug("[DeliveryReminder] Starting reminder cycle");

    try {
      // Validate SESSION_SECRET is configured
      if (!process.env.SESSION_SECRET) {
        logger.error("[DeliveryReminder] SESSION_SECRET is not configured - cannot send reminders with magic links");
        throw new Error("SESSION_SECRET is required for delivery reminders");
      }

      // Calculate target date (7 days from now)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 7);
      targetDate.setHours(0, 0, 0, 0); // Start of day

      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999); // End of day

      logger.info(`[DeliveryReminder] Checking for deliveries on ${targetDate.toISOString()}`);

      // Get all orders
      const allOrders = await this.storage.getAllOrders();

      let emailsSent = 0;

      for (const order of allOrders) {
        // Skip if order is cancelled/refunded
        if (order.status === "cancelled" || order.status === "refunded") {
          continue;
        }

        // Get order items
        const orderItems = await this.storage.getOrderItems(order.id);

        for (const item of orderItems) {
          // Only check pre-order and made-to-order items
          if (item.productType !== "pre-order" && item.productType !== "made-to-order") {
            continue;
          }

          // Skip if reminder already sent for this item (per-item tracking)
          if (item.deliveryReminderSentAt) {
            continue;
          }

          let deliveryDate: Date | null = null;

          // Calculate delivery date based on product type
          if (item.productType === "pre-order" && item.preOrderDate) {
            deliveryDate = new Date(item.preOrderDate);
          } else if (item.productType === "made-to-order" && item.madeToOrderLeadTime) {
            deliveryDate = new Date(order.createdAt);
            deliveryDate.setDate(deliveryDate.getDate() + item.madeToOrderLeadTime);
          }

          if (!deliveryDate) {
            continue;
          }

          // Check if delivery date is 7 days from now
          if (deliveryDate >= targetDate && deliveryDate <= targetDateEnd) {
            // Get seller info
            const seller = await this.storage.getUser(order.sellerId);
            if (!seller || !seller.email) {
              logger.warn(`[DeliveryReminder] Seller ${order.sellerId} not found or has no email`);
              continue;
            }

            // Send reminder email
            await this.sendReminderEmail(seller, order, item, deliveryDate);

            // Mark reminder as sent for this item (per-item tracking prevents duplicates)
            await this.storage.updateOrderItem(item.id, {
              deliveryReminderSentAt: new Date(),
            });

            emailsSent++;
            logger.info(`[DeliveryReminder] Sent reminder to ${seller.email} for order ${order.id}, item ${item.id}`);
          }
        }
      }

      logger.debug(`[DeliveryReminder] Reminder cycle complete. Sent ${emailsSent} emails`);
    } catch (error) {
      logger.error("[DeliveryReminder] Error during reminder cycle:", error);
    }
  }

  /**
   * Generate a secure magic link token for seller authentication
   * Token includes timestamp for expiry validation (7-day lifetime)
   */
  private generateMagicToken(sellerId: string, orderId: string): string {
    // SESSION_SECRET is validated at the start of checkAndSendReminders
    const secret = process.env.SESSION_SECRET!;
    const payload = `${sellerId}:${orderId}:${Date.now()}`;
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const token = Buffer.from(`${payload}:${signature}`).toString("base64url");
    return token;
  }

  /**
   * Send reminder email to seller
   */
  private async sendReminderEmail(
    seller: any,
    order: any,
    item: any,
    deliveryDate: Date
  ): Promise<void> {
    const storeName = seller.storeName || seller.firstName || seller.username || "Your Store";

    // Generate magic link
    const magicToken = this.generateMagicToken(seller.id, order.id);
    const magicLink = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/magic-link/order?token=${magicToken}`;

    // Format delivery date
    const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Calculate days remaining
    const daysRemaining = Math.ceil((deliveryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Format order total
    const orderTotal = parseFloat(order.total || "0");
    const depositPaid = parseFloat(order.depositPaid || "0");
    const balanceDue = orderTotal - depositPaid;

    // Customer info
    const customerName = order.shippingName || order.customerEmail || "Customer";
    const customerEmail = order.customerEmail || "";

    // Product info
    const productName = item.productName || "Product";
    const quantity = item.quantity || 1;
    const productType = item.productType === "pre-order" ? "Pre-Order" : "Made-to-Order";

    // Build email HTML
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px;" align="center">
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Delivery Reminder: ${daysRemaining} Days Remaining</h1>
              
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">Hi ${storeName},</p>
              
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">The delivery date you indicated to your buyer for order <strong>#${order.id.substring(0, 8).toUpperCase()}</strong> is approaching in <strong>${daysRemaining} days</strong>.</p>
              
              <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;"><strong>Expected Delivery Date:</strong></p>
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">${formattedDeliveryDate}</p>
              </div>
              
              <h2 style="margin: 30px 0 15px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Order Details</h2>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Product</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #1a1a1a; font-weight: 500;">${productName} (${productType})</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Quantity</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #1a1a1a;">${quantity}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Order Total</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #1a1a1a;">$${orderTotal.toFixed(2)}</span>
                  </td>
                </tr>
                ${depositPaid > 0 ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Deposit Paid</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #10b981;">$${depositPaid.toFixed(2)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Balance Due</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; font-weight: 600; color: #dc2626;">$${balanceDue.toFixed(2)}</span>
                  </td>
                </tr>
                ` : ''}
              </table>
              
              <h2 style="margin: 30px 0 15px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Customer Information</h2>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Name</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #1a1a1a;">${customerName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Email</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #1a1a1a;">${customerEmail}</span>
                  </td>
                </tr>
              </table>
              
              ${balanceDue > 0 ? `
              <div style="margin: 30px 0; padding: 15px; background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>⚠️ Action Required:</strong> This order has an outstanding balance of $${balanceDue.toFixed(2)}. Please send a balance payment request before the delivery date.
                </p>
              </div>
              ` : ''}
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${magicLink}" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">View Order & Take Action</a>
              </div>
              
              <p style="margin: 25px 0 0 0; font-size: 14px; color: #666;">From your order page, you can:</p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #666;">
                <li style="margin-bottom: 8px;">Send a balance payment request (if not yet paid)</li>
                <li style="margin-bottom: 8px;">Update the delivery date if needed</li>
                <li style="margin-bottom: 8px;">Update order status and tracking</li>
                <li>Contact your customer</li>
              </ul>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e5e7eb; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Upfirst</p>
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">Sell the moment. Not weeks later.</p>
                    <p style="margin: 0; font-size: 12px; color: #999;">
                      This is an automated reminder from Upfirst. You're receiving this because you have an upcoming delivery.
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
</body>
</html>`;

    await this.emailProvider.sendEmail({
      to: seller.email,
      from: `Upfirst <${process.env.RESEND_FROM_EMAIL}>`,
      replyTo: "support@upfirst.io",
      subject: `⏰ Delivery Reminder: ${daysRemaining} Days Until ${productType} Delivery`,
      html: htmlContent,
    });
  }
}
