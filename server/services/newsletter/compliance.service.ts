/**
 * Compliance Service - GDPR and CAN-SPAM Compliance
 * Architecture 3 compliant - Pure business logic, no direct database access
 */

import crypto from "crypto";
import type { IStorage } from "../../storage";
import type { Subscriber } from "@shared/schema";
import type { AnalyticsService } from "./analytics.service";
import type { SubscriberService } from "./subscriber.service";
import { logger } from "../../logger";

export interface ConsentRecord {
  subscriberId: string;
  email: string;
  consentedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  source: string;
}

export interface SuppressionEntry {
  email: string;
  reason: "unsubscribed" | "bounced" | "complained" | "manual";
  addedAt: Date;
}

export interface GDPRExportData {
  subscriber: {
    email: string;
    name?: string;
    status: string;
    createdAt?: Date;
  };
  campaigns: Array<{
    campaignId: string;
    subject: string;
    sentAt: Date;
  }>;
  events: Array<{
    eventType: string;
    occurredAt: Date;
    metadata?: any;
  }>;
}

export class ComplianceService {
  constructor(
    private storage: IStorage,
    private subscriberService: SubscriberService,
    private analyticsService?: AnalyticsService
  ) {}

  /**
   * Track consent for a subscriber
   * TODO: Add consent tracking table to schema and storage interface
   */
  async trackConsent(data: ConsentRecord): Promise<void> {
    logger.info(`[ComplianceService] Tracking consent for`, { email: data.email });

    // TODO: Implement consent tracking in database
    // For now, just log the consent
    logger.info(`[ComplianceService] Consent tracked`, {
      email: data.email,
      source: data.source,
      consentedAt: data.consentedAt.toISOString(),
    });
  }

  /**
   * Check if email is in suppression list
   */
  async isEmailSuppressed(userId: string, email: string): Promise<boolean> {
    const subscriber = await this.storage.getSubscriberByEmail(userId, email.toLowerCase());
    
    if (!subscriber) {
      return false;
    }

    // Email is suppressed if status is unsubscribed, bounced, or complained
    return ["unsubscribed", "bounced", "complained"].includes(subscriber.status);
  }

  /**
   * Add email to suppression list
   */
  async addToSuppressionList(
    userId: string,
    email: string,
    reason: SuppressionEntry["reason"]
  ): Promise<void> {
    logger.info(`[ComplianceService] Adding to suppression list`, { email, reason });

    const subscriber = await this.storage.getSubscriberByEmail(userId, email.toLowerCase());
    
    if (!subscriber) {
      throw new Error("Subscriber not found");
    }

    // Map suppression reason to subscriber status
    const statusMap: Record<SuppressionEntry["reason"], string> = {
      unsubscribed: "unsubscribed",
      bounced: "bounced",
      complained: "complained",
      manual: "unsubscribed", // Manual additions are treated as unsubscribed
    };

    await this.storage.updateSubscriber(subscriber.id, {
      status: statusMap[reason],
    });

    logger.info(`[ComplianceService] Email added to suppression list`, { email });
  }

  /**
   * Remove email from suppression list (e.g., re-subscription)
   */
  async removeFromSuppressionList(userId: string, email: string): Promise<void> {
    logger.info(`[ComplianceService] Removing from suppression list`, { email });

    const subscriber = await this.storage.getSubscriberByEmail(userId, email.toLowerCase());
    
    if (!subscriber) {
      throw new Error("Subscriber not found");
    }

    await this.storage.updateSubscriber(subscriber.id, {
      status: "active",
    });

    logger.info(`[ComplianceService] Email removed from suppression list`, { email });
  }

  /**
   * Get suppression list for a user
   */
  async getSuppressionList(userId: string): Promise<SuppressionEntry[]> {
    const subscribers = await this.storage.getSubscribersByUserId(userId);

    const suppressionList: SuppressionEntry[] = [];

    for (const subscriber of subscribers) {
      if (["unsubscribed", "bounced", "complained"].includes(subscriber.status)) {
        suppressionList.push({
          email: subscriber.email,
          reason: subscriber.status as any,
          addedAt: subscriber.createdAt || new Date(),
        });
      }
    }

    return suppressionList;
  }

  /**
   * Export subscriber data for GDPR compliance
   */
  async exportSubscriberData(userId: string, email: string): Promise<GDPRExportData> {
    logger.info(`[ComplianceService] Exporting GDPR data for`, { email });

    const subscriber = await this.storage.getSubscriberByEmail(userId, email.toLowerCase());
    
    if (!subscriber) {
      throw new Error("Subscriber not found");
    }

    // TODO: Fetch campaign history and events from storage
    // For now, return basic subscriber data
    const exportData: GDPRExportData = {
      subscriber: {
        email: subscriber.email,
        name: subscriber.name || undefined,
        status: subscriber.status,
        createdAt: subscriber.createdAt || undefined,
      },
      campaigns: [],
      events: [],
    };

    logger.info(`[ComplianceService] GDPR export complete for`, { email });
    return exportData;
  }

  /**
   * Delete subscriber data (GDPR right to be forgotten)
   */
  async deleteSubscriberData(userId: string, email: string): Promise<void> {
    logger.info(`[ComplianceService] Deleting subscriber data (GDPR)`, { email });

    const subscriber = await this.storage.getSubscriberByEmail(userId, email.toLowerCase());
    
    if (!subscriber) {
      throw new Error("Subscriber not found");
    }

    // Delete subscriber (cascades to related data)
    await this.storage.deleteSubscriber(subscriber.id);

    logger.info(`[ComplianceService] Subscriber data deleted`, { email });
  }

  /**
   * Generate unsubscribe token (secure, tamper-proof)
   */
  generateUnsubscribeToken(campaignId: string, subscriberEmail: string): string {
    const secret = process.env.SESSION_SECRET;
    
    if (!secret) {
      throw new Error('SESSION_SECRET environment variable is required for generating secure unsubscribe tokens');
    }
    
    const payload = `${campaignId}:${subscriberEmail.toLowerCase()}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
      .slice(0, 16);
    
    return `${Buffer.from(payload).toString('base64')}.${signature}`;
  }

  /**
   * Generate unsubscribe URL for email footer
   */
  generateUnsubscribeUrl(campaignId: string, subscriberEmail: string): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : (process.env.APP_URL || "http://localhost:5000");
    const token = this.generateUnsubscribeToken(campaignId, subscriberEmail);
    return `${baseUrl}/api/unsubscribe/${token}`;
  }

  /**
   * Generate unsubscribe link for email footer (deprecated - use generateUnsubscribeUrl)
   */
  generateUnsubscribeLink(campaignId: string, subscriberEmail: string): string {
    return this.generateUnsubscribeUrl(campaignId, subscriberEmail);
  }

  /**
   * Validate unsubscribe token and extract campaign/email
   */
  validateUnsubscribeToken(token: string): { campaignId: string; email: string } | null {
    try {
      const secret = process.env.SESSION_SECRET;
      
      if (!secret) {
        throw new Error('SESSION_SECRET environment variable is required for validating unsubscribe tokens');
      }
      
      const parts = token.split('.');
      
      if (parts.length !== 2) {
        logger.warn(`[ComplianceService] Invalid token format`);
        return null;
      }

      const [encodedPayload, signature] = parts;
      const payload = Buffer.from(encodedPayload, 'base64').toString('utf-8');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')
        .slice(0, 16);

      if (signature !== expectedSignature) {
        logger.warn(`[ComplianceService] Invalid token signature`);
        return null;
      }

      const payloadParts = payload.split(':');
      if (payloadParts.length !== 2) {
        logger.warn(`[ComplianceService] Invalid payload format`);
        return null;
      }

      const [campaignId, email] = payloadParts;
      return { campaignId, email: email.toLowerCase() };
    } catch (error) {
      logger.error(`[ComplianceService] Token validation error:`, error);
      return null;
    }
  }

  /**
   * Handle unsubscribe request from token
   */
  async handleUnsubscribe(token: string): Promise<{ success: boolean; email?: string; error?: string }> {
    logger.info(`[ComplianceService] Processing unsubscribe request`);

    const validated = this.validateUnsubscribeToken(token);
    if (!validated) {
      return { success: false, error: 'Invalid or expired unsubscribe link' };
    }

    const { campaignId, email } = validated;

    try {
      // Get the campaign to find the user
      const campaign = await this.storage.getNewsletter(campaignId);
      if (!campaign) {
        logger.warn(`[ComplianceService] Campaign not found for unsubscribe`, { campaignId });
        return { success: false, error: 'Campaign not found' };
      }

      // Use SubscriberService to unsubscribe (handles "Unsubscribed" group automatically)
      await this.subscriberService.unsubscribe(campaign.userId, email, 'unsubscribe_link');

      // Track open event first (you can't unsubscribe without opening the email)
      // This helps track opens when email clients block tracking pixels
      if (this.analyticsService) {
        await this.analyticsService.ingestEvent({
          campaignId,
          recipientEmail: email,
          eventType: 'open',
          eventData: { source: 'inferred_from_unsubscribe' },
        });
      }

      // Track unsubscribe event in analytics
      if (this.analyticsService) {
        await this.analyticsService.ingestEvent({
          campaignId,
          recipientEmail: email,
          eventType: 'unsubscribe',
          eventData: { timestamp: new Date().toISOString() },
        });
      }

      logger.info(`[ComplianceService] Unsubscribe successful`, { email });
      return { success: true, email };
    } catch (error) {
      logger.error(`[ComplianceService] Unsubscribe failed:`, error);
      return { success: false, error: 'Failed to process unsubscribe request' };
    }
  }

  /**
   * Generate legal footer for emails
   */
  generateLegalFooter(
    campaignId: string,
    subscriberEmail: string,
    senderInfo: {
      name: string;
      address?: string;
      city?: string;
      country?: string;
    }
  ): string {
    const unsubscribeLink = this.generateUnsubscribeLink(campaignId, subscriberEmail);

    const address = senderInfo.address
      ? `${senderInfo.address}, ${senderInfo.city || ""}, ${senderInfo.country || ""}`
      : "Upfirst Platform";

    return `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
        <p>This email was sent by ${senderInfo.name}</p>
        <p>${address}</p>
        <p>
          <a href="${unsubscribeLink}" style="color: #666; text-decoration: underline;">
            Unsubscribe from this list
          </a>
        </p>
        <p style="margin-top: 10px; font-size: 11px; color: #999;">
          You received this email because you opted in to receive updates from ${senderInfo.name}.
        </p>
      </div>
    `;
  }

  /**
   * Validate email compliance before sending
   */
  async validateCompliance(userId: string, recipientEmails: string[]): Promise<{
    allowed: string[];
    suppressed: string[];
    invalid: string[];
  }> {
    logger.info(`[ComplianceService] Validating compliance for ${recipientEmails.length} recipients`);

    const result = {
      allowed: [] as string[],
      suppressed: [] as string[],
      invalid: [] as string[],
    };

    for (const email of recipientEmails) {
      const normalized = email.toLowerCase().trim();

      // Basic email validation
      if (!this.isValidEmail(normalized)) {
        result.invalid.push(email);
        continue;
      }

      // Check suppression list
      const isSuppressed = await this.isEmailSuppressed(userId, normalized);
      if (isSuppressed) {
        result.suppressed.push(email);
        continue;
      }

      result.allowed.push(email);
    }

    logger.info(`[ComplianceService] Compliance validation complete:`, {
      allowed: result.allowed.length,
      suppressed: result.suppressed.length,
      invalid: result.invalid.length,
    });

    return result;
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
