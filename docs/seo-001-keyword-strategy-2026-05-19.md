# SEO-001 keyword strategy — 2026-05-19

Root-cause work for audit finding **SEO-001** (主要4キーワード全 top10 圏外) from
[docs/audit-snapshot-2026-05-17-ux-seo.md](audit-snapshot-2026-05-17-ux-seo.md):

> 『安衛法 AI チャットボット』『労働災害 業種別 分析 レポート』『年次安全衛生計画 業種 ジェネレーター』
> 『化学物質 リスクアセスメント CREATE-SIMPLE』の4クエリすべてで Google top10 圏外。

This branch implements an information-intent `/guides/<slug>` hub-and-spoke layer
that funnels into the four existing tool pages, plus title/description rewrites
on those tools and bidirectional internal links to lift PageRank on the keyword
landings.

## Phase A — search intent analysis

| KW | Page intent | Audit top10 | Our funnel target |
|----|-------------|-------------|-------------------|
| 安衛法 AI チャットボット | information ＋ immediate-use | Botpress / Malwarebytes / JBS (generic AI chatbot articles) | `/guides/anzeneho-ai-chatbot` → `/chatbot` |
| 労働災害 業種別 分析 レポート | information / research | JISHA / 厚労省 / osh-management.com / keiyaku-watch.jp (static PDFs) | `/guides/industry-accident-reports` → `/accidents-reports` |
| 年次安全衛生計画 業種別 ジェネレーター | immediate-use (template hunt) | 厚労省 / m3career / aemk.or.jp (consultant blogs) | `/guides/annual-safety-plan-generator` → `/strategy/plan-generator` |
| 化学物質 リスクアセスメント CREATE-SIMPLE 無料 | immediate-use (specific-tool) | 厚労省 CREATE-SIMPLE official / JISHA | `/guides/chemical-ra-create-simple` → `/chemical-ra` |

### Volume estimate (knowledge-based)

| KW | Monthly searches (rough) | Seasonality |
|----|--------------------------|-------------|
| 安衛法 AI チャットボット | 100–300 | Steady |
| 労働災害 業種別 分析 レポート | 200–500 | Mild peak Q1 (年度総括) |
| 年次安全衛生計画 業種別 ジェネレーター | 100–200 | Strong peak Dec–Mar (年度計画) |
| 化学物質 リスクアセスメント CREATE-SIMPLE | 300–800 | Rising since 2024 改正 |

## Phase B — landing-page integration

Per-keyword decision:

| KW | Existing tool page | New SEO landing | Action |
|----|--------------------|------------------|--------|
| 安衛法 AI チャットボット | `/chatbot` | `/guides/anzeneho-ai-chatbot` | New + tool title/desc rewrite |
| 労働災害 業種別 分析 レポート | `/accidents-reports` | `/guides/industry-accident-reports` | New + tool title/desc rewrite |
| 年次安全衛生計画 業種別 ジェネレーター | `/strategy/plan-generator` | `/guides/annual-safety-plan-generator` | New + tool title/desc rewrite |
| 化学物質 RA CREATE-SIMPLE 無料 | `/chemical-ra` | `/guides/chemical-ra-create-simple` | New + tool title/desc rewrite |

`/guides` index hub aggregates the four entries.

## Phase C — E-E-A-T signals

Each landing emits:

- `Person` author with `hasOccupation` (労働安全衛生コンサルタント・登録番号260022)
  and `knowsAbout` of the relevant safety domains.
- Header CTA linking to `/about` (運営者プロフィール).
- Visible `公開日 / 最終更新日` block plus citation list of 一次資料 (e-Gov,
  厚労省, JISHA, 建災防).
- Footer block re-stating individual-research-project framing — no overstated
  authority claims.

## Phase D — long-tail expansion

4–8 long-tail Q&A entries per landing surfaced as H2s and `FAQPage` schema —
~30 total long-tail variants now indexable per the spec ("[KW] とは / 法令 /
チェックリスト / 業種別 / 事故事例" patterns).

## Phase E — structured data layering

Each landing renders five schemas in one `<script>`:

1. `Article` (with `author.hasOccupation`, `citation`, `mentions`)
2. `LearningResource` (`educationalUse: research`, `isAccessibleForFree: true`)
3. `HowTo` (4–5 steps)
4. `FAQPage` (long-tail Q&A)
5. `BreadcrumbList`

The hub `/guides` adds `ItemList` of the four landings.

## Phase F — internal link reinforcement

- Tool pages link **into** their guide ("ガイドを読む" anchor) via
  `RelatedPageCards` or visible call-outs.
- Each guide's `related[]` cross-links to **the other three keyword landings**,
  forming a closed hub-and-spoke between the four pages.
- `/about` "運営・研究の補足資料" gains a `/guides` entry.

## Phase G — verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint .` | 0 errors (8 pre-existing warnings) |
| `npm run test` | 294/294 passed |
| `npm run build` | success — `/guides`, `/guides/<slug>` all SSG ○ |
| RAG Recall@5 (main) | **100.0%** (well above 60% threshold) |
| RAG Recall@5 (fresh) | **100.0%** |

## Non-goals

- Does not modify RAG retrieval or chatbot eval logic.
- Does not introduce paid plans or `/pricing` changes (PAID_MODE-gated).
- Does not change the underlying main-3 tool features — purely SEO layer.

## Rollback

`git revert <merge-sha>` reverts the entire PR; no DB or env changes.
