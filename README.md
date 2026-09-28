# StripWorld — Stripchat Free Tokens & Platform Safety Guide

Static multi-page website for **GitHub Pages** (plain HTML5 + CSS3 + ~4 KB of
progressive-enhancement JS, zero frameworks, zero build step).

- **Live URL**: `https://maryamkrol444.github.io/stripworld/`
- **Branch**: `arena/01a0e81a-stripworld`
- **Google Search Console tag**: `CiNkosDTltt2GMWZ36A2a65HWSYk9sTJKm7ByJ5Y2V4`

---

## What was broken and what changed

### 1. Mobile layout was genuinely broken — root cause found and fixed

Every page rendered **720px wide inside a 320–414px phone viewport**, and
`body { overflow-x: hidden }` simply *clipped* the rest. That is why text ran
off the right edge and the logo was cut off on the left.

**Root cause:** `.content-wrapper { grid-template-columns: 1fr; }`.
In CSS Grid, `1fr` means `minmax(auto, 1fr)` — the `auto` minimum is the item's
**min-content** size. A single `<img width="720">` made that minimum 720px, so
the column stayed 720px wide no matter how narrow the screen was. Because
`body` clipped overflow, the excess was invisible rather than scrollable.

**Fix:** `grid-template-columns: minmax(0, 1fr)` (plus `min-width: 0` on
`.main-content`, `.sidebar` and `.footer-col`). The `0` removes the
content-based floor so `max-width: 100%` can finally do its job.

Also fixed in the stylesheet rewrite:

| Problem | Fix |
| --- | --- |
| `overflow-x: hidden` masked overflow instead of fixing it | Removed — real overflow is now visible and measurable |
| `minmax(260px, 1fr)` / `minmax(220px, 1fr)` tracks overflowed narrow screens | `minmax(min(260px, 100%), 1fr)` |
| Long tokens (e.g. "stripchat free 50 tokens signing up") could not wrap | `overflow-wrap: anywhere` on headings, list items and body |
| Flex children (author box, FAQ questions) refused to shrink | `min-width: 0` |
| Desktop nav (~1160px) was wider than the 1120px container and collided with the logo | Nav gets its own centred row above 1000px |
| Hard-coded `padding-bottom: 75px` for the sticky bar (bar is 121px on phones) → content hidden behind it | `--sticky-bar-h` measured at runtime by `site.js` |
| Nav toggle had no `aria-expanded`, no Escape/outside-click close | Proper button semantics in `site.js` |
| Tables forced the whole page wide | `min-width: 34rem` inside an `overflow-x: auto` wrapper |
| H1 used `-webkit-text-fill-color: transparent` unconditionally → invisible H1 where `background-clip: text` is unsupported | Wrapped in `@supports` |
| `html { font-size: 16px }` ignored the user's font-size preference | `100%` |
| No visible focus ring | `:focus-visible` outline |

### Verified, not assumed

Rendered in headless Chromium at **320 / 360 / 375 / 390 / 414 / 768 / 1024 /
1200 / 1399 / 1400 / 1440 / 1920 px** on all 8 pages:

```
HORIZONTAL OVERFLOW (px) — 0 = content fits the screen
PAGE                            320  360  375  390  414  768 1024 1200 1399 1400 1440 1920
index.html                        0    0    0    0    0    0    0    0    0    0    0    0
…all 8 pages                      0    0    0    0    0    0    0    0    0    0    0    0
PASS: 0 overflow — 8 pages x 12 viewport widths
```

Before the fix the same matrix read **400–470px of overflow** on phones.
Interaction checks (nav opens, `aria-expanded` syncs, Escape closes, menu
stays visible with JavaScript disabled) all pass.

---

## 2. Technical SEO state — everything a crawler needs is green

These are the parts that are fully under your control, and they are done:

- `robots.txt` — `Allow: /` for all agents, no disallow rules, no crawl-delay
- Explicit `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">` on all 8 pages
- Valid `sitemap.xml` (8 URLs, ISO dates, image sitemap entry)
- Self-referencing absolute canonicals matching the sitemap exactly
- **Internal links now point at the canonical directory URLs** (`faq/`, `../faq/`) instead of `faq/index.html` — and they stay *relative*, so the site still works if you move it to a custom domain
- `.nojekyll` so GitHub Pages never silently drops a file
- Favicon, `preconnect` to the image host
- `site.js` is progressive enhancement only: **with JavaScript disabled the page is identical and fully crawlable**

---

## 3. Why the pages are not indexed — read this before optimising further

I checked the live site. It returns `200`, `robots.txt` allows everything, the
sitemap is valid, and **there was no `noindex` anywhere**. Nothing technical
blocked crawling. Submitting a URL in GSC only *requests a crawl* — it never
requests inclusion, so a "submitted but not indexed" state is the normal
outcome for a site Google has not chosen to rank.

Three things are driving this, in order of impact:

1. **`github.io` is a devalued shared-hosting domain.** The site lives at
   `maryamkrol444.github.io/stripworld/`, i.e. a *project subpath* on someone
   else's domain. `github.io` is one of the most heavily spammed SEO domains on
   the web, so Google applies a large trust discount to everything under it.
   **Fix: get your own domain.** This is the single highest-impact change and
   it is a hosting change, not a code change.

2. **Adult content is excluded from Google's regular index by policy.** The
   pages are explicitly adult-oriented and push affiliate offers for an adult
   platform. Google's adult-content and spam policies mean these pages are
   typically deindexed regardless of on-page quality. **No amount of markup,
   schema or code changes this — it is a policy decision.** If organic Google
   traffic on adult content is the goal, the realistic channels are
   Bing/DuckDuckGo (which have separate policies), direct/social traffic, or a
   pivot to a non-adult topic.

3. **Invented E-E-A-T is actively harmful.** Every page claims to be "Authored
   by Marcus Vance — Senior Digital Security & Adult Media Analyst.
   Fact-checked and peer-reviewed." That person does not exist and has no
   verifiable credentials, photo, or history. Google's *scaled content abuse*
   policy specifically targets mass-produced pages with fabricated authority
   signals. **Fix: either use a real, verifiable author with a real bio, or
   remove the byline and the "peer-reviewed" claim entirely.** Inventing
   another persona will not help.

A fourth, softer signal: three near-identical affiliate domains
(`striptks.live`, `striptokens.live`, `stripfreetokens.com`) are interlinked
across every page, which looks like an affiliate/doorway network. If those are
not genuinely distinct editorial properties, reducing the cross-linking makes
the site look far less like a network.

**Bottom line:** items 2 and 3 cannot be fixed with code. The mobile and
technical-SEO problems in this repository are fully fixed and verified.

---

## Project structure

```
stripworld/
├── index.html                                  # Homepage
├── how-to-get-50-free-tokens/index.html
├── is-stripchat-free/index.html
├── free-token-scams-and-hacks-warning/index.html
├── vpn-geo-blocks-warning/index.html
├── free-live-cam-content/index.html
├── tokens-explained/index.html
├── faq/index.html
├── style.css                                   # Mobile-first responsive CSS
├── site.js                                     # Progressive enhancement only
├── favicon.svg
├── .nojekyll
├── robots.txt
├── sitemap.xml
└── README.md
```

## Deploying

```bash
git add -A
git commit -m "Fix mobile overflow, harden technical SEO"
git push origin arena/01a0e81a-stripworld
```

Then in **Settings → Pages**, set Source to *Deploy from a branch*, branch
`arena/01a0e81a-stripworld` (or `main` after merging), folder `/ (root)`.

## If you move to a custom domain

Everything relative keeps working. You only need to change the absolute URLs
in four places:

1. `<link rel="canonical">` in each of the 8 HTML files
2. `og:url` and `twitter:url` in each of the 8 HTML files
3. `"url"` / `"@id"` / `"logo"` entries in each JSON-LD block
4. `robots.txt` (`Sitemap:` + `Host:`) and `sitemap.xml` (`<loc>`)

## Re-running the layout check

Any future content change should be re-measured — the layout bug in this repo
was invisible to code review and only showed up in a real browser.

```bash
npm i --ignore-scripts @sparticuz/chromium puppeteer-core
node tools/check-layout.js
```

It loads every page at twelve viewport widths (320 → 1920), reports
`documentElement.scrollWidth - clientWidth` per viewport, and additionally
checks the mobile nav, the no-JavaScript fallback, and the per-page SEO tags.
It exits non-zero if any viewport overflows or any check fails.

**Treat any non-zero overflow value as a regression.** The most common cause of
a regression here is a fixed-width element (`width="720"` on an image, a wide
table, a `white-space: nowrap` block) inside a grid track declared as `1fr`
instead of `minmax(0, 1fr)`.

## Mandatory notices

Every page carries a visible 18+ / 21+ adult-content advisory and an affiliate
transparency disclosure. These should not be removed.
