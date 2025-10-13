/**
 * CreateFlowService - Order Creation & Checkout Workflow Orchestrator
 * 
 * Architecture 3 (Service Layer Pattern): Thin orchestration layer that delegates
 * business logic to existing services while managing state machine progression,
 * compensation (Saga pattern), and progress emission.
 * 
 * State Machine Flow:
 * INIT → CART_VALIDATED → SELLER_VERIFIED → SHIPPING_PRICED → PRICING_COMPUTED 
 * → INVENTORY_RESERVED → PAYMENT_INTENT_CREATED → ORDER_CREATED 
 * → AWAITING_PAYMENT_CONFIRMATION → PAYMENT_CONFIRMED → INVENTORY_COMMITTED 
 * → NOTIFICATIONS_SENT → COMPLETED
 * 
 * Features:
 * - Persisted state machine with automatic resume
 * - Saga pattern compensation for rollbacks
 * - WebSocket progress events for real-time UI updates
 * - Full audit trail via OrderWorkflowEvent records
 * - Idempotent operations using checkout session IDs
 */

import type { IStorage } from '../../storage';
import type { OrderWorkflow } from '@shared/schema';
import { WorkflowExecutor } from './workflow-executor';
import type {
  WorkflowContext,
  WorkflowConfig,
  WorkflowExecutionOptions,
  WorkflowProgressEvent,
  WorkflowStepResult,
} from './types';
import { CartValidationService } from '../cart-validation.service';
import { ShippingService } from '../shipping.service';
import { PricingCalculationService } from '../pricing-calculation.service';
import { InventoryService } from '../inventory.service';
import { PaymentService } from '../payment/payment.service';
import { OrderService } from '../order.service';
import type { NotificationService } from '../../notifications';
import { orderWebSocketService } from '../../websocket';
import { logger } from '../../logger';

// Import workflow steps
import { CartValidationStep } from './steps/cart-validation.step';
import { SellerVerificationStep } from './steps/seller-verification.step';
import { ShippingPricingStep } from './steps/shipping-pricing.step';
import { PricingComputationStep } from './steps/pricing-computation.step';
import { InventoryReservationStep } from './steps/inventory-reservation.step';
import { PaymentIntentCreationStep } from './steps/payment-intent-creation.step';
import { OrderCreationStep } from './steps/order-creation.step';
import { PaymentConfirmationStep } from './steps/payment-confirmation.step';
import { InventoryCommitmentStep } from './steps/inventory-commitment.step';
import { NotificationStep } from './steps/notification.step';

/**
 * CreateFlowService - Main workflow orchestrator
 */
export class CreateFlowService extends WorkflowExecutor {
  // Ordered state progression for deterministic workflow execution
  private readonly stateProgression: string[] = [
    'INIT',
    'CART_VALIDATED',
    'SELLER_VERIFIED',
    'SHIPPING_PRICED',
    'PRICING_COMPUTED',
    'INVENTORY_RESERVED',
    'PAYMENT_INTENT_CREATED',
    'ORDER_CREATED',
    'AWAITING_PAYMENT_CONFIRMATION',
    'PAYMENT_CONFIRMED',
    'INVENTORY_COMMITTED',
    'NOTIFICATIONS_SENT',
    'COMPLETED',
  ];

  constructor(
    storage: IStorage,
    config: WorkflowConfig,
    private cartValidationService: CartValidationService,
    private shippingService: ShippingService,
    private pricingService: PricingCalculationService,
    private inventoryService: InventoryService,
    private paymentService: PaymentService,
    private orderService: OrderService,
    private notificationService: NotificationService
  ) {
    super(storage, config);

    // Register all workflow steps in deterministic order
    this.registerWorkflowSteps();
  }

  /**
   * Register all workflow steps with proper state transitions
   */
  private registerWorkflowSteps(): void {
    // INIT → CART_VALIDATED
    this.registerStep(
      new CartValidationStep(
        'INIT',
        'CART_VALIDATED',
        this.cartValidationService
      )
    );

    // CART_VALIDATED → SELLER_VERIFIED
    this.registerStep(
      new SellerVerificationStep(
        'CART_VALIDATED',
        'SELLER_VERIFIED',
        this.storage
      )
    );

    // SELLER_VERIFIED → SHIPPING_PRICED
    this.registerStep(
      new ShippingPricingStep(
        'SELLER_VERIFIED',
        'SHIPPING_PRICED',
        this.shippingService
      )
    );

    // SHIPPING_PRICED → PRICING_COMPUTED
    this.registerStep(
      new PricingComputationStep(
        'SHIPPING_PRICED',
        'PRICING_COMPUTED',
        this.pricingService
      )
    );

    // PRICING_COMPUTED → INVENTORY_RESERVED
    this.registerStep(
      new InventoryReservationStep(
        'PRICING_COMPUTED',
        'INVENTORY_RESERVED',
        this.inventoryService
      )
    );

    // INVENTORY_RESERVED → PAYMENT_INTENT_CREATED
    this.registerStep(
      new PaymentIntentCreationStep(
        'INVENTORY_RESERVED',
        'PAYMENT_INTENT_CREATED',
        this.paymentService,
        this.storage
      )
    );

    // PAYMENT_INTENT_CREATED → ORDER_CREATED
    this.registerStep(
      new OrderCreationStep(
        'PAYMENT_INTENT_CREATED',
        'ORDER_CREATED',
        this.orderService,
        this.storage
      )
    );

    // ORDER_CREATED → AWAITING_PAYMENT_CONFIRMATION
    // This is a no-op step that just transitions state
    this.registerStep({
      name: 'AwaitPaymentConfirmation',
      fromState: 'ORDER_CREATED',
      toState: 'AWAITING_PAYMENT_CONFIRMATION',
      execute: async (context) => ({
        success: true,
        nextState: 'AWAITING_PAYMENT_CONFIRMATION',
      }),
      compensate: async () => {}, // No compensation needed
    });

    // AWAITING_PAYMENT_CONFIRMATION → PAYMENT_CONFIRMED
    this.registerStep(
      new PaymentConfirmationStep(
        'AWAITING_PAYMENT_CONFIRMATION',
        'PAYMENT_CONFIRMED',
        this.storage
      )
    );

    // PAYMENT_CONFIRMED → INVENTORY_COMMITTED
    this.registerStep(
      new InventoryCommitmentStep(
        'PAYMENT_CONFIRMED',
        'INVENTORY_COMMITTED',
        this.inventoryService,
        this.storage
      )
    );

    // INVENTORY_COMMITTED → NOTIFICATIONS_SENT
    this.registerStep(
      new NotificationStep(
        'INVENTORY_COMMITTED',
        'NOTIFICATIONS_SENT',
        this.notificationService,
        this.storage
      )
    );

    // NOTIFICATIONS_SENT → COMPLETED
    // Final transition to completed state
    this.registerStep({
      name: 'CompleteWorkflow',
      fromState: 'NOTIFICATIONS_SENT',
      toState: 'COMPLETED',
      execute: async (context) => ({
        success: true,
        nextState: 'COMPLETED',
      }),
      compensate: async () => {}, // No compensation needed
    });
  }

  /**
   * Execute the complete workflow
   * 
   * @param checkoutSessionId - Unique checkout session identifier
   * @param initialContext - Initial workflow context
   * @param options - Execution options (emitEvents, skipCompensation, etc.)
   * @returns Workflow result with orderId if successful
   */
  async run(
    checkoutSessionId: string,
    initialContext: WorkflowContext,
    options: WorkflowExecutionOptions = {}
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    // Default options
    const execOptions = {
      emitEvents: true,
      skipCompensation: false,
      ...options,
    };

    // Reset compensation stack for new workflow execution
    this.resetCompensationStack();

    let workflow: OrderWorkflow | null = null;
    let currentContext = { ...initialContext };

    try {
      // Step 1: Load or create workflow record
      workflow = await this.loadOrCreateWorkflow(checkoutSessionId, currentContext);

      // FIX 2: Resume workflow with persisted context
      // CRITICAL: When resuming, use persisted context instead of initialContext
      // This ensures downstream steps have access to data from completed steps
      // (totals, reservationIds, paymentIntentId, orderId, etc.)
      if (workflow.data) {
        currentContext = { ...workflow.data as WorkflowContext };
        logger.info(`[CreateFlow] Using persisted context from workflow`, {
          workflowId: workflow.id,
          currentState: workflow.currentState,
          contextKeys: Object.keys(currentContext),
        });
      }

      // Emit workflow started event
      if (execOptions.emitEvents) {
        await this.emitProgress({
          workflowId: workflow.id,
          checkoutSessionId,
          currentState: workflow.currentState,
          status: 'active',
          message: 'Workflow started',
        });
      }

      // Create WORKFLOW_STARTED event
      await this.createEvent(workflow.id, 'WORKFLOW_STARTED', null, null, {
        checkoutSessionId,
        initialContext,
      });

      // Step 2: Execute state machine progression
      let currentState = workflow.currentState;
      const startIndex = this.stateProgression.indexOf(currentState);

      if (startIndex === -1) {
        throw new Error(`Invalid workflow state: ${currentState}`);
      }

      // Loop through remaining states
      for (let i = startIndex; i < this.stateProgression.length - 1; i++) {
        const fromState = this.stateProgression[i];
        const toState = this.stateProgression[i + 1];

        // Get step for this transition
        const step = this.getStep(fromState, toState);
        if (!step) {
          throw new Error(`No step found for transition ${fromState} → ${toState}`);
        }

        logger.info(`[CreateFlow] Executing step: ${step.name} (${fromState} → ${toState})`, {
          workflowId: workflow.id,
          checkoutSessionId,
          contextKeys: Object.keys(currentContext),
        });

        // Create STATE_TRANSITION event
        await this.createEvent(
          workflow.id,
          'STATE_TRANSITION',
          fromState as any,
          toState as any,
          { stepName: step.name }
        );

        // Execute step with retry logic and context merging
        // CRITICAL: executeStep merges result.data into currentContext via Object.assign
        const result = await this.executeStep(workflow, step, currentContext);

        if (!result.success) {
          // Step failed - trigger compensation if not skipped
          if (!execOptions.skipCompensation) {
            await this.compensate(currentContext);
          }

          // Create STEP_FAILED event
          await this.createEvent(
            workflow.id,
            'STEP_FAILED',
            fromState as any,
            toState as any,
            {
              stepName: step.name,
              error: result.error,
            }
          );

          // Update workflow to failed state
          await this.storage.updateWorkflowState(workflow.id, fromState as any, {
            status: 'failed',
            error: result.error?.message,
            errorCode: result.error?.code,
          });

          // Emit failure event
          if (execOptions.emitEvents) {
            await this.emitProgress({
              workflowId: workflow.id,
              checkoutSessionId,
              currentState: fromState,
              status: 'failure',
              error: {
                message: result.error?.message || 'Step failed',
                code: result.error?.code,
              },
            });
          }

          // Create WORKFLOW_FAILED event
          await this.createEvent(workflow.id, 'WORKFLOW_FAILED', null, null, {
            error: result.error,
          });

          return {
            success: false,
            error: result.error?.message || 'Workflow failed',
          };
        }

        // Step succeeded - update workflow state with merged context
        // CRITICAL: Persist the merged context so it's available on resume
        await this.storage.updateWorkflowState(workflow.id, toState as any, {
          data: currentContext,
        });

        currentState = toState;

        logger.debug(`[CreateFlow] Step completed, context updated`, {
          workflowId: workflow.id,
          stepName: step.name,
          contextKeys: Object.keys(currentContext),
          addedData: result.data ? Object.keys(result.data) : [],
        });

        // Create STEP_COMPLETED event
        await this.createEvent(
          workflow.id,
          'STEP_COMPLETED',
          fromState as any,
          toState as any,
          {
            stepName: step.name,
            contextUpdates: result.data,
          }
        );

        // Emit progress event
        if (execOptions.emitEvents) {
          const progress = ((i + 1) / (this.stateProgression.length - 1)) * 100;
          await this.emitProgress({
            workflowId: workflow.id,
            checkoutSessionId,
            currentState: toState,
            status: 'active',
            stepName: step.name,
            progress: Math.round(progress),
            message: `Completed: ${step.name}`,
          });
        }
      }

      // Step 3: Mark workflow as completed
      await this.storage.updateWorkflowState(workflow.id, 'COMPLETED', {
        status: 'completed',
      });

      // Create WORKFLOW_COMPLETED event
      await this.createEvent(workflow.id, 'WORKFLOW_COMPLETED', null, null, {
        orderId: currentContext.orderId,
        paymentIntentId: currentContext.paymentIntentId,
      });

      // Emit completion event
      if (execOptions.emitEvents) {
        await this.emitProgress({
          workflowId: workflow.id,
          checkoutSessionId,
          currentState: 'COMPLETED',
          status: 'completed',
          progress: 100,
          message: 'Workflow completed successfully',
        });
      }

      logger.info(`[CreateFlow] Workflow completed successfully`, {
        workflowId: workflow.id,
        orderId: currentContext.orderId,
      });

      return {
        success: true,
        orderId: currentContext.orderId,
      };
    } catch (error: any) {
      logger.error(`[CreateFlow] Workflow execution failed:`, error);

      if (workflow) {
        // Trigger compensation on error
        if (!execOptions.skipCompensation) {
          await this.compensate(currentContext);
        }

        // Update workflow to failed state
        await this.storage.updateWorkflowState(workflow.id, workflow.currentState, {
          status: 'failed',
          error: error.message,
        });

        // Create WORKFLOW_FAILED event
        await this.createEvent(workflow.id, 'WORKFLOW_FAILED', null, null, {
          error: error.message,
          stack: error.stack,
        });

        // Emit failure event
        if (execOptions.emitEvents) {
          await this.emitProgress({
            workflowId: workflow.id,
            checkoutSessionId,
            currentState: workflow.currentState,
            status: 'failure',
            error: {
              message: error.message,
            },
          });
        }
      }

      return {
        success: false,
        error: error.message || 'Workflow execution failed',
      };
    }
  }

  /**
   * Load existing workflow or create new one
   */
  private async loadOrCreateWorkflow(
    checkoutSessionId: string,
    initialContext: WorkflowContext
  ): Promise<OrderWorkflow> {
    // Try to load existing workflow
    const existing = await this.storage.getWorkflowByCheckoutSession(checkoutSessionId);

    if (existing) {
      logger.info(`[CreateFlow] Resuming existing workflow`, {
        workflowId: existing.id,
        currentState: existing.currentState,
      });
      return existing;
    }

    // Create new workflow
    const workflow = await this.createWorkflow(
      checkoutSessionId,
      'INIT' as any,
      initialContext
    );

    logger.info(`[CreateFlow] Created new workflow`, {
      workflowId: workflow.id,
      checkoutSessionId,
    });

    return workflow;
  }

  /**
   * Emit progress event via WebSocket
   */
  async emitProgress(event: WorkflowProgressEvent): Promise<void> {
    try {
      // Broadcast via WebSocket to all connected clients
      orderWebSocketService.broadcastOrderUpdate(event.checkoutSessionId, {
        paymentStatus: event.status,
        status: event.currentState,
        events: [
          {
            type: 'workflow_progress',
            workflowId: event.workflowId,
            currentState: event.currentState,
            progress: event.progress,
            message: event.message,
            error: event.error,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      logger.debug(`[CreateFlow] Emitted progress event`, {
        workflowId: event.workflowId,
        currentState: event.currentState,
        status: event.status,
      });
    } catch (error) {
      logger.error(`[CreateFlow] Failed to emit progress event:`, error);
      // Don't throw - progress emission failure shouldn't break workflow
    }
  }

  /**
   * Create workflow event for audit trail
   */
  protected async createEvent(
    workflowId: string,
    eventType: 'WORKFLOW_STARTED' | 'STATE_TRANSITION' | 'STEP_COMPLETED' | 'STEP_FAILED' | 'RETRY_ATTEMPTED' | 'COMPENSATION_TRIGGERED' | 'WORKFLOW_COMPLETED' | 'WORKFLOW_FAILED',
    fromState: any | null,
    toState: any | null,
    payload: any
  ): Promise<void> {
    try {
      await this.storage.createWorkflowEvent({
        workflowId,
        eventType: eventType as any,
        fromState: fromState || undefined,
        toState: toState || undefined,
        payload: payload || undefined,
        error: payload?.error || undefined,
      });
    } catch (error) {
      logger.error(`[CreateFlow] Failed to create workflow event:`, error);
      // Don't throw - event creation failure shouldn't break workflow
    }
  }
}
