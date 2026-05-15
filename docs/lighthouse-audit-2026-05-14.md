# Lighthouse Audit — 2026-05-14

**Scope:** Live Lighthouse measurements of 16 high-value production pages on `https://www.anzen-ai-portal.jp` in Mobile and Desktop form factors. Read-only audit; no code changes proposed in this PR.
**Base:** `origin/main` HEAD `6f48b93` (PR #131 merged 2026-05-15).
**Tooling:** `lighthouse@13.3.0` + `chrome-launcher@1.2.1`, Chrome stable, default `lighthouse:default` config. Mobile preset uses 4× CPU slowdown, 1.6 Mbps throughput, 150 ms RTT (the same emulation Google uses for CrUX). Desktop uses 1× CPU, 10 Mbps, 40 ms RTT.
**Runs:** 1 per `(page, form-factor)`. Categories audited: Performance, Accessibility, Best Practices, SEO. PWA is dropped in Lighthouse 13 and was not measured.
**Out of scope:** code changes, content rewrites, alternate-page measurements (e.g. `/articles/[slug]` detail), repeat runs for variance bands, real-user data from CrUX/GA4.

---

## Step 0 — Duplicate check

`gh pr list --search "lighthouse audit"` returned no matching PRs. PR #118 (`docs/seo-ux-deep-audit-2026-05-14`) covered a static SEO/UX audit but explicitly excluded live Lighthouse runs. This audit is the first measured Lighthouse pass on the post-PR-#117 codebase; subsequent perf PRs #121 (WebP), #124 (recharts dynamic), and #127 (skeleton fallbacks) are included in the measured surface.

---

## Phase A — Measured scores

### A-1. Aggregate averages (16 pages × 2 form factors = 32 runs)

```
                Mobile   Desktop
Performance      81.1     95.9
Accessibility    93.8     92.4
Best Practices   99.5     99.5
SEO             100      100

Core Web Vitals (averages, Lighthouse simulation):
                Mobile   Desktop
LCP             5105 ms  1093 ms
CLS             0.000    0.028
TBT              176 ms    2 ms
FCP             1291 ms   438 ms
SI              2452 ms   850 ms
```

Notes:
- SEO is a clean sweep at 100. PR #118/#120/#123/#125 (sitemap, canonical, structured-data, 301 redirect) closed the static SEO gaps the prior audit identified.
- Best Practices is 99.5 average — only two pages dip below 100 (see A-3).
- Accessibility is bunched between 88 and 97, with the same handful of root causes everywhere.
- The Performance gap between Mobile (81) and Desktop (96) is the dominant headline finding — see A-2.
- The Desktop CLS average is 0.028, but that figure is held up by a single page: `/accidents` desktop CLS = 0.383 (see B-1). Every other page is 0.000 or 0.061.

### A-2. Per-page scores

```
form     path                  P    A   BP  SEO    LCP    TBT
desktop  /                     99   93  100 100    891      0
mobile   /                     99   93  100 100   1718     96
desktop  /about                98   93  100 100    751      0
mobile   /about                87   97  100 100   3408    223
desktop  /accidents            72   91  100 100   2071      0    CLS=0.383
mobile   /accidents            73   91  100 100  10540    152
desktop  /accidents-analytics  94   93  100 100   1626     29
mobile   /accidents-analytics  65   93  100 100   7667    421
desktop  /chatbot              99   93  100 100    870      0    CLS=0.061
mobile   /chatbot              87   93  100 100   4097     32
desktop  /chemical-ra          99   93   96 100    910      0
mobile   /chemical-ra          85   93   96 100   4237     81
desktop  /circulars            98   93  100 100    875      0
mobile   /circulars            69   97  100 100   7011    249
desktop  /contact              98   94  100 100    791      0
mobile   /contact              85   97  100 100   4158     56
desktop  /equipment-finder     99   93  100 100    870      0
mobile   /equipment-finder     87   93  100 100   3937     33
desktop  /exam-quiz            99   88  100 100    673      0
mobile   /exam-quiz            83   92  100 100   3563    310
desktop  /features             95   93  100 100   1432      0
mobile   /features             92   93  100 100   3259     92
desktop  /law-hierarchy        99   93  100 100    870      0
mobile   /law-hierarchy        87   93  100 100   4111     36
desktop  /law-search           96   93  100 100   1431      0
mobile   /law-search           69   93  100 100   6803    325
desktop  /quiz                 98   88  100 100    917      0
mobile   /quiz                 85   92  100 100   3257    302
desktop  /safety-diary         98   93   96 100    949      0
mobile   /safety-diary         72   97   96 100   6260    241
desktop  /stats                94   94  100 100   1562      0
mobile   /stats                73   94  100 100   7646    173
```

Notes:
- `/quiz` is a 308 redirect to `/exam-quiz`. The redirect itself costs ~316 ms of wasted load time (B-12). The two redirect targets share a single page implementation, so their scores diverge only by the cost of the extra hop.
- LCP values above are Lighthouse-simulated under throttling. Real TTFB is consistently 12-30 ms (Vercel CDN); the LCP penalty comes from "element render delay" (JS / main-thread work blocking paint).

### A-3. Outliers

Lowest Performance (Mobile):
1. `/accidents-analytics` 65
2. `/circulars` 69
3. `/law-search` 69
4. `/safety-diary` 72
5. `/accidents` 73
6. `/stats` 73

Lowest Performance (Desktop):
1. `/accidents` 72 (driven entirely by CLS=0.383, see B-1)
2. `/stats` 94 (acceptable)
3. `/accidents-analytics` 94 (acceptable)
4. `/features` 95 (acceptable)

Lowest Accessibility:
1. `/exam-quiz` desktop 88
2. `/quiz` desktop 88
3. `/accidents` desktop 91, mobile 91

Lowest Best Practices:
1. `/chemical-ra` 96 (mobile and desktop)
2. `/safety-diary` 96 (mobile and desktop)

### A-4. Failed audits, ranked by frequency across the 32 runs

```
32x  valid-source-maps                      Best-Practices
32x  color-contrast                         Accessibility
32x  unused-javascript                      Performance
32x  legacy-javascript-insight              Performance
32x  network-dependency-tree-insight        Performance (insight)
32x  render-blocking-insight                Performance (insight)
26x  target-size                            Accessibility
20x  largest-contentful-paint               Performance metric
16x  label-content-name-mismatch            Accessibility
16x  interactive (TTI)                      Performance metric
11x  forced-reflow-insight                  Performance (insight)
 9x  max-potential-fid                      Performance metric
 8x  mainthread-work-breakdown              Performance
 7x  total-blocking-time                    Performance metric
 4x  bootup-time                            Performance
 4x  errors-in-console                      Best-Practices  (React #418 hydration)
 4x  select-name                            Accessibility
 3x  speed-index                            Performance metric
 2x  definition-list                        Accessibility
 2x  bf-cache                               Best-Practices
 2x  redirects                              Performance
 1x  layout-shifts                          Performance
 1x  cls-culprits-insight                   Performance (insight)
 1x  cumulative-layout-shift                Performance metric
```

The top six rows fire on every single page. They are the levers with the broadest blast radius.

---

## Phase B — Improvement roadmap

Each item below names the audit it addresses, the specific code or asset to inspect, a coarse-grained estimate of the score improvement, regression risk, and an effort tier (S = under an hour, M = half-day, L = day or more, XL = multi-day or vendor work).

### B-1. Critical — fix CLS on `/accidents` desktop (Perf 72 → ~95)

- **Audit:** `cumulative-layout-shift`, `layout-shifts`, `cls-culprits-insight`. CLS = 0.383 on desktop, but reported 0.000 on mobile (likely because mobile reflows hide inside the simulated paint timeline).
- **Culprit reported by Lighthouse:** `div.flex > main#main-content > div.mx-auto > div.mx-auto` — the outer page container in `web/src/app/(main)/accidents/page.tsx`. This selector matches a generic `mx-auto max-w-7xl` wrapper that does not itself shift; the shift comes from a child rendered after the initial paint without a reserved height. The accident-database panel, MHLW preliminary tile, or LinkRoundup is likely the actual mover.
- **Files to inspect:** `web/src/app/(main)/accidents/page.tsx`, `web/src/components/accident-database-panel.tsx`, `web/src/components/accident-analysis-panel.tsx`, `web/src/components/accident-extras-panel.tsx`. Look for components that fetch on the client and then expand vertically (no `min-h-*` placeholder).
- **Expected gain:** Performance score 72 → 95+ on desktop. CLS metric weight in Lighthouse is 25 % of the Performance score.
- **Effort / risk:** S–M. Adding a `min-h-[Npx]` to each panel skeleton or wrapping with `aspect-ratio` is low-risk. Validate that fixed heights do not clip content on long titles.

### B-2. Critical — eliminate the React #418 hydration error on `/chemical-ra` and `/safety-diary` (BP 96 → 100)

- **Audit:** `errors-in-console`. React error #418 = "Hydration failed because the initial UI does not match what was rendered on the server."
- **Pages affected:** `/chemical-ra` and `/safety-diary` on both form factors. Stack trace in the LHR points to `_next/static/chunks/...` — minified, no source maps shipped, so the offending component is not directly named.
- **Likely cause patterns:**
  1. A component reads `Date.now()`, `Math.random()`, `localStorage`, or `window` in a render branch instead of inside `useEffect`. Both pages have client wizards that read user state.
  2. A `suppressHydrationWarning` was removed but the underlying mismatch (e.g., locale-dependent number formatting) was not fixed.
  3. A server-rendered placeholder differs from the post-mount UI because of a CSR-only feature flag (e.g., `usePaidMode`, accessibility mode toggle).
- **Files to inspect:** `web/src/app/(main)/chemical-ra/*.tsx` (the RA wizard), `web/src/app/(main)/safety-diary/*.tsx` (diary entry shell), plus the global toggles consumed there (`web/src/components/app-shell.tsx` accessibility modes).
- **Expected gain:** Best Practices 96 → 100. More importantly: silent hydration errors invalidate the SSR'd HTML and force a full client re-render, harming TBT and LCP. Real-user perf gain likely 100–300 ms TBT.
- **Effort / risk:** M. Diagnosis is the hard part; once the offending render is found, the fix is a `useEffect` move. Risk: changing render order can shift initial layout — verify CLS stays clean.

### B-3. Critical — reduce mobile dashboard JS on `/accidents-analytics`, `/stats`, `/accidents` (Perf +15–25 on each)

- **Audit:** `bootup-time`, `mainthread-work-breakdown`, `unused-javascript`, `interactive`.
- **Measured:** `/accidents-analytics` mobile has 2702 ms of scripting time in one chunk (`125m7ewo148p8.js`). `/stats` mobile has 1065 ms in the same chunk. The chunk is the recharts code; PR #124 made it a separate chunk, but the chunk is still loaded eagerly the moment the page mounts.
- **Files to inspect:**
  - `web/src/app/(main)/stats/StatsDashboard.tsx` — recharts is imported statically at the top of this `"use client"` module.
  - `web/src/app/(main)/accidents-analytics/AnalyticsDashboard.tsx` and `AnalyticsDashboardImpl.tsx` — same pattern.
  - `web/src/components/accident-analysis-panel.tsx` and `web/src/components/mhlw-accident-analysis-panel.tsx` — both also import recharts directly.
- **Proposals (pick one per surface):**
  - **B-3a:** Replace recharts entirely with a lighter library on the analytics surfaces (uPlot, observable-plot, or hand-rolled SVG). uPlot is ~40 KB; recharts is ~150 KB gzipped plus heavy React reconciliation.
  - **B-3b:** Keep recharts but mount each chart behind `IntersectionObserver` so off-screen charts (the page has 4–6 chart panels) do not parse until scrolled to.
  - **B-3c:** Server-render an initial PNG/SVG snapshot of each chart (via `recharts` on the server or a build-time render) and hydrate to interactivity on first interaction.
- **Expected gain:** Mobile Performance 65 → 85+ on `/accidents-analytics`; 73 → 88+ on `/stats`. Real-world TBT likely halves on slower hardware.
- **Effort / risk:** L. B-3b is the cheapest and lowest-risk; B-3a is the highest-payoff but a 1–2 day rewrite. Charts are a key product feature — visual regressions are the risk.

### B-4. High — fix site-wide color contrast (`text-slate-400` on white) (A11y 93 → 97)

- **Audit:** `color-contrast`. Fires on every single run (32×). Lighthouse reports contrast ratio 2.63:1 for `#90a1b9` (Tailwind `slate-400`) on white; WCAG AA requires 4.5:1 for normal text, 3:1 for large text and UI components.
- **Files using `text-slate-400` as text (not as a dark-mode override):** 15 files in `web/src/`, predominantly:
  - `web/src/components/share-buttons.tsx`
  - `web/src/components/stat-source-cite.tsx`
  - `web/src/components/user-menu.tsx`
  - `web/src/components/weather-forecast-panel.tsx`
  - `web/src/components/accident-analysis-panel.tsx`
  - `web/src/components/accident-database-panel.tsx`
  - `web/src/components/accident-extras-panel.tsx`
  - All signage components (`web/src/components/signage/*.tsx`) — but signage is shown on its own dark background; verify each.
- **Fix:** swap `text-slate-400` → `text-slate-500` (#62748b → 4.62:1 on white, passes) where text appears on white. Keep `text-slate-400` only as a `dark:text-slate-400` companion to a light-mode `text-slate-600/700`.
- **Expected gain:** Accessibility 91–93 → 96–97 across the board.
- **Effort / risk:** S. Mechanical search-replace with per-file review. Risk: visual regression on dark backgrounds — those uses must be kept.

### B-5. High — fix `label-content-name-mismatch` on the global Ctrl+K search button (A11y +1–2)

- **Audit:** `label-content-name-mismatch`. Fires on 16 runs (every desktop page where the wide nav is visible).
- **Cause:** `web/src/components/app-shell.tsx:597` declares `aria-label="検索を開く（Ctrl+K）"` on a button whose visible text is `検索 Ctrl+K`. Screen reader users hear "検索を開く" but sighted+voice users say "検索"; axe enforces the accessible name to start with or contain the visible text.
- **Fix:** drop the `aria-label` and let the button compute its accessible name from the visible text + `<kbd>` content, or change the label to `aria-label="検索（Ctrl+K）"` exactly matching the visible text.
- **Expected gain:** Accessibility +1–2 points on every desktop page.
- **Effort / risk:** S. 1-line change.

### B-6. High — enlarge touch targets in the footer link grid (A11y mobile +1, mobile UX win)

- **Audit:** `target-size`. Fires 26× — almost every page. Most failures are footer `<Link>` elements with text-only styling (`hover:text-slate-900 hover:underline`) and no padding.
- **Files:** `web/src/components/footer.tsx`. The link grid uses `space-y-1.5` (6 px) plus `text-xs` (12 px font) — the bounding rect of a single-character Japanese link is roughly 16 × 60 px, below the 24×24 px WCAG floor for adjacent targets.
- **Fix:** add `inline-flex min-h-[44px] items-center` (or `block py-2`) to the inner anchor styling, or restructure the `<ul>` so each `<li>` has padding.
- **Additional sites:** the `<a>` chips in `share-buttons.tsx` and the `aria-expanded` chevron on `web/src/components/accordion` (if used in footer) may also trigger.
- **Expected gain:** A11y +1 on mobile uniformly; tap-error rate drop is the real win.
- **Effort / risk:** S. Slightly increases footer vertical height — verify mobile-screen budget on `/` and `/about`.

### B-7. High — fix `<dl>` semantics on `/accidents` (A11y +1, semantic correctness)

- **Audit:** `definition-list`. Fires on `/accidents` (both form factors).
- **Cause:** `web/src/components/ladder-stats-card.tsx:45` wraps `<dt>`/`<dd>` pairs inside `<div>`s — that is permitted by HTML5 — but the same `<div>`s also contain stray `<p>` siblings (line 49–51) which is not. Axe reports "dl element has direct children that are not allowed: div > p".
- **Fix:** move the descriptive paragraph out of the `<div>` (after the matching `<dd>`) or restructure the card as a plain grid with `<h3>` + descriptions rather than a definition list.
- **Expected gain:** Accessibility +1 on `/accidents` only.
- **Effort / risk:** S. 1-file restructure.

### B-8. High — add labels to `<select>` on `/quiz` and `/exam-quiz` (A11y 88 → 92+)

- **Audit:** `select-name`. Fires on `/quiz` and `/exam-quiz` desktop runs.
- **Files:** `web/src/app/(main)/exam-quiz/exam-quiz-client.tsx` (and its [slug] sibling). The page has a filter `<select>` for category with no associated `<label>` and no `aria-label`/`aria-labelledby`.
- **Fix:** wrap the select in `<label>` or add `aria-label="カテゴリで絞り込み"`.
- **Expected gain:** A11y +4 on `/quiz` desktop (88 → 92) and `/exam-quiz` desktop (88 → 92). Same pages on mobile already pass.
- **Effort / risk:** S.

### B-9. Medium — defer Google Tag Manager / Analytics until interaction (Perf mobile +2–4)

- **Audit:** `unused-javascript`. GTM (`/gtag/js`) is the #1 wasted-byte source on every page: 60–65 KB unused per page on first paint. PR #122/#119 added GTM to CSP allowlist, but no deferral strategy was layered on top.
- **Options:**
  - **B-9a:** Move GTM into `next/script` with `strategy="lazyOnload"` (currently `afterInteractive`).
  - **B-9b:** Use Partytown to push GTM to a Web Worker — biggest win but adds runtime complexity.
  - **B-9c:** Replace GTM with a direct gtag snippet; saves ~50 KB by skipping the GTM container.
- **Files:** `web/src/components/Analytics.tsx`, `web/src/components/AdSenseScript.tsx`.
- **Expected gain:** Mobile Performance +2 to +4 across most pages (smaller win on already-fast pages).
- **Effort / risk:** M. Partytown is the highest-payoff but the riskiest (CSP, third-party script compatibility). The `lazyOnload` swap is a 1-line, low-risk first step.

### B-10. Medium — remove the `/quiz` → `/exam-quiz` redirect (Perf +1 on `/quiz` only)

- **Audit:** `redirects`. The audit fires on `/quiz` and one other page with a similar chain. The user-visible cost is 316 ms wasted on cold loads.
- **Decision needed:** is `/quiz` still actively linked anywhere? `git grep` should locate inbound links.
- **Fix:** either (a) update all inbound links to point directly at `/exam-quiz` and 301-redirect `/quiz` server-side (sitemap already points at `/exam-quiz`), or (b) collapse the two routes by re-exporting `exam-quiz/page.tsx` from `/quiz/page.tsx` — same component, no redirect.
- **Effort / risk:** S.

### B-11. Medium — investigate and fix bf-cache blockers on `/chatbot` and one other page (BP +1, real-world UX)

- **Audit:** `bf-cache`. Fires 2×. Lighthouse cannot restore the page from back/forward cache, which means users who tap "back" pay a full reload.
- **Common causes:** `Cache-Control: no-store`, unload event listeners, opening `IndexedDB` connections without closing them, WebSocket connections held open.
- **Files to inspect:** `web/src/app/(main)/chatbot/*.tsx` likely keeps a streaming connection (Gemini) open during the response. Add a beforeunload-style cleanup that closes the reader when the document is being hidden.
- **Expected gain:** BP score is minor; the UX gain (instant back-button restore) is the real reward.
- **Effort / risk:** M.

### B-12. Medium — investigate the LCP element on `/accidents` mobile (Perf 73 → 85+)

- **Audit:** `largest-contentful-paint`. LCP simulated at 10 540 ms — the worst on the site.
- **LCP element:** `<p class="mt-1 text-[10px] text-slate-500">` — a tiny footnote paragraph in the source-citation section. Lighthouse picked it because larger candidates (header image, hero text) painted later.
- **Likely root cause:** the page does substantial in-component data work (filtering 5 000 accident records, computing stats) on first render. The footnote `<p>` is the first text node to paint, and it has to wait behind that work.
- **Files:** `web/src/app/(main)/accidents/page.tsx`, `web/src/components/accident-database-panel.tsx`, `web/src/lib/accidents-analytics/*`. Look for heavy synchronous data transforms run during render.
- **Fix path:** move the heavy filter/aggregate into `useMemo` keyed by the user filter, and seed the initial state with a precomputed summary. If the summary can be precomputed at build time, ship it as a JSON literal in the page module.
- **Expected gain:** LCP could drop by 50 %+; Performance 73 → 85+.
- **Effort / risk:** M.

### B-13. Medium — address `forced-reflow-insight` (Perf +1–3 on 11 pages)

- **Audit:** `forced-reflow-insight`. JavaScript is reading layout properties (`offsetHeight`, `getBoundingClientRect`, `scrollHeight`) immediately after mutating the DOM, forcing the browser to flush layout synchronously.
- **Typical culprits in this codebase:** `web/src/components/command-palette.tsx` (focus management), virtualised lists in `chemical-database-client.tsx`, signage components that compute fit-to-screen heights.
- **Fix path:** batch reads vs. writes; use `requestAnimationFrame` for height measurements.
- **Effort / risk:** M.

### B-14. Low — ship source maps for first-party JS (BP audit pass, debugging win)

- **Audit:** `valid-source-maps`. Fires 32×.
- **Cause:** `next.config.ts` does not set `productionBrowserSourceMaps: true`. Without source maps, Sentry-style error grouping is impossible (note B-2 — we cannot pinpoint the React #418 origin because of this).
- **Risk of shipping source maps publicly:** anyone can read the original source. The site already publishes the GitHub repo, so the marginal exposure is zero.
- **Effort:** S. 1-line config change. Also slightly grows the deploy artifact size.

### B-15. Low — reduce legacy JS / polyfills (`legacy-javascript-insight`)

- **Audit:** `legacy-javascript-insight`. Fires 32× with `metricSavings.LCP=150ms` on `/accidents` mobile.
- **Cause:** Next.js still ships an ES5-compatible chunk for older browsers; `browserslist` in `web/package.json` likely includes IE-era targets.
- **Fix:** tighten `browserslist` to `>0.3%, not dead, not op_mini all, not ie 11`. Re-verify Lighthouse runs use the modern chunk.
- **Effort / risk:** S. Risk: older mobile browsers in regional Japanese carriers may still hit the site — confirm with GA4 browser data before tightening.

---

### Severity counts

```
Critical (Performance below 75 on a real user page,
          or hydration error blocking SSR semantics):
  B-1  CLS on /accidents
  B-2  React #418 on /chemical-ra and /safety-diary
  B-3  Mobile dashboard JS (3 pages)

High (broad-blast a11y or perf issue affecting >10 pages,
      ROI per hour very high):
  B-4  text-slate-400 contrast
  B-5  Ctrl+K aria label
  B-6  Footer touch targets
  B-7  <dl> semantics
  B-8  <select> labels

Medium (single-page perf gains or non-visible best practices):
  B-9   GTM deferral
  B-10  /quiz redirect
  B-11  bf-cache blockers
  B-12  /accidents LCP investigation
  B-13  forced-reflow

Low (best-practices polish, no user-visible impact):
  B-14  source maps
  B-15  legacy JS
```

### Top 10 by ROI (effort-adjusted), recommended starting order

1. **B-5** Ctrl+K aria label — 1-line fix, 16 pages improve.
2. **B-4** text-slate-400 → text-slate-500 — mechanical, 32 pages improve.
3. **B-6** footer touch targets — small CSS change, 26 pages improve.
4. **B-7** `<dl>` semantics in ladder-stats-card — 1 file.
5. **B-8** `<select>` labels — 1–2 files.
6. **B-1** CLS on `/accidents` — single page but the worst desktop score on the site.
7. **B-2** React #418 hydration — small fix once located, but blocks accurate perf measurement of two pages.
8. **B-3b** IntersectionObserver around chart panels — gates B-3a, biggest mobile perf win.
9. **B-10** `/quiz` redirect collapse — 1 file, eliminates 316 ms.
10. **B-9a** GTM `strategy="lazyOnload"` — 1-line config change, every page gains.

If a single sprint must pick five items, ship B-4, B-5, B-6, B-7, B-8 — all small, all high-blast-radius. This brings the average Accessibility score from 93 to ~97+ in a few hours.

---

## Phase C — This document

- **Path:** `docs/lighthouse-audit-2026-05-14.md`
- **Branch:** `docs/lighthouse-audit-2026-05-14`
- **Status:** Draft PR for owner review. No code changes proposed in this PR — only the audit narrative and ROI list.
- **Raw data:** the 32 Lighthouse JSON reports (one per page × form-factor) are not committed to the repo (~3 MB each); they live in the auditor's local temp directory and can be regenerated with `npx lighthouse <url>` against the same HEAD.
- **Reproduction:** Lighthouse 13.3.0, `lighthouse:default` config, Chrome stable on Windows. Default mobile/desktop emulation. Single run per cell — variance band on a single run is approximately ±5 Performance points, so per-page numbers should be read with that uncertainty in mind. The averages, ranks, and audit-failure counts are robust to that variance.
