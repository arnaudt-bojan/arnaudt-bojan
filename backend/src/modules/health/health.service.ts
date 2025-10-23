import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

export interface HealthCheckResult {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
}

export interface DetailedHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheckResult;
    cache: HealthCheckResult;
    stripe?: HealthCheckResult;
    email?: HealthCheckResult;
  };
  uptime: number;
  version: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly appStartTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Basic health check - always returns ok if service is running
   */
  getBasicHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'nest-api',
    };
  }

  /**
   * Detailed health check - tests all subsystems
   */
  async getDetailedHealth(): Promise<DetailedHealthResponse> {
    const checks = {
      database: await this.checkDatabase(),
      cache: await this.checkCache(),
      stripe: await this.checkStripe(),
      email: await this.checkEmail(),
    };

    // Determine overall status
    const criticalServices = [checks.database, checks.cache];
    const allUp = Object.values(checks).every(c => c.status === 'up');
    const criticalUp = criticalServices.every(c => c.status === 'up');

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allUp) {
      status = 'healthy';
    } else if (criticalUp) {
      status = 'degraded'; // Non-critical services down
    } else {
      status = 'unhealthy'; // Critical services down
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
      uptime: Math.floor((Date.now() - this.appStartTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Readiness check - verifies application is ready to accept traffic
   */
  async getReadinessStatus() {
    const checks = {
      database: await this.checkDatabase(),
      envVars: this.checkRequiredEnvVars(),
      modules: this.checkModulesInitialized(),
    };

    const isReady = Object.values(checks).every(c => c.status === 'up');

    return {
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /**
   * Check database connectivity using Prisma
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      
      this.logger.debug(`Database health check passed (${responseTime}ms)`);
      
      return {
        status: 'up',
        responseTime,
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check cache service availability
   */
  private async checkCache(): Promise<HealthCheckResult> {
    const start = Date.now();
    const testKey = 'health-check-test';
    const testValue = 'ok';

    try {
      // Test set
      await this.cache.set(testKey, testValue, 10);
      
      // Test get
      const retrieved = await this.cache.get(testKey);
      
      // Verify value
      if (retrieved !== testValue) {
        throw new Error('Cache value mismatch');
      }

      // Cleanup
      await this.cache.del(testKey);

      const responseTime = Date.now() - start;
      
      this.logger.debug(`Cache health check passed (${responseTime}ms)`);
      
      return {
        status: 'up',
        responseTime,
      };
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Stripe API connectivity (optional)
   */
  private async checkStripe(): Promise<HealthCheckResult> {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return {
          status: 'down',
          error: 'Stripe not configured',
        };
      }

      // Simple check - just verify env var is present
      // Could enhance with actual Stripe API call if needed
      return {
        status: 'up',
      };
    } catch (error) {
      this.logger.error('Stripe health check failed:', error);
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check email service connectivity (optional)
   */
  private async checkEmail(): Promise<HealthCheckResult> {
    try {
      if (!process.env.RESEND_API_KEY) {
        return {
          status: 'down',
          error: 'Email service not configured',
        };
      }

      // Simple check - just verify env var is present
      // Could enhance with actual Resend API call if needed
      return {
        status: 'up',
      };
    } catch (error) {
      this.logger.error('Email health check failed:', error);
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check required environment variables are present
   */
  private checkRequiredEnvVars(): HealthCheckResult {
    const required = [
      'DATABASE_URL',
    ];

    const missing = required.filter(envVar => !process.env[envVar]);

    if (missing.length > 0) {
      return {
        status: 'down',
        error: `Missing env vars: ${missing.join(', ')}`,
      };
    }

    return { status: 'up' };
  }

  /**
   * Check if all modules are initialized
   */
  private checkModulesInitialized(): HealthCheckResult {
    try {
      // Check if critical services are available
      if (!this.prisma || !this.cache) {
        return {
          status: 'down',
          error: 'Critical modules not initialized',
        };
      }

      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
