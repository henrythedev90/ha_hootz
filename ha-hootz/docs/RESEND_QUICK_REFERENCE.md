# Resend Integration - Quick Reference

## Environment Variables

```bash
# Required
export RESEND_API_KEY="re_your_api_key_here"

# Optional
export RESEND_FROM_EMAIL="noreply@yourdomain.com"
export APP_URL="https://yourdomain.com"
```

## Usage Examples

```bash
# Email verification
./scripts/send-email.sh user@example.com verify_email abc123token

# Password reset
./scripts/send-email.sh user@example.com reset_password xyz789token

# With name
./scripts/send-email.sh user@example.com verify_email token123 "John Doe"
```

## Example curl Request (Manual)

```bash
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@ha-hootz.com",
    "to": ["user@example.com"],
    "subject": "Verify Your Email Address - Ha-Hootz",
    "html": "<!DOCTYPE html><html>...</html>",
    "text": "Plain text version..."
  }'
```

## Exit Codes

- `0` - Success
- `1` - Invalid arguments
- `2` - Missing RESEND_API_KEY
- `3` - Invalid template type
- `4` - Resend API error
- `5` - Network/curl error

## Dependencies

- `bash` (4+)
- `curl`
- `jq` (install: `brew install jq` or `apt-get install jq`)
