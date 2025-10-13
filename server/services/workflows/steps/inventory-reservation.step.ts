/**
 * Inventory Reservation Step
 * Reserves inventory for cart items (with compensation support)
 */

import type { WorkflowStep, WorkflowContext, WorkflowStepResult } from '../types';
import type { InventoryService } from '../../inventory.service';
import { logger } from '../../../logger';

export class InventoryReservationStep implements WorkflowStep {
  readonly name = 'InventoryReservation';

  constructor(
    readonly fromState: string,
    readonly toState: string,
    private inventoryService: InventoryService
  ) {}

  async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
    try {
      const items = context.items || [];
      const checkoutSessionId = context.checkoutSessionId;

      if (!checkoutSessionId) {
        return {
          success: false,
          error: {
            message: 'Checkout session ID not provided',
            code: 'MISSING_SESSION_ID',
            retryable: false,
          },
        };
      }

      // Reserve inventory for each item
      const reservations = [];
      for (const item of items) {
        const result = await this.inventoryService.reserveStock(
          item.productId,
          item.quantity,
          checkoutSessionId,
          {
            variantId: item.variantId,
            userId: context.userId,
            expirationMinutes: 15,
          }
        );

        if (!result.success) {
          // Rollback any successful reservations
          for (const reservation of reservations) {
            await this.inventoryService.releaseReservation(reservation.id);
          }

          return {
            success: false,
            error: {
              message: result.error || 'Inventory reservation failed',
              code: 'INVENTORY_RESERVATION_FAILED',
              retryable: false,
            },
          };
        }

        if (result.reservation) {
          reservations.push(result.reservation);
        }
      }

      // Update context with reservation IDs
      return {
        success: true,
        nextState: this.toState,
        data: {
          metadata: {
            ...context.metadata,
            reservationIds: reservations.map(r => r.id),
            reservations,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'Inventory reservation failed',
          code: 'INVENTORY_RESERVATION_ERROR',
          retryable: true,
        },
      };
    }
  }

  async compensate(context: WorkflowContext): Promise<void> {
    // Release all reservations
    const reservationIds = context.metadata?.reservationIds || [];
    
    logger.info(`[InventoryReservation] Compensating - releasing ${reservationIds.length} reservations`);

    for (const reservationId of reservationIds) {
      try {
        await this.inventoryService.releaseReservation(reservationId);
      } catch (error) {
        logger.error(`[InventoryReservation] Failed to release reservation ${reservationId}:`, error);
      }
    }
  }
}
