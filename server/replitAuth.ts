import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { logger } from "./logger";
import { generateUniqueUsername } from "./utils";
import { CartService } from "./services/cart.service";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false, // IMPORTANT: false for Socket.IO compatibility
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // false in dev for non-HTTPS
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

interface SessionUser {
  claims?: Record<string, unknown>;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

function updateUserSession(
  user: SessionUser,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
): void {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp as number | undefined;
}

async function upsertUser(claims: Record<string, unknown>, intendedRole?: string): Promise<void> {
  const existingUser = await storage.getUser(claims["sub"]);
  
  // If user exists, keep their role and username
  if (existingUser) {
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      username: existingUser.username,
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: existingUser.role,
    });
  } else {
    // For new users, check if this is the first user in the system
    const allUsers = await storage.getAllUsers();
    const isFirstUser = allUsers.length === 0;
    
    let userRole = "buyer";
    if (isFirstUser) {
      userRole = "admin";
    } else if (intendedRole === "admin") {
      userRole = "admin";
    } else if (intendedRole === "editor") {
      userRole = "editor";
    } else if (intendedRole === "viewer") {
      userRole = "viewer";
    } else if (intendedRole === "buyer") {
      userRole = "buyer";
    }
    
    // Generate unique username for new user
    const username = await generateUniqueUsername();
    
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      username,
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: userRole,
    });
  }
}

// Setup test users for local authentication
async function setupTestUsers(): Promise<void> {
  const testUsers = [
    { email: "testbuyer@test.com", password: "123456", role: "buyer" as const, firstName: "Test", lastName: "Buyer" },
    { email: "testseller@test.com", password: "123456", role: "admin" as const, firstName: "Test", lastName: "Seller" }
  ];

  for (const testUser of testUsers) {
    try {
      // Check if user already exists by email
      const allUsers = await storage.getAllUsers();
      const existingUser = allUsers.find(u => u.email === testUser.email);
      
      if (existingUser) {
        // Update existing user with password and correct role, but keep username if they have one
        logger.info('Updating test user', {
          module: 'setup',
          email: testUser.email,
          userId: existingUser.id
        });
        await storage.upsertUser({
          id: existingUser.id,
          email: testUser.email,
          username: existingUser.username || await generateUniqueUsername(),
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          profileImageUrl: existingUser.profileImageUrl,
          role: testUser.role,
          password: testUser.password
        });
      } else {
        // Create new user
        const userId = `local-${testUser.email}`;
        const username = await generateUniqueUsername();
        logger.info('Creating test user', {
          module: 'setup',
          email: testUser.email,
          userId
        });
        await storage.upsertUser({
          id: userId,
          email: testUser.email,
          username,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          profileImageUrl: null,
          role: testUser.role,
          password: testUser.password
        });
      }
    } catch (error) {
      logger.error('Error setting up test user', error, {
        module: 'setup',
        email: testUser.email
      });
    }
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup test users
  await setupTestUsers();

  // Local strategy for testing
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        logger.auth('Attempting local login', { email });
        // Look up user by email
        const allUsers = await storage.getAllUsers();
        const user = allUsers.find(u => u.email === email);
        
        if (!user) {
          logger.warn('User not found for local auth', { email });
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        logger.debug('User found for local auth', {
          userId: user.id,
          hasPassword: !!user.password
        });
        
        if (user.password !== password) {
          logger.warn('Password mismatch for local auth', { email });
          return done(null, false, { message: 'Invalid credentials' });
        }

        logger.auth('Local login successful', { email, userId: user.id });
        
        // Create a session user object similar to OIDC
        const sessionUser: SessionUser & { claims: Record<string, unknown> } = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
          },
          access_token: 'local-auth',
          expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
        };

        return done(null, sessionUser);
      } catch (error) {
        logger.error('Error during local authentication', error);
        return done(error);
      }
    }
  ));

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback,
    req?: any
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    const intendedRole = req?.session?.intendedRole;
    await upsertUser(tokens.claims(), intendedRole);
    if (req?.session?.intendedRole) {
      delete req.session.intendedRole;
    }
    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const intendedRole = req.query.role as string;
    const returnUrl = req.query.returnUrl as string;
    const loginContext = req.query.loginContext as string;
    
    if (intendedRole) {
      (req.session as any).intendedRole = intendedRole;
    }
    if (returnUrl) {
      (req.session as any).returnUrl = returnUrl;
    }
    if (loginContext) {
      (req.session as any).loginContext = loginContext;
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", async (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any) => {
      if (err || !user) {
        return res.redirect("/api/login");
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          return res.redirect("/api/login");
        }
        
        const dbUser = await storage.getUser(user.claims.sub);
        
        // Migrate guest cart to authenticated user
        try {
          const cartService = new CartService(storage);
          await cartService.migrateGuestCart(req.sessionID, user.claims.sub);
          logger.info('[Auth] Cart migration completed for OIDC login', { 
            userId: user.claims.sub
          });
        } catch (error) {
          logger.error('[Auth] Cart migration failed for OIDC login', error, { 
            userId: user.claims.sub
          });
        }
        
        // Check for preserved returnUrl in session
        const rawReturnUrl = (req.session as any)?.returnUrl;
        const loginContext = (req.session as any)?.loginContext;
        
        // Clear session variables
        delete (req.session as any).returnUrl;
        delete (req.session as any).loginContext;
        
        // Sanitize returnUrl to prevent open redirect - only allow same-origin paths
        let returnUrl: string | null = null;
        if (rawReturnUrl) {
          try {
            // Only allow paths starting with / and not // (protocol-relative URLs)
            if (rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//")) {
              returnUrl = rawReturnUrl;
            } else {
              logger.warn('Invalid returnUrl rejected', {
                module: 'auth',
                returnUrl: rawReturnUrl,
                userId: dbUser?.id
              });
            }
          } catch (e) {
            logger.warn('returnUrl validation failed', {
              module: 'auth',
              returnUrl: rawReturnUrl
            });
          }
        }
        
        // If sanitized returnUrl exists, use it
        if (returnUrl) {
          logger.auth('Redirecting to preserved returnUrl', { 
            returnUrl, 
            loginContext,
            userId: dbUser?.id 
          });
          return res.redirect(returnUrl);
        }
        
        // Otherwise, use default role-based redirect
        if (dbUser?.role === "buyer") {
          return res.redirect("/buyer-dashboard");
        } else if (dbUser?.role === "seller" || dbUser?.role === "owner" || dbUser?.role === "admin") {
          return res.redirect("/seller-dashboard");
        } else {
          return res.redirect("/");
        }
      });
    })(req, res, next);
  });

  // Local login route for testing
  app.post("/api/local-login", (req, res, next) => {
    const { isSellerLogin } = req.body;
    
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      req.login(user, async (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ error: "Login failed" });
        }

        const dbUser = await storage.getUser(user.claims.sub);

        // Migrate guest cart to authenticated user
        try {
          const cartService = new CartService(storage);
          await cartService.migrateGuestCart(req.sessionID, user.claims.sub);
          logger.info('[Auth] Cart migration completed for local login', { 
            userId: user.claims.sub
          });
        } catch (error) {
          logger.error('[Auth] Cart migration failed for local login', error, { 
            userId: user.claims.sub
          });
        }

        // Validate domain-based access
        if (isSellerLogin) {
          // Main domain - only admin/editor/viewer allowed
          if (dbUser?.role !== "admin" && dbUser?.role !== "editor" && dbUser?.role !== "viewer") {
            return res.status(403).json({ error: "Sellers must login from the main domain" });
          }
          return res.json({ success: true, redirectUrl: "/seller-dashboard" });
        } else {
          // Seller domain - only buyers allowed
          if (dbUser?.role !== "buyer") {
            return res.status(403).json({ error: "Buyers must login from a seller's storefront" });
          }
          return res.json({ success: true, redirectUrl: "/" });
        }
      });
    })(req, res, next);
  });

  // Signup route for buyers and sellers
  app.post("/api/signup", async (req, res) => {
    try {
      const { email, password, sellerUsername } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Check if user already exists
      const allUsers = await storage.getAllUsers();
      const existingUser = allUsers.find(u => u.email === email);

      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Determine if this is a seller signup (main domain) or buyer signup (seller subdomain)
      const isSellerSignup = !sellerUsername; // No sellerUsername means main domain (seller signup)
      
      // Generate unique username
      let username = Math.floor(10000000 + Math.random() * 90000000).toString();
      let attempts = 0;
      
      while (allUsers.some(u => u.username === username) && attempts < 10) {
        username = Math.floor(10000000 + Math.random() * 90000000).toString();
        attempts++;
      }

      // Create new user with appropriate role
      const newUser = await storage.upsertUser({
        email,
        password,
        role: isSellerSignup ? "admin" : "buyer", // Sellers get admin role, buyers get buyer role
        username,
      });

      // Auto-login the new user
      const userForSession = {
        claims: { sub: newUser.id },
        access_token: 'local-auth',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      req.login(userForSession, async (err) => {
        if (err) {
          return res.status(500).json({ error: "Account created but login failed" });
        }

        // Migrate guest cart to authenticated user
        try {
          const cartService = new CartService(storage);
          await cartService.migrateGuestCart(req.sessionID, newUser.id);
          logger.info('[Auth] Cart migration completed for signup', { 
            userId: newUser.id
          });
        } catch (error) {
          logger.error('[Auth] Cart migration failed for signup', error, { 
            userId: newUser.id
          });
        }

        // Redirect based on role
        const redirectUrl = isSellerSignup ? "/seller-dashboard" : "/";
        return res.json({ success: true, redirectUrl });
      });

    } catch (error) {
      logger.error('Signup error', error, { module: 'auth' });
      return res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.get("/api/logout", (req, res) => {
    const accessToken = (req.user as any)?.access_token;
    const isLocalOrEmailAuth = accessToken === 'local-auth' || accessToken === 'email-auth';
    const rawReturnUrl = req.query.returnUrl as string || "/";
    
    // Sanitize returnUrl to prevent open redirect - only allow same-origin paths
    let returnUrl = "/";
    try {
      const decodedUrl = decodeURIComponent(rawReturnUrl);
      // Only allow paths starting with / and not // (protocol-relative URLs)
      if (decodedUrl.startsWith("/") && !decodedUrl.startsWith("//")) {
        returnUrl = decodedUrl;
      }
    } catch (e) {
      // Invalid URL encoding, use default
      logger.warn('Invalid returnUrl encoding, using default', {
        module: 'auth',
        returnUrl: rawReturnUrl
      });
    }
    
    req.logout(() => {
      if (isLocalOrEmailAuth) {
        res.redirect(returnUrl);
      } else {
        const fullReturnUrl = `${req.protocol}://${req.hostname}${returnUrl}`;
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: fullReturnUrl,
          }).href
        );
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if this is local auth or email auth (doesn't need token refresh)
  if (user.access_token === 'local-auth' || user.access_token === 'email-auth') {
    // Extend session for local/email auth users on each request (similar to session cookie behavior)
    user.expires_at = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    return next();
  }

  // OIDC auth with token refresh
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export const isSeller: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = user.claims.sub;
  const dbUser = await storage.getUser(userId);
  
  // Allow admin, owner, editor roles (all seller roles)
  const sellerRoles = ["admin", "owner", "editor", "seller"];
  if (!dbUser || !sellerRoles.includes(dbUser.role)) {
    return res.status(403).json({ message: "Forbidden - Seller access required" });
  }

  return next();
};
