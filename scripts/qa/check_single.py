# Offline test of the single-file preview with every network request blocked: all routes, titles, h1s,
# aria-current, fonts, back button, theme toggle and persistence, skip link. Absolute paths required.
# Usage: python3 scripts/qa/check_single.py "$PWD/preview/sed-mehdi-preview.html" "$PWD/dist"
import asyncio, sys, re, glob, os, html
from playwright.async_api import async_playwright
FILE = sys.argv[1]; DIST = sys.argv[2] if len(sys.argv) > 2 else None

def expected():
    exp = {}
    for p in glob.glob(DIST + '/**/*.html', recursive=True):
        rel = os.path.relpath(p, DIST).replace(os.sep, '/')
        # dist/lab/ holds the live demos (the admin panel at /lab/admin/): apps with their own HTML, which
        # scripts/single-file.mjs leaves out on purpose. Its checks live in check_admin_demo.py.
        if rel.startswith('lab/'): continue
        route = '404' if rel == '404.html' else '/' + re.sub(r'index\.html$', '', rel)
        s = open(p, encoding='utf-8').read()
        h1 = re.sub(r'<[^>]+>', '', re.search(r'<h1[^>]*>([\s\S]*?)</h1>', s).group(1)).strip()
        exp[route] = (html.unescape(h1), html.unescape(re.search(r'<title>([\s\S]*?)</title>', s).group(1)))
    return exp

async def main():
    fails, blocked = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vw, vh in ([(1440, 900), (390, 844)] if DIST else [(1440, 900)]):
            ctx = await b.new_context(viewport={'width': vw, 'height': vh})
            async def gate(route):
                u = route.request.url
                if u.startswith('file://') or u.startswith('data:'): await route.continue_()
                else: blocked.append(u); await route.abort()
            await ctx.route('**/*', gate)
            page = await ctx.new_page(); errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            await page.goto('file://' + FILE); await page.wait_for_timeout(600)
            if not DIST: break
            exp = expected()
            routes = await page.evaluate("[...document.querySelectorAll('template[data-route]')].map(t => t.dataset.route)")
            if sorted(routes) != sorted(exp): fails.append(f'routes differ: {sorted(routes)} vs {sorted(exp)}')
            for r in routes:
                await page.evaluate(f"location.hash = {repr('#/does-not-exist/' if r == '404' else '#' + r)}")
                await page.wait_for_function(f"document.documentElement.dataset.route === {repr('/does-not-exist/' if r == '404' else r)}", timeout=5000)
                m = await page.evaluate(r'''() => ({
                  h1: document.querySelector('main h1').textContent.trim(), title: document.title,
                  current: [...document.querySelectorAll('.nav a[aria-current="page"]')].map(a => a.getAttribute('href')),
                  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                  font: document.fonts.check('300 16px "DM Sans"') && [...document.fonts].some(f => f.family.replace(/"/g,'') === 'DM Sans' && f.status === 'loaded'),
                  small: [...document.querySelectorAll('a, button')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && !e.classList.contains('skip') && !e.closest('.prose') && (b.width < 44 || b.height < 44); }).map(e => e.textContent.trim().slice(0, 20)),
                  deadLinks: [...document.querySelectorAll('a[href^="/"], img[src^="/"]')].map(a => a.getAttribute('href') || a.getAttribute('src')),
                })''')
                want_h1, want_title = exp[r]
                tag = f'{vw}px {r}'
                if m['h1'] != want_h1: fails.append(f'{tag}: h1 {m["h1"]!r} != {want_h1!r}')
                if m['title'] != want_title: fails.append(f'{tag}: title {m["title"]!r} != {want_title!r}')
                want_cur = ['#/projects/'] if r.startswith('/projects/') else (['#' + r] if r in ('/about/', '/resume/', '/contact/') else [])
                if m['current'] != want_cur: fails.append(f'{tag}: aria-current {m["current"]} != {want_cur}')
                if m['overflow'] > 0: fails.append(f'{tag}: overflow {m["overflow"]}')
                if not m['font']: fails.append(f'{tag}: DM Sans not loaded')
                if m['small']: fails.append(f'{tag}: small targets {m["small"]}')
                if m['deadLinks']: fails.append(f'{tag}: links still pointing at site paths {m["deadLinks"]}')
            # back button, theme toggle and persistence, skip link
            await page.evaluate("location.hash = '#/about/'"); await page.wait_for_function("document.documentElement.dataset.route === '/about/'", timeout=5000)
            await page.evaluate("location.hash = '#/projects/gozarx/'"); await page.wait_for_function("document.documentElement.dataset.route === '/projects/gozarx/'", timeout=5000)
            await page.go_back(); await page.wait_for_function("document.documentElement.dataset.route === '/about/'", timeout=5000)
            h1 = await page.evaluate("document.querySelector('main h1').textContent.trim()")
            if h1 != 'About': fails.append(f'{vw}px back button: h1 {h1!r}, expected About')
            q = "[document.documentElement.getAttribute('data-theme'), document.getElementById('theme').getAttribute('role'), document.getElementById('theme').getAttribute('aria-checked'), document.getElementById('theme').getAttribute('aria-label')]"
            before = await page.evaluate(q)
            await page.click('#theme'); await page.wait_for_timeout(900)   # the change runs inside a view transition
            after = await page.evaluate(q)
            if not (before == [None, 'switch', 'false', 'Dark theme'] and after == ['dark', 'switch', 'true', 'Dark theme']): fails.append(f'{vw}px theme switch: {before} -> {after}')
            await page.reload(); await page.wait_for_timeout(300)
            kept = await page.evaluate("document.documentElement.getAttribute('data-theme')")
            if kept != 'dark': fails.append(f'{vw}px theme not kept after reload: {kept!r}')
            await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await page.wait_for_timeout(60)
            sk = await page.evaluate("[document.activeElement.id, location.hash]")
            if sk[0] != 'main' or sk[1] != '#/about/': fails.append(f'{vw}px skip link: focus {sk[0]!r}, hash {sk[1]!r}')
            if errs: fails.append(f'{vw}px JS errors: {errs[:3]}')
            await ctx.close()
        await b.close()
    print(f'blocked network requests: {len(blocked)}', sorted({re.sub(r"^(https?://[^/]+).*", r"\1", u) for u in blocked}))
    if DIST: print(f'failures: {len(fails)}'); [print('  FAIL', f) for f in fails]

asyncio.run(main())
