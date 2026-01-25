# Debugging Docker Build Errors

## The Error
```
Error: failed to fetch an image or build from source: error building: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
```

This means the Next.js build is failing inside Docker.

## How to Debug

### Option 1: Build Locally with Docker

Test the Docker build locally to see the actual error:

```bash
cd /Users/flextop1/Desktop/ha_hootz/ha-hootz
docker build -t ha-hootz-test .
```

This will show you the exact build error.

### Option 2: Check Build Logs on Fly.io

After a failed deploy, check the build logs:

```bash
flyctl logs
```

Look for TypeScript errors, missing files, or other build issues.

### Option 3: Test Build Locally (without Docker)

Try building locally to see if there are any obvious issues:

```bash
npm run build
```

If this fails locally, fix those errors first.

## Common Causes

### 1. TypeScript Errors
- Check for TypeScript compilation errors
- Ensure all imports are correct
- Verify `tsconfig.json` is valid

### 2. Missing Environment Variables
- Some Next.js features require env vars at build time
- Check if any code accesses `process.env` during build
- Add build-time env vars to Dockerfile if needed

### 3. Missing Files
- Ensure all required files are in the Docker context
- Check `.dockerignore` isn't excluding needed files
- Verify all source files are copied

### 4. Standalone Output Issues
- The `output: "standalone"` might have issues
- Try temporarily removing it from `next.config.ts` to test

## Quick Fix: Try Without Standalone Output

If the issue persists, try this temporary fix:

1. Edit `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  // output: "standalone",  // Comment this out temporarily
};
```

2. Update Dockerfile to copy `.next` instead of `.next/standalone`:
```dockerfile
COPY --from=builder /app/.next ./.next
```

3. Test the build again.

## Next Steps

1. Run `docker build -t ha-hootz-test .` locally
2. Share the full error output
3. We can fix the specific issue based on the error
