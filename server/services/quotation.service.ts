/**
 * QuotationService - Trade Quotation Management (Architecture 3: ALL business logic in backend)
 * 
 * Handles:
 * - CRUD operations for quotations
 * - Server-side pricing calculations
 * - Status transitions and state machine
 * - Validation logic
 * - Event audit trail
 */

import { storage } from "../storage";
import { 
  tradeQuotations, 
  tradeQuotationItems, 
  tradeQuotationEvents, 
  tradePaymentSchedules,
  type TradeQuotation,
  type InsertTradeQuotation,
  type TradeQuotationItem,
  type InsertTradeQuotationItem,
  type TradeQuotationEvent,
  type InsertTradeQuotationEvent,
  type TradePaymentSchedule,
  type InsertTradePaymentSchedule,
  type TradeQuotationStatus,
  type TradeQuotationEventType,
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { logger } from "../logger";
import { z } from "zod";

const db = storage.db;

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CreateQuotationData {
  buyerEmail: string;
  buyerId?: string;
  currency?: string;
  depositPercentage?: number;
  validUntil?: Date;
  metadata?: any;
  items: Array<{
    description: string;
    productId?: string;
    unitPrice: number;
    quantity: number;
    taxRate?: number;
    shippingCost?: number;
  }>;
}

export interface UpdateQuotationData {
  buyerEmail?: string;
  buyerId?: string;
  depositPercentage?: number;
  validUntil?: Date;
  metadata?: any;
  items?: Array<{
    description: string;
    productId?: string;
    unitPrice: number;
    quantity: number;
    taxRate?: number;
    shippingCost?: number;
  }>;
}

export interface ListQuotationsFilters {
  status?: TradeQuotationStatus;
  buyerEmail?: string;
  limit?: number;
  offset?: number;
}

export interface QuotationWithItems extends TradeQuotation {
  items: TradeQuotationItem[];
}

// ============================================================================
// State Machine Transitions
// ============================================================================

const VALID_TRANSITIONS: Record<TradeQuotationStatus, TradeQuotationStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["viewed", "expired", "cancelled"],
  viewed: ["accepted", "expired", "cancelled"],
  accepted: ["deposit_paid", "cancelled"],
  deposit_paid: ["balance_due", "cancelled"],
  balance_due: ["fully_paid", "cancelled"],
  fully_paid: ["completed", "cancelled"],
  completed: ["cancelled"],
  cancelled: [],
  expired: ["cancelled"],
};

// ============================================================================
// QuotationService
// ============================================================================

export class QuotationService {
  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Create a new quotation in draft status
   */
  async createQuotation(sellerId: string, data: CreateQuotationData): Promise<QuotationWithItems> {
    try {
      // Validate items exist
      if (!data.items || data.items.length === 0) {
        throw new Error("Quotation must have at least one item");
      }

      // Validate email
      const emailSchema = z.string().email();
      const emailValidation = emailSchema.safeParse(data.buyerEmail);
      if (!emailValidation.success) {
        throw new Error("Invalid buyer email address");
      }

      // Calculate line totals for all items
      const itemsWithTotals = data.items.map((item, index) => ({
        ...item,
        lineNumber: index + 1,
        lineTotal: this.calculateLineTotal(
          item.unitPrice,
          item.quantity,
          item.taxRate,
          item.shippingCost
        ),
      }));

      // Calculate quotation totals
      const totals = this.calculateQuotationTotals(itemsWithTotals);

      // Calculate deposit and balance
      const depositPercentage = data.depositPercentage || 50;
      const { depositAmount, balanceAmount } = this.calculateDepositAndBalance(
        totals.total,
        depositPercentage
      );

      // Generate quotation number
      const quotationNumber = await this.generateQuotationNumber();

      // Create quotation and items in transaction
      const quotation = await db.transaction(async (tx) => {
        // Insert quotation
        const [newQuotation] = await tx.insert(tradeQuotations).values({
          sellerId,
          buyerEmail: data.buyerEmail,
          buyerId: data.buyerId || null,
          quotationNumber,
          currency: data.currency || "USD",
          subtotal: totals.subtotal.toFixed(2),
          taxAmount: totals.taxAmount.toFixed(2),
          shippingAmount: totals.shippingAmount.toFixed(2),
          total: totals.total.toFixed(2),
          depositAmount: depositAmount.toFixed(2),
          depositPercentage,
          balanceAmount: balanceAmount.toFixed(2),
          status: "draft",
          validUntil: data.validUntil || null,
          metadata: data.metadata || null,
        }).returning();

        // Insert items
        const items = await tx.insert(tradeQuotationItems).values(
          itemsWithTotals.map((item) => ({
            quotationId: newQuotation.id,
            lineNumber: item.lineNumber,
            description: item.description,
            productId: item.productId || null,
            unitPrice: item.unitPrice.toFixed(2),
            quantity: item.quantity,
            taxRate: item.taxRate?.toFixed(2) || null,
            shippingCost: item.shippingCost?.toFixed(2) || null,
            lineTotal: item.lineTotal.toFixed(2),
          }))
        ).returning();

        // Log creation event
        await this.logEvent(
          tx,
          newQuotation.id,
          "created",
          sellerId,
          { quotationNumber, itemCount: items.length }
        );

        return { ...newQuotation, items };
      });

      logger.info("[QuotationService] Quotation created", {
        quotationId: quotation.id,
        quotationNumber: quotation.quotationNumber,
        sellerId,
      });

      return quotation;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to create quotation", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Get a single quotation with its items
   */
  async getQuotation(id: string): Promise<QuotationWithItems | null> {
    try {
      const [quotation] = await db
        .select()
        .from(tradeQuotations)
        .where(eq(tradeQuotations.id, id))
        .limit(1);

      if (!quotation) {
        return null;
      }

      const items = await db
        .select()
        .from(tradeQuotationItems)
        .where(eq(tradeQuotationItems.quotationId, id))
        .orderBy(tradeQuotationItems.lineNumber);

      return { ...quotation, items };
    } catch (error: any) {
      logger.error("[QuotationService] Failed to get quotation", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  /**
   * List quotations for a seller with optional filters
   */
  async listQuotations(
    sellerId: string,
    filters: ListQuotationsFilters = {}
  ): Promise<{ quotations: TradeQuotation[]; total: number }> {
    try {
      const { status, buyerEmail, limit = 50, offset = 0 } = filters;

      // Build where conditions
      const conditions = [eq(tradeQuotations.sellerId, sellerId)];
      
      if (status) {
        conditions.push(eq(tradeQuotations.status, status));
      }
      
      if (buyerEmail) {
        conditions.push(eq(tradeQuotations.buyerEmail, buyerEmail));
      }

      // Get quotations
      const quotations = await db
        .select()
        .from(tradeQuotations)
        .where(and(...conditions))
        .orderBy(desc(tradeQuotations.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tradeQuotations)
        .where(and(...conditions));

      return { quotations, total: Number(count) };
    } catch (error: any) {
      logger.error("[QuotationService] Failed to list quotations", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Update a draft quotation
   */
  async updateQuotation(
    id: string,
    sellerId: string,
    data: UpdateQuotationData
  ): Promise<QuotationWithItems> {
    try {
      // Validate ownership
      await this.validateSellerOwnership(id, sellerId);

      // Get existing quotation
      const existing = await this.getQuotation(id);
      if (!existing) {
        throw new Error("Quotation not found");
      }

      // Can only update drafts
      if (existing.status !== "draft") {
        throw new Error("Can only update quotations in draft status");
      }

      // Update quotation in transaction
      const quotation = await db.transaction(async (tx) => {
        // If items are being updated, recalculate totals
        if (data.items && data.items.length > 0) {
          // Delete existing items
          await tx
            .delete(tradeQuotationItems)
            .where(eq(tradeQuotationItems.quotationId, id));

          // Calculate line totals
          const itemsWithTotals = data.items.map((item, index) => ({
            ...item,
            lineNumber: index + 1,
            lineTotal: this.calculateLineTotal(
              item.unitPrice,
              item.quantity,
              item.taxRate,
              item.shippingCost
            ),
          }));

          // Calculate quotation totals
          const totals = this.calculateQuotationTotals(itemsWithTotals);

          // Calculate deposit and balance
          const depositPercentage = data.depositPercentage || existing.depositPercentage;
          const { depositAmount, balanceAmount } = this.calculateDepositAndBalance(
            totals.total,
            depositPercentage
          );

          // Update quotation with new totals
          const [updated] = await tx
            .update(tradeQuotations)
            .set({
              buyerEmail: data.buyerEmail || existing.buyerEmail,
              buyerId: data.buyerId !== undefined ? data.buyerId : existing.buyerId,
              subtotal: totals.subtotal.toFixed(2),
              taxAmount: totals.taxAmount.toFixed(2),
              shippingAmount: totals.shippingAmount.toFixed(2),
              total: totals.total.toFixed(2),
              depositAmount: depositAmount.toFixed(2),
              depositPercentage,
              balanceAmount: balanceAmount.toFixed(2),
              validUntil: data.validUntil !== undefined ? data.validUntil : existing.validUntil,
              metadata: data.metadata !== undefined ? data.metadata : existing.metadata,
              updatedAt: new Date(),
            })
            .where(eq(tradeQuotations.id, id))
            .returning();

          // Insert new items
          const items = await tx.insert(tradeQuotationItems).values(
            itemsWithTotals.map((item) => ({
              quotationId: id,
              lineNumber: item.lineNumber,
              description: item.description,
              productId: item.productId || null,
              unitPrice: item.unitPrice.toFixed(2),
              quantity: item.quantity,
              taxRate: item.taxRate?.toFixed(2) || null,
              shippingCost: item.shippingCost?.toFixed(2) || null,
              lineTotal: item.lineTotal.toFixed(2),
            }))
          ).returning();

          return { ...updated, items };
        } else {
          // Update quotation metadata only
          const [updated] = await tx
            .update(tradeQuotations)
            .set({
              buyerEmail: data.buyerEmail || existing.buyerEmail,
              buyerId: data.buyerId !== undefined ? data.buyerId : existing.buyerId,
              depositPercentage: data.depositPercentage || existing.depositPercentage,
              validUntil: data.validUntil !== undefined ? data.validUntil : existing.validUntil,
              metadata: data.metadata !== undefined ? data.metadata : existing.metadata,
              updatedAt: new Date(),
            })
            .where(eq(tradeQuotations.id, id))
            .returning();

          return { ...updated, items: existing.items };
        }
      });

      logger.info("[QuotationService] Quotation updated", {
        quotationId: id,
        sellerId,
      });

      return quotation;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to update quotation", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  /**
   * Delete a draft quotation
   */
  async deleteQuotation(id: string, sellerId: string): Promise<void> {
    try {
      // Validate ownership
      await this.validateSellerOwnership(id, sellerId);

      // Get quotation
      const quotation = await this.getQuotation(id);
      if (!quotation) {
        throw new Error("Quotation not found");
      }

      // Can only delete drafts
      if (quotation.status !== "draft") {
        throw new Error("Can only delete quotations in draft status");
      }

      // Delete in transaction
      await db.transaction(async (tx) => {
        // Delete items
        await tx
          .delete(tradeQuotationItems)
          .where(eq(tradeQuotationItems.quotationId, id));

        // Delete events
        await tx
          .delete(tradeQuotationEvents)
          .where(eq(tradeQuotationEvents.quotationId, id));

        // Delete quotation
        await tx
          .delete(tradeQuotations)
          .where(eq(tradeQuotations.id, id));
      });

      logger.info("[QuotationService] Quotation deleted", {
        quotationId: id,
        sellerId,
      });
    } catch (error: any) {
      logger.error("[QuotationService] Failed to delete quotation", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  // ==========================================================================
  // Pricing Calculations (Server-Side)
  // ==========================================================================

  /**
   * Calculate line total for a single item
   */
  calculateLineTotal(
    unitPrice: number,
    quantity: number,
    taxRate?: number,
    shippingCost?: number
  ): number {
    const subtotal = unitPrice * quantity;
    const tax = taxRate ? subtotal * (taxRate / 100) : 0;
    const shipping = shippingCost || 0;
    return subtotal + tax + shipping;
  }

  /**
   * Calculate quotation totals from items
   */
  calculateQuotationTotals(items: Array<{
    unitPrice: number;
    quantity: number;
    taxRate?: number;
    shippingCost?: number;
  }>): {
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    total: number;
  } {
    let subtotal = 0;
    let taxAmount = 0;
    let shippingAmount = 0;

    for (const item of items) {
      const itemSubtotal = item.unitPrice * item.quantity;
      subtotal += itemSubtotal;

      if (item.taxRate) {
        taxAmount += itemSubtotal * (item.taxRate / 100);
      }

      if (item.shippingCost) {
        shippingAmount += item.shippingCost;
      }
    }

    const total = subtotal + taxAmount + shippingAmount;

    return {
      subtotal,
      taxAmount,
      shippingAmount,
      total,
    };
  }

  /**
   * Calculate deposit and balance amounts
   */
  calculateDepositAndBalance(
    total: number,
    depositPercentage: number
  ): {
    depositAmount: number;
    balanceAmount: number;
  } {
    if (depositPercentage < 0 || depositPercentage > 100) {
      throw new Error("Deposit percentage must be between 0 and 100");
    }

    const depositAmount = (total * depositPercentage) / 100;
    const balanceAmount = total - depositAmount;

    return {
      depositAmount,
      balanceAmount,
    };
  }

  /**
   * Recalculate quotation totals when items change
   */
  async recalculateQuotation(quotationId: string): Promise<void> {
    try {
      const quotation = await this.getQuotation(quotationId);
      if (!quotation) {
        throw new Error("Quotation not found");
      }

      // Recalculate totals from items
      const totals = this.calculateQuotationTotals(
        quotation.items.map((item) => ({
          unitPrice: Number(item.unitPrice),
          quantity: item.quantity,
          taxRate: item.taxRate ? Number(item.taxRate) : undefined,
          shippingCost: item.shippingCost ? Number(item.shippingCost) : undefined,
        }))
      );

      // Recalculate deposit and balance
      const { depositAmount, balanceAmount } = this.calculateDepositAndBalance(
        totals.total,
        quotation.depositPercentage
      );

      // Update quotation
      await db
        .update(tradeQuotations)
        .set({
          subtotal: totals.subtotal.toFixed(2),
          taxAmount: totals.taxAmount.toFixed(2),
          shippingAmount: totals.shippingAmount.toFixed(2),
          total: totals.total.toFixed(2),
          depositAmount: depositAmount.toFixed(2),
          balanceAmount: balanceAmount.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(tradeQuotations.id, quotationId));

      logger.info("[QuotationService] Quotation recalculated", {
        quotationId,
      });
    } catch (error: any) {
      logger.error("[QuotationService] Failed to recalculate quotation", {
        error: error.message,
        quotationId,
      });
      throw error;
    }
  }

  // ==========================================================================
  // Status Transitions (State Machine)
  // ==========================================================================

  /**
   * Send quotation to buyer (draft → sent)
   */
  async sendQuotation(id: string, sellerId: string): Promise<TradeQuotation> {
    try {
      await this.validateSellerOwnership(id, sellerId);

      const quotation = await this.getQuotation(id);
      if (!quotation) {
        throw new Error("Quotation not found");
      }

      // Validate can be sent
      this.validateQuotationForSending(quotation);

      // Validate transition
      this.validateStatusTransition(quotation.status, "sent");

      // Update status in transaction
      const [updated] = await db.transaction(async (tx) => {
        const [result] = await tx
          .update(tradeQuotations)
          .set({ status: "sent", updatedAt: new Date() })
          .where(eq(tradeQuotations.id, id))
          .returning();

        await this.logEvent(tx, id, "sent", sellerId, {
          buyerEmail: quotation.buyerEmail,
        });

        return [result];
      });

      logger.info("[QuotationService] Quotation sent", {
        quotationId: id,
        buyerEmail: quotation.buyerEmail,
      });

      return updated;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to send quotation", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  /**
   * Mark quotation as viewed (sent → viewed)
   */
  async markViewed(id: string, viewedBy: string): Promise<TradeQuotation> {
    try {
      const quotation = await this.getQuotation(id);
      if (!quotation) {
        throw new Error("Quotation not found");
      }

      // Validate transition
      this.validateStatusTransition(quotation.status, "viewed");

      // Update status in transaction
      const [updated] = await db.transaction(async (tx) => {
        const [result] = await tx
          .update(tradeQuotations)
          .set({ status: "viewed", updatedAt: new Date() })
          .where(eq(tradeQuotations.id, id))
          .returning();

        await this.logEvent(tx, id, "viewed", viewedBy, {
          viewedAt: new Date().toISOString(),
        });

        return [result];
      });

      logger.info("[QuotationService] Quotation viewed", {
        quotationId: id,
        viewedBy,
      });

      return updated;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to mark quotation as viewed", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  /**
   * Accept quotation (viewed → accepted)
   */
  async acceptQuotation(id: string, buyerId?: string): Promise<TradeQuotation> {
    try {
      const quotation = await this.getQuotation(id);
      if (!quotation) {
        throw new Error("Quotation not found");
      }

      // Validate not expired
      this.validateNotExpired(quotation);

      // Validate transition
      this.validateStatusTransition(quotation.status, "accepted");

      // Update status in transaction
      const [updated] = await db.transaction(async (tx) => {
        const updateData: any = {
          status: "accepted",
          updatedAt: new Date(),
        };

        if (buyerId) {
          updateData.buyerId = buyerId;
        }

        const [result] = await tx
          .update(tradeQuotations)
          .set(updateData)
          .where(eq(tradeQuotations.id, id))
          .returning();

        await this.logEvent(tx, id, "accepted", buyerId || quotation.buyerEmail, {
          acceptedAt: new Date().toISOString(),
        });

        return [result];
      });

      logger.info("[QuotationService] Quotation accepted", {
        quotationId: id,
        buyerId: buyerId || quotation.buyerEmail,
      });

      return updated;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to accept quotation", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  /**
   * Mark deposit as paid (accepted → deposit_paid)
   */
  async markDepositPaid(
    id: string,
    paymentIntentId: string,
    paidBy: string
  ): Promise<TradeQuotation> {
    try {
      const quotation = await this.getQuotation(id);
      if (!quotation) {
        throw new Error("Quotation not found");
      }

      // Validate transition
      this.validateStatusTransition(quotation.status, "deposit_paid");

      // Update status and create payment schedule in transaction
      const [updated] = await db.transaction(async (tx) => {
        const [result] = await tx
          .update(tradeQuotations)
          .set({ status: "deposit_paid", updatedAt: new Date() })
          .where(eq(tradeQuotations.id, id))
          .returning();

        // Create/update payment schedule for deposit
        await tx
          .insert(tradePaymentSchedules)
          .values({
            quotationId: id,
            paymentType: "deposit",
            amount: quotation.depositAmount,
            status: "paid",
            stripePaymentIntentId: paymentIntentId,
            paidAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [tradePaymentSchedules.quotationId, tradePaymentSchedules.paymentType],
            set: {
              status: "paid",
              stripePaymentIntentId: paymentIntentId,
              paidAt: new Date(),
              updatedAt: new Date(),
            },
          });

        await this.logEvent(tx, id, "deposit_paid", paidBy, {
          paymentIntentId,
          amount: quotation.depositAmount,
        });

        return [result];
      });

      logger.info("[QuotationService] Deposit paid", {
        quotationId: id,
        paymentIntentId,
      });

      return updated;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to mark deposit as paid", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  /**
   * Mark balance as due (deposit_paid → balance_due)
   */
  async markBalanceDue(id: string, sellerId: string, dueDate?: Date): Promise<TradeQuotation> {
    try {
      await this.validateSellerOwnership(id, sellerId);

      const quotation = await this.getQuotation(id);
      if (!quotation) {
        throw new Error("Quotation not found");
      }

      // Validate transition
      this.validateStatusTransition(quotation.status, "balance_due");

      // Update status and create payment schedule in transaction
      const [updated] = await db.transaction(async (tx) => {
        const [result] = await tx
          .update(tradeQuotations)
          .set({ status: "balance_due", updatedAt: new Date() })
          .where(eq(tradeQuotations.id, id))
          .returning();

        // Create payment schedule for balance
        await tx.insert(tradePaymentSchedules).values({
          quotationId: id,
          paymentType: "balance",
          amount: quotation.balanceAmount,
          dueDate: dueDate || null,
          status: "pending",
        });

        await this.logEvent(tx, id, "balance_paid", sellerId, {
          dueDate: dueDate ? dueDate.toISOString() : null,
          amount: quotation.balanceAmount,
        });

        return [result];
      });

      logger.info("[QuotationService] Balance marked as due", {
        quotationId: id,
        dueDate: dueDate ? dueDate.toISOString() : undefined,
      });

      return updated;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to mark balance as due", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  /**
   * Mark balance as fully paid (balance_due → fully_paid)
   */
  async markFullyPaid(
    id: string,
    paymentIntentId: string,
    paidBy: string
  ): Promise<TradeQuotation> {
    try {
      const quotation = await this.getQuotation(id);
      if (!quotation) {
        throw new Error("Quotation not found");
      }

      // Validate transition
      this.validateStatusTransition(quotation.status, "fully_paid");

      // Update status and payment schedule in transaction
      const [updated] = await db.transaction(async (tx) => {
        const [result] = await tx
          .update(tradeQuotations)
          .set({ status: "fully_paid", updatedAt: new Date() })
          .where(eq(tradeQuotations.id, id))
          .returning();

        // Update balance payment schedule
        await tx
          .update(tradePaymentSchedules)
          .set({
            status: "paid",
            stripePaymentIntentId: paymentIntentId,
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(tradePaymentSchedules.quotationId, id),
              eq(tradePaymentSchedules.paymentType, "balance")
            )
          );

        await this.logEvent(tx, id, "balance_paid", paidBy, {
          paymentIntentId,
          amount: quotation.balanceAmount,
        });

        return [result];
      });

      logger.info("[QuotationService] Fully paid", {
        quotationId: id,
        paymentIntentId,
      });

      return updated;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to mark as fully paid", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  /**
   * Mark quotation as completed (fully_paid → completed)
   */
  async markCompleted(id: string, sellerId: string): Promise<TradeQuotation> {
    try {
      await this.validateSellerOwnership(id, sellerId);

      const quotation = await this.getQuotation(id);
      if (!quotation) {
        throw new Error("Quotation not found");
      }

      // Validate transition
      this.validateStatusTransition(quotation.status, "completed");

      // Update status
      const [updated] = await db
        .update(tradeQuotations)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(tradeQuotations.id, id))
        .returning();

      logger.info("[QuotationService] Quotation completed", {
        quotationId: id,
      });

      return updated;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to mark as completed", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  /**
   * Cancel quotation (any → cancelled)
   */
  async cancelQuotation(
    id: string,
    cancelledBy: string,
    reason?: string
  ): Promise<TradeQuotation> {
    try {
      const quotation = await this.getQuotation(id);
      if (!quotation) {
        throw new Error("Quotation not found");
      }

      // Validate transition
      this.validateStatusTransition(quotation.status, "cancelled");

      // Update status in transaction
      const [updated] = await db.transaction(async (tx) => {
        const [result] = await tx
          .update(tradeQuotations)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(tradeQuotations.id, id))
          .returning();

        await this.logEvent(tx, id, "cancelled", cancelledBy, {
          reason,
          previousStatus: quotation.status,
        });

        return [result];
      });

      logger.info("[QuotationService] Quotation cancelled", {
        quotationId: id,
        reason,
      });

      return updated;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to cancel quotation", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  /**
   * Mark quotation as expired (sent/viewed → expired)
   * Called by cron job
   */
  async markExpired(id: string): Promise<TradeQuotation> {
    try {
      const quotation = await this.getQuotation(id);
      if (!quotation) {
        throw new Error("Quotation not found");
      }

      // Validate transition
      this.validateStatusTransition(quotation.status, "expired");

      // Validate is actually expired
      if (!quotation.validUntil) {
        throw new Error("Quotation does not have a valid until date");
      }
      
      const validUntilDate = quotation.validUntil;
      if (validUntilDate > new Date()) {
        throw new Error("Quotation is not expired yet");
      }

      // Update status in transaction
      const [updated] = await db.transaction(async (tx) => {
        const [result] = await tx
          .update(tradeQuotations)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(tradeQuotations.id, id))
          .returning();

        await this.logEvent(tx, id, "expired", "system", {
          validUntil: validUntilDate.toISOString(),
        });

        return [result];
      });

      logger.info("[QuotationService] Quotation expired", {
        quotationId: id,
      });

      return updated;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to mark as expired", {
        error: error.message,
        quotationId: id,
      });
      throw error;
    }
  }

  // ==========================================================================
  // Validation Logic
  // ==========================================================================

  /**
   * Validate quotation can be sent to buyer
   */
  validateQuotationForSending(quotation: QuotationWithItems): void {
    // Must have items
    if (!quotation.items || quotation.items.length === 0) {
      throw new Error("Cannot send quotation without items");
    }

    // Must have valid total
    if (Number(quotation.total) <= 0) {
      throw new Error("Cannot send quotation with zero or negative total");
    }

    // Must have valid buyer email
    const emailSchema = z.string().email();
    const emailValidation = emailSchema.safeParse(quotation.buyerEmail);
    if (!emailValidation.success) {
      throw new Error("Invalid buyer email address");
    }
  }

  /**
   * Validate quotation is not expired
   */
  validateNotExpired(quotation: TradeQuotation): void {
    if (quotation.validUntil && quotation.validUntil < new Date()) {
      throw new Error("Quotation has expired");
    }
  }

  /**
   * Validate status transition is allowed
   */
  validateStatusTransition(from: TradeQuotationStatus, to: TradeQuotationStatus): void {
    const allowedTransitions = VALID_TRANSITIONS[from];
    if (!allowedTransitions.includes(to)) {
      throw new Error(
        `Invalid status transition from '${from}' to '${to}'. Allowed: ${allowedTransitions.join(", ")}`
      );
    }
  }

  /**
   * Validate seller owns the quotation
   */
  async validateSellerOwnership(quotationId: string, sellerId: string): Promise<void> {
    const [quotation] = await db
      .select()
      .from(tradeQuotations)
      .where(eq(tradeQuotations.id, quotationId))
      .limit(1);

    if (!quotation) {
      throw new Error("Quotation not found");
    }

    if (quotation.sellerId !== sellerId) {
      throw new Error("Unauthorized: You do not own this quotation");
    }
  }

  // ==========================================================================
  // Event Logging
  // ==========================================================================

  /**
   * Log an event for audit trail
   */
  private async logEvent(
    tx: any,
    quotationId: string,
    eventType: TradeQuotationEventType,
    performedBy: string,
    payload?: any
  ): Promise<void> {
    await tx.insert(tradeQuotationEvents).values({
      quotationId,
      eventType,
      performedBy,
      payload: payload || null,
    });
  }

  /**
   * Get events for a quotation
   */
  async getQuotationEvents(quotationId: string): Promise<TradeQuotationEvent[]> {
    try {
      const events = await db
        .select()
        .from(tradeQuotationEvents)
        .where(eq(tradeQuotationEvents.quotationId, quotationId))
        .orderBy(desc(tradeQuotationEvents.createdAt));

      return events;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to get quotation events", {
        error: error.message,
        quotationId,
      });
      throw error;
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Generate unique quotation number in Q-YYYY-NNN format
   */
  private async generateQuotationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `Q-${year}-`;

    // Get the last quotation number for this year
    const [lastQuotation] = await db
      .select()
      .from(tradeQuotations)
      .where(sql`${tradeQuotations.quotationNumber} LIKE ${prefix + '%'}`)
      .orderBy(desc(tradeQuotations.quotationNumber))
      .limit(1);

    let nextNumber = 1;
    if (lastQuotation) {
      const lastNumber = parseInt(lastQuotation.quotationNumber.split("-")[2]);
      nextNumber = lastNumber + 1;
    }

    const quotationNumber = `${prefix}${String(nextNumber).padStart(3, "0")}`;
    return quotationNumber;
  }

  /**
   * Get payment schedules for a quotation
   */
  async getPaymentSchedules(quotationId: string): Promise<TradePaymentSchedule[]> {
    try {
      const schedules = await db
        .select()
        .from(tradePaymentSchedules)
        .where(eq(tradePaymentSchedules.quotationId, quotationId))
        .orderBy(tradePaymentSchedules.paymentType);

      return schedules;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to get payment schedules", {
        error: error.message,
        quotationId,
      });
      throw error;
    }
  }

  /**
   * Find quotations that are expired and need to be marked
   * Used by cron job
   */
  async findExpiredQuotations(): Promise<TradeQuotation[]> {
    try {
      const now = new Date();
      const quotations = await db
        .select()
        .from(tradeQuotations)
        .where(
          and(
            inArray(tradeQuotations.status, ["sent", "viewed"]),
            sql`${tradeQuotations.validUntil} < ${now}`
          )
        );

      return quotations;
    } catch (error: any) {
      logger.error("[QuotationService] Failed to find expired quotations", {
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const quotationService = new QuotationService();
