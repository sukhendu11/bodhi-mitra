import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const PROJECT_REF = "ptqxdikjfcbgnwhwfefi";
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
    req.write(JSON.stringify({ query }));
    req.end();
  });
}

async function main() {
  // Step 1: Create bengali text search config using simple parser
  console.log("=== Creating bengali text search config ===");
  try {
    await api(`
      CREATE TEXT SEARCH CONFIGURATION bengali (COPY = simple);
    `);
    console.log("✅ bengali text search config created");
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.log("⚠ bengali config already exists, skipping");
    } else {
      // Fallback: use 'english' for both
      console.warn("⚠ Could not create bengali config, will fallback to english:", e.message.substring(0, 200));
    }
  }

  // Step 2: Drop the generated column if it has bengali dependency
  console.log("\n=== Dropping old search_vector column (if exists) ===");
  try {
    await api(`ALTER TABLE public.books DROP COLUMN IF EXISTS search_vector;`);
    console.log("✅ Dropped search_vector column");
  } catch (e) {
    console.log("⚠ Could not drop column (table may not exist):", e.message.substring(0, 200));
  }

  // Step 3: Apply the books migration (with fallback for bengali)
  console.log("\n=== Applying books table migration ===");
  const migrationPath = path.resolve(__dirname, "..", "supabase", "migrations", "20260605000003_create_books.sql");
  let sql = fs.readFileSync(migrationPath, "utf8");
  // Replace generated column SQL to handle missing bengali config
  sql = sql.replace(
    /to_tsvector\('bengali', [^)]+\)/g,
    "to_tsvector('simple', coalesce(title_bn, ''))"
  ).replace(
    /to_tsvector\('bengali', coalesce\(description_bn, ''\)\)/g,
    "to_tsvector('simple', coalesce(description_bn, ''))"
  ).replace(
    /to_tsvector\('english', [^)]+\)/g,
    "to_tsvector('english', coalesce(title_en, ''))"
  );
  
  try {
    await api(sql);
    console.log("✅ Books migration applied successfully");
  } catch (e) {
    console.error("❌ Books migration failed:", e.message.substring(0, 400));
    // Try simplified version without generated column
    console.log("\nTrying simplified version (without search_vector)...");
    const simplified = sql.replace(/search_vector tsvector[\s\S]*?STORED;/g, "").replace(
      /CREATE INDEX.*idx_books_search.*GIN.*search_vector.*;/g, ""
    );
    try {
      await api(simplified);
      console.log("✅ Books migration applied (without search vector)");
    } catch (e2) {
      console.error("❌ Simplified books migration also failed:", e2.message.substring(0, 400));
    }
  }

  // Step 4: Verify
  console.log("\n=== Verifying books table ===");
  try {
    const tables = await api(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'books'`
    );
    console.log(JSON.stringify(tables, null, 2));
  } catch (e) {
    console.error("Verify error:", e.message);
  }
}

main().catch(console.error);
