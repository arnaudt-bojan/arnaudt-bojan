# Next.js Setup Instructions

## Quick Start

### 1. Install Dependencies

Run the installation script:

```bash
cd apps/nextjs
./install.sh
```

Or manually:

```bash
cd apps/nextjs
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

The Next.js app will start on **http://localhost:3000**

## Architecture Overview

This Next.js 14 app runs in parallel with the existing Vite frontend:

- **Next.js App**: Port 3000 (modern SSR/SSG)
- **Vite App**: Port 5000 (existing client-side app)  
- **NestJS API**: Port 4000 (GraphQL backend)

## What's Configured

✅ **Next.js 14** with App Router
✅ **TypeScript** with strict mode
✅ **Tailwind CSS** for styling
✅ **API Proxy** to NestJS GraphQL backend
✅ **Standalone output** for Docker deployment
✅ **Environment variables** for GraphQL URL

## Running from Root

While we cannot add scripts to the root package.json in this environment, you can run the Next.js app using:

```bash
cd apps/nextjs && npm run dev
```

## Development Workflow

### Run both frontends simultaneously:

**Terminal 1 - Existing Vite App:**
```bash
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 - Next.js App:**
```bash
cd apps/nextjs && npm run dev
# Runs on http://localhost:3000
```

**Backend (already running):**
```bash
# NestJS GraphQL API on http://localhost:4000/graphql
```

## Migration Strategy

1. **Phase 1**: Both frontends run in parallel (current)
2. **Phase 2**: Migrate pages incrementally to Next.js
3. **Phase 3**: Add Apollo Client integration to Next.js
4. **Phase 4**: Full migration complete, deprecate Vite app

## Environment Variables

Create `apps/nextjs/.env.local` for local development:

```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
```

## Building for Production

```bash
npm run build
npm start
```

## Next Steps

- [ ] Install dependencies (`./install.sh`)
- [ ] Run dev server (`npm run dev`)
- [ ] Verify app loads at http://localhost:3000
- [ ] Add Apollo Client for GraphQL queries
- [ ] Migrate first page from Vite to Next.js
- [ ] Set up shared component library

## Troubleshooting

**Port 3000 already in use?**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Dependencies not installing?**
```bash
# Clear npm cache and retry
npm cache clean --force
npm install
```

**Next.js not found?**
```bash
# Ensure you're in the correct directory
cd apps/nextjs
ls -la  # Should see package.json
```
