import { cloudflareDomainService } from './cloudflare.service';
import { manualDomainService } from './manual.service';
import { dnsVerificationService } from './dns-verification.service';
import { storage } from '../../storage';
import type { DomainConnection, InsertDomainConnection } from '@shared/schema';
import { logger } from '../../logger';
import { randomBytes } from 'crypto';

interface DomainSetupOptions {
  sellerId: string;
  domain: string;
  strategy: 'cloudflare' | 'manual';
  isPrimary?: boolean;
}

interface DomainSetupResult {
  success: boolean;
  domainConnection?: DomainConnection;
  error?: string;
  userMessage?: string;
}

interface VerificationResult {
  verified: boolean;
  newStatus?: string;
  error?: string;
}

export class DomainOrchestrator {
  private static readonly CLOUDFLARE_TIMEOUT_MINUTES = 15;
  private static readonly MAX_VERIFICATION_ATTEMPTS = 10;

  async initiateDomainSetup(options: DomainSetupOptions): Promise<DomainSetupResult> {
    logger.info('Initiating domain setup', { ...options });

    try {
      const normalizedDomain = options.domain.toLowerCase().trim();

      const existing = await storage.getDomainConnectionByDomain(normalizedDomain);
      if (existing) {
        return {
          success: false,
          error: 'Domain already connected',
          userMessage: 'This domain is already in use. Please use a different domain.',
        };
      }

      const verificationToken = this.generateVerificationToken();

      if (options.strategy === 'cloudflare') {
        return await this.setupCloudflare(options, verificationToken);
      } else {
        return await this.setupManual(options, verificationToken);
      }
    } catch (error) {
      logger.error('Domain setup failed', { error, options });
      
      const normalized = options.strategy === 'cloudflare'
        ? cloudflareDomainService.normalizeError(error)
        : manualDomainService.normalizeError(error);
      
      return {
        success: false,
        error: normalized.message,
        userMessage: normalized.userMessage,
      };
    }
  }

  private async setupCloudflare(
    options: DomainSetupOptions,
    verificationToken: string
  ): Promise<DomainSetupResult> {
    if (!cloudflareDomainService.isConfigured()) {
      const normalized = cloudflareDomainService.normalizeError(
        new Error('Cloudflare integration not configured')
      );
      return {
        success: false,
        error: normalized.code,
        userMessage: normalized.userMessage + ' Please try manual setup instead or contact support.',
      };
    }

    try {
      const customHostname = await cloudflareDomainService.createCustomHostname({
        hostname: options.domain,
        sslMethod: 'txt',
      });

      const dnsInstructions = {
        type: 'cloudflare',
        cnameTarget: process.env.FALLBACK_ORIGIN || 'app.upfirst.io',
        verificationRecords: customHostname.ownershipVerification,
      };

      const domainConnection: InsertDomainConnection = {
        sellerId: options.sellerId,
        domain: options.domain,
        normalizedDomain: options.domain.toLowerCase(),
        strategy: 'cloudflare',
        status: 'pending_verification',
        verificationToken,
        dnsInstructions,
        cloudflareCustomHostnameId: customHostname.id,
        isPrimary: options.isPrimary ? 1 : 0,
      };

      const created = await storage.createDomainConnection(domainConnection);

      return {
        success: true,
        domainConnection: created,
      };
    } catch (error) {
      logger.error('Cloudflare setup failed', { error });
      
      const normalized = cloudflareDomainService.normalizeError(error);
      return {
        success: false,
        error: normalized.code,
        userMessage: normalized.userMessage + ' You can try manual setup instead as an alternative.',
      };
    }
  }

  private async setupManual(
    options: DomainSetupOptions,
    verificationToken: string
  ): Promise<DomainSetupResult> {
    const dnsInstructions = manualDomainService.generateDNSInstructions(
      options.domain,
      verificationToken
    );

    const domainConnection: InsertDomainConnection = {
      sellerId: options.sellerId,
      domain: options.domain,
      normalizedDomain: options.domain.toLowerCase(),
      strategy: 'manual',
      status: 'pending_verification',
      verificationToken,
      dnsInstructions: {
        type: 'manual',
        ...dnsInstructions,
      },
      isPrimary: options.isPrimary ? 1 : 0,
    };

    const created = await storage.createDomainConnection(domainConnection);

    return {
      success: true,
      domainConnection: created,
    };
  }

  async switchStrategy(
    domainConnectionId: string,
    newStrategy: 'cloudflare' | 'manual'
  ): Promise<DomainSetupResult> {
    logger.info('Switching domain strategy', { domainConnectionId, newStrategy });

    const domain = await storage.getDomainConnectionById(domainConnectionId);
    if (!domain) {
      return {
        success: false,
        error: 'Domain not found',
        userMessage: 'The specified domain connection was not found.',
      };
    }

    if (domain.strategy === newStrategy) {
      return {
        success: false,
        error: 'Already using this strategy',
        userMessage: `This domain is already using the ${newStrategy} strategy.`,
      };
    }

    try {
      if (domain.strategy === 'cloudflare' && domain.cloudflareCustomHostnameId) {
        await cloudflareDomainService.deleteCustomHostname(domain.cloudflareCustomHostnameId);
      }

      if (domain.strategy === 'manual' && domain.caddySiteId) {
        await manualDomainService.unregisterFromCaddy(domain.domain);
      }

      const verificationToken = this.generateVerificationToken();
      
      const setupOptions: DomainSetupOptions = {
        sellerId: domain.sellerId,
        domain: domain.domain,
        strategy: newStrategy,
        isPrimary: domain.isPrimary === 1,
      };

      const result = newStrategy === 'cloudflare'
        ? await this.setupCloudflare(setupOptions, verificationToken)
        : await this.setupManual(setupOptions, verificationToken);

      if (result.success && result.domainConnection) {
        await storage.deleteDomainConnection(domainConnectionId);
      }

      return result;
    } catch (error) {
      logger.error('Strategy switch failed', { error, domainConnectionId, newStrategy });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Strategy switch failed',
        userMessage: 'Failed to switch strategy. Please try again or contact support.',
      };
    }
  }

  async retryVerification(domainConnectionId: string): Promise<VerificationResult> {
    logger.info('Retrying domain verification', { domainConnectionId });

    const domain = await storage.getDomainConnectionById(domainConnectionId);
    if (!domain) {
      return { verified: false, error: 'Domain not found' };
    }

    if (domain.status === 'active') {
      return { verified: true, newStatus: 'active' };
    }

    if (domain.strategy === 'cloudflare') {
      return await this.verifyCloudflare(domain);
    } else {
      return await this.verifyManual(domain);
    }
  }

  private async verifyCloudflare(domain: DomainConnection): Promise<VerificationResult> {
    if (!domain.cloudflareCustomHostnameId) {
      return { verified: false, error: 'Cloudflare hostname ID missing' };
    }

    try {
      const txtVerified = await dnsVerificationService.verifyTxtRecord(
        domain.domain,
        domain.verificationToken
      );

      if (!txtVerified) {
        await storage.updateDomainConnection(domain.id, {
          lastCheckedAt: new Date(),
        });
        return { 
          verified: false, 
          newStatus: domain.status,
          error: 'TXT record not found or does not match. Please add the verification record to your DNS.'
        };
      }

      await storage.updateDomainConnection(domain.id, {
        status: 'dns_verified',
        lastVerifiedAt: new Date(),
        lastCheckedAt: new Date(),
      });

      await this.provisionSSL(domain);

      return { verified: true, newStatus: 'ssl_provisioning' };
    } catch (error) {
      logger.error('Cloudflare verification failed', { error, domainId: domain.id });
      await storage.updateDomainConnection(domain.id, {
        failureReason: error instanceof Error ? error.message : 'Verification failed',
        lastCheckedAt: new Date(),
      });
      return { verified: false, error: error instanceof Error ? error.message : 'Verification failed' };
    }
  }

  private async provisionSSL(domain: DomainConnection): Promise<void> {
    if (!domain.cloudflareCustomHostnameId) {
      throw new Error('Cloudflare hostname ID missing');
    }

    try {
      logger.info('[Domain Orchestrator] Provisioning SSL', { domainId: domain.id, domain: domain.domain });

      await storage.updateDomainConnection(domain.id, {
        status: 'ssl_provisioning',
      });

      logger.info('[Domain Orchestrator] SSL provisioning initiated', { 
        domainId: domain.id, 
        cloudflareHostnameId: domain.cloudflareCustomHostnameId 
      });
    } catch (error) {
      logger.error('[Domain Orchestrator] SSL provisioning failed', { error, domainId: domain.id });
      await storage.updateDomainConnection(domain.id, {
        status: 'error',
        failureReason: error instanceof Error ? error.message : 'SSL provisioning failed',
      });
      throw error;
    }
  }

  private async verifyManual(domain: DomainConnection): Promise<VerificationResult> {
    try {
      const txtVerified = await dnsVerificationService.verifyTxtRecord(
        domain.domain,
        domain.verificationToken
      );

      if (!txtVerified) {
        await storage.updateDomainConnection(domain.id, {
          lastCheckedAt: new Date(),
          failureReason: 'TXT record not found or does not match',
        });
        return { 
          verified: false, 
          error: 'TXT record not found or does not match. Please add the verification record to your DNS.' 
        };
      }

      await storage.updateDomainConnection(domain.id, {
        status: 'dns_verified',
        lastVerifiedAt: new Date(),
        lastCheckedAt: new Date(),
      });

      const dnsInstructions = domain.dnsInstructions as any;
      const recordType = dnsInstructions.recordType || 'CNAME';
      
      let dnsVerified = false;
      
      if (recordType === 'A') {
        const expectedIP = dnsInstructions.value || process.env.FALLBACK_IP || '0.0.0.0';
        dnsVerified = await dnsVerificationService.verifyARecord(
          domain.domain,
          expectedIP
        );
      } else {
        const cnameTarget = dnsInstructions.value || process.env.FALLBACK_ORIGIN || 'app.upfirst.io';
        dnsVerified = await dnsVerificationService.verifyCNAMERecord(
          domain.domain,
          cnameTarget
        );
      }

      if (dnsVerified) {
        await storage.updateDomainConnection(domain.id, {
          status: 'ssl_provisioning',
        });

        const caddyResult = await manualDomainService.registerWithCaddy(domain.domain);
        
        if (caddyResult.success) {
          await storage.updateDomainConnection(domain.id, {
            status: 'active',
            caddySiteId: caddyResult.siteId,
          });
          return { verified: true, newStatus: 'active' };
        }
      }

      return { verified: false, newStatus: 'dns_verified' };
    } catch (error) {
      logger.error('Manual verification failed', { error, domainId: domain.id });
      await storage.updateDomainConnection(domain.id, {
        failureReason: error instanceof Error ? error.message : 'Verification failed',
        lastCheckedAt: new Date(),
      });
      return { verified: false, error: error instanceof Error ? error.message : 'Verification failed' };
    }
  }

  async promoteFallback(domainConnectionId: string): Promise<{
    shouldPromote: boolean;
    reason?: string;
  }> {
    const domain = await storage.getDomainConnectionById(domainConnectionId);
    if (!domain) {
      return { shouldPromote: false };
    }

    if (domain.strategy !== 'cloudflare') {
      return { shouldPromote: false };
    }

    if (domain.status === 'active') {
      return { shouldPromote: false };
    }

    const minutesSinceCreation = (Date.now() - domain.createdAt.getTime()) / (1000 * 60);
    
    if (minutesSinceCreation > DomainOrchestrator.CLOUDFLARE_TIMEOUT_MINUTES) {
      return {
        shouldPromote: true,
        reason: `Cloudflare setup has been pending for ${Math.round(minutesSinceCreation)} minutes. Manual setup is available as a faster alternative.`,
      };
    }

    return { shouldPromote: false };
  }

  async deleteDomain(domainConnectionId: string): Promise<boolean> {
    logger.info('Deleting domain connection', { domainConnectionId });

    const domain = await storage.getDomainConnectionById(domainConnectionId);
    if (!domain) {
      return false;
    }

    try {
      if (domain.strategy === 'cloudflare' && domain.cloudflareCustomHostnameId) {
        await cloudflareDomainService.deleteCustomHostname(domain.cloudflareCustomHostnameId);
      }

      if (domain.strategy === 'manual' && domain.caddySiteId) {
        await manualDomainService.unregisterFromCaddy(domain.domain);
      }

      return await storage.deleteDomainConnection(domainConnectionId);
    } catch (error) {
      logger.error('Failed to delete domain', { error, domainConnectionId });
      return false;
    }
  }

  async setPrimaryDomain(sellerId: string, domainConnectionId: string): Promise<boolean> {
    logger.info('Setting primary domain', { sellerId, domainConnectionId });

    try {
      const sellerDomains = await storage.getDomainConnectionsBySellerId(sellerId);
      
      for (const domain of sellerDomains) {
        await storage.updateDomainConnection(domain.id, {
          isPrimary: domain.id === domainConnectionId ? 1 : 0,
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to set primary domain', { error, sellerId, domainConnectionId });
      return false;
    }
  }

  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  async getDomainStatus(domainConnectionId: string): Promise<{
    status: string;
    progress: number;
    message: string;
    nextSteps?: string[];
  }> {
    const domain = await storage.getDomainConnectionById(domainConnectionId);
    if (!domain) {
      return {
        status: 'not_found',
        progress: 0,
        message: 'Domain not found',
      };
    }

    const statusMap: Record<string, { progress: number; message: string; nextSteps?: string[] }> = {
      pending_verification: {
        progress: 20,
        message: 'Waiting for DNS records to be added',
        nextSteps: [
          'Add the required DNS records to your domain provider',
          'Wait for DNS propagation (can take up to 48 hours)',
        ],
      },
      dns_verified: {
        progress: 60,
        message: 'DNS verified, provisioning SSL certificate',
        nextSteps: ['SSL certificate is being provisioned automatically'],
      },
      ssl_provisioning: {
        progress: 80,
        message: 'SSL certificate provisioning in progress',
        nextSteps: ['SSL certificate should be ready within a few minutes'],
      },
      active: {
        progress: 100,
        message: 'Domain is active and ready to use',
      },
      error: {
        progress: 0,
        message: domain.failureReason || 'An error occurred during setup',
        nextSteps: ['Check your DNS records', 'Try manual verification', 'Contact support if the issue persists'],
      },
      deactivated: {
        progress: 0,
        message: 'Domain has been deactivated',
      },
    };

    return {
      status: domain.status,
      ...(statusMap[domain.status] || {
        progress: 0,
        message: 'Unknown status',
      }),
    };
  }
}

export const domainOrchestrator = new DomainOrchestrator();
