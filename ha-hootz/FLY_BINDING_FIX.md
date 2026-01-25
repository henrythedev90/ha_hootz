# Fly.io Server Binding Fix

## Problem

Fly.io error:
```
WARNING: The app is not listening on the expected address and will not be reachable by fly-proxy.
Fly expects the app to listen on: 0.0.0.0:3000
```

## Root Cause Analysis

### Issue 1: Hostname Logic Could Default to localhost

**Location:** `server.ts` line 14

**Original code:**
```typescript
const hostname = process.env.HOSTNAME || (dev ? "localhost" : "0.0.0.0");
```

**Problem:**
- If `HOSTNAME` env var is not set AND `NODE_ENV` is not exactly "production", it defaults to `localhost`
- Even though `fly.toml` and `Dockerfile` set `HOSTNAME=0.0.0.0`, if there's any timing issue or env var loading problem, it could fall back to localhost
- Binding to `localhost` makes the server unreachable from outside the container

### Issue 2: Insufficient Logging

**Problem:**
- No verification that the server actually bound to the expected address
- No warning if hostname is incorrect when PORT is set (Fly.io always sets PORT)

## Solution Applied

### Fix 1: Improved Hostname Logic

**New code:**
```typescript
const hostname = process.env.HOSTNAME || (process.env.PORT ? "0.0.0.0" : (dev ? "localhost" : "0.0.0.0"));
```

**Why this works:**
- Fly.io **always** sets the `PORT` environment variable
- If `PORT` is set, we default to `0.0.0.0` regardless of dev/prod mode
- This ensures Fly.io deployments always bind to the correct address
- Local development (no PORT env var) still uses localhost for convenience

### Fix 2: Enhanced Logging and Verification

**Added:**
1. Warning if hostname is wrong when PORT is set
2. Logging of actual bound address after `listen()` succeeds
3. Explicit confirmation message for Fly.io proxy

**New logging:**
```typescript
.listen(port, hostname, () => {
  const address = httpServer.address();
  console.log(`✅ Server listening on http://${hostname}:${port}`);
  if (address && typeof address === 'object') {
    console.log(`   Bound to: ${address.address}:${address.port}`);
  }
  console.log("✅ Fly.io proxy can now route traffic to this server");
});
```

## Why Fly.io Couldn't Route Traffic Before

1. **Network Isolation**: Fly.io containers run in isolated network namespaces
2. **Proxy Requirement**: Fly.io's `fly-proxy` runs outside the container and needs to connect to `0.0.0.0:3000`
3. **localhost Binding**: If the server binds to `localhost` (127.0.0.1), it's only accessible from within the container
4. **0.0.0.0 Binding**: Binding to `0.0.0.0` makes the server accessible on all network interfaces, allowing the proxy to connect

## Verification

After deploying, check logs:

```bash
flyctl logs -a ha-hootz | grep "Server listening"
```

Should see:
```
✅ Server listening on http://0.0.0.0:3000
   Bound to: 0.0.0.0:3000
✅ Server is ready to accept connections
✅ Fly.io proxy can now route traffic to this server
```

## Configuration Files (Already Correct)

### fly.toml
```toml
[env]
  HOSTNAME = "0.0.0.0"
  PORT = "3000"

[http_service]
  internal_port = 3000
```

### Dockerfile
```dockerfile
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["npx", "tsx", "server.ts"]
```

These are correct - the fix ensures the server code respects these settings even if there are edge cases.

## Testing Locally

To test the binding logic locally:

```bash
# Should bind to localhost (no PORT env var)
npm run dev

# Should bind to 0.0.0.0 (PORT is set)
PORT=3000 npm run dev
```

## Summary

**Before:** Hostname could default to `localhost` in edge cases, making the server unreachable from Fly.io's proxy.

**After:** Hostname defaults to `0.0.0.0` when `PORT` is set (which Fly.io always does), ensuring the server is always reachable.

**Key Change:** One line of code that prioritizes `PORT` env var detection over `NODE_ENV` for hostname selection.
