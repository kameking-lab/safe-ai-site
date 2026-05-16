# news-feed/

Autonomous RSS news-feed datastore (B.2 phase).

## Layout

- `approved/index.json` — entries that passed the AI judge gate. Surfaced
  on `/accidents` under the "報道・自動収集" section. Capped at 200 most-recent
  entries to keep the bundle small.
- `rejected/index.json` — entries that failed the AI judge gate, retained for
  operational analysis. Not displayed in the UI. Capped at 500 most-recent
  entries.

## Schema

See `NewsFeedDataset` / `NewsFeedEntry` in `web/src/lib/types/domain.ts`.

## ETL flow

```
scripts/etl/fetch-news-feed.mjs   # fetch RSS, keyword filter, dedupe, save candidates
scripts/etl/news-ai-judge.mjs     # judge each candidate with Gemini 2.5 Flash
                                  # merges results into approved/rejected JSON files
```

Both run from `.github/workflows/news-feed-daily.yml` at 06:00 JST daily.

## Approval criteria

All four conditions must be satisfied; otherwise the entry is rejected:

- `score.relevance >= 70`
- `score.copyrightRisk <= 30`
- `score.misinformationRisk <= 30`
- `score.duplication <= 50`

## Legal / quotation framing

- Sources are restricted to NHK NEWS WEB RSS and MHLW press releases.
- Only the headline + source URL + an independent AI summary (≤ 50 chars) are
  stored. No verbatim body text.
- The AI summary is the "primary" content under Japanese Copyright Act
  Article 32; the headline citation is the "subordinate" content.
- Industry papers, Kyodo / Jiji, and direct MHLW redistributable databases are
  excluded by design (see `docs/news-feed-autonomous-operation.md`).
