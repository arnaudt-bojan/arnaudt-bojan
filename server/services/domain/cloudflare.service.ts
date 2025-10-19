import { logger } from '../../logger';

interface CloudflareCustomHostnameResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<string>;
  result?: {
    id: string;
    hostname: string;
    status: 'pending' | 'active' | 'moved' | 'blocked';
    ssl: {
      status: 'initializing' | 'pending_validation' | 'pending_deployment' | 'pending_cleanup' | 'active';
      method: 'http' | 'txt' | 'email';
      type: 'dv';
      validation_records?: Array<{
        txt_name?: string;
        txt_value?: string;
        http_url?: string;
        http_body?: string;
      }>;
      validation_errors?: Array<{ message: string }>;
      certificate_authority?: string;
    };
    ownership_verification?: {
      type: 'txt';
      name: string;
      value: string;
    };
    ownership_verification_http?: {
      http_url: string;
      http_body: string;
    };
    created_at: string;
    updated_at: string;
  };
}

interface CloudflareError {
  code: number;
  message: string;
}

export interface CustomHostnameCreateOptions {
  hostname: string;
  sslMethod?: 'http' | 'txt';
  customOriginServer?: string;
}

export interface CustomHostnameDetails {
  id: string;
  hostname: string;
  status: 'pending' | 'active' | 'moved' | 'blocked';
  sslStatus: string;
  sslMethod: string;
  verificationRecords?: {
    txtName?: string;
    txtValue?: string;
    httpUrl?: string;
    httpBody?: string;
  };
  ownershipVerification?: {
    txtName: string;
    txtValue: string;
    httpUrl?: string;
    httpBody?: string;
  };
  sslValidationErrors?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class CloudflareDomainService {
  private apiToken: string | undefined;
  private zoneId: string | undefined;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID;
  }

  private ensureConfigured(): void {
    if (!this.apiToken || !this.zoneId) {
      throw new Error(
        'Cloudflare API credentials not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID environment variables.'
      );
    }
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
    endpoint: string,
    body?: any
  ): Promise<T> {
    this.ensureConfigured();

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json() as CloudflareCustomHostnameResponse;

      if (!response.ok || !data.success) {
        const errors = data.errors || [];
        const errorMessage = errors.map(e => `[${e.code}] ${e.message}`).join(', ');
        throw new Error(`Cloudflare API error: ${errorMessage || 'Unknown error'}`);
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Cloudflare API request failed:', { error: error.message, endpoint });
        throw error;
      }
      throw new Error('Unknown error occurred during Cloudflare API request');
    }
  }

  async createCustomHostname(options: CustomHostnameCreateOptions): Promise<CustomHostnameDetails> {
    logger.info('Creating Cloudflare custom hostname', { hostname: options.hostname });

    const response = await this.makeRequest<CloudflareCustomHostnameResponse>(
      'POST',
      `/zones/${this.zoneId}/custom_hostnames`,
      {
        hostname: options.hostname,
        ssl: {
          method: options.sslMethod || 'txt',
          type: 'dv',
          certificate_authority: 'lets_encrypt',
          wildcard: false,
        },
        custom_origin_server: options.customOriginServer,
        custom_origin_sni: ':request_host_header:',
      }
    );

    if (!response.result) {
      throw new Error('Cloudflare API returned no result');
    }

    return this.transformResponse(response.result);
  }

  async getCustomHostname(customHostnameId: string): Promise<CustomHostnameDetails> {
    logger.info('Fetching Cloudflare custom hostname', { customHostnameId });

    const response = await this.makeRequest<CloudflareCustomHostnameResponse>(
      'GET',
      `/zones/${this.zoneId}/custom_hostnames/${customHostnameId}`
    );

    if (!response.result) {
      throw new Error('Cloudflare API returned no result');
    }

    return this.transformResponse(response.result);
  }

  async deleteCustomHostname(customHostnameId: string): Promise<boolean> {
    logger.info('Deleting Cloudflare custom hostname', { customHostnameId });

    try {
      await this.makeRequest<CloudflareCustomHostnameResponse>(
        'DELETE',
        `/zones/${this.zoneId}/custom_hostnames/${customHostnameId}`
      );
      return true;
    } catch (error) {
      logger.error('Failed to delete Cloudflare custom hostname', { customHostnameId, error });
      return false;
    }
  }

  async verifyDNS(customHostnameId: string): Promise<{ verified: boolean; status: string }> {
    logger.info('Verifying DNS for Cloudflare custom hostname', { customHostnameId });

    const details = await this.getCustomHostname(customHostnameId);
    
    return {
      verified: details.status === 'active',
      status: details.status,
    };
  }

  async checkSSLStatus(customHostnameId: string): Promise<{
    status: string;
    active: boolean;
    errors?: string[];
  }> {
    logger.info('Checking SSL status for Cloudflare custom hostname', { customHostnameId });

    const details = await this.getCustomHostname(customHostnameId);
    
    return {
      status: details.sslStatus,
      active: details.sslStatus === 'active',
      errors: details.sslValidationErrors,
    };
  }

  async setFallbackOrigin(origin: string): Promise<boolean> {
    logger.info('Setting Cloudflare fallback origin', { origin });

    try {
      await this.makeRequest<CloudflareCustomHostnameResponse>(
        'PUT',
        `/zones/${this.zoneId}/custom_hostnames/fallback_origin`,
        { origin }
      );
      return true;
    } catch (error) {
      logger.error('Failed to set Cloudflare fallback origin', { origin, error });
      return false;
    }
  }

  private transformResponse(result: NonNullable<CloudflareCustomHostnameResponse['result']>): CustomHostnameDetails {
    const sslValidationRecords = result.ssl.validation_records?.[0];
    const ownershipVerification = result.ownership_verification;
    const ownershipVerificationHttp = result.ownership_verification_http;

    return {
      id: result.id,
      hostname: result.hostname,
      status: result.status,
      sslStatus: result.ssl.status,
      sslMethod: result.ssl.method,
      verificationRecords: sslValidationRecords ? {
        txtName: sslValidationRecords.txt_name,
        txtValue: sslValidationRecords.txt_value,
        httpUrl: sslValidationRecords.http_url,
        httpBody: sslValidationRecords.http_body,
      } : undefined,
      ownershipVerification: ownershipVerification || ownershipVerificationHttp ? {
        txtName: ownershipVerification?.name || '',
        txtValue: ownershipVerification?.value || '',
        httpUrl: ownershipVerificationHttp?.http_url,
        httpBody: ownershipVerificationHttp?.http_body,
      } : undefined,
      sslValidationErrors: result.ssl.validation_errors?.map(e => e.message),
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at),
    };
  }

  isConfigured(): boolean {
    return !!(this.apiToken && this.zoneId);
  }

  normalizeError(error: unknown): { code: string; message: string; userMessage: string } {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('rate limit')) {
        return {
          code: 'RATE_LIMIT',
          message: error.message,
          userMessage: 'Too many requests to Cloudflare. Please try again in a few minutes.',
        };
      }
      
      if (message.includes('invalid hostname') || message.includes('hostname already exists')) {
        return {
          code: 'INVALID_HOSTNAME',
          message: error.message,
          userMessage: 'This domain is invalid or already in use.',
        };
      }
      
      if (message.includes('unauthorized') || message.includes('forbidden')) {
        return {
          code: 'AUTH_ERROR',
          message: error.message,
          userMessage: 'Cloudflare authentication failed. Please contact support.',
        };
      }

      if (message.includes('not configured')) {
        return {
          code: 'NOT_CONFIGURED',
          message: error.message,
          userMessage: 'Cloudflare integration is not configured. Please contact support.',
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

export const cloudflareDomainService = new CloudflareDomainService();
