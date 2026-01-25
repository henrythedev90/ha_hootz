#!/bin/bash

# Diagnostic script for Fly.io deployment issues
# This script helps identify why the app might not be starting correctly

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Fly.io Deployment Diagnostics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

APP_NAME="ha-hootz"

# 1. Check Fly.io authentication
echo "1️⃣  Checking Fly.io authentication..."
if flyctl auth whoami >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Authenticated to Fly.io${NC}"
    flyctl auth whoami
else
    echo -e "${RED}❌ Not authenticated to Fly.io${NC}"
    echo "   Run: flyctl auth login"
    exit 1
fi
echo ""

# 2. Check app status
echo "2️⃣  Checking app status..."
if flyctl status -a "$APP_NAME" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ App exists${NC}"
    flyctl status -a "$APP_NAME"
else
    echo -e "${RED}❌ App not found${NC}"
    echo "   Run: flyctl launch"
    exit 1
fi
echo ""

# 3. Check secrets
echo "3️⃣  Checking required secrets..."
REQUIRED_SECRETS=("REDIS_URL" "MONGODB_URI" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    if flyctl secrets list -a "$APP_NAME" 2>/dev/null | grep -q "^$secret"; then
        echo -e "${GREEN}✅ $secret is set${NC}"
    else
        echo -e "${RED}❌ $secret is missing${NC}"
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Missing secrets detected!${NC}"
    echo "   Set them with: flyctl secrets set $secret=\"value\" -a $APP_NAME"
    echo ""
fi
echo ""

# 4. Check recent logs
echo "4️⃣  Checking recent logs (last 50 lines)..."
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
flyctl logs -a "$APP_NAME" --limit 50 2>&1 | tail -50
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 5. Check machine status
echo "5️⃣  Checking machine status..."
flyctl machines list -a "$APP_NAME" 2>&1
echo ""

# 6. Check health check endpoint
echo "6️⃣  Testing health check endpoint..."
APP_URL=$(flyctl status -a "$APP_NAME" 2>/dev/null | grep "Hostname" | awk '{print $2}' || echo "")
if [ -n "$APP_URL" ]; then
    HEALTH_URL="https://$APP_URL/api/health"
    echo "   Testing: $HEALTH_URL"
    if curl -s -f -m 5 "$HEALTH_URL" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check endpoint is responding${NC}"
        curl -s "$HEALTH_URL" | jq . 2>/dev/null || curl -s "$HEALTH_URL"
    else
        echo -e "${RED}❌ Health check endpoint is not responding${NC}"
        echo "   This could indicate the server is not starting correctly"
    fi
else
    echo -e "${YELLOW}⚠️  Could not determine app URL${NC}"
fi
echo ""

# 7. Summary and recommendations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary & Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing Secrets:${NC}"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "   - $secret"
    done
    echo ""
fi

echo "Common issues and fixes:"
echo ""
echo "1. Server not listening on 0.0.0.0:3000"
echo "   - Check logs for startup errors"
echo "   - Verify HOSTNAME=0.0.0.0 and PORT=3000 are set"
echo "   - Ensure server.ts is starting correctly"
echo ""
echo "2. Health check timeouts"
echo "   - Health check now uses /api/health endpoint"
echo "   - This endpoint doesn't depend on Redis/MongoDB"
echo "   - Check if server is actually starting"
echo ""
echo "3. Redis connection failures"
echo "   - Server will now start even if Redis fails"
echo "   - Check REDIS_URL secret is correct"
echo "   - Verify Redis instance is accessible from Fly.io"
echo ""
echo "4. MongoDB connection failures"
echo "   - Check MONGODB_URI secret is correct"
echo "   - Verify MongoDB Atlas allows connections from Fly.io IPs"
echo "   - Check MongoDB network access settings"
echo ""
echo "Next steps:"
echo "1. Review the logs above for specific errors"
echo "2. Set any missing secrets"
echo "3. Try deploying again: flyctl deploy -a $APP_NAME"
echo "4. Monitor logs during deployment: flyctl logs -a $APP_NAME"
echo ""
