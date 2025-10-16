/**
 * Compliance Service - GDPR and CAN-SPAM Compliance
 * Architecture 3 compliant - Pure business logic, no direct database access
 */

import type { IStorage } from "../../storage";
import type { Subscriber } from "@shared/schema";
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
  constructor(private storage: IStorage) {}

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
   * Generate unsubscribe link for email footer
   */
  generateUnsubscribeLink(campaignId: string, subscriberEmail: string): string {
    // TODO: Implement token-based unsubscribe link
    const baseUrl = process.env.APP_URL || "https://upfirst.io";
    const token = Buffer.from(`${campaignId}:${subscriberEmail}`).toString("base64url");
    return `${baseUrl}/newsletter/unsubscribe/${token}`;
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
