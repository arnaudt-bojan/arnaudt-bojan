import { promises as dns } from 'dns';
import { logger } from '../../logger';

export class DNSVerificationService {
  async verifyTxtRecord(domain: string, expectedValue: string): Promise<boolean> {
    try {
      const txtDomain = `_upfirst-verify.${domain}`;
      logger.info('[DNS Verification] Querying TXT records', { txtDomain, expectedValue });

      const records = await dns.resolveTxt(txtDomain);
      
      for (const record of records) {
        const txtValue = Array.isArray(record) ? record.join('') : record;
        if (txtValue === expectedValue) {
          logger.info('[DNS Verification] TXT record verified successfully', { txtDomain });
          return true;
        }
      }

      logger.warn('[DNS Verification] TXT record not found or mismatch', { 
        txtDomain, 
        expectedValue,
        foundRecords: records 
      });
      return false;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
          logger.info('[DNS Verification] TXT record not yet propagated', { domain });
          return false;
        }
      }
      
      logger.error('[DNS Verification] TXT verification failed', { 
        domain, 
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async verifyCNAMERecord(domain: string, expectedTarget: string): Promise<boolean> {
    try {
      logger.info('[DNS Verification] Querying CNAME records', { domain, expectedTarget });

      const records = await dns.resolveCname(domain);
      
      const normalizedTarget = expectedTarget.toLowerCase().replace(/\.$/, '');
      
      for (const record of records) {
        const normalizedRecord = record.toLowerCase().replace(/\.$/, '');
        if (normalizedRecord === normalizedTarget) {
          logger.info('[DNS Verification] CNAME record verified successfully', { domain, target: record });
          return true;
        }
      }

      logger.warn('[DNS Verification] CNAME record not found or mismatch', { 
        domain, 
        expectedTarget,
        foundRecords: records 
      });
      return false;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
          logger.info('[DNS Verification] CNAME record not yet propagated', { domain });
          return false;
        }
      }
      
      logger.error('[DNS Verification] CNAME verification failed', { 
        domain, 
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async verifyARecord(domain: string, expectedIP: string): Promise<boolean> {
    try {
      logger.info('[DNS Verification] Querying A records', { domain, expectedIP });

      const records = await dns.resolve4(domain);
      
      for (const record of records) {
        if (record === expectedIP) {
          logger.info('[DNS Verification] A record verified successfully', { domain, ip: record });
          return true;
        }
      }

      logger.warn('[DNS Verification] A record not found or mismatch', { 
        domain, 
        expectedIP,
        foundRecords: records 
      });
      return false;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
          logger.info('[DNS Verification] A record not yet propagated', { domain });
          return false;
        }
      }
      
      logger.error('[DNS Verification] A record verification failed', { 
        domain, 
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}

export const dnsVerificationService = new DNSVerificationService();
