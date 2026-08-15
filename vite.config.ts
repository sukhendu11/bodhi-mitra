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
//
// @refinedev/react-table's ESM build imports "lodash/isEqual" WITHOUT an
// extension. lodash has no `exports` map, so Node's native ESM resolver
// rejects it (ERR_MODULE_NOT_FOUND — "Did you mean lodash/isEqual.js?").
// In dev, Nitro's vite env externalizes node_modules, so the .mjs loads
// natively and breaks SSR of /admin ("Error in renderToReadableStream").
// Production is unaffected (Nitro bundles with resolve.noExternal: true,
// where Rollup's resolver handles extensionless imports). Fix: alias the
// specifier to a project-local ESM shim (src/lib/vendor/lodash-isEqual.ts)
// AND force Vite's dev-SSR pipeline to process @refinedev/react-table
// (ssr.noExternal) — externalized modules load natively and bypass
// resolve.alias, so both halves are required. The shim re-exports the real
// CJS file via a bare, extensioned import that stays external in SSR, so
// Node loads it natively instead of Vite inlining the CJS `require` calls.
export default defineConfig({
  resolve: {
    alias: {
      "lodash/isEqual": resolve(ROOT, "src/lib/vendor/lodash-isEqual.ts"),
    },
  },
  ssr: {
    noExternal: ["@refinedev/react-table"],
  },
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    // Production build target (AD-029): Hostinger Managed Node.js runs a plain
    // Node HTTP server. Nitro IS TanStack Start's officially documented Node
    // deployment mechanism (docs/framework/react/guide/hosting — "Nitro is an
    // agnostic layer... the nitro/vite plugin natively integrates with Vite
    // Environments API as the underlying build tool for TanStack Start"; the
    // Node.js/Docker section directs Vite builds to the Nitro node-server
    // preset). The `node-server` preset emits `.output/server/index.mjs`,
    // runnable with `node .output/server/index.mjs` (`npm start`), binding to
    // NITRO_PORT ?? PORT (default 3000) and NITRO_HOST || HOST — matching
    // Hostinger's managed Node expectations. The former `vercel` preset
    // (dev-only, superseded 2026-08-14) is gone.
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

