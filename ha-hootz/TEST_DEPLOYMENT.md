# Testing Deployment Locally

This guide helps you test your deployment setup without actually deploying to Fly.io.

## Quick Test

Run the automated test script:

```bash
npm run test:deploy
```

Or manually:

```bash
./test-deploy.sh
```

## Manual Testing Steps

### 1. Test Production Build

Build the app in production mode:

```bash
npm run build
```

This will:
- ✅ Verify Next.js builds successfully
- ✅ Check for TypeScript errors
- ✅ Validate all imports and dependencies
- ✅ Generate optimized production bundles

### 2. Test Production Server Locally

Start the production server:

```bash
npm start
```

Then:
- Open http://localhost:3000 in your browser
- Test all functionality (login, create session, join game, etc.)
- Check console for errors
- Verify Redis and MongoDB connections work

### 3. Test Docker Build (Optional)

Build the Docker image (simulates Fly.io environment):

```bash
docker build -t ha-hootz-test .
```

Run the container:

```bash
docker run -p 3000:3000 \
  --env-file .env.local \
  ha-hootz-test
```

Or use the npm script:

```bash
npm run test:docker
```

## What to Check

### ✅ Build Checks
- [ ] No TypeScript errors
- [ ] No missing dependencies
- [ ] All environment variables are accessible
- [ ] Next.js standalone output generated

### ✅ Runtime Checks
- [ ] Server starts without errors
- [ ] Redis connects successfully
- [ ] MongoDB connects successfully
- [ ] Socket.io initializes
- [ ] All API routes work
- [ ] Authentication works
- [ ] Game sessions can be created
- [ ] Players can join sessions

### ✅ Docker Checks
- [ ] Docker image builds successfully
- [ ] Container starts without errors
- [ ] App is accessible on port 3000
- [ ] Environment variables are loaded correctly

## Common Issues

### Build Fails
- **Missing env vars**: Check `.env.local` has all required variables
- **TypeScript errors**: Fix any type errors before deploying
- **Missing dependencies**: Run `npm ci` to ensure all deps are installed

### Server Won't Start
- **Port already in use**: Change `PORT` in `.env.local` or kill the process using port 3000
- **Redis connection fails**: Check Redis is running (`redis-cli ping`)
- **MongoDB connection fails**: Verify `MONGODB_URI` is correct

### Docker Build Fails
- **Build context issues**: Make sure you're in the project root
- **Missing files**: Check `.dockerignore` isn't excluding needed files
- **Memory issues**: Docker build may need more memory allocated

## Environment Variables for Testing

Make sure your `.env.local` has:

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=ha-hootz
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

For production testing, you might want to use production values:

```env
NEXTAUTH_URL=https://ha-hootz.fly.dev
REDIS_URL=rediss://... (your Upstash URL)
```

## Next Steps

Once all tests pass:

1. ✅ Commit your changes
2. ✅ Push to your repository
3. ✅ Deploy to Fly.io: `flyctl deploy -a ha-hootz`

## Troubleshooting

### Test Script Fails
- Make sure you have execute permissions: `chmod +x test-deploy.sh`
- Check that all required tools are installed (Node.js, npm, Docker)

### Production Build Different from Dev
- This is normal! Production builds are optimized
- Check for environment-specific code that might behave differently
- Test all features in production mode

### Docker vs Local Differences
- Docker uses Linux, your local might be macOS/Windows
- Some native dependencies might behave differently
- Test critical features in Docker to catch platform-specific issues
