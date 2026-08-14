import { defineNitroConfig } from "nitro/config";

// Production build target (AD-029): Hostinger Managed Node.js runs a plain
// Node HTTP server. `node-server` produces `.output/` runnable with
// `node .output/server/index.mjs` (`npm start`). The former `vercel` preset
// (dev-only, superseded 2026-08-14) is gone.
export default defineNitroConfig({
  preset: "node-server",
});
