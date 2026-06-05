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
  const sql = fs.readFileSync(path.resolve(__dirname, "create-books.sql"), "utf8");
  console.log("=== Creating books table ===");
  try {
    await api(sql);
    console.log("✅ books table created successfully");
  } catch (e) {
    console.error("❌ Failed:", e.message.substring(0, 400));
  }
  // Verify
  try {
    const tables = await api(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'books'`);
    console.log("Verification:", JSON.stringify(tables));
  } catch (e) {
    console.error("Verify error:", e.message);
  }
}
main().catch(console.error);
