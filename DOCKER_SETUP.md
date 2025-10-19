# 🐳 Upfirst Docker Development Environment

## Phase 0: Infrastructure Readiness - Complete Setup Guide

This guide will help you set up the Docker-based development environment for Upfirst, which is the foundation for the upcoming migration to Next.js + NestJS + Prisma.

---

## 📋 Prerequisites

1. **Docker Desktop** installed ([Download here](https://www.docker.com/products/docker-desktop))
2. **Docker Compose** v2.0+ (included with Docker Desktop)
3. **Git** installed
4. **Node.js 20+** (for local tooling, optional)

---

## 🚀 Quick Start (5 minutes)

### Step 1: Clone & Setup

```bash
# Clone the repository (if not already cloned)
git clone <your-repo-url>
cd upfirst

# Copy environment variables
cp .env.example .env

# Edit .env and fill in your actual API keys
# (Stripe, Resend, Shippo, Gemini, etc.)
nano .env  # or use your preferred editor
```

### Step 2: Start the Development Environment

```bash
# Start all services (PostgreSQL, Redis, Legacy App, NGINX)
docker-compose up

# Or run in detached mode (background)
docker-compose up -d

# View logs
docker-compose logs -f
```

### Step 3: Access the Application

- **Frontend (via NGINX Gateway):** http://localhost
- **Direct Backend API:** http://localhost:3000
- **Health Check:** http://localhost/api/health
- **PostgreSQL:** localhost:5432 (user: postgres, pass: postgres_dev_password)
- **Redis:** localhost:6379

### Step 4: Stop the Environment

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v
```

---

## 📁 Project Structure (Monorepo Preparation)

```
upfirst/
├── apps/                          # Future monorepo apps (Phase 2+)
│   ├── legacy/                    # Current app (moved here in Phase 1)
│   ├── nest-server/              # NestJS GraphQL (Phase 2)
│   └── next-client/              # Next.js frontend (Phase 3)
├── client/                        # Current React frontend
├── server/                        # Current Express backend
├── shared/                        # Shared schemas & types
├── docker-compose.yml            # Docker orchestration
├── Dockerfile.legacy             # Legacy app container
├── nginx.conf                    # API Gateway config
└── .env                          # Environment variables
```

---

## 🔧 Common Docker Commands

### Service Management

```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up legacy-app

# Rebuild containers after dependency changes
docker-compose up --build

# Stop all services
docker-compose down

# Restart a service
docker-compose restart legacy-app

# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f legacy-app
```

### Database Management

```bash
# Access PostgreSQL CLI
docker-compose exec postgres psql -U postgres -d upfirst_dev

# Backup database
docker-compose exec postgres pg_dump -U postgres upfirst_dev > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres upfirst_dev < backup.sql

# Run Drizzle migrations
docker-compose exec legacy-app npm run db:push
```

### Container Access

```bash
# Access legacy app shell
docker-compose exec legacy-app sh

# Access PostgreSQL shell
docker-compose exec postgres sh

# Execute command in container
docker-compose exec legacy-app npm run check
```

### Cleanup

```bash
# Remove all stopped containers
docker-compose rm

# Remove all volumes (⚠️ DELETES ALL DATA)
docker-compose down -v

# Clean up Docker system (careful!)
docker system prune -a
```

---

## 🏗️ Architecture Overview

### Current Setup (Phase 0)

```
                    ┌─────────────────┐
                    │  NGINX Gateway  │
                    │   (Port 80)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Legacy App    │
                    │ Express + Vite  │
                    │  (Port 3000)    │
                    └────┬─────┬──────┘
                         │     │
              ┌──────────▼─┐ ┌─▼──────────┐
              │ PostgreSQL │ │   Redis    │
              │ (Port 5432)│ │ (Port 6379)│
              └────────────┘ └────────────┘
```

### Future Setup (Phase 2+)

```
                    ┌─────────────────┐
                    │  NGINX Gateway  │
                    │   (Port 80)     │
                    └────┬──────┬─────┘
                         │      │
              ┌──────────▼─┐   │
              │ Legacy App │   │
              │    REST    │   │
              └────────────┘   │
                         ┌─────▼────────┐
                         │  NestJS      │
                         │  GraphQL     │
                         │ (Port 4000)  │
                         └──────┬───────┘
                                │
                      ┌─────────▼────────┐
                      │   PostgreSQL     │
                      │   + Redis        │
                      └──────────────────┘
```

---

## 🔍 Health Checks

All services have health checks configured:

- **Legacy App:** `GET /api/health` (checks every 30s)
- **PostgreSQL:** `pg_isready` (checks every 10s)
- **Redis:** `redis-cli ping` (checks every 10s)
- **NGINX:** `wget http://localhost/health` (checks every 10s)

View health status:
```bash
docker-compose ps
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Problem:** `Error: bind: address already in use`

**Solution:**
```bash
# Find process using port 5432 (PostgreSQL)
lsof -i :5432

# Kill the process
kill -9 <PID>

# Or use different ports in docker-compose.yml
```

### Hot Reload Not Working

**Problem:** Code changes not reflecting in container

**Solution:**
```bash
# Ensure volumes are mounted correctly
docker-compose down
docker-compose up --build

# Check volume mounts
docker-compose exec legacy-app ls -la /app/server
```

### Database Connection Failed

**Problem:** `ECONNREFUSED` or `connection refused`

**Solution:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Container Won't Start

**Problem:** Container exits immediately

**Solution:**
```bash
# View logs for errors
docker-compose logs legacy-app

# Check environment variables
docker-compose exec legacy-app env

# Rebuild without cache
docker-compose build --no-cache
docker-compose up
```

---

## 🔐 Environment Variables

### Required Variables (Must Set in .env)

```bash
# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# Resend (Required for emails)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Session (Required for auth)
SESSION_SECRET=<random-string-min-32-chars>
```

### Optional Variables

```bash
# Shippo (Shipping labels)
SHIPPO_API_KEY=shippo_test_...

# Google Gemini (AI features)
GEMINI_API_KEY=...

# Meta Ads (Social advertising)
META_APP_ID=...
META_APP_SECRET=...
```

### Docker-Managed Variables (Don't Override)

These are automatically set by docker-compose.yml:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `NODE_ENV` - Set to development
- `PORT` - Set to 3000

---

## 📊 Performance & Optimization

### Development Mode

- Hot reload enabled for all source files
- No build optimization
- Source maps enabled
- Detailed logging

### Resource Limits

Default container limits (adjust in docker-compose.yml if needed):
- **PostgreSQL:** 512MB RAM
- **Redis:** 256MB RAM
- **Legacy App:** No limit (uses host resources)

### Volume Performance

For better performance on macOS/Windows:
```yaml
# Add to docker-compose.yml volumes section
volumes:
  - ./client:/app/client:cached
  - ./server:/app/server:cached
```

---

## 🚢 Next Steps (Migration Phases)

### ✅ Phase 0: COMPLETED
- [x] Docker development environment
- [x] API Gateway (NGINX)
- [x] Health checks
- [x] Hot reload

### 📋 Phase 1: Data Layer (Next)
- [ ] Install Prisma
- [ ] Generate schema from database
- [ ] Run Prisma in shadow mode
- [ ] Implement dual-write verification

### 📋 Phase 2: Backend (Future)
- [ ] Set up NestJS project
- [ ] Configure GraphQL (Apollo)
- [ ] Migrate REST endpoints
- [ ] Add Socket.IO support

### 📋 Phase 3: Frontend (Future)
- [ ] Set up Next.js project
- [ ] Install Material UI
- [ ] Migrate pages incrementally
- [ ] GraphQL client setup

---

## 📚 Additional Resources

- **Docker Documentation:** https://docs.docker.com
- **Docker Compose Reference:** https://docs.docker.com/compose/
- **NestJS Docs:** https://docs.nestjs.com
- **Prisma Docs:** https://www.prisma.io/docs
- **Next.js Docs:** https://nextjs.org/docs

---

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify services are healthy: `docker-compose ps`
3. Review this troubleshooting guide
4. Check environment variables are set correctly

---

## 📝 Rollback Procedures

### Emergency Rollback to Non-Docker Development

If Docker environment has issues:

```bash
# Stop Docker services
docker-compose down

# Use original development commands
npm install
npm run dev
```

Your original development setup is preserved and can be used at any time.

---

## ✨ Benefits of Docker Setup

✅ **Consistent Environment** - Same setup across all developer machines  
✅ **No More "Works on My Machine"** - PostgreSQL, Redis versions locked  
✅ **Easy Onboarding** - New developers run `docker-compose up`  
✅ **Production Parity** - Closer to production environment  
✅ **Isolated Services** - Each service in its own container  
✅ **Future-Ready** - Prepared for NestJS/Next.js migration  

---

**Last Updated:** January 2025  
**Phase:** 0 - Infrastructure Readiness  
**Status:** ✅ Complete & Production-Ready
