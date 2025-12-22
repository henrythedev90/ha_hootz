# Redis Setup Guide

This guide will help you set up Redis for the Ha Hootz application. Redis is used for managing real-time game sessions, player data, and leaderboards.

## Option 1: Upstash (Recommended for Serverless)

Upstash is a serverless Redis service that's perfect for Next.js applications and works seamlessly with serverless functions.

### Step 1: Create an Upstash Account

1. Go to [Upstash](https://upstash.com/)
2. Sign up for a free account (no credit card required)
3. Verify your email address

### Step 2: Create a Redis Database

1. After logging in, click "Create Database"
2. Choose a name for your database (e.g., "ha-hootz-redis")
3. Select a region closest to you
4. Choose the **Free** tier (10,000 commands/day)
5. Click "Create"

### Step 3: Get Your Connection URL

1. Once your database is created, click on it to view details
2. You'll see two connection options:
   - **REST API** (for HTTP requests)
   - **Redis URL** (for direct Redis connection)
3. Copy the **Redis URL** - it looks like:
   ```
   rediss://default:<token>@<endpoint>.upstash.io:6380
   ```
   Or:
   ```
   redis://default:<token>@<endpoint>.upstash.io:6379
   ```

### Step 4: Add to Environment Variables

Add the Redis URL to your `.env.local` file:

```env
REDIS_URL=rediss://default:<your-token>@<your-endpoint>.upstash.io:6380
```

Replace `<your-token>` and `<your-endpoint>` with the actual values from Upstash.

## Option 2: Local Redis (Development Only)

For local development, you can run Redis on your machine.

### macOS (using Homebrew)

```bash
# Install Redis
brew install redis

# Start Redis server
brew services start redis
```

### Linux (Ubuntu/Debian)

```bash
# Install Redis
sudo apt-get update
sudo apt-get install redis-server

# Start Redis server
sudo systemctl start redis-server
```

### Windows

1. Download Redis from [Redis for Windows](https://github.com/microsoftarchive/redis/releases)
2. Or use WSL (Windows Subsystem for Linux) and follow Linux instructions

### Local Connection URL

For local Redis (no password by default):

```env
REDIS_URL=redis://localhost:6379
```

If you set a password:

```env
REDIS_URL=redis://:<password>@localhost:6379
```

## Option 3: Redis Cloud (Alternative Cloud Option)

1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Sign up for a free account
3. Create a new database
4. Copy the connection URL from the dashboard
5. Add it to your `.env.local` file

## Testing Your Connection

Once you've added `REDIS_URL` to your `.env.local`:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Check the console output - you should see:
   ```
   Redis URL: redis://default:****@<your-endpoint>
   ```

3. If you see connection errors, verify:
   - The URL is correct
   - Your IP is whitelisted (for cloud services)
   - The Redis server is running (for local)

## Troubleshooting

### Connection Timeout

- **Upstash**: Check that your database is active and the URL is correct
- **Local**: Ensure Redis is running (`redis-cli ping` should return `PONG`)
- **Cloud**: Verify your IP address is whitelisted

### Authentication Failed

- Double-check the password/token in your connection URL
- For Upstash, make sure you're using the correct token (not the REST API token)
- URL-encode any special characters in passwords

### SSL/TLS Errors

- Upstash uses `rediss://` (with double 's') for SSL connections
- Make sure you're using the correct protocol in your URL

## Production Considerations

1. **Security**:
   - Never commit `.env.local` to version control
   - Use environment-specific Redis instances for production
   - Rotate passwords/tokens regularly

2. **Performance**:
   - Consider upgrading from free tier for production workloads
   - Monitor Redis memory usage
   - Set appropriate TTL (time-to-live) for keys

3. **Backup**:
   - Enable automated backups in your Redis provider
   - Consider Redis persistence options

## Free Tier Limits

- **Upstash Free**: 10,000 commands/day, 256 MB storage
- **Redis Cloud Free**: 30 MB storage, limited connections
- **Local Redis**: No limits, but requires your own infrastructure

## Next Steps

Once Redis is configured, you can:
- Start game sessions using `createSession()` from `lib/traviaRedis.ts`
- Manage player data and leaderboards
- Implement real-time features with Socket.io (when ready)

