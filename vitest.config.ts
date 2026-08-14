import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // @refinedev/react-table ships `import ... from "lodash/isEqual"`
      // (extensionless — Vite resolves it, vitest's node ESM doesn't).
      "lodash/isEqual": path.resolve(__dirname, "node_modules/lodash/isEqual.js"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,mjs}"],
    exclude: ["node_modules", "dist"],
    // @refinedev/react-table ships `import ... from "lodash/isEqual"`
    // (extensionless — Vite resolves it, native node ESM doesn't). Inlining
    // the package runs it through Vite's transform pipeline where the
    // resolve.alias above maps lodash/isEqual to the .js entry.
    server: {
      deps: {
        inline: ["@refinedev/react-table"],
      },
    },
  },
});
