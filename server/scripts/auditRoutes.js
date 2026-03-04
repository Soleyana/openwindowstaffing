#!/usr/bin/env node
/**
 * Dev-only route audit script.
 * Enumerates route files and prints access-control checklist.
 * Run: node scripts/auditRoutes.js (from server dir)
 */
const fs = require("fs");
const path = require("path");

const routesDir = path.join(__dirname, "..", "routes");
const files = fs.readdirSync(routesDir).filter((f) => f.endsWith("Routes.js"));

console.log("\n=== Access Control Audit Checklist ===\n");

for (const file of files.sort()) {
  const content = fs.readFileSync(path.join(routesDir, file), "utf8");
  const name = file.replace("Routes.js", "");
  const hasRequireAuth = /requireAuth|requireRole|requireRecruiter|requireApplicant|requireStaff|requireOwner|requirePlatformAdmin/.test(content);
  const hasRequireCompanyAccess = /requireCompanyAccess/.test(content);
  const hasRequireCompanyOwnerOrAdmin = /requireCompanyOwnerOrAdmin/.test(content);
  const hasRequirePlatformAdmin = /requirePlatformAdmin/.test(content);

  console.log(`## ${name}Routes.js`);
  console.log(`   requireAuth/requireRole: ${hasRequireAuth ? "✓" : "—"}`);
  console.log(`   requireCompanyAccess:    ${hasRequireCompanyAccess ? "✓" : "—"}`);
  console.log(`   requireCompanyOwnerOrAdmin: ${hasRequireCompanyOwnerOrAdmin ? "✓" : "—"}`);
  console.log(`   requirePlatformAdmin:   ${hasRequirePlatformAdmin ? "✓" : "—"}`);
  console.log("");
}

console.log("See docs/ACCESS_CONTROL_MATRIX.md for full matrix.\n");
