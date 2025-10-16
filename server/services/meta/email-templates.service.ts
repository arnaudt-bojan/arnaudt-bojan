/**
 * Meta Ads Email Templates Service
 * 
 * Handles all Meta Ads notification emails with Resend integration:
 * - Low credit alerts with balance warnings
 * - Campaign activation confirmations
 * - Campaign completion summaries with metrics
 * - Budget depleted urgent alerts
 * 
 * Uses Upfirst branding with dark mode support
 */

import type { MetaCampaign, MetaCampaignMetricsDaily } from '@shared/schema';
import type { LowBalanceCampaign } from './budget.service';
import { emailProvider } from '../email-provider.service';
import { formatPrice } from '../../email-template';
import { 
  generateEmailBaseLayout,
  generateUpfirstHeader,
  generateUpfirstFooter,
  generateCTAButton,
} from '../../utils/email-templates';
import { logger } from '../../logger';

/**
 * Get base URL for links in emails
 */
function getBaseUrl(): string {
  const baseUrl = process.env.REPLIT_DOMAINS 
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
    : `http://localhost:${process.env.PORT || 5000}`;
  return baseUrl;
}

/**
 * Format date for email display
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Not set';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Format targeting summary for display
 */
function formatTargeting(targeting: any): string {
  if (!targeting) return 'Not specified';
  
  const parts: string[] = [];
  
  if (targeting.countries && Array.isArray(targeting.countries)) {
    parts.push(`Countries: ${targeting.countries.join(', ')}`);
  }
  
  if (targeting.ageMin && targeting.ageMax) {
    parts.push(`Age: ${targeting.ageMin}-${targeting.ageMax}`);
  }
  
  if (targeting.gender && targeting.gender !== 'all') {
    parts.push(`Gender: ${targeting.gender}`);
  }
  
  return parts.join(' • ') || 'Broad targeting';
}

export class MetaEmailTemplatesService {
  private fromEmail = 'notifications@upfirst.io';
  
  /**
   * Send low credit alert email
   * Warns seller when campaign credit is running low
   */
  async sendLowCreditAlert(
    campaign: MetaCampaign,
    lowBalanceData: LowBalanceCampaign,
    sellerEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const baseUrl = getBaseUrl();
      const budgetUrl = `${baseUrl}/seller-dashboard/meta-ads/budget`;
      
      // Determine alert styling based on severity
      const isUrgent = lowBalanceData.alertLevel === 'critical';
      const alertColor = isUrgent ? '#ef4444' : '#f59e0b';
      const alertBg = isUrgent ? '#fef2f2' : '#fffbeb';
      const alertIcon = isUrgent ? '🚨' : '⚠️';
      
      // Build email content
      const content = `
        <!-- Alert Banner -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px;">
          <tr>
            <td style="padding: 20px; background-color: ${alertBg} !important; border-left: 4px solid ${alertColor}; border-radius: 6px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                ${alertIcon} ${isUrgent ? 'Critical' : 'Warning'}: Low Ad Credit Balance
              </p>
            </td>
          </tr>
        </table>

        <!-- Main Message -->
        <p style="margin: 0 0 20px; font-size: 16px; color: #1a1a1a !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Your Meta Ads campaign <strong>${campaign.name}</strong> is running low on credit and may pause soon.
        </p>

        <!-- Balance Details -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
          <tr>
            <td style="padding: 25px;">
              
              <!-- Current Balance -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Current Balance
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${alertColor} !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ${formatPrice(lowBalanceData.currentBalance, 'USD')}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Daily Spend Rate -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 15px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Daily Spend Rate
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${formatPrice(lowBalanceData.dailySpendRate, 'USD')}/day
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Days Remaining -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Estimated Days Remaining
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${Math.floor(lowBalanceData.daysRemaining)} ${lowBalanceData.daysRemaining === 1 ? 'day' : 'days'}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        <!-- Action Required -->
        <p style="margin: 0 0 25px; font-size: 16px; color: #1a1a1a !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          To keep your campaign running, please add credit to your account. Your campaign will automatically pause when the balance reaches zero.
        </p>

        <!-- CTA Button -->
        ${generateCTAButton('Add Credit Now', budgetUrl, '#6366f1')}

        <!-- Footer Note -->
        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280 !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Campaign status: <strong style="color: #1a1a1a !important;" class="dark-mode-text-dark">${campaign.status}</strong>
        </p>
      `;

      // Generate full email
      const html = generateEmailBaseLayout({
        header: generateUpfirstHeader(),
        content,
        footer: generateUpfirstFooter(),
        preheader: `Your Meta Ads campaign has ${Math.floor(lowBalanceData.daysRemaining)} days of credit remaining`,
        darkModeSafe: true,
      });

      // Send email
      const result = await emailProvider.sendEmail({
        from: this.fromEmail,
        to: sellerEmail,
        subject: `${alertIcon} Meta Ad Credit Running Low - ${campaign.name}`,
        html,
        tags: [
          { name: 'type', value: 'meta-ads-low-credit' },
          { name: 'campaign_id', value: campaign.id },
        ],
      });

      if (result.success) {
        logger.info('[MetaEmailTemplates] Low credit alert sent', {
          campaignId: campaign.id,
          sellerEmail,
          daysRemaining: lowBalanceData.daysRemaining,
        });
      }

      return result;
    } catch (error) {
      logger.error('[MetaEmailTemplates] Failed to send low credit alert', {
        error,
        campaignId: campaign.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  /**
   * Send campaign activation email
   * Confirms campaign is now live on Meta
   */
  async sendCampaignActivation(
    campaign: MetaCampaign,
    sellerEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const baseUrl = getBaseUrl();
      const dashboardUrl = `${baseUrl}/seller-dashboard/meta-ads/analytics?campaign=${campaign.id}`;
      const targetingSummary = formatTargeting(campaign.targeting);
      
      // Build email content
      const content = `
        <!-- Success Banner -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px;">
          <tr>
            <td style="padding: 20px; background-color: #f0fdf4 !important; border-left: 4px solid #22c55e; border-radius: 6px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                ✅ Campaign Successfully Activated
              </p>
            </td>
          </tr>
        </table>

        <!-- Main Message -->
        <p style="margin: 0 0 20px; font-size: 16px; color: #1a1a1a !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Great news! Your Meta Ads campaign <strong>${campaign.name}</strong> is now live and reaching your target audience.
        </p>

        <!-- Campaign Details -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
          <tr>
            <td style="padding: 25px;">
              
              <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                Campaign Details
              </h2>

              <!-- Campaign Name -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 12px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Campaign Name
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${campaign.name}
                    </p>
                  </td>
                </tr>
              </table>

              ${campaign.metaCampaignId ? `
              <!-- Meta Campaign ID -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 12px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Meta Campaign ID
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 13px; font-family: 'Courier New', monospace; color: #1a1a1a !important;" class="dark-mode-text-dark">
                      ${campaign.metaCampaignId}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Schedule -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 15px 0 12px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Start Date
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${formatDate(campaign.startDate)}
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 12px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      End Date
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${formatDate(campaign.endDate)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Budget -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 15px 0 12px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Daily Budget
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${formatPrice(parseFloat(campaign.dailyBudget), 'USD')}
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 12px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Total Budget
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${formatPrice(parseFloat(campaign.lifetimeBudget), 'USD')}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Targeting -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 15px 0 0; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <tr>
                  <td style="padding: 8px 0;" colspan="2">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Targeting
                    </p>
                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;" class="dark-mode-text-dark">
                      ${targetingSummary}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        <!-- Next Steps -->
        <p style="margin: 0 0 25px; font-size: 16px; color: #1a1a1a !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Your ads are now being shown to your target audience. You can track performance and view detailed analytics in your dashboard.
        </p>

        <!-- CTA Button -->
        ${generateCTAButton('View Analytics Dashboard', dashboardUrl, '#6366f1')}

        <!-- Footer Note -->
        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280 !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          💡 <strong>Tip:</strong> Check your campaign performance regularly to optimize your results.
        </p>
      `;

      // Generate full email
      const html = generateEmailBaseLayout({
        header: generateUpfirstHeader(),
        content,
        footer: generateUpfirstFooter(),
        preheader: `Your campaign "${campaign.name}" is now live on Meta`,
        darkModeSafe: true,
      });

      // Send email
      const result = await emailProvider.sendEmail({
        from: this.fromEmail,
        to: sellerEmail,
        subject: `✅ Meta Ad Campaign Activated - ${campaign.name}`,
        html,
        tags: [
          { name: 'type', value: 'meta-ads-activation' },
          { name: 'campaign_id', value: campaign.id },
        ],
      });

      if (result.success) {
        logger.info('[MetaEmailTemplates] Campaign activation email sent', {
          campaignId: campaign.id,
          sellerEmail,
        });
      }

      return result;
    } catch (error) {
      logger.error('[MetaEmailTemplates] Failed to send activation email', {
        error,
        campaignId: campaign.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  /**
   * Send campaign completed email
   * Provides performance summary and next steps
   */
  async sendCampaignCompleted(
    campaign: MetaCampaign,
    metrics: {
      totalSpend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      roas: number;
    },
    sellerEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const baseUrl = getBaseUrl();
      const createCampaignUrl = `${baseUrl}/seller-dashboard/meta-ads/create`;
      const analyticsUrl = `${baseUrl}/seller-dashboard/meta-ads/analytics?campaign=${campaign.id}`;
      
      // Calculate derived metrics
      const ctr = metrics.impressions > 0 
        ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2)
        : '0.00';
      
      const cpc = metrics.clicks > 0
        ? (metrics.totalSpend / metrics.clicks).toFixed(2)
        : '0.00';
      
      // Build email content
      const content = `
        <!-- Header Banner -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px;">
          <tr>
            <td style="padding: 20px; background-color: #eff6ff !important; border-left: 4px solid #3b82f6; border-radius: 6px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                🎯 Campaign Completed Successfully
              </p>
            </td>
          </tr>
        </table>

        <!-- Main Message -->
        <p style="margin: 0 0 20px; font-size: 16px; color: #1a1a1a !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Your Meta Ads campaign <strong>${campaign.name}</strong> has completed its run. Here's how it performed:
        </p>

        <!-- Performance Summary -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
          <tr>
            <td style="padding: 25px;">
              
              <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                Performance Summary
              </h2>

              <!-- Total Spend -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Total Spend
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${formatPrice(metrics.totalSpend, 'USD')}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Impressions & Reach -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 15px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Impressions
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${metrics.impressions.toLocaleString()}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Clicks -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Clicks
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${metrics.clicks.toLocaleString()}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTR -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Click-Through Rate (CTR)
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${ctr}%
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CPC -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Cost Per Click (CPC)
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${formatPrice(parseFloat(cpc), 'USD')}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Conversions -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 15px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Conversions
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${metrics.conversions.toLocaleString()}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- ROAS -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; background-color: #eff6ff !important; padding: 15px; border-radius: 6px;">
                <tr>
                  <td style="padding: 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Return on Ad Spend (ROAS)
                    </p>
                  </td>
                  <td style="text-align: right; padding: 0;">
                    <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${metrics.roas >= 1 ? '#22c55e' : '#ef4444'} !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ${metrics.roas.toFixed(2)}x
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        <!-- Next Steps -->
        <p style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          What's Next?
        </p>
        
        <p style="margin: 0 0 25px; font-size: 16px; color: #1a1a1a !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Ready to reach more customers? Create a new campaign to continue growing your business with Meta Ads.
        </p>

        <!-- CTA Buttons -->
        ${generateCTAButton('Create New Campaign', createCampaignUrl, '#6366f1')}
        
        <div style="text-align: center; margin: 15px 0;">
          <a href="${analyticsUrl}" style="color: #6366f1 !important; text-decoration: underline; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            View Detailed Analytics
          </a>
        </div>

        <!-- Footer Note -->
        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280 !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Campaign ran from ${formatDate(campaign.startDate)} to ${formatDate(campaign.endDate || new Date())}
        </p>
      `;

      // Generate full email
      const html = generateEmailBaseLayout({
        header: generateUpfirstHeader(),
        content,
        footer: generateUpfirstFooter(),
        preheader: `Your campaign generated ${metrics.impressions.toLocaleString()} impressions and ${metrics.clicks.toLocaleString()} clicks`,
        darkModeSafe: true,
      });

      // Send email
      const result = await emailProvider.sendEmail({
        from: this.fromEmail,
        to: sellerEmail,
        subject: `🎯 Meta Ad Campaign Completed - ${campaign.name}`,
        html,
        tags: [
          { name: 'type', value: 'meta-ads-completed' },
          { name: 'campaign_id', value: campaign.id },
        ],
      });

      if (result.success) {
        logger.info('[MetaEmailTemplates] Campaign completed email sent', {
          campaignId: campaign.id,
          sellerEmail,
          totalSpend: metrics.totalSpend,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          conversions: metrics.conversions,
          roas: metrics.roas,
        });
      }

      return result;
    } catch (error) {
      logger.error('[MetaEmailTemplates] Failed to send completion email', {
        error,
        campaignId: campaign.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  /**
   * Send budget depleted email
   * Urgent alert when campaign has run out of credit
   */
  async sendBudgetDepleted(
    campaign: MetaCampaign,
    finalSpend: number,
    sellerEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const baseUrl = getBaseUrl();
      const budgetUrl = `${baseUrl}/seller-dashboard/meta-ads/budget`;
      
      // Build email content
      const content = `
        <!-- Urgent Alert Banner -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px;">
          <tr>
            <td style="padding: 20px; background-color: #fef2f2 !important; border-left: 4px solid #ef4444; border-radius: 6px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                🚨 Campaign Paused - Budget Depleted
              </p>
            </td>
          </tr>
        </table>

        <!-- Main Message -->
        <p style="margin: 0 0 20px; font-size: 16px; color: #1a1a1a !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          Your Meta Ads campaign <strong>${campaign.name}</strong> has been automatically paused because your ad credit balance has reached zero.
        </p>

        <!-- Spend Summary -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px; background-color: #f9fafb !important; border-radius: 8px;" class="dark-mode-bg-white">
          <tr>
            <td style="padding: 25px;">
              
              <!-- Current Balance -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Current Balance
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #ef4444 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ${formatPrice(0, 'USD')}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Total Spent -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Total Spent Before Pause
                    </p>
                  </td>
                  <td style="text-align: right; padding: 8px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                      ${formatPrice(finalSpend, 'USD')}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        <!-- Impact Message -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px;">
          <tr>
            <td style="padding: 16px; background-color: #fffbeb !important; border-left: 4px solid #f59e0b; border-radius: 6px;">
              <div style="color: #92400e !important; font-size: 14px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <strong>What this means:</strong><br>
                Your ads are no longer being shown to potential customers. To resume your campaign and continue reaching your audience, you need to add credit to your account.
              </div>
            </td>
          </tr>
        </table>

        <!-- Action Required -->
        <p style="margin: 0 0 25px; font-size: 16px; color: #1a1a1a !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
          <strong>Action Required:</strong> Add credit now to resume your campaign. Once credit is added, your campaign will automatically resume showing ads.
        </p>

        <!-- CTA Button -->
        ${generateCTAButton('Add Credit to Resume', budgetUrl, '#ef4444')}

        <!-- Footer Note -->
        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280 !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Need help? Contact our support team at <a href="mailto:support@upfirst.io" style="color: #6366f1 !important; text-decoration: underline;">support@upfirst.io</a>
        </p>
      `;

      // Generate full email
      const html = generateEmailBaseLayout({
        header: generateUpfirstHeader(),
        content,
        footer: generateUpfirstFooter(),
        preheader: 'Your campaign has been paused due to insufficient credit',
        darkModeSafe: true,
      });

      // Send email
      const result = await emailProvider.sendEmail({
        from: this.fromEmail,
        to: sellerEmail,
        subject: `🚨 Meta Ad Budget Depleted - ${campaign.name}`,
        html,
        tags: [
          { name: 'type', value: 'meta-ads-budget-depleted' },
          { name: 'campaign_id', value: campaign.id },
        ],
      });

      if (result.success) {
        logger.info('[MetaEmailTemplates] Budget depleted email sent', {
          campaignId: campaign.id,
          sellerEmail,
          finalSpend,
        });
      }

      return result;
    } catch (error) {
      logger.error('[MetaEmailTemplates] Failed to send budget depleted email', {
        error,
        campaignId: campaign.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }
}

// Export singleton instance
export const metaEmailTemplates = new MetaEmailTemplatesService();
