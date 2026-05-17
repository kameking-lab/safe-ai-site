# RAG Deferred Improvements Roadmap

Date: 2026-05-13
Status as of: main HEAD e1bfb9c (PR #88 merged, 11/11 tests passing)
Author: ANZEN AI Daily Review

---

## Current state

The four-part fix landed in PR #81 (commit ee0cee2) addresses Q3-type
article-number direct lookup. PR #83 (commit be8306d) added
安衛則第151条の3 to the curated corpus. PR #84 restored and extended
the test suite to 11 cases (T1–T10 plus T6b). PR #88 (commit e1bfb9c)
added 15 high-value branch articles to the corpus.

As of 2026-05-13 on main (e1bfb9c):
- `web/src/lib/rag-article-number.test.ts`: 11/11 pass.
- T5 (クレーン則第74条): asserts top3, not top1. The underlying
  query-expansion noise is real and acknowledged in the test comment.
- T8 (bare 安衛則第14条): asserts normalizedScore > 0.3. Actual is
  0.4. The original > 0.5 goal was not reached; the revised threshold
  is a pragmatic acceptance, not a fix.

The investigation document at
`docs/investigation-rag-article-branch-numbering-2026-05-13.md`
provides the structural diagnosis behind the remaining gaps. This
document records the deferred improvement items that were identified
but not acted on as part of that investigation cycle.

---

## Deferred items

### Item A — Tokenizer hardening (Option 2 from investigation)

**What:** Two sub-tasks in `web/src/lib/rag-search.ts`.

Sub-task A1 — whitespace tolerance inside article-number tokens.
Extend `ARTICLE_NUM_RE` (around line 502) to permit optional
whitespace between `条` and `の`, and between `の` and the branch
digit. Strip captured whitespace before inserting into
`articleNumTokens`. This resolves the edge case where voice input or
PDF copy-paste injects a space at `第151条 の3`, causing the branch
suffix to be dropped by the particle splitter.

Sub-task A2 — query-expansion gate for explicit article-number
queries. When the query already contains a `第\d+条(の\d+)?` token,
prevent `expandQuery` from injecting the `技能講習` / `特別教育` /
`作業主任者` keyword set that belongs to 就業制限-style hub articles.
This resolves the T5 (クレーン則第74条) top-1 demotion.

**Rationale:** These are logic-side gaps not covered by data additions.
Sub-task A1 is narrow and safe. Sub-task A2 requires careful design
because the expansion gate must not fire on legitimate topical queries
that happen to mention a law name alongside a general keyword.

**Estimated effort:** 3–4 hours including TDD.

**Affected files:** `web/src/lib/rag-search.ts`, possibly
`web/src/lib/query-expansion.ts` (signature change).

**Regression risk:** Medium. The expansion gate change must be verified
against `rag-100q.test.ts`, `rag-100q-fresh.test.ts`, and
`rag-article-number.test.ts`. New test cases are needed to confirm that
general クレーン / フォークリフト queries without an article number are
not degraded.

**Alternative narrow path:** Before Sub-task A2, consider adding
`第74条` as a クレーン則-specific trigger token in the `PINNED_TOPICS`
block (around `rag-search.ts:38`). This is a data-driven fix that
would also resolve T5 without touching the expansion logic.

**Trigger for re-evaluation:** Recall@5 drops below 55% on the 100q
benchmark, or the 2026-08 checkpoint review (whichever comes first).

---

### Item B — Kanji-form articleNum normalisation (Option 3 from investigation)

**What:** Normalise MHLW-layer `articleNum` values from kanji-digit
form (`第五百七十七条の二`) to arabic form (`第577条の2`) in
`scripts/etl/build-laws-compact.mjs`. Regenerate
`web/src/data/laws-mhlw/compact.json`. Drop the kanji-specific
length-200 floor in `web/src/data/laws/mhlw-extras.ts` once the
arabic form is in place.

**Rationale:** A small set of R4/R5 amendment articles exist in the
MHLW PDF layer in kanji form only. An arabic-form user query for the
same article number currently misses them. The investigation found
that the overlap is small (most missing branch articles are absent
from both layers), but the normalisation would widen matching for the
articles that do exist in the MHLW layer.

**Estimated effort:** 6–8 hours including ETL re-run and 100q
re-baseline.

**Affected files:** `scripts/etl/build-laws-compact.mjs`,
`web/src/data/laws-mhlw/compact.json` (regenerated artefact),
`web/src/data/laws/mhlw-extras.ts`.

**Regression risk:** Medium-high. The compact.json regeneration changes
the searchable inventory. Short amendment fragments that were
previously filtered out by the kanji-length-200 rule may now survive
the length filter and could rank above curated entries. Full 100q
re-run required.

**Trigger for re-evaluation:** An explicit benchmark showing MHLW-layer
article-number misses at a rate high enough to justify the ETL
change. Currently not measurable without a separate MHLW-specific
query set. Defer until the MHLW PDF corpus is expanded or a user
complaint about a specific R4/R5 amendment article is filed.

---

### Item C — Bare article-number score floor (T8)

**What:** Lift the normalizedScore for bare article-number queries
(e.g. "安衛則第14条" without any contextual keyword) from the current
observed 0.4 toward the aspirational 0.5 threshold originally stated
in T8.

**Rationale:** The current scoring is a pragmatic acceptance. The
actual score is 0.4; the test asserts > 0.3. The gap to 0.5 reflects
a genuine weakness: bare law+article-number queries succeed at finding
the right article but with low confidence. A caller using
`normalizedScore` as a display-confidence indicator would show a weak
signal even for a correct retrieval.

**Estimated effort:** 2–4 hours. The fix likely involves a small
scoring boost for exact `articleNum` matches or a law-name+article
co-occurrence bonus. Must be carefully bounded to avoid
over-boosting uncommon articles at the expense of general queries.

**Affected files:** `web/src/lib/rag-search.ts` (scoring section).

**Regression risk:** Low-to-medium. Any scoring weight change requires
a full 100q re-run. Boosting exact article-number matches is targeted
but could interact with edge cases where the article number is
incidentally present in an unrelated entry.

**Trigger for re-evaluation:** If a specific user flow is found to
consume `normalizedScore` for UI confidence display, prioritise this.
Otherwise defer to the 2026-08 review checkpoint.

---

### Item D — PINNED_TOPICS expansion

**What:** Extend the `PINNED_TOPICS` map in `rag-search.ts:38` with
additional high-value trigger phrases and corresponding article-pin
rules. Candidates identified during the investigation:

- Add `第74条` as a クレーン則 trigger (alongside the existing
  `クレーン運転` block). Ensures クレーン則第74条 surfaces at top1
  for explicit article-number queries without requiring the expansion
  gate change in Item A.
- Add triggers for the フォークリフト series: 第151条の2,
  第151条の4, 第151条の14, 第151条の20 (currently absent from corpus;
  add corpus entries first per Item E, then add pin).
- Add `足場 第518条の2` trigger (absent from corpus; data prerequisite
  same as Item E).

**Rationale:** PINNED_TOPICS is a low-risk, surgically targeted fix
path. It bypasses the general ranking system for specific high-query
phrases that are known to score incorrectly. It does not require
touching the scoring or expansion logic.

**Estimated effort:** 1–2 hours per block of 3–5 pins.

**Affected files:** `web/src/lib/rag-search.ts` (PINNED_TOPICS block).

**Regression risk:** Low. Pins are additive and phrase-specific. An
incorrectly written trigger phrase causes a regression only for the
exact phrase, not for general queries. Must re-run
`rag-article-number.test.ts` and `rag-100q.test.ts` after each
batch of pins.

**Trigger for re-evaluation:** Any user-reported misquote for a phrase
that already has a curated corpus entry. Start with the クレーン74条
pin as the lowest-effort highest-impact item.

---

### Item E — Curated corpus expansion (prerequisite for several items above)

**What:** Hand-add missing high-value branch articles to the curated
`.ts` files. Priority list from the §A.3 checklist in the
investigation doc (15 MISS entries):

安衛則: 第36条の2, 第36条の4, 第36条の5, 第43条の2, 第151条の2,
第151条の4, 第151条の14, 第151条の20, 第518条の2, 第568条.
安衛法: 第28条の2, 第66条の2.
クレーン則: 第74条の2, 第75条の2.
有機則: 第16条の2.

**Rationale:** Option 1 from the investigation. This is the only fix
for scenario Z (genuine data gaps). Query-expansion and tokenizer
improvements cannot surface articles that are not in the corpus.
Items A, D above have a data prerequisite for some of their pins.

**Estimated effort:** 4–6 hours per batch of 10 articles, dominated
by reading e-Gov to copy authoritative article text accurately.

**Affected files:** `web/src/data/laws/anzen-eisei-kisoku.ts`,
`web/src/data/laws/crane-kisoku.ts`,
`web/src/data/laws/yuki-kisoku.ts`,
`web/src/data/laws/rodo-anzen-eisei-ho.ts`.

**Regression risk:** Low. Adding new articles does not change scoring
logic. Test baselines may need updating if a newly added article
displaces an existing answer in 100q expectations.

**Note:** PR #88 already added 15 branch articles as an initial round.
This item covers the remaining misses from the §A.3 sample.

**Trigger for re-evaluation:** User-reported missing article, or a
Recall@5 reading below 55% on the 100q benchmark, or at the
2026-08 checkpoint — whichever comes first.

---

## Suggested sequencing

Not a hard plan — adjust based on user feedback and benchmark data.

1. **Item D (PINNED_TOPICS, クレーン74条 pin):** Lowest effort,
   highest immediate impact for a known failure mode. Data (Article
   74) is already in the corpus. ~1 hour.
2. **Item E (corpus expansion):** Prerequisite for several other pins.
   Do in batches; the フォークリフト 151系 and 足場 518条の2 articles
   are the highest-priority targets. ~4–6 hours.
3. **Item A1 (whitespace tokenizer):** Narrow, safe, completes the
   4-fix tokenizer hardening. ~1 hour.
4. **Item C (score floor for T8):** Low risk, completes the T8
   acceptance story. ~2–4 hours.
5. **Item A2 (expansion gate):** Higher regression surface; tackle
   after Items 1–4 are baselined. ~3–4 hours.
6. **Item B (kanji normalisation):** Lowest urgency; defer until MHLW
   corpus is a known bottleneck. ~6–8 hours.

---

## Review checkpoint

Scheduled: 2026-08 (three months post-stabilisation).
Ad hoc trigger: Recall@5 < 55% on `rag-100q-fresh.test.ts` or
`rag-100q.test.ts`.

At the checkpoint: re-run 100q benchmarks, check user-reported misses,
and decide which deferred items to promote to active work.

---

## Related documents

- `docs/investigation-rag-prod-verify-2026-05-10.md` — production
  RAG verification (Q3-type precision gaps identified, 2026-05-10).
- `docs/investigation-rag-article-branch-numbering-2026-05-13.md` —
  structural diagnosis of branch-numbered article (条の○) coverage,
  pipeline-bug hypothesis rejection, three-scenario verdict.
- `web/src/lib/rag-article-number.test.ts` — 11-case regression suite
  (T1–T10 + T6b); comments on T5 and T8 document the acknowledged
  pragmatic thresholds.
- PR #81: Q3-type direct-lookup 4-part fix.
- PR #83: 安衛則第151条の3 corpus entry added.
- PR #84: T6 / T8 baseline corrected; 11-test suite established.
- PR #88: 15 high-value branch articles added to corpus.
- PR #82: Draft PR with original failing tests. Closed without merge;
  all cases resolved on main.
