/**
 * Payment Confirmation Step
 * Waits for and confirms payment (typically happens via webhook)
 * This step may be skipped in favor of webhook-driven confirmation
 */

import type { WorkflowStep, WorkflowContext, WorkflowStepResult } from '../types';
import type { IStorage } from '../../../storage';

export class PaymentConfirmationStep implements WorkflowStep {
  readonly name = 'PaymentConfirmation';

  constructor(
    readonly fromState: string,
    readonly toState: string,
    private storage: IStorage
  ) {}

  async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
    try {
      const paymentIntentId = context.paymentIntentId;

      if (!paymentIntentId) {
        return {
          success: false,
          error: {
            message: 'Payment intent ID not found in context',
            code: 'MISSING_PAYMENT_INTENT_ID',
            retryable: false,
          },
        };
      }

      // Check payment intent status
      const paymentIntent = await this.storage.getPaymentIntent(paymentIntentId);

      if (!paymentIntent) {
        return {
          success: false,
          error: {
            message: 'Payment intent not found',
            code: 'PAYMENT_INTENT_NOT_FOUND',
            retryable: false,
          },
        };
      }

      // Check if payment is confirmed
      const isConfirmed = paymentIntent.status === 'succeeded';

      if (!isConfirmed) {
        // Payment not confirmed yet - this is retryable
        return {
          success: false,
          error: {
            message: `Payment not confirmed yet (status: ${paymentIntent.status})`,
            code: 'PAYMENT_NOT_CONFIRMED',
            retryable: true, // Will retry until payment is confirmed
          },
        };
      }

      // Payment confirmed
      return {
        success: true,
        nextState: this.toState,
        data: {
          metadata: {
            ...context.metadata,
            paymentConfirmed: true,
            paymentStatus: paymentIntent.status,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'Payment confirmation failed',
          code: 'PAYMENT_CONFIRMATION_ERROR',
          retryable: true,
        },
      };
    }
  }

  async compensate(context: WorkflowContext): Promise<void> {
    // Payment confirmation is handled by webhooks
    // Compensation happens via payment cancellation in earlier steps
  }
}
