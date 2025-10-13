/**
 * Payment Intent Creation Step
 * Creates Stripe payment intent (with compensation support)
 */

import type { WorkflowStep, WorkflowContext, WorkflowStepResult } from '../types';
import type { PaymentService } from '../../payment/payment.service';
import type { IStorage } from '../../../storage';
import { logger } from '../../../logger';

export class PaymentIntentCreationStep implements WorkflowStep {
  readonly name = 'PaymentIntentCreation';

  constructor(
    readonly fromState: string,
    readonly toState: string,
    private paymentService: PaymentService,
    private storage: IStorage
  ) {}

  async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
    try {
      const {
        totalAmount,
        items,
        sellerId,
        checkoutSessionId,
        shippingAddress,
        customerEmail,
        customerName,
      } = context;

      if (!totalAmount || !items || !sellerId || !checkoutSessionId) {
        return {
          success: false,
          error: {
            message: 'Missing required context for payment intent creation',
            code: 'MISSING_PAYMENT_CONTEXT',
            retryable: false,
          },
        };
      }

      const currency = context.metadata?.currency || 'USD';

      // Create payment intent using PaymentService
      // Note: This creates a provisional order internally
      const result = await this.paymentService.createPaymentIntent({
        amount: totalAmount,
        currency,
        items: items.map(item => ({
          id: item.productId,
          productId: item.productId,
          quantity: item.quantity,
          variantId: item.variantId,
        })),
        orderData: {
          userId: context.userId || 'guest',
          customerName: customerName || 'Guest',
          customerEmail: customerEmail || '',
          customerAddress: JSON.stringify(shippingAddress || {}),
          items: JSON.stringify(items || []),
          subtotalBeforeTax: (context.subtotal || 0).toFixed(2),
          shippingCost: (context.shippingCost || 0).toFixed(2),
          taxAmount: (context.taxAmount || 0).toFixed(2),
          total: totalAmount.toFixed(2),
          amountPaid: '0.00',
          status: 'pending',
          paymentStatus: 'pending',
          currency,
        },
        checkoutSessionId,
        paymentType: 'full',
        shippingAddress: shippingAddress ? {
          name: customerName || 'Guest',
          line1: shippingAddress.line1,
          line2: shippingAddress.line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postalCode,
          country: shippingAddress.country,
        } : undefined,
      });

      // Update context with payment intent details and order ID
      return {
        success: true,
        nextState: this.toState,
        data: {
          paymentIntentId: result.paymentIntentId,
          orderId: result.orderId, // Order created by PaymentService
          metadata: {
            ...context.metadata,
            clientSecret: result.clientSecret,
            requiresAction: result.requiresAction,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'Payment intent creation failed',
          code: 'PAYMENT_INTENT_ERROR',
          retryable: true,
        },
      };
    }
  }

  async compensate(context: WorkflowContext): Promise<void> {
    // Cancel payment intent if it was created
    const paymentIntentId = context.paymentIntentId;

    if (paymentIntentId) {
      logger.info(`[PaymentIntentCreation] Compensating - canceling payment intent ${paymentIntentId}`);
      
      try {
        await this.paymentService.cancelPayment(paymentIntentId);
      } catch (error) {
        logger.error(`[PaymentIntentCreation] Failed to cancel payment intent:`, error);
      }
    }
  }
}
