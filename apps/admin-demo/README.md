# Admin panel demo (`/lab/admin/`)

The GozarX admin panel, rewritten as a white-label kit and published inside the portfolio with
synthetic data. Five businesses run on the same code: a VPN service, a team workspace (SaaS), an
online home store, an online academy and a print-and-post shop. Everything runs in the browser from
static files: there is no API, no sign-in, and nothing is sent anywhere.

React 18, Vite, Tailwind 3 and hand-drawn SVG charts (no chart library). English and Persian, light
and dark, phones to wide screens.

## Commands (from the repository root)

- `npm run dev:demo`: the demo alone on Vite's dev server.
- `npm run build`: the portfolio, then this app into `dist/lab/admin/` (`base: "./"`, so the folder
  works under any path).
- `npm run test:demo`: type checks and the unit tests (generator, palettes, formatting, chart maths).
- `npm run palettes --workspace admin-demo`: regenerate `src/theme/palettes.css` after changing a
  brand's accent in `src/profiles/brands.ts`. A test fails if the committed file is stale.
- `python3 scripts/qa/check_admin_demo.py http://localhost:4321 [--prove]`: the browser checks (serve
  `dist/` first; usage at the top of the file).

## How a business is described

One `BusinessProfile` per business (`src/profiles/*.ts`, schema in `src/profiles/types.ts`) holds:

- the brand (`brands.ts`: name, kind, logo mark, accent; all five in one file);
- the daily series and derived streams the generator produces, the weekly rhythm and hourly curve;
- the KPI tiles (label, format, whether up is good, and how each is computed from the window);
- the radar's four rates, the three "top" cards, the live figures and the service checks;
- the two record tables (columns, statuses, filters, and how each cell's synthetic value is drawn);
- every word of business copy, as `{ en, fa }` pairs, so a missing translation is a type error.

The shell, the navigation, the command palette, the charts and the CSV exports read only this
object. Adding a business is a new profile file, its brand entry and `npm run palettes`.

## Where things live

- `src/data/`: the seeded generator (`model.ts`), the dashboard and record builders, CSV exports.
  A day's value is a pure function of (business, stream, date), so ranges are slices of each other
  and every visitor sees the same figures.
- `src/state/`: the app state (business, language, theme, range, data mode), the live ticker and
  the tab-only record edits.
- `src/components/`: `ui/` (the kit), `shell/` (rail, top bar, bottom bar, Business picker, palette,
  Demo menu), `charts/` (the SVG charts and their geometry).
- `src/pages/`: the dashboard and its tabs, the records page, the health page.
- `scripts/palette.mjs`: derives each business's light and dark palette from its accent (OKLCH),
  checked for WCAG AA in `src/theme/palette.test.ts`.

## Provenance

Ported from the GozarX admin panel (`frontend/admin`): the chart geometry (unchanged, with its
tests), the hero sparkline, the radar, the focus trap, the console's layout and its design notes.
The API layer, sign-in and every write action were removed; record status changes are kept in the
tab only. `docs/admin-demo/REPORT.md` lists what was copied, rewritten and cut.
