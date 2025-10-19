import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logger } from '../logger';
import type { DomainConnection } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      customDomain?: DomainConnection;
      sellerId?: string;
      isCustomDomain?: boolean;
    }
  }
}

export async function domainMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const host = req.headers.host?.split(':')[0];

  if (!host) {
    return next();
  }

  if (!host.includes('upfirst.io') && !host.includes('replit.dev')) {
    try {
      const domain = await storage.getDomainByName(host);

      if (domain && domain.status === 'active') {
        logger.info('[Domain Middleware] Custom domain matched', {
          domain: host,
          sellerId: domain.sellerId,
        });

        req.customDomain = domain;
        req.sellerId = domain.sellerId;
        req.isCustomDomain = true;
      } else if (domain) {
        logger.warn('[Domain Middleware] Custom domain not active', {
          domain: host,
          status: domain.status,
        });
      }
    } catch (error) {
      logger.error('[Domain Middleware] Error checking custom domain', {
        domain: host,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  next();
}
