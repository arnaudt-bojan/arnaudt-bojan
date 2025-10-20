#!/usr/bin/env tsx
/**
 * Health & Metrics Endpoint Checker
 * Verifies /healthz and /metrics endpoints are operational
 */

import http from 'http';
import https from 'https';

interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'unreachable';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  data?: any;
}

async function checkEndpoint(url: string, timeout: number = 5000): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, { timeout }, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result: HealthCheckResult = {
          endpoint: url,
          status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
          statusCode: res.statusCode,
          responseTime
        };
        
        try {
          result.data = JSON.parse(data);
        } catch {
          result.data = data;
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      resolve({
        endpoint: url,
        status: 'unreachable',
        responseTime: Date.now() - startTime,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint: url,
        status: 'unreachable',
        responseTime: timeout,
        error: 'Request timeout'
      });
    });
  });
}

async function checkMetrics(baseUrl: string): Promise<void> {
  console.log('🏥 Checking health and metrics endpoints...\n');
  
  const endpoints = [
    `${baseUrl}/healthz`,
    `${baseUrl}/health`,
    `${baseUrl}/metrics`,
    `${baseUrl}/api/health`
  ];
  
  const results: HealthCheckResult[] = [];
  
  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint);
    results.push(result);
    
    const icon = result.status === 'healthy' ? '✅' : 
                 result.status === 'unhealthy' ? '⚠️' : '❌';
    
    console.log(`${icon} ${endpoint}`);
    console.log(`   Status: ${result.status}`);
    if (result.statusCode) {
      console.log(`   HTTP Status: ${result.statusCode}`);
    }
    if (result.responseTime) {
      console.log(`   Response Time: ${result.responseTime}ms`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }
  
  // Summary
  const healthy = results.filter(r => r.status === 'healthy').length;
  const total = results.length;
  
  console.log('='.repeat(50));
  console.log(`\nHealth Check Summary: ${healthy}/${total} endpoints healthy\n`);
  
  if (healthy === 0) {
    console.log('❌ No endpoints are responding. Is the server running?');
    process.exit(1);
  } else if (healthy < total) {
    console.log('⚠️  Some endpoints are not responding properly.');
    process.exit(1);
  } else {
    console.log('✅ All endpoints are healthy!');
  }
}

async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:5000';
  
  try {
    await checkMetrics(baseUrl);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { checkEndpoint, HealthCheckResult };
