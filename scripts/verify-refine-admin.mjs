/**
 * Dev-only browser check for the P2 Refine admin (mock mode preview).
 * Drives the installed Chrome via CDP (no new dependencies): seeds the demo
 * admin mock session, opens /admin?admin=refine, and asserts the Refine
 * shell + books table render. Prints PASS/FAIL; exits non-zero on failure.
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = process.env.PORT || "9223";
const APP_URL = "http://localhost:3001";

const userDataDir = mkdtempSync(join(tmpdir(), "refine-admin-check-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDataDir}`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

async function main() {
  // Wait for Chrome's CDP endpoint
  let targets = [];
  for (let i = 0; i < 40; i++) {
    try {
      targets = await getJson(`http://127.0.0.1:${PORT}/json`);
      if (targets.length) break;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  if (!targets.length) throw new Error("Chrome CDP not reachable");

  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const mid = ++id;
      pending.set(mid, resolve);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  const evalJs = async (expression) => {
    const res = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.result?.exceptionDetails) {
      throw new Error("JS error: " + JSON.stringify(res.result.exceptionDetails));
    }
    return res.result?.result?.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");

  // 1. Seed the demo admin mock session (same shape makeMockSession produces).
  await send("Page.navigate", { url: APP_URL + "/login" });
  await sleep(2500);
  const seeded = await evalJs(`(async () => {
    const KEY = "sabbe-satta-mock-session";
    const session = {
      access_token: "mock-admin-verify-" + Date.now(),
      refresh_token: "mock-refresh-admin",
      expires_at: Date.now() + 3600_000,
      user: {
        id: "demo-admin",
        email: "admin@sabbesatta.test",
        display_name: "Demo Admin",
        avatar_url: null,
        role: "super_admin",
      },
    };
    localStorage.setItem(KEY, JSON.stringify(session));
    // Also seed a profile row so the Users resource lists something.
    const PK = "sabbe-satta-mock-profiles";
    const profiles = JSON.parse(localStorage.getItem(PK) || "{}");
    profiles["demo-admin"] = {
      user_id: "demo-admin",
      display_name: "Demo Admin",
      avatar_url: null,
      bio: "Site administrator",
      created_at: new Date().toISOString(),
      preferences: null,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(PK, JSON.stringify(profiles));
    return localStorage.getItem(KEY) !== null;
  })()`);
  if (!seeded) throw new Error("failed to seed mock session");

  // 2. Open the Refine admin via the preview seam.
  await send("Page.navigate", { url: APP_URL + "/admin?admin=refine" });
  await sleep(5000);

  const body = await evalJs("document.body.innerText");
  const checks = {
    "sidebar: Sabbe Satta": /Sabbe Satta/.test(body),
    "sidebar: Dashboard": /Dashboard/.test(body),
    "sidebar: Books": /Books/.test(body),
    "sidebar: Reflections": /Reflections/.test(body),
    "sidebar: Videos": /Videos/.test(body),
    "sidebar: Orders": /Orders/.test(body),
    "sidebar: Users": /Users/.test(body),
  };

  // 3. Click the Books tab and verify the table renders rows.
  await evalJs(`(() => {
    const btns = [...document.querySelectorAll("button")];
    const books = btns.find((b) => b.textContent.trim() === "Books");
    if (books) books.click();
    return Boolean(books);
  })()`);
  await sleep(3000);
  const booksBody = await evalJs("document.body.innerText");
  checks["books table: New button"] = /New/.test(booksBody);
  checks["books table: a book title row"] =
    /the|art|sitting|noble|truth|life|mind|heart|sutta|love/i.test(booksBody);

  const failures = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);

  console.log("=== Refine admin browser check ===");
  for (const [k, ok] of Object.entries(checks)) console.log(`${ok ? "PASS" : "FAIL"}  ${k}`);
  if (failures.length) {
    console.log("FAILURES:", failures.join(", "));
    process.exitCode = 1;
  } else {
    console.log("ALL CHECKS PASSED");
  }

  ws.close();
}

main()
  .catch((e) => {
    console.error("VERIFY ERROR:", e.message);
    process.exitCode = 1;
  })
  .finally(() => {
    chrome.kill();
  });
