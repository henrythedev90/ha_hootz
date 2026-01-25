# Fixed: Standalone Output Conflict

## Problem

You were seeing this error:
```
⚠ "next start" does not work with "output: standalone" configuration. 
Use "node .next/standalone/server.js" instead.
```

## Root Cause

The `next.config.ts` had `output: "standalone"` enabled, but you're using a **custom server** (`server.ts`) for Socket.io support. These two approaches are incompatible:

- **Standalone mode**: Creates a minimal server at `.next/standalone/server.js` that you run directly
- **Custom server**: You write your own server (like `server.ts`) that wraps Next.js

You can't use both at the same time.

## Solution Applied

### 1. Removed Standalone Output

Updated `next.config.ts` to remove `output: "standalone"`:

```typescript
const nextConfig: NextConfig = {
  // Note: We use a custom server (server.ts) for Socket.io support
  // Standalone output is not compatible with custom servers
};
```

### 2. Updated Dockerfile

Updated the Dockerfile to copy the full `.next` directory instead of `.next/standalone`:

```dockerfile
# Copy Next.js build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

# Copy all necessary source files
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/lib ./lib
# ... etc
```

## Why This Works

- **Custom server approach**: Your `server.ts` file uses `next({ dev, hostname, port })` to create a Next.js app instance and wraps it with Socket.io
- **No standalone needed**: Since you're using a custom server, you don't need standalone mode
- **Dockerfile handles it**: The Dockerfile copies all necessary files and dependencies

## Trade-offs

### Before (Standalone):
- ✅ Smaller Docker image (only minimal dependencies)
- ❌ Incompatible with custom servers
- ❌ More complex Dockerfile setup

### After (Custom Server):
- ✅ Works with Socket.io custom server
- ✅ Simpler configuration
- ❌ Slightly larger Docker image (includes all dependencies)

The size difference is usually minimal, and the custom server approach is necessary for Socket.io integration.

## Next Steps

1. **Rebuild and redeploy:**
   ```bash
   flyctl deploy -a ha-hootz
   ```

2. **Verify the warning is gone:**
   ```bash
   flyctl logs -a ha-hootz | grep -i "standalone\|next start"
   ```
   Should see no warnings.

3. **Check server starts correctly:**
   ```bash
   flyctl logs -a ha-hootz | grep "Server listening"
   ```
   Should see: `✅ Server listening on http://0.0.0.0:3000`

## Alternative Approach (If You Want Standalone)

If you really want to use standalone mode, you would need to:

1. Remove the custom server
2. Use Next.js API routes for Socket.io (more complex)
3. Or use a separate Socket.io server

But the custom server approach is simpler and works well for your use case.
