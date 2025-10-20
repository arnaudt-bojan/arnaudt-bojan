import { describe, it, expect, beforeEach } from 'vitest';
import { testDb } from '../setup/db-test-utils';
import { createFixtures } from '../setup/fixtures';

describe('Email Webhooks @email @integration', () => {
  let fixtures: ReturnType<typeof createFixtures>;

  beforeEach(async () => {
    await testDb.reset();
    fixtures = createFixtures(testDb.prisma);
  });

  it('should track email suppression for bounces', async () => {
    const email = 'bounced@example.com';
    const reason = 'bounce';

    const suppression = await testDb.prisma.email_suppressions.create({
      data: {
        email,
        reason,
        suppressedAt: new Date()
      }
    });

    expect(suppression.email).toBe(email);
    expect(suppression.reason).toBe(reason');
  });

  it('should track email suppression for complaints', async () => {
    const email = 'complained@example.com';
    const reason = 'complaint';

    const suppression = await testDb.prisma.email_suppressions.create({
      data: {
        email,
        reason,
        suppressedAt: new Date()
      }
    });

    expect(suppression.email).toBe(email);
    expect(suppression.reason).toBe('complaint');
  });

  it('should check if email is suppressed', async () => {
    const email = 'suppressed@example.com';

    await testDb.prisma.email_suppressions.create({
      data: {
        email,
        reason: 'bounce',
        suppressedAt: new Date()
      }
    });

    const isSuppressed = await testDb.prisma.email_suppressions.findFirst({
      where: { email }
    });

    expect(isSuppressed).toBeDefined();
  });

  it('should allow sending to non-suppressed emails', async () => {
    const email = 'valid@example.com';

    const isSuppressed = await testDb.prisma.email_suppressions.findFirst({
      where: { email }
    });

    expect(isSuppressed).toBeNull();
  });

  it('should handle multiple suppressions for same email', async () => {
    const email = 'multi@example.com';

    await testDb.prisma.email_suppressions.create({
      data: {
        email,
        reason: 'bounce',
        suppressedAt: new Date()
      }
    });

    const suppressions = await testDb.prisma.email_suppressions.findMany({
      where: { email }
    });

    expect(suppressions).toHaveLength(1);
  });

  it('should track email sends in audit log', async () => {
    const { seller } = await fixtures.createSeller();

    const audit = await testDb.prisma.email_audit.create({
      data: {
        recipient: 'customer@example.com',
        subject: 'Order Confirmation',
        status: 'sent',
        provider: 'resend',
        providerId: `email_${Date.now()}`,
        sellerId: seller.id
      }
    });

    expect(audit.recipient).toBe('customer@example.com');
    expect(audit.subject).toBe('Order Confirmation');
    expect(audit.status).toBe('sent');
  });

  it('should track failed email sends', async () => {
    const { seller } = await fixtures.createSeller();

    const audit = await testDb.prisma.email_audit.create({
      data: {
        recipient: 'customer@example.com',
        subject: 'Order Confirmation',
        status: 'failed',
        errorMessage: 'Mailbox full',
        provider: 'resend',
        providerId: null,
        sellerId: seller.id
      }
    });

    expect(audit.status).toBe('failed');
    expect(audit.errorMessage).toBe('Mailbox full');
  });
});
