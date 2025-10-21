import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { getTestApp } from '../setup/test-app.js';

describe('API Caching & Performance @performance', () => {
  let app: Express;

  beforeAll(async () => {
    app = await getTestApp();
  });

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';

describe('API Caching & Performance @performance', () => {
  it('should serve cached responses faster', async () => {
    const endpoint = '/api/products';

    const start1 = Date.now();
    await request(app).get(endpoint);
    const cold = Date.now() - start1;

    const start2 = Date.now();
    await request(app).get(endpoint);
    const warm = Date.now() - start2;

    console.log(`Cold: ${cold}ms, Warm: ${warm}ms`);
    
    expect(warm).toBeLessThanOrEqual(cold);
  });

  it('should have acceptable p95 latency for critical endpoints', async () => {
    const endpoints = [
      '/api/products',
      '/api/cart',
      '/api/orders'
    ];

    for (const endpoint of endpoints) {
      const latencies: number[] = [];

      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await request(app).get(endpoint);
        latencies.push(Date.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95 = latencies[p95Index];

      console.log(`${endpoint} p95: ${p95}ms`);
      expect(p95).toBeLessThan(500);
    }
  });
});
