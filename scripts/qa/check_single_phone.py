"""The single-file preview on a phone (offline): after each hash change the page renders, the tab bar marks the right
section, and the back button appears only in a case study. The shell's bar and tab bar are not re-rendered by the hash
router, so this is the router's job; v0.11 left Home marked everywhere and had no back button."""
import asyncio, sys
from playwright.async_api import async_playwright
FILE = sys.argv[1]
EXPECT = [('#/', 'Home', False), ('#/projects/', 'Work', False), ('#/projects/gozarx/', 'Work', True), ('#/projects/spindle/', 'Work', True), ('#/about/', 'About', False), ('#/resume/', 'Résumé', False), ('#/contact/', 'Contact', False)]
async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); pg = await ctx.new_page()
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(500)
        for h, tab, back in EXPECT:
            await pg.evaluate(f"location.hash = '{h}'")
            try: await pg.wait_for_function(f"document.documentElement.dataset.route === '{h[1:]}'", timeout=3000)
            except Exception: fails.append(f'{h}: the router did not signal the rendered page'); continue
            cur = await pg.evaluate("[...document.querySelectorAll('.tabbar a[aria-current=page]')].map(a => a.textContent.trim() || a.getAttribute('aria-label'))")
            bk = await pg.evaluate("(() => { const b = document.querySelector('.back-btn'); return !!b && getComputedStyle(b).display !== 'none'; })()")
            if cur != [tab]: fails.append(f'{h}: current tab {cur}, expected {tab}')
            if bk != back: fails.append(f'{h}: back button shown={bk}, expected {back}')
        await b.close()
    print(f'== single file on a phone: {len(fails)} failures')
    for f in fails: print('  FAIL', f)
    sys.exit(1 if fails else 0)
asyncio.run(main())
