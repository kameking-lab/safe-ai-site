# Regression Audit — 2026-05-16 (4th Deep Audit)

**Operator:** ANZEN AI Daily Review (automation)
**Model:** Opus 4.7
**Base main HEAD:** 103dba3 (`feat(safety-signs): add JIS Z 9101 safety sign database (110 signs) (#175)`)
**Branch:** docs/regression-audit-may16-2026
**Date:** 2026-05-16
**Predecessors:** docs/site-deep-audit-2026-05-13.md (PR #87), docs/seo-ux-deep-audit-2026-05-14.md (PR #118), docs/lighthouse-audit-2026-05-14.md (PR #135)

## Scope

Same-day surge of 20 merged PRs on main: #155 (GSC OAuth), #156 (industry accident reports), #157 (annual safety plan generator), #158 (KY example DB), #159 (GHS 500-substance expansion), #160 (industry landing pages), #161 (education certification DB), #162 (MHLW circulars +200 entries), #163 (health-checkup scheduler), #164 (mhlw-notices stray comma fix), #165 (glossary 98→250 terms), #166 (cross-tool navigation), #167 (foreign worker hub), #168 (treatment-work balance), #169 (work-environment measurement), #170 (heat-illness prevention hub), #171 (asbestos R4.4 reporting), #172 (mental-health management), #174 (FAQ 200-question hub), #175 (110-sign safety-sign DB).

133 page files changed, 133 data files changed, 51 lib/types files changed. ~85,800 insertions, ~17,200 deletions across 427 files.

Out of scope: behavioural changes inside `rag-search.ts` core (already covered by PR #154-era roadmap), Lighthouse re-measurement (PSI quota), Playwright E2E (no behavioural fixture for new pages yet).

## Methodology

Static analysis: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx vitest run`. Source inspection across new pages, data files, and engine code. Internal-link scan via grep. Sitemap, flagship-nav, and cross-tool-links coverage cross-checked against the route inventory.

## Phase A results

### A-1. Type safety & build health

- `npx tsc --noEmit`: **0 errors**
- `npm run lint`: **0 errors, 4 warnings** (2 pre-existing, 2 new today — see P2-05 below)
- `npx vitest run`: **223/223 tests passing** (27 test files, 5.26s)
- `npm run build`: **success**, no new build warnings
- `@ts-ignore` / `@ts-expect-error`: 1 total occurrence (deliberate, inside `mental-health-rules/index.test.ts`)
- `any` type usage: not detected in any new engine files (wbgt, measurement, asbestos, treatment-balance, mental-health-flow, health-checkup, education-cert, ky-suggestion, safety-plan-generator)

### A-2. Functional & data integrity

- Duplicate-ID check across the day's data drops — **no duplicates found**:
  - safety-signs (110 entries across 5 category files): unique IDs
  - ky-examples (150 entries across 5 industry files): unique IDs
  - glossary (250 terms across 4 batch files): unique terms
  - faqs (200 questions across 4 batch files): unique IDs
  - circulars (1069 entries; +200 today): unique IDs
- Concentration-limits: 14 substances share a Japanese name across different CAS numbers (e.g. `酸化亜鉛` ↔ 1314-13-2 / 1314-22-3; `クリソタイル` ↔ 12001-29-5 / 12172-67-7). These are polymorph/grade variants, not bugs, but the chemical DB UI does not currently differentiate them — see P3-01.
- Industry-slug fragmentation across the day's features — see P2-03.

### A-3. SEO & structured data

- Sitemap (`web/src/app/sitemap.ts`): updated for 13 of the day's 16 new feature surfaces. **Missing**: `/ky-examples`, `/education-certification`(+`/finder`), `/treatment-work-balance`(+`/plan-builder`, +`/illness-guide/[illness]`). See P1-02.
- Canonical / og bug on `/faq/[category]` — all 4 category pages and `/faq/search` inherit `canonical: "/faq"` from layout; the dynamic page is `"use client"` with no `generateMetadata`. See P1-01.
- og:image missing on 3 of the day's hub pages (`/strategy/plan-generator`, `/foreign-workers`, `/asbestos-management`). See P2-01.
- `/ky-examples/page.tsx` has no JSON-LD structured data at all (no breadcrumb, no WebPage). See P2-02.

### A-4. UX / performance regressions

- All build outputs are static or SSG-prerendered; no SSR runtime cost for the new pages.
- `/foreign-workers/safety-training` passes `SAFETY_MATERIAL_INDEX.all` (≈148 KB raw JSON, 6 industries × multilingual content) into a `"use client"` builder component. Gzip ≈ 35-45 KB. Borderline for the page weight budget — see P2-04.
- All new dynamic routes use `generateStaticParams` so per-industry / per-illness / per-sign pages are SSG, not on-demand SSR.
- No N+1 data-loader patterns introduced in the new engines.

### A-5. Navigation & existing-feature competition

- 4 of the day's features are NOT linked from `flagship-nav.ts`, NOT linked from the footer, and NOT linked from the homepage hero: `/foreign-workers` (#167), `/mental-health-management` (#172), `/ky-examples` (#158), `/faq` (#174). They are reachable only via direct URL or sub-page self-references. See P1-03.
- `cross-tool-links.tsx` (added by #166) lists only the 6 tools that existed at #166 merge time. The 8 features merged after #166 (#167, #168, #169, #170, #171, #172, #174, #175) are not in the cross-tool surface. See P1-04.
- No URL-level conflicts. `/mental-health` (legacy) coexists with `/mental-health-management` (new); `/ky` coexists with `/ky-examples`; `/foreign-workers` coexists with `/diversity/foreign-workers`; `/education` coexists with `/education-certification`. These are intentional product splits and route names are non-overlapping.

### A-6. Data quality & citations

All new domain engines and rule datasets ship explicit citations:

- WBGT engine: JIS Z 8504, ISO 7243, Stull (2011) for natural wet-bulb, Liljegren (2008) for globe-temp approximation, JSOH / MHLW R7 for thresholds. ✓
- Measurement engine: 作業環境測定基準（昭和51年労働省告示第46号）, JISHA 作業環境測定ガイドブック; explicit "decision-support only, final determination by certified consultant" disclaimer. ✓
- Asbestos engine: 石綿則 §3 / §5 / §35-2, 安衛則 §88 / §90, 大気汚染防止法 §18-15 / §18-17; sources cited as MHLW + 環境省 + JATI協会. ✓
- Mental-health engine: 安衛法 第66条の10, 労安衛則 第52条の9〜21. ✓
- Treatment-work-balance engine: MHLW 治療と仕事の両立支援ガイドライン (Reiwa 5 revision). ✓
- Health-checkup engine: 安衛則 第43条 / 第44条 / 第45条 / 第48条 / 特化則 / 有機則 / じん肺則 anchors per rule entry. ✓
- Education-cert engine: 安衛則 第36条 (special education) and 就業制限 articles anchored in rule data. ✓
- Safety-plan generator: 30 templates (10 industries × 3 scales) each cite both common laws and industry-specific laws.

No citations missing.

## Findings by priority

### P0 — broken / data-wrong / blocking

None detected. The day's surge did not introduce any production-breaking regressions.

### P1 — high-impact bugs / SEO blockers / UX gaps

**P1-01 — `/faq/[category]` canonical points all 4 category pages to `/faq`**

- files: [web/src/app/(main)/faq/layout.tsx](web/src/app/(main)/faq/layout.tsx), [web/src/app/(main)/faq/[category]/page.tsx](web/src/app/(main)/faq/[category]/page.tsx)
- Issue: The layout sets `alternates: { canonical: "/faq" }`. The `[category]/page.tsx` is a `"use client"` component with no `generateMetadata`, so it inherits the parent canonical. Result: `/faq/law-system`, `/faq/management`, `/faq/chemical`, `/faq/health-education`, `/faq/search` all advertise canonical `/faq` to Google → de-duplication will collapse them. Additionally, FAQ content renders client-side only, so search engines and the FAQPage JSON-LD on `/faq/page.tsx` do not cover the per-category pages.
- Fix: convert `[category]/page.tsx` to a server component (or split a server wrapper around a client island), export `generateMetadata` that sets per-category title/description/canonical/og:image, and emit a per-category FAQPage JSON-LD with the category's question/answer pairs. PR #174 left these as P1.

**P1-02 — Sitemap missing 3 features added today**

- file: [web/src/app/sitemap.ts](web/src/app/sitemap.ts)
- Missing URLs:
  - `/ky-examples` (PR #158)
  - `/education-certification`, `/education-certification/finder` (PR #161)
  - `/treatment-work-balance`, `/treatment-work-balance/plan-builder`, `/treatment-work-balance/illness-guide/{cancer,stroke,heart-disease,diabetes,mental-health,intractable-disease}` (PR #168)
- Issue: 9 URLs are not announced to crawlers. The 6 illness-guide pages are SSG-prerendered so Google can crawl them via in-site links, but only after the parent feature is itself indexed — and `/treatment-work-balance` is also missing from the sitemap. Compounds with P1-03 (parent feature not in nav).
- Fix: add the 9 entries to `sitemap.ts` with `lastModified: "2026-05-16"`, `priority: 0.75-0.85` matching the existing pattern. Iterate `ALL_ILLNESS_CONDITIONS` for the `/treatment-work-balance/illness-guide/[illness]` URLs.

**P1-03 — 4 features orphaned from main navigation**

- file: [web/src/config/flagship-nav.ts](web/src/config/flagship-nav.ts)
- Missing from any nav surface:
  - `/foreign-workers` (PR #167, 11 status pages + safety-training)
  - `/mental-health-management` (PR #172, 4 pages)
  - `/ky-examples` (PR #158, 150 KY templates)
  - `/faq` (PR #174, 200-question hub)
- Issue: Confirmed by grep — these paths appear only inside their own subtree (self-references). Not on home, footer, header, nor flagship-nav. Sub-pages link back to the hub, but the hub has no inbound link from the rest of the site. Discoverability is effectively zero outside direct URL or search-engine landing.
- Fix: register the 4 hubs under appropriate flagship-nav groups (e.g. `/ky-examples` under the KY/Risk group, `/foreign-workers` under Diversity or under a new "対象者別" group, `/mental-health-management` under Health, `/faq` as a top-level entry alongside Glossary). Match the existing `description:` pattern.

**P1-04 — `CrossToolLinks` lists only 6 of 14 cross-link candidates**

- file: [web/src/components/cross-tool-links.tsx](web/src/components/cross-tool-links.tsx)
- Issue: PR #166 introduced `CrossToolLinks` with 6 entries (accidents-reports, ky-examples, education-certification, health-checkup, plan-generator, industries). Eight features merged afterwards (#167 foreign-workers, #168 treatment-work-balance, #169 work-environment-measurement, #170 heat-illness-prevention, #171 asbestos-management, #172 mental-health-management, #174 faq, #175 safety-signs) are not represented. The component is mounted on 6 hub pages, so 6 surfaces are stale.
- Fix: extend `CrossToolId` and `buildPages()` with the 8 new tools, keep `exclude` semantics, and verify the industry-aware deep-link contextualises for the new tools that have industry-keyed content (heat-illness, foreign-workers, asbestos by level). Consider splitting into two grids ("実務ツール" / "対象者別ガイド") if the count grows past ~10 entries — UI density check.

### P2 — quality / SEO improvements

**P2-01 — og:image missing on 3 hub pages**

- files: [web/src/app/(main)/strategy/plan-generator/page.tsx](web/src/app/(main)/strategy/plan-generator/page.tsx), [web/src/app/(main)/foreign-workers/page.tsx](web/src/app/(main)/foreign-workers/page.tsx), [web/src/app/(main)/asbestos-management/page.tsx](web/src/app/(main)/asbestos-management/page.tsx)
- Issue: `metadata.openGraph` has `type/locale/title/description` but no `images`. Social-share previews fall back to the site-wide default OG, losing the per-page hook.
- Fix: add `images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }]` and the matching `twitter.images` entry, following the pattern in `/heat-illness-prevention/page.tsx`.

**P2-02 — `/ky-examples` has no JSON-LD structured data**

- file: [web/src/app/(main)/ky-examples/page.tsx](web/src/app/(main)/ky-examples/page.tsx)
- Issue: The page emits no breadcrumb JSON-LD, no WebPage / Dataset schema. Adjacent feature hubs (`/health-checkup-scheduler`, `/strategy/plan-generator`) use `PageJsonLd`. KY examples is a 150-entry reference dataset that would benefit from `Dataset` + `BreadcrumbList`.
- Fix: add `PageJsonLd` and a `breadcrumbSchema([{ Top: "/" }, { Tools: "/features" }, { KY事例DB: "/ky-examples" }])` block. Optionally emit a `Dataset` schema with `creator: { "@type": "Organization", name: "厚生労働省" }` for the MHLW-sourced entries.

**P2-03 — Industry-slug fragmentation across features**

- files: see [web/src/lib/accident-analysis.ts](web/src/lib/accident-analysis.ts), [web/src/types/safety-plan.ts](web/src/types/safety-plan.ts), [web/src/data/foreign-worker-materials/](web/src/data/foreign-worker-materials/), [web/src/data/heat-illness-rules/industries.ts](web/src/data/heat-illness-rules/industries.ts)
- Issue: same industry has different slugs across features:
  - "運輸交通業" → `transport` (accidents-reports, industries, heat-illness, KY) vs `transportation` (safety-plan)
  - "医療・福祉" → `healthcare` (accidents-reports, industries) vs `medical` (safety-plan) vs `medical-welfare` (KY) vs `care` (foreign-worker)
  - "建設" / "製造" / "サービス" are consistent
- Each feature works internally and `cross-tool-links.tsx` has explicit `SAFETY_PLAN_TO_SLUG` / `HEALTH_CHECKUP_TO_SLUG` adapter maps, so deep-links cross feature boundaries correctly. The fragmentation is contained today but adds maintenance cost: any new cross-feature surface needs another adapter map.
- Fix: define a canonical `IndustrySlug` enum in `@/lib/industries.ts` (extend `IndustrySlug` from `accident-analysis.ts`) and have each feature alias internally. Or: leave as-is and document the slug map. Recommend the former if Phase 2 cross-tool work is planned; the latter if the 5-bucket / 10-bucket split is intentional product design (5 = accident statistics buckets; 10 = JISHA / 安衛則 categories).

**P2-04 — `/foreign-workers/safety-training` ships ~148 KB of material JSON to client**

- file: [web/src/app/(main)/foreign-workers/safety-training/page.tsx](web/src/app/(main)/foreign-workers/safety-training/page.tsx)
- Issue: page passes `materials={SAFETY_MATERIAL_INDEX.all}` (~148 KB raw, 5 multilingual locales × 6 industries × 5 topics) to a `"use client"` builder. Gzip ≈ 35-45 KB. The builder filters client-side by selected industry/topic so the full set must be available.
- Fix: route the filter through query params and pre-bucket on the server, sending only the active industry's materials (~25 KB raw). Or paginate by topic. Keep the multilingual content but lazy-load locales other than `ja` until requested. Lighthouse mobile audit needed to confirm if this hits FCP/TTI thresholds.

**P2-05 — 2 new lint warnings from today's PRs**

- files: [web/src/app/(main)/exam-quiz/page.tsx:3](web/src/app/(main)/exam-quiz/page.tsx) — unused `Sparkles` import; [web/src/components/signage/signage-floor-plan-editor.tsx:5](web/src/components/signage/signage-floor-plan-editor.tsx) — unused `Save` import.
- Fix: remove the unused imports. Both files were touched after the related icon/button was deleted; trivial cleanup.

### P3 — nice-to-have / data hygiene

**P3-01 — 14 duplicate Japanese names in concentration-limits**

- file: [web/src/data/concentration-limits.json](web/src/data/concentration-limits.json) (after PR #159 expansion to 1546 substances)
- Examples: `酸化亜鉛` (1314-13-2 / 1314-22-3), `臭素` (7726-95-6 / 10097-32-2), `クリソタイル` (12001-29-5 / 12172-67-7), `結晶質シリカ（石英）` (14808-60-7 / 1317-95-9), `モルホリン` (10024-89-2 / 110-91-8), `炭酸カルシウム` (1317-65-3 / 471-34-1), `2,4-ジニトロトルエン` (121-14-2 / 25321-14-6), `1,1-ジメチルヒドラジン` (57-14-7 / 540-73-8), and 6 more.
- Issue: each pair represents legitimately different CAS-registered polymorphs / grades / unspecified forms; not data errors. But the chemical-DB UI currently lists both as plain text rows with identical Japanese names, which looks like a duplicate to end users and complicates search dedup.
- Fix: disambiguate in the UI (suffix with `（CAS: …）` or with a polymorph label when known). Optionally consolidate at the data layer: prefer the standard CAS entry, attach alternate CAS numbers as `aliases: [...]`.

## Phase B priority summary

- **P0:** 0
- **P1:** 4 (faq canonical, sitemap gaps, nav orphans, cross-tool-links staleness)
- **P2:** 5 (og:image gaps, ky-examples JSON-LD, slug fragmentation, foreign-workers payload, lint warnings)
- **P3:** 1 (chemical-DB name disambiguation)

## Phase C — emergency P0 fix

No P0 issues were detected. No hotfix PR cut.

## Phase D — recommended next steps

This doc is delivered as a Draft PR for owner review. Suggested execution order, splittable across separate dispatches to fit the Vercel 24h build quota:

1. **Fix dispatch A — SEO/nav block (P1-01 to P1-04, 1 PR)**: faq metadata conversion + sitemap additions + flagship-nav registrations + cross-tool-links expansion. All four are file-local and review-safe.
2. **Fix dispatch B — polish (P2-01, P2-02, P2-05, 1 PR)**: og:image additions, ky-examples JSON-LD, two lint warnings. Pure additive.
3. **Fix dispatch C — perf/data (P2-03, P2-04, P3-01, scope TBD)**: industry-slug consolidation discussion + foreign-workers payload split + chemical-DB disambiguation. Needs owner direction before implementation.

## Reproduction commands

```
cd web
npx tsc --noEmit              # 0 errors
npm run lint                  # 0 errors, 4 warnings
npx vitest run --reporter=dot # 223/223 pass
npm run build                 # success
```

Industry-slug coverage cross-check:

```
grep -nE "^    id: \"" src/data/heat-illness-rules/industries.ts
grep -nE "^export type IndustrySlug" src/lib/accident-analysis.ts
grep -nE "^export type IndustryId" src/types/safety-plan.ts
grep -nE "MaterialIndustry" src/data/foreign-worker-materials/index.ts
```

Internal-link orphan check:

```
grep -rE "href=\"/(foreign-workers|mental-health-management|ky-examples|faq)\"" src/ \
  | grep -vE "/(foreign-workers|mental-health-management|ky-examples|faq)/"
```

## Phase E — Findings resolution status (updated 2026-05-17)

All P1 findings were resolved the same day as this audit.

| Finding | Resolved by | Merged | Notes |
|---------|-------------|--------|-------|
| P1-01 faq/[category] canonical | PR #180 | 2026-05-16 | Per-category `generateMetadata` added via `faq/[category]/layout.tsx` |
| P1-02 Sitemap missing 3 features | PR #180 | 2026-05-16 | 11 URLs added (`/ky-examples`, `/education-certification`, `/treatment-work-balance` + sub-pages) |
| P1-03 4 features orphaned from nav | PR #180 | 2026-05-16 | All 4 registered in `flagship-nav.ts` subItems and footer |
| P1-04 CrossToolLinks 6→14 tools | PR #180 | 2026-05-16 | 8 new tools added; `CrossToolId` union expanded |
| P2-01 og:image missing on 3 pages | PR #220 | 2026-05-16 | 16-page OG/Twitter metadata audit fixed all gaps |
| P2-05 2 lint warnings | PR #220 | 2026-05-16 | Unused `Sparkles` and `Save` imports removed |

Open items (still outstanding as of 2026-05-17):

| Finding | Status |
|---------|--------|
| P2-02 `/ky-examples` no JSON-LD | Open — tracked for next SEO pass |
| P2-03 Industry-slug fragmentation | Open — owner direction needed before consolidation |
| P2-04 `/foreign-workers/safety-training` 148 KB payload | Open — Lighthouse confirmation needed |
| P3-01 Chemical-DB 14 duplicate JP names | Open — UI disambiguation TBD |

F-category decisions confirmed by PR #234 (2026-05-17):

| Feature | Decision |
|---------|----------|
| F-005 `/signage` | `kept-by-owner` — ky-morning-signage連携+主要シーン |
| F-007 `/qa-knowledge` | `reduced-by-owner` — FAQ 200問リンク+投稿募集CTAランディングに縮小 |
| F-008 accidents trio (`/accidents`, `/accidents-reports`, `/accidents-analytics`) | `kept-by-owner` — SEOリスク>整理メリット |
| F-010 `/safety-diary` | `reduced-by-owner` — 一覧+新規2ページ、LMS時再設計 |
