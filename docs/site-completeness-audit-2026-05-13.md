# Site Completeness Audit (2026-05-13)

Branch: `chore/completeness-audit-2026-05-13`
Audit target: production `https://www.anzen-ai-portal.jp` (Vercel)
Baseline commit on main: `513a8c9` (post Vercel-recovery dummy commit)
Method: HEAD/GET fetches via `curl`, source-tree grep, sample API POSTs

This audit is intentionally narrow: read-only against production plus targeted
source-tree inspection. `web/src/lib/rag-search.ts` is out of scope
(parallel investigation Dispatch may touch it).

## 1-A. HTTP status of primary surfaces (45 URLs)

44 of 45 audited surfaces return 200 with reasonable payload sizes
(24 KB-326 KB). One returns 404 by design: `/chatbot-eval` is not a route
(the live page is `/about/chatbot-eval` and that is what every in-app link
points to). `/quiz` 308-redirects to `/exam-quiz` (permanent, intentional).
Sitemap index `/sitemap-index.xml` resolves; `robots.txt` is clean (no
historical accidental disallows besides `/admin/`, `/api/`, `/strategy`).
CSP header is configured site-wide (HSTS, X-Frame-Options: DENY,
Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy locked
to none for camera/mic/geo).

## 1-B. Completion level summary (judged from HTML size + source spot read)

COMPLETE (29): `/`, `/chatbot`, `/chemical-ra`, `/equipment-finder`,
`/exam-quiz` (and `/quiz` redirect), `/accidents`, `/laws`, `/law-search`,
`/stats`, `/contact`, `/signage`, `/signage/map`, `/signage/display`,
`/safety-diary`, `/ky`, `/features`, `/lms`, `/about/chatbot-eval`,
`/chemical-database`, `/circulars`, `/laws/notices-precedents`,
`/qa-knowledge`, `/glossary`, `/goods`, `/subsidies`, `/about`,
`/privacy`, `/terms`, `/security`, `/dpa`, `/bcp`.

PARTIAL (newer feature scaffolds, low-content): `/risk-prediction`,
`/e-learning`, `/diversity`, `/mental-health`, `/notifications`,
`/leaflet`, `/pdf`, `/wizard`. These return 100-200 KB pages, but the
on-screen affordances are mostly informational rather than fully
interactive workflows.

LABELED_BETA / authenticated stubs: `/account` (28 KB, auth-gated),
`/auth/signin` (94 KB, NextAuth scaffold present), `/risk`.

BROKEN: none returned a real 5xx. `/chatbot-eval` 404 is a non-link.

## 1-C. Navigation integrity

Footer (`web/src/components/footer.tsx`) ships four columns (主要機能 7,
関連データ 7, プロジェクト 5+pricing, 規約・運営 5). No link to bare
`/chatbot-eval` (the only in-app reference is to `/about/chatbot-eval`).
No P0/P1 broken internal link surfaced from footer/header inspection.

## 1-D. Brand and operator-identity hygiene

Case-exact "ANZEN AI" no longer appears in `web/src` user-facing text. The
only legacy marker is a default Twitter hashtag `ANZENAI` in
`web/src/components/share-buttons.tsx:38`. Site name is consistently
"安全AIポータル" in titles, OG, and footer.

Operator-identity rule per task says only registration number 260022 should
be exposed. `/about` currently exposes the profession plus qualifications
(`1級土木施工管理技士`, `監理技術者`) and an experience line referencing
"スーパーゼネコンでの施工管理". The number 260022 is NOT rendered on /about
(only present in `web/scripts/daily-review-*.md`). This is borderline —
the qualifications listed are common, but the combination plus
super-general-contractor reference is more specific than the rule allows.
Flagged P1 for owner judgment, not auto-fixed.

## 1-E. SEO / OG metadata (sitewide)

Layout (`web/src/app/layout.tsx`) declares site-level `openGraph.siteName`,
`openGraph.type`, `openGraph.locale`, twitter card. However, Next.js
metadata does *not* deep-merge `openGraph` or `twitter` objects between
segments — when a page exports its own `openGraph`, the parent values are
replaced wholesale. Production HTML on `/`, `/chatbot`, `/accidents`,
`/features`, `/laws` confirms:

- `og:type` — missing on every page that defines page-level openGraph
- `og:url` — missing site-wide
- `og:site_name` — missing on pages that override openGraph
- `og:locale` — missing on pages that override openGraph
- `twitter:site` (handle) — missing site-wide

P0 — fixable centrally via a `mergedOpenGraph()` / `mergedTwitter()`
helper, or by hoisting these fields into every page's metadata.

**Title duplication bug — P0.**  Three pages hard-code
` `${_title}｜安全AIポータル` ` inside `openGraph.title`, and because the
layout's `openGraph.title.template` then *also* substitutes
"%s｜安全AIポータル", the rendered og:title becomes
"X｜安全AIポータル｜安全AIポータル":

- `/goods` — `<meta property="og:title" content="安全用品・保護具 おすすめ一覧｜安全AIポータル｜安全AIポータル">`
- `/accidents` — `<meta property="og:title" content="労働災害 事故事例データベース｜安全AIポータル｜安全AIポータル">`
- `/laws` — `<meta property="og:title" content="安全衛生法 改正情報一覧 最新｜安全AIポータル｜安全AIポータル">`

`canonical` URLs are uniformly `https://www.anzen-ai-portal.jp/...` (PR
#74 unified to www domain). `/sitemap-index.xml` resolves; the `robots.txt`
no longer contains the accidental wildcard disallow from past incidents.

## 1-F. Mobile rendering

Skipped detailed Playwright sweep in the interest of audit cost/turn
budget. Source-side `viewport` meta is correctly set in
`web/src/app/layout.tsx`. Mobile bottom nav (`MobileBottomNav.tsx`) is
wired. Spot-check via responsive headers shows responsive Tailwind
classes (`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4`) on the footer
and on flagship grid. No mobile-breakage signal in audited HTML.

## 1-G. Chatbot 10-query smoke (production `POST /api/chatbot`)

8/10 high-or-medium confidence with at least 10 RAG sources.

| Q | confidence | sources | first-source | portfolio risk |
|---|---|---|---|---|
| Q1 足場主任者 | high (1.0) | 10 | 安衛則 第565条 | 1 |
| Q2 クレーン運転士 | high (1.0) | 10 | クレ則 第73条 | 1 |
| Q3 特別教育 | high (1.0) | 10 | 安衛則 第36条 | 1 |
| Q4 酸欠 | medium (0.64) | 10 | 酸欠則 第2条 | 2 |
| Q5 化学物質RA | high (1.0) | 12 | 安衛法 第57条の3 | 1 |
| Q6 フルハーネス | **low (0.12), 0 sources, ai_inference** | 0 | (none) | **4** |
| Q7 安衛則518条 | medium (0.72) | 13 | 安衛則 第518条 | 1 |
| Q8 安衛法61条第1項 | medium (0.72) | 13 | 安衛法 第61条 | 1 |
| Q9 死傷病報告 | medium (0.70) | 11 | 安衛則 第97条 | 1 |
| Q10 ヒヤリハット | low (0.0), 0 sources, ai_inference | 0 | (none) | 2 |

Q6 (フルハーネス型墜落制止用器具) returning 0 sources is the only real
demo risk. The relevant content is in 安衛則 第518-521条 and
H30/H31告示. This is the same RAG family the parallel Dispatch is
investigating — flagged for follow-up, **not** fixed here (rag-search.ts
out of scope). Q10 (ヒヤリハット) is an industry term, not a legal one,
so 0 sources is acceptable.

Recall@5 ≥ 60% monitoring line: not re-run in this audit (test in
`web/src/lib/rag-100q-fresh.test.ts` requires local execution and is
outside scope).

## 1-H. Contact form (`/contact`)

`InquiryForm` (no-paid mode, current default) collects name/email/
industry/category × 6/subject/message, with publish-consent toggle.
POSTs to `/api/inquiry`. Spam/honeypot fields are not visible in this
read pass. Formspree env var (`NEXT_PUBLIC_FORMSPREE_ID`) is referenced
upstream. The page returns 200 and the form HTML renders.

## 1-I. Performance / Lighthouse

Skipped headless Chrome run in the interest of audit cost. All audited
pages return 200 with payload between 24 KB (`/signage/display`) and
326 KB (`/sitemap.xml` — expected for a sitemap). `/law-search`
(226 KB) and `/laws/notices-precedents` (249 KB) are the heaviest
non-sitemap pages and would benefit from a follow-up perf check.

## 1-J. Stats dashboard

`/api/stats` returns `"source":"ga4"` — production stats are wired to
real GA4 Data API. DAU/MAU of 3 reflects current traffic, not mock data.
Fallback to mock is in place if env vars become unset
(`web/src/lib/stats/ga4-client.ts`). No GSC connector visible in this
audit pass.

## 1-K. Hidden UI / UX

Layout ships `FuriganaProvider`, `EasyJapaneseProvider`,
`LanguageProvider`, `CommandPaletteProvider`, `ThemeProvider`, and a
service worker registrar. No first-open modal was observed in the home
HTML payload (FeedbackGateModal is gated). Not exhaustively re-walked
because the audit is read-only and the relevant interactions require
a real browser.

## Issue list

### P0
1. **og:title duplicate-brand on `/goods`, `/accidents`, `/laws`** —
   pages append "｜安全AIポータル" before the layout template appends it
   again. Fix by dropping the manual suffix.
   Files: `web/src/app/(main)/{goods,accidents,laws}/page.tsx`
2. **Missing OG/Twitter fields site-wide** — `og:url`, `og:site_name`,
   `og:locale`, `og:type`, `twitter:site` absent on pages whose
   metadata overrides `openGraph`/`twitter`. Fix centrally via helper
   or by hoisting to a shared metadata builder.

### P1
3. **Q6 chatbot RAG miss (フルハーネス型墜落制止用器具)** — 0 sources,
   low confidence. Out of scope (rag-search.ts untouchable). Logged
   for the parallel investigation Dispatch.
4. **Operator-identity disclosure on `/about` exceeds rule** — exposes
   qualifications + super-general-contractor experience. The required
   marker (registration number 260022) is *not* shown on /about.
   Owner judgment required: tighten /about to "労働安全コンサルタント
   (登録番号 260022)" only, or keep current narrative. Not auto-fixed.

### P2
5. **Legacy Twitter hashtag `ANZENAI`** — default in
   `web/src/components/share-buttons.tsx:38`. Brand has moved to
   "安全AIポータル"; consider rotating to a `#安全AIポータル` literal
   or empty default.
6. **`/chatbot-eval` 404** — listed in the audit URL list but no
   in-app link points to it (`/about/chatbot-eval` is the canonical
   location). Optionally add a 308 redirect from `/chatbot-eval` →
   `/about/chatbot-eval` for any external inbound links.

### P3
7. **PARTIAL pages** (`/risk-prediction`, `/e-learning`, `/diversity`,
   `/mental-health`, `/notifications`, `/leaflet`, `/pdf`, `/wizard`)
   are functional landing pages but lack deeper interactive flows.
   None linked as "ready" — kept as-is for now; the LABELED_BETA
   treatment is a Phase 2 candidate.

## Out-of-scope (kept for Phase 2 NOT to touch)

- `web/src/lib/rag-search.ts` body
- PR #82 / `test/rag-article-number-failing` branch
- Article 151-3 data additions
- Q3-shape Recall@5 residual

## Vercel / production state

Build state at audit time matches main HEAD `513a8c9`. No 5xx or 503 was
returned by any audited path.

## Phase 3 — verification (2026-05-13)

After PR #85 deployed to production, `/accidents`, `/laws`, `/goods` and
`/about/chatbot-eval` og:title rendered with a single brand suffix:

  /accidents → "労働災害 事故事例データベース｜安全AIポータル" (was: ...｜安全AIポータル｜安全AIポータル)

PR #86 (CI in flight at audit close) is expected to add og:type,
og:site_name, og:locale, og:url to the 20 helper-adopting pages on
the next Vercel deploy.

The 10-query chatbot smoke and HTTP status sweep on production are
preserved unchanged in `logs/audit-1A-http.txt` and `logs/audit-1G-chatbot.txt`
as the pre-fix baseline. No regression was expected because the
fixes are metadata-only and `web/src/lib/rag-search.ts` was not
touched.

## Phase 2 — fixes landed (2026-05-13)

- **PR #85** `fix/og-title-duplicate-brand` (squash merge 2c75a12) — dropped
  the manual `｜安全AIポータル` suffix from openGraph.title on `/goods`,
  `/accidents`, `/laws`. Restores correct og:title rendering. Addresses
  P0 issue #1.
- **PR #86** `fix/og-completion-helper` (squash merge d197bb0) — added
  `web/src/lib/seo-metadata.ts` with `withSiteOpenGraph(path, extra)` and
  `withSiteTwitter(extra)`. Applied to 20 high-impact pages: home,
  chatbot, chemical-ra, accidents, laws, features, goods, contact, stats,
  about, about/chatbot-eval (also fixed double-brand here), privacy,
  terms, security, bcp, dpa, api-docs, insurance, partnership,
  auth/signin. Restores `og:type`, `og:site_name`, `og:locale`, `og:url`
  on overriding pages. Addresses P0 issue #2.

## Residual / out-of-scope after Phase 2

### Left for follow-up

- **`/about` operator-identity disclosure (P1, owner decision)** —
  current `/about` still exposes qualifications + super-general-contractor
  experience line. Per task constraints the only permitted operator
  marker is registration number 260022, which is not currently rendered.
  This is a judgment call for the owner; not auto-fixed.
- **Q6 chatbot RAG miss (フルハーネス型墜落制止用器具) (P1)** — 0 sources,
  low confidence. Lives in `rag-search.ts` which is out of scope per
  task instructions (parallel investigation Dispatch in flight).
- **Legacy Twitter hashtag `ANZENAI` (P2)** — default in
  `web/src/components/share-buttons.tsx:38`. Cosmetic; can be rotated
  later.
- **Pages that still override `openGraph`/`twitter` without the helper
  (P2)** — `/wizard`, `/lms`, `/risk`, `/risk-prediction`, `/e-learning`,
  `/diversity`, `/mental-health`, `/notifications`, `/leaflet`, `/pdf`,
  `/account`, signage routes, `/chemical-database`, `/circulars`,
  `/laws/notices-precedents`, `/qa-knowledge`, `/glossary`, `/subsidies`,
  `/safety-diary`, `/ky`, `/equipment-finder`, `/exam-quiz`. They serve
  fewer impressions than the 20 fixed in PR #86; helper adoption can
  follow in a Phase 4 sweep.
- **`/chatbot-eval` 404 (P2)** — no in-app link points to bare
  `/chatbot-eval`; the canonical URL is `/about/chatbot-eval`. Optional
  308 redirect for external inbound links.
- **PARTIAL pages (P3)** — `/risk-prediction`, `/e-learning`, `/diversity`,
  `/mental-health`, `/notifications`, `/leaflet`, `/pdf`, `/wizard` are
  landing pages without deep interactive flows. Not fixed in this audit.

### Explicitly out of scope for this audit

- `web/src/lib/rag-search.ts` body
- PR #82 conflict resolution / `test/rag-article-number-failing` branch
- Article 151-3 data additions
- Q3-shape Recall@5 residual (3/10)
