import type { IStorage } from '../storage';
import type { 
  InsertStockReservation, 
  StockReservation,
  Product,
} from '@shared/schema';
import { logger } from '../logger';

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
      // Architecture 3: Server-side variant stock calculation
      // Two variant formats supported (matches incrementStock/decrementStock logic):
      // 1. Color-based (hasColors=1): [{colorName, colorHex, sizes: [{size, stock}]}]
      // 2. Size-only (hasColors=0): [{size, stock, sku}]
      const variants = Array.isArray(product.variants) ? product.variants : [];
      let variantStock = 0;

      for (const colorOrSizeVariant of variants) {
        // Handle color-based structure with nested sizes array
        if (colorOrSizeVariant.sizes && Array.isArray(colorOrSizeVariant.sizes)) {
          const sizeVariant = colorOrSizeVariant.sizes.find((s: any) => {
            // Match variantId in multiple formats (same logic as increment/decrementStock):
            // 1. Full format: "size-color" (e.g., "s-red")
            // 2. Size-only format: "s" (fallback for legacy/simple IDs)
            const fullVariantId = `${s.size}-${colorOrSizeVariant.colorName}`.toLowerCase();
            const sizeOnlyId = s.size?.toLowerCase();
            const normalizedVariantId = String(variantId).toLowerCase();
            
            return fullVariantId === normalizedVariantId || sizeOnlyId === normalizedVariantId;
          });
          if (sizeVariant && typeof sizeVariant.stock === 'number') {
            variantStock = sizeVariant.stock;
            break;
          }
        }
        // Handle size-only structure (no nested sizes array)
        else {
          const currentVariantId = colorOrSizeVariant.size?.toLowerCase() || '';
          if (currentVariantId === variantId.toLowerCase()) {
            variantStock = colorOrSizeVariant.stock || 0;
            break;
          }
        }
      }
      
      currentStock = variantStock;
    } else {
      currentStock = product.stock || 0;
    }

    const reservedStock = await this.storage.getReservedStock(productId, variantId);
    const availableStock = Math.max(0, currentStock - reservedStock);
    
    // CRITICAL FIX: Pre-order and made-to-order products are always available regardless of stock
    const isAvailable = (product.productType === 'pre-order' || product.productType === 'made-to-order')
      ? true
      : availableStock >= quantity;

    logger.info('[InventoryService] Stock availability check', {
      productId,
      variantId,
      productType: product.productType,
      currentStock,
      reservedStock,
      availableStock,
      requestedQuantity: quantity,
      isAvailable,
    });

    return {
      available: isAvailable,
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
    // ARCHITECTURE 3: Business logic in service layer
    // Check product type BEFORE calling storage layer
    
    try {
      // Step 1: Get product to check type (business logic)
      const product = await this.storage.getProduct(productId);
      
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
        };
      }
      
      // Step 2: Pre-order and made-to-order products skip stock validation (business logic)
      const isPreOrderOrMadeToOrder = product.productType === 'pre-order' || product.productType === 'made-to-order';
      
      if (isPreOrderOrMadeToOrder) {
        // For pre-order/made-to-order, create reservation directly without stock check
        // Still create reservation for tracking purposes
        const expirationMinutes = options?.expirationMinutes || 15;
        const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
        
        const reservation = await this.storage.createStockReservation({
          productId,
          variantId: options?.variantId || null,
          quantity,
          sessionId,
          userId: options?.userId || null,
          status: 'active',
          expiresAt,
          orderId: null,
          committedAt: null,
          releasedAt: null,
        });
        
        logger.info('[InventoryService] Stock reserved for pre-order/made-to-order (no stock check)', {
          reservationId: reservation.id,
          productId,
          productType: product.productType,
          variantId: options?.variantId,
          quantity,
        });
        
        return {
          success: true,
          reservation,
        };
      }
      
      // Step 3: For in-stock products, use atomic reservation with stock validation
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
      logger.warn('[InventoryService] Cannot commit non-active reservation', {
        reservationId,
        status: reservation.status,
      });
      return;
    }

    // Update reservation status and decrement stock
    await this.storage.updateStockReservation(reservationId, {
      status: 'committed',
      committedAt: new Date(),
      orderId,
    });

    // Decrement stock for in-stock products only
    const product = await this.storage.getProduct(reservation.productId);
    if (product && product.productType !== 'pre-order' && product.productType !== 'made-to-order') {
      await this.decrementStock(
        reservation.productId,
        reservation.quantity,
        reservation.variantId || undefined
      );
    }

    logger.info('[InventoryService] Reservation committed', {
      reservationId,
      productId: reservation.productId,
      quantity: reservation.quantity,
      orderId,
    });
  }

  async commitReservationsBySession(sessionId: string, orderId: string): Promise<{
    success: boolean;
    committed: number;
    error?: string;
  }> {
    // ARCHITECTURE FIX: Delegate to storage layer instead of accessing db directly
    // This maintains proper abstraction and works with both DatabaseStorage and MemStorage
    const result = await this.storage.commitReservationsBySession(sessionId, orderId);

    if (result.success) {
      logger.info('[InventoryService] All session reservations committed atomically', {
        sessionId,
        orderId,
        count: result.committed,
      });
    } else {
      logger.error('[InventoryService] Failed to commit session reservations', {
        sessionId,
        orderId,
        error: result.error,
      });
    }

    return result;
  }

  async restoreCommittedStock(reservationIds: string[], orderId?: string): Promise<void> {
    if (!reservationIds || reservationIds.length === 0) {
      logger.info('[InventoryService] No reservations to restore');
      return;
    }

    logger.info('[InventoryService] Restoring committed stock', {
      orderId,
      count: reservationIds.length,
    });

    for (const reservationId of reservationIds) {
      try {
        const reservation = await this.storage.getStockReservation(reservationId);
        
        if (!reservation) {
          logger.warn('[InventoryService] Reservation not found for restoration', { reservationId });
          continue;
        }

        if (reservation.status !== 'committed') {
          logger.warn('[InventoryService] Reservation not in committed state, skipping restoration', {
            reservationId,
            status: reservation.status,
          });
          continue;
        }

        // First, increment stock back (reverse the decrement)
        const product = await this.storage.getProduct(reservation.productId);
        if (product && product.productType !== 'pre-order' && product.productType !== 'made-to-order') {
          await this.incrementStock(
            reservation.productId,
            reservation.quantity,
            reservation.variantId || undefined
          );
        }

        // Then update reservation status to released
        await this.storage.updateStockReservation(reservationId, {
          status: 'released',
          releasedAt: new Date(),
        });

        logger.info('[InventoryService] Reservation stock restored', {
          reservationId,
          productId: reservation.productId,
          quantity: reservation.quantity,
        });
      } catch (error) {
        logger.error('[InventoryService] Failed to restore reservation', {
          reservationId,
          error,
        });
        // Continue with other reservations even if one fails
      }
    }

    logger.info('[InventoryService] Stock restoration completed', {
      count: reservationIds.length,
      orderId,
    });
  }

  async incrementStock(
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<void> {
    const product = await this.storage.getProduct(productId);
    
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    if (variantId && product.variants) {
      // CRITICAL FIX: Handle nested variant structure (same logic as decrementStock)
      // Structure: [{colorName, colorHex, sizes: [{size, stock, sku}]}] for color-size
      //       OR: [{size, stock, sku}] for size-only
      const variants = Array.isArray(product.variants) ? product.variants : [];
      let stockUpdated = false;
      
      const updatedVariants = variants.map((colorOrSizeVariant: any) => {
        // Handle nested color→sizes structure (check for sizes array directly)
        if (colorOrSizeVariant.sizes && Array.isArray(colorOrSizeVariant.sizes)) {
          const updatedSizes = colorOrSizeVariant.sizes.map((sizeVariant: any) => {
            // Match variantId in multiple formats:
            // 1. Full format: "size-color" (e.g., "s-orange")
            // 2. Size-only format: "s" (fallback for legacy/simple reservations)
            const fullVariantId = `${sizeVariant.size}-${colorOrSizeVariant.colorName}`.toLowerCase();
            const sizeOnlyId = sizeVariant.size?.toLowerCase();
            const normalizedVariantId = variantId.toLowerCase();
            
            if (fullVariantId === normalizedVariantId || sizeOnlyId === normalizedVariantId) {
              stockUpdated = true;
              return {
                ...sizeVariant,
                stock: (sizeVariant.stock || 0) + quantity,
              };
            }
            return sizeVariant;
          });
          
          return {
            ...colorOrSizeVariant,
            sizes: updatedSizes,
          };
        }
        // Handle simple size-only structure
        else {
          const currentVariantId = colorOrSizeVariant.size?.toLowerCase() || '';
          
          if (currentVariantId === variantId.toLowerCase()) {
            stockUpdated = true;
            return {
              ...colorOrSizeVariant,
              stock: (colorOrSizeVariant.stock || 0) + quantity,
            };
          }
          return colorOrSizeVariant;
        }
      });

      // Calculate new product.stock as sum of all variant stocks (Architecture 3)
      let totalVariantStock = 0;
      for (const variant of updatedVariants) {
        if (variant.sizes && Array.isArray(variant.sizes)) {
          // Color-size structure: sum all sizes
          for (const size of variant.sizes) {
            totalVariantStock += size.stock || 0;
          }
        } else {
          // Size-only structure: direct stock
          totalVariantStock += variant.stock || 0;
        }
      }

      await this.storage.updateProduct(productId, {
        variants: updatedVariants,
        stock: totalVariantStock,  // Auto-sync: product.stock = sum of variant stocks
      });

      logger.info('[InventoryService] Variant stock incremented', {
        productId,
        variantId,
        quantity,
        stockUpdated,
        newTotalStock: totalVariantStock,
      });
    } else {
      const newStock = (product.stock || 0) + quantity;
      await this.storage.updateProduct(productId, {
        stock: newStock,
      });

      logger.info('[InventoryService] Product stock incremented', {
        productId,
        quantity,
        newStock,
      });
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
      // CRITICAL FIX: Handle nested variant structure
      // Structure: [{colorName, colorHex, sizes: [{size, stock, sku}]}] for color-size
      //       OR: [{size, stock, sku}] for size-only
      const variants = Array.isArray(product.variants) ? product.variants : [];
      let stockUpdated = false;
      
      const updatedVariants = variants.map((colorOrSizeVariant: any) => {
        // Handle nested color→sizes structure (check for sizes array directly)
        if (colorOrSizeVariant.sizes && Array.isArray(colorOrSizeVariant.sizes)) {
          const updatedSizes = colorOrSizeVariant.sizes.map((sizeVariant: any) => {
            // Match variantId in multiple formats:
            // 1. Full format: "size-color" (e.g., "s-orange")
            // 2. Size-only format: "s" (fallback for legacy/simple reservations)
            const fullVariantId = `${sizeVariant.size}-${colorOrSizeVariant.colorName}`.toLowerCase();
            const sizeOnlyId = sizeVariant.size?.toLowerCase();
            const normalizedVariantId = variantId.toLowerCase();
            
            if (fullVariantId === normalizedVariantId || sizeOnlyId === normalizedVariantId) {
              stockUpdated = true;
              return {
                ...sizeVariant,
                stock: Math.max(0, (sizeVariant.stock || 0) - quantity),
              };
            }
            return sizeVariant;
          });
          
          return {
            ...colorOrSizeVariant,
            sizes: updatedSizes,
          };
        }
        // Handle simple size-only structure
        else {
          const currentVariantId = colorOrSizeVariant.size?.toLowerCase() || '';
          
          if (currentVariantId === variantId.toLowerCase()) {
            stockUpdated = true;
            return {
              ...colorOrSizeVariant,
              stock: Math.max(0, (colorOrSizeVariant.stock || 0) - quantity),
            };
          }
          return colorOrSizeVariant;
        }
      });

      // Calculate new product.stock as sum of all variant stocks (Architecture 3)
      let totalVariantStock = 0;
      for (const variant of updatedVariants) {
        if (variant.sizes && Array.isArray(variant.sizes)) {
          // Color-size structure: sum all sizes
          for (const size of variant.sizes) {
            totalVariantStock += size.stock || 0;
          }
        } else {
          // Size-only structure: direct stock
          totalVariantStock += variant.stock || 0;
        }
      }

      await this.storage.updateProduct(productId, {
        variants: updatedVariants,
        stock: totalVariantStock,  // Auto-sync: product.stock = sum of variant stocks
      });

      logger.info('[InventoryService] Variant stock decremented', {
        productId,
        variantId,
        quantity,
        stockUpdated,
        newTotalStock: totalVariantStock,
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
