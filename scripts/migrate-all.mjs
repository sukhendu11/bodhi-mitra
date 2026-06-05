import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const PROJECT_REF = "ptqxdikjfcbgnwhwfefi";
const LAST_APPLIED = "20260601024437";

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
    if (!process.env[key]) process.env[key] = val;
  }
}

const TOKEN = process.env.SUPABASE_MANAGEMENT_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!TOKEN) { console.error("No token found"); process.exit(1); }

function api(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const req = https.request({
      hostname: "api.supabase.com",
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        if (res.statusCode >= 400) reject(new Error(`[${res.statusCode}] ${body.slice(0, 500)}`));
        else resolve(body ? JSON.parse(body) : null);
      });
    });
    req.write(data);
    req.end();
  });
}

function extractVersion(filename) {
  const match = filename.match(/^(\d+)_/);
  return match ? match[1] : null;
}

async function main() {
  const migrationsDir = path.resolve(__dirname, "..", "supabase", "migrations");
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const file of files) {
    const version = extractVersion(file);
    if (!version) { console.log(`⚠ Could not extract version from ${file}`); continue; }
    if (version <= LAST_APPLIED) { console.log(`⏭ Skipping ${file} (already applied)`); skipCount++; continue; }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`\n▶ Applying ${file}...`);
    try {
      await api(sql);
      console.log(`✅ ${file} applied`);
      successCount++;
    } catch (e) {
      const msg = e.message;
      // These are OK — table/index/column already exists
      if (msg.includes("already exists") || msg.includes("duplicate key") || msg.includes("Duplicate")) {
        console.log(`⚠ ${file} — already applied (${msg.slice(0, 100)})`);
        skipCount++;
      } else {
        console.error(`❌ ${file} FAILED: ${msg.slice(0, 300)}`);
        console.log("  Continuing to next migration...");
        failCount++;
      }
    }
  }

  console.log("\n══════════════════════════════════");
  console.log(`Results: ${successCount} applied, ${skipCount} skipped, ${failCount} failed`);
  console.log("══════════════════════════════════\n");

  // Verify tables
  console.log("=== Verifying tables ===");
  try {
    const tables = await api(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log(JSON.stringify(tables, null, 2));
  } catch (e) {
    console.error("Verify error:", e.message);
  }
}

main().catch(console.error);
