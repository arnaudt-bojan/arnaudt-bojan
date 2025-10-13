/**
 * Order Creation Step
 * Note: Order is already created by PaymentService, this step just validates it exists
 */

import type { WorkflowStep, WorkflowContext, WorkflowStepResult } from '../types';
import type { OrderService } from '../../order.service';
import type { IStorage } from '../../../storage';

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
    // Order deletion handled by PaymentService.cancelPayment()
    // No additional compensation needed here
  }
}
