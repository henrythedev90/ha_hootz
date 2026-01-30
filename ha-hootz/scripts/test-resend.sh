#!/bin/bash
# Test Resend API: send one email and print the full response.
# Usage: ./scripts/test-resend.sh <your@email.com>
# Loads .env.local from project root (same as send-email.sh).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load .env.local
if [ -f "${PROJECT_ROOT}/.env.local" ]; then
  set -a
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in \#*|'') continue ;; esac
    line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      value="${value#\"}"; value="${value%\"}"
      value="${value#\'}"; value="${value%\'}"
      export "$key=$value"
    fi
  done < "${PROJECT_ROOT}/.env.local"
  set +a
fi

if [ -z "${RESEND_API_KEY:-}" ]; then
  echo "Error: RESEND_API_KEY not set. Set it in .env.local or the environment." >&2
  exit 1
fi

TO="${1:-}"
if [ -z "$TO" ]; then
  echo "Usage: $0 <your@email.com>" >&2
  exit 1
fi

FROM="${RESEND_FROM_EMAIL:-noreply@ha-hootz.com}"
SUBJECT="Ha-Hootz Resend test"
BODY="This is a test email from the Resend API. If you see this, Resend is working."

echo "Sending test email to: $TO"
echo "From: $FROM"
echo "---"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"$FROM\",
    \"to\": [\"$TO\"],
    \"subject\": \"$SUBJECT\",
    \"text\": \"$BODY\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY_JSON=$(echo "$RESPONSE" | sed '$d')

echo "HTTP status: $HTTP_CODE"
echo "Response body: $BODY_JSON"

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "---"
  echo "Success. Check the inbox (and spam) for $TO."
  exit 0
else
  echo "---"
  echo "Resend API returned an error. See https://resend.com/docs or docs/RESEND_TROUBLESHOOTING.md"
  exit 1
fi
