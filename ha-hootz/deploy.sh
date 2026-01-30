#!/bin/bash

# Ha-Hootz Fly.io Deployment Script
# This script helps you deploy to Fly.io step by step

set -e  # Exit on error

echo "🚀 Ha-Hootz Fly.io Deployment Helper"
echo "===================================="
echo ""

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed."
    echo "Install it with: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

echo "✅ flyctl is installed"
echo ""

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "⚠️  Not logged in to Fly.io"
    echo "Logging in..."
    flyctl auth login
fi

echo "✅ Logged in to Fly.io"
echo ""

# Check if fly.toml exists
if [ ! -f "fly.toml" ]; then
    echo "⚠️  fly.toml not found. Initializing Fly.io..."
    flyctl launch --no-deploy
    echo ""
    echo "⚠️  IMPORTANT: Update NEXTAUTH_URL after first deployment!"
    echo "   Run: flyctl secrets set NEXTAUTH_URL=\"https://your-app-name.fly.dev\""
    echo ""
fi

# Check if secrets are set
echo "Checking required secrets..."
echo ""

REQUIRED_SECRETS=("REDIS_URL" "MONGODB_URI" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! flyctl secrets list 2>/dev/null | grep -q "$secret"; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo "⚠️  Missing required secrets:"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "   - $secret"
    done
    echo ""
    echo "Set them with:"
    echo "  flyctl secrets set SECRET_NAME=\"value\""
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ All required secrets are set"
fi

# Remind about optional email auth secrets (signup, password reset)
echo ""
echo "Optional (for email auth - signup, password reset):"
echo "  flyctl secrets set RESEND_API_KEY=\"re_xxx\" RESEND_FROM_EMAIL=\"noreply@yourdomain.com\""
echo "  flyctl secrets set APP_URL=\"https://ha-hootz.fly.dev\"  # or same as NEXTAUTH_URL"
echo ""

echo "📦 Building and deploying..."
echo ""

# Deploy
flyctl deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Check status: flyctl status"
echo "2. View logs: flyctl logs"
echo "3. Open app: flyctl open"
echo ""
