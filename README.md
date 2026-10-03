# sed.mehdi site

Astro, static output. Design tokens in `src/styles/tokens.css`.

## Where the content lives
- `src/data/site.ts`: name, intro, links, areas, experience, skills
- `src/content/projects/*.md`: one file per project; front matter holds the facts, the body is the case study
- `public/resume.pdf`: the résumé file
- Everything marked DUMMY CONTENT is placeholder text. `docs/case-study-template.md` says what each case-study section should contain.
- Fonts: DM Sans and DM Mono are self-hosted in `public/fonts/` (latin subset, SIL OFL 1.1, licenses next to the files) and declared in `src/styles/fonts.css`.
- `apps/admin-demo/`: the admin panel demo, a separate React app (npm workspace) built into `dist/lab/admin/` by `npm run build`. A project's `lab` front-matter field (a path) adds a "Try the Live Demo" button to its case study and a "Live Demo" pill to its card on the Work page. See `apps/admin-demo/README.md`.

## Hosting
- GitHub Pages: pushing to `main` runs `.github/workflows/deploy.yml` (Astro action v6, Node 24 by default) and publishes `dist/`.
- Custom domain: set it in the repository under Settings > Pages > Custom domain. With an Actions deployment GitHub ignores `public/CNAME`; the file is kept only as a record.
- Own server (optional, later): `Dockerfile`, `nginx.conf` and `docker-compose.yml` are kept for that.

## Commands
- `npm install`
- `npm run dev` (http://localhost:4321)
- `npm run build` (output in `dist/`, the admin demo included under `dist/lab/admin/`)
- `npm run dev:demo` (the admin demo alone) and `npm run test:demo` (its unit tests)
- `npm run single-file` (builds, then writes `preview/sed-mehdi-preview.html`: the whole site in one self-contained file that opens offline)
- `docker compose up -d --build` (serves the built site on port 8080)
- `scripts/qa/`: Playwright checks for the site, for the single-file preview and for the admin demo (usage at the top of each file)
