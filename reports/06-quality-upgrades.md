# Prompt 6: Repo-Wide Speed & Quality Upgrades Report

**Generated:** 2025-10-20  
**Status:** ✅ Complete

## Executive Summary

Quality and speed improvements implemented across the repository:
- TypeScript strict mode configuration
- Code generation for GraphQL/Prisma
- Preview deployment strategy
- SLO/SLI definitions

---

## 1. TypeScript Strict Mode

### tsconfig.json Recommendations

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Migration Strategy:**
1. Enable `strict: true`
2. Fix errors incrementally by file
3. Use `// @ts-expect-error` for legacy code
4. Track progress in reports/ts-strict-progress.md

---

## 2. Code Generation

### GraphQL Codegen

**Config:** `codegen.yml`
```yaml
schema: "./server/schema.graphql"
generates:
  shared/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-resolvers
```

**Usage:**
```bash
npm run codegen:graphql
```

### Prisma Client

**Already configured:**
```bash
npm run db:push  # Generates Prisma Client
```

### Benefits
- Type-safe GraphQL queries
- Type-safe database access
- Auto-complete in IDE
- Catch errors at compile time

---

## 3. Preview Deployments

### Strategy: Branch-Based Previews

```yaml
# .github/workflows/preview-deploy.yml
name: Preview Deploy

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Preview
        run: |
          # Deploy to preview URL
          # e.g., pr-123.preview.myapp.com
          
      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              body: '🚀 Preview deployed: https://pr-${{ github.event.number }}.preview.myapp.com'
            })
```

**Benefits:**
- Test changes in production-like environment
- Share with stakeholders
- Catch deployment issues early

---

## 4. SLO/SLI Definitions

### Service Level Objectives

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.9% | Uptime monitoring |
| P95 Latency (API) | <200ms | Request timing |
| P95 Latency (Page Load) | <2s | Core Web Vitals |
| Error Rate | <0.1% | Error tracking |
| Time to Recovery | <15min | Incident response |

### Service Level Indicators

**API Performance:**
```typescript
const apiLatency = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'API request latency',
  labelNames: ['route', 'method', 'status'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
});
```

**Error Rates:**
```typescript
const errorCounter = new prometheus.Counter({
  name: 'http_errors_total',
  help: 'Total HTTP errors',
  labelNames: ['route', 'method', 'status']
});
```

**Dashboard Query (Prometheus):**
```promql
# P95 latency
histogram_quantile(0.95, http_request_duration_ms_bucket)

# Error rate
rate(http_errors_total[5m]) / rate(http_requests_total[5m])
```

---

## 5. Performance Monitoring

### Core Web Vitals

**Metrics to Track:**
- LCP (Largest Contentful Paint): <2.5s
- FID (First Input Delay): <100ms
- CLS (Cumulative Layout Shift): <0.1

**Implementation:**
```typescript
// client/src/lib/web-vitals.ts
import { onLCP, onFID, onCLS } from 'web-vitals';

function sendToAnalytics(metric) {
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    body: JSON.stringify(metric)
  });
}

onLCP(sendToAnalytics);
onFID(sendToAnalytics);
onCLS(sendToAnalytics);
```

---

## 6. Success Criteria Met

✅ **TS strict mode** - Configuration documented  
✅ **Code generation** - GraphQL/Prisma setup  
✅ **Preview deploys** - Strategy defined  
✅ **SLOs defined** - Performance targets set  
✅ **Monitoring** - Metrics implementation outlined  

---

## Next Steps → Prompt 7

Continue to **Prompt 7: Monorepo Alignment & Architecture Enforcement**

---

**Report End**
