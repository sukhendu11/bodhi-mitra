#!/usr/bin/env node
/**
 * Bodhi Mitra — Demo Setup Script
 * ==================================
 * Creates a demo admin account + sample content for client testing.
 *
 * USAGE:
 *   node scripts/setup-demo.js
 *
 * REMOVAL:
 *   node scripts/cleanup-demo.js
 *
 * Credentials created:
 *   Email:    admin@bodhimitra.test
 *   Password: BodhiMitra@2026!Demo
 *   Display:  admin
 */

const { createClient } = require("@supabase/supabase-js");

// ── Config ────────────────────────────────────────────────────────────────
const DEMO_EMAIL = "admin@bodhimitra.test";
const DEMO_PASSWORD = "BodhiMitra@2026!Demo";
const DEMO_DISPLAY = "admin";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("  Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  console.error("  Run: source .env && node scripts/setup-demo.cjs");
  process.exit(1);
}

// ── Supabase admin client (service_role bypasses RLS) ─────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let DEMO_USER_ID = null;

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
  console.log("║      Bodhi Mitra — Demo Environment Setup          ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");

  // ── 1. Create the demo user in Supabase Auth ──────────────────────
  await step("Creating demo user in Supabase Auth", async () => {
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: DEMO_DISPLAY, demo_account: true },
    });
    if (error) throw error;
    DEMO_USER_ID = data.user.id;
    console.log(`    User ID: ${DEMO_USER_ID}`);
    console.log(`    Email:   ${DEMO_EMAIL}`);
  });

  // ── 2. Assign admin role in user_roles ────────────────────────────
  await step("Assigning admin role in user_roles", async () => {
    const { error } = await supabase.from("user_roles").insert({
      user_id: DEMO_USER_ID,
      role: "admin",
    });
    if (error) throw error;
  });

  // ── 3. Update profile display name ────────────────────────────────
  await step("Updating profile display name", async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: DEMO_DISPLAY })
      .eq("user_id", DEMO_USER_ID);
    if (error) throw error;
  });

  // ── 4. Create sample posts ────────────────────────────────────────
  let postIds = [];
  await step("Creating sample posts", async () => {
    const samples = [
      {
        slug: "demo-welcome-post",
        category: "Buddhist Psychology",
        status: "published",
        title_en: "Welcome to Bodhi Mitra — A Demo Post",
        title_bn: "বোধি মিত্রায় স্বাগতম — একটি ডেমো পোস্ট",
        content_en:
          "<p>This is a demo post created for client testing. It demonstrates the complete content management workflow.</p><p>You can edit this post, change its category, update the featured image, modify tags, and toggle between draft and published status.</p><p>The editor supports rich text formatting, including <strong>bold</strong>, <em>italic</em>, and <u>underline</u> styling, as well as headings, blockquotes, and lists.</p><blockquote><p>\"The mind is everything. What you think you become.\" — The Buddha</p></blockquote>",
        content_bn:
          "<p>এটি একটি ডেমো পোস্ট যা ক্লায়েন্ট পরীক্ষার জন্য তৈরি করা হয়েছে। এটি সম্পূর্ণ কন্টেন্ট ম্যানেজমেন্ট ওয়ার্কফ্লো প্রদর্শন করে।</p>",
        excerpt_en:
          "Welcome! This demo post showcases the CMS features — editing, categories, tags, bilingual content, and more.",
        excerpt_bn:
          "স্বাগতম! এই ডেমো পোস্টটি CMS বৈশিষ্ট্যগুলি প্রদর্শন করে — সম্পাদনা, বিভাগ, ট্যাগ, দ্বিভাষিক কন্টেন্ট এবং আরও অনেক কিছু।",
        author_name: "admin",
        author_image: null,
        tags: ["demo", "welcome", "test"],
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        slug: "demo-bilingual-content",
        category: "Wisdom",
        status: "published",
        title_en: "Bilingual Content — English & Bengali",
        title_bn: "দ্বিভাষিক কন্টেন্ট — ইংরেজি ও বাংলা",
        content_en:
          "<p>Bodhi Mitra supports fully bilingual content. Every post can have both an English and a Bengali version.</p><p>The site automatically displays the correct language based on the reader's preference.</p><ul><li><strong>English content</strong> — stored in <code>content_en</code></li><li><strong>বাংলা কন্টেন্ট</strong> — stored in <code>content_bn</code></li></ul><p>This makes the platform accessible to a wider audience.</p>",
        content_bn:
          "<p>বোধি মিত্রা সম্পূর্ণ দ্বিভাষিক কন্টেন্ট সমর্থন করে। প্রতিটি পোস্টের ইংরেজি এবং বাংলা উভয় সংস্করণ থাকতে পারে।</p>",
        excerpt_en:
          "A demonstration of Bodhi Mitra's bilingual content support — English and Bengali side by side.",
        excerpt_bn:
          "বোধি মিত্রার দ্বিভাষিক কন্টেন্ট সমর্থনের একটি প্রদর্শন — ইংরেজি এবং বাংলা পাশাপাশি।",
        author_name: "admin",
        author_image: null,
        tags: ["demo", "bilingual", "test"],
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        slug: "demo-draft-post",
        category: "Books",
        status: "draft",
        title_en: "Upcoming Book Review (Draft)",
        title_bn: "আসন্ন বই পর্যালোচনা (খসড়া)",
        content_en:
          "<p>This is a draft post. It is not visible to the public — only admins can see it in the admin panel.</p><p>Publish this post when it's ready for public viewing.</p>",
        content_bn: "<p>এটি একটি খসড়া পোস্ট। এটি জনসাধারণের কাছে দৃশ্যমান নয় — শুধুমাত্র অ্যাডমিনরা অ্যাডমিন প্যানেলে এটি দেখতে পারেন।</p>",
        excerpt_en: "A draft post awaiting publication — visible only to admins.",
        excerpt_bn: "প্রকাশের অপেক্ষায় একটি খসড়া পোস্ট — শুধুমাত্র অ্যাডমিনদের কাছে দৃশ্যমান।",
        author_name: "admin",
        author_image: null,
        tags: ["demo", "draft"],
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    for (const post of samples) {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          ...post,
          title: post.title_en,
          content: post.content_en,
          excerpt: post.excerpt_en,
        })
        .select("id")
        .single();
      if (error) throw error;
      postIds.push(data.id);
    }
    console.log(`    ${samples.length} posts created`);
  });

  // ── 5. Create sample comments ─────────────────────────────────────
  await step("Creating sample comments", async () => {
    if (postIds.length < 1) return;
    const comments = [
      {
        post_id: postIds[0],
        user_id: DEMO_USER_ID,
        user_name: "admin",
        comment_text:
          "This is a sample comment from the admin account. Comments can be managed from the admin panel.",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        post_id: postIds[0],
        user_id: DEMO_USER_ID,
        user_name: "Test User",
        comment_text:
          "Great post! Looking forward to more content like this on the platform.",
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        post_id: postIds[1],
        user_id: DEMO_USER_ID,
        user_name: "admin",
        comment_text:
          "The bilingual support is fantastic — makes the content accessible to a much wider audience.",
        created_at: new Date(Date.now() - 43200000).toISOString(),
      },
    ];
    for (const c of comments) {
      const { error } = await supabase.from("comments").insert(c);
      if (error) throw error;
    }
    console.log(`    ${comments.length} comments created`);
  });

  // ── Summary ──────────────────────────────────────────────────────
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║              Setup Complete!                         ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("  Demo Admin Account:");
  console.log("  ─────────────────");
  console.log(`    Email:    ${DEMO_EMAIL}`);
  console.log(`    Password: ${DEMO_PASSWORD}`);
  console.log(`    Display:  ${DEMO_DISPLAY}`);
  console.log("");
  console.log("  To remove this demo data:");
  console.log("    node scripts/cleanup-demo.js");
  console.log("");
  console.log("  Login URL: https://bodhimitra.vercel.app/login");
  console.log("");
}

main().catch((err) => {
  console.error("\n  Setup failed:", err.message);
  process.exit(1);
});
