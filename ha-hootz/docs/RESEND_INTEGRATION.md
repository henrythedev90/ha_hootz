# Resend Email Integration Guide

This guide covers Resend for transactional emails (verification, password reset) in Ha-Hootz.

## Overview

- **Production (Fly.io)**: Emails are sent **from the app** via the Resend API (`lib/send-email-resend.ts`). No separate worker is required. Set `RESEND_API_KEY` and optionally `RESEND_FROM_EMAIL` (defaults to `noreply@ha-hootz.com`). See [RESEND_TROUBLESHOOTING.md](./RESEND_TROUBLESHOOTING.md) if emails don’t send.
- **Scripts**: `send-email.sh` and `email-worker.sh` are used by the optional shell-script worker (e.g. for retries or standalone use). They use the same Resend API and templates.

## Production (Fly.io / www.ha-hootz.com)

After deployment, Resend is active at **https://www.ha-hootz.com** with:

- **From address**: `noreply@ha-hootz.com` (verify **ha-hootz.com** in [Resend → Domains](https://resend.com/domains) and add the DNS records they provide)
- **Secrets**: `RESEND_API_KEY` (required), `RESEND_FROM_EMAIL` (optional; defaults to noreply@ha-hootz.com)
- **Sending**: Register, forgot-password, and resend-verification flows send immediately from the app; no worker required

## Prerequisites (local / scripts)

1. **Resend Account**: Sign up at [resend.com](https://resend.com)
2. **API Key**: Get your API key from the Resend dashboard
3. **Verified Domain** (for production): Add and verify your domain in Resend

## Environment Variables

### Required

```bash
RESEND_API_KEY=re_your_api_key_here
```

### Optional

```bash
# From email address (defaults to noreply@ha-hootz.com)
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Base URL for generating magic links (defaults to http://localhost:3000)
APP_URL=https://yourdomain.com
# OR
NEXTAUTH_URL=https://yourdomain.com
```

## Usage

### Basic Usage

```bash
# Send email verification
./scripts/send-email.sh user@example.com verify_email abc123token

# Send password reset
./scripts/send-email.sh user@example.com reset_password xyz789token

# With recipient name (personalization)
./scripts/send-email.sh user@example.com verify_email abc123token "John Doe"
```

### Arguments

1. **recipient_email** (required) - Email address of the recipient
2. **template_type** (required) - Either `verify_email` or `reset_password`
3. **token_or_url** (required) - Token for magic link or full URL
4. **name** (optional) - Recipient name for personalization

### Token vs URL

The script accepts either:
- **Token**: Just the token string (e.g., `abc123token`)
  - Script will generate the full URL based on template type
- **Full URL**: Complete URL (e.g., `https://example.com/api/auth/verify-email?token=abc123`)
  - Script will use the URL as-is

## Example curl Request

The script internally makes a curl request like this:

```bash
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@ha-hootz.com",
    "to": ["user@example.com"],
    "subject": "Verify Your Email Address - Ha-Hootz",
    "html": "<!DOCTYPE html>...",
    "text": "Hi there,\n\nThank you for signing up..."
  }'
```

### Example Request Body

```json
{
  "from": "noreply@ha-hootz.com",
  "to": ["user@example.com"],
  "subject": "Verify Your Email Address - Ha-Hootz",
  "html": "<!DOCTYPE html><html>...minimal HTML template...</html>",
  "text": "Hi there,\n\nThank you for signing up for Ha-Hootz! Please verify your email address by visiting the following link:\n\nhttps://example.com/api/auth/verify-email?token=abc123\n\nThis link will expire in 30 minutes. If you didn't create an account, you can safely ignore this email.\n\n© 2026 Ha-Hootz. All rights reserved."
}
```

## Email Templates

### Email Verification Template

- **Subject**: "Verify Your Email Address - Ha-Hootz"
- **Expiration**: 30 minutes
- **Link**: `/api/auth/verify-email?token=...`

### Password Reset Template

- **Subject**: "Reset Your Password - Ha-Hootz"
- **Expiration**: 15 minutes
- **Link**: `/auth/reset-password?token=...`

Both templates include:
- Clean, minimal HTML design
- Plain text fallback
- Responsive layout
- Clear call-to-action button
- Fallback link for copy-paste
- Expiration notice
- Security warnings (for password reset)

## Exit Codes

The script returns meaningful exit codes:

- `0` - Success
- `1` - Invalid arguments
- `2` - Missing environment variables
- `3` - Invalid template type
- `4` - Resend API error
- `5` - Network/curl error

## Error Handling

The script handles various error scenarios:

1. **Invalid Arguments**: Validates email format and required parameters
2. **Missing Environment Variables**: Checks for `RESEND_API_KEY`
3. **API Errors**: Parses Resend API error responses and displays meaningful messages
4. **Network Errors**: Handles curl failures gracefully

### Example Error Output

```bash
$ ./scripts/send-email.sh invalid-email verify_email token
Error: Invalid email address format: invalid-email

$ ./scripts/send-email.sh user@example.com verify_email token
Error: RESEND_API_KEY environment variable is not set

$ ./scripts/send-email.sh user@example.com verify_email token
Error: Failed to send email (HTTP 401)
Error message: Invalid API key
```

## Integration with Email Worker

The script can be used by your email worker to send emails from the `email_jobs` table:

```bash
#!/bin/bash
# Example: Process email job and send email

# Get job data from database
JOB_ID="..."
TO_EMAIL="user@example.com"
TEMPLATE="verify_email"
TOKEN="abc123token"
NAME="John Doe"

# Send email
./scripts/send-email.sh "$TO_EMAIL" "$TEMPLATE" "$TOKEN" "$NAME"

# Check exit code
if [ $? -eq 0 ]; then
    echo "Email sent successfully"
    # Update job status in database
else
    echo "Failed to send email"
    # Update job status with error
fi
```

## Testing

### Test Email Verification

```bash
export RESEND_API_KEY="re_your_test_key"
./scripts/send-email.sh your-email@example.com verify_email test-token-123 "Test User"
```

### Test Password Reset

```bash
export RESEND_API_KEY="re_your_test_key"
./scripts/send-email.sh your-email@example.com reset_password test-token-456
```

### Debug Mode

Enable debug mode to see full API responses:

```bash
DEBUG=1 ./scripts/send-email.sh user@example.com verify_email token
```

## Production Deployment

### Fly.io

1. **Set Environment Variables**:
   ```bash
   fly secrets set RESEND_API_KEY=re_your_production_key
   fly secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com
   fly secrets set APP_URL=https://yourdomain.com
   ```

2. **Verify Domain in Resend**:
   - Add your domain in Resend dashboard
   - Add DNS records as instructed
   - Wait for verification

3. **Test in Production**:
   ```bash
   fly ssh console
   export RESEND_API_KEY="..."
   ./scripts/send-email.sh test@example.com verify_email token
   ```

### Local Development

1. Create `.env.local`:
   ```env
   RESEND_API_KEY=re_your_test_key
   RESEND_FROM_EMAIL=noreply@ha-hootz.com
   APP_URL=http://localhost:3000
   ```

2. Source environment variables:
   ```bash
   source .env.local
   export $(cat .env.local | xargs)
   ```

3. Test:
   ```bash
   ./scripts/send-email.sh your-email@example.com verify_email test-token
   ```

## Dependencies

The script requires:
- `bash` (version 4+)
- `curl` (for API requests)
- `jq` (for JSON parsing) - Install with: `brew install jq` (macOS) or `apt-get install jq` (Linux)

### Installing jq

**macOS**:
```bash
brew install jq
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt-get update && sudo apt-get install -y jq
```

**Linux (CentOS/RHEL)**:
```bash
sudo yum install -y jq
```

## Troubleshooting

### "jq: command not found"
Install jq (see Dependencies section above).

### "Invalid API key"
- Check that `RESEND_API_KEY` is set correctly
- Verify the API key in Resend dashboard
- Ensure no extra spaces or quotes in the key

### "Failed to connect to Resend API"
- Check internet connectivity
- Verify Resend API is accessible
- Check firewall/proxy settings

### Emails not received
- Check spam folder
- Verify sender email is verified in Resend
- Check Resend dashboard for delivery status
- Review API response for errors

## Security Notes

1. **API Key**: Never commit `RESEND_API_KEY` to version control
2. **Tokens**: The script receives tokens but never generates them
3. **Email Validation**: Basic email format validation is performed
4. **Error Messages**: Sensitive information is not exposed in error messages

## Support

For Resend API issues:
- [Resend Documentation](https://resend.com/docs)
- [Resend Support](https://resend.com/support)

For script issues:
- Check exit codes for error type
- Enable debug mode: `DEBUG=1 ./scripts/send-email.sh ...`
- Review script logs and Resend dashboard
