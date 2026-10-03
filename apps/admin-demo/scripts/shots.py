"""Screenshots of the admin demo for docs/admin-demo/screens/ (the report's figures).

Usage: python3 -m http.server 4321 --directory dist &
       python3 apps/admin-demo/scripts/shots.py http://localhost:4321 docs/admin-demo/screens [name,name…]
       (the optional third argument retakes only the named shots)
"""
import asyncio, os, sys

from playwright.async_api import async_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4321').rstrip('/')
OUT = sys.argv[2] if len(sys.argv) > 2 else 'docs/admin-demo/screens'
ONLY = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
DEMO = BASE + '/lab/admin/'
PROFILES = ['vpn', 'saas', 'ecommerce', 'education', 'print']
SETTLED = "() => !document.querySelector('[data-state=\"loading\"]') && !!document.querySelector('[data-page]')"


async def shot(browser, name, url, w, h, scheme, then=None, mobile=False):
    if ONLY and name not in ONLY: return
    ctx = await browser.new_context(viewport={'width': w, 'height': h}, color_scheme=scheme, is_mobile=mobile, has_touch=mobile, device_scale_factor=1)
    pg = await ctx.new_page()
    await pg.goto(url, wait_until='networkidle')
    if '/lab/admin/' in url: await pg.wait_for_function(SETTLED)
    await pg.wait_for_timeout(1600)  # count-ups and the chart's entry wipe have finished
    if then: await then(pg)
    path = os.path.join(OUT, name + '.png')
    await pg.screenshot(path=path)
    await ctx.close()
    print('wrote', path)


async def palette(pg):
    await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(250); await pg.keyboard.type('fern'); await pg.wait_for_timeout(300)

async def mode(m):
    async def go(pg):
        await pg.click('#demo-menu-btn'); await pg.click(f'[data-testid="mode-{m}"]'); await pg.wait_for_function(SETTLED); await pg.wait_for_timeout(1400)
        await pg.evaluate("document.querySelectorAll('[data-testid=\"toasts\"] > *').forEach(t => t.remove())")
    return go

# The two portfolio shots show where the ways in sit. The GozarX card and case study carry the real project's figures,
# its domain and a capture of its live site; none of it belongs in the demo's screenshots (synthetic data only), so all
# of it is blurred out.
REDACT = '.st-kpi, .st-media, .fr-kpi, .fr-window, .fr-phone, .case-window, .case-device, .case .facts { filter: blur(14px) !important; }'

async def stack(pg):
    await pg.add_style_tag(content=REDACT)
    await pg.evaluate("document.querySelector('.work-desk .st-card').scrollIntoView({ block: 'start' })"); await pg.wait_for_timeout(500)

async def lab_button(pg):
    await pg.add_style_tag(content=REDACT)
    await pg.evaluate("document.querySelector('.case-lab').scrollIntoView({ block: 'center' })"); await pg.wait_for_timeout(300)


async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for prof in PROFILES:
            for scheme in ['light', 'dark']:
                await shot(b, f'{prof}-1440-{scheme}', f'{DEMO}?profile={prof}&lang=en&theme={scheme}', 1440, 960, scheme)
        await shot(b, 'vpn-768-dark', f'{DEMO}?profile=vpn&lang=en&theme=dark', 768, 1024, 'dark')
        for scheme in ['light', 'dark']:
            await shot(b, f'vpn-390-{scheme}', f'{DEMO}?profile=vpn&lang=en&theme={scheme}', 390, 844, scheme, mobile=True)
        await shot(b, 'fa-rtl-1440-light', f'{DEMO}?profile=ecommerce&lang=fa&theme=light', 1440, 960, 'light')
        await shot(b, 'fa-rtl-390-dark', f'{DEMO}?profile=ecommerce&lang=fa&theme=dark', 390, 844, 'dark', mobile=True)
        await shot(b, 'palette-open-1440-dark', f'{DEMO}?profile=vpn&lang=en&theme=dark', 1440, 960, 'dark', then=palette)
        # beyond the list: the other pages, the demo's states, and the two ways in from the portfolio
        await shot(b, 'records-1440-light', f'{DEMO}?profile=saas&lang=en&theme=light#/accounts', 1440, 960, 'light')
        await shot(b, 'health-1440-dark', f'{DEMO}?profile=print&lang=en&theme=dark#/health', 1440, 960, 'dark')
        await shot(b, 'growth-fa-1440-dark', f'{DEMO}?profile=education&lang=fa&theme=dark#/growth', 1440, 960, 'dark')
        await shot(b, 'state-empty-1440-light', f'{DEMO}?profile=education&lang=en&theme=light', 1440, 960, 'light', then=await mode('empty'))
        await shot(b, 'state-error-1440-dark', f'{DEMO}?profile=vpn&lang=en&theme=dark', 1440, 960, 'dark', then=await mode('error'))
        await shot(b, 'portfolio-work-pill-1440-dark', f'{BASE}/projects/', 1440, 900, 'dark', then=stack)
        await shot(b, 'portfolio-case-button-390-light', f'{BASE}/projects/gozarx/', 390, 844, 'light', then=lab_button, mobile=True)
        await b.close()

asyncio.run(main())
