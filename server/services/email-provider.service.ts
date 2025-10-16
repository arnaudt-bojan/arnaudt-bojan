/**
 * Email Provider Abstraction Service
 * 
 * Provides a clean interface for email sending, abstracting the underlying provider (Resend).
 * Makes it easy to swap providers or add multiple providers in the future.
 */

import { Resend } from 'resend';
import { logger } from '../logger';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string | string[];
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  tags?: Array<{ name: string; value: string }>;
  tracking?: {
    open?: boolean;
    click?: boolean;
  };
}

export interface EmailSendResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

/**
 * Email Provider Interface
 * Implement this interface to create a new email provider
 */
export interface IEmailProvider {
  sendEmail(params: SendEmailParams): Promise<EmailSendResult>;
  sendBatch(emails: SendEmailParams[]): Promise<{ success: boolean; batchId?: string; error?: string }>;
}

/**
 * Resend Email Provider Implementation
 */
export class ResendEmailProvider implements IEmailProvider {
  private client: Resend;
  private isConfigured: boolean;

  constructor(apiKey?: string) {
    this.isConfigured = !!apiKey;
    
    if (!apiKey) {
      logger.warn('[EmailProvider] RESEND_API_KEY not configured - emails will be logged only');
      this.client = new Resend('dummy-key-not-configured');
    } else {
      this.client = new Resend(apiKey);
      logger.info('[EmailProvider] Resend client initialized successfully');
    }
  }

  async sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
    const { to, from, replyTo, subject, html, attachments, tags, tracking } = params;

    // If Resend is not configured, log the email instead of sending
    if (!this.isConfigured) {
      logger.warn('[EmailProvider] Email not sent (Resend not configured):', {
        to: Array.isArray(to) ? to.join(', ') : to,
        from,
        subject,
        htmlPreview: html.substring(0, 100) + '...'
      });
      return { 
        success: false, 
        error: 'Email provider not configured' 
      };
    }

    try {
      logger.info('[EmailProvider] Sending email via Resend:', {
        from,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        tracking: tracking || { open: false, click: false },
      });

      // Build email options with tracking enabled by default for campaigns
      const emailOptions: any = {
        from,
        to: Array.isArray(to) ? to : [to],
        replyTo: replyTo,
        subject,
        html,
        tags: tags,
        attachments: attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          content_type: att.contentType,
        })),
      };

      // Enable tracking if specified (default to true for both if tracking object is provided)
      if (tracking) {
        if (tracking.open !== false) {
          emailOptions.trackOpens = true;
        }
        if (tracking.click !== false) {
          emailOptions.trackClicks = true;
        }
      }

      const response = await this.client.emails.send(emailOptions);

      // CRITICAL: Check if Resend returned an error in the response
      if (response.error) {
        logger.error('[EmailProvider] Resend API returned error:', {
          to: Array.isArray(to) ? to.join(', ') : to,
          subject,
          error: response.error,
          errorMessage: response.error.message,
        });

        return {
          success: false,
          error: response.error.message || 'Resend API error',
        };
      }

      logger.info('[EmailProvider] Email sent successfully:', {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        emailId: response.data?.id,
      });

      return {
        success: true,
        emailId: response.data?.id,
      };
    } catch (error: any) {
      logger.error('[EmailProvider] Failed to send email:', {
        to,
        subject,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  async sendBatch(emails: SendEmailParams[]): Promise<{ success: boolean; batchId?: string; error?: string }> {
    if (!this.isConfigured) {
      logger.warn('[EmailProvider] Batch email not sent (Resend not configured)');
      return { 
        success: false, 
        error: 'Email provider not configured' 
      };
    }

    try {
      const responses = await this.client.batch.send(
        emails.map(email => ({
          from: email.from,
          to: Array.isArray(email.to) ? email.to : [email.to],
          replyTo: email.replyTo,
          subject: email.subject,
          html: email.html,
          attachments: email.attachments?.map(att => ({
            filename: att.filename,
            content: att.content,
            content_type: att.contentType,
          })),
        }))
      );

      logger.info('[EmailProvider] Batch emails sent successfully:', {
        count: emails.length,
      });

      return {
        success: true,
        batchId: 'batch-sent',
      };
    } catch (error: any) {
      logger.error('[EmailProvider] Failed to send batch emails:', {
        count: emails.length,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Failed to send batch emails',
      };
    }
  }
}

/**
 * Email Provider Factory
 * Creates and returns the configured email provider
 */
export function createEmailProvider(): IEmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    logger.warn('[EmailProvider] RESEND_API_KEY environment variable is NOT SET!');
    logger.warn('[EmailProvider] Emails will NOT be sent. Please configure RESEND_API_KEY in your environment.');
  }

  // Currently using Resend, but can easily switch to other providers
  return new ResendEmailProvider(apiKey);
}

// Export singleton instance
export const emailProvider = createEmailProvider();
