# Fly.io Deployment Fix - Health Check Timeout Issue

## Problem Summary

The persistent error you're experiencing is:
```
WARNING The app is not listening on the expected address and will not be reachable by fly-proxy.
Error: timeout reached waiting for health checks to pass
```

## Root Causes Identified

1. **Server Not Starting**: The server might be crashing or hanging during initialization before it can listen on `0.0.0.0:3000`
2. **Redis Connection Blocking**: Redis connection attempts might be hanging, preventing the server from starting
3. **Health Check Failure**: The health check was hitting `/` which might require authentication or fail if services aren't ready
4. **Missing Error Handling**: Server initialization wasn't resilient to Redis/MongoDB connection failures

## Fixes Applied

### 1. Improved Server Startup (`server.ts`)

**Changes:**
- Added timeout (15 seconds) for Socket.io/Redis initialization
- Made Redis initialization non-blocking (runs in background)
- Server now starts even if Redis fails
- Added better logging to track startup progress

**Key improvement:**
```typescript
// Initialize Socket.io in the background (don't block server startup)
initSocketWithTimeout();
```

The server will now:
- ✅ Start listening immediately
- ✅ Continue even if Redis connection fails
- ✅ Log warnings instead of crashing

### 2. Dedicated Health Check Endpoint (`/api/health`)

**Created:** `app/api/health/route.ts`

**Features:**
- ✅ Lightweight (no external dependencies)
- ✅ Doesn't require Redis or MongoDB
- ✅ Returns server status and uptime
- ✅ Fast response time

**Updated:** `fly.toml` to use `/api/health` instead of `/`

### 3. Improved Redis Connection Handling (`lib/socket/initSocket.ts`)

**Changes:**
- Added 8-second timeout per connection attempt
- Prevents hanging during Redis connection
- Better error messages

## Options to Fix the Error

### Option 1: Deploy the Fixes (Recommended)

The fixes above should resolve the issue. Deploy with:

```bash
cd ha-hootz
flyctl deploy -a ha-hootz
```

**Monitor the deployment:**
```bash
# Watch logs in real-time (default behavior - tails logs)
flyctl logs -a ha-hootz

# To stop tailing, use --no-tail
flyctl logs -a ha-hootz --no-tail

# Check status
flyctl status -a ha-hootz
```

### Option 2: Verify Environment Variables

Ensure all required secrets are set:

```bash
# Check current secrets
flyctl secrets list -a ha-hootz

# Set missing secrets
flyctl secrets set REDIS_URL="your-redis-url" -a ha-hootz
flyctl secrets set MONGODB_URI="your-mongodb-uri" -a ha-hootz
flyctl secrets set NEXTAUTH_SECRET="your-secret" -a ha-hootz
flyctl secrets set NEXTAUTH_URL="https://ha-hootz.fly.dev" -a ha-hootz
```

### Option 3: Use Diagnostic Script

Run the diagnostic script to identify issues:

```bash
./diagnose-fly.sh
```

This will check:
- ✅ Fly.io authentication
- ✅ App status
- ✅ Required secrets
- ✅ Recent logs
- ✅ Machine status
- ✅ Health check endpoint

### Option 4: Manual Debugging

If issues persist, SSH into the machine:

```bash
# SSH into a running machine
flyctl ssh console -a ha-hootz

# Check if server is running
ps aux | grep node

# Check environment variables
env | grep -E "(REDIS|MONGO|NEXTAUTH|HOSTNAME|PORT)"

# Check logs
flyctl logs -a ha-hootz
```

### Option 5: Increase Health Check Grace Period

If the server takes longer to start, increase the grace period in `fly.toml`:

```toml
[[http_service.checks]]
  interval = "30s"
  timeout = "10s"
  grace_period = "60s"  # Increased from 30s
  method = "GET"
  path = "/api/health"
```

### Option 6: Disable Health Checks Temporarily

For debugging, you can temporarily disable health checks:

```toml
[http_service]
  # ... other config ...
  # Comment out or remove the checks section
  # [[http_service.checks]]
  #   ...
```

**Note:** This is only for debugging. Re-enable health checks for production.

## Verification Steps

After deploying, verify the fix:

1. **Check server is listening:**
   ```bash
   flyctl logs -a ha-hootz | grep "Server listening"
   ```
   Should see: `✅ Server listening on http://0.0.0.0:3000`

2. **Test health endpoint:**
   ```bash
   curl https://ha-hootz.fly.dev/api/health
   ```
   Should return: `{"status":"ok","timestamp":"...","uptime":...}`

3. **Check machine status:**
   ```bash
   flyctl status -a ha-hootz
   ```
   Should show machine as "started"

4. **Monitor during deployment:**
   ```bash
   flyctl logs -a ha-hootz
   ```
   (Note: `flyctl logs` tails logs by default. Use `--no-tail` to stop tailing.)

## Expected Behavior After Fix

✅ Server starts listening on `0.0.0.0:3000` immediately
✅ Health checks pass even if Redis/MongoDB are temporarily unavailable
✅ Server logs show clear startup progress
✅ Deployment completes successfully

## Troubleshooting

### If server still doesn't start:

1. **Check logs for specific errors:**
   ```bash
   flyctl logs -a ha-hootz | grep -i error
   ```

2. **Verify Dockerfile is correct:**
   - Ensure `HOSTNAME=0.0.0.0` is set
   - Ensure `PORT=3000` is set
   - Ensure `CMD ["npx", "tsx", "server.ts"]` is correct

3. **Check Next.js build:**
   - Ensure `output: "standalone"` is in `next.config.ts`
   - Verify build completes successfully locally

4. **Test locally in production mode:**
   ```bash
   npm run build
   NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 npm start
   ```

### If health checks still fail:

1. **Verify health endpoint works:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Check fly.toml configuration:**
   - Ensure path is `/api/health`
   - Ensure method is `GET`
   - Check timeout values

3. **Increase grace period** (see Option 5 above)

## Additional Notes

- **Redis/MongoDB**: The server will now start even if these services are unavailable
- **Socket.io**: Will work once Redis connects, but won't block server startup
- **Graceful Degradation**: App remains accessible even if some features are unavailable

## Next Steps

1. ✅ Deploy the fixes: `flyctl deploy -a ha-hootz`
2. ✅ Monitor logs: `flyctl logs -a ha-hootz` (tails by default)
3. ✅ Verify health endpoint: `curl https://ha-hootz.fly.dev/api/health`
4. ✅ Test the application functionality

If issues persist after these fixes, the diagnostic script (`./diagnose-fly.sh`) will help identify the specific problem.
