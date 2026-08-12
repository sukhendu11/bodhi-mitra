/**
 * Regenerate the SAFE_UNWRAPPED_JUSTIFY_BETWEEN allowlist.
 *
 * Usage:  node scripts/gen-responsive-allowlist.mjs
 *
 * The allowlist lives in `src/lib/__tests__/responsive-contract.test.ts` and
 * backs the M7 global overflow guard: every `justify-between` className in
 * src/routes + src/components that does NOT also contain `wrap` or `flex-col`
 * must be listed there, or the guard fails CI.
 *
 * ONLY regenerate after re-running the 320px overflow audit and confirming
 * each new row cannot overflow (the same audit that produced the 2026-08-11
 * snapshot). Paste the output over the existing allowlist block.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const ROOT = process.cwd();

/** Recursively list .tsx files under a src dir (relative paths, fwd slashes). */
const tsxFiles = (dir) => {
  const out = [];
  for (const entry of readdirSync(resolve(ROOT, dir))) {
    const abs = join(resolve(ROOT, dir), entry);
    if (statSync(abs).isDirectory()) out.push(...tsxFiles(relative(ROOT, abs)));
    else if (entry.endsWith(".tsx")) out.push(relative(ROOT, abs).replace(/\\/g, "/"));
  }
  return out;
};

const byFile = {};
for (const file of [...tsxFiles("src/routes"), ...tsxFiles("src/components")]) {
  const src = readFileSync(resolve(ROOT, file), "utf8");
  for (const m of src.matchAll(/className="([^"]*justify-between[^"]*)"/g)) {
    const cls = m[1];
    if (cls.includes("wrap") || cls.includes("flex-col")) continue;
    const norm = cls.split(" ").sort().join(" ");
    (byFile[file] ??= new Set()).add(norm);
  }
}

let total = 0;
const lines = [];
for (const file of Object.keys(byFile).sort()) {
  const rows = [...byFile[file]].sort();
  total += rows.length;
  lines.push(`  ${JSON.stringify(file)}: [`);
  for (const row of rows) lines.push(`    ${JSON.stringify(row)},`);
  lines.push(`  ],`);
}

console.log(`// Generated allowlist (audited 2026-08-11 — do not edit; regenerate via this script)`);
console.log(`const SAFE_UNWRAPPED_JUSTIFY_BETWEEN: Record<string, string[]> = {`);
console.log(lines.join("\n"));
console.log(`};`);
console.log(`\n// total allowlisted rows: ${total} in ${Object.keys(byFile).length} files`);
