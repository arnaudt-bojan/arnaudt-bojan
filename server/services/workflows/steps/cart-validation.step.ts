/**
 * Cart Validation Step
 * Validates cart items against database and calculates initial totals
 */

import type { WorkflowStep, WorkflowContext, WorkflowStepResult } from '../types';
import type { CartValidationService } from '../../cart-validation.service';

export class CartValidationStep implements WorkflowStep {
  readonly name = 'CartValidation';

  constructor(
    readonly fromState: string,
    readonly toState: string,
    private cartValidationService: CartValidationService
  ) {}

  async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
    try {
      // Delegate to CartValidationService for server-side validation
      const validation = await this.cartValidationService.validateCart(
        context.items || []
      );

      if (!validation.valid || validation.errors.length > 0) {
        return {
          success: false,
          error: {
            message: validation.errors.join('; '),
            code: 'CART_VALIDATION_FAILED',
            retryable: false,
          },
        };
      }

      // Update context with validated items and sellerId
      return {
        success: true,
        nextState: this.toState,
        data: {
          cartId: context.checkoutSessionId, // Use session ID as cart ID
          sellerId: validation.sellerId || undefined,
          subtotal: validation.total,
          metadata: {
            ...context.metadata,
            validatedItems: validation.items,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'Cart validation failed',
          code: 'CART_VALIDATION_ERROR',
          retryable: false,
        },
      };
    }
  }

  async compensate(context: WorkflowContext): Promise<void> {
    // No compensation needed for cart validation (read-only operation)
  }
}
