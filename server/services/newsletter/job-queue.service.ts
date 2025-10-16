/**
 * Newsletter Job Queue Service - DATABASE PERSISTENT
 * Handles background processing with database persistence (no jobs lost on restart)
 */

import { storage } from "../../storage";
import { newsletterJobs } from "@shared/schema";
import { eq, and, lte } from "drizzle-orm";
import { logger } from "../../logger";
import type { JobType, JobStatus } from "@shared/newsletter-types";

// Get database instance
const db = storage.db;

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
    const [newJob] = await db.insert(newsletterJobs).values({
      type: job.type,
      data: job.data as any,
      priority: job.priority ?? 0,
      scheduledFor: job.scheduledFor,
      maxRetries: job.maxRetries ?? MAX_RETRIES,
      status: 'queued',
    }).returning();

    logger.info(`[NewsletterQueue] Enqueued job ${newJob.id} (type: ${job.type})`);
    return newJob.id;
  }

  /**
   * Get job status from database
   */
  async getJobStatus(jobId: string) {
    const job = await db.query.newsletterJobs.findFirst({
      where: (jobs, { eq }) => eq(jobs.id, jobId),
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
      
      await db.update(newsletterJobs)
        .set({ status: 'cancelled', completedAt: new Date() })
        .where(eq(newsletterJobs.id, jobId));
      
      logger.info(`[NewsletterQueue] Cancelled running job ${jobId}`);
      return true;
    }

    // Cancel if queued
    const result = await db.update(newsletterJobs)
      .set({ status: 'cancelled', completedAt: new Date() })
      .where(and(
        eq(newsletterJobs.id, jobId),
        eq(newsletterJobs.status, 'queued')
      ))
      .returning();

    if (result.length > 0) {
      logger.info(`[NewsletterQueue] Cancelled queued job ${jobId}`);
      return true;
    }

    return false;
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
    const [queuedJob] = await db.select()
      .from(newsletterJobs)
      .where(and(
        eq(newsletterJobs.status, 'queued'),
        lte(newsletterJobs.scheduledFor ?? now, now)
      ))
      .orderBy(newsletterJobs.priority, newsletterJobs.createdAt)
      .limit(1);

    if (!queuedJob) {
      return; // No jobs ready
    }

    const processor = this.processors.get(queuedJob.type as JobType);
    if (!processor) {
      logger.error(`[NewsletterQueue] No processor registered for job type: ${queuedJob.type}`);
      
      await db.update(newsletterJobs)
        .set({
          status: 'failed',
          error: `No processor registered for job type: ${queuedJob.type}`,
          completedAt: now,
        })
        .where(eq(newsletterJobs.id, queuedJob.id));
      
      return;
    }

    // Atomically claim the job
    const [claimedJob] = await db.update(newsletterJobs)
      .set({
        status: 'running',
        startedAt: now,
      })
      .where(and(
        eq(newsletterJobs.id, queuedJob.id),
        eq(newsletterJobs.status, 'queued') // Only update if still queued
      ))
      .returning();

    if (!claimedJob) {
      // Job was already claimed by another worker
      return;
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
        await db.update(newsletterJobs)
          .set({ status: 'cancelled', completedAt: new Date() })
          .where(eq(newsletterJobs.id, job.id));
        
        logger.info(`[NewsletterQueue] Job ${job.id} was cancelled`);
        return;
      }

      // Mark job as completed
      await db.update(newsletterJobs)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(newsletterJobs.id, job.id));

      logger.info(`[NewsletterQueue] Job ${job.id} completed successfully`);

    } catch (error: any) {
      if (controller.signal.aborted) {
        await db.update(newsletterJobs)
          .set({ status: 'cancelled', completedAt: new Date() })
          .where(eq(newsletterJobs.id, job.id));
        
        logger.info(`[NewsletterQueue] Job ${job.id} was cancelled`);
        return;
      }

      logger.error(`[NewsletterQueue] Job ${job.id} failed:`, error);

      // Retry logic
      if (job.retryCount < job.maxRetries) {
        await db.update(newsletterJobs)
          .set({
            status: 'queued',
            retryCount: job.retryCount + 1,
            startedAt: null,
            error: error.message,
          })
          .where(eq(newsletterJobs.id, job.id));

        logger.info(`[NewsletterQueue] Job ${job.id} will retry (attempt ${job.retryCount + 1}/${job.maxRetries})`);
      } else {
        // Max retries exceeded
        await db.update(newsletterJobs)
          .set({
            status: 'failed',
            error: error.message,
            completedAt: new Date(),
          })
          .where(eq(newsletterJobs.id, job.id));

        logger.error(`[NewsletterQueue] Job ${job.id} failed after ${job.retryCount} retries`);
      }
    }
  }

  /**
   * Find jobs by type and campaign ID (for cancellation)
   */
  async findJobByCampaignId(campaignId: string, jobType: JobType): Promise<string | null> {
    const jobs = await db.query.newsletterJobs.findMany({
      where: (jobs, { eq, and }) => and(
        eq(jobs.status, 'queued'),
        eq(jobs.type, jobType)
      ),
    });

    // Find job matching this campaign
    const campaignJob = jobs.find((job: any) => job.data?.campaignId === campaignId);
    return campaignJob?.id || null;
  }

  /**
   * Get queue statistics
   */
  async getStatistics() {
    const stats = await db.select()
      .from(newsletterJobs)
      .where(eq(newsletterJobs.status, 'queued'));
    
    return {
      activeJobs: this.activeJobs.size,
      pendingJobs: stats.length,
      registeredProcessors: Array.from(this.processors.keys()),
    };
  }
}

// Export singleton instance
export const newsletterJobQueue = new NewsletterJobQueue();
