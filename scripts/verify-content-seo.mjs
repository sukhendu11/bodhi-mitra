/**
 * Verify per-content SEO (seo_title/seo_description) renders in the
 * public post/book route heads — mock mode.
 *
 * Usage: node scripts/verify-content-seo.mjs [baseUrl]
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3001";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = process.env.PORT || "9261";
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "✅" : "❌"} ${name}${extra ? ` — ${extra}` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDataDir = mkdtempSync(join(tmpdir(), "seo-check-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDataDir}`, "about:blank",
], { stdio: "ignore" });

try {
  let targets = [];
  for (let i = 0; i < 40; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      if (targets.length) break;
    } catch {}
    await sleep(250);
  }
  if (!targets.length) throw new Error("Chrome CDP not reachable");
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push("console.error");
    if (msg.method === "Runtime.exceptionThrown") errors.push("pageerror");
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const mid = ++id;
      pending.set(mid, resolve);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  const evalJs = async (expr) => {
    const msg = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (msg.error) throw new Error(msg.error.message);
    return msg.result?.result?.value;
  };
  const navigate = (url) =>
    send("Page.navigate", { url }).then(() => sleep(2500));

  await send("Page.enable");
  await send("Runtime.enable");

  // Post with per-content SEO overrides
  await navigate(`${BASE}/posts/the-art-of-sitting-still`);
  const postTitle = await evalJs("document.title");
  const postDesc = await evalJs(`document.querySelector('meta[name="description"]')?.content ?? null`);
  check(
    "post page title uses seo_title",
    String(postTitle ?? "").startsWith("The Art of Sitting Still — A Beginner's Meditation Guide"),
    `got: ${postTitle}`,
  );
  check(
    "post page meta description uses seo_description",
    String(postDesc ?? "").includes("fully present in meditation"),
    `got: ${postDesc}`,
  );

  // Post WITHOUT overrides → falls back to title/excerpt
  await navigate(`${BASE}/posts/breath-as-anchoring`);
  const fallbackTitle = await evalJs("document.title");
  check(
    "post without overrides falls back to title_en",
    String(fallbackTitle ?? "").startsWith("Breath as Anchoring"),
    `got: ${fallbackTitle}`,
  );

  // Book with seo_title override
  await navigate(`${BASE}/books/the-heart-of-meditation`);
  const bookTitle = await evalJs("document.title");
  check(
    "book page title uses seo_title",
    String(bookTitle ?? "").startsWith("The Heart of Meditation — A Complete Practice Guide"),
    `got: ${bookTitle}`,
  );

  check("zero console errors / pageerrors", errors.length === 0, errors.slice(0, 3).join(", "));

  ws.close();
} catch (err) {
  check("script ran without exception", false, String(err).slice(0, 200));
} finally {
  chrome.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
