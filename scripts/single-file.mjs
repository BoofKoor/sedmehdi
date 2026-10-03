// Builds one self-contained HTML file from dist/ for previews: every page becomes a hash route (#/about/),
// and the CSS, fonts, favicon and résumé are inlined, so the file opens offline with no network request.
// Run after `astro build`:  node scripts/single-file.mjs   (or: npm run single-file)
// Output: preview/sed-mehdi-preview.html
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const outFile = join(root, 'preview', 'sed-mehdi-preview.html');

const MIME = { '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const dataUri = (webPath) => {
  const ext = webPath.slice(webPath.lastIndexOf('.'));
  if (!MIME[ext]) throw new Error(`single-file: no MIME type for ${webPath}`);
  return `data:${MIME[ext]};base64,${readFileSync(join(dist, webPath.replace(/^\//, ''))).toString('base64')}`;
};
const must = (match, what, file) => { if (!match) throw new Error(`single-file: ${what} not found in ${file}`); return match; };
const attr = (s) => s.replace(/"/g, '&quot;');
const inlineScripts = (html) => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);

// 1. every page: route, title, description and the contents of <main>
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const pages = walk(dist).filter((p) => p.endsWith('.html')).map((abs) => {
  const rel = relative(dist, abs).split(sep).join('/');
  const html = readFileSync(abs, 'utf8');
  return {
    route: rel === '404.html' ? '404' : '/' + rel.replace(/index\.html$/, ''),
    html,
    title: must(html.match(/<title>([\s\S]*?)<\/title>/), '<title>', rel)[1],
    description: (html.match(/<meta name="description" content="([^"]*)"/) || [null, ''])[1],
    main: must(html.match(/<main id="main">([\s\S]*?)<\/main>/), '<main id="main">', rel)[1],
  };
});
const routes = new Set(pages.map((p) => p.route));
const home = must(pages.find((p) => p.route === '/'), 'the home page', 'dist/');
const head = must(home.html.match(/<head>([\s\S]*?)<\/head>/), '<head>', 'index.html')[1];
const body = must(home.html.match(/<body>([\s\S]*?)<\/body>/), '<body>', 'index.html')[1];

// 2. internal links become hash routes; the résumé PDF is inlined; everything else stays as it is
const relink = (html) => html.replace(/src="(\/[^"#]*\.(?:webp|png|jpe?g|svg))"/gi, (whole, path) => `src="${dataUri(path)}"`).replace(/href="(\/[^"#]*)"/g, (whole, path) => {
  if (routes.has(path)) return `href="#${path}"`;
  if (routes.has(path + '/')) return `href="#${path}/"`;
  if (path.endsWith('.pdf')) return `href="${dataUri(path)}"`;
  return whole;
});

// 3. CSS with fonts and other url() assets inlined
const css = [
  ...[...head.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => readFileSync(join(dist, m[1].replace(/^\//, '')), 'utf8')),
  ...[...head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]),
].join('\n').replace(/url\((["']?)(\/[^)"']+)\1\)/g, (_, q, path) => `url("${dataUri(path)}")`);

must(body.match(/<main id="main">[\s\S]*?<\/main>/), '<main id="main">', 'index.html');
// the home page's body is the shell (skip link, background, bar, footer, scripts); only <main> changes per route
const shell = body.replace(/<main id="main">[\s\S]*?<\/main>/, () => `<main id="main" tabindex="-1">${home.main}</main>`);
const themeColor = (head.match(/<meta name="theme-color"[^>]*>/) || [''])[0];
const templates = pages.map((p) =>
  `<template data-route="${attr(p.route)}" data-title="${attr(p.title)}" data-description="${attr(p.description)}">${relink(p.main)}</template>`).join('\n');

// 4. hash router: swaps <main>, keeps the title, description and aria-current in step, moves focus for screen readers
const router = `<script>
(function () {
  var main = document.getElementById('main'), desc = document.querySelector('meta[name="description"]');
  var pages = {}, first = true;
  document.querySelectorAll('template[data-route]').forEach(function (t) { pages[t.getAttribute('data-route')] = t; });
  function render() {
    var h = location.hash, path = h.indexOf('#/') === 0 ? h.slice(1) : '/';
    var t = pages[path] || pages['404'];
    main.replaceChildren(t.content.cloneNode(true));
    document.title = t.getAttribute('data-title');
    if (desc) desc.setAttribute('content', t.getAttribute('data-description'));
    // the shell's bar and tab bar are not re-rendered: keep their current page in step (the capsule moves by itself)
    document.querySelectorAll('.nav a, .tabbar a').forEach(function (a) {
      var r = a.getAttribute('href').slice(1), on = r === '/' ? path === '/' : path.indexOf(r) === 0;
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    // the back button exists only in case studies: add it to the shell's bar once, show it there
    var bar = document.querySelector('.bar'), top = bar && bar.querySelector('.top'), back = bar && bar.querySelector('.back-btn'), isCase = path.indexOf('/projects/') === 0 && path !== '/projects/';
    if (top && !back) { back = document.createElement('a'); back.className = 'back-btn target'; back.setAttribute('href', '#/projects/'); back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7"/></svg>Work'; top.insertBefore(back, top.firstChild); }
    if (back) back.hidden = !isCase;
    if (bar) bar.classList.toggle('has-back', isCase);
    if (!first) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
    document.documentElement.setAttribute('data-route', path);  // rendering can run inside a view transition (a frame later): tests wait for this
    first = false;
  }
  // page changes morph shared elements (card frame and title into the case study) where View Transitions exist
  window.addEventListener('hashchange', function () {
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(render); else render();
  });
  document.querySelector('.skip').addEventListener('click', function (e) { e.preventDefault(); main.focus(); });
  render();
})();
</script>`;

// 5. if a host's content policy refuses inlined fonts, load the same fonts from Google Fonts instead
const fontFallback = `<script>
(function () {
  if (!document.fonts || !document.fonts.load) return;
  function fallback() {
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,100..1000&family=DM+Mono:wght@400;500&display=swap';
    document.head.appendChild(l);
  }
  document.fonts.load('300 16px "DM Sans"').then(function (f) { if (!f.length) fallback(); }, fallback);
})();
</script>`;

const out = `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${home.title}</title>
<meta name="description" content="${attr(home.description)}">
${themeColor}
<link rel="icon" href="${dataUri('/favicon.svg')}" type="image/svg+xml">
${inlineScripts(head).join('\n')}
<style>${css}
main:focus { outline: none; }</style>
</head><body>
${relink(shell)}
${templates}
${router}
${fontFallback}
</body></html>
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, out);
console.log(`single-file: ${pages.length} pages, ${(Buffer.byteLength(out) / 1024).toFixed(0)} kB -> ${relative(root, outFile)}`);
