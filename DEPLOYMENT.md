# Deployment & Domain Setup

## When to Add Your Domain

**Plug in your domain when you're ready to deploy the site live.** During local development, use `localhost`.

---

## Deployment Options

### 1. Frontend (React)
- **Vercel** or **Netlify** – connect your repo, auto-deploys
- Build command: `npm run build`
- Output: `client/dist`

### 2. Backend (Node)
- **Railway**, **Render**, **Fly.io**, or **Heroku**
- Set env vars: `MONGODB_URI`, `JWT_SECRET`, `PORT`

### 3. Database
- **MongoDB Atlas** – keep using your existing `MONGODB_URI`

---

## Connecting Your Domain

1. **Buy/own a domain** (e.g. `openwindowstaffing.com`).

2. **Point DNS at your hosting:**
   - **Vercel/Netlify:** Add your domain in project settings, then at your registrar:
     - `CNAME`: `www` → `cname.vercel-dns.com` (or your host’s target)
     - Root: use their A record or ALIAS for `@`

3. **API URL:**  
   In production, the frontend must call your real API, not `http://localhost:5000`.  
   Add a config that uses:
   - `http://localhost:5000` for local dev  
   - `https://api.yourdomain.com` (or your backend URL) for production  

4. **CORS:**  
   Ensure your backend allows requests from `https://yourdomain.com`.

---

## Checklist Before Go-Live

- [ ] `MONGODB_URI` and `JWT_SECRET` set in production env
- [ ] API base URL updated in client for production
- [ ] CORS configured for your frontend URL
- [ ] SSL/HTTPS enabled (provided by Vercel/Netlify/Render, etc.)
