# Open Window Staffing – Operations Runbook

## MongoDB Backup Strategy

### Atlas (recommended)

- **Automated backups**: Enable in Atlas → Cluster → Backup. Default: daily snapshots, 2-day retention (adjust per compliance).
- **Point-in-time recovery**: Enable for finer restore granularity.
- **Manual snapshot**: Cluster → ... → Snapshot → Take snapshot.

### mongodump (self-hosted / manual)

```bash
mongodump --uri="$MONGODB_URI" --out=./backup-$(date +%Y%m%d)
```

- Compress: `tar -czvf backup-$(date +%Y%m%d).tar.gz backup-*/`
- Store off-server (S3, backup storage).
- Schedule via cron or external job runner.

---

## Restore Checklist

1. **Stop app** – Prevent writes during restore.
2. **Restore from snapshot** (Atlas) – Cluster → ... → Restore, choose snapshot + target cluster.
3. **Restore from dump**:
   ```bash
   mongorestore --uri="$MONGODB_URI" --drop ./backup-YYYYMMDD
   ```
4. **Verify** – Run app, check `/api/health/ready`, spot-check key collections.
5. **Re-enable app** – Restart services; confirm jobs/email behavior.
6. **Incident postmortem** – Document cause, update backup/restore procedures if needed.

---

## Rotating Secrets

### JWT_SECRET

1. Generate new secret: `openssl rand -base64 48`
2. Set new value in env (deployment config).
3. Restart server – all existing sessions invalidated (users must re-login).
4. Remove old value from env.

### Resend / Email API Key

1. Create new key in Resend dashboard.
2. Update `RESEND_API_KEY` in env.
3. Restart server.
4. Revoke old key in Resend.

### MongoDB credentials

1. Create new DB user in Atlas / MongoDB.
2. Update `MONGODB_URI` with new credentials.
3. Restart server.
4. Delete or disable old user.

### Storage (S3/R2) keys

1. Create new IAM key / access key.
2. Update `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` in env.
3. Restart server.
4. Deactivate old key.

---

## Incident Checklist

### Disable background jobs

```bash
# Unset or set to empty; restart server
ENABLE_BACKGROUND_JOBS=
```

Or remove the variable. Jobs will not start.

**Verify**: `GET /api/admin/system` (platformAdmin) → `toggles.ENABLE_BACKGROUND_JOBS: false`.

### Disable outbound email

```bash
EMAIL_DISABLED=true
```

Restart server. All email sends are logged but not delivered.

**Verify**: `GET /api/admin/system` → `toggles.EMAIL_DISABLED: true`.

### Safe mode summary

| Toggle | Env | Effect |
|--------|-----|--------|
| Jobs off | `ENABLE_BACKGROUND_JOBS` unset or `false` | No job expiry, digest, or compliance emails |
| Email off | `EMAIL_DISABLED=true` | No emails sent; requests logged |

### Recovery

1. Fix root cause.
2. Set `EMAIL_DISABLED=` (or remove) and `ENABLE_BACKGROUND_JOBS=true` as needed.
3. Restart server.
4. Confirm via `/api/admin/system` and test flows.

---

## Health Endpoints (Deployments)

| Endpoint | Use | Response |
|----------|-----|----------|
| `GET /api/health/live` | Liveness probe | 200 always |
| `GET /api/health/ready` | Readiness probe | 200 if DB connected, 503 otherwise |
| `GET /api/health` | Legacy / status page | Full status + DB |
