/* ═══════════════════════════════════════════════════════════════════════════
 * GENERATE SAMPLE PDFs — low-size, valid PDF files for the mock books.
 *
 * Creates one tiny PDF per mock book (each ~700–900 bytes) in public/pdfs/.
 * Content is a title page + a couple of sample lines so the reader has
 * something to render. Run with:  node scripts/generate-sample-pdfs.mjs
 * ═══════════════════════════════════════════════════════════════════════════ */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "pdfs");

/* ── The 10 mock books (slug → title) ──────────────────────────── */
const BOOKS = [
  { slug: "the-heart-of-meditation", title: "The Heart of Meditation", author: "Siddhartha Gautama" },
  { slug: "walking-the-middle-way", title: "Walking the Middle Way", author: "Ananda Bhikkhu" },
  { slug: "mindful-living-daily", title: "Mindful Living: A Daily Practice", author: "Maya Karuna" },
  { slug: "emotional-resilience", title: "Emotional Resilience: A Buddhist Approach", author: "Dr. Sarah Weiss" },
  { slug: "art-of-sitting-still", title: "The Art of Sitting Still", author: "Siddhartha Gautama" },
  { slug: "four-noble-truths-modern-life", title: "The Four Noble Truths for Modern Life", author: "Ananda Bhikkhu" },
  { slug: "loving-kindness-meditation", title: "Loving-Kindness Meditation: A Practical Guide", author: "Maya Karuna" },
  { slug: "buddhist-psychology-emotions", title: "Buddhist Psychology and the Management of Emotions", author: "Dr. Sarah Weiss" },
  { slug: "mindfulness-stress-reduction", title: "Mindfulness-Based Stress Reduction Companion", author: "Maya Karuna" },
  { slug: "silence-and-stillness", title: "Silence and Stillness: Contemplative Essays", author: "Ananda Bhikkhu" },
];

/* ── Minimal PDF builder (correct xref offsets) ────────────────── */
function escapePdfText(s) {
  return s.replace(/[\\()]/g, (m) => `\\${m}`);
}

function buildPdf(title, author) {
  const body = [
    "A sample of the free edition from Sabbe Satta.",
    "",
    "This is a low-size demo PDF generated for local development.",
    "Replace it with the full manuscript when available.",
  ];
  const ops = ["BT", "/F1 20 Tf", "72 740 Td", `(${escapePdfText(title)}) Tj`];
  ops.push("0 -30 Td", `/F1 12 Tf`, `(by ${escapePdfText(author)}) Tj`);
  for (const line of body) {
    ops.push("0 -22 Td", `(${escapePdfText(line)}) Tj`);
  }
  ops.push("ET");
  const stream = ops.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

/* ── Generate ───────────────────────────────────────────────────── */
mkdirSync(OUT_DIR, { recursive: true });

const sizes = {};
for (const book of BOOKS) {
  const pdf = buildPdf(book.title, book.author);
  const file = join(OUT_DIR, `${book.slug}.pdf`);
  writeFileSync(file, pdf, "latin1");
  sizes[book.slug] = Buffer.byteLength(pdf, "latin1");
}

console.log(`Generated ${BOOKS.length} sample PDFs in public/pdfs/:\n`);
for (const [slug, bytes] of Object.entries(sizes)) {
  console.log(`  ${slug.padEnd(34)} ${bytes} bytes`);
}
console.log("\nDone. Update mock-data pdf_url + pdf_file_size to match.");
