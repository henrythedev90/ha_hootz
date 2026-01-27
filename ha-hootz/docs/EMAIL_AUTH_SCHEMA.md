# Email Authentication Database Schema

This document describes the database collections used for email-based authentication flows.

## Collections

### auth_tokens

Stores authentication tokens for email verification and password reset flows.

**Schema:**
```typescript
{
  _id: ObjectId,
  userId: string,              // User ID (ObjectId as string)
  type: "verify_email" | "reset_password",
  tokenHash: string,            // Bcrypt-hashed token (never store plaintext)
  expiresAt: Date,             // Token expiration timestamp
  usedAt: Date | null,         // Timestamp when token was used (null if unused)
  createdAt: Date              // Token creation timestamp
}
```

**Indexes:**
- `{ userId: 1, type: 1, usedAt: 1, expiresAt: 1 }` - For efficient token lookup and cleanup

**Security:**
- Tokens are hashed using bcrypt before storage
- Tokens are single-use (marked as used after verification)
- Tokens expire after 15-30 minutes depending on type
- Rate limiting: Max 3 tokens per user per type per hour

### email_jobs

Stores email jobs for asynchronous email delivery. Processed by the shell script worker.

**Schema:**
```typescript
{
  _id: ObjectId,
  toEmail: string,              // Recipient email address
  template: "verify_email" | "reset_password",
  payload: string,              // JSON string containing template data (includes plaintext token)
  status: "pending" | "sent" | "failed",
  attempts: number,             // Number of send attempts
  lastError: string | null,     // Last error message if failed
  createdAt: Date              // Job creation timestamp
}
```

**Indexes:**
- `{ status: 1, createdAt: 1 }` - For efficient pending job retrieval
- `{ toEmail: 1, createdAt: 1 }` - For debugging and monitoring

**Security:**
- Payload contains plaintext token (only in job, never in auth_tokens table)
- Jobs are idempotent (can be safely reprocessed)
- Failed jobs are retried up to 3 times
- After 3 failed attempts, job is marked as permanently failed

### hosts (Updated)

The existing hosts collection has been extended with an `emailVerified` field.

**Updated Schema:**
```typescript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  name?: string,
  emailVerified: boolean,       // NEW: Email verification status
  createdAt: string,
  updatedAt: string
}
```

**Security:**
- Users with `emailVerified: false` cannot sign in
- Email verification is required before account activation

## Token Lifecycle

### Email Verification Token

1. **Creation**: Token created during user registration
2. **Storage**: Token hashed and stored in `auth_tokens` collection
3. **Email**: Plaintext token included in email job payload
4. **Verification**: User clicks link → token verified → marked as used → user email verified
5. **Expiration**: Token expires after 30 minutes
6. **Cleanup**: Expired tokens cleaned up periodically

### Password Reset Token

1. **Creation**: Token created when user requests password reset
2. **Storage**: Token hashed and stored in `auth_tokens` collection
3. **Email**: Plaintext token included in email job payload
4. **Verification**: User clicks link → token verified → password updated → token marked as used
5. **Expiration**: Token expires after 15 minutes
6. **Cleanup**: Expired tokens cleaned up periodically

## Email Job Lifecycle

1. **Creation**: Job created in `email_jobs` collection with `status: "pending"`
2. **Processing**: Shell script worker polls for pending jobs
3. **Sending**: Worker sends email via Resend API
4. **Success**: Job marked as `status: "sent"`
5. **Failure**: Job marked as `status: "pending"` (retry) or `status: "failed"` (after 3 attempts)

## Security Considerations

1. **Token Hashing**: All tokens are hashed before storage using bcrypt
2. **Single-Use**: Tokens are invalidated after successful use
3. **Expiration**: Tokens expire after a short time window
4. **Rate Limiting**: Token creation is rate-limited to prevent abuse
5. **Email Enumeration Prevention**: API responses don't reveal whether emails exist
6. **Idempotency**: Email jobs can be safely reprocessed without side effects
