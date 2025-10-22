import { vi } from 'vitest';

export const mockEmailsSent: any[] = [];

export const mockResend = {
  emails: {
    send: vi.fn(async (email: any) => {
      mockEmailsSent.push(email);
      return {
        data: {
          id: `email_${Date.now()}`,
        },
        error: null
      };
    })
  },
  batch: {
    send: vi.fn(async (emails: any[]) => {
      emails.forEach(email => mockEmailsSent.push(email));
      return {
        data: emails.map((_, i) => ({ id: `email_batch_${i}_${Date.now()}` })),
        error: null
      };
    })
  }
};

export function clearEmailMocks() {
  mockEmailsSent.length = 0;
  mockResend.emails.send.mockClear();
  mockResend.batch.send.mockClear();
}

export function getEmailsSentTo(email: string) {
  return mockEmailsSent.filter(e => {
    const to = Array.isArray(e.to) ? e.to : [e.to];
    return to.includes(email);
  });
}
