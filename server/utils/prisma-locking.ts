/**
 * Prisma Row-Level Locking Utilities
 * 
 * Type-safe helpers for row-level locking operations using Prisma's $queryRaw.
 * These utilities provide FOR UPDATE and FOR UPDATE SKIP LOCKED semantics
 * to prevent race conditions in concurrent transactions.
 * 
 * Architecture: Phase 2 Drizzle → Prisma Migration
 */

import { Prisma } from '../../generated/prisma';

// ============================================================================
// Type Definitions for Raw Query Results
// ============================================================================

/**
 * Cart row for locking queries
 */
export interface CartLockRow {
  id: string;
  seller_id: string;
  buyer_id: string | null;
  items: any; // JSON
  status: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Cart session row for locking queries
 */
export interface CartSessionLockRow {
  session_id: string;
  cart_id: string;
  last_seen: Date;
}

/**
 * Product row for locking queries
 */
export interface ProductLockRow {
  id: string;
  seller_id: string;
  name: string;
  price: string;
  stock: number | null;
  variants: any; // JSON
  has_colors: number | null;
  [key: string]: any; // Other product fields
}

/**
 * Stock reservation row for locking queries
 */
export interface StockReservationLockRow {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  session_id: string;
  user_id: string | null;
  status: string;
  expires_at: Date;
  order_id: string | null;
  committed_at: Date | null;
  released_at: Date | null;
  created_at: Date;
}

// ============================================================================
// Locking Helper Functions
// ============================================================================

/**
 * Lock cart row by ID with FOR UPDATE
 * 
 * @param tx Prisma transaction client
 * @param cartId Cart ID to lock
 * @returns Locked cart row or undefined
 */
export async function lockCartById(
  tx: Prisma.TransactionClient,
  cartId: string
): Promise<CartLockRow | undefined> {
  const result = await tx.$queryRaw<CartLockRow[]>`
    SELECT * FROM carts WHERE id = ${cartId} FOR UPDATE LIMIT 1
  `;
  return result[0];
}

/**
 * Lock carts by seller and buyer with FOR UPDATE
 * 
 * @param tx Prisma transaction client
 * @param sellerId Seller ID
 * @param buyerId Buyer ID
 * @returns Locked cart rows
 */
export async function lockCartsBySellerAndBuyer(
  tx: Prisma.TransactionClient,
  sellerId: string,
  buyerId: string
): Promise<CartLockRow[]> {
  return await tx.$queryRaw<CartLockRow[]>`
    SELECT * FROM carts 
    WHERE seller_id = ${sellerId} AND buyer_id = ${buyerId}
    FOR UPDATE LIMIT 1
  `;
}

/**
 * Lock cart session by session ID with FOR UPDATE
 * 
 * @param tx Prisma transaction client
 * @param sessionId Session ID
 * @returns Locked cart session or undefined
 */
export async function lockCartSessionById(
  tx: Prisma.TransactionClient,
  sessionId: string
): Promise<CartSessionLockRow | undefined> {
  const result = await tx.$queryRaw<CartSessionLockRow[]>`
    SELECT * FROM cart_sessions WHERE session_id = ${sessionId} FOR UPDATE LIMIT 1
  `;
  return result[0];
}

/**
 * Lock product by ID with FOR UPDATE
 * 
 * @param tx Prisma transaction client
 * @param productId Product ID to lock
 * @returns Locked product row or undefined
 */
export async function lockProductById(
  tx: Prisma.TransactionClient,
  productId: string
): Promise<ProductLockRow | undefined> {
  const result = await tx.$queryRaw<ProductLockRow[]>`
    SELECT * FROM products WHERE id = ${productId} FOR UPDATE LIMIT 1
  `;
  return result[0];
}

/**
 * Lock active stock reservations by product ID with FOR UPDATE
 * 
 * @param tx Prisma transaction client
 * @param productId Product ID
 * @param variantId Optional variant ID filter
 * @returns Locked reservation rows
 */
export async function lockActiveReservationsByProduct(
  tx: Prisma.TransactionClient,
  productId: string,
  variantId?: string | null
): Promise<StockReservationLockRow[]> {
  if (variantId) {
    return await tx.$queryRaw<StockReservationLockRow[]>`
      SELECT * FROM stock_reservations
      WHERE product_id = ${productId}
        AND variant_id = ${variantId}
        AND status = 'active'
      FOR UPDATE
    `;
  } else {
    return await tx.$queryRaw<StockReservationLockRow[]>`
      SELECT * FROM stock_reservations
      WHERE product_id = ${productId}
        AND status = 'active'
      FOR UPDATE
    `;
  }
}

/**
 * Lock stock reservation by ID with FOR UPDATE
 * 
 * @param tx Prisma transaction client
 * @param reservationId Reservation ID
 * @returns Locked reservation or undefined
 */
export async function lockReservationById(
  tx: Prisma.TransactionClient,
  reservationId: string
): Promise<StockReservationLockRow | undefined> {
  const result = await tx.$queryRaw<StockReservationLockRow[]>`
    SELECT * FROM stock_reservations WHERE id = ${reservationId} FOR UPDATE LIMIT 1
  `;
  return result[0];
}

/**
 * Lock active stock reservations with FOR UPDATE SKIP LOCKED
 * This is useful for background jobs that clean up expired reservations
 * without blocking on locked rows.
 * 
 * @param tx Prisma transaction client
 * @param productId Product ID
 * @param variantId Optional variant ID filter
 * @returns Locked reservation rows (skips locked rows)
 */
export async function lockActiveReservationsSkipLocked(
  tx: Prisma.TransactionClient,
  productId: string,
  variantId?: string | null
): Promise<StockReservationLockRow[]> {
  if (variantId) {
    return await tx.$queryRaw<StockReservationLockRow[]>`
      SELECT * FROM stock_reservations
      WHERE product_id = ${productId}
        AND variant_id = ${variantId}
        AND status = 'active'
      FOR UPDATE SKIP LOCKED
    `;
  } else {
    return await tx.$queryRaw<StockReservationLockRow[]>`
      SELECT * FROM stock_reservations
      WHERE product_id = ${productId}
        AND status = 'active'
      FOR UPDATE SKIP LOCKED
    `;
  }
}
