# Fix 404 on Application Submit

## Root cause
The backend on port 5000 is running **old code**. It does not have the `/api/applications/submit` route.

## Fix (do this now)

### 1. Stop the old backend
In the terminal where the server is running, press **Ctrl+C** to stop it.

If that doesn't work, kill the process:
```powershell
taskkill /PID 22608 /F
```
(Replace 22608 with the actual PID from `netstat -ano | findstr ":5000"` if different)

### 2. Start fresh
```powershell
cd c:\Users\soliy\openwindowstaffing\server
npm run dev
```

### 3. Verify
- Visit http://localhost:5000 — you should see `{"status":"API running"}` (not "API working")
- Visit http://localhost:5000/api/applications/ping — you should see `{"ok":true}`

### 4. Submit the form
Fill out and submit the job application. The backend terminal should print `APPLICATION RECEIVED`.
