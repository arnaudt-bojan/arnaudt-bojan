# Upfirst Deployment Guide

This document explains how to run Upfirst in all three environments:
1. **Replit Development** - Active development in Replit IDE
2. **Replit Staging** - Testing deployment on Replit's cloud
3. **Local Development** - Docker-based local development
4. **AWS Production** - Production deployment on AWS

---

## 📋 **Environment Overview**

| Environment | Technology | Database | Use Case |
|------------|------------|----------|----------|
| **Replit Dev** | Nix + npm | Replit PostgreSQL | Day-to-day development |
| **Replit Staging** | Nix + Reserved VM | Replit PostgreSQL | Pre-production testing |
| **Local Docker** | Docker Compose | PostgreSQL container | Offline development, contributors |
| **AWS Production** | ECS/EKS | RDS PostgreSQL | Live production traffic |

---

## 🔧 **1. Replit Development (Current)**

**Status:** ✅ Already working

### Setup
```bash
# Already configured in .replit
# Just click "Run" or execute:
npm run dev
```

### Configuration
- Database: Automatically provisioned Replit PostgreSQL
- Secrets: Configured in Replit Secrets tab
- Port: 5000 (auto-configured)

### Environment Variables
All secrets are managed in the Replit Secrets tab:
- `DATABASE_URL`
- `SESSION_SECRET`
- `STRIPE_SECRET_KEY`
- `RESEND_API_KEY`
- `GEMINI_API_KEY`
- etc.

---

## 🌐 **2. Replit Staging Deployment**

**Purpose:** Test your app in a production-like environment before AWS

### Prerequisites
1. Replit account with deployment access
2. All secrets configured in Secrets tab
3. Code committed and pushed

### Deployment Steps

#### Option A: Reserved VM (Recommended for Upfirst)
```bash
# 1. In .replit file, ensure deployment is configured for Nix:
[deployment]
deploymentTarget = "cloudrun"
build = ["sh", "-c", "npm install --legacy-peer-deps && npm run build"]
run = ["npm", "run", "start"]
```

#### Option B: Using Replit UI
1. Click **"Deploy"** button in Replit
2. Select **"Reserved VM"** deployment type
3. Configure:
   - **VM Size:** Medium (2GB RAM minimum)
   - **Always On:** ✅ (required for background jobs)
4. Click **"Deploy"**

### Post-Deployment
- Your staging URL: `https://your-repl.username.replit.app`
- Secrets automatically sync from Workspace Secrets
- Monitor logs in Deployment dashboard

### Important Notes
- **DO NOT use Dockerfile for Replit deployments** (Replit uses Nix, not Docker)
- Replit deployments use the `build` and `run` commands from `.replit`
- Background jobs will run automatically on Reserved VM

---

## 🐳 **3. Local Development (Docker)**

**Purpose:** Run the entire stack locally without Replit

### Prerequisites
```bash
# Install Docker Desktop
# https://www.docker.com/products/docker-desktop/

# Verify installation
docker --version
docker-compose --version
```

### Quick Start
```bash
# 1. Clone the repository
git clone <your-repo-url>
cd upfirst

# 2. Create .env file (optional, defaults work)
cp .env.example .env

# 3. Start all services
docker-compose up

# 4. Access the app
# Frontend: http://localhost:5000
# Database: localhost:5432
```

### Services Running
```
┌──────────────────────────────────────┐
│  PostgreSQL (port 5432)              │
│  - User: upfirst                     │
│  - Password: upfirst_dev_password    │
│  - Database: upfirst                 │
└──────────────────────────────────────┘
            ▼
┌──────────────────────────────────────┐
│  Upfirst App (port 5000)             │
│  - Hot reload enabled                │
│  - Prisma auto-sync                  │
│  - All background jobs active        │
└──────────────────────────────────────┘
```

### Docker Commands
```bash
# Start services (detached)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset database (deletes all data)
docker-compose down -v

# Rebuild after dependency changes
docker-compose up --build

# Execute Prisma commands
docker-compose exec app npx prisma studio
docker-compose exec app npx prisma db push

# Access database directly
docker-compose exec postgres psql -U upfirst -d upfirst
```

### Environment Variables (Local)
Create a `.env` file in the root directory:
```bash
# Database (automatically set by docker-compose)
DATABASE_URL=postgresql://upfirst:upfirst_dev_password@postgres:5432/upfirst

# Session
SESSION_SECRET=local_dev_session_secret_change_this

# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# Resend Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@yourdomain.com

# Google Gemini AI
GEMINI_API_KEY=...

# Optional: Meta Ads
META_APP_ID=...
META_APP_SECRET=...
```

### Troubleshooting
```bash
# Port 5432 already in use
# Stop local PostgreSQL or change port in docker-compose.yml

# Permission denied
sudo docker-compose up

# Clear everything and start fresh
docker-compose down -v
docker system prune -a
docker-compose up --build
```

---

## ☁️ **4. AWS Production Deployment**

**Purpose:** Deploy to AWS ECS for production traffic

See [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md) for complete guide.

### Quick Overview
```bash
# 1. Build production image
docker build --target production -t upfirst:latest .

# 2. Tag for AWS ECR
docker tag upfirst:latest <account>.dkr.ecr.<region>.amazonaws.com/upfirst:latest

# 3. Push to ECR
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker push <account>.dkr.ecr.<region>.amazonaws.com/upfirst:latest

# 4. Deploy to ECS (via AWS Console or Terraform)
```

### AWS Services Required
- **ECS (Elastic Container Service)** - Container orchestration
- **ECR (Elastic Container Registry)** - Docker image storage
- **RDS PostgreSQL** - Production database
- **Secrets Manager** - Environment variables
- **Application Load Balancer** - Traffic routing
- **Route 53** - DNS (upfirst.io)

---

## 🔄 **Development Workflow**

### Day-to-Day Development
1. Work in Replit IDE
2. Test locally with `npm run dev`
3. Commit changes to Git
4. Test in local Docker: `docker-compose up`
5. Deploy to Replit Staging for team testing
6. Merge to `main` branch
7. Deploy to AWS Production

### Hotfix Workflow
1. Create hotfix branch in Replit
2. Make fix and test locally
3. Deploy to Replit Staging
4. If verified, push to `main`
5. Deploy to AWS Production

---

## 📊 **Comparison Matrix**

| Feature | Replit Dev | Replit Staging | Local Docker | AWS Production |
|---------|------------|----------------|--------------|----------------|
| **Setup Time** | Instant | 2-3 min | 5 min | 1-2 hours |
| **Cost** | Free | $20/month | Free | $100-500/month |
| **Database** | Managed | Managed | Self-hosted | RDS |
| **Scalability** | Limited | Medium | N/A | Unlimited |
| **Custom Domain** | ❌ | ✅ | ❌ | ✅ |
| **SSL/TLS** | Auto | Auto | Manual | Auto (ACM) |
| **Background Jobs** | ✅ | ✅ | ✅ | ✅ |
| **Hot Reload** | ✅ | ❌ | ✅ | ❌ |

---

## 🆘 **Troubleshooting**

### Replit Deployment Fails
```bash
# Check deployment logs in Replit Dashboard
# Ensure .replit build command doesn't use --omit=optional
# Verify all secrets are synced
```

### Docker Won't Start
```bash
# Check Docker daemon is running
docker ps

# Check port conflicts
lsof -i :5000
lsof -i :5432

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### AWS Deployment Issues
- Check ECS task logs in CloudWatch
- Verify Secrets Manager has all required secrets
- Ensure RDS security group allows ECS task connections
- Check Application Load Balancer health checks

---

## 📚 **Additional Resources**

- [AWS Deployment Guide](./AWS-DEPLOYMENT.md)
- [Database Migrations](./docs/DATABASE.md)
- [Environment Variables](./docs/ENVIRONMENT.md)
- [Background Jobs](./docs/BACKGROUND-JOBS.md)

---

## 🎯 **Quick Reference**

```bash
# Replit Development
npm run dev

# Replit Staging Deploy
# Use Replit UI Deploy button → Reserved VM

# Local Docker Development
docker-compose up

# AWS Production Deploy
./scripts/deploy-to-aws.sh
```
