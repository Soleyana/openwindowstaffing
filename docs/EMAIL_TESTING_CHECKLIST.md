# Production Email Testing Checklist

**Temporary** configuration for verifying email flow on https://openwindowstaffing.com before cleaning demo accounts.

## 1. Pre-flight configuration

| Item | Status | Notes |
|------|--------|-------|
| `EMAIL_DISABLED` | false (unset or empty) | Must be false to send emails |
| `RESEND_API_KEY` | Set | From Resend dashboard |
| `EMAIL_FROM` | Set | Verified sender (e.g. your email or Resend sandbox) |
| `EMAIL_REPLY_TO` | Set via env | Reply-to for outgoing emails (company contact) |
| `CLIENT_URL` | `https://openwindowstaffing.com` | All email links use this; no localhost |
| `TEST_EMAIL_OVERRIDE` | Optional | If set, all emails go here instead of intended recipient |

### Resend sandbox limitation (why you're not receiving)

With `EMAIL_FROM=onboarding@resend.dev` (Resend sandbox), **you can only send TO** these addresses:
- `delivered@resend.dev` – simulates delivery
- `bounced@resend.dev`, `complained@resend.dev`, `suppressed@resend.dev`

**You cannot send to your Gmail or any real address** until you verify a domain.

### Resend domain verification (required to send to real emails)

1. Go to [resend.com/domains](https://resend.com/domains)
2. Add Domain → `openwindowstaffing.com` (or a subdomain like `mail.openwindowstaffing.com`)
3. Add the DNS records Resend provides (SPF, DKIM) to your DNS provider
4. Wait for verification (usually minutes)
5. Set in `.env`:
```bash
EMAIL_FROM=noreply@openwindowstaffing.com
```
6. Restart server

After that, newsletter and other emails will reach real addresses.

## 2. Safe logging

- On send attempt: logs `to` (masked), `caller`, `requestId`, `subject`.
- On success: `[Email] Sent` with requestId.
- On failure: `[Email] Send failed` with error message.
- **Never logged**: API keys, full email addresses (masked as `ab***@domain.com`), message body.

## 3. Manual test checklist

### Password reset

1. Go to https://openwindowstaffing.com/forgot-password
2. Enter a known user email (e.g. `owner@demo.com`).
3. Submit.
4. Check inbox (or `TEST_EMAIL_OVERRIDE` inbox) for "Reset your password".
5. Click link – should go to `https://openwindowstaffing.com/reset-password?token=...`.
6. Complete reset and log in.

### Recruiter invite

1. Log in as owner.
2. Create invite for a recruiter email.
3. **Email is sent automatically** to the invitee with the invite link.
4. Link is also shown on the page (copy to share manually if needed).
5. Invitee clicks link – must go to `CLIENT_URL` (e.g. `https://openwindowstaffing.com/invite/<token>`).
6. Complete signup/accept flow.

**Important:** Invite links use `CLIENT_URL`. If you use `localhost`, the link only works when the app is running locally. For real invites, set `CLIENT_URL=https://openwindowstaffing.com` so invitees can open the link.

### Contact form

1. Go to https://openwindowstaffing.com/contact
2. Fill name, email, subject, message.
3. Submit.
4. Check `CONTACT_EMAIL` inbox (or `TEST_EMAIL_OVERRIDE`) for "Contact form submission".
5. Reply-To should be the submitter’s email.

### Application confirmation

1. Apply to a job as candidate.
2. Check inbox for "Application received – [Job Title]".

### Compliance reminders (background job)

- Requires `ENABLE_BACKGROUND_JOBS=true`.
- Runs daily; sends when candidate has expiring credentials.
- Check logs for `[Email] Sent` with `caller: compliance_expiring`.

### Newsletter subscription

1. Subscribe at newsletter form.
2. Check inbox for "Newsletter subscription confirmed".

## 4. Troubleshooting "no email received"

### Quick checks

1. **Deployment env vars** – Ensure these are set in your hosting provider (Render, Railway, Vercel, etc.), not just in local `.env`:
   - `RESEND_API_KEY` – from [Resend dashboard](https://resend.com/api-keys)
   - `EMAIL_FROM` – verified sender (e.g. your Gmail for testing)

2. **Admin system** – `GET /api/admin/system` (platformAdmin) shows:
   - `email.ready` – true = emails should send
   - `email.resendConfigured` – true = API key is set

3. **Test email** – `POST /api/admin/test-email` with `{ "to": "your@email.com" }` (platformAdmin). Response includes `sent: true/false`.

4. **Server logs** – When subscribing, look for:
   - `[Email] Sent` → email was sent
   - `[Email] No RESEND_API_KEY` → key not set
   - `[Email] Send failed` → Resend error (check `err` in log)

5. **Resend sender** – If using a custom domain, the domain must be [verified in Resend](https://resend.com/domains). Until then, use `onboarding@resend.dev` or a verified email.

## 5. Post-testing cleanup (after verification)

- Remove `TEST_EMAIL_OVERRIDE`.
- Set `EMAIL_FROM`, `EMAIL_REPLY_TO`, `CONTACT_EMAIL` via env to production addresses (verified domain). Company contact goes in `CONTACT_EMAIL` and `EMAIL_REPLY_TO`.
- Verify `GET /api/admin/system` shows `TEST_EMAIL_OVERRIDE: false`.
