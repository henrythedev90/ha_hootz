# Deploy Ha-Hootz to Fly.io — Quick Steps

Run these in your terminal from the **ha-hootz** directory.

## 1. Install Fly CLI (if needed)

```bash
curl -L https://fly.io/install.sh | sh
# Add to PATH: export PATH="$HOME/.fly/bin:$PATH"
```

## 2. Log in to Fly.io

```bash
flyctl auth login
```

Opens browser to sign in.

## 3. Set secrets (required)

Replace placeholders with your real values:

```bash
# Redis (Upstash: use rediss:// for TLS)
flyctl secrets set REDIS_URL="rediss://default:YOUR_PASSWORD@YOUR_HOST:6380"

# MongoDB Atlas
flyctl secrets set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
flyctl secrets set MONGODB_DB_NAME="ha-hootz"

# NextAuth (generate secret: openssl rand -base64 32)
flyctl secrets set NEXTAUTH_SECRET="your_32_char_secret"
flyctl secrets set NEXTAUTH_URL="https://ha-hootz.fly.dev"
```

## 4. Optional — email auth (signup, password reset)

```bash
flyctl secrets set RESEND_API_KEY="re_xxx"
flyctl secrets set RESEND_FROM_EMAIL="onboarding@resend.dev"
flyctl secrets set APP_URL="https://ha-hootz.fly.dev"
```

## 5. Deploy

```bash
flyctl deploy
```

First deploy can take 5–10 minutes (Docker build).

## 6. After first deploy

If your app URL differs from `ha-hootz.fly.dev`:

```bash
flyctl status   # see app URL
flyctl secrets set NEXTAUTH_URL="https://YOUR-APP-NAME.fly.dev"
flyctl secrets set APP_URL="https://YOUR-APP-NAME.fly.dev"
flyctl apps restart ha-hootz
```

## 7. Verify

```bash
flyctl open        # open app in browser
flyctl logs        # view logs
flyctl status      # app status
```

## One-liner (after secrets are set)

```bash
cd ha-hootz && ./deploy.sh
```

Or: `flyctl deploy`

---

**Custom domain (www.ha-hootz.com):** See [CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md) for Squarespace DNS and Fly.io cert setup.

**Troubleshooting:** See `DEPLOYMENT.md` for health checks, WebSockets, Redis, and scaling.
