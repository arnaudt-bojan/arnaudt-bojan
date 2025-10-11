import type { IStorage } from '../storage';
import type { 
  InsertStockReservation, 
  StockReservation,
  Product,
} from '@shared/schema';
import { logger } from '../logger';
import { eq } from 'drizzle-orm';

export interface StockAvailability {
  available: boolean;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  productId: string;
  variantId?: string;
}

export interface ReservationResult {
  success: boolean;
  reservation?: StockReservation;
  error?: string;
  availability?: StockAvailability;
}

export class InventoryService {
  constructor(private storage: IStorage) {}

  async checkAvailability(
    productId: string, 
    quantity: number,
    variantId?: string
  ): Promise<StockAvailability> {
    const product = await this.storage.getProduct(productId);
    
    if (!product) {
      return {
        available: false,
        currentStock: 0,
        reservedStock: 0,
        availableStock: 0,
        productId,
        variantId,
      };
    }

    let currentStock = 0;
    
    if (variantId && product.variants) {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const variant = variants.find((v: any) => 
        this.getVariantId(v.size, v.color) === variantId
      );
      currentStock = variant?.stock || 0;
    } else {
      currentStock = product.stock || 0;
    }

    const reservedStock = await this.storage.getReservedStock(productId, variantId);
    const availableStock = Math.max(0, currentStock - reservedStock);

    logger.info('[InventoryService] Stock availability check', {
      productId,
      variantId,
      currentStock,
      reservedStock,
      availableStock,
      requestedQuantity: quantity,
    });

    return {
      available: availableStock >= quantity,
      currentStock,
      reservedStock,
      availableStock,
      productId,
      variantId,
    };
  }

  async reserveStock(
    productId: string,
    quantity: number,
    sessionId: string,
    options?: {
      variantId?: string;
      userId?: string;
      expirationMinutes?: number;
    }
  ): Promise<ReservationResult> {
    // CRITICAL: Use atomic transaction to prevent race conditions
    // This prevents two concurrent requests from both passing availability check
    // and creating reservations that exceed available stock
    
    try {
      const result = await this.storage.atomicReserveStock(
        productId,
        quantity,
        sessionId,
        {
          variantId: options?.variantId,
          userId: options?.userId,
          expirationMinutes: options?.expirationMinutes || 15,
        }
      );

      if (result.success) {
        logger.info('[InventoryService] Stock reserved successfully', {
          reservationId: result.reservation!.id,
          productId,
          variantId: options?.variantId,
          quantity,
          expiresAt: result.reservation!.expiresAt.toISOString(),
        });
      } else {
        logger.warn('[InventoryService] Insufficient stock for reservation', {
          productId,
          variantId: options?.variantId,
          requested: quantity,
          available: result.availability?.availableStock,
        });
      }

      return result;
    } catch (error) {
      logger.error('[InventoryService] Error reserving stock', {
        productId,
        variantId: options?.variantId,
        quantity,
        error,
      });
      
      return {
        success: false,
        error: 'Failed to reserve stock due to system error',
      };
    }
  }

  async releaseReservation(reservationId: string): Promise<void> {
    const reservation = await this.storage.getStockReservation(reservationId);
    
    if (!reservation) {
      logger.warn('[InventoryService] Reservation not found for release', { reservationId });
      return;
    }

    if (reservation.status !== 'active') {
      logger.warn('[InventoryService] Cannot release non-active reservation', {
        reservationId,
        status: reservation.status,
      });
      return;
    }

    await this.storage.updateStockReservation(reservationId, {
      status: 'released',
      releasedAt: new Date(),
    });

    logger.info('[InventoryService] Reservation released', {
      reservationId,
      productId: reservation.productId,
      quantity: reservation.quantity,
    });
  }

  async commitReservation(reservationId: string, orderId: string): Promise<void> {
    const reservation = await this.storage.getStockReservation(reservationId);
    
    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }

    if (reservation.status !== 'active') {
      throw new Error(`Cannot commit reservation in status: ${reservation.status}`);
    }

    // CRITICAL: Use transaction to ensure atomicity
    // Both reservation update and stock decrement must succeed or both fail
    await this.storage.db.transaction(async (tx) => {
      // 1. Update reservation status
      await tx
        .update(this.storage.stockReservations)
        .set({
          status: 'committed',
          committedAt: new Date(),
          orderId,
        })
        .where(eq(this.storage.stockReservations.id, reservationId));

      // 2. Decrement stock (in same transaction)
      const product = await tx
        .select()
        .from(this.storage.products)
        .where(eq(this.storage.products.id, reservation.productId))
        .limit(1);

      if (!product[0]) {
        throw new Error(`Product ${reservation.productId} not found`);
      }

      const variantId = reservation.variantId;
      if (variantId && product[0].variants) {
        const variants = Array.isArray(product[0].variants) ? product[0].variants : [];
        const updatedVariants = variants.map((v: any) => {
          if (this.getVariantId(v.size, v.color) === variantId) {
            return {
              ...v,
              stock: Math.max(0, (v.stock || 0) - reservation.quantity),
            };
          }
          return v;
        });

        await tx
          .update(this.storage.products)
          .set({ variants: updatedVariants })
          .where(eq(this.storage.products.id, reservation.productId));
      } else {
        const newStock = Math.max(0, (product[0].stock || 0) - reservation.quantity);
        await tx
          .update(this.storage.products)
          .set({ stock: newStock })
          .where(eq(this.storage.products.id, reservation.productId));
      }
    });

    logger.info('[InventoryService] Reservation committed and stock decremented (transaction)', {
      reservationId,
      orderId,
      productId: reservation.productId,
      quantity: reservation.quantity,
    });
  }

  async commitReservationsBySession(sessionId: string, orderId: string): Promise<{
    success: boolean;
    committed: number;
    error?: string;
  }> {
    try {
      const reservations = await this.storage.getStockReservationsBySession(sessionId);
      const activeReservations = reservations.filter(r => r.status === 'active');
      
      if (activeReservations.length === 0) {
        logger.info('[InventoryService] No active reservations to commit', { sessionId });
        return { success: true, committed: 0 };
      }

      // ATOMIC: Wrap ALL commits in a SINGLE transaction to prevent partial commits
      // Either ALL reservations commit and stock decrements, or NONE do
      await this.storage.db.transaction(async (tx) => {
        for (const reservation of activeReservations) {
          // 1. Update reservation status
          await tx
            .update(this.storage.stockReservations)
            .set({
              status: 'committed',
              committedAt: new Date(),
              orderId,
            })
            .where(eq(this.storage.stockReservations.id, reservation.id));

          // 2. Decrement stock (in same transaction)
          const product = await tx
            .select()
            .from(this.storage.products)
            .where(eq(this.storage.products.id, reservation.productId))
            .limit(1);

          if (!product[0]) {
            throw new Error(`Product ${reservation.productId} not found during commit`);
          }

          const variantId = reservation.variantId;
          if (variantId && product[0].variants) {
            const variants = Array.isArray(product[0].variants) ? product[0].variants : [];
            const updatedVariants = variants.map((v: any) => {
              if (this.getVariantId(v.size, v.color) === variantId) {
                return {
                  ...v,
                  stock: Math.max(0, (v.stock || 0) - reservation.quantity),
                };
              }
              return v;
            });

            await tx
              .update(this.storage.products)
              .set({ variants: updatedVariants })
              .where(eq(this.storage.products.id, reservation.productId));
          } else {
            const newStock = Math.max(0, (product[0].stock || 0) - reservation.quantity);
            await tx
              .update(this.storage.products)
              .set({ stock: newStock })
              .where(eq(this.storage.products.id, reservation.productId));
          }
        }
      });

      logger.info('[InventoryService] All session reservations committed atomically', {
        sessionId,
        orderId,
        count: activeReservations.length,
      });

      return {
        success: true,
        committed: activeReservations.length,
      };
    } catch (error: any) {
      logger.error('[InventoryService] Failed to commit session reservations (transaction rolled back)', {
        sessionId,
        orderId,
        error: error.message,
      });

      return {
        success: false,
        committed: 0,
        error: error.message || 'Failed to commit reservations',
      };
    }
  }

  async releaseExpiredReservations(): Promise<number> {
    const now = new Date();
    const expiredReservations = await this.storage.getExpiredStockReservations(now);
    
    for (const reservation of expiredReservations) {
      await this.storage.updateStockReservation(reservation.id, {
        status: 'expired',
        releasedAt: now,
      });
    }

    if (expiredReservations.length > 0) {
      logger.info('[InventoryService] Released expired reservations', {
        count: expiredReservations.length,
      });
    }

    return expiredReservations.length;
  }

  async releaseUserReservations(
    productId: string,
    userId: string,
    variantId?: string
  ): Promise<number> {
    const now = new Date();
    const allReservations = await this.storage.getStockReservationsByProduct(productId);
    let releasedCount = 0;

    for (const reservation of allReservations) {
      // Only release active reservations for this user and variant
      if (
        reservation.status === 'active' &&
        reservation.userId === userId &&
        (variantId === undefined || reservation.variantId === variantId)
      ) {
        await this.storage.updateStockReservation(reservation.id, {
          status: 'released',
          releasedAt: now,
        });
        releasedCount++;
      }
    }

    if (releasedCount > 0) {
      logger.info('[InventoryService] Released user reservations', {
        productId,
        userId,
        variantId,
        count: releasedCount,
      });
    }

    return releasedCount;
  }

  async decrementStock(
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<void> {
    const product = await this.storage.getProduct(productId);
    
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    if (variantId && product.variants) {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const updatedVariants = variants.map((v: any) => {
        if (this.getVariantId(v.size, v.color) === variantId) {
          return {
            ...v,
            stock: Math.max(0, (v.stock || 0) - quantity),
          };
        }
        return v;
      });

      await this.storage.updateProduct(productId, {
        variants: updatedVariants,
      });

      logger.info('[InventoryService] Variant stock decremented', {
        productId,
        variantId,
        quantity,
      });
    } else {
      const newStock = Math.max(0, (product.stock || 0) - quantity);
      await this.storage.updateProduct(productId, {
        stock: newStock,
      });

      logger.info('[InventoryService] Product stock decremented', {
        productId,
        quantity,
        newStock,
      });
    }
  }

  async getLowStockProducts(sellerId: string, threshold: number = 10): Promise<Product[]> {
    const allProducts = await this.storage.getAllProducts();
    const sellerProducts = allProducts.filter(p => p.sellerId === sellerId);
    
    const lowStockProducts = sellerProducts.filter(product => {
      if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        return product.variants.some((v: any) => (v.stock || 0) <= threshold);
      }
      return (product.stock || 0) <= threshold;
    });

    return lowStockProducts;
  }

  getVariantId(size?: string, color?: string): string {
    const parts = [];
    if (size) parts.push(size);
    if (color) parts.push(color);
    return parts.join('-').toLowerCase();
  }
}
