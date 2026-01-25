# Redis Connection Timeout Troubleshooting

## Problem

You're seeing:
```
✅ Socket.io initialized
Redis Pub Error: Connection timeout
Redis Sub Error: Connection timeout
```

This means Socket.io reports as "initialized" but Redis pub/sub clients are failing to connect.

## Root Causes

1. **Redis URL incorrect or inaccessible**
   - Wrong host/port
   - Wrong password
   - Network firewall blocking connection

2. **Network connectivity issues**
   - Fly.io can't reach your Redis instance
   - Redis instance not allowing connections from Fly.io IPs
   - TLS/SSL configuration mismatch

3. **Timeout too short**
   - Connection takes longer than 10 seconds
   - Network latency issues

## Diagnostic Steps

### 1. Verify Redis URL is set correctly

```bash
flyctl secrets list -a ha-hootz | grep REDIS_URL
```

Check the format:
- **Upstash**: `rediss://default:PASSWORD@HOST:6380`
- **Local/Standard**: `redis://HOST:6379`
- **With Auth**: `redis://:PASSWORD@HOST:6379`

### 2. Test Redis connection from Fly.io

SSH into your Fly.io machine:
```bash
flyctl ssh console -a ha-hootz
```

Then test Redis connection:
```bash
# If redis-cli is available
redis-cli -u $REDIS_URL ping

# Or test with Node.js
node -e "const redis = require('redis'); const client = redis.createClient({url: process.env.REDIS_URL}); client.connect().then(() => console.log('Connected!')).catch(e => console.error('Failed:', e));"
```

### 3. Check Redis provider settings

**For Upstash:**
- Verify the Redis URL is correct
- Check if the instance is active
- Verify TLS is enabled (should use `rediss://` not `redis://`)

**For other providers:**
- Check firewall/security groups allow connections from Fly.io IPs
- Verify the port is correct (6379 for Redis, 6380 for Redis with TLS)
- Check if IP whitelisting is required

### 4. Check logs for connection attempts

```bash
flyctl logs -a ha-hootz | grep -i redis
```

Look for:
- Connection attempts
- Error messages
- Timeout messages

## Common Issues & Fixes

### Issue 1: Wrong Redis URL Format

**Symptoms:**
- Connection timeout immediately
- No connection attempts logged

**Fix:**
```bash
# Verify format
flyctl secrets set REDIS_URL="rediss://default:PASSWORD@HOST:6380" -a ha-hootz

# Restart app
flyctl apps restart ha-hootz
```

### Issue 2: Network Firewall

**Symptoms:**
- Connection timeout after several seconds
- Works locally but not on Fly.io

**Fix:**
- Add Fly.io IP ranges to Redis allowlist
- Or use a Redis provider that doesn't require IP whitelisting (like Upstash)

### Issue 3: TLS/SSL Mismatch

**Symptoms:**
- Connection timeout
- SSL/TLS errors in logs

**Fix:**
- Use `rediss://` (with double 's') for TLS connections
- Use `redis://` (single 's') for non-TLS connections
- Don't manually configure TLS in the client - it's auto-detected from the URL

### Issue 4: Redis Instance Not Running

**Symptoms:**
- Connection timeout
- No response from Redis

**Fix:**
- Check Redis provider dashboard
- Verify instance is active
- Check if instance has been paused/stopped

## Improved Error Handling

The code has been updated to:
1. ✅ Better logging of connection attempts
2. ✅ Verify clients are actually connected before saying "initialized"
3. ✅ More informative error messages
4. ✅ Suppress repetitive timeout errors (they're logged but not spammed)

## Testing Locally

Test Redis connection locally first:

```bash
# Set REDIS_URL in .env.local
REDIS_URL="your-redis-url"

# Test connection
node -e "
const redis = require('redis');
const client = redis.createClient({url: process.env.REDIS_URL});
client.connect()
  .then(() => {
    console.log('✅ Connected!');
    return client.quit();
  })
  .catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  });
"
```

## Next Steps

1. **Check Redis URL format:**
   ```bash
   flyctl secrets list -a ha-hootz
   ```

2. **Test connection from Fly.io:**
   ```bash
   flyctl ssh console -a ha-hootz
   # Then test Redis connection
   ```

3. **Check Redis provider settings:**
   - Verify instance is running
   - Check firewall/security settings
   - Verify credentials are correct

4. **Monitor logs:**
   ```bash
   flyctl logs -a ha-hootz | grep -i redis
   ```

5. **If using Upstash:**
   - Verify you're using the REST API URL (for HTTP) or Redis URL (for TCP)
   - For Socket.io adapter, you need the TCP Redis URL, not REST API

## Expected Behavior After Fix

When Redis connects successfully, you should see:
```
🔗 Attempting to connect to Redis: rediss://default:****@...
🔌 Redis Pub: Connecting...
🔌 Redis Sub: Connecting...
✅ Redis Pub: Ready
✅ Redis Sub: Ready
✅ Redis pub/sub clients connected and ready
✅ Socket.io Redis adapter configured
✅ Socket.io initialized with Redis adapter
```

If you see timeout errors, Redis is not reachable from Fly.io.
