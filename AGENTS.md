# Repository Guidelines for AI Agents

## Project at a glance

- **What:** marketing page for Juniper Leaves, an Etsy shop. Every purchase happens on Etsy; this site only points there.
- **Production:** <https://juniperleaves.com>, served from GitHub Pages behind Cloudflare. Deploys on every push to `main`.
- **Stack:** one static HTML page built by Vite. It has no client-side JavaScript except the Cloudflare Web Analytics beacon.
- **Toolchain:** Node 24 (`.nvmrc`), npm, TypeScript (only `vite.config.ts` and `scripts/` use it).

## What lives where

| Path | Purpose |
| --- | --- |
| `src/index.html` | The page. `<!-- listings:* -->`, `<!-- csp -->`, and `%NAME%` placeholders are filled in at build time |
| `src/site.css` | All styles. Colors are custom properties on `:root`, with dark-mode overrides under `prefers-color-scheme` |
| `src/listings.json` | The four featured Etsy listings. This is the only data the page renders |
| `scripts/listings.ts` | Turns `listings.json` into product cards, JSON-LD, and the sitemap |
| `scripts/refresh-listings.ts` | Updates `listings.json` from the Etsy Open API v3 |
| `vite.config.ts` | Build config and the plugin that fills in the placeholders and the CSP |
| `public/` | Copied unchanged to the site root: `CNAME`, `404.html`, icons, manifest, `robots.txt`, OG image |
| `.github/workflows/main.yml` | Type-check, build, check the files that must ship, deploy to Pages |
| `.github/workflows/quality.yml` | Lighthouse CI on PRs and main; lychee link check on PRs, main, and weekly |
| `.github/workflows/refresh-listings.yml` | Weekly Etsy refresh that opens a PR (needs the `ETSY_API_KEY` secret) |

## Commands

```sh
npm ci
npm run dev               # http://localhost:5173
npm run check             # tsc + production build into dist/ (matches CI)
npm run preview           # serve dist/ on :4173
ETSY_API_KEY=keystring:secret npm run refresh-listings
```

## Hard rules

1. **Keep it static.** No frameworks, no client-side JS, no backend. A dynamic feature belongs in a Cloudflare Worker, not in this repo.
2. **Listings are data.** To change a featured product, edit `src/listings.json`, not the HTML. Titles and `alt` text are written by hand; the refresh script keeps them for listings it already knows.
3. **The CSP is in `vite.config.ts`.** A new external origin (image, script, or fetch) must go into `CONTENT_SECURITY_POLICY`. `public/404.html` has its own policy because it isn't built.
4. **Files that must ship go in `public/`** and get a line in the "Verify deployable artifacts" step of `main.yml`.
5. **Actions are pinned to commit SHAs** with a version comment. Dependabot bumps both.
6. **Commit as the GitHub noreply address.** The account blocks pushes that expose a personal email.

## Quality bars (enforced by CI)

- Lighthouse, desktop, 3 runs: performance ≥ 0.9, accessibility ≥ 0.95, best practices ≥ 0.9, SEO ≥ 0.95. The SEO bar is skipped for `404.html`, which is `noindex` on purpose.
- lychee: no broken links in the built pages or the README. Etsy answers automated requests with 403, so a 403 counts as OK.
- `tsc` passes, and the build leaves no template placeholders in `dist/index.html`.

## Conventions

- Conventional Commits (`feat:`, `fix:`, `ci:`, `chore(listings):`); Dependabot uses `npm`, `github-actions`, and `docker` prefixes.
- One logical change per PR; CI must be green before merge.
