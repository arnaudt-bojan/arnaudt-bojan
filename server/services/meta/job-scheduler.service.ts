import { IStorage } from '../../storage';
import { logger } from '../../logger';
import { AnalyticsService } from './analytics.service';
import { BudgetService } from './budget.service';
import { MetaOAuthService } from './meta-oauth.service';
import { InsertBackgroundJobRun } from '@shared/schema';

/**
 * MetaJobScheduler
 * Architecture 3: Background jobs for Meta Ads
 * 
 * Manages scheduled jobs for:
 * - Campaign insights polling (hourly)
 * - Budget monitoring and alerts (every 15 minutes)
 * 
 * Features:
 * - Job locking to prevent concurrent runs
 * - Retry logic with exponential backoff
 * - Error handling and recovery
 * - backgroundJobRuns tracking for audit trail
 */

export interface MetaServices {
  analyticsService: AnalyticsService;
  budgetService: BudgetService;
}

export interface JobExecutionResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  error?: string;
  metadata?: any;
}

export class MetaJobScheduler {
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();
  private runningJobs: Set<string> = new Set();
  
  // Job intervals in milliseconds
  private readonly INSIGHTS_JOB_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly BUDGET_JOB_INTERVAL = 15 * 60 * 1000; // 15 minutes
  
  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY_MS = 1000; // 1 second
  private readonly MAX_RETRY_DELAY_MS = 60 * 1000; // 1 minute
  
  constructor(
    private storage: IStorage,
    private services: MetaServices
  ) {}

  /**
   * Start all background jobs
   */
  async startJobs(): Promise<void> {
    logger.info('[MetaJobScheduler] Starting background jobs');

    // Run both jobs immediately on startup
    await this.runCampaignInsightsJob();
    await this.runBudgetGuardRailJob();

    // Schedule CampaignInsightsJob (hourly)
    const insightsInterval = setInterval(() => {
      this.runCampaignInsightsJob();
    }, this.INSIGHTS_JOB_INTERVAL);
    this.intervalIds.set('CampaignInsightsJob', insightsInterval);

    // Schedule BudgetGuardRailJob (every 15 minutes)
    const budgetInterval = setInterval(() => {
      this.runBudgetGuardRailJob();
    }, this.BUDGET_JOB_INTERVAL);
    this.intervalIds.set('BudgetGuardRailJob', budgetInterval);

    logger.info('[MetaJobScheduler] All jobs scheduled', {
      insightsIntervalMinutes: this.INSIGHTS_JOB_INTERVAL / 60000,
      budgetIntervalMinutes: this.BUDGET_JOB_INTERVAL / 60000,
    });
  }

  /**
   * Stop all background jobs
   */
  stopJobs(): void {
    logger.info('[MetaJobScheduler] Stopping background jobs');

    // Convert iterator to array to avoid downlevel iteration issues
    const intervals = Array.from(this.intervalIds.entries());
    for (const [jobName, intervalId] of intervals) {
      clearInterval(intervalId);
      logger.debug('[MetaJobScheduler] Stopped job interval', { jobName });
    }

    this.intervalIds.clear();
    logger.info('[MetaJobScheduler] All jobs stopped');
  }

  /**
   * Run CampaignInsightsJob
   * Fetches insights for all active campaigns and syncs daily metrics
   */
  private async runCampaignInsightsJob(): Promise<void> {
    const jobName = 'CampaignInsightsJob';
    
    await this.executeJob(jobName, async () => {
      let recordsProcessed = 0;
      let recordsFailed = 0;
      const errors: string[] = [];

      // Get all active campaigns across all sellers
      const allCampaigns = await this.getAllActiveCampaigns();

      logger.info('[CampaignInsightsJob] Processing campaigns', {
        totalCampaigns: allCampaigns.length,
      });

      // Sync metrics for yesterday (most recent complete day)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      for (const campaign of allCampaigns) {
        try {
          const result = await this.services.analyticsService.syncDailyMetrics(
            campaign.id,
            yesterday
          );

          if (result.success) {
            recordsProcessed++;
            logger.debug('[CampaignInsightsJob] Synced metrics', {
              campaignId: campaign.id,
              campaignName: campaign.name,
              date: yesterday.toISOString().split('T')[0],
            });
          } else {
            recordsFailed++;
            errors.push(`Campaign ${campaign.id}: ${result.error}`);
            logger.warn('[CampaignInsightsJob] Failed to sync metrics', {
              campaignId: campaign.id,
              error: result.error,
            });
          }
        } catch (error) {
          recordsFailed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Campaign ${campaign.id}: ${errorMsg}`);
          logger.error('[CampaignInsightsJob] Error syncing metrics', {
            error,
            campaignId: campaign.id,
          });
        }
      }

      return {
        success: recordsFailed === 0,
        recordsProcessed,
        recordsFailed,
        error: errors.length > 0 ? errors.join('; ') : undefined,
        metadata: {
          date: yesterday.toISOString().split('T')[0],
          totalCampaigns: allCampaigns.length,
        },
      };
    });
  }

  /**
   * Run BudgetGuardRailJob
   * Checks all active campaigns for low balance and triggers alerts
   */
  private async runBudgetGuardRailJob(): Promise<void> {
    const jobName = 'BudgetGuardRailJob';
    
    await this.executeJob(jobName, async () => {
      let recordsProcessed = 0;
      let recordsFailed = 0;
      const lowBalanceCampaigns: any[] = [];
      const errors: string[] = [];

      // Get all unique sellers with active campaigns
      const allCampaigns = await this.getAllActiveCampaigns();
      const sellerIds = Array.from(new Set(allCampaigns.map(c => c.sellerId)));

      logger.info('[BudgetGuardRailJob] Checking seller budgets', {
        totalSellers: sellerIds.length,
      });

      for (const sellerId of sellerIds) {
        try {
          // Check for low balance campaigns (20% threshold)
          const lowBalances = await this.services.budgetService.getLowBalanceCampaigns(
            sellerId,
            20 // 20% threshold
          );

          if (lowBalances.length > 0) {
            recordsProcessed += lowBalances.length;
            lowBalanceCampaigns.push(...lowBalances);

            // Log each low balance campaign
            for (const campaign of lowBalances) {
              logger.warn('[BudgetGuardRailJob] Low balance campaign detected', {
                sellerId,
                campaignId: campaign.campaignId,
                campaignName: campaign.campaignName,
                daysRemaining: campaign.daysRemaining.toFixed(1),
                alertLevel: campaign.alertLevel,
              });
            }

            // TODO: Send email alerts via NotificationService
            // This would be implemented when notification methods are added
            // await this.sendLowBalanceAlert(sellerId, lowBalances);
          }
        } catch (error) {
          recordsFailed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Seller ${sellerId}: ${errorMsg}`);
          logger.error('[BudgetGuardRailJob] Error checking budget', {
            error,
            sellerId,
          });
        }
      }

      return {
        success: recordsFailed === 0,
        recordsProcessed,
        recordsFailed,
        error: errors.length > 0 ? errors.join('; ') : undefined,
        metadata: {
          totalSellers: sellerIds.length,
          lowBalanceCampaignCount: lowBalanceCampaigns.length,
          alertLevels: {
            critical: lowBalanceCampaigns.filter(c => c.alertLevel === 'critical').length,
            warning: lowBalanceCampaigns.filter(c => c.alertLevel === 'warning').length,
          },
        },
      };
    });
  }

  /**
   * Generic job execution wrapper with locking, retry, and tracking
   */
  private async executeJob(
    jobName: string,
    jobFn: () => Promise<JobExecutionResult>
  ): Promise<void> {
    // Check if job is already running (job locking)
    if (this.runningJobs.has(jobName)) {
      logger.warn('[MetaJobScheduler] Job already running, skipping', { jobName });
      return;
    }

    // Mark job as running
    this.runningJobs.add(jobName);

    let jobRunId: string | undefined;
    const startTime = Date.now();

    try {
      // Create job run record
      jobRunId = await this.storage.createBackgroundJobRun({
        jobName,
        status: 'running',
        startedAt: new Date(),
        retryCount: 0,
      });

      logger.info('[MetaJobScheduler] Job started', { jobName, jobRunId });

      // Execute job with retry logic
      const result = await this.executeWithRetry(jobName, jobFn);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Update job run with results
      await this.storage.updateBackgroundJobRun(jobRunId, {
        status: result.success ? 'completed' : 'failed',
        completedAt: new Date(),
        duration,
        recordsProcessed: result.recordsProcessed,
        recordsFailed: result.recordsFailed,
        errorMessage: result.error,
        metadata: result.metadata,
      });

      if (result.success) {
        logger.info('[MetaJobScheduler] Job completed successfully', {
          jobName,
          jobRunId,
          durationMs: duration,
          recordsProcessed: result.recordsProcessed,
        });
      } else {
        logger.error('[MetaJobScheduler] Job completed with errors', {
          jobName,
          jobRunId,
          durationMs: duration,
          recordsProcessed: result.recordsProcessed,
          recordsFailed: result.recordsFailed,
          error: result.error,
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('[MetaJobScheduler] Job failed fatally', {
        jobName,
        jobRunId,
        error,
        durationMs: duration,
      });

      // Update job run with fatal error
      if (jobRunId) {
        await this.storage.updateBackgroundJobRun(jobRunId, {
          status: 'failed',
          completedAt: new Date(),
          duration,
          errorMessage,
          errorStack,
        });
      }
    } finally {
      // Release job lock
      this.runningJobs.delete(jobName);
    }
  }

  /**
   * Execute job function with exponential backoff retry logic
   */
  private async executeWithRetry(
    jobName: string,
    jobFn: () => Promise<JobExecutionResult>
  ): Promise<JobExecutionResult> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Execute job
        const result = await jobFn();
        
        // If successful or has partial success, return result
        if (result.success || result.recordsProcessed > 0) {
          if (attempt > 0) {
            logger.info('[MetaJobScheduler] Job succeeded after retry', {
              jobName,
              attempt,
              recordsProcessed: result.recordsProcessed,
            });
          }
          return result;
        }

        // If no records processed and failed, treat as error for retry
        throw new Error(result.error || 'Job failed with no records processed');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // If max retries reached, return failure
        if (attempt >= this.MAX_RETRIES) {
          logger.error('[MetaJobScheduler] Max retries reached', {
            jobName,
            attempts: attempt + 1,
            error: lastError,
          });
          
          return {
            success: false,
            recordsProcessed: 0,
            recordsFailed: 1,
            error: `Max retries (${this.MAX_RETRIES}) reached: ${lastError.message}`,
          };
        }

        // Calculate exponential backoff delay
        const delay = Math.min(
          this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt),
          this.MAX_RETRY_DELAY_MS
        );

        logger.warn('[MetaJobScheduler] Job failed, retrying', {
          jobName,
          attempt: attempt + 1,
          maxRetries: this.MAX_RETRIES,
          retryDelayMs: delay,
          error: lastError.message,
        });

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // Should never reach here, but return failure just in case
    return {
      success: false,
      recordsProcessed: 0,
      recordsFailed: 1,
      error: lastError?.message || 'Unknown error',
    };
  }

  /**
   * Get all active Meta campaigns across all sellers
   */
  private async getAllActiveCampaigns() {
    try {
      // Get all campaigns and filter active ones
      // Note: storage interface may need a method to get all campaigns
      // For now, we'll implement a workaround by getting campaigns for all sellers
      const allUsers = await this.storage.getAllUsers();
      
      // Convert Set to Array to avoid downlevel iteration issues
      const sellers = allUsers.filter(u => u.userType === 'seller');
      
      const campaignPromises = sellers.map(seller => 
        this.storage.getMetaCampaignsBySeller(seller.id)
      );
      
      const campaignResults = await Promise.all(campaignPromises);
      const allCampaigns = campaignResults.flat();
      
      // Filter active campaigns
      return allCampaigns.filter(c => c.status === 'active');
    } catch (error) {
      logger.error('[MetaJobScheduler] Error fetching active campaigns', { error });
      return [];
    }
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
