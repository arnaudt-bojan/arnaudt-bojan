import type { IStorage } from '../../storage';
import type { 
  WorkflowStep, 
  WorkflowContext, 
  WorkflowStepResult, 
  WorkflowConfig,
  WorkflowProgressEvent,
  WorkflowExecutionOptions 
} from './types';
import type { OrderWorkflow } from '@shared/schema';

// Import enum types from schema for type safety
type WorkflowState = OrderWorkflow['currentState'];
type WorkflowEventType = 'WORKFLOW_STARTED' | 'STATE_TRANSITION' | 'STEP_COMPLETED' | 'STEP_FAILED' | 'COMPENSATION_TRIGGERED' | 'RETRY_ATTEMPTED' | 'WORKFLOW_COMPLETED' | 'WORKFLOW_FAILED';

/**
 * Base workflow executor implementing state machine pattern with Saga compensation
 */
export abstract class WorkflowExecutor {
  protected steps: Map<string, WorkflowStep> = new Map();
  protected compensationStack: WorkflowStep[] = [];
  
  /**
   * Reset compensation stack for new workflow execution
   * Call this at the start of each workflow run
   */
  protected resetCompensationStack(): void {
    this.compensationStack = [];
  }
  
  constructor(
    protected storage: IStorage,
    protected config: WorkflowConfig
  ) {}

  /**
   * Register a workflow step
   */
  protected registerStep(step: WorkflowStep): void {
    const key = `${step.fromState}->${step.toState}`;
    this.steps.set(key, step);
  }

  /**
   * Get step for state transition
   */
  protected getStep(fromState: string, toState: string): WorkflowStep | undefined {
    const key = `${fromState}->${toState}`;
    return this.steps.get(key);
  }

  /**
   * Create a new workflow instance
   */
  protected async createWorkflow(
    checkoutSessionId: string,
    initialState: WorkflowState,
    context: WorkflowContext
  ): Promise<OrderWorkflow> {
    return await this.storage.createWorkflow({
      checkoutSessionId,
      currentState: initialState,
      status: 'active',
      data: context,
      retryCount: 0
    });
  }

  /**
   * Execute a single step with retry logic
   * CRITICAL: Merges result.data back into context so state flows between steps
   */
  protected async executeStep(
    workflow: OrderWorkflow,
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<WorkflowStepResult> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Execute the step
        const result = await step.execute(context);
        
        if (result.success) {
          // CRITICAL: Merge result.data into shared context for downstream steps
          if (result.data) {
            Object.assign(context, result.data);
          }
          
          // Add to compensation stack on success
          this.compensationStack.push(step);
          return result;
        }
        
        // Check if retryable
        if (result.error?.retryable && attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelayMs);
          await this.storage.updateWorkflowRetry(workflow.id, attempt + 1);
          continue;
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelayMs);
          await this.storage.updateWorkflowRetry(workflow.id, attempt + 1);
          continue;
        }
      }
    }
    
    return {
      success: false,
      error: {
        message: lastError?.message || 'Step execution failed',
        code: 'STEP_EXECUTION_FAILED',
        retryable: false
      }
    };
  }

  /**
   * Compensate/rollback all completed steps (Saga pattern)
   */
  protected async compensate(context: WorkflowContext): Promise<void> {
    while (this.compensationStack.length > 0) {
      const step = this.compensationStack.pop()!;
      try {
        await step.compensate(context);
      } catch (error) {
        console.error(`Compensation failed for step ${step.name}:`, error);
      }
    }
  }

  /**
   * Create workflow event for audit trail
   */
  protected async createEvent(
    workflowId: string,
    eventType: WorkflowEventType,
    fromState: WorkflowState | undefined,
    toState: WorkflowState | undefined,
    payload?: any
  ): Promise<void> {
    await this.storage.createWorkflowEvent({
      workflowId,
      eventType,
      fromState,
      toState,
      payload
    });
  }

  /**
   * Emit progress event via WebSocket
   * To be implemented by subclasses with WebSocket access
   */
  protected abstract emitProgress(event: WorkflowProgressEvent): void;

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
