# API Gateway Proxy Architecture

**ADR-001: Express-to-GraphQL Migration Proxy Layer**

**Date:** October 19, 2025  
**Status:** Accepted  
**Author:** Architecture Team  
**Phase:** 1 (Scaffold) - Infrastructure Only

---

## Executive Summary

This document describes the API Gateway Proxy Layer that enables gradual, zero-downtime migration from Express REST endpoints to NestJS GraphQL service. The proxy sits in front of existing routes, uses feature flags to determine routing, and provides comprehensive observability.

**Current State (Phase 1):** All traffic routes to existing REST handlers (no-op behavior)  
**Future State (Phase 3):** Gradual migration to GraphQL via feature flag configuration

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Architecture Overview](#architecture-overview)
3. [System Design](#system-design)
4. [Feature Flag Strategy](#feature-flag-strategy)
5. [Session Sharing](#session-sharing)
6. [Error Handling](#error-handling)
7. [Monitoring & Observability](#monitoring--observability)
8. [Migration Strategy](#migration-strategy)
9. [Implementation Phases](#implementation-phases)
10. [Security Considerations](#security-considerations)
11. [Performance Impact](#performance-impact)
12. [Future Enhancements](#future-enhancements)

---

## Problem Statement

### Background

The Upfirst platform currently uses Express.js with REST API endpoints. We need to migrate to NestJS with GraphQL for:

- **Better type safety:** GraphQL schema provides strong typing
- **Reduced over-fetching:** Clients request exactly what they need
- **API consolidation:** Single endpoint for all queries/mutations
- **Developer experience:** GraphQL tooling (GraphiQL, Apollo DevTools)
- **Future-proofing:** GraphQL is the modern standard for complex APIs

### Challenge

Traditional migration approaches have risks:

- **Big Bang Migration:** High risk, all-or-nothing deployment
- **Dual Maintenance:** Running two separate APIs doubles complexity
- **Breaking Changes:** Clients must update simultaneously
- **Rollback Difficulty:** Hard to revert if issues arise

### Solution

An API Gateway Proxy Layer that:

- ✅ Enables gradual, endpoint-by-endpoint migration
- ✅ Maintains backward compatibility with existing REST clients
- ✅ Allows A/B testing and canary deployments
- ✅ Provides instant rollback via feature flags
- ✅ Zero client-side changes required

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Apps                         │
│              (Frontend, Mobile, Third-party)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ REST API Requests
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express.js Server                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            API Gateway Proxy Middleware               │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │   Feature Flags Service (Hot-Reload)            │  │  │
│  │  │   - Reads config/feature-flags.json             │  │  │
│  │  │   - Watches for file changes                    │  │  │
│  │  │   - Per-endpoint routing decisions              │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                       │                               │  │
│  │          ┌────────────┴────────────┐                  │  │
│  │          ▼                         ▼                  │  │
│  │  ┌──────────────┐         ┌──────────────┐           │  │
│  │  │ useGraphQL:  │         │ useGraphQL:  │           │  │
│  │  │    false     │         │    true      │           │  │
│  │  └──────┬───────┘         └──────┬───────┘           │  │
│  │         │                        │                    │  │
│  └─────────┼────────────────────────┼────────────────────┘  │
│            │                        │                       │
│            │                        │                       │
│            ▼                        ▼                       │
│  ┌──────────────────┐    ┌──────────────────────┐          │
│  │   REST Routes    │    │  GraphQL Adapter     │          │
│  │   (Existing)     │    │  - REST → GraphQL    │          │
│  │                  │    │  - GraphQL → REST    │          │
│  │  ▪ Products      │    └──────────┬───────────┘          │
│  │  ▪ Orders        │               │                      │
│  │  ▪ Cart          │               │ HTTP POST            │
│  │  ▪ Wholesale     │               ▼                      │
│  │  ▪ Payments      │    ┌──────────────────────┐          │
│  │  ▪ Users         │    │   NestJS GraphQL     │          │
│  └──────────────────┘    │      Service         │          │
│                          │  (Phase 3 Deploy)    │          │
└──────────────────────────┴──────────────────────┴──────────┘
```

### Request Flow

#### Phase 1 (Current): All requests to REST

```
Client Request
    ↓
Proxy Middleware
    ├─ Check feature flag → useGraphQL: false
    ├─ Log: "Routing to REST"
    └─ Pass to existing REST routes
         ↓
    REST Handler (existing code)
         ↓
    Response to Client
```

#### Phase 3 (Future): GraphQL-enabled endpoint

```
Client Request (REST format)
    ↓
Proxy Middleware
    ├─ Check feature flag → useGraphQL: true
    ├─ Log: "Routing to GraphQL"
    └─ GraphQL Adapter
         ├─ Convert REST → GraphQL query
         ├─ Add auth headers (JWT)
         └─ HTTP POST to NestJS
              ↓
         NestJS GraphQL Service
              ├─ Validate JWT
              ├─ Execute query
              └─ Return GraphQL response
                   ↓
         GraphQL Adapter
              └─ Convert GraphQL → REST format
                   ↓
    Response to Client (REST format)
```

---

## System Design

### Components

#### 1. Proxy Middleware (`server/middleware/proxy.middleware.ts`)

**Responsibilities:**
- Intercept all `/api/*` requests
- Query feature flags for routing decision
- Route to REST or GraphQL based on configuration
- Capture metrics (latency, errors, backend used)
- Support shadow traffic (dual routing for testing)

**Key Methods:**
- `proxyMiddleware()` - Main Express middleware
- `routeToREST()` - Pass through to existing routes
- `routeToGraphQL()` - Proxy to NestJS service
- `routeToBoth()` - Shadow traffic (testing mode)
- `normalizeEndpoint()` - Map dynamic routes to config keys

#### 2. Feature Flags Service (`server/services/feature-flags.service.ts`)

**Responsibilities:**
- Load configuration from JSON file
- Hot-reload on file changes (no server restart)
- Provide routing decisions per endpoint
- Support percentage-based rollouts
- Log configuration changes

**Key Methods:**
- `isGraphQLEnabled(endpoint)` - Check if GraphQL is enabled
- `isShadowTrafficEnabled(endpoint)` - Check shadow mode
- `getNestJsServiceUrl()` - Get GraphQL endpoint
- `getConfig()` - Get full configuration (debugging)

**Configuration Schema:**
```typescript
interface FeatureFlagsConfig {
  endpoints: Record<string, {
    useGraphQL: boolean;
    shadowTraffic?: boolean;
    rolloutPercentage?: number; // 0-100
  }>;
  globalSettings: {
    nestJsServiceUrl: string;
    enableShadowTraffic: boolean;
    defaultTimeout?: number;
  };
}
```

#### 3. GraphQL Adapter (`server/adapters/graphql-adapter.ts`)

**Responsibilities:**
- Convert REST requests to GraphQL queries/mutations
- Convert GraphQL responses to REST format
- Handle error mapping (GraphQL errors → HTTP status codes)
- Unwrap Relay-style pagination
- Transform field names if needed

**Key Methods:**
- `restToGraphQL(req)` - Build GraphQL query from REST request
- `graphQLToRest(response)` - Transform GraphQL response to REST
- `buildGraphQLQuery()` - Route-specific query builders
- `mapGraphQLErrorToHttpStatus()` - Error translation

**Supported Mappings (Phase 3):**
| REST Endpoint | GraphQL Query/Mutation |
|---------------|------------------------|
| `GET /api/products` | `query GetProducts` |
| `GET /api/products/:id` | `query GetProduct($id)` |
| `POST /api/products` | `mutation CreateProduct` |
| `PATCH /api/products/:id` | `mutation UpdateProduct` |
| `DELETE /api/products/:id` | `mutation DeleteProduct` |
| `GET /api/orders` | `query GetOrders` |
| `GET /api/orders/:id` | `query GetOrder($id)` |
| `POST /api/orders` | `mutation CreateOrder` |

---

## Feature Flag Strategy

### Configuration File (`config/feature-flags.json`)

**Location:** `config/feature-flags.json`  
**Hot-Reload:** Yes (watches file for changes)  
**Format:** JSON

**Example Configuration:**

```json
{
  "endpoints": {
    "/api/products": {
      "useGraphQL": false,
      "shadowTraffic": false,
      "rolloutPercentage": 0
    },
    "/api/products/:id": {
      "useGraphQL": false,
      "shadowTraffic": false,
      "rolloutPercentage": 0
    },
    "/api/orders": {
      "useGraphQL": false,
      "shadowTraffic": false,
      "rolloutPercentage": 0
    }
  },
  "globalSettings": {
    "nestJsServiceUrl": "http://localhost:4000/graphql",
    "enableShadowTraffic": false,
    "defaultTimeout": 30000
  }
}
```

### Migration Workflow (Phase 3)

#### Step 1: Enable Shadow Traffic

Test GraphQL in parallel without affecting production:

```json
{
  "endpoints": {
    "/api/products": {
      "useGraphQL": false,
      "shadowTraffic": true  // ← Send to both, use REST response
    }
  }
}
```

**Behavior:** 
- Primary: REST (used for response)
- Secondary: GraphQL (logged for comparison)
- No impact to clients

#### Step 2: Canary Rollout

Gradually shift traffic to GraphQL:

```json
{
  "endpoints": {
    "/api/products": {
      "useGraphQL": true,
      "rolloutPercentage": 10  // ← 10% to GraphQL, 90% to REST
    }
  }
}
```

**Behavior:**
- 10% of requests → GraphQL
- 90% of requests → REST
- Monitor error rates, latency

#### Step 3: Full Migration

Once validated, shift 100% of traffic:

```json
{
  "endpoints": {
    "/api/products": {
      "useGraphQL": true,
      "rolloutPercentage": 100
    }
  }
}
```

#### Step 4: Instant Rollback

If issues arise, immediately revert:

```json
{
  "endpoints": {
    "/api/products": {
      "useGraphQL": false  // ← Instant rollback, no deployment
    }
  }
}
```

**Rollback Time:** < 1 second (hot-reload)

---

## Session Sharing

### Authentication Strategy

**Approach:** JWT-based authentication shared between Express and NestJS

#### Current State (Express)

- Uses Replit Auth integration
- Session stored in PostgreSQL via `connect-pg-simple`
- User identity in `req.user` (populated by `requireAuth` middleware)

#### Future State (Express + NestJS)

**Shared JWT Token:**

```typescript
// Express: Generate JWT when user logs in
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    userType: user.userType,
  },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// NestJS: Validate JWT in GraphQL resolver
@UseGuards(JwtAuthGuard)
@Query(() => User)
async currentUser(@CurrentUser() user: JWTPayload) {
  return this.userService.findById(user.userId);
}
```

**Token Flow:**

```
1. Client logs in via Express → JWT issued
2. Client includes JWT in Authorization header
3. Proxy middleware forwards JWT to NestJS
4. NestJS validates JWT and executes query
5. Response returned through proxy
```

**Security:**
- Shared `JWT_SECRET` environment variable
- Same token expiration policy
- Same refresh token mechanism
- HTTPS only (enforced by security middleware)

---

## Error Handling

### Error Translation

GraphQL errors must be mapped to REST-compatible HTTP status codes:

| GraphQL Error Code | HTTP Status | REST Message |
|-------------------|-------------|--------------|
| `UNAUTHENTICATED` | 401 | Unauthorized |
| `FORBIDDEN` | 403 | Forbidden |
| `NOT_FOUND` | 404 | Not Found |
| `BAD_USER_INPUT` | 400 | Bad Request |
| `INTERNAL_SERVER_ERROR` | 500 | Internal Server Error |

### Fallback Strategy

If GraphQL service is unavailable:

```typescript
async function routeToGraphQL(req, res, next, metrics) {
  try {
    // Attempt GraphQL routing
    const response = await axios.post(nestJsUrl, graphqlRequest);
    return res.json(response.data);
  } catch (error) {
    logger.error('[Proxy] GraphQL failed, falling back to REST', {
      error: error.message,
      endpoint: req.path,
    });
    
    // Automatic fallback to REST
    return routeToREST(req, res, next, metrics);
  }
}
```

**Fallback guarantees:**
- Zero downtime if GraphQL service crashes
- Automatic degradation to REST
- Alerts triggered for engineering team
- Feature flag automatically disabled after 3 consecutive failures

---

## Monitoring & Observability

### Structured Logging

All proxy operations are logged with structured metadata:

```typescript
logger.info('[Proxy] Request routed to REST', {
  method: 'GET',
  endpoint: '/api/products',
  backend: 'REST',
  statusCode: 200,
  durationMs: 45,
  graphqlEnabled: false,
  shadowTraffic: false,
});

logger.info('[Proxy] Request routed to GraphQL', {
  method: 'POST',
  endpoint: '/api/orders',
  backend: 'GraphQL',
  statusCode: 200,
  durationMs: 120,
  graphqlEnabled: true,
  shadowTraffic: false,
});
```

### Metrics Tracked

Per-endpoint metrics:

- **Request Count:** Total requests per backend
- **Latency:** p50, p95, p99 response times
- **Error Rate:** Errors per backend
- **Fallback Rate:** How often GraphQL falls back to REST
- **Shadow Mismatch Rate:** Differences between REST and GraphQL responses

### Dashboard Queries

**Example queries for log aggregation:**

```sql
-- Request distribution by backend
SELECT 
  backend, 
  COUNT(*) as request_count 
FROM proxy_logs 
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY backend;

-- Average latency by backend
SELECT 
  backend, 
  AVG(duration_ms) as avg_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_latency
FROM proxy_logs 
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY backend;

-- Error rate by backend
SELECT 
  backend, 
  COUNT(*) FILTER (WHERE status_code >= 500) as errors,
  COUNT(*) as total,
  (COUNT(*) FILTER (WHERE status_code >= 500)::float / COUNT(*)) as error_rate
FROM proxy_logs 
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY backend;
```

### Periodic Stats Logging

Every 5 minutes, proxy configuration is logged:

```typescript
logger.info('[Proxy] Current configuration', {
  totalEndpoints: 15,
  graphqlEnabled: 3,
  shadowTrafficGlobal: false,
  nestJsUrl: 'http://localhost:4000/graphql',
  enabledEndpoints: [
    '/api/products',
    '/api/orders',
    '/api/cart'
  ],
});
```

---

## Migration Strategy

### Recommended Migration Order

Migrate endpoints from lowest to highest risk:

#### Tier 1: Read-Only, Low Traffic (Week 1-2)

- `GET /api/products` - Product catalog browsing
- `GET /api/products/:id` - Product details
- `GET /api/categories` - Category listings

**Risk:** Low (read-only, cacheable)  
**Rollout:** 10% → 50% → 100%

#### Tier 2: Read-Heavy, Medium Traffic (Week 3-4)

- `GET /api/orders` - Order history
- `GET /api/orders/:id` - Order details
- `GET /api/cart` - Cart retrieval

**Risk:** Medium (user-specific data)  
**Rollout:** 5% → 25% → 100%

#### Tier 3: Write Operations (Week 5-6)

- `POST /api/cart/add` - Add to cart
- `PATCH /api/cart/update` - Update quantities
- `POST /api/orders` - Place order

**Risk:** High (modifies data)  
**Rollout:** 1% → 10% → 50% → 100%

#### Tier 4: Critical Operations (Week 7-8)

- `POST /api/checkout` - Payment processing
- `POST /api/refunds` - Refund processing
- `POST /api/wholesale/checkout` - B2B orders

**Risk:** Very High (financial transactions)  
**Rollout:** Shadow traffic → 1% → 5% → 25% → 100%

### Validation Criteria

Before increasing rollout percentage:

✅ **Error Rate:** < 0.1% (same as REST baseline)  
✅ **Latency:** p95 < REST p95 + 50ms  
✅ **Data Consistency:** 100% match in shadow traffic  
✅ **No Customer Complaints:** Zero reports of issues

---

## Implementation Phases

### Phase 1: Proxy Scaffold ✅ (Current)

**Status:** Completed  
**Timeline:** Week 1

**Deliverables:**
- ✅ Proxy middleware created
- ✅ Feature flags service with hot-reload
- ✅ Configuration file structure
- ✅ GraphQL adapter interfaces (stubs)
- ✅ Structured logging
- ✅ Documentation (this file)

**Behavior:** All traffic routes to REST (no-op)

### Phase 2: NestJS Service Development (Future)

**Status:** Not Started  
**Timeline:** Weeks 2-4

**Deliverables:**
- NestJS GraphQL service scaffold
- GraphQL schema matching REST API
- Authentication integration (JWT)
- Database connection (same Postgres)
- Resolvers for Tier 1 endpoints
- Unit tests, integration tests

### Phase 3: Active Proxy + Migration (Future)

**Status:** Not Started  
**Timeline:** Weeks 5-8

**Deliverables:**
- Complete GraphQL adapter implementation
- Shadow traffic testing
- Canary rollouts (Tier 1 → Tier 4)
- Monitoring dashboards
- Incident response playbooks
- Full migration of all endpoints

### Phase 4: REST Deprecation (Future)

**Status:** Not Started  
**Timeline:** Weeks 9-12

**Deliverables:**
- Deprecation warnings in REST responses
- Client migration guide
- Sunset timeline announcement
- Remove REST routes
- Remove proxy layer (GraphQL only)

---

## Security Considerations

### Authentication

- **JWT Validation:** Both Express and NestJS validate JWT
- **Secret Rotation:** Shared secret can be rotated without downtime
- **Session Hijacking:** Same protections as current REST API

### Authorization

- **Permission Checks:** Same authorization logic in both backends
- **Resource Access:** User can only access their own data
- **Admin Privileges:** Same role-based access control

### Data Validation

- **Input Sanitization:** GraphQL schema provides type validation
- **SQL Injection:** Protected by Prisma ORM (parameterized queries)
- **XSS Protection:** Same sanitization middleware

### Rate Limiting

- **Proxy Layer:** Rate limiting applied BEFORE proxy decision
- **Shared Limits:** Same rate limits for REST and GraphQL
- **DDoS Protection:** Existing security middleware applies

---

## Performance Impact

### Latency Analysis

#### Phase 1 (Current)

**Overhead:** ~1-2ms per request

```
Client → Proxy → Feature Flag Check → REST Handler → Response
         (1ms)   (0.5ms)              (existing)
```

**Impact:** Negligible (< 5% increase)

#### Phase 3 (GraphQL Enabled)

**Overhead:** ~10-30ms per request

```
Client → Proxy → Feature Flag → Adapter → HTTP to NestJS → GraphQL → Response
         (1ms)   (0.5ms)       (5ms)      (10-20ms)        (existing)
```

**Impact:** Moderate (10-20% increase)

**Mitigation:**
- Keep Express and NestJS on same machine (localhost)
- Use HTTP/2 for multiplexing
- Enable response caching in NestJS
- Optimize GraphQL resolvers with DataLoader

### Memory Impact

- **Feature Flags Service:** ~1MB (in-memory config)
- **Proxy Middleware:** No persistent state
- **GraphQL Adapter:** Stateless, minimal overhead

**Total Impact:** < 5MB additional memory

### CPU Impact

- **Feature Flag Lookups:** O(1) hash map lookup
- **REST → GraphQL Transformation:** O(n) where n = request body size
- **JSON Parsing:** Same as existing REST

**Total Impact:** < 2% CPU increase

---

## Future Enhancements

### Redis-Based Feature Flags

**Why:** Centralized configuration across multiple servers

```typescript
// Current: File-based (single server)
const config = fs.readFileSync('config/feature-flags.json');

// Future: Redis-based (distributed)
const config = await redis.get('feature-flags');
```

**Benefits:**
- Instant updates across all servers
- A/B testing per user
- Dynamic rollout percentages

### GraphQL Subscriptions

**Why:** Real-time updates (e.g., order status changes)

```graphql
subscription OrderUpdated($orderId: ID!) {
  orderUpdated(orderId: $orderId) {
    id
    status
    updatedAt
  }
}
```

**Implementation:**
- WebSocket connection to NestJS
- Server-sent events fallback
- Automatic reconnection

### Request Deduplication

**Why:** Prevent duplicate GraphQL requests

```typescript
// If two clients request same data within 100ms
// Only execute GraphQL query once, share result
const cachedResult = await requestCache.get(cacheKey);
if (cachedResult) {
  return cachedResult;
}
```

**Benefits:**
- Reduced database load
- Faster response times
- Lower costs

### Automatic Schema Sync

**Why:** Keep GraphQL schema in sync with REST API

```typescript
// Generate GraphQL schema from REST OpenAPI spec
const graphqlSchema = await generateSchemaFromOpenAPI('./openapi.json');
```

**Benefits:**
- No manual schema writing
- Guaranteed parity between REST and GraphQL
- Easier testing

---

## Conclusion

The API Gateway Proxy Layer provides a safe, observable, and reversible path to migrate from Express REST to NestJS GraphQL. By using feature flags, we can:

- ✅ Migrate gradually, one endpoint at a time
- ✅ Test in production with shadow traffic
- ✅ Roll back instantly if issues arise
- ✅ Maintain backward compatibility
- ✅ Avoid big bang deployments

**Current State:** Infrastructure in place, all traffic to REST  
**Next Steps:** Build NestJS GraphQL service (Phase 2)  
**Timeline:** 8-12 weeks to full migration

---

## References

- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [NestJS GraphQL Documentation](https://docs.nestjs.com/graphql/quick-start)
- [Feature Flags at Scale](https://martinfowler.com/articles/feature-toggles.html)
- [Zero-Downtime Deployments](https://github.com/readme/guides/blue-green-deployment)

---

**Last Updated:** October 19, 2025  
**Maintained By:** Engineering Team  
**Review Cycle:** Monthly
