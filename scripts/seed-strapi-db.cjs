const { join } = require("path");
const Database = require(join(__dirname, "..", "strapi", "node_modules", "better-sqlite3"));

const db = new Database(join(__dirname, "..", "strapi", ".tmp", "data.db"));

const insertCat = db.prepare(`
  INSERT INTO categories (document_id, name_en, name_bn, slug, description_en, description_bn, color, visible, sort_order, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), NULL, NULL, 'en')
`);

const cats = [
  ["meditation_doc", "Meditation", "ধ্যান", "meditation", "Practices and reflections on meditation and stillness.", "ধ্যান ও নীরবতা সম্পর্কে অনুশীলন এবং প্রতিফলন।", "#d35400", 1, 0],
  ["mindfulness_doc", "Mindfulness", "মননশীলতা", "mindfulness", "Cultivating present-moment awareness in daily life.", "দৈনন্দিন জীবনে বর্তমান মুহূর্তের সচেতনতা গড়ে তোলা।", "#d35400", 1, 1],
  ["mental_health_doc", "Mental Health", "মানসিক স্বাস্থ্য", "mental-health", "Bridging Buddhist wisdom and modern psychology for emotional well-being.", "মানসিক সুস্থতার জন্য বৌদ্ধ জ্ঞান ও আধুনিক মনোবিজ্ঞানের সমন্বয়।", "#d35400", 1, 2],
  ["philosophy_doc", "Philosophy", "দর্শন", "philosophy", "Exploring the philosophical foundations of Buddhist thought.", "বৌদ্ধ চিন্তার দার্শনিক ভিত্তি অন্বেষণ।", "#d35400", 1, 3],
];

const insertMany = db.transaction((items) => {
  for (const item of items) insertCat.run(...item);
});

// Check existing
const existing = db.prepare("SELECT slug FROM categories").all();
const existingSlugs = new Set(existing.map((r) => r.slug));
const toInsert = cats.filter((c) => !existingSlugs.has(c[2])); // slug is index 2... wait, slug is index 3

// Actually slug is at index 3
const toInsert2 = cats.filter((c) => !existingSlugs.has(c[3]));

if (toInsert2.length === 0) {
  console.log("All categories already exist in Strapi DB.");
} else {
  insertMany(toInsert2);
  console.log("Inserted:", toInsert2.map((c) => c[1]).join(", "));
}

const all = db.prepare("SELECT name_en, slug FROM categories ORDER BY sort_order").all();
console.log("\nCurrent categories:");
for (const r of all) console.log("  -", r.name_en, "(" + r.slug + ")");

db.close();
