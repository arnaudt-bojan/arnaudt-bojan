import { IStorage } from '../../storage';
import { logger } from '../../logger';
import { MetaOAuthService } from './meta-oauth.service';
import { 
  InsertMetaCampaign, 
  MetaCampaign, 
  MetaCampaignObjective,
  MetaCampaignStatus 
} from '@shared/schema';

export interface CreateCampaignData {
  sellerId: string;
  adAccountId: string;
  productId: string;
  name: string;
  objective: MetaCampaignObjective;
  primaryText: string;
  headline: string;
  description?: string;
  callToAction?: string;
  destinationUrl: string; // Used for ad creative, not stored in DB
  dailyBudget: string;
  lifetimeBudget: string;
  startDate: Date;
  endDate?: Date;
  targeting: any; // Targeting configuration
  alertEmail: string;
  productImageUrl?: string;
  useAdvantagePlus?: boolean;
  advantagePlusConfig?: any;
}

export interface CampaignCreationResult {
  success: boolean;
  campaignId?: string;
  campaign?: MetaCampaign;
  error?: string;
  metaErrors?: any[];
}

export interface AssetUploadResult {
  success: boolean;
  assetHash?: string;
  error?: string;
}

/**
 * MetaCampaignService
 * Architecture 3 service for Meta Marketing API campaign management
 * 
 * Handles:
 * - Campaign creation with Advantage+ optimization
 * - Creative asset upload to Meta
 * - Campaign lifecycle management (activate, pause, complete)
 * - Meta Marketing API v21.0 integration
 * - Error handling with retries and idempotency
 */
export class MetaCampaignService {
  private readonly META_GRAPH_VERSION = 'v21.0';
  private readonly META_GRAPH_BASE = `https://graph.facebook.com/${this.META_GRAPH_VERSION}`;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  
  constructor(
    private storage: IStorage,
    private oauthService: MetaOAuthService
  ) {}

  /**
   * Upload creative asset (image) to Meta
   */
  async uploadCreativeAsset(
    adAccountId: string,
    imageUrl: string
  ): Promise<AssetUploadResult> {
    try {
      const adAccount = await this.storage.getMetaAdAccount(adAccountId);
      
      if (!adAccount) {
        return { success: false, error: 'Ad account not found' };
      }

      // Validate token
      const isValid = await this.oauthService.validateToken(adAccountId);
      if (!isValid) {
        return { success: false, error: 'Invalid or expired access token' };
      }

      // Download image from URL
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return { success: false, error: 'Failed to download image' };
      }

      const imageBlob = await imageResponse.blob();
      const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

      // Upload to Meta as form data
      const formData = new FormData();
      formData.append('bytes', new Blob([imageBuffer]), 'image.jpg');
      formData.append('access_token', adAccount.accessToken);

      const uploadResponse = await this.retryRequest(async () => {
        return await fetch(
          `${this.META_GRAPH_BASE}/act_${adAccount.metaAdAccountId}/adimages`,
          {
            method: 'POST',
            body: formData
          }
        );
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        logger.error('[MetaCampaign] Asset upload failed', { error });
        return { 
          success: false, 
          error: error.error?.message || 'Asset upload failed' 
        };
      }

      const result = await uploadResponse.json();
      const assetHash = result.images?.[Object.keys(result.images)[0]]?.hash;

      if (!assetHash) {
        return { success: false, error: 'No asset hash returned from Meta' };
      }

      logger.info('[MetaCampaign] Asset uploaded successfully', { 
        assetHash,
        adAccountId 
      });

      return { success: true, assetHash };
    } catch (error) {
      logger.error('[MetaCampaign] Asset upload error', { error, adAccountId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Asset upload failed'
      };
    }
  }

  /**
   * Create campaign in database and on Meta with Advantage+ optimization
   */
  async createCampaign(data: CreateCampaignData): Promise<CampaignCreationResult> {
    let campaignId: string | undefined;
    
    try {
      const adAccount = await this.storage.getMetaAdAccount(data.adAccountId);
      
      if (!adAccount) {
        return { success: false, error: 'Ad account not found' };
      }

      // Validate token
      const isValid = await this.oauthService.validateToken(data.adAccountId);
      if (!isValid) {
        return { success: false, error: 'Invalid or expired access token' };
      }

      // Step 1: Upload creative asset if provided
      let assetHash: string | undefined;
      if (data.productImageUrl) {
        const uploadResult = await this.uploadCreativeAsset(
          data.adAccountId,
          data.productImageUrl
        );
        
        if (!uploadResult.success) {
          return { 
            success: false, 
            error: `Asset upload failed: ${uploadResult.error}` 
          };
        }
        
        assetHash = uploadResult.assetHash;
      }

      // Step 2: Create campaign record in database (draft status)
      const campaignRecord: InsertMetaCampaign = {
        sellerId: data.sellerId,
        adAccountId: data.adAccountId,
        productId: data.productId,
        name: data.name,
        status: 'draft',
        objective: data.objective,
        primaryText: data.primaryText,
        headline: data.headline,
        description: data.description,
        callToAction: data.callToAction || 'SHOP_NOW',
        targeting: data.targeting,
        dailyBudget: data.dailyBudget,
        lifetimeBudget: data.lifetimeBudget,
        startDate: data.startDate,
        endDate: data.endDate,
        useAdvantagePlus: data.useAdvantagePlus ? 1 : 0,
        advantagePlusConfig: data.advantagePlusConfig,
        alertEmail: data.alertEmail,
      };

      campaignId = await this.storage.createMetaCampaign(campaignRecord);

      // Step 3: Create campaign on Meta
      const metaCampaignResult = await this.createMetaCampaign(
        adAccount,
        data.name,
        data.objective,
        data.dailyBudget
      );

      if (!metaCampaignResult.success || !metaCampaignResult.id) {
        // Rollback: update campaign status to failed
        await this.storage.updateMetaCampaign(campaignId, {
          status: 'failed'
        });
        
        return {
          success: false,
          error: `Meta campaign creation failed: ${metaCampaignResult.error}`,
          metaErrors: metaCampaignResult.metaErrors
        };
      }

      // Step 4: Create ad set with Advantage+ optimization
      const metaAdSetResult = await this.createMetaAdSet(
        adAccount,
        metaCampaignResult.id,
        data.objective,
        data.dailyBudget
      );

      if (!metaAdSetResult.success || !metaAdSetResult.id) {
        await this.storage.updateMetaCampaign(campaignId, {
          status: 'failed',
          metaCampaignId: metaCampaignResult.id
        });
        
        return {
          success: false,
          error: `Meta ad set creation failed: ${metaAdSetResult.error}`,
          metaErrors: metaAdSetResult.metaErrors
        };
      }

      // Step 5: Create ad creative
      const metaAdResult = await this.createMetaAd(
        adAccount,
        metaAdSetResult.id,
        {
          primaryText: data.primaryText,
          headline: data.headline,
          description: data.description,
          callToAction: data.callToAction || 'SHOP_NOW',
          destinationUrl: data.destinationUrl,
          assetHash: assetHash
        }
      );

      if (!metaAdResult.success || !metaAdResult.id) {
        await this.storage.updateMetaCampaign(campaignId, {
          status: 'failed',
          metaCampaignId: metaCampaignResult.id,
          metaAdSetId: metaAdSetResult.id
        });
        
        return {
          success: false,
          error: `Meta ad creation failed: ${metaAdResult.error}`,
          metaErrors: metaAdResult.metaErrors
        };
      }

      // Step 6: Update campaign with Meta IDs and active status
      await this.storage.updateMetaCampaign(campaignId, {
        metaCampaignId: metaCampaignResult.id,
        metaAdSetId: metaAdSetResult.id,
        metaAdId: metaAdResult.id,
        status: 'active',
        activatedAt: new Date()
      });

      const campaign = await this.storage.getMetaCampaign(campaignId);

      logger.info('[MetaCampaign] Campaign created successfully', {
        campaignId,
        metaCampaignId: metaCampaignResult.id,
        metaAdSetId: metaAdSetResult.id,
        metaAdId: metaAdResult.id
      });

      return {
        success: true,
        campaignId,
        campaign: campaign!
      };
    } catch (error) {
      logger.error('[MetaCampaign] Campaign creation failed', { error, data });
      
      if (campaignId) {
        await this.storage.updateMetaCampaign(campaignId, {
          status: 'failed'
        });
      }
      
      return {
        success: false,
        campaignId,
        error: error instanceof Error ? error.message : 'Campaign creation failed'
      };
    }
  }

  /**
   * Activate campaign on Meta
   */
  async activateCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const campaign = await this.storage.getMetaCampaign(campaignId);
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      if (!campaign.metaCampaignId) {
        return { success: false, error: 'Campaign not created on Meta yet' };
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

      // Update campaign status on Meta
      const response = await this.retryRequest(async () => {
        return await fetch(
          `${this.META_GRAPH_BASE}/${campaign.metaCampaignId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'ACTIVE',
              access_token: adAccount.accessToken
            })
          }
        );
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error('[MetaCampaign] Campaign activation failed', { error, campaignId });
        return { 
          success: false, 
          error: error.error?.message || 'Activation failed' 
        };
      }

      // Update local status
      await this.storage.updateMetaCampaign(campaignId, {
        status: 'active',
        activatedAt: new Date()
      });

      logger.info('[MetaCampaign] Campaign activated', { campaignId });

      return { success: true };
    } catch (error) {
      logger.error('[MetaCampaign] Activation error', { error, campaignId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Activation failed'
      };
    }
  }

  /**
   * Pause campaign on Meta
   */
  async pauseCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const campaign = await this.storage.getMetaCampaign(campaignId);
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      if (!campaign.metaCampaignId) {
        return { success: false, error: 'Campaign not created on Meta yet' };
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

      // Update campaign status on Meta
      const response = await this.retryRequest(async () => {
        return await fetch(
          `${this.META_GRAPH_BASE}/${campaign.metaCampaignId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'PAUSED',
              access_token: adAccount.accessToken
            })
          }
        );
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error('[MetaCampaign] Campaign pause failed', { error, campaignId });
        return { 
          success: false, 
          error: error.error?.message || 'Pause failed' 
        };
      }

      // Update local status
      await this.storage.updateMetaCampaign(campaignId, {
        status: 'paused',
        pausedAt: new Date()
      });

      logger.info('[MetaCampaign] Campaign paused', { campaignId });

      return { success: true };
    } catch (error) {
      logger.error('[MetaCampaign] Pause error', { error, campaignId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pause failed'
      };
    }
  }

  /**
   * Update campaign settings
   */
  async updateCampaign(
    campaignId: string, 
    updates: Partial<MetaCampaign>
  ): Promise<{ success: boolean; campaign?: MetaCampaign; error?: string }> {
    try {
      const campaign = await this.storage.getMetaCampaign(campaignId);
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      // Update local database
      await this.storage.updateMetaCampaign(campaignId, updates);

      // If Meta IDs exist and daily budget is being updated, update on Meta too
      if (campaign.metaCampaignId && updates.dailyBudget) {
        const adAccount = await this.storage.getMetaAdAccount(campaign.adAccountId);
        if (!adAccount) {
          return { success: false, error: 'Ad account not found' };
        }

        const isValid = await this.oauthService.validateToken(campaign.adAccountId);
        if (!isValid) {
          return { success: false, error: 'Invalid or expired access token' };
        }

        // Update budget on Meta ad set
        if (campaign.metaAdSetId) {
          const response = await this.retryRequest(async () => {
            return await fetch(
              `${this.META_GRAPH_BASE}/${campaign.metaAdSetId}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  daily_budget: Math.round(parseFloat(updates.dailyBudget!) * 100), // Convert to cents
                  access_token: adAccount.accessToken
                })
              }
            );
          });

          if (!response.ok) {
            const error = await response.json();
            logger.warn('[MetaCampaign] Budget update on Meta failed', { 
              error, 
              campaignId 
            });
          }
        }
      }

      const updatedCampaign = await this.storage.getMetaCampaign(campaignId);

      logger.info('[MetaCampaign] Campaign updated', { 
        campaignId, 
        updatedFields: Object.keys(updates) 
      });

      return { success: true, campaign: updatedCampaign! };
    } catch (error) {
      logger.error('[MetaCampaign] Update error', { error, campaignId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      };
    }
  }

  /**
   * Mark campaign as completed
   */
  async completeCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const campaign = await this.storage.getMetaCampaign(campaignId);
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      // Pause campaign on Meta first if active
      if (campaign.status === 'active' && campaign.metaCampaignId) {
        const pauseResult = await this.pauseCampaign(campaignId);
        if (!pauseResult.success) {
          logger.warn('[MetaCampaign] Failed to pause before completion', { 
            campaignId,
            error: pauseResult.error 
          });
        }
      }

      // Mark as completed locally
      await this.storage.updateMetaCampaign(campaignId, {
        status: 'completed',
        completedAt: new Date()
      });

      logger.info('[MetaCampaign] Campaign completed', { campaignId });

      return { success: true };
    } catch (error) {
      logger.error('[MetaCampaign] Complete error', { error, campaignId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Complete failed'
      };
    }
  }

  /**
   * Create Meta campaign (step 1)
   */
  private async createMetaCampaign(
    adAccount: any,
    name: string,
    objective: MetaCampaignObjective,
    dailyBudget: string
  ): Promise<{ success: boolean; id?: string; error?: string; metaErrors?: any[] }> {
    try {
      const response = await this.retryRequest(async () => {
        return await fetch(
          `${this.META_GRAPH_BASE}/act_${adAccount.metaAdAccountId}/campaigns`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              objective,
              status: 'PAUSED', // Start paused, activate later
              special_ad_categories: [],
              access_token: adAccount.accessToken
            })
          }
        );
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Campaign creation failed',
          metaErrors: [error]
        };
      }

      const result = await response.json();
      return { success: true, id: result.id };
    } catch (error) {
      logger.error('[MetaCampaign] Meta campaign creation error', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Campaign creation failed'
      };
    }
  }

  /**
   * Create Meta ad set with Advantage+ optimization (step 2)
   */
  private async createMetaAdSet(
    adAccount: any,
    campaignId: string,
    objective: MetaCampaignObjective,
    budget: string
  ): Promise<{ success: boolean; id?: string; error?: string; metaErrors?: any[] }> {
    try {
      // Map objective to optimization goal
      const optimizationGoalMap: Record<MetaCampaignObjective, string> = {
        'OUTCOME_TRAFFIC': 'LINK_CLICKS',
        'OUTCOME_ENGAGEMENT': 'ENGAGEMENT',
        'OUTCOME_LEADS': 'LEAD_GENERATION',
        'OUTCOME_SALES': 'OFFSITE_CONVERSIONS'
      };

      const optimizationGoal = optimizationGoalMap[objective];
      const dailyBudget = Math.round(parseFloat(budget) * 100); // Convert to cents

      const response = await this.retryRequest(async () => {
        return await fetch(
          `${this.META_GRAPH_BASE}/act_${adAccount.metaAdAccountId}/adsets`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `AdSet - ${Date.now()}`,
              campaign_id: campaignId,
              daily_budget: dailyBudget,
              billing_event: 'IMPRESSIONS',
              optimization_goal: optimizationGoal,
              bid_strategy: 'LOWEST_COST_WITH_BID_CAP',
              status: 'PAUSED',
              targeting: {
                geo_locations: { countries: ['US'] },
                age_min: 18,
                age_max: 65
              },
              access_token: adAccount.accessToken
            })
          }
        );
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Ad set creation failed',
          metaErrors: [error]
        };
      }

      const result = await response.json();
      return { success: true, id: result.id };
    } catch (error) {
      logger.error('[MetaCampaign] Meta ad set creation error', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ad set creation failed'
      };
    }
  }

  /**
   * Create Meta ad creative (step 3)
   */
  private async createMetaAd(
    adAccount: any,
    adSetId: string,
    creative: {
      primaryText: string;
      headline: string;
      description?: string;
      callToAction: string;
      destinationUrl: string;
      assetHash?: string;
    }
  ): Promise<{ success: boolean; id?: string; error?: string; metaErrors?: any[] }> {
    try {
      // Build creative payload
      const creativePayload: any = {
        name: `Ad Creative - ${Date.now()}`,
        object_story_spec: {
          page_id: adAccount.metaAdAccountId.replace('act_', ''),
          link_data: {
            link: creative.destinationUrl,
            message: creative.primaryText,
            name: creative.headline,
            description: creative.description || '',
            call_to_action: {
              type: creative.callToAction
            }
          }
        }
      };

      // Add image if available
      if (creative.assetHash) {
        creativePayload.object_story_spec.link_data.image_hash = creative.assetHash;
      }

      // Step 1: Create ad creative
      const creativeResponse = await this.retryRequest(async () => {
        return await fetch(
          `${this.META_GRAPH_BASE}/act_${adAccount.metaAdAccountId}/adcreatives`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...creativePayload,
              access_token: adAccount.accessToken
            })
          }
        );
      });

      if (!creativeResponse.ok) {
        const error = await creativeResponse.json();
        return {
          success: false,
          error: error.error?.message || 'Ad creative creation failed',
          metaErrors: [error]
        };
      }

      const creativeResult = await creativeResponse.json();

      // Step 2: Create ad using creative
      const adResponse = await this.retryRequest(async () => {
        return await fetch(
          `${this.META_GRAPH_BASE}/act_${adAccount.metaAdAccountId}/ads`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `Ad - ${Date.now()}`,
              adset_id: adSetId,
              creative: { creative_id: creativeResult.id },
              status: 'PAUSED',
              access_token: adAccount.accessToken
            })
          }
        );
      });

      if (!adResponse.ok) {
        const error = await adResponse.json();
        return {
          success: false,
          error: error.error?.message || 'Ad creation failed',
          metaErrors: [error]
        };
      }

      const adResult = await adResponse.json();
      return { success: true, id: adResult.id };
    } catch (error) {
      logger.error('[MetaCampaign] Meta ad creation error', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ad creation failed'
      };
    }
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryRequest(
    requestFn: () => Promise<Response>,
    retries = this.MAX_RETRIES
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await requestFn();
        
        // If rate limited, wait and retry
        if (response.status === 429) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, i);
          await this.sleep(delay);
          continue;
        }
        
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        
        const delay = this.RETRY_DELAY_MS * Math.pow(2, i);
        await this.sleep(delay);
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
