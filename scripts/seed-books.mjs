import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.error(".env not found at", envPath);
    process.exit(1);
  }
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

function makePdf(text) {
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const contentLines = text.split("\n")
    .map((l, i) => `BT /F1 14 Tf 72 ${720 - i * 20} Td (${esc(l)}) Tj ET`)
    .join("\n");

  const objects = [
    `1 0 obj\n<< /Length ${contentLines.length} >>\nstream\n${contentLines}\nendstream\nendobj`,
    `2 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`,
    `3 0 obj\n<< /Type /Page /Parent 4 0 R /MediaBox [0 0 612 792] /Contents 1 0 R /Resources << /Font << /F1 2 0 R >> >> >>\nendobj`,
    `4 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`,
    `5 0 obj\n<< /Type /Catalog /Pages 4 0 R >>\nendobj`,
  ];

  const header = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const body = objects.join("\n") + "\n";

  const parts = [header, body];
  const bodyOffsets = [];
  let pos = Buffer.byteLength(header, "utf8");
  for (let i = 0; i < objects.length; i++) {
    bodyOffsets.push(pos);
    pos += Buffer.byteLength(objects[i] + "\n", "utf8");
  }

  const xrefEntries = ["0000000000 65535 f "];
  for (const o of bodyOffsets) {
    xrefEntries.push(String(o).padStart(10, "0") + " 00000 n ");
  }

  const xref = `xref\n0 ${objects.length + 1}\n${xrefEntries.join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 5 0 R >>\nstartxref\n${pos}\n%%EOF\n`;

  return Buffer.from(header + body + xref, "utf8");
}

const SAMPLE_COVER = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop";

const BOOKS = [
  {
    slug: "the-heart-of-mindfulness",
    title_en: "The Heart of Mindfulness",
    title_bn: "মননশীলতার হৃদয়",
    author_name: "Bhikkhu Anālayo",
    description_en: "A profound exploration of mindfulness practice rooted in the early Buddhist suttas. This book offers practical guidance for both beginning and experienced meditators, with clear instructions on sitting meditation, walking meditation, and bringing awareness into daily life.",
    description_bn: "প্রারম্ভিক বৌদ্ধ সুত্তের উপর ভিত্তি করে মননশীলতা অনুশীলনের একটি গভীর অন্বেষণ। এই বইটি নতুন এবং অভিজ্ঞ উভয় ধ্যানকারীর জন্য ব্যবহারিক নির্দেশনা প্রদান করে।",
    is_free: true,
    price: 0,
    pages: 184,
    category: "meditation",
    tags: ["mindfulness", "meditation", "buddhism"],
    pdf_text: "The Heart of Mindfulness\n\nMindfulness is the gentle art of being present. It is not about forcing the mind to be blank, but about learning to see clearly what is happening in the present moment.\n\nIn the early Buddhist teachings, mindfulness (sati) is described as a quality of attention that remembers to stay with the present experience. It is like a gatekeeper who knows exactly what is going on at the entrance of the mind.\n\nThis book explores the seven factors of awakening and how mindfulness serves as the foundation for each one. Through sustained practice, we develop the ability to observe our thoughts and emotions without being swept away by them.",
  },
  {
    slug: "walking-the-eightfold-path",
    title_en: "Walking the Eightfold Path",
    title_bn: "অষ্টাঙ্গিক মার্গ অনুশীলন",
    author_name: "Ajahn Sumedho",
    description_en: "A down-to-earth guide to the Buddha's Eightfold Path, offered as a living practice rather than a theoretical system. Ajahn Sumedho draws on decades of monastic experience to show how each factor of the path can be integrated into everyday life.",
    description_bn: "বুদ্ধের অষ্টাঙ্গিক মার্গের একটি ব্যবহারিক নির্দেশিকা। অজহ্ন সুমেধো দশকের পর দশক মঠজীবনের অভিজ্ঞতা থেকে দেখান কীভাবে পথের প্রতিটি অঙ্গ দৈনন্দিন জীবনে একীভূত করা যায়।",
    is_free: true,
    price: 0,
    pages: 216,
    category: "buddhism",
    tags: ["eightfold path", "buddhism", "practice"],
    pdf_text: "Walking the Eightfold Path\n\nThe Eightfold Path is not a list of steps to be mastered one after another. It is a living path that we walk with our whole being — our understanding, our speech, our actions, our livelihood, our effort, our mindfulness, and our concentration.\n\nRight View is not about believing the right doctrines. It is about seeing clearly — seeing things as they actually are, not as we wish them to be. This clarity arises naturally when the mind is calm and open.\n\nRight Intention is the heart's direction. It is the willingness to let go of clinging, to cultivate goodwill, and to act with compassion.",
  },
  {
    slug: "emptiness-and-compassion",
    title_en: "Emptiness and Compassion",
    title_bn: "শূন্যতা ও করুণা",
    author_name: "Geshe Tashi Tsering",
    description_en: "An accessible introduction to the Madhyamaka philosophy of emptiness and its intimate connection with compassion. Through clear reasoning and meditative exercises, this book reveals how understanding the nature of reality naturally gives rise to boundless compassion.",
    description_bn: "শূন্যতার মধ্যমক দর্শন এবং করুণার সাথে এর গভীর সংযোগের একটি সহজবোধ্য পরিচিতি। স্পষ্ট যুক্তি এবং ধ্যানমূলক অনুশীলনের মাধ্যমে এই বইটি দেখায় কীভাবে বাস্তবতার প্রকৃতি বোঝা স্বাভাবিকভাবে সীমাহীন করুণার জন্ম দেয়।",
    is_free: false,
    price: 14.99,
    pages: 256,
    category: "philosophy",
    tags: ["emptiness", "compassion", "madhyamaka", "tibetan buddhism"],
    pdf_text: "Emptiness and Compassion\n\nEmptiness (shunyata) is perhaps the most misunderstood concept in Buddhist philosophy. It does not mean nothingness or nihilism. Rather, it points to the way things actually exist — not as solid, independent entities, but as dependently arising phenomena.\n\nWhen we see that all things are empty of inherent existence, something remarkable happens. The walls we normally build between self and other begin to dissolve. We see that our well-being is intimately connected with the well-being of all beings.\n\nThis is the heart of the Mahayana tradition: the realization that emptiness and compassion are two sides of the same coin.",
  },
  {
    slug: "the-joy-of-letting-go",
    title_en: "The Joy of Letting Go",
    title_bn: "ছেড়ে দেওয়ার আনন্দ",
    author_name: "Ayya Khema",
    description_en: "A warm and practical guide to finding freedom through letting go. Ayya Khema offers gentle teachings on renunciation not as deprivation but as the path to genuine happiness. Rich with stories and concrete practices for daily life.",
    description_bn: "ছেড়ে দেওয়ার মাধ্যমে স্বাধীনতা খুঁজে নেওয়ার একটি উষ্ণ ও ব্যবহারিক নির্দেশিকা। অ্যায় খেমা ত্যাগকে বঞ্চনা হিসেবে নয় বরং প্রকৃত সুখের পথ হিসেবে শেখান।",
    is_free: false,
    price: 12.99,
    pages: 192,
    category: "meditation",
    tags: ["letting go", "renunciation", "happiness", "women in buddhism"],
    pdf_text: "The Joy of Letting Go\n\nWe often think that happiness comes from getting what we want. But if we look honestly at our experience, we see that the moments of greatest happiness often come not from acquiring, but from letting go.\n\nLetting go does not mean giving up things we need or denying ourselves pleasure. It means releasing our attachment — the tight grip of 'I want' and 'I must have.' In that release, we discover a freedom that does not depend on circumstances.\n\nThis book offers practical guidance for bringing the spirit of renunciation into everyday life, not as a harsh discipline but as a joyful exploration of what it means to be truly free.",
  },
];

async function main() {
  loadEnv();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Ensure the book-pdfs bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === "book-pdfs")) {
    console.log("Creating book-pdfs bucket…");
    await supabase.storage.createBucket("book-pdfs", {
      public: false,
      fileSizeLimit: 104857600,
      allowedMimeTypes: ["application/pdf"],
    });
  }

  let created = 0;
  let skipped = 0;

  for (const book of BOOKS) {
    // Check if book already exists
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("slug", book.slug)
      .maybeSingle();
    if (existing) {
      console.log(`Book already exists: ${book.slug}`);
      skipped++;
      continue;
    }

    // Upload PDF
    const pdfBuffer = makePdf(book.pdf_text);
    const pdfPath = `books/pdfs/${book.slug}.pdf`;
    const { error: pdfErr } = await supabase.storage
      .from("book-pdfs")
      .upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (pdfErr) {
      console.error(`  Failed to upload PDF for ${book.slug}:`, pdfErr.message);
      continue;
    }
    console.log(`  Uploaded PDF: ${pdfPath} (${pdfBuffer.length} bytes)`);

    // Insert book record
    const { error: insertErr } = await supabase.from("books").insert({
      slug: book.slug,
      title_en: book.title_en,
      title_bn: book.title_bn,
      author_name: book.author_name,
      description_en: book.description_en,
      description_bn: book.description_bn,
      cover_image: SAMPLE_COVER,
      pdf_url: pdfPath,
      pdf_file_size: pdfBuffer.length,
      price: book.price,
      is_free: book.is_free,
      pages: book.pages,
      category: book.category,
      tags: book.tags,
      status: "published",
      sort_order: created,
    });
    if (insertErr) {
      console.error(`  Failed to insert book ${book.slug}:`, insertErr.message);
      continue;
    }

    console.log(`  Created book: ${book.title_en} (${book.is_free ? "free" : "$" + book.price})`);
    created++;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
}

main().catch(console.error);
