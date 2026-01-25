#!/bin/bash

# Check Fly.io authentication and connection

echo "🔐 Checking Fly.io Authentication"
echo "=================================="
echo ""

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed"
    echo "   Install: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

echo "✅ flyctl is installed: $(flyctl version)"
echo ""

# Check if logged in
echo "Checking authentication status..."
if flyctl auth whoami &>/dev/null; then
    echo "✅ You are logged in to Fly.io"
    flyctl auth whoami
else
    echo "❌ You are NOT logged in to Fly.io"
    echo ""
    echo "To log in, run:"
    echo "  flyctl auth login"
    echo ""
    echo "This will open a browser for authentication."
    exit 1
fi

echo ""
echo "Checking app access..."
APP_NAME="ha-hootz"

if flyctl status --app $APP_NAME &>/dev/null; then
    echo "✅ You have access to app: $APP_NAME"
else
    echo "❌ Cannot access app: $APP_NAME"
    echo "   This might mean:"
    echo "   - App doesn't exist (run: flyctl apps create $APP_NAME)"
    echo "   - You don't have permission"
    echo "   - You're not logged in"
fi

echo ""
echo "✅ Authentication check complete!"
