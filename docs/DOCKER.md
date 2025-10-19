# Docker Deployment Guide

## Quick Start

### Development
```bash
docker-compose -f docker-compose.dev.yml up -d
npm run dev
```

### Production
```bash
docker-compose up -d
```

## Services

- **NestJS API**: http://localhost:4000/graphql
- **Vite Frontend**: http://localhost:5000
- **Next.js Frontend**: http://localhost:3000
- **PostgreSQL**: localhost:5432

## Commands

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec nest-api npx prisma migrate deploy
```

## Environment Variables

Create `.env.production`:
```
DATABASE_URL=postgresql://upfirst:upfirst_password@postgres:5432/upfirst
NODE_ENV=production
PORT=4000
```
