import { PrismaClient } from '@prisma/client';

/**
 * Connection Pool Configuration
 * 
 * Prisma connection pool parameters for production-grade performance:
 * - connection_limit: Maximum number of database connections in the pool
 * - pool_timeout: Seconds to wait for an available connection before timing out
 * - connect_timeout: Seconds to wait when establishing initial connection
 * - statement_timeout: Milliseconds to wait for query execution (PostgreSQL specific)
 * 
 * IMPORTANT LIMITATION - Minimum Pool Size:
 * Prisma does NOT support setting a minimum pool size natively. It only supports
 * connection_limit (max pool size). To maintain a minimum number of warm connections,
 * we implement a connection warmup job that periodically executes keep-alive queries
 * to ensure at least DATABASE_POOL_MIN connections stay active in the pool.
 * 
 * This warmup strategy helps avoid cold-start latency when traffic increases suddenly.
 */

// Environment variables for connection pool configuration
const DATABASE_POOL_MIN = parseInt(process.env.DATABASE_POOL_MIN || '2', 10);
const DATABASE_POOL_MAX = parseInt(process.env.DATABASE_POOL_MAX || '10', 10);
const DATABASE_CONNECTION_TIMEOUT = parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10', 10); // seconds
const DATABASE_QUERY_TIMEOUT = parseInt(process.env.DATABASE_QUERY_TIMEOUT || '60000', 10); // milliseconds

/**
 * Connection Pool Metrics
 * Tracks database connection usage for monitoring and debugging
 */
interface PoolMetrics {
  queriesExecuted: number;
  queriesFailed: number;
  slowQueries: number;
  connectionAttempts: number;
  connectionErrors: number;
  lastError?: string;
  lastErrorTime?: Date;
}

const poolMetrics: PoolMetrics = {
  queriesExecuted: 0,
  queriesFailed: 0,
  slowQueries: 0,
  connectionAttempts: 0,
  connectionErrors: 0,
};

/**
 * Constructs database URL with connection pool parameters
 * Appends pool configuration to existing DATABASE_URL
 */
function constructDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL;
  
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Parse the URL to check if it already has query parameters
  try {
    const url = new URL(baseUrl);
    
    // For Prisma Postgres proxy URLs (prisma+postgres://), parameters are encoded in the api_key
    // For standard PostgreSQL URLs, we can append parameters
    if (url.protocol === 'prisma+postgres:') {
      // Prisma proxy already handles connection pooling internally
      // Log the configuration for visibility
      console.log('[Prisma] Using Prisma Postgres proxy - connection pooling managed by proxy');
      console.log('[Prisma] Note: DATABASE_POOL_MIN requires warmup job (Prisma limitation)');
      return baseUrl;
    }
    
    // For standard PostgreSQL connections, add pool parameters
    url.searchParams.set('connection_limit', DATABASE_POOL_MAX.toString());
    url.searchParams.set('pool_timeout', DATABASE_CONNECTION_TIMEOUT.toString());
    url.searchParams.set('connect_timeout', DATABASE_CONNECTION_TIMEOUT.toString());
    
    // PostgreSQL-specific statement timeout (in milliseconds)
    // This enforces DATABASE_QUERY_TIMEOUT at the database level
    url.searchParams.set('statement_timeout', DATABASE_QUERY_TIMEOUT.toString());
    
    const enhancedUrl = url.toString();
    console.log('[Prisma] Database connection pool configured:', {
      poolMin: `${DATABASE_POOL_MIN} (maintained by warmup job)`,
      poolMax: DATABASE_POOL_MAX,
      connectionTimeout: `${DATABASE_CONNECTION_TIMEOUT}s`,
      queryTimeout: `${DATABASE_QUERY_TIMEOUT}ms (enforced by PostgreSQL statement_timeout)`,
    });
    
    return enhancedUrl;
  } catch (error) {
    console.error('[Prisma] Failed to parse DATABASE_URL:', error);
    throw new Error('Invalid DATABASE_URL format');
  }
}

/**
 * Prisma Client Singleton with Connection Pooling
 * 
 * Ensures only one Prisma Client instance is created across the application.
 * This prevents connection pool exhaustion in development with hot reloading.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure log levels based on environment
// IMPORTANT: Query events must be enabled in ALL environments to track metrics
const logLevels = process.env.NODE_ENV === "development" 
  ? [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ] as const
  : [
      { emit: 'event', level: 'query' }, // Enabled for metrics tracking
      { emit: 'event', level: 'error' }, // Enabled for error tracking
      { emit: 'stdout', level: 'warn' },
    ] as const;

/**
 * Prisma Client with Extensions
 * 
 * NOTE: Query timeout enforcement is handled by PostgreSQL statement_timeout parameter
 * configured in the database URL. This provides native database-level timeout protection.
 * 
 * For Prisma Client 5.x+, middleware was removed. Query interception would require
 * client extensions, but for timeout enforcement, the native PostgreSQL statement_timeout
 * is more reliable and performant.
 */
const basePrisma = new PrismaClient({
  datasources: {
    db: {
      url: constructDatabaseUrl(),
    },
  },
  log: logLevels,
});

export const prisma = globalForPrisma.prisma ?? basePrisma;

/**
 * Connection Pool Event Listeners
 * Monitor query performance and connection health in ALL environments
 */

// Track query execution time for performance monitoring (ALL ENVIRONMENTS)
prisma.$on('query' as any, (e: any) => {
  poolMetrics.queriesExecuted++;
  
  const duration = e.duration;
  const slowQueryThreshold = 1000; // 1 second
  
  if (duration > slowQueryThreshold) {
    poolMetrics.slowQueries++;
    
    // Only log detailed query information in development
    if (process.env.NODE_ENV === "development") {
      console.warn('[Prisma] Slow query detected:', {
        query: e.query,
        duration: `${duration}ms`,
        params: e.params,
        target: e.target,
      });
    } else {
      // In production, log minimal info to avoid exposing sensitive data
      console.warn('[Prisma] Slow query detected:', {
        duration: `${duration}ms`,
        target: e.target,
      });
    }
  }
});

// Track query errors to increment queriesFailed counter (ALL ENVIRONMENTS)
prisma.$on('error' as any, (e: any) => {
  poolMetrics.queriesFailed++;
  poolMetrics.lastError = e.message || 'Unknown database error';
  poolMetrics.lastErrorTime = new Date();
  
  // Only log detailed error information in development
  if (process.env.NODE_ENV === "development") {
    console.error('[Prisma] Query error:', {
      message: e.message,
      target: e.target,
      timestamp: poolMetrics.lastErrorTime,
    });
  } else {
    // In production, log minimal info
    console.error('[Prisma] Query error:', {
      timestamp: poolMetrics.lastErrorTime,
    });
  }
});

/**
 * Connection Warmup Job
 * 
 * Maintains minimum pool size by periodically executing keep-alive queries.
 * This prevents cold-start latency and ensures DATABASE_POOL_MIN connections
 * are always available in the pool.
 * 
 * Strategy:
 * 1. Execute DATABASE_POOL_MIN concurrent lightweight queries
 * 2. Run every 30 seconds to keep connections warm
 * 3. Uses SELECT 1 as a no-op query that doesn't impact the database
 */
let warmupInterval: NodeJS.Timeout | null = null;

async function warmupConnections(): Promise<void> {
  try {
    // Execute DATABASE_POOL_MIN concurrent queries to warm up connections
    const warmupPromises = Array.from({ length: DATABASE_POOL_MIN }, () =>
      prisma.$queryRaw`SELECT 1 AS warmup`
    );
    
    await Promise.all(warmupPromises);
  } catch (error) {
    // Don't crash on warmup errors, just log them
    console.error('[Prisma] Connection warmup failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

export function startConnectionWarmup(): void {
  if (warmupInterval) {
    console.warn('[Prisma] Connection warmup already running');
    return;
  }
  
  // Run initial warmup immediately
  warmupConnections().catch(console.error);
  
  // Then run every 30 seconds
  warmupInterval = setInterval(() => {
    warmupConnections().catch(console.error);
  }, 30_000); // 30 seconds
  
  console.log(`[Prisma] Connection warmup job started (maintaining ${DATABASE_POOL_MIN} warm connections)`);
}

export function stopConnectionWarmup(): void {
  if (warmupInterval) {
    clearInterval(warmupInterval);
    warmupInterval = null;
    console.log('[Prisma] Connection warmup job stopped');
  }
}

/**
 * Connection health check
 * Verifies database connectivity and pool status
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
  metrics: PoolMetrics;
}> {
  try {
    const start = Date.now();
    poolMetrics.connectionAttempts++;
    
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    const latency = Date.now() - start;
    
    return {
      healthy: true,
      latency,
      metrics: { ...poolMetrics },
    };
  } catch (error) {
    poolMetrics.connectionErrors++;
    poolMetrics.lastError = error instanceof Error ? error.message : 'Unknown error';
    poolMetrics.lastErrorTime = new Date();
    
    return {
      healthy: false,
      error: poolMetrics.lastError,
      metrics: { ...poolMetrics },
    };
  }
}

/**
 * Get current pool metrics
 */
export function getPoolMetrics(): PoolMetrics {
  return { ...poolMetrics };
}

/**
 * Log pool metrics summary
 * Useful for periodic health checks and monitoring
 */
export function logPoolMetrics(): void {
  const errorRate = poolMetrics.connectionAttempts > 0
    ? ((poolMetrics.connectionErrors / poolMetrics.connectionAttempts) * 100).toFixed(2)
    : '0.00';
  
  const slowQueryRate = poolMetrics.queriesExecuted > 0
    ? ((poolMetrics.slowQueries / poolMetrics.queriesExecuted) * 100).toFixed(2)
    : '0.00';
  
  const failureRate = poolMetrics.queriesExecuted > 0
    ? ((poolMetrics.queriesFailed / poolMetrics.queriesExecuted) * 100).toFixed(2)
    : '0.00';
  
  console.log('[Prisma] Connection pool metrics:', {
    queriesExecuted: poolMetrics.queriesExecuted,
    queriesFailed: poolMetrics.queriesFailed,
    failureRate: `${failureRate}%`,
    slowQueries: poolMetrics.slowQueries,
    slowQueryRate: `${slowQueryRate}%`,
    connectionAttempts: poolMetrics.connectionAttempts,
    connectionErrors: poolMetrics.connectionErrors,
    errorRate: `${errorRate}%`,
    lastError: poolMetrics.lastError || 'none',
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown handler
 * Ensures database connections are properly closed on application exit
 */
export async function disconnectPrisma() {
  console.log('[Prisma] Disconnecting database connections...');
  stopConnectionWarmup();
  logPoolMetrics();
  await prisma.$disconnect();
  console.log('[Prisma] Database connections closed');
}

// Register shutdown handlers
process.on("SIGINT", async () => {
  await disconnectPrisma();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectPrisma();
  process.exit(0);
});

export default prisma;
