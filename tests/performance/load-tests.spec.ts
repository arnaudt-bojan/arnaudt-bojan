import autocannon from 'autocannon';
import { describe, it, expect } from 'vitest';

interface LoadTestResult {
  requests: { average: number; p97_5: number; p99: number };
  latency: { average: number; p97_5: number; p99: number };
  throughput: { average: number };
  errors: number;
}

async function runLoadTest(url: string, duration = 10): Promise<LoadTestResult> {
  return new Promise((resolve, reject) => {
    autocannon({
      url,
      duration,
      connections: 10,
      pipelining: 1
    }, (err, result) => {
      if (err) return reject(err);
      
      resolve({
        requests: {
          average: result.requests.average,
          p97_5: result.requests.p97_5,
          p99: result.requests.p99
        },
        latency: {
          average: result.latency.mean,
          p97_5: result.latency.p97_5,
          p99: result.latency.p99
        },
        throughput: {
          average: result.throughput.average
        },
        errors: result.errors
      });
    });
  });
}

describe('Load Testing @performance @slow', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

  it('should handle load on /api/products endpoint', async () => {
    const result = await runLoadTest(`${baseUrl}/api/products`, 10);

    expect(result.latency.p97_5).toBeLessThan(500);
    expect(result.errors).toBe(0);
    expect(result.requests.average).toBeGreaterThan(10);
  }, 15000);

  it('should handle load on /api/cart endpoint', async () => {
    const result = await runLoadTest(`${baseUrl}/api/cart`, 10);

    expect(result.latency.p97_5).toBeLessThan(300);
    expect(result.errors).toBe(0);
  }, 15000);

  it('should maintain performance under concurrent users', async () => {
    const results = await Promise.all([
      runLoadTest(`${baseUrl}/api/products`, 5),
      runLoadTest(`${baseUrl}/api/cart`, 5),
      runLoadTest(`${baseUrl}/api/orders`, 5)
    ]);

    results.forEach(result => {
      expect(result.latency.p97_5).toBeLessThan(1000);
      expect(result.errors).toBe(0);
    });
  }, 20000);
});
