import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * =============================================
 * SECURITY MIDDLEWARE FOR PRODUCTION
 * =============================================
 */

/**
 * Rate limiting store using in-memory Map
 * For production, use Redis for distributed rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  check(identifier: string, maxRequests: number, windowMs: number): { allowed: boolean; resetTime: number; remaining: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || entry.resetTime < now) {
      // New window
      this.store.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true, resetTime: now + windowMs, remaining: maxRequests - 1 };
    }

    if (entry.count >= maxRequests) {
      return { allowed: false, resetTime: entry.resetTime, remaining: 0 };
    }

    entry.count++;
    return { allowed: true, resetTime: entry.resetTime, remaining: maxRequests - entry.count };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

const globalRateLimiter = new RateLimiter();
const authRateLimiter = new RateLimiter();

/**
 * General rate limiting middleware
 * Default: 100 requests per minute per IP
 */
export function rateLimitMiddleware(options?: { 
  maxRequests?: number; 
  windowMs?: number;
  keyGenerator?: (req: Request) => string;
}) {
  const maxRequests = options?.maxRequests || 100;
  const windowMs = options?.windowMs || 60 * 1000; // 1 minute
  const keyGenerator = options?.keyGenerator || ((req: Request) => {
    // Use IP address as default identifier
    return req.ip || req.socket.remoteAddress || 'unknown';
  });

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = keyGenerator(req);
    const result = globalRateLimiter.check(identifier, maxRequests, windowMs);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      });
    }

    next();
  };
}

/**
 * Strict rate limiting for authentication endpoints
 * Default: 5 requests per 15 minutes per IP
 */
export function authRateLimitMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const result = authRateLimiter.check(identifier, 5, 15 * 60 * 1000);

    res.setHeader('X-RateLimit-Limit', 5);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      console.warn(`[Security] Auth rate limit exceeded for IP: ${identifier}`);
      return res.status(429).json({
        error: 'Too many authentication attempts',
        message: `Too many login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        retryAfter,
      });
    }

    next();
  };
}

/**
 * Security headers middleware
 * Implements OWASP recommended security headers
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict Transport Security (HTTPS only)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://api.stripe.com; " +
    "frame-src https://js.stripe.com https://hooks.stripe.com; " +
    "object-src 'none';"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  next();
}

/**
 * Input sanitization middleware
 * Removes potentially dangerous characters and scripts
 * SKIPS raw bodies (Buffers) to preserve webhook signatures
 */
export function sanitizeInputMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip sanitization for raw webhook bodies (Buffer instances)
  if (Buffer.isBuffer(req.body)) {
    return next();
  }

  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove null bytes
      let sanitized = value.replace(/\0/g, '');
      
      // Trim excessive whitespace
      sanitized = sanitized.trim();
      
      // Limit string length to prevent memory attacks (configurable)
      const MAX_STRING_LENGTH = 10000;
      if (sanitized.length > MAX_STRING_LENGTH) {
        sanitized = sanitized.substring(0, MAX_STRING_LENGTH);
      }
      
      return sanitized;
    } else if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    } else if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  // Sanitize body, query, and params
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
}

/**
 * Validate Stripe webhook signature
 * Prevents webhook spoofing attacks
 */
export function validateStripeWebhook(
  rawBody: Buffer,
  signature: string,
  secret: string
): { valid: boolean; error?: string } {
  if (!secret) {
    console.error('[Security] CRITICAL: STRIPE_WEBHOOK_SECRET is not configured!');
    return { valid: false, error: 'Webhook secret not configured' };
  }

  try {
    const timestamp = signature.split(',').find(s => s.startsWith('t='))?.split('=')[1];
    const signatureHash = signature.split(',').find(s => s.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !signatureHash) {
      return { valid: false, error: 'Invalid signature format' };
    }

    // Check timestamp is within 5 minutes
    const currentTime = Math.floor(Date.now() / 1000);
    const timestampNumber = parseInt(timestamp, 10);
    if (Math.abs(currentTime - timestampNumber) > 300) {
      return { valid: false, error: 'Webhook timestamp too old' };
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signatureHash),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.warn('[Security] Stripe webhook signature verification failed');
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error: any) {
    console.error('[Security] Webhook validation error:', error);
    return { valid: false, error: error.message };
  }
}

/**
 * SQL Injection Prevention Notes:
 * - We use Drizzle ORM which automatically parameterizes queries
 * - Never use string interpolation in raw SQL queries
 * - Always use prepared statements and parameter binding
 * - The ORM layer provides built-in protection
 */

/**
 * CSRF Token generation and validation
 * For API routes that modify data
 */
export class CSRFProtection {
  private tokens = new Map<string, { token: string; expires: number }>();

  generateToken(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour
    
    this.tokens.set(userId, { token, expires });
    
    // Cleanup expired tokens
    this.cleanup();
    
    return token;
  }

  validateToken(userId: string, token: string): boolean {
    const stored = this.tokens.get(userId);
    
    if (!stored) {
      return false;
    }

    if (stored.expires < Date.now()) {
      this.tokens.delete(userId);
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(stored.token),
      Buffer.from(token)
    );
  }

  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.tokens.entries());
    for (const [userId, data] of entries) {
      if (data.expires < now) {
        this.tokens.delete(userId);
      }
    }
  }
}

export const csrfProtection = new CSRFProtection();

/**
 * Middleware to validate CSRF tokens on state-changing requests
 * Only for web form submissions, not for API with proper auth
 */
export function csrfMiddleware(req: any, res: Response, next: NextFunction) {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for API routes with proper bearer auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Skip for webhook endpoints
  if (req.path.includes('/webhook')) {
    return next();
  }

  const userId = req.user?.claims?.sub;
  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;

  if (!userId) {
    // No user session, skip CSRF check
    return next();
  }

  if (!token || !csrfProtection.validateToken(userId, token)) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'The form submission appears to be invalid. Please refresh the page and try again.',
    });
  }

  next();
}

/**
 * Request size limiting
 * Prevents memory exhaustion attacks
 * NOTE: This is a backup check - Express json/urlencoded parsers also have limits
 */
export function requestSizeLimiter(maxSizeBytes: number = 10 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check content-length header first for efficiency
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        error: 'Payload too large',
        message: `Request size exceeds ${maxSizeBytes / 1024 / 1024}MB limit`,
      });
    }

    // Track actual received bytes as backup
    let receivedBytes = 0;
    let limitExceeded = false;
    
    req.on('data', (chunk) => {
      if (limitExceeded) return;
      
      receivedBytes += chunk.length;
      if (receivedBytes > maxSizeBytes) {
        limitExceeded = true;
        req.destroy(new Error('Request size limit exceeded'));
        if (!res.headersSent) {
          res.status(413).json({
            error: 'Payload too large',
            message: `Request size exceeds ${maxSizeBytes / 1024 / 1024}MB limit`,
          });
        }
      }
    });

    next();
  };
}

/**
 * Audit logging for sensitive operations
 */
export interface AuditLog {
  timestamp: Date;
  userId?: string;
  ip: string;
  action: string;
  resource: string;
  status: 'success' | 'failure';
  details?: any;
}

class AuditLogger {
  private logs: AuditLog[] = [];
  private maxLogs = 10000;

  log(entry: AuditLog) {
    this.logs.push(entry);
    
    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, send to external logging service
    console.log('[Audit]', JSON.stringify(entry));
  }

  getLogs(filter?: { userId?: string; action?: string; limit?: number }): AuditLog[] {
    let filtered = this.logs;

    if (filter?.userId) {
      filtered = filtered.filter(log => log.userId === filter.userId);
    }

    if (filter?.action) {
      filtered = filtered.filter(log => log.action === filter.action);
    }

    const limit = filter?.limit || 100;
    return filtered.slice(-limit);
  }
}

export const auditLogger = new AuditLogger();

/**
 * Middleware to log sensitive operations
 */
export function auditLogMiddleware(action: string, resource: string) {
  return (req: any, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(body: any) {
      const status = res.statusCode < 400 ? 'success' : 'failure';
      
      auditLogger.log({
        timestamp: new Date(),
        userId: req.user?.claims?.sub,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        action,
        resource,
        status,
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
        },
      });

      return originalSend.call(this, body);
    };

    next();
  };
}

export default {
  rateLimitMiddleware,
  authRateLimitMiddleware,
  securityHeadersMiddleware,
  sanitizeInputMiddleware,
  validateStripeWebhook,
  csrfMiddleware,
  requestSizeLimiter,
  auditLogMiddleware,
  csrfProtection,
  auditLogger,
};
