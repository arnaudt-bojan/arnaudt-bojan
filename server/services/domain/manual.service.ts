import { promises as dns } from 'dns';
import { logger } from '../../logger';

export interface DNSInstructions {
  recordType: 'CNAME' | 'A';
  host: string;
  value: string;
  ttl: number;
  txtVerification?: {
    host: string;
    value: string;
  };
  httpVerification?: {
    path: string;
    content: string;
  };
}

export interface DNSVerificationResult {
  verified: boolean;
  recordType: 'CNAME' | 'A' | 'TXT' | 'HTTP';
  foundValue?: string;
  expectedValue?: string;
  error?: string;
}

export interface CaddyRegistrationResult {
  success: boolean;
  siteId?: string;
  error?: string;
}

export interface SSLStatusResult {
  active: boolean;
  expiresAt?: Date;
  issuer?: string;
  error?: string;
}

export class ManualDomainService {
  private caddyAdminUrl: string;
  private fallbackOrigin: string;

  constructor() {
    this.caddyAdminUrl = process.env.CADDY_ADMIN_URL || 'http://localhost:2019';
    this.fallbackOrigin = process.env.FALLBACK_ORIGIN || 'app.upfirst.com';
  }

  generateDNSInstructions(domain: string, verificationToken: string): DNSInstructions {
    logger.info('Generating DNS instructions for manual setup', { domain });

    const isApexDomain = domain.split('.').length === 2;
    const fallbackIp = process.env.FALLBACK_IP || '0.0.0.0'; 

    if (isApexDomain) {
      return {
        recordType: 'A',
        host: '@',
        value: fallbackIp,
        ttl: 3600,
        txtVerification: {
          host: `_upfirst-domain-verify.${domain}`,
          value: verificationToken,
        },
        httpVerification: {
          path: `/.well-known/upfirst-domain-verify/${verificationToken}`,
          content: verificationToken,
        },
      };
    }

    return {
      recordType: 'CNAME',
      host: domain.split('.')[0],
      value: this.fallbackOrigin,
      ttl: 3600,
      txtVerification: {
        host: `_upfirst-domain-verify.${domain}`,
        value: verificationToken,
      },
      httpVerification: {
        path: `/.well-known/upfirst-domain-verify/${verificationToken}`,
        content: verificationToken,
      },
    };
  }

  async verifyDNS(
    domain: string,
    expectedValue: string,
    recordType: 'CNAME' | 'A'
  ): Promise<DNSVerificationResult> {
    logger.info('Verifying DNS records', { domain, recordType });

    try {
      if (recordType === 'CNAME') {
        const records = await dns.resolveCname(domain);
        const foundValue = records[0]?.toLowerCase();
        const expected = expectedValue.toLowerCase();

        return {
          verified: foundValue === expected,
          recordType: 'CNAME',
          foundValue,
          expectedValue: expected,
        };
      }

      if (recordType === 'A') {
        const records = await dns.resolve4(domain);
        const foundValue = records[0];

        return {
          verified: records.includes(expectedValue),
          recordType: 'A',
          foundValue,
          expectedValue,
        };
      }

      return {
        verified: false,
        recordType,
        error: 'Unsupported record type',
      };
    } catch (error) {
      logger.warn('DNS verification failed', { domain, recordType, error: error instanceof Error ? error.message : String(error) });
      
      return {
        verified: false,
        recordType,
        error: error instanceof Error ? error.message : 'DNS lookup failed',
      };
    }
  }

  async verifyTXTRecord(domain: string, expectedToken: string): Promise<DNSVerificationResult> {
    logger.info('Verifying TXT record for domain ownership', { domain });

    try {
      const txtHost = `_upfirst-domain-verify.${domain}`;
      const records = await dns.resolveTxt(txtHost);
      
      const flatRecords = records.flat();
      const verified = flatRecords.some(record => record === expectedToken);

      return {
        verified,
        recordType: 'TXT',
        foundValue: flatRecords.join(', '),
        expectedValue: expectedToken,
      };
    } catch (error) {
      logger.warn('TXT verification failed', { domain, error: error instanceof Error ? error.message : String(error) });
      
      return {
        verified: false,
        recordType: 'TXT',
        error: error instanceof Error ? error.message : 'TXT lookup failed',
      };
    }
  }

  async verifyHTTPChallenge(domain: string, expectedToken: string): Promise<DNSVerificationResult> {
    logger.info('Verifying HTTP challenge for domain ownership', { domain });

    try {
      const url = `http://${domain}/.well-known/upfirst-domain-verify/${expectedToken}`;
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          verified: false,
          recordType: 'HTTP',
          error: `HTTP ${response.status}`,
        };
      }

      const content = await response.text();
      const verified = content.trim() === expectedToken;

      return {
        verified,
        recordType: 'HTTP',
        foundValue: content.trim(),
        expectedValue: expectedToken,
      };
    } catch (error) {
      logger.warn('HTTP verification failed', { domain, error: error instanceof Error ? error.message : String(error) });
      
      return {
        verified: false,
        recordType: 'HTTP',
        error: error instanceof Error ? error.message : 'HTTP challenge failed',
      };
    }
  }

  async verifyOwnership(domain: string, verificationToken: string): Promise<{
    verified: boolean;
    method?: 'txt' | 'http';
    error?: string;
  }> {
    logger.info('Attempting domain ownership verification', { domain });

    const txtResult = await this.verifyTXTRecord(domain, verificationToken);
    if (txtResult.verified) {
      return { verified: true, method: 'txt' };
    }

    const httpResult = await this.verifyHTTPChallenge(domain, verificationToken);
    if (httpResult.verified) {
      return { verified: true, method: 'http' };
    }

    return {
      verified: false,
      error: `TXT: ${txtResult.error || 'not found'}, HTTP: ${httpResult.error || 'not found'}`,
    };
  }

  async registerWithCaddy(domain: string): Promise<CaddyRegistrationResult> {
    logger.info('Registering domain with Caddy', { domain });

    try {
      const caddyConfig = {
        apps: {
          http: {
            servers: {
              [`srv-${domain}`]: {
                listen: [':443'],
                routes: [
                  {
                    match: [{ host: [domain] }],
                    handle: [
                      {
                        handler: 'reverse_proxy',
                        upstreams: [
                          { dial: '0.0.0.0:5000' },
                        ],
                      },
                    ],
                  },
                ],
                automatic_https: {
                  disable: false,
                },
              },
            },
          },
          tls: {
            automation: {
              policies: [
                {
                  subjects: [domain],
                  on_demand: true,
                },
              ],
            },
          },
        },
      };

      const response = await fetch(`${this.caddyAdminUrl}/config/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caddyConfig),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Caddy API error: ${response.status} - ${errorText}`);
      }

      return {
        success: true,
        siteId: `srv-${domain}`,
      };
    } catch (error) {
      logger.error('Failed to register domain with Caddy', { domain, error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Caddy registration failed',
      };
    }
  }

  async unregisterFromCaddy(domain: string): Promise<boolean> {
    logger.info('Unregistering domain from Caddy', { domain });

    try {
      const siteId = `srv-${domain}`;
      const response = await fetch(`${this.caddyAdminUrl}/config/apps/http/servers/${siteId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        throw new Error(`Caddy API error: ${response.status} - ${errorText}`);
      }

      return true;
    } catch (error) {
      logger.error('Failed to unregister domain from Caddy', { domain, error });
      return false;
    }
  }

  async checkSSLStatus(domain: string): Promise<SSLStatusResult> {
    logger.info('Checking SSL status for domain', { domain });

    try {
      const url = `https://${domain}`;
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      });

      return {
        active: true,
        issuer: 'Let\'s Encrypt',
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('certificate')) {
          return {
            active: false,
            error: 'SSL certificate not yet provisioned',
          };
        }
      }
      
      logger.warn('SSL check failed', { domain, error: error instanceof Error ? error.message : String(error) });
      
      return {
        active: false,
        error: error instanceof Error ? error.message : 'SSL check failed',
      };
    }
  }

  isCaddyConfigured(): boolean {
    return !!this.caddyAdminUrl;
  }

  normalizeError(error: unknown): { code: string; message: string; userMessage: string } {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('dns') || message.includes('enotfound') || message.includes('enodata')) {
        return {
          code: 'DNS_NOT_FOUND',
          message: error.message,
          userMessage: 'DNS records not found. Please ensure you have added the required DNS records and wait for propagation (can take up to 48 hours).',
        };
      }
      
      if (message.includes('timeout')) {
        return {
          code: 'TIMEOUT',
          message: error.message,
          userMessage: 'Verification timed out. Please try again.',
        };
      }
      
      if (message.includes('caddy')) {
        return {
          code: 'CADDY_ERROR',
          message: error.message,
          userMessage: 'Failed to configure the web server. Please contact support.',
        };
      }

      if (message.includes('certificate')) {
        return {
          code: 'SSL_ERROR',
          message: error.message,
          userMessage: 'SSL certificate provisioning failed. Please ensure your DNS records are correct and try again.',
        };
      }
      
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        userMessage: 'An unexpected error occurred. Please try again or contact support.',
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error',
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
    };
  }
}

export const manualDomainService = new ManualDomainService();
