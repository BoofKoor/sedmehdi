"""The admin demo's single-file preview (npm run demo:single), opened from disk.

The file has to work with nothing beside it: every business, in both languages and both themes, on every page, with a
record's dialog, the command palette, the business picker, the demo menu, a theme switch and a CSV download, and with
zero console errors, zero page errors, zero failed requests and no request for anything but the file itself and data:
and blob: URLs. The figures have to draw (five on the dashboard) in the fonts the page names (DM Sans; Vazirmatn in
Persian), and the guard's pattern has to reach the page with its backslashes (scripts/demo-single.mjs writes it with
String.raw).

--prove first runs the same checks on two broken copies, where they must FAIL: one without the guard (Vite's preload
links for a lazy page's chunks, and the Persian font preloads, then ask for files that are not beside the file), and
one whose pattern lost its backslashes on the way into the page.

Usage: npm run demo:single && python3 scripts/qa/check_demo_single.py "$PWD/preview/spindle-admin-demo.html" [--prove]
"""
import asyncio, json, os, re, shutil, sys, tempfile, time
from playwright.async_api import async_playwright

FILE = os.path.abspath(next(a for a in sys.argv[1:] if not a.startswith('--')))
PROVE = '--prove' in sys.argv
PROFILES = ['hosting', 'saas', 'ecommerce', 'education', 'print']
PATTERN = r'var FILE = /\.(?:js|css|woff2)(?:[?#]|$)/i'
SETTLED = "() => !document.querySelector('[data-state=\"loading\"]') && !!document.querySelector('[data-page]')"
FONTS = "(fam) => [...document.fonts].filter(f => f.family.replace(/\"/g, '') === fam).map(f => f.status)"


async def walk(browser, path, short=False):
    """Every problem the file shows, opened from `path`: requests, errors, and what failed to draw."""
    problems, url = [], 'file://' + path
    ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    async def gate(route):
        u = route.request.url
        if u.split('#')[0].split('?')[0] == url or u.startswith('data:') or u.startswith('blob:'): await route.continue_()
        else: problems.append(f'asks for {u[:120]}'); await route.abort()
    await ctx.route('**/*', gate)
    pg = await ctx.new_page()
    pg.on('console', lambda m: m.type == 'error' and problems.append(f'console: {m.text[:160]}'))
    pg.on('pageerror', lambda e: problems.append(f'page error: {str(e)[:160]}'))
    pg.on('requestfailed', lambda r: problems.append(f'failed request: {r.url[:120]} ({r.failure})'))
    # routing may not see file: requests, so every request is looked at as it is made as well
    pg.on('request', lambda r: r.url.split('#')[0].split('?')[0] != url and not r.url.startswith(('data:', 'blob:')) and problems.append(f'asks for {r.url[:120]}'))
    html = open(path, encoding='utf-8').read()
    if PATTERN not in html: problems.append("the guard's pattern did not reach the page as written")
    for lang in ['en', 'fa']:
        for i, prof in enumerate(PROFILES[:1] if short else PROFILES):
            for theme in ['light'] if short else ['light', 'dark']:
                tag = f'{prof} {lang} {theme}'
                await pg.goto(f'{url}?profile={prof}&lang={lang}&theme={theme}')
                await pg.wait_for_function(SETTLED, timeout=15000); await pg.evaluate('document.fonts.ready')
                kpis = await pg.evaluate("document.querySelectorAll('[data-testid=\"kpis\"] > [data-kpi]').length")
                if kpis != 5: problems.append(f'{tag}: {kpis} figures on the dashboard, not 5')
                for fam in ['DM Sans'] + (['Vazirmatn'] if lang == 'fa' else []):
                    if 'loaded' not in await pg.evaluate(FONTS, fam): problems.append(f'{tag}: {fam} did not load')
                pages = await pg.evaluate("[...document.querySelectorAll('[data-nav]')].map(a => a.getAttribute('href')).filter(Boolean)")
                for h in dict.fromkeys(['#/', '#/growth', '#/retention', '#/behaviour'] + pages + ['#/health']):
                    await pg.evaluate(f'location.hash = {json.dumps(h)}')
                    await pg.wait_for_function(SETTLED, timeout=15000); await pg.wait_for_timeout(80)
                    if await pg.locator('[data-state="error"]').count(): problems.append(f'{tag} {h}: the page shows its error state')
                    rows = pg.locator('tbody tr[tabindex="0"]')
                    if await rows.count():  # a record's dialog
                        await rows.first.click(); await pg.wait_for_timeout(150)
                        if not await pg.locator('[role="dialog"]').count(): problems.append(f'{tag} {h}: no dialog for a record')
                        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(100)
        # once per language: the overlays, a theme switch and a CSV of the dashboard
        await pg.evaluate("location.hash = '#/'"); await pg.wait_for_function(SETTLED, timeout=15000)
        for opener in ['[data-testid="palette-open"]', '[data-testid="business-picker"]', '#demo-menu-btn']:
            await pg.locator(opener).locator('visible=true').first.click(); await pg.wait_for_timeout(200)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(120)
        before = await pg.evaluate('document.documentElement.dataset.theme')
        await pg.locator('[data-testid="theme-toggle"]').locator('visible=true').first.click(); await pg.wait_for_timeout(200)
        if await pg.evaluate('document.documentElement.dataset.theme') == before: problems.append(f'{lang}: the theme did not switch')
        async with pg.expect_download() as dl:
            await pg.click('[data-testid="dash-csv"]')
        if not (await (await dl.value).path()): problems.append(f'{lang}: no CSV')
    await ctx.close()
    return list(dict.fromkeys(problems))


def broken(name, edit):
    """A copy of the file with one thing broken, in a folder of its own (so nothing it asks for is there either)."""
    out = os.path.join(tempfile.mkdtemp(), name)
    with open(out, 'w', encoding='utf-8') as f: f.write(edit(open(FILE, encoding='utf-8').read()))
    return out


async def main():
    t, failed = time.time(), 0
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        if PROVE:
            faults = [
                ('no guard', broken('no-guard.html', lambda s: re.sub(r'<script id="single-file-guard">[\s\S]*?</script>\s*', '', s, count=1))),
                ('the pattern without its backslashes', broken('no-backslash.html', lambda s: s.replace(PATTERN, PATTERN.replace('\\', '')))),
            ]
            for what, path in faults:
                probs = await walk(browser, path, short=True)
                print(f'[prove] on a copy with {what}: {"FAILS as it should" if probs else "PASSES - the check cannot see this fault"}')
                for pr in probs[:3]: print(f'          {pr}')
                if not probs: failed += 1
                shutil.rmtree(os.path.dirname(path), ignore_errors=True)
        probs = await walk(browser, FILE)
        print(f'[check] single file {"PASS" if not probs else "FAIL"}')
        for pr in probs[:20]: print(f'          {pr}')
        if probs: failed += 1
        await browser.close()
    size = os.path.getsize(FILE) / 1024
    print(f'\n== demo single file ({size:.0f} KB): {failed} failure(s) in {time.time() - t:.0f}s')
    sys.exit(1 if failed else 0)

asyncio.run(main())
