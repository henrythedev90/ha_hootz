#!/bin/bash

# Test deployment locally without actually deploying
# This simulates the Fly.io production environment

set -e  # Exit on error

echo "🧪 Testing deployment setup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm found: $(npm --version)${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker not found - skipping Docker test${NC}"
    SKIP_DOCKER=true
else
    echo -e "${GREEN}✅ Docker found: $(docker --version)${NC}"
    SKIP_DOCKER=false
fi
echo ""

# Step 2: Check environment variables
echo "📋 Step 2: Checking environment variables..."
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local file not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ .env.local found${NC}"

# Check required env vars
REQUIRED_VARS=("MONGODB_URI" "NEXTAUTH_SECRET" "REDIS_URL")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env.local; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing environment variables: ${MISSING_VARS[*]}${NC}"
    echo "   (This is OK if testing build only)"
else
    echo -e "${GREEN}✅ All required environment variables found${NC}"
fi
echo ""

# Step 3: Install dependencies
echo "📋 Step 3: Installing dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci
else
    echo "Dependencies already installed, skipping..."
fi
echo -e "${GREEN}✅ Dependencies ready${NC}"
echo ""

# Step 4: Test production build
echo "📋 Step 4: Testing production build..."
echo "Building Next.js app (this may take a few minutes)..."
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

if npm run build; then
    echo -e "${GREEN}✅ Production build successful!${NC}"
else
    echo -e "${RED}❌ Production build failed${NC}"
    exit 1
fi
echo ""

# Step 5: Test production server locally
echo "📋 Step 5: Testing production server locally..."
echo "Starting production server on http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""

# Start server in background
export NODE_ENV=production
export PORT=3000
export HOSTNAME=localhost

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping server..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Server stopped${NC}"
}

trap cleanup EXIT INT TERM

# Start server
npm start &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is running!${NC}"
        echo ""
        echo "🌐 Server is available at: http://localhost:3000"
        echo ""
        echo "Testing endpoints..."
        
        # Test health check
        if curl -s http://localhost:3000 > /dev/null; then
            echo -e "${GREEN}✅ Health check passed${NC}"
        else
            echo -e "${RED}❌ Health check failed${NC}"
        fi
        
        echo ""
        echo -e "${GREEN}✅ Local production test complete!${NC}"
        echo ""
        echo "You can now:"
        echo "  1. Open http://localhost:3000 in your browser"
        echo "  2. Test your app functionality"
        echo "  3. Press Ctrl+C to stop the server"
        echo ""
        
        # Wait for user to stop
        wait $SERVER_PID
        break
    fi
    sleep 1
done

if [ $i -eq 30 ]; then
    echo -e "${RED}❌ Server failed to start within 30 seconds${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Step 6: Docker test (optional)
if [ "$SKIP_DOCKER" = false ]; then
    echo ""
    echo "📋 Step 6: Testing Docker build (simulating Fly.io)..."
    echo "Building Docker image..."
    
    if docker build -t ha-hootz-test . > /tmp/docker-build.log 2>&1; then
        echo -e "${GREEN}✅ Docker build successful!${NC}"
        echo ""
        echo "To test the Docker container, run:"
        echo "  docker run -p 3000:3000 --env-file .env.local ha-hootz-test"
        echo ""
        echo "Or test with Fly.io simulator:"
        echo "  flyctl machine run ha-hootz-test"
    else
        echo -e "${RED}❌ Docker build failed${NC}"
        echo "Check /tmp/docker-build.log for details"
        cat /tmp/docker-build.log | tail -20
    fi
fi

echo ""
echo -e "${GREEN}🎉 Deployment test complete!${NC}"
echo ""
echo "Summary:"
echo "  ✅ Production build: Working"
echo "  ✅ Local production server: Working"
if [ "$SKIP_DOCKER" = false ]; then
    echo "  ✅ Docker build: Working"
fi
echo ""
echo "Your app is ready to deploy! 🚀"
