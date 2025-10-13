/**
 * Inventory Commitment Step
 * Commits reserved inventory to the order (converts reservations to actual stock reduction)
 */

import type { WorkflowStep, WorkflowContext, WorkflowStepResult } from '../types';
import type { InventoryService } from '../../inventory.service';
import type { IStorage } from '../../../storage';
import { logger } from '../../../logger';

export class InventoryCommitmentStep implements WorkflowStep {
  readonly name = 'InventoryCommitment';

  constructor(
    readonly fromState: string,
    readonly toState: string,
    private inventoryService: InventoryService,
    private storage: IStorage
  ) {}

  async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
    try {
      const orderId = context.orderId;
      const reservationIds = context.metadata?.reservationIds || [];

      if (!orderId) {
        return {
          success: false,
          error: {
            message: 'Order ID not found in context',
            code: 'MISSING_ORDER_ID',
            retryable: false,
          },
        };
      }

      // Commit all reservations to the order
      for (const reservationId of reservationIds) {
        try {
          await this.inventoryService.commitReservation(reservationId, orderId);
        } catch (error: any) {
          logger.error(`[InventoryCommitment] Failed to commit reservation ${reservationId}:`, error);
          
          return {
            success: false,
            error: {
              message: `Failed to commit inventory: ${error.message}`,
              code: 'INVENTORY_COMMIT_ERROR',
              retryable: true,
            },
          };
        }
      }

      // All reservations committed successfully
      return {
        success: true,
        nextState: this.toState,
        data: {
          metadata: {
            ...context.metadata,
            inventoryCommitted: true,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'Inventory commitment failed',
          code: 'INVENTORY_COMMITMENT_ERROR',
          retryable: true,
        },
      };
    }
  }

  async compensate(context: WorkflowContext): Promise<void> {
    // If inventory was committed, we cannot easily "uncommit" it
    // This would require restocking, which is a business decision
    // For now, we log the issue - manual intervention may be needed
    logger.warn('[InventoryCommitment] Compensation requested but inventory already committed', {
      orderId: context.orderId,
      reservationIds: context.metadata?.reservationIds,
    });
  }
}
