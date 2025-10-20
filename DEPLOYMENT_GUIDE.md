# Upfirst Deployment Guide

## Quick Start

This guide covers deploying the complete Upfirst stack (Next.js + NestJS + PostgreSQL) using Docker.

---

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Node.js 20+ (for local development)
- PostgreSQL 16 (if running without Docker)
- 4GB+ RAM for Docker containers

---

## Option 1: Docker Deployment (Recommended)

### 1. Clone Repository
```bash
git clone <repository-url>
cd upfirst
```

### 2. Environment Configuration

Create environment files for each service:

#### PostgreSQL (.env)
```bash
POSTGRES_USER=upfirst
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=upfirst
```

#### NestJS API (apps/nest-api/.env)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://upfirst:your_secure_password_here@postgres:5432/upfirst
PORT=4000
SESSION_SECRET=your_session_secret_here
```

#### Next.js Frontend (apps/nextjs/.env.production)
```bash
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

### 3. Build and Run
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Verify Deployment
```bash
# Check all services are running
docker-compose ps

# Should see 4 services:
# - upfirst-postgres (port 5432)
# - upfirst-nest-api (port 4000)
# - upfirst-vite-frontend (port 5000)
# - upfirst-nextjs-frontend (port 3000)
```

### 5. Access Applications
- **Next.js Frontend**: http://localhost:3000
- **GraphQL Playground**: http://localhost:4000/graphql
- **Vite Frontend (Legacy)**: http://localhost:5000
- **PostgreSQL**: localhost:5432

### 6. Initialize Database
```bash
# Run Prisma migrations
docker-compose exec nest-api npx prisma migrate deploy

# Seed database (optional)
docker-compose exec nest-api npx prisma db seed
```

---

## Option 2: Local Development (Without Docker)

### 1. Install Dependencies
```bash
# Root dependencies
npm install

# Next.js dependencies (if needed)
cd apps/nextjs && npm install && cd ../..
```

### 2. Setup PostgreSQL
```bash
# Create database
createdb upfirst

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:password@localhost:5432/upfirst"
```

### 3. Run Migrations
```bash
npm run db:push
```

### 4. Start Services

**Terminal 1 - Vite/Express (Port 5000)**:
```bash
npm run dev
```

**Terminal 2 - NestJS API (Port 4000)**:
```bash
cd apps/nest-api
npm run start:dev
```

**Terminal 3 - Next.js (Port 3000)**:
```bash
cd apps/nextjs
npm run dev
```

### 5. Access Applications
- Next.js: http://localhost:3000
- GraphQL: http://localhost:4000/graphql
- Express API: http://localhost:5000

---

## Cloud Deployment

### AWS Deployment (ECS + RDS)

#### 1. Build Docker Images
```bash
# Build and tag images
docker build -f apps/nest-api/Dockerfile -t upfirst-nest-api:latest .
docker build -f apps/nextjs/Dockerfile -t upfirst-nextjs:latest .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag upfirst-nest-api:latest <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com/upfirst-nest-api:latest
docker push <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com/upfirst-nest-api:latest
```

#### 2. Create RDS PostgreSQL Instance
- Engine: PostgreSQL 16
- Instance class: db.t3.micro (minimum)
- Storage: 20GB SSD
- Multi-AZ: Yes (production)
- Backup retention: 7 days

#### 3. Configure Environment Variables in ECS
```bash
DATABASE_URL=postgresql://username:password@rds-endpoint:5432/upfirst
NEXT_PUBLIC_GRAPHQL_URL=https://api.yourdomain.com/graphql
SESSION_SECRET=<secure-random-string>
```

#### 4. Setup Load Balancer
- Application Load Balancer
- Target groups for each service
- Health checks on /health endpoints

---

### Google Cloud Platform (GCP)

#### 1. Create Cloud SQL Instance
```bash
gcloud sql instances create upfirst-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1
```

#### 2. Deploy to Cloud Run
```bash
# NestJS API
gcloud run deploy upfirst-api \
  --image gcr.io/<project-id>/upfirst-nest-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 4000

# Next.js Frontend
gcloud run deploy upfirst-frontend \
  --image gcr.io/<project-id>/upfirst-nextjs \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000
```

---

### DigitalOcean App Platform

#### 1. Create App Spec (app.yaml)
```yaml
name: upfirst
region: nyc
services:
  - name: nest-api
    github:
      repo: <your-repo>
      branch: main
      deploy_on_push: true
    dockerfile_path: apps/nest-api/Dockerfile
    http_port: 4000
    instance_count: 1
    instance_size_slug: basic-xxs
    
  - name: nextjs-frontend
    github:
      repo: <your-repo>
      branch: main
      deploy_on_push: true
    dockerfile_path: apps/nextjs/Dockerfile
    http_port: 3000
    instance_count: 1
    instance_size_slug: basic-xxs

databases:
  - name: upfirst-db
    engine: PG
    version: "16"
    production: true
```

#### 2. Deploy
```bash
doctl apps create --spec app.yaml
```

---

## Production Configuration

### Environment Variables

#### Required for NestJS API
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
PORT=4000
SESSION_SECRET=<strong-random-secret>

# Optional but recommended
STRIPE_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
GEMINI_API_KEY=...
SHIPPO_API_KEY=...
```

#### Required for Next.js
```bash
NODE_ENV=production
NEXT_PUBLIC_GRAPHQL_URL=https://api.yourdomain.com/graphql
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

### Database Migrations

#### Production Migration Strategy
```bash
# 1. Backup database
pg_dump upfirst > backup.sql

# 2. Run migrations
npx prisma migrate deploy

# 3. Verify
npx prisma db pull
npx prisma generate
```

### SSL/TLS Configuration

#### Nginx Reverse Proxy
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Next.js Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # NestJS GraphQL API
    location /graphql {
        proxy_pass http://localhost:4000/graphql;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Monitoring & Logging

### Health Checks

Each service exposes health endpoints:

```bash
# NestJS API
curl http://localhost:4000/health

# Next.js (custom implementation)
curl http://localhost:3000/api/health
```

### Docker Health Checks
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Logging

#### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f nest-api

# Last 100 lines
docker-compose logs --tail=100 nextjs-frontend
```

#### Production Logging (Recommended)
- Use structured logging (Winston, Pino)
- Ship logs to centralized service (CloudWatch, Datadog, LogDNA)
- Set up alerts for errors

---

## Scaling

### Horizontal Scaling

#### Docker Compose Scale
```bash
# Scale Next.js frontend to 3 instances
docker-compose up -d --scale nextjs-frontend=3

# Scale NestJS API to 2 instances
docker-compose up -d --scale nest-api=2
```

#### Load Balancer Configuration
Use Nginx or HAProxy for load balancing:

```nginx
upstream nextjs_backend {
    server nextjs-1:3000;
    server nextjs-2:3000;
    server nextjs-3:3000;
}

server {
    location / {
        proxy_pass http://nextjs_backend;
    }
}
```

### Vertical Scaling

#### Update Docker Resources
```yaml
services:
  nest-api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

---

## Backup & Recovery

### Database Backup

#### Automated Daily Backups
```bash
# Cron job (runs daily at 2am)
0 2 * * * docker-compose exec postgres pg_dump -U upfirst upfirst > /backups/upfirst-$(date +\%Y\%m\%d).sql
```

#### Manual Backup
```bash
docker-compose exec postgres pg_dump -U upfirst upfirst > backup.sql
```

#### Restore from Backup
```bash
docker-compose exec -T postgres psql -U upfirst upfirst < backup.sql
```

### Volume Backup
```bash
# Backup PostgreSQL data volume
docker run --rm -v upfirst_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data-backup.tar.gz /data
```

---

## Security Checklist

### Pre-Deployment
- [ ] Change default database passwords
- [ ] Generate strong SESSION_SECRET
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable database encryption at rest
- [ ] Configure rate limiting
- [ ] Set up security headers (Helmet.js)
- [ ] Enable audit logging
- [ ] Scan Docker images for vulnerabilities

### Post-Deployment
- [ ] Monitor error logs
- [ ] Set up uptime monitoring
- [ ] Configure automated backups
- [ ] Test disaster recovery plan
- [ ] Review access logs regularly
- [ ] Update dependencies monthly
- [ ] Rotate API keys quarterly

---

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose logs <service-name>

# Rebuild container
docker-compose up -d --build <service-name>

# Reset everything
docker-compose down -v
docker-compose up --build
```

#### Database Connection Failed
```bash
# Check DATABASE_URL is correct
docker-compose exec nest-api printenv DATABASE_URL

# Test connection
docker-compose exec postgres psql -U upfirst -d upfirst -c "SELECT 1;"
```

#### GraphQL Endpoint Not Responding
```bash
# Check if NestJS is running
curl http://localhost:4000/health

# Check GraphQL schema
curl http://localhost:4000/graphql -H "Content-Type: application/json" -d '{"query":"{ __schema { types { name } } }"}'
```

#### Out of Memory
```bash
# Check container stats
docker stats

# Increase memory limits in docker-compose.yml
services:
  nest-api:
    mem_limit: 2g
```

---

## Performance Optimization

### Next.js Optimization
```bash
# Enable standalone output (smaller Docker image)
# In next.config.js:
output: 'standalone'

# Build for production
npm run build
```

### Database Optimization
```sql
-- Create indexes
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM products WHERE seller_id = 'xxx';
```

### Caching
- Implement Redis for session storage
- Use CDN for static assets
- Enable Apollo Client caching
- Add HTTP caching headers

---

## Support

### Documentation
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [NestJS Production](https://docs.nestjs.com/faq/serverless)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

### Monitoring Services
- [Sentry](https://sentry.io) - Error tracking
- [LogRocket](https://logrocket.com) - Session replay
- [Datadog](https://www.datadoghq.com) - APM
- [UptimeRobot](https://uptimerobot.com) - Uptime monitoring

---

## Maintenance

### Regular Updates
```bash
# Update dependencies (monthly)
npm update

# Security audit
npm audit
npm audit fix

# Update Docker base images
docker pull postgres:16-alpine
docker pull node:20-alpine
```

### Database Maintenance
```sql
-- Vacuum database (weekly)
VACUUM ANALYZE;

-- Reindex tables (monthly)
REINDEX DATABASE upfirst;

-- Check database size
SELECT pg_size_pretty(pg_database_size('upfirst'));
```

---

## Rollback Procedure

### Quick Rollback
```bash
# Stop current deployment
docker-compose down

# Restore previous Docker images
docker-compose pull --tag v1.0.0

# Restore database backup
docker-compose exec -T postgres psql -U upfirst upfirst < backup-before-deploy.sql

# Start services
docker-compose up -d
```

---

*Last Updated: October 20, 2025*
*Status: Production Ready*
