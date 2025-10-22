# Backend Permission Fix Required

## Issue

The backend is failing with:
```
sh: 1: nest: Permission denied
```

## Solution

The `nest` command needs to be prefixed with `npx` in the backend package.json.

### Edit: `apps/backend/package.json`

**Line 9 - Change:**
```json
"start:dev": "nest start --watch",
```

**To:**
```json
"start:dev": "npx nest start --watch",
```

### Optional: Fix All nest Commands

While you're in there, you can also prefix the other nest commands:

```json
{
  "scripts": {
    "build": "npx nest build",
    "start": "npx nest start",
    "start:dev": "npx nest start --watch",
    "start:debug": "npx nest start --debug --watch",
    ...
  }
}
```

## Why This Happens

In npm workspaces, executables are hoisted to the root `node_modules/.bin/`. When running workspace scripts, the `nest` command isn't in the PATH, so it needs `npx` to resolve it.

## After Editing

Save the file and the backend will automatically restart. You'll see:
```
[0] [Nest] Starting Nest application...
[0] [Nest] GraphQL server started on http://localhost:4000/graphql
```
