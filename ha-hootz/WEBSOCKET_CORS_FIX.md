# WebSocket Connection 400 Error Fix

## Problem

Players getting WebSocket connection errors:
```
WebSocket connection to 'wss://ha-hootz.fly.dev/api/socket/?EIO=4&transport=websocket&sid=...' failed
Failed to load resource: the server responded with a status of 400 ()
```

## Root Cause

The Socket.io server was rejecting WebSocket upgrade requests with a 400 error due to:

1. **Strict CORS origin checking**: The server only allowed exact matches of `NEXTAUTH_URL`
2. **Origin header variations**: Browsers might send origins with/without trailing slashes, or protocol variations
3. **Missing origin handling**: Some requests (like from mobile apps) don't send an origin header

## Fixes Applied

### 1. Improved CORS Configuration (`server.ts`)

**Before:**
```typescript
cors: {
  origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true,
}
```

**After:**
```typescript
cors: {
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) {
      return callback(null, true);
    }
    
    // Normalize and compare origins (handles trailing slashes, protocol variations)
    const normalizeOrigin = (url: string) => {
      return url.replace(/\/$/, '').toLowerCase();
    };
    
    // Check exact match and domain match
    // Allows http/https variations of the same domain
    // ...
  },
  methods: ["GET", "POST"],
  credentials: true,
}
```

**Key improvements:**
- ✅ Allows requests with no origin header
- ✅ Normalizes origins (removes trailing slashes, case-insensitive)
- ✅ Allows http/https protocol variations for the same domain
- ✅ Better logging for debugging

### 2. Enhanced Client Configuration

**Before:**
```typescript
const newSocket = io("/", {
  path: "/api/socket",
  // ...
});
```

**After:**
```typescript
const socketUrl = typeof window !== "undefined" ? window.location.origin : "/";
const newSocket = io(socketUrl, {
  path: "/api/socket",
  transports: ["websocket", "polling"],
  upgrade: true,
  // ...
});
```

**Key improvements:**
- ✅ Explicitly uses `window.location.origin` for clarity
- ✅ Explicitly enables WebSocket and polling transports
- ✅ Enables auto-upgrade to WebSocket
- ✅ Better logging for debugging

### 3. Added Connection Logging

Added server-side logging to track:
- CORS origin checks
- Connection attempts
- Connection errors

This helps diagnose issues in production.

## Why This Fixes the Issue

**Before:**
- Server rejected connections if origin didn't exactly match `NEXTAUTH_URL`
- Protocol variations (http vs https) caused rejections
- Trailing slash differences caused rejections
- Requests without origin header were rejected

**After:**
- Server accepts connections from the same domain regardless of protocol
- Normalizes origins before comparison
- Allows requests without origin header
- Better error messages for debugging

## Verification

After deploying, check logs:

```bash
flyctl logs -a ha-hootz | grep -i "socket.io"
```

Should see:
```
[Socket.io] Configuring CORS for origin: https://ha-hootz.fly.dev
[Socket.io] Allowing origin: https://ha-hootz.fly.dev
[Socket.io] New connection attempt from origin: https://ha-hootz.fly.dev
🧩 Socket connected: <socket-id>
```

## Testing

1. **Test from browser:**
   - Open `https://ha-hootz.fly.dev`
   - Open DevTools → Network → WS filter
   - Should see WebSocket connection with status "101 Switching Protocols"

2. **Test from mobile:**
   - Scan QR code
   - Should connect successfully
   - Check browser console for connection logs

3. **Test reconnection:**
   - Disconnect network briefly
   - Should automatically reconnect
   - Check logs for reconnection attempts

## Common Issues

### Still Getting 400 Errors

1. **Check NEXTAUTH_URL is set correctly:**
   ```bash
   flyctl secrets list -a ha-hootz | grep NEXTAUTH_URL
   ```
   Should match your app URL exactly: `https://ha-hootz.fly.dev`

2. **Check server logs for CORS blocks:**
   ```bash
   flyctl logs -a ha-hootz | grep "CORS blocked"
   ```
   This will show which origins are being rejected

3. **Verify Socket.io path matches:**
   - Server: `path: "/api/socket"`
   - Client: `path: "/api/socket"`
   - Must match exactly

### Connection Works But Disconnects Immediately

This could be a Redis connection issue. Check:
```bash
flyctl logs -a ha-hootz | grep -i redis
```

Should see:
```
✅ Redis Pub: Ready
✅ Redis Sub: Ready
✅ Redis pub/sub clients connected and ready
```

## Next Steps

1. Deploy the fix:
   ```bash
   flyctl deploy -a ha-hootz
   ```

2. Monitor logs:
   ```bash
   flyctl logs -a ha-hootz | grep -i socket
   ```

3. Test player connections:
   - Create a game session
   - Have players join via QR code
   - Verify WebSocket connections succeed

The WebSocket connections should now work correctly for all players.
