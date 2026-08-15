// Dev-only browser check: the Refine admin dashboard renders analytics
// stat cards (Books/Reflections/Videos/Orders/Purchases/Revenue) with real
// mock-store counts, and the resource index remains below (RBAC-filtered).
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP_URL = "http://localhost:3001";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = process.env.PORT || "9260";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDataDir = mkdtempSync(join(tmpdir(), "dash-check-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDataDir}`, "about:blank",
], { stdio: "ignore" });

async function cdp() {
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
  const consoleMsgs = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === "Runtime.consoleAPICalled") {
      consoleMsgs.push((msg.params.args || []).map((a) => a.value ?? a.description ?? "").join(" "));
    }
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const mid = ++id;
      pending.set(mid, resolve);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  const evalJs = async (expression) => {
    const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (res.result?.exceptionDetails) return "EXC: " + JSON.stringify(res.result.exceptionDetails).slice(0, 200);
    return res.result?.result?.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  return { send, evalJs, ws, consoleMsgs };
}

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

try {
  const { send, evalJs, ws, consoleMsgs } = await cdp();

  // Sign in as super_admin (full admin).
  await send("Page.navigate", { url: APP_URL + "/login" });
  await sleep(2500);
  await evalJs(`(()=>{
    localStorage.setItem("sabbe-satta-mock-session", JSON.stringify({
      access_token: "t" + Date.now(), refresh_token: "r", expires_at: Date.now() + 3600000,
      user: { id: "demo-root", email: "root@sabbe-satta.test", display_name: "Demo Root", avatar_url: null, role: "super_admin" },
    }));
    return true;
  })()`);

  await send("Page.navigate", { url: APP_URL + "/admin" });
  // Let the SPA route commit before polling (the poll evaluates against the
  // current document; a still-uncommitted navigation throws on a null body).
  await sleep(4000);
  // Wait for the dashboard to hydrate AND the stat query to resolve.
  // Labels render uppercased via CSS text-transform (BOOKS/REFLECTIONS/…),
  // so match case-insensitively; values are Latin digits in EN mode.
  let ready = false;
  for (let i = 0; i < 24; i++) {
    ready = (await evalJs(`(()=>{
      try {
        const t = document.body.innerText;
        return /books/i.test(t) && /revenue/i.test(t) && !t.includes("—");
      } catch { return false; }
    })()`)) === true;
    if (ready) break;
    await sleep(500);
  }
  check("dashboard hydrated with stat labels", ready === true);

  const bodyText = await evalJs(`(()=>document.body.innerText)()`);
  // Mock catalog: 10 books, 25 posts, 8 videos; demo seed = 1 order + 2 purchases.
  check("Books stat shows the mock count (10)", /books\s*\n*\s*10/i.test(bodyText), "found 'BOOKS 10'");
  check("Reflections stat shows 25", /reflections\s*\n*\s*25/i.test(bodyText), "found 'REFLECTIONS 25'");
  check("Videos stat shows 8", /videos\s*\n*\s*8/i.test(bodyText), "found 'VIDEOS 8'");
  check("Revenue renders BDT (paid orders)", /revenue\s*\n*\s*BDT/i.test(bodyText), "found 'REVENUE BDT …'");
  check("Purchases stat shows 2", /purchases\s*\n*\s*2/i.test(bodyText), "found 'PURCHASES 2'");
  // Resource index still below (RBAC-filtered machine names).
  check("resource index retains machine names", /site_settings/.test(bodyText) && /notifications/.test(bodyText));
  // Resource cards carry row-count badges (10 books, 25 posts, 8 videos, …).
  const bookCountBadge = await evalJs(`(()=>{
    const card = [...document.querySelectorAll("button")].find((b) => /books/i.test(b.textContent) && b.querySelector("span:last-child")?.textContent.trim() === "10");
    return !!card;
  })()`);
  check("resource cards show row counts (books = 10)", bookCountBadge === true);
  // Analytics charts (ECharts canvases — content overview + orders by status).
  check("analytics charts render canvases", (await evalJs(`document.querySelectorAll("canvas").length`)) >= 2, "canvas count");
  check("recent activity lists notifications", /recent activity/i.test(bodyText) && /new_purchase|welcome/i.test(bodyText));

  // E2E: creating a draft book surfaces the "needs attention" strip on the
  // dashboard (draftContent > 0 → chip) — exercises CRUD → dashboard reactivity.
  await evalJs(`(()=>{
    const b = [...document.querySelectorAll("aside nav button")].find((x) => x.textContent.trim() === "Books");
    if (b) b.click();
    return !!b;
  })()`);
  await sleep(2000);
  await evalJs(`(()=>{ const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="New"); if(b)b.click(); return !!b; })()`);
  await sleep(1200);
  await evalJs(`(()=>{
    const inputs = [...document.querySelectorAll("input, select")];
    const title = inputs.find((i) => i.id === "field-title_en");
    const status = inputs.find((i) => i.id === "field-status");
    if (title) { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set; s.call(title, "Draft Insight Book"); title.dispatchEvent(new Event("input", { bubbles: true })); }
    if (status) { status.value = "draft"; status.dispatchEvent(new Event("change", { bubbles: true })); }
    return !!(title && status);
  })()`);
  await sleep(400);
  await evalJs(`(()=>{ const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="Save"); if(b)b.click(); return !!b; })()`);
  await sleep(2000);
  // Back to dashboard — the draft chip must appear.
  await evalJs(`(()=>{ const b=[...document.querySelectorAll("aside nav button")].find(x=>x.textContent.trim()==="Dashboard"); if(b)b.click(); return !!b; })()`);
  await sleep(2000);
  const attention = await evalJs(`(()=>{ const t = document.body.innerText; return /draft.*review/i.test(t); })()`);
  check("needs-attention strip flags drafts after creating one", attention === true);

  // Site Settings editor — grouped sections render (SEO/Hero/Theme/Social/…).
  await evalJs(`(()=>{ const b=[...document.querySelectorAll("aside nav button")].find(x=>x.textContent.trim()==="Site Settings"); if(b)b.click(); return !!b; })()`);
  await sleep(2000);
  await evalJs(`(()=>{ const b=[...document.querySelectorAll("button")].find(x=>x.getAttribute("aria-label")==="Edit"); if(b)b.click(); return !!b; })()`);
  await sleep(1200);
  const sections = await evalJs(`(()=>{
    const dlg = document.querySelector("[role=dialog]");
    const text = dlg ? dlg.innerText : "";
    return ["Branding", "Hero", "Theme", "SEO", "Social", "Footer", "Book Grid", "Maintenance"].filter((s) => text.includes(s)).length;
  })()`);
  check("settings form groups fields into sections (8 headers)", sections === 8, `${sections}/8`);
  await evalJs(`(()=>{ const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.trim()==="Cancel"); if(b)b.click(); return !!b; })()`);

  // Zero console errors.
  const errors = consoleMsgs.filter((m) => /error|uncaught/i.test(m));
  check("zero console errors", errors.length === 0, errors.slice(0, 2).join(" | "));

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
  ws.close();
} catch (e) {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
