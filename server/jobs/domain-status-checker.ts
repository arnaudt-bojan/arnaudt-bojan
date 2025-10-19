import { storage } from '../storage';
import { cloudflareDomainService } from '../services/domain/cloudflare.service';
import { logger } from '../logger';

const CHECK_INTERVAL_MS = 2 * 60 * 1000;

export class DomainStatusChecker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  async checkDomainStatuses(): Promise<void> {
    if (this.isRunning) {
      logger.debug('[Domain Status Checker] Check already in progress, skipping');
      return;
    }

    this.isRunning = true;

    try {
      logger.debug('[Domain Status Checker] Starting domain status check');

      const domains = await storage.getDomainsInProvisioning();

      if (domains.length === 0) {
        logger.debug('[Domain Status Checker] No domains in provisioning state');
        this.isRunning = false;
        return;
      }

      logger.info('[Domain Status Checker] Checking SSL status for domains', {
        count: domains.length,
        domains: domains.map(d => d.domain),
      });

      for (const domain of domains) {
        try {
          if (domain.strategy === 'cloudflare' && domain.cloudflareCustomHostnameId) {
            await this.checkCloudflareSSLStatus(domain);
          }
        } catch (error) {
          logger.error('[Domain Status Checker] Error checking domain', {
            domainId: domain.id,
            domain: domain.domain,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info('[Domain Status Checker] Completed domain status check', {
        count: domains.length,
      });
    } catch (error) {
      logger.error('[Domain Status Checker] Error during status check cycle', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.isRunning = false;
    }
  }

  private async checkCloudflareSSLStatus(domain: any): Promise<void> {
    if (!domain.cloudflareCustomHostnameId) {
      logger.warn('[Domain Status Checker] Cloudflare hostname ID missing', {
        domainId: domain.id,
      });
      return;
    }

    try {
      logger.debug('[Domain Status Checker] Checking Cloudflare SSL status', {
        domainId: domain.id,
        domain: domain.domain,
        hostnameId: domain.cloudflareCustomHostnameId,
      });

      const sslStatus = await cloudflareDomainService.checkSSLStatus(
        domain.cloudflareCustomHostnameId
      );

      logger.info('[Domain Status Checker] SSL status retrieved', {
        domainId: domain.id,
        domain: domain.domain,
        status: sslStatus.status,
        active: sslStatus.active,
      });

      if (sslStatus.active) {
        await storage.updateDomainConnection(domain.id, {
          status: 'active',
          lastCheckedAt: new Date(),
        });

        logger.info('[Domain Status Checker] Domain activated', {
          domainId: domain.id,
          domain: domain.domain,
        });
      } else if (sslStatus.errors && sslStatus.errors.length > 0) {
        await storage.updateDomainConnection(domain.id, {
          status: 'error',
          failureReason: sslStatus.errors.join(', '),
          lastCheckedAt: new Date(),
        });

        logger.error('[Domain Status Checker] SSL provisioning failed', {
          domainId: domain.id,
          domain: domain.domain,
          errors: sslStatus.errors,
        });
      } else {
        await storage.updateDomainConnection(domain.id, {
          lastCheckedAt: new Date(),
        });

        logger.debug('[Domain Status Checker] SSL still provisioning', {
          domainId: domain.id,
          domain: domain.domain,
          status: sslStatus.status,
        });
      }
    } catch (error) {
      logger.error('[Domain Status Checker] Error checking Cloudflare SSL', {
        domainId: domain.id,
        domain: domain.domain,
        error: error instanceof Error ? error.message : String(error),
      });

      await storage.updateDomainConnection(domain.id, {
        failureReason: error instanceof Error ? error.message : 'SSL status check failed',
        lastCheckedAt: new Date(),
      });
    }
  }

  start(): void {
    if (this.intervalId) {
      logger.warn('[Domain Status Checker] Already started');
      return;
    }

    logger.info('[Domain Status Checker] Starting background job', {
      intervalMs: CHECK_INTERVAL_MS,
    });

    this.checkDomainStatuses();

    this.intervalId = setInterval(() => {
      this.checkDomainStatuses();
    }, CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[Domain Status Checker] Stopped');
    }
  }
}

export function startDomainStatusChecker(): DomainStatusChecker {
  const checker = new DomainStatusChecker();
  checker.start();
  return checker;
}
