# Email Authentication Setup Guide

This guide explains how to set up and use the email-based authentication system for Ha-Hootz.

## Overview

The email authentication system provides:
- **Email Verification**: Magic link verification for new user signups
- **Password Reset**: Secure password reset via email links
- **Email delivery via Resend**: Sent from the app on Fly.io (no worker required); optional shell worker for retries

## Architecture

### Components

1. **Backend API Routes** (`app/api/auth/`)
   - `/register` - User registration with email verification
   - `/verify-email` - Email verification handler (magic link)
   - `/forgot-password` - Password reset request
   - `/reset-password` - Password reset completion
   - `/resend-verification` - Resend verification email

2. **Resend sender** (`lib/send-email-resend.ts`)
   - Sends verification and password-reset emails from the app via Resend API
   - Used by register, forgot-password, and resend-verification routes
   - No separate worker required on Fly.io

3. **Token Management** (`lib/auth-tokens.ts`)
   - Secure token generation using `crypto.randomBytes`
   - Token hashing with bcrypt before storage
   - Single-use tokens with expiration
   - Rate limiting (3 tokens per hour per type)

4. **Email Job System** (`lib/email-jobs.ts`)
   - Email job creation (for audit and optional worker retries)
   - Job status tracking (pending, sent, failed)

5. **Email Worker Script** (`scripts/email-worker.sh`) — *optional*
   - Polls database for pending email jobs (retries only)
   - Sends via Resend API using `send-email.sh`
   - Not required on Fly.io; the app sends immediately

## Database Collections

### auth_tokens
Stores hashed authentication tokens for email verification and password reset.

### email_jobs
Stores email jobs (for audit and optional worker retries). The app sends immediately via Resend; the worker only processes any remaining pending jobs if you run it.

### hosts (updated)
Users collection extended with `emailVerified` field.

See [EMAIL_AUTH_SCHEMA.md](./EMAIL_AUTH_SCHEMA.md) for detailed schema documentation.

## Environment Variables

Add these to your `.env.local` file:

```env
# Existing variables
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=ha-hootz
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# New variables for email authentication
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@ha-hootz.com  # Optional, defaults to noreply@ha-hootz.com
APP_URL=http://localhost:3000  # Optional, defaults to NEXTAUTH_URL
```

### Getting a Resend API Key

1. Sign up at [Resend](https://resend.com)
2. Create an API key in the dashboard
3. Add it to your environment variables

## Production (Fly.io)

On Fly.io, **no email worker is required**. The app sends verification and password-reset emails via Resend from the API routes. Set secrets and ensure your domain is verified in Resend:

```bash
fly secrets set RESEND_API_KEY="re_xxxxxxxx"
fly secrets set RESEND_FROM_EMAIL="noreply@ha-hootz.com"
fly apps restart ha-hootz
```

Verify **ha-hootz.com** in [Resend → Domains](https://resend.com/domains) so `noreply@ha-hootz.com` works. See [RESEND_TROUBLESHOOTING.md](./RESEND_TROUBLESHOOTING.md) if emails don’t send.

## Running the Email Worker (optional, retries only)

The worker is **optional**. Use it only if you want to retry jobs that failed to send (e.g. Resend was temporarily down).

### Development

```bash
cd ha-hootz
./scripts/email-worker.sh
```

The script polls for pending jobs, sends via Resend API, and handles retries. The app already sends immediately, so the worker mainly processes any leftover pending jobs.

## User Flows

### New User Registration

1. User signs up with email and password
2. Account created with `emailVerified: false`
3. Verification token generated and email job created
4. Email worker sends verification email
5. User clicks magic link in email
6. Email verified, user can now sign in

### Email Verification

1. User receives email with verification link
2. Clicks link: `/api/auth/verify-email?token=...`
3. Token verified and consumed
4. User's `emailVerified` set to `true`
5. Redirected to sign-in page with success message

### Password Reset

1. User clicks "Forgot password?" on sign-in page
2. Enters email address
3. Reset token generated and email job created
4. Email worker sends password reset email
5. User clicks reset link
6. User enters new password
7. Password updated, token consumed
8. User can sign in with new password

## Security Features

1. **Token Hashing**: All tokens are hashed with bcrypt before storage
2. **Single-Use Tokens**: Tokens are invalidated after successful use
3. **Expiration**: Tokens expire after 15-30 minutes
4. **Rate Limiting**: Max 3 tokens per user per type per hour
5. **Email Enumeration Prevention**: API responses don't reveal if emails exist
6. **Idempotent Jobs**: Email jobs can be safely reprocessed

## Monitoring

### Check Email Job Status

Query the `email_jobs` collection:

```javascript
// Pending jobs
db.email_jobs.find({ status: "pending" })

// Failed jobs
db.email_jobs.find({ status: "failed" })

// Job statistics
db.email_jobs.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

### Check Token Status

Query the `auth_tokens` collection:

```javascript
// Active tokens
db.auth_tokens.find({ usedAt: null, expiresAt: { $gt: new Date() } })

// Expired tokens
db.auth_tokens.find({ expiresAt: { $lt: new Date() } })
```

## Troubleshooting

### Emails Not Sending

1. Check Resend API key is set (Fly: `fly secrets list`; local: `.env.local`)
2. Verify ha-hootz.com is verified in [Resend → Domains](https://resend.com/domains) if using noreply@ha-hootz.com
3. Check Fly logs for `[Resend]` errors: `fly logs`
4. See [RESEND_TROUBLESHOOTING.md](./RESEND_TROUBLESHOOTING.md) for full steps

### Tokens Not Working

1. Check token expiration (15-30 minutes)
2. Verify token hasn't been used already
3. Check rate limiting (max 3 per hour)
4. Review `auth_tokens` collection

### User Can't Sign In

1. Verify user's email is verified (`emailVerified: true`)
2. Check if user exists in `hosts` collection
3. Verify password is correct
4. Check NextAuth configuration

## Testing

### Manual Testing

1. **Registration Flow**:
   ```bash
   # Sign up a new user
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
   ```

2. **Email Verification**:
   ```bash
   # Get token from email_jobs collection, then:
   curl http://localhost:3000/api/auth/verify-email?token=TOKEN_HERE
   ```

3. **Password Reset**:
   ```bash
   # Request reset
   curl -X POST http://localhost:3000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   
   # Complete reset (get token from email_jobs)
   curl -X POST http://localhost:3000/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"TOKEN_HERE","password":"newpassword123"}'
   ```

## Production Checklist

- [ ] Set `RESEND_API_KEY` in Fly.io secrets
- [ ] Set `RESEND_FROM_EMAIL` to verified domain (e.g. noreply@ha-hootz.com)
- [ ] Verify ha-hootz.com in Resend Domains so sending from noreply@ha-hootz.com works
- [ ] (Optional) Run email worker only if you want retries for failed sends
- [ ] Set up monitoring for email job failures
- [ ] Configure proper `APP_URL` for production
- [ ] Test email delivery in production
- [ ] Set up alerts for failed email jobs
- [ ] Review and adjust rate limiting if needed
