import fs from "fs";
import https from "https";

const PROJECT_REF = "ptqxdikjfcbgnwhwfefi";
const TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TOKEN) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.");
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
          Authorization: `Bearer ${TOKEN}`,
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
