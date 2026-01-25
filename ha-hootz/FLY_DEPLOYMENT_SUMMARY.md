# Fly.io Deployment Summary

## ✅ Files Created/Modified

### New Files
1. **`Dockerfile`** - Multi-stage Docker build for production
2. **`fly.toml`** - Fly.io app configuration with WebSocket support
3. **`.dockerignore`** - Excludes unnecessary files from Docker build
4. **`DEPLOYMENT.md`** - Complete deployment guide (detailed)
5. **`FLY_QUICKSTART.md`** - Quick reference guide
6. **`deploy.sh`** - Automated deployment helper script

### Modified Files
1. **`next.config.ts`** - Added `output: "standalone"` for Docker optimization
2. **`server.ts`** - Updated to bind to `0.0.0.0` for Fly.io compatibility

## 🎯 Key Configuration Decisions

### 1. Port Binding
- **Changed**: `hostname` now defaults to `0.0.0.0` in production
- **Why**: Fly.io requires binding to all interfaces, not just localhost
- **Impact**: App accessible from Fly.io's network

### 2. WebSocket Support
- **Configured**: `auto_stop_machines = false` in `fly.toml`
- **Why**: Prevents machines from stopping, keeping WebSocket connections alive
- **Impact**: Persistent connections for real-time gameplay

### 3. Standalone Build
- **Added**: `output: "standalone"` in `next.config.ts`
- **Why**: Reduces Docker image size and improves startup time
- **Impact**: Faster deployments, smaller images

### 4. TypeScript Server
- **Using**: `tsx` to run `server.ts` directly
- **Why**: No need to compile TypeScript separately
- **Impact**: Simpler build process, faster iterations

## 📋 Pre-Deployment Checklist

- [ ] Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
- [ ] Login to Fly.io: `flyctl auth login`
- [ ] Set `REDIS_URL` secret (Upstash connection string)
- [ ] Set `MONGODB_URI` secret (MongoDB Atlas connection string)
- [ ] Set `MONGODB_DB_NAME` secret (optional, defaults to "ha-hootz")
- [ ] Generate and set `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- [ ] Set `NEXTAUTH_URL` secret (update after first deploy with actual URL)
- [ ] Review `fly.toml` app name and region
- [ ] Test build locally (optional): `docker build -t ha-hootz .`

## 🚀 Deployment Steps

### Option 1: Using the Helper Script
```bash
./deploy.sh
```

### Option 2: Manual Deployment
```bash
# 1. Initialize (if not done)
flyctl launch --no-deploy

# 2. Set secrets
flyctl secrets set REDIS_URL="..."
flyctl secrets set MONGODB_URI="..."
flyctl secrets set NEXTAUTH_SECRET="..."
flyctl secrets set NEXTAUTH_URL="https://your-app.fly.dev"

# 3. Deploy
flyctl deploy

# 4. Update NEXTAUTH_URL after first deploy
flyctl status  # Get actual URL
flyctl secrets set NEXTAUTH_URL="https://actual-url.fly.dev"
flyctl apps restart ha-hootz
```

## 🔍 Verification Steps

1. **Check Status**
   ```bash
   flyctl status
   ```
   Should show: "1/1 machines running"

2. **View Logs**
   ```bash
   flyctl logs
   ```
   Look for:
   - ✅ Redis: Ready
   - ✅ Socket.io initialized
   - ✅ Ready on http://0.0.0.0:3000

3. **Test WebSocket**
   - Open app: `flyctl open`
   - Open DevTools → Network → WS filter
   - Should see WebSocket connection to `/api/socket`
   - Status should be "101 Switching Protocols"

4. **Test Game Flow**
   - Create account
   - Create presentation
   - Start game session
   - Join as player
   - Verify real-time updates work

## ⚠️ Common Pitfalls & Solutions

### Pitfall 1: WebSocket Connections Fail
**Symptoms**: Socket.io can't connect, 404 errors
**Solution**:
- Verify `NEXTAUTH_URL` matches your app URL exactly
- Check `force_https = true` in `fly.toml`
- Ensure CORS origin in `server.ts` uses `NEXTAUTH_URL`

### Pitfall 2: App Won't Start
**Symptoms**: App crashes on startup, port binding errors
**Solution**:
- Verify `HOSTNAME = "0.0.0.0"` in production
- Check all required secrets are set
- Review logs: `flyctl logs`

### Pitfall 3: Redis Connection Fails
**Symptoms**: Redis errors in logs, Socket.io adapter fails
**Solution**:
- Verify `REDIS_URL` is correct (Upstash format)
- Check TLS configuration if using `rediss://`
- Ensure Upstash allows connections from Fly.io IPs

### Pitfall 4: Build Fails
**Symptoms**: Docker build errors, missing dependencies
**Solution**:
- Check `package.json` has all dependencies
- Verify Node.js version (20.x)
- Review `.dockerignore` isn't excluding needed files

### Pitfall 5: State Lost on Restart
**Symptoms**: Game state resets when app restarts
**Solution**:
- ✅ Already handled! All state is in Redis
- Verify Redis persistence is enabled in Upstash
- Check Redis keys have appropriate TTLs

## 📊 Scaling Considerations

### Current Configuration
- **Instances**: 1 (minimum)
- **Memory**: 512MB
- **CPU**: 1 shared CPU
- **Cost**: ~$5-10/month

### Scaling Up
```bash
# More instances (horizontal)
flyctl scale count 3

# More resources (vertical)
flyctl scale memory 1024
flyctl scale vm --cpu-kind shared --cpus 2
```

### Multi-Region (Future)
```bash
# Add regions
flyctl regions add sjc  # San Jose
flyctl regions add lhr  # London

# Deploy to all regions
flyctl deploy
```

**Note**: Socket.io with Redis adapter already supports multi-instance deployments!

## 🔐 Security Best Practices

1. **Secrets Management**
   - ✅ All secrets stored in Fly.io (encrypted)
   - ✅ Never commit secrets to git
   - ✅ Rotate `NEXTAUTH_SECRET` periodically

2. **HTTPS**
   - ✅ `force_https = true` in `fly.toml`
   - ✅ Automatic SSL certificates via Fly.io

3. **CORS**
   - ✅ Socket.io CORS restricted to `NEXTAUTH_URL`
   - ✅ Credentials required for WebSocket

4. **Database**
   - ✅ MongoDB connection uses TLS
   - ✅ Redis connection uses TLS (`rediss://`)

## 📈 Monitoring

### View Metrics
```bash
flyctl metrics
```

### Set Up Alerts
- Use Fly.io dashboard for CPU/memory alerts
- Monitor Redis connection health
- Track Socket.io connection counts

### Log Aggregation
```bash
# Export logs
flyctl logs --json > logs.json

# Stream logs (tails by default)
flyctl logs -a ha-hootz
```

## 🎓 Next Steps

1. **Deploy to Fly.io** using the steps above
2. **Test thoroughly** with multiple concurrent games
3. **Monitor performance** and adjust resources as needed
4. **Set up CI/CD** using GitHub Actions (see `DEPLOYMENT.md`)
5. **Plan for multi-region** when user base grows

## 📚 Additional Resources

- **Fly.io Docs**: https://fly.io/docs
- **Fly.io Community**: https://community.fly.io
- **Socket.io Docs**: https://socket.io/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment

## 🆘 Getting Help

1. Check logs: `flyctl logs`
2. Review `DEPLOYMENT.md` for detailed troubleshooting
3. Fly.io Community: https://community.fly.io
4. GitHub Issues: Your repo

---

**Ready to deploy?** Start with `FLY_QUICKSTART.md` for a 5-minute setup!
