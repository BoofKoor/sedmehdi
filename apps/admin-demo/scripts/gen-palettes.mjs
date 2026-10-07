// Writes src/theme/palettes.css from the business accents in src/profiles/brands.ts.
// Usage: npm run palettes -w admin-demo   (src/theme/palette.test.ts fails if the file is stale)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { toCss } from "./palette.mjs";

const out = fileURLToPath(new URL("../src/theme/palettes.css", import.meta.url));
writeFileSync(out, toCss());
console.log(`palettes: wrote ${out}`);
