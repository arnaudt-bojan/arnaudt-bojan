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
import { logger } from '../../logger';

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
    const stepStartTime = Date.now();
    
    logger.info(`[WorkflowExecutor] Step execution started`, {
      workflowId: workflow.id,
      stepName: step.name,
      fromState: step.fromState,
      toState: step.toState,
      timestamp: new Date().toISOString(),
    });
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Log retry attempt if not first attempt
        if (attempt > 0) {
          logger.info(`[WorkflowExecutor] Retry attempt`, {
            workflowId: workflow.id,
            stepName: step.name,
            attemptNumber: attempt + 1,
            maxRetries: this.config.maxRetries + 1,
            retryDelayMs: this.config.retryDelayMs,
          });
        }
        
        // Execute the step
        const result = await step.execute(context);
        
        if (result.success) {
          const executionTime = Date.now() - stepStartTime;
          
          // CRITICAL: Merge result.data into shared context for downstream steps
          if (result.data) {
            Object.assign(context, result.data);
          }
          
          // Add to compensation stack on success
          this.compensationStack.push(step);
          
          logger.info(`[WorkflowExecutor] Step execution completed`, {
            workflowId: workflow.id,
            stepName: step.name,
            executionTimeMs: executionTime,
            attemptNumber: attempt + 1,
            success: true,
          });
          
          return result;
        }
        
        // Check if retryable
        if (result.error?.retryable && attempt < this.config.maxRetries) {
          logger.warn(`[WorkflowExecutor] Step failed, will retry`, {
            workflowId: workflow.id,
            stepName: step.name,
            attemptNumber: attempt + 1,
            errorMessage: result.error?.message,
            errorCode: result.error?.code,
            retryable: result.error?.retryable,
            nextRetryAttempt: attempt + 2,
          });
          
          await this.delay(this.config.retryDelayMs);
          await this.storage.updateWorkflowRetry(workflow.id, attempt + 1);
          continue;
        }
        
        const executionTime = Date.now() - stepStartTime;
        logger.error(`[WorkflowExecutor] Step execution failed`, {
          workflowId: workflow.id,
          stepName: step.name,
          executionTimeMs: executionTime,
          attemptNumber: attempt + 1,
          error: result.error,
          retryable: result.error?.retryable ?? false,
        });
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        logger.error(`[WorkflowExecutor] Step execution threw exception`, {
          workflowId: workflow.id,
          stepName: step.name,
          attemptNumber: attempt + 1,
          error: {
            message: lastError.message,
            stack: lastError.stack,
          },
        });
        
        if (attempt < this.config.maxRetries) {
          logger.info(`[WorkflowExecutor] Retrying after exception`, {
            workflowId: workflow.id,
            stepName: step.name,
            attemptNumber: attempt + 1,
            nextRetryAttempt: attempt + 2,
          });
          
          await this.delay(this.config.retryDelayMs);
          await this.storage.updateWorkflowRetry(workflow.id, attempt + 1);
          continue;
        }
      }
    }
    
    const executionTime = Date.now() - stepStartTime;
    logger.error(`[WorkflowExecutor] Step execution failed after all retries`, {
      workflowId: workflow.id,
      stepName: step.name,
      executionTimeMs: executionTime,
      totalAttempts: this.config.maxRetries + 1,
      error: {
        message: lastError?.message || 'Step execution failed',
        stack: lastError?.stack,
      },
    });
    
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
    const stepsToCompensate = this.compensationStack.length;
    
    logger.info(`[WorkflowExecutor] Compensation triggered`, {
      checkoutSessionId: context.checkoutSessionId,
      stepsToCompensate,
      compensationStack: this.compensationStack.map(s => s.name).join(', '),
    });
    
    let compensatedCount = 0;
    let failedCompensations = 0;
    
    while (this.compensationStack.length > 0) {
      const step = this.compensationStack.pop()!;
      try {
        logger.info(`[WorkflowExecutor] Compensating step`, {
          checkoutSessionId: context.checkoutSessionId,
          stepName: step.name,
          remainingSteps: this.compensationStack.length,
        });
        
        await step.compensate(context);
        compensatedCount++;
        
        logger.info(`[WorkflowExecutor] Step compensation completed`, {
          checkoutSessionId: context.checkoutSessionId,
          stepName: step.name,
          success: true,
        });
      } catch (error) {
        failedCompensations++;
        logger.error(`[WorkflowExecutor] Compensation failed for step`, {
          checkoutSessionId: context.checkoutSessionId,
          stepName: step.name,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
          } : error,
        });
      }
    }
    
    logger.info(`[WorkflowExecutor] Compensation completed`, {
      checkoutSessionId: context.checkoutSessionId,
      totalSteps: stepsToCompensate,
      compensatedCount,
      failedCompensations,
    });
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
