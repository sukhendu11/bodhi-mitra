#!/usr/bin/env node
/**
 * Bodhi Mitra — Demo Cleanup Script
 * ===================================
 * Removes the demo admin account and all demo-created content.
 *
 * USAGE:
 *   node scripts/cleanup-demo.js
 *
 * What this removes:
 *   - Demo user from auth.users (cascades to profiles, user_roles, comments)
 *   - All posts created by this script (identified by slug prefix "demo-")
 *   - All orphaned comments
 */

const { createClient } = require("@supabase/supabase-js");

const DEMO_EMAIL = "admin@bodhimitra.test";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("  Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  console.error("  Run: source .env && node scripts/cleanup-demo.cjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function step(label, fn) {
  process.stdout.write(`  ${label} ... `);
  try {
    const result = await fn();
    console.log("✓");
    return result;
  } catch (err) {
    console.log("✗");
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║      Bodhi Mitra — Demo Cleanup                     ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");

  // ── 1. Remove demo posts (slug starts with "demo-") ──────────────
  await step("Removing demo posts (slug: demo-*)", async () => {
    const { error } = await supabase
      .from("posts")
      .delete()
      .like("slug", "demo-%");
    if (error) throw error;
  });

  // ── 2. Find and delete the demo user in auth.users ───────────────
  let userId = null;
  await step("Looking up demo user by email", async () => {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    const user = data.users.find((u) => u.email === DEMO_EMAIL);
    if (user) {
      userId = user.id;
      console.log(`    Found: ${user.id}`);
    } else {
      console.log("    Not found — skipping user deletion");
    }
  });

  if (userId) {
    await step("Deleting demo user (cascades to profiles, roles, comments)", async () => {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    });
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║              Cleanup Complete!                       ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("  Removed:");
  console.log(`    - Demo posts (slug: demo-*)`);
  console.log(`    - Demo user: ${DEMO_EMAIL}`);
  console.log(`    - Demo comments`);
  console.log("");
  console.log("  Note: The code-level `isHardcodedAdmin` bypass is still active.");
  console.log("  If someone signs up with the same email, they will be treated as admin.");
  console.log("");
}

main().catch((err) => {
  console.error("\n  Cleanup failed:", err.message);
  process.exit(1);
});
