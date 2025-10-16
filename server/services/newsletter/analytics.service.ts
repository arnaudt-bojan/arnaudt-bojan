/**
 * Analytics Service - Newsletter Engagement Tracking
 * Architecture 3 compliant - Pure business logic, no direct database access
 */

import type { IStorage } from "../../storage";
import type {
  CampaignMetrics,
  SubscriberEngagementMetrics,
  OverviewMetrics,
  TrendData,
} from "@shared/newsletter-types";
import type { InsertNewsletterEvent } from "@shared/schema";
import { logger } from "../../logger";

export interface EventData {
  campaignId: string;
  recipientEmail: string;
  eventType: "open" | "click" | "bounce" | "unsubscribe";
  eventData?: any;
  webhookEventId?: string;
}

export class AnalyticsService {
  constructor(private storage: IStorage) {}

  /**
   * Ingest event (idempotent)
   */
  async ingestEvent(data: EventData): Promise<void> {
    logger.info(`[AnalyticsService] Ingesting event:`, {
      campaignId: data.campaignId,
      email: data.recipientEmail,
      type: data.eventType,
    });

    // Check for duplicate webhook event (idempotent ingestion)
    if (data.webhookEventId) {
      const existing = await this.storage.getNewsletterEventByWebhookId(data.webhookEventId);
      if (existing) {
        logger.info(`[AnalyticsService] Event already processed (idempotent)`, { webhookEventId: data.webhookEventId });
        return;
      }
    }

    // Create event record (with unique constraint on newsletterId + email + eventType)
    const event: InsertNewsletterEvent = {
      newsletterId: data.campaignId,
      recipientEmail: data.recipientEmail.toLowerCase(),
      eventType: data.eventType,
      eventData: data.eventData || null,
      webhookEventId: data.webhookEventId || null,
    };

    const created = await this.storage.createNewsletterEvent(event);

    if (created) {
      logger.info(`[AnalyticsService] Event recorded`, { eventType: data.eventType });

      // Update analytics asynchronously
      await this.updateCampaignAnalytics(data.campaignId);
    } else {
      logger.warn(`[AnalyticsService] Event already exists (duplicate):`, {
        campaignId: data.campaignId,
        email: data.recipientEmail,
        type: data.eventType,
      });
    }
  }

  /**
   * Update campaign analytics
   */
  async updateCampaignAnalytics(campaignId: string): Promise<void> {
    logger.info(`[AnalyticsService] Updating campaign analytics`, { campaignId });

    const campaign = await this.storage.getNewsletter(campaignId);
    if (!campaign) {
      logger.error(`[AnalyticsService] Campaign not found`, undefined, { campaignId });
      return;
    }

    // Get all events for this campaign
    const events = await this.storage.getNewsletterEventsByNewsletterId(campaignId);

    // Calculate metrics from real stored events
    const totalSent = Array.isArray(campaign.recipients) ? campaign.recipients.length : 0;
    
    // CRITICAL: Infer opens from clicks (if someone clicked, they must have opened)
    // This works around email clients blocking tracking pixels
    const uniqueOpeners = new Set<string>();
    const uniqueClickers = new Set<string>();
    
    events.forEach(e => {
      const email = e.recipientEmail.toLowerCase();
      if (e.eventType === "open") {
        uniqueOpeners.add(email);
      } else if (e.eventType === "click" || e.eventType === "unsubscribe") {
        // If they clicked ANY link (including unsubscribe), they opened the email
        uniqueOpeners.add(email);
        uniqueClickers.add(email);
      }
    });
    
    const totalOpened = uniqueOpeners.size;
    const totalClicked = uniqueClickers.size;
    const totalBounced = events.filter(e => e.eventType === "bounce").length;
    const totalUnsubscribed = events.filter(e => e.eventType === "unsubscribe").length;

    const totalDelivered = totalSent - totalBounced;
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const clickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    // Update or create analytics
    const existing = await this.storage.getNewsletterAnalytics(campaignId);

    if (existing) {
      await this.storage.updateNewsletterAnalytics(campaignId, {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalUnsubscribed,
        openRate: openRate.toFixed(2),
        clickRate: clickRate.toFixed(2),
        bounceRate: bounceRate.toFixed(2),
        lastUpdated: new Date(),
      });
    } else {
      await this.storage.createNewsletterAnalytics({
        newsletterId: campaignId,
        userId: campaign.userId,
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalUnsubscribed,
        openRate: openRate.toFixed(2),
        clickRate: clickRate.toFixed(2),
        bounceRate: bounceRate.toFixed(2),
      });
    }

    logger.info(`[AnalyticsService] Campaign analytics updated:`, {
      campaignId,
      openRate: openRate.toFixed(2),
      clickRate: clickRate.toFixed(2),
    });
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(campaignId: string): Promise<CampaignMetrics | null> {
    const analytics = await this.storage.getNewsletterAnalytics(campaignId);

    if (!analytics) {
      return null;
    }

    return {
      campaignId,
      sent: analytics.totalSent || 0,
      delivered: analytics.totalDelivered || 0,
      opened: analytics.totalOpened || 0,
      clicked: analytics.totalClicked || 0,
      bounced: analytics.totalBounced || 0,
      unsubscribed: analytics.totalUnsubscribed || 0,
      complained: 0, // Complaint tracking not yet implemented
      openRate: parseFloat(analytics.openRate || "0"),
      clickRate: parseFloat(analytics.clickRate || "0"),
      bounceRate: parseFloat(analytics.bounceRate || "0"),
      unsubscribeRate: analytics.totalSent
        ? ((analytics.totalUnsubscribed || 0) / analytics.totalSent) * 100
        : 0,
    };
  }

  /**
   * Get subscriber engagement metrics
   * TODO: Implement subscriber engagement tracking
   */
  async getSubscriberEngagementMetrics(
    subscriberId: string
  ): Promise<SubscriberEngagementMetrics | null> {
    logger.info(`[AnalyticsService] Getting engagement metrics for subscriber`, { subscriberId });

    // TODO: Implement subscriber engagement tracking
    // For now, return null
    return null;
  }

  /**
   * Get overview metrics for a user
   */
  async getOverviewMetrics(userId: string): Promise<OverviewMetrics> {
    logger.info(`[AnalyticsService] Getting overview metrics for user`, { userId });

    const subscribers = await this.storage.getSubscribersByUserId(userId);
    const campaigns = await this.storage.getNewslettersByUserId(userId);
    const allAnalytics = await this.storage.getNewsletterAnalyticsByUserId(userId);

    const totalSubscribers = subscribers.length;
    const activeSubscribers = subscribers.filter(s => s.status === "active").length;
    const unsubscribedCount = subscribers.filter(s => s.status === "unsubscribed").length;
    const bouncedCount = subscribers.filter(s => s.status === "bounced").length;

    const totalCampaigns = campaigns.length;
    const sentCampaigns = campaigns.filter(c => c.status === "sent").length;

    // Calculate average rates
    let totalOpenRate = 0;
    let totalClickRate = 0;
    let campaignCount = 0;

    for (const analytics of allAnalytics) {
      if (analytics.openRate) {
        totalOpenRate += parseFloat(analytics.openRate);
        campaignCount++;
      }
      if (analytics.clickRate) {
        totalClickRate += parseFloat(analytics.clickRate);
      }
    }

    const averageOpenRate = campaignCount > 0 ? totalOpenRate / campaignCount : 0;
    const averageClickRate = campaignCount > 0 ? totalClickRate / campaignCount : 0;

    return {
      totalSubscribers,
      activeSubscribers,
      unsubscribedCount,
      bouncedCount,
      totalCampaigns,
      sentCampaigns,
      averageOpenRate,
      averageClickRate,
    };
  }

  /**
   * Get trend data for charts
   * TODO: Implement time-series aggregation
   */
  async getTrendData(userId: string, days: number = 30): Promise<TrendData[]> {
    logger.info(`[AnalyticsService] Getting trend data for ${days} days`);

    // TODO: Implement time-series aggregation
    // For now, return empty array
    return [];
  }

  /**
   * Get click heatmap data for a campaign
   */
  async getClickHeatmap(campaignId: string): Promise<Array<{ url: string; clicks: number }>> {
    logger.info(`[AnalyticsService] Getting click heatmap for campaign`, { campaignId });

    const events = await this.storage.getNewsletterEventsByNewsletterId(campaignId);
    const clickEvents = events.filter(e => e.eventType === "click");

    // Aggregate clicks by URL
    const urlMap = new Map<string, number>();

    for (const event of clickEvents) {
      const url = event.eventData?.url || "unknown";
      urlMap.set(url, (urlMap.get(url) || 0) + 1);
    }

    const heatmap = Array.from(urlMap.entries()).map(([url, clicks]) => ({
      url,
      clicks,
    }));

    // Sort by clicks descending
    heatmap.sort((a, b) => b.clicks - a.clicks);

    return heatmap;
  }

  /**
   * Get best send time analysis
   * TODO: Implement send time optimization
   */
  async getBestSendTime(userId: string): Promise<{
    dayOfWeek: number;
    hour: number;
    score: number;
  } | null> {
    logger.info(`[AnalyticsService] Analyzing best send time for user`, { userId });

    // TODO: Implement send time analysis based on historical open rates
    // For now, return null
    return null;
  }

  /**
   * Calculate engagement score for a subscriber
   * TODO: Implement engagement scoring algorithm
   */
  async calculateEngagementScore(subscriberId: string): Promise<number> {
    // TODO: Calculate engagement score based on:
    // - Open rate
    // - Click rate
    // - Recency of engagement
    // - Frequency of engagement
    return 0;
  }
}
