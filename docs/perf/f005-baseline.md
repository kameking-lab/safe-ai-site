# F-005 CDN cache rollout — baseline (pre-deploy)

Captured: 2026-05-20
Branch: `perf/f005-dynamic-route-cdn-cache`
PR: TBD (added in step 7)
Audit reference: `/audits/post-2week-regression` (F-005), `/audits/site-status-2026-05-19`

## Scope

9 dynamic API routes received 3-header CDN cache configuration
(`Cache-Control` / `CDN-Cache-Control` / `Vercel-CDN-Cache-Control`).
`/api/chatbot` and `/api/chatbot/*` are intentionally excluded — they are
handled by a separate dispatch.

## Route → profile assignment

| Route                       | Method | Profile  | s-maxage  | stale-while-revalidate | Rationale                                                  |
| --------------------------- | ------ | -------- | --------- | ---------------------- | ---------------------------------------------------------- |
| `/api/chat`                 | POST   | REALTIME | 300       | 3600                   | RAG response varies per question; absorb repeated identical asks only |
| `/api/law-summary`          | POST   | INDUSTRY | 14400     | 86400                  | Same `(law, articleNum, text)` → same summary; very stable |
| `/api/quiz-explain`         | POST   | INDUSTRY | 14400     | 86400                  | Same quiz → same AI explanation; stable                    |
| `/api/ky-assist`            | POST   | REALTIME | 300       | 3600                   | seed-driven randomness; light dedupe only                  |
| `/api/summaries`            | GET    | DAILY    | 3600      | 86400                  | Only GET in the set → actual Edge Cache hit                |
| `/api/translate/article`    | POST   | INDUSTRY | 14400     | 86400                  | Same `(text, targetLang)` → identical translation          |
| `/api/safety-alert`         | POST   | DAILY    | 3600      | 86400                  | Daily news / weather / law-revision inputs                 |
| `/api/sds/search`           | POST   | REALTIME | 300       | 3600                   | Query-dependent SDS hits                                   |
| `/api/goods-chat`           | POST   | REALTIME | 300       | 3600                   | AI gen + affiliate-link freshness                          |

Error responses (4xx/5xx) and degraded fallbacks emit
`Cache-Control: no-store, must-revalidate` across all three layers so the
edge never pins a transient failure or a placeholder while Gemini is
recovering.

## ⚠️ Important caveat — POST and Vercel Edge Cache

Vercel's Edge Network only caches `GET` and `HEAD` responses by default.
`Cache-Control: s-maxage=…` and `Vercel-CDN-Cache-Control` on a POST response
are read by intermediaries and the helper makes the intent explicit, but the
Vercel CDN itself will not store them today.

This means only **`/api/summaries`** (GET) will see immediate Edge Cache
hits. The other 8 POST routes need follow-up work to actually save Function
invocations — see `f005-followup.md`. The headers are still correct to ship
now: they are the foundation for that follow-up, they protect against
unintended browser/proxy caching, and the `no-store` paths on errors are
effective today regardless of method.

## Pre-deploy quota baseline

Owner action required — open `/admin/health-check?key=<STRATEGY_AUTH_PASSWORD>`
and paste the snapshot below before merging this PR. The baseline blocks
the after/before comparison in `f005-followup.md`.

```
# Paste output here (timestamp, period.end, samples for fastOriginTransfer /
# edgeRequests / functionInvocations / bandwidth / isrWrites):

snapshot.timestamp:
snapshot.period.end:
fastOriginTransfer:   used=?? GB / limit=?? GB / pct=??%
edgeRequests:         used=?? M  / limit=?? M  / pct=??%
functionInvocations:  used=?? M  / limit=?? M  / pct=??%
bandwidth:            used=?? GB / limit=?? GB / pct=??%
```

Sources to cross-reference:

- `/audits/site-status-2026-05-19` — narrative snapshot at the time the
  F-005 finding was raised.
- Vercel dashboard → Usage tab (`Settings → Usage`) for the same metrics
  the health-check page reads from.

## Expected post-merge effect

Best case (assumes `/api/summaries` carries most of the burn, which is the
working hypothesis from the audit):

- Fast Origin Transfer: 30 GB → ~10 GB (target hit if /api/summaries was
  the dominant contributor; otherwise see follow-up).
- Edge Requests: 1.6 M → ~1 M.
- Function invocations: smaller drop (POST routes still hit origin).

If we land within those targets, ~60–70 % quota reduction is met. If the
POST routes are responsible for most of the burn (likely), the next
follow-up step is GET-ification of the high-traffic ones; that work is
scoped in `f005-followup.md`.
