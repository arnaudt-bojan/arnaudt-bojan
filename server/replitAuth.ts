import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

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
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any, intendedRole?: string) {
  const existingUser = await storage.getUser(claims["sub"]);
  
  // If user exists, keep their role
  if (existingUser) {
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: existingUser.role,
    });
  } else {
    // For new users, check if this is the first user in the system
    const allUsers = await storage.getAllUsers();
    const isFirstUser = allUsers.length === 0;
    
    let userRole = "customer";
    if (isFirstUser) {
      userRole = "owner";
    } else if (intendedRole === "seller") {
      userRole = "seller";
    } else if (intendedRole === "buyer") {
      userRole = "buyer";
    }
    
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: userRole,
    });
  }
}

// Setup test users for local authentication
async function setupTestUsers() {
  const testUsers = [
    { email: "testbuyer@test.com", password: "123456", role: "buyer", firstName: "Test", lastName: "Buyer" },
    { email: "testseller@test.com", password: "123456", role: "seller", firstName: "Test", lastName: "Seller" }
  ];

  for (const testUser of testUsers) {
    const userId = `local-${testUser.email}`;
    // Check if user already exists by email
    const allUsers = await storage.getAllUsers();
    const existingUser = allUsers.find(u => u.email === testUser.email);
    
    if (!existingUser) {
      await storage.upsertUser({
        id: userId,
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        profileImageUrl: null,
        role: testUser.role as any,
        password: testUser.password
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
        const userId = `local-${email}`;
        const user = await storage.getUser(userId);
        
        if (!user || user.password !== password) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        // Create a session user object similar to OIDC
        const sessionUser = {
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
    if (intendedRole) {
      (req.session as any).intendedRole = intendedRole;
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

        let redirectUrl = "/";
        if (dbUser?.role === "buyer") {
          redirectUrl = "/buyer-dashboard";
        } else if (dbUser?.role === "seller" || dbUser?.role === "owner" || dbUser?.role === "admin") {
          redirectUrl = "/seller-dashboard";
        }

        return res.json({ success: true, redirectUrl });
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const isLocalAuth = (req.user as any)?.access_token === 'local-auth';
    req.logout(() => {
      if (isLocalAuth) {
        res.redirect("/");
      } else {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
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
  
  if (dbUser?.role !== "seller") {
    return res.status(403).json({ message: "Forbidden - Seller access required" });
  }

  return next();
};
