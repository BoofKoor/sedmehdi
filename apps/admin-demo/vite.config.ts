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
    // Named chunks, so the report's size table reads as what it is: React, the icon set, the
    // generator with its five business profiles, and the app. The pages and dashboard tabs other
    // than the overview are split per route by their dynamic imports.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 3 },
            { name: "vendor", test: /node_modules[\\/]/, priority: 2 },
            { name: "data", test: /src[\\/](data|profiles)[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
