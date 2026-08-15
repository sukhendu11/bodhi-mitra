// Dev-only browser check: the Refine admin list upgrades (2026-08-15) —
// accessControlProvider-driven actions, sortable headers, server-mode search,
// breadcrumb header + Refresh, sidebar role badge.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP_URL = "http://localhost:3001";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = process.env.PORT || "9263";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDataDir = mkdtempSync(join(tmpdir(), "list-features-"));
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
  // Let the SPA route commit before polling (see verify-admin-dashboard-stats.mjs).
  await sleep(4000);
  let ready = false;
  for (let i = 0; i < 24; i++) {
    ready = (await evalJs(`(()=>{
      try {
        const t = document.body.innerText;
        return /revenue/i.test(t) && !t.includes("—");
      } catch { return false; }
    })()`)) === true;
    if (ready) break;
    await sleep(500);
  }
  check("dashboard hydrated", ready === true);

  // Role badge in the sidebar footer (mirror of the access-control gate).
  const roleBadge = await evalJs(`(()=>{
    const a = document.querySelector("aside");
    const t = a ? a.innerText : "";
    return /role/i.test(t) && /super_admin/i.test(t);
  })()`);
  check("sidebar shows the signed-in role badge", roleBadge === true);

  // Open the Books list.
  await evalJs(`(()=>{
    const b = [...document.querySelectorAll("aside nav button")].find((x) => x.textContent.trim() === "Books");
    if (b) b.click();
    return !!b;
  })()`);
  await sleep(2500);

  const listText = await evalJs(`(()=>document.body.innerText)()`);
  check("breadcrumb renders Dashboard / Books", /dashboard\s*\/\s*books/i.test(listText));
  check("Refresh button present", (await evalJs(`!![...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Refresh")`)) === true);
  check("row actions render (useCan granted)", (await evalJs(`!!document.querySelector("tbody tr button[aria-label=Edit]") && !!document.querySelector("tbody tr button[aria-label=Delete]")`)) === true);

  // Server-mode search: typing a distinctive phrase narrows the visible list
  // (the q filter matches across ALL row values, incl. descriptions).
  const beforeCount = await evalJs(`document.querySelectorAll("tbody tr").length`);
  await evalJs(`(()=>{
    const input = document.querySelector("input[placeholder=Search…]");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, "Sitting Still");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
  await sleep(2500);
  const searchRows = await evalJs(`([...document.querySelectorAll("tbody tr")].map((r) => r.innerText))`);
  // The q filter matches across ALL row values (descriptions included), so
  // the visible count shrinking (and the exact-title row being present) is
  // the contract — per-value matching is unit-tested in the mock provider.
  check(
    "search narrows the books list (server-mode q filter)",
    searchRows.length > 0 &&
      searchRows.length < beforeCount &&
      searchRows.some((r) => /^the art of sitting still/i.test(r)),
    `${searchRows.length}/${beforeCount} row(s)`,
  );

  // Sorting: click the Title header → ascending; the first row changes to the
  // alphabetically-first title.
  await evalJs(`(()=>{
    const input = document.querySelector("input[placeholder=Search…]");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
  await sleep(1500);
  const headerBtn = await evalJs(`(()=>{
    const th = [...document.querySelectorAll("th")].find((h) => /title/i.test(h.textContent));
    if (!th) return false;
    th.querySelector("button").click();
    return true;
  })()`);
  check("Title header is clickable", headerBtn === true);
  await sleep(2500);
  // Ascending sort: first row must be the alphabetically-first title of the
  // catalog ("Buddhist Psychology and the Management of Emotions").
  const firstRowAfterSort = String(await evalJs(`document.querySelector("tbody tr")?.innerText ?? ""`));
  check(
    "sorting reorders rows (asc — Buddhist first)",
    /^buddhist psychology/i.test(firstRowAfterSort.trim()),
    firstRowAfterSort.split("\t")[0] ?? "",
  );
  // Click again → descending: the first row becomes the alphabetically-last
  // title ("Walking the Middle Way").
  await evalJs(`(()=>{
    const th = [...document.querySelectorAll("th")].find((h) => /title/i.test(h.textContent));
    th.querySelector("button").click();
    return true;
  })()`);
  await sleep(2500);
  const firstRowDesc = String(await evalJs(`document.querySelector("tbody tr")?.innerText ?? ""`));
  check(
    "sorting reverses on second click (desc — Walking first)",
    /^walking the middle way/i.test(firstRowDesc.trim()),
    firstRowDesc.split("\t")[0] ?? "",
  );

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
