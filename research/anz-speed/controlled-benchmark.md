# Local controlled latency benchmark

Actual baseline/current source; isolated VM with synthetic data. No DB, account, OAuth, RevenueCat, or AI connection. Five samples per version, median. DB read: 30ms. Transaction begin/commit: 20ms each. Anonymous quota/sales dependencies: 100ms each. These are not production results.

| Operation | Before ms | After ms |
|---|---:|---:|
| headerIdentityMs | 342 | 31 |
| entitlementMs | 251.3 | 88.1 |
| sessionMs | 353.2 | 84.5 |
| anonymousQuotaMs | 324.3 | 103.1 |
| rightsReads | 8 | 4 |
| rightsTransactions | 2 | 1 |
