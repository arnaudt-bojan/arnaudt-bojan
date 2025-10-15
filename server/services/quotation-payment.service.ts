/**
 * QuotationPaymentService - Trade Quotation Payment Management (Architecture 3)
 * 
 * Handles:
 * - Stripe PaymentIntent creation for deposit/balance
 * - Payment webhook handling
 * - Payment schedule management
 * - Integration with QuotationService and StripeConnectService
 */

import type Stripe from 'stripe';
import type { IStorage } from '../storage';
import { storage } from '../storage';
import type { QuotationService } from './quotation.service';
import type { QuotationEmailService } from './quotation-email.service';
import type { StripeConnectService } from './stripe-connect.service';
import type { TradePaymentSchedule, InsertTradePaymentSchedule } from '@shared/schema';
import { tradePaymentSchedules, tradeQuotationEvents } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../logger';

// ============================================================================
// Interfaces
// ============================================================================

export interface CreatePaymentIntentResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

export interface PaymentWebhookResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// QuotationPaymentService
// ============================================================================

export class QuotationPaymentService {
  constructor(
    private storage: IStorage,
    private quotationService: QuotationService,
    private emailService: QuotationEmailService,
    private stripeConnectService: StripeConnectService,
    private stripe?: Stripe
  ) {}

  /**
   * Create Stripe PaymentIntent for deposit payment
   */
  async createDepositPaymentIntent(quotationId: string): Promise<CreatePaymentIntentResult> {
    try {
      if (!this.stripe) {
        return { success: false, error: 'Stripe is not configured' };
      }

      // 1. Get quotation
      const quotation = await this.quotationService.getQuotation(quotationId);
      if (!quotation) {
        return { success: false, error: 'Quotation not found' };
      }

      // Validate quotation status
      if (quotation.status !== 'sent' && quotation.status !== 'viewed' && quotation.status !== 'accepted') {
        return { 
          success: false, 
          error: `Cannot create deposit payment for quotation in ${quotation.status} status` 
        };
      }

      // 2. Get seller's Stripe account
      const seller = await this.storage.getUser(quotation.sellerId);
      if (!seller || !seller.stripeConnectedAccountId) {
        return { success: false, error: 'Seller Stripe account not found' };
      }

      // 3. Calculate amount in cents
      const amountCents = Math.round(parseFloat(quotation.depositAmount) * 100);

      // 4. Create Stripe PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: quotation.currency.toLowerCase(),
        application_fee_amount: 0, // No platform fee for quotations
        transfer_data: {
          destination: seller.stripeConnectedAccountId,
        },
        metadata: {
          quotationId: quotation.id,
          quotationNumber: quotation.quotationNumber,
          paymentType: 'deposit',
          buyerEmail: quotation.buyerEmail,
        },
      });

      // 5. Create payment schedule record
      const db = storage.db;
      await db.insert(tradePaymentSchedules).values({
        quotationId: quotation.id,
        paymentType: 'deposit',
        amount: quotation.depositAmount,
        dueDate: new Date(),
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
      });

      logger.info('[QuotationPaymentService] Deposit PaymentIntent created', {
        quotationId,
        paymentIntentId: paymentIntent.id,
        amount: quotation.depositAmount,
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret || undefined,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      logger.error('[QuotationPaymentService] Failed to create deposit PaymentIntent', {
        error: error.message,
        quotationId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Create Stripe PaymentIntent for balance payment
   */
  async createBalancePaymentIntent(quotationId: string): Promise<CreatePaymentIntentResult> {
    try {
      if (!this.stripe) {
        return { success: false, error: 'Stripe is not configured' };
      }

      // 1. Get quotation
      const quotation = await this.quotationService.getQuotation(quotationId);
      if (!quotation) {
        return { success: false, error: 'Quotation not found' };
      }

      // Validate quotation status
      if (quotation.status !== 'deposit_paid' && quotation.status !== 'balance_due') {
        return { 
          success: false, 
          error: `Cannot create balance payment for quotation in ${quotation.status} status` 
        };
      }

      // 2. Get seller's Stripe account
      const seller = await this.storage.getUser(quotation.sellerId);
      if (!seller || !seller.stripeConnectedAccountId) {
        return { success: false, error: 'Seller Stripe account not found' };
      }

      // 3. Calculate amount in cents
      const amountCents = Math.round(parseFloat(quotation.balanceAmount) * 100);

      // 4. Create Stripe PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: quotation.currency.toLowerCase(),
        application_fee_amount: 0, // No platform fee for quotations
        transfer_data: {
          destination: seller.stripeConnectedAccountId,
        },
        metadata: {
          quotationId: quotation.id,
          quotationNumber: quotation.quotationNumber,
          paymentType: 'balance',
          buyerEmail: quotation.buyerEmail,
        },
      });

      // 5. Create payment schedule record
      const db = storage.db;
      await db.insert(tradePaymentSchedules).values({
        quotationId: quotation.id,
        paymentType: 'balance',
        amount: quotation.balanceAmount,
        dueDate: new Date(),
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
      });

      logger.info('[QuotationPaymentService] Balance PaymentIntent created', {
        quotationId,
        paymentIntentId: paymentIntent.id,
        amount: quotation.balanceAmount,
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret || undefined,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      logger.error('[QuotationPaymentService] Failed to create balance PaymentIntent', {
        error: error.message,
        quotationId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle deposit payment webhook (payment_intent.succeeded)
   */
  async handleDepositPaidWebhook(paymentIntentId: string): Promise<PaymentWebhookResult> {
    try {
      const db = storage.db;

      // 1. Find payment schedule by stripePaymentIntentId
      const [schedule] = await db
        .select()
        .from(tradePaymentSchedules)
        .where(
          and(
            eq(tradePaymentSchedules.stripePaymentIntentId, paymentIntentId),
            eq(tradePaymentSchedules.paymentType, 'deposit')
          )
        )
        .limit(1);

      if (!schedule) {
        logger.warn('[QuotationPaymentService] Payment schedule not found for deposit webhook', {
          paymentIntentId,
        });
        return { success: false, error: 'Payment schedule not found' };
      }

      // 2. Mark schedule as paid
      await db
        .update(tradePaymentSchedules)
        .set({ 
          status: 'paid',
          paidAt: new Date(),
        })
        .where(eq(tradePaymentSchedules.id, schedule.id));

      // 3. Update quotation status to deposit_paid
      await this.quotationService.markDepositPaid(schedule.quotationId, paymentIntentId, 'system');

      // 4. Log event
      await db.insert(tradeQuotationEvents).values({
        quotationId: schedule.quotationId,
        eventType: 'deposit_paid',
        performedBy: 'system',
        payload: {
          paymentIntentId,
          amount: schedule.amount,
        },
      });

      // 5. Send deposit paid email to seller
      await this.emailService.sendDepositPaidEmail(schedule.quotationId);

      logger.info('[QuotationPaymentService] Deposit payment processed', {
        quotationId: schedule.quotationId,
        paymentIntentId,
        amount: schedule.amount,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('[QuotationPaymentService] Failed to handle deposit paid webhook', {
        error: error.message,
        paymentIntentId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle balance payment webhook (payment_intent.succeeded)
   */
  async handleBalancePaidWebhook(paymentIntentId: string): Promise<PaymentWebhookResult> {
    try {
      const db = storage.db;

      // 1. Find payment schedule by stripePaymentIntentId
      const [schedule] = await db
        .select()
        .from(tradePaymentSchedules)
        .where(
          and(
            eq(tradePaymentSchedules.stripePaymentIntentId, paymentIntentId),
            eq(tradePaymentSchedules.paymentType, 'balance')
          )
        )
        .limit(1);

      if (!schedule) {
        logger.warn('[QuotationPaymentService] Payment schedule not found for balance webhook', {
          paymentIntentId,
        });
        return { success: false, error: 'Payment schedule not found' };
      }

      // 2. Mark schedule as paid
      await db
        .update(tradePaymentSchedules)
        .set({ 
          status: 'paid',
          paidAt: new Date(),
        })
        .where(eq(tradePaymentSchedules.id, schedule.id));

      // 3. Update quotation status to fully_paid
      await this.quotationService.markFullyPaid(schedule.quotationId, paymentIntentId, 'system');

      // 4. Log event
      await db.insert(tradeQuotationEvents).values({
        quotationId: schedule.quotationId,
        eventType: 'balance_paid',
        performedBy: 'system',
        payload: {
          paymentIntentId,
          amount: schedule.amount,
        },
      });

      // 5. Send balance paid email to seller
      await this.emailService.sendBalancePaidEmail(schedule.quotationId);

      logger.info('[QuotationPaymentService] Balance payment processed', {
        quotationId: schedule.quotationId,
        paymentIntentId,
        amount: schedule.amount,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('[QuotationPaymentService] Failed to handle balance paid webhook', {
        error: error.message,
        paymentIntentId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment schedules for a quotation
   */
  async getPaymentSchedules(quotationId: string): Promise<TradePaymentSchedule[]> {
    try {
      const db = storage.db;

      const schedules = await db
        .select()
        .from(tradePaymentSchedules)
        .where(eq(tradePaymentSchedules.quotationId, quotationId))
        .orderBy(tradePaymentSchedules.createdAt);

      return schedules;
    } catch (error: any) {
      logger.error('[QuotationPaymentService] Failed to get payment schedules', {
        error: error.message,
        quotationId,
      });
      return [];
    }
  }

  /**
   * Check if deposit has been paid
   */
  async isDepositPaid(quotationId: string): Promise<boolean> {
    try {
      const db = storage.db;

      const [schedule] = await db
        .select()
        .from(tradePaymentSchedules)
        .where(
          and(
            eq(tradePaymentSchedules.quotationId, quotationId),
            eq(tradePaymentSchedules.paymentType, 'deposit'),
            eq(tradePaymentSchedules.status, 'paid')
          )
        )
        .limit(1);

      return !!schedule;
    } catch (error: any) {
      logger.error('[QuotationPaymentService] Failed to check deposit status', {
        error: error.message,
        quotationId,
      });
      return false;
    }
  }

  /**
   * Check if balance has been paid
   */
  async isBalancePaid(quotationId: string): Promise<boolean> {
    try {
      const db = storage.db;

      const [schedule] = await db
        .select()
        .from(tradePaymentSchedules)
        .where(
          and(
            eq(tradePaymentSchedules.quotationId, quotationId),
            eq(tradePaymentSchedules.paymentType, 'balance'),
            eq(tradePaymentSchedules.status, 'paid')
          )
        )
        .limit(1);

      return !!schedule;
    } catch (error: any) {
      logger.error('[QuotationPaymentService] Failed to check balance status', {
        error: error.message,
        quotationId,
      });
      return false;
    }
  }
}
