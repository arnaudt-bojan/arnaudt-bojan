import type { OrderWorkflow, OrderWorkflowEvent, WorkflowState } from '@shared/schema';

/**
 * Structured workflow error with step and state context
 */
export interface WorkflowError {
  message: string;
  code: string;
  retryable: boolean;
  step?: string;
  state?: WorkflowState;
  details?: any;
}

/**
 * Workflow execution context - carries data between steps
 */
export interface WorkflowContext {
  // Session and user info
  checkoutSessionId: string;
  userId?: string;
  
  // Cart and seller info
  cartId?: string;
  sellerId?: string;
  items?: Array<{
    productId: string;
    quantity: number;
    variantId?: string;
  }>;
  
  // Customer info
  customerEmail?: string;
  customerName?: string;
  
  // Shipping address
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  
  // Shipping and pricing
  shippingOptionId?: string;
  shippingCost?: number;
  subtotal?: number;
  totalAmount?: number;
  taxAmount?: number;
  
  // Payment info
  paymentIntentId?: string;
  paymentMethodId?: string;
  
  // Created entities
  orderId?: string;
  
  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Result of executing a workflow step
 */
export interface WorkflowStepResult {
  success: boolean;
  nextState?: string; // Next state to transition to
  data?: Partial<WorkflowContext>; // Updated context data
  error?: {
    message: string;
    code?: string;
    retryable?: boolean; // Whether this error can be retried
  };
}

/**
 * Abstract workflow step interface
 * Each step implements execute() and compensate() methods
 */
export interface WorkflowStep {
  readonly name: string;
  readonly fromState: string;
  readonly toState: string;
  
  /**
   * Execute the step with the given context
   */
  execute(context: WorkflowContext): Promise<WorkflowStepResult>;
  
  /**
   * Compensate/rollback the step (Saga pattern)
   * Called when a later step fails and we need to undo this step
   */
  compensate(context: WorkflowContext): Promise<void>;
}

/**
 * Workflow event data for WebSocket emission
 */
export interface WorkflowProgressEvent {
  workflowId: string;
  checkoutSessionId: string;
  currentState: string;
  status: 'active' | 'completed' | 'failure' | 'cancelled';
  stepName?: string;
  progress?: number; // 0-100 percentage
  message?: string;
  error?: {
    message: string;
    code?: string;
    retryable?: boolean; // Whether the error is retryable (for UI retry buttons)
  };
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
}

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  skipCompensation?: boolean; // For testing/debugging
  emitEvents?: boolean; // Emit WebSocket events (default: true)
}
