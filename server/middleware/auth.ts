import type { RequestHandler } from "express";
import { storage } from "../storage";
import { AuthorizationService } from "../services/authorization.service";
import { logger } from "../logger";
import * as client from "openid-client";
import memoize from "memoizee";

// Initialize AuthorizationService
const authzService = new AuthorizationService(storage);

// Mutex for concurrent refresh prevention (per userId)
const refreshMutex = new Map<string, Promise<void>>();

// OIDC configuration (same as in replitAuth.ts)
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// Helper to update user session (same as in replitAuth.ts)
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
): void {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp as number | undefined;
}

/**
 * Middleware to ensure the user is authenticated
 * Includes OIDC token refresh logic
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if this is local auth, email auth, or test auth (doesn't need token refresh)
  if (user.access_token === 'local-auth' || user.access_token === 'email-auth' || user.access_token === 'test-auth') {
    // Extend session for local/email/test auth users on each request
    user.expires_at = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    return next();
  }

  // OIDC auth with token refresh
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Token expired - attempt refresh
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const userId = user.claims?.sub;
  
  // Check if refresh is already in progress for this user
  let existingRefresh = refreshMutex.get(userId);
  if (existingRefresh) {
    // Wait for the existing refresh to complete
    try {
      await existingRefresh;
      // Re-sync req.user with the refreshed session data
      // The session was updated by the refreshing request, but this request's
      // req.user object is stale. Copy the updated tokens from req.session.
      if (req.session && (req.session as any).passport?.user) {
        const sessionUser = (req.session as any).passport.user;
        req.user = sessionUser;
      }
      return next();
    } catch (error) {
      // Refresh failed
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
  }

  // Start new refresh
  const refreshPromise = (async () => {
    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      
      // Persist the refreshed tokens to session store
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } finally {
      // Clean up mutex
      refreshMutex.delete(userId);
    }
  })();
  
  refreshMutex.set(userId, refreshPromise);
  
  try {
    await refreshPromise;
    return next();
  } catch (error) {
    logger.error('Token refresh failed', error, { userId });
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

/**
 * Middleware to require specific user type(s)
 * Usage: requireUserType('seller') or requireUserType('seller', 'buyer')
 */
export function requireUserType(...allowedTypes: ('seller' | 'buyer' | 'collaborator')[]): RequestHandler {
  return async (req, res, next) => {
    const user = req.user as any;
    
    if (!req.isAuthenticated() || !user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const dbUser = await storage.getUser(userId);

    if (!dbUser) {
      return res.status(401).json({ message: "Unauthorized - user not found" });
    }

    // Check if user's userType matches any of the allowed types
    if (!allowedTypes.includes(dbUser.userType as any)) {
      logger.warn('User type mismatch', {
        userId: dbUser.id,
        userType: dbUser.userType || 'none',
        allowedTypes: allowedTypes.join(','),
        path: req.path
      });
      return res.status(403).json({ 
        message: `Forbidden - ${allowedTypes.join(' or ')} access required` 
      });
    }

    return next();
  };
}

/**
 * Middleware to require a specific capability for a resource
 * Usage: requireCapability('manage_products', (req) => req.params.sellerId)
 * 
 * @param capability - The capability to check
 * @param getResourceId - Optional function to extract resourceId from request
 */
export function requireCapability(
  capability: string,
  getResourceId?: (req: any) => string | undefined
): RequestHandler {
  return async (req, res, next) => {
    const user = req.user as any;
    
    if (!req.isAuthenticated() || !user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const resourceId = getResourceId ? getResourceId(req) : undefined;

    try {
      const hasPermission = await authzService.hasCapability(
        userId,
        capability as any,
        resourceId
      );

      if (!hasPermission) {
        logger.warn('Capability check failed', {
          userId,
          capability,
          resourceId,
          path: req.path
        });
        return res.status(403).json({ 
          message: `Forbidden - ${capability} permission required` 
        });
      }

      return next();
    } catch (error) {
      logger.error('Error checking capability', error, {
        userId,
        capability,
        resourceId,
        path: req.path
      });
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

/**
 * Middleware to check if user can access a specific store
 * Usage: requireStoreAccess((req) => req.params.sellerId)
 */
export function requireStoreAccess(getSellerId: (req: any) => string): RequestHandler {
  return async (req, res, next) => {
    const user = req.user as any;
    
    if (!req.isAuthenticated() || !user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const sellerId = getSellerId(req);

    if (!sellerId) {
      return res.status(400).json({ message: "Bad request - seller ID required" });
    }

    try {
      const canAccess = await authzService.canAccessStore(userId, sellerId);

      if (!canAccess) {
        logger.warn('Store access denied', {
          userId,
          sellerId,
          path: req.path
        });
        return res.status(403).json({ 
          message: "Forbidden - you do not have access to this store" 
        });
      }

      return next();
    } catch (error) {
      logger.error('Error checking store access', error, {
        userId,
        sellerId,
        path: req.path
      });
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

/**
 * Middleware to check if user can manage a specific product
 * Usage: requireProductAccess((req) => req.params.productId)
 */
export function requireProductAccess(getProductId: (req: any) => string): RequestHandler {
  return async (req, res, next) => {
    const user = req.user as any;
    
    if (!req.isAuthenticated() || !user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const productId = getProductId(req);

    if (!productId) {
      return res.status(400).json({ message: "Bad request - product ID required" });
    }

    try {
      const canManage = await authzService.canManageProduct(userId, productId);

      if (!canManage) {
        logger.warn('Product access denied', {
          userId,
          productId,
          path: req.path
        });
        return res.status(403).json({ 
          message: "Forbidden - you do not have access to this product" 
        });
      }

      return next();
    } catch (error) {
      logger.error('Error checking product access', error, {
        userId,
        productId,
        path: req.path
      });
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

/**
 * Middleware to check if user can view a specific order
 * Usage: requireOrderAccess((req) => req.params.orderId)
 */
export function requireOrderAccess(getOrderId: (req: any) => string): RequestHandler {
  return async (req, res, next) => {
    const user = req.user as any;
    
    if (!req.isAuthenticated() || !user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const orderId = getOrderId(req);

    if (!orderId) {
      return res.status(400).json({ message: "Bad request - order ID required" });
    }

    try {
      const canView = await authzService.canViewOrder(userId, orderId);

      if (!canView) {
        logger.warn('Order access denied', {
          userId,
          orderId,
          path: req.path
        });
        return res.status(403).json({ 
          message: "Forbidden - you do not have access to this order" 
        });
      }

      return next();
    } catch (error) {
      logger.error('Error checking order access', error, {
        userId,
        orderId,
        path: req.path
      });
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

/**
 * Middleware to check if user can purchase (blocks sellers/collaborators)
 * Usage: requireCanPurchase('retail') or requireCanPurchase('wholesale', (req) => req.params.sellerId)
 */
export function requireCanPurchase(
  productType: 'retail' | 'wholesale',
  getSellerId?: (req: any) => string | undefined
): RequestHandler {
  return async (req, res, next) => {
    const user = req.user as any;
    
    if (!req.isAuthenticated() || !user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const sellerId = getSellerId ? getSellerId(req) : undefined;

    try {
      const canPurchase = await authzService.canPurchase(userId, productType, sellerId);

      if (!canPurchase) {
        const dbUser = await storage.getUser(userId);
        logger.warn('Purchase blocked', {
          userId,
          userType: dbUser?.userType || 'none',
          productType,
          sellerId: sellerId || 'none',
          path: req.path
        });
        
        if (dbUser?.userType === 'seller' || dbUser?.userType === 'collaborator') {
          return res.status(403).json({ 
            message: "Sellers and collaborators cannot make purchases" 
          });
        } else if (productType === 'wholesale') {
          return res.status(403).json({ 
            message: "You do not have wholesale access to this seller" 
          });
        }
        
        return res.status(403).json({ message: "Forbidden - cannot purchase" });
      }

      return next();
    } catch (error) {
      logger.error('Error checking purchase permission', error, {
        userId,
        productType,
        sellerId,
        path: req.path
      });
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}
