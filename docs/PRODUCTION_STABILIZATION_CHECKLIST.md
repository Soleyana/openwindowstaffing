# Production Stabilization – Validation Checklist

This checklist verifies the fixes from the production stabilization pass. Run through these manually before deploy.

## Pre-flight

- [ ] Client builds: `cd client && npm run build`
- [ ] Server tests pass: `cd server && npm test`

## 1. Edit Job

- [ ] As recruiter/owner, go to **Job Detail** (`/jobs/:id`) – "Edit Job" button visible in nav
- [ ] Click Edit → pre-filled form loads → change a field → Save Changes → success toast → redirects to job detail
- [ ] As recruiter/owner, go to **My Jobs** (`/my-jobs`) – "Edit" link visible per job row
- [ ] Edit from My Jobs → same flow works
- [ ] Recruiter from different company attempts edit → 403 or "You don't have permission"
- [ ] Double-click Save → button disabled while saving, no duplicate submits

## 2. Invite Recruiter (Idempotent)

- [ ] As owner, create invite for `test@example.com` to a company → success, link shown
- [ ] Create **same invite again** (same email, same company) → 200, no E11000, link shown (or "already pending" message)
- [ ] Rapid double-click on Send Invite → no duplicate invites, no 500
- [ ] Check server logs → no `E11000` or raw Mongo errors

## 3. Invite Page – No Flash

- [ ] Navigate to `/invite-recruiter` → no success message before page loads
- [ ] If companies loading → "Loading…" shown, no success box
- [ ] After successful invite → success box appears only after API response
- [ ] Refresh page → no stale success message on mount

## 4. Forgot Password

- [ ] Go to `/forgot-password` → enter known user email → submit
- [ ] Check server logs for: `[Auth] Forgot password – email sent` with `requestId`, `recipient` (masked)
- [ ] If Resend fails → 500 returned, clean message "Unable to send reset email"
- [ ] Reset link uses `CLIENT_URL` (e.g. `https://openwindowstaffing.com/reset-password?token=...`)

## 5. API Responses

- [ ] Any 4xx/5xx response includes `requestId`
- [ ] No raw Mongo messages (e.g. "E11000 duplicate key") to client
- [ ] Invite duplicate returns `{ success: true, message, data, requestId }` with 200

## 6. Logging & Stability

- [ ] No `console.log` of secrets or tokens
- [ ] No stack traces in production responses (server logs only)
- [ ] Unhandled errors return generic message, not internal details

---

**Summary of changes (this pass):**

| Fix | Files |
|-----|-------|
| Edit Job | `jobController.js`, `jobRoutes.js`, `api/jobs.js`, `JobPostForm.jsx`, `JobEdit.jsx`, `JobDetail.jsx`, `MyJobs.jsx`, `App.jsx`, `App.css` |
| Invite idempotent | `inviteController.js`, `sanitizeError.js` |
| Invite page flash | `InviteRecruiter.jsx` |
| Forgot password | `authController.js`, `emailService.js` |
| Logging | `requestId` (existing), `responseFormatter` (existing), `sanitizeError.js` |
