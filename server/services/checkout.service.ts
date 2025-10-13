import { IStorage } from '../storage';
import { IPaymentProvider } from './payment/payment-provider.interface';
import { CreateFlowService } from './workflows/create-flow.service';
import type { WorkflowContext } from './workflows/types';
import { logger } from '../logger';

export interface CheckoutInitiateParams {
  items: Array<{
    productId: string;
    quantity: number;
    variant?: {
      size?: string;
      color?: string;
    };
  }>;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  customerEmail: string;
  customerName: string;
}

export interface CheckoutInitiateResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  checkoutSessionId?: string;
  amountToCharge?: number;
  currency?: string;
  error?: string;
  errorCode?: string;
}

export class CheckoutService {
  constructor(
    private storage: IStorage,
    private paymentProvider: IPaymentProvider,
    private createFlowService: CreateFlowService
  ) {}

  /**
   * Initiate checkout - Delegates to CreateFlowService workflow orchestrator
   * 
   * Architecture 3 (Service Layer): Thin adapter that converts API interface
   * to workflow context and delegates all business logic to CreateFlowService.
   * 
   * The workflow handles:
   * - Cart validation
   * - Seller verification
   * - Shipping calculation
   * - Pricing calculation
   * - Inventory reservation
   * - Payment intent creation
   * - Order creation
   * - Notifications
   * - Saga-based compensation on errors
   */
  async initiateCheckout(params: CheckoutInitiateParams): Promise<CheckoutInitiateResult> {
    const checkoutSessionId = `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Build initial workflow context from params
      const initialContext: WorkflowContext = {
        checkoutSessionId,
        items: params.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          variantId: item.variant
            ? `${item.variant.size || ''}-${item.variant.color || ''}`.replace(/^-|-$/g, '')
            : undefined,
        })),
        shippingAddress: params.shippingAddress,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
      };

      // Delegate to CreateFlowService workflow orchestrator
      logger.info(`[Checkout] Initiating workflow for session ${checkoutSessionId}`);
      
      const workflowResult = await this.createFlowService.run(
        checkoutSessionId,
        initialContext,
        { emitEvents: true } // Enable WebSocket progress events for real-time UI updates
      );

      if (!workflowResult.success) {
        logger.warn(`[Checkout] Workflow failed for session ${checkoutSessionId}: ${workflowResult.error || 'Unknown error'}`);
        return {
          success: false,
          error: workflowResult.error || 'Checkout failed',
          errorCode: 'WORKFLOW_FAILED',
        };
      }

      // Fetch workflow record to extract final context with all accumulated data
      const workflow = await this.storage.getWorkflowByCheckoutSession(checkoutSessionId);
      if (!workflow || !workflow.data) {
        logger.error(`[Checkout] Workflow context missing for session ${checkoutSessionId}`);
        return {
          success: false,
          error: 'Failed to retrieve checkout context',
          errorCode: 'WORKFLOW_CONTEXT_MISSING',
        };
      }

      const finalContext = workflow.data as WorkflowContext;
      
      // Validate required fields are present
      if (!finalContext.paymentIntentId) {
        logger.error(`[Checkout] Workflow did not produce payment intent ID for session ${checkoutSessionId}`);
        return {
          success: false,
          error: 'Workflow did not produce payment intent',
          errorCode: 'MISSING_PAYMENT_INTENT',
        };
      }

      const clientSecret = (finalContext as any).clientSecret;
      if (!clientSecret) {
        logger.error(`[Checkout] Workflow did not produce client secret for session ${checkoutSessionId}`);
        return {
          success: false,
          error: 'Workflow did not produce client secret',
          errorCode: 'MISSING_CLIENT_SECRET',
        };
      }
      
      logger.info(`[Checkout] Workflow completed successfully for session ${checkoutSessionId}`, {
        orderId: workflowResult.orderId,
        paymentIntentId: finalContext.paymentIntentId,
      });

      // Map workflow context to CheckoutInitiateResult
      return {
        success: true,
        clientSecret,
        paymentIntentId: finalContext.paymentIntentId,
        checkoutSessionId,
        amountToCharge: finalContext.totalAmount || 0,
        currency: (finalContext as any).currency || 'USD',
      };

    } catch (error) {
      logger.error('[Checkout] Workflow execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate checkout',
        errorCode: 'CHECKOUT_FAILED',
      };
    }
  }

}
