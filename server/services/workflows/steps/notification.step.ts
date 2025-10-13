/**
 * Notification Step
 * Sends order confirmation emails to buyer and seller
 */

import type { WorkflowStep, WorkflowContext, WorkflowStepResult } from '../types';
import type { NotificationService } from '../../../notifications';
import type { IStorage } from '../../../storage';
import { logger } from '../../../logger';

export class NotificationStep implements WorkflowStep {
  readonly name = 'Notification';

  constructor(
    readonly fromState: string,
    readonly toState: string,
    private notificationService: NotificationService,
    private storage: IStorage
  ) {}

  async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
    try {
      const orderId = context.orderId;
      const sellerId = context.sellerId;

      if (!orderId || !sellerId) {
        return {
          success: false,
          error: {
            message: 'Missing order ID or seller ID',
            code: 'MISSING_NOTIFICATION_CONTEXT',
            retryable: false,
          },
        };
      }

      // Get order details
      const order = await this.storage.getOrder(orderId);
      if (!order) {
        return {
          success: false,
          error: {
            message: 'Order not found',
            code: 'ORDER_NOT_FOUND',
            retryable: false,
          },
        };
      }

      // Get seller details
      const seller = await this.storage.getUser(sellerId);
      if (!seller) {
        return {
          success: false,
          error: {
            message: 'Seller not found',
            code: 'SELLER_NOT_FOUND',
            retryable: false,
          },
        };
      }

      // Get product details for the order
      const orderItems = JSON.parse(order.items || '[]');
      const products = await Promise.all(
        orderItems.map((item: any) => this.storage.getProduct(item.productId))
      );
      const validProducts = products.filter(p => p !== null);

      // Send order confirmation to buyer
      try {
        await this.notificationService.sendOrderConfirmation(order, seller, validProducts);
        logger.info(`[Notification] Sent order confirmation to buyer for order ${orderId}`);
      } catch (error: any) {
        logger.error(`[Notification] Failed to send buyer confirmation:`, error);
        // Don't fail workflow for notification errors, just log them
      }

      // Send order notification to seller
      try {
        await this.notificationService.sendSellerOrderNotification(order, seller, validProducts);
        logger.info(`[Notification] Sent order notification to seller for order ${orderId}`);
      } catch (error: any) {
        logger.error(`[Notification] Failed to send seller notification:`, error);
        // Don't fail workflow for notification errors, just log them
      }

      // Notifications sent (or attempted)
      return {
        success: true,
        nextState: this.toState,
        data: {
          metadata: {
            ...context.metadata,
            notificationsSent: true,
          },
        },
      };
    } catch (error: any) {
      // Log error but don't fail workflow
      logger.error(`[Notification] Notification step error:`, error);
      
      // Still succeed - notifications are not critical for workflow completion
      return {
        success: true,
        nextState: this.toState,
        data: {
          metadata: {
            ...context.metadata,
            notificationsSent: false,
            notificationError: error.message,
          },
        },
      };
    }
  }

  async compensate(context: WorkflowContext): Promise<void> {
    // Cannot "unsend" emails - no compensation possible
    logger.info('[Notification] Compensation requested but notifications cannot be reversed');
  }
}
