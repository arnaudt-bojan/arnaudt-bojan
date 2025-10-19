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
import type { NotificationService } from '../notifications';
import type { TradePaymentSchedule, InsertTradePaymentSchedule } from '@shared/schema';
import { prisma } from '../prisma';
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
    private stripe?: Stripe,
    private notificationService?: NotificationService
  ) {}

  /**
   * Create Stripe PaymentIntent for deposit payment
   */
  async createDepositPaymentIntent(quotationId: string): Promise<CreatePaymentIntentResult> {
    try {
      if (!this.stripe) {
        return { success: false, error: 'Stripe is not configured' };
      }

      // 1. Check for existing pending deposit schedule
      const existingSchedule = await prisma.trade_payment_schedules.findFirst({
        where: {
          quotation_id: quotationId,
          payment_type: 'deposit'
        }
      });

      if (existingSchedule && existingSchedule.status === 'pending' && existingSchedule.stripe_payment_intent_id) {
        // Return existing payment intent
        const existingIntent = await this.stripe.paymentIntents.retrieve(
          existingSchedule.stripe_payment_intent_id
        );

        logger.info('[QuotationPaymentService] Returning existing deposit PaymentIntent', {
          quotationId,
          paymentIntentId: existingIntent.id,
          amount: existingSchedule.amount,
        });

        return {
          success: true,
          clientSecret: existingIntent.client_secret || undefined,
          paymentIntentId: existingIntent.id,
        };
      }

      // 2. Get quotation
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

      // 3. Get seller's Stripe account
      const seller = await this.storage.getUser(quotation.sellerId);
      if (!seller || !seller.stripeConnectedAccountId) {
        return { success: false, error: 'Seller Stripe account not found' };
      }

      // 4. Calculate amount in cents
      const amountCents = Math.round(parseFloat(quotation.depositAmount) * 100);

      // 5. Create Stripe PaymentIntent
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

      // 6. Create payment schedule record (or update if exists)
      if (existingSchedule) {
        await prisma.trade_payment_schedules.update({
          where: { id: existingSchedule.id },
          data: {
            stripe_payment_intent_id: paymentIntent.id,
            amount: quotation.depositAmount,
            due_date: new Date(),
            status: 'pending',
            updated_at: new Date(),
          },
        });
      } else {
        await prisma.trade_payment_schedules.create({
          data: {
            quotation_id: quotation.id,
            payment_type: 'deposit',
            amount: quotation.depositAmount,
            due_date: new Date(),
            status: 'pending',
            stripe_payment_intent_id: paymentIntent.id,
          },
        });
      }

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

      // 1. Check for existing pending balance schedule
      const existingSchedule = await prisma.trade_payment_schedules.findFirst({
        where: {
          quotation_id: quotationId,
          payment_type: 'balance'
        }
      });

      if (existingSchedule && existingSchedule.status === 'pending' && existingSchedule.stripe_payment_intent_id) {
        // Return existing payment intent
        const existingIntent = await this.stripe.paymentIntents.retrieve(
          existingSchedule.stripe_payment_intent_id
        );

        logger.info('[QuotationPaymentService] Returning existing balance PaymentIntent', {
          quotationId,
          paymentIntentId: existingIntent.id,
          amount: existingSchedule.amount,
        });

        return {
          success: true,
          clientSecret: existingIntent.client_secret || undefined,
          paymentIntentId: existingIntent.id,
        };
      }

      // 2. Get quotation
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

      // 3. Get seller's Stripe account
      const seller = await this.storage.getUser(quotation.sellerId);
      if (!seller || !seller.stripeConnectedAccountId) {
        return { success: false, error: 'Seller Stripe account not found' };
      }

      // 4. Calculate amount in cents
      const amountCents = Math.round(parseFloat(quotation.balanceAmount) * 100);

      // 5. Create Stripe PaymentIntent
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

      // 6. Create payment schedule record (or update if exists)
      if (existingSchedule) {
        await prisma.trade_payment_schedules.update({
          where: { id: existingSchedule.id },
          data: {
            stripe_payment_intent_id: paymentIntent.id,
            amount: quotation.balanceAmount,
            due_date: new Date(),
            status: 'pending',
            updated_at: new Date(),
          },
        });
      } else {
        await prisma.trade_payment_schedules.create({
          data: {
            quotation_id: quotation.id,
            payment_type: 'balance',
            amount: quotation.balanceAmount,
            due_date: new Date(),
            status: 'pending',
            stripe_payment_intent_id: paymentIntent.id,
          },
        });
      }

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
      // 1. Find payment schedule by stripePaymentIntentId
      const schedule = await prisma.trade_payment_schedules.findFirst({
        where: {
          stripe_payment_intent_id: paymentIntentId,
          payment_type: 'deposit'
        }
      });

      if (!schedule) {
        logger.warn('[QuotationPaymentService] Payment schedule not found for deposit webhook', {
          paymentIntentId,
        });
        return { success: false, error: 'Payment schedule not found' };
      }

      // 2. Mark schedule as paid
      await prisma.trade_payment_schedules.update({
        where: { id: schedule.id },
        data: { 
          status: 'paid',
          paid_at: new Date(),
        },
      });

      // 3. Update quotation status to deposit_paid
      await this.quotationService.markDepositPaid(schedule.quotation_id, paymentIntentId, 'system');

      // 4. Log event
      await prisma.trade_quotation_events.create({
        data: {
          quotation_id: schedule.quotation_id,
          event_type: 'deposit_paid',
          performed_by: 'system',
          payload: {
            paymentIntentId,
            amount: schedule.amount,
          },
        },
      });

      // 5. Send deposit paid email to seller (old method)
      await this.emailService.sendDepositPaidEmail(schedule.quotation_id);

      // 6. Send deposit received notifications to seller and buyer (new method)
      if (this.notificationService) {
        try {
          const quotation = await this.quotationService.getQuotation(schedule.quotation_id);
          if (quotation) {
            const seller = await this.storage.getUser(quotation.sellerId);
            if (seller) {
              await this.notificationService.sendTradeDepositReceived(
                quotation,
                seller,
                { email: quotation.buyerEmail, name: quotation.buyerName || undefined }
              );
              logger.info('[QuotationPaymentService] Trade deposit received notifications sent', {
                quotationId: schedule.quotation_id,
                sellerId: seller.id,
                buyerEmail: quotation.buyerEmail
              });
            }
          }
        } catch (notifError: any) {
          logger.error('[QuotationPaymentService] Failed to send deposit notifications', {
            error: notifError.message,
            quotationId: schedule.quotation_id
          });
        }
      }

      logger.info('[QuotationPaymentService] Deposit payment processed', {
        quotationId: schedule.quotation_id,
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
      // 1. Find payment schedule by stripePaymentIntentId
      const schedule = await prisma.trade_payment_schedules.findFirst({
        where: {
          stripe_payment_intent_id: paymentIntentId,
          payment_type: 'balance'
        }
      });

      if (!schedule) {
        logger.warn('[QuotationPaymentService] Payment schedule not found for balance webhook', {
          paymentIntentId,
        });
        return { success: false, error: 'Payment schedule not found' };
      }

      // 2. Mark schedule as paid
      await prisma.trade_payment_schedules.update({
        where: { id: schedule.id },
        data: { 
          status: 'paid',
          paid_at: new Date(),
        },
      });

      // 3. Update quotation status to fully_paid
      await this.quotationService.markFullyPaid(schedule.quotation_id, paymentIntentId, 'system');

      // 4. Log event
      await prisma.trade_quotation_events.create({
        data: {
          quotation_id: schedule.quotation_id,
          event_type: 'balance_paid',
          performed_by: 'system',
          payload: {
            paymentIntentId,
            amount: schedule.amount,
          },
        },
      });

      // 5. Send balance paid email to seller (old method)
      await this.emailService.sendBalancePaidEmail(schedule.quotation_id);

      // 6. Send balance received notifications to seller and buyer (new method)
      if (this.notificationService) {
        try {
          const quotation = await this.quotationService.getQuotation(schedule.quotation_id);
          if (quotation) {
            const seller = await this.storage.getUser(quotation.sellerId);
            if (seller) {
              await this.notificationService.sendTradeBalanceReceived(
                quotation,
                seller,
                { email: quotation.buyerEmail, name: quotation.buyerName || undefined }
              );
              logger.info('[QuotationPaymentService] Trade balance received notifications sent', {
                quotationId: schedule.quotation_id,
                sellerId: seller.id,
                buyerEmail: quotation.buyerEmail
              });
            }
          }
        } catch (notifError: any) {
          logger.error('[QuotationPaymentService] Failed to send balance notifications', {
            error: notifError.message,
            quotationId: schedule.quotation_id
          });
        }
      }

      logger.info('[QuotationPaymentService] Balance payment processed', {
        quotationId: schedule.quotation_id,
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
      const schedules = await prisma.trade_payment_schedules.findMany({
        where: {
          quotation_id: quotationId
        },
        orderBy: {
          created_at: 'asc'
        }
      });

      return schedules as any;
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
      const schedule = await prisma.trade_payment_schedules.findFirst({
        where: {
          quotation_id: quotationId,
          payment_type: 'deposit',
          status: 'paid'
        }
      });

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
      const schedule = await prisma.trade_payment_schedules.findFirst({
        where: {
          quotation_id: quotationId,
          payment_type: 'balance',
          status: 'paid'
        }
      });

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
