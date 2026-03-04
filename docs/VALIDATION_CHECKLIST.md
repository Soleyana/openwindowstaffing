# Validation Checklist – Healthcare Staffing Platform

Use this checklist to verify core flows before deployment. All URLs use `CLIENT_URL` from env (e.g. your deployed domain). No hardcoded values.

---

## Pre-flight

- [ ] **Build:** `cd client && npm run build` – succeeds
- [ ] **Tests:** `cd server && npm test` – all pass
- [ ] **Env:** Required vars set (see `.env.example`). For email: `RESEND_API_KEY`, `EMAIL_FROM`, `CLIENT_URL`

---

## 1. Authentication

| Check | Pass | Notes |
|-------|------|-------|
| Login with valid creds | | Cookie set, redirect to dashboard |
| Login with invalid creds | | 401, no crash |
| Logout | | Cookie cleared, redirect |
| Signup (applicant) | | Account created |
| Protected routes redirect unauthenticated | | Navigate to `/login` |
| Forgot password → submit email | | Success message; email sent if Resend configured |
| Reset password via email link | | New password works, token consumed |
| Invalid/expired reset token | | 400, clear message |

---

## 2. Invite Recruiter

| Check | Pass | Notes |
|-------|------|-------|
| Owner creates invite (email + company) | | Success, link shown, copy works |
| Email sent to invitee | | Check inbox; uses `CLIENT_URL` in link |
| Invite link opens accept-invite page | | Link must point to reachable URL (`CLIENT_URL`) |
| Accept invite → signup flow | | Account/role set, company membership created |
| Create same invite twice | | 200, no E11000, idempotent |
| Invite page – no flash on load | | No success message before API response |
| Revoke invite | | Invite marked used, link invalid |
| Resend invite | | New link, email sent |

---

## 3. Jobs

| Check | Pass | Notes |
|-------|------|-------|
| List jobs (public) | | Jobs visible, filters work |
| Job detail (public) | | Job loads |
| Recruiter/owner sees Edit on job detail | | Edit button visible |
| Recruiter/owner sees Edit on My Jobs | | Edit link per row |
| Edit job → save | | Success toast, redirect, changes persist |
| Create job | | Job created, appears in list |
| Delete job (own) | | Job removed |
| Apply to job (applicant) | | Application submitted |
| Applicant cannot edit job | | No Edit or 403 |

---

## 4. Invoices

| Check | Pass | Notes |
|-------|------|-------|
| Recruiter/owner loads `/invoices` | | Page loads, no crash |
| Generate invoice (date range) | | Draft created from approved timesheets |
| Issue draft invoice | | Status → Issued |
| Mark issued invoice paid | | Status → Paid |
| Export CSV | | File downloads |
| Export PDF (HTML) | | File downloads |
| Status badges (Draft/Issued/Paid) | | Correct colors display |

---

## 5. Applications & Pipeline

| Check | Pass | Notes |
|-------|------|-------|
| Applicant applies to job | | Application created |
| Recruiter views applicants (My Jobs) | | Applicants listed |
| Recruiter updates application status | | Status persists |
| Export applicants CSV | | File downloads |
| Cross-tenant: Recruiter A cannot see Company B applicants | | 403 |

---

## 6. Email

| Check | Pass | Notes |
|-------|------|-------|
| All links use production URL | | No localhost in emails when `CLIENT_URL` set |
| Resend sandbox | | Only sends to `*@resend.dev` test addresses |
| Domain verified | | Can send to real addresses (see `docs/EMAIL_TESTING_CHECKLIST.md`) |
| No secrets in logs | | API keys, tokens not logged |

---

## 7. Multi-tenant & Access Control

| Check | Pass | Notes |
|-------|------|-------|
| Recruiter in Company A cannot access Company B job applicants | | 403 |
| Recruiter in Company A cannot PATCH/DELETE Company B job | | 403 |
| Applicant A cannot withdraw Applicant B's application | | 403 |
| Recruiter cannot access `/api/admin` | | 403 |

---

## 8. Stability & Errors

| Check | Pass | Notes |
|-------|------|-------|
| 4xx/5xx responses include `requestId` | | In response body |
| No raw Mongo errors to client | | Sanitized message |
| No stack traces in production responses | | Generic message only |
| Error boundary catches render errors | | Fallback page shown |

---

## 9. Dashboard & Navigation

| Check | Pass | Notes |
|-------|------|-------|
| Recruiter dashboard loads | | Role-specific nav |
| Applicant dashboard loads | | Role-specific nav |
| Owner sees Invite Recruiter | | In nav |
| Recruiter (non-owner) does not see Invite Recruiter | | Not in nav |
| Platform admin sees Admin link | | In nav |

---

## 10. Key Pages (Smoke)

| Route | Pass | Notes |
|-------|------|-------|
| `/` | | Redirects or home |
| `/jobs` | | List loads |
| `/jobs/:id` | | Detail loads |
| `/login`, `/signup` | | Auth forms work |
| `/forgot-password` | | Form submits |
| `/contact` | | Form submits |
| `/invite-recruiter` | | Owner only |
| `/invoices` | | Staff only |
| `/my-jobs` | | Staff only |
| `/dashboard` | | Auth required |

---

## Environment Reference

| Variable | Purpose |
|----------|---------|
| `CLIENT_URL` | Base URL for invite/reset links; must be reachable by invitees |
| `RESEND_API_KEY` | Email sending |
| `EMAIL_FROM` | Sender address (verified in Resend for real delivery) |
| `EMAIL_REPLY_TO` | Reply-to for outgoing emails; set via env to company contact |
| `CONTACT_EMAIL` | Where contact form and similar go; set via env to company contact |
| `MONGODB_URI` | Database |
| `JWT_SECRET` | Auth (change from default in production) |
| `CORS_ORIGINS` | Allowed frontend origins |

Set `CONTACT_EMAIL` and `EMAIL_REPLY_TO` in your deployment env (e.g. hosting dashboard) to the company contact. See `server/.env.example` for full list.
