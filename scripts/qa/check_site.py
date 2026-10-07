# UI checks for the built site at 1440/390/320px: overflow, one h1, 44px targets, header rows, facts order and
# alignment, theme switch semantics, sticky bar (pinned after scrolling; on phones only the tab row stays),
# animated background (moving with normal motion, still with Reduce Motion, packets only on the honeycomb edges),
# DM Sans loaded, no other hosts, no JS errors.
# Usage: python3 -m http.server 4321 --directory dist &   then   python3 scripts/qa/check_site.py http://localhost:4321 NEW
# Needs: pip install playwright && playwright install chromium
import asyncio, sys, re, math, urllib.request, urllib.parse
from urllib.parse import urlparse
from playwright.async_api import async_playwright

JS = r'''() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const small = [...document.querySelectorAll('a, button')]
    .filter(e => vis(e) && !e.classList.contains('skip') && !e.closest('.prose'))
    .map(e => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; })
    .filter(r => r.w < 44 || r.h < 44);
  const hdr = [...document.querySelectorAll('.top .lockup, .top .nav a, .top #theme')].map(e => Math.round(e.getBoundingClientRect().top));
  const rows = [...new Set(hdr)].sort((a, b) => a - b).filter((v, i, a) => i === 0 || v - a[i - 1] > 10).length;
  const th = document.getElementById('theme');
  const aside = document.querySelector('.case aside'), art = document.querySelector('.case article');
  const dm = [...document.fonts].filter(f => f.family.replace(/"/g, '') === 'DM Sans').map(f => f.status);
  return {
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    h1: document.querySelectorAll('h1').length, small, headerRows: rows,
    switchOk: !!th && th.getAttribute('role') === 'switch' && ['true', 'false'].includes(th.getAttribute('aria-checked')) && th.getAttribute('aria-label') === 'Dark theme',
    factsFirst: aside && art ? aside.getBoundingClientRect().top < art.getBoundingClientRect().top : null,
    dmSans: dm, tall: document.documentElement.scrollHeight > innerHeight + 400,
  };
}'''
STICKY = r'''async () => {
  window.scrollTo(0, 1200); await new Promise(r => setTimeout(r, 150));
  const nav = document.querySelector('.nav').getBoundingClientRect(), lock = document.querySelector('.lockup').getBoundingClientRect();
  const bar = document.querySelector('.bar');
  const r = { navTop: Math.round(nav.top), navBottom: Math.round(nav.bottom), lockBottom: Math.round(lock.bottom), stuck: !!bar && bar.hasAttribute('data-stuck') };
  window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 100)); return r;
}'''
MOTION = r'''async () => {
  const cv = document.querySelector('.bg canvas'); if (!cv) return { canvas: false };
  const snap = () => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let s = 0; for (let i = 0; i < d.length; i++) if (d[i]) s = (s + d[i] * (i % 251 + 1)) >>> 0; return s; };
  await new Promise(r => setTimeout(r, 1200)); const a = snap(); await new Promise(r => setTimeout(r, 700)); const b = snap();
  return { canvas: true, moving: a !== b, blank: a === 0 && b === 0 };
}'''

HEXTRACK = r'''async () => {
  const cv = document.querySelector('.bg canvas'); if (!cv) return { found: 0, worst: null };
  // cell edges of one 66x114 tile of the honeycomb, the same geometry as the CSS mask
  const SEGS = [[33,0,33,19],[0,38,33,19],[33,19,66,38],[0,38,0,76],[66,38,66,76],[0,76,33,95],[33,95,66,76],[33,95,33,114]];
  const dseg = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - x1 - t * dx, py - y1 - t * dy); };
  const dhex = (x, y) => { const tx = ((x % 66) + 66) % 66, ty = ((y % 114) + 114) % 114; let m = 1e9;
    for (const ox of [-66, 0, 66]) for (const oy of [-114, 0, 114]) for (const s of SEGS) m = Math.min(m, dseg(tx, ty, s[0] + ox, s[1] + oy, s[2] + ox, s[3] + oy)); return m; };
  const scale = cv.width / cv.getBoundingClientRect().width; let found = 0, worst = 0;
  for (let n = 0; n < 12; n++) {
    await new Promise(r => setTimeout(r, 250));
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 150) { const p = (i - 3) / 4; found++; worst = Math.max(worst, dhex((p % cv.width + .5) / scale, (Math.floor(p / cv.width) + .5) / scale)); }
  }
  return { found, worst: Math.round(worst * 10) / 10 };
}'''

def _lum(rgb):
    c = [v / 255 for v in rgb]; c = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def _rgba(s):
    """Any CSS colour Chromium hands back: #rgb/#rrggbb, rgb()/rgba(), or color(srgb r g b / a) with 0..1 channels."""
    s = s.strip()
    if s.startswith('#'):
        h = s[1:]; h = ''.join(c * 2 for c in h) if len(h) in (3, 4) else h  # the build minifies #FFFFFF to #fff
        return [int(h[i:i + 2], 16) for i in (0, 2, 4)], (int(h[6:8], 16) / 255 if len(h) == 8 else 1.0)
    n = [float(v) for v in re.findall(r'-?[\d.]+', s)]
    if s.startswith('color('):
        return [round(v * 255) for v in n[:3]], (n[3] if len(n) > 3 else 1.0)
    return n[:3], (n[3] if len(n) > 3 else 1.0)
def _rgb(s):
    return _rgba(s)[0]
def _cr(a, b):
    la, lb = sorted([_lum(_rgb(a)), _lum(_rgb(b))], reverse=True); return (la + 0.05) / (lb + 0.05)
TOKENS = """() => { const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  return { bg: v('--color-background'), label: v('--color-label'), sec: v('--color-label-secondary'), link: v('--color-tint-text'),
           ctl: v('--color-separator-control'), live: v('--color-status-live'), progress: v('--color-status-progress'),
           bg2: v('--color-background-secondary'), body: getComputedStyle(document.body).backgroundColor }; }"""
async def tokens_check(browser, base):
    """Text 4.5:1 and control borders 3:1 against the page background, in light/dark x normal/Increase Contrast;
    dark background #121212, pure black under Increase Contrast; body really painted with the token."""
    problems = []
    for scheme in ['light', 'dark']:
        for contrast in ['no-preference', 'more']:
            ctx = await browser.new_context(color_scheme=scheme, contrast=contrast); pg = await ctx.new_page()
            await pg.goto(base + '/'); t = await pg.evaluate(TOKENS); await ctx.close()
            mode = f'{scheme}/{contrast}'
            for name, key, need in [('text', 'label', 4.5), ('secondary text', 'sec', 4.5), ('links', 'link', 4.5), ('control borders', 'ctl', 3.0),
                                    ('live light', 'live', 3.0), ('in-progress light', 'progress', 3.0)]:
                if not t[key]: problems.append(f'{mode}: {name} token missing'); continue
                r = _cr(t[key], t['bg'])
                if r < need: problems.append(f'{mode}: {name} {t[key]} on {t["bg"]} is {r:.2f}:1, needs {need}')
            for name, key, need in [('live light', 'live', 3.0), ('in-progress light', 'progress', 3.0), ('links', 'link', 4.5)]:
                # the second surface carries text too: the phone fact tiles hold the GitHub and live links
                if t[key] and _cr(t[key], t['bg2']) < need: problems.append(f'{mode}: {name} {t[key]} on the tile surface {t["bg2"]} is {_cr(t[key], t["bg2"]):.2f}:1, needs {need:g}')
            if _rgb(t['body']) != _rgb(t['bg']): problems.append(f'{mode}: body painted {t["body"]}, token says {t["bg"]}')
            if scheme == 'dark':
                want = '#121212' if contrast == 'no-preference' else '#000000'
                if _rgb(t['bg']) != _rgb(want): problems.append(f'{mode}: dark background is {t["bg"]}, expected {want}')
    return problems

def hex_shape(base):
    """Reads the grid tile from the built CSS and returns (side ratio error %, edge angle, problems)."""
    html = urllib.request.urlopen(base + '/').read().decode()
    css = ''.join(urllib.request.urlopen(base + h).read().decode() for h in re.findall(r'<link rel="stylesheet" href="([^"]+)"', html))
    m = re.search(r'\.bg-grid\{[^}]*?mask:url\("data:image/svg\+xml,([^"]+)"\)', css)
    if not m: return ['no .bg-grid mask tile found']
    d = re.search(r"d='([^']+)'", urllib.parse.unquote(m.group(1))).group(1)
    verticals, diagonals, x = [], [], None
    for cmd, args in re.findall(r'([MVL])([^MVL]*)', d):
        n = [float(v) for v in re.findall(r'-?\d*\.?\d+', args)]
        if cmd == 'M': x, y = n
        elif cmd == 'V': verticals.append(abs(n[0] - y)); y = n[0]
        else: diagonals.append((abs(n[0] - x), abs(n[1] - y))); x, y = n
    side = max(verticals); lengths = [math.hypot(a, b) for a, b in diagonals]; angles = [math.degrees(math.atan2(b, a)) for a, b in diagonals]
    problems = []
    worst_len = max(abs(l - side) / side * 100 for l in lengths); worst_ang = max(abs(a - 30) for a in angles)
    if worst_len > 0.5: problems.append(f'hexagon sides unequal: slanted {lengths[0]:.2f} vs vertical {side:.2f} ({worst_len:.1f}%)')
    if worst_ang > 0.3: problems.append(f'hexagon edges at {angles[0]:.2f} degrees, a regular one needs 30')
    return problems




KNOWN_STATES = {'in production': 'live', 'live demo': 'live', 'in development': 'building'}
def _state(status):
    """src/data/status.ts, mirrored: known statuses by name, then whole-word patterns."""
    if status.strip().lower() in KNOWN_STATES: return KNOWN_STATES[status.strip().lower()]
    return 'live' if re.search(r'\b(production|live)\b', status, re.I) else 'building' if re.search(r'\b(development|beta|progress|building)\b', status, re.I) else 'steady'

HERO = r"""() => { const svg = document.querySelector('.hero-visual .hub'), h1 = document.querySelector('.hero h1');
  const a = svg && svg.getBoundingClientRect(), b = h1 && h1.getBoundingClientRect();
  return { hub: !!svg, leftovers: document.querySelectorAll('.hero-switch, .hm-1, .hm-2, .lift-walls, .bp-guides').length,
           hidden: svg ? !!svg.closest('[aria-hidden="true"]') : null,
           drawn: svg ? parseFloat(getComputedStyle(svg.querySelector('.hub-line')).strokeDashoffset) : null,
           above: a && b ? a.bottom <= b.top + 1 && Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2) < 6 : null, height: a ? Math.round(a.height) : null }; }"""
async def hero_check(browser, base):
    """Hero: the hub mark is there (and nothing from the proposal), hidden from screen readers, its outline drawn; packets
    arrive at it (2+ in 12 s on desktop, 1+ on a phone), none under Reduce Motion; on a phone it sits beside the name."""
    problems = []
    # arrivals are random: the thresholds sit well under the measured means, and a page without a hub gets none
    for vw, vh, motion, need in [(1440, 900, 'no-preference', 2), (390, 844, 'no-preference', 1), (1440, 900, 'reduce', 0)]:
        ctx = await browser.new_context(viewport={'width': vw, 'height': vh}, reduced_motion=motion); pg = await ctx.new_page()
        tag = f'hero {vw}px{" reduced motion" if motion == "reduce" else ""}'
        await pg.goto(base + '/')
        await pg.evaluate("""() => { window.__arrivals = 0; const g = document.querySelector('.hero-visual .hub .hub-pulses');
            if (g) new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('hub-ring')) window.__arrivals++; }))).observe(g, { childList: true }); }""")
        await pg.wait_for_timeout(12000 if motion == 'no-preference' else 2500)
        s = await pg.evaluate(HERO); n = await pg.evaluate('window.__arrivals'); await ctx.close()
        if s['leftovers']: problems.append(f'{tag}: {s["leftovers"]} proposal leftovers (switcher or other versions)')
        if not s['hub']: problems.append(f'{tag}: no hub mark'); continue
        if not s['hidden']: problems.append(f'{tag}: hub mark not hidden from screen readers')
        if s['drawn'] != 0: problems.append(f'{tag}: outline not drawn (dashoffset {s["drawn"]})')
        if motion == 'reduce' and n: problems.append(f'{tag}: {n} arrivals under Reduce Motion')
        if motion != 'reduce' and n < need: problems.append(f'{tag}: only {n} arrivals in 12 s, expected {need} or more')
        if vw <= 720 and not s['above']: problems.append(f'{tag}: mark not centred above the name')
    return problems



GRID = r"""() => { const LOGO = (c, title) => { const l = c.querySelector('.pj-logo'), i = l && l.querySelector('img'), t = c.querySelector(title); if (!l) return null; const a = l.getBoundingClientRect(), b = t.getBoundingClientRect(); const cs = getComputedStyle(l), ir = i ? i.getBoundingClientRect() : a, bx = parseFloat(cs.borderLeftWidth), px = parseFloat(cs.paddingLeft), py = parseFloat(cs.paddingTop); const k = l.offsetWidth ? a.width / l.offsetWidth : 1; /* the stack scales covered cards: scale the padding too */ const box = [a.left + (bx + px) * k, a.top + (bx + py) * k, a.right - (bx + px) * k, a.bottom - (bx + py) * k]; return { loaded: !!i && i.complete && i.naturalWidth > 0, hidden: l.getAttribute('aria-hidden') === 'true', beside: a.right <= b.left + 1 && a.top < b.bottom && a.bottom > b.top, inside: ir.left >= box[0] - .5 && ir.top >= box[1] - .5 && ir.right <= box[2] + .5 && ir.bottom <= box[3] + .5, img: [ir.width, ir.height].map(Math.round), box: [box[2] - box[0], box[3] - box[1]].map(Math.round) }; }; return [...document.querySelectorAll('.fr-card')].map((c, i) => {
  const t = (id) => id && document.getElementById(id) ? document.getElementById(id).textContent.replace(/\s+/g, ' ').trim() : null;
  const img = c.querySelector('.window-view img'), led = c.querySelector('.led'), meta = c.querySelector('.fr-meta'), r = c.getBoundingClientRect();
  return { i, href: c.getAttribute('href'), tab: c.tabIndex, nested: c.querySelectorAll('a').length, name: t(c.getAttribute('aria-labelledby')), desc: t(c.getAttribute('aria-describedby')),
           bg: getComputedStyle(c).backgroundColor, lead: c.classList.contains('fr-lead'), phoneFrame: !!c.querySelector('.phone'),
           portrait: img ? img.naturalHeight > img.naturalWidth : null, kpi: !!c.querySelector('.fr-kpi'), left: Math.round(r.left), top: Math.round(r.top),
           img: img ? { loaded: img.complete && img.naturalWidth > 0, sized: img.hasAttribute('width') && img.hasAttribute('height') } : null,
           led: led ? { state: led.dataset.state, color: getComputedStyle(led).backgroundColor } : null, status: meta ? meta.textContent.trim() : null,
           texts: [...c.querySelectorAll('.fr-title, .fr-sum, .fr-meta, .fr-kpi, .fr-kpi small')].map(e => { const b = e.getBoundingClientRect(); return [e.className, getComputedStyle(e).color, b.left, b.top]; }),
           card: [r.left, r.top, r.width, r.height], tint: getComputedStyle(c).getPropertyValue('--tint').trim(), logo: LOGO(c, '.fr-title') }; }); }"""
def _glow(bg, tint, card, x, y):
    """The card's background at (x, y): the brand glow radial-gradient(120% 70% at 0 0, tint 34%, transparent 62%) over the
    card colour, sampled at the text's top-left corner, the point of its box nearest the glow's centre."""
    if not tint: return bg
    cx, cy, w, h = card; d = (((x - cx) / (1.2 * w)) ** 2 + ((y - cy) / (0.7 * h)) ** 2) ** .5
    a = max(0.0, .34 * (1 - d / .62)); (t, _), (k, _) = _rgba(tint), _rgba(bg)
    return '#%02X%02X%02X' % tuple(round(t[i] * a + k[i] * (1 - a)) for i in range(3))
def _over(fg, bg):
    (f, alpha), (k, _) = _rgba(fg), _rgba(bg)
    return '#%02X%02X%02X' % tuple(round(f[i] * alpha + k[i] * (1 - alpha)) for i in range(3))
async def _load_all(pg):
    for y in range(0, 4000, 400): await pg.evaluate(f'window.scrollTo(0, {y})'); await pg.wait_for_timeout(60)
    await pg.evaluate("document.querySelectorAll('.framed.carousel').forEach(g => { g.scrollLeft = g.scrollWidth; g.scrollLeft = 0; })"); await pg.wait_for_timeout(150)
    await pg.evaluate('Promise.all([...document.images].map(i => i.decode().catch(() => null)))'); await pg.evaluate('window.scrollTo(0, 0)')
async def grid_check(browser, base):
    """Project cards on phones (the Home carousel and the Work list), both themes: one tab stop without nested links, the
    link's name is just "<project> case study" and the rest its description; the screenshot loads with width/height and
    sits in the frame matching its orientation; the status light matches the text and reaches 3:1 on the card; every
    text reaches 4.5:1 on the card; the large card shows its number; a tap opens the case study. Then one column on the
    Work page and the case-study covers."""
    problems = []
    for path in ['/', '/projects/']:
        for scheme in ['dark', 'light']:
            ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, color_scheme=scheme, is_mobile=True, has_touch=True); pg = await ctx.new_page()
            await pg.goto(base + path); await _load_all(pg); cards = await pg.evaluate(GRID)
            if not cards: problems.append(f'grid {path}: no project cards'); await ctx.close(); continue
            for c in cards:
                tag = f'grid {path} {scheme} card {c["i"] + 1}'
                if c['tab'] < 0 or c['nested']: problems.append(f'{tag}: not one tab stop without nested links')
                if not c['name'] or not c['name'].endswith('case study') or len(c['name']) > 60: problems.append(f'{tag}: link name {c["name"]!r}')
                if not c['desc']: problems.append(f'{tag}: no description')
                if not c['img'] or not c['img']['loaded'] or not c['img']['sized']: problems.append(f'{tag}: screenshot {c["img"]}')
                if c['portrait'] is not None and c['portrait'] != c['phoneFrame']: problems.append(f'{tag}: a {"portrait" if c["portrait"] else "landscape"} screenshot in a {"phone" if c["phoneFrame"] else "browser"} frame')
                if c['led'] and c['status']:
                    if c['led']['state'] != _state(c['status']): problems.append(f'{tag}: light {c["led"]["state"]} for "{c["status"]}"')
                    if c['led']['state'] != 'steady' and _cr(c['led']['color'], c['bg']) < 3: problems.append(f'{tag}: light on the card {_cr(c["led"]["color"], c["bg"]):.2f}:1')
                for cls, col, tx, ty in c['texts']:
                    under = _glow(c['bg'], c['tint'], c['card'], tx, ty)
                    ratio = _cr(_over(col, under), under)
                    if ratio < 4.5: problems.append(f'{tag}: {cls} {ratio:.2f}:1 on the card under the glow')
                if not c['logo'] or not c['logo']['loaded'] or not c['logo']['hidden'] or not c['logo']['beside'] or not c['logo']['inside']: problems.append(f'{tag}: logo {c["logo"]}')
                if c['lead'] and path == '/' and not c['kpi']: problems.append(f'{tag}: the large card shows no number')
            if scheme == 'dark':
                el = pg.locator('.fr-card').nth(0); await el.evaluate("e => e.scrollIntoView({ block: 'center' })"); await pg.wait_for_timeout(300); box = await el.bounding_box()
                await pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + 60); await pg.wait_for_timeout(500)
                if await pg.evaluate('location.pathname') != cards[0]['href']: problems.append(f'grid {path}: a tap on card 1 went to {await pg.evaluate("location.pathname")}')
            await ctx.close()
    ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', is_mobile=True, has_touch=True); pg = await ctx.new_page(); await pg.goto(base + '/')
    if (await pg.evaluate("document.querySelector('.fr-window') ? getComputedStyle(document.querySelector('.fr-window')).transitionDuration : 'none'")) not in ('0s', '0s, 0s'): problems.append('grid: the window animates under Reduce Motion (or is missing)')
    await ctx.close()
    ctx = await browser.new_context(viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); await pg.goto(base + '/projects/'); cards = await pg.evaluate(GRID)
    if not cards or len({c['left'] for c in cards}) != 1 or sorted(c['top'] for c in cards) != [c['top'] for c in cards]: problems.append('grid 390px: cards are not one column')
    href = cards[0]['href'] if cards else None; others = [c['href'] for c in cards[1:]]; await ctx.close()
    for h in others:  # every case study shows its cover, in whichever frame
        ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); await pg.goto(base + h); await pg.wait_for_timeout(500)
        cv = await pg.evaluate("(() => { const i = document.querySelector('.case-window img, .case-device img'); if (!i) return null; const r = i.getBoundingClientRect(), st = i.closest('.case-device');"
                               " const sr = st && st.getBoundingClientRect(), ph = st && st.querySelector('.phone').getBoundingClientRect();"
                               " return { loaded: i.complete && i.naturalWidth > 0, alt: i.getAttribute('alt'), ratio: r.width / r.height, natural: i.naturalWidth / i.naturalHeight,"
                               " inside: st ? ph.left >= sr.left - .5 && ph.right <= sr.right + .5 && ph.top >= sr.top - .5 && ph.bottom <= sr.bottom + .5 : true }; })()")
        if not cv or not cv['loaded'] or not (cv['alt'] or '').strip(): problems.append(f'grid {h}: cover {cv}')
        elif abs(cv['ratio'] / cv['natural'] - 1) > .01 or not cv['inside']: problems.append(f'grid {h}: cover cropped or outside its stage (box {cv["ratio"]:.3f} vs image {cv["natural"]:.3f}, inside={cv["inside"]})')
        await ctx.close()
    if href:
        ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); await pg.goto(base + href); await pg.wait_for_timeout(500)
        cw = await pg.evaluate("(() => { const i = document.querySelector('.case-window .window-view img'), u = document.querySelector('.case-window .window-url'); return i ? { loaded: i.complete && i.naturalWidth > 0, alt: i.getAttribute('alt'), host: u && u.textContent.trim(), ratio: +(i.getBoundingClientRect().width / i.getBoundingClientRect().height).toFixed(2) } : null; })()")
        if not cw or not cw['loaded'] or not (cw['alt'] or '').strip() or not cw['host'] or abs(cw['ratio'] - 1.6) > 0.02: problems.append(f'grid {href}: case-study window {cw}')
        await ctx.close()
    return problems

MOB = r"""() => { const q = s => document.querySelector(s), R = el => el.getBoundingClientRect(), tb = q('.tabbar');
  const shown = el => el && getComputedStyle(el).display !== 'none';
  const pill = tb && tb.querySelector('.tb-pill');
  const tabs = shown(tb) ? [...tb.querySelectorAll('a')].filter(a => shown(a) && R(a).width > 0).map(a => { const b = R(a), l = a.querySelector('.tab-label');
      const ic = [...a.querySelectorAll('svg:not(.fab-ring)')].find(s => parseFloat(getComputedStyle(s).opacity) > .5);
      return { label: l ? l.textContent.trim() : a.getAttribute('aria-label'), href: a.getAttribute('href'), fab: a.classList.contains('tb-fab'), w: b.width, h: b.height, cur: a.getAttribute('aria-current'),
               fs: l ? parseFloat(getComputedStyle(l).fontSize) : 15, labelW: l ? R(l).width : 0, color: getComputedStyle(l || a).color, bg: getComputedStyle(a).backgroundColor,
               icon: ic ? getComputedStyle(ic).color : null }; }) : [];
  return { tab: shown(tb) ? { top: R(tb).top, bg: pill ? getComputedStyle(pill).backgroundColor : getComputedStyle(tb).backgroundColor } : null, tabs, barH: R(q('.bar')).height, nav: shown(q('.bar .nav')),
           page: getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim(), metas: [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content),
           overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, back: shown(q('.back-btn')) ? q('.back-btn').getAttribute('href') : null,
           lockup: shown(q('.lockup')), rv: document.querySelectorAll('.rv').length }; }"""
EXPECT_TAB = {'/': 'Home', '/projects/': 'Work', '/projects/gozarx/': 'Work', '/projects/spindle/': 'Work', '/about/': 'About', '/resume/': 'Résumé', '/contact/': 'Contact'}
async def mobile_check(browser, base):
    """The phone experience (390x844, touch), both themes: a slim bar (60px or less) without the section links; a floating
    tab bar of five 44px+ tabs, the current section marked, labels 11px+ at 4.5:1 on the bar; nothing hidden under the
    tab bar; the browser bar takes the page colour, also after the theme switch; the hero shows the mark (180px+) centred
    above the name with the buttons in the first screen; the projects swipe as a snapping carousel whose dots and raised
    card follow the swipe; a case study has a back button, two-column fact tiles, the stack on one swipeable line and a
    next-project card that wraps round; contact rows are 56px+ and copy the address with a toast; the résumé is a
    download card; Reduce Motion turns the rises off. On desktop the tab bar, dots and back button stay hidden."""
    problems = []
    for scheme in ['dark', 'light']:
        vctx = await browser.new_context(viewport={'width': 390, 'height': 844}, color_scheme=scheme, is_mobile=True, has_touch=True); vpg = await vctx.new_page()
        for route, label in EXPECT_TAB.items():  # four tabs and the round Contact button reach the five sections
            await vpg.goto(base + route); await vpg.wait_for_timeout(400); m = await vpg.evaluate(MOB); tag = f'mobile {scheme} tab bar {route}'
            if not m['tab'] or len({t['href'] for t in m['tabs']}) != 5 or len(m['tabs']) != 5: problems.append(f'{tag}: the tab bar does not reach the five sections'); break
            if [t['href'] for t in m['tabs'] if t['fab']] != ['/contact/']: problems.append(f'{tag}: no round Contact button')
        if scheme == 'dark':  # the capsule travels: going Home -> Work, the new page starts with Home open (is-from), then moves
            await vpg.add_init_script("window.__from = []; new MutationObserver(ms => ms.forEach(m => { if (m.target.classList && m.target.classList.contains('is-from')) window.__from.push(m.target.getAttribute('href')); })).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] });")
            await vpg.goto(base + '/'); await vpg.wait_for_timeout(300)
            if not await vpg.evaluate("!!document.querySelector('.tab[href=\"/projects/\"]')"): problems.append('mobile: no Work tab to travel to')
            else:
                await vpg.click('.tab[href="/projects/"]'); await vpg.wait_for_timeout(700)
                trav = await vpg.evaluate("[location.pathname, window.__from || []]")
                if trav[0] != '/projects/' or '/' not in trav[1]: problems.append(f'mobile: the capsule did not travel Home -> Work {trav}')
        await vctx.close()
        ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, color_scheme=scheme, is_mobile=True, has_touch=True)
        await ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=base); pg = await ctx.new_page()
        for route, label in EXPECT_TAB.items():
            tag = f'mobile {scheme} {route}'; await pg.goto(base + route); await pg.wait_for_timeout(500); m = await pg.evaluate(MOB)
            if m['barH'] > 64 or m['nav']: problems.append(f'{tag}: bar {m["barH"]:.0f}px, section links shown={m["nav"]}')
            if m['overflow'] > 0: problems.append(f'{tag}: {m["overflow"]}px sideways overflow')
            if not m['tab'] or len({t['href'] for t in m['tabs']}) != 5 or len(m['tabs']) != 5: problems.append(f'{tag}: the tab bar does not reach the five sections {[t["href"] for t in m["tabs"]]}'); continue
            cur = [t['label'] for t in m['tabs'] if t['cur'] == 'page']
            if cur != [label]: problems.append(f'{tag}: current tab {cur}, expected {label}')
            under_bar = _over(m['tab']['bg'], m['page'])
            for t in m['tabs']:
                if t['w'] < 44 or t['h'] < 44: problems.append(f'{tag}: {t["label"]} is {t["w"]:.0f}x{t["h"]:.0f}')
                if t['fab']: continue
                if t['cur'] == 'page':
                    cap = _over(t['bg'], under_bar)
                    if t['labelW'] < 20 or t['fs'] < 13 or _cr(_over(t['color'], cap), cap) < 4.5: problems.append(f'{tag}: open capsule {t["label"]} label {t["labelW"]:.0f}px, {_cr(_over(t["color"], cap), cap):.2f}:1')
                else:
                    if t['labelW'] > 2: problems.append(f'{tag}: closed tab {t["label"]} shows its label ({t["labelW"]:.0f}px)')
                    if not t['icon'] or _cr(_over(t['icon'], under_bar), under_bar) < 3: problems.append(f'{tag}: {t["label"]} icon {t["icon"]} on the bar')
            if any(c.lower() != m['page'].lower() for c in m['metas']): problems.append(f'{tag}: browser bar {m["metas"]} vs page {m["page"]}')
            await pg.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)'); await pg.wait_for_timeout(250)
            last = await pg.evaluate("(() => { const a = [...document.querySelectorAll('.foot a')].pop(); return a ? a.getBoundingClientRect().bottom : 0; })()")
            if last > m['tab']['top'] - 4: problems.append(f'{tag}: the footer ends under the tab bar ({last:.0f} > {m["tab"]["top"]:.0f})')
            if route == '/projects/gozarx/' and (m['back'] != '/projects/' or m['lockup']): problems.append(f'{tag}: back button {m["back"]}, brand still shown={m["lockup"]}')
        # theme switch keeps the browser bar in step
        await pg.goto(base + '/'); await pg.wait_for_timeout(300); await pg.click('#theme'); await pg.wait_for_timeout(900); m = await pg.evaluate(MOB)
        if any(c.lower() != m['page'].lower() for c in m['metas']): problems.append(f'mobile {scheme}: after the switch the browser bar is {m["metas"]}, page {m["page"]}')
        await pg.evaluate("localStorage.removeItem('sm-theme')")
        if scheme == 'dark':
            await pg.goto(base + '/'); await pg.wait_for_timeout(400)
            h = await pg.evaluate("""(() => { const R = el => el.getBoundingClientRect(), hub = R(document.querySelector('.hero .hub')), h1 = R(document.querySelector('.hero h1')), t = document.querySelector('.tabbar'), tb = t && getComputedStyle(t).display !== 'none' ? R(t) : { top: innerHeight };
                const btns = [...document.querySelectorAll('.hero .actions a')].map(R); return { hubH: hub.height, above: hub.bottom <= h1.top + 1 && Math.abs((hub.left + hub.right) / 2 - (h1.left + h1.right) / 2) < 6,
                inFirst: btns.length === 2 && btns.every(b => b.bottom <= tb.top) }; })()""")
            if h['hubH'] < 180 or not h['above'] or not h['inFirst']: problems.append(f'mobile hero: {h}')
            c = await pg.evaluate("""(() => { const g = document.querySelector('.framed.carousel'), cs = g && getComputedStyle(g), cards = g ? [...g.querySelectorAll('.fr-card')] : [];
                return g ? { snap: cs.scrollSnapType, ox: cs.overflowX, n: cards.length, w: cards[0].getBoundingClientRect().width / innerWidth } : null; })()""")
            if not c or 'x' not in c['snap'] or 'mandatory' not in c['snap'] or c['ox'] != 'auto' or c['n'] < 3 or not 0.8 <= c['w'] <= 0.9: problems.append(f'mobile carousel: {c}')
            else:
                await pg.evaluate("(() => { const g = document.querySelector('.framed.carousel'); g.scrollIntoView({ block: 'center' }); g.scrollTo({ left: g.querySelectorAll('.fr-card')[1].offsetLeft - parseFloat(getComputedStyle(g).paddingLeft), behavior: 'instant' }); })()")
                await pg.wait_for_timeout(800)
                st = await pg.evaluate("[[...document.querySelectorAll('.dots .dot')].findIndex(d => d.classList.contains('on')), [...document.querySelectorAll('.framed.carousel .fr-card')].findIndex(c => c.classList.contains('is-inview'))]")
                if st != [1, 1]: problems.append(f'mobile carousel: after a swipe to card 2 the dot/raised card are {st}')
            for src, nxt in [('/projects/gozarx/', '/projects/spindle/'), ('/projects/spindle/', '/projects/tooti/'), ('/projects/jozveyar/', '/projects/gozarx/')]:
                await pg.goto(base + src); await pg.wait_for_timeout(400)
                f = await pg.evaluate("""(() => { const tops = [...document.querySelectorAll('.fact')].map(e => Math.round(e.getBoundingClientRect().top)), chips = document.querySelector('.fact.wide .chips'), n = document.querySelector('.next-card');
                    const ct = chips ? [...chips.children].map(c => Math.round(c.getBoundingClientRect().top)) : [];
                    const rows = {}; document.querySelectorAll('.fact').forEach(f => { const r = f.getBoundingClientRect(); (rows[Math.round(r.top)] ||= []).push(f.classList.contains('wide') ? 'w' : 'h'); });
                    const st = chips && chips.closest('.fact');
                    return { pairs: tops.length !== new Set(tops).size, oneLine: ct.length > 0 && new Set(ct).size === 1, swipe: chips ? chips.scrollWidth > chips.clientWidth : false, next: n && n.getAttribute('href'),
                             rowsOk: Object.values(rows).every(r => r.join('') === 'w' || r.join('') === 'hh'), stackH: st ? Math.round(st.getBoundingClientRect().height) : null }; })()""")
                if not f['pairs'] or not f['oneLine'] or f['next'] != nxt or (src == '/projects/gozarx/' and not f['swipe']) or not f['rowsOk'] or (f['stackH'] or 999) > 110: problems.append(f'mobile case study {src}: {f}')
            await pg.goto(base + '/contact/'); await pg.wait_for_timeout(400)
            rows = await pg.evaluate("[...document.querySelectorAll('.contact-list li')].map(li => Math.round(li.getBoundingClientRect().height))")
            if not rows or min(rows) < 56: problems.append(f'mobile contact: rows {rows}')
            if not await pg.evaluate("!!document.querySelector('.row-copy')"): problems.append('mobile contact: no copy button'); await ctx.close(); continue
            await pg.click('.row-copy'); await pg.wait_for_timeout(500)
            toast = await pg.evaluate("(() => { const t = document.querySelector('.toast'); return [t.textContent, getComputedStyle(t).opacity]; })()"); clip = await pg.evaluate('navigator.clipboard.readText()')
            email = await pg.evaluate("document.querySelector('.row-copy').dataset.copy")
            if clip != email or toast[0] != 'Email address copied' or float(toast[1]) < 0.5: problems.append(f'mobile contact copy: clipboard {clip!r}, toast {toast}')
            await pg.goto(base + '/resume/'); await pg.wait_for_timeout(300)
            d = await pg.evaluate("(() => { const a = document.querySelector('.doc-card'); return a ? [a.getAttribute('href'), a.hasAttribute('download'), a.getBoundingClientRect().height] : null; })()")
            if not d or not d[0].endswith('/resume.pdf') or not d[1] or d[2] < 64: problems.append(f'mobile résumé: card {d}')
        await ctx.close()
    ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, reduced_motion='reduce'); pg = await ctx.new_page()
    await pg.goto(base + '/about/'); await pg.wait_for_timeout(500)
    if (await pg.evaluate(MOB))['rv']: problems.append('mobile: sections rise under Reduce Motion')
    await ctx.close()
    ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page()
    for route in ['/', '/projects/gozarx/']:
        await pg.goto(base + route); await pg.wait_for_timeout(300)
        shown = await pg.evaluate("['.tabbar', '.dots', '.back-btn'].filter(s => { const e = document.querySelector(s); return e && getComputedStyle(e).display !== 'none'; })")
        if shown: problems.append(f'desktop {route}: phone-only parts shown {shown}')
        if route == '/projects/gozarx/':  # the facts sidebar keeps its list: labels as blocks, values on one line
            fx = await pg.evaluate("(() => { const dts = [...document.querySelectorAll('.facts dt')]; return { blocks: dts.every(d => getComputedStyle(d).display === 'block'), xs: [...new Set([...document.querySelectorAll('.facts dd:not(.row)')].map(d => Math.round(d.getBoundingClientRect().left)))] }; })()")
            if not fx['blocks'] or len(fx['xs']) != 1: problems.append(f'desktop {route}: facts sidebar {fx}')
    await ctx.close()
    return problems

STACK = r"""() => { const LOGO = (c, title) => { const l = c.querySelector('.pj-logo'), i = l && l.querySelector('img'), t = c.querySelector(title); if (!l) return null; const a = l.getBoundingClientRect(), b = t.getBoundingClientRect(); const cs = getComputedStyle(l), ir = i ? i.getBoundingClientRect() : a, bx = parseFloat(cs.borderLeftWidth), px = parseFloat(cs.paddingLeft), py = parseFloat(cs.paddingTop); const k = l.offsetWidth ? a.width / l.offsetWidth : 1; /* the stack scales covered cards: scale the padding too */ const box = [a.left + (bx + px) * k, a.top + (bx + py) * k, a.right - (bx + px) * k, a.bottom - (bx + py) * k]; return { loaded: !!i && i.complete && i.naturalWidth > 0, hidden: l.getAttribute('aria-hidden') === 'true', beside: a.right <= b.left + 1 && a.top < b.bottom && a.bottom > b.top, inside: ir.left >= box[0] - .5 && ir.top >= box[1] - .5 && ir.right <= box[2] + .5 && ir.bottom <= box[3] + .5, img: [ir.width, ir.height].map(Math.round), box: [box[2] - box[0], box[3] - box[1]].map(Math.round) }; }; return [...document.querySelectorAll('.work-desk .st-card')].map((c, i) => {
  const t = (id) => id && document.getElementById(id) ? document.getElementById(id).textContent.replace(/\s+/g, ' ').trim() : null;
  const img = c.querySelector('.st-media img'), led = c.querySelector('.led'), st = c.querySelector('.st-status');
  return { i, href: c.getAttribute('href'), tab: c.tabIndex, nested: c.querySelectorAll('a').length, name: t(c.getAttribute('aria-labelledby')), desc: t(c.getAttribute('aria-describedby')),
           bg: getComputedStyle(c).backgroundColor, sticky: getComputedStyle(c).position, phoneFrame: !!c.querySelector('.phone'),
           img: img ? { loaded: img.complete && img.naturalWidth > 0, sized: img.hasAttribute('width') && img.hasAttribute('height'), portrait: img.naturalHeight > img.naturalWidth } : null,
           led: led ? { state: led.dataset.state, color: getComputedStyle(led).backgroundColor } : null, status: st ? st.textContent.trim() : null,
           texts: [...c.querySelectorAll('.st-num, .st-title, .st-sum, .st-kpi, .st-kpi small, .st-status')].map(e => { const b = e.getBoundingClientRect(); return [e.className, getComputedStyle(e).color, b.left, b.top]; }),
           card: (() => { const r = c.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })(), tint: getComputedStyle(c).getPropertyValue('--tint').trim(), logo: LOGO(c, '.st-title'),
           chips: [...c.querySelectorAll('.st-chips .chip')].map(ch => { const cs = getComputedStyle(ch), bgc = cs.backgroundColor; /* the chip is a gradient: test both of its stops */
             return [ch.textContent.trim(), cs.color, [cs.getPropertyValue('--button-gray-top').trim(), cs.getPropertyValue('--button-gray-bottom').trim(), bgc].filter(v => v && v !== 'rgba(0, 0, 0, 0)')]; }) }; }); }"""
async def stack_check(browser, base):
    """Desktop project list (the sticky stack) on Home and Work, both themes: each card is sticky, one tab stop without
    nested links, named "<project> case study" with the rest as description; the screenshot loads in the frame matching
    its orientation; the light matches the status and reaches 3:1 on the card; every text reaches 4.5:1 on the card. On
    Home: scrolling makes the next card cover the first, which shrinks; a click opens the case study through a view
    transition; transition names are unique; focus shows the ring. Reduce Motion keeps the cards still."""
    problems = []
    for path in ['/', '/projects/']:
        for scheme in ['dark', 'light']:
            ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}, color_scheme=scheme)
            await ctx.add_init_script("window.__vt = null; addEventListener('pagereveal', e => { window.__vt = !!e.viewTransition; });"); pg = await ctx.new_page()
            await pg.goto(base + path); await _load_all(pg); cards = await pg.evaluate(STACK)
            if len(cards) < 3: problems.append(f'stack {path}: {len(cards)} cards'); await ctx.close(); continue
            for c in cards:
                tag = f'stack {path} {scheme} card {c["i"] + 1}'
                if c['sticky'] != 'sticky': problems.append(f'{tag}: position {c["sticky"]}')
                if c['tab'] < 0 or c['nested']: problems.append(f'{tag}: not one tab stop without nested links')
                if not c['name'] or not c['name'].endswith('case study') or len(c['name']) > 60: problems.append(f'{tag}: link name {c["name"]!r}')
                if not c['desc']: problems.append(f'{tag}: no description')
                if not c['img'] or not c['img']['loaded'] or not c['img']['sized'] or c['img']['portrait'] != c['phoneFrame']: problems.append(f'{tag}: screenshot or frame {c["img"]}, phone={c["phoneFrame"]}')
                if c['led'] and c['status']:
                    if c['led']['state'] != _state(c['status']): problems.append(f'{tag}: light {c["led"]["state"]} for "{c["status"]}"')
                    if c['led']['state'] != 'steady' and _cr(c['led']['color'], c['bg']) < 3: problems.append(f'{tag}: light on the card {_cr(c["led"]["color"], c["bg"]):.2f}:1')
                for cls, col, tx, ty in c['texts']:
                    under = _glow(c['bg'], c['tint'], c['card'], tx, ty)
                    ratio = _cr(_over(col, under), under)
                    if ratio < 4.5: problems.append(f'{tag}: {cls} {ratio:.2f}:1 on the card under the glow')
                if not c['logo'] or not c['logo']['loaded'] or not c['logo']['hidden'] or not c['logo']['beside'] or not c['logo']['inside']: problems.append(f'{tag}: logo {c["logo"]}')
                for name, col, stops in c.get('chips', []):  # decorative (aria-hidden) but on screen: still legible, on every stop of its gradient
                    for stop in stops:
                        under = _over(stop, c['bg']); ratio = _cr(_over(col, under), under)
                        if ratio < 4.5: problems.append(f'{tag}: chip {name} {ratio:.2f}:1'); break
            if scheme == 'dark' and path == '/':
                names = await pg.evaluate("(() => { const n = [...document.querySelectorAll('*')].filter(e => e.getClientRects().length).map(e => getComputedStyle(e).viewTransitionName).filter(v => v && v !== 'none'); return n.filter((v, i) => n.indexOf(v) !== i); })()")
                if names: problems.append(f'stack /: duplicate transition names {names}')
                await pg.evaluate("document.querySelector('.work-desk .st-card').scrollIntoView({ block: 'start' })"); await pg.wait_for_timeout(200)
                await pg.evaluate("window.scrollBy(0, document.querySelector('.work-desk .st-card').offsetHeight * .7)"); await pg.wait_for_timeout(500)
                cov = await pg.evaluate("(() => { const c = document.querySelector('.work-desk .st-card'), m = getComputedStyle(c.querySelector('.st-inner')).transform; return [parseFloat(getComputedStyle(c).getPropertyValue('--p')), m === 'none' ? 1 : new DOMMatrix(m).a]; })()")
                if cov[0] < .3 or cov[1] > .99: problems.append(f'stack /: the covered card does not shrink (p {cov[0]}, scale {cov[1]:.3f})')
                for _ in range(40):
                    await pg.keyboard.press('Tab')
                    if await pg.evaluate("!!document.activeElement.closest('.st-card')"): break
                if await pg.evaluate('getComputedStyle(document.activeElement).outlineStyle') != 'solid': problems.append('stack /: no focus ring on the card')
                el = pg.locator('.work-desk .st-card').nth(1); await el.evaluate("e => e.scrollIntoView({ block: 'center' })"); await pg.wait_for_timeout(400); box = await el.bounding_box()
                await pg.mouse.click(box['x'] + 80, box['y'] + 60); await pg.wait_for_timeout(900)
                arr = await pg.evaluate("[location.pathname, window.__vt]")
                if arr[0] != cards[1]['href'] or arr[1] is not True: problems.append(f'stack /: click on card 2 went to {arr[0]}, view transition {arr[1]}')
            await ctx.close()
    ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce'); pg = await ctx.new_page(); await pg.goto(base + '/')
    if not await pg.evaluate("!!document.querySelector('.work-desk .st-card')"): problems.append('stack: no stack to check under Reduce Motion')
    else:
        await pg.evaluate("document.querySelector('.work-desk .st-card').scrollIntoView({ block: 'start' })"); await pg.evaluate("window.scrollBy(0, 400)"); await pg.wait_for_timeout(400)
        if await pg.evaluate("getComputedStyle(document.querySelector('.work-desk .st-inner')).transform") != 'none': problems.append('stack: cards move under Reduce Motion')
    await ctx.close()
    return problems

ORDER = ['/projects/gozarx/', '/projects/spindle/', '/projects/tooti/', '/projects/jozveyar/']
async def order_check(browser, base):
    """The four projects in their order everywhere they are listed: the desktop stack on Home and Work numbered 01 / 04
    to 04 / 04, the phone carousel with four dots, the phone list, and the next-project card of every case study
    leading to the next one by order, round to the first."""
    problems = []
    for path in ['/', '/projects/']:
        ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); await pg.goto(base + path)
        st = await pg.evaluate("[...document.querySelectorAll('.work-desk .st-card')].map(c => [c.getAttribute('href'), c.querySelector('.st-num').textContent.replace(/\\s+/g, ' ').trim()])")
        if [h for h, _ in st] != ORDER: problems.append(f'order {path} desktop: cards {[h for h, _ in st]}')
        want = [f'{i:02d} / {len(ORDER):02d}' for i in range(1, len(ORDER) + 1)]
        if [n for _, n in st] != want: problems.append(f'order {path} desktop: numbers {[n for _, n in st]}, expected {want}')
        await ctx.close()
        ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); pg = await ctx.new_page(); await pg.goto(base + path)
        ph = await pg.evaluate("[[...document.querySelectorAll('.work-phone .fr-card')].map(c => c.getAttribute('href')), document.querySelectorAll('.work-phone .dots .dot').length]")
        if ph[0] != ORDER: problems.append(f'order {path} phone: cards {ph[0]}')
        if path == '/' and ph[1] != len(ORDER): problems.append(f'order {path} phone: {ph[1]} carousel dots for {len(ORDER)} cards')
        await ctx.close()
    ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page()
    for i, src in enumerate(ORDER):
        await pg.goto(base + src); nxt = await pg.evaluate("(() => { const n = document.querySelector('.next-card'); return n && n.getAttribute('href'); })()")
        if nxt != ORDER[(i + 1) % len(ORDER)]: problems.append(f'order {src}: next project {nxt}, expected {ORDER[(i + 1) % len(ORDER)]}')
    await ctx.close()
    return problems

CAROUSEL_FOCUS = r"""() => { const a = document.activeElement, c = a && a.closest('.framed.carousel .fr-card'); if (!c) return null; const r = c.getBoundingClientRect();
  let seen = 0; for (const fx of [.05, .5, .95]) for (const fy of [.1, .5, .9]) { const x = r.left + r.width * fx, y = r.top + r.height * fy;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue; const t = document.elementFromPoint(x, y); if (t && (t === c || c.contains(t))) seen++; }
  const cards = [...document.querySelectorAll('.framed.carousel .fr-card')], dots = [...document.querySelectorAll('.dots .dot')];
  return { i: cards.indexOf(c), seen, dot: dots.findIndex(d => d.classList.contains('on')) }; }"""
async def carousel_focus_check(browser, base):
    """Keyboard in the Home carousel (phones, 320 to 720): Tab onto each card brings the whole card on screen, all 9
    points of a 3x3 grid by elementFromPoint, and its dot follows. A card left mostly off screen kept its focus ring
    there too, so a keyboard user could not see where they were."""
    problems = []
    for vw in (720, 390, 360, 320):
        for motion in ('no-preference', 'reduce'):
            ctx = await browser.new_context(viewport={'width': vw, 'height': 844}, is_mobile=True, has_touch=True, reduced_motion=motion); pg = await ctx.new_page()
            await pg.goto(base + '/'); await pg.wait_for_timeout(400); seen = {}
            for _ in range(40):
                await pg.keyboard.press('Tab')
                if not await pg.evaluate("!!(document.activeElement && document.activeElement.closest('.framed.carousel .fr-card'))"):
                    if seen: break
                    continue
                await pg.wait_for_timeout(800)  # a smooth scroll has landed by now
                f = await pg.evaluate(CAROUSEL_FOCUS); seen[f['i']] = f
            n = await pg.evaluate("document.querySelectorAll('.framed.carousel .fr-card').length")
            for i in range(n):
                f = seen.get(i); tag = f'carousel focus {vw}px{" reduce" if motion == "reduce" else ""} card {i + 1}'
                if not f: problems.append(f'{tag}: never focused'); continue
                if f['seen'] < 9: problems.append(f'{tag}: {f["seen"]}/9 points on screen when focused')
                if f['dot'] != i: problems.append(f'{tag}: dot {f["dot"] + 1} marked')
            await ctx.close()
    return problems

TITLE_ARROW = r"""() => [...document.querySelectorAll('.st-title, .fr-title, .next-title')].filter(t => t.getClientRects().length && t.querySelector('.go')).map(t => {
  const go = t.querySelector('.go').getBoundingClientRect(), r = document.createRange(), rects = [];
  const walk = document.createTreeWalker(t, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('.vh, .go') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  for (let n; (n = walk.nextNode());) { r.selectNodeContents(n); rects.push(...[...r.getClientRects()].filter(x => x.width > 0)); }
  const lines = [...new Set(rects.map(x => Math.round(x.top)))].sort((a, b) => a - b), last = rects.filter(x => Math.round(x.top) === lines[lines.length - 1]);
  const card = t.closest('a'), end = Math.max(...last.map(x => x.right)), mid = (last[0].top + last[0].bottom) / 2;
  return { title: card.getAttribute('href'), kind: t.classList[0], lines: lines.length, gap: Math.round(go.left - end), dy: Math.round((go.top + go.bottom) / 2 - mid) };
})"""
async def title_arrow_check(browser, base):
    """Every project title's arrow follows the title's last word, on that word's line: a long title ("Spindle Admin Kit")
    wrapped inside a flex row left the arrow at the far end of the row, up to 270px past the text and halfway up the
    block, pointing at nothing. Desk stack, phone cards and the next-project card, from 2560 to 320."""
    problems = []
    for vw in (2560, 1440, 1024, 768, 721, 720, 390, 360, 320):
        ctx = await browser.new_context(viewport={'width': vw, 'height': 900}, is_mobile=vw < 721, has_touch=vw < 721, reduced_motion='reduce'); pg = await ctx.new_page()
        for path in ['/', '/projects/'] + ORDER:
            await pg.goto(base + path); await pg.evaluate('document.fonts.ready')
            for x in await pg.evaluate(TITLE_ARROW):
                if not (0 <= x['gap'] <= 24) or abs(x['dy']) > 6:
                    problems.append(f"title arrow {vw}px {path} {x['kind']} {x['title']}: {x['gap']}px after the last line, {x['dy']:+d}px off its middle ({x['lines']} lines)")
        await ctx.close()
    return problems

CARD_FIT = r"""() => [...document.querySelectorAll('.work-desk .st-card, .work-phone .fr-card')].filter(c => c.getClientRects().length).map(c => {
  const box = c.getBoundingClientRect(), text = [...c.querySelectorAll('.st-text *, .fr-text *')].filter(e => e.getClientRects().length && !e.closest('.vh'));
  return { card: c.getAttribute('href'), kind: c.classList[0], h: Math.round(box.height), room: Math.round(box.bottom - Math.max(...text.map(e => e.getBoundingClientRect().bottom))) };
})"""
async def card_fit_check(browser, base):
    """Every project card holds all of its text: the cards clip (overflow hidden), and a desk stack card is as tall as
    the viewport allows, so on a landscape phone (844x390) it was 174px for text that needs 450, and at 721px wide the
    Spindle card's second row of chips ran 30px off its edge. Viewports from a 2560 desk to a 375-tall landscape phone."""
    problems = []
    for vw, vh in ((2560, 1440), (1440, 900), (1440, 560), (1366, 650), (1280, 600), (1024, 768), (1024, 600), (900, 640), (768, 1024), (768, 900),
                   (768, 720), (721, 900), (721, 640), (932, 430), (844, 390), (812, 375), (720, 900), (667, 375), (390, 844), (320, 640)):
        phone = vh < 500 or vw < 721
        ctx = await browser.new_context(viewport={'width': vw, 'height': vh}, is_mobile=phone, has_touch=phone, reduced_motion='reduce'); pg = await ctx.new_page()
        for path in ['/', '/projects/']:
            await pg.goto(base + path); await pg.evaluate('document.fonts.ready')
            for x in await pg.evaluate(CARD_FIT):
                if x['room'] < 0: problems.append(f"card fit {vw}x{vh} {path} {x['kind']} {x['card']}: text runs {-x['room']}px past the card's {x['h']}px")
        await ctx.close()
    return problems

TITLE_LOGO = r"""() => [...document.querySelectorAll('.st-card, .fr-card')].filter(c => c.getClientRects().length && c.querySelector('.pj-logo')).map(c => {
  const t = c.querySelector('.st-title, .fr-title'), logo = c.querySelector('.pj-logo').getBoundingClientRect(), r = document.createRange(), rects = [];
  const walk = document.createTreeWalker(t, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('.vh, .go') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  for (let n; (n = walk.nextNode());) { r.selectNodeContents(n); rects.push(...[...r.getClientRects()].filter(x => x.width > 0)); }
  const top = Math.min(...rects.map(x => x.top)), bottom = Math.max(...rects.map(x => x.bottom));
  return { card: c.getAttribute('href'), kind: c.classList[0], lines: new Set(rects.map(x => Math.round(x.top))).size, dy: (top + bottom) / 2 - (logo.top + logo.bottom) / 2 };
})"""
async def title_logo_check(browser, base):
    """A one-line project title sits on its logo tile's middle, as it did when the title was a centred flex row: made
    plain text for its arrow (title_arrow_check), it rose to the top of the tile's row, 9px high at 1440 and 17.5px at
    768. Desk stack and phone cards, from 2560 to 320."""
    problems = []
    for vw in (2560, 1440, 1024, 768, 721, 720, 390, 320):
        ctx = await browser.new_context(viewport={'width': vw, 'height': 900}, is_mobile=vw < 721, has_touch=vw < 721, reduced_motion='reduce'); pg = await ctx.new_page()
        for path in ['/', '/projects/']:
            await pg.goto(base + path); await pg.evaluate('document.fonts.ready')
            for x in await pg.evaluate(TITLE_LOGO):
                if x['lines'] == 1 and abs(x['dy']) > 2: problems.append(f"title logo {vw}px {path} {x['kind']} {x['card']}: the title is {x['dy']:+.1f}px off its logo's middle")
        await ctx.close()
    return problems

async def run(base, label):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
        page = await ctx.new_page()
        await page.goto(base + '/projects/', wait_until='networkidle')
        paths = ['/', '/projects/'] + sorted({await a.get_attribute('href') for a in await page.query_selector_all('.fr-card')}) + ['/about/', '/resume/', '/contact/', '/404.html']
        await ctx.close()
        fails = [f'{label}: {p}' for p in hex_shape(base)] + [f'{label} {p}' for p in await tokens_check(b, base)] + [f'{label} {p}' for p in await hero_check(b, base)] + [f'{label} {p}' for p in await grid_check(b, base)] + [f'{label} {p}' for p in await mobile_check(b, base)] + [f'{label} {p}' for p in await stack_check(b, base)] + [f'{label} {p}' for p in await order_check(b, base)] + [f'{label} {p}' for p in await carousel_focus_check(b, base)] + [f'{label} {p}' for p in await title_arrow_check(b, base)] + [f'{label} {p}' for p in await title_logo_check(b, base)] + [f'{label} {p}' for p in await card_fit_check(b, base)]
        for vw, vh in [(1440, 900), (390, 844), (320, 640)]:
            ctx = await b.new_context(viewport={'width': vw, 'height': vh})
            page = await ctx.new_page()
            errs, ext = [], set()
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            page.on('request', lambda r: ext.add(urlparse(r.url).netloc) if urlparse(r.url).hostname not in ('localhost', None) else None)
            for path in paths:
                errs.clear()
                await page.goto(base + path, wait_until='networkidle')
                await page.evaluate('document.fonts.ready')
                m = await page.evaluate(JS)
                tag = f'{label} {vw}px {path}'
                if m['overflow'] > 0: fails.append(f'{tag}: horizontal overflow {m["overflow"]}px')
                if m['h1'] != 1: fails.append(f'{tag}: {m["h1"]} h1')
                if m['small']: fails.append(f'{tag}: targets under 44px {m["small"]}')
                if not m['switchOk']: fails.append(f'{tag}: theme control is not a switch (role=switch, aria-checked, fixed label "Dark theme")')
                if vw <= 390 and m['headerRows'] > 2: fails.append(f'{tag}: header takes {m["headerRows"]} rows')
                if vw > 720 and m['headerRows'] != 1: fails.append(f'{tag}: desktop header takes {m["headerRows"]} rows')
                if vw <= 390 and m['factsFirst'] is False: fails.append(f'{tag}: project facts come after the whole article')
                if 'loaded' not in m['dmSans']: fails.append(f'{tag}: DM Sans not loaded {m["dmSans"]}')
                if m['tall']:
                    s = await page.evaluate(STICKY)
                    if not s['stuck']: fails.append(f'{tag}: bar not marked as pinned after scrolling')
                    if not (s['navTop'] >= -1 and s['navBottom'] <= 140): fails.append(f'{tag}: tabs not pinned after scrolling (top {s["navTop"]}, bottom {s["navBottom"]})')
                    if vw > 720 and s['lockBottom'] <= 0: fails.append(f'{tag}: logo scrolled away on desktop')
                    if vw <= 720 and s['lockBottom'] > 0: fails.append(f'{tag}: first header row still visible on a phone ({s["lockBottom"]}px)')
                if path == '/':
                    mv = await page.evaluate(MOTION)
                    if not mv['canvas'] or not mv['moving']: fails.append(f'{tag}: background not animating {mv}')
                    if vw == 1440:
                        hx = await page.evaluate(HEXTRACK)
                        if not hx['found'] or hx['worst'] > 4.5: fails.append(f'{tag}: packets leave the honeycomb edges (opaque pixels {hx["found"]}, farthest {hx["worst"]}px)')
                if errs: fails.append(f'{tag}: JS errors {errs[:2]}')
            if ext: fails.append(f'{label} {vw}px: requests to other hosts {sorted(ext)}')
            await ctx.close()
        # Reduce Motion: background still, nothing drawn
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        page = await ctx.new_page(); await page.goto(base + '/', wait_until='networkidle')
        mv = await page.evaluate(MOTION)
        if not mv['canvas'] or mv['moving'] or not mv['blank']: fails.append(f'{label} reduced motion: background should be still and empty {mv}')
        await ctx.close(); await b.close()
        print(f'== {label}: {len(paths)} pages x 3 widths + reduced motion, {len(fails)} failures')
        seen = set()
        for f in fails:
            key = f.split(': ', 1)[-1][:48]  # any message, with or without a colon
            if key in seen: continue
            seen.add(key); print('  FAIL', f)
        return len(fails)

# The exit status says what the report says, so a script or CI that runs this sees a failure (it exited 0 on any count).
sys.exit(1 if asyncio.run(run(sys.argv[1], sys.argv[2])) else 0)
