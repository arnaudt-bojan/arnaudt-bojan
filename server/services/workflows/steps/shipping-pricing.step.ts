/**
 * Shipping Pricing Step
 * Calculates shipping cost using ShippingService
 */

import type { WorkflowStep, WorkflowContext, WorkflowStepResult } from '../types';
import type { ShippingService } from '../../shipping.service';

export class ShippingPricingStep implements WorkflowStep {
  readonly name = 'ShippingPricing';

  constructor(
    readonly fromState: string,
    readonly toState: string,
    private shippingService: ShippingService
  ) {}

  async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
    try {
      const items = context.items || [];
      const shippingAddress = context.shippingAddress;

      if (!shippingAddress) {
        return {
          success: false,
          error: {
            message: 'Shipping address not provided',
            code: 'MISSING_SHIPPING_ADDRESS',
            retryable: false,
          },
        };
      }

      // Delegate to ShippingService for calculation
      const shippingCalculation = await this.shippingService.calculateShipping(
        items,
        {
          country: shippingAddress.country,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
        }
      );

      // Update context with shipping cost
      return {
        success: true,
        nextState: this.toState,
        data: {
          shippingCost: shippingCalculation.cost,
          metadata: {
            ...context.metadata,
            shippingMethod: shippingCalculation.method,
            shippingZone: shippingCalculation.zone,
            shippingDetails: shippingCalculation.details,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'Shipping calculation failed',
          code: 'SHIPPING_CALCULATION_ERROR',
          retryable: true,
        },
      };
    }
  }

  async compensate(context: WorkflowContext): Promise<void> {
    // No compensation needed for shipping calculation (read-only operation)
  }
}
