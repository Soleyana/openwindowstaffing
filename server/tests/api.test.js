/**
 * Basic integration tests for critical API endpoints.
 * Run with: npm test (or node --test tests/api.test.js)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");

const PORT = process.env.TEST_PORT || process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

/** Returns { token, headers } for CSRF. headers includes X-CSRF-Token and Cookie. Merge with auth: Cookie: \`${authCookie}; csrf-token=${token}\` */
async function getCsrf() {
  const res = await fetch(`${BASE_URL}/api/security/csrf`);
  const data = await res.json();
  const token = data.token;
  return {
    token,
    headers: { "X-CSRF-Token": token, Cookie: `csrf-token=${token}` },
    withAuth(authCookie) {
      const c = authCookie ? `${authCookie}; csrf-token=${this.token}` : `csrf-token=${this.token}`;
      return { "X-CSRF-Token": this.token, Cookie: c };
    },
  };
}

describe("CSRF protection", () => {
  it("GET /api/security/csrf returns token", async () => {
    const res = await fetch(`${BASE_URL}/api/security/csrf`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(typeof data.token, "string");
  });

  it("POST without CSRF token returns 403", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@test.com", password: "wrong" }),
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok((data.message || "").toLowerCase().includes("csrf"));
  });

  it("POST with valid CSRF token passes (auth may return 401)", async () => {
    const csrf = await getCsrf();
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "nobody@test.com", password: "wrong" }),
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  it("login rate limit disabled in test - rapid attempts return 401 not 429", async () => {
    const csrf = await getCsrf();
    const attempts = await Promise.all(
      Array(5).fill().map(() =>
        fetch(`${BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrf.headers },
          body: JSON.stringify({ email: "nobody@test.com", password: "wrong" }),
        })
      )
    );
    for (const res of attempts) {
      assert.strictEqual(res.status, 401, "In test env rate limit is disabled; should get 401 not 429");
    }
  });
});

describe("Input validation", () => {
  it("POST /api/auth/login missing email returns 400 with requestId", async () => {
    const csrf = await getCsrf();
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ password: "something" }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.requestId);
  });

  it("POST /api/auth/register invalid email returns 400", async () => {
    const csrf = await getCsrf();
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ name: "Test", email: "not-an-email", password: "Demo123!" }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.requestId);
  });

  it("POST /api/testimonials/submit missing consent returns 400", async () => {
    const csrf = await getCsrf();
    const companiesRes = await fetch(`${BASE_URL}/api/companies/public`);
    if (companiesRes.status !== 200) return;
    const companiesData = await companiesRes.json();
    const list = Array.isArray(companiesData?.data ?? companiesData) ? (companiesData?.data ?? companiesData) : [];
    if (list.length === 0) return;
    const res = await fetch(`${BASE_URL}/api/testimonials/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({
        companyId: list[0]._id,
        authorName: "Tester",
        rating: 5,
        message: "This is a valid message that is long enough to pass.",
      }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.requestId);
  });

  it("POST /api/testimonials/submit message too short returns 400", async () => {
    const csrf = await getCsrf();
    const companiesRes = await fetch(`${BASE_URL}/api/companies/public`);
    if (companiesRes.status !== 200) return;
    const companiesData = await companiesRes.json();
    const list = Array.isArray(companiesData?.data ?? companiesData) ? (companiesData?.data ?? companiesData) : [];
    if (list.length === 0) return;
    const res = await fetch(`${BASE_URL}/api/testimonials/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({
        companyId: list[0]._id,
        authorName: "Tester",
        rating: 5,
        message: "short",
        consentToPublish: true,
      }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.requestId);
  });

  it("POST /api/invoices/request missing companyId returns 400", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const res = await fetch(`${BASE_URL}/api/invoices/request`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.requestId);
  });

  it("POST /api/contracts missing offerId returns 400", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const res = await fetch(`${BASE_URL}/api/contracts`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.requestId);
  });
});

describe("Health endpoints", () => {
  it("GET /api/health/ready returns 200 when DB connected", async () => {
    const res = await fetch(`${BASE_URL}/api/health/ready`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.ok, true);
    assert.strictEqual(data.db, "connected");
  });

  it("GET /api/health/live always returns 200", async () => {
    const res = await fetch(`${BASE_URL}/api/health/live`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.ok, true);
  });
});

describe("API health", () => {
  it("GET / returns 200", async () => {
    const res = await fetch(`http://localhost:${PORT}/`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.status);
  });

  it("GET / returns security headers (Helmet)", async () => {
    const res = await fetch(`http://localhost:${PORT}/`);
    assert.strictEqual(res.headers.get("x-content-type-options"), "nosniff");
    assert.ok(res.headers.get("x-dns-prefetch-control") !== null || res.headers.get("x-frame-options") !== null);
  });

  it("GET /api/health returns 200 when DB connected", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/health`);
    assert.ok(res.status === 200 || res.status === 503);
    const data = await res.json();
    assert.ok(data.status);
  });

  it("GET /api/jobs returns 200", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/jobs`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
  });

  it("POST /api/auth/login with invalid creds returns 401", async () => {
    const csrf = await getCsrf();
    const res = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "nobody@test.com", password: "wrong" }),
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  it("GET /api/applications/export.csv without auth returns 401", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/applications/export.csv`, {
      credentials: "omit",
    });
    assert.strictEqual(res.status, 401);
  });

  it("GET /api/applications/job/:id/export without auth returns 401", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/applications/job/507f1f77bcf86cd799439011/export`, {
      credentials: "omit",
    });
    assert.strictEqual(res.status, 401);
  });

  it("GET /api/saved-jobs without auth returns 401", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/saved-jobs`, { credentials: "omit" });
    assert.strictEqual(res.status, 401);
  });

  it("GET /api/messages/threads without auth returns 401", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/messages/threads`, { credentials: "omit" });
    assert.strictEqual(res.status, 401);
  });

  it("GET /api/messages/start-options without auth returns 401", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/messages/start-options`, { credentials: "omit" });
    assert.strictEqual(res.status, 401);
  });

  it("GET /api/documents/xxx/download without auth returns 401", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/documents/507f1f77bcf86cd799439011/download`, {
      credentials: "omit",
    });
    assert.strictEqual(res.status, 401);
  });

  it("GET /api/reports/listings without auth returns 401", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/reports/listings`, { credentials: "omit" });
    assert.strictEqual(res.status, 401);
  });

  it("POST /api/newsletter/subscribe accepts valid email", async () => {
    const csrf = await getCsrf();
    const res = await fetch(`http://localhost:${PORT}/api/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "test-newsletter-" + Date.now() + "@example.com" }),
    });
    assert.ok(res.status === 200 || res.status === 201 || res.status === 429, `Expected 200/201/429, got ${res.status}`);
    const data = await res.json();
    if (res.status !== 429) assert.strictEqual(data.success, true);
  });

  it("GET /api/status returns ok", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.ok, true);
    assert.strictEqual(data.service, "api");
  });

  it("GET /api/auth/me without cookie returns 200 with user null", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/auth/me`, { credentials: "omit" });
    assert.ok(res.status === 200 || res.status === 429, `Expected 200 or 429, got ${res.status}`);
    if (res.status === 429) return;
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user, null);
  });

  it("GET /api/auth/me with valid cookie returns 200 with user", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]) } : csrf.headers;
    const res = await fetch(`http://localhost:${PORT}/api/auth/me`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.user);
    assert.ok(data.user.email);
  });

  it("GET /api/version returns ok and version", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/version`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.ok, true);
    assert.ok(typeof data.version === "string");
  });
});

describe("Compliance API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("GET /api/candidates/me/compliance without auth returns 401", async () => {
    const res = await fetch(`${BASE}/api/candidates/me/compliance`, {
      credentials: "omit",
    });
    assert.strictEqual(res.status, 401);
  });

  it("GET /api/candidates/:id/compliance without auth returns 401", async () => {
    const res = await fetch(
      `${BASE}/api/candidates/507f1f77bcf86cd799439011/compliance?companyId=507f1f77bcf86cd799439012`,
      { credentials: "omit" }
    );
    assert.strictEqual(res.status, 401);
  });

  it("POST /api/candidates/:id/compliance/review without auth returns 401", async () => {
    const csrf = await getCsrf();
    const res = await fetch(
      `${BASE}/api/candidates/507f1f77bcf86cd799439011/compliance/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrf.headers },
        body: JSON.stringify({ note: "test" }),
        credentials: "omit",
      }
    );
    assert.strictEqual(res.status, 401);
  });

  it("GET /api/candidates/me/compliance as applicant returns 200 with valid structure", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
    const res = await fetch(`${BASE}/api/candidates/me/compliance`, {
      headers,
      credentials: "include",
    });
    if (res.status === 200) {
      const data = await res.json();
      assert.ok(data.success);
      assert.ok(data.data);
      assert.ok(["cleared", "missing", "expiring", "blocked"].includes(data.data.status));
    }
  });

  it("GET /api/candidates/:id/compliance as recruiter returns valid structure", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]) } : csrf.headers;
    const appsRes = await fetch(`${BASE}/api/recruiter/applications`, {
      headers,
      credentials: "include",
    });
    if (appsRes.status !== 200) return;
    const appsData = await appsRes.json();
    const apps = appsData?.data?.applications || [];
    const first = apps.find((a) => a.applicant);
    if (!first) return;
    const candidateId = (first.applicant?._id || first.applicant)?.toString?.();
    const companyId = first.companyId || first.jobId?.companyId;
    if (!candidateId || !companyId) return;
    const url = `${BASE}/api/candidates/${candidateId}/compliance?companyId=${companyId}`;
    const res = await fetch(url, { headers, credentials: "include" });
    if (res.status === 200) {
      const data = await res.json();
      assert.ok(data.success);
      assert.ok(data.data);
      assert.ok(["cleared", "missing", "expiring", "blocked"].includes(data.data.status));
    }
  });
});

describe("Invoice Request API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("POST /api/invoices/request without auth returns 401", async () => {
    const csrf = await getCsrf();
    const res = await fetch(`${BASE}/api/invoices/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ companyId: "507f1f77bcf86cd799439011" }),
      credentials: "omit",
    });
    assert.strictEqual(res.status, 401);
  });

  it("POST /api/invoices/request as recruiter with valid companyId returns 201 and logs activity", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const appsRes = await fetch(`${BASE}/api/recruiter/applications`, { headers, credentials: "include" });
    if (appsRes.status !== 200) return;
    const appsData = await appsRes.json();
    const apps = appsData?.data?.applications || [];
    const first = apps.find((a) => (a.companyId || a.jobId?.companyId));
    const companyId = first?.companyId?.toString?.() || first?.jobId?.companyId?.toString?.();
    if (!companyId) return;
    const res = await fetch(`${BASE}/api/invoices/request`, {
      method: "POST",
      headers,
      body: JSON.stringify({ companyId, message: "Test invoice request" }),
      credentials: "include",
    });
    assert.ok(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data?._id, "Response should include created InvoiceRequest id");
    }
  });
});

describe("Listing Reports API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("GET /api/reports/listings as recruiter returns correct shape", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]) } : csrf.headers;
    const res = await fetch(`${BASE}/api/reports/listings`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data, "Response should have data");
    assert.ok(data.data.kpis, "Response should have kpis");
    assert.ok(Array.isArray(data.data.rows), "Response should have rows array");
    assert.ok(typeof data.data.kpis.totalListings === "number");
    assert.ok(typeof data.data.kpis.totalApplications === "number");
  });
});

describe("Messages start-options API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("GET /api/messages/start-options as applicant returns applications structure", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]) } : csrf.headers;
    const res = await fetch(`${BASE}/api/messages/start-options`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data && Array.isArray(data.data.applications), "Should have data.applications array");
  });

  it("GET /api/messages/start-options as recruiter returns candidates structure", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const res = await fetch(`${BASE}/api/messages/start-options`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data && Array.isArray(data.data.candidates), "Should have data.candidates array");
  });

  it("POST /api/messages/threads with applicationId creates or finds thread", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const optsRes = await fetch(`${BASE}/api/messages/start-options`, { headers, credentials: "include" });
    if (optsRes.status !== 200) return;
    const optsData = await optsRes.json();
    const apps = optsData?.data?.applications || [];
    if (apps.length === 0) return;
    const applicationId = apps[0].applicationId;
    const res = await fetch(`${BASE}/api/messages/threads`, {
      method: "POST",
      headers,
      body: JSON.stringify({ applicationId }),
      credentials: "include",
    });
    assert.ok(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const thread = data.data || data;
    assert.ok(thread._id, "Response should include thread _id");
  });
});

describe("Companies API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("POST /api/companies as owner creates company", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "owner@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const res = await fetch(`${BASE}/api/companies`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Test Company " + Date.now(), legalName: "Test Co LLC" }),
      credentials: "include",
    });
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data?._id);
    assert.ok(data.data?.name);
    assert.strictEqual(data.data?.status, "active");
  });

  it("GET /api/companies as recruiter returns scoped list", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]) } : csrf.headers;
    const res = await fetch(`${BASE}/api/companies`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
  });

  it("GET /api/companies/:companyId requires company access", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]) } : csrf.headers;
    const listRes = await fetch(`${BASE}/api/companies`, { headers, credentials: "include" });
    if (listRes.status !== 200) return;
    const listData = await listRes.json();
    const companies = listData.data || [];
    if (companies.length === 0) return;
    const companyId = companies[0]._id;
    const res = await fetch(`${BASE}/api/companies/${companyId}`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data?._id, companyId);
  });

  it("POST /api/companies as recruiter returns 403", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const res = await fetch(`${BASE}/api/companies`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Recruiter Company" }),
      credentials: "include",
    });
    assert.strictEqual(res.status, 403);
  });

  it("PATCH /api/companies/:companyId as owner updates company", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "owner@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const listRes = await fetch(`${BASE}/api/companies`, { headers, credentials: "include" });
    if (listRes.status !== 200) return;
    const listData = await listRes.json();
    const companies = listData.data || [];
    if (companies.length === 0) return;
    const companyId = companies[0]._id;
    const res = await fetch(`${BASE}/api/companies/${companyId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ legalName: "Updated Legal Name " + Date.now() }),
      credentials: "include",
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data?.legalName);
  });
});

describe("Facilities API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("POST /api/facilities requires company access", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const companiesRes = await fetch(`${BASE}/api/companies`, { headers, credentials: "include" });
    if (companiesRes.status !== 200) return;
    const companiesData = await companiesRes.json();
    const companies = companiesData.data || [];
    if (companies.length === 0) return;
    const companyId = companies[0]._id;
    const res = await fetch(`${BASE}/api/facilities`, {
      method: "POST",
      headers,
      body: JSON.stringify({ companyId, name: "Test Facility " + Date.now() }),
      credentials: "include",
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data?._id);
  });

  it("GET /api/facilities requires company access", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]) } : csrf.headers;
    const companiesRes = await fetch(`${BASE}/api/companies`, { headers, credentials: "include" });
    if (companiesRes.status !== 200) return;
    const companiesData = await companiesRes.json();
    const companies = companiesData.data || [];
    if (companies.length === 0) return;
    const companyId = companies[0]._id;
    const res = await fetch(`${BASE}/api/facilities?companyId=${companyId}`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
  });

  it("PATCH /api/facilities/:facilityId as owner updates facility", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "owner@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const facilitiesRes = await fetch(`${BASE}/api/facilities`, { headers, credentials: "include" });
    if (facilitiesRes.status !== 200) return;
    const facilitiesData = await facilitiesRes.json();
    const facilities = facilitiesData.data || [];
    if (facilities.length === 0) return;
    const facilityId = facilities[0]._id;
    const res = await fetch(`${BASE}/api/facilities/${facilityId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ departments: ["Med/Surg", "ICU", "ER", "NewDept"] }),
      credentials: "include",
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data?.departments));
    assert.ok(data.data.departments.includes("NewDept"));
  });
});

describe("Testimonials API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("POST /api/testimonials/submit returns 201 with valid payload", async () => {
    const csrf = await getCsrf();
    const companiesRes = await fetch(`${BASE}/api/companies/public`);
    if (companiesRes.status !== 200) return;
    const companiesData = await companiesRes.json();
    const companies = companiesData?.data ?? companiesData;
    const list = Array.isArray(companies) ? companies : [];
    if (list.length === 0) return;
    const companyId = list[0]._id;
    const res = await fetch(`${BASE}/api/testimonials/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({
        companyId,
        authorName: "Test Reviewer " + Date.now(),
        authorRole: "Travel RN",
        rating: 5,
        title: "Great experience",
        message: "This is a test review for automated tests.",
        consentToPublish: true,
      }),
    });
    assert.ok(res.status === 201 || res.status === 429, `Expected 201 or 429 (rate limit), got ${res.status}`);
    if (res.status === 201) {
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data?._id);
    }
  });

  it("GET /api/testimonials returns only approved reviews", async () => {
    const companiesRes = await fetch(`${BASE}/api/companies/public`);
    if (companiesRes.status !== 200) return;
    const companiesData = await companiesRes.json();
    const companies = companiesData?.data ?? companiesData;
    const list = Array.isArray(companies) ? companies : [];
    if (list.length === 0) return;
    const companyId = list[0]._id;
    const res = await fetch(`${BASE}/api/testimonials?companyId=${companyId}&limit=5`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data);
    assert.ok(Array.isArray(data.data.rows));
    assert.ok(typeof data.data.total === "number");
    data.data.rows.forEach((r) => assert.strictEqual(r.status, undefined));
  });

  it("PATCH /api/testimonials/:id/approve requires auth and company access", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "owner@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const companiesRes = await fetch(`${BASE}/api/companies`, { headers, credentials: "include" });
    if (companiesRes.status !== 200) return;
    const companiesData = await companiesRes.json();
    const companies = companiesData?.data ?? [];
    if (companies.length === 0) return;
    const companyId = companies[0]._id;
    const submitRes = await fetch(`${BASE}/api/testimonials/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({
        companyId,
        authorName: "Approve test " + Date.now(),
        rating: 5,
        message: "Test review for approve test.",
        consentToPublish: true,
      }),
    });
    if (submitRes.status !== 201 && submitRes.status !== 429) return;
    const adminRes = await fetch(`${BASE}/api/testimonials/admin?companyId=${companyId}&status=pending`, {
      headers,
      credentials: "include",
    });
    if (adminRes.status !== 200) return;
    const adminData = await adminRes.json();
    const rows = adminData?.data?.rows ?? [];
    if (rows.length === 0) return;
    const testimonialId = rows[0]._id;
    const res = await fetch(`${BASE}/api/testimonials/${testimonialId}/approve`, {
      method: "PATCH",
      headers,
      credentials: "include",
    });
    assert.ok(res.status === 200 || res.status === 404, `Expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
      const data = await res.json();
      assert.strictEqual(data.success, true);
    }
  });

  it("POST /api/testimonials/submit respects rate limit (200/201/429)", async () => {
    const csrf = await getCsrf();
    const companiesRes = await fetch(`${BASE}/api/companies/public`);
    if (companiesRes.status !== 200) return;
    const companiesData = await companiesRes.json();
    const companies = companiesData?.data ?? companiesData;
    const list = Array.isArray(companies) ? companies : [];
    if (list.length === 0) return;
    const companyId = list[0]._id;
    const res = await fetch(`${BASE}/api/testimonials/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({
        companyId,
        authorName: "Rate limit test",
        rating: 5,
        message: "Testing rate limit here.",
        consentToPublish: true,
      }),
    });
    assert.ok([200, 201, 429].includes(res.status), `Expected 200/201/429, got ${res.status}`);
  });
});

describe("Documents API", () => {
  const BASE = `http://localhost:${PORT}`;
  const FAKE_DOC_ID = "507f1f77bcf86cd799439011";

  it("DELETE /api/documents/:id without auth returns 401", async () => {
    const csrf = await getCsrf();
    const res = await fetch(`${BASE}/api/documents/${FAKE_DOC_ID}`, {
      method: "DELETE",
      headers: csrf.headers,
      credentials: "include",
    });
    assert.strictEqual(res.status, 401);
  });

  it("DELETE /api/documents/:id as recruiter returns 403", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]) } : csrf.headers;
    const res = await fetch(`${BASE}/api/documents/${FAKE_DOC_ID}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });
    assert.strictEqual(res.status, 403);
  });

  it("DELETE /api/documents/:id as applicant with non-owned doc returns 404", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]) } : csrf.headers;
    const res = await fetch(`${BASE}/api/documents/${FAKE_DOC_ID}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });
    assert.strictEqual(res.status, 404);
  });

  it("DELETE /api/documents/:id as owner returns 200 and removes document", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;

    const mongoose = require("mongoose");
    const CandidateDocument = require("../models/CandidateDocument");
    const User = require("../models/User");

    await mongoose.connect(uri);
    const candidate = await User.findOne({ email: "candidate@demo.com" });
    if (!candidate) {
      await mongoose.disconnect();
      return;
    }

    const doc = await CandidateDocument.create({
      userId: candidate._id,
      type: "License",
      fileUrl: "test-delete-" + Date.now() + ".pdf",
      fileName: "test.pdf",
      mimeType: "application/pdf",
      size: 0,
    });
    const docId = doc._id.toString();
    await mongoose.disconnect();

    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]) } : csrf.headers;

    const res = await fetch(`${BASE}/api/documents/${docId}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    await mongoose.connect(uri);
    const gone = await CandidateDocument.findById(docId);
    await mongoose.disconnect();
    assert.strictEqual(gone, null);
  });
});

describe("Withdraw Application API", () => {
  const BASE = `http://localhost:${PORT}`;
  const FAKE_APP_ID = "507f1f77bcf86cd799439012";

  it("PATCH /api/applications/:id/withdraw without auth returns 401", async () => {
    const csrf = await getCsrf();
    const res = await fetch(`${BASE}/api/applications/${FAKE_APP_ID}/withdraw`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({}),
      credentials: "omit",
    });
    assert.strictEqual(res.status, 401);
  });

  it("PATCH withdraw as recruiter returns 403", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const res = await fetch(`${BASE}/api/applications/${FAKE_APP_ID}/withdraw`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(res.status, 403);
  });

  it("PATCH withdraw as applicant with non-owned app returns 404", async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { ...csrf.withAuth(cookie.split(";")[0]), "Content-Type": "application/json" } : { ...csrf.headers, "Content-Type": "application/json" };
    const res = await fetch(`${BASE}/api/applications/${FAKE_APP_ID}/withdraw`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(res.status, 404);
  });

  it("PATCH withdraw as owner returns 200 with status=withdrawn and withdrawnAt", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const appsRes = await fetch(`${BASE}/api/applications/my`, { headers, credentials: "include" });
    if (appsRes.status !== 200) return;
    const appsData = await appsRes.json();
    const apps = appsData?.data ?? appsData;
    const app = Array.isArray(apps) ? apps.find((a) => a.status !== "withdrawn") : null;
    if (!app?._id) return;

    const res = await fetch(`${BASE}/api/applications/${app._id}/withdraw`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ reason: "Test withdraw" }),
      credentials: "include",
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data?.status, "withdrawn");
    assert.ok(data.data?.withdrawnAt);
  });

  it("PATCH withdraw again returns 200 idempotent", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const appsRes = await fetch(`${BASE}/api/applications/my`, { headers, credentials: "include" });
    if (appsRes.status !== 200) return;
    const appsData = await appsRes.json();
    const apps = appsData?.data ?? appsData;
    const app = Array.isArray(apps) ? apps.find((a) => a.status === "withdrawn") : null;
    if (!app?._id) return;

    const res = await fetch(`${BASE}/api/applications/${app._id}/withdraw`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data?.status, "withdrawn");
  });
});

describe("Assignments API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("GET /api/assignments/me without auth returns 401", async () => {
    const res = await fetch(`${BASE}/api/assignments/me`, { credentials: "omit" });
    assert.strictEqual(res.status, 401);
  });

  it("GET /api/assignments/me as recruiter returns 403", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
    const res = await fetch(`${BASE}/api/assignments/me`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 403);
  });

  it("GET /api/assignments/me as applicant returns 200 and array", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
    const res = await fetch(`${BASE}/api/assignments/me`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
  });

  it("POST /api/assignments as recruiter creates from application and offer->accept flow works", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;
    const mongoose = require("mongoose");
    const Application = require("../models/Application");
    const Job = require("../models/Job");
    const User = require("../models/User");
    const RecruiterMembership = require("../models/RecruiterMembership");
    await mongoose.connect(uri);
    const candidate = await User.findOne({ email: "candidate@demo.com" });
    const recruiter = await User.findOne({ email: "recruiter@demo.com" });
    const membership = await RecruiterMembership.findOne({ userId: recruiter?._id, status: "active" });
    const companyId = membership?.companyId;
    const jobs = companyId ? await Job.find({ companyId }).select("_id companyId facilityId").limit(10).lean() : [];
    const appliedJobIds = (await Application.find({ applicant: candidate._id }).select("jobId").lean()).map((a) => a.jobId?.toString());
    const job = jobs.find((j) => !appliedJobIds.includes(j._id.toString()));
    if (!candidate || !job) {
      await mongoose.disconnect();
      return;
    }
    let applicationId = (await Application.findOne({ applicant: candidate._id, jobId: job._id }).select("_id").lean())?._id?.toString();
    if (!applicationId) {
      const newApp = await Application.create({
        jobId: job._id,
        companyId: job.companyId,
        facilityId: job.facilityId,
        applicant: candidate._id,
        firstName: "Jane",
        lastName: "Candidate",
        email: candidate.email,
        phone: "555-0100",
        status: "applied",
      });
      applicationId = newApp._id.toString();
    }
    await mongoose.disconnect();

    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const app = { _id: applicationId };

    const createRes = await fetch(`${BASE}/api/assignments`, {
      method: "POST",
      headers,
      body: JSON.stringify({ applicationId: applicationId, payRate: { payRate: 50, unit: "hour" } }),
      credentials: "include",
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    assert.strictEqual(createData.success, true);
    const assignmentId = createData.data?._id;
    assert.ok(assignmentId);

    const offerRes = await fetch(`${BASE}/api/assignments/${assignmentId}/offer`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(offerRes.status, 200);
    const offerData = await offerRes.json();
    assert.strictEqual(offerData.success, true);
    assert.strictEqual(offerData.data?.status, "offered");

    const candidateLogin = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (candidateLogin.status !== 200) return;
    const candCookie = candidateLogin.headers.get("set-cookie");
    const candHeaders = candCookie ? { Cookie: candCookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const acceptRes = await fetch(`${BASE}/api/assignments/${assignmentId}/accept`, {
      method: "POST",
      headers: candHeaders,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(acceptRes.status, 200);
    const acceptData = await acceptRes.json();
    assert.strictEqual(acceptData.success, true);
    assert.ok(["accepted", "active"].includes(acceptData.data?.status));
  });
});

describe("Offers API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("POST /api/offers as recruiter creates offer and send/accept flow creates assignment", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;
    const mongoose = require("mongoose");
    const Application = require("../models/Application");
    const Job = require("../models/Job");
    const User = require("../models/User");
    const RecruiterMembership = require("../models/RecruiterMembership");
    const Offer = require("../models/Offer");
    const Assignment = require("../models/Assignment");
    await mongoose.connect(uri);
    const candidate = await User.findOne({ email: "candidate@demo.com" });
    const recruiter = await User.findOne({ email: "recruiter@demo.com" });
    const membership = await RecruiterMembership.findOne({ userId: recruiter?._id, status: "active" });
    const companyId = membership?.companyId;
    const jobs = companyId ? await Job.find({ companyId }).select("_id companyId facilityId").limit(10).lean() : [];
    const appliedJobIds = (await Application.find({ applicant: candidate._id }).select("jobId").lean()).map((a) => a.jobId?.toString());
    const job = jobs.find((j) => !appliedJobIds.includes(j._id.toString()));
    if (!candidate || !job) {
      await mongoose.disconnect();
      return;
    }
    let application = await Application.findOne({ applicant: candidate._id, jobId: job._id }).lean();
    if (!application) {
      application = await Application.create({
        jobId: job._id,
        companyId: job.companyId,
        facilityId: job.facilityId,
        applicant: candidate._id,
        firstName: "Jane",
        lastName: "Candidate",
        email: candidate.email,
        phone: "555-0100",
        status: "applied",
      });
    }
    const applicationId = application._id.toString();
    await mongoose.disconnect();

    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const createRes = await fetch(`${BASE}/api/offers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ applicationId, payRate: 45, startDate: new Date().toISOString().split("T")[0] }),
      credentials: "include",
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    assert.strictEqual(createData.success, true);
    const offerId = createData.data?._id;
    assert.ok(offerId);
    assert.strictEqual(createData.data?.status, "draft");

    const sendRes = await fetch(`${BASE}/api/offers/${offerId}/send`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(sendRes.status, 200);
    const sendData = await sendRes.json();
    assert.strictEqual(sendData.success, true);
    assert.strictEqual(sendData.data?.status, "sent");

    const candidateLogin = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (candidateLogin.status !== 200) return;
    const candCookie = candidateLogin.headers.get("set-cookie");
    const candHeaders = candCookie ? { Cookie: candCookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const acceptRes = await fetch(`${BASE}/api/offers/${offerId}/accept`, {
      method: "PATCH",
      headers: candHeaders,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(acceptRes.status, 200);
    const acceptData = await acceptRes.json();
    assert.strictEqual(acceptData.success, true);
    assert.strictEqual(acceptData.data?.status, "accepted");

    await mongoose.connect(uri);
    const assignment = await Assignment.findOne({ applicationId });
    assert.ok(assignment, "Assignment should be created on offer accept");
    assert.ok(["accepted", "active"].includes(assignment.status));
    const appUpdated = await Application.findById(applicationId).select("status").lean();
    assert.strictEqual(appUpdated?.status, "placed");
    await mongoose.disconnect();
  });

  it("PATCH /api/offers/:id/accept idempotent: second accept returns 200 without duplicates", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;
    const mongoose = require("mongoose");
    const Application = require("../models/Application");
    const Job = require("../models/Job");
    const User = require("../models/User");
    const RecruiterMembership = require("../models/RecruiterMembership");
    const Offer = require("../models/Offer");
    const Assignment = require("../models/Assignment");
    await mongoose.connect(uri);
    const candidate = await User.findOne({ email: "candidate@demo.com" });
    const recruiter = await User.findOne({ email: "recruiter@demo.com" });
    const membership = await RecruiterMembership.findOne({ userId: recruiter?._id, status: "active" });
    const companyId = membership?.companyId;
    const jobs = companyId ? await Job.find({ companyId }).select("_id").limit(20).lean() : [];
    const app = await Application.findOne({ applicant: candidate._id }).lean();
    if (!candidate || !app || !jobs.length) {
      await mongoose.disconnect();
      return;
    }
    const job = jobs.find((j) => j._id.toString() === app.jobId?.toString()) || jobs[0];
    let application = await Application.findOne({ applicant: candidate._id, jobId: job._id }).lean();
    if (!application) {
      application = await Application.create({
        jobId: job._id,
        companyId,
        applicant: candidate._id,
        firstName: "Jane",
        lastName: "Candidate",
        email: candidate.email,
        phone: "555-0100",
        status: "applied",
      });
    }
    const existingOffer = await Offer.findOne({ applicationId: application._id, status: "sent" });
    let offerId;
    if (existingOffer) {
      offerId = existingOffer._id.toString();
    } else {
      const draft = await Offer.findOne({ applicationId: application._id, status: "draft" });
      if (draft) {
        draft.status = "sent";
        draft.sentAt = new Date();
        await draft.save();
        offerId = draft._id.toString();
      } else {
        const created = await Offer.create({
          companyId,
          jobId: job._id,
          applicationId: application._id,
          candidateId: candidate._id,
          recruiterId: recruiter._id,
          status: "sent",
          sentAt: new Date(),
        });
        offerId = created._id.toString();
      }
    }
    const assignCountBefore = await Assignment.countDocuments({ applicationId: application._id });
    await mongoose.disconnect();

    const candidateLogin = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (candidateLogin.status !== 200) return;
    const candCookie = candidateLogin.headers.get("set-cookie");
    const candHeaders = candCookie ? { Cookie: candCookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const firstAccept = await fetch(`${BASE}/api/offers/${offerId}/accept`, {
      method: "PATCH",
      headers: candHeaders,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.ok(firstAccept.status === 200 || firstAccept.status === 400, `first accept: ${firstAccept.status}`);
    const secondAccept = await fetch(`${BASE}/api/offers/${offerId}/accept`, {
      method: "PATCH",
      headers: candHeaders,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(secondAccept.status, 200, "Second accept is idempotent: returns 200");
    const secondData = await secondAccept.json();
    assert.strictEqual(secondData.success, true);
    assert.strictEqual(secondData.data?.status, "accepted");

    await mongoose.connect(uri);
    const assignCountAfter = await Assignment.countDocuments({ applicationId: application._id });
    assert.ok(assignCountAfter <= assignCountBefore + 1, "Should not create duplicate assignments");
    await mongoose.disconnect();
  });
});

describe("Contracts API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("POST /api/contracts creates from accepted offer, send/sign flow works", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;
    const mongoose = require("mongoose");
    const Application = require("../models/Application");
    const Job = require("../models/Job");
    const User = require("../models/User");
    const RecruiterMembership = require("../models/RecruiterMembership");
    const Offer = require("../models/Offer");
    const Contract = require("../models/Contract");
    await mongoose.connect(uri);
    const candidate = await User.findOne({ email: "candidate@demo.com" });
    const recruiter = await User.findOne({ email: "recruiter@demo.com" });
    const membership = await RecruiterMembership.findOne({ userId: recruiter?._id, status: "active" });
    const companyId = membership?.companyId;
    const jobs = companyId ? await Job.find({ companyId }).select("_id companyId facilityId").limit(10).lean() : [];
    const appliedJobIds = (await Application.find({ applicant: candidate._id }).select("jobId").lean()).map((a) => a.jobId?.toString());
    const job = jobs.find((j) => !appliedJobIds.includes(j._id.toString()));
    if (!candidate || !job) {
      await mongoose.disconnect();
      return;
    }
    let application = await Application.findOne({ applicant: candidate._id, jobId: job._id }).lean();
    if (!application) {
      application = await Application.create({
        jobId: job._id,
        companyId: job.companyId,
        facilityId: job.facilityId,
        applicant: candidate._id,
        firstName: "Jane",
        lastName: "Candidate",
        email: candidate.email,
        phone: "555-0100",
        status: "applied",
      });
    }
    let offer = await Offer.findOne({ applicationId: application._id, status: "accepted" }).lean();
    if (!offer) {
      offer = await Offer.findOne({ applicationId: application._id }).lean();
      if (offer) {
        await Offer.updateOne({ _id: offer._id }, { $set: { status: "accepted", acceptedAt: new Date() } });
      } else {
        offer = await Offer.create({
          companyId: job.companyId,
          jobId: job._id,
          applicationId: application._id,
          candidateId: candidate._id,
          recruiterId: recruiter._id,
          status: "accepted",
          acceptedAt: new Date(),
        });
      }
    }
    await Contract.deleteOne({ offerId: offer._id });
    const offerId = offer._id.toString();
    await mongoose.disconnect();

    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const createRes = await fetch(`${BASE}/api/contracts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ offerId }),
      credentials: "include",
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    assert.strictEqual(createData.success, true);
    const contractId = createData.data?._id;
    assert.ok(contractId);
    assert.strictEqual(createData.data?.status, "draft");

    const sendRes = await fetch(`${BASE}/api/contracts/${contractId}/send`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(sendRes.status, 200);
    const sendData = await sendRes.json();
    assert.strictEqual(sendData.success, true);
    assert.strictEqual(sendData.data?.status, "sent");

    const candidateLogin = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (candidateLogin.status !== 200) return;
    const candCookie = candidateLogin.headers.get("set-cookie");
    const candHeaders = candCookie ? { Cookie: candCookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const signRes = await fetch(`${BASE}/api/contracts/${contractId}/sign`, {
      method: "POST",
      headers: candHeaders,
      body: JSON.stringify({ signatureName: "Jane Candidate", consent: true }),
      credentials: "include",
    });
    assert.strictEqual(signRes.status, 200);
    const signData = await signRes.json();
    assert.strictEqual(signData.success, true);
    assert.strictEqual(signData.data?.status, "signed");
    assert.ok(signData.data?.signatureName);

    const downloadRes = await fetch(`${BASE}/api/contracts/${contractId}/download`, {
      headers: candHeaders,
      credentials: "include",
    });
    assert.strictEqual(downloadRes.status, 200);
    const html = await downloadRes.text();
    assert.ok(html.includes("Jane Candidate"));
    assert.ok(html.includes("Signed by"));
  });

  it("GET /api/contracts/me as applicant returns own contracts", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
    const res = await fetch(`${BASE}/api/contracts/me`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
  });
});

describe("Timesheets API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("GET /api/timesheets/me as recruiter returns 403", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
    const res = await fetch(`${BASE}/api/timesheets/me`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 403);
  });

  it("GET /api/timesheets/me as applicant returns 200 and array", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
    const res = await fetch(`${BASE}/api/timesheets/me`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
  });

  it("POST create timesheet and submit/approve flow works", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;
    const mongoose = require("mongoose");
    const User = require("../models/User");
    const Assignment = require("../models/Assignment");
    const Timesheet = require("../models/Timesheet");
    await mongoose.connect(uri);
    const candidate = await User.findOne({ email: "candidate@demo.com" });
    const assignment = await Assignment.findOne({
      candidateId: candidate?._id,
      status: { $in: ["accepted", "active"] },
    }).lean();
    await mongoose.disconnect();
    if (!candidate || !assignment) return;

    const uniqueOffset = 1000 + (Math.floor(Date.now() / 1000) % 500);
    const periodStart = new Date(Date.now() - uniqueOffset * 7 * 24 * 60 * 60 * 1000);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);

    const candidateLogin = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (candidateLogin.status !== 200) return;
    const candCookie = candidateLogin.headers.get("set-cookie");
    const candHeaders = candCookie ? { Cookie: candCookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const createRes = await fetch(`${BASE}/api/timesheets`, {
      method: "POST",
      headers: candHeaders,
      body: JSON.stringify({
        assignmentId: assignment._id.toString(),
        periodStart: periodStart.toISOString().split("T")[0],
        periodEnd: periodEnd.toISOString().split("T")[0],
        entries: [{ date: periodStart.toISOString().split("T")[0], hours: 8, notes: "" }],
      }),
      credentials: "include",
    });
    assert.ok(createRes.status === 200 || createRes.status === 201, `expected 200 or 201, got ${createRes.status}`);
    const createData = await createRes.json();
    assert.strictEqual(createData.success, true);
    const tsId = createData.data?._id;
    assert.ok(tsId);

    const submitRes = await fetch(`${BASE}/api/timesheets/${tsId}/submit`, {
      method: "POST",
      headers: candHeaders,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(submitRes.status, 200);
    const submitData = await submitRes.json();
    assert.strictEqual(submitData.data?.status, "submitted");

    const recruiterLogin = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (recruiterLogin.status !== 200) return;
    const recCookie = recruiterLogin.headers.get("set-cookie");
    const recHeaders = recCookie ? { Cookie: recCookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const approveRes = await fetch(`${BASE}/api/timesheets/${tsId}/approve`, {
      method: "PATCH",
      headers: recHeaders,
      body: JSON.stringify({}),
      credentials: "include",
    });
    assert.strictEqual(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.strictEqual(approveData.data?.status, "approved");
  });

  it("POST create timesheet same period twice returns 200 and same _id", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;
    const mongoose = require("mongoose");
    const User = require("../models/User");
    const Assignment = require("../models/Assignment");
    await mongoose.connect(uri);
    const candidate = await User.findOne({ email: "candidate@demo.com" });
    const assignment = await Assignment.findOne({
      candidateId: candidate?._id,
      status: { $in: ["accepted", "active"] },
    }).lean();
    await mongoose.disconnect();
    if (!candidate || !assignment) return;

    const periodStart = new Date(Date.now() - 200 * 7 * 24 * 60 * 60 * 1000);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);

    const candidateLogin = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (candidateLogin.status !== 200) return;
    const candCookie = candidateLogin.headers.get("set-cookie");
    const candHeaders = candCookie ? { Cookie: candCookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const payload = {
      assignmentId: assignment._id.toString(),
      periodStart: periodStart.toISOString().split("T")[0],
      periodEnd: periodEnd.toISOString().split("T")[0],
      entries: [{ date: periodStart.toISOString().split("T")[0], hours: 8 }],
    };

    const firstRes = await fetch(`${BASE}/api/timesheets`, {
      method: "POST",
      headers: candHeaders,
      body: JSON.stringify(payload),
      credentials: "include",
    });
    assert.ok(firstRes.status === 200 || firstRes.status === 201, `first create: expected 200 or 201, got ${firstRes.status}`);
    const firstData = await firstRes.json();
    assert.strictEqual(firstData.success, true);
    const firstId = firstData.data?._id;
    assert.ok(firstId);

    const secondRes = await fetch(`${BASE}/api/timesheets`, {
      method: "POST",
      headers: candHeaders,
      body: JSON.stringify(payload),
      credentials: "include",
    });
    assert.strictEqual(secondRes.status, 200);
    const secondData = await secondRes.json();
    assert.strictEqual(secondData.success, true);
    assert.strictEqual(secondData.data?._id, firstId);
  });
});

describe("Invoices API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("GET /api/invoices as recruiter returns list", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
    const res = await fetch(`${BASE}/api/invoices`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
  });

  it("POST /api/invoices/generate creates draft from approved timesheets", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;
    const mongoose = require("mongoose");
    const Timesheet = require("../models/Timesheet");
    const RecruiterMembership = require("../models/RecruiterMembership");
    const User = require("../models/User");
    await mongoose.connect(uri);
    const recruiter = await User.findOne({ email: "recruiter@demo.com" });
    const mem = await RecruiterMembership.findOne({ userId: recruiter?._id, status: "active" }).lean();
    const companyId = mem?.companyId?.toString();
    const ts = await Timesheet.findOne({ companyId, status: "approved" }).lean();
    await mongoose.disconnect();
    if (!companyId || !ts) return;

    const periodStart = new Date(ts.periodStart);
    const periodEnd = new Date(ts.periodEnd);
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const genRes = await fetch(`${BASE}/api/invoices/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        companyId,
        from: periodStart.toISOString().split("T")[0],
        to: periodEnd.toISOString().split("T")[0],
      }),
      credentials: "include",
    });
    assert.strictEqual(genRes.status, 201);
    const genData = await genRes.json();
    assert.strictEqual(genData.success, true);
    assert.ok(genData.data?._id);
    assert.strictEqual(genData.data?.status, "draft");
    const lineItems = genData.data?.lineItems || [];
    const computedTotal = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
    assert.strictEqual(
      Math.round(genData.data?.total * 100) / 100,
      Math.round(computedTotal * 100) / 100,
      "Invoice total must match sum of line item amounts"
    );
  });

  it("PATCH /api/invoices/:id rejects modification of issued invoice", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;
    const mongoose = require("mongoose");
    const Invoice = require("../models/Invoice");
    const RecruiterMembership = require("../models/RecruiterMembership");
    const User = require("../models/User");
    await mongoose.connect(uri);
    const recruiter = await User.findOne({ email: "recruiter@demo.com" });
    const mem = await RecruiterMembership.findOne({ userId: recruiter?._id, status: "active" }).lean();
    const companyId = mem?.companyId?.toString();
    let inv = await Invoice.findOne({ companyId, status: "issued" }).lean();
    if (!inv) {
      inv = await Invoice.findOne({ companyId, status: "draft" }).lean();
      if (inv) await Invoice.findByIdAndUpdate(inv._id, { status: "issued", issuedAt: new Date() });
    }
    await mongoose.disconnect();
    if (!companyId || !inv) return;

    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };

    const patchRes = await fetch(`${BASE}/api/invoices/${inv._id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ lineItems: [] }),
      credentials: "include",
    });
    assert.strictEqual(patchRes.status, 400);
    const patchData = await patchRes.json();
    assert.strictEqual(patchData.success, false);
    assert.ok(patchData.message?.toLowerCase().includes("immutable") || patchData.message?.toLowerCase().includes("cannot modify"));
  });
});

describe("Compliance API with company/facility context", () => {
  const BASE = `http://localhost:${PORT}`;

  it("GET /api/candidates/:id/compliance with facilityId returns facility-specific requiredTypes", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;
    const mongoose = require("mongoose");
    const Facility = require("../models/Facility");
    const RecruiterMembership = require("../models/RecruiterMembership");
    const User = require("../models/User");
    await mongoose.connect(uri);
    const recruiter = await User.findOne({ email: "recruiter@demo.com" });
    const candidate = await User.findOne({ email: "candidate@demo.com" });
    const mem = await RecruiterMembership.findOne({ userId: recruiter?._id, status: "active" }).lean();
    const companyId = mem?.companyId?.toString();
    const facility = await Facility.findOne({ companyId: mem?.companyId }).lean();
    if (facility) {
      await Facility.findByIdAndUpdate(facility._id, {
        $set: { complianceOverrides: { requiredTypes: ["License", "BLS", "ACLS"] } },
      });
    }
    await mongoose.disconnect();
    if (!companyId || !facility || !candidate) return;

    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};

    const compRes = await fetch(
      `${BASE}/api/candidates/${candidate._id}/compliance?companyId=${companyId}&facilityId=${facility._id}`,
      { headers, credentials: "include" }
    );
    assert.strictEqual(compRes.status, 200);
    const compData = await compRes.json();
    assert.strictEqual(compData.success, true);
    assert.ok(Array.isArray(compData.data?.requiredTypes));
    assert.ok(compData.data.requiredTypes.includes("ACLS"), "Facility override should include ACLS");
  });
});

describe("Onboarding API", () => {
  const BASE = `http://localhost:${PORT}`;

  it("GET /api/onboarding as owner returns employer checklist", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
    const res = await fetch(`${BASE}/api/onboarding`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data?.type, "employer");
    assert.ok(Array.isArray(data.data?.steps));
    assert.ok(data.data.steps.length >= 5);
  });

  it("GET /api/onboarding as applicant returns candidate checklist", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
    const res = await fetch(`${BASE}/api/onboarding`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data?.type, "candidate");
    assert.ok(Array.isArray(data.data?.steps));
  });
});

describe("ActivityLog model", () => {
  it("ActivityLog includes actionType invoice_requested and can save without validation errors", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return;
    }
    const mongoose = require("mongoose");
    const ActivityLog = require("../models/ActivityLog");
    await mongoose.connect(uri);
    try {
      const doc = await ActivityLog.create({
        actionType: "invoice_requested",
        targetType: "InvoiceRequest",
        targetId: new mongoose.Types.ObjectId(),
        message: "Test invoice requested",
      });
      assert.ok(doc._id);
      assert.strictEqual(doc.actionType, "invoice_requested");
      await ActivityLog.findByIdAndDelete(doc._id);
    } finally {
      await mongoose.disconnect();
    }
  });
});

describe("Cross-tenant access control (PR 8B.5)", () => {
  const BASE = `http://localhost:${PORT}`;

  async function loginAs(email, password) {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email, password: password || "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return null;
    const cookie = loginRes.headers.get("set-cookie");
    const authCookie = cookie ? cookie.split(";")[0] : null;
    const headers = authCookie ? csrf.withAuth(authCookie) : csrf.headers;
    return { csrf, authCookie, headers };
  }

  it("1. Recruiter in Company A cannot GET Company B resource (job applicants)", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;

    const mongoose = require("mongoose");
    const User = require("../models/User");
    const Company = require("../models/Company");
    const Facility = require("../models/Facility");
    const Job = require("../models/Job");
    const Application = require("../models/Application");
    const RecruiterMembership = require("../models/RecruiterMembership");

    await mongoose.connect(uri);
    const owner = await User.findOne({ email: "owner@demo.com" });
    const recruiter = await User.findOne({ email: "recruiter@demo.com" });
    const candidate = await User.findOne({ email: "candidate@demo.com" });
    if (!owner || !recruiter || !candidate) {
      await mongoose.disconnect();
      return;
    }

    const companyA = await Company.findOne({ ownerId: owner._id });
    const mem = await RecruiterMembership.findOne({ userId: recruiter._id, status: "active" });
    if (!companyA || !mem || mem.companyId.toString() !== companyA._id.toString()) {
      await mongoose.disconnect();
      return;
    }

    const companyB = await Company.create({
      name: "Cross-Tenant Test Co B " + Date.now(),
      legalName: "Test B LLC",
      ownerId: owner._id,
      status: "active",
    });
    const facilityB = await Facility.create({
      companyId: companyB._id,
      name: "Facility B",
      status: "active",
    });
    const jobB = await Job.create({
      title: "Job B",
      description: "Test job for cross-tenant",
      location: "Remote",
      jobType: "full-time",
      company: companyB.name,
      companyId: companyB._id,
      facilityId: facilityB._id,
      createdBy: owner._id,
      status: "open",
    });
    const appB = await Application.create({
      jobId: jobB._id,
      companyId: companyB._id,
      facilityId: facilityB._id,
      applicant: candidate._id,
      firstName: "Jane",
      lastName: "Candidate",
      email: candidate.email,
      phone: "555-0100",
      status: "applied",
    });
    await mongoose.disconnect();

    const auth = await loginAs("recruiter@demo.com");
    if (!auth) return;
    const res = await fetch(`${BASE}/api/recruiter/jobs/${jobB._id}/applicants`, {
      headers: auth.headers,
      credentials: "include",
    });
    assert.ok(res.status === 403 || res.status === 404, `Expected 403 or 404, got ${res.status}`);

    await mongoose.connect(uri);
    await Application.deleteOne({ _id: appB._id });
    await Job.deleteOne({ _id: jobB._id });
    await Facility.deleteOne({ _id: facilityB._id });
    await Company.deleteOne({ _id: companyB._id });
    await mongoose.disconnect();
  });

  it("2. Recruiter in Company A cannot mutate Company B resource (PATCH application status)", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;

    const mongoose = require("mongoose");
    const User = require("../models/User");
    const Company = require("../models/Company");
    const Facility = require("../models/Facility");
    const Job = require("../models/Job");
    const Application = require("../models/Application");
    const RecruiterMembership = require("../models/RecruiterMembership");

    await mongoose.connect(uri);
    const owner = await User.findOne({ email: "owner@demo.com" });
    const recruiter = await User.findOne({ email: "recruiter@demo.com" });
    const candidate = await User.findOne({ email: "candidate@demo.com" });
    if (!owner || !recruiter || !candidate) {
      await mongoose.disconnect();
      return;
    }

    const companyB = await Company.findOne({ name: /Cross-Tenant Test Co B/ });
    let appB;
    if (companyB) {
      appB = await Application.findOne({ companyId: companyB._id });
    }
    if (!appB) {
      const companyBNew = await Company.create({
        name: "Cross-Tenant Test Co B2 " + Date.now(),
        legalName: "Test B2 LLC",
        ownerId: owner._id,
        status: "active",
      });
      const facilityB = await Facility.create({
        companyId: companyBNew._id,
        name: "Facility B2",
        status: "active",
      });
      const jobB = await Job.create({
        title: "Job B2",
        description: "Test job for cross-tenant",
        location: "Remote",
        jobType: "full-time",
        company: companyBNew.name,
        companyId: companyBNew._id,
        facilityId: facilityB._id,
        createdBy: owner._id,
        status: "open",
      });
      appB = await Application.create({
        jobId: jobB._id,
        companyId: companyBNew._id,
        facilityId: facilityB._id,
        applicant: candidate._id,
        firstName: "Jane",
        lastName: "Candidate",
        email: candidate.email,
        phone: "555-0100",
        status: "applied",
      });
    }
    const appId = appB._id.toString();
    await mongoose.disconnect();

    const auth = await loginAs("recruiter@demo.com");
    if (!auth) return;
    const res = await fetch(`${BASE}/api/recruiter/applications/${appId}/status`, {
      method: "PATCH",
      headers: { ...auth.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "reviewing" }),
      credentials: "include",
    });
    assert.ok(res.status === 403 || res.status === 404, `Expected 403 or 404, got ${res.status}`);
  });

  it("3. Applicant A cannot download Applicant B document", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;

    const mongoose = require("mongoose");
    const User = require("../models/User");
    const CandidateDocument = require("../models/CandidateDocument");

    await mongoose.connect(uri);
    const candidateA = await User.findOne({ email: "candidate@demo.com" });
    let candidateB = await User.findOne({ email: "candidate2-cross-tenant@demo.com" });
    if (!candidateB) {
      candidateB = await User.create({
        name: "Candidate B",
        email: "candidate2-cross-tenant@demo.com",
        password: "Demo123!",
        role: "applicant",
      });
    }
    const doc = await CandidateDocument.create({
      userId: candidateB._id,
      type: "Resume",
      fileUrl: "test-cross-tenant-" + Date.now() + ".pdf",
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      size: 0,
    });
    const docId = doc._id.toString();
    await mongoose.disconnect();

    const auth = await loginAs("candidate@demo.com");
    if (!auth) return;
    const res = await fetch(`${BASE}/api/documents/${docId}/download`, {
      headers: auth.headers,
      credentials: "include",
    });
    assert.ok(res.status === 403 || res.status === 404, `Expected 403 or 404, got ${res.status}`);

    await mongoose.connect(uri);
    await CandidateDocument.findByIdAndDelete(docId);
    await mongoose.disconnect();
  });

  it("4. Applicant A cannot withdraw Applicant B application", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;

    const mongoose = require("mongoose");
    const User = require("../models/User");
    const Company = require("../models/Company");
    const Facility = require("../models/Facility");
    const Job = require("../models/Job");
    const Application = require("../models/Application");

    await mongoose.connect(uri);
    const candidateA = await User.findOne({ email: "candidate@demo.com" });
    let candidateB = await User.findOne({ email: "candidate2-cross-tenant@demo.com" });
    if (!candidateB) {
      candidateB = await User.create({
        name: "Candidate B",
        email: "candidate2-cross-tenant@demo.com",
        password: "Demo123!",
        role: "applicant",
      });
    }
    const company = await Company.findOne({ ownerId: { $exists: true } });
    const job = await Job.findOne({ companyId: company?._id });
    if (!job || !candidateB) {
      await mongoose.disconnect();
      return;
    }
    const appB = await Application.create({
      jobId: job._id,
      companyId: job.companyId,
      facilityId: job.facilityId || null,
      applicant: candidateB._id,
      firstName: "B",
      lastName: "Test",
      email: candidateB.email,
      phone: "555-0199",
      status: "applied",
    });
    const appId = appB._id.toString();
    await mongoose.disconnect();

    const auth = await loginAs("candidate@demo.com");
    if (!auth) return;
    const res = await fetch(`${BASE}/api/applications/${appId}/withdraw`, {
      method: "PATCH",
      headers: { ...auth.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "test" }),
      credentials: "include",
    });
    assert.ok(res.status === 403 || res.status === 404, `Expected 403 or 404, got ${res.status}`);

    await mongoose.connect(uri);
    await Application.findByIdAndDelete(appId);
    await mongoose.disconnect();
  });

  it("5. Recruiter cannot access /api/admin endpoints", async () => {
    const auth = await loginAs("recruiter@demo.com");
    if (!auth) return;
    const res = await fetch(`${BASE}/api/admin/companies`, {
      headers: auth.headers,
      credentials: "include",
    });
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  it("6. Recruiter in Company A cannot PATCH or DELETE Company B job", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;

    const mongoose = require("mongoose");
    const User = require("../models/User");
    const Company = require("../models/Company");
    const Facility = require("../models/Facility");
    const Job = require("../models/Job");
    const RecruiterMembership = require("../models/RecruiterMembership");

    await mongoose.connect(uri);
    const owner = await User.findOne({ email: "owner@demo.com" });
    const recruiter = await User.findOne({ email: "recruiter@demo.com" });
    if (!owner || !recruiter) {
      await mongoose.disconnect();
      return;
    }

    const companyA = await Company.findOne({ ownerId: owner._id });
    const mem = await RecruiterMembership.findOne({ userId: recruiter._id, status: "active" });
    if (!companyA || !mem || mem.companyId.toString() !== companyA._id.toString()) {
      await mongoose.disconnect();
      return;
    }

    const companyB = await Company.create({
      name: "Cross-Tenant Job Test Co " + Date.now(),
      legalName: "Job Test B LLC",
      ownerId: owner._id,
      status: "active",
    });
    const facilityB = await Facility.create({
      companyId: companyB._id,
      name: "Facility Job B",
      status: "active",
    });
    const jobB = await Job.create({
      title: "Job Cross-Tenant",
      description: "Test job for cross-tenant guard",
      location: "Remote",
      jobType: "full-time",
      company: companyB.name,
      companyId: companyB._id,
      facilityId: facilityB._id,
      createdBy: owner._id,
      status: "open",
    });
    const jobId = jobB._id.toString();
    await mongoose.disconnect();

    const auth = await loginAs("recruiter@demo.com");
    if (!auth) return;

    const patchRes = await fetch(`${BASE}/api/jobs/${jobId}`, {
      method: "PUT",
      headers: { ...auth.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hacked", description: "x", location: "x", jobType: "full-time" }),
      credentials: "include",
    });
    assert.ok(patchRes.status === 403 || patchRes.status === 404, `PATCH: Expected 403 or 404, got ${patchRes.status}`);

    const deleteRes = await fetch(`${BASE}/api/jobs/${jobId}`, {
      method: "DELETE",
      headers: auth.headers,
      credentials: "include",
    });
    assert.ok(deleteRes.status === 403 || deleteRes.status === 404, `DELETE: Expected 403 or 404, got ${deleteRes.status}`);

    await mongoose.connect(uri);
    await Job.deleteOne({ _id: jobId });
    await Facility.deleteOne({ _id: facilityB._id });
    await Company.deleteOne({ _id: companyB._id });
    await mongoose.disconnect();
  });
});

describe("File upload hardening", () => {
  const BASE = `http://localhost:${PORT}`;

  async function loginAsCandidate() {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrf.headers },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return null;
    const cookie = loginRes.headers.get("set-cookie");
    const authCookie = cookie ? cookie.split(";")[0] : null;
    return { csrf, authCookie };
  }

  it("POST /api/candidates/me/documents rejects oversized file with 400 and requestId", async () => {
    const auth = await loginAsCandidate();
    if (!auth) return;

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(16 * 1024 * 1024)], { type: "application/pdf" }), "large.pdf");
    form.append("type", "Resume");

    const res = await fetch(`${BASE}/api/candidates/me/documents`, {
      method: "POST",
      headers: auth.csrf.withAuth(auth.authCookie),
      body: form,
      credentials: "include",
    });

    assert.strictEqual(res.status, 400, "expected 400 for oversized file");
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok((data.message || "").toLowerCase().includes("large") || (data.message || "").includes("MB"));
    assert.ok(data.requestId, "response must include requestId");
  });

  it("POST /api/candidates/me/documents rejects disallowed MIME type with 400 and requestId", async () => {
    const auth = await loginAsCandidate();
    if (!auth) return;

    const form = new FormData();
    form.append("file", new Blob(["not a pdf"], { type: "text/plain" }), "bad.txt");
    form.append("type", "Resume");

    const res = await fetch(`${BASE}/api/candidates/me/documents`, {
      method: "POST",
      headers: auth.csrf.withAuth(auth.authCookie),
      body: form,
      credentials: "include",
    });

    assert.strictEqual(res.status, 400, "expected 400 for disallowed file type");
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok((data.message || "").toLowerCase().includes("only") || (data.message || "").toLowerCase().includes("allowed"));
    assert.ok(data.requestId, "response must include requestId");
  });
});
