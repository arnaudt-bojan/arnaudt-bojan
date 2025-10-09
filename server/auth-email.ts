import { Router } from 'express';
import { storage } from './storage';
import { createNotificationService } from './notifications';
import crypto from 'crypto';
import type { Request, Response } from 'express';

const router = Router();
const notificationService = createNotificationService(storage);

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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate 6-digit code
    const code = generateCode();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save auth token to database
    await storage.createAuthToken({
      email,
      token,
      code,
      expiresAt,
      used: 0,
    });

    // Send email with code
    await notificationService.sendAuthCode(email, code);

    console.log(`[Auth] Sent code to ${email}`);

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
    const { email, code } = req.body;

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

    // Get or create user
    let user = await storage.getUserByEmail(email);
    
    if (!user) {
      // Create new user account
      user = await storage.upsertUser({
        email,
        role: 'buyer', // Default role
      });
      
      console.log(`[Auth] Created new user: ${email}`);
    }

    // Create session
    req.session.passport = {
      user: {
        id: user.id,
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

    res.json({
      success: true,
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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save auth token to database
    await storage.createAuthToken({
      email,
      token,
      expiresAt,
      used: 0,
    });

    // Generate magic link - points to API endpoint
    const baseUrl = process.env.VITE_BASE_URL || 'http://localhost:5000';
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
    const { token } = req.query;

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

    // Get or create user
    let user = await storage.getUserByEmail(authToken.email);
    
    if (!user) {
      // Create new user account
      user = await storage.upsertUser({
        email: authToken.email,
        role: 'buyer', // Default role
      });
      
      console.log(`[Auth] Created new user: ${authToken.email}`);
    }

    // Create session
    req.session.passport = {
      user: {
        id: user.id,
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

    console.log(`[Auth] User authenticated via magic link: ${authToken.email}`);

    // Redirect to dashboard based on role
    const redirectUrl = user.role === 'seller' || user.role === 'admin' || user.role === 'owner'
      ? '/seller-dashboard'
      : '/';
    
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
