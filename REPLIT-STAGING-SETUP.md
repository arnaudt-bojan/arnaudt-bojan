# Replit Staging Deployment Setup

This guide explains how to deploy Upfirst to Replit's cloud as a **staging environment**.

---

## 🎯 **Important: Replit Uses Nix, NOT Docker**

Replit deployments use **Nix package management**, not Docker. Your Dockerfile is only for local development and AWS production. Replit's deployment process:

1. Reads dependencies from `package.json`
2. Installs packages using npm **inside a Nix environment**
3. Runs build and start commands from `.replit` file
4. Deploys to Google Cloud Run (managed by Replit)

---

## ⚙️ **Required Configuration**

### Step 1: Update `.replit` File

**YOU MUST MANUALLY EDIT `.replit`** (I cannot edit it programmatically).

Open `.replit` and change lines 9-11 from:
```toml
[deployment]
# build = ["sh", "-c", "npm ci --omit=optional && npm run build"]
# run = ["npm", "run", "start"]
deploymentTarget = "cloudrun"
```

**To this (UNCOMMENT and FIX):**
```toml
[deployment]
build = ["sh", "-c", "npm install --legacy-peer-deps --include=optional && npm run build"]
run = ["npm", "run", "start"]
deploymentTarget = "cloudrun"
```

**Critical changes:**
- ✅ Use `npm install` instead of `npm ci`
- ✅ Add `--legacy-peer-deps` flag
- ✅ Add `--include=optional` flag (do NOT use `--omit=optional`)
- ✅ Uncomment both build and run commands

---

## 🚀 **Deployment Steps**

### Option 1: Using Replit UI (Recommended)

1. **Make the `.replit` edit above first**
2. Click the **"Deploy"** button in Replit
3. Choose **"Reserved VM"** deployment type
4. Configure deployment:
   ```
   VM Size: Medium (2GB RAM)
   Always On: ✅ ENABLED (required for background jobs)
   ```
5. Click **"Deploy"**
6. Wait 3-5 minutes for deployment
7. Access your staging app at: `https://your-repl.username.replit.app`

### Option 2: Using Replit CLI

```bash
# Install Replit CLI (if not already installed)
npm install -g @replit/cli

# Login
replit login

# Deploy
replit deploy
```

---

## 🔐 **Environment Variables**

Your secrets automatically sync from **Workspace Secrets** to deployment.

### Required Secrets (Already Configured)
- ✅ `DATABASE_URL` - Auto-provisioned by Replit
- ✅ `SESSION_SECRET`
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_PUBLIC_KEY`
- ✅ `RESEND_API_KEY`
- ✅ `GEMINI_API_KEY`
- ✅ `SHIPPO_API_KEY`
- ✅ All other secrets in Secrets tab

### Verify Secrets
1. Go to Tools → Secrets
2. Ensure all required secrets are present
3. Secrets automatically sync to deployment (no manual config needed)

---

## ✅ **Post-Deployment Checklist**

After deployment completes:

### 1. Verify App is Running
```bash
# Check deployment URL responds
curl https://your-repl.username.replit.app/api/health
# Should return: {"status":"healthy"}
```

### 2. Check Logs
1. Go to Deployment dashboard in Replit
2. Click **"Logs"** tab
3. Verify no errors

### 3. Test Background Jobs
Background jobs should automatically start:
- ✅ Reservation Cleanup Job
- ✅ Wholesale Balance Reminder Job
- ✅ Delivery Reminder Service
- ✅ Meta Job Scheduler
- ✅ Analytics Service
- ✅ Domain Status Checker
- ✅ Newsletter Workflow Processor

Check logs for messages like:
```
[BACKGROUND_JOB] Started: ReservationCleanupJob
[BACKGROUND_JOB] Started: WholesaleBalanceReminderJob
...
```

### 4. Test Database Connection
```bash
# SSH into running deployment (if available)
# Or check logs for database connection success:
"Database connection pool initialized"
"✓ Database health check passed"
```

### 5. Test Core Endpoints
```bash
# Health check
curl https://your-staging-url/api/health

# GraphQL endpoint
curl -X POST https://your-staging-url/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# Should return: {"data":{"__typename":"Query"}}
```

---

## 🔧 **Troubleshooting**

### Deployment Fails with "npm install error"

**Symptom:** Build fails with esbuild platform errors

**Solution:**
```toml
# Verify .replit has these EXACT build settings:
build = ["sh", "-c", "npm install --legacy-peer-deps --include=optional && npm run build"]

# NOT these (will fail):
# build = ["sh", "-c", "npm ci --omit=optional && npm run build"]  ❌
```

### App Crashes on Startup

**Check:**
1. All required secrets are in Secrets tab
2. DATABASE_URL is set (Replit auto-provides this)
3. Check deployment logs for specific error

### Background Jobs Not Running

**Reserved VM only:**
- Background jobs require **"Always On"** enabled
- Autoscale deployments don't support background jobs
- Verify "Always On" in deployment settings

### Secrets Not Syncing

1. Go to Deployment dashboard
2. Click **"Settings"**
3. Scroll to **"Environment Variables"**
4. Click **"Sync from Workspace"**

---

## 💰 **Cost**

| Deployment Type | Cost | Background Jobs | Always On |
|----------------|------|-----------------|-----------|
| **Autoscale** | Pay-per-use | ❌ No | ❌ No |
| **Static** | Free | ❌ No | ❌ No |
| **Reserved VM** | $20-40/month | ✅ Yes | ✅ Yes |

**For Upfirst:** Use **Reserved VM** (background jobs required)

---

## 🔄 **Continuous Deployment**

### Auto-Deploy on Git Push

1. Go to Deployment dashboard
2. Enable **"Auto-deploy on commit"**
3. Choose branch: `main`
4. Now every push to `main` triggers deployment

### Manual Deploy

1. Make changes in Replit
2. Click **"Deploy"** button
3. Or run: `replit deploy`

---

## 📊 **Monitoring**

### Check Deployment Status
```bash
# Via Replit CLI
replit deployments list

# Via curl
curl https://your-staging-url/api/health
curl https://your-staging-url/metrics  # Prometheus metrics
```

### View Logs
1. Replit UI → Deployments → Logs
2. Real-time log streaming
3. Filter by level (INFO, WARN, ERROR)

### Metrics (Prometheus)
```bash
# Access metrics endpoint
curl https://your-staging-url/metrics

# Shows:
# - HTTP request counts
# - Response times
# - Database query performance
# - Background job execution
# - Cache hit rates
```

---

## 🔐 **Custom Domain (Optional)**

1. Go to Deployment → Settings
2. Click **"Add Custom Domain"**
3. Enter: `staging.upfirst.io`
4. Add DNS records:
   ```
   Type: CNAME
   Name: staging
   Value: your-repl.username.replit.app
   ```
5. SSL automatically provisioned

---

## 📚 **Additional Resources**

- [Replit Deployment Docs](https://docs.replit.com/hosting/deployments/about-deployments)
- [Reserved VM Guide](https://docs.replit.com/hosting/deployments/reserved-vm-deployments)
- [Environment Variables](https://docs.replit.com/programming-ide/workspace-features/secrets)

---

## ⚠️ **Important Notes**

1. **Don't use Dockerfile for Replit** - Only for local/AWS
2. **Always use Reserved VM** - Upfirst needs background jobs
3. **Enable "Always On"** - Required for Socket.IO and jobs
4. **Database auto-managed** - Replit provides PostgreSQL
5. **Secrets auto-sync** - No manual environment variable setup

---

## 🆘 **Need Help?**

**Build failing?**
1. Check `.replit` file has correct build command
2. Verify no `--omit=optional` flag
3. Use `npm install` not `npm ci`

**App not accessible?**
1. Check deployment logs for errors
2. Verify DATABASE_URL secret exists
3. Ensure Reserved VM is used

**Background jobs not running?**
1. Verify "Always On" is enabled
2. Check deployment type is Reserved VM
3. View logs for job start messages
