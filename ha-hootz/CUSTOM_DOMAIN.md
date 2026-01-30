# Using www.ha-hootz.com (Squarespace domain) with Fly.io

Use your Squarespace domain **www.ha-hootz.com** as the main URL for the app. Follow these steps.

---

## 1. Add the domain on Fly.io

From the **ha-hootz** directory:

```bash
# Add certificate for www (Fly will issue SSL automatically)
fly certs add www.ha-hootz.com
```

Fly will show DNS instructions. You’ll add a **CNAME** in Squarespace next.

Optional (apex domain):

```bash
fly certs add ha-hootz.com
```

Fly may ask for **A** and **AAAA** records (IPs). Run `fly certs show www.ha-hootz.com` (or `ha-hootz.com`) anytime to see the required records.

---

## 2. Point DNS in Squarespace to Fly.io

1. In **Squarespace**: **Settings → Domains** (or **Domains → DNS Settings** for your domain).
2. Add a **CNAME** record:
   - **Host / Name**: `www` (or `www.ha-hootz.com` depending on UI).
   - **Points to / Target**: `ha-hootz.fly.dev`
   - **TTL**: default (e.g. 1 hour).
3. Save.

If you added **ha-hootz.com** (apex) on Fly, use the **A** and **AAAA** values Fly shows (from `fly certs show ha-hootz.com`). Squarespace may list “A Record” and “AAAA Record” separately.

DNS can take a few minutes up to 48 hours. Check status:

```bash
fly certs check www.ha-hootz.com
```

When the certificate is issued, Fly will show something like “Certificate issued successfully.”

---

## 3. Set Fly.io secrets to use your domain

So the app and auth (NextAuth, emails, Socket.io) use **https://www.ha-hootz.com**:

```bash
fly secrets set NEXTAUTH_URL="https://www.ha-hootz.com"
fly secrets set APP_URL="https://www.ha-hootz.com"
```

Optional: keep **ha-hootz.fly.dev** working (e.g. during migration) by allowing both origins for Socket.io:

```bash
fly secrets set ADDITIONAL_ORIGINS="https://ha-hootz.fly.dev"
```

If you also use **ha-hootz.com** (no www), add it:

```bash
fly secrets set ADDITIONAL_ORIGINS="https://ha-hootz.fly.dev,https://ha-hootz.com"
```

Then restart the app:

```bash
fly apps restart ha-hootz
```

---

## 4. Redirect ha-hootz.com → www.ha-hootz.com (optional)

If you want **ha-hootz.com** to always go to **www.ha-hootz.com**:

- **Squarespace**: In Domains, see if there’s a “Redirect” or “Primary domain” option to point `ha-hootz.com` to `www.ha-hootz.com`.
- Or on Fly: add `ha-hootz.com` as a cert (step 1), then in the app you can add a redirect from `ha-hootz.com` to `https://www.ha-hootz.com` (e.g. in Next.js middleware or in `next.config.ts`).

---

## 5. Verify

- Open **https://www.ha-hootz.com** — app should load with a valid lock icon.
- Sign in, start a game, join from another device — Socket.io and auth should work.
- QR codes and email links will use `APP_URL` / `NEXTAUTH_URL`, so they’ll point to **https://www.ha-hootz.com**.

---

## Summary

| Step | Action |
|------|--------|
| 1 | `fly certs add www.ha-hootz.com` (and optionally `ha-hootz.com`) |
| 2 | In Squarespace DNS: CNAME `www` → `ha-hootz.fly.dev` (and A/AAAA for apex if used) |
| 3 | `fly certs check www.ha-hootz.com` until certificate is issued |
| 4 | `fly secrets set NEXTAUTH_URL="https://www.ha-hootz.com"` and `APP_URL="https://www.ha-hootz.com"` |
| 5 | Optional: `fly secrets set ADDITIONAL_ORIGINS="https://ha-hootz.fly.dev"` then `fly apps restart ha-hootz` |

After this, **www.ha-hootz.com** is your main URL and the app is configured to use it.
