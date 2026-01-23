# Fly.io Deployment Guide for Ha-Hootz

This guide walks you through deploying Ha-Hootz to Fly.io, a platform optimized for real-time applications with WebSocket support.

## Prerequisites

1. **Fly.io Account**: Sign up at [fly.io](https://fly.io) (free tier available)
2. **Fly CLI**: Install the Fly.io CLI tool
3. **Environment Variables**: Have your production secrets ready:
   - `REDIS_URL` (Upstash Redis connection string)
   - `MONGODB_URI` (MongoDB Atlas connection string)
   - `NEXTAUTH_SECRET` (JWT secret)
   - `NEXTAUTH_URL` (Your Fly.io app URL)
   - `MONGODB_DB_NAME` (optional, defaults to "ha-hootz")

## Step 1: Install Fly.io CLI

### macOS
```bash
curl -L https://fly.io/install.sh | sh
```

### Linux
```bash
curl -L https://fly.io/install.sh | sh
```

### Windows (PowerShell)
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

After installation, add Fly to your PATH:
```bash
export FLYCTL_INSTALL="/home/$USER/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"
```

Verify installation:
```bash
flyctl version
```

## Step 2: Login to Fly.io

```bash
flyctl auth login
```

This will open your browser to authenticate.

## Step 3: Initialize Fly.io in Your Project

Navigate to your project directory:
```bash
cd ha-hootz
```

Initialize Fly.io (this will create `fly.toml` if it doesn't exist):
```bash
flyctl launch
```

**Important prompts:**
- **App name**: Choose a unique name (e.g., `ha-hootz-prod`) or use the suggested one
- **Region**: Choose closest to your users (e.g., `iad` for US East, `sjc` for US West)
- **Postgres/Redis**: Select "No" (we're using external Upstash Redis)
- **Deploy now**: Select "No" (we'll configure secrets first)

## Step 4: Configure Environment Variables (Secrets)

Set all required secrets using Fly.io's secret management:

```bash
# Set Redis URL (Upstash)
flyctl secrets set REDIS_URL="rediss://default:YOUR_PASSWORD@YOUR_HOST:6380"

# Set MongoDB URI
flyctl secrets set MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority"

# Set MongoDB database name (optional)
flyctl secrets set MONGODB_DB_NAME="ha-hootz"

# Generate and set NextAuth secret
# Generate a secure secret:
openssl rand -base64 32

# Then set it (replace with your generated secret):
flyctl secrets set NEXTAUTH_SECRET="your_generated_secret_here"

# Set NextAuth URL (replace with your actual Fly.io app URL)
# You'll get this after first deployment, but set it now:
flyctl secrets set NEXTAUTH_URL="https://your-app-name.fly.dev"
```

**View all secrets:**
```bash
flyctl secrets list
```

**Note**: Secrets are encrypted and only available at runtime. They're not visible in `fly.toml`.

## Step 5: Review fly.toml Configuration

The `fly.toml` file has been pre-configured with:
- ✅ Port 3000 binding
- ✅ WebSocket support enabled
- ✅ Auto-start/stop disabled (keeps machines running for persistent connections)
- ✅ Health checks configured
- ✅ HTTPS forced

**Key settings explained:**
- `auto_stop_machines = false`: Prevents machines from stopping, keeping WebSocket connections alive
- `min_machines_running = 1`: Always keeps at least 1 instance running
- `force_https = true`: Enforces HTTPS for all connections
- `internal_port = 3000`: Matches your Node.js server port

## Step 6: Build and Deploy

### First Deployment

```bash
flyctl deploy
```

This will:
1. Build your Docker image
2. Push it to Fly.io
3. Deploy to your selected region
4. Start your app

**First deployment takes 5-10 minutes** (building Docker image).

### Update NEXTAUTH_URL After First Deployment

After the first deployment, get your app URL:
```bash
flyctl status
```

Then update the NEXTAUTH_URL secret:
```bash
flyctl secrets set NEXTAUTH_URL="https://your-actual-app-name.fly.dev"
```

**Important**: You may need to restart the app after updating NEXTAUTH_URL:
```bash
flyctl apps restart ha-hootz
```

## Step 7: Verify Deployment

### Check App Status
```bash
flyctl status
```

### View Logs
```bash
# Real-time logs
flyctl logs

# Follow logs (like tail -f)
flyctl logs --follow

# Last 100 lines
flyctl logs --limit 100
```

### Open Your App
```bash
flyctl open
```

This opens your app in the browser at `https://your-app-name.fly.dev`

### Test Socket.io Connection

1. Open browser DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Navigate to your app
4. You should see a WebSocket connection to `/api/socket`
5. Check that it shows "101 Switching Protocols"

## Step 8: Common Issues and Fixes

### Issue: App won't start / Port binding error

**Solution**: Ensure `server.ts` binds to `0.0.0.0`, not `localhost`:
```typescript
const hostname = process.env.HOSTNAME || (dev ? "localhost" : "0.0.0.0");
```

### Issue: WebSocket connections fail

**Solution**: 
1. Verify `force_https = true` in `fly.toml`
2. Check that Socket.io CORS origin matches your app URL
3. Ensure `NEXTAUTH_URL` is set correctly

### Issue: Redis connection fails

**Solution**:
1. Verify `REDIS_URL` secret is set correctly
2. Check Upstash allows connections from Fly.io IPs (usually allows all)
3. Ensure TLS is enabled if using `rediss://` protocol

### Issue: Build fails / Docker errors

**Solution**:
1. Check Dockerfile syntax
2. Ensure all dependencies are in `package.json`
3. Verify Node.js version matches (20.x)
4. Check build logs: `flyctl logs --build`

### Issue: App crashes on startup

**Solution**:
1. Check logs: `flyctl logs`
2. Verify all required environment variables are set
3. Test locally with production env vars first

## Step 9: Scaling and Performance

### Scale Vertically (More Resources)

```bash
# Increase memory to 1GB
flyctl scale memory 1024

# Increase CPU (shared)
flyctl scale count 1 --vm-cpu-kind shared --vm-cpus 2

# Increase CPU (dedicated - more expensive)
flyctl scale count 1 --vm-cpu-kind dedicated --vm-cpus 2
```

### Scale Horizontally (More Instances)

```bash
# Run 2 instances
flyctl scale count 2

# Run 3 instances
flyctl scale count 3
```

**Important for WebSockets**: 
- With multiple instances, Socket.io uses Redis adapter (already configured)
- All instances share the same Redis, so connections work across instances
- Consider using Fly.io's private networking for inter-instance communication

### Monitor Performance

```bash
# View metrics
flyctl metrics

# View app status
flyctl status

# SSH into a running instance (for debugging)
flyctl ssh console
```

## Step 10: Best Practices

### 1. Game State in Redis (Already Implemented ✅)

Your app already stores all game state in Redis:
- ✅ Game state (`gameStateKey`)
- ✅ Player data (`playersKey`)
- ✅ Answers (`answersKey`)
- ✅ Socket.io adapter using Redis

**No in-memory state** = Safe for multi-instance deployments

### 2. Handling App Restarts

Fly.io may restart your app for:
- Deployments
- Health check failures
- Resource limits
- Platform updates

**Your app handles this because:**
- All state is in Redis (persists across restarts)
- Socket.io clients reconnect automatically (exponential backoff configured)
- Players can rejoin and restore their answers

### 3. Health Checks

The health check endpoint (`/`) should:
- Return 200 OK quickly
- Not depend on external services (Redis/MongoDB)
- Be lightweight

Consider adding a dedicated health endpoint:
```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: "ok", timestamp: Date.now() });
}
```

### 4. Logging

Use structured logging for production:
```typescript
console.log(JSON.stringify({
  level: "info",
  message: "Game started",
  sessionId,
  timestamp: new Date().toISOString()
}));
```

View logs:
```bash
flyctl logs --json  # Structured JSON logs
```

### 5. Database Connections

- MongoDB: Connection pooling is handled by the MongoDB driver
- Redis: Connection reuse is configured in `lib/redis/client.ts`
- Both handle reconnections automatically

### 6. Preparing for Multi-Region

When ready to expand:

1. **Deploy to additional regions:**
```bash
flyctl regions add sjc  # San Jose, CA
flyctl regions add lhr  # London, UK
```

2. **Use Fly.io's private networking:**
```toml
[[services]]
  internal_port = 3000
  protocol = "tcp"
```

3. **Consider Redis replication:**
- Upstash supports global replication
- Or use Fly.io's Redis (if available in your plan)

4. **Session affinity:**
- Socket.io with Redis adapter handles this automatically
- Players connect to nearest region
- All regions share the same Redis state

## Step 11: Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/fly-deploy.yml`:

```yaml
name: Fly Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Fly.io
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Get your Fly API token:
```bash
flyctl auth token
```

Add it to GitHub Secrets as `FLY_API_TOKEN`.

## Troubleshooting Commands

```bash
# View app info
flyctl status

# View logs
flyctl logs

# SSH into instance
flyctl ssh console

# Restart app
flyctl apps restart ha-hootz

# View secrets (names only, not values)
flyctl secrets list

# Remove a secret
flyctl secrets unset SECRET_NAME

# View metrics
flyctl metrics

# Check DNS
flyctl dns list

# View IP addresses
flyctl ips list
```

## Cost Estimation

**Free Tier:**
- 3 shared-cpu-1x VMs with 256MB RAM
- 160GB outbound data transfer
- 3GB persistent volume storage

**For Production (estimated $5-20/month):**
- 1-2 shared-cpu-1x VMs with 512MB-1GB RAM
- Additional data transfer if needed
- Upstash Redis: Free tier available, paid plans start at ~$10/month

## Support

- Fly.io Docs: https://fly.io/docs
- Fly.io Community: https://community.fly.io
- Ha-Hootz Issues: Your GitHub repo

---

**Ready to deploy?** Run `flyctl deploy` and follow the steps above!
