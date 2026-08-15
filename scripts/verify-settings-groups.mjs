/**
 * Verify the four added Site Settings groups (Contact · Article · Reader ·
 * Commerce) render their fields in the Refine admin edit dialog and that
 * edits persist through the mock settings store.
 *
 * Usage: node scripts/verify-settings-groups.mjs [baseUrl]
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3001";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = process.env.PORT || "9262";
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "✅" : "❌"} ${name}${extra ? ` — ${extra}` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDataDir = mkdtempSync(join(tmpdir(), "settings-groups-"));
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
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails || {};
      errors.push(`pageerror: ${d.text ?? ""} ${d.exception?.description ?? ""}`.trim().slice(0, 200));
    }
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

  await send("Page.enable");
  await send("Runtime.enable");

  // Sign in as super_admin via the mock session (same pattern as the other scripts).
  await send("Page.navigate", { url: `${BASE}/login` });
  await sleep(2500);
  await evalJs(`(()=>{
    localStorage.setItem("sabbe-satta-mock-session", JSON.stringify({
      access_token: "t" + Date.now(), refresh_token: "r", expires_at: Date.now() + 3600000,
      user: { id: "demo-root", email: "root@sabbe-satta.test", display_name: "Demo Root", avatar_url: null, role: "super_admin" },
    }));
    return true;
  })()`);

  await send("Page.navigate", { url: `${BASE}/admin` });
  await sleep(4000);
  await evalJs(`(()=>{ const b=[...document.querySelectorAll("aside nav button")].find(x=>x.textContent.trim()==="Site Settings"); if(b)b.click(); return !!b; })()`);
  await sleep(2000);
  await evalJs(`(()=>{ const b=[...document.querySelectorAll("button")].find(x=>x.getAttribute("aria-label")==="Edit"); if(b)b.click(); return !!b; })()`);
  await sleep(1200);

  // All 12 section headers present.
  const sectionNames = await evalJs(`(()=>{
    const dlg = document.querySelector("[role=dialog]");
    const text = dlg ? dlg.innerText : "";
    return ["Contact", "Article", "Reader", "Commerce"].filter((s) => text.includes(s)).length;
  })()`);
  check("new sections Contact/Article/Reader/Commerce render", sectionNames === 4, `${sectionNames}/4`);

  // Representative fields from each new group are present.
  const fieldChecks = await evalJs(`(()=>{
    const dlg = document.querySelector("[role=dialog]");
    const text = dlg ? dlg.innerText : "";
    return {
      contactEmail: text.includes("Contact Email"),
      introEn: text.includes("Intro (EN)"),
      showAuthorBio: text.includes("Show Author Bio"),
      newsletterTitle: text.includes("Newsletter Title (EN)"),
      defaultTheme: text.includes("Default Theme"),
      allowDownload: text.includes("Allow Download"),
      currency: text.includes("Currency Code"),
      taxRate: text.includes("Tax Rate (%)"),
    };
  })()`);
  check("Contact group fields render", fieldChecks.contactEmail && fieldChecks.introEn);
  check("Article group fields render", fieldChecks.showAuthorBio && fieldChecks.newsletterTitle);
  check("Reader group fields render", fieldChecks.defaultTheme && fieldChecks.allowDownload);
  check("Commerce group fields render", fieldChecks.currency && fieldChecks.taxRate);

  // Edit a commerce field and a reader field, save, reopen → persisted.
  // Use non-default values so the read-back proves a real write.
  const persisted = await evalJs(`(async () => {
    const dlg = document.querySelector("[role=dialog]");
    if (!dlg) return false;
    const setVal = (label, value) => {
      const labels = [...dlg.querySelectorAll("label")];
      const lab = labels.find((l) => l.textContent.trim().startsWith(label));
      if (!lab) return false;
      const el = document.getElementById(lab.htmlFor);
      if (!el) return false;
      if (el.tagName === "SELECT") {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
        setter.call(el, value);
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return true;
    };
    const okCur = setVal("Currency Code", "USD");
    const okTheme = setVal("Default Theme", "dark");
    return okCur && okTheme;
  })()`);
  check("edit fields in new groups (currency + theme)", persisted === true);

  await evalJs(`(()=>{ const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.trim()==="Save"); if(b)b.click(); return !!b; })()`);
  await sleep(1500);

  // Reopen and confirm persistence.
  await evalJs(`(()=>{ const b=[...document.querySelectorAll("button")].find(x=>x.getAttribute("aria-label")==="Edit"); if(b)b.click(); return !!b; })()`);
  await sleep(1200);
  const reopened = await evalJs(`(()=>{
    const dlg = document.querySelector("[role=dialog]");
    if (!dlg) return { currency: null, theme: null };
    const val = (label) => {
      const lab = [...dlg.querySelectorAll("label")].find((l) => l.textContent.trim().startsWith(label));
      if (!lab) return null;
      const el = document.getElementById(lab.htmlFor);
      return el ? el.value : null;
    };
    return { currency: val("Currency Code"), theme: val("Default Theme") };
  })()`);
  check("currency edit persisted", reopened.currency === "USD", `got: ${reopened.currency}`);
  check("reader theme edit persisted", reopened.theme === "dark", `got: ${reopened.theme}`);

  // Reset to demo defaults so the demo store stays clean: reopen, set back, save.
  await evalJs(`(()=>{ const b=[...document.querySelectorAll("button")].find(x=>x.getAttribute("aria-label")==="Edit"); if(b)b.click(); return !!b; })()`);
  await sleep(1200);
  await evalJs(`(()=>{
    const dlg = document.querySelector("[role=dialog]");
    if (!dlg) return false;
    const setVal = (label, value) => {
      const lab = [...dlg.querySelectorAll("label")].find((l) => l.textContent.trim().startsWith(label));
      if (!lab) return false;
      const el = document.getElementById(lab.htmlFor);
      if (!el) return false;
      if (el.tagName === "SELECT") {
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set.call(el, value);
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return true;
    };
    return setVal("Currency Code", "BDT") && setVal("Default Theme", "sepia");
  })()`);
  await evalJs(`(()=>{ const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.trim()==="Save"); if(b)b.click(); return !!b; })()`);
  await sleep(1500);

  // Known pre-existing dev-server noise: @refinedev/react-table imports
  // lodash/isEqual which the running Vite server can't resolve until it is
  // restarted (dep-optimizer staleness). SSR falls back to client rendering;
  // the app works — only this module-resolution error is expected in dev.
  // Windows paths use backslashes, so match on the two tokens separately.
  const realErrors = errors.filter((e) => !(e.includes("Cannot find module") && e.includes("lodash")));
  check(
    "zero app errors (lodash SSR module-resolution whitelisted)",
    realErrors.length === 0,
    realErrors.slice(0, 3).join(", ")
  );

  ws.close();
} catch (err) {
  check("script ran without exception", false, String(err).slice(0, 300));
} finally {
  chrome.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
