import { IStorage } from '../../storage';
import { logger } from '../../logger';
import { MetaOAuthService } from './meta-oauth.service';
import { 
  InsertMetaCampaignMetricsDaily, 
  MetaCampaignMetricsDaily 
} from '@shared/schema';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface MetaInsightsData {
  impressions?: number;
  clicks?: number;
  reach?: number;
  frequency?: number;
  spend?: number;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  date_start?: string;
  date_stop?: string;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  totalSpend: string;
  totalRevenue: string;
  avgCpm: string;
  avgCpc: string;
  avgCtr: string;
  roas: string;
  dateRange: DateRange;
}

export interface SellerMetricsSummary {
  sellerId: string;
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: string;
  totalRevenue: string;
  totalImpressions: number;
  totalClicks: number;
  avgCpm: string;
  avgCpc: string;
  avgCtr: string;
  avgRoas: string;
  dateRange?: DateRange;
}

export interface WebhookEventData {
  campaignId: string;
  eventType: 'status_change' | 'spend_update' | 'performance_alert';
  data: any;
}

/**
 * AnalyticsService
 * Architecture 3 service for Meta Insights API integration and KPI analytics
 * 
 * Handles:
 * - Fetching campaign insights from Meta Marketing API
 * - Daily metrics synchronization and storage
 * - KPI calculations (CPM, CPC, CTR, ROAS)
 * - Campaign performance aggregation
 * - Seller-wide metrics summaries
 * - Webhook event ingestion for real-time updates
 */
export class AnalyticsService {
  private readonly META_GRAPH_VERSION = 'v21.0';
  private readonly META_GRAPH_BASE = `https://graph.facebook.com/${this.META_GRAPH_VERSION}`;
  
  constructor(
    private storage: IStorage,
    private oauthService: MetaOAuthService
  ) {}

  /**
   * Fetch campaign insights from Meta Insights API
   * GET /{ad_id}/insights with date range and breakdowns
   */
  async fetchCampaignInsights(
    campaignId: string,
    dateRange: DateRange
  ): Promise<{ success: boolean; data?: MetaInsightsData[]; error?: string }> {
    try {
      const campaign = await this.storage.getMetaCampaign(campaignId);
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      if (!campaign.metaAdId) {
        return { success: false, error: 'Campaign not yet created on Meta' };
      }

      const adAccount = await this.storage.getMetaAdAccount(campaign.adAccountId);
      
      if (!adAccount) {
        return { success: false, error: 'Ad account not found' };
      }

      // Validate token
      const isValid = await this.oauthService.validateToken(campaign.adAccountId);
      if (!isValid) {
        return { success: false, error: 'Invalid or expired access token' };
      }

      // Build insights query
      const fields = [
        'impressions',
        'clicks',
        'reach',
        'frequency',
        'spend',
        'actions', // For conversions (link_click, purchase, etc.)
        'date_start',
        'date_stop'
      ].join(',');

      const timeRange = {
        since: dateRange.startDate.toISOString().split('T')[0],
        until: dateRange.endDate.toISOString().split('T')[0]
      };

      const params = new URLSearchParams({
        fields,
        time_range: JSON.stringify(timeRange),
        time_increment: '1', // Daily breakdown
        access_token: adAccount.accessToken
      });

      const response = await fetch(
        `${this.META_GRAPH_BASE}/${campaign.metaAdId}/insights?${params.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        logger.error('[AnalyticsService] Insights fetch failed', { error, campaignId });
        return { 
          success: false, 
          error: error.error?.message || 'Failed to fetch insights' 
        };
      }

      const result = await response.json();
      const data: MetaInsightsData[] = result.data || [];

      logger.info('[AnalyticsService] Fetched insights successfully', { 
        campaignId,
        recordCount: data.length,
        startDate: dateRange.startDate.toISOString().split('T')[0],
        endDate: dateRange.endDate.toISOString().split('T')[0]
      });

      return { success: true, data };
    } catch (error) {
      logger.error('[AnalyticsService] Insights fetch error', { error, campaignId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch insights'
      };
    }
  }

  /**
   * Sync daily metrics for a specific date
   * Fetches from Meta and upserts to database
   */
  async syncDailyMetrics(
    campaignId: string,
    date: Date
  ): Promise<{ success: boolean; metrics?: MetaCampaignMetricsDaily; error?: string }> {
    try {
      // Fetch insights for the specific date
      const dateRange: DateRange = {
        startDate: date,
        endDate: date
      };

      const insightsResult = await this.fetchCampaignInsights(campaignId, dateRange);

      if (!insightsResult.success || !insightsResult.data || insightsResult.data.length === 0) {
        return { 
          success: false, 
          error: insightsResult.error || 'No insights data available for this date' 
        };
      }

      const insightsData = insightsResult.data[0];

      // Extract action metrics (conversions)
      const actions = insightsData.actions || [];
      const linkClicks = this.extractActionValue(actions, 'link_click');
      const websiteVisits = this.extractActionValue(actions, 'landing_page_view');
      const purchases = this.extractActionValue(actions, 'purchase');
      const revenue = this.extractActionValue(actions, 'purchase', true); // Get value for revenue

      // Prepare metrics for upsert
      const rawMetrics = {
        impressions: insightsData.impressions || 0,
        clicks: insightsData.clicks || 0,
        reach: insightsData.reach || 0,
        frequency: insightsData.frequency?.toString() || '0',
        spend: insightsData.spend?.toString() || '0',
        linkClicks,
        websiteVisits,
        purchases: parseInt(purchases.toString()) || 0,
        revenue: revenue.toString()
      };

      // Calculate KPIs
      const kpis = this.calculateKPIs(rawMetrics);

      // Build complete metrics object
      const metrics: InsertMetaCampaignMetricsDaily = {
        campaignId,
        date: date,
        impressions: rawMetrics.impressions,
        clicks: rawMetrics.clicks,
        reach: rawMetrics.reach,
        frequency: rawMetrics.frequency,
        likes: 0, // Not available in standard insights
        comments: 0,
        shares: 0,
        saves: 0,
        linkClicks: rawMetrics.linkClicks,
        websiteVisits: rawMetrics.websiteVisits,
        purchases: rawMetrics.purchases,
        revenue: rawMetrics.revenue,
        spend: rawMetrics.spend,
        cpm: kpis.cpm,
        cpc: kpis.cpc,
        ctr: kpis.ctr,
        roas: kpis.roas
      };

      // Upsert metrics (handles duplicates via unique index on campaignId + date)
      const metricsId = await this.storage.upsertMetaCampaignMetrics(metrics);

      const savedMetrics = await this.storage.getMetaCampaignMetricsForDate(campaignId, date);

      logger.info('[AnalyticsService] Daily metrics synced', {
        campaignId,
        date: date.toISOString().split('T')[0],
        metricsId
      });

      return { 
        success: true, 
        metrics: savedMetrics! 
      };
    } catch (error) {
      logger.error('[AnalyticsService] Daily sync error', { error, campaignId, date });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync daily metrics'
      };
    }
  }

  /**
   * Get aggregated campaign performance over a date range
   */
  async getCampaignPerformance(
    campaignId: string,
    dateRange?: DateRange
  ): Promise<{ success: boolean; performance?: CampaignPerformance; error?: string }> {
    try {
      const campaign = await this.storage.getMetaCampaign(campaignId);
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      // Get metrics for date range
      const metrics = await this.storage.getMetaCampaignMetrics(
        campaignId,
        dateRange?.startDate,
        dateRange?.endDate
      );

      if (metrics.length === 0) {
        return { 
          success: false, 
          error: 'No metrics data available for this campaign' 
        };
      }

      // Aggregate metrics
      const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
      const totalReach = metrics.reduce((sum, m) => sum + (m.reach || 0), 0);
      const totalSpend = metrics.reduce((sum, m) => sum + parseFloat(m.spend || '0'), 0);
      const totalRevenue = metrics.reduce((sum, m) => sum + parseFloat(m.revenue || '0'), 0);

      // Calculate aggregate KPIs
      const avgCpm = totalImpressions > 0 
        ? ((totalSpend / totalImpressions) * 1000).toFixed(4)
        : '0.0000';
      
      const avgCpc = totalClicks > 0 
        ? (totalSpend / totalClicks).toFixed(4)
        : '0.0000';
      
      const avgCtr = totalImpressions > 0 
        ? ((totalClicks / totalImpressions) * 100).toFixed(2)
        : '0.00';
      
      const roas = totalSpend > 0 
        ? (totalRevenue / totalSpend).toFixed(2)
        : '0.00';

      const performance: CampaignPerformance = {
        campaignId,
        campaignName: campaign.name,
        totalImpressions,
        totalClicks,
        totalReach,
        totalSpend: totalSpend.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        avgCpm,
        avgCpc,
        avgCtr,
        roas,
        dateRange: dateRange || {
          startDate: metrics[metrics.length - 1].date,
          endDate: metrics[0].date
        }
      };

      logger.info('[AnalyticsService] Campaign performance calculated', {
        campaignId,
        totalImpressions,
        totalSpend: performance.totalSpend,
        roas
      });

      return { success: true, performance };
    } catch (error) {
      logger.error('[AnalyticsService] Performance calculation error', { error, campaignId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate performance'
      };
    }
  }

  /**
   * Get metrics summary across all campaigns for a seller
   */
  async getMetricsSummary(
    sellerId: string,
    dateRange?: DateRange
  ): Promise<{ success: boolean; summary?: SellerMetricsSummary; error?: string }> {
    try {
      // Get all campaigns for the seller
      const campaigns = await this.storage.getMetaCampaignsBySeller(sellerId);

      if (campaigns.length === 0) {
        return { 
          success: false, 
          error: 'No campaigns found for this seller' 
        };
      }

      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

      // Fetch metrics for all campaigns
      const allMetricsPromises = campaigns.map(c => 
        this.storage.getMetaCampaignMetrics(
          c.id,
          dateRange?.startDate,
          dateRange?.endDate
        )
      );

      const allMetricsResults = await Promise.all(allMetricsPromises);
      const allMetrics = allMetricsResults.flat();

      if (allMetrics.length === 0) {
        return {
          success: false,
          error: 'No metrics data available for any campaigns'
        };
      }

      // Aggregate across all campaigns
      const totalImpressions = allMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalClicks = allMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
      const totalSpend = allMetrics.reduce((sum, m) => sum + parseFloat(m.spend || '0'), 0);
      const totalRevenue = allMetrics.reduce((sum, m) => sum + parseFloat(m.revenue || '0'), 0);

      // Calculate aggregate KPIs
      const avgCpm = totalImpressions > 0 
        ? ((totalSpend / totalImpressions) * 1000).toFixed(4)
        : '0.0000';
      
      const avgCpc = totalClicks > 0 
        ? (totalSpend / totalClicks).toFixed(4)
        : '0.0000';
      
      const avgCtr = totalImpressions > 0 
        ? ((totalClicks / totalImpressions) * 100).toFixed(2)
        : '0.00';
      
      const avgRoas = totalSpend > 0 
        ? (totalRevenue / totalSpend).toFixed(2)
        : '0.00';

      const summary: SellerMetricsSummary = {
        sellerId,
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalSpend: totalSpend.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        totalImpressions,
        totalClicks,
        avgCpm,
        avgCpc,
        avgCtr,
        avgRoas,
        dateRange
      };

      logger.info('[AnalyticsService] Seller metrics summary calculated', {
        sellerId,
        totalCampaigns: campaigns.length,
        totalSpend: summary.totalSpend,
        avgRoas
      });

      return { success: true, summary };
    } catch (error) {
      logger.error('[AnalyticsService] Metrics summary error', { error, sellerId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate metrics summary'
      };
    }
  }

  /**
   * Calculate KPIs from raw metrics
   * CPM = (spend / impressions) * 1000
   * CPC = spend / clicks
   * CTR = (clicks / impressions) * 100
   * ROAS = revenue / spend
   */
  calculateKPIs(metrics: {
    impressions: number;
    clicks: number;
    spend: string;
    revenue: string;
  }): {
    cpm: string;
    cpc: string;
    ctr: string;
    roas: string;
  } {
    const spend = parseFloat(metrics.spend || '0');
    const revenue = parseFloat(metrics.revenue || '0');
    const impressions = metrics.impressions || 0;
    const clicks = metrics.clicks || 0;

    const cpm = impressions > 0 
      ? ((spend / impressions) * 1000).toFixed(4)
      : '0.0000';

    const cpc = clicks > 0 
      ? (spend / clicks).toFixed(4)
      : '0.0000';

    const ctr = impressions > 0 
      ? ((clicks / impressions) * 100).toFixed(2)
      : '0.00';

    const roas = spend > 0 
      ? (revenue / spend).toFixed(2)
      : '0.00';

    return { cpm, cpc, ctr, roas };
  }

  /**
   * Handle webhook events for real-time updates
   * Campaign status changes, spend updates, performance alerts
   */
  async handleWebhookEvent(event: WebhookEventData): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('[AnalyticsService] Processing webhook event', {
        campaignId: event.campaignId,
        eventType: event.eventType
      });

      const campaign = await this.storage.getMetaCampaign(event.campaignId);
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      switch (event.eventType) {
        case 'status_change':
          // Update campaign status
          if (event.data.status) {
            await this.storage.updateMetaCampaign(event.campaignId, {
              status: event.data.status.toLowerCase()
            });
            
            logger.info('[AnalyticsService] Campaign status updated', {
              campaignId: event.campaignId,
              newStatus: event.data.status
            });
          }
          break;

        case 'spend_update':
          // Trigger metrics sync for today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          await this.syncDailyMetrics(event.campaignId, today);
          
          logger.info('[AnalyticsService] Metrics synced after spend update', {
            campaignId: event.campaignId
          });
          break;

        case 'performance_alert':
          // Log performance alert (could trigger notifications)
          logger.warn('[AnalyticsService] Performance alert received', {
            campaignId: event.campaignId,
            alert: event.data
          });
          break;

        default:
          logger.warn('[AnalyticsService] Unknown webhook event type', {
            eventType: event.eventType
          });
      }

      return { success: true };
    } catch (error) {
      logger.error('[AnalyticsService] Webhook event processing error', { error, event });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process webhook event'
      };
    }
  }

  /**
   * Helper: Extract action value from Meta actions array
   */
  private extractActionValue(
    actions: Array<{ action_type: string; value: string }>,
    actionType: string,
    isValue: boolean = false
  ): number {
    const action = actions.find(a => a.action_type === actionType);
    
    if (!action) {
      return 0;
    }

    // If looking for revenue value, parse as float
    if (isValue) {
      return parseFloat(action.value || '0');
    }

    // Otherwise, parse as integer count
    return parseInt(action.value || '0', 10);
  }
}
