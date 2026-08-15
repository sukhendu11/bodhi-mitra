/**
 * Dev-only browser check for P2 admin RBAC (mock mode preview).
 * Drives the installed Chrome via CDP: seeds an EDITOR mock session and a
 * SUPER_ADMIN mock session, opens /admin, and asserts the Refine admin
 * filters resources + actions by role.
 *
 * Editor expectations:
 *   - sidebar shows Dashboard/Books/Reflections/Videos/Pages/Categories/Navigation
 *   - sidebar does NOT show Orders or Users
 *   - Books tab: New + Edit + Delete buttons present (content CRUD)
 *   - Pages tab: NO New button (structure is view/update only)
 *   - Pages tab: Edit present, Delete absent
 *
 * Super-admin expectations (quick spot-check):
 *   - sidebar DOES show Orders and Users
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = process.env.PORT || "9240";
const APP_URL = "http://localhost:3001";

const userDataDir = mkdtempSync(join(tmpdir(), "rbac-check-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDataDir}`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
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

  const seed = async (role, email, displayName) => {
    await send("Page.navigate", { url: APP_URL + "/login" });
    await sleep(2500);
    const seeded = await evalJs(`(()=>{
      localStorage.setItem("sabbe-satta-mock-session", JSON.stringify({
        access_token: "t" + Date.now(), refresh_token: "r", expires_at: Date.now() + 3600000,
        user: { id: "demo-${role}", email: ${JSON.stringify(email)}, display_name: ${JSON.stringify(displayName)}, avatar_url: null, role: ${JSON.stringify(role)} },
      }));
      return true;
    })()`);
    if (!seeded) throw new Error("failed to seed mock session");
    // The Refine shell is the mock-mode default for every role (since
    // 2026-08-15); the old MockAdminPanel is only reachable via ?admin=mock,
    // so a plain /admin navigation reaches the RBAC-aware Refine shell.
    await send("Page.navigate", { url: APP_URL + "/admin" });
    await sleep(5000);
  };

  // Wait until the admin shell hydrated AND the nav rendered role-filtered
  // tabs (the sidebar's Dashboard tab renders before the session effect
  // populates the resource nav, so match on nav items, not just Dashboard).
  const waitForAside = async () => {
    for (let i = 0; i < 24; i++) {
      const ready = await evalJs(`(()=>{
        const aside = document.querySelector("aside");
        if (!aside) return false;
        const navBtns = aside.querySelectorAll("nav button").length;
        return navBtns >= 2;
      })()`);
      if (ready) return;
      await sleep(500);
    }
    throw new Error("admin aside nav did not render");
  };

  const sidebarText = () =>
    evalJs(`(()=>{
      const aside = document.querySelector("aside");
      return aside ? aside.innerText : "(no aside)";
    })()`);

  const hasButton = (label) =>
    evalJs(`(()=>{
      const btns = [...document.querySelectorAll("button")];
      return btns.some(b => b.textContent.trim() === ${JSON.stringify(label)});
    })()`);

  // ── EDITOR ──
  await seed("editor", "editor@sabbe-satta.test", "Demo Editor");
  await waitForAside();
  const editorSidebar = await sidebarText();
  const checks = {
    "editor sidebar: Books": /Books/.test(editorSidebar),
    "editor sidebar: Reflections": /Reflections/.test(editorSidebar),
    "editor sidebar: Videos": /Videos/.test(editorSidebar),
    "editor sidebar: Pages": /Pages/.test(editorSidebar),
    "editor sidebar: Categories": /Categories/.test(editorSidebar),
    "editor sidebar: Navigation": /Navigation/.test(editorSidebar),
    "editor sidebar: NO Orders": !/Orders/.test(editorSidebar),
    "editor sidebar: NO Users": !/Users/.test(editorSidebar),
  };

  // Books tab — full content CRUD
  await evalJs(`(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="Books"); if(b)b.click(); return !!b;})()`);
  await sleep(3000);
  checks["editor books: New button"] = await hasButton("New");
  checks["editor books: Edit button"] = await evalJs(`!!document.querySelector("tbody tr button[aria-label=Edit]")`);
  checks["editor books: Delete button"] = await evalJs(`!!document.querySelector("tbody tr button[aria-label=Delete]")`);

  // Pages tab — structure: view/update only
  await evalJs(`(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="Pages"); if(b)b.click(); return !!b;})()`);
  await sleep(3000);
  // Pages is read-only in MOCK mode (no mock write store), so no actions
  // render even though RBAC grants editor update — both gates apply.
  checks["editor pages: NO New button (structure)"] = !(await hasButton("New"));
  checks["editor pages: NO actions (mock read-only)"] =
    !(await evalJs(`!!document.querySelector("tbody tr button[aria-label=Edit]")`)) &&
    !(await evalJs(`!!document.querySelector("tbody tr button[aria-label=Delete]")`));

  // ── ADMIN ──
  await seed("admin", "admin@sabbe-satta.test", "Demo Admin");
  await waitForAside();
  const adminSidebar = await sidebarText();
  checks["admin sidebar: Orders visible"] = /Orders/.test(adminSidebar);
  checks["admin sidebar: NO Users (profiles = super_admin only)"] = !/Users/.test(adminSidebar);

  // ── SUPER_ADMIN (via the Refine preview seam — full admins default to
  // MockAdminPanel, the Refine shell is what RBAC filters) ──
  await seed("super_admin", "root@sabbe-satta.test", "Demo Root");
  await waitForAside();
  const superSidebar = await sidebarText();
  checks["super_admin sidebar: Users visible"] = /Users/.test(superSidebar);
  checks["super_admin sidebar: Orders visible"] = /Orders/.test(superSidebar);

  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  console.log("=== Refine admin RBAC browser check ===");
  for (const [k, ok] of Object.entries(checks)) console.log(`${ok ? "PASS" : "FAIL"}  ${k}`);
  console.log("console errors:", consoleMsgs.filter((m) => /error/i.test(m)).slice(0, 5).join(" | ") || "(none)");
  if (failures.length) {
    console.log("FAILURES:", failures.join(", "));
    process.exitCode = 1;
  } else {
    console.log("ALL CHECKS PASSED");
  }
  ws.close();
}

main()
  .catch((e) => { console.error("VERIFY ERROR:", e.message); process.exitCode = 1; })
  .finally(() => chrome.kill());
