"""Full audit: 9 pages x 7 widths x 2 themes. Overflow, clipped/off-screen text, contrast on the real background, tiny type,
text over text, images, duplicate ids, heading skips, dead links, touch targets, layout shift, JS errors, and keyboard focus
(a visible ring, not hidden under the fixed bars by stacking order). Usage: python3 scripts/qa/audit.py http://localhost:4321
Known not-bugs: the coral dot of the logotype (logo exemption, WCAG 1.4.3) and a dev server without 404.html."""
import asyncio, re, json
from collections import defaultdict
from playwright.async_api import async_playwright
import sys
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4321'
PAGES = ['/', '/projects/', '/projects/gozarx/', '/projects/tooti/', '/projects/jozveyar/', '/about/', '/resume/', '/contact/', '/does-not-exist/']
# /lab/admin/ is a real route (the admin demo, built into dist/lab/admin/ by `npm run build`), linked from
# the GozarX case study and its Work card. It is not in PAGES: every check here assumes the portfolio
# shell (.bar, the tab bar), which the demo does not have; scripts/qa/check_admin_demo.py audits it.
ROUTES = set(PAGES[:-1]) | {'/resume.pdf', '/lab/admin/'}
WIDTHS = [1440, 1024, 768, 721, 720, 390, 320]
JS = r"""() => {
  const out = [], vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity) > .05; };
  const hidden = e => !!e.closest('[aria-hidden="true"], .vh, .tab-label, .skip');
  const lum = c => { const v = c.map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const rgba = s => { const m = s.match(/[\d.]+/g); if (!m) return null; if (s.startsWith('color(')) return [m[0] * 255, m[1] * 255, m[2] * 255, m[3] === undefined ? 1 : +m[3]]; return [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]]; };
  const bgOf = e => { let layers = []; for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage !== 'none' && !n.matches('.bg, body, html')) return { complex: n.className }; const c = rgba(s.backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= .99) break; } } layers.push(rgba(getComputedStyle(document.body).backgroundColor) || [255,255,255,1]);
    let col = layers.pop().slice(0, 3); while (layers.length) { const l = layers.pop(); col = col.map((v, i) => l[i] * l[3] + v * (1 - l[3])); } return { col }; };
  const W = innerWidth;
  // 1. text elements: clipping, off-screen, contrast, tiny type
  const texts = [...document.querySelectorAll('body *')].filter(e => vis(e) && !hidden(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  for (const e of texts) {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e), tag = (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : e.tagName.toLowerCase()) + ' "' + e.textContent.trim().slice(0, 24) + '"';
    const scroller = e.closest('.carousel, .chips, .framed, .skills, .fact');
    if (!scroller && (r.right > W + 1 || r.left < -1)) out.push(['offscreen', tag]);
    if ((s.overflowX !== 'visible' || s.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1 && !scroller) out.push(['clipped', tag]);
    const fs = parseFloat(s.fontSize); if (fs < 12) out.push(['tiny', tag + ' ' + fs + 'px']);
    const b = bgOf(e); if (b.col) { const fg = rgba(s.color); const f = fg.slice(0, 3).map((v, i) => v * fg[3] + b.col[i] * (1 - fg[3])); const L1 = lum(f), L2 = lum(b.col), cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      const large = fs >= 24 || (fs >= 18.66 && +s.fontWeight >= 700); if (cr < (large ? 3 : 4.5)) out.push(['contrast', tag + ' ' + cr.toFixed(2)]); }
  }
  // 2. text over text
  const boxes = texts.filter(e => !e.closest('.window, .phone, .tabbar, .bar')).map(e => [e, e.getBoundingClientRect()]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const [a, ra] = boxes[i], [c, rc] = boxes[j]; if (a.contains(c) || c.contains(a)) continue;
    const ox = Math.min(ra.right, rc.right) - Math.max(ra.left, rc.left), oy = Math.min(ra.bottom, rc.bottom) - Math.max(ra.top, rc.top);
    if (ox > 2 && oy > 2) out.push(['overlap', a.textContent.trim().slice(0, 18) + ' x ' + c.textContent.trim().slice(0, 18)]); }
  // 3. images, ids, headings, links
  document.querySelectorAll('img').forEach(i => { if (!vis(i)) return; if (!(i.complete && i.naturalWidth)) out.push(['img-broken', i.getAttribute('src').slice(0, 40)]); if (!i.hasAttribute('alt')) out.push(['img-alt', i.getAttribute('src').slice(0, 40)]); });
  // an image larger than a container that does not clip it spills out of it (the logo tiles did, 19px)
  document.querySelectorAll('img').forEach(i => { if (!vis(i)) return; const p = i.parentElement, a = p.getBoundingClientRect(), r = i.getBoundingClientRect(); if (getComputedStyle(p).overflow !== 'visible') return;
    if (r.left < a.left - .5 || r.top < a.top - .5 || r.right > a.right + .5 || r.bottom > a.bottom + .5) out.push(['img-overflow', (p.className || p.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' in ' + Math.round(a.width) + 'x' + Math.round(a.height)]); });
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id); ids.filter((v, i) => ids.indexOf(v) !== i).forEach(v => out.push(['dup-id', v]));
  let last = 0; [...document.querySelectorAll('h1, h2, h3, h4')].filter(vis).forEach(h => { const l = +h.tagName[1]; if (last && l > last + 1) out.push(['heading-skip', h.tagName + ' "' + h.textContent.trim().slice(0, 20) + '"']); last = l; });
  if (document.querySelectorAll('h1').length !== 1) out.push(['h1-count', String(document.querySelectorAll('h1').length)]);
  const links = [...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href').split('#')[0].split('?')[0]);  // a query (the demo's ?profile=vpn) names a state of the page, not another page
  // 4. touch targets (phones only)
  if (W <= 720) document.querySelectorAll('a, button, [role=switch], summary').forEach(e => { if (!vis(e) || e.closest('.prose, .vh, .skip')) return; const r = e.getBoundingClientRect(); if (r.width < 44 || r.height < 44) out.push(['target', (e.textContent.trim() || e.getAttribute('aria-label') || e.className).slice(0, 22) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)]); });
  return { out, links, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, cls: window.__cls || 0 };
}"""
async def main():
    issues = defaultdict(set)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for scheme in ['dark', 'light']:
            for w in WIDTHS:
                ctx = await b.new_context(viewport={'width': w, 'height': 900 if w > 720 else 844}, color_scheme=scheme, is_mobile=w <= 720, has_touch=w <= 720)
                await ctx.add_init_script("window.__cls = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });")
                pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:80])); pg.on('console', lambda m: errs.append(m.text[:80]) if m.type == 'error' else None)
                for path in PAGES:
                    await pg.goto(B + path); await pg.wait_for_timeout(700)
                    for y in range(0, 6000, 700): await pg.evaluate(f'window.scrollTo(0, {y})'); await pg.wait_for_timeout(40)
                    await pg.evaluate("document.querySelectorAll('.carousel').forEach(g => { g.scrollLeft = g.scrollWidth; g.scrollLeft = 0; })"); await pg.evaluate('Promise.all([...document.images].map(i => i.decode().catch(() => null)))'); await pg.evaluate('window.scrollTo(0, 0)'); await pg.wait_for_timeout(250)
                    r = await pg.evaluate(JS); key = f'{scheme} {w}'
                    for kind, what in r['out']: issues[(kind, path, what)].add(key)
                    if r['overflow'] > 0: issues[('page-overflow', path, f"{r['overflow']}px")].add(key)
                    if r['cls'] > 0.05: issues[('cls', path, f"{r['cls']:.3f}")].add(key)
                    for l in set(r['links']):
                        if l not in ROUTES: issues[('dead-link', path, l)].add(key)
                    for e in errs: issues[('js-error', path, e)].add(key)
                    errs.clear()
                    if scheme == 'dark' and w in (1440, 390):  # keyboard: every stop shows a ring and stays visible under the fixed bars
                        await pg.evaluate('window.scrollTo(0, 0)'); seen = set()
                        for _ in range(60):
                            await pg.keyboard.press('Tab'); f = await pg.evaluate("""(() => { const a = document.activeElement; if (!a || a === document.body) return null; const s = getComputedStyle(a), r = a.getBoundingClientRect();
                                const tb = document.querySelector('.tabbar'), tbr = tb && getComputedStyle(tb).display !== 'none' ? tb.getBoundingClientRect() : null, bar = document.querySelector('.bar').getBoundingClientRect();
                                return { id: (a.textContent.trim() || a.getAttribute('aria-label') || a.className).slice(0, 22), ring: s.outlineStyle !== 'none' || s.boxShadow !== 'none',
                                         covered: (() => { const pts = [[r.left + r.width / 2, r.top + Math.min(r.height / 2, 20)], [r.left + r.width / 2, r.bottom - 6]]; return pts.some(([x, y]) => { if (y < 0 || y > innerHeight) return false; const t = document.elementFromPoint(x, y); return t && !a.contains(t) && !t.contains(a) && !!t.closest('.tabbar, .bar'); }); })(), off: r.bottom < 0 || r.top > innerHeight }; })()""")
                            if not f or f['id'] in seen: break
                            seen.add(f['id'])
                            if not f['ring']: issues[('focus-no-ring', path, f['id'])].add(key)
                            if f['covered'] or f['off']: issues[('focus-hidden', path, f['id'])].add(key)
                await ctx.close()
        await b.close()
    by_kind = defaultdict(list)
    for (kind, path, what), keys in issues.items(): by_kind[kind].append((path, what, sorted(keys)))
    print(f'{sum(len(v) for v in by_kind.values())} distinct issues')
    for kind in sorted(by_kind):
        print(f'## {kind}: {len(by_kind[kind])}')
        for path, what, keys in sorted(by_kind[kind])[:8]: print(f'   {path:22} {what[:60]:60} @ {", ".join(keys[:4])}{" …" if len(keys) > 4 else ""}')
asyncio.run(main())
