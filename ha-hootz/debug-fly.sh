#!/bin/bash

# Quick diagnostic script for Fly.io deployment issues

echo "🔍 Fly.io Diagnostic Script"
echo "============================"
echo ""

APP_NAME="ha-hootz"

echo "1️⃣  Checking app status..."
flyctl status --app $APP_NAME
echo ""

echo "2️⃣  Recent logs (last 50 lines)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
flyctl logs --app $APP_NAME --limit 50
echo ""

echo "3️⃣  Checking secrets..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
flyctl secrets list --app $APP_NAME
echo ""

echo "4️⃣  Machine status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
flyctl machine list --app $APP_NAME
echo ""

echo "✅ Diagnostic complete!"
echo ""
echo "Next steps:"
echo "  - Look for errors in the logs above"
echo "  - Verify all secrets are set"
echo "  - Check if Redis/MongoDB connections are failing"
echo ""
