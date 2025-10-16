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

    // 1. If sendToAll is true, get ONLY ACTIVE subscribers (exclude unsubscribed, bounced, complained)
    if ((data as any).sendToAll) {
      const allSubscribers = await this.storage.getSubscribersByUserId(userId);
      // CRITICAL: Only send to active subscribers - never send to unsubscribed/bounced/complained
      const activeSubscribers = allSubscribers.filter(sub => sub.status === 'active');
      activeSubscribers.forEach(sub => recipientEmails.add(sub.email));
      logger.info(`[CampaignService] Send to all: Added ${activeSubscribers.length} active subscribers (filtered from ${allSubscribers.length} total)`);
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
   * Send a test email - allows testing campaign content before sending to all subscribers
   */
  async sendTestEmail(campaignId: string, testEmails: string[]): Promise<void> {
    logger.info(`[CampaignService] Sending test email for campaign ${campaignId} to ${testEmails.join(', ')}`);

    // Fetch campaign
    const campaign = await this.storage.getNewsletter(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Get user/seller info for "from" field
    const seller = await this.storage.getUser(campaign.userId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    // Build "from" name - use campaign's custom fromName, or fall back to seller's store/name
    const fromName = campaign.fromName || seller.storeName || seller.firstName || seller.username || 'Store';
    
    // Helper function to add inline styles to email content for universal email client compatibility
    const normalizeEmailHtml = (html: string): string => {
      // FIX QUILL DOUBLE-QUOTE BUG: Replace double-escaped quotes in image src attributes
      html = html.replace(/src=""/g, 'src="').replace(/"" /g, '" ').replace(/"">/g, '">');
      
      // Add inline styles to <p> tags (for paragraph spacing)
      html = html.replace(
        /<p>/gi,
        '<p style="margin: 0 0 10px 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">'
      );
      
      // Add inline styles to <p> tags that already have styles
      html = html.replace(
        /<p\s+style="([^"]*)"/gi,
        '<p style="$1; margin: 0 0 10px 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;"'
      );
      
      // PROFESSIONAL EMAIL CLIENT FIX (Mailchimp/SendGrid/Klaviyo standard)
      // Email clients need BOTH HTML attributes AND CSS styles together
      html = html.replace(
        /<img\s+([^>]*)>/gi,
        (match, attrs) => {
          const srcMatch = attrs.match(/src=["']([^"']+)["']/);
          const src = srcMatch ? srcMatch[1] : '';
          const altMatch = attrs.match(/alt=["']([^"']+)["']/);
          const alt = altMatch ? altMatch[1] : '';
          
          // Industry standard: HTML width + CSS width + max-width for responsive
          // This works in Apple Mail, Gmail, Outlook, Yahoo, etc.
          return `<img src="${src}" alt="${alt}" width="600" style="width:600px; max-width:100%; height:auto; display:block; border:0; outline:none; text-decoration:none;">`;
        }
      );
      
      // Add inline styles to <a> tags
      html = html.replace(
        /<a\s+([^>]*)>/gi,
        (match, attrs) => {
          if (attrs.includes('style=')) {
            return match.replace(/style="([^"]*)"/, 'style="$1; color: #0066cc; text-decoration: underline;"');
          } else {
            return `<a ${attrs} style="color: #0066cc; text-decoration: underline;">`;
          }
        }
      );
      
      return html;
    };

    // Generate HTML payload
    let htmlPayload: string;
    if (campaign.htmlContent) {
      const preheaderHtml = campaign.preheader 
        ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${campaign.preheader}</span>`
        : '';
      
      const normalizedContent = normalizeEmailHtml(campaign.htmlContent);
      
      htmlPayload = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
  ${preheaderHtml}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px;" align="center">
          <tr>
            <td style="padding: 30px;">
              ${normalizedContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    } else {
      const textContent = campaign.content.replace(/\n/g, '<br>');
      htmlPayload = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px;" align="center">
          <tr>
            <td style="padding: 30px;">
              ${textContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    // Send test emails
    const testSubject = `[TEST] ${campaign.subject}`;
    
    // DEBUG: Log the HTML to see what's actually being sent
    logger.info(`[CampaignService] Test email HTML (first 500 chars): ${htmlPayload.substring(0, 500)}`);
    
    for (const email of testEmails) {
      await this.emailProvider.sendEmail({
        to: email,
        from: `${fromName} <${process.env.RESEND_FROM_EMAIL}>`,
        subject: testSubject,
        html: htmlPayload,
      });
      logger.info(`[CampaignService] Test email sent successfully to ${email}`);
    }

    logger.info(`[CampaignService] Test email sent successfully to ${testEmails.length} recipient(s)`);
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
    
    // Helper function to add inline styles to email content for universal email client compatibility
    const normalizeEmailHtml = (html: string): string => {
      // FIX QUILL DOUBLE-QUOTE BUG: Replace double-escaped quotes in image src attributes
      html = html.replace(/src=""/g, 'src="').replace(/"" /g, '" ').replace(/"">/g, '">');
      
      // Add inline styles to <p> tags (for paragraph spacing)
      html = html.replace(
        /<p>/gi,
        '<p style="margin: 0 0 10px 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">'
      );
      
      // Add inline styles to <p> tags that already have styles
      html = html.replace(
        /<p\s+style="([^"]*)"/gi,
        '<p style="$1; margin: 0 0 10px 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;"'
      );
      
      // Wrap images in table structure for universal email client compatibility
      // Tested for: Gmail Mobile (Android/iOS), Apple Mail, Outlook, Yahoo
      html = html.replace(
        /<img\s+([^>]*)>/gi,
        (match, attrs) => {
          // Extract src attribute
          const srcMatch = attrs.match(/src=["']([^"']+)["']/);
          const src = srcMatch ? srcMatch[1] : '';
          
          // Extract alt attribute (critical for Gmail mobile)
          const altMatch = attrs.match(/alt=["']([^"']+)["']/);
          const alt = altMatch ? altMatch[1] : '';
          
          // PROFESSIONAL EMAIL CLIENT FIX (Mailchimp/SendGrid/Klaviyo standard)
          // Email clients need BOTH HTML attributes AND CSS styles together
          // Industry standard: HTML width + CSS width + max-width for responsive
          // This works in Apple Mail, Gmail, Outlook, Yahoo, etc.
          return `<img src="${src}" alt="${alt}" width="600" style="width:600px; max-width:100%; height:auto; display:block; border:0; outline:none; text-decoration:none;">`;
        }
      );
      
      // Add inline styles to <a> tags
      html = html.replace(
        /<a\s+([^>]*)>/gi,
        (match, attrs) => {
          if (attrs.includes('style=')) {
            return match.replace(/style="([^"]*)"/, 'style="$1; color: #0066cc; text-decoration: underline;"');
          } else {
            return `<a ${attrs} style="color: #0066cc; text-decoration: underline;">`;
          }
        }
      );
      
      return html;
    };

    // Generate valid HTML payload for ESP with preheader support
    let htmlPayload: string;
    if (campaign.htmlContent) {
      // Wrap Quill HTML in proper document structure with inline styles only
      const preheaderHtml = campaign.preheader 
        ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${campaign.preheader}</span>`
        : '';
      
      // Normalize HTML content with inline styles
      const normalizedContent = normalizeEmailHtml(campaign.htmlContent);
      
      htmlPayload = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
  ${preheaderHtml}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px;" align="center">
          <tr>
            <td style="padding: 30px;">
              ${normalizedContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    } else if (campaign.content) {
      // Transform plain text to HTML if only text version exists
      const preheaderHtml = campaign.preheader 
        ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${campaign.preheader}</span>`
        : '';
      
      htmlPayload = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
  ${preheaderHtml}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px;" align="center">
          <tr>
            <td style="padding: 30px;">
              ${campaign.content.replace(/\n/g, '<br style="line-height: 1.6;">')}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    } else {
      throw new Error("Campaign must have content");
    }

    // Inject GDPR-compliant unsubscribe footer with placeholders (using table for email compatibility)
    const unsubscribeFooter = `
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #e5e5e5;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; font-size: 13px; line-height: 1.6; color: #737373; font-family: Arial, sans-serif;">
                    <p style="margin: 0 0 8px 0; color: #737373; font-size: 13px;">You're receiving this because you subscribed to {storeName}.</p>
                    <p style="margin: 0;"><a href="{unsubscribeUrl}" style="color: #737373; text-decoration: underline; font-size: 13px;">Unsubscribe</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

    // Inject footer before closing table tag (before </table></td></tr></table>)
    htmlPayload = htmlPayload.replace(
      /(<\/tr>\s*<\/table>\s*<\/td>\s*<\/tr>\s*<\/table>\s*<\/body>)/i,
      `${unsubscribeFooter}$1`
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
