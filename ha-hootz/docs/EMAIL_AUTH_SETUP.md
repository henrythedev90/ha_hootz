# Email Authentication Setup Guide

This guide explains how to set up and use the email-based authentication system for Ha-Hootz.

## Overview

The email authentication system provides:
- **Email Verification**: Magic link verification for new user signups
- **Password Reset**: Secure password reset via email links
- **Asynchronous Email Delivery**: Email sending handled by a background worker script

## Architecture

### Components

1. **Backend API Routes** (`app/api/auth/`)
   - `/register` - User registration with email verification
   - `/verify-email` - Email verification handler (magic link)
   - `/forgot-password` - Password reset request
   - `/reset-password` - Password reset completion
   - `/resend-verification` - Resend verification email

2. **Token Management** (`lib/auth-tokens.ts`)
   - Secure token generation using `crypto.randomBytes`
   - Token hashing with bcrypt before storage
   - Single-use tokens with expiration
   - Rate limiting (3 tokens per hour per type)

3. **Email Job System** (`lib/email-jobs.ts`)
   - Asynchronous email job creation
   - Job status tracking (pending, sent, failed)
   - Retry logic with attempt counting

4. **Email Worker Script** (`scripts/email-worker.sh`)
   - Polls database for pending email jobs
   - Sends emails via Resend API using curl
   - Handles retries and error reporting

## Database Collections

### auth_tokens
Stores hashed authentication tokens for email verification and password reset.

### email_jobs
Stores email jobs for asynchronous processing by the worker script.

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

## Running the Email Worker

### Development

Run the worker script manually:

```bash
cd ha-hootz
./scripts/email-worker.sh
```

The script will:
- Poll for pending email jobs every 10 seconds (configurable via `POLL_INTERVAL`)
- Process up to 10 jobs per batch (configurable via `MAX_JOBS_PER_BATCH`)
- Send emails via Resend API
- Handle retries and errors

### Production (Fly.io)

1. **Option 1: Separate Process**

   Add to your `fly.toml`:

   ```toml
   [processes]
     app = "npm start"
     email-worker = "./scripts/email-worker.sh"
   ```

   Scale the worker:

   ```bash
   fly scale count email-worker=1
   ```

2. **Option 2: Background Service**

   Run the worker as a systemd service or similar process manager.

3. **Option 3: Cron Job**

   Run the worker periodically via cron (less ideal, but works):

   ```bash
   */1 * * * * cd /path/to/ha-hootz && ./scripts/email-worker.sh
   ```

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

1. Check Resend API key is set correctly
2. Verify email worker is running
3. Check `email_jobs` collection for pending/failed jobs
4. Review worker script logs for errors

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
- [ ] Set `RESEND_FROM_EMAIL` to verified domain
- [ ] Configure email worker to run as separate process
- [ ] Set up monitoring for email job failures
- [ ] Configure proper `APP_URL` for production
- [ ] Test email delivery in production
- [ ] Set up alerts for failed email jobs
- [ ] Review and adjust rate limiting if needed
