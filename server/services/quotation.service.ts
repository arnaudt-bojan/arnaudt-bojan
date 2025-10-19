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
import { logger } from "../logger";
import { z } from "zod";
import { prisma } from "../prisma";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CreateQuotationData {
  quotationNumber?: string;
  buyerEmail: string;
  buyerId?: string;
  currency?: string;
  depositPercentage?: number;
  validUntil?: Date;
  deliveryTerms?: string;
  dataSheetUrl?: string;
  termsAndConditionsUrl?: string;
  taxAmount?: number;
  shippingAmount?: number;
  metadata?: any;
  items: Array<{
    description: string;
    productId?: string;
    unitPrice: number;
    quantity: number;
  }>;
}

export interface UpdateQuotationData {
  quotationNumber?: string;
  buyerEmail?: string;
  buyerId?: string;
  depositPercentage?: number;
  validUntil?: Date;
  deliveryTerms?: string;
  dataSheetUrl?: string;
  termsAndConditionsUrl?: string;
  taxAmount?: number;
  shippingAmount?: number;
  metadata?: any;
  items?: Array<{
    description: string;
    productId?: string;
    unitPrice: number;
    quantity: number;
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

      // Calculate line totals for all items (B2B best practice: no per-item tax/shipping)
      const itemsWithTotals = data.items.map((item, index) => ({
        ...item,
        lineNumber: index + 1,
        lineTotal: this.calculateLineTotal(item.unitPrice, item.quantity),
      }));

      // Calculate quotation totals with bottom-level tax/shipping
      const taxAmount = data.taxAmount || 0;
      const shippingAmount = data.shippingAmount || 0;
      const totals = this.calculateQuotationTotals(itemsWithTotals, taxAmount, shippingAmount);

      // Calculate deposit and balance
      const depositPercentage = data.depositPercentage || 50;
      const { depositAmount, balanceAmount } = this.calculateDepositAndBalance(
        totals.total,
        depositPercentage
      );

      // Generate or use provided quotation number
      const quotationNumber = data.quotationNumber || await this.generateQuotationNumber();

      // Create quotation and items in transaction
      const quotation = await prisma.$transaction(async (tx) => {
        // Insert quotation with new B2B fields
        const newQuotation = await tx.trade_quotations.create({
          data: {
            seller_id: sellerId,
            buyer_email: data.buyerEmail,
            buyer_id: data.buyerId || null,
            quotation_number: quotationNumber,
            currency: data.currency || "USD",
            subtotal: totals.subtotal.toFixed(2),
            tax_amount: totals.taxAmount.toFixed(2),
            shipping_amount: totals.shippingAmount.toFixed(2),
            total: totals.total.toFixed(2),
            deposit_amount: depositAmount.toFixed(2),
            deposit_percentage: depositPercentage,
            balance_amount: balanceAmount.toFixed(2),
            status: "draft",
            valid_until: data.validUntil || null,
            delivery_terms: data.deliveryTerms || null,
            data_sheet_url: data.dataSheetUrl || null,
            terms_and_conditions_url: data.termsAndConditionsUrl || null,
            metadata: data.metadata || null,
          },
        });

        // Insert items (B2B best practice: no per-item tax/shipping)
        const items = [];
        for (const item of itemsWithTotals) {
          const createdItem = await tx.trade_quotation_items.create({
            data: {
              quotation_id: newQuotation.id,
              line_number: item.lineNumber,
              description: item.description,
              product_id: item.productId || null,
              unit_price: item.unitPrice.toFixed(2),
              quantity: item.quantity,
              line_total: item.lineTotal.toFixed(2),
            },
          });
          items.push(createdItem);
        }

        // Log creation event
        await this.logEvent(
          tx,
          newQuotation.id,
          "created",
          sellerId,
          { quotationNumber, itemCount: items.length }
        );

        return { ...newQuotation, items } as any;
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
      const quotation = await prisma.trade_quotations.findFirst({
        where: { id }
      });

      if (!quotation) {
        return null;
      }

      const items = await prisma.trade_quotation_items.findMany({
        where: { quotation_id: id },
        orderBy: { line_number: 'asc' }
      });

      return { ...quotation, items } as any;
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
      const where: any = { seller_id: sellerId };
      
      if (status) {
        where.status = status;
      }
      
      if (buyerEmail) {
        where.buyer_email = buyerEmail;
      }

      // Get quotations
      const quotations = await prisma.trade_quotations.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      });

      // Get total count
      const total = await prisma.trade_quotations.count({ where });

      return { quotations: quotations as any, total };
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
      const quotation = await prisma.$transaction(async (tx) => {
        // If items are being updated, recalculate totals
        if (data.items && data.items.length > 0) {
          // Delete existing items
          await tx.trade_quotation_items.deleteMany({
            where: { quotation_id: id }
          });

          // Calculate line totals (B2B best practice: no per-item tax/shipping)
          const itemsWithTotals = data.items.map((item, index) => ({
            ...item,
            lineNumber: index + 1,
            lineTotal: this.calculateLineTotal(item.unitPrice, item.quantity),
          }));

          // Calculate quotation totals with bottom-level tax/shipping
          const taxAmount = data.taxAmount !== undefined ? data.taxAmount : Number(existing.taxAmount);
          const shippingAmount = data.shippingAmount !== undefined ? data.shippingAmount : Number(existing.shippingAmount);
          const totals = this.calculateQuotationTotals(itemsWithTotals, taxAmount, shippingAmount);

          // Calculate deposit and balance
          const depositPercentage = data.depositPercentage || existing.depositPercentage;
          const { depositAmount, balanceAmount } = this.calculateDepositAndBalance(
            totals.total,
            depositPercentage
          );

          // Update quotation with new totals and B2B fields
          const updated = await tx.trade_quotations.update({
            where: { id },
            data: {
              quotation_number: data.quotationNumber || existing.quotationNumber,
              buyer_email: data.buyerEmail || existing.buyerEmail,
              buyer_id: data.buyerId !== undefined ? data.buyerId : existing.buyerId,
              subtotal: totals.subtotal.toFixed(2),
              tax_amount: totals.taxAmount.toFixed(2),
              shipping_amount: totals.shippingAmount.toFixed(2),
              total: totals.total.toFixed(2),
              deposit_amount: depositAmount.toFixed(2),
              deposit_percentage: depositPercentage,
              balance_amount: balanceAmount.toFixed(2),
              valid_until: data.validUntil !== undefined ? data.validUntil : existing.validUntil,
              delivery_terms: data.deliveryTerms !== undefined ? data.deliveryTerms : existing.deliveryTerms,
              data_sheet_url: data.dataSheetUrl !== undefined ? data.dataSheetUrl : existing.dataSheetUrl,
              terms_and_conditions_url: data.termsAndConditionsUrl !== undefined ? data.termsAndConditionsUrl : existing.termsAndConditionsUrl,
              metadata: data.metadata !== undefined ? data.metadata : existing.metadata,
              updated_at: new Date(),
            },
          });

          // Insert new items (B2B best practice: no per-item tax/shipping)
          const items = [];
          for (const item of itemsWithTotals) {
            const createdItem = await tx.trade_quotation_items.create({
              data: {
                quotation_id: id,
                line_number: item.lineNumber,
                description: item.description,
                product_id: item.productId || null,
                unit_price: item.unitPrice.toFixed(2),
                quantity: item.quantity,
                line_total: item.lineTotal.toFixed(2),
              },
            });
            items.push(createdItem);
          }

          return { ...updated, items };
        } else {
          // Update quotation metadata only (including new B2B fields)
          const updated = await tx.trade_quotations.update({
            where: { id },
            data: {
              quotation_number: data.quotationNumber || existing.quotationNumber,
              buyer_email: data.buyerEmail || existing.buyerEmail,
              buyer_id: data.buyerId !== undefined ? data.buyerId : existing.buyerId,
              deposit_percentage: data.depositPercentage || existing.depositPercentage,
              valid_until: data.validUntil !== undefined ? data.validUntil : existing.validUntil,
              delivery_terms: data.deliveryTerms !== undefined ? data.deliveryTerms : existing.deliveryTerms,
              data_sheet_url: data.dataSheetUrl !== undefined ? data.dataSheetUrl : existing.dataSheetUrl,
              terms_and_conditions_url: data.termsAndConditionsUrl !== undefined ? data.termsAndConditionsUrl : existing.termsAndConditionsUrl,
              metadata: data.metadata !== undefined ? data.metadata : existing.metadata,
              updated_at: new Date(),
            },
          });

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
      await prisma.$transaction(async (tx) => {
        // Delete items
        await tx.trade_quotation_items.deleteMany({
          where: { quotation_id: id }
        });

        // Delete events
        await tx.trade_quotation_events.deleteMany({
          where: { quotation_id: id }
        });

        // Delete quotation
        await tx.trade_quotations.delete({
          where: { id }
        });
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
   * Calculate line total for a single item (B2B best practice: no per-item tax/shipping)
   */
  calculateLineTotal(
    unitPrice: number,
    quantity: number
  ): number {
    return unitPrice * quantity;
  }

  /**
   * Calculate quotation totals from items and bottom-level tax/shipping (B2B best practice)
   */
  calculateQuotationTotals(
    items: Array<{
      unitPrice: number;
      quantity: number;
    }>,
    taxAmount: number = 0,
    shippingAmount: number = 0
  ): {
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    total: number;
  } {
    // Calculate subtotal from items only
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);

    // Total = subtotal + bottom-level tax + bottom-level shipping
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
        }))
      );

      // Recalculate deposit and balance
      const { depositAmount, balanceAmount } = this.calculateDepositAndBalance(
        totals.total,
        quotation.depositPercentage
      );

      // Update quotation
      await prisma.trade_quotations.update({
        where: { id: quotationId },
        data: {
          subtotal: totals.subtotal.toFixed(2),
          tax_amount: totals.taxAmount.toFixed(2),
          shipping_amount: totals.shippingAmount.toFixed(2),
          total: totals.total.toFixed(2),
          deposit_amount: depositAmount.toFixed(2),
          balance_amount: balanceAmount.toFixed(2),
          updated_at: new Date(),
        },
      });

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
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.trade_quotations.update({
          where: { id },
          data: { status: "sent", updated_at: new Date() },
        });

        await this.logEvent(tx, id, "sent", sellerId, {
          buyerEmail: quotation.buyerEmail,
        });

        return result;
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
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.trade_quotations.update({
          where: { id },
          data: { status: "viewed", updated_at: new Date() },
        });

        await this.logEvent(tx, id, "viewed", viewedBy, {
          viewedAt: new Date().toISOString(),
        });

        return result;
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
      const updated = await prisma.$transaction(async (tx) => {
        const updateData: any = {
          status: "accepted",
          updated_at: new Date(),
        };

        if (buyerId) {
          updateData.buyer_id = buyerId;
        }

        const result = await tx.trade_quotations.update({
          where: { id },
          data: updateData,
        });

        await this.logEvent(tx, id, "accepted", buyerId || quotation.buyerEmail, {
          acceptedAt: new Date().toISOString(),
        });

        return result;
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
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.trade_quotations.update({
          where: { id },
          data: { status: "deposit_paid", updated_at: new Date() },
        });

        // Create/update payment schedule for deposit
        await tx.trade_payment_schedules.upsert({
          where: {
            quotation_id_payment_type: {
              quotation_id: id,
              payment_type: "deposit",
            },
          },
          create: {
            quotation_id: id,
            payment_type: "deposit",
            amount: quotation.depositAmount,
            status: "paid",
            stripe_payment_intent_id: paymentIntentId,
            paid_at: new Date(),
          },
          update: {
            status: "paid",
            stripe_payment_intent_id: paymentIntentId,
            paid_at: new Date(),
            updated_at: new Date(),
          },
        });

        await this.logEvent(tx, id, "deposit_paid", paidBy, {
          paymentIntentId,
          amount: quotation.depositAmount,
        });

        return result;
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
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.trade_quotations.update({
          where: { id },
          data: { status: "balance_due", updated_at: new Date() },
        });

        // Create payment schedule for balance
        await tx.trade_payment_schedules.create({
          data: {
            quotation_id: id,
            payment_type: "balance",
            amount: quotation.balanceAmount,
            due_date: dueDate || null,
            status: "pending",
          },
        });

        await this.logEvent(tx, id, "balance_paid", sellerId, {
          dueDate: dueDate ? dueDate.toISOString() : null,
          amount: quotation.balanceAmount,
        });

        return result;
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
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.trade_quotations.update({
          where: { id },
          data: { status: "fully_paid", updated_at: new Date() },
        });

        // Update balance payment schedule
        const balanceSchedule = await tx.trade_payment_schedules.findFirst({
          where: {
            quotation_id: id,
            payment_type: "balance",
          },
        });

        if (balanceSchedule) {
          await tx.trade_payment_schedules.update({
            where: { id: balanceSchedule.id },
            data: {
              status: "paid",
              stripe_payment_intent_id: paymentIntentId,
              paid_at: new Date(),
              updated_at: new Date(),
            },
          });
        }

        await this.logEvent(tx, id, "balance_paid", paidBy, {
          paymentIntentId,
          amount: quotation.balanceAmount,
        });

        return result;
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
      const updated = await prisma.trade_quotations.update({
        where: { id },
        data: { status: "completed", updated_at: new Date() },
      });

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
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.trade_quotations.update({
          where: { id },
          data: { status: "cancelled", updated_at: new Date() },
        });

        await this.logEvent(tx, id, "cancelled", cancelledBy, {
          reason,
          previousStatus: quotation.status,
        });

        return result;
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
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.trade_quotations.update({
          where: { id },
          data: { status: "expired", updated_at: new Date() },
        });

        await this.logEvent(tx, id, "expired", "system", {
          validUntil: validUntilDate.toISOString(),
        });

        return result;
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
    const quotation = await prisma.trade_quotations.findFirst({
      where: { id: quotationId }
    });

    if (!quotation) {
      throw new Error("Quotation not found");
    }

    if (quotation.seller_id !== sellerId) {
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
    await tx.trade_quotation_events.create({
      data: {
        quotation_id: quotationId,
        event_type: eventType,
        performed_by: performedBy,
        payload: payload || null,
      },
    });
  }

  /**
   * Get events for a quotation
   */
  async getQuotationEvents(quotationId: string): Promise<TradeQuotationEvent[]> {
    try {
      const events = await prisma.trade_quotation_events.findMany({
        where: { quotation_id: quotationId },
        orderBy: { created_at: 'desc' }
      });

      return events as any;
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
   * Generate unique quotation number in QT-YYYY-NNN format
   */
  private async generateQuotationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}-`;

    // Get the last quotation number for this year
    const lastQuotation = await prisma.trade_quotations.findFirst({
      where: {
        quotation_number: {
          startsWith: prefix
        }
      },
      orderBy: {
        quotation_number: 'desc'
      }
    });

    let nextNumber = 1;
    if (lastQuotation) {
      const lastNumber = parseInt(lastQuotation.quotation_number.split("-")[2]);
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
      const schedules = await prisma.trade_payment_schedules.findMany({
        where: { quotation_id: quotationId },
        orderBy: { payment_type: 'asc' }
      });

      return schedules as any;
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
      const quotations = await prisma.trade_quotations.findMany({
        where: {
          status: {
            in: ["sent", "viewed"]
          },
          valid_until: {
            lt: now
          }
        }
      });

      return quotations as any;
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
