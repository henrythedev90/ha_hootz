# Health Check Failure Troubleshooting

## Error Message
```
Health check 'servicecheck-00-http-3000' on port 3000 has failed. 
Your app is not responding properly.
```

## What This Means

Fly.io is trying to check if your app is healthy by making HTTP requests to `/api/health` on port 3000, but it's not getting a response. This could mean:

1. **Server isn't starting** - The app crashes before it can listen on port 3000
2. **Server is hanging** - The app is stuck during initialization
3. **Wrong port** - Server is listening on a different port
4. **Health endpoint not accessible** - The route isn't working or requires authentication
5. **Timeout** - Server takes longer than the grace period (30s) to start

## Quick Diagnosis Steps

### 1. Check if server is starting
```bash
flyctl logs -a ha-hootz | grep -E "(Starting|listening|Ready|error|Error)"
```

Look for:
- ✅ `✅ Server listening on http://0.0.0.0:3000` - Server started successfully
- ❌ `Error occurred` - Server is crashing
- ❌ No "listening" message - Server never started

### 2. Check for startup errors
```bash
flyctl logs -a ha-hootz | grep -i "error\|failed\|crash"
```

### 3. Test health endpoint manually
```bash
# Get your app URL
APP_URL=$(flyctl status -a ha-hootz | grep Hostname | awk '{print $2}')

# Test health endpoint
curl -v https://$APP_URL/api/health
```

### 4. Check machine status
```bash
flyctl status -a ha-hootz
flyctl machines list -a ha-hootz
```

## Common Causes & Fixes

### Cause 1: Server Not Starting

**Symptoms:**
- No "Server listening" message in logs
- Process exits immediately

**Check:**
```bash
flyctl logs -a ha-hootz | tail -50
```

**Fixes:**
1. Verify environment variables are set:
   ```bash
   flyctl secrets list -a ha-hootz
   ```
   Required: `REDIS_URL`, `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

2. Check if build succeeded:
   ```bash
   flyctl logs -a ha-hootz | grep -i "build\|error"
   ```

3. Verify Dockerfile is correct:
   - `HOSTNAME=0.0.0.0` is set
   - `PORT=3000` is set
   - `CMD ["npx", "tsx", "server.ts"]` is correct

### Cause 2: Server Hanging During Startup

**Symptoms:**
- Server starts but never reaches "listening" state
- Logs show initialization but then stop

**Check:**
```bash
flyctl logs -a ha-hootz | grep -E "(Redis|MongoDB|Socket|initializing)"
```

**Fixes:**
1. The fixes we applied should help (timeout on Redis init)
2. Increase grace period in `fly.toml`:
   ```toml
   [[http_service.checks]]
     grace_period = "60s"  # Increase from 30s
   ```

### Cause 3: Health Endpoint Not Working

**Symptoms:**
- Server is listening but health check fails
- Can't access `/api/health` manually

**Check:**
```bash
# Test locally first
npm run build
NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 npm start
# In another terminal:
curl http://localhost:3000/api/health
```

**Fixes:**
1. Verify health route exists: `app/api/health/route.ts`
2. Check Next.js routing is working
3. Ensure route doesn't require authentication

### Cause 4: Wrong Port Configuration

**Symptoms:**
- Server listening on different port
- Port mismatch errors

**Check:**
```bash
flyctl logs -a ha-hootz | grep -i "port\|PORT"
```

**Fixes:**
1. Verify `fly.toml` has:
   ```toml
   [env]
     PORT = "3000"
     HOSTNAME = "0.0.0.0"
   
   [http_service]
     internal_port = 3000
   ```

2. Verify `Dockerfile` has:
   ```dockerfile
   ENV PORT=3000
   ENV HOSTNAME="0.0.0.0"
   ```

### Cause 5: Next.js Build Issues

**Symptoms:**
- Build fails or incomplete
- Missing files in deployment

**Check:**
```bash
# Test build locally
npm run build

# Check if standalone output exists
ls -la .next/standalone
```

**Fixes:**
1. Ensure `next.config.ts` has:
   ```typescript
   output: "standalone"
   ```

2. Verify all source files are copied in Dockerfile

## Immediate Actions

### Step 1: Check Recent Logs
```bash
flyctl logs -a ha-hootz --no-tail | tail -100
```

### Step 2: Check if Server Started
```bash
flyctl logs -a ha-hootz | grep "Server listening"
```

If you see the message, server is running but health check is failing.
If you don't see it, server isn't starting.

### Step 3: SSH into Machine (if needed)
```bash
flyctl ssh console -a ha-hootz

# Once inside:
ps aux | grep node
env | grep -E "(PORT|HOSTNAME)"
curl http://localhost:3000/api/health
```

### Step 4: Increase Grace Period (Temporary Fix)
If server takes time to start, increase grace period:

```toml
[[http_service.checks]]
  interval = "30s"
  timeout = "10s"
  grace_period = "60s"  # Increased from 30s
  method = "GET"
  path = "/api/health"
```

Then redeploy:
```bash
flyctl deploy -a ha-hootz
```

## Expected Logs When Working

When the server starts correctly, you should see:
```
🚀 Starting server...
   NODE_ENV: production
   HOSTNAME: 0.0.0.0
   PORT: 3000
✅ Next.js app prepared
✅ Server listening on http://0.0.0.0:3000
✅ Server is ready to accept connections
```

If you see these logs but health check still fails, the issue is with the health endpoint itself.

## Next Steps

1. **Run diagnostics:**
   ```bash
   ./diagnose-fly.sh
   ```

2. **Check logs for specific errors:**
   ```bash
   flyctl logs -a ha-hootz | grep -i error
   ```

3. **Verify all fixes are deployed:**
   - Server has timeout on Redis init
   - Health endpoint exists at `/api/health`
   - `fly.toml` points to `/api/health`

4. **Test locally in production mode:**
   ```bash
   npm run build
   NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 npm start
   ```

If it works locally but not on Fly.io, the issue is likely with:
- Environment variables
- Network connectivity
- Build/deployment process
