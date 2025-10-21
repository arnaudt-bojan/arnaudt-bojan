# Upfirst Quick Start Guide

Choose your development environment:

## 🚀 **Option 1: Replit (Fastest)**

```bash
# Just click "Run" in Replit or:
npm run dev
```

**Pros:** Instant setup, cloud IDE, auto-configured database  
**Cons:** Requires internet connection  
**Best for:** Quick development, team collaboration

---

## 🐳 **Option 2: Local Docker (Recommended for Contributors)**

```bash
# 1. Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop/

# 2. Clone repository
git clone <your-repo-url>
cd upfirst

# 3. Start everything
docker-compose up

# 4. Access app
# http://localhost:5000
```

**Pros:** Works offline, isolated environment, production-like  
**Cons:** Requires Docker installed  
**Best for:** Local development, testing production builds

---

## 💻 **Option 3: Native (Advanced)**

```bash
# 1. Install PostgreSQL 16
# macOS: brew install postgresql@16
# Linux: sudo apt install postgresql-16

# 2. Create database
createdb upfirst

# 3. Install dependencies
npm install

# 4. Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL and API keys

# 5. Run migrations
npm run db:push

# 6. Start development server
npm run dev
```

**Pros:** Fastest reload, direct debugging  
**Cons:** Manual setup, dependency management  
**Best for:** Active development, debugging

---

## 🌐 **Deployment**

### Staging (Replit)
1. Click "Deploy" in Replit
2. Choose "Reserved VM"
3. Deploy

### Production (AWS)
```bash
# See AWS-DEPLOYMENT.md for complete guide
docker build --target production -t upfirst:latest .
# ... push to AWS ECR and deploy to ECS
```

---

## 📚 **Full Documentation**

- [Complete Deployment Guide](./DEPLOYMENT.md)
- [AWS Production Setup](./AWS-DEPLOYMENT.md)
- [Environment Variables](./.env.example)
- [Architecture Overview](./replit.md)

---

## 🆘 **Need Help?**

- Docker not starting? `docker-compose down -v && docker-compose up --build`
- Port conflicts? Check if port 5000 or 5432 is in use
- Database errors? Verify DATABASE_URL in .env
- Missing secrets? Copy .env.example to .env and fill in values
