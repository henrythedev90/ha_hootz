#!/bin/bash

################################################################################
# Email Worker Script
# 
# This script polls the MongoDB email_jobs collection for pending email jobs
# and sends them using the Resend API via curl.
#
# Architecture:
# - Fully asynchronous: Web requests never wait for email sending
# - Polling-based: Script polls database every N seconds
# - Retry logic: Failed jobs are retried up to 3 times with exponential backoff
# - Idempotent: Jobs can be safely reprocessed
#
# Environment Variables Required:
# - MONGODB_URI: MongoDB connection string
# - MONGODB_DB_NAME: Database name (defaults to 'ha-hootz')
# - RESEND_API_KEY: Resend API key for sending emails
# - APP_URL: Base URL of the application (for email links)
#
# Usage:
#   ./scripts/email-worker.sh
#
# For production (Fly.io):
#   - Run as a separate process/container
#   - Use fly.toml to configure as a separate app process
################################################################################

set -euo pipefail

# Get script directory for helper script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load environment variables from .env.local if it exists
# This allows the script to work with Next.js .env.local files
# Shell scripts don't automatically load .env files, so we do it here
if [ -f "${PROJECT_ROOT}/.env.local" ]; then
    # Export variables from .env.local
    # This handles comments, empty lines, and quoted/unquoted values
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

# Configuration
POLL_INTERVAL=${POLL_INTERVAL:-10}  # Poll every 10 seconds
MAX_JOBS_PER_BATCH=${MAX_JOBS_PER_BATCH:-10}  # Process up to 10 jobs per batch
MAX_RETRIES=3
INITIAL_BACKOFF=2  # Initial backoff in seconds
BACKOFF_MULTIPLIER=2

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check required environment variables
check_env() {
    local missing_vars=()
    
    if [ -z "${MONGODB_URI:-}" ]; then
        missing_vars+=("MONGODB_URI")
    fi
    
    if [ -z "${RESEND_API_KEY:-}" ]; then
        missing_vars+=("RESEND_API_KEY")
    fi
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    # Set defaults
    export MONGODB_DB_NAME=${MONGODB_DB_NAME:-"ha-hootz"}
    export APP_URL=${APP_URL:-"${NEXTAUTH_URL:-http://localhost:3000}"}
    
    log_info "Environment check passed"
    log_info "Database: ${MONGODB_DB_NAME}"
    log_info "App URL: ${APP_URL}"
}


# Get pending email jobs from MongoDB
# Uses the Node.js helper script for reliable MongoDB access
get_pending_jobs() {
    local limit="$1"
    
    # Use the Node.js helper script
    node "${SCRIPT_DIR}/email-worker-helper.js" get-pending "${limit}" 2>/dev/null || {
        log_error "Failed to get pending jobs from database"
        echo "[]"
        return 1
    }
}

# Update job status in MongoDB
# Uses the Node.js helper script for reliable MongoDB access
update_job_status() {
    local job_id="$1"
    local status="$2"
    local error="${3:-}"
    
    if [ "$status" = "sent" ]; then
        node "${SCRIPT_DIR}/email-worker-helper.js" mark-sent "${job_id}" 2>/dev/null || {
            log_error "Failed to mark job ${job_id} as sent"
            return 1
        }
    elif [ "$status" = "failed" ] || [ -n "$error" ]; then
        # Escape error message for shell
        local escaped_error=$(echo "$error" | sed "s/'/'\"'\"'/g")
        node "${SCRIPT_DIR}/email-worker-helper.js" mark-failed "${job_id}" "${escaped_error}" 2>/dev/null || {
            log_error "Failed to mark job ${job_id} as failed"
            return 1
        }
    fi
}

# Generate email content based on template
# This function generates the email HTML/text content using the template data
generate_email_content() {
    local template="$1"
    local payload="$2"
    
    # Parse payload JSON
    local token=$(echo "$payload" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.token || '')")
    local name=$(echo "$payload" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.name || '')")
    
    # Generate email content using Node.js (reusing our template functions)
    node -e "
        const baseUrl = process.env.APP_URL || 'http://localhost:3000';
        const token = '${token}';
        const name = '${name}';
        const template = '${template}';
        
        let subject, html, text;
        
        if (template === 'verify_email') {
            const verificationUrl = \`\${baseUrl}/api/auth/verify-email?token=\${encodeURIComponent(token)}\`;
            const greeting = name ? \`Hi \${name},\` : 'Hi there,';
            
            subject = 'Verify Your Email Address - Ha-Hootz';
            html = \`
<!DOCTYPE html>
<html>
<head>
    <meta charset=\"utf-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Verify Your Email</title>
</head>
<body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">
    <div style=\"background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">
        <h1 style=\"color: white; margin: 0; font-size: 28px;\">Verify Your Email</h1>
    </div>
    <div style=\"background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;\">
        <p style=\"font-size: 16px; margin-bottom: 20px;\">\${greeting}</p>
        <p style=\"font-size: 16px; margin-bottom: 20px;\">Thank you for signing up for Ha-Hootz! Please verify your email address by clicking the button below:</p>
        <div style=\"text-align: center; margin: 30px 0;\">
            <a href=\"\${verificationUrl}\" style=\"display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;\">Verify Email Address</a>
        </div>
        <p style=\"font-size: 14px; color: #6b7280; margin-top: 30px; margin-bottom: 10px;\">Or copy and paste this link into your browser:</p>
        <p style=\"font-size: 12px; color: #9ca3af; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;\">\${verificationUrl}</p>
        <p style=\"font-size: 14px; color: #6b7280; margin-top: 20px;\">This link will expire in 30 minutes. If you didn't create an account, you can safely ignore this email.</p>
    </div>
    <div style=\"text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;\">
        <p>© \${new Date().getFullYear()} Ha-Hootz. All rights reserved.</p>
    </div>
</body>
</html>
            \`;
            text = \`
\${greeting}

Thank you for signing up for Ha-Hootz! Please verify your email address by visiting the following link:

\${verificationUrl}

This link will expire in 30 minutes. If you didn't create an account, you can safely ignore this email.

© \${new Date().getFullYear()} Ha-Hootz. All rights reserved.
            \`.trim();
        } else if (template === 'reset_password') {
            const resetUrl = \`\${baseUrl}/auth/reset-password?token=\${encodeURIComponent(token)}\`;
            const greeting = name ? \`Hi \${name},\` : 'Hi there,';
            
            subject = 'Reset Your Password - Ha-Hootz';
            html = \`
<!DOCTYPE html>
<html>
<head>
    <meta charset=\"utf-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Reset Your Password</title>
</head>
<body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">
    <div style=\"background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">
        <h1 style=\"color: white; margin: 0; font-size: 28px;\">Reset Your Password</h1>
    </div>
    <div style=\"background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;\">
        <p style=\"font-size: 16px; margin-bottom: 20px;\">\${greeting}</p>
        <p style=\"font-size: 16px; margin-bottom: 20px;\">We received a request to reset your password for your Ha-Hootz account. Click the button below to set a new password:</p>
        <div style=\"text-align: center; margin: 30px 0;\">
            <a href=\"\${resetUrl}\" style=\"display: inline-block; background: #f5576c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;\">Reset Password</a>
        </div>
        <p style=\"font-size: 14px; color: #6b7280; margin-top: 30px; margin-bottom: 10px;\">Or copy and paste this link into your browser:</p>
        <p style=\"font-size: 12px; color: #9ca3af; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;\">\${resetUrl}</p>
        <p style=\"font-size: 14px; color: #6b7280; margin-top: 20px;\">This link will expire in 15 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
        <p style=\"font-size: 14px; color: #dc2626; margin-top: 20px; font-weight: 600;\">⚠️ For security reasons, if you didn't request this reset, please contact support immediately.</p>
    </div>
    <div style=\"text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;\">
        <p>© \${new Date().getFullYear()} Ha-Hootz. All rights reserved.</p>
    </div>
</body>
</html>
            \`;
            text = \`
\${greeting}

We received a request to reset your password for your Ha-Hootz account. Visit the following link to set a new password:

\${resetUrl}

This link will expire in 15 minutes. If you didn't request a password reset, you can safely ignore this email.

⚠️ For security reasons, if you didn't request this reset, please contact support immediately.

© \${new Date().getFullYear()} Ha-Hootz. All rights reserved.
            \`.trim();
        }
        
        console.log(JSON.stringify({ subject, html, text }));
    " || {
        log_error "Failed to generate email content for template: ${template}"
        return 1
    }
}

# Send email using Resend API
send_email() {
    local to_email="$1"
    local subject="$2"
    local html_content="$3"
    local text_content="$4"
    local from_email="${RESEND_FROM_EMAIL:-onboarding@resend.dev}"
    
    # Escape JSON special characters
    local escaped_html=$(echo "$html_content" | node -e "console.log(JSON.stringify(require('fs').readFileSync(0,'utf8')))")
    local escaped_text=$(echo "$text_content" | node -e "console.log(JSON.stringify(require('fs').readFileSync(0,'utf8')))")
    local escaped_subject=$(echo "$subject" | node -e "console.log(JSON.stringify(require('fs').readFileSync(0,'utf8')))")
    
    # Send email via Resend API
    local response=$(curl -s -w "\n%{http_code}" -X POST "https://api.resend.com/emails" \
        -H "Authorization: Bearer ${RESEND_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"from\": \"${from_email}\",
            \"to\": [\"${to_email}\"],
            \"subject\": ${escaped_subject},
            \"html\": ${escaped_html},
            \"text\": ${escaped_text}
        }")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        log_success "Email sent to ${to_email}"
        return 0
    else
        log_error "Failed to send email to ${to_email}. HTTP ${http_code}: ${body}"
        return 1
    fi
}

# Process a single email job
process_job() {
    local job_json="$1"
    
    # Extract job fields using Node.js
    local job_id=$(echo "$job_json" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); const id=j._id.\$oid || j._id; console.log(typeof id === 'object' ? id.toString() : id)")
    local to_email=$(echo "$job_json" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(j.toEmail || j.to_email)")
    local template=$(echo "$job_json" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(j.template)")
    local payload_str=$(echo "$job_json" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(typeof j.payload === 'string' ? j.payload : JSON.stringify(j.payload))")
    
    log_info "Processing job ${job_id} - Template: ${template}, To: ${to_email}"
    
    # Parse payload to extract token and name
    local token=$(echo "$payload_str" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.token || '')")
    local name=$(echo "$payload_str" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.name || '')")
    
    # Use the dedicated send-email.sh script for sending emails
    # This provides better separation of concerns and reusability
    local send_script="${SCRIPT_DIR}/send-email.sh"
    
    if [ ! -f "$send_script" ]; then
        log_error "send-email.sh script not found at ${send_script}"
        update_job_status "$job_id" "pending" "send-email.sh script not found"
        return 1
    fi
    
    # Verify Resend API key is available
    if [ -z "${RESEND_API_KEY:-}" ]; then
        log_error "RESEND_API_KEY is not set"
        update_job_status "$job_id" "pending" "RESEND_API_KEY environment variable not set"
        return 1
    fi
    
    # Call send-email.sh with appropriate arguments
    # Format: ./send-email.sh <recipient_email> <template_type> <token> [name]
    # Capture both stdout and stderr for logging
    local send_output
    local send_result
    
    log_info "Calling send-email.sh for job ${job_id}..."
    if [ -n "$name" ]; then
        send_output=$("$send_script" "$to_email" "$template" "$token" "$name" 2>&1)
        send_result=$?
    else
        send_output=$("$send_script" "$to_email" "$template" "$token" 2>&1)
        send_result=$?
    fi
    
    # Log the output from send-email.sh
    if [ -n "$send_output" ]; then
        echo "$send_output"
    fi
    
    # Check result
    if [ $send_result -eq 0 ]; then
        update_job_status "$job_id" "sent" ""
        log_success "Job ${job_id} completed successfully - email sent to ${to_email}"
        return 0
    else
        # Extract error message from send-email.sh output if available
        local error_msg
        if echo "$send_output" | grep -q "Error:"; then
            error_msg=$(echo "$send_output" | grep "Error:" | head -1)
        else
            error_msg="Failed to send email via Resend API (exit code: $send_result)"
        fi
        update_job_status "$job_id" "pending" "$error_msg"
        log_warning "Job ${job_id} failed: $error_msg"
        return 1
    fi
}

# Main worker loop
main() {
    log_info "Starting email worker..."
    check_env
    
    # Trap signals for graceful shutdown
    trap 'log_info "Shutting down email worker..."; exit 0' SIGTERM SIGINT
    
    while true; do
        log_info "Polling for pending email jobs..."
        
        # Get pending jobs
        local jobs_json=$(get_pending_jobs "${MAX_JOBS_PER_BATCH}")
        
        if [ -z "$jobs_json" ] || [ "$jobs_json" = "[]" ]; then
            log_info "No pending jobs found"
        else
            # Parse jobs array and process each job
            echo "$jobs_json" | node -e "
                const jobs = JSON.parse(require('fs').readFileSync(0, 'utf8'));
                if (Array.isArray(jobs)) {
                    jobs.forEach(job => {
                        console.log(JSON.stringify(job));
                    });
                }
            " | while IFS= read -r job_line; do
                if [ -n "$job_line" ]; then
                    process_job "$job_line" || true
                fi
            done
        fi
        
        # Wait before next poll
        sleep "${POLL_INTERVAL}"
    done
}

# Run main function
main "$@"
