# Package.json Update Instructions

## What to Change

Open `package.json` in the root directory and update the **"dev"** script on line 12.

### Current (Broken):
```json
{
  "scripts": {
    "dev": "NODE_ENV=development node node_modules/tsx/dist/cli.mjs server/index.ts",
    ...
  }
}
```

### New (Fixed):
```json
{
  "scripts": {
    "dev": "concurrently \"npm run start:dev --workspace=@upfirst/backend\" \"npm run dev --workspace=@upfirst/frontend\"",
    ...
  }
}
```

## That's It!

Just replace that ONE line. This will:
- ✅ Start NestJS backend (port 4000) with `npm run start:dev --workspace=@upfirst/backend`
- ✅ Start Next.js frontend (port 3000) with `npm run dev --workspace=@upfirst/frontend`
- ✅ Run both concurrently with proper labels
- ✅ Fix the prom-client error (no longer trying to run old server/)

## After Editing

The `.replit` workflow configuration also needs one small update:

Open `.replit` and change line 99:
```toml
waitForPort = 5000
```

To:
```toml
waitForPort = 3000
```

This tells the workflow to wait for the Next.js frontend (port 3000) instead of the old Express server (port 5000).

## Result

When you click "Run", you'll see:
```
[0] [BACKEND] [Nest] Starting Nest application...
[1] [FRONTEND] ▲ Next.js 14.2.33
[0] [BACKEND] [Nest] GraphQL server on http://localhost:4000/graphql
[1] [FRONTEND] - Local: http://localhost:3000
```

Both services running from one npm command!
