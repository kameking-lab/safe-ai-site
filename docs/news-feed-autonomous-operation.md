# Autonomous news-feed operation guide

Phase B.2 ships an autonomous RSS → AI-judge → publish pipeline for labor-accident
reporting. **There is no human in the loop**: Gemini 2.5 Flash both judges the
entries and gates publication. This document covers the operational surface so
the system can be reasoned about, debugged, and tuned without re-reading the
code.

## Pipeline overview

```
                      cron: 06:00 JST daily
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │  scripts/etl/fetch-news-feed.mjs          │
        │  • fetch RSS  (NHK 社会 / NHK 経済 / 厚労省)│
        │  • keyword pre-filter  (~25 regexes)       │
        │  • dedupe vs. approved+rejected           │
        │  → scripts/etl/data/news-feed-candidates.json
        └───────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │  scripts/etl/news-ai-judge.mjs            │
        │  • Gemini 2.5 Flash, one call / candidate │
        │  • 4 scores + AI summary (≤50 chars)      │
        │  • threshold gate → approved | rejected   │
        │  → web/src/data/news-feed/{approved,rejected}/index.json
        └───────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │  git commit + push to main                │
        │  (`[skip ci]` to avoid recursive runs)    │
        └───────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │  Vercel deploys → /accidents shows the    │
        │  「報道・自動収集」 section                │
        └───────────────────────────────────────────┘
```

Workflow: [`.github/workflows/news-feed-daily.yml`](../.github/workflows/news-feed-daily.yml).

## Source list and the legal call

| ID | Source | License | Why included |
| --- | --- | --- | --- |
| `nhk-shakai` | NHK NEWS WEB 社会 RSS | Headline + URL only under Copyright Act art. 32 quotation | Largest single source of labor-accident headlines |
| `nhk-keizai` | NHK NEWS WEB 経済 RSS | Same as above | Catches industrial / chemical / supply-chain accidents that the social desk skips |
| `mhlw-houdou` | 厚労省 報道発表資料 RSS | Public-sector work (art. 13) / 政府標準利用規約 2.0 | Authoritative for council notices and asbestos certification updates |

**Explicitly excluded** (and why):

- **Kyodo / Jiji** — commercial redistribution licence required.
- **MHLW 職場のあんぜんサイト accident DB** — terms forbid redistribution; the
  contents are already mirrored under our `mhlw` provenance via a separate ETL.
- **Industry papers** (建設工業新聞, 労働新聞) — ToS ambiguity; the AI judge's
  copyrightRisk score would likely fail them anyway. Skipping the fetch saves
  Gemini calls.
- **Police press releases** — labor accidents are sparse in those feeds and
  the ones that appear duplicate NHK headlines.

If a new source is added later, the legal questions to answer are, in order:

1. Is the feed publicly accessible without authentication?
2. Are the ToS explicit about RSS redistribution?
3. Does our usage (headline + URL + independent ≤50-char summary) satisfy
   art. 32 quotation requirements?
4. Will the AI judge's `copyrightRisk` score realistically pass at the 30
   threshold for typical entries?

If any answer is "no" or "unclear," do not add the source.

## AI judge prompt and thresholds

Prompt: [`scripts/etl/news-ai-judge.mjs`](../scripts/etl/news-ai-judge.mjs)
(`JUDGE_INSTRUCTION` constant).

The model is asked to return JSON with four numeric scores plus an independent
summary. The thresholds (also defined in the same file) are:

| Score | Direction | Pass criterion |
| --- | --- | --- |
| `relevance` | higher = more relevant | `≥ 70` |
| `copyrightRisk` | lower = safer | `≤ 30` |
| `misinformationRisk` | lower = safer | `≤ 30` |
| `duplication` | higher = more duplicate | `≤ 50` |

**An entry passes the gate only if *all four* are satisfied.** Failures are
recorded in `web/src/data/news-feed/rejected/index.json` with
`score.rejectionReasons` populated so operators can audit them.

### Why these thresholds

- `relevance ≥ 70` — the NHK feeds carry a lot of non-labor news that
  shares keywords ("墜落" can be a plane crash, "崩壊" can be a building
  collapse with no workers). The 70 cutoff was chosen so single-keyword
  false positives without a labor framing get rejected.
- `copyrightRisk ≤ 30` — headlines from public-sector feeds and the
  major news outlets tend to score 10–20. A score over 30 typically means
  the headline is itself long, highly creative, or implies that the body
  text would need to be quoted to make sense — all things we cannot do
  with only a headline.
- `misinformationRisk ≤ 30` — primary-source-clear reporting from NHK
  and 厚労省 sits at 5–15. A score over 30 means the headline does not
  identify the source incident (e.g., "ある工場で死亡事故"), which we
  cannot publish without misleading readers.
- `duplication ≤ 50` — entries that overlap the existing 5,000-row
  accident DB add nothing to readers and risk double-counting in
  third-party analyses.

If a tuning round shows systematic false positives or false negatives,
the thresholds (not the prompt) should be moved first — they are the cheaper
lever.

## Expected misjudgement patterns

### False approvals (the harder case)

- A non-labor accident sharing a keyword (e.g., a private aviation crash
  scoring high on "墜落" but low on labor framing). **Mitigation**: the
  prompt is explicit that non-labor crashes/disasters should be relevance
  20–40, not 80+. If they leak through, raise `relevanceMin` to 75.
- An overly creative MHLW press-release headline ("ご注意ください！" style).
  These tend to score high on `misinformationRisk` because the headline
  alone doesn't carry the news, and they get auto-rejected. Confirmed in
  test fetches.

### False rejections (the easier case)

- Long, descriptive labor-accident headlines that score 30–40 on
  `copyrightRisk` because the model thinks the headline is itself
  creative enough to need fair-use analysis. We treat these as acceptable
  losses — losing a headline costs less than misjudging copyright. If a
  pattern of valuable losses emerges, prefer raising `copyrightRiskMax`
  to 35 over editing the prompt.
- Council / committee notices that the model decides are too procedural
  (relevance < 70). This is the intended behavior; we are not a calendar.

### Catastrophic model errors

- Gemini occasionally returns a non-JSON payload despite the
  `responseMimeType: application/json` request. The judge falls back to
  inserting the entry in `rejected/` with `score.rejectionReasons = ["judge call failed: ..."]`,
  so it is visible and not silently dropped. A pattern of these means
  the prompt or the SDK has drifted; investigate before tuning thresholds.

## Disaster recovery

### `GEMINI_API_KEY` missing

The judge script logs a clear warning and exits 0 without touching the
approved/rejected files. The fetch stage still runs and writes the
candidates file, so an operator can run stage 2 manually after re-adding
the secret:

```sh
node scripts/etl/news-ai-judge.mjs
```

### Fetch step intermittently fails

Each source is wrapped in a try/catch; one bad source does not block the
others. Persistent failures should be triaged at the source level (RSS URL
change, TLS issue, rate limit) before disabling — `stats[<source>].error`
in the candidates file pinpoints the exact failure mode.

### Bad approval in production

1. Re-run the workflow with `workflow_dispatch` after editing the
   thresholds or the prompt, **or**
2. Manually edit `web/src/data/news-feed/approved/index.json` (remove the
   offending entry by `id`) and commit. The dedupe set will keep it from
   coming back next run (it is hashed by URL).

### Rollback

A revert of the news-feed commits restores the previous approved/rejected
snapshots; the page degrades gracefully (the section hides itself when
`entries.length === 0`).

## Manual / dev usage

```sh
# Stage 1 only (offline-safe, no API key needed):
node scripts/etl/fetch-news-feed.mjs

# Stage 2 (requires GEMINI_API_KEY in environment):
GEMINI_API_KEY=... node scripts/etl/news-ai-judge.mjs
```

The fetch stage writes `scripts/etl/data/news-feed-candidates.json` —
this file is intentionally not committed (it is the inter-stage handoff)
but it is useful to inspect locally when debugging keyword coverage.

## Capacity / API spend

- Daily fetch volume: typically 5–15 candidates per run after the keyword
  filter and dedupe; 200–400 calls/month at the median.
- Gemini 2.5 Flash pricing is well under $0.001 per call at this prompt
  size, so even an outlier 50-candidate day is under $0.10.
- Approved cap: 200 most-recent entries (older entries drop off).
- Rejected cap: 500 most-recent entries (older drop off). Rejected log is
  the operational analysis surface — keep enough history to spot
  threshold-tuning opportunities.

## Adding the autonomous operation note to a new surface

Whenever a new page surfaces these entries, it must:

1. Use a distinct badge or color to separate from `mhlw` / `curated`
   provenance.
2. Link to `/about/news-feed`.
3. Make the headline itself the link to the primary source (target=
   `_blank`, `rel="noopener noreferrer nofollow"`).
4. Display the AI-generated summary, not a quote of the article body.

These four constraints together preserve the Article 32 quotation
framing that the legal review (Draft PR #99) rested on.
