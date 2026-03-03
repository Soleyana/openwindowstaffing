# QA Manual Checklist – Open Window Staffing

Pre-requisite: Run `cd server && npm run seed:full` then `cd server && npm run dev` and `cd client && npm run dev`.

**Test credentials** (password: `Demo123!`): `owner@demo.com`, `recruiter@demo.com`, `candidate@demo.com`

---

## Auth & Core

- [ ] **Login** – Sign in with recruiter/candidate/owner; redirect to correct dashboard
- [ ] **Logout** – Sign out; session cleared, redirect to home
- [ ] **Sign up** – New applicant account; verify email in DB
- [ ] **401 / session expired** – Expire session (e.g. clear cookie); API returns 401; toast "session expired"; redirect to login
- [ ] **Protected routes** – Unauthenticated access to `/dashboard`, `/inbox`, etc. redirects to login

---

## Applicant Flow

- [ ] **Jobs browse** – Jobs page loads; filters work (keywords, location, category)
- [ ] **Job detail** – Click job; Apply CTA visible; save/unsave works
- [ ] **Apply** – Submit application with resume upload; success toast; application appears in My Applications
- [ ] **My Applications** – List of applications with status; link to job
- [ ] **Withdraw Application** – Candidate → My Applications → Withdraw an active application → shows Withdrawn badge; button disappears; recruiter pipeline shows Withdrawn badge and card is read-only
- [ ] **My Profile** – Edit profile; upload Resume/License/BLS/etc.; documents show status
- [ ] **Job Alerts** – Subscribe; receive confirmation

---

## Recruiter Flow

- [ ] **Pipeline (Applicant Pipeline)** – Kanban loads; drag & drop changes status; filters work
- [ ] **Pipeline compliance** – Compliance badges show (cleared/missing/expiring); batch load (no N+1)
- [ ] **Candidate Search** – Search by name/email; results link to Candidate Detail
- [ ] **Candidate Detail** – Profile, documents, compliance; verify/reject document; Mark Reviewed modal (ESC, focus trap)
- [ ] **Listing Reports** – Filters; KPI cards; table; CSV export
- [ ] **Orders (Invoice Request)** – Company selector; message; submit; success toast
- [ ] **Invite Recruiter** – Send invite; email sent
- [ ] **Staffing Requests** – Create/view requests

---

## Messaging (Inbox)

- [ ] **Inbox** – Thread list; select thread; messages load; send message
- [ ] **New Message (applicant)** – Applications listed; search filter; start thread; redirect to thread
- [ ] **New Message (recruiter)** – Candidates listed; search filter; start thread; redirect to thread
- [ ] **Empty state** – No threads; "New Message" CTA visible
- [ ] **Modal a11y** – ESC closes; focus trap; restore focus on close

---

## Other

- [ ] **Newsletter (Footer)** – Submit email; success or rate limit toast
- [ ] **Unsubscribe** – Visit `/unsubscribe?token=…` (from email); confirm
- [ ] **Status** – `/status` shows API + DB health
- [ ] **Saved Jobs** – Panel on job detail; saved list in dashboard
- [ ] **Legal** – Legal page loads
- [ ] **Lazy routes** – Pipeline, Inbox, Reports, Candidate Detail show brief "Loading…" then content

---

## Accessibility Smoke

- [ ] Modals: ESC closes; focus moves into modal; Tab cycles inside; focus restored on close
- [ ] Buttons/inputs have labels or aria-label
- [ ] Pipeline drag & drop still works (keyboard not required for MVP)

---

## Mobile Smoke Checklist

Resize to ~375px width or use DevTools device mode.

- [ ] **Navbar** – Hamburger opens; menu items accessible; dropdowns expand inline
- [ ] **Dashboard sidebar** – Hamburger (bottom-right) opens overlay; links work; backdrop closes
- [ ] **Inbox** – Thread list stacks; messages readable; New Message works
- [ ] **Pipeline** – Columns scroll horizontally; cards readable; drag still works
- [ ] **Forms** – Inputs sized; buttons tappable; no horizontal overflow

---

## Run Tests

```bash
# Server must be running
cd server && npm test
```
