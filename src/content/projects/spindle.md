---
# The admin panel from GozarX, white-labelled and running on synthetic data at /lab/admin/ (apps/admin-demo).
# "The numbers" are the build's own: scripts/qa/check_admin_demo.py (`numbers`) fails when they drift from it.
title: "Spindle Admin Kit"
summary: "A white-label admin dashboard: one codebase runs a server host, a SaaS, a store, an academy and a print shop, all on synthetic data."
role: "Designer and developer"
status: "Live demo"
period: "2026"
stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "Hand-made SVG charts"]
metric: { value: "5", label: "Business profiles" }
demo: "/lab/admin/"
cover: { src: "/projects/spindle.webp", alt: "The Spindle Admin Kit dashboard for Nodemill, a fictional server host, in the dark theme: active servers, orders, MRR, average order value and churn, all synthetic" }
accent: "#2E2A6E"   # the panel's own indigo; white text 12.56:1 (7.41 under the strongest glow), the live light 6.21:1
logo: { src: "/projects/logos/spindle.svg", bg: "#EEF0FF", tint: "#8B8DF9" }   # a drop spindle; tint is the panel's periwinkle
featured: true
order: 2
---

## The problem

The admin panel I built for GozarX could not be shown to anyone: every figure on it is real, and it was written for one business. A dashboard worth showing had to run without a server and without real data, and for more than one kind of company.

## What I built

- **Profiles, not forks.** One profile object per business sets the brand, the navigation, the KPIs, the charts, the radar, the live figures, the health checks, the tables and every word of copy, in English and Persian. A server host, a SaaS, a store, an academy and a print shop run on the same components.
- **A seeded generator whose numbers add up.** Every figure comes from one deterministic stream per business, the same for every visitor: a KPI is the sum of the days its chart draws, the 7-day window is the tail of the 14-day one, the servers running are the servers delivered minus the ones deleted, and a CSV export holds exactly what is on screen.
- **Keyboard first.** Ctrl/Cmd+K opens a command palette for every page, business, range and theme, and every control has a visible focus ring and a name.
- **Right to left.** Persian mirrors the layout and the time axes and prints Persian digits, and no figure is reordered by the bidi algorithm on the way.
- **Accessible.** Text reaches 4.5:1 on the colour really under it, touch targets are 44px on phones, and Reduce Motion stills every animation and the live ticker.

## How it is tested

Every browser check first runs on a page broken on purpose, by a stylesheet, a script or a rewritten response that the shipped code knows nothing about, and has to fail there before its pass on the real page counts. A display audit then measures the rendered pages at eight widths, in both themes and both languages: contrast on the real background, cut text, focus hidden under the bars, touch targets and layout shift.

## The numbers

- 104.1 KB of JavaScript, gzipped, on the first load; every other page loads when it is opened.
- 132 unit tests and 18 browser checks, each browser check proven on a broken page first.
- No request to any other host: the data is made in the browser and nothing leaves it.
