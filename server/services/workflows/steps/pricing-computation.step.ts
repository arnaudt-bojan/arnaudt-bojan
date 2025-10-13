/**
 * Pricing Computation Step
 * Calculates complete pricing including subtotal, shipping, tax, and total
 */

import type { WorkflowStep, WorkflowContext, WorkflowStepResult } from '../types';
import type { PricingCalculationService } from '../../pricing-calculation.service';

export class PricingComputationStep implements WorkflowStep {
  readonly name = 'PricingComputation';

  constructor(
    readonly fromState: string,
    readonly toState: string,
    private pricingService: PricingCalculationService
  ) {}

  async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
    try {
      if (!context.sellerId || !context.items || !context.shippingAddress) {
        return {
          success: false,
          error: {
            message: 'Missing required context for pricing calculation',
            code: 'MISSING_PRICING_CONTEXT',
            retryable: false,
          },
        };
      }

      // Delegate to PricingCalculationService for complete pricing
      const pricing = await this.pricingService.calculateCartPricing({
        sellerId: context.sellerId,
        items: context.items,
        destination: context.shippingAddress,
      });

      // Update context with all pricing details
      return {
        success: true,
        nextState: this.toState,
        data: {
          subtotal: pricing.subtotal,
          shippingCost: pricing.shippingCost,
          taxAmount: pricing.taxAmount,
          totalAmount: pricing.total,
          metadata: {
            ...context.metadata,
            currency: pricing.currency,
            taxCalculationId: pricing.taxCalculationId,
            pricingBreakdown: pricing,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'Pricing calculation failed',
          code: 'PRICING_CALCULATION_ERROR',
          retryable: true,
        },
      };
    }
  }

  async compensate(context: WorkflowContext): Promise<void> {
    // No compensation needed for pricing calculation (read-only operation)
  }
}
