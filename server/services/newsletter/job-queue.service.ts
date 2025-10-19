/**
 * Newsletter Job Queue Service - DATABASE PERSISTENT
 * Handles background processing with database persistence (no jobs lost on restart)
 */

import { prisma } from "../../prisma";
import { logger } from "../../logger";
import type { JobType, JobStatus } from "@shared/newsletter-types";

// Job queue configuration
const POLL_INTERVAL = 10000; // 10 seconds
const MAX_RETRIES = 3;
const CONCURRENT_JOBS = 5;

// Job processor function type
export type NewsletterJobProcessor = (job: any, signal: AbortSignal) => Promise<void>;

export class NewsletterJobQueue {
  private isRunning = false;
  private activeJobs = new Map<string, AbortController>();
  private processors = new Map<JobType, NewsletterJobProcessor>();

  /**
   * Register a job processor for a specific job type
   */
  registerProcessor(jobType: JobType, processor: NewsletterJobProcessor) {
    this.processors.set(jobType, processor);
    logger.info(`[NewsletterQueue] Registered processor for job type: ${jobType}`);
  }

  /**
   * Start the job queue
   */
  start() {
    if (this.isRunning) {
      logger.info("[NewsletterQueue] Already running");
      return;
    }

    this.isRunning = true;
    logger.info("[NewsletterQueue] Starting persistent newsletter job queue");
    this.poll();
  }

  /**
   * Stop the job queue
   */
  stop() {
    this.isRunning = false;
    
    // Cancel all active jobs
    this.activeJobs.forEach((controller, jobId) => {
      logger.info(`[NewsletterQueue] Cancelling job ${jobId}`);
      controller.abort();
    });
    
    this.activeJobs.clear();
    logger.info("[NewsletterQueue] Stopped newsletter job queue");
  }

  /**
   * Enqueue a new job (persisted to database)
   */
  async enqueue<T = any>(job: {
    type: JobType;
    data: T;
    priority?: number;
    scheduledFor?: Date;
    maxRetries?: number;
  }): Promise<string> {
    const newJob = await prisma.newsletter_jobs.create({
      data: {
        type: job.type,
        data: job.data as any,
        priority: job.priority ?? 0,
        scheduled_for: job.scheduledFor,
        max_retries: job.maxRetries ?? MAX_RETRIES,
        status: 'queued',
      }
    });

    logger.info(`[NewsletterQueue] Enqueued job ${newJob.id} (type: ${job.type})`);
    return newJob.id;
  }

  /**
   * Get job status from database
   */
  async getJobStatus(jobId: string) {
    const job = await prisma.newsletter_jobs.findUnique({
      where: { id: jobId }
    });
    return job;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // Cancel if running
    const controller = this.activeJobs.get(jobId);
    if (controller) {
      controller.abort();
      this.activeJobs.delete(jobId);
      
      // Atomic update - only if still running
      const result = await prisma.newsletter_jobs.updateMany({
        where: {
          id: jobId,
          status: 'running'
        },
        data: { 
          status: 'cancelled', 
          completed_at: new Date() 
        }
      });
      
      if (result.count === 0) {
        logger.warn(`[NewsletterQueue] Job ${jobId} not in running state, skipping cancel update`);
      }
      
      logger.info(`[NewsletterQueue] Cancelled running job ${jobId}`);
      return true;
    }

    // Cancel if queued - use updateMany to check status atomically
    const result = await prisma.newsletter_jobs.updateMany({
      where: {
        id: jobId,
        status: 'queued'
      },
      data: { 
        status: 'cancelled', 
        completed_at: new Date() 
      }
    });

    if (result.count === 0) {
      // Job not queued (already running/completed/cancelled)
      return false;
    }

    logger.info(`[NewsletterQueue] Cancelled queued job ${jobId}`);
    return true;
  }

  /**
   * Poll for jobs to process
   */
  private async poll() {
    while (this.isRunning) {
      try {
        if (this.activeJobs.size < CONCURRENT_JOBS) {
          await this.processNextJob();
        }
      } catch (error) {
        logger.error("[NewsletterQueue] Poll error:", error);
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }

  /**
   * Process the next queued job
   */
  private async processNextJob() {
    const now = new Date();

    // Find next job that's ready to run (queued, and either no schedule or past schedule time)
    const queuedJob = await prisma.newsletter_jobs.findFirst({
      where: {
        status: 'queued',
        OR: [
          { scheduled_for: null },
          { scheduled_for: { lte: now } }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'asc' }
      ]
    });

    if (!queuedJob) {
      logger.debug("[NewsletterQueue] No queued jobs found");
      return; // No jobs ready
    }
    
    logger.info(`[NewsletterQueue] Found queued job ${queuedJob.id} (type: ${queuedJob.type})`);

    const processor = this.processors.get(queuedJob.type as JobType);
    if (!processor) {
      logger.error(`[NewsletterQueue] No processor registered for job type: ${queuedJob.type}`);
      
      // Atomic update - only if still queued
      const result = await prisma.newsletter_jobs.updateMany({
        where: {
          id: queuedJob.id,
          status: 'queued'
        },
        data: {
          status: 'failed',
          error: `No processor registered for job type: ${queuedJob.type}`,
          completed_at: now,
        }
      });
      
      if (result.count === 0) {
        logger.warn(`[NewsletterQueue] Job ${queuedJob.id} not in queued state, skipping no-processor failure update`);
      }
      
      return;
    }

    // Atomically claim the job
    const result = await prisma.newsletter_jobs.updateMany({
      where: {
        id: queuedJob.id,
        status: 'queued' // This IS checked in updateMany!
      },
      data: {
        status: 'running',
        started_at: now,
      }
    });

    // If count === 0, another worker already claimed it
    if (result.count === 0) {
      return; // Job already claimed by another worker
    }

    // If count === 1, we successfully claimed it!
    // Now fetch the full job object
    const claimedJob = await prisma.newsletter_jobs.findUnique({
      where: { id: queuedJob.id }
    });

    if (!claimedJob) {
      return; // Job was deleted
    }

    const controller = new AbortController();
    this.activeJobs.set(claimedJob.id, controller);

    // Fire-and-forget job processing
    this.processJob(claimedJob, processor, controller).finally(() => {
      this.activeJobs.delete(claimedJob.id);
    });
  }

  /**
   * Process a single job
   */
  private async processJob(job: any, processor: NewsletterJobProcessor, controller: AbortController) {
    try {
      logger.info(`[NewsletterQueue] Processing job ${job.id} (type: ${job.type})`);

      // Process the job with abort signal
      await processor(job, controller.signal);

      // Check if job was aborted
      if (controller.signal.aborted) {
        const result = await prisma.newsletter_jobs.updateMany({
          where: {
            id: job.id,
            status: 'running'
          },
          data: { 
            status: 'cancelled', 
            completed_at: new Date() 
          }
        });
        
        if (result.count === 0) {
          logger.warn(`[NewsletterQueue] Job ${job.id} not in running state, skipping cancel update`);
        }
        
        logger.info(`[NewsletterQueue] Job ${job.id} was cancelled`);
        return;
      }

      // Mark job as completed (atomic - only if still running)
      const result = await prisma.newsletter_jobs.updateMany({
        where: {
          id: job.id,
          status: 'running'
        },
        data: { 
          status: 'completed', 
          completed_at: new Date() 
        }
      });

      if (result.count === 0) {
        logger.warn(`[NewsletterQueue] Job ${job.id} not in running state, skipping completion update`);
        return;
      }

      logger.info(`[NewsletterQueue] Job ${job.id} completed successfully`);

    } catch (error: any) {
      if (controller.signal.aborted) {
        const result = await prisma.newsletter_jobs.updateMany({
          where: {
            id: job.id,
            status: 'running'
          },
          data: { 
            status: 'cancelled', 
            completed_at: new Date() 
          }
        });
        
        if (result.count === 0) {
          logger.warn(`[NewsletterQueue] Job ${job.id} not in running state, skipping cancel update`);
        }
        
        logger.info(`[NewsletterQueue] Job ${job.id} was cancelled`);
        return;
      }

      logger.error(`[NewsletterQueue] Job ${job.id} failed:`, error);

      // Retry logic - atomic update (only if still running)
      if (job.retry_count < job.max_retries) {
        const result = await prisma.newsletter_jobs.updateMany({
          where: {
            id: job.id,
            status: 'running'
          },
          data: {
            status: 'queued',
            retry_count: job.retry_count + 1,
            started_at: null,
            error: error.message,
          }
        });

        if (result.count === 0) {
          logger.warn(`[NewsletterQueue] Job ${job.id} not in running state, skipping retry rollback`);
          return;
        }

        logger.info(`[NewsletterQueue] Job ${job.id} will retry (attempt ${job.retry_count + 1}/${job.max_retries})`);
      } else {
        // Max retries exceeded - atomic update (only if still running)
        const result = await prisma.newsletter_jobs.updateMany({
          where: {
            id: job.id,
            status: 'running'
          },
          data: {
            status: 'failed',
            error: error.message,
            completed_at: new Date(),
          }
        });

        if (result.count === 0) {
          logger.warn(`[NewsletterQueue] Job ${job.id} not in running state, skipping final failure update`);
          return;
        }

        logger.error(`[NewsletterQueue] Job ${job.id} failed after ${job.retry_count} retries`);
      }
    }
  }

  /**
   * Find jobs by type and campaign ID (for cancellation)
   */
  async findJobByCampaignId(campaignId: string, jobType: JobType): Promise<string | null> {
    const jobs = await prisma.newsletter_jobs.findMany({
      where: {
        status: 'queued',
        type: jobType
      }
    });

    // Find job matching this campaign
    const campaignJob = jobs.find((job: any) => job.data?.campaignId === campaignId);
    return campaignJob?.id || null;
  }

  /**
   * Get queue statistics
   */
  async getStatistics() {
    const queuedJobs = await prisma.newsletter_jobs.findMany({
      where: { status: 'queued' }
    });
    
    return {
      activeJobs: this.activeJobs.size,
      pendingJobs: queuedJobs.length,
      registeredProcessors: Array.from(this.processors.keys()),
    };
  }
}

// Export singleton instance
export const newsletterJobQueue = new NewsletterJobQueue();
