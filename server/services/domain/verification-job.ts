import { storage } from '../../storage';
import { domainOrchestrator } from './orchestrator.service';
import { logger } from '../../logger';

export class DomainVerificationJob {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly POLL_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_CONCURRENT_VERIFICATIONS = 5;

  start(): void {
    if (this.intervalId) {
      logger.warn('DomainVerificationJob already running');
      return;
    }

    logger.info('Starting DomainVerificationJob', {
      pollIntervalMs: this.POLL_INTERVAL_MS,
    });

    this.intervalId = setInterval(
      () => this.runVerificationCycle(),
      this.POLL_INTERVAL_MS
    );

    this.runVerificationCycle();
  }

  stop(): void {
    if (this.intervalId) {
      logger.info('Stopping DomainVerificationJob');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async runVerificationCycle(): Promise<void> {
    if (this.isRunning) {
      logger.debug('Verification cycle already running, skipping');
      return;
    }

    this.isRunning = true;

    try {
      const allDomains = await storage.getAllDomainConnections();
      
      const pendingDomains = allDomains.filter(
        (domain) =>
          domain.status === 'pending_verification' ||
          domain.status === 'dns_verified' ||
          domain.status === 'ssl_provisioning'
      );

      if (pendingDomains.length === 0) {
        logger.debug('No pending domains to verify');
        return;
      }

      logger.info('Processing pending domain verifications', {
        count: pendingDomains.length,
      });

      const batches: typeof pendingDomains[] = [];
      for (let i = 0; i < pendingDomains.length; i += this.MAX_CONCURRENT_VERIFICATIONS) {
        batches.push(pendingDomains.slice(i, i + this.MAX_CONCURRENT_VERIFICATIONS));
      }

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map((domain) => this.verifyDomain(domain.id))
        );
      }

      logger.info('Verification cycle completed', {
        processedCount: pendingDomains.length,
      });
    } catch (error) {
      logger.error('Verification cycle failed', { error });
    } finally {
      this.isRunning = false;
    }
  }

  private async verifyDomain(domainId: string): Promise<void> {
    try {
      logger.debug('Verifying domain', { domainId });

      const result = await domainOrchestrator.retryVerification(domainId);

      if (result.verified) {
        logger.info('Domain verification successful', {
          domainId,
          newStatus: result.newStatus,
        });
      } else {
        logger.debug('Domain verification pending', {
          domainId,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Domain verification failed', { domainId, error });
      
      await storage.updateDomainConnection(domainId, {
        status: 'error',
        failureReason: error instanceof Error ? error.message : 'Verification failed',
        lastCheckedAt: new Date(),
      });
    }
  }

  async verifyDomainNow(domainId: string): Promise<{
    success: boolean;
    verified: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      const result = await domainOrchestrator.retryVerification(domainId);
      
      return {
        success: true,
        verified: result.verified,
        status: result.newStatus,
        error: result.error,
      };
    } catch (error) {
      logger.error('Manual verification failed', { domainId, error });
      
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  getStatus(): {
    running: boolean;
    pollIntervalMs: number;
  } {
    return {
      running: !!this.intervalId,
      pollIntervalMs: this.POLL_INTERVAL_MS,
    };
  }
}

export const domainVerificationJob = new DomainVerificationJob();
