# Investigation: RAG branch-numbered article (○条の○) coverage

Date: 2026-05-13
Branch: docs/rag-branch-numbering-investigation
Base SHA: 513a8c9 (main HEAD at investigation start)
Scope: read-only structural diagnosis of the three-way split between
(X) ingestion pipeline bug, (Y) data-present-but-not-retrievable, and
(Z) genuinely local data gap.

## TL;DR

The owner's hypothesis ("an isolated single-article gap is unnatural,
the ingestion pipeline is the more plausible suspect") is partially
right and partially wrong.

- **Wrong about the pipeline.** There is no ingestion pipeline that
  populates the corpus with the full text of the 安衛則 (or any other
  major regulation). The branch-numbered articles do not arrive via an
  ETL pass that could lose them. They are typed by hand into
  `web/src/data/laws/*.ts` and the MHLW PDF ETL only covers a small
  set of amendment / notice PDFs (1127 raw chunks, 320 after the
  noise filter), not the law in full. So "the pipeline silently dropped
  151条の3" cannot be the cause.
- **Right that the apparent "151条の3 single-article hole" was a
  symptom of something broader.** The 安衛則 in the curated dataset is
  about 7% of the actual regulation by article count (≈48 articles vs
  ≈700 in force), and ≈47% of the 30 well-known branch articles
  sampled from across the laws are absent. The earlier draft PR #82
  T6 report calling out 151条の3 specifically was correct at that
  moment in time but it was looking through a peephole — there are
  many more missing entries with the same root cause (curated coverage
  is shallow by design).
- **The 4-fix tokenizer in `rag-search.ts` works as advertised for the
  literal form `第151条の3`.** Searching for "労働安全衛生規則第151条の3"
  now resolves to the correct article at top1, normalizedScore 0.72.
  The remaining gap is a different one: when the user inserts a space
  before `の` (e.g. `第151条 の3`), the `の3` branch suffix is dropped
  by the tokenizer.

The honest characterisation is **scenario Z with a Y kicker**: the
data layer is hand-curated and therefore lossy in a predictable way,
and the search logic has one residual edge case (whitespace before
`の`-suffix) plus one query-expansion noise case (the クレーン74条
top1 demotion). It is not scenario X.

## A. Data reality

### A.1 Files and layers

There are two coexisting data layers, both feeding `allLawArticles`
in [web/src/data/laws/index.ts](web/src/data/laws/index.ts:76):

- **Hand-curated `LawArticle` files** under `web/src/data/laws/*.ts`
  (34 files, 2,829 LOC, 284 article entries across 34 laws). Each
  entry has `law`, `lawShort`, `articleNum` (arabic, e.g. `第151条の3`),
  `articleTitle`, `text`, `keywords`. Maintained by hand; no ETL.
- **MHLW-extras**, built by `web/src/data/laws/mhlw-extras.ts:41`
  which loads `web/src/data/laws-mhlw/compact.json`
  (`generatedAt: 2026-04-18`) and filters it.

`compact.json` itself is derived from 11 PDFs registered in
`scripts/etl/build-laws-compact.mjs:23`:

  000946000.pdf  労働安全衛生規則等の一部を改正する省令（R4.5.31）
  000987120.pdf  労働安全衛生規則等の一部を改正する省令（R5）
  001083280.pdf  化学物質管理関連通達
  001089952.pdf  化学物質管理関連告示
  001089979.pdf  化学物質管理関連告示（追補）
  001139723.pdf  石綿障害予防規則等通達
  001139741.pdf  粉じん障害予防規則関連
  001139742.pdf  化学物質リスクアセスメント指針
  001150522.pdf  労働安全衛生法令関係
  001415985.pdf  職場のメンタルヘルス関連
  001684504.pdf  化学物質管理関連最新通達

None of those PDFs is the full 安衛則 or full クレーン則. They are
省令改正 / 告示 / 通達 / 指針 — amendment fragments and chemical-
management material. So the MHLW layer can never substitute for the
gaps in curated 安衛則 coverage.

`articles.jsonl` has 1,426 raw records (988 with an articleNumber per
`_manifest.json`). `compact.json` filters those to 1,127 (drops 299
that lack an articleNumber). Then `mhlw-extras.ts` applies the
following filter at `mhlw-extras.ts:42`:

  - text length ≥ 30
  - if articleTitle present: text ≥ 60
  - if no articleTitle: text ≥ 150
  - if articleNum uses kanji digits 一二三四五六七八九十百千: text ≥ 200

After that filter, 320 of the 1,127 articles survive. The 807 dropped
are mostly short-fragment PDF noise (670 short-no-title, 73 short-
with-title, 64 kanji-numbered branch articles below 200 chars).

### A.2 Branch articles inventory (`第○条の○` pattern)

Curated `laws/*.ts` total: **284** articles.
- branch-numbered (`第\d+条の\d+`): **43**
- per-law breakdown (laws with branch entries):
    労働安全衛生規則 14 / 41
    労働安全衛生規則（足場等）8 / 15 (overlaps 539条の2-9 with above)
    労働安全衛生法 4 / 57
    特定化学物質障害予防規則 3 / 11
    建設業法 3 / 4
    職業能力開発促進法 2 / 3
    有機溶剤中毒予防規則 2 / 12
    酸素欠乏症等防止規則 1 / 13
    電離放射線障害防止規則 1 / 6
    育児・介護休業法 1 / 5
    男女雇用機会均等法 1 / 4
    労働者災害補償保険法 1 / 5
    労働基準法施行規則 1 / 3
    職業安定法 1 / 3

The full curated 安衛則 article list is:
  第1, 2, 3, 4, 7, 12, 13, 24, 24の2, 34, 36, 97, 151の3, 151の67,
  151の73, 151の74, 165, 518, 519, 520, 521, 539, 539の2-9, 552,
  558, 563, 564, 565, 566, 593, 594, 595, 596, 604, 607, 612の2,
  627, 630, 634
(56 entries including duplicates between `anzen-eisei-kisoku.ts` and
`ashiba-sagyo-kisoku.ts`; ≈48 unique articles. Real 安衛則 has 700+.)

Full curated クレーン則 article list:
  第1, 3, 5, 10, 34, 35, 36, 40, 69, 73, 74, 75, 76, 103, 111,
  161, 221 (17 entries; real クレーン則 has ≈270+).

MHLW-extras post-filter total: **320** articles, of which **58** are
branch-numbered (mostly kanji form: 第五十七条の二, 第二十四条の十五,
etc.; only one — 第24条の15 — is arabic). The MHLW layer's articleNum
is whatever the PDF used, with no kanji→arabic normalisation.

### A.3 Expected-branch checklist (32 sampled)

Articles selected as well-known branch entries that a safety
consultant might reasonably query. "HIT" means `(law, articleNum)` is
in the combined inventory; "MISS" means absent in any form.

  HIT      労働安全衛生規則|第24条の2
  MISS     労働安全衛生規則|第36条の2
  MISS     労働安全衛生規則|第36条の4
  MISS     労働安全衛生規則|第36条の5
  MISS     労働安全衛生規則|第43条の2
  MISS     労働安全衛生規則|第151条の2
  HIT      労働安全衛生規則|第151条の3
  MISS     労働安全衛生規則|第151条の4
  MISS     労働安全衛生規則|第151条の14
  MISS     労働安全衛生規則|第151条の20
  HIT      労働安全衛生規則|第151条の67
  HIT      労働安全衛生規則|第151条の73
  HIT      労働安全衛生規則|第151条の74
  MISS     労働安全衛生規則|第518条の2
  MISS     労働安全衛生規則|第568条 (non-branch; included as a sanity check)
  HIT      労働安全衛生規則|第612条の2
  HIT      労働安全衛生規則|第539条の2
  HIT      労働安全衛生規則|第539条の5
  HIT      労働安全衛生規則|第539条の9
  MISS     労働安全衛生法|第28条の2
  HIT      労働安全衛生法|第57条の2
  HIT      労働安全衛生法|第57条の3
  MISS     労働安全衛生法|第66条の2
  HIT      労働安全衛生法|第66条の8
  HIT      労働安全衛生法|第66条の10
  HIT      クレーン等安全規則|第74条
  MISS     クレーン等安全規則|第74条の2
  MISS     クレーン等安全規則|第75条の2
  HIT      酸素欠乏症等防止規則|第5条の2
  MISS     有機溶剤中毒予防規則|第16条の2
  HIT      特定化学物質障害予防規則|第36条の2
  HIT      電離放射線障害防止規則|第2条の2

  Summary: 17 / 32 hit, 15 / 32 miss (≈47% miss).

### A.4 Gap pattern breakdown

The 15 misses break down as:

- **Completely absent (curated and MHLW both empty):** all 15 of the
  misses. No kanji-form equivalent appears in `compact.json` either
  (e.g. searching for `第百五十一条` returns 0 hits in compact;
  `百五十一` matches only the `化学物質RA指針` chemical numbering
  table where "百五十一" is a substance index, not an article
  reference).
- **Naming-drift cases:** none observed. `第151条の3` is not present
  under any alternative form (`151-3`, `第151条の三`, `151条の3`).
- **Stub / placeholder cases:** none observed.

So the missing-article gap is genuine missing data, not a renaming
issue or a fetch-but-discard issue.

## B. Pipeline investigation

### B.1 Pipeline shape

`scripts/etl/parse-laws-pdf.py:44` defines the article-extraction
regex:

  ARTICLE_RE = r"(第[一二三四五六七八九十百千〇零\d]+条(?:の[一二三四五六七八九十\d]+)?)"

This regex correctly captures kanji and arabic article numbers,
including the `の枝番` suffix in either form. There is no obvious
"the parser cannot see branch articles" bug.

`scripts/etl/build-laws-compact.mjs` is a thin transform: drops rows
without articleNumber (`build-laws-compact.mjs:70`), flattens
vertical-PDF whitespace, extracts 12 keywords per article via a
regex, attaches a `law` / `lawShort` label hint from the
LAW_NAME_HINTS map. No kanji-to-arabic normalisation. articleNum is
copied verbatim from the regex capture.

`mhlw-extras.ts:42` applies the four-tier text-length filter
described in §A.1 to suppress fragment noise.

### B.2 Pipeline-bug hypothesis verification

The owner's hypotheses tested:

- **"Parser splits a branch article into the parent."** ARTICLE_RE
  matches `第151条の3` as a single token. No splitting.
- **"Article-number regex misses `の\d+` suffix."** Negative — the
  regex explicitly includes `(?:の[一二三四五六七八九十\d]+)?`.
- **"Articles co-merged so branch entries get absorbed."**
  `split_articles` in `parse-laws-pdf.py:114` advances one chunk per
  match; each captured article number creates a separate record.
  Verified at `_manifest.json` granularity (e.g. 000946000.pdf
  produces 691 records, articles preserved as siblings).

Where data does get dropped post-extraction is in `mhlw-extras.ts`
(807 of 1127 articles filtered out by the length / title / kanji
rules). That is intentional anti-noise filtering, not a leak. The
filtered articles are PDF-extraction fragments, not full lawful
content.

So **the pipeline-bug hypothesis is not supported**. The reason
`第151条の3` is missing pre-PR-#83 is simply that it had never been
hand-typed into `anzen-eisei-kisoku.ts`, and no source PDF in the
ETL set carries the original 安衛則 text body for that article.
PR #83 added the entry by hand; that is exactly the right shape of
fix for a curated-data gap and is consistent with how every other
article in the curated set was added.

## C. Logic side (live search + tokenizer trace)

### C.1 Tokenizer trace for `第151条の3` variants

The tokenizer is the 4-fix variant in `rag-search.ts:505`.

Probed inputs and resulting token sets (observed via a temporary
vitest probe, removed after measurement):

  Q "労働安全衛生規則第151条の3について"
    tokens ["第151条の3","労働安全衛生規則"]                  ← correct

  Q "労働安全衛生規則 第151条 の3"
    tokens ["第151条","労働安全衛生規則"]                     ← の3 lost

  Q "労働安全衛生規則第151条の3"
    tokens ["第151条の3","労働安全衛生規則"]                  ← correct

  Q "労働安全衛生規則第151条 の 3"
    tokens ["第151条","労働安全衛生規則"]                     ← の3 lost

  Q "安衛則第151条の3"
    tokens ["第151条の3","安衛則"]                            ← correct

  Q "クレーン等安全規則第74条"
    expanded → "… クレーン等安全規則 技能講習 特別教育"
    tokens ["第74条","クレーン等安全規則","技能講習","特別教育"]

  Q "クレーン則第74条"
    expanded → "… クレーン等安全規則 技能講習 特別教育"
    tokens ["第74条","クレーン則","クレーン等安全規則","技能講習","特別教育"]

  Q "労働安全衛生規則第36条の2"
    tokens ["第36条の2","労働安全衛生規則"]                   ← correct

Edge case observation: when whitespace appears between `条` and `の`
(e.g. `第151条 の3` or `第151条 の 3`), the ARTICLE_NUM_RE only
matches `第151条`, leaves the `の3` outside the protected-token list,
where it is then eliminated by the `(の|...)` particle splitter on
`rag-search.ts:528`. The user's natural typing without spaces is
unaffected, but voice input and PDF-copy-paste sometimes inject
whitespace at this exact position. This is a real residual hole in
the 4-fix tokeniser.

### C.2 Search top-5 results

Live results from `searchRelevantArticlesWithScore(query, 10)` on
the current main HEAD (measured via a temporary vitest probe):

  Q "労働安全衛生規則第151条の3について" (topScore 18, norm 0.72)
    #1 安衛則 第151条の3   車両系建設機械の用途以外の使用の制限
    #2 THP指針 第1
    #3 VDTガイドライン 第1
    #4 化学物質RA指針 第1
    #5 メンタル指針 第1

  Q "労働安全衛生規則 第151条 の3" (topScore 18, norm 0.72)
    #1 安衛則 第151条の3
    #2 安衛則 第151条の67
    #3 安衛則 第151条の73
    #4 安衛則 第151条の74
    #5 THP指針 第1
    (の3 lost but 第151条 alone is enough to surface 151系
     siblings; top1 still happens to be 第151条の3 because the
     title keyword "用途以外" matches indirectly through the
     query word "の3" — actually here it is luck: tie-break on
     order. Other similar inputs may rank 151の67 or 151の74 at top1.)

  Q "クレーン等安全規則第74条" (topScore 25, norm 1.0)
    #1 安衛令 第20条        就業制限に係る業務   ← expansion noise top
    #2 クレーン則 第74条    運転の合図           ← intended answer at #2
    #3 安衛法 第61条        就業制限
    #4 クレーン則 第221条   就業制限（移動式クレーン運転士）
    #5 安衛法 第36条        特別教育を必要とする業務

  Q "クレーン則第74条" (topScore 35, norm 1.0)
    same shape as above, クレーン則 第74条 still #2.

  Q "クレーン等安全規則第74条 運転の合図" (topScore 60, norm 1.0)
    #1 クレーン則 第74条    運転の合図           ← correct top1 with title hint
    #2 安衛令 第20条
    #3 安衛則 第165条
    #4 クレーン則 第221条
    #5 クレーン則 第161条

  Q "労働安全衛生規則第568条" (topScore 10, norm 0.40)
    #1 THP指針 第5
    (true data gap — 第568条 is not in curated 安衛則; the
     "第568条" article-number token matches nothing, so only
     "労働安全衛生規則" partial-name matches remain.)

  Q "安衛則第151条の4" (topScore 10, norm 0.40)
    #1 THP指針 第1
    (true data gap; same shape as 第568条.)

  Q "労働安全衛生規則第518条の2" (topScore 18, norm 0.72)
    #1 安衛則 第518条   作業床の設置等
    (bidirectional startsWith returns the parent article when the
     branch is absent — acceptable graceful degradation, but
     misleading if a user wants 第518条の2 specifically.)

All 11 tests in `web/src/lib/rag-article-number.test.ts` (T1–T10
plus T6b, including T5 クレーン則第74条 in top3 and T6 第151条の3
top1) pass on the current main HEAD.

## D. クレーン則第74条 misquote — structural analysis

### D.1 Top-10 anatomy

For query "クレーン等安全規則第74条":
  expanded query = "クレーン等安全規則第74条 クレーン等安全規則 技能講習 特別教育"
  tokens = ["第74条","クレーン等安全規則","技能講習","特別教育"]

Scoring breakdown for the top-2:
- **安衛令第20条 (就業制限に係る業務)** — keyword list includes
  "就業制限", "技能講習", "免許", every classic 就業制限業務
  category. The tokens "技能講習" and "特別教育" both hit its
  keywords (5 + 3 = 8), text occurrences hit (≈5), law-name
  partial doesn't fire, multi-token co-occurrence bonus
  4×4=16. Estimated score: 25–30.
- **クレーン則第74条 (運転の合図)** — articleNum match `第74条`
  gives +10; lawShort "クレーン則" / law "クレーン等安全規則"
  matches token "クレーン等安全規則" → +4. text contains
  "クレーン" / "運転" but not the expansion tokens
  "技能講習"/"特別教育". Co-occurrence on 2 tokens: 2×2=4.
  Estimated score: ≈18–25.

The expansion adds high-keyword tokens that boost any 就業制限-style
hub article irrespective of the explicit article number the user
named. This is exactly the behaviour described as "誤引用" in the
task statement and openly documented in `rag-article-number.test.ts:55`
as the reason T5 asserts top3 rather than top1.

### D.2 法令名 disambiguation contribution

`クレーン等安全規則` is a distinct token after the parenthetical-
stripping step. It matches `law`/`lawShort` on クレーン則 entries
(+4). It does NOT match law on 安衛令第20条. So law-name disambiguation
does add ≈+4 in favour of the クレーン側, but that is overwhelmed by
the +8 / +16 contribution of "技能講習"/"特別教育" expansions on
the 就業制限 hub.

### D.3 Data existence

クレーン則第74条 IS present in curated data:
[crane-kisoku.ts:91](web/src/data/laws/crane-kisoku.ts:91) "運転の合図"
(事業者は、クレーンを用いて作業を行なうときは、合図を定め…).

So the クレーン74条 problem is NOT a data gap. It is purely a
query-expansion noise problem in the search logic.

## E. Verdict and remediation options

### E.1 Scenario judgement

- **Scenario X (broad pipeline-bug-driven dropouts of branch
  articles).** REJECTED. The pipeline regex captures branch articles
  correctly; the only pipeline-side filtering is intentional length-
  threshold noise rejection; no kanji→arabic normalisation step exists
  to lose anything. The PDFs in the ETL set never contained the
  missing 安衛則 articles in the first place.
- **Scenario Y (data present but naming/tokeniser fails to retrieve).**
  PARTIALLY OBSERVED. The kanji-form MHLW articleNums (`第百五十一条
  の三`) would never match an arabic-form query (`第151条の3`) even
  if those articles existed — but they don't for the 151系. For the
  branch-numbered 安衛則第577条の2 (which DOES exist in compact.json
  as 第五百七十七条の二), an arabic-form query would miss it. So Y is
  real but only triggered for the small set of R4/R5 amendment
  articles present in the MHLW layer.
- **Scenario Z (real data gaps).** STRONGLY OBSERVED. 15 of 32
  sampled branch articles are not in any layer of the corpus. The
  owner's "151条の3 alone is suspicious" intuition was correct in
  the sense that the gap is much bigger than one article; it was
  wrong about the cause (it is curation depth, not pipeline failure).

Additionally:

- **Tokeniser edge case (whitespace before の):** Real. The 4-fix
  ARTICLE_NUM_RE in `rag-search.ts:502` does not allow whitespace
  inside the article-number token, so `第151条 の3` loses the
  branch suffix.
- **Query-expansion noise (クレーン → 技能講習 / 特別教育):**
  Real and currently the dominant explanation for the クレーン74条
  top-1 demotion, openly documented in T5.

### E.2 Three remediation options (presented side-by-side, no
single recommendation)

**Option 1 — Curated-data expansion (data-side fix).**
- What: hand-add the high-value missing branch articles. Priorities
  derived from the §A.3 miss list: 安衛則 第36条の2, 第36条の4, 第36条
  の5, 第151条の2, 第151条の4, 第518条の2, 安衛法 第28条の2, クレーン
  則 第74条の2, 有機則 第16条の2, plus the closely related 第568条,
  第151条の14, 第151条の20 (forklift series).
- Affected files: 1 per law — anzen-eisei-kisoku.ts, crane-kisoku.ts,
  yuki-kisoku.ts, rodo-anzen-eisei-ho.ts.
- Modification size: ≈12–15 article entries, each ≈10 LOC including
  keywords. ≈150 LOC net.
- Regression risk: low. Adding new articles changes the search corpus
  but does not change scoring logic. 100q tests must be re-baselined
  but typically improve, not degrade. Need to update
  rag-100q.fixture.ts if any expected answer changes.
- Effort estimate: 4–6 hours, dominated by reading e-Gov to copy the
  authoritative article text accurately.

**Option 2 — Tokeniser hardening (logic-side fix, narrow).**
- What:
  (a) Extend `ARTICLE_NUM_RE` in `rag-search.ts:502` to permit optional
      whitespace inside the token, e.g.
      `第\d+\s*条(?:\s*の\s*\d+)?(?:\s*第\d+\s*項)?(?:\s*第\d+\s*号)?`,
      and strip the captured whitespace before pushing into
      `articleNumTokens`. Resolves the `第151条 の3` edge case.
  (b) When the query contains an explicit `第\d+条(の\d+)?` token, gate
      `expandQuery` so that "クレーン" / "フォークリフト" /
      "玉掛け" / "足場" do NOT inject the 技能講習 / 特別教育 /
      作業主任者 keyword set. Article-number-targeted queries should
      not be re-routed through 就業制限 hub articles. Resolves the
      クレーン74条 top-1 demotion.
- Affected files: `web/src/lib/rag-search.ts` (tokenise / expansion
  call), possibly `web/src/lib/query-expansion.ts` (signature change
  to accept a "has explicit article number" hint).
- Modification size: ≈30 LOC.
- Regression risk: medium. PR #81 was the most recent change to this
  area and was driven by 10 TDD cases. Any further change must re-run
  `rag-100q.test.ts`, `rag-100q-fresh.test.ts`, and
  `rag-article-number.test.ts`. Gating the expansion may regress
  pinned-topic boosts for legitimate "クレーン" general questions
  that happen to include an irrelevant article number — needs new
  test cases.
- Effort estimate: 3–4 hours including TDD.

**Option 3 — MHLW kanji-form normalisation (logic-side fix, broad).**
- What: in `build-laws-compact.mjs` or in `mhlw-extras.ts`, normalise
  kanji-digit articleNum to arabic form
  (`第五百七十七条の二` → `第577条の2`). Use a kanji-to-arabic
  conversion (existing utilities exist in npm; or hand-roll for
  日本語 number patterns up to 千). Re-emit articleNum in arabic form
  so arabic queries can match.
- Affected files: `scripts/etl/build-laws-compact.mjs` (regenerate),
  `web/src/data/laws-mhlw/compact.json` (regenerated artefact),
  `mhlw-extras.ts` (drop the kanji-length-200 special-case rule once
  arabic form is in place).
- Modification size: ≈40 LOC code + regenerated compact.json
  (≈1100 article entries; bytes mostly unchanged).
- Regression risk: medium-high. The compact.json regeneration changes
  searchable inventory. The MHLW R4/R5 amendment articles are short
  PDF fragments (often <60 chars) and currently filtered out for
  good reason; normalising form does not solve the noise problem,
  it only widens matchability. Could push 改正R4 第577条の2 above
  a curated 安衛則第577条 (currently absent anyway). Must rerun
  full 100q.
- Effort estimate: 6–8 hours including ETL re-run and benchmark.

These options are **complementary, not exclusive**. Option 1 is the
only one that fixes scenario Z. Option 2 is the only one that fixes
the クレーン74条 top-1 issue. Option 3 is a partial fix for scenario
Y but does not solve the underlying 安衛則 coverage gap.

A reasonable sequencing — not a recommendation, just a sketch — would
be: Option 1 first (high-value, low-risk, addresses the dominant
cause); then Option 2 once Option 1's new tests are baselined; defer
Option 3 unless an explicit MHLW-amendment-driven query pattern is
identified.

## F. Side observations

- **PINNED_TOPICS 34-rule coverage.** The pin list in
  `rag-search.ts:38` already includes 第151条の73 and 第151条の74
  under the "フォークリフト" trigger, and 第74条 + 第73条 + 第75条
  under "クレーン運転". For クレーン74条 the "クレーン運転" trigger
  word is not contained in the literal user query
  "クレーン等安全規則第74条", so the pin does not fire. Adding the
  trigger phrase "クレーン等安全規則第74条" to the クレーン運転 pin
  block, or generally adding "第74条" as a クレーン则 trigger token,
  would resolve the クレーン74条 top-1 issue without touching the
  search logic. This is a third path — a "data-driven logic fix" —
  worth considering alongside Option 2.
- **`labels 労働安全衛生規則` vs `労働安全衛生規則（足場等）` duplication.**
  539条の2 through 539条の9 are present in both
  anzen-eisei-kisoku.ts (8 entries) and ashiba-sagyo-kisoku.ts (8
  entries) with different text contents. Fix 4 in `rag-search.ts:553`
  strips the parenthetical so they compare equal against a
  「労働安全衛生規則」query. Whether to keep both copies is a separate
  cleanup question; out of scope for this investigation.
- **第568条 returning THP指針 第5 as top-1.** This is an
  unrelated cleanup: the THP指針 第5 entry has aggressive keywords
  ("健康保持増進", "労働者の健康") that latch onto the bare
  "労働安全衛生規則" partial law-name match when the article-number
  token finds nothing. The top-1 is not actively wrong (it is the
  best of a bad set) but it is a confidence-score hazard. Tightening
  the law-name match (require lawShort exact, not law substring)
  would help; out of scope here.
- **100q new-set Recall@5 61%.** Not re-measured. The 15/32 = 47%
  branch-article miss rate is broadly consistent with a 100q failure
  rate dominated by data gaps. A small calibration: 100q includes
  many non-article-number queries (procedural / topic-based) where
  PINNED_TOPICS carries the day; the article-number subset is where
  the gap shows.

## Files referenced

- `web/src/lib/rag-search.ts` — search and tokeniser, post 4-fix.
- `web/src/lib/query-expansion.ts` — synonym expansion (sources of
  the クレーン74条 expansion noise).
- `web/src/data/laws/index.ts` — combined corpus assembly.
- `web/src/data/laws/anzen-eisei-kisoku.ts` — curated 安衛則,
  contains 第151条の3 since PR #83 (commit be8306d).
- `web/src/data/laws/crane-kisoku.ts` — curated クレーン則, contains
  第74条 (運転の合図).
- `web/src/data/laws/mhlw-extras.ts` — MHLW compact.json adapter
  with the four-tier length filter.
- `web/src/data/laws-mhlw/compact.json` — 1,127 PDF-extracted
  articles, generated 2026-04-18.
- `web/src/data/laws-mhlw/articles.jsonl` — 1,426 raw PDF-extracted
  records.
- `scripts/etl/parse-laws-pdf.py` — PDF→JSONL ETL.
- `scripts/etl/build-laws-compact.mjs` — JSONL→compact.json.

## Investigation provenance

- Branch: `docs/rag-branch-numbering-investigation`
- Base: main @ 513a8c9
- Probe scripts written under `tmp/branch-num-investigation/` and
  vitest probes added under `web/src/lib/branch-num-*.test.ts` were
  used to measure tokenizer output and top-10 results; both were
  removed before commit per task instructions (no temporary scripts
  committed).
- No code or data files were modified. This document is the only
  output.
