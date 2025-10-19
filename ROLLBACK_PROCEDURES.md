# 🔄 Upfirst Platform - Rollback Procedures

## Emergency Rollback Guide for Migration Phases

This document outlines rollback procedures for each phase of the Upfirst platform migration to ensure we can safely revert changes if issues arise.

---

## 🚨 General Rollback Principles

1. **Always have a backup** before major changes
2. **Test rollback procedures** before each phase
3. **Monitor metrics** for 24-48 hours after changes
4. **Keep old code** for at least 2 weeks post-migration
5. **Document all changes** for audit trail

---

## 📊 Rollback Decision Matrix

| Metric | Threshold | Action |
|--------|-----------|---------|
| Error Rate | > 0.5% | Consider rollback |
| Response Time | > 20% slower | Investigate, possible rollback |
| Payment Failures | > 0.1% | **Immediate rollback** |
| Data Inconsistency | Any instance | **Immediate rollback** |
| User Complaints | > 5 per hour | Consider rollback |

---

## Phase 0: Docker Environment Rollback

### Current State
- Docker development environment
- NGINX API gateway
- Health check endpoints

### Rollback Procedure (< 5 minutes)

```bash
# 1. Stop all Docker containers
docker-compose down

# 2. Revert to original development setup
npm install
npm run dev

# 3. Verify application is running
curl http://localhost:5000/api/health
```

### Verification Steps
- ✅ Application starts on port 5000
- ✅ Database connection works
- ✅ API endpoints respond
- ✅ Frontend loads correctly

### Files to Revert (if needed)
```bash
git checkout HEAD -- server/index.ts  # Remove health check endpoint
rm docker-compose.yml
rm Dockerfile.legacy
rm nginx.conf
rm .dockerignore
```

---

## Phase 1: Prisma Migration Rollback

### Risk Level: MEDIUM
Dual-write strategy minimizes risk

### Pre-Migration Backup

```bash
# 1. Backup entire database
pg_dump -h localhost -U postgres upfirst_dev > backups/pre-prisma-$(date +%Y%m%d).sql

# 2. Backup Drizzle schema
cp -r shared/schema.ts backups/drizzle-schema-$(date +%Y%m%d).ts

# 3. Tag git commit
git tag -a phase1-pre-migration -m "Before Prisma migration"
git push origin phase1-pre-migration
```

### Rollback Procedure (< 30 minutes)

#### Scenario A: Prisma reads failing

```bash
# 1. Disable Prisma reads, keep Drizzle
# In server/storage.ts or service layer:
const USE_PRISMA = false;  # Feature flag

# 2. Restart application
docker-compose restart legacy-app

# 3. Monitor for 1 hour
# If stable, investigate Prisma issue
```

#### Scenario B: Dual-write causing issues

```bash
# 1. Stop dual-write
# Remove Prisma write operations in code

# 2. Verify data consistency
SELECT COUNT(*) FROM products;  # Check both ORMs

# 3. Fix inconsistencies
# Run data reconciliation script

# 4. Re-enable Prisma in read-only mode
```

#### Scenario C: Complete rollback to Drizzle

```bash
# 1. Remove Prisma dependencies
npm uninstall prisma @prisma/client

# 2. Revert code changes
git revert <phase1-commits>

# 3. Restore database if needed
psql -U postgres upfirst_dev < backups/pre-prisma-YYYYMMDD.sql

# 4. Run Drizzle migrations
npm run db:push

# 5. Restart application
docker-compose restart legacy-app
```

### Verification Steps
- ✅ All CRUD operations work
- ✅ No data loss detected
- ✅ Performance metrics normal
- ✅ Error rates < 0.1%

---

## Phase 2: NestJS GraphQL Rollback

### Risk Level: HIGH
New backend running in parallel

### Pre-Migration Backup

```bash
# 1. Full database backup
pg_dump -h localhost -U postgres upfirst_dev > backups/pre-nestjs-$(date +%Y%m%d).sql

# 2. Document current traffic distribution
# Record baseline metrics:
# - Request volume per endpoint
# - Average response times
# - Error rates

# 3. Tag git commit
git tag -a phase2-pre-migration -m "Before NestJS migration"
```

### Rollback Procedure (< 1 hour)

#### Scenario A: GraphQL errors spike

```bash
# 1. Route all traffic back to Express (NGINX config)
# In nginx.conf, comment out NestJS routes:

location /graphql {
    # Temporarily disabled
    # proxy_pass http://nest_backend;
    return 503 "GraphQL temporarily unavailable";
}

# 2. Reload NGINX
docker-compose exec nginx-gateway nginx -s reload

# 3. All traffic now goes to Express REST API
# Clients using GraphQL will get 503, need REST fallback
```

#### Scenario B: NestJS service crashing

```bash
# 1. Stop NestJS container
docker-compose stop nest-server

# 2. Verify Express handles all traffic
docker-compose logs -f legacy-app

# 3. Investigate NestJS logs
docker-compose logs nest-server > nestjs-crash-logs.txt

# 4. Fix and redeploy when ready
```

#### Scenario C: Complete removal of NestJS

```bash
# 1. Stop and remove NestJS
docker-compose down nest-server
docker rmi upfirst-nest

# 2. Update docker-compose.yml
# Comment out nest-server service

# 3. Update NGINX config
# Remove all /graphql routes

# 4. Reload gateway
docker-compose exec nginx-gateway nginx -s reload

# 5. Revert code changes
git revert <phase2-commits>
```

### Verification Steps
- ✅ All REST endpoints working
- ✅ No GraphQL traffic routing
- ✅ Database connections stable
- ✅ No performance degradation

---

## Phase 3: Next.js Frontend Rollback

### Risk Level: HIGH
User-facing changes

### Pre-Migration Backup

```bash
# 1. Backup current Vite build
cp -r dist backups/vite-dist-$(date +%Y%m%d)

# 2. Document current bundle sizes
du -sh client/  # Record for comparison

# 3. Screenshot all pages
# Use automated screenshot tool

# 4. Tag git commit
git tag -a phase3-pre-migration -m "Before Next.js migration"
```

### Rollback Procedure (< 2 hours)

#### Scenario A: Next.js pages broken

```bash
# 1. Route traffic back to Vite (NGINX)
# In nginx.conf:

location / {
    proxy_pass http://legacy-app:3000;  # Vite frontend
    # proxy_pass http://next-client:3000;  # Commented out
}

# 2. Reload NGINX
docker-compose exec nginx-gateway nginx -s reload

# 3. All users see old Vite frontend
```

#### Scenario B: Material UI styling issues

```bash
# 1. Quick CSS fix deployment
# Add override CSS to fix critical issues

# 2. Or route specific broken pages back to Vite
# Use NGINX location blocks:

location /seller/products {
    proxy_pass http://legacy-app:3000;  # Old page
}

location /seller/orders {
    proxy_pass http://next-client:3000;  # New page
}
```

#### Scenario C: Complete Next.js removal

```bash
# 1. Stop Next.js container
docker-compose down next-client

# 2. Update NGINX to route all to Vite
# Remove Next.js proxy config

# 3. Restart legacy app to serve frontend
docker-compose restart legacy-app

# 4. Revert all frontend code
git revert <phase3-commits>

# 5. Rebuild Vite
docker-compose exec legacy-app npm run build
```

### Verification Steps
- ✅ All pages accessible
- ✅ Styling looks correct
- ✅ Forms submit properly
- ✅ Navigation works
- ✅ Mobile responsive

---

## Phase 4: Integration Migration Rollback

### Risk Level: CRITICAL
External services (Stripe, Shippo, etc.)

### Pre-Migration Backup

```bash
# 1. Document current webhook configurations
# Record all webhook URLs, secrets, endpoints

# 2. Backup integration configurations
# Export Stripe webhook settings
# Document Shippo API setup
# Save Meta Ads credentials

# 3. Test webhook delivery
# Verify all webhooks reach correct endpoints
```

### Rollback Procedure (< 30 minutes)

#### Scenario A: Stripe webhook failures

```bash
# CRITICAL: Payment failures require immediate action

# 1. Route webhooks back to Express
# In NGINX:
location /api/stripe/webhook {
    proxy_pass http://legacy-app:3000;  # Old handler
}

# 2. Verify webhook signature validation
curl -X POST http://localhost/api/stripe/webhook \
  -H "stripe-signature: test"

# 3. Check Stripe dashboard for failed webhooks
# Retry failed webhooks manually if needed
```

#### Scenario B: Email sending fails

```bash
# 1. Switch back to old email service
# Feature flag in code:
const USE_NEW_EMAIL_SERVICE = false;

# 2. Restart services
docker-compose restart

# 3. Test email delivery
# Send test email to verify
```

#### Scenario C: Complete integration rollback

```bash
# 1. Update all webhook URLs in external services
# Stripe dashboard → Update webhook URL
# Shippo dashboard → Update callback URL

# 2. Revert integration code
git revert <integration-commits>

# 3. Deploy old integration handlers
docker-compose restart legacy-app

# 4. Verify all webhooks working
# Monitor for 24 hours
```

### Verification Steps
- ✅ Stripe payments process
- ✅ Webhooks deliver successfully
- ✅ Emails send correctly
- ✅ Shipping labels generate
- ✅ No payment failures

---

## Phase 5: Cutover Rollback

### Risk Level: CRITICAL
Full production migration

### Blue/Green Deployment Rollback

```bash
# At any point during cutover:

# 1. Shift traffic back to blue (old stack)
# Update load balancer / DNS:
# blue.upfirst.io (old) - 100% traffic
# green.upfirst.io (new) - 0% traffic

# 2. Keep green environment running for investigation
# Don't tear down immediately

# 3. Monitor for 48 hours
# If stable, investigate green issues offline
```

### Emergency Rollback (< 15 minutes)

```bash
# CRITICAL: Production down, immediate action needed

# 1. DNS failover to old stack
# Update DNS A record to old server IP
# TTL: 60 seconds for quick propagation

# 2. Database connection switch
# Update DATABASE_URL to old database connection pool

# 3. Disable new services
docker-compose down nest-server next-client

# 4. Restart legacy stack
docker-compose restart legacy-app postgres redis

# 5. Verify critical paths
# - User login ✓
# - Product viewing ✓
# - Checkout ✓
# - Payment ✓

# 6. Communicate to team
# Send alert: "Rolled back to legacy stack, investigating"
```

### Data Reconciliation After Rollback

```bash
# If data was written to new stack during cutover:

# 1. Export new data
pg_dump green_database > new_stack_data.sql

# 2. Merge into old database
# Write custom migration script to merge orders, users, etc.
# Preserve all data, no loss tolerance

# 3. Verify no duplicates
SELECT id, COUNT(*) FROM orders GROUP BY id HAVING COUNT(*) > 1;
```

---

## 📋 Rollback Checklist

### Before Rollback
- [ ] Identify root cause of issue
- [ ] Assess impact (users affected, data at risk)
- [ ] Notify team of rollback decision
- [ ] Verify backup availability
- [ ] Document current state

### During Rollback
- [ ] Execute rollback procedure (phase-specific)
- [ ] Monitor rollback progress
- [ ] Verify each step completes successfully
- [ ] Check for errors in logs
- [ ] Test critical user flows

### After Rollback
- [ ] Verify system stability (24 hours)
- [ ] Check data consistency
- [ ] Review error logs
- [ ] Document what went wrong
- [ ] Plan fixes before retry
- [ ] Communicate to stakeholders

---

## 🔍 Post-Rollback Analysis

After any rollback:

1. **Root Cause Analysis** (within 48 hours)
   - What triggered the rollback?
   - Why didn't testing catch it?
   - What could prevent this in the future?

2. **Data Integrity Check**
   - Run consistency checks
   - Verify no data loss
   - Check for duplicates

3. **Timeline Document**
   - When issue was detected
   - When rollback was decided
   - When rollback completed
   - When stability was confirmed

4. **Lessons Learned**
   - Update testing procedures
   - Improve monitoring
   - Enhance rollback automation

---

## 🚀 Rollback Prevention

Best practices to avoid needing rollbacks:

1. **Comprehensive Testing**
   - Unit tests (>80% coverage)
   - Integration tests
   - E2E tests (Playwright)
   - Load testing

2. **Gradual Rollouts**
   - 1% → 5% → 25% → 50% → 100%
   - Monitor each stage for 24 hours

3. **Feature Flags**
   - Toggle new features on/off
   - A/B test major changes
   - Kill switch for emergencies

4. **Monitoring & Alerts**
   - Error rate alerts
   - Performance degradation alerts
   - Payment failure alerts
   - Automated rollback triggers

---

## 📞 Escalation Contacts

| Issue Type | Contact | Response Time |
|-----------|---------|---------------|
| Payment Failures | Stripe Support + CTO | < 15 min |
| Data Loss | Database Admin + CTO | < 5 min |
| Security Breach | Security Team + CEO | < 1 min |
| Performance Degradation | DevOps Lead | < 30 min |
| General Issues | Tech Lead | < 1 hour |

---

**Last Updated:** January 2025  
**Document Version:** 1.0  
**Review Frequency:** Before each migration phase  
**Owner:** DevOps Team / Tech Lead
