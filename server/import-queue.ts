import { prisma } from "./prisma";

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
    const nextJob = await prisma.import_jobs.findFirst({
      where: { status: "queued" },
      orderBy: { created_at: 'asc' }
    });

    if (!nextJob) {
      return; // No jobs to process
    }

    // Atomically claim it by updating only if still queued
    // This prevents race conditions where the same job is picked twice
    const result = await prisma.import_jobs.updateMany({
      where: {
        id: nextJob.id,
        status: "queued" // This IS checked in updateMany!
      },
      data: {
        status: "running",
        started_at: new Date(),
      }
    });

    // If count === 0, another worker already claimed it
    if (result.count === 0) {
      return; // Job already claimed by another worker
    }

    // If count === 1, we successfully claimed it!
    // Now fetch the full job object
    const claimedJob = await prisma.import_jobs.findUnique({
      where: { id: nextJob.id }
    });

    if (!claimedJob) {
      return; // Job was deleted
    }

    const controller = new AbortController();
    this.activeJobs.set(claimedJob.id, controller);

    // Fire-and-forget job processing (non-blocking for concurrency)
    this.processJob(claimedJob, controller).finally(() => {
      this.activeJobs.delete(claimedJob.id);
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
        const result = await prisma.import_jobs.updateMany({
          where: {
            id: job.id,
            status: "running"
          },
          data: {
            status: "failed",
            finished_at: new Date(),
          }
        });
        
        if (result.count === 0) {
          console.warn(`[ImportQueue] Job ${job.id} not in running state, skipping cancel update`);
        }
        
        await this.log(job.id, "warn", `Job ${job.id} was cancelled`);
        return;
      }

      // Mark job as success (atomic - only if still running)
      const result = await prisma.import_jobs.updateMany({
        where: {
          id: job.id,
          status: "running"
        },
        data: {
          status: "success",
          finished_at: new Date(),
        }
      });

      if (result.count === 0) {
        console.warn(`[ImportQueue] Job ${job.id} not in running state, skipping success update`);
        return;
      }

      await this.log(job.id, "info", `Job ${job.id} completed successfully`);
    } catch (error: any) {
      // Check if error was due to abort
      if (controller.signal.aborted) {
        const result = await prisma.import_jobs.updateMany({
          where: {
            id: job.id,
            status: "running"
          },
          data: {
            status: "failed",
            finished_at: new Date(),
          }
        });
        
        if (result.count === 0) {
          console.warn(`[ImportQueue] Job ${job.id} not in running state, skipping cancel update`);
        }
        
        await this.log(job.id, "warn", `Job ${job.id} was cancelled`);
        return;
      }

      console.error(`[ImportQueue] Job ${job.id} failed:`, error);

      // Log the error
      await this.logError(job.id, "process", error.message, error.code);

      // Fetch latest job state to get current errorCount
      const latestJob = await prisma.import_jobs.findUnique({
        where: { id: job.id }
      });

      const currentErrorCount = latestJob?.error_count || 0;
      const newErrorCount = currentErrorCount + 1;
      const shouldRetry = newErrorCount < MAX_RETRIES;

      // Atomic update - only if still running (prevents race with cancellation)
      const result = await prisma.import_jobs.updateMany({
        where: {
          id: job.id,
          status: "running"
        },
        data: {
          status: shouldRetry ? "queued" : "failed",
          error_count: newErrorCount,
          finished_at: shouldRetry ? null : new Date(),
        }
      });

      if (result.count === 0) {
        console.warn(`[ImportQueue] Job ${job.id} not in running state, skipping retry/fail update`);
        return;
      }

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
    await prisma.import_job_logs.create({
      data: {
        job_id: jobId,
        level,
        message,
        details_json: details || null,
      }
    });
  }

  // Log an error for a job
  private async logError(jobId: string, stage: string, errorMessage: string, errorCode?: string, externalId?: string) {
    await prisma.import_job_errors.create({
      data: {
        job_id: jobId,
        stage,
        error_message: errorMessage,
        error_code: errorCode || null,
        external_id: externalId || null,
        retry_count: 0,
        resolved: 0,
      }
    });
  }

  // Get job status
  async getJobStatus(jobId: string) {
    const job = await prisma.import_jobs.findUnique({
      where: { id: jobId }
    });

    return job || null;
  }

  // Get job logs
  async getJobLogs(jobId: string) {
    const logs = await prisma.import_job_logs.findMany({
      where: { job_id: jobId },
      orderBy: { created_at: 'asc' }
    });

    return logs;
  }

  // Get job errors
  async getJobErrors(jobId: string) {
    const errors = await prisma.import_job_errors.findMany({
      where: { job_id: jobId },
      orderBy: { created_at: 'asc' }
    });

    return errors;
  }

  // Enqueue a new job
  async enqueueJob(sourceId: string, type: "full" | "delta", createdBy: string) {
    const job = await prisma.import_jobs.create({
      data: {
        source_id: sourceId,
        type,
        status: "queued",
        created_by: createdBy,
        total_items: 0,
        processed_items: 0,
        error_count: 0,
      }
    });

    await this.log(job.id, "info", `Job enqueued: ${type} import from source ${sourceId}`);

    return job;
  }

  // Update job progress
  async updateProgress(jobId: string, processedItems: number, totalItems: number) {
    await prisma.import_jobs.update({
      where: { id: jobId },
      data: {
        processed_items: processedItems,
        total_items: totalItems,
      }
    });
  }

  // Update job checkpoint (for resumable imports)
  async updateCheckpoint(jobId: string, checkpoint: string) {
    await prisma.import_jobs.update({
      where: { id: jobId },
      data: {
        last_checkpoint: checkpoint,
      }
    });
  }
}

// Singleton instance
export const importQueue = new ImportJobQueue();
