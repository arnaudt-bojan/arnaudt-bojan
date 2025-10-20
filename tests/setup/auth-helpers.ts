import type { Express } from 'express';
import type { Prisma } from '../../generated/prisma/index.js';
import { createFixtures } from './fixtures.js';
import request from 'supertest';
import { randomBytes } from 'crypto';

export interface AuthContext {
  userId: string;
  email: string;
  userType: 'buyer' | 'seller' | 'admin';
  sessionCookie: string;
}

export async function createAuthSession(
  app: Express,
  userType: 'buyer' | 'seller' | 'admin',
  tx: Prisma.TransactionClient
): Promise<AuthContext> {
  const fixtures = createFixtures(tx);
  
  const email = `test-${userType}-${randomBytes(4).toString('hex')}@example.com`;
  
  let user;
  switch (userType) {
    case 'seller':
    case 'admin':
      const { user: sellerUser } = await fixtures.createSeller();
      user = await tx.users.update({
        where: { id: sellerUser.id },
        data: { email },
      });
      break;
    case 'buyer':
      const { user: buyerUser } = await fixtures.createBuyer();
      user = await tx.users.update({
        where: { id: buyerUser.id },
        data: { email },
      });
      break;
    default:
      throw new Error(`Unknown user type: ${userType}`);
  }

  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/email/verify-code')
    .send({ email, code: '111111' });

  if (res.status !== 200) {
    throw new Error(`Failed to create auth session: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const cookies = res.headers['set-cookie'];
  if (!cookies || cookies.length === 0) {
    throw new Error('No session cookie returned');
  }

  const sessionCookie = Array.isArray(cookies) ? cookies[0] : cookies;

  return {
    userId: user.id,
    email: user.email || email,
    userType,
    sessionCookie,
  };
}

export async function createBuyerSession(
  app: Express,
  tx: Prisma.TransactionClient
): Promise<AuthContext> {
  return createAuthSession(app, 'buyer', tx);
}

export async function createSellerSession(
  app: Express,
  tx: Prisma.TransactionClient
): Promise<AuthContext> {
  return createAuthSession(app, 'seller', tx);
}

export async function createAdminSession(
  app: Express,
  tx: Prisma.TransactionClient
): Promise<AuthContext> {
  return createAuthSession(app, 'admin', tx);
}

export async function loginAs(
  app: Express,
  email: string,
  code: string = '111111'
): Promise<string> {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/email/verify-code')
    .send({ email, code });

  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const cookies = res.headers['set-cookie'];
  if (!cookies || cookies.length === 0) {
    throw new Error('No session cookie returned');
  }

  return Array.isArray(cookies) ? cookies[0] : cookies;
}

export function extractSessionId(sessionCookie: string): string | null {
  const match = sessionCookie.match(/connect\.sid=([^;]+)/);
  return match ? match[1] : null;
}

export async function logout(app: Express, sessionCookie: string): Promise<void> {
  await request(app)
    .post('/api/auth/logout')
    .set('Cookie', sessionCookie);
}

export async function getCurrentUser(app: Express, sessionCookie: string): Promise<any> {
  const res = await request(app)
    .get('/api/user')
    .set('Cookie', sessionCookie);

  if (res.status !== 200) {
    return null;
  }

  return res.body;
}

export async function createTestAuthToken(
  email: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const code = '111111';
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await tx.auth_tokens.create({
    data: {
      id: `auth-token-${randomBytes(4).toString('hex')}`,
      email,
      token,
      code,
      token_type: 'login_code',
      expires_at: expiresAt,
      used: 0,
    },
  });

  return code;
}
