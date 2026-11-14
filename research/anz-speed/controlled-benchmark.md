# Local controlled latency benchmark

Actual baseline/current source; isolated VM with synthetic data. No DB, account, OAuth, RevenueCat, or AI connection. Five samples per version, median. DB read: 30ms. Transaction begin/commit: 20ms each. Anonymous quota/sales dependencies: 100ms each. These are not production results.

| Operation | Before ms | After ms |
|---|---:|---:|
| entitlementMs | 245.8 | 86.9 |
| sessionMs | 348.8 | 86.3 |
| anonymousQuotaMs | 329.2 | 105.3 |
| rightsReads | 8 | 4 |
| rightsTransactions | 2 | 1 |
