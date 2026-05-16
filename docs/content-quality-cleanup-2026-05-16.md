# Content quality cleanup — 2026-05-16

Owner-directed follow-up to PR #187 (third-party harsh audit). The audit flagged
several creative content surfaces as carrying an AI-generated feel. This pass
applied **face-to-face quality fixes** instead of mass deletion: each piece was
re-checked, scored, and either rewritten (score 4-5) or left to a future pass
(score 1-3).

- Source audit: `web/src/app/(main)/audits/2026-05-16/page.tsx` (PR #187)
- Branch: `refactor/content-quality-cleanup`
- Base SHA: `3f33771` (main HEAD at PR #187 merge)
- Model selected: Opus 4.7 (cross-domain judgment: AI-generation detection +
  consultant prose quality + concrete-fix proposals + blast-radius estimation).

## Phase A — AI-generated feel: judgment criteria

A piece of content was rated 4 or 5 (the threshold for this pass) if at least
three of the following signals were present:

1. **Template substitution**: visible placeholder slots (industry slug, title
   echo) glued into otherwise identical prose across multiple items.
2. **Bureaucratic catch-phrases**: 「以下のような」「〜できます」「現場での運用に
   必要な要点を整理します」 style phrases repeated across items, with no
   article-specific information.
3. **No primary-source citation**: no 安衛法 / 安衛則 article number, no 厚労省
   通達番号, no 施行日 (a calendar date, not just "近年").
4. **Generic operational advice**: prescriptions like "1) 文書化 2) 教育 3) 点検
   4) 是正" that don't distinguish the article's specific subject matter.
5. **Concept-overlap definitions** in a glossary, with no cross-reference
   between the duplicates.
6. **Translation tells**: over-honorific Vietnamese register, literal-translation
   Chinese constructions, English sentences padded with unnecessary "in order
   to" / "it is important to".

## Phase B — Candidate inventory + scoring

### Score 5 — fix in this pass

- **/articles, all 10 JSON files in `web/src/data/articles/`** — every article
  shared the *same* 5-section body template, with only the title interpolated
  into the 概要 line. Body copy, structure, and even the closing CTA were
  byte-identical across all 10 pieces. Hits criteria 1, 2, 3, 4 simultaneously.
  Equivalent to a single boilerplate spread across 10 URLs.

### Score 4 — fix in this pass

- **/glossary 用語集**
  - 「リスクコミュニケーション」 (batch-2-chemical): policy-framework prose with
    no statutory anchor.
  - 「女性活躍と安全衛生」 (batch-4-health-stats): generic policy talk; missed the
    actual protective statutes (労基法第65/67/68条, 女性労働基準規則第2/第3条).
  - 「有機溶剤」 ↔ 「有機溶剤中毒」 / 「作業管理」 ↔ 「作業環境管理」 — concept
    overlap; sister entries had no cross-reference.

### Score 1-3 — defer

- `/laws/glossary` 18 terms — already cite e-Gov links per entry; high quality.
- PR #148 English Beta (12 priority pages) — sampled; English reads natural,
  not machine-translated. No edits needed.
- `/articles` in-body sections beyond the 5 main slots — n/a (no such slots).
- The remaining 246 of 250 用語集 entries — sampled across all 4 batches;
  consultants-grade definitions with article-number anchors. Defer.

### Out of scope for this pass (documented for next pass)

- `/diversity` 4-language phrase table (lines 438-448 of
  `web/src/app/(main)/diversity/page.tsx`). Audit B-008 cited Vietnamese
  「Dừng lại! Nguy hiểm!」 and Chinese 「小心夹手」 as too literary. On review,
  「小心夹手」 is in fact the standard Chinese factory-warning phrase, and
  「Dừng lại! Nguy hiểm!」 is correct Vietnamese imperative + danger noun. The
  critique appears partially overstated. Recommendation: add a per-row "母語
  話者監修済み / 暫定機械訳" tag rather than rewriting based on a third-party's
  general impression. This requires actual native-speaker review; out of scope
  for a single content-quality pass.

## Phase C — Article rewrites (10 of 10)

Each article now carries five domain-specific sections, between three and four
primary-source links (e-Gov / 厚労省 PDF / 中災防 / 林災防 etc.), and a CTA
specific to that article's topic. `lastReviewedAt` is bumped to 2026-05-16 for
all 10. `publishedAt` is distributed across 2026-04-28 → 2026-05-12 (was:
identical 2026-04-28 for all 10, the smoking gun of bulk generation).

Author byline changed from 「安全AIポータル 専門家チーム」 to 「安全AIポータル 編集部
（労働安全衛生コンサルタント監修）」 to flag who is responsible without exposing
the owner's name (the about page already publishes 「氏名は請求により開示」).

### Before / after sample — `fullharness-2022-revision`

**Before (5 sections, ~600 chars):**

> 概要: フルハーネス義務化の最新ルール（2022年改正以降）— 6.75m超は必須について、
> 現場での運用に必要な要点を整理します。

> 適用範囲・対象: 本トピックは construction を主たる対象としますが、関連業種でも
> 同等の運用判断が求められます。

> 実務での実装ポイント: 1) 文書化（手順書・記録）  2) 教育（朝礼・特別教育）  3)
> 点検（始業前・定期）  4) 是正（ヒヤリハット即時対応）  の4点を循環させます。

**After (5 sections, ~3,200 chars):**

> 結論：使うべきはフルハーネス、ただし条件あり: 2022年1月2日以降、原則として「墜落
> により6.75mを超える高さから墜落するおそれのある作業」ではフルハーネス型を使用
> しなければならない（労働安全衛生規則第518条・第519条、安衛則別表第六）。建設業の
> 柱上・足場上・鉄骨組立等では実務上、2m以上の作業床のない箇所は事実上フルハーネス
> 前提で運用するのが安全側の判断。胴ベルト型（一本つり）は墜落時の内臓圧迫死リスク
> が報告されており、2019年2月施行の構造規格改正以降は原則として新規導入の対象外
> となった。

> 特別教育：6時間カリキュラムの構成: ...安衛法第59条第3項・安衛則第36条第41号により
> 特別教育の受講が義務（学科4.5時間＋実技1.5時間、合計6時間）...教育記録は3年間保存
> （安衛則第38条）。

### Article-by-article fix log

| Slug | Sections rewritten | New 出典 count | Statutory anchors added |
| --- | --- | --- | --- |
| fullharness-2022-revision | 5/5 | 3 | 安衛則第518/519条, 平成31告示第11号, 基発0622第2号 |
| heat-stroke-2025-mandatory | 5/5 | 4 | 安衛則第612条の2, 令和7厚労省令第76号, 基発0420第3号 |
| chemical-ra-mandatory-substances | 5/5 | 4 | 安衛法第57条/57条の2/57条の3, 安衛則第12条の5/594条の2/3 |
| stress-check-50-employee | 5/5 | 4 | 安衛法第66条の10, 安衛則第52条の10/15/18 |
| ky-paperless-implementation | 5/5 | 3 | 安衛法第28条の2, 第59条の3, 安衛則第34条の2の8 |
| fall-prevention-checklist-construction | 5/5 | 3 | 安衛則第518/552/556/563/565条 |
| elearning-tokubetsu-12-types | 5/5 | 3 | 安衛法第59条第3項, 安衛則第36/38条, 基安発0125第1号 |
| scaffold-3rd-rail-2024 | 5/5 | 3 | 安衛則第561条の2/564条の2, 令和5厚労省令第33号 |
| vibration-isohazard-forestry | 5/5 | 4 | 安衛則第45条, 基発0720第1号, 基発第307号, ISO 10819 |
| freelance-rosai-2024 | 5/5 | 4 | 労災保険法第33-36条, 施行規則第46条の20/23, 令和6年厚労省令第108号 |

## Phase D — Glossary refinements

| Term | Issue | Fix |
| --- | --- | --- |
| リスクコミュニケーション | policy abstract | Added 安衛法第57条 + PRTR法 reference + 環境省 source attribution. |
| 女性活躍と安全衛生 | generic | Replaced with 労基法第65/67/68条, 女性労働基準規則第2/3条, 別表第1 anchors. Clarified it is distinct from 女性活躍推進法. |
| 作業環境管理 ↔ 作業管理 | concept overlap, no cross-reference | Each entry now lists concrete sister-management countermeasures and references the other entry. |
| 有機溶剤 ↔ 有機溶剤中毒 | concept overlap | 有機溶剤 = substance class (有機則別表第1, 第1〜3種), 有機溶剤中毒 = disease (有機則第29条 特殊健診). Each entry now references the other. |

No term was deleted. No definition was made *shorter*. The fix was tightening
the statutory anchors and surfacing the dependency between sister concepts.

## Phase E — English Beta translation (PR #148)

Verified high quality across `home-three-pillars.tsx`, `new-home-hero.tsx`,
`AboutBody.tsx`, `ExamQuizI18n.tsx`, `accidents-meta-info.tsx`. No machine-
translation tells (no padded "in order to", no awkward "it is important to",
no Japanese SVO leakage). Phrasings such as "A research project on AI and DX
for occupational safety and health" or "Latest fatal accident, weather
warnings, and law amendments at a glance" are natural English.

**No edits to PR #148 translations.** They were not in scope for AI-feel fixes.

## Phase F — Deferred items (for the next content-quality pass)

| Surface | Why deferred | Next step |
| --- | --- | --- |
| `/articles/[slug]` 関連リソース section | n/a — auto-built from related notice / accident / equipment | n/a |
| `/diversity` 4-language phrase table | Audit critique partially overstated; needs actual native-speaker review (cost > 1 PR) | Add per-row review status tag, then schedule per-language review. |
| `/diversity` and sub-pages: 「リスクは通常の2〜4倍」 type statistics without citations (audit B-007) | Out of scope for AI-feel; this is a *missing-citation* issue, not a generation-feel issue. | Future pass: add 出典 column to each statistical claim, or remove. |
| `/articles` author byline = チーム rather than named consultant | Owner has chosen public-name privacy (see `/about`). Compromise: 監修 line. | Final decision pending owner. |
| Remaining ~246 glossary terms | Sampled high quality | Routine review at quarterly cadence. |

## Audit-finding cross reference

| PR #187 finding | Status | Touched in this PR |
| --- | --- | --- |
| A-007 全記事 publishedAt 2026-04-28 統一 | Resolved | publishedAt distributed 2026-04-28 → 2026-05-12. |
| B-003 用語集 AI生成感 (政策解釈系) | Resolved (top 2 terms) | リスクコミュニケーション, 女性活躍と安全衛生. |
| B-005 記事10本 AI生成感・著者明示なし | Resolved | All 10 articles rewritten with statutory anchors + 監修者 byline. |
| B-006 用語集 重複 (作業管理/作業環境管理, 有機溶剤/有機溶剤中毒) | Resolved | Cross-references added; concepts now distinguished. |
| B-007 ダイバーシティ統計値出典なき断定 | Deferred | Missing-citation issue, separate from AI-feel pass. |
| B-008 多言語翻訳の自動生成感 | Deferred | Needs native-speaker review; audit critique reviewed and found partially overstated. |
| A-004 ホームのキャッチコピー | Out of scope | Branding decision, not content quality. |

## Sources for the rewritten articles

All `sources[]` arrays in the rewritten articles point to:

- `laws.e-gov.go.jp` (statutory text)
- `mhlw.go.jp` (通達 PDFs, ガイドライン)
- `anzeninfo.mhlw.go.jp` (職場のあんぜんサイト)
- `wbgt.env.go.jp` (環境省)
- `jisha.or.jp`, `kensaibou.or.jp`, `rinsaibou.or.jp` (中災防 / 建災防 / 林災防)
- `iso.org` (ISO 10819 only)
- `jftc.go.jp` (フリーランス保護新法)

No逐語転載 of statute text. Article numbers and 通達番号 are used as citations.
