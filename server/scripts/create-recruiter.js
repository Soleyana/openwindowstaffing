/**
 * DEPRECATED: Recruiters can ONLY be created via the invite flow.
 * The owner invites recruiters by email from the recruiter dashboard.
 *
 * For initial setup (empty database):
 *   node scripts/create-initial-owner.js --email=... --password=...
 *
 * For existing database:
 *   - Register at /signup (first user becomes owner)
 *   - Owner invites recruiters via /recruiter/dashboard
 */

console.error("Recruiters must be created via invitation. Owner invites by email from the recruiter dashboard.");
console.error("For initial setup: node scripts/create-initial-owner.js --email=... --password=...");
process.exit(1);
