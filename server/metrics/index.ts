import { Counter, Histogram, Gauge, register } from 'prom-client';

export const apiLatency = new Histogram({
  name: 'api_latency_ms',
  help: 'API request latency in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
});

export const apiErrors = new Counter({
  name: 'api_error_total',
  help: 'Total number of API errors',
  labelNames: ['method', 'route', 'error_type']
});

export const apiRequests = new Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'route', 'status_code']
});

export const emailsSent = new Counter({
  name: 'emails_sent_total',
  help: 'Total number of emails sent',
  labelNames: ['template_type', 'status']
});

export const ordersCreated = new Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['platform', 'status']
});

export const orderValue = new Histogram({
  name: 'order_value_usd',
  help: 'Order value in USD',
  labelNames: ['platform'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000]
});

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_ms',
  help: 'Database query duration in milliseconds',
  labelNames: ['operation', 'table'],
  buckets: [1, 5, 10, 50, 100, 500, 1000]
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type']
});

export { register };
