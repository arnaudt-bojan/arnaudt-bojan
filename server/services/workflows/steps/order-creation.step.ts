/**
 * Order Creation Step
 * Note: Order is already created by PaymentService, this step just validates it exists
 */

import type { WorkflowStep, WorkflowContext, WorkflowStepResult } from '../types';
import type { OrderService } from '../../order.service';
import type { IStorage } from '../../../storage';
import { logger } from '../../../logger';

export class OrderCreationStep implements WorkflowStep {
  readonly name = 'OrderCreation';

  constructor(
    readonly fromState: string,
    readonly toState: string,
    private orderService: OrderService,
    private storage: IStorage
  ) {}

  async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
    try {
      const orderId = context.orderId;

      if (!orderId) {
        return {
          success: false,
          error: {
            message: 'Order ID not found in context',
            code: 'MISSING_ORDER_ID',
            retryable: false,
          },
        };
      }

      // Verify order exists (created by PaymentService in previous step)
      const order = await this.storage.getOrder(orderId);

      if (!order) {
        return {
          success: false,
          error: {
            message: 'Order not found after creation',
            code: 'ORDER_NOT_FOUND',
            retryable: false,
          },
        };
      }

      // Order exists and is valid
      return {
        success: true,
        nextState: this.toState,
        data: {
          metadata: {
            ...context.metadata,
            orderCreated: true,
            orderStatus: order.status,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'Order verification failed',
          code: 'ORDER_VERIFICATION_ERROR',
          retryable: true,
        },
      };
    }
  }

  async compensate(context: WorkflowContext): Promise<void> {
    const orderId = context.orderId;

    if (!orderId) {
      logger.info('[OrderCreation] No order to delete');
      return;
    }

    logger.info(`[OrderCreation] Compensating - deleting order ${orderId}`);

    try {
      // Explicitly delete the order to prevent orphaned records
      await this.storage.deleteOrder(orderId);
      
      logger.info(`[OrderCreation] Successfully deleted order ${orderId}`);
    } catch (error) {
      logger.error(`[OrderCreation] Failed to delete order during compensation:`, error);
      // Don't throw - compensation must be best-effort
    }
  }
}
