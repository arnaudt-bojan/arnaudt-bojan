/**
 * Subscriber Service - Newsletter Subscriber Management
 * Architecture 3 compliant - Pure business logic, no direct database access
 */

import type { IStorage } from "../../storage";
import type {
  CreateSubscriberDTO,
  UpdateSubscriberDTO,
  BulkImportResult,
  SubscriberStatus,
} from "@shared/newsletter-types";
import type { Subscriber, InsertSubscriber } from "@shared/schema";
import { logger } from "../../logger";

export class SubscriberService {
  constructor(private storage: IStorage) {}

  /**
   * Create a new subscriber
   */
  async createSubscriber(userId: string, data: CreateSubscriberDTO): Promise<Subscriber> {
    logger.info(`[SubscriberService] Creating subscriber for user ${userId}`, { email: data.email });

    // Check for duplicate email (case-insensitive)
    const existing = await this.storage.getSubscriberByEmail(userId, data.email.toLowerCase());
    if (existing) {
      logger.warn(`[SubscriberService] Subscriber already exists`, { email: data.email });
      throw new Error(`Subscriber with email ${data.email} already exists`);
    }

    const subscriber = await this.storage.createSubscriber({
      userId,
      email: data.email.toLowerCase(),
      name: data.name || null,
      status: "active",
    });

    // Add to groups if specified
    if (data.groupIds && data.groupIds.length > 0) {
      for (const groupId of data.groupIds) {
        try {
          await this.storage.addSubscriberToGroup(subscriber.id, groupId);
        } catch (error) {
          logger.error(`[SubscriberService] Failed to add subscriber to group ${groupId}:`, error);
        }
      }
    }

    logger.info(`[SubscriberService] Subscriber created`, { subscriberId: subscriber.id });
    return subscriber;
  }

  /**
   * Get subscriber by ID
   */
  async getSubscriber(id: string): Promise<Subscriber | undefined> {
    return await this.storage.getSubscriber(id);
  }

  /**
   * Get subscriber by email
   */
  async getSubscriberByEmail(userId: string, email: string): Promise<Subscriber | undefined> {
    return await this.storage.getSubscriberByEmail(userId, email.toLowerCase());
  }

  /**
   * Get all subscribers for a user
   */
  async getSubscribers(userId: string): Promise<Subscriber[]> {
    return await this.storage.getSubscribersByUserId(userId);
  }

  /**
   * Get subscribers by group
   */
  async getSubscribersByGroup(userId: string, groupId: string): Promise<Subscriber[]> {
    return await this.storage.getSubscribersByGroupId(userId, groupId);
  }

  /**
   * Update subscriber
   */
  async updateSubscriber(
    id: string,
    data: UpdateSubscriberDTO
  ): Promise<Subscriber | undefined> {
    logger.info(`[SubscriberService] Updating subscriber`, { subscriberId: id });

    const updates: Partial<Subscriber> = {};

    if (data.name !== undefined) {
      updates.name = data.name;
    }

    if (data.status) {
      this.validateStatusTransition(data.status);
      updates.status = data.status;
    }

    const updated = await this.storage.updateSubscriber(id, updates);

    if (updated) {
      logger.info(`[SubscriberService] Subscriber updated`, { subscriberId: id });
    }

    return updated;
  }

  /**
   * Unsubscribe a subscriber
   */
  async unsubscribe(
    userId: string,
    email: string,
    reason?: string
  ): Promise<Subscriber | undefined> {
    logger.info(`[SubscriberService] Unsubscribing`, { email });

    const subscriber = await this.getSubscriberByEmail(userId, email);
    if (!subscriber) {
      throw new Error("Subscriber not found");
    }

    const updated = await this.storage.updateSubscriber(subscriber.id, {
      status: "unsubscribed",
    });

    if (updated) {
      logger.info(`[SubscriberService] Subscriber unsubscribed`, { email, reason: reason || "no reason" });
      
      // Automatically add to "Unsubscribed" system group
      try {
        await this.ensureUnsubscribedGroup(userId, subscriber.id);
      } catch (error: any) {
        logger.error(`[SubscriberService] Failed to add subscriber to Unsubscribed group:`, error);
      }
    }

    return updated;
  }

  /**
   * Ensure "Unsubscribed" system group exists and add subscriber to it
   */
  private async ensureUnsubscribedGroup(userId: string, subscriberId: string): Promise<void> {
    const groupName = "Unsubscribed";
    
    // Check if group exists
    let unsubscribedGroup = await this.storage.getSubscriberGroupByName(userId, groupName);
    
    // Create group if it doesn't exist
    if (!unsubscribedGroup) {
      logger.info(`[SubscriberService] Creating Unsubscribed system group for user ${userId}`);
      unsubscribedGroup = await this.storage.createSubscriberGroup({
        userId,
        name: groupName,
        description: "Automatically managed group for unsubscribed users",
      });
    }
    
    // Add subscriber to group (will fail silently if already in group)
    try {
      await this.storage.addSubscriberToGroup(subscriberId, unsubscribedGroup.id);
      logger.info(`[SubscriberService] Added subscriber to Unsubscribed group`, { subscriberId });
    } catch (error: any) {
      // Subscriber might already be in the group (unique constraint violation)
      if (!error.message?.includes("duplicate") && !error.message?.includes("unique")) {
        throw error;
      }
      logger.info(`[SubscriberService] Subscriber already in Unsubscribed group`, { subscriberId });
    }
  }

  /**
   * Mark subscriber as bounced
   */
  async markBounced(userId: string, email: string): Promise<Subscriber | undefined> {
    logger.info(`[SubscriberService] Marking subscriber as bounced`, { email });

    const subscriber = await this.getSubscriberByEmail(userId, email);
    if (!subscriber) {
      throw new Error("Subscriber not found");
    }

    return await this.storage.updateSubscriber(subscriber.id, {
      status: "bounced",
    });
  }

  /**
   * Reactivate a subscriber
   */
  async reactivate(subscriberId: string): Promise<Subscriber | undefined> {
    logger.info(`[SubscriberService] Reactivating subscriber`, { subscriberId });

    return await this.storage.updateSubscriber(subscriberId, {
      status: "active",
    });
  }

  /**
   * Delete a subscriber
   */
  async deleteSubscriber(id: string): Promise<boolean> {
    logger.info(`[SubscriberService] Deleting subscriber`, { subscriberId: id });
    return await this.storage.deleteSubscriber(id);
  }

  /**
   * Bulk import subscribers from CSV data
   */
  async bulkImport(
    userId: string,
    subscribers: Array<{ email: string; name?: string }>,
    groupId?: string
  ): Promise<BulkImportResult> {
    logger.info(`[SubscriberService] Bulk importing ${subscribers.length} subscribers`);

    const result: BulkImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [],
    };

    for (let i = 0; i < subscribers.length; i++) {
      const row = subscribers[i];
      
      try {
        // Validate email
        if (!row.email || !this.isValidEmail(row.email)) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            email: row.email || "missing",
            error: "Invalid email format",
          });
          continue;
        }

        // Check for duplicates
        const existing = await this.getSubscriberByEmail(userId, row.email);
        if (existing) {
          result.duplicates++;
          continue;
        }

        // Create subscriber
        const subscriber = await this.storage.createSubscriber({
          userId,
          email: row.email.toLowerCase(),
          name: row.name || null,
          status: "active",
        });

        // Add to group if specified
        if (groupId) {
          await this.storage.addSubscriberToGroup(subscriber.id, groupId);
        }

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          email: row.email,
          error: error.message || "Unknown error",
        });
      }
    }

    logger.info(`[SubscriberService] Bulk import complete`, { 
      success: result.success, 
      failed: result.failed, 
      duplicates: result.duplicates 
    });
    return result;
  }

  /**
   * Export subscribers to CSV format
   */
  async exportSubscribers(userId: string): Promise<string> {
    logger.info(`[SubscriberService] Exporting subscribers for user`, { userId });

    const subscribers = await this.getSubscribers(userId);

    // Generate CSV
    const headers = ["email", "name", "status", "created_at"];
    const rows = subscribers.map(s => [
      s.email,
      s.name || "",
      s.status,
      s.createdAt?.toISOString() || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    logger.info(`[SubscriberService] Exported ${subscribers.length} subscribers`);
    return csv;
  }

  /**
   * Add subscriber to group
   */
  async addToGroup(subscriberId: string, groupId: string): Promise<void> {
    logger.info(`[SubscriberService] Adding subscriber to group`, { subscriberId, groupId });
    await this.storage.addSubscriberToGroup(subscriberId, groupId);
  }

  /**
   * Remove subscriber from group
   */
  async removeFromGroup(subscriberId: string, groupId: string): Promise<void> {
    logger.info(`[SubscriberService] Removing subscriber from group`, { subscriberId, groupId });
    await this.storage.removeSubscriberFromGroup(subscriberId, groupId);
  }

  /**
   * Get subscriber count
   */
  async getSubscriberCount(userId: string, status?: SubscriberStatus): Promise<number> {
    const subscribers = await this.getSubscribers(userId);
    
    if (status) {
      return subscribers.filter(s => s.status === status).length;
    }
    
    return subscribers.length;
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(status: string): void {
    const validStatuses = ["active", "unsubscribed", "bounced", "complained"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid subscriber status: ${status}`);
    }
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
