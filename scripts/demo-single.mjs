// Builds one self-contained HTML file from the admin demo's build (dist/lab/admin/), for an offline preview: the app's
// chunks bundled into one module by esbuild, and the CSS, fonts and favicon inlined as data URIs, so the file opens
// from disk with no request for anything beside it. A preview only: preview/ is not committed, and the published demo
// stays split into chunks that load as each page is opened.
// Run after the demo's build:  node scripts/demo-single.mjs   (or: npm run demo:single, which builds it first)
// Output: preview/spindle-admin-demo.html. Checked by scripts/qa/check_demo_single.py.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import config from '../astro.config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const demo = join(root, 'dist', 'lab', 'admin');
const outFile = join(root, 'preview', 'spindle-admin-demo.html');
// Links out of the demo name the portfolio's pages by path; offline there is no portfolio beside the file, so they
// go to the published site (as the site's own preview does with its links into /lab/).
const origin = new URL(config.site).origin;

const MIME = { '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const dataUri = (file) => {
  const ext = file.slice(file.lastIndexOf('.'));
  if (!MIME[ext]) throw new Error(`demo-single: no MIME type for ${file}`);
  return `data:${MIME[ext]};base64,${readFileSync(file).toString('base64')}`;
};
const must = (match, what) => { if (!match) throw new Error(`demo-single: ${what} not found in dist/lab/admin/index.html`); return match; };

const html = readFileSync(join(demo, 'index.html'), 'utf8');

// 1. The app: the entry chunk with everything it imports, the lazy pages included, as one ES module. Inline, its
// import.meta.url is the file's own address, which Vite's preload helper still resolves its chunk names against.
const entry = must(html.match(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/), 'the entry script')[1];
const bundled = await build({ entryPoints: [join(demo, entry)], bundle: true, format: 'esm', splitting: false, minify: true, target: 'es2021', write: false, logLevel: 'warning' });
let js = bundled.outputFiles[0].text;
if (/\bimport\s*\(/.test(js)) throw new Error('demo-single: a dynamic import was left out of the bundle');
// Inline, "</script" would end the element, and "<!--" puts the parser in a state where it may not.
if (js.includes('<!--')) throw new Error('demo-single: the bundle contains "<!--", which an inline script cannot carry');
js = js.replace(/<\/(script)/gi, '<\\/$1');
// The command palette's case-study command navigates by path, like the menu's links (see the click handler below).
js = js.replace(/location\.assign\((["'`])\/(?!\/)/g, `location.assign($1${origin}/`);

// 2. The styles: the app's stylesheet and the page's @font-face rules, with every font as a data URI.
const fontsInlined = (css) => css.replace(/url\((["']?)\.\/(fonts\/[^)"']+)\1\)/g, (_, q, path) => `url("${dataUri(join(demo, path))}")`);
const sheet = must(html.match(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/), 'the stylesheet')[1];
const css = fontsInlined(readFileSync(join(demo, sheet), 'utf8'));
if (/url\((?!["']?data:)/.test(css)) throw new Error('demo-single: the stylesheet names a file that was not inlined');

// 3. The guard, first in <head>, before the pre-paint script: on a lazy page Vite's preload helper adds
// <link rel="modulepreload"> for its chunks (all of them inside the bundle now), and the pre-paint script adds font
// preloads for Persian (inlined above). Each would be a request for a file that is not beside this one, so the guard
// keeps those links out of the document and fires their load event itself, which is what the helper waits on for a
// stylesheet; a preload error the helper reports anyway is cancelled rather than thrown. Written with String.raw so
// the pattern's backslashes reach the page as written.
const guard = String.raw`<script id="single-file-guard">
      (function () {
        var FILE = /\.(?:js|css|woff2)(?:[?#]|$)/i, KIND = /^(?:modulepreload|preload|stylesheet)$/i;
        function local(n) { return n instanceof HTMLLinkElement && KIND.test(n.rel) && FILE.test(n.getAttribute("href") || ""); }
        function answer(n) { setTimeout(function () { n.dispatchEvent(new Event("load")); }, 0); return n; }
        var append = Node.prototype.appendChild, insert = Node.prototype.insertBefore;
        Node.prototype.appendChild = function (n) { return local(n) ? answer(n) : append.call(this, n); };
        Node.prototype.insertBefore = function (n, ref) { return local(n) ? answer(n) : insert.call(this, n, ref); };
        addEventListener("vite:preloadError", function (e) { e.preventDefault(); });
        document.addEventListener("click", function (e) {
          var a = e.target.closest && e.target.closest('a[href^="/"]:not([href^="//"])');
          if (a) a.href = "${origin}" + a.getAttribute("href");
        }, true);
      })();
    </script>`;

// 4. The page: the guard first; the font preload, the stylesheet link, the chunk preloads and the entry script out;
// the favicon, the fonts and the styles inline; the bundle last, as the module the entry was.
let page = html
  .replace(/<head>/, () => `<head>\n    ${guard}`)
  .replace(/\s*<link rel="preload" href="\.\/fonts\/[^"]+" as="font"[^>]*>/g, '')
  .replace(/\s*<link rel="modulepreload" crossorigin href="[^"]+">/g, '')
  .replace(/\s*<link rel="stylesheet" crossorigin href="[^"]+">/, '')
  .replace(/\s*<script type="module" crossorigin src="[^"]+"><\/script>/, '')
  .replace(/<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml" \/>/, () => `<link rel="icon" href="${dataUri(join(root, 'public', 'favicon.svg'))}" type="image/svg+xml" />`)
  .replace(/<style>([\s\S]*?)<\/style>/, (_, faces) => `<style>${fontsInlined(faces)}</style>`)
  .replace(/<\/head>/, () => `    <style>${css}</style>\n  </head>`)
  .replace(/<\/body>/, () => `    <script type="module">${js}</script>\n  </body>`);
for (const [what, left] of [['a link to a file', /<link[^>]+href="\.\//], ['a script file', /<script[^>]+src=/], ['a font file', /url\(\.\/fonts\//]]) {
  if (left.test(page)) throw new Error(`demo-single: ${what} is still named in the page`);
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, page);
console.log(`demo-single: ${outFile.slice(root.length + 1)} (${(page.length / 1024).toFixed(0)} KB)`);
