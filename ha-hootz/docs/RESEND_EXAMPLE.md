# Resend Email Integration - Example curl Request

## Complete Example curl Request

This is the exact curl request that the `send-email.sh` script makes to Resend's API:

```bash
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@ha-hootz.com",
    "to": ["user@example.com"],
    "subject": "Verify Your Email Address - Ha-Hootz",
    "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Verify Your Email</title></head><body style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5\"><div style=\"background:#fff;border-radius:8px;padding:40px;box-shadow:0 2px 4px rgba(0,0,0,0.1)\"><h1 style=\"color:#667eea;margin:0 0 20px 0;font-size:24px\">Verify Your Email</h1><p style=\"font-size:16px;margin-bottom:20px;color:#333\">Hi there,</p><p style=\"font-size:16px;margin-bottom:30px;color:#666\">Thank you for signing up for Ha-Hootz! Please verify your email address by clicking the button below:</p><div style=\"text-align:center;margin:30px 0\"><a href=\"https://example.com/api/auth/verify-email?token=abc123\" style=\"display:inline-block;background:#667eea;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px\">Verify Email Address</a></div><p style=\"font-size:14px;color:#666;margin-top:30px;margin-bottom:10px\">Or copy and paste this link into your browser:</p><p style=\"font-size:12px;color:#999;word-break:break-all;background:#f9fafb;padding:10px;border-radius:4px;font-family:monospace\">https://example.com/api/auth/verify-email?token=abc123</p><p style=\"font-size:14px;color:#666;margin-top:20px\">This link will expire in 30 minutes. If you didn't create an account, you can safely ignore this email.</p></div><div style=\"text-align:center;margin-top:20px;padding:20px;color:#999;font-size:12px\"><p>© 2026 Ha-Hootz. All rights reserved.</p></div></body></html>",
    "text": "Hi there,\n\nThank you for signing up for Ha-Hootz! Please verify your email address by visiting the following link:\n\nhttps://example.com/api/auth/verify-email?token=abc123\n\nThis link will expire in 30 minutes. If you didn't create an account, you can safely ignore this email.\n\n© 2026 Ha-Hootz. All rights reserved."
  }'
```

## Request Body Structure

```json
{
  "from": "noreply@ha-hootz.com",
  "to": ["user@example.com"],
  "subject": "Verify Your Email Address - Ha-Hootz",
  "html": "<!DOCTYPE html>...minimal HTML email template...",
  "text": "Plain text version of the email"
}
```

## Response Examples

### Success Response (HTTP 200)

```json
{
  "id": "abc123def456"
}
```

### Error Response (HTTP 400/401/422)

```json
{
  "message": "Invalid API key"
}
```

or

```json
{
  "error": "Validation error",
  "message": "Invalid email address"
}
```

## Environment Variables Required

```bash
# Required
export RESEND_API_KEY="re_your_api_key_here"

# Optional
export RESEND_FROM_EMAIL="noreply@yourdomain.com"
export APP_URL="https://yourdomain.com"
```

## Testing the Script

```bash
# Set API key
export RESEND_API_KEY="re_your_test_key"

# Send test email
./scripts/send-email.sh your-email@example.com verify_email test-token-123

# Expected output on success:
# Email sent successfully to your-email@example.com
# abc123def456  (email ID printed to stderr)
```

## Status Codes

The script handles these HTTP status codes:

- **200-299**: Success - Email sent
- **400**: Bad Request - Invalid parameters
- **401**: Unauthorized - Invalid API key
- **422**: Unprocessable Entity - Validation error
- **429**: Too Many Requests - Rate limit exceeded
- **500+**: Server Error - Resend service issue

## Notes

1. **jq is optional**: The script works with or without `jq` installed, though `jq` is recommended for better JSON handling.

2. **URL Encoding**: Tokens are automatically URL-encoded. The script handles both full URLs and token strings.

3. **Error Handling**: All errors are logged with meaningful messages and appropriate exit codes.

4. **Production Ready**: The script includes proper error handling, validation, and logging suitable for production use.
