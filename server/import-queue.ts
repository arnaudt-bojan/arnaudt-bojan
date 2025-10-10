import { storage } from "./storage";
import { importJobs, importJobLogs, importJobErrors } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Get database instance from storage
const db = storage.db;

// Job queue configuration
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;
const CONCURRENT_JOBS = 2;

// Job processor function type (receives job and abort signal)
export type JobProcessor = (job: any, signal: AbortSignal) => Promise<void>;

// Job queue class
export class ImportJobQueue {
  private isRunning = false;
  private activeJobs = new Map<string, AbortController>();
  private processor: JobProcessor | null = null;

  // Register the job processor
  registerProcessor(processor: JobProcessor) {
    this.processor = processor;
  }

  // Start the job queue
  start() {
    if (this.isRunning) {
      console.log("[ImportQueue] Already running");
      return;
    }

    this.isRunning = true;
    console.log("[ImportQueue] Starting job queue");
    this.poll();
  }

  // Stop the job queue
  stop() {
    this.isRunning = false;
    
    // Cancel all active jobs
    this.activeJobs.forEach((controller, jobId) => {
      console.log(`[ImportQueue] Cancelling job ${jobId}`);
      controller.abort();
    });
    
    this.activeJobs.clear();
    console.log("[ImportQueue] Stopped job queue");
  }

  // Poll for queued jobs
  private async poll() {
    while (this.isRunning) {
      try {
        // Check if we can process more jobs
        if (this.activeJobs.size < CONCURRENT_JOBS) {
          await this.processNextJob();
        }
      } catch (error) {
        console.error("[ImportQueue] Poll error:", error);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }

  // Process the next queued job
  private async processNextJob() {
    if (!this.processor) {
      return; // No processor registered yet
    }

    // First, find the next queued job
    const queuedJobs = await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.status, "queued"))
      .orderBy(importJobs.createdAt)
      .limit(1);

    if (queuedJobs.length === 0) {
      return; // No jobs to process
    }

    const nextJob = queuedJobs[0];

    // Atomically claim it by updating only if still queued
    // This prevents race conditions where the same job is picked twice
    const claimedJobs = await db
      .update(importJobs)
      .set({
        status: "running",
        startedAt: new Date(),
      })
      .where(
        and(
          eq(importJobs.id, nextJob.id),
          eq(importJobs.status, "queued") // Only update if still queued
        )
      )
      .returning();

    if (claimedJobs.length === 0) {
      // Job was already claimed by another worker
      return;
    }

    const job = claimedJobs[0];
    const controller = new AbortController();
    this.activeJobs.set(job.id, controller);

    // Fire-and-forget job processing (non-blocking for concurrency)
    this.processJob(job, controller).finally(() => {
      this.activeJobs.delete(job.id);
    });
  }

  // Process a single job (called as fire-and-forget)
  // Note: Job is already marked as "running" by processNextJob's atomic claim
  private async processJob(job: any, controller: AbortController) {
    try {
      await this.log(job.id, "info", `Starting job ${job.id}`);

      // Process the job with abort signal
      await this.processor!(job, controller.signal);

      // Check if job was aborted
      if (controller.signal.aborted) {
        await db
          .update(importJobs)
          .set({
            status: "failed",
            finishedAt: new Date(),
          })
          .where(eq(importJobs.id, job.id));
        
        await this.log(job.id, "warn", `Job ${job.id} was cancelled`);
        return;
      }

      // Mark job as success
      await db
        .update(importJobs)
        .set({
          status: "success",
          finishedAt: new Date(),
        })
        .where(eq(importJobs.id, job.id));

      await this.log(job.id, "info", `Job ${job.id} completed successfully`);
    } catch (error: any) {
      // Check if error was due to abort
      if (controller.signal.aborted) {
        await db
          .update(importJobs)
          .set({
            status: "failed",
            finishedAt: new Date(),
          })
          .where(eq(importJobs.id, job.id));
        
        await this.log(job.id, "warn", `Job ${job.id} was cancelled`);
        return;
      }

      console.error(`[ImportQueue] Job ${job.id} failed:`, error);

      // Log the error
      await this.logError(job.id, "process", error.message, error.code);

      // Fetch latest job state to get current errorCount
      const latestJob = await db
        .select()
        .from(importJobs)
        .where(eq(importJobs.id, job.id))
        .limit(1);

      const currentErrorCount = latestJob[0]?.errorCount || 0;
      const newErrorCount = currentErrorCount + 1;
      const shouldRetry = newErrorCount < MAX_RETRIES;

      await db
        .update(importJobs)
        .set({
          status: shouldRetry ? "queued" : "failed",
          errorCount: newErrorCount,
          finishedAt: shouldRetry ? null : new Date(), // Explicitly null to clear timestamp on retry
        })
        .where(eq(importJobs.id, job.id));

      await this.log(
        job.id,
        "error",
        shouldRetry
          ? `Job ${job.id} failed, will retry (${newErrorCount}/${MAX_RETRIES})`
          : `Job ${job.id} failed permanently after ${MAX_RETRIES} retries`
      );
    }
  }

  // Log a message for a job
  private async log(jobId: string, level: "info" | "warn" | "error", message: string, details?: any) {
    await db.insert(importJobLogs).values({
      jobId,
      level,
      message,
      detailsJson: details || null,
    });
  }

  // Log an error for a job
  private async logError(jobId: string, stage: string, errorMessage: string, errorCode?: string, externalId?: string) {
    await db.insert(importJobErrors).values({
      jobId,
      stage,
      errorMessage,
      errorCode: errorCode || null,
      externalId: externalId || null,
      retryCount: 0,
      resolved: 0,
    });
  }

  // Get job status
  async getJobStatus(jobId: string) {
    const job = await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.id, jobId))
      .limit(1);

    return job[0] || null;
  }

  // Get job logs
  async getJobLogs(jobId: string) {
    const logs = await db
      .select()
      .from(importJobLogs)
      .where(eq(importJobLogs.jobId, jobId))
      .orderBy(importJobLogs.createdAt);

    return logs;
  }

  // Get job errors
  async getJobErrors(jobId: string) {
    const errors = await db
      .select()
      .from(importJobErrors)
      .where(eq(importJobErrors.jobId, jobId))
      .orderBy(importJobErrors.createdAt);

    return errors;
  }

  // Enqueue a new job
  async enqueueJob(sourceId: string, type: "full" | "delta", createdBy: string) {
    const job = await db
      .insert(importJobs)
      .values({
        sourceId,
        type,
        status: "queued",
        createdBy,
        totalItems: 0,
        processedItems: 0,
        errorCount: 0,
      })
      .returning();

    await this.log(job[0].id, "info", `Job enqueued: ${type} import from source ${sourceId}`);

    return job[0];
  }

  // Update job progress
  async updateProgress(jobId: string, processedItems: number, totalItems: number) {
    await db
      .update(importJobs)
      .set({
        processedItems,
        totalItems,
      })
      .where(eq(importJobs.id, jobId));
  }

  // Update job checkpoint (for resumable imports)
  async updateCheckpoint(jobId: string, checkpoint: string) {
    await db
      .update(importJobs)
      .set({
        lastCheckpoint: checkpoint,
      })
      .where(eq(importJobs.id, jobId));
  }
}

// Singleton instance
export const importQueue = new ImportJobQueue();
