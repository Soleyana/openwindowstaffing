/**
 * Unit tests for validateEnv. Tests the validate() function in isolation.
 * Run with: npm test (validateEnv tests run alongside api tests)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("child_process");
const path = require("path");

const { validate, parseCorsOrigins, DEV_JWT_SECRET } = require("../utils/validateEnv");

/** Save and restore env for isolated tests */
let savedEnv = {};

function saveEnv(keys) {
  for (const k of keys) {
    savedEnv[k] = process.env[k];
  }
}

function restoreEnv(keys) {
  for (const k of keys) {
    if (savedEnv[k] !== undefined) process.env[k] = savedEnv[k];
    else delete process.env[k];
  }
}

function setEnv(overrides) {
  for (const [k, v] of Object.entries(overrides)) {
    process.env[k] = v;
  }
}

const ENV_KEYS = [
  "NODE_ENV", "MONGODB_URI", "JWT_SECRET", "CORS_ORIGINS",
  "COOKIE_SECURE", "COOKIE_SAMESITE", "COOKIE_SAME_SITE",
  "RESEND_API_KEY", "EMAIL_FROM", "FROM_EMAIL",
];

describe("validateEnv", () => {
  beforeEach(() => saveEnv(ENV_KEYS));
  afterEach(() => restoreEnv(ENV_KEYS));

  describe("validate() – production mode", () => {
    beforeEach(() => setEnv({ NODE_ENV: "production" }));

    it("missing MONGODB_URI produces error", () => {
      setEnv({ MONGODB_URI: "" });
      const { errors } = validate();
      assert.ok(errors.some((e) => e.toLowerCase().includes("mongodb")), "expected MONGODB_URI error");
    });

    it("default JWT_SECRET produces error", () => {
      setEnv({
        MONGODB_URI: "mongodb://localhost:27017/test",
        JWT_SECRET: DEV_JWT_SECRET,
        CORS_ORIGINS: "https://app.example.com",
        COOKIE_SECURE: "true",
        COOKIE_SAMESITE: "none",
      });
      const { errors } = validate();
      assert.ok(errors.some((e) => e.toLowerCase().includes("jwt_secret")), "expected JWT_SECRET error");
    });

    it("invalid CORS_ORIGINS (wildcard) produces error", () => {
      setEnv({
        MONGODB_URI: "mongodb://localhost:27017/test",
        JWT_SECRET: "a-strong-production-secret-at-least-32-chars-long",
        CORS_ORIGINS: "*",
        COOKIE_SECURE: "true",
        COOKIE_SAMESITE: "none",
      });
      const { errors } = validate();
      assert.ok(errors.some((e) => e.toLowerCase().includes("wildcard") || e.toLowerCase().includes("cors")), "expected CORS error");
    });

    it("empty CORS_ORIGINS produces error", () => {
      setEnv({
        MONGODB_URI: "mongodb://localhost:27017/test",
        JWT_SECRET: "a-strong-production-secret-at-least-32-chars-long",
        CORS_ORIGINS: "",
        COOKIE_SECURE: "true",
        COOKIE_SAMESITE: "none",
      });
      const { errors } = validate();
      assert.ok(errors.some((e) => e.toLowerCase().includes("cors")), "expected CORS error");
    });

    it("cross-site without COOKIE_SECURE produces error", () => {
      setEnv({
        MONGODB_URI: "mongodb://localhost:27017/test",
        JWT_SECRET: "a-strong-production-secret-at-least-32-chars-long",
        CORS_ORIGINS: "https://app.example.com",
        COOKIE_SAMESITE: "none",
        COOKIE_SECURE: "",
      });
      const { errors } = validate();
      assert.ok(errors.some((e) => e.toLowerCase().includes("cookie") && e.toLowerCase().includes("secure")), "expected COOKIE_SECURE error");
    });

    it("valid production config produces no errors", () => {
      setEnv({
        MONGODB_URI: "mongodb://localhost:27017/test",
        JWT_SECRET: "a-strong-production-secret-at-least-32-chars-long",
        CORS_ORIGINS: "https://app.example.com",
        COOKIE_SECURE: "true",
        COOKIE_SAMESITE: "none",
      });
      const { errors } = validate();
      assert.strictEqual(errors.length, 0, `expected no errors, got: ${errors.join(", ")}`);
    });
  });

  describe("validate() – dev mode", () => {
    beforeEach(() => setEnv({ NODE_ENV: "development" }));

    it("invalid config produces warnings only, no errors", () => {
      setEnv({ MONGODB_URI: "", JWT_SECRET: DEV_JWT_SECRET });
      const { errors, warnings } = validate();
      assert.strictEqual(errors.length, 0, "dev mode should not produce errors");
      assert.ok(warnings.length >= 1, "dev mode should produce warnings");
    });
  });

  describe("parseCorsOrigins", () => {
    it("parses comma-separated origins", () => {
      setEnv({ CORS_ORIGINS: "https://a.com, https://b.com " });
      const origins = parseCorsOrigins();
      assert.deepStrictEqual(origins, ["https://a.com", "https://b.com"]);
    });

    it("filters empty entries", () => {
      setEnv({ CORS_ORIGINS: "https://a.com,,  ,https://b.com" });
      const origins = parseCorsOrigins();
      assert.deepStrictEqual(origins, ["https://a.com", "https://b.com"]);
    });
  });

  describe("production startup exit(1)", () => {
    it("exits with code 1 when required env missing in production", () => {
      const serverDir = path.join(__dirname, "..");
      const bootstrap = `
        process.chdir(process.argv[2]);
        require("dotenv").config({ path: require("path").join(process.argv[2], ".env") });
        process.env.NODE_ENV = "production";
        process.env.MONGODB_URI = "";
        process.env.JWT_SECRET = "";
        process.env.CORS_ORIGINS = "";
        const { validateEnv } = require("./utils/validateEnv");
        const noop = () => {};
        validateEnv({ logger: { info: noop, warn: noop, error: noop } });
      `;
      const result = spawnSync("node", ["-e", bootstrap, serverDir], {
        cwd: serverDir,
        encoding: "utf8",
      });
      assert.strictEqual(result.status, 1, "expected exit(1) when production config invalid");
    });
  });
});
