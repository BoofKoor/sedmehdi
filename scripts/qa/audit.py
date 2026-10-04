"""Full display audit, WCAG 2.2 AA plus the site's own rules, measured on the rendered pages.

Site: 10 pages (the 404 too) x 8 widths (2560 to 320) x 2 themes. Demo (--demo): the admin demo at /lab/admin/, every
business x its 8 pages x both languages, at the same widths and themes.

Checks (each issue is printed as kind, page and what, with the widths and themes it was seen at):
  contrast      text 4.5:1 (3:1 large) on the colour really under it: translucent layers composited down, a gradient
                evaluated at the text (a radial one at the point, a linear one at its worst stop, in premultiplied
                alpha as browsers do), an SVG shape painted under SVG text, and aria-hidden text that is still on screen
                (seen is seen). Chrome reports a gradient card's background-color as transparent, which is why the
                stops are read instead
  ui-contrast   3:1 for status lights and for the icon of an icon-only control, against the ground right under them
  clipped       text cut by its own box or an ellipsis (`text-overflow`), outside a scroller
  offscreen     text running off the viewport, outside a scroller
  tiny          type under 12px (site only: the demo follows the dense panel's type scale, and WCAG 2.2 AA sets no
                minimum size)
  overlap       text over text (a bar over content that scrolls under it is occlusion, not overlap)
  hit-overlap   two links or controls whose hit areas overlap
  target        a control under 44x44 on a phone
  img-*         a broken image, an image without alt, an image out of its frame (a logo tile's padding box)
  focus-*       every Tab stop: a visible ring, and on screen at all 9 points of a 3x3 grid by elementFromPoint, so a
                fixed or sticky bar over part of it is caught (focus-partly-hidden) as well as over all of it
  unreachable   at the end of the page a control is still under a fixed bar, so no scroll can bring it out
  cls           layout shift on load of 0.02 or more
  motion        an animation still running under Reduce Motion
  js-error, other-host, dead-link, dup-id, heading-skip, h1-count, page-overflow
Content that rises in on scroll (.rv on phones) is scrolled through first, or it would be measured invisible.

Known not-bugs, exempted in code: the coral dot of the logotype (`.wm-dot`, `.demo-wm-dot`; WCAG 1.4.3 exempts logos).

Usage: python3 scripts/qa/serve.py dist 4321 &   (a static server that answers a missing path with 404.html, as nginx does)
       python3 scripts/qa/audit.py http://localhost:4321 [--demo] [--widths 1440,390] [--themes dark] [--json out.json]
       python3 scripts/qa/audit.py --merge a.json b.json ...        prints one summary of several chunks
One width and theme of the site, or of the demo, is one chunk and runs in a minute or two.
"""
import asyncio, json, sys
from collections import defaultdict
from urllib.parse import urlparse

from playwright.async_api import async_playwright


def arg(name, default=None):
    return next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == name and i + 1 < len(sys.argv)), default)


POS = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and sys.argv[i - 1] not in ('--widths', '--themes', '--json', '--profiles', '--langs')]
B = (POS[0] if POS and not POS[0].endswith('.json') else 'http://localhost:4321').rstrip('/')
HOST = urlparse(B).netloc
DEMO = '--demo' in sys.argv
PAGES = ['/', '/projects/', '/projects/gozarx/', '/projects/spindle/', '/projects/tooti/', '/projects/jozveyar/', '/about/', '/resume/', '/contact/', '/does-not-exist/']
# /lab/admin/ is a real route (the admin demo, built into dist/lab/admin/ by `npm run build`), linked from the Spindle
# case study. The site checks do not walk it (they assume the portfolio shell); --demo audits it.
ROUTES = set(PAGES[:-1]) | {'/resume.pdf', '/lab/admin/'}
WIDTHS = [int(w) for w in arg('--widths', '2560,1440,1024,768,721,720,390,320').split(',')]
THEMES = arg('--themes', 'dark,light').split(',')
PROFILES = arg('--profiles', 'hosting,saas,ecommerce,education,print').split(',')
LANGS = arg('--langs', 'en,fa').split(',')

JS = r"""(opts) => {
  const out = [], W = innerWidth, H = innerHeight, phone = W <= 720, demo = opts.demo;
  const css = e => getComputedStyle(e);
  const tag = e => { const c = (typeof e.className === 'string' ? e.className : (e.className && e.className.baseVal) || '').trim().split(/\s+/).filter(Boolean)[0];
    return (c ? '.' + c : e.tagName.toLowerCase()) + ' "' + (e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '"'; };
  const add = (kind, what) => out.push([kind, what]);
  // colours: rgb()/rgba()/color(srgb ...)/#rrggbb to [r, g, b, a] in 0-255
  const parse = s => { if (!s) return null; const hx = s.trim().match(/^#([0-9a-f]{6})$/i);
    if (hx) return [0, 2, 4].map(i => parseInt(hx[1].slice(i, i + 2), 16)).concat(1);
    const m = s.match(/-?[\d.]+(e-?\d+)?/g); if (!m) return null; const a = m.map(Number);
    return s.startsWith('color(') ? [a[0] * 255, a[1] * 255, a[2] * 255, a.length > 3 ? a[3] : 1] : [a[0], a[1], a[2], a.length > 3 ? a[3] : 1]; };
  const lum = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const over = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
  const opacityOf = e => { let o = 1; for (let n = e; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(css(n).opacity); return o; };
  // visually hidden on purpose: a clip to nothing, clip-path inset(50%), or a 1px box that clips (sr-only, .vh)
  const vh = e => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const s = css(n), r = n.getBoundingClientRect();
      if (s.clip && s.clip.startsWith('rect(0')) return true; if (/inset\(50%\)/.test(s.clipPath)) return true;
      if (r.width <= 1 && r.height <= 1 && s.overflow !== 'visible') return true; } return false; };
  const shown = e => { const r = e.getBoundingClientRect(), s = css(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && opacityOf(e) > .1 && !e.closest('[inert]'); };
  // a bar that content scrolls under: anything fixed, or a sticky element shaped like a bar (a sticky card is not one)
  const bar = e => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const q = css(n).position; if (q === 'fixed') return n;
      if (q === 'sticky') { const r = n.getBoundingClientRect(); if (r.height < H * .3 && r.width > W * .6) return n; } } return null; };
  // the colour under a point of an element: layers composited down to the first opaque one. A radial gradient with a size
  // and a centre is evaluated at the point; any other gradient counts at every stop (the worst one decides).
  const stopsOf = img => [...img.matchAll(/(rgba?|color)\([^)]*\)/g)].map(m => parse(m[0])).filter(Boolean);
  function radialAt(img, box, px, py) {
    const m = img.match(/radial-gradient\(\s*([\d.]+)%\s+([\d.]+)%\s+at\s+([\d.]+)%\s+([\d.]+)%\s*,\s*(.*)\)\s*$/); if (!m) return null;
    const rx = box.width * m[1] / 100, ry = box.height * m[2] / 100, cx = box.left + box.width * m[3] / 100, cy = box.top + box.height * m[4] / 100;
    const parts = [...m[5].matchAll(/((?:rgba?|color)\([^)]*\))\s*([\d.]+%)?/g)].map(p => [parse(p[1]), p[2] ? parseFloat(p[2]) / 100 : null]);
    if (parts.length < 2) return null; parts.forEach((p, i) => { if (p[1] == null) p[1] = i / (parts.length - 1); });
    const d = Math.hypot((px - cx) / rx, (py - cy) / ry);
    if (d <= parts[0][1]) return parts[0][0]; if (d >= parts[parts.length - 1][1]) return parts[parts.length - 1][0];
    for (let i = 1; i < parts.length; i++) if (d <= parts[i][1]) { const [a, pa] = parts[i - 1], [b, pb] = parts[i], t = (d - pa) / (pb - pa || 1);
      const al = a[3] + (b[3] - a[3]) * t; if (al <= 0) return [0, 0, 0, 0];
      return [0, 1, 2].map(k => (a[k] * a[3] + (b[k] * b[3] - a[k] * a[3]) * t) / al).concat(al); }  // premultiplied, as CSS interpolates
    return null; }
  function grounds(el, px, py) {
    const layers = []; const root = parse(css(document.body).backgroundColor) || [255, 255, 255, 1];
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const forced = n.getAttribute && n.getAttribute('data-contrast-bg');  // a pill an SVG draws behind its label
      if (forced) return [layers.reduceRight((acc, l) => over(l, acc), parse(forced))];
      const s = css(n);
      if (s.backgroundImage && s.backgroundImage !== 'none' && !n.matches('.bg, html, body')) {
        if (/url\(/.test(s.backgroundImage)) return [{ image: tag(n) }];
        const base = parse(s.backgroundColor); const under = base && base[3] > .99 ? base : null;
        // one entry per layer: split at the top-level commas, and drop `none` (Chrome lists it after the gradient)
        const pts = []; let depth = 0, cur = '';
        for (const ch of s.backgroundImage) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { pts.push(cur.trim()); cur = ''; } else cur += ch; }
        pts.push(cur.trim()); for (let k = pts.length - 1; k >= 0; k--) if (pts[k] === 'none') pts.splice(k, 1);
        let cols = [];
        for (const g of pts) { const at = /radial/.test(g) ? radialAt(g, n.getBoundingClientRect(), px, py) : null; cols = cols.concat(at ? [at] : stopsOf(g)); }
        if (under) return cols.map(c => layers.reduceRight((acc, l) => over(l, acc), over(c, under)));
        layers.push(...cols.slice(0, 1));  // a translucent gradient over more page: keep going with its first stop as a layer
        continue;
      }
      const c = parse(s.backgroundColor);
      if (c && c[3] > 0) { if (c[3] >= .99) return [layers.reduceRight((acc, l) => over(l, acc), c)]; layers.push(c); }
    }
    return [layers.reduceRight((acc, l) => over(l, acc), root)];
  }
  // an SVG shape painted before an SVG text element and under the point is the text's real ground (a label on a pill)
  function shapeUnder(t, x, y) { const svg = t.closest('svg'); if (!svg) return null; let hit = null;
    for (const sh of svg.querySelectorAll('path, rect, circle, ellipse, polygon')) { if (sh.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_PRECEDING) break;
      const s = css(sh), f = parse(s.fill); if (!f || f[3] === 0 || s.fill === 'none' || !shown(sh)) continue; const r = sh.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && insideClip(sh, x, y)) { f[3] *= parseFloat(s.fillOpacity || 1) * opacityOf(sh); hit = hit ? over(f, hit) : f; } }
    return hit; }
  // a shape inside a clip-path only paints inside the clip: test the point against the clip's own geometry
  function insideClip(sh, x, y) { const g = sh.closest('[clip-path]'); if (!g) return true; const id = (g.getAttribute('clip-path').match(/#([^)"']+)/) || [])[1];
    const cp = id && document.getElementById(id), p = cp && cp.querySelector('path, rect, circle, ellipse, polygon'); if (!p || !p.isPointInFill) return true;
    const m = p.getScreenCTM(); if (!m) return true; const q = new DOMPoint(x, y).matrixTransform(m.inverse()); return p.isPointInFill(q); }
  const logo = e => e.closest('.wm-dot, .demo-wm-dot');  // WCAG 1.4.3: text that is part of a logo has no contrast requirement

  // 1. text: contrast, clipped, off-screen, tiny, text over text
  const texts = new Set(); const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) if (t.textContent.trim()) texts.add(t.parentElement);
  const boxes = [];
  for (const e of texts) {
    if (!e || !shown(e) || vh(e) || e.closest('script, style, noscript, option, title, .bg, .skip, .demo-skip')) continue;
    const r = e.getBoundingClientRect(), s = css(e), isSvg = e instanceof SVGElement;
    const fg0 = parse(isSvg ? s.fill : s.color);
    if (!fg0 || fg0[3] === 0) continue;  // transparent ink paints nothing (a counter's ghost that reserves its width)
    const scale = e.offsetHeight ? r.height / e.offsetHeight : 1;  // a scaled card (the stack's) scales its type too
    const fs = parseFloat(s.fontSize) * (isFinite(scale) && scale > 0 ? scale : 1), bold = parseInt(s.fontWeight) >= 700;
    if (!logo(e)) {
      {
        const fg = fg0.slice(); fg[3] *= opacityOf(e);
        const need = fs >= 24 || (fs >= 18.66 && bold) ? 3 : 4.5;
        const pts = [[Math.min(r.left + 4, W - 1), r.top + Math.min(r.height / 2, 8)], [Math.min(r.left + r.width / 2, W - 1), r.top + r.height / 2]];
        const gs = pts.flatMap(([x, y]) => { const g = grounds(e, x, y); const sh = isSvg ? shapeUnder(e, x, y) : null; return sh && !(g[0] && g[0].image) ? g.map(b => over(sh, b)) : g; });
        if (!(gs[0] && gs[0].image)) { const worst = Math.min(...gs.map(b => cr(over(fg, b), b))); if (worst < need - .005) add('contrast', tag(e) + ' ' + worst.toFixed(2)); }
      }
    }
    if (!demo && fs < 12 && !e.closest('[aria-hidden="true"], svg')) add('tiny', tag(e) + ' ' + fs.toFixed(1) + 'px');
    // Text a scroller holds is reachable by scrolling, so only its own box can cut it there: an ellipsis is a cut
    // wherever it sits. (Skipping every text inside a scroller hid the console's whole content well from the check at
    // 721px and up, where the well scrolls, and with it a top card's leader ending in "...".)
    const selfScroll = /(auto|scroll)/.test(s.overflowX + s.overflowY);
    let scroller = selfScroll; for (let n = e.parentElement; !scroller && n && n !== document.body; n = n.parentElement) { const o = css(n); if (/(auto|scroll)/.test(o.overflowX + o.overflowY)) scroller = true; }
    if (!selfScroll && (s.overflowX !== 'visible' || s.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1) add('clipped', tag(e) + ' ' + e.scrollWidth + '>' + e.clientWidth);
    if (!scroller) {
      // clipped by an ancestor that hides overflow (inside a scroller it is reachable by scrolling)
      for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const ns = css(n);
        if (/(hidden|clip)/.test(ns.overflowX + ns.overflowY)) { const a = n.getBoundingClientRect();
          if (!vh(n) && (r.right > a.right + 1 || r.left < a.left - 1 || r.bottom > a.bottom + 1 || r.top < a.top - 1)) add('clipped', tag(e) + ' outside ' + tag(n));
          break; } }
      if (r.right > W + 1 || r.left < -1) add('offscreen', tag(e));
    }
    if (!e.closest('.window, .phone, svg')) boxes.push([e, r, bar(e)]);
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a, ra, pa] = boxes[i], [c, rc, pc] = boxes[j]; if (a.contains(c) || c.contains(a) || pa !== pc) continue;
    const ox = Math.min(ra.right, rc.right) - Math.max(ra.left, rc.left), oy = Math.min(ra.bottom, rc.bottom) - Math.max(ra.top, rc.top);
    if (ox > 2 && oy > 2) add('overlap', tag(a) + ' x ' + tag(c)); }

  // 2. controls: 44px on phones, hit areas that overlap, 3:1 for status lights and icon-only controls
  const ctrls = [...document.querySelectorAll('a[href], button, [role=button], [role=switch], [role=tab], [role=radio], [role=option], [role=menuitem], [role=menuitemradio], input:not([type=hidden]), select, textarea, summary')]
    .filter(e => shown(e) && !vh(e) && !e.matches('.skip, .demo-skip'));
  if (phone) for (const e of ctrls) { if (e.closest('.prose p, .prose li')) continue; const r = e.getBoundingClientRect();
    if (Math.round(r.width) < 44 || Math.round(r.height) < 44) add('target', tag(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  const hits = ctrls.map(e => [e, e.getBoundingClientRect(), bar(e)]);
  for (let i = 0; i < hits.length; i++) for (let j = i + 1; j < hits.length; j++) {
    const [a, ra, pa] = hits[i], [c, rc, pc] = hits[j]; if (a.contains(c) || c.contains(a) || pa !== pc) continue;
    const ox = Math.min(ra.right, rc.right) - Math.max(ra.left, rc.left), oy = Math.min(ra.bottom, rc.bottom) - Math.max(ra.top, rc.top);
    if (ox > 1 && oy > 1) add('hit-overlap', tag(a) + ' x ' + tag(c)); }
  for (const e of document.querySelectorAll('.led, .st-lab-dot')) { if (!shown(e)) continue;
    const fill = parse(css(e).backgroundColor); if (!fill || fill[3] === 0) continue; const r = e.getBoundingClientRect();
    const b = grounds(e.parentElement, r.left + r.width / 2, r.top + r.height / 2); if (b[0] && b[0].image) continue;
    const worst = Math.min(...b.map(g => cr(over(fill, g), g))); if (worst < 3 - .005) add('ui-contrast', tag(e) + ' light ' + worst.toFixed(2)); }
  for (const e of ctrls) { if ((e.innerText || '').trim()) continue; const icon = e.querySelector('svg'); if (!icon || !shown(icon)) continue;
    const r = icon.getBoundingClientRect(); const b = grounds(icon.parentElement, r.left + r.width / 2, r.top + r.height / 2); if (b[0] && b[0].image) continue;
    const shapes = [...icon.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse')].filter(shown);
    const cols = (shapes.length ? shapes : [icon]).map(x => { const s = css(x); const st = parse(s.stroke !== 'none' ? s.stroke : s.fill);
      const c = st && st[3] > 0 ? st : parse(css(e).color); if (c) c[3] *= opacityOf(x); return c; }).filter(Boolean);
    if (!cols.length) continue;
    const best = Math.max(...cols.map(col => Math.min(...b.map(g => cr(over(col, g), g)))));  // a shape in the ground colour is a mask
    if (best < 3 - .005) add('ui-contrast', tag(e) + ' icon ' + best.toFixed(2)); }

  // 3. images: broken, alt, inside their frame (a logo tile's frame is its padding box)
  for (const i of document.querySelectorAll('img')) { if (!shown(i)) continue;
    if (!(i.complete && i.naturalWidth)) add('img-broken', (i.getAttribute('src') || '').slice(0, 40));
    if (!i.hasAttribute('alt')) add('img-alt', (i.getAttribute('src') || '').slice(0, 40));
    const p = i.parentElement, ps = css(p), a = p.getBoundingClientRect(), r = i.getBoundingClientRect();
    const pad = ['Left', 'Top', 'Right', 'Bottom'].map(k => parseFloat(ps['padding' + k]) || 0), tile = p.matches('.pj-logo');
    const box = tile ? [a.left + pad[0], a.top + pad[1], a.right - pad[2], a.bottom - pad[3]] : [a.left, a.top, a.right, a.bottom];
    if (!tile && ps.overflow !== 'visible') continue;
    if (r.left < box[0] - .5 || r.top < box[1] - .5 || r.right > box[2] + .5 || r.bottom > box[3] + .5)
      add('img-overflow', tag(p) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' in ' + Math.round(box[2] - box[0]) + 'x' + Math.round(box[3] - box[1])); }

  // 4. ids, headings, links
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id); ids.filter((v, i) => ids.indexOf(v) !== i).forEach(v => add('dup-id', v));
  let last = 0; [...document.querySelectorAll('h1, h2, h3, h4')].filter(shown).forEach(h => { const l = +h.tagName[1]; if (last && l > last + 1) add('heading-skip', h.tagName + ' "' + h.textContent.trim().slice(0, 20) + '"'); last = l; });
  if (document.querySelectorAll('h1').length !== 1) add('h1-count', String(document.querySelectorAll('h1').length));
  const links = [...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href').split('#')[0].split('?')[0]);  // a query names a state of a page
  return { out, links, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, cls: window.__cls || 0 };
}"""

# Tab stop: the ring, and how much of the element shows at 9 points; what covers the rest (a fixed or sticky bar)
FOCUS = r"""() => { const a = document.activeElement; if (!a || a === document.body || a === document.documentElement) return null;
  const s = getComputedStyle(a), r = a.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const bar = e => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const q = getComputedStyle(n).position; if (q === 'fixed') return n;
      if (q === 'sticky') { const b = n.getBoundingClientRect(); if (b.height < H * .3 && b.width > W * .6) return n; } } return null; };
  const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 1) || (s.boxShadow && s.boxShadow !== 'none');
  let seen = 0, total = 0, under = null;
  for (const fx of [.15, .5, .85]) for (const fy of [.2, .5, .8]) { const x = r.left + r.width * fx, y = r.top + r.height * fy; total++;
    if (x < 0 || y < 0 || x >= W || y >= H) continue; const t = document.elementFromPoint(x, y);
    if (t && (t === a || a.contains(t) || t.contains(a))) seen++; else if (t && bar(t) && !bar(t).contains(a)) under = bar(t); }
  const name = (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().replace(/\s+/g, ' ').slice(0, 26);
  const cls = under ? ((typeof under.className === 'string' && under.className.split(' ')[0]) || under.tagName.toLowerCase()) : null;
  return { key: name + '|' + [r.left, r.top, r.width, r.height].map(Math.round).join(','), name, ring, seen, total, under: cls, off: r.bottom < 0 || r.top > H || r.right < 0 || r.left > W }; }"""

# After a Tab, wait until whatever scrolls the focused element into view has landed: the element's scrolling ancestors
# and the page stay put for three frames (at most a second). Measured the instant the key was pressed, a carousel that
# brings its card in with a smooth scroll read as focus hidden, while one that never scrolled (B2) still does after.
SETTLE = r"""async () => { const a = document.activeElement; if (!a) return; const frame = () => new Promise(r => requestAnimationFrame(r));
  const boxes = [document.scrollingElement]; for (let n = a.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n); if (/(auto|scroll)/.test(o.overflowX + o.overflowY)) boxes.push(n); }
  const pos = () => boxes.map(b => b.scrollLeft + ',' + b.scrollTop).join('|');
  await frame(); await frame(); let last = pos(), still = 0;
  for (let i = 0; i < 60 && still < 3; i++) { await frame(); const p = pos(); still = p === last ? still + 1 : 0; last = p; } }"""

# at the end of the page (every scroller at its end), a control whose centre is still under a fixed bar cannot be reached
REACH = r"""async () => { const W = innerWidth, H = innerHeight;
  const bar = e => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const q = getComputedStyle(n).position; if (q === 'fixed') return n;
      if (q === 'sticky') { const b = n.getBoundingClientRect(); if (b.height < H * .3 && b.width > W * .6) return n; } } return null; };
  const ends = [document.scrollingElement, ...[...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(e).overflowY))];
  for (const s of ends) s.scrollTop = s.scrollHeight; await new Promise(r => setTimeout(r, 250));
  const out = [];
  for (const e of document.querySelectorAll('a[href], button, [role=button], [role=tab], input, select, textarea, summary')) {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e); if (!r.width || !r.height || s.visibility === 'hidden' || e.closest('[inert], [aria-hidden="true"]') || bar(e)) continue;
    if (r.bottom < H * .5 || r.top > H) continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || x >= W || y >= H) continue;
    const t = document.elementFromPoint(x, y); if (!t || t === e || e.contains(t) || t.contains(e)) continue;
    if (bar(t)) out.push((e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 26)); }
  for (const s of ends) s.scrollTop = 0; return out; }"""

REVEAL = r"""async () => { const step = innerHeight * .7;
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
  window.scrollTo(0, document.documentElement.scrollHeight); await new Promise(r => setTimeout(r, 100));
  document.querySelectorAll('.carousel').forEach(g => { g.scrollLeft = g.scrollWidth; g.scrollLeft = 0; });
  await Promise.all([...document.images].map(i => i.decode().catch(() => null))); }"""
TOP = "() => { window.scrollTo(0, 0); for (const e of document.querySelectorAll('*')) if (e.scrollTop) e.scrollTop = 0; }"
CLS_INIT = "window.__cls = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });"
MOTION = r"""() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && (a.effect.getTiming().iterations === Infinity || a.effect.getComputedTiming().endTime > 1000))
  .map(a => { const t = a.effect.target; return (a.animationName || a.transitionProperty || 'script') + ' on ' + (t ? ((typeof t.className === 'string' && t.className.split(' ')[0]) || t.tagName.toLowerCase()) : '?'); })"""
SETTLED = "() => !document.querySelector('[data-state=\"loading\"]') && !!document.querySelector('[data-page]')"


def context_opts(w, scheme, reduce=False):
    phone = w <= 720
    return dict(viewport={'width': w, 'height': 900 if w > 720 else 844}, color_scheme=scheme, is_mobile=phone, has_touch=phone,
                reduced_motion='reduce' if reduce else 'no-preference')


async def tab_walk(pg, record, limit):
    await pg.evaluate(TOP); await pg.evaluate("document.activeElement && document.activeElement.blur && document.activeElement.blur()")
    seen = set()
    for _ in range(limit):
        await pg.keyboard.press('Tab'); await pg.evaluate(SETTLE); f = await pg.evaluate(FOCUS)
        if not f: continue
        if f['key'] in seen: break
        seen.add(f['key'])
        if not f['ring']: record('focus-no-ring', f['name'])
        if f['off'] or f['seen'] == 0: record('focus-hidden', f['name'] + (f' under {f["under"]}' if f['under'] else ''))
        elif f['seen'] < f['total'] and f['under']: record('focus-partly-hidden', f'{f["name"]} {f["seen"]}/{f["total"]} under {f["under"]}')


async def measure(pg, record, demo):
    await pg.evaluate(REVEAL); await pg.wait_for_timeout(650); await pg.evaluate(TOP); await pg.wait_for_timeout(150)
    r = await pg.evaluate(JS, {'demo': demo})
    for kind, what in r['out']: record(kind, what)
    if r['overflow'] > 0: record('page-overflow', f"{r['overflow']}px")
    for l in set(r['links']):
        if l not in ROUTES: record('dead-link', l)
    return r


async def site_chunk(b, w, scheme, issues):
    key = f'{scheme} {w}'
    ctx = await b.new_context(**context_opts(w, scheme)); await ctx.add_init_script(CLS_INIT)
    pg = await ctx.new_page(); errs, hosts = [], set()
    pg.on('pageerror', lambda e: errs.append(str(e)[:80])); pg.on('console', lambda m: errs.append(m.text[:80]) if m.type == 'error' else None)
    pg.on('request', lambda q: hosts.add(urlparse(q.url).netloc) if q.url.startswith('http') and urlparse(q.url).netloc != HOST else None)
    for path in PAGES:
        record = lambda kind, what, path=path: issues[(kind, path, what)].add(key)
        resp = await pg.goto(B + path, wait_until='networkidle'); await pg.wait_for_timeout(500)
        if path != '/does-not-exist/' and (not resp or resp.status != 200): record('http', str(resp.status if resp else 'none'))
        cls = await pg.evaluate('window.__cls')
        if cls >= 0.02: record('cls', f'{cls:.3f}')
        await measure(pg, record, False)
        await tab_walk(pg, record, 70)
        for u in await pg.evaluate(REACH): record('unreachable', u)
        for e in errs:
            if not (path == '/does-not-exist/' and '404' in e): record('js-error', e)  # the 404 page's own status is not an error
        errs.clear()
    for h in hosts: issues[('other-host', '*', h)].add(key)
    await ctx.close()
    ctx = await b.new_context(**context_opts(w, scheme, reduce=True)); pg = await ctx.new_page()
    for path in ('/', '/projects/', '/projects/gozarx/', '/projects/spindle/'):
        await pg.goto(B + path, wait_until='networkidle'); await pg.wait_for_timeout(1200)
        for m in await pg.evaluate(MOTION): issues[('motion', path, m)].add(key + ' reduce')
    await ctx.close()


async def demo_chunk(b, w, scheme, issues):
    key = f'{scheme} {w}'
    for lang in LANGS:
        ctx = await b.new_context(**context_opts(w, scheme)); await ctx.add_init_script(CLS_INIT)
        pg = await ctx.new_page(); errs, hosts = [], set()
        pg.on('pageerror', lambda e: errs.append(str(e)[:80])); pg.on('console', lambda m: errs.append(m.text[:80]) if m.type == 'error' else None)
        pg.on('request', lambda q: hosts.add(urlparse(q.url).netloc) if q.url.startswith('http') and urlparse(q.url).netloc != HOST else None)
        for prof in PROFILES:
            await pg.goto(f'{B}/lab/admin/?profile={prof}&lang={lang}', wait_until='networkidle'); await pg.wait_for_function(SETTLED); await pg.wait_for_timeout(700)
            cls = await pg.evaluate('window.__cls')
            if cls >= 0.02: issues[('cls', f'{prof} {lang}', f'{cls:.3f}')].add(key)
            ents = await pg.evaluate("['records-0', 'records-1'].map(id => (document.querySelector(`[data-nav=\"${id}\"]`) || {}).getAttribute?.('href')).filter(Boolean)")
            for h in ['#/', '#/growth', '#/retention', '#/behaviour', *ents, '#/health']:
                where = f'{prof} {lang} {h}'
                record = lambda kind, what, where=where: issues[(kind, where, what)].add(key)
                await pg.evaluate(f"location.hash = {json.dumps(h)}"); await pg.wait_for_function(SETTLED); await pg.wait_for_timeout(450)
                await measure(pg, record, True)
                if h in ('#/', '#/health') or h in ents[:1]: await tab_walk(pg, record, 50)
                for u in await pg.evaluate(REACH): record('unreachable', u)
            for e in errs: issues[('js-error', f'{prof} {lang}', e)].add(key)
            errs.clear()
        for h in hosts: issues[('other-host', '*', h)].add(key)
        await ctx.close()
    ctx = await b.new_context(**context_opts(w, scheme, reduce=True)); pg = await ctx.new_page()
    for prof in PROFILES:
        for h in ('#/', '#/health'):
            await pg.goto(f'{B}/lab/admin/?profile={prof}&lang=en{h}', wait_until='networkidle'); await pg.wait_for_function(SETTLED); await pg.wait_for_timeout(1200)
            for m in await pg.evaluate(MOTION): issues[('motion', f'{prof} {h}', m)].add(key + ' reduce')
    await ctx.close()


def summary(issues):
    by_kind = defaultdict(list)
    for (kind, where, what), keys in issues.items(): by_kind[kind].append((where, what, sorted(keys)))
    print(f'{sum(len(v) for v in by_kind.values())} distinct issues')
    for kind in sorted(by_kind):
        print(f'## {kind}: {len(by_kind[kind])}')
        for where, what, keys in sorted(by_kind[kind])[:12]: print(f'   {where:30} {what[:64]:64} @ {", ".join(keys[:4])}{" …" if len(keys) > 4 else ""}')
        if len(by_kind[kind]) > 12: print(f'   … and {len(by_kind[kind]) - 12} more')


async def main():
    issues = defaultdict(set)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for scheme in THEMES:
            for w in WIDTHS:
                await (demo_chunk if DEMO else site_chunk)(b, w, scheme, issues)
        await b.close()
    out = arg('--json')
    if out:
        with open(out, 'w', encoding='utf-8') as f: json.dump([[k[0], k[1], k[2], sorted(v)] for k, v in issues.items()], f, ensure_ascii=False)
    summary(issues)


if '--merge' in sys.argv:
    merged = defaultdict(set)
    for path in sys.argv[sys.argv.index('--merge') + 1:]:
        with open(path, encoding='utf-8') as f:
            for kind, where, what, keys in json.load(f): merged[(kind, where, what)].update(keys)
    summary(merged)
else:
    asyncio.run(main())
