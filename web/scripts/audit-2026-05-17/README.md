# Law citation full-codebase audit (2026-05-17)

Scripts that produced the findings recorded in
`docs/law-citation-full-audit-2026-05-17.md` and the public audit page at
`/audits/law-citation-full-audit`.

## Pipeline

Run from `web/`:

```bash
# 1. Extract citations (writes citations.json)
node scripts/audit-2026-05-17/extract-citations.mjs

# 2. Validate against MAX_ARTICLES + abbreviation map (writes findings.{json,md})
node scripts/audit-2026-05-17/validate-citations.mjs

# 3. Detect intra-law articleNum duplicates (writes duplicates.json)
node scripts/audit-2026-05-17/detect-duplicates.mjs

# 4. Normalize non-canonical abbreviations (mutates source files)
node scripts/audit-2026-05-17/normalize-abbrev.mjs
```

Output JSON/markdown files are gitignored — they regenerate on each run.

## Phases

- **A — extract-citations.mjs**: regex scan over 47 law tokens + article markers.
- **B+C — validate-citations.mjs**: classifies findings C0 (out-of-range) /
  C3 (non-canonical abbreviation in TS data) against a hand-curated
  `MAX_ARTICLES` table (max article-number per law, derived from e-Gov).
- **detect-duplicates.mjs**: pairs `(lawShort, articleNum)` within each law
  data file; flags multiple distinct titles sharing the same article number.
- **D — normalize-abbrev.mjs**: replaces 労安法/労安則/労安衛法/労安衛則 with
  canonical 安衛法/安衛則 across source. Idempotent.

## When to extend

- New law added to `web/src/data/laws/`: append it to `LAW_TOKENS` in
  `extract-citations.mjs` and `MAX_ARTICLES` in `validate-citations.mjs`.
- New non-canonical alias spotted: add to `REPLACEMENTS` in
  `normalize-abbrev.mjs` (longer-match-first ordering matters).

## Provenance

Prior law-data-only audit: PR #208. Base SHA for this run: `d2807ca`.
