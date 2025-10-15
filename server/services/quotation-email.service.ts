/**
 * QuotationEmailService - Trade Quotation Email Management (Architecture 3)
 * 
 * Handles:
 * - Secure tokenized access links for buyers
 * - Professional invoice-style email templates
 * - Email notifications for quotation workflow
 * - Integration with NotificationService
 */

import crypto from 'crypto';
import type { IStorage } from '../storage';
import { storage } from '../storage';
import type { NotificationService } from '../notifications';
import type { QuotationService } from './quotation.service';
import type { TradeQuotation, TradeQuotationItem, User } from '@shared/schema';
import { tradeQuotationEvents } from '@shared/schema';
import { logger } from '../logger';
import {
  generateEmailBaseLayout,
  generateSellerHeader,
  generateSellerFooter,
  generateUpfirstHeader,
  generateUpfirstFooter,
  generateCTAButton,
} from '../utils/email-templates';

// ============================================================================
// Interfaces
// ============================================================================

export interface SendQuotationEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export interface AccessTokenPayload {
  quotationId: string;
  buyerEmail: string;
}

// ============================================================================
// QuotationEmailService
// ============================================================================

export class QuotationEmailService {
  constructor(
    private storage: IStorage,
    private notificationService: NotificationService,
    private quotationService: QuotationService
  ) {}

  /**
   * Generate secure access token for buyer to view quotation
   * Token is stored in authTokens table with 24h expiry
   */
  async generateAccessToken(quotationId: string, buyerEmail: string): Promise<string> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.storage.createAuthToken({
        email: buyerEmail.toLowerCase().trim(),
        token,
        code: null,
        expiresAt,
        used: 0,
        tokenType: 'quotation_access',
        sellerContext: quotationId, // Store quotationId in sellerContext for lookup
      });

      logger.info('[QuotationEmailService] Access token generated', {
        quotationId,
        buyerEmail,
        expiresAt: expiresAt.toISOString(),
      });

      return token;
    } catch (error: any) {
      logger.error('[QuotationEmailService] Failed to generate access token', {
        error: error.message,
        quotationId,
      });
      throw error;
    }
  }

  /**
   * Verify access token and return quotation info
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      const authToken = await this.storage.getAuthTokenByToken(token);

      if (!authToken) {
        return null;
      }

      // Check token type
      if (authToken.tokenType !== 'quotation_access') {
        return null;
      }

      // Check if expired
      if (new Date() > new Date(authToken.expiresAt)) {
        return null;
      }

      return {
        quotationId: authToken.sellerContext || '',
        buyerEmail: authToken.email,
      };
    } catch (error: any) {
      logger.error('[QuotationEmailService] Failed to verify access token', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Send quotation email to buyer with secure access link
   */
  async sendQuotationEmail(quotationId: string): Promise<SendQuotationEmailResult> {
    try {
      // 1. Get quotation with items
      const quotation = await this.quotationService.getQuotation(quotationId);
      if (!quotation) {
        return { success: false, error: 'Quotation not found' };
      }

      // 2. Get seller info
      const seller = await this.storage.getUser(quotation.sellerId);
      if (!seller) {
        return { success: false, error: 'Seller not found' };
      }

      // 3. Generate secure access token
      const accessToken = await this.generateAccessToken(quotationId, quotation.buyerEmail);

      // 4. Build quotation access link
      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : `http://localhost:${process.env.PORT || 5000}`;
      const quotationLink = `${baseUrl}/trade/view/${accessToken}`;

      // 5. Build email content
      const emailHtml = await this.buildQuotationEmailTemplate(
        quotation,
        quotation.items,
        seller,
        quotationLink
      );

      // 6. Send email via NotificationService
      const emailResult = await this.notificationService.sendEmail({
        to: quotation.buyerEmail,
        subject: `Quotation ${quotation.quotationNumber} from ${seller.companyName || 'Seller'}`,
        html: emailHtml,
      });

      if (!emailResult.success) {
        return { success: false, error: emailResult.error };
      }

      // 7. Log email_sent event
      const db = storage.db;
      await db.insert(tradeQuotationEvents).values({
        quotationId,
        eventType: 'email_sent',
        performedBy: quotation.sellerId,
        payload: {
          emailType: 'quotation_sent',
          recipientEmail: quotation.buyerEmail,
          emailId: emailResult.emailId,
        },
      });

      logger.info('[QuotationEmailService] Quotation email sent', {
        quotationId,
        buyerEmail: quotation.buyerEmail,
        emailId: emailResult.emailId,
      });

      return { success: true, emailId: emailResult.emailId };
    } catch (error: any) {
      logger.error('[QuotationEmailService] Failed to send quotation email', {
        error: error.message,
        quotationId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send deposit paid notification to seller
   */
  async sendDepositPaidEmail(quotationId: string): Promise<SendQuotationEmailResult> {
    try {
      const quotation = await this.quotationService.getQuotation(quotationId);
      if (!quotation) {
        return { success: false, error: 'Quotation not found' };
      }

      const seller = await this.storage.getUser(quotation.sellerId);
      if (!seller || !seller.email) {
        return { success: false, error: 'Seller not found or has no email' };
      }

      const emailHtml = await this.buildDepositPaidEmailTemplate(quotation, seller);

      const emailResult = await this.notificationService.sendEmail({
        to: seller.email,
        subject: `Deposit Received - Quotation ${quotation.quotationNumber}`,
        html: emailHtml,
      });

      if (!emailResult.success) {
        return { success: false, error: emailResult.error };
      }

      const db = storage.db;
      await db.insert(tradeQuotationEvents).values({
        quotationId,
        eventType: 'email_sent',
        performedBy: quotation.sellerId,
        payload: {
          emailType: 'deposit_paid_notification',
          recipientEmail: seller.email || '',
          emailId: emailResult.emailId,
        },
      });

      logger.info('[QuotationEmailService] Deposit paid email sent to seller', {
        quotationId,
        sellerEmail: seller.email || '',
      });

      return { success: true, emailId: emailResult.emailId };
    } catch (error: any) {
      logger.error('[QuotationEmailService] Failed to send deposit paid email', {
        error: error.message,
        quotationId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send balance payment request to buyer
   */
  async sendBalanceRequestEmail(quotationId: string): Promise<SendQuotationEmailResult> {
    try {
      const quotation = await this.quotationService.getQuotation(quotationId);
      if (!quotation) {
        return { success: false, error: 'Quotation not found' };
      }

      const seller = await this.storage.getUser(quotation.sellerId);
      if (!seller) {
        return { success: false, error: 'Seller not found' };
      }

      // Generate new access token for payment
      const accessToken = await this.generateAccessToken(quotationId, quotation.buyerEmail);
      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : `http://localhost:${process.env.PORT || 5000}`;
      const paymentLink = `${baseUrl}/trade/view/${accessToken}`;

      const emailHtml = await this.buildBalanceRequestEmailTemplate(quotation, seller, paymentLink);

      const emailResult = await this.notificationService.sendEmail({
        to: quotation.buyerEmail,
        subject: `Balance Payment Due - Quotation ${quotation.quotationNumber}`,
        html: emailHtml,
      });

      if (!emailResult.success) {
        return { success: false, error: emailResult.error };
      }

      const db = storage.db;
      await db.insert(tradeQuotationEvents).values({
        quotationId,
        eventType: 'email_sent',
        performedBy: quotation.sellerId,
        payload: {
          emailType: 'balance_request',
          recipientEmail: quotation.buyerEmail,
          emailId: emailResult.emailId || '',
        },
      });

      logger.info('[QuotationEmailService] Balance request email sent', {
        quotationId,
        buyerEmail: quotation.buyerEmail,
      });

      return { success: true, emailId: emailResult.emailId };
    } catch (error: any) {
      logger.error('[QuotationEmailService] Failed to send balance request email', {
        error: error.message,
        quotationId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send balance paid notification to seller
   */
  async sendBalancePaidEmail(quotationId: string): Promise<SendQuotationEmailResult> {
    try {
      const quotation = await this.quotationService.getQuotation(quotationId);
      if (!quotation) {
        return { success: false, error: 'Quotation not found' };
      }

      const seller = await this.storage.getUser(quotation.sellerId);
      if (!seller || !seller.email) {
        return { success: false, error: 'Seller not found or has no email' };
      }

      const emailHtml = await this.buildBalancePaidEmailTemplate(quotation, seller);

      const emailResult = await this.notificationService.sendEmail({
        to: seller.email,
        subject: `Balance Payment Received - Quotation ${quotation.quotationNumber}`,
        html: emailHtml,
      });

      if (!emailResult.success) {
        return { success: false, error: emailResult.error };
      }

      const db = storage.db;
      await db.insert(tradeQuotationEvents).values({
        quotationId,
        eventType: 'email_sent',
        performedBy: quotation.sellerId,
        payload: {
          emailType: 'balance_paid_notification',
          recipientEmail: seller.email || '',
          emailId: emailResult.emailId || '',
        },
      });

      logger.info('[QuotationEmailService] Balance paid email sent to seller', {
        quotationId,
        sellerEmail: seller.email || '',
      });

      return { success: true, emailId: emailResult.emailId };
    } catch (error: any) {
      logger.error('[QuotationEmailService] Failed to send balance paid email', {
        error: error.message,
        quotationId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send quotation expired notification to buyer
   */
  async sendExpiredEmail(quotationId: string): Promise<SendQuotationEmailResult> {
    try {
      const quotation = await this.quotationService.getQuotation(quotationId);
      if (!quotation) {
        return { success: false, error: 'Quotation not found' };
      }

      const seller = await this.storage.getUser(quotation.sellerId);
      if (!seller) {
        return { success: false, error: 'Seller not found' };
      }

      const emailHtml = await this.buildExpiredEmailTemplate(quotation, seller);

      const emailResult = await this.notificationService.sendEmail({
        to: quotation.buyerEmail,
        subject: `Quotation Expired - ${quotation.quotationNumber}`,
        html: emailHtml,
      });

      if (!emailResult.success) {
        return { success: false, error: emailResult.error };
      }

      const db = storage.db;
      await db.insert(tradeQuotationEvents).values({
        quotationId,
        eventType: 'email_sent',
        performedBy: quotation.sellerId,
        payload: {
          emailType: 'quotation_expired',
          recipientEmail: quotation.buyerEmail,
          emailId: emailResult.emailId || '',
        },
      });

      logger.info('[QuotationEmailService] Expired email sent', {
        quotationId,
        buyerEmail: quotation.buyerEmail,
      });

      return { success: true, emailId: emailResult.emailId };
    } catch (error: any) {
      logger.error('[QuotationEmailService] Failed to send expired email', {
        error: error.message,
        quotationId,
      });
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // Email Template Builders
  // ==========================================================================

  /**
   * Build quotation email template (Seller → Buyer)
   * Uses seller header and footer with Stripe business information
   */
  private async buildQuotationEmailTemplate(
    quotation: TradeQuotation,
    items: TradeQuotationItem[],
    seller: User,
    quotationLink: string
  ): Promise<string> {
    const sellerName = seller.companyName || 'Seller';
    const currency = quotation.currency || 'USD';
    const validUntilText = quotation.validUntil
      ? `Valid until ${new Date(quotation.validUntil).toLocaleDateString()}`
      : 'No expiry date';

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${this.formatCurrency(parseFloat(item.unitPrice), currency)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${this.formatCurrency(parseFloat(item.lineTotal), currency)}</td>
        </tr>
      `
      )
      .join('');

    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);

    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
        Quotation ${quotation.quotationNumber}
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        You have received a quotation from <strong>${sellerName}</strong>.
      </p>

      <!-- Summary Box -->
      <div style="background-color: #f3f4f6 !important; border-radius: 8px; padding: 20px; margin-bottom: 30px;" class="dark-mode-bg-white">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #6b7280 !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Total Amount:</span>
            </td>
            <td style="padding: 8px 0; text-align: right;">
              <span style="font-size: 24px; font-weight: 700; color: #111827 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${this.formatCurrency(parseFloat(quotation.total), currency)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #6b7280 !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Deposit Amount (${quotation.depositPercentage}%):</span>
            </td>
            <td style="padding: 8px 0; text-align: right;">
              <span style="font-size: 18px; font-weight: 600; color: #059669 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${this.formatCurrency(parseFloat(quotation.depositAmount), currency)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #6b7280 !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Balance Amount:</span>
            </td>
            <td style="padding: 8px 0; text-align: right;">
              <span style="font-size: 18px; font-weight: 600; color: #3b82f6 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${this.formatCurrency(parseFloat(quotation.balanceAmount), currency)}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 12px;">
              <div style="background-color: #fef3c7 !important; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin-top: 8px;">
                <p style="margin: 0; color: #92400e !important; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  <strong>⏰ ${validUntilText}</strong>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Items Table -->
      <h2 style="margin: 0 0 16px; font-size: 20px; color: #111827 !important; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">Items</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f9fafb !important;" class="dark-mode-bg-white">
            <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #6b7280 !important; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Description</th>
            <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #6b7280 !important; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Qty</th>
            <th style="padding: 12px; text-align: right; font-size: 13px; font-weight: 600; color: #6b7280 !important; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Unit Price</th>
            <th style="padding: 12px; text-align: right; font-size: 13px; font-weight: 600; color: #6b7280 !important; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      ${generateCTAButton('View & Accept Quotation', quotationLink)}

      <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280 !important; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This link will expire in 24 hours. Please view the quotation and proceed with payment if you accept the terms.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Quotation ${quotation.quotationNumber} from ${sellerName}`,
      darkModeSafe: true,
    });
  }

  /**
   * Build deposit paid email template (Upfirst → Seller)
   * Uses Upfirst header and footer for platform communications
   */
  private async buildDepositPaidEmailTemplate(quotation: TradeQuotation, seller: User): Promise<string> {
    const currency = quotation.currency || 'USD';

    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();

    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #059669 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ✅ Deposit Received
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Great news! The deposit payment for quotation <strong>${quotation.quotationNumber}</strong> has been received.
      </p>

      <div style="background-color: #d1fae5 !important; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #065f46 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Deposit Amount:</span>
            </td>
            <td style="padding: 8px 0; text-align: right;">
              <strong style="font-size: 20px; color: #047857 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${this.formatCurrency(parseFloat(quotation.depositAmount), currency)}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #065f46 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Balance Remaining:</span>
            </td>
            <td style="padding: 8px 0; text-align: right;">
              <strong style="font-size: 18px; color: #047857 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${this.formatCurrency(parseFloat(quotation.balanceAmount), currency)}</strong>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <strong>Buyer email:</strong> ${quotation.buyerEmail}
      </p>

      <p style="margin: 16px 0 0; font-size: 14px; color: #9ca3af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This is an automated notification from Upfirst.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Deposit received for quotation ${quotation.quotationNumber}`,
      darkModeSafe: true,
    });
  }

  /**
   * Build balance payment request email template (Seller → Buyer)
   * Uses seller header and footer with Stripe business information
   */
  private async buildBalanceRequestEmailTemplate(
    quotation: TradeQuotation,
    seller: User,
    paymentLink: string
  ): Promise<string> {
    const sellerName = seller.companyName || 'Seller';
    const currency = quotation.currency || 'USD';

    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);

    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #3b82f6 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Balance Payment Due
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        The balance payment for quotation <strong>${quotation.quotationNumber}</strong> from ${sellerName} is now due.
      </p>

      <div style="background-color: #dbeafe !important; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #1e40af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Balance Amount:</span>
            </td>
            <td style="padding: 8px 0; text-align: right;">
              <strong style="font-size: 24px; color: #1e3a8a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${this.formatCurrency(parseFloat(quotation.balanceAmount), currency)}</strong>
            </td>
          </tr>
        </table>
      </div>

      ${generateCTAButton('Pay Balance Now', paymentLink)}

      <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280 !important; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This payment link will expire in 24 hours.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Balance payment due for quotation ${quotation.quotationNumber}`,
      darkModeSafe: true,
    });
  }

  /**
   * Build balance paid email template (Upfirst → Seller)
   * Uses Upfirst header and footer for platform communications
   */
  private async buildBalancePaidEmailTemplate(quotation: TradeQuotation, seller: User): Promise<string> {
    const currency = quotation.currency || 'USD';

    const header = generateUpfirstHeader();
    const footer = generateUpfirstFooter();

    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #059669 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        🎉 Balance Payment Received
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Excellent! The balance payment for quotation <strong>${quotation.quotationNumber}</strong> has been received. The quotation is now fully paid.
      </p>

      <div style="background-color: #d1fae5 !important; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #065f46 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Balance Paid:</span>
            </td>
            <td style="padding: 8px 0; text-align: right;">
              <strong style="font-size: 20px; color: #047857 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${this.formatCurrency(parseFloat(quotation.balanceAmount), currency)}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #065f46 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Total Paid:</span>
            </td>
            <td style="padding: 8px 0; text-align: right;">
              <strong style="font-size: 20px; color: #047857 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${this.formatCurrency(parseFloat(quotation.total), currency)}</strong>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <strong>Buyer email:</strong> ${quotation.buyerEmail}
      </p>

      <p style="margin: 16px 0 0; font-size: 14px; color: #9ca3af !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This is an automated notification from Upfirst.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Balance payment received for quotation ${quotation.quotationNumber}`,
      darkModeSafe: true,
    });
  }

  /**
   * Build quotation expired email template (Seller → Buyer)
   * Uses seller header and footer with Stripe business information
   */
  private async buildExpiredEmailTemplate(quotation: TradeQuotation, seller: User): Promise<string> {
    const sellerName = seller.companyName || 'Seller';

    const header = generateSellerHeader(seller);
    const footer = await generateSellerFooter(seller);

    const content = `
      <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #ef4444 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Quotation Expired
      </h1>
      <p style="margin: 0 0 30px; font-size: 16px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Unfortunately, quotation <strong>${quotation.quotationNumber}</strong> from ${sellerName} has expired.
      </p>

      <div style="background-color: #fee2e2 !important; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; color: #991b1b !important; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          This quotation is no longer valid. Please contact the seller for a new quotation if you're still interested.
        </p>
      </div>

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Contact <strong>${sellerName}</strong> for assistance.
      </p>
    `;

    return generateEmailBaseLayout({
      header,
      content,
      footer,
      preheader: `Quotation ${quotation.quotationNumber} has expired`,
      darkModeSafe: true,
    });
  }

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}
