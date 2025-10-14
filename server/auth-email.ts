import { Router } from 'express';
import { storage } from './storage';
import { createNotificationService } from './notifications';
import type { Request, Response } from 'express';
import { logger } from './logger';
import { generateAuthCode, generateSecureToken, normalizeEmail } from './utils';
import { CartService } from './services/cart.service';

const router = Router();

// Initialize notification service
let notificationService: ReturnType<typeof createNotificationService>;

try {
  notificationService = createNotificationService(storage);
  logger.info('Auth-Email services initialized successfully');
} catch (error) {
  logger.critical('Failed to initialize Auth-Email services', error);
  // Create stub service that will log errors
  notificationService = createNotificationService(storage);
}

/**
 * POST /api/auth/email/send-code
 * Send 6-digit authentication code to email
 */
router.post('/send-code', async (req: Request, res: Response) => {
  const { email, sellerContext, returnUrl, loginContext } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Extract seller context from returnUrl if not provided directly
    // In dev: /s/username/... paths indicate seller storefront
    let finalSellerContext = sellerContext;
    if (!finalSellerContext && returnUrl) {
      const storefrontMatch = returnUrl.match(/^\/s\/([^\/]+)/);
      if (storefrontMatch && storefrontMatch[1]) {
        finalSellerContext = storefrontMatch[1];
        logger.auth('Extracted seller context from returnUrl', {
          returnUrl,
          sellerContext: finalSellerContext
        });
      }
    }

    // Generate 6-digit code and secure token
    const code = generateAuthCode();
    const token = generateSecureToken();
    const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for code
    const magicLinkExpiresAt = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000); // 6 months for magic link

    // Save TWO auth tokens: one for code (single-use), one for magic link (reusable)
    // 1. Login code token (single-use, 15 min)
    await storage.createAuthToken({
      email,
      token: `${token}-code`, // Unique token for code
      code,
      tokenType: 'login_code',
      expiresAt: codeExpiresAt,
      used: 0,
      sellerContext: finalSellerContext || null,
      returnUrl: returnUrl || null,
      loginContext: loginContext || null,
    });

    // 2. Magic link token (reusable, 6 months)
    await storage.createAuthToken({
      email,
      token, // Original token for magic link
      code: null, // No code for magic link
      tokenType: 'magic_link',
      expiresAt: magicLinkExpiresAt,
      used: 0,
      sellerContext: finalSellerContext || null,
      returnUrl: returnUrl || null,
      loginContext: loginContext || null,
    });

    // Try to send email with code and magic link for auto-login
    let emailSent = false;
    try {
      emailSent = await notificationService.sendAuthCode(email, code, token);
    } catch (emailError) {
      logger.error('Email sending failed', emailError, { module: 'auth-email', email });
      emailSent = false;
    }

    // Only log verification code when email FAILS (security: don't expose codes in logs when emails work)
    if (!emailSent) {
      logger.warn('Email delivery failed - fallback code available', {
        module: 'auth-email',
        email,
        code,
        validFor: '15 minutes',
        hint: 'Check Resend domain verification'
      });
    } else {
      logger.auth('Verification code sent successfully', { email });
    }

    // Return accurate status based on email delivery
    res.json({ 
      success: emailSent, // TRUE only if email was actually sent
      message: emailSent 
        ? 'Authentication code sent to your email. Check your inbox and spam folder.'
        : '❌ Email delivery failed. This usually means the sending domain is not verified in Resend. Check server logs for the verification code.',
      email,
      emailSent,
      // In dev, include code for convenience. In production, include if email failed
      ...(((process.env.NODE_ENV === 'development') || !emailSent) && { devCode: code })
    });
  } catch (error) {
    logger.critical('Critical error in send-code endpoint', error, { module: 'auth-email', email });
    // Return failure status but include fallback code if available
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process authentication request',
      message: 'An error occurred while generating your authentication code. Please try again or contact support.',
      email
    });
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

    // Test seller bypass: Allow fixed code "111111" for test accounts
    const normalizedEmailForTest = email.toLowerCase().trim();
    const normalizedCode = String(code).trim();
    const isTestSeller = normalizedEmailForTest === 'mirtorabi+testseller@gmail.com' || normalizedEmailForTest === 'testseller@test.com';
    let authToken;
    
    logger.auth('Auth verification attempt', { 
      email: normalizedEmailForTest, 
      code: normalizedCode,
      isTestSeller 
    });
    
    if (isTestSeller && normalizedCode === '111111') {
      // For test seller, skip token validation (no need for exact code match)
      authToken = null; // Will trigger user creation/lookup below
      logger.auth('✅ Test seller authentication with fixed code 111111', { email: normalizedEmailForTest });
    } else {
      // Normal flow: Find auth token by code
      authToken = await storage.getAuthTokenByCode(email, code);
      
      if (!authToken) {
        return res.status(401).json({ error: 'Invalid code' });
      }
      
      // Check if already used (magic_link tokens are reusable, everything else is single-use)
      // Treat null/unknown tokenType as single-use for security (legacy tokens)
      if (authToken.tokenType !== 'magic_link' && authToken.used === 1) {
        return res.status(401).json({ error: 'Code already used' });
      }

      // Check if expired
      if (new Date() > new Date(authToken.expiresAt)) {
        return res.status(401).json({ error: 'Code expired' });
      }

      // Mark as used (only magic_link tokens are reusable)
      if (authToken.tokenType !== 'magic_link') {
        await storage.markAuthTokenAsUsed(authToken.id);
      }
    }

    // Determine seller context:
    // 1. Prefer sellerContext from request body (supports cross-device login)
    // 2. Fall back to sellerContext from token (original device context)
    const finalSellerContext = sellerContext || authToken?.sellerContext;
    
    // If sellerContext exists, this is a buyer signup from a seller's storefront
    // If no sellerContext, this is a seller signup from main domain
    const isMainDomain = !finalSellerContext;
    const sellerUsername = finalSellerContext;
    
    logger.auth('Domain context determined', {
      isMainDomain,
      sellerContextFromBody: sellerContext || undefined,
      sellerContextFromToken: authToken?.sellerContext || undefined,
      finalSellerContext: finalSellerContext || undefined,
      isTestSeller
    });
    
    // Get or create user (email lookup is case-insensitive in storage)
    const normalizedEmail = normalizeEmail(email);
    let user = await storage.getUserByEmail(normalizedEmail);
    
    if (!user) {
      // Create new user account
      // Main domain = seller, subdomain = buyer
      const userType = isMainDomain ? 'seller' : 'buyer';
      const role = isMainDomain ? 'admin' : 'buyer'; // Legacy field for backward compatibility
      
      user = await storage.upsertUser({
        email: normalizedEmail,
        role,
        userType,
      });
      
      logger.auth('Created new user', {
        role,
        userType,
        email: normalizedEmail,
        isMainDomain,
        sellerContext: sellerUsername,
        userId: user.id
      });
      
      // Send welcome email to new sellers (only once)
      if (role === 'admin' && !user.welcomeEmailSent) {
        try {
          await notificationService.sendSellerWelcome(user);
          await storage.updateWelcomeEmailSent(user.id);
          logger.auth('Welcome email sent to new seller', { userId: user.id, email: normalizedEmail });
        } catch (error) {
          logger.error('Failed to send welcome email', error, { userId: user.id, email: normalizedEmail });
        }
      }
    } else {
      logger.auth('Existing user logging in', {
        role: user.role,
        email: normalizedEmail,
        userId: user.id
      });
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
      req.session.save((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.auth('User authenticated successfully', { email: normalizedEmail, userId: user.id });

    // Migrate guest cart to authenticated user
    try {
      const cartService = new CartService(storage);
      await cartService.migrateGuestCart(req.sessionID, user.id);
      logger.info('[Auth] Cart migration completed for email verify-code', { 
        userId: user.id
      });
    } catch (error) {
      logger.error('[Auth] Cart migration failed for email verify-code', error, { 
        userId: user.id
      });
    }

    // Determine redirect URL: preserved returnUrl takes priority over role-based defaults
    let redirectUrl: string;
    
    // Sanitize returnUrl to prevent open redirect - only allow same-origin paths
    let sanitizedReturnUrl: string | null = null;
    if (authToken?.returnUrl) {
      try {
        // Only allow paths starting with / and not // (protocol-relative URLs)
        if (authToken.returnUrl.startsWith("/") && !authToken.returnUrl.startsWith("//")) {
          sanitizedReturnUrl = authToken.returnUrl;
        } else {
          logger.warn('Invalid returnUrl rejected in verify-code', {
            module: 'auth-email',
            returnUrl: authToken.returnUrl,
            userId: user.id
          });
        }
      } catch (e) {
        logger.warn('returnUrl validation failed in verify-code', {
          module: 'auth-email',
          returnUrl: authToken.returnUrl
        });
      }
    }
    
    if (sanitizedReturnUrl) {
      // Use sanitized preserved returnUrl from auth token
      redirectUrl = sanitizedReturnUrl;
      logger.auth('Using preserved returnUrl from auth token', {
        returnUrl: sanitizedReturnUrl,
        loginContext: authToken?.loginContext || undefined,
        userId: user.id
      });
    } else if (user.role === 'admin' || user.role === 'seller' || user.role === 'owner') {
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
  } catch (error) {
    logger.error('Verify code error', error, { module: 'auth-email' });
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

/**
 * POST /api/auth/email/send-magic-link
 * Send magic link to email
 */
router.post('/send-magic-link', async (req: Request, res: Response) => {
  const { email, sellerContext, returnUrl, loginContext } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate secure token
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000); // 6 months for reusable magic link

    // Save auth token to database with seller context
    await storage.createAuthToken({
      email,
      token,
      tokenType: 'magic_link', // Reusable magic link
      expiresAt,
      used: 0,
      sellerContext: sellerContext || null, // Store seller context with token
      returnUrl: returnUrl || null,
      loginContext: loginContext || null,
    });

    // Generate magic link - points to frontend page (SPA-style flow)
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    const magicLink = `${baseUrl}/auth/magic?token=${token}`;

    // Try to send email with magic link
    let emailSent = false;
    try {
      emailSent = await notificationService.sendMagicLink(email, magicLink);
    } catch (emailError) {
      logger.error('Magic link email sending failed', emailError, { module: 'auth-email', email });
      emailSent = false;
    }

    // Only log magic link when email FAILS (security: don't expose auth links in logs when emails work)
    if (!emailSent) {
      logger.warn('Magic link email delivery failed - fallback link available', {
        module: 'auth-email',
        email,
        magicLink,
        validFor: '6 months',
        hint: 'Check Resend domain verification'
      });
    } else {
      logger.auth('Magic link sent successfully', { email });
    }

    // Return accurate status based on email delivery
    res.json({ 
      success: emailSent, // TRUE only if email was actually sent
      message: emailSent 
        ? 'Magic link sent to your email. Check your inbox and spam folder.'
        : '❌ Email delivery failed. This usually means the sending domain is not verified in Resend. Please use the verification code method instead.',
      email,
      emailSent,
      // If email failed, provide the magic link in response for manual access
      ...(!emailSent && { magicLink })
    });
  } catch (error) {
    logger.critical('Critical error in send-magic-link endpoint', error, { module: 'auth-email', email });
    // Return failure status with clear error message
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process magic link request',
      message: 'An error occurred while generating your magic link. Please try the verification code method instead.',
      email,
      emailSent: false
    });
  }
});

/**
 * GET /api/auth/email/verify-magic-link
 * Verify magic link token and create session (legacy redirect-based flow)
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

    // Check if already used (magic_link tokens are reusable, everything else is single-use)
    // Treat null/unknown tokenType as single-use for security (legacy tokens)
    if (authToken.tokenType !== 'magic_link' && authToken.used === 1) {
      return res.status(401).json({ error: 'Token already used' });
    }

    // Check if expired
    if (new Date() > new Date(authToken.expiresAt)) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Mark as used (only magic_link tokens are reusable)
    if (authToken.tokenType !== 'magic_link') {
      await storage.markAuthTokenAsUsed(authToken.id);
    }

    // Get seller context from the auth token (stored during send-magic-link)
    const sellerContextFromToken = authToken.sellerContext;
    
    // If sellerContext exists, this is a buyer login from a seller's storefront
    const isMainDomain = !sellerContextFromToken;
    
    logger.auth('Magic link domain context', {
      isMainDomain,
      sellerContext: sellerContextFromToken || undefined
    });
    
    // Get or create user (normalized email)
    const normalizedEmail = normalizeEmail(authToken.email);
    let user = await storage.getUserByEmail(normalizedEmail);
    
    if (!user) {
      // Create new user account based on domain
      const role = isMainDomain ? 'admin' : 'buyer';
      
      user = await storage.upsertUser({
        email: normalizedEmail,
        role,
      });
      
      logger.auth('Created new user via magic link', {
        role,
        email: normalizedEmail,
        userId: user.id
      });
      
      // Send welcome email to new sellers (only once)
      if (role === 'admin' && !user.welcomeEmailSent) {
        try {
          await notificationService.sendSellerWelcome(user);
          await storage.updateWelcomeEmailSent(user.id);
          logger.auth('Welcome email sent to new seller', { userId: user.id, email: normalizedEmail });
        } catch (error) {
          logger.error('Failed to send welcome email', error, { userId: user.id, email: normalizedEmail });
        }
      }
    } else {
      logger.auth('Existing user logging in via magic link', {
        role: user.role,
        email: normalizedEmail,
        userId: user.id
      });
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
      req.session.save((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.auth('User authenticated via magic link', {
      email: normalizedEmail,
      userId: user.id
    });

    // Migrate guest cart to authenticated user
    try {
      const cartService = new CartService(storage);
      await cartService.migrateGuestCart(req.sessionID, user.id);
      logger.info('[Auth] Cart migration completed for email magic-link', { 
        userId: user.id
      });
    } catch (error) {
      logger.error('[Auth] Cart migration failed for email magic-link', error, { 
        userId: user.id
      });
    }

    // Determine redirect URL: preserved returnUrl takes priority
    let redirectUrl: string;
    
    // Sanitize returnUrl to prevent open redirect - only allow same-origin paths
    let sanitizedReturnUrl: string | null = null;
    if (authToken.returnUrl) {
      try {
        // Only allow paths starting with / and not // (protocol-relative URLs)
        if (authToken.returnUrl.startsWith("/") && !authToken.returnUrl.startsWith("//")) {
          sanitizedReturnUrl = authToken.returnUrl;
        } else {
          logger.warn('Invalid returnUrl rejected in verify-magic-link', {
            module: 'auth-email',
            returnUrl: authToken.returnUrl,
            userId: user.id
          });
        }
      } catch (e) {
        logger.warn('returnUrl validation failed in verify-magic-link', {
          module: 'auth-email',
          returnUrl: authToken.returnUrl
        });
      }
    }
    
    if (sanitizedReturnUrl) {
      // Use sanitized preserved returnUrl from auth token (highest priority)
      redirectUrl = sanitizedReturnUrl;
      logger.auth('Using preserved returnUrl from auth token', {
        returnUrl: sanitizedReturnUrl,
        loginContext: authToken.loginContext || undefined,
        userId: user.id
      });
    } else if (redirect && typeof redirect === 'string') {
      // Use provided redirect parameter if available
      redirectUrl = redirect.startsWith('/') ? redirect : `/${redirect}`;
      logger.debug('Using provided redirect', { redirectUrl });
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
  } catch (error) {
    logger.error('Verify magic link error', error, { module: 'auth-email' });
    // Redirect to login with error
    res.redirect('/login?error=invalid_link');
  }
});

/**
 * POST /api/auth/logout
 * Logout and destroy session
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    await new Promise<void>((resolve, reject) => {
      (req as any).session.destroy((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.auth('User logged out successfully');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error', error, { module: 'auth-email' });
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router;
