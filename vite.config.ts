import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

/* Copy pdfjs-dist's static assets (standard-14 fonts + cmaps + the worker) into
   public/ so the reader's PdfViewer can render PDFs. pdfjs-dist v4+ no longer
   bundles fonts/cmaps — they must be served. The worker must also be a PLAIN
   static file: loading it through Vite's transform pipeline injects /@vite/client
   (browser-window HMR code) into the worker context, which breaks pdf.js's
   module worker. Static files in public/ are served untransformed in dev AND build. */
function copyPdfjsAssets(): Plugin {
  return {
    name: "copy-pdfjs-assets",
    buildStart() {
      const srcDir = resolve(ROOT, "node_modules/pdfjs-dist");
      const destDir = resolve(ROOT, "public/pdfjs-assets");
      for (const sub of ["standard_fonts", "cmaps"]) {
        const from = resolve(srcDir, sub);
        const to = resolve(destDir, sub);
        if (existsSync(from)) {
          mkdirSync(to, { recursive: true });
          cpSync(from, to, { recursive: true });
        }
      }
      const workerFrom = resolve(srcDir, "build/pdf.worker.min.mjs");
      const workerTo = resolve(destDir, "pdf.worker.min.mjs");
      if (existsSync(workerFrom)) {
        mkdirSync(destDir, { recursive: true });
        cpSync(workerFrom, workerTo);
      }
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts
export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    // Production build target (AD-029): Hostinger Managed Node.js runs a plain
    // Node HTTP server — the `node-server` Nitro preset produces `.output/`
    // runnable with `node .output/server/index.mjs` (`npm start`). The former
    // `vercel` preset (dev-only, superseded 2026-08-14) is gone.
    nitro({ preset: "node-server" }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
    copyPdfjsAssets(),
  ],
  server: {
    port: 3001,
    strictPort: true,
    watch: {
      ignored: ["**/.vercel/**", "**/node_modules/**"],
    },
  },
});

// Suppress TanStack Router warnings for API route files (Nitro endpoints, not page routes)
// These files are in src/routes/api/ and don't export a Route.

