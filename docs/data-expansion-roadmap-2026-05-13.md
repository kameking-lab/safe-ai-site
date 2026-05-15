# Data Expansion Phase Roadmap — 2026-05-13

Execution plan for the data-expansion initiative following the owner's selection from `docs/data-expansion-feasibility-2026-05-13.md`.

- Author: Claude Code (Sonnet 4.6)
- Base main SHA at roadmap creation: `83d5391` (post-PR#99 merge)
- Owner selections: A.1 + A.2 + A.3 (all chemical options), B.1 + B.2 (public refresh + RSS with review gate), C.3 (AI NL query), D.3 (full legal corpus + circular search), E.3 (layout primitive redesign)
- B.2 human-review gate policy: deferred to implementation phase

---

## Overview

Five expansion areas are now in scope, drawn directly from the feasibility investigation. Each area has a selected implementation option; lower-option prerequisites (e.g., A.1 before A.2 before A.3) are respected inside each area. Across areas, independent workstreams (B.1, E.3, A.1) run in parallel where possible; serial dependencies (D.3 requires D.1/D.2 groundwork; C.3 requires a usable accident data foundation) gate later phases.

Selected scope summary:

- **A: Chemical RA coverage** — A.1 (depth fill on existing 2,548 rows) → A.2 (breadth push to ~3,200 substances from 国GHS全件) → A.3 (CREATE-SIMPLE parity + 法令マッピング全件, ~2,500 OEL depth)
- **B: Accident DB freshness** — B.1 (MHLW public-only ETL refresh) + B.2 (RSS headline aggregation with mandatory human review gate; B.3 AI synthesis deferred indefinitely)
- **C: AI search** — C.3 (AI natural-language query layer over the accident cube, Gemini function-calling)
- **D: Legal comprehensiveness** — D.3 (5 missing regulations + 15-reg depth + 通達 expansion + /law-hierarchy page + 通達 search; full corpus)
- **E: Responsive completeness** — E.3 (Tailwind token redesign + layout primitive overhaul across all pages)

---

## Phase 1 — Foundation (this document; complete)

Deliverables merged to main:

1. `docs/data-expansion-feasibility-2026-05-13.md` — five-area investigation, owner option menu (PR #99, SHA `83d5391`)
2. `docs/data-expansion-roadmap-2026-05-13.md` — this document

No code changes. Owner direction confirmed. Unblocks all subsequent phases.

Estimated effort: 0 dev-days (docs only).

---

## Phase 2 — Parallel quick wins (independent workstreams)

All three workstreams can run in parallel on separate branches. No cross-dependency.

### 2-A: B.1 — Public accident data refresh

Scope: re-run MHLW ETL (`fetch-mhlw-accidents.mjs`, `parse-shisho-db.py`, `parse-deaths.py`) against the 2024 死亡災害 確定値 and the 2024 死傷災害 xlsx (expected mid-2026 release). Pull 2025 速報値 slices. Rebuild `accidents-10years.jsonl` and all `aggregates-mhlw/` JSON files.

Deliverables: updated `data/accidents-10years.jsonl`, updated `aggregates-mhlw/`, updated `aggregates-mhlw/meta.json` generatedAt timestamp.

Estimated effort: 2 working days.

Risk: low. MHLW publish schedule determines data freshness; confirm 2024 確定 file availability before starting.

Maintenance: add a quarterly cron trigger to `scripts/etl/fetch-mhlw-accidents.mjs`. No recurring labor beyond scheduled re-runs.

### 2-E: E.3 — Layout primitive redesign

Scope: audit all pages for Tailwind v4 container primitives (max-w, px, gap tokens), enforce the 44px tap-target minimum across all interactive elements, redesign the shared layout token set (spacing scale, breakpoint aliases), and apply across all (main) pages and the signage layout. KY table overflow behavior is intentional and exempt.

Deliverables: updated Tailwind config / CSS layer tokens, per-page layout fixes, mobile screenshot audit (≥ iPhone 14 and Galaxy S23 viewport).

Estimated effort: 7–10 working days.

Risk: low. No data or API work. Regressions are visual; Playwright screenshots catch them.

Maintenance: low. One-time redesign; future pages inherit primitives from the token set.

### 2-A1: A.1 — Chemical depth fill

Scope: extend `fetch-concentration-limits.mjs` to ingest the full 国によるGHS分類 xlsx and the 安衛令別表第3 / 第6の2 / 鉛則別表 mappings. Add a `regulation_articles` field per CAS (e.g., `[{"reg":"特化則","class":"2類","article":"38条の8"}]`). Update `/chemical-database` to surface the new field as regulatory-law badges.

Deliverables: updated `concentration-limits.json`, updated ETL script, updated `/chemical-database` UI badge.

Estimated effort: 5–8 working days.

Risk: low–medium. ETL must be re-run when MHLW updates lists (annual / semi-annual). Pin source-data versions to prevent silent drift.

Maintenance: medium. Same model as current `fetch-concentration-limits.mjs` — scheduled re-run on MHLW update cadence.

---

## Phase 3 — D.3 Legal corpus (serial)

Must start after Phase 2 branches are merged or at least not blocked by them. D.3 is the largest single workstream and should be tackled serially to avoid conflicting law-file edits.

### Five missing regulations

Add TypeScript law modules for: 鉛中毒予防規則 (鉛則), 四アルキル鉛中毒予防規則 (四アルキル鉛則), 事務所衛生基準規則 (事務所衛生則), 機械等検定規則 (機械等検定則), 労働者派遣法関連安全衛生条項 (派遣). Follow the existing module schema in `web/src/data/laws/*.ts`. Source text from e-Gov (statute text is not copyrightable under Copyright Act art 13); do not reproduce verbatim beyond what the module schema requires.

### Depth expansion for existing 15 regulations

Audit the 10 existing law modules for missing articles, outdated article numbers following 2024–2026 amendments, and incomplete enforcement-note fields. Align with current e-Gov XML / e-Gov API v2 output.

### 通達 and 告示 corpus expansion

Current corpus: 869 通達・告示・指針 entries. Target: extend to cover the major 通達 categories (施行通達, 指針, 質疑応答) for the five newly added regulations plus any significant 2023–2026 通達 for the existing regulations. Add `circular_type` and `enforcement_date` fields uniformly. Do not reproduce 通達 body text — store headline, number, issuing bureau, and canonical e-Gov URL only.

### /law-hierarchy page

New page at `/law-hierarchy` (under `web/src/app/(main)/law-hierarchy/`). Renders the 安衛法 → 安衛令 → 各規則 → 告示・指針 hierarchy as an interactive tree. Data driven from the law modules; no hardcoded copy.

### 通達 search

Add a search endpoint and UI for 通達 / 告示 corpus. Full-text search over headline + number + keywords fields. No full-body text ingestion — headline-level search only.

Estimated effort: 18–24 working days total across all D.3 sub-items.

Risk: medium. Manual curation for ambiguous amendment-mapping cases. Legal-mapping edges (e.g., 派遣法 cross-reference to 安衛法 条文) require subject-matter review.

Maintenance: medium. Semi-annual amendment check; update script tied to e-Gov API v2 diff detection.

---

## Phase 4 — Advanced features (requires Phase 2 + 3 completion)

C.3 depends on a refreshed accident corpus (Phase 2-A). A.2 and A.3 depend on A.1 (Phase 2-A1). B.2 requires B.1 as a data foundation.

### 4-A2: A.2 — Breadth push to ~3,200 substances

Scope: ingest full 国によるGHS全件 dataset (~3,200 substances). Map each to the existing merged schema. Add reproductive-toxicity and mutagenic GHS filter categories to `/chemical-database`. UI must clearly distinguish "regulated under 安衛法 (mandatory RA target)" from "GHS-classified for reference only" to avoid misleading users.

Estimated effort: 3–5 working days (after A.1 ETL infrastructure is in place).

Risk: medium. Annual cabinet-order update churns the regulated-vs-classified boundary — requires a versioned boundary-definition field.

### 4-A3: A.3 — CREATE-SIMPLE parity + 法令マッピング

Scope: parse CREATE-SIMPLE v3.1 xlsm internals to extract the consolidated substance master (cross-references MHLW告示177, JSOH, ACGIH, DFG-MAK 2025, 国GHS FY2024). Merge into `concentration-limits.json` to push OEL depth from ~919 to ~2,500 substances. Add a `regulation_chain` field per CAS linking 安衛法 article → 安衛令別表 → specific 規則条文.

Note: CREATE-SIMPLE redistribution terms are unclear for bulk re-export. Use it as a cross-reference source only; primary legal text cites must point to e-Gov / MHLW primary sources. Do not distribute xlsm internals verbatim.

Estimated effort: 10–14 working days.

Risk: medium–high. Manual legal-mapping review for ambiguous cases. Maintain explicit `source_confidence` field per mapping.

### 4-B2: B.2 — RSS headline aggregation with human review gate

Scope: build `data/press-headlines.jsonl` ingest pipeline. RSS poller (≤ once/hour per source), dedupe by canonical URL, headline-only storage (no body text), source attribution, opt-out registry. Human-review staging table — no headline becomes publicly searchable without explicit reviewer approval. Maintain a contact-and-honor takedown SLA document.

Human-review gate policy to be defined at implementation time (not in this document).

Sources in scope (provisional): NHK RSS (public), MHLW 報道発表 RSS. Sources with explicit commercial-aggregation restrictions (共同通信, 時事通信 individual-use terms, ITmedia 転載禁止) are excluded unless a separate agreement is in place.

Legal posture: guided by ヨミウリ・オンライン見出し事件 知財高裁 平成17年10月6日判決. Even non-copyrightable headlines can constitute 不法行為 under systematic commercial aggregation. Mitigations: headline-only display, opt-out registry, human gate, rate limiting.

Estimated effort: 8–12 working days.

Risk: medium. Legal exposure is real but manageable with the documented mitigations. B.3 (AI synthesis) remains deferred indefinitely — do not implement B.3 without explicit owner re-authorization.

### 4-C3: C.3 — AI natural-language query layer

Scope: route accident-shaped natural-language queries from a search bar on `/accidents` (or `/chatbot`) through a Gemini function-calling layer. The layer returns structured filter parameters only — it never free-text-quotes case bodies or fabricates statistics. Render results via existing CrossTab / filter-chip components from C.1 / C.2 infrastructure.

Prompt design constraint: hard-cap Gemini output to a structured JSON filter object. No free-text generation over accident case bodies. Include an explicit hallucination-detection assertion: if the model cannot confidently map the query to a valid filter, return `{"confidence": "low", "filters": null}` and surface a "try a more specific query" prompt to the user.

Estimated effort: 12–18 working days.

Risk: medium. Hallucination of accident statistics is the primary failure mode. Mitigate with structured-output-only prompting + per-query confidence label + regression test suite against known queries.

Maintenance: medium. Prompt versioning, per-model regression checks on Gemini API upgrades.

---

## Dependency map

```
Phase 1: feasibility + roadmap docs (DONE)
  |
  +---> Phase 2 (parallel):
  |       2-A  (B.1 accident refresh)   -----> Phase 4-B2 (B.2 RSS)
  |       2-E  (E.3 layout primitives)
  |       2-A1 (A.1 chemical depth)     -----> Phase 4-A2 (A.2 breadth)
  |                                      -----> Phase 4-A3 (A.3 parity)
  |
  +---> Phase 3 (serial):
          D.3 five regs + depth + circulars + hierarchy + search
  |
  Phase 4 (advanced; requires Phase 2 + 3 fully merged):
    4-B2 (B.2 RSS)          -- requires 2-A
    4-A2 (A.2 breadth)      -- requires 2-A1
    4-A3 (A.3 parity)       -- requires 4-A2
    4-C3 (C.3 AI NL query)  -- requires 2-A (refreshed accident corpus)
```

C.3 can begin in parallel with D.3 if Phase 2-A is complete, since it only depends on the accident data foundation, not the legal corpus.

---

## Estimated effort summary

| Phase | Workstream | Working days |
|-------|-----------|--------------|
| 1 | Docs (complete) | 0 |
| 2-A | B.1 accident refresh | 2 |
| 2-E | E.3 layout primitives | 7–10 |
| 2-A1 | A.1 chemical depth | 5–8 |
| 3 | D.3 legal corpus (all sub-items) | 18–24 |
| 4-B2 | B.2 RSS with review gate | 8–12 |
| 4-A2 | A.2 breadth to ~3,200 | 3–5 |
| 4-A3 | A.3 CREATE-SIMPLE parity | 10–14 |
| 4-C3 | C.3 AI NL query | 12–18 |
| **Total** | | **65–93 working days** |

---

## Risk register

### B.2 RSS legal risk — medium

Basis: ヨミウリ・オンライン見出し事件 知財高裁 平成17年10月6日. Systematic commercial aggregation of headlines can constitute 不法行為 even when headlines are not 著作物. Mitigations are documented in Phase 4-B2 above. B.3 (AI synthesis) is deferred indefinitely and must not be included in B.2 scope.

### A.3 CREATE-SIMPLE redistribution risk — low–medium

The xlsm file contains a macro-VBA tool; bulk re-export of its embedded substance data as a derivative work has unclear terms. Mitigate by treating it as a cross-reference source only, with all primary legal citations pointing to e-Gov / MHLW primary sources.

### C.3 hallucination risk — medium

Gemini function-calling mitigates free-text fabrication if the prompt is hard-capped to structured-filter output. Requires a regression test suite before production deployment.

### D.3 legal-mapping ambiguity — medium

Cross-references between 派遣法 and 安衛法 have subjective mapping edges. Flag ambiguous mappings with `mapping_confidence: "low"` and document the rationale for each edge case.

### Maintenance burden (aggregate)

Phase 2 workstreams add low-to-medium recurring maintenance (ETL re-runs, CSS audit). Phase 3 adds semi-annual amendment checks. Phase 4-B2 adds ongoing human-review labor. Phase 4-A3 and 4-C3 add prompt / model versioning overhead. Total maintenance budget should be estimated before committing to Phase 4 in full.

---

## Review checkpoints

- **Monthly progress check**: at the start of each calendar month, review which phases are merged, unblock the next parallel workstream, and update this document with completed SHA references.
- **2026-08-01 mid-phase evaluation**: full status review after Phase 2 and Phase 3 are expected to be complete. Re-confirm Phase 4 scope, adjust estimates, and re-assess legal risks for B.2 based on any new precedent or MHLW guidance.
- **Phase 4 gate**: do not begin any Phase 4 workstream without an explicit go/no-go decision at the 2026-08 checkpoint.
