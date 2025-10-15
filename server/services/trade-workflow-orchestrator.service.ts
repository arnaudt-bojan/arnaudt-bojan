/**
 * TradeWorkflowOrchestrator - Orchestrates conversion of quotations to orders
 * 
 * Handles:
 * - Converting fully-paid quotations into standard orders
 * - Creating order items from quotation line items
 * - Linking payment intents (deposit + balance)
 * - Inventory reservation for product-linked items
 * - Event logging and audit trail
 * - Transaction management and rollback
 */

import type { IStorage } from '../storage';
import type { QuotationService } from './quotation.service';
import type { InventoryService } from './inventory.service';
import type {
  Order,
  InsertOrder,
  OrderItem,
  InsertOrderItem,
  TradeQuotation,
  TradeQuotationItem,
  TradePaymentSchedule,
} from '@shared/schema';
import {
  tradeQuotationEvents,
  tradePaymentSchedules,
  tradeQuotations,
  orderEvents,
  orders,
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../logger';
import type { DatabaseStorage } from '../storage';

// ============================================================================
// Types
// ============================================================================

export interface ConvertQuotationResult {
  success: boolean;
  order?: Order;
  error?: string;
}

// ============================================================================
// TradeWorkflowOrchestrator
// ============================================================================

export class TradeWorkflowOrchestrator {
  constructor(
    private quotationService: QuotationService,
    private inventoryService: InventoryService,
    private storage: IStorage
  ) {}

  /**
   * Convert a fully-paid quotation to an order
   * 
   * Steps:
   * 1. Fetch quotation with all items and payment schedules
   * 2. Validate quotation status (must be fully_paid or completed)
   * 3. Start transaction
   * 4. Create Order record from quotation data
   * 5. Create OrderItems from quotation items
   * 6. Link payment intents (deposit + balance)
   * 7. Reserve inventory (if productId exists)
   * 8. Log events in both quotation_events and order_events
   * 9. Update quotation status to "completed"
   * 10. Commit transaction
   */
  async convertQuotationToOrder(quotationId: string): Promise<Order> {
    // Access db from DatabaseStorage (cast for type safety)
    const db = (this.storage as DatabaseStorage).db;
    let order: Order | undefined;
    
    try {
      // Step 1: Fetch quotation with items
      const quotation = await this.quotationService.getQuotation(quotationId);
      
      if (!quotation) {
        throw new Error(`Quotation ${quotationId} not found`);
      }

      // IDEMPOTENCY CHECK: If quotation already converted, return existing order
      if (quotation.orderId) {
        logger.warn(`[TradeWorkflowOrchestrator] Quotation ${quotationId} already converted to order ${quotation.orderId}`, {
          quotationId,
          orderId: quotation.orderId,
          quotationNumber: quotation.quotationNumber,
        });
        return await this.storage.getOrder(quotation.orderId);
      }

      // Step 2: Validate quotation status
      if (quotation.status !== 'fully_paid' && quotation.status !== 'completed') {
        throw new Error(
          `Quotation must be fully_paid or completed to convert to order. Current status: ${quotation.status}`
        );
      }

      // Fetch payment schedules to get Stripe payment intent IDs
      const paymentSchedules = await db
        .select()
        .from(tradePaymentSchedules)
        .where(eq(tradePaymentSchedules.quotationId, quotationId));

      const depositPayment = paymentSchedules.find((p: TradePaymentSchedule) => p.paymentType === 'deposit');
      const balancePayment = paymentSchedules.find((p: TradePaymentSchedule) => p.paymentType === 'balance');

      logger.info('[TradeWorkflowOrchestrator] Converting quotation to order', {
        quotationId,
        quotationNumber: quotation.quotationNumber,
        status: quotation.status,
        total: quotation.total,
        itemCount: quotation.items.length,
      });

      // Step 3-10: Execute in transaction
      order = await db.transaction(async (tx: any) => {
        // Step 4: Create Order record
        const [newOrder] = await tx.insert(orders).values({
          userId: quotation.buyerId || null,
          sellerId: quotation.sellerId,
          customerName: quotation.buyerEmail.split('@')[0], // Extract name from email
          customerEmail: quotation.buyerEmail,
          customerAddress: JSON.stringify({
            line1: '', // Quotations don't have shipping address
            city: '',
            state: '',
            postalCode: '',
            country: '',
          }),
          items: JSON.stringify([]), // Legacy field - empty for now
          total: quotation.total,
          amountPaid: quotation.total, // Already fully paid
          remainingBalance: '0',
          paymentType: 'full', // Fully paid via quotation
          paymentStatus: 'fully_paid',
          stripePaymentIntentId: depositPayment?.stripePaymentIntentId || null,
          stripeBalancePaymentIntentId: balancePayment?.stripePaymentIntentId || null,
          status: 'pending', // Seller must fulfill separately
          fulfillmentStatus: 'unfulfilled',
          
          // Tax and totals from quotation
          taxAmount: quotation.taxAmount,
          subtotalBeforeTax: quotation.subtotal,
          
          // Currency
          currency: quotation.currency,
          
          // Shipping fields from quotation
          shippingCost: quotation.shippingAmount,
          
          // Store quotation metadata
          // Note: orders table doesn't have metadata field, so we use a workaround
          // We'll log this in order_events instead
        }).returning();

        // Step 5: Create OrderItems from quotation items
        const orderItems: InsertOrderItem[] = quotation.items.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId || `custom-${item.lineNumber}`, // Use custom ID for non-product items
          productName: item.description,
          productImage: null,
          productType: 'wholesale', // Mark as wholesale order
          quantity: item.quantity,
          price: item.unitPrice,
          originalPrice: item.unitPrice, // No discount in quotations
          discountPercentage: null,
          discountAmount: null,
          subtotal: item.lineTotal,
          depositAmount: null,
          balanceAmount: null,
          requiresDeposit: 0,
          variant: null, // Quotations don't track variants
          itemStatus: 'pending',
          trackingNumber: null,
          trackingCarrier: null,
          trackingUrl: null,
          trackingLink: null,
          shippedAt: null,
          deliveredAt: null,
          refundedQuantity: 0,
          refundedAmount: '0',
          returnedAt: null,
          refundedAt: null,
        }));

        const createdOrderItems = await this.storage.createOrderItems(orderItems);

        // Step 7: Reserve inventory for items with productId
        for (const item of quotation.items) {
          if (item.productId) {
            try {
              // Check if product exists
              const product = await this.storage.getProduct(item.productId);
              
              if (product) {
                // Reserve stock via inventory service
                const reservationResult = await this.inventoryService.reserveStock(
                  item.productId,
                  item.quantity,
                  `quotation-${quotationId}`, // Use quotation ID as session
                  {
                    userId: quotation.buyerId || undefined,
                    expirationMinutes: 60 * 24 * 7, // 7 days for quotation orders
                  }
                );

                if (reservationResult.success && reservationResult.reservation) {
                  // Immediately commit the reservation to the order
                  await this.inventoryService.commitReservation(
                    reservationResult.reservation.id,
                    newOrder.id
                  );

                  logger.info('[TradeWorkflowOrchestrator] Inventory reserved and committed', {
                    orderId: newOrder.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    reservationId: reservationResult.reservation.id,
                  });
                } else {
                  logger.warn('[TradeWorkflowOrchestrator] Could not reserve inventory', {
                    orderId: newOrder.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    error: reservationResult.error,
                  });
                  // Don't fail the entire conversion if inventory reservation fails
                  // The seller will need to manage stock manually
                }
              } else {
                logger.warn('[TradeWorkflowOrchestrator] Product not found for inventory reservation', {
                  orderId: newOrder.id,
                  productId: item.productId,
                });
              }
            } catch (error: any) {
              logger.error('[TradeWorkflowOrchestrator] Error during inventory reservation', {
                orderId: newOrder.id,
                productId: item.productId,
                error: error.message,
              });
              // Don't fail - continue with order creation
            }
          }
        }

        // Step 8: Log events
        
        // Log quotation event: Use existing event type with metadata
        await tx.insert(tradeQuotationEvents).values({
          quotationId: quotation.id,
          eventType: 'email_sent', // Use closest existing type, store real type in payload
          performedBy: 'system',
          payload: {
            action: 'order_created',
            orderId: newOrder.id,
            orderNumber: newOrder.id,
            convertedAt: new Date().toISOString(),
          },
        });

        // Log order event: Use existing event type with metadata
        await tx.insert(orderEvents).values({
          orderId: newOrder.id,
          eventType: 'payment_received', // Use closest existing type
          payload: {
            source: 'trade_quotation',
            quotationId: quotation.id,
            quotationNumber: quotation.quotationNumber,
            depositPaymentIntentId: depositPayment?.stripePaymentIntentId,
            balancePaymentIntentId: balancePayment?.stripePaymentIntentId,
          },
          description: `Order created from quotation ${quotation.quotationNumber}`,
          performedBy: 'system',
        });

        // Step 9: Update quotation status to "completed" and store orderId (idempotency)
        await tx
          .update(tradeQuotations)
          .set({
            status: 'completed',
            orderId: newOrder.id, // Store orderId to prevent duplicate conversions
            updatedAt: new Date(),
          })
          .where(eq(tradeQuotations.id, quotationId));

        logger.info('[TradeWorkflowOrchestrator] Order created successfully from quotation', {
          orderId: newOrder.id,
          quotationId: quotation.id,
          quotationNumber: quotation.quotationNumber,
          total: newOrder.total,
          itemCount: createdOrderItems.length,
        });

        return newOrder;
      });

      return order!;
    } catch (error: any) {
      logger.error('[TradeWorkflowOrchestrator] Failed to convert quotation to order', {
        quotationId,
        error: error.message,
        stack: error.stack,
      });
      
      throw new Error(`Failed to convert quotation to order: ${error.message}`);
    }
  }

  /**
   * Check if a quotation can be converted to an order
   */
  async canConvertToOrder(quotationId: string): Promise<{ canConvert: boolean; reason?: string }> {
    try {
      const quotation = await this.quotationService.getQuotation(quotationId);
      
      if (!quotation) {
        return { canConvert: false, reason: 'Quotation not found' };
      }

      if (quotation.status !== 'fully_paid' && quotation.status !== 'completed') {
        return {
          canConvert: false,
          reason: `Quotation must be fully paid. Current status: ${quotation.status}`,
        };
      }

      if (quotation.items.length === 0) {
        return { canConvert: false, reason: 'Quotation has no items' };
      }

      return { canConvert: true };
    } catch (error: any) {
      logger.error('[TradeWorkflowOrchestrator] Error checking if quotation can convert', {
        quotationId,
        error: error.message,
      });
      
      return { canConvert: false, reason: error.message };
    }
  }
}
