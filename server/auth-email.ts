import { Router } from 'express';
import { storage } from './storage';
import { createNotificationService } from './notifications';
import { PDFService } from './pdf-service';
import crypto from 'crypto';
import type { Request, Response } from 'express';

const router = Router();
const pdfService = new PDFService(process.env.STRIPE_SECRET_KEY);
const notificationService = createNotificationService(storage, pdfService);

// Generate 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate secure token for magic link
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * POST /api/auth/email/send-code
 * Send 6-digit authentication code to email
 */
router.post('/send-code', async (req: Request, res: Response) => {
  try {
    const { email, sellerContext } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate 6-digit code
    const code = generateCode();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save auth token to database with seller context
    await storage.createAuthToken({
      email,
      token,
      code,
      expiresAt,
      used: 0,
      sellerContext: sellerContext || null, // Store seller context with token
    });

    // Send email with code and magic link for auto-login
    await notificationService.sendAuthCode(email, code, token);

    // In development, log the code for testing
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth] Verification code for ${email}: ${code}`);
    } else {
      console.log(`[Auth] Sent code and auto-login link to ${email}`);
    }

    res.json({ 
      success: true, 
      message: 'Authentication code sent to your email',
      email 
    });
  } catch (error: any) {
    console.error('[Auth] Send code error:', error);
    res.status(500).json({ error: 'Failed to send authentication code' });
  }
});

/**
 * POST /api/auth/email/verify-code
 * Verify 6-digit code and create session
 */
router.post('/verify-code', async (req: any, res: Response) => {
  try {
    const { email, code, sellerContext } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    // Find auth token
    const authToken = await storage.getAuthTokenByCode(email, code);

    if (!authToken) {
      return res.status(401).json({ error: 'Invalid code' });
    }

    // Check if already used
    if (authToken.used === 1) {
      return res.status(401).json({ error: 'Code already used' });
    }

    // Check if expired
    if (new Date() > new Date(authToken.expiresAt)) {
      return res.status(401).json({ error: 'Code expired' });
    }

    // Mark as used
    await storage.markAuthTokenAsUsed(authToken.id);

    // Determine seller context:
    // 1. Prefer sellerContext from request body (supports cross-device login)
    // 2. Fall back to sellerContext from token (original device context)
    const finalSellerContext = sellerContext || authToken.sellerContext;
    
    // If sellerContext exists, this is a buyer signup from a seller's storefront
    // If no sellerContext, this is a seller signup from main domain
    const isMainDomain = !finalSellerContext;
    const sellerUsername = finalSellerContext;
    
    console.log(`[Auth] Domain context - isMainDomain: ${isMainDomain}, sellerContext from body: ${sellerContext}, from token: ${authToken.sellerContext}, final: ${finalSellerContext}`);
    
    // Get or create user (email lookup is case-insensitive in storage)
    let user = await storage.getUserByEmail(email);
    
    if (!user) {
      // Create new user account
      // Main domain = seller (admin role), subdomain = buyer
      const role = isMainDomain ? 'admin' : 'buyer';
      
      user = await storage.upsertUser({
        email: email.toLowerCase().trim(), // Normalize email
        role,
      });
      
      console.log(`[Auth] Created new ${role} user: ${email} (isMainDomain: ${isMainDomain}, sellerContext: ${sellerUsername})`);
      
      // Send welcome email to new sellers
      if (role === 'admin') {
        await notificationService.sendSellerWelcome(user);
      }
    } else {
      console.log(`[Auth] Existing ${user.role} user logging in: ${email}`);
    }

    // Create session compatible with isAuthenticated middleware
    req.session.passport = {
      user: {
        id: user.id,
        access_token: 'email-auth', // Marker for email-based auth
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
        claims: {
          sub: user.id,
          email: user.email,
          aud: 'authenticated',
        },
      },
    };

    await new Promise<void>((resolve, reject) => {
      req.session.save((err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(`[Auth] User authenticated: ${email}`);

    // Determine redirect URL based on role and domain
    let redirectUrl: string;
    
    if (user.role === 'admin' || user.role === 'seller' || user.role === 'owner') {
      // Sellers always go to their dashboard
      redirectUrl = '/seller-dashboard';
    } else if (user.role === 'buyer') {
      // Buyers go to buyer dashboard
      redirectUrl = '/buyer-dashboard';
    } else {
      // Fallback
      redirectUrl = '/';
    }

    res.json({
      success: true,
      redirectUrl,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Verify code error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

/**
 * POST /api/auth/email/send-magic-link
 * Send magic link to email
 */
router.post('/send-magic-link', async (req: Request, res: Response) => {
  try {
    const { email, sellerContext } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save auth token to database with seller context
    await storage.createAuthToken({
      email,
      token,
      expiresAt,
      used: 0,
      sellerContext: sellerContext || null, // Store seller context with token
    });

    // Generate magic link - points to API endpoint
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    const magicLink = `${baseUrl}/api/auth/email/verify-magic-link?token=${token}`;

    // Send email with magic link
    await notificationService.sendMagicLink(email, magicLink);

    console.log(`[Auth] Sent magic link to ${email}`);

    res.json({ 
      success: true, 
      message: 'Magic link sent to your email',
      email 
    });
  } catch (error: any) {
    console.error('[Auth] Send magic link error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

/**
 * GET /api/auth/email/verify-magic-link
 * Verify magic link token and create session
 */
router.get('/verify-magic-link', async (req: any, res: Response) => {
  try {
    const { token, redirect } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find auth token
    const authToken = await storage.getAuthTokenByToken(token);

    if (!authToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if already used
    if (authToken.used === 1) {
      return res.status(401).json({ error: 'Token already used' });
    }

    // Check if expired
    if (new Date() > new Date(authToken.expiresAt)) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Mark as used
    await storage.markAuthTokenAsUsed(authToken.id);

    // Get seller context from the auth token (stored during send-magic-link)
    const sellerContextFromToken = authToken.sellerContext;
    
    // If sellerContext exists, this is a buyer login from a seller's storefront
    const isMainDomain = !sellerContextFromToken;
    
    console.log(`[Auth] Magic link - isMainDomain: ${isMainDomain}, sellerContext: ${sellerContextFromToken}`);
    
    // Get or create user (normalized email)
    const normalizedEmail = authToken.email.toLowerCase().trim();
    let user = await storage.getUserByEmail(normalizedEmail);
    
    if (!user) {
      // Create new user account based on domain
      const role = isMainDomain ? 'admin' : 'buyer';
      
      user = await storage.upsertUser({
        email: normalizedEmail,
        role,
      });
      
      console.log(`[Auth] Created new ${role} user via magic link: ${normalizedEmail}`);
      
      // Send welcome email to new sellers
      if (role === 'admin') {
        await notificationService.sendSellerWelcome(user);
      }
    } else {
      console.log(`[Auth] Existing ${user.role} user logging in via magic link: ${normalizedEmail}`);
    }

    // Create session compatible with isAuthenticated middleware
    req.session.passport = {
      user: {
        id: user.id,
        access_token: 'email-auth', // Marker for email-based auth
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
        claims: {
          sub: user.id,
          email: user.email,
          aud: 'authenticated',
        },
      },
    };

    await new Promise<void>((resolve, reject) => {
      req.session.save((err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(`[Auth] User authenticated via magic link: ${normalizedEmail}`);

    // Determine redirect URL
    let redirectUrl: string;
    
    // Use provided redirect parameter if available
    if (redirect && typeof redirect === 'string') {
      // Sanitize redirect URL - must start with /
      redirectUrl = redirect.startsWith('/') ? redirect : `/${redirect}`;
      console.log(`[Auth] Using provided redirect: ${redirectUrl}`);
    } else {
      // Default redirect based on role
      if (user.role === 'admin' || user.role === 'seller' || user.role === 'owner') {
        // Sellers always go to their dashboard
        redirectUrl = '/seller-dashboard';
      } else if (user.role === 'buyer') {
        // Buyers go to buyer dashboard
        redirectUrl = '/buyer-dashboard';
      } else {
        // Fallback
        redirectUrl = '/';
      }
    }
    
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error('[Auth] Verify magic link error:', error);
    // Redirect to login with error
    res.redirect('/login?error=invalid_link');
  }
});

/**
 * POST /api/auth/logout
 * Logout and destroy session
 */
router.post('/logout', async (req: any, res: Response) => {
  try {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router;
