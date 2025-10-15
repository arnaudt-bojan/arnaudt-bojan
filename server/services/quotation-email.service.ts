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
      const emailHtml = this.buildQuotationEmailTemplate(
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

      const emailHtml = this.buildDepositPaidEmailTemplate(quotation, seller);

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

      const emailHtml = this.buildBalanceRequestEmailTemplate(quotation, seller, paymentLink);

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

      const emailHtml = this.buildBalancePaidEmailTemplate(quotation, seller);

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

      const emailHtml = this.buildExpiredEmailTemplate(quotation, seller);

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

  private buildQuotationEmailTemplate(
    quotation: TradeQuotation,
    items: TradeQuotationItem[],
    seller: User,
    quotationLink: string
  ): string {
    const sellerName = seller.companyName || 'Seller';
    const currency = quotation.currency || 'USD';
    const validUntilText = quotation.validUntil
      ? `Valid until ${new Date(quotation.validUntil).toLocaleDateString()}`
      : 'No expiry date';

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${this.formatCurrency(parseFloat(item.unitPrice), currency)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${this.formatCurrency(parseFloat(item.lineTotal), currency)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quotation ${quotation.quotationNumber}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Quotation</h1>
                    <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 18px;">${quotation.quotationNumber}</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    
                    <!-- Introduction -->
                    <p style="margin: 0 0 24px; font-size: 16px; color: #374151;">
                      You have received a quotation from <strong>${sellerName}</strong>.
                    </p>

                    <!-- Summary Box -->
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #6b7280; font-size: 14px;">Total Amount:</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="font-size: 24px; font-weight: 700; color: #111827;">${this.formatCurrency(parseFloat(quotation.total), currency)}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #6b7280; font-size: 14px;">Deposit Amount (${quotation.depositPercentage}%):</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="font-size: 18px; font-weight: 600; color: #059669;">${this.formatCurrency(parseFloat(quotation.depositAmount), currency)}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #6b7280; font-size: 14px;">Balance Amount:</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="font-size: 18px; font-weight: 600; color: #3b82f6;">${this.formatCurrency(parseFloat(quotation.balanceAmount), currency)}</span>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top: 12px;">
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin-top: 8px;">
                              <p style="margin: 0; color: #92400e; font-size: 13px;">
                                <strong>⏰ ${validUntilText}</strong>
                              </p>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Items Table -->
                    <h2 style="margin: 0 0 16px; font-size: 20px; color: #111827; font-weight: 600;">Items</h2>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
                      <thead>
                        <tr style="background-color: #f9fafb;">
                          <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Description</th>
                          <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Qty</th>
                          <th style="padding: 12px; text-align: right; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Unit Price</th>
                          <th style="padding: 12px; text-align: right; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                      <tr>
                        <td align="center">
                          <a href="${quotationLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                            View & Accept Quotation
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Footer Note -->
                    <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
                      This link will expire in 24 hours. Please view the quotation and proceed with payment if you accept the terms.
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                      ${sellerName}
                    </p>
                    <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">
                      Questions? Reply to this email.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private buildDepositPaidEmailTemplate(quotation: TradeQuotation, seller: User): string {
    const currency = quotation.currency || 'USD';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">✅ Deposit Received</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 24px; font-size: 16px;">
                      Great news! The deposit payment for quotation <strong>${quotation.quotationNumber}</strong> has been received.
                    </p>

                    <div style="background-color: #d1fae5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0;"><span style="color: #065f46;">Deposit Amount:</span></td>
                          <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 20px; color: #047857;">${this.formatCurrency(parseFloat(quotation.depositAmount), currency)}</strong></td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;"><span style="color: #065f46;">Balance Remaining:</span></td>
                          <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 18px; color: #047857;">${this.formatCurrency(parseFloat(quotation.balanceAmount), currency)}</strong></td>
                        </tr>
                      </table>
                    </div>

                    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
                      Buyer email: ${quotation.buyerEmail}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated notification</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private buildBalanceRequestEmailTemplate(
    quotation: TradeQuotation,
    seller: User,
    paymentLink: string
  ): string {
    const sellerName = seller.companyName || 'Seller';
    const currency = quotation.currency || 'USD';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Balance Payment Due</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 24px; font-size: 16px;">
                      The balance payment for quotation <strong>${quotation.quotationNumber}</strong> from ${sellerName} is now due.
                    </p>

                    <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0;"><span style="color: #1e40af;">Balance Amount:</span></td>
                          <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 24px; color: #1e3a8a;">${this.formatCurrency(parseFloat(quotation.balanceAmount), currency)}</strong></td>
                        </tr>
                      </table>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                            Pay Balance Now
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
                      This payment link will expire in 24 hours.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      ${sellerName} | Questions? Reply to this email
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private buildBalancePaidEmailTemplate(quotation: TradeQuotation, seller: User): string {
    const currency = quotation.currency || 'USD';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎉 Balance Payment Received</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 24px; font-size: 16px;">
                      Excellent! The balance payment for quotation <strong>${quotation.quotationNumber}</strong> has been received. The quotation is now fully paid.
                    </p>

                    <div style="background-color: #d1fae5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0;"><span style="color: #065f46;">Balance Paid:</span></td>
                          <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 20px; color: #047857;">${this.formatCurrency(parseFloat(quotation.balanceAmount), currency)}</strong></td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;"><span style="color: #065f46;">Total Paid:</span></td>
                          <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 20px; color: #047857;">${this.formatCurrency(parseFloat(quotation.total), currency)}</strong></td>
                        </tr>
                      </table>
                    </div>

                    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
                      Buyer email: ${quotation.buyerEmail}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated notification</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private buildExpiredEmailTemplate(quotation: TradeQuotation, seller: User): string {
    const sellerName = seller.companyName || 'Seller';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Quotation Expired</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 24px; font-size: 16px;">
                      Unfortunately, quotation <strong>${quotation.quotationNumber}</strong> from ${sellerName} has expired.
                    </p>

                    <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                      <p style="margin: 0; color: #991b1b; font-size: 14px;">
                        This quotation is no longer valid. Please contact the seller for a new quotation if you're still interested.
                      </p>
                    </div>

                    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
                      Contact ${sellerName} for assistance.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      ${sellerName}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}
