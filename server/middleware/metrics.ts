import { Request, Response, NextFunction } from 'express';
import { apiLatency, apiRequests, apiErrors } from '../metrics';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();

    apiLatency.observe({ method, route, status_code: statusCode }, duration);
    apiRequests.inc({ method, route, status_code: statusCode });

    if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
      apiErrors.inc({ method, route, error_type: statusCode });
    }
  });

  next();
}
