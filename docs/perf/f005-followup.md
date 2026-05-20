# F-005 CDN cache rollout — follow-up & measurement

Last updated: 2026-05-20
Owner: TBD (assign at merge)
Parent: `f005-baseline.md`, `/audits/post-2week-regression`

## Measurement schedule

| Phase   | When                       | Action                                                                  |
| ------- | -------------------------- | ----------------------------------------------------------------------- |
| T+0     | After PR merges to main    | Confirm Vercel deploy is green; smoke-curl one cached + one no-store. |
| T+24 h  | 2026-05-21 (after deploy)  | Snapshot quotas → record under "Day 1" below.                          |
| T+7 d   | 2026-05-27                 | Snapshot quotas → record under "Week 1" below.                         |
| T+14 d  | 2026-06-03                 | Snapshot quotas + decision: GET-ify POST routes or stop here.          |

### How to take the snapshot

1. Open `https://www.anzen-ai-portal.jp/admin/health-check?key=<STRATEGY_AUTH_PASSWORD>`
   (key is in Vercel env; the page is `noindex` so it's safe to reload).
2. Copy the values for `fastOriginTransfer`, `edgeRequests`,
   `functionInvocations`, `bandwidth`, and `isrWrites`.
3. Note `snapshot.period.end` so percentage comparisons stay on the same
   billing window.
4. Append the values to the corresponding row below. Don't overwrite —
   leave the history.

### Smoke commands (T+0)

After deploy, run from a workstation with `curl` to confirm Vercel sees the
headers (look for `x-vercel-cache: HIT` after the second call to `/api/summaries`):

```sh
# GET (DAILY) — should HIT on second call
curl -sI "https://www.anzen-ai-portal.jp/api/summaries?revisionId=lr-001" \
  | grep -iE "cache-control|cdn-cache-control|vercel-cdn-cache-control|x-vercel-cache"
curl -sI "https://www.anzen-ai-portal.jp/api/summaries?revisionId=lr-001" \
  | grep -iE "x-vercel-cache"

# POST (REALTIME) — headers present but won't HIT today; verify no-store on error
curl -sI -X POST "https://www.anzen-ai-portal.jp/api/chat" \
  -H "Content-Type: application/json" -d '{}' \
  | grep -iE "cache-control|cdn-cache-control|vercel-cdn-cache-control"
```

## Measurement log

Format: `metric: pre → day1 → week1 → week2`. Use absolute values, not just
percentages, so we can recompute against any limit change.

| Metric              | Pre (2026-05-20) | Day 1 | Week 1 | Week 2 |
| ------------------- | ---------------- | ----- | ------ | ------ |
| Fast Origin Transfer (GB) |             |       |        |        |
| Edge Requests (M)         |             |       |        |        |
| Function Invocations (M)  |             |       |        |        |
| Bandwidth (GB)            |             |       |        |        |
| ISR Writes                |             |       |        |        |

Targets (from the task brief):

- Fast Origin Transfer < 10 GB (from ~30 GB)
- Edge Requests < 1 M (from ~1.6 M)
- Fluid CPU: directional only; record but don't gate on it.

## Follow-up work (only if Week 1 doesn't hit targets)

The POST routes don't actually CDN-cache on Vercel today. If `/api/summaries`
alone doesn't move the needle, the next tranche is one of:

1. **GET-ify the highest-volume POST routes.** Best candidates:
   - `/api/law-summary` — input is `(law, articleNum, text)`. Hash → put in
     URL → switch to GET. `text` is long; we'd send only the article ID
     and re-hydrate server-side.
   - `/api/translate/article` — same idea, key on `(resourceId, targetLang)`.
   - `/api/quiz-explain` — key on quiz question ID + selected choice.
2. **Move the AI call behind `next/cache` (`unstable_cache` or `fetch`
   with `next: { revalidate }`).** This works for POST but requires deriving
   a deterministic cache key from the JSON body, which is more invasive.
3. **Add Vercel KV (Redis) read-through caching** keyed by request hash.
   Most flexible but adds infra. Only worth it if (1) and (2) are blocked.

Decision criteria at T+14 d:

- Targets met → close F-005, archive this file.
- Edge Requests met, FOT still high → KV cache for the top-3 POST routes.
- Both still high → GET-ify the top-2 POST routes (option 1).

## Routes intentionally not in this dispatch

| Route                 | Reason                                                                  |
| --------------------- | ----------------------------------------------------------------------- |
| `/api/chatbot`        | Tracked under a separate chatbot-suite dispatch.                        |
| `/api/chatbot/*`      | Same. Keep the chatbot cache strategy unified there.                    |

## Verification proof (added at PR time)

`curl -i` against local dev (`http://localhost:3000`) on
2026-05-20 confirmed each route emits the three headers and the correct
profile values. See PR description for the captured headers.
