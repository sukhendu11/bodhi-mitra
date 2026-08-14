/**
 * Dev-only browser check for the 3 new admin resources (site_settings,
 * tags, notifications) in the Refine admin mock preview.
 * Drives the installed Chrome via CDP: seeds a SUPER_ADMIN session, opens
 * /admin?admin=refine, and asserts the new resources render in the sidebar,
 * that Site Settings shows a single flattened row, and that the edit dialog
 * opens with the nested (dotted) fields.
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = process.env.PORT || "9241";
const APP_URL = "http://localhost:3001";

const userDataDir = mkdtempSync(join(tmpdir(), "new-res-check-"));
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

  // Seed super_admin + navigate to the Refine preview seam.
  await send("Page.navigate", { url: APP_URL + "/login" });
  await sleep(2500);
  await evalJs(`(()=>{
    localStorage.setItem("sabbe-satta-mock-session", JSON.stringify({
      access_token: "t" + Date.now(), refresh_token: "r", expires_at: Date.now() + 3600000,
      user: { id: "demo-super", email: "root@sabbe-satta.test", display_name: "Demo Root", avatar_url: null, role: "super_admin" },
    }));
    return true;
  })()`);
  await send("Page.navigate", { url: APP_URL + "/admin?admin=refine" });
  await sleep(5500);

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
  await waitForAside();

  const sidebarText = await evalJs(`(()=>{
    const aside = document.querySelector("aside");
    return aside ? aside.innerText : "(no aside)";
  })()`);

  const checks = {
    "sidebar: Site Settings tab": /Site Settings/.test(sidebarText),
    "sidebar: Tags tab": /Tags/.test(sidebarText),
    "sidebar: Notifications tab": /Notifications/.test(sidebarText),
    "sidebar: Books tab still present": /Books/.test(sidebarText),
  };

  // Open Site Settings — single row with flattened config columns.
  await evalJs(`(()=>{const b=[...document.querySelectorAll("aside button")].find(x=>x.textContent.trim()==="Site Settings"); if(b)b.click(); return !!b;})()`);
  await sleep(3000);
  const settingsTable = await evalJs(`(()=>{
    const table = document.querySelector("table");
    return table ? table.innerText : "(no table)";
  })()`);
  checks["site settings: single row with site name"] = /Sabbe Satta/.test(settingsTable);
  checks["site settings: tagline column"] = /Where ancient wisdom/.test(settingsTable);
  checks["site settings: accent color column"] = /#d35400/.test(settingsTable);

  // Open the edit dialog — nested fields render (no New/Delete for singleRow).
  await evalJs(`(()=>{
    const edit = document.querySelector("tbody tr button[aria-label=Edit]");
    if (edit) edit.click();
    return !!edit;
  })()`);
  await sleep(2000);
  const dialogText = await evalJs(`(()=>{
    const dialog = document.querySelector("[role=dialog]");
    return dialog ? dialog.innerText : "(no dialog)";
  })()`);
  checks["site settings: edit dialog opens"] = /Edit Site Settings/.test(dialogText);
  checks["site settings: nested branding field"] = /Site Name/.test(dialogText);
  checks["site settings: maintenance toggle"] = /Maintenance Mode/.test(dialogText);

  // Cancel, then check Tags list renders rows.
  await evalJs(`(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="Cancel"); if(b)b.click(); return !!b;})()`);
  await sleep(1000);
  await evalJs(`(()=>{const b=[...document.querySelectorAll("aside button")].find(x=>x.textContent.trim()==="Tags"); if(b)b.click(); return !!b;})()`);
  await sleep(3000);
  const tagsTable = await evalJs(`(()=>{
    const table = document.querySelector("table");
    return table ? table.innerText : "(no table)";
  })()`);
  checks["tags: list renders rows"] = /meditation/.test(tagsTable) && /buddhism/.test(tagsTable);

  // Notifications list.
  await evalJs(`(()=>{const b=[...document.querySelectorAll("aside button")].find(x=>x.textContent.trim()==="Notifications"); if(b)b.click(); return !!b;})()`);
  await sleep(3000);
  const notifTable = await evalJs(`(()=>{
    const table = document.querySelector("table");
    return table ? table.innerText : "(no table)";
  })()`);
  checks["notifications: list renders rows"] = /Welcome to Sabbe Satta/.test(notifTable);

  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  console.log("=== Refine admin new-resources browser check ===");
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
