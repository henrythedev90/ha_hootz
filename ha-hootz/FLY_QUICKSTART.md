# Fly.io Quick Start Guide

## 🚀 Quick Deploy (5 minutes)

### 1. Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

### 2. Login
```bash
flyctl auth login
```

### 3. Set Secrets
```bash
# Get your app name first (or use the one from fly.toml)
APP_NAME="ha-hootz"  # Change to your app name

# Set all required secrets
flyctl secrets set REDIS_URL="rediss://default:PASSWORD@HOST:6380"
flyctl secrets set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
flyctl secrets set MONGODB_DB_NAME="ha-hootz"
flyctl secrets set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
flyctl secrets set NEXTAUTH_URL="https://${APP_NAME}.fly.dev"
```

### 4. Deploy
```bash
flyctl deploy
```

### 5. Update NEXTAUTH_URL (After First Deploy)
```bash
# Get your actual URL
flyctl status

# Update the secret
flyctl secrets set NEXTAUTH_URL="https://your-actual-url.fly.dev"

# Restart
flyctl apps restart ha-hootz
```

## 📋 Essential Commands

```bash
# Deploy
flyctl deploy

# View logs (tails by default)
flyctl logs -a ha-hootz

# Check status
flyctl status

# Open app
flyctl open

# Scale
flyctl scale count 2        # 2 instances
flyctl scale memory 1024    # 1GB RAM

# Restart
flyctl apps restart ha-hootz

# SSH into instance
flyctl ssh console
```

## ⚠️ Common Issues

**WebSocket not connecting?**
- Check `NEXTAUTH_URL` matches your app URL
- Verify `force_https = true` in fly.toml
- Check Socket.io CORS origin in server.ts

**App won't start?**
- Check logs: `flyctl logs`
- Verify all secrets are set: `flyctl secrets list`
- Ensure port 3000 is exposed

**Build fails?**
- Check Dockerfile syntax
- Verify Node.js 20 is used
- Check build logs: `flyctl logs --build`

## 🔧 Configuration Files

- `fly.toml` - Fly.io app configuration
- `Dockerfile` - Container build instructions
- `.dockerignore` - Files to exclude from build
- `DEPLOYMENT.md` - Full deployment guide

## 📚 Full Documentation

See `DEPLOYMENT.md` for complete deployment guide with:
- Detailed setup instructions
- Multi-region deployment
- Scaling strategies
- Monitoring and troubleshooting
- Best practices
