"""The admin panel demo (/lab/admin/) and its two ways in from the portfolio.

Checks, each a function returning its problems:
  hosts      zero requests to other hosts and no console errors, on every page of every business (prints the requests
             of the first load, for the report)
  render     every business renders every range (7/14/30/90 days: four figures, the trend, a table view of `range` rows)
             and every page (the three other dashboard tabs, both record tables, health)
  csv        the dashboard CSV holds exactly the figures on screen (tiles, every day of the chart, top cards, rates), and
             a records CSV holds every filtered, sorted row in the order on screen
  palette    Ctrl+K and Cmd+K open the palette, and it jumps to a tab, switches business, theme and range
  theme_lang the theme follows the portfolio's saved theme, switches and persists; the language switches with the layout,
             the chart's time axis and the digits mirrored (Persian digits in Persian)
  overflow   no sideways overflow at 1440/1024/768/390/320, on every page, in both languages
  phone_a11y on phones (390 and 320): text contrast 4.5:1 (3:1 large) on its real background and 44px targets, for
             every business in both themes
  motion     the live figures tick, pause while the tab is hidden, and stay still with Reduce Motion
  entry      the case study's button and the Work card's pill: at 1024/1280/1440/1920/2560 in both themes the pill sits
             clear of every text, the logo tile and the card frame, is 44px, and reaches 4.5:1 on the card; the phone
             button too; both open the demo
  persist    ?profile= and ?lang= apply and are remembered, the address follows a switch, ?theme= applies unsaved
  layout     no layout shift on load, range, business and tab switches, at 1440 and 390
  bundle     first-load JS at most 250 KB gzipped, the other tabs and pages left for later (prints every chunk)
  keyboard   every control is reachable by Tab with a visible focus ring, and the picker, range and chart answer keys
  names      every visible control, dialog, image, tab panel and table has an accessible name (the icon-only buttons
             above all), on every page and overlay of every business, in both languages, at 1440 and 390
  labels     text the reading direction or its room can garble, measured: a list's figure and its share or note stay
             apart and in reading order, the radar's labels stay inside the figure and off the chart, and an
             "up / total" pair reads left to right, for every business in both languages, at 1440 and 390

--prove runs every check twice: first on a deliberately broken page (a fault injected by script, CSS or a rewritten
response; the code shipped carries no switch for it), where it must FAIL, then on the real page, where it must PASS.

Usage: python3 -m http.server 4321 --directory dist &
       python3 scripts/qa/check_admin_demo.py http://localhost:4321 [--prove] [--only csv,palette] [--json out.json]
"""
import asyncio, base64, csv, gzip, io, json, os, re, sys
from urllib.parse import urlparse

from playwright.async_api import async_playwright

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
BASE = (ARGS[0] if ARGS else 'http://localhost:4321').rstrip('/')
PROVE = '--prove' in sys.argv
ONLY = next((sys.argv[i + 1].split(',') for i, a in enumerate(sys.argv) if a == '--only' and i + 1 < len(sys.argv)), None)
JSON_OUT = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--json' and i + 1 < len(sys.argv)), None)
DEMO = BASE + '/lab/admin/'
HOST = urlparse(BASE).netloc
PROFILES = ['vpn', 'saas', 'ecommerce', 'education', 'print']
RANGES = [7, 14, 30, 90]
WIDTHS = [1440, 1024, 768, 390, 320]
REPORT = {}  # extra findings the report quotes: the request list, chunk sizes, pill geometry


# ------------------------------------------------------------------------------------------------------------- colour
def _rgba(s):
    s = s.strip()
    if s.startswith('#'):
        h = s[1:]; h = ''.join(c * 2 for c in h) if len(h) in (3, 4) else h
        return [int(h[i:i + 2], 16) for i in (0, 2, 4)], (int(h[6:8], 16) / 255 if len(h) == 8 else 1.0)
    n = [float(v) for v in re.findall(r'-?[\d.]+', s)]
    if s.startswith('color('): return [round(v * 255) for v in n[:3]], (n[3] if len(n) > 3 else 1.0)
    return n[:3], (n[3] if len(n) > 3 else 1.0)
def _lum(rgb):
    c = [v / 255 for v in rgb]; c = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def _cr(a, b):
    la, lb = sorted([_lum(_rgba(a)[0]), _lum(_rgba(b)[0])], reverse=True); return (la + 0.05) / (lb + 0.05)
def _over(fg, bg):
    (f, alpha), (k, _) = _rgba(fg), _rgba(bg)
    return '#%02X%02X%02X' % tuple(round(f[i] * alpha + k[i] * (1 - alpha)) for i in range(3))
def _glow(bg, tint, card, x, y):
    """The portfolio card's background at (x, y): its brand glow over its colour (the model check_site.py uses)."""
    if not tint: return bg
    cx, cy, w, h = card; d = (((x - cx) / (1.2 * w)) ** 2 + ((y - cy) / (0.7 * h)) ** 2) ** .5
    a = max(0.0, .34 * (1 - d / .62)); (t, _), (k, _) = _rgba(tint), _rgba(bg)
    return '#%02X%02X%02X' % tuple(round(t[i] * a + k[i] * (1 - a)) for i in range(3))


# ------------------------------------------------------------------------------------------------------------- probes
# Every visible text run against the colour actually under it: alpha layers composited down to the first opaque
# background, or against BOTH ends of a gradient (the hero tile). SVG text reads its fill. An element can name the
# colour its text sits on with data-contrast-bg (an SVG pill drawn behind a label, which no CSS background describes).
CONTRAST = r"""() => {
  const parse = s => { if (!s) return null; const m = s.match(/-?[\d.]+/g); if (!m) return null; const a = m.map(Number);
    return s.startsWith('color(') ? [a[0] * 255, a[1] * 255, a[2] * 255, a.length > 3 ? a[3] : 1] : [a[0], a[1], a[2], a.length > 3 ? a[3] : 1]; };
  const lum = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const over = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
  const root = parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
  const bases = el => {
    const layers = [];
    const flat = base => layers.reduceRight((acc, l) => over(l, acc), base);
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const forced = n.getAttribute && n.getAttribute('data-contrast-bg'); if (forced) return [flat(parse(forced) || [255, 255, 255, 1])];
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && /gradient/.test(cs.backgroundImage)) {
        const stops = [...cs.backgroundImage.matchAll(/(rgba?|color)\([^)]*\)/g)].map(m => parse(m[0])).filter(c => c && c[3] > .5);
        if (stops.length) return stops.map(s => flat(over(s, root)));
      }
      const c = parse(cs.backgroundColor);
      if (c && c[3] > 0) { if (c[3] >= .99) return [flat(c)]; layers.push(c); }
    }
    return [flat(root)];
  };
  const out = [];
  const els = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) if (t.textContent.trim()) els.add(t.parentElement);
  for (const e of els) {
    if (!e || e.closest('.sr-only, .demo-skip, [data-fault], noscript, script, style, .demo-wm-dot, option')) continue;
    if (e.closest(':disabled, [aria-disabled="true"]')) continue;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (!r.width || !r.height || cs.visibility === 'hidden' || r.bottom < 0 || r.top > innerHeight * 4) continue;
    let op = 1; for (let n = e; n; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity);
    if (op < .1) continue;
    const isSvg = e instanceof SVGElement;
    const fg = parse(isSvg ? cs.fill : cs.color); if (!fg || fg[3] === 0) continue;
    fg[3] *= op;
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const worst = Math.min(...bases(e).map(b => cr(over(fg, b), b)));
    if (worst < need - .005) out.push({ text: e.textContent.trim().slice(0, 40), ratio: Math.round(worst * 100) / 100, need, size });
  }
  return out;
}"""

TARGETS = r"""() => [...document.querySelectorAll('a[href], button, select, input, textarea, [role="button"], [role="option"], [role="radio"], [role="tab"], [role="menuitem"], [role="menuitemradio"], [tabindex="0"]')]
  .filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.disabled
    && !e.closest('[inert], [aria-hidden="true"]') && !e.matches('.demo-skip, .sr-only') && r.bottom > 0 && r.top < innerHeight * 6; })
  .map(e => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }; })
  .filter(x => x.w < 44 || x.h < 44)"""

OVERFLOW = r"""() => { const de = document.documentElement, m = document.getElementById('main'), vw = de.clientWidth, bad = [];
  if (de.scrollWidth > de.clientWidth + 1) bad.push(['document', de.scrollWidth, de.clientWidth]);
  if (m && m.scrollWidth > m.clientWidth + 1) bad.push(['main', m.scrollWidth, m.clientWidth]);
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height || (r.right <= vw + 1 && r.left >= -1)) continue;
    if (getComputedStyle(e).position === 'fixed' && r.top < 0) continue;  // the skip link, parked above the page until focused
    let held = false;
    for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) if (/auto|scroll|hidden|clip/.test(getComputedStyle(n).overflowX)) { held = true; break; }
    if (!held) bad.push([e.tagName + '.' + String(e.className).slice(0, 40), Math.round(r.left), Math.round(r.right)]);
  }
  return bad.slice(0, 8); }"""

STATE = r"""() => ({ profile: document.documentElement.dataset.profile, theme: document.documentElement.dataset.theme,
  lang: document.documentElement.lang, dir: document.documentElement.dir, hash: location.hash, search: location.search,
  kpis: [...document.querySelectorAll('[data-kpi]')].map(k => { const v = k.querySelector('[data-value]'); return v ? parseFloat(v.dataset.value) : null; }),
  loading: document.querySelectorAll('[data-state="loading"]').length, errors: document.querySelectorAll('[data-state="error"]').length,
  empty: document.querySelectorAll('[data-state="empty"]').length, trend: document.querySelectorAll('[data-testid="trend"] svg path').length,
  range: (document.querySelector('[data-testid="range"] [aria-checked="true"]') || {}).dataset?.value || null })"""

SETTLED = "() => !document.querySelector('[data-state=\"loading\"]') && !!document.querySelector('[data-page]')"


# ------------------------------------------------------------------------------------------------------------- faults
class Fault:
    """A deliberately broken page: an init script, extra CSS, or rewritten responses, applied to every context a check
    opens. Nothing in the shipped code knows about it. `routes`: (url pattern, rewrite of the body, or a whole script)."""
    def __init__(self, what, init=None, css=None, routes=()):
        self.what, self.init, self.css, self.routes = what, init, css, routes

CSS_INJECT = """(css => { const add = () => { const s = document.createElement('style'); s.setAttribute('data-fault', ''); s.textContent = css; document.head.appendChild(s); };
  if (document.head) add(); else document.addEventListener('DOMContentLoaded', add); })(%s)"""

async def open_page(browser, fault=None, **opts):
    opts.setdefault('viewport', {'width': 1440, 'height': 900})
    ctx = await browser.new_context(accept_downloads=True, **opts)
    # Anything leaving for another host is stopped (and still counted by the hosts check's listener).
    async def block(route):
        if urlparse(route.request.url).netloc == HOST or not route.request.url.startswith('http'): await route.fallback()
        else: await route.abort()
    await ctx.route('**/*', block)
    if fault:
        if fault.init: await ctx.add_init_script(fault.init)
        if fault.css: await ctx.add_init_script(CSS_INJECT % json.dumps(fault.css))
        for pattern, rewrite in fault.routes: await ctx.route(pattern, rewriter(rewrite))
    return ctx, await ctx.new_page()

def rewriter(rewrite):
    # A factory, not a default argument: Playwright passes (route, request) to a handler that takes two parameters.
    async def handler(route):
        if isinstance(rewrite, str): await route.fulfill(status=200, content_type='text/javascript', body=rewrite); return
        resp = await route.fetch(); body = await resp.text(); await route.fulfill(response=resp, body=rewrite(body))
    return handler

async def goto(pg, url):
    await pg.goto(url, wait_until='networkidle'); await pg.wait_for_function(SETTLED, timeout=15000)

async def nav(pg, hash_):
    await pg.evaluate(f"location.hash = {json.dumps(hash_)}")
    await pg.wait_for_function(SETTLED, timeout=15000); await pg.wait_for_timeout(120)

async def entity_paths(pg):
    return await pg.evaluate("['records-0', 'records-1'].map(id => (document.querySelector(`[data-nav=\"${id}\"]`) || {}).getAttribute?.('href'))")


# ------------------------------------------------------------------------------------------------------------- checks
async def check_hosts(browser, fault=None):
    problems, first = [], []
    ctx, pg = await open_page(browser, fault)
    seen, errors = [], []
    pg.on('request', lambda r: seen.append((r.url, r.resource_type)))
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    pg.on('pageerror', lambda e: errors.append(str(e)))
    for i, p in enumerate(PROFILES):
        for lang in ['en', 'fa'] if i == 0 else ['en']:
            await goto(pg, f'{DEMO}?profile={p}&lang={lang}')
            if not first: first = list(seen)
            e0, e1 = await entity_paths(pg)
            for h in ['#/growth', '#/retention', '#/behaviour', e0, e1, '#/health', '#/']:
                if h: await nav(pg, h)
    foreign = sorted({urlparse(u).netloc for u, _ in seen if u.startswith('http') and urlparse(u).netloc != HOST})
    if foreign: problems.append(f'requests to other hosts: {foreign}')
    if errors: problems.append(f'console errors: {errors[:3]}')
    await ctx.close()
    if not fault: REPORT['requests_on_load'] = [{'url': u.replace(BASE, ''), 'type': t} for u, t in first]
    return problems


async def check_render(browser, fault=None):
    problems = []
    ctx, pg = await open_page(browser, fault)
    for p in PROFILES:
        await goto(pg, f'{DEMO}?profile={p}&lang=en')
        for r in RANGES:
            await pg.click(f'[data-testid="range"] [data-value="{r}"]'); await pg.wait_for_function(SETTLED); await pg.wait_for_timeout(100)
            s = await pg.evaluate(STATE)
            tag = f'{p} {r}d'
            if s['range'] != str(r): problems.append(f'{tag}: range control shows {s["range"]}')
            if len(s['kpis']) != 4 or any(v is None or v != v or v <= 0 for v in s['kpis']): problems.append(f'{tag}: figures {s["kpis"]}')
            if s['trend'] < 4 or s['errors'] or s['empty']: problems.append(f'{tag}: trend paths {s["trend"]}, error {s["errors"]}, empty {s["empty"]}')
            await pg.click('[data-testid="trend"] [data-testid="chart-table-toggle"]')
            rows = await pg.locator('[data-testid="trend"] [data-testid="chart-table"] tbody tr').count()
            await pg.click('[data-testid="trend"] [data-testid="chart-table-toggle"]')
            if rows != r: problems.append(f'{tag}: the table view has {rows} days')
        e0, e1 = await entity_paths(pg)
        checks = [('#/growth', '[data-testid="cumulative"] svg path'), ('#/growth', '[data-testid="split"] svg path'), ('#/retention', '[data-testid="cohorts"] tbody tr'),
                  ('#/behaviour', '[data-chart="heatmap"] div.rounded-\\[3px\\]'), (e0, 'tbody tr'), (e1, 'tbody tr'), ('#/health', '[data-probe]'), ('#/health', '[data-testid="uptime"] li')]
        for h, sel in checks:
            await nav(pg, h)
            n = await pg.locator(sel).count(); err = await pg.locator('[data-state="error"]').count()
            if n == 0 or err: problems.append(f'{p} {h}: {n} x {sel}, {err} errors')
    await ctx.close()
    return problems


def _num(s):
    s = s.replace('⁨', '').replace('⁩', '').replace(',', '').strip()
    m = re.search(r'-?[\d.]+', s); return float(m.group()) if m else None

async def check_csv(browser, fault=None):
    problems = []
    ctx, pg = await open_page(browser, fault)
    for p in ['vpn', 'ecommerce']:
        await goto(pg, f'{DEMO}?profile={p}&lang=en#/')
        await pg.click('[data-testid="range"] [data-value="14"]'); await pg.wait_for_function(SETTLED); await pg.wait_for_timeout(300)
        screen = await pg.evaluate("""() => ({
          kpis: [...document.querySelectorAll('[data-kpi] [data-value]')].map(e => parseFloat(e.dataset.value)),
          tops: [...document.querySelectorAll('[data-top]')].map(t => ({ head: t.querySelector('.truncate')?.textContent.trim(), value: parseFloat(t.querySelector('[data-value]')?.dataset.value) })),
          rates: [...document.querySelectorAll('[data-rate]')].map(e => parseFloat(e.dataset.rate)) })""")
        await pg.click('[data-testid="trend"] [data-testid="chart-table-toggle"]')
        table = await pg.evaluate("[...document.querySelectorAll('[data-testid=\"trend\"] [data-testid=\"chart-table\"] tbody tr')].map(r => [...r.children].map(c => c.textContent.trim()))")
        async with pg.expect_download() as dl:
            await pg.click('[data-testid="dash-csv"]')
        rows = list(csv.reader(io.StringIO(open(await (await dl.value).path(), encoding='utf-8-sig').read())))
        head, body = rows[0], rows[1:]
        sec = lambda name: [r for r in body if r[0] == name]
        kpi, daily, top, rate = sec('Key figure'), sec('Daily'), sec('Top'), sec('Rate')
        tag = f'{p} overview'
        if [float(r[4]) for r in kpi] != [round(v, 2) for v in screen['kpis']]: problems.append(f'{tag}: CSV figures {[r[4] for r in kpi]} vs screen {screen["kpis"]}')
        if len(daily) != 2 * len(table): problems.append(f'{tag}: CSV has {len(daily)} daily rows for {len(table)} days on screen')
        else:
            dates = await pg.evaluate("ds => ds.map(d => new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(d + 'T12:00:00')))", [r[3] for r in daily[::2]])
            for i, tr in enumerate(table):
                if not tr[0].startswith(dates[i]) or _num(tr[1]) != float(daily[2 * i][4]) or _num(tr[2]) != float(daily[2 * i + 1][4]):
                    problems.append(f'{tag}: day {i + 1} screen {tr} vs CSV {daily[2 * i][3:5]} {daily[2 * i + 1][4]}'); break
        if [(r[2], float(r[4])) for r in top] != [(t['head'], t['value']) for t in screen['tops']]: problems.append(f'{tag}: CSV top cards {[(r[2], r[4]) for r in top]} vs screen {screen["tops"]}')
        if [float(r[4]) for r in rate] != screen['rates']: problems.append(f'{tag}: CSV rates {[r[4] for r in rate]} vs screen {screen["rates"]}')
    # a records table: every filtered row, sorted as on screen, every column
    await goto(pg, f'{DEMO}?profile=vpn&lang=en#/users')
    await pg.click('[data-testid="records-status"] [data-value="active"]')
    await pg.fill('[data-testid="records-search"]', 'a'); await pg.wait_for_timeout(450)
    await pg.click('th button:has-text("Configs")'); await pg.wait_for_timeout(200)
    count = int(await pg.get_attribute('[data-testid="records-count"]', 'data-count'))
    names = await pg.evaluate("[...document.querySelectorAll('tbody tr')].map(r => r.querySelector('td .font-medium')?.textContent.trim())")
    cols = await pg.evaluate("[...document.querySelectorAll('thead th')].map(t => t.textContent.trim())")
    async with pg.expect_download() as dl:
        await pg.click('[data-testid="records-csv"]')
    rows = list(csv.reader(io.StringIO(open(await (await dl.value).path(), encoding='utf-8-sig').read())))
    if len(rows) - 1 != count: problems.append(f'records: CSV has {len(rows) - 1} rows, the filter shows {count}')
    if count <= 25: problems.append(f'records: the filter left {count} rows, too few to prove more than one page is exported')
    if [r[0] for r in rows[1:1 + len(names)]] != names: problems.append(f'records: CSV order {[r[0] for r in rows[1:4]]} vs screen {names[:3]}')
    if any(c not in ' '.join(rows[0]) for c in cols): problems.append(f'records: CSV header {rows[0]} misses a column of {cols}')
    si = rows[0].index('Status') if 'Status' in rows[0] else None
    if si is None or any(r[si] != 'Active' for r in rows[1:]): problems.append('records: CSV holds rows the status filter hides')
    await ctx.close()
    return problems


async def check_palette(browser, fault=None):
    problems = []
    ctx, pg = await open_page(browser, fault)
    await goto(pg, f'{DEMO}?profile=vpn&lang=en')
    async def run(key, query, expect, label):
        await pg.keyboard.press(key)
        try: await pg.wait_for_selector('[data-testid="palette"]', timeout=1500)
        except Exception: problems.append(f'{key} did not open the palette'); return
        focus = await pg.evaluate("document.activeElement?.dataset.testid")
        if focus != 'palette-input': problems.append(f'{key}: focus is on {focus}, not the input')
        await pg.keyboard.type(query); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(500)
        if await pg.locator('[data-testid="palette"]').count(): problems.append(f'{label}: the palette did not close')
        s = await pg.evaluate(STATE)
        if not expect(s): problems.append(f'{label}: state after the command {s}')
    await run('Control+k', 'retention', lambda s: s['hash'] == '#/retention', 'jump to a tab')
    await run('Meta+k', 'fernloft', lambda s: s['profile'] == 'ecommerce', 'switch business')
    await run('Control+k', 'dark theme', lambda s: s['theme'] == 'dark', 'switch theme')
    await run('Control+k', 'last 90', lambda s: s['range'] == '90' or s['hash'] == '#/retention', 'switch range')
    await nav(pg, '#/')
    if (await pg.evaluate(STATE))['range'] != '90': problems.append('switch range: the dashboard does not show 90 days')
    await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(200); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    if await pg.locator('[data-testid="palette"]').count(): problems.append('Esc did not close the palette')
    await ctx.close()
    return problems


async def check_theme_lang(browser, fault=None):
    problems = []
    # The theme follows the portfolio's saved one (same origin, same key) on first load.
    ctx, pg = await open_page(browser, fault, color_scheme='dark')
    await pg.goto(BASE + '/'); await pg.evaluate("localStorage.setItem('sm-theme', 'light')")
    await goto(pg, f'{DEMO}?profile=vpn&lang=en')
    if (await pg.evaluate(STATE))['theme'] != 'light': problems.append('the demo did not take the portfolio\'s saved light theme under a dark system')
    await pg.click('[data-testid="theme-toggle"]'); await pg.wait_for_timeout(150)
    t = await pg.evaluate("[document.documentElement.dataset.theme, localStorage.getItem('sm-theme')]")
    if t != ['dark', 'dark']: problems.append(f'theme switch: {t}')
    bg = await pg.evaluate("getComputedStyle(document.body).backgroundColor")
    await pg.click('[data-testid="lang-fa"]'); await pg.wait_for_timeout(400)
    m = await pg.evaluate("""() => { const R = s => document.querySelector(s)?.getBoundingClientRect(), rail = R('nav[aria-label] [data-nav="dashboard"]'), main = R('#main');
      const days = [...document.querySelectorAll('[data-testid="trend"] svg text')].filter(t => /^[۰-۹]+$/.test(t.textContent.trim()) && t.getAttribute('text-anchor') === 'middle');
      const fig = document.querySelector('[data-kpi] [data-value]')?.textContent || '';
      return { lang: document.documentElement.lang, dir: document.documentElement.dir, railRight: rail && main ? rail.left > main.left : null,
               axis: days.length > 1 ? days[0].getBoundingClientRect().left - days[days.length - 1].getBoundingClientRect().left : null,
               persian: /[۰-۹]/.test(fig) && !/[0-9]/.test(fig), url: location.search }; }""")
    if m['lang'] != 'fa' or m['dir'] != 'rtl': problems.append(f'Persian: lang {m["lang"]}, dir {m["dir"]}')
    if not m['railRight']: problems.append('Persian: the rail is not on the right (layout not mirrored)')
    if m['axis'] is None or m['axis'] <= 0: problems.append(f'Persian: the time axis does not run right to left (oldest-newest {m["axis"]})')
    if not m['persian']: problems.append('Persian: the figures are not in Persian digits')
    if 'lang=fa' not in m['url']: problems.append(f'Persian: the address does not say so ({m["url"]})')
    await pg.click('[data-testid="lang-en"]'); await pg.wait_for_timeout(300)
    back = await pg.evaluate("""() => { const rail = document.querySelector('[data-nav="dashboard"]').getBoundingClientRect(), main = document.getElementById('main').getBoundingClientRect();
      return [document.documentElement.dir, rail.left < main.left]; }""")
    if back != ['ltr', True]: problems.append(f'back to English: {back}')
    await ctx.close()
    return problems


async def check_overflow(browser, fault=None):
    problems = []
    for w in WIDTHS:
        for lang in ['en', 'fa']:
            ctx, pg = await open_page(browser, fault, viewport={'width': w, 'height': 900})
            await goto(pg, f'{DEMO}?profile=ecommerce&lang={lang}')
            e0, _ = await entity_paths(pg)
            pages = ['#/', '#/growth', '#/retention', '#/behaviour', e0, '#/health']
            for h in pages:
                await nav(pg, h)
                bad = await pg.evaluate(OVERFLOW)
                if bad: problems.append(f'{w}px {lang} {h}: {bad[:3]}')
            await ctx.close()
    return problems


async def check_phone_a11y(browser, fault=None):
    problems = []
    for w in [390, 320]:
        for scheme in ['light', 'dark']:
            for p in PROFILES:
                lang = 'fa' if p in ('ecommerce', 'print') else 'en'
                ctx, pg = await open_page(browser, fault, viewport={'width': w, 'height': 844}, is_mobile=True, has_touch=True, color_scheme=scheme, reduced_motion='reduce')
                await goto(pg, f'{DEMO}?profile={p}&lang={lang}&theme={scheme}')
                pages = ['#/', '#/growth', '#/health'] if p != 'vpn' else ['#/', '#/growth', '#/retention', '#/behaviour', '#/users', '#/servers', '#/health']
                for h in pages:
                    await nav(pg, h)
                    tag = f'{w}px {scheme} {p} {lang} {h}'
                    for t in (await pg.evaluate(CONTRAST))[:3]: problems.append(f'{tag}: "{t["text"]}" {t["ratio"]}:1 (needs {t["need"]})')
                    for t in (await pg.evaluate(TARGETS))[:3]: problems.append(f'{tag}: target "{t["t"]}" {t["w"]}x{t["h"]}')
                await ctx.close()
    return problems


HIDDEN = """window.__hidden = false;
Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get() { return window.__hidden; } });
Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get() { return window.__hidden ? 'hidden' : 'visible'; } });"""

async def _online(pg):
    return await pg.evaluate("[document.querySelector('[data-live=\"online\"]')?.dataset.value, document.querySelector('[data-testid=\"live-caption\"]')?.dataset.liveStatus]")

async def check_motion(browser, fault=None):
    problems = []
    # Normal motion: the figures move within a few seconds.
    ctx, pg = await open_page(browser, fault); await ctx.add_init_script(HIDDEN)
    await goto(pg, f'{DEMO}?profile=vpn&lang=en'); a = await _online(pg)
    for _ in range(12):
        await pg.wait_for_timeout(1000); b = await _online(pg)
        if b[0] != a[0]: break
    if b[0] == a[0] or b[1] != 'running': problems.append(f'normal motion: online {a} -> {b}, expected a change while running')
    # Hidden tab: paused, and nothing moves.
    await pg.evaluate("window.__hidden = true; document.dispatchEvent(new Event('visibilitychange'))"); await pg.wait_for_timeout(300)
    h0 = await _online(pg); await pg.wait_for_timeout(7000); h1 = await _online(pg)
    if h0[1] != 'paused' or h1[0] != h0[0]: problems.append(f'hidden tab: {h0} -> {h1}, expected paused and still')
    await pg.evaluate("window.__hidden = false; document.dispatchEvent(new Event('visibilitychange'))"); await pg.wait_for_timeout(300)
    if (await _online(pg))[1] != 'running': problems.append('visible again: the ticker did not resume')
    await ctx.close()
    # Reduce Motion: still from the start, and said so.
    ctx, pg = await open_page(browser, fault, reduced_motion='reduce')
    await goto(pg, f'{DEMO}?profile=vpn&lang=en'); r0 = await _online(pg); await pg.wait_for_timeout(8000); r1 = await _online(pg)
    if r0[1] != 'still' or r1[0] != r0[0]: problems.append(f'Reduce Motion: {r0} -> {r1}, expected still')
    if await pg.locator('[data-testid="live-dot"] .animate-ping').count(): problems.append('Reduce Motion: the live dot still pings')
    await ctx.close()
    return problems


PILL = r"""() => { const R = e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
  const card = document.querySelector('.work-desk .st-card'), btn = document.querySelector('.work-desk .st-lab-btn');
  if (!card || !btn) return null;
  const parts = [...card.querySelectorAll('.st-num, .st-title, .st-sum, .st-kpi, .st-kpi small, .st-status, .st-chips .chip')].map(e => ['text ' + e.className.split(' ')[0], R(e)]);
  parts.push(['logo tile', R(card.querySelector('.pj-logo'))]); const win = card.querySelector('.st-media .window, .st-media .phone'); if (win) parts.push(['screenshot', R(win)]);
  const cs = getComputedStyle(btn), c = getComputedStyle(card);
  return { card: R(card), radius: parseFloat(c.borderTopLeftRadius), btn: R(btn), parts, color: cs.color, pillBg: cs.backgroundColor, cardBg: c.backgroundColor,
           tint: c.getPropertyValue('--tint').trim(), href: btn.getAttribute('href'), name: btn.textContent.replace(/\s+/g, ' ').trim() }; }"""

def _hits(a, b, pad=0):
    return a[0] < b[2] + pad and a[2] > b[0] - pad and a[1] < b[3] + pad and a[3] > b[1] - pad

async def check_entry(browser, fault=None):
    problems, geo = [], []
    for scheme in ['light', 'dark']:
        for w in [1024, 1280, 1440, 1920, 2560]:
            ctx, pg = await open_page(browser, fault, viewport={'width': w, 'height': 900}, color_scheme=scheme)
            await pg.goto(BASE + '/projects/', wait_until='networkidle')
            await pg.evaluate("document.querySelector('.work-desk .st-card').scrollIntoView({ block: 'start' })"); await pg.wait_for_timeout(400)
            m = await pg.evaluate(PILL); tag = f'Work {w}px {scheme}'
            if not m: problems.append(f'{tag}: no Live Demo pill on the card'); await ctx.close(); continue
            c, b = m['card'], m['btn']; inset = min(b[0] - c[0], b[1] - c[1], c[2] - b[2], c[3] - b[3])
            if inset < 16: problems.append(f'{tag}: the pill is {inset:.0f}px from the card frame')
            for name, r in m['parts']:
                if _hits(b, r, 4): problems.append(f'{tag}: the pill falls on the {name}')
            hw = (b[2] - b[0], b[3] - b[1])
            if min(hw) < 44: problems.append(f'{tag}: the pill is {hw[0]:.0f}x{hw[1]:.0f}')
            under = _glow(m['cardBg'], m['tint'], [c[0], c[1], c[2] - c[0], c[3] - c[1]], b[0], b[1]); ratio = _cr(_over(m['color'], _over(m['pillBg'], under)), _over(m['pillBg'], under))
            if ratio < 4.5: problems.append(f'{tag}: label {ratio:.2f}:1 on the card')
            if not m['href'].startswith('/lab/admin/') or not m['name'].startswith('Live Demo'): problems.append(f'{tag}: link {m["href"]} "{m["name"]}"')
            geo.append({'width': w, 'theme': scheme, 'pill': [round(v) for v in b], 'card': [round(v) for v in c], 'inset': round(inset), 'size': [round(v) for v in hw], 'contrast': round(ratio, 2)})
            await ctx.close()
    # phones: a button under the card, and the case study's button; both open the demo
    for scheme in ['light', 'dark']:
        ctx, pg = await open_page(browser, fault, viewport={'width': 390, 'height': 844}, color_scheme=scheme, is_mobile=True, has_touch=True)
        await pg.goto(BASE + '/projects/', wait_until='networkidle')
        m = await pg.evaluate("""() => { const b = document.querySelector('.work-phone .fr-lab'), c = document.querySelector('.work-phone .fr-card'); if (!b) return null;
          const r = b.getBoundingClientRect(), k = c.getBoundingClientRect(), cs = getComputedStyle(b);
          return { w: r.width, h: r.height, below: r.top >= k.bottom, color: cs.color, top: cs.getPropertyValue('--button-gray-top').trim(), bottom: cs.getPropertyValue('--button-gray-bottom').trim(),
                   page: getComputedStyle(document.body).backgroundColor, href: b.getAttribute('href') }; }""")
        if not m: problems.append(f'Work 390px {scheme}: no Live Demo button')
        else:
            stops = [_over(s, m['page']) for s in (m['top'], m['bottom']) if s]
            worst = min(_cr(_over(m['color'], s), s) for s in stops) if stops else 0
            if min(m['w'], m['h']) < 44 or not m['below'] or worst < 4.5 or not (m['href'] or '').startswith('/lab/admin/'):
                problems.append(f'Work 390px {scheme}: {m["w"]:.0f}x{m["h"]:.0f}, below the card {m["below"]}, {worst:.2f}:1, link {m["href"]}')
        await pg.goto(BASE + '/projects/gozarx/', wait_until='networkidle')
        cs = await pg.evaluate("""() => { const a = document.querySelector('.case-lab a'); if (!a) return null; const r = a.getBoundingClientRect(); return { w: r.width, h: r.height, href: a.getAttribute('href'), name: a.textContent.trim() }; }""")
        if not cs or min(cs['w'], cs['h']) < 44 or not cs['href'].startswith('/lab/admin/'): problems.append(f'case study {scheme}: button {cs}')
        else:
            await pg.click('.case-lab a'); await pg.wait_for_load_state('networkidle')
            if not await pg.evaluate("location.pathname === '/lab/admin/' && !!document.querySelector('[data-page]')"): problems.append(f'case study {scheme}: the button did not open the demo')
        await ctx.close()
    if not fault: REPORT['pill'] = geo
    return problems


async def check_persist(browser, fault=None):
    problems = []
    ctx, pg = await open_page(browser, fault)
    await goto(pg, f'{DEMO}?profile=saas')
    s = await pg.evaluate(STATE)
    if s['profile'] != 'saas' or 'profile=saas' not in s['search']: problems.append(f'?profile=saas gave {s["profile"]} ({s["search"]})')
    await goto(pg, DEMO)
    if (await pg.evaluate(STATE))['profile'] != 'saas': problems.append('the business is not remembered across visits')
    await pg.click('[data-testid="business-picker"]'); await pg.click('[data-profile-option="education"]'); await pg.wait_for_function(SETTLED)
    s = await pg.evaluate(STATE)
    if s['profile'] != 'education' or 'profile=education' not in s['search']: problems.append(f'after picking: {s["profile"]}, address {s["search"]}')
    await pg.click('[data-testid="range"] [data-value="30"]'); await pg.wait_for_function(SETTLED)
    await goto(pg, f'{DEMO}?lang=fa')
    s = await pg.evaluate(STATE)
    if s['range'] != '30': problems.append(f'the range is not remembered ({s["range"]})')
    if s['lang'] != 'fa' or s['profile'] != 'education': problems.append(f'?lang=fa gave {s["lang"]}, business {s["profile"]}')
    await goto(pg, DEMO)
    if (await pg.evaluate(STATE))['lang'] != 'fa': problems.append('the language is not remembered')
    saved = await pg.evaluate("localStorage.getItem('sm-theme')")
    await goto(pg, f'{DEMO}?theme=dark')
    if (await pg.evaluate(STATE))['theme'] != 'dark' or await pg.evaluate("localStorage.getItem('sm-theme')") != saved: problems.append('?theme=dark did not apply, or it was saved')
    await ctx.close()
    return problems


CLS = """window.__shift = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__shift += e.value; }).observe({ type: 'layout-shift', buffered: true });"""

async def check_layout(browser, fault=None):
    problems, seen = [], {}
    for w in [1440, 390]:
        ctx, pg = await open_page(browser, fault, viewport={'width': w, 'height': 900}, is_mobile=w < 721, has_touch=w < 721)
        await ctx.add_init_script(CLS)
        await goto(pg, f'{DEMO}?profile=vpn&lang=en'); await pg.wait_for_timeout(1800)
        steps = [('load', None), ('range', lambda: pg.click('[data-testid="range"] [data-value="30"]')),
                 ('business', lambda: _pick(pg, 'print')), ('tab', lambda: nav(pg, '#/growth'))]
        for name, act in steps:
            if act:
                await pg.evaluate('window.__shift = 0'); await act(); await pg.wait_for_timeout(1600)
            v = await pg.evaluate('window.__shift'); seen[f'{w}px {name}'] = round(v, 4)
            if v > 0.01: problems.append(f'{w}px {name}: layout shift {v:.3f}')
        await ctx.close()
    if not fault: REPORT['layout_shift'] = seen
    return problems

async def _pick(pg, profile):
    await pg.click('[data-testid="business-picker"]'); await pg.click(f'[data-profile-option="{profile}"]')


LAZY = ('Growth-', 'Retention-', 'Behaviour-', 'Records-', 'Health-')

async def check_bundle(browser, fault=None):
    problems, chunks = [], []
    ctx, pg = await open_page(browser, fault)
    bodies = []
    async def keep(resp):
        if resp.request.resource_type in ('script', 'stylesheet'):
            try: bodies.append((resp.url, resp.request.resource_type, await resp.body()))
            except Exception: pass
    pg.on('response', lambda r: asyncio.ensure_future(keep(r)))
    await goto(pg, f'{DEMO}?profile=vpn&lang=en'); await pg.wait_for_timeout(500)
    js = 0
    for url, kind, body in bodies:
        gz = len(gzip.compress(body, 9)); name = url.rsplit('/', 1)[-1]
        chunks.append({'file': name, 'type': kind, 'raw': len(body), 'gzip': gz})
        if kind == 'script': js += gz
        if name.startswith(LAZY): problems.append(f'{name} loads on first render (it belongs to a later page)')
    if js > 250 * 1024: problems.append(f'first-load JS is {js / 1024:.1f} KB gzipped (budget 250)')
    if not fault: REPORT['first_load'] = {'chunks': chunks, 'js_gzip': js}
    await ctx.close()
    return problems


FOCUS = r"""() => { const a = document.activeElement; if (!a || a === document.body) return null; const cs = getComputedStyle(a);
  const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || (cs.boxShadow && cs.boxShadow !== 'none');
  return { id: a.dataset.testid || a.dataset.nav || a.id || a.getAttribute('role') || a.tagName, name: (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30), ring }; }"""

async def check_keyboard(browser, fault=None):
    problems = []
    ctx, pg = await open_page(browser, fault)
    await goto(pg, f'{DEMO}?profile=vpn&lang=en')
    await pg.keyboard.press('Tab')
    f = await pg.evaluate(FOCUS)
    if not f or f['id'] != 'skip-link': problems.append(f'the first Tab lands on {f}, not the skip link')
    reached, noring = set(), []
    for _ in range(45):
        await pg.keyboard.press('Tab'); f = await pg.evaluate(FOCUS)
        if not f: continue
        reached.add(f['id'])
        if not f['ring']: noring.append(f['name'] or f['id'])
    want = {'business-picker', 'palette-open', 'lang-en', 'live-dot', 'theme-toggle', 'dashboard', 'records-0', 'records-1', 'health', 'radio', 'dash-csv', 'group', 'chart-table-toggle'}
    if want - reached: problems.append(f'Tab never reaches {sorted(want - reached)}')
    if noring: problems.append(f'no visible focus ring on {noring[:4]}')
    # the controls answer their keys
    await pg.focus('[data-testid="business-picker"]'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(150)
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter'); await pg.wait_for_function(SETTLED)
    if (await pg.evaluate(STATE))['profile'] != 'saas': problems.append('the Business picker does not work by keyboard')
    await pg.focus('[data-testid="range"] [aria-checked="true"]'); await pg.keyboard.press('ArrowRight'); await pg.wait_for_function(SETTLED)
    if (await pg.evaluate(STATE))['range'] != '30': problems.append('the range does not step with the arrow keys')
    await pg.focus('[data-chart="trend"]'); await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(150)
    if not await pg.locator('[data-testid="chart-tooltip"]').count(): problems.append('the chart does not answer the arrow keys')
    await ctx.close()
    return problems


# The name a screen reader announces, by the accessible-name rules that matter here: aria-labelledby, aria-label, a
# <label>, the text inside (aria-hidden and display:none subtrees left out; an SVG counts only by its label or <title>),
# then title/placeholder/alt. Every visible control, dialog, image, tab panel and table must end up with one.
NAMES = r"""() => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; };
  const text = n => {
    if (n.nodeType === 3) return n.textContent;
    if (n.nodeType !== 1 || n.getAttribute('aria-hidden') === 'true' || getComputedStyle(n).display === 'none') return '';
    if (n instanceof SVGElement) { const t = n.querySelector('title'); return n.getAttribute('aria-label') || (t ? t.textContent : ''); }
    return [...n.childNodes].map(text).join('');
  };
  const name = e => {
    const lb = e.getAttribute('aria-labelledby');
    if (lb) return lb.split(/\s+/).map(id => { const r = document.getElementById(id); return r ? text(r) : ''; }).join(' ').trim();
    const al = (e.getAttribute('aria-label') || '').trim(); if (al) return al;
    if (e.labels && e.labels.length) { const l = [...e.labels].map(text).join(' ').trim(); if (l) return l; }
    const t = text(e).replace(/\s+/g, ' ').trim(); if (t) return t;
    return (e.getAttribute('title') || e.getAttribute('placeholder') || e.getAttribute('alt') || '').trim();
  };
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [tabindex="0"], [role=button], [role=link], [role=tab], [role=radio], '
    + '[role=checkbox], [role=switch], [role=menuitem], [role=menuitemradio], [role=option], [role=combobox], [role=listbox], [role=tablist], '
    + '[role=radiogroup], [role=menu], [role=dialog], [role=img], [role=tabpanel], table';
  const all = [...document.querySelectorAll(sel)].filter(e => vis(e) && !e.closest('[inert], [aria-hidden="true"]'));
  return { seen: all.length, unnamed: all.filter(e => !name(e)).map(e => e.outerHTML.replace(/\s+/g, ' ').slice(0, 110)) };
}"""

async def check_names(browser, fault=None):
    problems, seen = [], 0
    for w, mobile in [(1440, False), (390, True)]:
        for lang in ['en', 'fa']:
            ctx, pg = await open_page(browser, fault, viewport={'width': w, 'height': 900}, is_mobile=mobile, has_touch=mobile)
            for p in PROFILES:
                await goto(pg, f'{DEMO}?profile={p}&lang={lang}')
                e0, e1 = await entity_paths(pg)
                for h in ['#/', '#/growth', '#/retention', '#/behaviour', e0, e1, '#/health']:
                    await nav(pg, h)
                    r = await pg.evaluate(NAMES); seen += r['seen']
                    for u in r['unnamed'][:2]: problems.append(f'{w}px {p} {lang} {h}: no name on {u}')
                # the overlays: the record dialog (a row of the second table), the palette, the picker, the Demo menu
                await nav(pg, e1)
                await pg.locator('[data-testid="records-cards"] button' if mobile else 'tbody tr[tabindex="0"]').first.click()
                for opener in [None, '[data-testid="palette-open"]', '[data-testid="business-picker"]', '#demo-menu-btn']:
                    # the visible one: the palette's opener is drawn twice, the desktop copy hidden on phones
                    if opener: await pg.locator(opener).locator('visible=true').first.click()
                    await pg.wait_for_timeout(250)
                    r = await pg.evaluate(NAMES); seen += r['seen']
                    for u in r['unnamed'][:2]: problems.append(f'{w}px {p} {lang} {opener or "record dialog"}: no name on {u}')
                    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
            await ctx.close()
    if not fault: REPORT['names_seen'] = seen
    return problems


# Text that the reading direction or the room it has can garble without any error: measured, not read.
# 1. A figure and the share or note after it (BarList) are two boxes, apart, in reading order: as one inline run, in
#    Persian «۹۸۱» and «۸۷٫۳٪ …» were reordered into one number, «۹۸۱۸۷٫۳٪».
# 2. The radar's axis labels stay inside the figure, off its outer ring and off each other: as SVG text, a long rate name
#    ("Proofs within 24h", «حضور در کلاس زنده») ran past the frame and was cut off.
# 3. An "up / total" pair reads left to right in both languages: its first character is left of its last.
LABELS = r"""() => {
  const out = [], rtl = document.documentElement.dir === 'rtl', R = e => e.getBoundingClientRect();
  const say = e => (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  for (const v of document.querySelectorAll('[data-barlist-value]')) {
    const [a, ...rest] = [...v.children].map(R);
    if (!a || !a.width) continue;
    for (const b of rest) {
      const gap = rtl ? a.left - b.right : b.left - a.right;
      if (gap < 3) out.push(`list value "${say(v)}": its parts are ${gap.toFixed(1)}px apart in reading order (needs 3)`);
    }
  }
  for (const fig of document.querySelectorAll('[data-chart="radar"]')) {
    const box = R(fig), ring = R(fig.querySelector('svg circle'));
    const cx = ring.left + ring.width / 2, cy = ring.top + ring.height / 2, rad = ring.width / 2;
    const labels = [...fig.querySelectorAll('[data-radar-label]')];
    labels.forEach((l, i) => {
      const r = R(l);
      if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1)
        out.push(`radar label "${say(l)}" leaves the figure (${Math.round(r.left - box.left)}..${Math.round(r.right - box.left)} of ${Math.round(box.width)}px)`);
      const nx = Math.max(r.left, Math.min(cx, r.right)), ny = Math.max(r.top, Math.min(cy, r.bottom));
      if (Math.hypot(nx - cx, ny - cy) < rad - 1) out.push(`radar label "${say(l)}" falls on the chart`);
      for (const m of labels.slice(i + 1)) { const s = R(m); if (r.left < s.right && s.left < r.right && r.top < s.bottom && s.top < r.bottom) out.push(`radar labels "${say(l)}" and "${say(m)}" overlap`); }
    });
  }
  for (const p of document.querySelectorAll('[data-pair]')) {
    const t = [...p.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!t) continue;
    const s = t.textContent, i0 = s.search(/\S/), i1 = s.length - 1 - [...s].reverse().join('').search(/\S/);
    const at = i => { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); return r.getBoundingClientRect(); };
    if (at(i0).left >= at(i1).left) out.push(`pair "${say(p)}" reads right to left`);
  }
  return out;
}"""

async def check_labels(browser, fault=None):
    problems = []
    for w, mobile, pages in [(1440, False, ['#/', '#/growth', '#/behaviour', '#/health']), (390, True, ['#/', '#/growth', '#/behaviour'])]:
        for lang in ['en', 'fa']:
            ctx, pg = await open_page(browser, fault, viewport={'width': w, 'height': 900}, is_mobile=mobile, has_touch=mobile)
            for p in PROFILES:
                await goto(pg, f'{DEMO}?profile={p}&lang={lang}')
                for h in pages:
                    await nav(pg, h)
                    for x in (await pg.evaluate(LABELS))[:2]: problems.append(f'{w}px {p} {lang} {h}: {x}')
            await ctx.close()
    return problems


# ------------------------------------------------------------------------------------------------------------- runner
FAULTS = {
    'hosts': Fault('a beacon to another host and a console error', init="addEventListener('DOMContentLoaded', () => { fetch('https://example.com/beacon').catch(() => {}); console.error('injected error'); });"),
    'render': Fault('a clock that returns NaN for the hour', init="Date.prototype.getHours = function () { return NaN; };"),
    'csv': Fault('an exporter that drops the last row', init="""(() => { const B = window.Blob; window.Blob = function (parts, opts) {
        if (opts && /csv/.test(opts.type || '')) parts = parts.map(p => typeof p === 'string' ? p.replace(/[^\\r\\n]*\\r\\n$/, '') : p); return new B(parts, opts); };
        window.Blob.prototype = B.prototype; })();"""),
    'palette': Fault('a page that swallows Ctrl/Cmd+K', init="addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyK' || e.key === 'k')) e.stopImmediatePropagation(); }, true);"),
    'theme_lang': Fault('a stylesheet that pins the page left to right', css='html[dir="rtl"] body { direction: ltr !important; }'),
    'overflow': Fault('a 130vw-wide element under the page title', css='[data-page] > :first-child::after { content: ""; display: block; flex: none; width: 130vw; height: 1px; }'),
    'phone_a11y': Fault('faded secondary text and a 32px theme button on phones', css='@media (max-width: 720px) { [data-testid="theme-toggle"] { width: 32px !important; height: 32px !important; min-width: 0 !important; min-height: 0 !important; } .text-content-muted { color: rgb(150 150 150) !important; } }'),
    'motion': Fault('a ticker that ignores Reduce Motion', init="(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /prefers-reduced-motion/.test(q) ? mm('(max-width: 1px)') : mm(q); })();"),
    'entry': Fault('the pill moved onto the card title', css='.st-lab-btn { top: 200px !important; right: auto !important; left: 120px !important; }'),
    'persist': Fault('storage that forgets every write', init="Storage.prototype.setItem = function () {};"),
    'layout': Fault('a notice that pushes the page down after load', init="setTimeout(() => { const m = document.getElementById('main'); if (m) m.prepend(Object.assign(document.createElement('div'), { style: 'height:64px' })); }, 1200);"),
    'bundle': Fault('a 300 KB script of noise added to the first load', routes=[
        ('**/lab/admin/?*', lambda html: html.replace('</head>', '<script src="./assets/zz-noise.js"></script></head>')),
        ('**/lab/admin/assets/zz-noise.js', 'var noise = "' + base64.b64encode(os.urandom(300 * 1024)).decode() + '";')]),
    'keyboard': Fault('focus rings removed', css=':focus-visible { outline: none !important; box-shadow: none !important; } *:focus { box-shadow: none !important; outline: none !important; }'),
    'names': Fault('icon-only buttons stripped of their labels', init="""new MutationObserver(() => document.querySelectorAll('[data-testid="theme-toggle"], [data-testid="dash-csv"]')
        .forEach(e => { e.removeAttribute('aria-label'); e.removeAttribute('title'); e.querySelectorAll('span').forEach(s => s.remove()); }))
        .observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label', 'title'] });"""),
    'labels': Fault('list figures as one inline run, radar labels unwrapped, pairs set right to left', css=
        '[data-barlist-value] { display: inline !important; } [data-radar-label] { max-width: none !important; white-space: nowrap !important; } '
        '[data-pair] { direction: rtl !important; }'),
}

CHECKS = [('hosts', check_hosts), ('render', check_render), ('csv', check_csv), ('palette', check_palette), ('theme_lang', check_theme_lang),
          ('overflow', check_overflow), ('phone_a11y', check_phone_a11y), ('motion', check_motion), ('entry', check_entry),
          ('persist', check_persist), ('layout', check_layout), ('bundle', check_bundle), ('keyboard', check_keyboard),
          ('names', check_names), ('labels', check_labels)]

async def main():
    results, failed = [], 0
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for name, fn in CHECKS:
            if ONLY and name not in ONLY: continue
            row = {'check': name}
            if PROVE:
                fault = FAULTS[name]
                try: broken = await fn(browser, fault)
                except Exception as e: broken = [f'crashed: {type(e).__name__}: {str(e).splitlines()[0][:160]}']
                row.update(fault=fault.what, broken=broken[:4], proven=bool(broken))
                print(f'[prove] {name:<10} on {fault.what}: {"FAILS as it should" if broken else "PASSES - the check cannot see this fault"}')
                for b in broken[:3]: print(f'          {b}')
                if not broken: failed += 1
            try: probs = await fn(browser, None)
            except Exception as e: probs = [f'crashed: {type(e).__name__}: {str(e).splitlines()[0][:200]}']
            row['problems'] = probs; row['pass'] = not probs
            print(f'[check] {name:<10} {"PASS" if not probs else "FAIL"}')
            for pr in probs[:12]: print(f'          {pr}')
            if probs: failed += 1
            results.append(row)
        await browser.close()
    if 'requests_on_load' in REPORT:
        print(f'\nRequests on the first load of /lab/admin/ ({len(REPORT["requests_on_load"])}):')
        for r in REPORT['requests_on_load']: print(f'  {r["type"]:<10} {r["url"]}')
    if 'first_load' in REPORT:
        print(f'\nFirst load, JS {REPORT["first_load"]["js_gzip"] / 1024:.1f} KB gzipped:')
        for c in REPORT['first_load']['chunks']: print(f'  {c["file"]:<36} {c["type"]:<10} raw {c["raw"] / 1024:7.1f} KB  gzip {c["gzip"] / 1024:6.1f} KB')
    print(f'\n== admin demo: {len(results)} checks{" proven on broken pages, then" if PROVE else ""} run: {failed} failure(s)')
    if JSON_OUT:
        with open(JSON_OUT, 'w', encoding='utf-8') as f: json.dump({'results': results, 'report': REPORT}, f, ensure_ascii=False, indent=1)
    sys.exit(1 if failed else 0)

asyncio.run(main())
