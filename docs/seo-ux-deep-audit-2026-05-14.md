# SEO & UX Deep Audit — 2026-05-14

**Scope:** Read-only audit of SEO technical posture and UX improvement potential. No code changes shipped.
**Base:** origin/main HEAD `84095eb` (2026-05-14, post PR #117).
**Method:** Static code review across `web/src/**`, validation of production response headers / sitemaps for `https://www.anzen-ai-portal.jp`, comparison against `app/(main)/` route inventory.
**Out of scope:** Lighthouse runs (no real-user data), translation accuracy, content rewrites, legal/compliance review.

---

## 1. Executive summary

The site has a strong SEO foundation: per-page metadata helpers (`withSiteOpenGraph` / `withSiteTwitter`), canonical URLs unified on `www.anzen-ai-portal.jp`, JSON-LD via `<JsonLd>` helpers, four-segment sitemap index with ~2,066 indexed URLs (1,981 main + 39 equipment + 31 articles + 15 circulars), and OK-grade security headers. UX is mostly competent: 4-tier accessibility modes (furigana / easy-japanese / large-text / outdoor), language toggle (ja/en), command palette (Cmd+K), 7-feature flagship grid, custom 404, and meta-fully-covered for ~50+ routes.

Three classes of defects stand out:

1. **Live security/SEO surface mismatch:** the CSP `script-src` does not allow `googletagmanager.com` or `pagead2.googlesyndication.com`, so GA4 and AdSense remote scripts will be blocked in browsers even though the env vars are set; apex→www returns `307 Temporary` (Vercel default) instead of `301 Permanent`; HSTS lacks `includeSubDomains; preload`.
2. **Structured-data type mismatches:** high-value index pages still emit generic `WebPage` / `NewsArticleList` where Google rewards `Dataset` (`/accidents`, `/chemical-database`, `/stats`), `QAPage` (`/chatbot`), `DefinedTermSet` (`/glossary`, `/laws/glossary`), `Quiz` (`/exam-quiz/[slug]`), and `Product` (`/equipment/[id]`).
3. **UX rough edges that block bookmarking, sharing, and CWV:** an 815 KB mascot PNG ships unoptimised, recharts dashboards load eagerly without `next/dynamic`, `<Suspense>` fallbacks are bare "読み込み中…" text, and core search/filter state (`/law-search` query, `/accidents` tab) is held in React state rather than URL params, so deep-links and back-button restoration both break.

Below are the per-section findings (Phase A / Phase B), followed by a prioritised fix list (Phase C).

---

## 2. Phase A — SEO technical posture

### A-1. robots.txt and sitemaps

**robots.txt (dynamic, `web/src/app/robots.ts`):**
- Disallow `/admin/`, `/api/`, `/strategy`. Live response also includes `Disallow: /dev/` — this directive is missing from the source file; deployment is in sync but the source should match.
- Sitemap pointer is correct: `https://www.anzen-ai-portal.jp/sitemap-index.xml`.

**Sitemap index (`web/src/app/sitemap-index.xml/route.ts`):**
- Lists four child sitemaps (`/sitemap.xml`, `/sitemap-articles.xml`, `/sitemap-circulars.xml`, `/sitemap-equipment.xml`). No `seven-child` configuration exists; the task brief's "7児サイトマップ" assumption does not match the codebase. The 4-child arrangement is fine.
- `lastmod` is set to the current build day (`new Date().toISOString()`), which is correct.

**Main sitemap (`web/src/app/sitemap.ts`):**
- 50 static entries, plus dynamic `circularPages`, `articlePages`, `equipmentPages`.
- **Hardcoded `lastModified` values (`2026-04-19`, `2026-04-28`, `2026-03-01`, `2025-10-01`).** These were correct at write time but never auto-refresh. For pages whose content changes (e.g., `/accidents`, `/laws`, `/articles`), Google will discount `lastmod` once it diverges from observable HTML change frequency.
- `changeFrequency` is set per-entry; this hint is largely ignored by Google but does not hurt.
- **Missing from sitemap (exist as routes):**
  - `/security`, `/dpa`, `/bcp` — linked from the footer.
  - `/lms` — exposed in the header navigation.
  - `/features/[category]`, `/features/comparison`, `/features/print`, `/features/quick-tour`, `/features/use-cases`.
  - `/diversity/elderly`, `/diversity/lgbtq`, `/diversity/non-regular`, `/diversity/remote`, `/diversity/women`.
  - `/qa-knowledge`, `/resources`, `/insurance`, `/api-docs`, `/newsletter`, `/handover`, `/quick`, `/quick-start`, `/community-cases`, `/ky/morning`, `/chatbot/share/[id]`, `/safety-diary/monthly/[ym]`.
- **Intentionally absent / noindex (correct):** `/admin/*`, `/auth/*`, `/account`, `/profile`, `/strategy`, `/handover`, `/dev/*`, `/wizard` (legacy).
- Total live URL counts (verified via `curl`): `/sitemap.xml` 1,981; `/sitemap-articles.xml` 31; `/sitemap-circulars.xml` 15; `/sitemap-equipment.xml` 39. The main sitemap is dominated by 1,050 `/equipment/[id]` and 870 `/circulars/[id]` entries from MHLW datasets — there is duplication with the dedicated equipment / circulars sitemaps. Consider keeping detail pages in only one place to simplify crawl budget accounting.

### A-2. JSON-LD structured data

`web/src/components/json-ld.tsx` exports `personSchema`, `organizationSchema`, `webSiteSchema`, `articleListSchema`, `newsArticleListSchema`, `serviceSchema`, `howToSchema`, `breadcrumbSchema`, `legalDocumentSchema`, `webPageSchema`, `faqPageSchema`, `productCollectionSchema`, `courseListSchema`. Root layout always emits `organizationSchema`, `webSiteSchema`, `personSchema`.

Coverage by route (current main):

- **Good fit:** `/articles/[slug]` (Article + BreadcrumbList), `/circulars/[id]` (LegalDocument + BreadcrumbList), `/ky` (HowTo), `/e-learning` (CourseList), `/accidents-analytics` (Dataset), `/law-hierarchy`, `/law-search` (WebPage + BreadcrumbList).
- **Wrong type:** `/accidents/page.tsx` line 37 emits `newsArticleListSchema()` over the accident-cases dataset. Accident records are tabular data, not articles. **Should be `Dataset`** (with `distribution`, `keywords`, `temporalCoverage`, `creator`).
- **Generic only (`WebPage` / `PageJsonLd`):** `/chatbot`, `/chemical-database`, `/glossary`, `/laws/glossary`, `/exam-quiz`, `/exam-quiz/[slug]`, `/equipment-finder`, `/equipment/[id]`, `/goods`, `/risk`, `/risk-prediction`, `/safety-diary`, `/stats`, `/signage`.
- **High-ROI missing schema types:**
  - `Dataset` → `/accidents`, `/chemical-database`, `/stats`, `/safety-diary` (the public examples view).
  - `QAPage` or `SoftwareApplication` → `/chatbot`, `/qa-knowledge`.
  - `SearchAction` declared at page level on `/law-search` (currently only on global WebSite schema).
  - `DefinedTermSet` → `/glossary` (118+ terms), `/laws/glossary`.
  - `Quiz` → `/exam-quiz/[slug]` (per-question `acceptedAnswer`).
  - `Product` → `/equipment/[id]` (affiliate offers exist; rich result eligible).
  - `ProductCollection` (helper already exists, unused) → `/goods`, `/equipment-finder`.
  - `Course` per-leaf → `/education/tokubetsu/*`, `/education/hoteikyoiku/*`, `/education/roudoueisei/*`.
  - `BreadcrumbList` is in JSON-LD on many pages but no visible breadcrumb component is rendered anywhere (see B-7).

URL hygiene inside JSON-LD: previously identified legacy `safe-ai-site.vercel.app` references in `/accidents/page.tsx` and `/laws/page.tsx` are **resolved** on current main (now use `SITE_URL`). No grep matches for legacy domains under `web/src/`.

### A-3. Per-page metadata completeness

`web/src/lib/seo-metadata.ts` defines `SITE_URL`, `withSiteOpenGraph`, `withSiteTwitter` — a sensible centralised helper that fills `og:url`, `og:site_name`, `og:locale`, `twitter:card`, etc.

- **Fully covered (title + description + canonical + og + twitter):** root `/`, /about, /contact, /privacy, /terms, /pricing, /chatbot, /chemical-database, /chemical-ra, /community-cases, /qa-knowledge, /goods, /ky, /mental-health, /safety-diary, /stats, /accidents, /laws, /law-search, /law-hierarchy, /accidents-analytics, /education + its 12 subroutes, /diversity + 3 listed subroutes, /signage, several /laws/* sublanding pages. Roughly 50 routes.
- **Title-only or relying on root template:** dynamic detail pages (`/articles/[slug]`, `/circulars/[id]`, `/equipment/[id]`, `/accidents/[id]`) — they declare `generateMetadata` but most omit `twitter` and several omit `alternates.canonical`. Worth confirming each `generateMetadata` returns the same shape as the static helper.
- **Inherits root only (client components):** `/glossary`, `/feedback`, `/wizard`, `/wizard/result`, `/safety-diary/[id]/print`, `/subsidies/calculator`. For client-only pages, push the metadata into the route's `layout.tsx` instead.
- **`noindex` configured:** `/admin/env-audit`, `/strategy`, `/dev/layout-preview`, `/account`, `/profile`, `/handover` — verified intentional.

### A-4. Core Web Vitals indicators (static review only)

No live Lighthouse run available in this environment. The following code-side risks are visible:

- **LCP — oversized mascot.** `web/public/mascot/mascot-chihuahua-4.png` is 815 KB. Used by `web/src/components/mascot.tsx` (`loading="lazy"` is set, but the mascot appears in `404`, `loading.tsx`, and several hero positions). Compressing to WebP <120 KB and serving at the rendered intrinsic size would unlock meaningful LCP improvement on cold loads.
- **LCP / data — screenshot gallery.** 50+ PNGs under `web/public/screenshots/` ranging 200–470 KB each. Mostly fed to `/features/*` and `/about` previews. WebP/AVIF conversion + responsive `sizes` would cut these to ~50 KB.
- **TBT — eager recharts.** `web/src/app/(main)/accidents-analytics/AnalyticsDashboard.tsx` and `web/src/app/(main)/stats/StatsDashboard.tsx` both `import { BarChart, ... } from "recharts"` at the module top, with `"use client"`. No `next/dynamic` wrapper. Recharts gzips to ~120 KB; on slower mobile, this stalls interactivity.
- **TBT — `pdfjs-dist`.** `signage-today-documents.tsx` imports dynamically (good), but `pdfjs-dist` is also pulled in by `web/src/components/signage/` chunks — verify dynamic import is the only loader.
- **CSP blocks Analytics & AdSense.** `web/next.config.ts` declares `script-src 'self' 'unsafe-inline' 'unsafe-eval'`. `Analytics.tsx` and `AdSenseScript.tsx` both inject remote scripts from `https://www.googletagmanager.com/...` and `https://pagead2.googlesyndication.com/...`. These URLs are **not** in `script-src`, so production browsers will block them and log CSP violations. If env vars `NEXT_PUBLIC_GA_MEASUREMENT_ID` / `NEXT_PUBLIC_ADSENSE_PUB_ID` are populated, analytics is silently failing.
- **Fonts ✓.** Geist Sans/Mono via `next/font/google` with `display:"swap"`, `preload:true` on Sans. No external Google Fonts `<link>`.
- **Third-party scripts ✓.** `next/script` with `strategy="afterInteractive"` is used correctly.

### A-5. Internal links and orphans

- **Header (`web/src/components/app-shell.tsx`, NAV_CATEGORIES):** ~27 routes across feature categories. Includes /wizard "NEW" badge despite /wizard slated for removal in earlier audits — verify still wanted.
- **Footer (`web/src/components/footer.tsx`):** 24 routes in 4 columns.
- **Homepage flagship grid (`web/src/config/flagship-nav.ts`):** 7 hubs, each with 3–4 sublinks (total 25 entries).
- **Confirmed orphans (no inbound link from header/footer/homepage, not in sitemap):** `/handover` (intentionally noindex), `/qa-knowledge` (referenced indirectly), `/resources`, `/insurance`, `/api-docs`, `/quick`, `/quick-start`, `/community-cases` (hub), `/newsletter`, `/organization`, `/profile`.
- **Footer links → sitemap mismatch:** `/security`, `/dpa`, `/bcp` exist in footer but not in sitemap.ts.
- **Hub→subroute back-links missing:** `/education/tokubetsu/*` leafs do not link back to `/education`. Same for `/diversity/*` leafs. No visible breadcrumb component.

### A-6. URL canonicalisation, redirects, security headers

Verified via `curl -sI` against production:

- **apex → www:** returns `HTTP/1.1 307 Temporary Redirect` to `https://www.anzen-ai-portal.jp/`. Should be **301 Permanent** for SEO authority consolidation. Configure in Vercel domain settings.
- **Trailing slash:** `/accidents/` returns `308 Permanent` → `/accidents`. **Good.**
- **Case sensitivity:** `/Accidents` → `404`. Acceptable; an optional lowercase redirect in `middleware.ts` would smooth typo'd inbound links.
- **HSTS:** `Strict-Transport-Security: max-age=63072000` is set by Vercel. **Missing `includeSubDomains; preload`**, and the site is not in the HSTS preload list.
- **CSP:** present but blocks remote analytics scripts (see A-4).
- **Other headers ✓:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **In-code redirects (`web/next.config.ts`):** legacy Vercel host → apex (line 47-50). Apex→www is **not** handled in Next; it relies on the Vercel domain redirect, which is the 307 above.
- **`metadataBase`** set to `https://www.anzen-ai-portal.jp` in root layout. All page-level `alternates.canonical` use relative paths and resolve correctly.

### A-7. SEO trust signals

- **HTTPS-only:** all production responses are HTTPS; CSP `upgrade-insecure-requests` is set.
- **Cert:** Vercel-managed Let's Encrypt — out of scope here, but visually valid (no `curl` cert errors).
- **Error stability:** spot checks of `/accidents`, `/laws`, `/chatbot`, `/accidents-analytics`, `/law-hierarchy`, `/stats` all return 200 with reasonable HTML. No 5xx encountered.
- **PWA / manifest:** `web/src/app/manifest.ts` produces valid `manifest.webmanifest` (verified live) with `start_url`, `scope`, icons (192, 512, maskable), and three `shortcuts` (`/ky`, `/laws`, `/accidents`).
- **Service worker:** `<ServiceWorkerRegistrar />` is mounted globally. Offline behaviour not audited.

---

## 3. Phase B — UX improvement potentials

### B-1. Clicks-to-completion (8 scenarios)

| Scenario | Min clicks | Path | Deep link |
| --- | --- | --- | --- |
| S1: Search "石綿" in /law-search | 3 | Home → Flagship "法改正" / sidebar "Law Search" → type → submit | `/law-search` exists but query is not bound to URL |
| S2: View an accident detail | 3 | Home → Flagship "重大事故" → /accidents → click case | `/accidents/[id]` exists |
| S3: Start a KY | 2 | Home → Flagship "KY" → /ky (new-KY visible above the fold) | `/ky` |
| S4: Chemical RA result | 3 | Home → Flagship "化学物質RA" → /chemical-ra → input | `/chemical-ra` |
| S5: Chatbot answer + citation | 4 | Home → Flagship "AIチャット" → /chatbot → ask → expand citation | `/chatbot` |
| S6: Accidents-analytics dashboard | 2 | Home → Flagship "重大事故" sublink → /accidents-analytics | `/accidents-analytics` |
| S7: /law-hierarchy → e-Gov | 3 | Home → /laws → "法令階層マップ" related card → /law-hierarchy → click regulation link | `/law-hierarchy` exists, exposed via /laws related-cards. Not in header nav. |
| S8: /stats utilisation | 2 | Home → sidebar "利用統計" → /stats | `/stats` |

Click counts are within the previously-validated "main flows ≤ 3 clicks" envelope. Two gaps:

- `/law-hierarchy` is reachable only via /laws related-cards, which sits below the fold — promote into header nav or flagship sublinks.
- `/accidents-analytics` is exposed as a flagship sublink under "重大事故"; verify the sublink is reachable on mobile (flagship grid collapses).

### B-2. Loading experience

- `web/src/app/loading.tsx` renders a mascot + `読み込み中…` block (40 vh min-height).
- Many feature pages wrap data fetching in `<Suspense fallback={<p>読み込み中…</p>}>` (e.g., `/laws`, `/chemical-ra`, `/ky/new`) — plain text instead of a skeleton.
- `/stats/StatsDashboard.tsx` fetches GA/GSC data in a `useEffect` with `cache: "no-store"`; no skeleton between mount and resolution — appears blank for several seconds on cold load.
- `/accidents-analytics/AnalyticsDashboard.tsx` is server-rendered with pre-aggregated data, so first paint is fast, but interactive filtering relies on client state.
- Only `law-search-panel` uses a proper `animate-pulse` skeleton.

### B-3. Error handling

- `web/src/app/error.tsx` and `(main)/error.tsx`: friendly Japanese copy, retry button, link home, digest displayed. Good.
- `web/src/app/not-found.tsx`: mascot + 4 navigation links (`/`, `/laws`, `/accidents`, `/contact`). Could include /law-search to catch typo'd legal queries.
- API failures in ContactForm, SubmitForm, /stats show generic messages. Network vs validation vs server errors are not differentiated.

### B-4. Accessibility (code-level)

- `web/src/app/layout.tsx` line 91 → `<html lang="ja">` ✓.
- 4 a11y modes (`FuriganaProvider`, `EasyJapaneseProvider`, `LanguageProvider`, plus large-text + outdoor toggles in `app-shell.tsx`) use `aria-pressed` correctly.
- `CommandPalette.tsx`, `FeedbackGateModal.tsx`, `ky-initial-wizard.tsx`, `law-search-panel.tsx` declare `role="dialog"` + `aria-modal="true"`. No `FocusTrap` library — manual focus management is in place but not exhaustively audited.
- `<input>` / `<textarea>` in `ContactForm.tsx`, `InquiryForm.tsx`, diary form — all have associated labels.
- **Gaps:**
  - No `<a href="#main-content" class="sr-only focus:not-sr-only">` skip-to-content link.
  - English copy interleaved with Japanese (e.g., `titleEn="Accident Database"` rendered via `TranslatedPageHeader`) is not wrapped in `<span lang="en">` — screen readers will mispronounce.
  - `text-slate-400` used for optional-field markers (`ContactForm.tsx` line 329) sits at ~4.5:1 contrast on white — borderline AA, fail WCAG 2.2 AAA.
- No raw `<div onClick>` patterns found beyond a handful in tab navigation; verify each is keyboard-accessible.

### B-5. Search experience

- **Command palette (`Cmd+K`)** indexes notices, chemicals, quizzes, education modules, accidents. Good entry point; not surfaced visibly in the header on desktop (only a "/" hotkey hint).
- **`/law-search`:** input + voice toggle, but query is **not URL-bound** — results not bookmarkable, browser back loses state. No autocomplete, no recent searches, no "did you mean".
- **`/accidents`:** filter UI via `LadderStatsCard`; filter state is in React, not URL. No explicit empty-state copy.
- **`/chemical-database`:** simple text search, no GHS/CAS filter visible at hub.
- **`/glossary`:** in-page search; not exposed in the global palette.
- **`/chatbot`:** input + citation badges; no pre-question prompts or example queries to guide first-time users.

### B-6. Forms

- **ContactForm (`web/src/app/(main)/contact/ContactForm.tsx`):** required vs optional clearly marked; submit-disabled-on-send; success state; HTML5 `required` only — no real-time validation; no `autocomplete` (`email`, `tel`, `organization`, `name`) attributes.
- **Diary form (`safety-diary/.../diary-form-required.tsx`):** uses zod schema and field-level errors. Good. No `autocomplete` on date/text.
- **/chemical-ra step form:** two-step flow; no inline validation, errors surface after submit.
- **/ky/new:** modal-based wizard, uses `role="dialog"`. Mobile small-screen `max-h-[95vh]` and `overflow-y-auto` are not applied uniformly.
- **/feedback:** redirects to /contact with no contextual pre-fill (`next.config.ts` line 52 redirects `/feedback` → `/contact?category=demo`).
- No `react-hook-form` adoption — manual state across forms causes duplicated validation logic.

### B-7. Back / forward navigation

- Tab state in `/accidents` and `/accidents-analytics` is client-only — no `?tab=` URL parameter. Browser back/forward lose state. **Bookmark-share-broken.**
- `/law-search?q=` URL pattern is not implemented — losing a refresh.
- `/chatbot` thread history isn't URL-driven (only `/chatbot/share/[id]` for explicit shares).

### B-8. Information density (above-the-fold)

- Home: value prop visible in `NewHomeHero`; flagship grid follows. Acceptable.
- `/laws`: Suspense fallback hides content for several seconds; the fold can be empty on cold load.
- `/accidents`: title + provenance counts visible above the fold, but filter affordance requires scroll.
- `/chatbot`: usage warnings and law-badges visible; chat input below the fold on small viewports.
- `/education`: page header rendered immediately; subroute cards below.

### B-9. Mobile operation

- Most primary buttons use `py-2.5` → ~40 px height. The sticky tab navigation (`px-4 py-2`) is closer to 36 px, **below 44 px touch target** in WCAG 2.5.5.
- Sticky elements (`tab-navigation` `sticky top-0`) work; mobile keyboard interactions on `/contact` and `/safety-diary/new` not verified live but no obvious blocker.
- Modals do not enforce `max-h-[95vh]` + `overflow-y-auto`; on small screens long forms could overflow.

### B-10. Accessibility-mode coverage

All four modes (outdoor, furigana, easy-japanese, large-text) plus theme (light/dark/system) and language (ja/en) toggles are wired through `app-shell.tsx`. Toggles are reachable from PC sidebar and mobile menu. State persists via context (verified by reading provider implementations). English-Beta only covers some headings/labels via `TranslatedPageHeader`, not body content — flagged as known beta.

---

## 4. Phase C — Fix proposals

### P0 (ship soon — small change, large impact)

1. **CSP `script-src` allowlist** — add `https://www.googletagmanager.com`, `https://pagead2.googlesyndication.com`, `https://ep2.adtrafficquality.google` (AdSense beacon). File: `web/next.config.ts` line 5. Risk: low; verify via DevTools after rollout. Time: 15 min.
2. **Apex → www `301`** — change Vercel project domain redirect from temporary to permanent. Vercel dashboard only. Time: 5 min. Big SEO authority win.
3. **`/accidents` JSON-LD type fix** — replace `newsArticleListSchema` with a new `accidentDatasetSchema` (Dataset type with `distribution`, `temporalCoverage`, `creator`). File: `web/src/app/(main)/accidents/page.tsx` + `web/src/components/json-ld.tsx`. Time: 1 h.
4. **Mascot WebP** — convert `mascot-chihuahua-4.png` to WebP <120 KB and use `next/image` with explicit `width`/`height`. File: `web/public/mascot/`, `web/src/components/mascot.tsx`. Time: 30 min.
5. **HSTS hardening** — extend `Strict-Transport-Security` with `; includeSubDomains; preload` via Vercel header or `web/next.config.ts` `headers()`. Time: 10 min.

### P1 (this sprint)

6. **`next/dynamic` for recharts dashboards** — `/accidents-analytics/AnalyticsDashboard.tsx`, `/stats/StatsDashboard.tsx`. Wrap chart imports, supply skeleton fallback. Time: 1 h.
7. **`Dataset` schema** for `/chemical-database`, `/stats`. **`QAPage`** for `/chatbot`. **`DefinedTermSet`** for `/glossary` + `/laws/glossary`. **`Quiz`** for `/exam-quiz/[slug]`. **`Product`** for `/equipment/[id]`. **`ProductCollection`** for `/goods` + `/equipment-finder`. New helpers in `web/src/components/json-ld.tsx`. Time: 4–5 h total.
8. **Sitemap completeness** — add `/security`, `/dpa`, `/laws/bcp` (or remove from footer), `/lms` (or remove from nav), `/diversity/elderly|lgbtq|non-regular|remote|women`. Decide canonical vs `noindex` for `/qa-knowledge`, `/resources`, `/insurance`, `/api-docs`. File: `web/src/app/sitemap.ts`. Time: 30 min.
9. **Sitemap `lastmod` automation** — pull from git mtime per route, or at minimum bump statically each major content release. Time: 1 h.
10. **`/law-search?q=` URL binding** — bind query input to URL, restore on mount, share-friendly. File: `web/src/components/law-search-panel.tsx`. Time: 2 h.
11. **`/accidents` tab in URL (`?tab=`)** — same pattern. Time: 1 h.
12. **Skeleton loading replacements** — replace bare "読み込み中…" with `animate-pulse` skeletons at `/laws`, `/chemical-ra`, `/safety-diary/new`, `/stats`. Time: 1 h.
13. **Visible `<Breadcrumb>` component** — new component fed by route segments, rendered above page title on `/articles/[slug]`, `/circulars/[id]`, `/equipment/[id]`, `/education/**`, `/diversity/**`, `/laws/**`. Time: 3 h.
14. **Form autocomplete attributes** — add `autoComplete="email" | "tel" | "name" | "organization"` to `ContactForm.tsx`, diary form, ky form. Time: 30 min.
15. **Skip-to-content link** — add `<a href="#main-content" class="sr-only focus:not-sr-only ...">本文へスキップ</a>` in `app-shell.tsx`; ensure `<main id="main-content">` is set. Time: 15 min.

### P2 (next sprint)

16. **Screenshot WebP migration + responsive `sizes`** — convert `web/public/screenshots/*.png` (50+ files) and update consumers. Time: 3 h.
17. **`Course` schema per /education leaf**. Time: 2 h.
18. **English `lang="en"` wrappers** in `TranslatedPageHeader` and similar bilingual components. Time: 1 h.
19. **Tab navigation touch target ≥ 44 px** — bump `tab-navigation.tsx` button height. Time: 15 min.
20. **Modal `max-h-[95vh]` + `overflow-y-auto`** convention for `/ky/new`, `/safety-diary/new`. Time: 30 min.
21. **Empty-state copy** for `/law-search`, `/accidents` filtered view, `/chemical-database`, `/glossary` search. Time: 1 h.
22. **`/diversity` hub** — surface all 9 subroutes; back-link from each leaf. Time: 1 h.
23. **`/law-hierarchy`** promotion into header nav under "法令". Time: 15 min.

### P3 (later)

24. **Lowercase redirect via `middleware.ts`** for case-insensitive inbound links. Time: 1 h.
25. **Real-time form validation** via `react-hook-form` + `zod` (already in repo for diary). Migrate ContactForm, /chemical-ra step form. Time: 4 h.
26. **`react-hook-form` consolidation** across all forms. Time: 4 h.
27. **English-Beta body translations** — out of scope of audit, beta.
28. **Color-contrast pass** — replace `text-slate-400` on white with `text-slate-500` or darker. Time: 30 min.
29. **Recent-searches / suggestions** for `/law-search` and `/glossary`. Time: 4 h.
30. **Decision on `/wizard`** — finish or delete (still in header nav with NEW badge). Confirm with owner.

### ROI top 15 (recommended immediate batch)

1. P0-1 CSP allowlist (analytics actually running)
2. P0-2 Apex→www 301 (SEO authority)
3. P0-3 /accidents `Dataset` schema
4. P0-4 Mascot WebP (LCP)
5. P0-5 HSTS preload
6. P1-6 recharts dynamic (TBT/INP)
7. P1-7a Dataset for /chemical-database, /stats
8. P1-7b QAPage for /chatbot
9. P1-8 Sitemap completeness (footer↔sitemap mismatch)
10. P1-10 `/law-search?q=` URL binding (bookmarkable)
11. P1-11 `/accidents` tab URL state
12. P1-12 Skeleton replacements
13. P1-13 Visible breadcrumb component
14. P1-14 Form autocomplete attributes
15. P1-15 Skip-to-content link

---

## 5. Outstanding questions for owner

- Should `/wizard` ship or be removed? Header still shows "NEW".
- `/qa-knowledge`, `/resources`, `/insurance`, `/api-docs` — promote into nav, add to sitemap, or keep as `noindex` staging pages?
- `/security`, `/dpa`, `/bcp` — confirm these should be public-indexable; if yes, add to sitemap; if no, remove from footer.
- Sitemap `lastmod` strategy — accept stale hardcoded dates, or wire to git mtime?
- HSTS preload submission timing — only do this once redirects are firmly `301`.

---

*Generated 2026-05-14 against origin/main `84095eb`. No code modifications were made as part of this audit; all proposals require owner approval before implementation.*
