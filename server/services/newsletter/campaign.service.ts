/**
 * Campaign Service - Newsletter Campaign Orchestration
 * Architecture 3 compliant - Pure business logic, no direct database or email sending
 */

import type { IStorage } from "../../storage";
import type { IEmailProvider } from "../email-provider.service";
import type { NewsletterJobQueue } from "./job-queue.service";
import type {
  CreateCampaignDTO,
  SendCampaignResult,
  CreateABTestDTO,
  ABTestResult,
  CampaignStatus,
} from "@shared/newsletter-types";
import type { Newsletter, User, Subscriber } from "@shared/schema";
import { logger } from "../../logger";

export class CampaignService {
  constructor(
    private storage: IStorage,
    private emailProvider: IEmailProvider,
    private jobQueue: NewsletterJobQueue
  ) {}

  /**
   * Create a new campaign
   */
  async createCampaign(userId: string, data: CreateCampaignDTO): Promise<Newsletter> {
    logger.info(`[CampaignService] Creating campaign for user ${userId}`);

    // Collect recipients from multiple sources
    const recipientEmails = new Set<string>();

    // 1. If sendToAll is true, get all subscribers for this user
    if ((data as any).sendToAll) {
      const allSubscribers = await this.storage.getSubscribersByUserId(userId);
      allSubscribers.forEach(sub => recipientEmails.add(sub.email));
      logger.info(`[CampaignService] Send to all: Added ${allSubscribers.length} subscribers`);
    }

    // 2. Add direct recipients from the request
    if (data.recipients && data.recipients.length > 0) {
      data.recipients.forEach(email => recipientEmails.add(email));
      logger.info(`[CampaignService] Added ${data.recipients.length} direct recipients`);
    }

    // 3. Add recipients from segments and groups
    const subscribersFromSegmentsAndGroups = await this.resolveRecipients(
      userId, 
      data.segmentIds, 
      data.groupIds
    );
    subscribersFromSegmentsAndGroups.forEach(sub => recipientEmails.add(sub.email));

    if (subscribersFromSegmentsAndGroups.length > 0) {
      logger.info(`[CampaignService] Added ${subscribersFromSegmentsAndGroups.length} recipients from segments/groups`);
    }

    // Validate we have at least one recipient
    const finalRecipients = Array.from(recipientEmails);
    if (finalRecipients.length === 0) {
      throw new Error("No recipients found for this campaign");
    }

    const campaign = await this.storage.createNewsletter({
      userId,
      subject: data.subject,
      preheader: data.preheader || null,
      fromName: data.fromName || null,
      content: data.content,
      htmlContent: data.htmlContent || null,
      recipients: finalRecipients,
      groupIds: data.groupIds || null,
      segmentIds: data.segmentIds || null,
      status: data.scheduledAt ? "draft" : "draft",
    });

    logger.info(`[CampaignService] Campaign created: ${campaign.id} with ${finalRecipients.length} total recipients`);

    // If scheduled, create schedule entry
    if (data.scheduledAt) {
      await this.scheduleCampaign(campaign.id, data.scheduledAt, data.timezone || 'UTC');
    }

    return campaign;
  }

  /**
   * Send a campaign immediately
   */
  async sendCampaign(campaignId: string): Promise<SendCampaignResult> {
    logger.info(`[CampaignService] Sending campaign ${campaignId}`);

    // Fetch campaign
    const campaign = await this.storage.getNewsletter(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status === "sent") {
      throw new Error("Campaign has already been sent");
    }

    // Get user/seller info for "from" field
    const seller = await this.storage.getUser(campaign.userId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    // Get recipients
    const recipients = Array.isArray(campaign.recipients)
      ? campaign.recipients.map((email: any) => ({ email: String(email) }))
      : [];

    if (recipients.length === 0) {
      throw new Error("No recipients found");
    }

    // Build "from" name - use campaign's custom fromName, or fall back to seller's store/name
    const fromName = campaign.fromName || seller.storeName || seller.firstName || seller.username || 'Store';
    
    // Generate valid HTML payload for ESP with preheader support
    let htmlPayload: string;
    if (campaign.htmlContent) {
      // Use HTML version if available, add preheader if exists
      if (campaign.preheader) {
        // Inject preheader at the start of HTML body
        htmlPayload = campaign.htmlContent.replace(
          /<body[^>]*>/i,
          `$&<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${campaign.preheader}</span>`
        );
      } else {
        htmlPayload = campaign.htmlContent;
      }
    } else if (campaign.content) {
      // Transform plain text to HTML if only text version exists
      const preheaderHtml = campaign.preheader 
        ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${campaign.preheader}</span>`
        : '';
      
      htmlPayload = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${preheaderHtml}
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    ${campaign.content.replace(/\n/g, '<br>')}
  </div>
</body>
</html>`;
    } else {
      throw new Error("Campaign must have content");
    }

    // Inject GDPR-compliant unsubscribe footer with placeholders
    const unsubscribeFooter = `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#999;">
  <p>You're receiving this because you subscribed to {storeName}.</p>
  <p><a href="{unsubscribeUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a></p>
</div>`;

    // Inject footer before closing body tag
    htmlPayload = htmlPayload.replace(
      /<\/body>/i,
      `${unsubscribeFooter}</body>`
    );

    // Enqueue send job for background processing (with error handling)
    try {
      const jobId = await this.jobQueue.enqueue({
        type: 'send_campaign',
        data: {
          campaignId,
          recipients,
          from: `${fromName} <hello@upfirst.io>`,
          replyTo: seller.email || undefined,
          subject: campaign.subject,
          htmlContent: htmlPayload, // HTML with unsubscribe footer template (has placeholders)
          storeName: fromName, // For personalizing unsubscribe footer
        },
        priority: 5,
      });

      // Only update status after successful enqueue
      await this.storage.updateNewsletter(campaignId, {
        status: "sending",
      });

      logger.info(`[CampaignService] Campaign ${campaignId} queued successfully (job: ${jobId})`);
      
      return {
        success: true,
        campaignId,
        recipientCount: recipients.length,
      };
    } catch (error) {
      logger.error(`[CampaignService] Failed to enqueue campaign ${campaignId}:`, error);
      throw new Error(`Failed to queue campaign for sending: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Schedule a campaign for future sending
   */
  async scheduleCampaign(
    campaignId: string,
    scheduledAt: Date,
    timezone: string = 'UTC'
  ): Promise<void> {
    logger.info(`[CampaignService] Scheduling campaign ${campaignId} for ${scheduledAt}`);

    try {
      // Enqueue scheduled send job
      const jobId = await this.jobQueue.enqueue({
        type: 'send_scheduled_campaign',
        data: { campaignId },
        scheduledFor: scheduledAt,
        priority: 3,
      });

      // Only update campaign status to "scheduled" after successful enqueue
      await this.storage.updateNewsletter(campaignId, {
        status: "scheduled",
      });

      logger.info(`[CampaignService] Campaign ${campaignId} scheduled successfully (job: ${jobId})`);
    } catch (error) {
      logger.error(`[CampaignService] Failed to schedule campaign ${campaignId}:`, error);
      throw new Error(`Failed to schedule campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a scheduled campaign
   */
  async cancelScheduledCampaign(campaignId: string): Promise<void> {
    logger.info(`[CampaignService] Cancelling scheduled campaign ${campaignId}`);

    // Find and cancel the scheduled job in the queue
    const jobId = await this.jobQueue.findJobByCampaignId(campaignId, 'send_scheduled_campaign');
    
    if (!jobId) {
      logger.warn(`[CampaignService] No queued job found for campaign ${campaignId}`);
      throw new Error("No scheduled job found for this campaign");
    }

    const cancelled = await this.jobQueue.cancelJob(jobId);
    
    if (!cancelled) {
      logger.warn(`[CampaignService] Failed to cancel job ${jobId} - it may already be running or completed`);
      throw new Error("Failed to cancel scheduled campaign - job may already be running");
    }

    // Only update campaign status to draft if cancellation succeeded
    await this.storage.updateNewsletter(campaignId, {
      status: "draft",
    });

    logger.info(`[CampaignService] Campaign ${campaignId} schedule cancelled successfully`);
  }

  /**
   * Send a test email
   */
  async sendTestEmail(campaignId: string, testEmail: string): Promise<void> {
    logger.info(`[CampaignService] Sending test email for campaign ${campaignId} to ${testEmail}`);

    const campaign = await this.storage.getNewsletter(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const seller = await this.storage.getUser(campaign.userId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    // Use same HTML normalization as production sends
    let htmlPayload: string;
    if (campaign.htmlContent) {
      htmlPayload = campaign.htmlContent;
    } else if (campaign.content) {
      htmlPayload = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    ${campaign.content.replace(/\n/g, '<br>')}
  </div>
</body>
</html>`;
    } else {
      throw new Error("Campaign must have content");
    }

    const result = await this.emailProvider.sendEmail({
      to: testEmail,
      from: `${seller.firstName || seller.username} via Upfirst <hello@upfirst.io>`,
      replyTo: seller.email || undefined,
      subject: `[TEST] ${campaign.subject}`,
      html: htmlPayload,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send test email");
    }

    logger.info(`[CampaignService] Test email sent successfully to ${testEmail}`);
  }

  /**
   * Create an A/B test for a campaign
   * TODO: Add A/B test storage methods to IStorage interface
   */
  async createABTest(data: CreateABTestDTO): Promise<string> {
    logger.info(`[CampaignService] Creating A/B test for campaign ${data.campaignId}`);

    // Validate campaign exists
    const campaign = await this.storage.getNewsletter(data.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // TODO: Implement A/B test storage methods
    // For now, this is a placeholder that would call storage.createABTest()
    throw new Error("A/B testing not yet fully implemented - requires storage interface updates");
  }

  /**
   * Get A/B test results
   * TODO: Add A/B test storage methods to IStorage interface
   */
  async getABTestResults(testId: string): Promise<ABTestResult> {
    logger.info(`[CampaignService] Getting A/B test results for ${testId}`);

    // TODO: Implement A/B test storage methods
    // For now, this is a placeholder that would call storage.getABTest()
    throw new Error("A/B testing not yet fully implemented - requires storage interface updates");
  }

  /**
   * Select winning variant and send to remaining subscribers
   * TODO: Add A/B test storage methods to IStorage interface
   */
  async selectWinningVariant(testId: string, variantId: 'A' | 'B'): Promise<void> {
    logger.info(`[CampaignService] Selecting variant ${variantId} as winner for test ${testId}`);

    // TODO: Implement A/B test storage methods
    // For now, this is a placeholder that would call storage.updateABTest()
    throw new Error("A/B testing not yet fully implemented - requires storage interface updates");
  }

  /**
   * Resolve recipients from segments and groups
   */
  private async resolveRecipients(
    userId: string,
    segmentIds?: string[],
    groupIds?: string[]
  ): Promise<Subscriber[]> {
    const subscribers = new Map<string, Subscriber>();

    // Get subscribers from groups
    if (groupIds && groupIds.length > 0) {
      for (const groupId of groupIds) {
        const groupSubscribers = await this.storage.getSubscribersByGroupId(userId, groupId);
        groupSubscribers.forEach(sub => subscribers.set(sub.email, sub));
      }
    }

    // Get subscribers from segments
    if (segmentIds && segmentIds.length > 0) {
      // Note: Segment evaluation would be handled by SegmentationService
      // For now, we'll just note that this would evaluate segment rules
      // and add matching subscribers
      logger.info(`[CampaignService] Segment evaluation not yet implemented`);
    }

    // Filter out unsubscribed/bounced
    const activeSubscribers = Array.from(subscribers.values()).filter(
      sub => sub.status === 'active'
    );

    return activeSubscribers;
  }

  /**
   * Pause a running campaign
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    logger.info(`[CampaignService] Pausing campaign ${campaignId}`);

    // In a full implementation, we'd pause the send job
    // For now, just update status
    await this.storage.updateNewsletter(campaignId, {
      status: "draft",
    });

    logger.info(`[CampaignService] Campaign ${campaignId} paused`);
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(campaignId: string): Promise<SendCampaignResult> {
    logger.info(`[CampaignService] Resuming campaign ${campaignId}`);
    
    // Resume by sending the campaign
    return this.sendCampaign(campaignId);
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string) {
    // TODO: Add getNewsletterAnalyticsByNewsletterId to storage interface
    // For now, return zero stats as placeholder
    logger.info(`[CampaignService] Getting stats for campaign ${campaignId}`);
    
    return {
      sent: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      openRate: 0,
      clickRate: 0,
    };
  }
}
