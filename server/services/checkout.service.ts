import { IStorage } from '../storage';
import { IPaymentProvider } from './payment/payment-provider.interface';
import { CreateFlowService } from './workflows/create-flow.service';
import type { WorkflowContext, WorkflowError } from './workflows/types';
import type { WorkflowState } from '@shared/schema';
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
  billingAddress?: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  customerEmail: string;
  customerName: string;
  checkoutSessionId?: string;
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
  retryable?: boolean;
  step?: string;
  state?: WorkflowState;
  details?: any;
}

export class CheckoutService {
  constructor(
    private storage: IStorage,
    private paymentProvider: IPaymentProvider,
    private createFlowService: CreateFlowService
  ) {}

  /**
   * Initiate checkout - Idempotent workflow orchestration for order creation
   * 
   * **Idempotency Contract:**
   * - If `checkoutSessionId` is provided and a workflow exists:
   *   - Completed workflows: Returns existing result (no duplicate orders/payments)
   *   - Failed workflows: Returns error with details for retry/resume
   *   - Running workflows: Returns existing workflow state
   * - If no `checkoutSessionId` provided: Generates new session and creates workflow
   * 
   * **Architecture:**
   * This service acts as a thin adapter that converts API interface to workflow context
   * and delegates all business logic to CreateFlowService workflow orchestrator.
   * 
   * **The workflow handles:**
   * - Cart validation
   * - Seller verification
   * - Shipping calculation
   * - Pricing calculation
   * - Inventory reservation
   * - Payment intent creation
   * - Order creation
   * - Notifications
   * - Saga-based compensation on errors
   * 
   * @param params - Checkout parameters including items, shipping, and optional sessionId
   * @returns Result containing clientSecret, paymentIntentId, and checkoutSessionId
   * 
   * @example
   * // First request - creates new workflow
   * const result1 = await checkoutService.initiateCheckout({
   *   items: [...],
   *   shippingAddress: {...},
   *   customerEmail: 'buyer@example.com',
   *   customerName: 'John Doe'
   * });
   * // result1.checkoutSessionId = "checkout_123456_abc"
   * 
   * // Retry with same sessionId - returns existing result (idempotent)
   * const result2 = await checkoutService.initiateCheckout({
   *   items: [...],
   *   shippingAddress: {...},
   *   customerEmail: 'buyer@example.com',
   *   customerName: 'John Doe',
   *   checkoutSessionId: result1.checkoutSessionId
   * });
   * // result2 === result1 (same payment intent, no duplicate order)
   */
  async initiateCheckout(params: CheckoutInitiateParams): Promise<CheckoutInitiateResult> {
    // Use provided sessionId or generate new one
    const checkoutSessionId = params.checkoutSessionId || 
      `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // IDEMPOTENCY CHECK: Look for existing workflow with this session ID
      const existingWorkflow = await this.storage.getWorkflowByCheckoutSession(checkoutSessionId);
      
      if (existingWorkflow) {
        logger.info(`[Checkout] Found existing workflow for session ${checkoutSessionId}`, {
          status: existingWorkflow.status,
          currentState: existingWorkflow.currentState,
          orderId: existingWorkflow.orderId ?? undefined,
        });

        // Handle completed workflows - return existing result (idempotent)
        if (existingWorkflow.status === 'completed' && existingWorkflow.data) {
          const finalContext = existingWorkflow.data as WorkflowContext;
          const clientSecret = (finalContext as any).clientSecret;
          
          if (!finalContext.paymentIntentId || !clientSecret) {
            logger.error(`[Checkout] Completed workflow missing required data for session ${checkoutSessionId}`);
            return {
              success: false,
              error: 'Completed workflow missing payment data',
              errorCode: 'INCOMPLETE_WORKFLOW_DATA',
              checkoutSessionId,
            };
          }

          logger.info(`[Checkout] Returning existing result for completed workflow ${checkoutSessionId}`);
          return {
            success: true,
            clientSecret,
            paymentIntentId: finalContext.paymentIntentId,
            checkoutSessionId,
            amountToCharge: finalContext.totalAmount || 0,
            currency: (finalContext as any).currency || 'USD',
          };
        }

        // Handle failed workflows - return error with resume instructions
        if (existingWorkflow.status === 'failed') {
          logger.warn(`[Checkout] Workflow failed for session ${checkoutSessionId}`, {
            error: existingWorkflow.error ?? undefined,
            errorCode: existingWorkflow.errorCode ?? undefined,
            currentState: existingWorkflow.currentState,
          });

          return {
            success: false,
            error: existingWorkflow.error || 'Workflow failed',
            errorCode: existingWorkflow.errorCode || 'WORKFLOW_FAILED',
            retryable: true,
            state: existingWorkflow.currentState,
            checkoutSessionId,
            details: {
              message: 'Previous workflow failed. To retry, use a new checkoutSessionId or contact support.',
              failedAt: existingWorkflow.updatedAt,
              retryCount: existingWorkflow.retryCount,
            },
          };
        }

        // Handle active/running workflows - return current state
        if (existingWorkflow.status === 'active') {
          logger.info(`[Checkout] Workflow still active for session ${checkoutSessionId}`);
          return {
            success: false,
            error: 'Workflow already in progress',
            errorCode: 'WORKFLOW_IN_PROGRESS',
            retryable: false,
            state: existingWorkflow.currentState,
            checkoutSessionId,
            details: {
              message: 'Workflow is currently running. Please wait or check status using GET /api/checkout/session/:sessionId',
              startedAt: existingWorkflow.createdAt,
            },
          };
        }
      }

      // No existing workflow or workflow cancelled - create new workflow
      logger.info(`[Checkout] Creating new workflow for session ${checkoutSessionId}`);

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
        billingAddress: params.billingAddress,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
      };

      // Delegate to CreateFlowService workflow orchestrator
      const workflowResult = await this.createFlowService.run(
        checkoutSessionId,
        initialContext,
        { emitEvents: true } // Enable WebSocket progress events for real-time UI updates
      );

      if (!workflowResult.success) {
        const workflowError = workflowResult.error;
        logger.warn(`[Checkout] Workflow failed for session ${checkoutSessionId}:`, {
          message: workflowError?.message,
          code: workflowError?.code,
          step: workflowError?.step,
          state: workflowError?.state,
        });
        
        return {
          success: false,
          error: workflowError?.message || 'Checkout failed',
          errorCode: workflowError?.code || 'WORKFLOW_FAILED',
          retryable: workflowError?.retryable ?? false,
          step: workflowError?.step,
          state: workflowError?.state,
          checkoutSessionId,
          details: workflowError?.details,
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
          checkoutSessionId,
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
          checkoutSessionId,
        };
      }

      const clientSecret = (finalContext as any).clientSecret;
      if (!clientSecret) {
        logger.error(`[Checkout] Workflow did not produce client secret for session ${checkoutSessionId}`);
        return {
          success: false,
          error: 'Workflow did not produce client secret',
          errorCode: 'MISSING_CLIENT_SECRET',
          checkoutSessionId,
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
        checkoutSessionId,
      };
    }
  }

}
