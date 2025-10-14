import { logger } from '../logger';
import { NotificationService } from '../notifications';
import { IStorage } from '../storage';

export class WholesaleBalanceReminderJob {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 24 * 60 * 60 * 1000; // Run every 24 hours
  private readonly REMINDER_DAYS_BEFORE = 3; // Send reminder 3 days before due date

  constructor(
    private storage: IStorage,
    private notificationService: NotificationService
  ) {}

  start() {
    logger.info('[WholesaleBalanceReminder] Starting background reminder job', {
      intervalHours: this.INTERVAL_MS / (60 * 60 * 1000),
      reminderDaysBefore: this.REMINDER_DAYS_BEFORE,
    });

    // Run immediately on start
    this.runReminders();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.runReminders();
    }, this.INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[WholesaleBalanceReminder] Stopped background reminder job');
    }
  }

  private async runReminders() {
    try {
      logger.debug('[WholesaleBalanceReminder] Starting reminder cycle');

      // Calculate date 3 days from now
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + this.REMINDER_DAYS_BEFORE);

      // Get orders with balance due soon
      const orders = await this.storage.getOrdersWithBalanceDueSoon(threeDaysFromNow);

      if (orders.length === 0) {
        logger.debug('[WholesaleBalanceReminder] No orders found requiring balance payment reminders');
        return;
      }

      logger.info('[WholesaleBalanceReminder] Found orders requiring reminders', {
        count: orders.length,
      });

      let successCount = 0;
      let failureCount = 0;

      // Send reminder emails for each order
      for (const order of orders) {
        try {
          const seller = await this.storage.getUser(order.sellerId);
          
          if (!seller) {
            logger.warn('[WholesaleBalanceReminder] Seller not found for order', {
              orderId: order.id,
              sellerId: order.sellerId,
            });
            failureCount++;
            continue;
          }

          const paymentLink = `${process.env.BASE_URL || 'http://localhost:5000'}/wholesale/orders/${order.id}/pay-balance`;

          await this.notificationService.sendWholesaleBalanceReminder(
            order,
            seller,
            paymentLink
          );

          successCount++;
          logger.debug('[WholesaleBalanceReminder] Reminder sent successfully', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            buyerEmail: order.buyerEmail,
          });
        } catch (emailError: any) {
          failureCount++;
          logger.error('[WholesaleBalanceReminder] Failed to send reminder for order', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            error: emailError.message,
          });
        }
      }

      logger.info('[WholesaleBalanceReminder] Reminder cycle completed', {
        totalOrders: orders.length,
        successCount,
        failureCount,
      });
    } catch (error: any) {
      logger.error('[WholesaleBalanceReminder] Error during reminder cycle', error);
      // Don't throw - let the job continue running
    }
  }
}
