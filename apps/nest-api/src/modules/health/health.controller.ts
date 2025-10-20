import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic Health Check
   * GET /health
   * 
   * Always returns 200 if server is running.
   * Used for load balancer health checks.
   * 
   * Response: { status: 'ok', timestamp: '2025-01-20T...' }
   */
  @Get()
  check() {
    return this.healthService.getBasicHealth();
  }

  /**
   * Detailed Health Check
   * GET /health/detailed
   * 
   * Checks multiple subsystems:
   * - Database connectivity (Prisma query test)
   * - Cache service availability (test set/get)
   * - External services (Stripe, Resend connectivity)
   * 
   * Returns 200 if all critical services up
   * Returns 503 if any critical service down
   */
  @Get('detailed')
  async detailed(@Res() res: Response) {
    const health = await this.healthService.getDetailedHealth();
    
    const statusCode = health.status === 'unhealthy' 
      ? HttpStatus.SERVICE_UNAVAILABLE 
      : HttpStatus.OK;
    
    return res.status(statusCode).json(health);
  }

  /**
   * Readiness Check
   * GET /health/ready
   * 
   * Checks if application is ready to accept traffic.
   * Verifies:
   * - Database connectivity
   * - Required env vars present
   * - All modules initialized
   * 
   * Returns 200 if ready, 503 if not ready
   */
  @Get('ready')
  async ready(@Res() res: Response) {
    const readiness = await this.healthService.getReadinessStatus();
    
    const statusCode = readiness.ready 
      ? HttpStatus.OK 
      : HttpStatus.SERVICE_UNAVAILABLE;
    
    return res.status(statusCode).json(readiness);
  }
}
