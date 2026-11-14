# Local controlled latency benchmark

sp-1-rv re-run, 2026-11-14: baseline `5a01d9ed` versus reviewed source with identity gating and independent entitlement reads. The earlier sp-1 measurements remain in `controlled-benchmark.md`.

Actual baseline/current source; isolated VM with synthetic data. No DB, account, OAuth, RevenueCat, or AI connection. Five samples per version, median. DB read: 30ms. Transaction begin/commit: 20ms each. Anonymous quota/sales dependencies: 100ms each. These are not production results.

| Operation | Before ms | After ms |
|---|---:|---:|
| headerIdentityMs | 343.2 | 31.2 |
| entitlementMs | 244.4 | 95.5 |
| sessionMs | 352.4 | 134.8 |
| anonymousQuotaMs | 320.6 | 103.6 |
| rightsReads | 8 | 4 |
| rightsTransactions | 2 | 1 |

This harness simulates delegate latency with timers, including parallel promises inside transactions. It does not model Prisma's single-connection transaction scheduling, lock contention, SQL round trips, provider latency or network latency. These numbers demonstrate removed waits in the sampled paths; they do not establish production speed or the one-second membership target. Separate overlapping requests now perform separate reads to avoid reusing pre-purchase/revocation results.
