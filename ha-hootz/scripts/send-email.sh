#!/bin/bash

################################################################################
# Send Email via Resend API
# 
# A production-ready shell script for sending transactional emails using Resend.
# This script generates clean HTML email templates and sends them via Resend's
# REST API using curl.
#
# Usage:
#   ./scripts/send-email.sh <recipient_email> <template_type> <token_or_url> [name]
#
# Arguments:
#   recipient_email  - Email address of the recipient
#   template_type    - Either "verify_email" or "reset_password"
#   token_or_url     - Token for magic link or full URL (depending on template)
#   name            - Optional recipient name for personalization
#
# Environment Variables:
#   RESEND_API_KEY   - Resend API key (required)
#   RESEND_FROM_EMAIL - From email address (optional, defaults to onboarding@resend.dev)
#   APP_URL          - Base URL for generating links (optional, defaults to http://localhost:3000)
#
# Exit Codes:
#   0 - Success
#   1 - Invalid arguments
#   2 - Missing environment variables
#   3 - Invalid template type
#   4 - Resend API error
#   5 - Network/curl error
#
# Example:
#   ./scripts/send-email.sh user@example.com verify_email abc123token "John Doe"
#   ./scripts/send-email.sh user@example.com reset_password xyz789token
################################################################################

set -euo pipefail

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load environment variables from .env.local if it exists (same as email-worker.sh)
if [ -f "${PROJECT_ROOT}/.env.local" ]; then
    set -a  # Automatically export all variables
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        case "$line" in
            \#*|'') continue ;;
            *)
                # Remove any leading/trailing whitespace
                line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
                # Parse KEY=VALUE format
                if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
                    key="${BASH_REMATCH[1]}"
                    value="${BASH_REMATCH[2]}"
                    # Remove surrounding quotes if present
                    value="${value#\"}"
                    value="${value%\"}"
                    value="${value#\'}"
                    value="${value%\'}"
                    # Export the variable
                    export "$key=$value"
                fi
                ;;
        esac
    done < "${PROJECT_ROOT}/.env.local"
    set +a  # Stop auto-exporting
fi

# Colors for output (optional, can be removed for production)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RESEND_API_URL="https://api.resend.com/emails"
DEFAULT_FROM_EMAIL="onboarding@resend.dev"
DEFAULT_APP_URL="http://localhost:3000"

# Parse arguments
if [ $# -lt 3 ]; then
    echo "Error: Missing required arguments" >&2
    echo "Usage: $0 <recipient_email> <template_type> <token_or_url> [name]" >&2
    exit 1
fi

RECIPIENT_EMAIL="$1"
TEMPLATE_TYPE="$2"
TOKEN_OR_URL="$3"
RECIPIENT_NAME="${4:-}"

# Validate email format (basic check)
if ! echo "$RECIPIENT_EMAIL" | grep -qE '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'; then
    echo "Error: Invalid email address format: $RECIPIENT_EMAIL" >&2
    exit 1
fi

# Validate template type
if [ "$TEMPLATE_TYPE" != "verify_email" ] && [ "$TEMPLATE_TYPE" != "reset_password" ]; then
    echo "Error: Invalid template type. Must be 'verify_email' or 'reset_password'" >&2
    exit 3
fi

# Check required environment variables
if [ -z "${RESEND_API_KEY:-}" ]; then
    echo "Error: RESEND_API_KEY environment variable is not set" >&2
    exit 2
fi

# Set defaults for optional environment variables
FROM_EMAIL="${RESEND_FROM_EMAIL:-$DEFAULT_FROM_EMAIL}"
APP_URL="${APP_URL:-${NEXTAUTH_URL:-$DEFAULT_APP_URL}}"

# Generate email content based on template type
generate_email_content() {
    local template="$1"
    local token_or_url="$2"
    local name="$3"
    local app_url="$4"
    
    # URL encode function (pure bash, no jq required)
    url_encode() {
        local string="$1"
        local encoded=""
        local i=0
        local len=${#string}
        while [ $i -lt $len ]; do
            local char="${string:$i:1}"
            case "$char" in
                [a-zA-Z0-9.~_-])
                    encoded="${encoded}${char}"
                    ;;
                *)
                    # Percent encode - use printf to get hex value
                    local hex
                    printf -v hex "%02X" "'$char"
                    encoded="${encoded}%${hex}"
                    ;;
            esac
            i=$((i + 1))
        done
        echo "$encoded"
    }
    
    # Determine if token_or_url is a full URL or just a token
    local magic_link
    if echo "$token_or_url" | grep -qE '^https?://'; then
        # It's already a full URL
        magic_link="$token_or_url"
    else
        # It's a token, generate the URL based on template type
        local encoded_token
        encoded_token=$(url_encode "$token_or_url")
        if [ "$template" = "verify_email" ]; then
            magic_link="${app_url}/auth/verify-email?token=${encoded_token}"
        else
            magic_link="${app_url}/auth/reset-password?token=${encoded_token}"
        fi
    fi
    
    local greeting
    if [ -n "$name" ]; then
        greeting="Hi ${name},"
    else
        greeting="Hi there,"
    fi
    
    local current_year=$(date +%Y)
    
    if [ "$template" = "verify_email" ]; then
        # Email verification template
        cat <<EOF
{
  "subject": "Verify Your Email Address - Ha-Hootz",
  "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Verify Your Email</title></head><body style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5\"><div style=\"background:#fff;border-radius:8px;padding:40px;box-shadow:0 2px 4px rgba(0,0,0,0.1)\"><h1 style=\"color:#667eea;margin:0 0 20px 0;font-size:24px\">Verify Your Email</h1><p style=\"font-size:16px;margin-bottom:20px;color:#333\">${greeting}</p><p style=\"font-size:16px;margin-bottom:30px;color:#666\">Thank you for signing up for Ha-Hootz! Please verify your email address by clicking the button below:</p><div style=\"text-align:center;margin:30px 0\"><a href=\"${magic_link}\" style=\"display:inline-block;background:#667eea;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px\">Verify Email Address</a></div><p style=\"font-size:14px;color:#666;margin-top:30px;margin-bottom:10px\">Or copy and paste this link into your browser:</p><p style=\"font-size:12px;color:#999;word-break:break-all;background:#f9fafb;padding:10px;border-radius:4px;font-family:monospace\">${magic_link}</p><p style=\"font-size:14px;color:#666;margin-top:20px\">This link will expire in 30 minutes. If you didn't create an account, you can safely ignore this email.</p></div><div style=\"text-align:center;margin-top:20px;padding:20px;color:#999;font-size:12px\"><p>© ${current_year} Ha-Hootz. All rights reserved.</p></div></body></html>",
  "text": "${greeting}\n\nThank you for signing up for Ha-Hootz! Please verify your email address by visiting the following link:\n\n${magic_link}\n\nThis link will expire in 30 minutes. If you didn't create an account, you can safely ignore this email.\n\n© ${current_year} Ha-Hootz. All rights reserved."
}
EOF
    else
        # Password reset template
        cat <<EOF
{
  "subject": "Reset Your Password - Ha-Hootz",
  "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Reset Your Password</title></head><body style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5\"><div style=\"background:#fff;border-radius:8px;padding:40px;box-shadow:0 2px 4px rgba(0,0,0,0.1)\"><h1 style=\"color:#f5576c;margin:0 0 20px 0;font-size:24px\">Reset Your Password</h1><p style=\"font-size:16px;margin-bottom:20px;color:#333\">${greeting}</p><p style=\"font-size:16px;margin-bottom:30px;color:#666\">We received a request to reset your password for your Ha-Hootz account. Click the button below to set a new password:</p><div style=\"text-align:center;margin:30px 0\"><a href=\"${magic_link}\" style=\"display:inline-block;background:#f5576c;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px\">Reset Password</a></div><p style=\"font-size:14px;color:#666;margin-top:30px;margin-bottom:10px\">Or copy and paste this link into your browser:</p><p style=\"font-size:12px;color:#999;word-break:break-all;background:#f9fafb;padding:10px;border-radius:4px;font-family:monospace\">${magic_link}</p><p style=\"font-size:14px;color:#666;margin-top:20px\">This link will expire in 15 minutes. If you didn't request a password reset, you can safely ignore this email.</p><p style=\"font-size:14px;color:#dc2626;margin-top:20px;font-weight:600\">⚠️ For security reasons, if you didn't request this reset, please contact support immediately.</p></div><div style=\"text-align:center;margin-top:20px;padding:20px;color:#999;font-size:12px\"><p>© ${current_year} Ha-Hootz. All rights reserved.</p></div></body></html>",
  "text": "${greeting}\n\nWe received a request to reset your password for your Ha-Hootz account. Visit the following link to set a new password:\n\n${magic_link}\n\nThis link will expire in 15 minutes. If you didn't request a password reset, you can safely ignore this email.\n\n⚠️ For security reasons, if you didn't request this reset, please contact support immediately.\n\n© ${current_year} Ha-Hootz. All rights reserved."
}
EOF
    fi
}

# Send email via Resend API
send_email() {
    local recipient="$1"
    local from_email="$2"
    local email_content="$3"
    
    # Build the complete request payload (using jq if available, otherwise manual JSON)
    local payload
    if command -v jq >/dev/null 2>&1; then
        # Use jq if available (more reliable)
        payload=$(echo "$email_content" | jq --arg to "$recipient" --arg from "$from_email" \
            '. + {to: [$to], from: $from}')
    else
        # Manual JSON construction (fallback if jq not available)
        # Extract subject, html, and text from email_content
        local subject=$(echo "$email_content" | grep -o '"subject": "[^"]*"' | cut -d'"' -f4)
        local html=$(echo "$email_content" | grep -o '"html": "[^"]*"' | cut -d'"' -f4- | sed 's/"$//')
        local text=$(echo "$email_content" | grep -o '"text": "[^"]*"' | cut -d'"' -f4- | sed 's/"$//')
        
        # Escape JSON special characters in HTML and text
        html=$(printf '%s' "$html" | sed 's/\\/\\\\/g; s/"/\\"/g')
        text=$(printf '%s' "$text" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/' | tr -d '\n' | sed 's/\\n$//')
        
        payload=$(cat <<EOF
{
  "from": "${from_email}",
  "to": ["${recipient}"],
  "subject": "${subject}",
  "html": "${html}",
  "text": "${text}"
}
EOF
)
    fi
    
    # Send email via Resend API
    local http_code
    local response
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST "$RESEND_API_URL" \
        -H "Authorization: Bearer $RESEND_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>&1) || {
        echo "Error: Failed to connect to Resend API" >&2
        exit 5
    }
    
    # Extract HTTP status code (last line)
    http_code=$(echo "$response" | tail -n1)
    # Extract response body (all but last line)
    response_body=$(echo "$response" | sed '$d')
    
    # Check HTTP status code
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        # Success - extract and log email ID
        local email_id
        if command -v jq >/dev/null 2>&1; then
            email_id=$(echo "$response_body" | jq -r '.id // empty' 2>/dev/null)
        else
            # Fallback: try to extract ID manually
            email_id=$(echo "$response_body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
        fi
        
        # Print success message with email ID (this will be captured by the worker)
        if [ -n "$email_id" ]; then
            echo "Email sent successfully to $recipient (Resend ID: $email_id)"
        else
            echo "Email sent successfully to $recipient"
        fi
        
        # Also print to stderr for separate logging if needed
        echo "Resend email ID: $email_id" >&2
        
        return 0
    else
        # Error - parse and display error message
        local error_message
        if command -v jq >/dev/null 2>&1; then
            error_message=$(echo "$response_body" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "Unknown error")
        else
            # Fallback: try to extract error message manually
            error_message=$(echo "$response_body" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 2>/dev/null || \
                           echo "$response_body" | grep -o '"error":"[^"]*"' | cut -d'"' -f4 2>/dev/null || \
                           echo "Unknown error")
        fi
        
        echo "Error: Failed to send email (HTTP $http_code)" >&2
        echo "Error message: $error_message" >&2
        
        # Print full response for debugging (can be removed in production)
        if [ "${DEBUG:-}" = "1" ]; then
            echo "Full response: $response_body" >&2
        fi
        
        exit 4
    fi
}

# Main execution
main() {
    # Generate email content
    local email_content
    email_content=$(generate_email_content "$TEMPLATE_TYPE" "$TOKEN_OR_URL" "$RECIPIENT_NAME" "$APP_URL")
    
    # Send email
    send_email "$RECIPIENT_EMAIL" "$FROM_EMAIL" "$email_content"
}

# Run main function
main "$@"
