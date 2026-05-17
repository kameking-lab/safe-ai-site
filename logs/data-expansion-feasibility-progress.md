# Data Expansion Feasibility Investigation — Progress Log

Started: 2026-05-14
Branch: docs/data-expansion-feasibility-2026-05-13
Base SHA: 6e396c6b04a099f53c269e1ee325ae6710f0f9f0 (origin/main)

## Scope (read-only investigation)

- A. Chemical Risk Assessment coverage
- B. Accident database freshness and expansion (incl. press auto-collection design)
- C. AI search / dashboard features for accidents
- D. Legal comprehensiveness (15 industrial-safety regulations + circulars + notifications)
- E. Responsive completeness across PC / tablet / phone viewports

## Constraints

- No code modifications, investigation and documentation only.
- No verbatim reproduction of statutes, public datasets, or press articles.
- Draft PR only; no self-merge.

## Progress

- Phase 0 worktree prune: 30 stale gitdir entries reported unremovable due to OneDrive lock (Permission Denied). 40 physical worktree directories match 40 registered entries — no orphan physical directories detected. State left as-is.
- Alive marker committed.
- Phase A code inventory complete: chemical-database = 2,548 unique CAS + 195 no-CAS from compact.json; chemical-substances-db.ts = 50 curated; concentration-limits.json = 919 substances (232 MHLW告示177, 90 JSOH, 481 ACGIH, 307 IARC).
- Phase B code inventory complete: accidents-10years.jsonl = 4,257 entries (4,043 MHLW deaths 2019-2023 + 196 anzeninfo curated + 18 editorial). Date range 2015-01-14 to 2024-11-07. 2024 sparse (24 entries) and 2025-2026 absent.
- Phase D code inventory complete: 33 curated laws (~308 article objects) + mhlw-extras (320 articles after filter, from 1,127 raw). circulars = 869 (244 告示 + 98 指針 + 527 通達). Of the 15 OSH regulations user listed, 10 present, 5 missing (鉛則, 四アルキル鉛則, 事務所衛生規則, 機械等検定規則, 派遣関係).
- Phase E static analysis complete: standard Tailwind v4 breakpoints; mobile-first patterns; min-h-44/48 tap targets present in 30+ components; KY tables intentionally horizontal-scroll with min-w-1100; a handful of unconditional grid-cols-2/3 to verify visually. Screenshot-based verification deferred to implementation phase as part of Option E.1.
- Feasibility doc written at docs/data-expansion-feasibility-2026-05-13.md (English, all phases A-E + secondary + cross-cutting choices).
