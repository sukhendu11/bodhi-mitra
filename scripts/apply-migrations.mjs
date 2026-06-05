import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const PROJECT_REF = "ptqxdikjfcbgnwhwfefi";

// ── Load .env file ──────────────────────────────────────────────────────
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

const MANAGEMENT_TOKEN = process.env.SUPABASE_MANAGEMENT_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!MANAGEMENT_TOKEN) {
  console.error("Error: SUPABASE_MANAGEMENT_KEY not found in .env");
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
          if (res.statusCode >= 400) reject(new Error(`[${res.statusCode}] ${body}`));
          else resolve(body ? JSON.parse(body) : null);
        });
      }
    );
    req.write(data);
    req.end();
  });
}

async function main() {
  const migrationsDir = path.resolve(__dirname, "..", "supabase", "migrations");

  const pending = [
    "20260605000010_create_videos.sql",
    "20260605000011_add_page_sections.sql",
    "20260605000012_add_nav_location.sql",
  ];

  for (const filename of pending) {
    const filePath = path.join(migrationsDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ Skipping ${filename} — file not found`);
      continue;
    }
    const sql = fs.readFileSync(filePath, "utf8");
    console.log(`\n=== Applying ${filename} ===`);
    try {
      const result = await api(sql);
      console.log(`✅ ${filename} applied successfully`);
      if (result) console.log(JSON.stringify(result, null, 2).substring(0, 300));
    } catch (e) {
      // If table already exists or column already exists, that's OK
      const msg = e.message || "";
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log(`⚠ ${filename} — already applied (skipped)`);
      } else {
        console.error(`❌ ${filename} failed:`, msg.substring(0, 500));
      }
    }
  }

  // Verify
  console.log("\n=== Verifying tables ===");
  try {
    const tables = await api(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('videos', 'pages', 'navigation_items') ORDER BY table_name`
    );
    console.log("Tables found:", JSON.stringify(tables, null, 2));
  } catch (e) {
    console.error("Verify error:", e.message);
  }
}

main().catch(console.error);
