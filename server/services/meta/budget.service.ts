import type Stripe from 'stripe';
import type { IStorage } from '../../storage';
import type { InsertMetaCampaignFinance, MetaCampaign } from '@shared/schema';
import { logger } from '../../logger';

/**
 * Budget Service - Architecture 3
 * 
 * Manages Meta Ads budget and credit system:
 * - Credit purchases via Stripe payment intents
 * - Ad spend tracking with 20% Upfirst fee
 * - Balance monitoring and low-balance alerts
 * - Refund processing
 */

export interface PurchaseCreditParams {
  sellerId: string;
  amount: string; // Decimal string (e.g., "100.00")
  currency?: string;
  campaignId?: string; // Optional: link to specific campaign
  description?: string;
}

export interface PurchaseCreditResult {
  success: boolean;
  clientSecret?: string;
  transactionId?: string;
  error?: string;
}

export interface RecordAdSpendParams {
  campaignId: string;
  amount: string; // Decimal string (e.g., "100.00")
  metaTransactionId: string;
  description?: string;
}

export interface RecordAdSpendResult {
  success: boolean;
  adSpendTransactionId?: string;
  feeTransactionId?: string;
  error?: string;
}

export interface CreditBalance {
  sellerId: string;
  campaignId?: string;
  totalCredits: number;
  totalSpent: number;
  totalFees: number;
  balance: number;
  currency: string;
}

export interface LowBalanceCampaign {
  campaignId: string;
  campaignName: string;
  currentBalance: number;
  dailySpendRate: number;
  daysRemaining: number;
  thresholdPercent: number;
  alertLevel: 'warning' | 'critical';
}

export interface RefundResult {
  success: boolean;
  refundTransactionId?: string;
  error?: string;
}

export class BudgetService {
  constructor(
    private storage: IStorage,
    private stripe: Stripe | null
  ) {}

  /**
   * Purchase credit via Stripe payment intent
   * Creates a payment intent and records the transaction when successful
   */
  async purchaseCredit(params: PurchaseCreditParams): Promise<PurchaseCreditResult> {
    try {
      if (!this.stripe) {
        return { success: false, error: 'Stripe is not configured' };
      }

      const { sellerId, amount, currency = 'USD', campaignId, description } = params;

      // Validate seller exists
      const seller = await this.storage.getUser(sellerId);
      if (!seller) {
        return { success: false, error: 'Seller not found' };
      }

      // Validate campaign if provided
      if (campaignId) {
        const campaign = await this.storage.getMetaCampaign(campaignId);
        if (!campaign) {
          return { success: false, error: 'Campaign not found' };
        }
        if (campaign.sellerId !== sellerId) {
          return { success: false, error: 'Campaign does not belong to seller' };
        }
      }

      // Convert amount to cents for Stripe
      const amountInCents = Math.round(parseFloat(amount) * 100);

      if (amountInCents < 50) { // Stripe minimum is $0.50
        return { success: false, error: 'Amount must be at least $0.50' };
      }

      // Create Stripe payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          sellerId,
          campaignId: campaignId || '',
          paymentType: 'meta_credit_purchase',
        },
        description: description || `Meta Ads credit purchase for ${seller.email}`,
      });

      // Record the transaction (pending until payment succeeds)
      const transactionId = await this.storage.createMetaCampaignFinanceRecord({
        sellerId,
        campaignId: campaignId || null,
        transactionType: 'credit_purchase',
        amount,
        currency,
        stripePaymentIntentId: paymentIntent.id,
        description: description || 'Credit purchase',
        metadata: {
          paymentIntentStatus: paymentIntent.status,
        },
      });

      logger.info('[BudgetService] Credit purchase initiated', {
        sellerId,
        campaignId,
        amount,
        currency,
        paymentIntentId: paymentIntent.id,
        transactionId,
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret || undefined,
        transactionId,
      };
    } catch (error: any) {
      logger.error('[BudgetService] Purchase credit failed', { error, params });
      return {
        success: false,
        error: error.message || 'Failed to create payment intent',
      };
    }
  }

  /**
   * Record ad spend and calculate 20% Upfirst fee
   * Creates two transaction records: ad_spend and upfirst_fee
   */
  async recordAdSpend(params: RecordAdSpendParams): Promise<RecordAdSpendResult> {
    try {
      const { campaignId, amount, metaTransactionId, description } = params;

      // Validate campaign
      const campaign = await this.storage.getMetaCampaign(campaignId);
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      // Check for duplicate transaction
      const existingTransactions = await this.storage.getMetaCampaignFinanceByCampaign(campaignId);
      const duplicate = existingTransactions.find(
        (t) => t.metaTransactionId === metaTransactionId
      );
      if (duplicate) {
        logger.warn('[BudgetService] Duplicate ad spend transaction ignored', {
          campaignId,
          metaTransactionId,
        });
        return {
          success: true,
          adSpendTransactionId: duplicate.id,
        };
      }

      const spendAmount = parseFloat(amount);
      const feeAmount = (spendAmount * 0.20).toFixed(2); // 20% fee

      // Record ad spend (negative amount)
      const adSpendTransactionId = await this.storage.createMetaCampaignFinanceRecord({
        sellerId: campaign.sellerId,
        campaignId,
        transactionType: 'ad_spend',
        amount: `-${amount}`, // Negative for spend
        currency: 'USD',
        metaTransactionId,
        description: description || `Ad spend for ${campaign.name}`,
        metadata: {
          campaignName: campaign.name,
          feeAmount,
        },
      });

      // Record Upfirst fee (negative amount)
      const feeTransactionId = await this.storage.createMetaCampaignFinanceRecord({
        sellerId: campaign.sellerId,
        campaignId,
        transactionType: 'upfirst_fee',
        amount: `-${feeAmount}`, // Negative for fee
        currency: 'USD',
        upfirstFeeAmount: feeAmount,
        description: `20% Upfirst fee on ad spend`,
        metadata: {
          relatedAdSpendTransaction: adSpendTransactionId,
          adSpendAmount: amount,
        },
      });

      logger.info('[BudgetService] Ad spend recorded with fee', {
        campaignId,
        adSpendAmount: amount,
        feeAmount,
        adSpendTransactionId,
        feeTransactionId,
        metaTransactionId,
      });

      return {
        success: true,
        adSpendTransactionId,
        feeTransactionId,
      };
    } catch (error: any) {
      logger.error('[BudgetService] Record ad spend failed', { error, params });
      return {
        success: false,
        error: error.message || 'Failed to record ad spend',
      };
    }
  }

  /**
   * Get credit balance for seller or specific campaign
   */
  async getCreditBalance(
    sellerId: string,
    campaignId?: string
  ): Promise<CreditBalance | null> {
    try {
      // Get all transactions for seller
      let transactions = await this.storage.getMetaCampaignFinanceBySeller(sellerId);

      // Filter by campaign if specified
      if (campaignId) {
        transactions = transactions.filter((t) => t.campaignId === campaignId);
      }

      // Calculate totals
      let totalCredits = 0;
      let totalSpent = 0;
      let totalFees = 0;
      const currency = transactions[0]?.currency || 'USD';

      for (const transaction of transactions) {
        const amount = parseFloat(transaction.amount);

        switch (transaction.transactionType) {
          case 'credit_purchase':
            totalCredits += amount;
            break;
          case 'ad_spend':
            totalSpent += Math.abs(amount);
            break;
          case 'upfirst_fee':
            totalFees += Math.abs(amount);
            break;
          case 'refund':
            totalCredits += amount; // Refunds add back to credits
            break;
          case 'adjustment':
            totalCredits += amount; // Adjustments can be positive or negative
            break;
        }
      }

      const balance = totalCredits - totalSpent - totalFees;

      return {
        sellerId,
        campaignId,
        totalCredits,
        totalSpent,
        totalFees,
        balance,
        currency,
      };
    } catch (error: any) {
      logger.error('[BudgetService] Get credit balance failed', { error, sellerId, campaignId });
      return null;
    }
  }

  /**
   * Find campaigns with low balance based on spend rate
   * Returns campaigns below the specified threshold percentage
   */
  async getLowBalanceCampaigns(
    sellerId: string,
    thresholdPercent: number = 20
  ): Promise<LowBalanceCampaign[]> {
    try {
      const lowBalanceCampaigns: LowBalanceCampaign[] = [];

      // Get all active campaigns for seller
      const campaigns = await this.storage.getMetaCampaignsBySeller(sellerId);
      const activeCampaigns = campaigns.filter(
        (c) => c.status === 'active'
      );

      for (const campaign of activeCampaigns) {
        // Get campaign balance
        const balance = await this.getCreditBalance(sellerId, campaign.id);
        if (!balance) continue;

        // Calculate daily spend rate
        const dailySpendRate = await this.calculateDailySpendRate(campaign.id);
        
        if (dailySpendRate <= 0) continue; // Skip if no spend data

        // Calculate days remaining
        const daysRemaining = balance.balance > 0 
          ? balance.balance / dailySpendRate 
          : 0;

        // Calculate threshold in days (e.g., 20% of campaign duration or 7 days default)
        const campaignDurationDays = campaign.endDate 
          ? Math.ceil((new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / (1000 * 60 * 60 * 24))
          : 30; // Default 30 days if no end date

        const thresholdDays = Math.max(
          campaignDurationDays * (thresholdPercent / 100),
          1 // At least 1 day
        );

        // Check if below threshold
        if (daysRemaining <= thresholdDays) {
          lowBalanceCampaigns.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            currentBalance: balance.balance,
            dailySpendRate,
            daysRemaining: Math.max(0, daysRemaining),
            thresholdPercent,
            alertLevel: daysRemaining <= thresholdDays * 0.5 ? 'critical' : 'warning',
          });
        }
      }

      if (lowBalanceCampaigns.length > 0) {
        logger.warn('[BudgetService] Low balance campaigns detected', {
          sellerId,
          count: lowBalanceCampaigns.length,
          campaignCount: lowBalanceCampaigns.length,
        });
      }

      return lowBalanceCampaigns;
    } catch (error: any) {
      logger.error('[BudgetService] Get low balance campaigns failed', { error, sellerId });
      return [];
    }
  }

  /**
   * Calculate daily spend rate for a campaign
   * Returns average daily spend over the last 7 days (or campaign lifetime if shorter)
   */
  private async calculateDailySpendRate(campaignId: string): Promise<number> {
    try {
      const transactions = await this.storage.getMetaCampaignFinanceByCampaign(campaignId);
      const adSpendTransactions = transactions.filter((t) => t.transactionType === 'ad_spend');

      if (adSpendTransactions.length === 0) return 0;

      // Get date range
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Filter recent transactions
      const recentTransactions = adSpendTransactions.filter(
        (t) => new Date(t.createdAt) >= sevenDaysAgo
      );

      if (recentTransactions.length === 0) {
        // Use all transactions if campaign is newer than 7 days
        const totalSpend = adSpendTransactions.reduce(
          (sum, t) => sum + Math.abs(parseFloat(t.amount)),
          0
        );
        const firstTransaction = adSpendTransactions[adSpendTransactions.length - 1];
        const daysSinceFirst = Math.max(
          1,
          Math.ceil((now.getTime() - new Date(firstTransaction.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        );
        return totalSpend / daysSinceFirst;
      }

      // Calculate average daily spend from recent transactions
      const totalRecentSpend = recentTransactions.reduce(
        (sum, t) => sum + Math.abs(parseFloat(t.amount)),
        0
      );
      const daysWithSpend = Math.min(7, recentTransactions.length);
      
      return totalRecentSpend / daysWithSpend;
    } catch (error: any) {
      logger.error('[BudgetService] Calculate daily spend rate failed', { error, campaignId });
      return 0;
    }
  }

  /**
   * Process credit refund
   * Creates a refund transaction record
   */
  async refundCredit(
    transactionId: string,
    amount: string,
    reason?: string
  ): Promise<RefundResult> {
    try {
      // Get original transaction
      const originalTransaction = await this.storage.getMetaCampaignFinance(transactionId);
      if (!originalTransaction) {
        return { success: false, error: 'Transaction not found' };
      }

      // Validate refund amount
      const refundAmount = parseFloat(amount);
      const originalAmount = Math.abs(parseFloat(originalTransaction.amount));

      if (refundAmount <= 0 || refundAmount > originalAmount) {
        return { success: false, error: 'Invalid refund amount' };
      }

      // Create refund transaction
      const refundTransactionId = await this.storage.createMetaCampaignFinanceRecord({
        sellerId: originalTransaction.sellerId,
        campaignId: originalTransaction.campaignId || null,
        transactionType: 'refund',
        amount: amount, // Positive amount (adds back to credits)
        currency: originalTransaction.currency,
        description: reason || 'Credit refund',
        metadata: {
          originalTransactionId: transactionId,
          originalAmount: originalTransaction.amount,
          refundReason: reason,
        },
      });

      logger.info('[BudgetService] Credit refund processed', {
        transactionId,
        refundTransactionId,
        amount,
        sellerId: originalTransaction.sellerId,
        campaignId: originalTransaction.campaignId || undefined,
      });

      return {
        success: true,
        refundTransactionId,
      };
    } catch (error: any) {
      logger.error('[BudgetService] Refund credit failed', { error, transactionId, amount });
      return {
        success: false,
        error: error.message || 'Failed to process refund',
      };
    }
  }

  /**
   * Get complete credit ledger for a seller
   * Returns all transactions ordered by date (newest first)
   */
  async getCreditLedger(sellerId: string, campaignId?: string) {
    try {
      let transactions = await this.storage.getMetaCampaignFinanceBySeller(sellerId);

      // Filter by campaign if specified
      if (campaignId) {
        transactions = transactions.filter((t) => t.campaignId === campaignId);
      }

      // Add running balance to each transaction
      const ledger = [];
      let runningBalance = 0;

      // Reverse to process oldest first for running balance
      const reversedTransactions = [...transactions].reverse();

      for (const transaction of reversedTransactions) {
        const amount = parseFloat(transaction.amount);

        switch (transaction.transactionType) {
          case 'credit_purchase':
          case 'refund':
          case 'adjustment':
            runningBalance += amount;
            break;
          case 'ad_spend':
          case 'upfirst_fee':
            runningBalance += amount; // Already negative
            break;
        }

        ledger.push({
          ...transaction,
          runningBalance: parseFloat(runningBalance.toFixed(2)),
        });
      }

      // Reverse back to newest first
      return ledger.reverse();
    } catch (error: any) {
      logger.error('[BudgetService] Get credit ledger failed', { error, sellerId, campaignId });
      return [];
    }
  }
}
