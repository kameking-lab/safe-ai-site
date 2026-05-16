# Content Quality & Brand-Risk Audit — 2026-05-16

Inventory of low-quality content and unnecessary features that pose brand risk
to the owner (a licensed Occupational Safety Consultant). The site is intended
to double as a portfolio for industry-association sales pitches, so any
fabricated authority claims or AI-generated filler is a direct liability.

This is a **proposal only**. No files are deleted or modified by this PR. Each
item is graded P0/P1/P2/P3 and the impact section explains what breaks if the
item is removed.

- **P0 — remove immediately**: brand damage is essentially certain
- **P1 — archive (no-index + 301)**: keep URL alive but stop serving the content
- **P2 — keep with mandatory fixes**: add sourcing, fix wording, tighten scope
- **P3 — watch list**: low priority, revisit after P0/P1 ships

Origin/main HEAD at audit time: `5ae0c87` (PR #181, "fix(quality) P2x5 + P3x1").
Audit branch: `audit/content-quality-2026-05-16`.

---

## Category A — Fabricated "past exam / forecast" question content (P0)

The owner has explicitly stated, twice now, that fabricated past-exam and
forecast questions for skill-training courses are "garbage" (「正直創作した過去問とか
技能講習の予想問題はゴミ」). The current codebase still ships large quantities of
exactly this. None of the question banks below are real past papers — they are
AI-generated facsimiles, often with `id: "2025-sg-001"`-style identifiers that
imply an actual sitting of an exam that has not yet taken place (the 2025
労働安全コンサルタント試験 is administered in October each year and the explanations
are written in a uniform AI voice).

### A-1 — `/exam-quiz` flagship route is titled "資格試験 過去問クイズ" (P0)

- Route: `web/src/app/(main)/exam-quiz/page.tsx:11`
  - `_title = "安全衛生 資格試験 過去問クイズ"`
  - `_desc = "労働安全コンサルタント・衛生管理者・ボイラー技士など全資格の過去問クイズ。..."`
- The route literally calls fabricated content "過去問" (past exam papers).
  For a consultant-branded portal this is an authority claim that is not true,
  and 安全コンサルタント試験 past papers are copyrighted material in any case.
- **Recommendation**: P0 — relabel UI to honest framing (e.g., "学習用ドリル"
  with a clear "本サイト独自の演習問題であり、本物の過去問ではありません" disclaimer)
  OR archive the route entirely and 301 to `/education` / `/e-learning`. The
  owner instruction strongly suggests archival is preferred.
- **Impact if archived**: lose `/exam-quiz`, `/exam-quiz/[slug]`,
  `/exam-quiz/[slug]/result`; remove `RelatedPageCards` link in `/e-learning`
  (`web/src/app/(main)/e-learning/page.tsx:52-56`); remove from sitemap
  (`web/src/app/sitemap.ts`), search index (`web/src/lib/search-index.ts`),
  features catalog (`web/src/data/features-catalog.ts`), homepage value hero
  (`web/src/components/home-value-hero.tsx`), and any nav links in
  `web/src/components/app-shell.tsx`.

### A-2 — `web/src/data/exam-questions/` 25 fabricated cert banks (P0)

```
2023-safety-general.ts        587 lines
2023-safety-law.ts            604
2024-safety-general.ts        583
2024-safety-law.ts            603
2025-safety-general.ts        264   ← year not yet administered
2025-safety-law.ts            274   ← year not yet administered
blasting.ts                   771
boiler-1st-class.ts           161
boiler-1st.ts                 332
boiler-2nd.ts                 376
boiler-maintenance.ts         608
boiler-weld-normal.ts         771
boiler-weld-special.ts        771
crane-cargo.ts               1539
crane-derrick.ts             1479
crane-mobile.ts              1478
crane-only.ts                1478
diving.ts                    1539
env-measure-1st.ts           1250
env-measure-2nd.ts            846
forestry-wire.ts              771
gamma.ts                     1645
gas-welding.ts                771
health-1st.ts                 379
health-2nd.ts                 285
health-consultant.ts          160
hyperbaric.ts                 771
xray.ts                      1646
```

Total ≈ 22,300 lines across 28 files. Each entry has the shape of a real
exam item (`questionNumber: 1`, `subject: "safety-general"`, choices ア〜オ,
`relatedLaw` citations) which makes the fabrication look authoritative.

- Sampled `2025-safety-general.ts:1-80`: questions about ISO 45001, GHS
  pictograms, hyperbaric work — all stylistically uniform AI prose, no
  citation to a real past sitting.
- Sampled `2023-safety-general.ts:1-60`: claims to be 2023 exam questions
  but covers the exact same broad topics (ハインリッヒの法則, RA手順, 本質安全化)
  any AI prompt would produce.
- **Recommendation**: P0 — delete the entire `web/src/data/exam-questions/`
  directory in the follow-up PR, alongside A-1 removal.
- **Impact if removed**: dead-codes the `/exam-quiz` route (consistent with
  A-1 archival). The `relatedLaw` strings are not referenced by the laws DB,
  so no cross-link breakage. Search index and sitemap need regeneration.

### A-3 — `web/src/data/mock/quiz/cert-quiz/` 10 fabricated cert banks (P0)

Per `web/src/data/mock/quiz/cert-quiz/index.ts:1-3`:
> 資格試験別100問クイズ - 中央レジストリ / 10資格 × 100問 = 1,000問

```
anzen-arch.ts          412   労働安全コンサルタント（建築）
anzen-civil.ts         412   労働安全コンサルタント（土木）
env-measure-1st.ts     432   第一種作業環境測定士
health-1st.ts          412   第一種衛生管理者
health-2nd.ts          412   第二種衛生管理者
health-consultant.ts   409   労働衛生コンサルタント
hyperbaric.ts          424   高圧室内作業主任者
sanketsu-2nd.ts        427   酸欠・硫化水素 第二種
toku-chem.ts           426   特定化学物質 作業主任者技能講習
yuki-yozai.ts          426   有機溶剤 作業主任者技能講習
```

Total 1,000 fabricated questions. These are **technical-training-course**
(技能講習) predictions — the exact thing the owner called out as garbage.

The 安全コンサルタント (建築/土木) cert is the owner's own qualification, which
makes shipping fake "predicted" questions for it the worst-case brand-damage
combination: a licensed consultant publishing AI-generated facsimile questions
of the exam that licenses them.

- **Recommendation**: P0 — delete this entire directory.
- **Impact if removed**: dead-codes the `/exam-quiz` flagship card array
  (`CERT_QUIZZES` in `index.ts`) and the cert-quiz player/result pages under
  `/exam-quiz/[slug]/`. Same downstream cleanup as A-1.

### A-4 — `web/src/data/mock/elearning-extra-questions.ts` (P1 — review and source)

- 200 additional quiz items spread across 20 e-learning themes (7 questions
  per theme as confirmed by the header comment at lines 1-4).
- Sampled content: chemical-RA, heat-stroke, confined-space, noise,
  ergonomics. The answers are correct and tied to specific articles
  (`安衛則第518条`, `WBGT 28度`, `腰痛予防対策指針`), so these are
  **study aids**, not falsified exam papers.
- Distinct risk vs. A-1/A-2/A-3: these are not advertised as past exams.
  They are presented inside `/e-learning` as theme-by-theme drills, which is
  a legitimate use case for a safety consultant's site.
- **Recommendation**: P1 — keep, but require every question to carry the
  source article/regulation in a visible footer instead of only in the
  `explanation` string, and remove any `id` pattern that mimics past-exam
  numbering. If sourcing cannot be guaranteed item-by-item, downgrade to P0
  and delete alongside A-1/A-2/A-3.
- **Impact if removed**: `/e-learning` themes drop from 10 to 3 questions
  each. The catalog metadata at `elearning-themes-data.ts` is unaffected.

### A-5 — `/exam-quiz` SEO surface area (P0 follow-up)

The route is currently linked from:
- Home value hero (`home-value-hero.tsx`)
- Glossary cross-links (`(main)/glossary/page.tsx`)
- E-learning Related Cards (`(main)/e-learning/page.tsx:52-56`)
- Features catalog (`data/features-catalog.ts`)
- Sitemap (`app/sitemap.ts`)
- Lighthouse work tracked it as `/quiz` → `/exam-quiz` (PR #145).

All of these need to be cleaned in the follow-up PR. Search-index entry must
also be dropped (`lib/search-index.ts`).

---

## Category B — Missing or unclear sourcing (P2)

### B-1 — `industry-*` accident cases mixed into the main DB (P2)

- File: `web/src/data/mock/real-accident-cases-diverse-industries.ts`
- 18 entries with id prefix `industry-*` (警備, 造園, 整備, 縫製, 小売, 医療, 介護,
  食品, 運輸, 清掃).
- Per `web/src/lib/accident-source.ts:20-22` these fall back to a source label
  of "当サイト独自収集事例（業種網羅分）". The file header (lines 1-7) says they
  are "公開情報に基づき再構成" — reconstructed events, not direct excerpts.
- The user-facing warning at
  `web/src/components/accident-analysis-panel.tsx:82` does say "⚠ このタブは
  当サイト独自収集の参考事例です。統計的代表性はありません" but only on the
  analysis tab; the main accidents list still mixes these with verified
  `mhlw-*` cases sourced from 職場のあんぜんサイト.
- **Recommendation**: P2 — add a per-card "再構成事例" badge whenever
  `id.startsWith("industry-")`, and surface the disclaimer next to the
  case title (not only on the analysis tab). Do NOT delete — coverage of
  警備/介護/縫製 industries is genuinely useful, the issue is presentation
  parity with mhlw-* records.
- **Impact**: 18 cards get a visible badge; no URL changes.

### B-2 — `community-cases` operator-authored UGC seed (P1) — **resolved-pr-198**

> **Status (2026-05-16):** highest-priority sub-fixes shipped in PR #198 —
> `faqPageSchema` removed from `/qa-knowledge`; all four fake aliases in
> `community-cases.ts` replaced with `（運営チーム作成事例）`; header copy on
> `/community-cases` + `community-voice-section.tsx` rewritten to "労働安全
> コンサルタント監修のもと運営チームが作成した参考事例". PR #194 had
> already corrected the most overt metadata wording; this completes the
> brand-risk fix. Route preserved (audit option (a) — relabel, not archive).


- File: `web/src/data/mock/community-cases.ts:1-7`
- Comment: "公開デモ用に、運営側が用意した「実体験ベース」の事例。"
- Each entry has a pseudo-random alias ("匿名のコアラ#3421", "匿名のフクロウ#7882")
  that mimics genuine community submissions.
- `/community-cases` is publicly indexed and the same seed data is the source
  for `/qa-knowledge` FAQ JSON-LD (`(main)/qa-knowledge/page.tsx:30-39`).
  This means Google can be served a `FAQPage` schema populated with
  operator-fabricated Q&A — a clear schema-spam risk that can trigger manual
  action against the domain.
- **Recommendation**: P1 — either (a) relabel as "監修コメント付き 事例集"
  and drop fake aliases, or (b) archive `/community-cases` and `/qa-knowledge`
  until real UGC submissions land. Until then, **remove `faqPageSchema` from
  `/qa-knowledge`** as the highest-priority sub-fix (this is the only piece
  Google sees as Q&A pairs).
- **Impact**: dropping `faqPageSchema` removes one rich-result eligibility
  but cannot trigger spam action. Archival of both routes removes 2 nav
  entries; relabel keeps them but rewords aliases ("運営チーム作成事例" etc.)

---

## Category C — Redundant / low-use features (P1)

### C-1 — `/stats` public dashboard fed by mock numbers (P1) — **resolved-pr-195**

> **Status (2026-05-16):** shipped in PR #195. Audit option (b) was taken
> (banner + demoted framing) and option (a) was partially applied
> (`robots: { index: false, follow: true }`) so sample numbers cannot
> rank in search. The misleading `schema.org/Dataset` JSON-LD was also
> removed; only `WebPage` + `BreadcrumbList` remain. Page title is now
> "利用統計ダッシュボード（サンプル表示）"; existing in-page amber banner
> (rendered on `source !== "ga4"` or `pv === 0`) explains the mock state.


- File: `web/src/app/(main)/stats/page.tsx`
- Title: "利用統計（公開ダッシュボード）" — "8 セクションで透明公開".
- Backing data: `web/src/data/mock/stats-mock.ts:13-16`
  > /stats 用のモックデータ（GA4 未設定時のフォールバック）。
  > 数値は実運用に近いオーダーの暫定値
- Effect: Public visitors see fabricated DAU/MAU/PV with no on-page label
  that these are mock numbers. The "透明公開" framing makes this materially
  misleading.
- **Recommendation**: P1 — either (a) gate `/stats` behind admin auth and
  `robots: noindex`, or (b) add a persistent "現在モック数値を表示中" banner
  and demote claim from "透明公開" to "ダッシュボード サンプル". Option (a)
  is the clean fix.
- **Impact**: `/stats` becomes private. No other route imports
  `stats-mock.ts`; sitemap entry should be removed.

### C-2 — `/partnership` (P1) — **resolved-already-in-main**

> **Status (2026-05-16):** verified during category-C cleanup — the page is
> already deleted and `next.config.ts:106` carries
> `{ source: "/partnership", destination: "/contact", permanent: true }`.
> No route on disk under `web/src/app/(main)/partnership/`. PR #96's removal
> had landed; the audit doc was based on a stale tree read.


- File: `web/src/app/(main)/partnership/page.tsx`
- Offers "ホワイトラベル提供 / OEM / 再販案内" for a single-operator
  consultant service. PR #96 ("remove /partnership page") merged 2026-05-13
  but the page is still in the tree on origin/main — confirm whether the
  removal was reverted or never landed; if reverted, this needs re-removal.
- **Recommendation**: P1 — re-archive (404 or 301 to `/contact`). Promising
  white-label/OEM for a single-person operation is overpromise risk; this is
  exactly what PR #96 set out to fix.
- **Impact**: same as PR #96.

### C-3 — `/wizard` (P1) — **resolved-pr-198**

> **Status (2026-05-16):** shipped in PR #198. `/wizard` and `/wizard/result`
> route files plus the `web/src/components/wizard/PDFExport.tsx` component
> deleted. 301 redirects added in `next.config.ts` to
> `/strategy/plan-generator` (which has shipped). Internal links repointed
> in `app-shell.tsx` (2 nav entries), `persona-entry.tsx`,
> `features/use-cases/page.tsx` (3 places), `features/quick-tour/page.tsx`
> (step 7), `features-catalog.ts`. `data/compliance-matrix.json` preserved
> per audit note.


- File: `web/src/app/(main)/wizard/page.tsx`
- 4-step industry/size/hazard wizard whose output overlaps with the much
  newer `/strategy/plan-generator` (PR #173 draft).
- HANDOFF docs reference `Wizard削除` in PR #74 but the route is still
  present. Same status question as C-2.
- **Recommendation**: P1 — archive (301 to `/strategy/plan-generator` once
  that ships, otherwise to `/strategy`). The `data/compliance-matrix.json`
  input is reusable by the plan-generator and should NOT be deleted.
- **Impact**: route removal only; supporting data preserved.

### C-4 — `/lms` β waitlist (P3 — keep)

- File: `web/src/app/(main)/lms/page.tsx`
- Page is honestly labeled "2026年秋公開予定 ウェイティングリスト先行受付中"
  and "本ページの画面は現状モックで、製品仕様の参考表示です".
- No brand-damage risk; this is correctly framed as a future product.
- **Recommendation**: P3 — keep. Note for review only.

### C-5 — `/safety-diary` (P3 — keep, watch usage)

- Flagship feature per `flagship-grid.tsx`. PR #173 (DRAFT) marks it as
  demoted in the 3-pillar reorganization but it remains useful as a record.
- **Recommendation**: P3 — keep; revisit after PR #173 lands and the new
  homepage hierarchy stabilizes.

### C-6 — `/community-cases`, `/qa-knowledge` (see B-2) — P1 archival candidate — **resolved-pr-198 (via B-2)**

> **Status (2026-05-16):** brand-risk fixes shipped in PR #198 (see B-2).
> Routes kept (audit option (a) — relabel, not archive); FAQPage schema
> dropped; fake aliases removed; honest "運営チーム作成事例" framing applied.


Tracked under B-2 since the core issue is sourcing, not redundancy.

---

## Category D — AI-generated placeholder / templated content (P1)

### D-1 — `/articles` SEO content farm (P1)

- Directory: `web/src/data/seo-articles/` — 1,960 articles across 9 JSONL
  files (accidents 500, circulars-001 500, circulars-002 500, circulars-003
  158, chemicals 100, international 60, legal 60, seasonal 52, subsidies 30).
- Sampled `seo-articles-seasonal.jsonl` line 1:
  > 本記事は、製造業における春（3〜5月）の労働災害傾向と現場での重点対策を、
  > テンプレート形式で整理したものです。
- The "テンプレート形式" disclosure is honest, but the volume (≈2,000
  templated bodies) is itself a search-spam risk: Google Helpful Content
  Update and `programmatic SEO` guidelines treat large-volume templated
  bodies as spammy unless each page provides clear unique value.
- The accident-derived and circular-derived subsets are tied to real MHLW
  case IDs / 通達番号 (e.g. `事例ID: 2019-D-000204`, `基発0318第1号`), so
  those are defensible. The seasonal / international / subsidies subsets
  are pure templating.
- **Recommendation**: P1 — keep `seo-articles-accidents.jsonl` and
  `seo-articles-circulars-*.jsonl` (real-MHLW backbones) but archive
  `seo-articles-seasonal.jsonl`, `seo-articles-international.jsonl`,
  `seo-articles-legal.jsonl`, `seo-articles-subsidies.jsonl`. Or, weaker
  option: keep all, but add `noindex` to the seasonal/international/legal/
  subsidies subset until each one is hand-edited.
- **Impact**: removes 202 routes from the sitemap; keeps the bulk (1,758)
  of MHLW-anchored content live. The article index helper
  (`lib/articles.ts`) needs to filter by category if we noindex instead
  of delete.

### D-2 — Templated authority phrasing on the articles index (P2)

- `web/src/app/(main)/articles/page.tsx:37`
  > 公開済み {n} 本。法改正・運用ガイド・業種別の記事を安全AIポータル
  > 専門家チームによる設計で公開しています。
- "専門家チーム" implies multiple consultants. The site is a single-operator
  research project (BCP page confirms this:
  `(main)/bcp/page.tsx:23-27`).
- **Recommendation**: P2 — relabel to "労働安全コンサルタント監修・テンプレート
  設計で公開" or similar honest framing.

---

## Category E — Brand-damaging expressions (P0/P2)

### E-1 — "過去問" misnomer on `/exam-quiz` and downstream links (P0)

Already covered in A-1 / A-5. The single highest-priority wording fix is
removing the "過去問" claim from any user-facing string. Search hits to
audit during cleanup:

- `(main)/exam-quiz/page.tsx:11-13` — title and description
- `(main)/e-learning/page.tsx:52-56` — Related card label & description
- `home-value-hero.tsx` — any "過去問" CTA
- `glossary/page.tsx` — cross-link

### E-2 — `/strategy` hard-coded password in client source (P2, also a security note)

- File: `(main)/strategy/page.tsx:13`
  > `const STRATEGY_PASSWORD = "anzenai2026";`
- Page is noindex'd but the password is in the client JS bundle, accessible
  via View Source. Internal-doc-pretending-to-be-gated is not a brand-damage
  issue per se, but if leadership ever cites it as "confidential", that
  framing is false.
- **Recommendation**: P2 — either move the strategy doc behind a real
  server-side auth check (admin route) or stop calling it gated. Document
  this in `/insurance` / `/dpa` style honesty if kept public.

### E-3 — Operator-fabricated "現場担当者から寄せられた質問" framing (P1)

- `/qa-knowledge` page header (`(main)/qa-knowledge/page.tsx:12`):
  > 現場担当者から寄せられた質問と、労働安全コンサルタントの回答をまとめた
  > ナレッジベース
- Backing data is `COMMUNITY_CASES_SEED` (operator-authored). Until real
  submissions land, this header is materially false.
- **Recommendation**: P1 — covered by B-2 archival/relabel.

### E-4 — Education page "明朗会計 ¥50,000〜" with unbuilt product (P3)

- `(main)/education/page.tsx:7-8`, `EducationContent.tsx:59`
- The on-demand video service is labeled "2026年秋リリース予定 / 事前予約
  受付中". This is acceptable disclosure, but "明朗会計" + a pricing table
  for a not-yet-existing product borders on misleading advertising.
- **Recommendation**: P3 — add a "現時点でオンデマンドはリリース前です。
  講師派遣・カスタマイズ研修は即時対応可能" note above the pricing card.

---

## Priority totals

- **P0 (immediate removal/rename)**: 5
  A-1 `/exam-quiz` route rename or archive,
  A-2 delete `web/src/data/exam-questions/`,
  A-3 delete `web/src/data/mock/quiz/cert-quiz/`,
  A-5 strip downstream `/exam-quiz` links,
  E-1 remove "過去問" wording sitewide.
- **P1 (archive / no-index)**: 6
  A-4 review e-learning extra questions sourcing,
  B-2 `/community-cases` + `/qa-knowledge` archive or relabel,
  C-1 `/stats` admin-gate,
  C-2 `/partnership` re-archival (follow up on PR #96),
  C-3 `/wizard` archive,
  D-1 archive 4 SEO subsets (seasonal, international, legal, subsidies).
- **P2 (keep + fix)**: 3
  B-1 add re-construction badges to `industry-*` accident cases,
  D-2 fix "専門家チーム" wording,
  E-2 fix `/strategy` password framing.
- **P3 (watch)**: 3
  C-4 `/lms` keep as honest β,
  C-5 `/safety-diary` revisit after PR #173,
  E-4 `/education` pre-release pricing disclaimer.

Total flagged: 17 items.

---

## Recommended execution order (for follow-up PRs, not this draft)

1. **PR-A (P0 batch)** — single PR, deletes `web/src/data/exam-questions/`,
   `web/src/data/mock/quiz/cert-quiz/`, archives `/exam-quiz` routes (301
   to `/e-learning`), strips downstream links, regenerates sitemap and
   search index, removes "過去問" wording. Largest blast radius — must be
   reviewed by owner before merge.
2. **PR-B (P1 archival)** — covers C-1/C-2/C-3, B-2, D-1. Each archival is
   a route → `notFound()` or 301; no data file deletions beyond the SEO
   subsets in D-1.
3. **PR-C (P2 wording/sourcing)** — small textual fixes only; safe to ship
   without owner review.
4. **PR-D (P3 watch list)** — defer, document in `outstanding-issues.md`.

---

## Open questions for the owner

1. **A-1 routing**: 301 `/exam-quiz` to `/e-learning`, or hard-archive with
   `notFound()`? 301 preserves any inbound SEO equity; hard-archive is
   cleaner if Google has already begun crawling the fabricated pages and we
   want them out of the index ASAP.
2. **A-4 verdict**: keep the e-learning extra questions with strict sourcing,
   or delete alongside A-1/A-2/A-3? Risk: they are presented in the same UI
   shell as A-1 and a reader may not distinguish "drill" vs "past exam".
3. **C-2/C-3 status**: confirm whether `/partnership` and `/wizard` were
   meant to be removed already (PR #96 and HANDOFF references suggest yes).
4. **D-1 cutoff**: archive the four templated subsets (seasonal /
   international / legal / subsidies = 202 articles) or noindex only?
5. **B-2 path**: archive `/community-cases` + `/qa-knowledge` outright, or
   relabel + drop fake aliases?

Awaiting owner judgment before any follow-up PR is opened. This audit PR
itself touches only `docs/`.
