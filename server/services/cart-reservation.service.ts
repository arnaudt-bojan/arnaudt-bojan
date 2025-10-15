/**
 * Cart Reservation Service
 * 
 * Manages stock reservations for shopping cart checkout flow:
 * - Creates reservations when checkout starts (30 min expiry)
 * - Extends reservations for active sessions
 * - Releases reservations on abandon/cancel
 * - Works with cleanup job for expired reservations
 * 
 * Best Practices:
 * - Items in cart = NO reservation (soft hold, UI only)
 * - Checkout initiated = CREATE reservation
 * - Payment success = COMMIT to order
 * - Abandon/expire = AUTO-RELEASE
 */

import type { IStorage } from '../storage';
import type { InventoryService } from './inventory.service';
import { logger } from '../logger';

export interface ReservationItem {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface CreateReservationParams {
  sessionId: string;
  items: ReservationItem[];
  userId?: string;
  expirationMinutes?: number;
}

export interface ReservationResult {
  success: boolean;
  reservations?: Array<{
    reservationId: string;
    productId: string;
    variantId?: string;
    quantity: number;
    expiresAt: Date;
  }>;
  errors?: Array<{
    productId: string;
    variantId?: string;
    error: string;
  }>;
}

export class CartReservationService {
  constructor(
    private storage: IStorage,
    private inventoryService: InventoryService
  ) {}

  /**
   * Create reservations for cart items when checkout starts
   * 
   * This is called when user initiates payment, NOT when adding to cart.
   * Uses database transactions to prevent race conditions.
   * 
   * ATOMIC BEHAVIOR: If ANY item fails, ALL successful reservations are rolled back.
   */
  async createCheckoutReservations(
    params: CreateReservationParams
  ): Promise<ReservationResult> {
    const { sessionId, items, userId, expirationMinutes = 30 } = params;

    logger.info('[CartReservation] Creating checkout reservations', {
      sessionId,
      itemCount: items.length,
      userId,
      expirationMinutes,
    });

    const successfulReservations: ReservationResult['reservations'] = [];
    const errors: ReservationResult['errors'] = [];

    // Reserve each item individually
    for (const item of items) {
      try {
        const result = await this.inventoryService.reserveStock(
          item.productId,
          item.quantity,
          sessionId,
          {
            variantId: item.variantId,
            userId,
            expirationMinutes,
          }
        );

        if (result.success && result.reservation) {
          successfulReservations.push({
            reservationId: result.reservation.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            expiresAt: result.reservation.expiresAt,
          });
        } else {
          errors.push({
            productId: item.productId,
            variantId: item.variantId,
            error: result.error || 'Failed to reserve stock',
          });
          // CRITICAL: Break immediately on first failure (will trigger rollback below)
          break;
        }
      } catch (error: any) {
        logger.error('[CartReservation] Reservation failed', {
          productId: item.productId,
          variantId: item.variantId,
          error: error.message,
        });
        errors.push({
          productId: item.productId,
          variantId: item.variantId,
          error: error.message || 'Reservation error',
        });
        // CRITICAL: Break immediately on first error (will trigger rollback below)
        break;
      }
    }

    const success = errors.length === 0;

    // ATOMIC ROLLBACK: If any item failed, release all successful reservations
    if (!success && successfulReservations.length > 0) {
      logger.warn('[CartReservation] Rolling back partial reservations due to failure', {
        sessionId,
        successfulCount: successfulReservations.length,
        failedCount: errors.length,
      });

      // Release all successful reservations to restore stock
      for (const reservation of successfulReservations) {
        try {
          await this.inventoryService.releaseReservation(reservation.reservationId);
          logger.info('[CartReservation] Rolled back reservation', {
            reservationId: reservation.reservationId,
            productId: reservation.productId,
          });
        } catch (rollbackError: any) {
          logger.error('[CartReservation] Failed to rollback reservation', {
            reservationId: reservation.reservationId,
            error: rollbackError.message,
          });
        }
      }

      // Clear successful reservations list since we rolled them back
      successfulReservations.length = 0;
    }

    logger.info('[CartReservation] Checkout reservations result', {
      sessionId,
      successful: successfulReservations.length,
      failed: errors.length,
      success,
      rolledBack: !success && successfulReservations.length === 0,
    });

    return {
      success,
      reservations: successfulReservations.length > 0 ? successfulReservations : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Extend reservation expiration time for active checkout sessions
   * 
   * Call this when user is actively filling checkout form to prevent
   * premature expiration. Extends by additional time from current moment.
   */
  async extendReservation(
    sessionId: string,
    additionalMinutes: number = 15
  ): Promise<{ success: boolean; newExpiresAt?: Date; error?: string }> {
    try {
      logger.info('[CartReservation] Extending reservation', {
        sessionId,
        additionalMinutes,
      });

      const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);
      const reservations = await this.storage.getStockReservationsBySession(sessionId);

      if (reservations.length === 0) {
        return {
          success: false,
          error: 'No reservations found for session',
        };
      }

      // Update each reservation's expiration time
      for (const reservation of reservations) {
        await this.storage.updateStockReservation(reservation.id, {
          expiresAt: newExpiresAt as any,
        });
      }

      logger.info('[CartReservation] Reservation extended', {
        sessionId,
        newExpiresAt: newExpiresAt.toISOString(),
        count: reservations.length,
      });
      
      return { success: true, newExpiresAt };
    } catch (error: any) {
      logger.error('[CartReservation] Failed to extend reservation', {
        sessionId,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Release (cancel) all reservations for a session
   * 
   * Called when:
   * - User cancels checkout
   * - Payment fails (before retry)
   * - User explicitly abandons cart
   * 
   * Note: Expired reservations are auto-released by cleanup job
   */
  async releaseSessionReservations(
    sessionId: string
  ): Promise<{ success: boolean; released: number; error?: string }> {
    try {
      logger.info('[CartReservation] Releasing session reservations', {
        sessionId,
      });

      // Get all active reservations for this session
      const reservations = await this.storage.getStockReservationsBySession(sessionId);
      
      if (reservations.length === 0) {
        logger.warn('[CartReservation] No reservations to release', { sessionId });
        return { success: true, released: 0 };
      }

      // Release each reservation using inventory service (auto-restores stock)
      let releasedCount = 0;
      for (const reservation of reservations) {
        if (reservation.status === 'active') {
          await this.inventoryService.releaseReservation(reservation.id);
          releasedCount++;
        }
      }

      logger.info('[CartReservation] Session reservations released', {
        sessionId,
        released: releasedCount,
      });

      return { success: true, released: releasedCount };
    } catch (error: any) {
      logger.error('[CartReservation] Failed to release reservations', {
        sessionId,
        error: error.message,
      });
      return { success: false, released: 0, error: error.message };
    }
  }

  /**
   * Get active reservations for a session
   * 
   * Useful for showing user what's currently reserved in their checkout
   */
  async getSessionReservations(sessionId: string) {
    try {
      const reservations = await this.storage.getStockReservationsBySession(sessionId);
      
      return {
        success: true,
        reservations: reservations.map(r => ({
          id: r.id,
          productId: r.productId,
          variantId: r.variantId || undefined,
          quantity: r.quantity,
          expiresAt: r.expiresAt,
          isExpired: new Date(r.expiresAt) < new Date(),
        })),
      };
    } catch (error: any) {
      logger.error('[CartReservation] Failed to get reservations', {
        sessionId,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if session has active (non-expired) reservations
   */
  async hasActiveReservations(sessionId: string): Promise<boolean> {
    try {
      const reservations = await this.storage.getStockReservationsBySession(sessionId);
      const now = new Date();
      
      return reservations.some(r => new Date(r.expiresAt) > now);
    } catch (error) {
      logger.error('[CartReservation] Error checking reservations', { sessionId });
      return false;
    }
  }

  /**
   * Commit reservations to an order (mark as fulfilled)
   * 
   * Called when payment succeeds. This permanently decrements stock
   * and removes the temporary reservation.
   */
  async commitReservationsToOrder(
    sessionId: string,
    orderId: string
  ): Promise<{ success: boolean; committed: number; error?: string }> {
    try {
      logger.info('[CartReservation] Committing reservations to order', {
        sessionId,
        orderId,
      });

      const result = await this.inventoryService.commitReservationsBySession(
        sessionId,
        orderId
      );

      if (result.success) {
        logger.info('[CartReservation] Reservations committed successfully', {
          sessionId,
          orderId,
          committed: result.committed,
        });
        return { success: true, committed: result.committed || 0 };
      } else {
        return {
          success: false,
          committed: 0,
          error: result.error || 'Failed to commit reservations',
        };
      }
    } catch (error: any) {
      logger.error('[CartReservation] Failed to commit reservations', {
        sessionId,
        orderId,
        error: error.message,
      });
      return { success: false, committed: 0, error: error.message };
    }
  }
}
