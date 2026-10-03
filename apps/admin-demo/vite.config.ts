/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The demo is published at /lab/admin/ inside the portfolio's dist/, after `astro build` (which
// empties dist/ first). Asset URLs are RELATIVE (`base: "./"`), so the folder works wherever it is
// mounted: the portfolio, a local static server, or a copy of the folder on its own.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: "../../dist/lab/admin",
    emptyOutDir: true,
    target: "es2021",
    // No `data:` inlining: every asset is a same-origin file, so the request list in the QA run
    // is the whole truth about what the page loads.
    assetsInlineLimit: 0,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
