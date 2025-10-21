/**
 * Pessimistic Mock Infrastructure
 * 
 * Purpose: Default API mocks return errors (500/timeout) unless test opts-in to happy path
 * Philosophy: Tests should be explicit about expecting success; failures should be the default
 * 
 * This catches:
 * - Missing error handling
 * - Blank screen renders on API failures
 * - Unguarded null/undefined access
 * - Missing loading states
 */

import { vi } from 'vitest';

export interface MockBehavior {
  mode: 'pessimistic' | 'optimistic' | 'random';
  errorRate?: number; // 0.0 to 1.0
  timeoutRate?: number; // 0.0 to 1.0
  avgResponseTime?: number; // milliseconds
}

export interface PessimisticMockOptions {
  behavior?: MockBehavior;
  optInToSuccess?: boolean;
  fieldGuards?: string[]; // Required fields that throw if missing
}

const DEFAULT_PESSIMISTIC_BEHAVIOR: MockBehavior = {
  mode: 'pessimistic',
  errorRate: 0.7, // 70% chance of error
  timeoutRate: 0.2, // 20% chance of timeout
  avgResponseTime: 100,
};

const DEFAULT_OPTIMISTIC_BEHAVIOR: MockBehavior = {
  mode: 'optimistic',
  errorRate: 0.0,
  timeoutRate: 0.0,
  avgResponseTime: 50,
};

/**
 * Create a pessimistic fetch mock that defaults to errors
 */
export function createPessimisticFetchMock(options: PessimisticMockOptions = {}) {
  const behavior = options.optInToSuccess 
    ? DEFAULT_OPTIMISTIC_BEHAVIOR 
    : (options.behavior || DEFAULT_PESSIMISTIC_BEHAVIOR);

  return vi.fn(async (url: string, init?: RequestInit) => {
    // Simulate network delay
    const delay = Math.random() * behavior.avgResponseTime! * 2;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Determine outcome based on behavior
    const random = Math.random();

    if (!options.optInToSuccess) {
      // Pessimistic mode: mostly errors
      if (random < behavior.timeoutRate!) {
        throw new Error('Network timeout');
      }

      if (random < (behavior.timeoutRate! + behavior.errorRate!)) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ 
            success: false, 
            message: 'Simulated server error' 
          }),
        } as Response;
      }
    }

    // Success path (either opted-in or lucky random)
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ 
        success: true, 
        data: {} 
      }),
    } as Response;
  });
}

/**
 * Create a pessimistic API response with required field guards
 */
export function createGuardedResponse<T extends Record<string, any>>(
  data: T,
  requiredFields: string[]
): T {
  const proxy = new Proxy(data, {
    get(target, prop) {
      const value = target[prop as keyof T];

      // Check if this is a required field
      if (requiredFields.includes(prop as string)) {
        if (value === null || value === undefined) {
          throw new Error(`Required field '${String(prop)}' is null or undefined. This would cause a blank screen!`);
        }
      }

      return value;
    },
  });

  return proxy;
}

/**
 * Mock wallet balance with required field validation
 */
export function createMockWalletBalance(options: PessimisticMockOptions = {}) {
  if (!options.optInToSuccess) {
    // Pessimistic: return error
    return {
      success: false,
      currentBalanceUsd: null,
      pendingBalanceUsd: null,
      error: 'Simulated wallet API error',
    };
  }

  // Optimistic: return valid data with guards
  const data = {
    success: true,
    currentBalanceUsd: 1234.56,
    pendingBalanceUsd: 567.89,
    currency: 'USD',
  };

  return createGuardedResponse(data, [
    'success',
    'currentBalanceUsd',
    'pendingBalanceUsd',
  ]);
}

/**
 * Mock order data with required field validation
 */
export function createMockOrder(orderId: number, options: PessimisticMockOptions = {}) {
  if (!options.optInToSuccess) {
    // Pessimistic: return null or incomplete data
    return null;
  }

  // Optimistic: return valid order with guards
  const data = {
    id: orderId,
    status: 'pending' as const,
    total: 99.99,
    currency: 'USD',
    createdAt: new Date().toISOString(),
    items: [],
  };

  const requiredFields = options.fieldGuards || [
    'id',
    'status',
    'total',
    'currency',
    'createdAt',
  ];

  return createGuardedResponse(data, requiredFields);
}

/**
 * Mock currency propagation with validation
 */
export function createMockProductWithCurrency(
  productId: number,
  userCurrency: string,
  options: PessimisticMockOptions = {}
) {
  if (!options.optInToSuccess) {
    // Pessimistic: return product without currency field
    return {
      id: productId,
      name: 'Test Product',
      price: 99.99,
      // Missing currency field - should be caught!
    };
  }

  // Optimistic: return complete product
  const data = {
    id: productId,
    name: 'Test Product',
    price: 99.99,
    currency: userCurrency,
  };

  return createGuardedResponse(data, ['id', 'price', 'currency']);
}

/**
 * Simulate random API failures
 */
export function maybeThrowError(errorRate: number = 0.5) {
  if (Math.random() < errorRate) {
    const errors = [
      new Error('Network timeout'),
      new Error('Database connection failed'),
      new Error('Internal server error'),
      new Error('Service unavailable'),
    ];
    throw errors[Math.floor(Math.random() * errors.length)];
  }
}

/**
 * Simulate slow API responses
 */
export async function randomDelay(minMs: number = 100, maxMs: number = 1000) {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Create a pessimistic Stripe Connect mock
 */
export function createMockStripeConnect(options: PessimisticMockOptions = {}) {
  return {
    loadConnectAndInitialize: vi.fn(async () => {
      if (!options.optInToSuccess) {
        // Pessimistic: missing publishable key
        if (!process.env.VITE_STRIPE_PUBLIC_KEY) {
          throw new Error('VITE_STRIPE_PUBLIC_KEY is required in production');
        }
      }

      // Success: return mock Stripe instance
      return {
        create: vi.fn(() => ({
          unmount: vi.fn(),
        })),
      };
    }),
  };
}

/**
 * Metrics tracking for pessimistic mocks
 */
export class MockMetrics {
  private static counters: Map<string, number> = new Map();

  static increment(metric: string, labels: Record<string, string> = {}) {
    const key = this.formatKey(metric, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
    
    // Log for visibility in tests
    console.log(`[METRIC] ${key} +1 (total: ${current + 1})`);
  }

  static get(metric: string, labels: Record<string, string> = {}): number {
    const key = this.formatKey(metric, labels);
    return this.counters.get(key) || 0;
  }

  static reset() {
    this.counters.clear();
  }

  static getAll(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }

  private static formatKey(metric: string, labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return metric;
    }

    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `${metric}{${labelStr}}`;
  }
}

// Export metric counter names as constants
export const METRICS = {
  WALLET_BALANCE_ERROR: 'wallet_balance_error_total',
  STRIPE_CONNECT_INIT_ERROR: 'stripe_connect_init_error_total',
  ROUTE_RENDER_FAIL: 'route_render_fail_total',
  CURRENCY_LITERAL_VIOLATION: 'currency_literal_violation_total',
} as const;
