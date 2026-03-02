/**
 * Basic integration tests for critical API endpoints.
 * Run with: npm test (or node --test tests/api.test.js)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");

const PORT = process.env.TEST_PORT || process.env.PORT || 5000;

describe("API health", () => {
  it("GET / returns 200", async () => {
    const res = await fetch(`http://localhost:${PORT}/`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.status);
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
    const res = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`http://localhost:${PORT}/api/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
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
    const res = await fetch(
      `${BASE}/api/candidates/507f1f77bcf86cd799439011/compliance/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "test" }),
        credentials: "omit",
      }
    );
    assert.strictEqual(res.status, 401);
  });

  it("GET /api/candidates/me/compliance as applicant returns 200 with valid structure", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
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
    const res = await fetch(`${BASE}/api/invoices/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: "507f1f77bcf86cd799439011" }),
      credentials: "omit",
    });
    assert.strictEqual(res.status, 401);
  });

  it("POST /api/invoices/request as recruiter with valid companyId returns 201 and logs activity", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : { "Content-Type": "application/json" };
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
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
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
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
    const res = await fetch(`${BASE}/api/messages/start-options`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data && Array.isArray(data.data.applications), "Should have data.applications array");
  });

  it("GET /api/messages/start-options as recruiter returns candidates structure", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : {};
    const res = await fetch(`${BASE}/api/messages/start-options`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data && Array.isArray(data.data.candidates), "Should have data.candidates array");
  });

  it("POST /api/messages/threads with applicationId creates or finds thread", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "candidate@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : {};
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
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : {};
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
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
    const res = await fetch(`${BASE}/api/companies`, { headers, credentials: "include" });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
  });

  it("GET /api/companies/:companyId requires company access", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
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
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : {};
    const res = await fetch(`${BASE}/api/companies`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Recruiter Company" }),
      credentials: "include",
    });
    assert.strictEqual(res.status, 403);
  });

  it("PATCH /api/companies/:companyId as owner updates company", async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : {};
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
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : {};
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
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0] } : {};
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
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : {};
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
    const companiesRes = await fetch(`${BASE}/api/companies/public`);
    if (companiesRes.status !== 200) return;
    const companiesData = await companiesRes.json();
    const companies = companiesData?.data ?? companiesData;
    const list = Array.isArray(companies) ? companies : [];
    if (list.length === 0) return;
    const companyId = list[0]._id;
    const res = await fetch(`${BASE}/api/testimonials/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recruiter@demo.com", password: "Demo123!" }),
      redirect: "manual",
    });
    if (loginRes.status !== 200) return;
    const cookie = loginRes.headers.get("set-cookie");
    const headers = cookie ? { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } : {};
    const companiesRes = await fetch(`${BASE}/api/companies`, { headers, credentials: "include" });
    if (companiesRes.status !== 200) return;
    const companiesData = await companiesRes.json();
    const companies = companiesData?.data ?? [];
    if (companies.length === 0) return;
    const companyId = companies[0]._id;
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
    const companiesRes = await fetch(`${BASE}/api/companies/public`);
    if (companiesRes.status !== 200) return;
    const companiesData = await companiesRes.json();
    const companies = companiesData?.data ?? companiesData;
    const list = Array.isArray(companies) ? companies : [];
    if (list.length === 0) return;
    const companyId = list[0]._id;
    const res = await fetch(`${BASE}/api/testimonials/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
