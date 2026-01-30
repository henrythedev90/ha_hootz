# Resend Not Working – Troubleshooting

Emails are now sent **from the app** (register, forgot-password, resend-verification) via the Resend API. No separate email worker is required on Fly.io.

## 1. Check Fly.io secrets

On Fly.io the app reads `RESEND_API_KEY` and `RESEND_FROM_EMAIL` from **secrets**:

```bash
fly secrets list
```

You should see:

- `RESEND_API_KEY` – required
- `RESEND_FROM_EMAIL` – optional (defaults to `noreply@ha-hootz.com`)

Set them if missing:

```bash
fly secrets set RESEND_API_KEY="re_xxxxxxxx"
fly secrets set RESEND_FROM_EMAIL="noreply@ha-hootz.com"
fly apps restart ha-hootz
```

## 2. Verify your domain in Resend

To send from **noreply@ha-hootz.com** you must verify **ha-hootz.com** in Resend:

1. Go to [Resend → Domains](https://resend.com/domains).
2. Add **ha-hootz.com**.
3. Add the DNS records Resend shows (SPF, DKIM, etc.) in Squarespace (or your DNS).
4. Wait until the domain shows as **Verified**.

Until the domain is verified, Resend only allows sending from **onboarding@resend.dev**. If you use `noreply@ha-hootz.com` before verification, Resend returns an error like **"Domain not found"** or **"You can only send from your own domains"**.

**Temporary workaround:** Use the Resend sandbox sender until the domain is verified:

```bash
fly secrets set RESEND_FROM_EMAIL="onboarding@resend.dev"
fly apps restart ha-hootz
```

Then switch back to `noreply@ha-hootz.com` after verifying ha-hootz.com.

## 3. See the exact Resend error in logs

When a send fails, the app logs the Resend error. View Fly logs:

```bash
fly logs
```

Look for lines like:

- `[Resend] API error: 403 ...`
- `[Resend] Send failed: ...`
- `Resend send failed (job remains pending): ...`

Those messages show the exact reason (e.g. invalid API key, domain not verified).

## 4. Test Resend from your machine

From the project root (with `.env.local` or env vars set):

```bash
cd ha-hootz
./scripts/test-resend.sh your@email.com
```

This sends one test email and prints the Resend API response so you can see success or the exact error. See [scripts/test-resend.sh](../scripts/test-resend.sh).

## 5. Common errors

| Error / symptom | What to do |
|----------------|------------|
| **RESEND_API_KEY is not set** | Set the secret on Fly: `fly secrets set RESEND_API_KEY="re_xxx"` and restart. |
| **Domain not found** / **You can only send from your own domains** | Verify ha-hootz.com in Resend and add the DNS records, or temporarily use `onboarding@resend.dev`. |
| **Invalid API key** / **401** | Create a new API key in [Resend → API Keys](https://resend.com/api-keys) and set `RESEND_API_KEY`. |
| **Emails never arrive** | Check spam; check Resend dashboard for delivery status; confirm "from" domain is verified. |

## 6. Optional: email worker (retries)

The app sends emails **immediately** from the API. The shell-script worker (`scripts/email-worker.sh`) is optional and used only to **retry** jobs that failed to send (e.g. Resend was down). If you run the worker (e.g. locally or as a separate Fly process), it will process any remaining **pending** jobs. You do not need the worker for emails to work on Fly.
