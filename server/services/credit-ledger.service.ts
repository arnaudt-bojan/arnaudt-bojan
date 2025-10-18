/**
 * Credit Ledger Service
 * 
 * Manages seller credit ledger for label purchases and refunds.
 * This is the unified wallet system shared with Meta Ads.
 * 
 * Responsibilities:
 * - Calculate seller balance from ledger transactions
 * - Create debit entries for label purchases
 * - Create credit entries for label refunds
 * - Atomic balance tracking with running balance
 */

import type { IStorage } from "../storage";
import { logger } from "../logger";

export class CreditLedgerService {
  constructor(private storage: IStorage) {}

  /**
   * Get seller's current wallet balance by summing all ledger entries.
   * 
   * Balance calculation:
   * - Credits (positive): label refunds, manual credits, settlement fixes
   * - Debits (negative): label purchases
   * 
   * @param sellerId - Seller's user ID
   * @returns Current balance in USD
   */
  async getSellerBalance(sellerId: string): Promise<number> {
    try {
      const ledgerEntries = await this.storage.getSellerCreditLedgersBySellerId(sellerId);
      
      // If no entries, balance is 0
      if (ledgerEntries.length === 0) {
        return 0;
      }

      // Most recent entry has the running balance
      const latestEntry = ledgerEntries[0];
      const balance = parseFloat(latestEntry.balanceAfter);
      
      logger.info('[CreditLedgerService] Retrieved seller balance', {
        sellerId,
        balance,
        totalEntries: ledgerEntries.length
      });

      return balance;
    } catch (error: any) {
      logger.error('[CreditLedgerService] Failed to get seller balance', {
        sellerId,
        error: error.message
      });
      throw new Error('Failed to retrieve wallet balance');
    }
  }

  /**
   * Debit seller's wallet for label purchase.
   * 
   * Creates a debit entry in the ledger with running balance calculation.
   * This is called BEFORE the Shippo API call to ensure funds are available.
   * 
   * @param sellerId - Seller's user ID
   * @param amount - Amount to debit in USD (positive number)
   * @param orderId - Order ID for traceability
   * @param labelId - Label ID for traceability
   * @returns New balance after debit
   */
  async debitLabelPurchase(
    sellerId: string,
    amount: number,
    orderId: string,
    labelId: string
  ): Promise<number> {
    try {
      // Get current balance
      const currentBalance = await this.getSellerBalance(sellerId);
      
      // Calculate new balance (debit reduces balance)
      const newBalance = currentBalance - amount;
      
      // Create debit entry
      await this.storage.createSellerCreditLedger({
        sellerId,
        labelId,
        orderId,
        type: 'debit',
        amountUsd: amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        source: 'label_purchase',
        metadata: JSON.stringify({
          note: 'Shipping label purchase',
          labelId,
          orderId,
          timestamp: new Date().toISOString()
        }),
        currency: 'USD',
        exchangeRate: null
      });

      logger.info('[CreditLedgerService] Debited seller wallet for label purchase', {
        sellerId,
        amount,
        currentBalance,
        newBalance,
        orderId,
        labelId
      });

      return newBalance;
    } catch (error: any) {
      logger.error('[CreditLedgerService] Failed to debit label purchase', {
        sellerId,
        amount,
        orderId,
        labelId,
        error: error.message
      });
      throw new Error('Failed to debit wallet for label purchase');
    }
  }

  /**
   * Credit seller's wallet for label refund.
   * 
   * Creates a credit entry in the ledger when a label is voided/refunded.
   * This restores funds to the seller's balance.
   * 
   * @param sellerId - Seller's user ID
   * @param amount - Amount to credit in USD (positive number)
   * @param labelId - Label ID for traceability
   * @param orderId - Optional order ID for traceability
   * @returns New balance after credit
   */
  async creditLabelRefund(
    sellerId: string,
    amount: number,
    labelId: string,
    orderId?: string
  ): Promise<number> {
    try {
      // Get current balance
      const currentBalance = await this.getSellerBalance(sellerId);
      
      // Calculate new balance (credit increases balance)
      const newBalance = currentBalance + amount;
      
      // Create credit entry
      await this.storage.createSellerCreditLedger({
        sellerId,
        labelId,
        orderId: orderId || null,
        type: 'credit',
        amountUsd: amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        source: 'label_refund',
        metadata: JSON.stringify({
          note: 'Shipping label refund',
          labelId,
          orderId: orderId || null,
          timestamp: new Date().toISOString()
        }),
        currency: 'USD',
        exchangeRate: null
      });

      logger.info('[CreditLedgerService] Credited seller wallet for label refund', {
        sellerId,
        amount,
        currentBalance,
        newBalance,
        labelId,
        orderId
      });

      return newBalance;
    } catch (error: any) {
      logger.error('[CreditLedgerService] Failed to credit label refund', {
        sellerId,
        amount,
        labelId,
        orderId,
        error: error.message
      });
      throw new Error('Failed to credit wallet for label refund');
    }
  }

  /**
   * Check if seller has sufficient balance for a purchase.
   * 
   * @param sellerId - Seller's user ID
   * @param requiredAmount - Amount needed in USD
   * @returns True if balance >= required amount
   */
  async hasSufficientBalance(sellerId: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getSellerBalance(sellerId);
    return balance >= requiredAmount;
  }

  /**
   * Rollback a label purchase debit (if Shippo call fails).
   * 
   * This creates a credit entry to restore the funds that were debited
   * when the purchase attempt failed.
   * 
   * @param sellerId - Seller's user ID
   * @param amount - Amount to restore in USD
   * @param labelId - Label ID for traceability
   * @param orderId - Order ID for traceability
   * @returns New balance after rollback credit
   */
  async rollbackLabelPurchase(
    sellerId: string,
    amount: number,
    labelId: string,
    orderId: string
  ): Promise<number> {
    try {
      // Get current balance
      const currentBalance = await this.getSellerBalance(sellerId);
      
      // Calculate new balance (rollback restores funds)
      const newBalance = currentBalance + amount;
      
      // Create adjustment credit entry
      await this.storage.createSellerCreditLedger({
        sellerId,
        labelId,
        orderId,
        type: 'credit',
        amountUsd: amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        source: 'manual', // Use 'manual' for rollback adjustments
        metadata: JSON.stringify({
          note: 'Label purchase rollback - Shippo API failure',
          labelId,
          orderId,
          timestamp: new Date().toISOString(),
          reason: 'Shippo transaction failed after debit'
        }),
        currency: 'USD',
        exchangeRate: null
      });

      logger.info('[CreditLedgerService] Rolled back label purchase debit', {
        sellerId,
        amount,
        currentBalance,
        newBalance,
        orderId,
        labelId
      });

      return newBalance;
    } catch (error: any) {
      logger.error('[CreditLedgerService] Failed to rollback label purchase', {
        sellerId,
        amount,
        orderId,
        labelId,
        error: error.message
      });
      throw new Error('Failed to rollback label purchase debit');
    }
  }

  /**
   * Credit seller's wallet for manual top-up (Stripe payment).
   * 
   * Creates a credit entry when seller adds funds via Stripe Checkout.
   * This is the primary way sellers add balance to their wallet.
   * 
   * @param sellerId - Seller's user ID
   * @param amount - Amount to credit in USD (positive number)
   * @param stripeSessionId - Optional Stripe session ID for traceability
   * @returns New balance after credit
   */
  async creditWalletTopup(
    sellerId: string,
    amount: number,
    stripeSessionId?: string
  ): Promise<number> {
    try {
      // Get current balance
      const currentBalance = await this.getSellerBalance(sellerId);
      
      // Calculate new balance (credit increases balance)
      const newBalance = currentBalance + amount;
      
      // Create credit entry
      await this.storage.createSellerCreditLedger({
        sellerId,
        labelId: null,
        orderId: null,
        type: 'credit',
        amountUsd: amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        source: 'manual',
        metadata: JSON.stringify({
          note: 'Wallet top-up via Stripe',
          stripeSessionId: stripeSessionId || null,
          timestamp: new Date().toISOString()
        }),
        currency: 'USD',
        exchangeRate: null
      });

      logger.info('[CreditLedgerService] Credited seller wallet for top-up', {
        sellerId,
        amount,
        currentBalance,
        newBalance,
        stripeSessionId
      });

      return newBalance;
    } catch (error: any) {
      logger.error('[CreditLedgerService] Failed to credit wallet top-up', {
        sellerId,
        amount,
        stripeSessionId,
        error: error.message
      });
      throw new Error('Failed to credit wallet for top-up');
    }
  }
}
