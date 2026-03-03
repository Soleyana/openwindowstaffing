# Open Window Staffing – Deployment & Development

## Overview

Healthcare staffing platform with React + Vite client and Express + MongoDB backend.

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes (prod) | MongoDB connection string |
| `JWT_SECRET` | Yes (prod) | Secret for JWT signing |
| `CLIENT_URL` | Yes (prod) | Frontend base URL (e.g. https://yoursite.com) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: localhost). **Production:** Include frontend URL, e.g. `https://yoursite.onrender.com` |
| `COOKIE_SAME_SITE` | No | `none` for cross-origin cookies (Render); `lax` for same-origin (default: `lax` in dev, `none` in prod) |
| `PORT` | No | Server port (default: 5000) |
| `RESEND_API_KEY` | No | Resend API key for emails (optional in dev) |
| `FROM_EMAIL` | No | Sender email for Resend |
| `CONTACT_EMAIL` | No | Recipient for contact form and invoice requests |
| `BILLING_EMAIL` | No | Override for invoice requests (otherwise uses company.billingEmail or CONTACT_EMAIL) |
| `STORAGE_BUCKET` | No | S3/R2 bucket for resumes (when set, uploads go to cloud) |
| `STORAGE_ACCESS_KEY` | No | S3/R2 access key |
| `STORAGE_SECRET_KEY` | No | S3/R2 secret key |
| `STORAGE_ENDPOINT` | No | R2: https://&lt;account&gt;.r2.cloudflarestorage.com |
| `DEFAULT_COMPANY` | No | Default company name |

### Client (`client/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL (default: /api for proxy) |
| `VITE_SITE_URL` | Site URL for meta tags |
| `VITE_GA_ID` | Google Analytics ID (optional) |

## Local Development

```bash
# Terminal 1 – server
cd server
npm install
npm run dev

# Terminal 2 – client
cd client
npm install
npm run dev
```

Client runs at http://localhost:5173. Vite proxy forwards `/api` and `/uploads` to the server.

## Production Build

```bash
cd client && npm run build
cd ../server && npm start
```

Set `VITE_API_URL` to the production API URL when building the client.

## Background Jobs

Uses Agenda (MongoDB). Jobs run automatically when the server starts:

- **Job expiry** – hourly; notifies recruiters when jobs expire
- **Credential expiry** – daily at 9am; reminds candidates of expiring documents

Requires `MONGODB_URI`. Jobs are stored in `agendaJobs` collection.

## Rate Limits

- Auth (login, register, etc.): 20 req / 15 min
- Contact: 10 req / hour
- Apply: 30 req / hour

## Production Launch

The server validates required env at startup. In production, missing or invalid config causes immediate exit with an error message. In dev/test, validation issues are logged as warnings only.

### Required Environment Variables (Production)

**Server (all required when NODE_ENV=production):**

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `JWT_SECRET` | Strong random secret (min 32 chars); must NOT be the default dev value | `openssl rand -base64 48` |
| `CORS_ORIGINS` | Comma-separated allowlist of frontend origins; no `*` | `https://app.example.com,https://www.example.com` |
| `COOKIE_SECURE` | Must be `true` when using cross-site cookies | `true` |
| `COOKIE_SAMESITE` | `none` for cross-site; `lax` for same-origin | `none` |

**When RESEND_API_KEY is set** (emails enabled), also require:

| Variable | Description |
|----------|-------------|
| `EMAIL_FROM` | Verified sender for Resend (not `onboarding@resend.dev`) |
| `EMAIL_REPLY_TO` | Optional; used for contact and invoice emails |

### Example Production `.env`

```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-strong-random-secret-min-32-chars
CORS_ORIGINS=https://app.example.com
COOKIE_SECURE=true
COOKIE_SAMESITE=none
CLIENT_URL=https://app.example.com
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
CONTACT_EMAIL=support@yourdomain.com
```

### Cookie & CORS for same-site vs cross-site

| Deployment | CORS_ORIGINS | COOKIE_SAMESITE | COOKIE_SECURE |
|------------|--------------|-----------------|---------------|
| Same origin (e.g. api.example.com + example.com) | `https://example.com` | `lax` | `true` |
| Cross origin (e.g. api.example.com + app.other.com) | `https://app.other.com` | `none` | `true` |

For cross-site cookies (different domains): `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true` are required. Both frontend and backend must use HTTPS.

### Diagnostics (Development Only)

When `NODE_ENV !== "production"`, `GET /api/diagnostics/cors` returns: origin received, cookie options, allowed origins, sameSite/secure flags. Use this to debug "works locally but not in prod" cookie/CORS issues.

---

## Deploying on Render

1. **Backend** – Create a Web Service. Set:
   - Build: `cd server && npm install`
   - Start: `npm start`
   - Env: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (frontend URL), `CORS_ORIGINS` (frontend URL)

2. **Frontend** – Create a Static Site or Web Service. Set:
   - Build: `cd client && npm install && npm run build`
   - Env: `VITE_API_URL` = backend URL + `/api` (e.g. `https://openwindowstaffing-1.onrender.com/api`)

3. **Cookies** – For cross-origin auth: both must be HTTPS; server sets `sameSite: none` and `secure: true` when `COOKIE_SAME_SITE=none`.

## Troubleshooting "Network Error"

- **CORS**: Ensure `CORS_ORIGINS` includes the exact frontend origin (no trailing slash).
- **Credentials**: Client must use `withCredentials: true` (Axios default in this project).
- **Base URL**: `VITE_API_URL` must match the deployed API (e.g. `https://api.onrender.com/api`).
- **Mixed content**: Frontend and API must both be HTTPS in production.
- **Status page**: Visit `/status` to ping `/api/health` and verify connectivity.
- **Request ID**: All JSON responses include `requestId` for debugging.

## Seed Script

For local development with demo data:

```bash
cd server
npm run seed:full
```

Creates: owner (owner@demo.com), recruiter (recruiter@demo.com), candidate (candidate@demo.com), company, facility, jobs, applications, messages. Password for all: `Demo123!`

## Compliance (Clear-to-Work)

Credentialing & Compliance helps recruiters determine if a candidate is cleared for work based on verified documents.

**Required documents for cleared status:** License, BLS, TB, Background check. All must be uploaded and verified; none may be rejected.

**Status logic (priority order):**
1. **blocked** – Any required document has been rejected
2. **missing** – One or more required documents are missing or not yet verified
3. **expiring** – One or more required documents are expired or expiring within 30 days
4. **cleared** – All required docs verified and not expiring/expired

**Endpoints:**
| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/candidates/me/compliance` | Applicant | Applicant's own compliance status |
| `GET /api/candidates/:candidateId/compliance?companyId=` | Recruiter | Candidate compliance (companyId required) |
| `POST /api/candidates/:candidateId/compliance/review` | Recruiter | Mark compliance as reviewed (body: `{ note?, companyId? }`) |
| `GET /api/recruiter/compliance?companyId=&candidateIds=` | Recruiter | Batch compliance for pipeline (comma-separated candidate IDs) |

## API Overview

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/health` | No | Health check + DB status |
| `GET /api/status` | No | Simple ok check |
| `GET /api/jobs` | No | List public jobs |
| `GET /api/applications/export.csv` | Recruiter | Export applications (query: companyId, jobId, status, from, to) |
| `GET /api/messages/start-options` | Yes | Options for starting a message (applications/candidates) |
| `GET /api/messages/threads` | Yes | List message threads |
| `POST /api/messages/threads` | Yes | Create/find thread |
| `GET /api/reports/listings` | Recruiter | Listing report with KPIs |
| `GET /api/reports/listings/export.csv` | Recruiter | Export listing report |
| `POST /api/invoices/request` | Recruiter | Request invoice (companyId required) |
| `POST /api/newsletter/subscribe` | No | Subscribe to newsletter |
| `POST/GET /api/newsletter/unsubscribe` | No | Unsubscribe (token required) |
| `GET /api/saved-jobs` | Applicant | List saved jobs |
| `POST /api/staffing-requests` | Recruiter | Create staffing request |

## Testing

```bash
cd server
npm test
```

Runs integration tests against a running server (default port 5000). Start the server in another terminal first.

**Key tests:** `/api/version` returns ok, ActivityLog `invoice_requested` saves without validation errors.
