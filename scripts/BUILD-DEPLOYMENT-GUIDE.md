# Build & Deployment Guide

## Build Wrapper Scripts

Two build wrapper scripts are available for Replit deployments:

### 1. JavaScript Version (Recommended)
```bash
node scripts/build-wrapper.js
```

### 2. Bash Version
```bash
bash scripts/build-wrapper.sh
```

Both scripts perform the same three steps:

1. **Generate Prisma Client** - Creates type-safe database client
2. **Build Frontend** - Bundles React app with Vite
3. **Build Backend** - Bundles Express server with esbuild

---

## Replit Deployment Configuration

### Build Command
```bash
node scripts/build-wrapper.js
```

### Run Command
```bash
npm start
```

---

## Testing Locally

Before deploying, test the build:

```bash
# Run the build wrapper
node scripts/build-wrapper.js

# Start the production server
npm start
```

---

## Build Output

### Frontend
- Location: `dist/public/`
- Contents: HTML, CSS, JS bundles

### Backend
- Location: `dist/index.js`
- Size: ~3.5mb (bundled)

---

## Build Process Flow

```
Start
  ↓
Generate Prisma Client (./generated/prisma)
  ↓
Build Frontend with Vite (→ dist/public/)
  ↓
Build Backend with esbuild (→ dist/index.js)
  ↓
Done ✓
```

---

## Troubleshooting

### Prisma Generation Fails
- Ensure DATABASE_URL is set in environment variables
- Check `prisma/schema.prisma` for syntax errors

### Frontend Build Fails
- Check for TypeScript errors: `npm run check`
- Verify all imports are correct

### Backend Build Fails
- Ensure `server/index.ts` exists
- Check for missing dependencies

---

## Environment Variables Required

### Build Time
- `DATABASE_URL` - For Prisma schema validation

### Runtime
- `DATABASE_URL` - Database connection
- `NODE_ENV=production`
- Any other app-specific variables

---

## Performance Notes

- **Prisma Generation**: ~1 second
- **Frontend Build**: ~24 seconds
- **Backend Build**: <1 second
- **Total Build Time**: ~25 seconds

---

## Why This Approach?

This build wrapper ensures:
1. ✅ Prisma Client is always generated before building
2. ✅ No package.json modifications needed
3. ✅ Works with Replit's deployment system
4. ✅ Easy to test locally
5. ✅ Clear error messages if any step fails

---

**Last Updated:** 2025-10-20
