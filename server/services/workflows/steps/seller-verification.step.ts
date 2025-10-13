/**
 * Seller Verification Step
 * Verifies seller exists and has payment processing enabled
 */

import type { WorkflowStep, WorkflowContext, WorkflowStepResult } from '../types';
import type { IStorage } from '../../../storage';

export class SellerVerificationStep implements WorkflowStep {
  readonly name = 'SellerVerification';

  constructor(
    readonly fromState: string,
    readonly toState: string,
    private storage: IStorage
  ) {}

  async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
    try {
      if (!context.sellerId) {
        return {
          success: false,
          error: {
            message: 'Seller ID not found in context',
            code: 'MISSING_SELLER_ID',
            retryable: false,
          },
        };
      }

      // Get seller from database
      const seller = await this.storage.getUser(context.sellerId);

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

      // Verify seller has Stripe account
      if (!seller.stripeConnectedAccountId) {
        return {
          success: false,
          error: {
            message: 'Seller has not set up payments',
            code: 'NO_STRIPE_ACCOUNT',
            retryable: false,
          },
        };
      }

      // Verify charges are enabled
      if (!seller.stripeChargesEnabled) {
        return {
          success: false,
          error: {
            message: 'Seller payment processing not enabled',
            code: 'CHARGES_NOT_ENABLED',
            retryable: false,
          },
        };
      }

      // Success - seller verified
      return {
        success: true,
        nextState: this.toState,
        data: {
          metadata: {
            ...context.metadata,
            sellerVerified: true,
            sellerCurrency: seller.listingCurrency || 'USD',
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'Seller verification failed',
          code: 'SELLER_VERIFICATION_ERROR',
          retryable: true,
        },
      };
    }
  }

  async compensate(context: WorkflowContext): Promise<void> {
    // No compensation needed for seller verification (read-only operation)
  }
}
