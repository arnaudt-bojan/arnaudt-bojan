/**
 * WholesalePaymentService - Wholesale B2B payment management
 * 
 * Follows Architecture 3: Service Layer Pattern with dependency injection
 * - Handles deposit and balance payments
 * - Stripe payment processing
 * - Payment reminders and overdue tracking
 */

import type { IStorage } from '../storage';
import type { WholesalePayment, InsertWholesalePayment } from '@shared/schema';
import { logger } from '../logger';
import type Stripe from 'stripe';
import type { NotificationService } from '../notifications';

// ============================================================================
// Interfaces
// ============================================================================

export interface CreatePaymentResult {
  success: boolean;
  payment?: WholesalePayment;
  error?: string;
  statusCode?: number;
}

export interface ProcessStripePaymentResult {
  success: boolean;
  payment?: WholesalePayment;
  error?: string;
  statusCode?: number;
}

export interface SendReminderResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

export interface CheckOverdueResult {
  success: boolean;
  overdueCount?: number;
  error?: string;
}

// ============================================================================
// WholesalePaymentService
// ============================================================================

export class WholesalePaymentService {
  constructor(
    private storage: IStorage,
    private stripe?: Stripe,
    private notificationService?: NotificationService
  ) {}

  /**
   * Create deposit payment
   * Issue 3 Fix: Validate amountCents matches order.depositAmountCents
   */
  async createDepositPayment(
    orderId: string,
    amountCents: number,
    currency: string = 'USD'
  ): Promise<CreatePaymentResult> {
    try {
      const order = await this.storage.getWholesaleOrder(orderId);

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          statusCode: 404,
        };
      }

      // Issue 3: Validate payment amount matches order deposit amount
      if (amountCents !== order.depositAmountCents) {
        logger.error('[WholesalePaymentService] Deposit amount mismatch', {
          orderId,
          paymentAmountCents: amountCents,
          orderDepositAmountCents: order.depositAmountCents,
        });
        return {
          success: false,
          error: `Payment amount (${amountCents}) does not match order deposit amount (${order.depositAmountCents})`,
          statusCode: 400,
        };
      }

      const paymentInsert: InsertWholesalePayment = {
        wholesaleOrderId: orderId,
        paymentType: 'deposit',
        status: 'pending',
        amountCents,
        currency,
      };

      const payment = await this.storage.createWholesalePayment(paymentInsert);

      if (!payment) {
        return {
          success: false,
          error: 'Failed to create payment',
          statusCode: 500,
        };
      }

      logger.info('[WholesalePaymentService] Deposit payment created', {
        paymentId: payment.id,
        orderId,
        amountCents,
      });

      return { success: true, payment };
    } catch (error: any) {
      logger.error('[WholesalePaymentService] Failed to create deposit payment', error);
      return {
        success: false,
        error: error.message || 'Failed to create payment',
        statusCode: 500,
      };
    }
  }

  /**
   * Create balance payment
   * Issue 3 Fix: Validate amountCents matches order.balanceAmountCents
   */
  async createBalancePayment(
    orderId: string,
    amountCents: number,
    dueDate?: Date,
    currency: string = 'USD'
  ): Promise<CreatePaymentResult> {
    try {
      const order = await this.storage.getWholesaleOrder(orderId);

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          statusCode: 404,
        };
      }

      // Issue 3: Validate payment amount matches order balance amount
      if (amountCents !== order.balanceAmountCents) {
        logger.error('[WholesalePaymentService] Balance amount mismatch', {
          orderId,
          paymentAmountCents: amountCents,
          orderBalanceAmountCents: order.balanceAmountCents,
        });
        return {
          success: false,
          error: `Payment amount (${amountCents}) does not match order balance amount (${order.balanceAmountCents})`,
          statusCode: 400,
        };
      }

      const paymentInsert: InsertWholesalePayment = {
        wholesaleOrderId: orderId,
        paymentType: 'balance',
        status: 'pending',
        amountCents,
        currency,
        dueDate: dueDate as any,
      };

      const payment = await this.storage.createWholesalePayment(paymentInsert);

      if (!payment) {
        return {
          success: false,
          error: 'Failed to create payment',
          statusCode: 500,
        };
      }

      logger.info('[WholesalePaymentService] Balance payment created', {
        paymentId: payment.id,
        orderId,
        amountCents,
        dueDate: dueDate?.toISOString(),
      });

      return { success: true, payment };
    } catch (error: any) {
      logger.error('[WholesalePaymentService] Failed to create balance payment', error);
      return {
        success: false,
        error: error.message || 'Failed to create payment',
        statusCode: 500,
      };
    }
  }

  /**
   * Request balance payment - mark as requested and send email
   */
  async requestBalancePayment(orderId: string): Promise<CreatePaymentResult> {
    try {
      // Get balance payment for order
      const payments = await this.storage.getWholesalePaymentsByOrderId(orderId);
      const balancePayment = payments.find((p: any) => p.paymentType === 'balance');

      if (!balancePayment) {
        return {
          success: false,
          error: 'Balance payment not found',
          statusCode: 404,
        };
      }

      // Update payment status
      const updatedPayment = await this.storage.updateWholesalePayment(balancePayment.id, {
        status: 'requested',
        requestedAt: new Date() as any,
        emailSentAt: new Date() as any,
      });

      if (!updatedPayment) {
        return {
          success: false,
          error: 'Failed to update payment',
          statusCode: 500,
        };
      }

      // TODO: Send email notification via NotificationService
      if (this.notificationService) {
        // await this.notificationService.sendBalancePaymentRequest(...)
      }

      logger.info('[WholesalePaymentService] Balance payment requested', {
        paymentId: balancePayment.id,
        orderId,
      });

      return { success: true, payment: updatedPayment };
    } catch (error: any) {
      logger.error('[WholesalePaymentService] Failed to request balance payment', error);
      return {
        success: false,
        error: error.message || 'Failed to request payment',
        statusCode: 500,
      };
    }
  }

  /**
   * Process Stripe payment
   */
  async processStripePayment(
    paymentIntentId: string,
    paymentId: string
  ): Promise<ProcessStripePaymentResult> {
    try {
      const payment = await this.storage.getWholesalePayment(paymentId);

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
          statusCode: 404,
        };
      }

      // Update payment with Stripe details
      const updatedPayment = await this.storage.updateWholesalePayment(paymentId, {
        stripePaymentIntentId: paymentIntentId,
        status: 'paid',
        paidAt: new Date() as any,
      });

      if (!updatedPayment) {
        return {
          success: false,
          error: 'Failed to update payment',
          statusCode: 500,
        };
      }

      logger.info('[WholesalePaymentService] Stripe payment processed', {
        paymentId,
        paymentIntentId,
      });

      return { success: true, payment: updatedPayment };
    } catch (error: any) {
      logger.error('[WholesalePaymentService] Failed to process Stripe payment', error);
      return {
        success: false,
        error: error.message || 'Failed to process payment',
        statusCode: 500,
      };
    }
  }

  /**
   * Mark payment as paid
   */
  async markPaymentPaid(paymentId: string): Promise<CreatePaymentResult> {
    try {
      const payment = await this.storage.getWholesalePayment(paymentId);

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
          statusCode: 404,
        };
      }

      const updatedPayment = await this.storage.updateWholesalePayment(paymentId, {
        status: 'paid',
        paidAt: new Date() as any,
      });

      if (!updatedPayment) {
        return {
          success: false,
          error: 'Failed to update payment',
          statusCode: 500,
        };
      }

      logger.info('[WholesalePaymentService] Payment marked as paid', {
        paymentId,
      });

      return { success: true, payment: updatedPayment };
    } catch (error: any) {
      logger.error('[WholesalePaymentService] Failed to mark payment as paid', error);
      return {
        success: false,
        error: error.message || 'Failed to mark payment as paid',
        statusCode: 500,
      };
    }
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminder(paymentId: string): Promise<SendReminderResult> {
    try {
      const payment = await this.storage.getWholesalePayment(paymentId);

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
          statusCode: 404,
        };
      }

      // Update last reminder timestamp
      await this.storage.updateWholesalePayment(paymentId, {
        lastReminderAt: new Date() as any,
      });

      // TODO: Send reminder email via NotificationService
      if (this.notificationService) {
        // await this.notificationService.sendPaymentReminder(...)
      }

      logger.info('[WholesalePaymentService] Payment reminder sent', {
        paymentId,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('[WholesalePaymentService] Failed to send payment reminder', error);
      return {
        success: false,
        error: error.message || 'Failed to send reminder',
        statusCode: 500,
      };
    }
  }

  /**
   * Check and mark overdue payments
   */
  /**
   * Check and mark overdue payments
   * 
   * Note: This is a placeholder implementation. In production, this should be:
   * - Run as a scheduled job/cron
   * - Query payments directly with a WHERE clause for efficiency
   * - Consider seller-specific checks for better performance
   */
  async checkOverduePayments(): Promise<CheckOverdueResult> {
    try {
      logger.info('[WholesalePaymentService] Overdue payment check called');
      
      // TODO: Implement efficient overdue payment checking
      // This requires either:
      // 1. Adding getAllWholesalePayments() to IStorage
      // 2. Adding a query to get all payments with dueDate < now
      // 3. Implementing seller-specific batch checks
      
      // For now, return success with 0 count as placeholder
      return { 
        success: true, 
        overdueCount: 0 
      };
    } catch (error: any) {
      logger.error('[WholesalePaymentService] Failed to check overdue payments', error);
      return {
        success: false,
        error: error.message || 'Failed to check overdue payments',
      };
    }
  }
}
