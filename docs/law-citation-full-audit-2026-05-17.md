# Law citation full-codebase audit — 2026-05-17

Comprehensive law-citation accuracy audit across the entire `web/src/` tree
(data, lib, components, app) plus `docs/`. Builds on the targeted `web/src/data/laws/`
audit landed in PR #208 and extends the check to every TS/TSX/JS/JSON/MD source.

## Methodology

1. **Phase A — Extraction.** Regex over all source files in `web/src/` and
   `docs/` for `<law-token><article-marker>` patterns (`安衛則第612条の2`,
   `労働安全衛生法第28条`, `安衛令別表第3`, etc.). 47 law tokens covered.
2. **Phase B — Verification ruleset.** For each law, a hand-curated `MAX_ARTICLES`
   bound reflects the current e-Gov consolidated text (e.g. 安衛則 ≤ 700,
   労災保険法 ≤ 62, 労契法 ≤ 22). A canonical-abbreviation map flags
   non-standard short forms.
3. **Phase C — Classification.** C0 = article number outside the law's
   existing range (clearly invalid). C1 = stale article from pre-amendment text.
   C2 = effective-date formatting inconsistency. C3 = non-canonical abbreviation
   usage. C4 = other.
4. **Phase D — Fixes.** All C0 findings + intra-data duplicates fixed inline.
   Non-canonical 労安法 / 労安則 / 労安衛法 / 労安規則 forms normalized to
   canonical 安衛法 / 安衛則.

The scan covered **891 files** and identified **4,440 citations** across **231 files**.

## Findings

| Class | Count (pre-fix) | Action | Count (post-fix) |
|-------|-----------------|--------|------------------|
| C0 (out-of-range article)              | 8        | Fixed inline | **0** |
| Intra-law duplicate articleNum         | 2        | Fixed inline | **0** |
| Non-canonical abbreviation (労安*等)    | 80       | Normalized   | **0** |
| C1 (stale article from old revision)   | 0        | n/a          | 0  |
| C2 (effective-date format inconsistency) | 0      | n/a          | 0  |
| C3 (alias use, e.g. full name in prose) | 1,096   | Informational only — no rewrite | 1,096 |
| C4 (other)                             | 0        | n/a          | 0  |

The 1,096 C3 findings are legitimate full-name usages in user-facing prose
(article bodies, FAQ answers, exam-question explanations) and are kept as-is to
preserve reader comprehension; they are not citation errors.

## C0 fixes (8 confirmed citation errors)

| Source | Before | After | Reason |
|--------|--------|-------|--------|
| `web/src/data/faqs/faq-batch-1-law.ts` (law-034) | `安衛令第88条・安衛則第88〜90条` (in body) | `安衛則第89条・第90条` | 安衛令 has 26 articles in 本則; 計画届の手続は 安衛則 第85条以下にあり、安衛令第88条は存在しない |
| `web/src/data/faqs/faq-batch-1-law.ts` (law-034) | `relatedLaws: ["安衛法第88条", "安衛令第88条〜90条"]` | `["安衛法第88条", "安衛則第89条", "安衛則第90条"]` | 同上 |
| `web/src/data/faqs/faq-batch-3-chemical.ts` (chem-029) | `安衛法第577条の2` (本文/relatedLaws) | `安衛則第577条の2` | 安衛法 ≤ 第124条; 第577条の2 は 安衛則 (令和4年改正リスクアセスメント対象物のばく露低減措置) |
| `web/src/data/safety-equipment-db.json` (eq-1035 系 × 3) | `"有機則 第61条"` | `"安衛則 第659条"` | 有機則 ≤ 第38条 (第61条は存在しない); 救急用具の備付けは 安衛則 第659条 |
| `web/src/data/exam-questions/skill-training.ts` (st-sekimen-010) | `労災保険法第65条` | `安衛法第67条` | 労災保険法 ≤ 第62条; 健康管理手帳の交付は 安衛法 第67条 |

## Intra-law duplicate articleNum fixes

| Source | Issue | Action |
|--------|-------|--------|
| `web/src/data/laws/yuki-kisoku.ts` | `有機則 第25条` had two entries — `有機溶剤等の区分の表示` と `救急用具の備付け` | PR #208 で 第25条を区分の表示にrenumber 済み。旧 第25条(救急用具) のエントリを削除 |
| `web/src/data/laws/rodo-anzen-eisei-ho.ts` | `安衛法 第28条の2` had two near-identical risk-assessment entries (新旧テキスト) | 旧版テキスト(製造業限定の旧条文)のエントリを削除 |

## Abbreviation normalization (70 substitutions across 24 files)

Non-canonical short forms `労安法` / `労安則` / `労安衛法` / `労安衛則` were
normalized to `安衛法` / `安衛則` across `src/`:

- 7 component / page files (`(main)/diversity/*`, `(main)/mental-health/*`,
  `(main)/laws/*`, `(main)/health-checkup-scheduler/*`, etc.)
- 12 data files (`mental-health-rules`, `industries-content`, `exam-questions`,
  `mock`, `health-checkup-rules`, etc.)
- 2 lib files (`mental-health-flow`, `rag/synonyms`)
- 1 strategy doc (`monetization-v3-2026-04-26.ts`)
- 2 JSON datasets (`safety-equipment-db.json`)

Additional spot fixes:
- `労安規則第633条の救急用具` (wrong law + wrong article) → `安衛則第659条の救急用具`
- `労安規則 道路工事` → `安衛則 道路工事関連`
- `労安全だけでなく` (typo) → `労働災害だけでなく`

## Out of scope

- **C3 (1,096 full-name alias usages).** Almost all are legitimate full-name
  references in user-facing prose where readability outweighs brevity.
  Mass-rewrite would damage comprehension without improving correctness.
- **Article-body cross-references within law data** (e.g. `前条第3項` or
  `第28条の2の規定`). Pattern detection is fragile; deferred to a future audit.
- **e-Gov live scraping.** Task brief explicitly excluded this. Verification
  used internal authoritative `web/src/data/laws/*.ts` plus a hand-curated
  max-article table derived from prior e-Gov audits.

## Files modified

```
web/src/app/(main)/diversity/disability/page.tsx
web/src/app/(main)/diversity/elderly/page.tsx
web/src/app/(main)/diversity/foreign-workers/page.tsx
web/src/app/(main)/diversity/lgbtq/page.tsx
web/src/app/(main)/diversity/non-regular/page.tsx
web/src/app/(main)/diversity/page.tsx
web/src/app/(main)/diversity/remote/page.tsx
web/src/app/(main)/diversity/sogi/page.tsx
web/src/app/(main)/exam-quiz/page.tsx
web/src/app/(main)/health-checkup-scheduler/page.tsx
web/src/app/(main)/laws/bcp/page.tsx
web/src/app/(main)/laws/gig-work/page.tsx
web/src/app/(main)/laws/notices-precedents/page.tsx
web/src/app/(main)/laws/page.tsx
web/src/app/(main)/mental-health/page.tsx
web/src/app/(main)/mental-health-management/page.tsx
web/src/app/(main)/mental-health-management/small-business/page.tsx
web/src/app/(main)/mental-health-management/stress-check/readiness-form.tsx
web/src/components/health-checkup/scheduler-document.tsx
web/src/components/health-checkup/scheduler-form.tsx
web/src/data/exam-questions/boiler-1st-class.ts
web/src/data/exam-questions/env-measure-1st.ts
web/src/data/exam-questions/env-measure-2nd.ts
web/src/data/exam-questions/health-1st-extra.ts
web/src/data/exam-questions/health-2nd-extra.ts
web/src/data/exam-questions/skill-training.ts
web/src/data/faqs/faq-batch-1-law.ts
web/src/data/faqs/faq-batch-3-chemical.ts
web/src/data/health-checkup-rules/overtime.ts
web/src/data/industries-content/warehouse.ts
web/src/data/industries-content/wholesale.ts
web/src/data/laws/rodo-anzen-eisei-ho.ts
web/src/data/laws/yuki-kisoku.ts
web/src/data/mental-health-rules/stress-check.ts
web/src/data/mock/chemical-substances-db.ts
web/src/data/mock/notices-and-precedents.ts
web/src/data/mock/quiz/cert-quiz/anzen-civil.ts
web/src/data/mock/quiz/cert-quiz/sanketsu-2nd.ts
web/src/data/mock/real-accident-cases-2025-preliminary.ts
web/src/data/mock/safety-goods.ts
web/src/data/safety-equipment-db.json
web/src/data/strategy/monetization-v3-2026-04-26.ts
web/src/lib/mental-health-flow.ts
web/src/lib/rag/synonyms.ts
web/src/types/health-checkup.ts
```

## Reproducible audit toolchain

The scripts that produced the findings live under `web/scripts/audit-2026-05-17/`:

- `extract-citations.mjs` — Phase A regex extraction.
- `validate-citations.mjs` — Phase B+C classification against MAX_ARTICLES /
  abbreviation maps.
- `detect-duplicates.mjs` — Intra-law duplicate `articleNum` detection.
- `normalize-abbrev.mjs` — Phase D non-canonical alias substitution.

Re-run order: `extract` → `validate` → `detect-duplicates` (read-only); then
`normalize-abbrev` (writes) for alias normalization.

## Provenance

- Base SHA: `d2807ca` (origin/main at audit start)
- Audit date: 2026-05-17
- Auditor: Claude Opus 4.7 (legal-knowledge + comprehensive cross-reference)
- Prior audit reference: PR #208 (`fix(laws): correct citation accuracy across e-Gov reference`)
