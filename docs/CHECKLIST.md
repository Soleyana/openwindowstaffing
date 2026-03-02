# Open Window Staffing – Deployment & Testing Checklist

## Pre-Deploy

- [ ] Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` in server env
- [ ] Set `CORS_ORIGINS` to include frontend URL (no trailing slash)
- [ ] Set `VITE_API_URL` when building client (API URL + `/api`)
- [ ] For cross-origin cookies on Render: `COOKIE_SAME_SITE=none`

## Post-Deploy Verification

1. **Health** – Visit `https://your-frontend/status` – should show "Connected" and DB status
2. **Auth** – Sign up, log in, log out. Verify cookie persists across requests
3. **Jobs** – Browse jobs, apply to job (applicant flow)
4. **Profile** – Edit candidate profile, upload document (Resume/License)
5. **Recruiter** – Log in as recruiter, view pipeline, export CSV, search candidates
6. **Messaging** – Create thread from application, send message
7. **Staffing Requests** – Create request, update status
8. **Saved Jobs** – Save/unsave job as applicant

## Local Dev Quick Test

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev

# Terminal 3 – seed demo data
cd server && npm run seed:full

# Terminal 4 – run tests (server must be running)
cd server && npm test
```

**Seed credentials** (password: `Demo123!`):
- owner@demo.com (owner)
- recruiter@demo.com (recruiter)
- candidate@demo.com (applicant)

## Common Issues

| Issue | Fix |
|-------|-----|
| Network Error on prod | Check CORS_ORIGINS, VITE_API_URL, both HTTPS |
| Cookie not sent | sameSite: none, secure: true, credentials: true |
| CSV download fails | Ensure auth cookie; check blob response handling |
| 401 on API calls | Cookie domain/path; verify JWT_SECRET matches |
