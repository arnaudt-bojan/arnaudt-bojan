# Local Development Setup Guide

## Common Issues When Running `npm run dev` on Local Linux

### Issue 1: Missing Workspace Dependencies

**Problem:** Workspaces don't have their dependencies installed.

**Solution:**
```bash
# Install all dependencies
npm install

# Or install workspace-specific dependencies
npm install --workspace=@upfirst/backend
npm install --workspace=@upfirst/frontend
```

### Issue 2: Prisma Client Not Generated

**Problem:** `@prisma/client` is not generated after fresh clone/install.

**Solution:**
```bash
# Generate Prisma client
npm run postinstall

# Or directly
npx prisma generate
```

### Issue 3: Missing Environment Variables

**Problem:** Missing required environment variables like `DATABASE_URL`.

**Solution:**

Create a `.env` file in the **root directory**:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/upfirst_dev"

# Session
SESSION_SECRET="your-secret-key-here"

# Optional API keys (if needed)
# STRIPE_SECRET_KEY=
# RESEND_API_KEY=
# GEMINI_API_KEY=
```

### Issue 4: Port Conflicts

**Problem:** Ports 3000 or 4000 are already in use on your machine.

**Check:**
```bash
# Check what's using port 3000
lsof -i :3000

# Check what's using port 4000
lsof -i :4000

# Kill processes if needed
kill -9 <PID>
```

### Issue 5: NestJS CLI Not Found

**Problem:** `nest` command not found in backend workspace.

**Solution:**
The package.json already uses `npx nest` which should work. If it doesn't:
```bash
cd apps/backend
npm install @nestjs/cli --save-dev
```

## Debugging Steps

1. **Run the diagnostic script:**
   ```bash
   chmod +x debug-dev.sh
   ./debug-dev.sh
   ```

2. **Check individual workspace commands:**
   ```bash
   # Test backend
   cd apps/backend
   npm run start:dev
   # Press Ctrl+C to stop
   
   # Test frontend
   cd apps/frontend
   npm run dev
   # Press Ctrl+C to stop
   ```

3. **View detailed error output:**
   ```bash
   # Run with verbose output
   npm run dev -- --verbose
   ```

4. **Check logs:**
   ```bash
   # Backend logs
   cd apps/backend
   npm run start:dev 2>&1 | tee backend.log
   
   # Frontend logs
   cd apps/frontend
   npm run dev 2>&1 | tee frontend.log
   ```

## Complete Setup from Scratch

```bash
# 1. Clone and enter directory
git clone <repo>
cd upfirst-monorepo

# 2. Install all dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Set up environment variables
cp .env.example .env  # if exists, or create manually
nano .env

# 5. Push database schema (if database is set up)
npm run db:push

# 6. Start development servers
npm run dev
```

## Expected Output

When `npm run dev` works correctly, you should see:

```
[0] [Nest] <timestamp>  LOG [NestApplication] Nest application successfully started
[0] [Nest] <timestamp>  LOG NestJS GraphQL API listening on port 4000
[1]   ▲ Next.js 14.2.33
[1]   - Local:        http://localhost:3000
```

## Still Having Issues?

Run the diagnostic script and share the output:
```bash
./debug-dev.sh > diagnostics.txt
cat diagnostics.txt
```

This will help identify the exact issue.
