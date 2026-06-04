import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const PROJECT_REF = "ptqxdikjfcbgnwhwfefi";

// ── Load .env file ──────────────────────────────────────────────────────
// Node.js doesn't load .env automatically. Read it manually so the script
// works when run directly (no dotenv dependency needed).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    // Only set if not already defined (allow shell env to take precedence)
    if (!process.env[key]) process.env[key] = val;
  }
}

// Management API token (sbp_...) — different from the JWT service_role key.
// Falls back to SUPABASE_SERVICE_ROLE_KEY if management key isn't set.
const MANAGEMENT_TOKEN = process.env.SUPABASE_MANAGEMENT_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MANAGEMENT_TOKEN) {
  console.error("Error: SUPABASE_MANAGEMENT_KEY not found in .env or environment.");
  console.error("Add to .env:  SUPABASE_MANAGEMENT_KEY=sbp_xxxxxxxx");
  console.error("Or pass inline: SUPABASE_MANAGEMENT_KEY=sbp_xxx node scripts/seed-db.mjs");
  process.exit(1);
}

function api(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const req = https.request(
      {
        hostname: "api.supabase.com",
        path: `/v1/projects/${PROJECT_REF}/database/query`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          console.log(`[${res.statusCode}]`, body.substring(0, 500));
          if (res.statusCode >= 400) reject(new Error(body));
          else resolve(JSON.parse(body));
        });
      }
    );
    req.write(data);
    req.end();
  });
}

async function main() {
  // Step 1: Delete existing seed posts & comments
  console.log("=== Cleaning up existing seed data ===");
  try {
    await api(
      `DELETE FROM public.comments WHERE post_id IN (SELECT id FROM public.posts WHERE slug IN ('the-space-between-thoughts','sitting-with-impermanence','the-arrow-and-the-second-arrow','on-not-knowing','reading-the-mind-reading-the-self'))`
    );
    console.log("Comments deleted");
  } catch (e) {
    console.log("No comments to delete (or already deleted)");
  }
  try {
    await api(
      `DELETE FROM public.posts WHERE slug IN ('the-space-between-thoughts','sitting-with-impermanence','the-arrow-and-the-second-arrow','on-not-knowing','reading-the-mind-reading-the-self')`
    );
    console.log("Posts deleted");
  } catch (e) {
    console.log("No posts to delete");
  }

  // Step 2: Run seed
  console.log("\n=== Running seed SQL ===");
  const seedSql = fs.readFileSync("supabase/seed.sql", "utf8");
  const result = await api(seedSql);
  console.log("\nSeed result:", JSON.stringify(result, null, 2));

  // Step 3: Check what we have
  console.log("\n=== Verifying ===");
  const counts = await api(
    `SELECT 'posts' AS tbl, count(*)::int AS cnt FROM public.posts WHERE status = 'published' UNION ALL SELECT 'comments', count(*)::int FROM public.comments`
  );
  console.log("Counts:", JSON.stringify(counts, null, 2));
}

main().catch(console.error);
