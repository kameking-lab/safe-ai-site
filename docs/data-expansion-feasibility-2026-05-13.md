# Data Expansion Feasibility Investigation — 2026-05-13

Read-only investigation of five owner-identified expansion areas: chemical RA coverage, accident database freshness, AI search / dashboard depth, legal-corpus comprehensiveness, and responsive completeness. No code changes. Implementation options are presented without recommendation — selection is owner judgment.

- Branch: `docs/data-expansion-feasibility-2026-05-13`
- Base SHA: `6e396c6b04a099f53c269e1ee325ae6710f0f9f0` (origin/main)
- Investigator: Claude Code (Opus 4.7)

---

## Phase 0 — worktree cleanup

- `git worktree prune --verbose` reported 30 stale gitdir entries with `Permission Denied` — OneDrive sync locks on `.git/worktrees/*/gitdir` block deletion. These are dangling metadata only; no working directory exists.
- Physical worktree directories under `.claude/worktrees/`: 40. Registered worktree entries (excluding main repo): 40. No orphan physical directories detected.
- Alive marker committed at `logs/data-expansion-feasibility-progress.md` (SHA `0e3b295`).

OneDrive-locked stale gitdir cleanup is a separate maintenance task and is left out of scope here.

---

## Phase A — Chemical RA coverage

### A-1. Current implementation

Pages
- `/chemical-ra` — guided risk assessment workflow. Uses `MhlwChemicalSelector` to bind a substance from the merged MHLW dataset, then renders GHS / PPE / safety-measure cards from `/api/chemical-ra`. Affiliate-linked PPE shopping is embedded inline.
- `/chemical-database` — searchable directory with two tabs:
  - `mhlw` tab: MHLW merged set (currently shown as `MHLW {n}物質（CAS統合）`).
  - `curated` tab: 50 substances with editorial annotations.

Data sources
| Asset | Records | Notes |
|---|---|---|
| `web/src/data/chemicals-mhlw/compact.json` (`entries`) | 3,954 | Pre-merge MHLW extract (4 lists × duplicates) |
| Unique CAS after merge (`mergeByCas`) | 2,548 | + 195 entries without a CAS (name-only) = 2,743 merged rows shown in UI |
| Category counts (compact) | 1,234 skin / 2,316 label_sds / 197 carcinogenic / 207 concentration | One substance can fall into multiple categories |
| `web/src/data/concentration-limits.json` | 919 substances | 232 with MHLW告示177 OEL, 90 JSOH, 481 ACGIH, 307 IARC |
| `web/src/data/mock/chemical-substances-db.ts` | 50 | Curated detail (synonyms, GHS list, related regs, uses, health effects) |
| `web/src/data/articles/chemical-ra-mandatory-substances.json` | (article record set) | SEO article assets, not the chemical DB |

ETL pipeline
- `scripts/etl/parse-chemicals.py` ingests 10 MHLW xlsx/pdf files under repo-root `mhlw-data/chemicals/`.
- `scripts/etl/build-chemicals-compact.mjs` produces `compact.json` (idempotent).
- `scripts/etl/fetch-concentration-limits.mjs` overlays MHLW告示第177号, JSOH allowable concentration, ACGIH TLV, IARC classification on top, falling back through a four-tier `source` field (mhlw > jsoh > acgih > reference).

Per-substance fields available
- name (jp/en), CAS, synonyms, GHS hazard list, OEL (8h / short / ceiling), tier source, IARC group, JSOH OEL, ACGIH TLV, SDS URL, uses, health effects, regulatory tags (label_sds / skin / carcinogenic / concentration).

### A-2. Public data sources

| Source | URL stem | Approx coverage | Format | Licence / ToU |
|---|---|---|---|---|
| MHLW model SDS list (職場のあんぜんサイト) | anzeninfo.mhlw.go.jp/anzen/gmsds/ | ~3,000 SDSs (model) | PDF per substance + HTML index | 政府標準利用規約 = CC BY 4.0 compatible; attribution required |
| MHLW label/SDS-obligation substance list 別表第9 | mhlw.go.jp/content/.../001168179.xlsx (and successor URLs) | ~2,900 substances at full enforcement of 安衛法57条の3 reform | xlsx | Same gov terms |
| MHLW 国によるGHS分類 (jsoh.mhlw.go.jp) | mhlw.go.jp / Anshin | ~3,200 substances classified | xlsx + per-substance HTML | Same gov terms |
| CREATE-SIMPLE v3.1 (xlsm) | anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/CREATE-SIMPLE_*.xlsm | Embedded substance master with OELs (2025-07 version) | xlsm | Tool-use focused; redistribution of the macro itself unclear, but data points can be cross-referenced against primary lists |
| 特化則別表第1 / 有機則別表 / 鉛則 / 四アルキル鉛則 / 粉じん則対象物質 | mhlw.go.jp法令検索 + e-Gov | ~120 / 54 / lead family / TEL family / dust list | HTML / e-Gov JSON | Statute text not copyrightable (Copyright Act art 13) |
| 安衛令別表第3 (特定化学物質) / 第6の2 (有機溶剤) | e-Gov | ~120 (特化) + 54 (有機) | XML / JSON via API v2 | Same |
| JNIOSH 化学物質情報 | jniosh.go.jp | Research-grade hazard summaries | HTML / PDF | 政府標準利用規約 + clear attribution requirement |
| IARC Monographs list | iarc.who.int | ~1,000 classified substances | xlsx | WHO open data terms — non-commercial use friendly, attribution mandatory; commercial repackaging requires review |
| ACGIH TLVs / BEIs (2026 ed.) | acgih.org | ~700 TLVs | Paid xls / book | Excerpts only — full redistribution prohibited; current code already follows excerpt-with-attribution pattern |

The MHLW 安衛法57条の3 reform is staged through FY2026 full enforcement and beyond (the owner cited ~2,900). The Vital v3.1 CREATE-SIMPLE manual (2025-07) is the highest-quality consolidated cross-reference for the current MHLW lists.

### A-3. Gap analysis

- Total merged rows shown in the UI: 2,548 unique CAS + 195 no-CAS. The compact dataset already reaches **most of the 安衛法57条の3 published list at its current expansion stage**. Owner's "~2,000 target" is effectively met for the directory view; the depth, not breadth, is the next bottleneck.
- Coverage by depth (rows with structured fields):
  - 919 substances in `concentration-limits.json` have at least an OEL OR an IARC classification (232 / 90 / 481 / 307 by tier above).
  - That leaves roughly 1,600 merged-CAS rows with **regulatory flag only** (label_sds / skin / carcinogenic) and no numeric OEL / GHS / SDS-link payload.
- Curated 50-substance set covers the "core 50" canon (Benzene, Toluene, formaldehyde, etc.) but is statically maintained — extending to 200-300 with the same level of editorial depth would multiply maintenance load.
- Missing categories that the owner highlighted:
  - 生殖毒性 (reproductive toxicity): GHS field exists per substance but the merged dataset does not currently filter or surface it as a category. EU CLP-equivalent reproductive-tox classifications would need an additional ETL pass.
  - 特化則対象: known via tag `特化則1-3類` in the curated 50, but the MHLW merged set does not currently map each substance to a 特化則 / 有機則 / 鉛則 / 粉じん則 article number.

### A-4. Implementation options (3 alternatives, owner judgment)

**Option A.1 — Depth fill on existing 2,548 rows (no breadth change)**
- Scope: extend `fetch-concentration-limits.mjs` to ingest the full 国によるGHS分類 xlsx and the 安衛令別表第3 / 第6の2 / 鉛則別表 mapping. Add `regulation_articles` field per CAS (e.g., `[{"reg":"特化則","class":"2類","article":"38条の8"}]`).
- Effort: ~5-8 working days. One new ETL script + one ETL update + UI badge changes.
- Risk: ETL must be re-run when MHLW updates the lists (annual / semi-annual). Data version pinning would prevent silent drift.
- Maintenance: medium. Same model as current.

**Option A.2 — Breadth push to ~3,200 substances (国によるGHS全件)**
- Scope: ingest the full 国によるGHS分類 dataset (~3,200) and map each onto the existing merged schema. Add reproductive / mutagenic GHS filters in the directory UI.
- Effort: ~3-5 days. Mostly ETL — UI filter additions are minor.
- Risk: many ~3,200 entries are pure GHS classifications with no Japanese OEL — UI must distinguish "regulated under 安衛法" from "GHS-classified for reference only" or it will mislead users into thinking unregulated substances are mandatory-RA targets.
- Maintenance: medium-high (annual cabinet-order updates churn the regulated-vs-classified boundary).

**Option A.3 — CREATE-SIMPLE parity + 法令マッピング全件 (deep, ~12 working days)**
- Scope: parse CREATE-SIMPLE v3.1 xlsm internals to extract its consolidated substance master (which already cross-references MHLW告示177, JSOH, ACGIH, DFG-MAK 2025, fiscal-2024 国によるGHS); merge into `concentration-limits.json` to push depth from 919 to ~2,500 substances. In parallel, add a `regulation_chain` field linking each CAS to 安衛法 article → 安衛令別表 → specific 規則条文 chain.
- Effort: ~10-14 working days. Includes legal-mapping curation (some manual review needed for ambiguous mapping cases).
- Risk: CREATE-SIMPLE redistribution terms unclear — current code uses it as a cross-reference, not bulk redistribution; legal-mapping curation has subjective edges (e.g., 特化則 substitution candidates).
- Maintenance: high initially, plateaus once stable.

---

## Phase B — Accident database freshness & expansion

### B-1. Current state

`data/accidents-10years.jsonl`
- Total entries: **4,257**
- Date range: 2015-01-14 → 2024-11-07
- Year distribution: 2015 23, 2016 27, 2017 20, 2018 21, 2019 864, 2020 822, 2021 884, 2022 790, 2023 782, **2024 only 24**, 2025 / 2026 absent.
- Severity: 死亡 4,095 / 重傷 152 / 中等傷 5 / 軽傷 5
- Top industries: 建設業 1,412 / 製造業 763 / 運輸交通業 528 / 商業 366
- Top types: 墜落-転落 1,062 / 交通事故道路 727 / はさまれ-巻き込まれ 588 / 激突され 303 / 崩壊-倒壊 236
- Source breakdown: 厚労省死亡災害DB 4,043 / 職場のあんぜんサイト個別事例 196 / 編集部 curated 18

Aggregates (`web/src/data/aggregates-mhlw/`)
- 504,415 全件 (死傷災害) 2006-2021 集計済み (`by-industry / by-year / by-month / by-age / by-type-industry`)
- 4,043 死亡 2019-2023 集計済み (`deaths-by-year / deaths-by-industry`)
- Used by `/accidents` 4 sub-tabs (mhlw-search / mhlw-deaths / industry / mhlw / analysis) — the underlying detail rows are gridded into 6-axis aggregates, not all surfaced as detail cards.

ETL pipeline
- `scripts/etl/fetch-mhlw-accidents.mjs` + `parse-shisho-db.py` + `parse-deaths.py` ingest 192 月次 xls/xlsx files for 死傷災害 and 18 年次 xlsx + 分析 PDF for 死亡災害, all under repo-root `mhlw-data/` (gitignored).
- `build-aggregates.py` and `build-deaths-compact.mjs` produce the JSON aggregates.
- Last regeneration: `aggregates-mhlw/meta.json` generatedAt **2026-04-18T16:55:37Z**. Underlying source data appears to be 2024 vintage (2024 entries truncated at Nov 2024).

### B-2. Public data sources

| Source | Coverage | Format | Update cadence | Notes |
|---|---|---|---|---|
| 職場のあんぜんサイト 死傷災害DB (SHISYO_FND.html) | 死傷災害 全件 1991→ | xlsx per year | Annual (year + 6mo lag) | Gov terms; already ingested up to 2021 |
| 職場のあんぜんサイト 死亡災害DB (SIB_FND.html) | 死亡災害 全件 1991→2023 | xlsx | Annual | Gov terms; ingested 2019-2023 |
| MHLW 労働災害統計確定値 anst00 | 業種・型別・年齢別集計 | xlsx / PDF | Annual | Gov terms |
| MHLW 労働災害発生速報値 sokuhou.html | 死亡災害速報 (前月分まで) | HTML / PDF | Monthly | Gov terms |
| JNIOSH 労働災害DB CSV publication | 全件 CSV | CSV | Periodic | Gov terms; cleaner schema for re-analysis |
| 中央労働災害防止協会 (中災防) | 業界別事故事例集 | PDF / web | Periodic | Mixed — some materials are publication-licensed |
| Industry papers (労働新聞, 安全衛生新報) | 事故報道 | paid subscription | Daily | Paywalled |

### B-3. Press auto-collection design (owner approved)

Sources surveyed (RSS / availability)
- NHKニュース: RSS 1.0 公開. Headline + URL + 要約 短文.
- 共同通信: 公式RSSあり、ただし配信規約で「商用配信・転載は契約必須」とされる傾向 — site-internal display only is the default-allowed mode.
- 時事通信: RSS利用上の注意で個人利用前提、第三者再配信は要審査.
- ITmedia等 (アイティメディア社): RSS利用条件で「発信元表示必須・本文抜粋転載禁止」.
- 厚生労働省: RSS 1.0 で報道発表配信. 営利・非営利問わず再配布は禁止 (見出し+URL は読み込み・表示のみ可).
- 朝日 / 読売 / 毎日 / 日経: いずれも有料コンテンツ中心. RSS / API は限定公開.

Copyright posture (precedent: ヨミウリ・オンライン見出し事件 知財高裁 平17.10.6)
- Headlines themselves are typically **not copyrighted works** (`著作物性`否定).
- However, **systematic, near-real-time, repetitive aggregation of headlines for commercial benefit** can constitute 不法行為 even without 著作権侵害 — the YOL case found 不法行為 on this basis.
- Article body is copyrighted; verbatim reproduction beyond Copyright Act art 32 "正当な引用" criteria (主従関係 / 区別明示 / 出典明示 / 引用の必然性) is infringement.

Safer design pattern
1. Pull only headlines + canonical URL + issue datetime + (where the source RSS provides it) the short summary string.
2. **Never** mirror full bodies. Link out via target=_blank.
3. Do not run any AI summarization that produces text closely tracking the source body.
4. Add visible source attribution + timestamp on each tile.
5. Rate-limit fetches (most RSS endpoints expect ≤ once per hour).
6. Maintain an opt-out list — if a source's ToU prohibits aggregation outright, exclude.
7. **Human review gate** before each item becomes searchable — prevents misinformation propagation and is a defensible response if a source complains.

Cross-check against primary source
- Press headlines often misclassify accident type / industry. The site should cross-verify against MHLW 速報 / 確定統計 before tagging the canonical type. A confidence label (`primary-confirmed`, `press-only`, `disputed`) on each entry preserves data quality.

### B-4. Implementation options

**Option B.1 — Public-only refresh (no press, no risk)**
- Scope: re-run MHLW ETL to pull 2024 死亡災害 full year + 2024 死傷災害 (when 2024 file lands, expected mid-2026) + 2025 速報. Update `accidents-10years.jsonl`. Add 2025-2026 slice once 速報値 is regularly available.
- Effort: ~2 days. Mostly ETL re-run + schema reconciliation.
- Risk: data only as fresh as MHLW publishes — typically 6-9 month lag on 確定値.
- Maintenance: trivial. Cron job to fetch quarterly is sufficient.

**Option B.2 — Public + press headlines (RSS aggregation with human gate)**
- Scope: B.1 plus a `data/press-headlines.jsonl` ingest. RSS poller, dedupe, headline-only display, source attribution, opt-out registry, human-review staging table before publication.
- Effort: ~8-12 days. Includes legal-risk gating UI, audit log, opt-out CMS.
- Risk: medium. Even if every individual source allows RSS use, the cumulative pattern can be challenged (YOL-style 不法行為). Mitigation: keep a contact-and-honor takedown SLA documented.
- Maintenance: ongoing. RSS feeds change schemas; the human-review gate is a recurring labor cost.

**Option B.3 — Public + press + AI second-pass with explicit dual-attribution**
- Scope: B.2 plus an AI-generated 50-100 word "context bullet" that synthesizes (a) what the headline said and (b) what regulatory clause / accident type it most likely maps to — produced and stored with explicit `ai_generated=true` flag, dual-attribution ("press: X / interpretation: 安全AIポータル AI"), and a primary-source link as the canonical pointer.
- Effort: ~15-20 days. Adds Gemini call cost, prompt design, hallucination QA harness.
- Risk: highest. AI summarization that tracks source body too closely → likely copyright issue. Conversely, AI interpretation pulled too far from the headline → misinformation. Demands an explicit divergence guideline + benchmark.
- Maintenance: high. AI prompt versioning, hallucination spot-check, model upgrades.

---

## Phase C — AI search / dashboard for accidents

### C-1. Current state

`/accidents` page features
- 6 tabs: list / mhlw-search / mhlw-deaths / industry / mhlw (analysis) / analysis
- `AccidentExtrasPanel` provides:
  - Profile-based "similar past cases" (top-N strict matches via `searchMhlwSimilarStrict`, three-tier fallback: type → industry → keyword)
  - `CrossTab` 業種 × 事故型 grid (interactive cells linkable to filter)
- `MhlwAccidentAnalysisPanel` consumes pre-aggregated JSON (`by-year / by-industry / by-month / by-age / deaths-by-year / deaths-by-industry`).
- `IndustryRiskRanking` consumes `industry-ranking.json`.
- `LadderStatsCard` (specific industry-stats display).

`/stats` page
- 8-section public dashboard. GA4 Data API backed (`web/src/lib/stats/ga4-client.ts`) with mock fallback. Surfaces DAU / MAU / PV / channel split / conversion / AI-chat usage.
- Independent of accident data — purely site analytics.

`/chatbot` retrieves accident references through RAG when the user query maps semantically (e.g., "墜落事故事例" → top-K curated cases). It is not currently a primary accident search UI.

### C-2. Gap analysis

Multi-axis search
- `CrossTab` provides 2-axis (industry × type) only. The data supports a richer 6-axis cube (year / month / industry / type / age / severity) but the UI does not expose age / month / year × severity drill-down on the user-facing /accidents page (only inside the aggregate analysis panel, which is read-only).
- Natural-language search is **not currently exposed for accidents** specifically. /chatbot can answer, but `/accidents` itself relies on filter chips + free-text within structured fields.
- No "show me month-over-month trends for 化学業界" type guided exploration — the data exists in `accidents-by-month.json` and `accidents-by-type-industry.json` but is not surfaced through a faceted search UI.

Cause / recurrence
- 4,257 jsonl entries have `causes[]` and `preventions[]` arrays. The detail page `accidents/[id]` renders them. Aggregate views do not currently cluster on causes (e.g., "top 5 root causes across 屋根作業 墜落").

Heatmaps / seasonality
- `accidents-by-month.json` exists. `/accidents` does not currently expose a month-by-industry heatmap. `/stats` is GA4-only.

GSC API
- The codebase shows no `GSC_API_*` / Search Console integration. Stats page is purely GA4 based.

### C-3. Implementation options

**Option C.1 — Filter UI enrichment on /accidents (incremental)**
- Scope: add year / month / age / severity filters to `accidents-extras-panel`. Replace 2D `CrossTab` with a 4D pivot that supports row/column axis selection (industry / type / month / age) plus filter chips. Surface `accidents-by-month` as a heatmap component.
- Effort: ~5-7 days. No data work — purely UI on existing aggregates.
- Risk: low. Aggregates are already pre-computed.
- Maintenance: trivial.

**Option C.2 — Dedicated /accidents-analytics or /stats expansion**
- Scope: split a new `/accidents-analytics` page (or add a "事故分析" tab to /stats) that hosts the multi-axis pivot, seasonality view, recurrence-cause clustering. Keep /accidents focused on case search.
- Effort: ~8-12 days. New page + page-level metadata + RelatedPageCards plumbing.
- Risk: low-medium. Adds a page (owner has constrained "no new feature" but this is "re-organize an existing feature into its own page" — borderline; owner judgment required).
- Maintenance: low.

**Option C.3 — AI natural-language query layer over the accident cube**
- Scope: route accident-shaped queries from /chatbot (or a new search bar on /accidents) through a Gemini function-calling layer that returns structured filter parameters. Render via the same components as C.1 / C.2.
- Effort: ~12-18 days. Includes prompt + grounding harness + safety guardrails (don't hallucinate cases or stats).
- Risk: medium. Hallucination of cases is the primary failure mode — the prompt must hard-cap to structured-filter output, never free-text-quote case bodies.
- Maintenance: medium. Prompt versioning + per-model regression checks.

---

## Phase D — Legal comprehensiveness

### D-1. Current corpus

Curated TypeScript law modules (`web/src/data/laws/*.ts`) — article-object counts (rough, by top-level brace pattern):

| File | Approx articles |
|---|---|
| `rodo-anzen-eisei-ho.ts` (安衛法) | 59 |
| `rodo-anzen-eisei-ho-sikokiregu.ts` (安衛令) | 2 |
| `anzen-eisei-kisoku.ts` (安衛則) | 51 |
| `crane-kisoku.ts` | 19 |
| `yuki-kisoku.ts` (有機則) | 13 |
| `tokka-kisoku.ts` (特化則) | 11 |
| `sankketsu-kisoku.ts` (酸欠則) | 13 |
| `sagyokankyo-sokuteiho.ts` (作業環境測定法) | 6 |
| `jinpai-ho.ts` (じん肺法) | 7 |
| `denri-houshasen-kisoku.ts` (電離則) | 6 |
| `sekimen-kisoku.ts` (石綿則) | 8 |
| `funjin-kisoku.ts` (粉じん則) | 6 |
| `rodo-kijun-ho.ts` (労基法) | 8 |
| `rodo-kijun-ho-sikokiregu.ts` (労基則) | 3 |
| `saitei-chingin-ho.ts` (最賃法) | 3 |
| `rodo-keiyaku-ho.ts` (労契法) | 4 |
| `ikuji-kaigo-kyugyo-ho.ts` (育介法) | 5 |
| `rodo-sha-saigai-hosho-hoken-ho.ts` (労災保険法) | 5 |
| `shokugyo-antei-ho.ts` (職安法) | 3 |
| `shokugyo-noryoku-kaihatsu-sokushin-ho.ts` (職能法) | 3 |
| `kenko-hoji-zoshin-shishin.ts` (THP指針) | 4 |
| `vdt-guideline.ts` (VDTガイドライン) | 4 |
| `kagaku-busshitsu-kanri-shishin.ts` (化学物質管理指針) | 5 |
| `gondola-anzen-kisoku.ts` (ゴンドラ則) | 4 |
| `boiler-atsuryoku-yoki-anzen-kisoku.ts` (ボイラー・圧力容器則) | 3 |
| `koa-atsu-sagyo-anzen-eisei-kisoku.ts` (高気圧則) | 4 |
| `kensetsu-gyoho.ts` (建設業法) | 4 |
| `josei-rodo-kijun-kisoku.ts` (女性労働基準規則) | 3 |
| `nensha-rodo-kijun-kisoku.ts` (年少労働基準規則) | 3 |
| `tanki-rodo-sha-kanri-ho.ts` (短時間労働者管理法) | 3 |
| `mental-health-shishin.ts` (メンタルヘルス指針) | 4 |
| `ashiba-sagyo-kisoku.ts` (足場作業則) | 15 |
| `jiritsushinkei-setsumeisho.ts` (過重労働対策) | 4 |
| `koyo-kinto-ho.ts` (雇均法) | 4 |
| **Sum (rough)** | **~308** |

Plus `mhlw-extras.ts` (PDF-extracted, filtered)
- Raw articles in `web/src/data/laws-mhlw/compact.json`: 1,127. Generated 2026-04-18.
- After noise filter in `mhlw-extras.ts`: **320 articles kept** across 11 PDF sources (安衛則改正R4 91, 安衛則改正R5 70, RA指針 41, 安衛令関係 77, 化管告示+補+通達+最新 29, 石綿通達 8, 粉じん関連 1, メンヘル関連 3).

Notices / circulars / guidelines (`mhlw-notices.ts`)
- Total entries: **869** records.
- DocType split: 通達 527 / 告示 244 / 指針 98.
- Category split (top): general 502, chemicals 92, machinery 55, construction 43, asbestos 37, training 32, dust 28, smoking 18, radiation 15, forestry 11, heat-stroke 10, mental-health 9, health-checkup 9, aged-workers 2, foreign-workers 2, noise-vibration 1, risk-assessment 1, infectious-disease 2.

Coverage of 15 industrial-safety regulations (owner-listed)

| # | Regulation | Curated file present? | Articles surfaced |
|---|---|---|---|
| 1 | クレーン等安全規則 | yes (`crane-kisoku.ts`) | 19 of ~250 |
| 2 | ボイラー・圧力容器則 | yes | 3 of ~190 |
| 3 | ゴンドラ安全規則 | yes | 4 of ~30 |
| 4 | 有機溶剤中毒予防規則 | yes | 13 of ~52 |
| 5 | 鉛中毒予防規則 | **NO** dedicated file (only mentions in PDF extracts) | — |
| 6 | 四アルキル鉛中毒予防規則 | **NO** | — |
| 7 | 特定化学物質障害予防規則 | yes | 11 of ~40 |
| 8 | 高気圧作業安全衛生規則 | yes | 4 of ~50 |
| 9 | 電離放射線障害防止規則 | yes | 6 of ~62 |
| 10 | 酸素欠乏症等防止規則 | yes | 13 of ~30 |
| 11 | 事務所衛生基準規則 | **NO** | — |
| 12 | じん肺法・じん肺則 | yes (`jinpai-ho.ts`) | 7 of ~30 |
| 13 | 粉じん障害防止規則 | yes (`funjin-kisoku.ts`) | 6 of ~28 |
| 14 | 機械等検定規則 | **NO** | — |
| 15 | 派遣事業関係 (派遣法) | **NO** | — |

10 / 15 have a dedicated file. **5 are absent** (鉛則 / 四アルキル鉛則 / 事務所衛生基準規則 / 機械等検定規則 / 派遣関係). For files that exist, the curated article count is ~10-30% of the actual article count in the gazetted regulation.

Pages
- `/law-search` — full-text across `allLawArticles` (~628 articles when curated + filtered PDF extracts are summed).
- `/laws` — 法改正 timeline view, backed by `real-law-revisions.ts` (33 entries).
- `/laws/notices-precedents` — 第2層出典 (15 通達 + 15 判例) curated.
- `/circulars` (and `/circulars/[id]`) — directory over 869 notice records, paginated to recent 100 on the index.
- `/laws/glossary` — terminology.

### D-2. Public data sources

| Source | Coverage | Format | Licence |
|---|---|---|---|
| e-Gov 法令API v2 (laws.e-gov.go.jp/api/2/) | 全法令現行 + 過去版 | JSON / XML | 政府標準利用規約 (CC BY 4.0 compat). Law text itself is not copyrightable (Copyright Act art 13) |
| e-Gov XML bulk download (bulkdownload/) | 全法令一括 | zipped XML | Same |
| 法令API v1 PDF spec | reference | PDF | Same |
| MHLW 法令等DB (mhlw.go.jp/hourei/) | 通達・告示・公示・訓令 | HTML | Gov terms |
| 安全衛生情報センター (jaish.gr.jp) | 安全衛生関連通達・告示 | HTML | Mixed — primary text 公開, JAISH editorial 解説 著作権あり |
| 中災防 (中央労働災害防止協会) | 業界向け解説 | PDF / 書籍 | Publication-licensed |

The fact that **law text is not copyrightable** means a far more complete corpus (full article body of all 15 regulations) is legally available; the missing 5 regulations are an ETL gap, not a licensing gap.

### D-3. Hierarchy-visualization page design

The current page set is flat. A hierarchical view would slot at `/law-hierarchy` (or as a tab inside `/law-search`) and would model:

```
法 (e.g., 労働安全衛生法)
└─ 政令 (安衛令)
   └─ 省令 (安衛則, 各特殊規則 ×15)
      └─ 告示 (例: 告示第177号 濃度基準値)
         └─ 通達 (基発XXXX号)
            └─ 指針・解釈例規
```

Each node would carry: 条文数, 直近改正日, e-Gov direct link (法令番号), 通達リンク, 関連事故事例カウント, 関連物質カウント. This is largely a navigation overlay — the data already exists in pieces.

### D-4. Implementation options

**Option D.1 — Data fill only (close the 5-regulation gap, deepen existing 10)**
- Scope: pull full article body for 鉛則 / 四アルキル鉛則 / 事務所衛生基準規則 / 機械等検定規則 / 派遣法 from e-Gov API v2, and deepen the 10 curated regulations to ≥80% article coverage. Re-run the noise filter for mhlw-extras with higher-quality input.
- Effort: ~8-12 days. Mostly ETL + structured curation + RAG re-indexing.
- Risk: low (legally clear). The 100問 Recall@5 baseline of 61% must be verified post-merge — a broader corpus is not automatically a better RAG corpus; chunking, dedup, and ranking interact.
- Maintenance: per-法令改正 cycle (rare for 規則, frequent for 通達).

**Option D.2 — D.1 + `/law-hierarchy` page**
- Scope: D.1 plus a navigation page that renders the 法→政令→省令→規則→告示→通達 hierarchy with breadcrumbs to e-Gov, attached 関連通達 chips, and "jump to 関連条文" links into `/law-search`.
- Effort: D.1 + ~5-7 days. Page is mostly composition over existing data plus a manifest file defining the hierarchy.
- Risk: low. No new data sources.
- Maintenance: low — annual review for 法改正.

**Option D.3 — Full implementation: all 15 regulations + 通達 search + 告示 search + hierarchy page**
- Scope: D.2 plus a dedicated 通達検索 panel inside `/circulars` that supports full-text search across all 527 通達 / 244 告示 / 98 指針, with category facet, issuing date range, and binding-level (binding / indirect / reference) filter. Add per-circular "適用される条文" backlinks.
- Effort: D.2 + ~7-10 days.
- Risk: medium for relevance ranking — circular text is dense and short, and BM25-style ranking tends to score poorly on regulatory queries; semantic retrieval (already used by /chatbot) would carry over better but increases inference cost.
- Maintenance: ~quarterly for 新通達 ingestion.

---

## Phase E — Responsive completeness

### E-1. Approach

Investigation here is **static**, not screenshot-based, due to turn-budget constraints. Findings are derived from:
- Tailwind class scan across `web/src/components/` and `web/src/app/`
- Inspection of breakpoint config (Tailwind v4, `globals.css`)
- Manual audit of layout primitives (`header.tsx`, `app-shell.tsx`, top-level page wrappers)

Screenshot-based verification across 15 pages × 8 viewports is an additional ~2-4 days of work and is included in the implementation options.

### E-2. Current responsive posture

Container widths
- Most pages: `mx-auto max-w-7xl` (1280px PC) — chemical-ra, chemical-database, stats, accidents.
- Some pages: `max-w-6xl` (1152px) — chemical-database-client.
- `/circulars`: `max-w-5xl` (1024px).
- `/signage`: full `w-screen` / `h-screen` (intentional kiosk mode).

Breakpoint config
- Tailwind v4 defaults: sm 640, md 768, lg 1024, xl 1280, 2xl 1536. No custom breakpoints overriding the defaults.
- `globals.css` defines two custom media queries: `(max-width: 1023px)` mobile, `(max-width: 480px)` small phone, plus print and reduced-motion / high-contrast.

Tap target compliance
- `min-h-[44px] / min-w-[44px] / min-h-[48px]` used in 30+ interactive components — well-covered.

Tables (intentional horizontal scroll on mobile)
- `web/src/components/ky-instruction-record-form.tsx`: tables with `min-w-[640px..1100px]` wrapped in `overflow-x-auto`. Behavior is intentional (KY form has a printable-document shape).
- `PricingMatrix`, `lms-panel`, `risk-prediction-panel`, `product-search-panel`, `mhlw-disaster-databases-panel`: all use the same wrap pattern.

Unconditional multi-column grids (potential mobile overflow)
- `home-screen.tsx`, `home-value-hero.tsx`, `ky-page-content.tsx` use `grid-cols-3` / `grid-cols-2` unconditionally for small chip / gauge groups. Content per cell is short (icon + 1-2 word label), so they fit even at 360px viewport — low risk.
- `law-revision-list.tsx`, `mail-delivery-panel.tsx`, `safety-diary/diary-form-detail.tsx` use grid-cols-2 unconditionally for form fields — needs visual check at iPhone SE width (375px) for label wrapping.

Dark-mode coverage
- `html.dark` class strategy via `@custom-variant dark` in Tailwind v4. Header and major shells have dark variants. Per-page audit needed.

### E-3. iPad / tablet-specific considerations

- iPad横 (1366×1024): falls into `lg` (≥1024). Most layouts behave like the PC.
- iPad縦 (1024×1366): exactly at `lg` boundary. Some `lg:px-8` styles may not apply if `<lg` resolution is hit (e.g., 1023px after viewport metrics).
- iPad mini (768×1024): falls into `md`. Page-level `mx-auto max-w-7xl` doesn't constrain since 768 < 1280, but inner `lg:` directives may not fire — needs inspection.
- Split View on iPad: when half-width, viewport drops to ~370-500px effective. The app should behave like mobile.
- Apple Pencil: `/safety-diary` and `/ky` use textarea inputs with the voice-input mic button; handwriting input on iPad is OS-handled inside `<textarea>` — should work, but no explicit pen optimization currently.

### E-4. Implementation options

**Option E.1 — Targeted spot fixes after screenshot pass**
- Scope: run preview-tool screenshot pass on 15 priority pages × 8 viewports (320, 360, 375, 414, 768, 1024, 1366, 1920). Triage horizontal-scroll, label-wrap, and tap-target issues. Fix individual offenders.
- Effort: ~4-6 days (screenshot pass + fixes).
- Risk: lowest. No layout rearchitecture.
- Maintenance: per-feature spot fixes.

**Option E.2 — Breakpoint and container audit**
- Scope: E.1 plus a re-architecture of container widths. Decide one canonical pattern per page archetype: list page (max-w-5xl), tool page (max-w-7xl), dashboard (full bleed), kiosk (w-screen). Migrate inconsistent pages. Add a `@container` query pass for cards that render inside both /accidents detail (narrower) and /chatbot (wider).
- Effort: ~7-10 days.
- Risk: medium. Visual changes across many pages.
- Maintenance: low post-migration.

**Option E.3 — Layout primitive redesign + design tokens**
- Scope: E.2 plus introduction of layout primitive components (`<PageShell variant="list|tool|dashboard|kiosk" />`) replacing ad-hoc `mx-auto max-w-* px-*` strings. Add layout test fixtures (`*.stories.tsx` or playwright visual regression) at the eight viewports.
- Effort: ~14-20 days.
- Risk: medium-high (touches many components). Best done in conjunction with the design system pass.
- Maintenance: lowest — primitive ensures consistency.

---

## Secondary observations (time-permitting)

F-1 — Related integration opportunities

- `/chemical-ra` and `/chemical-database` both consume `mhlw-chemicals.ts`. Their navigation is separate; a unified "化学物質ハブ" tab structure (search → assess → buy PPE) could collapse navigation steps.
- `/accidents` ↔ `/law-search`: a cause → law lookup (each event → which 安衛則 clause applied) would close a loop. The data is present (`causes[]`, `preventions[]` on every entry; `lawShort` on every article) — needs a mapping table.
- `/chatbot` already references all the structured data via RAG. The natural-language entry point on `/accidents` (Option C.3) and `/chemical-ra` would deepen the cross-linking without duplicating data.

F-2 — Performance prediction

- 2,000 chemical rows in client: current 2,743 already shipped; payload via `compact.json` is 3,984-line JSONL ≈ 200KB gzipped. Adding fields per CAS will inflate this 1.5-3×. At 600KB gzipped the initial-page TTI on mobile may slip below the 90 Lighthouse target. Mitigation: lazy-load the bulk data via `import()` only when the search input is focused, ship a 50-row "starter slice" inline.
- 8,000 accident rows: current 4,257 jsonl is ~2MB raw. Doubling to 8,000 puts it at ~4MB. Client-side full-text scan over 4MB is fine on PC but slow on low-end Android. Mitigation: ship a server-side search API or a per-shard JSON file (by year / industry).
- RAG corpus expansion (D.3): adding ~600 通達 articles to the embedding index will need a re-embed pass and a re-bench against the 100問 set. Current Recall@5 baseline 61% may regress 5-10pp short-term if not re-tuned.

---

## Cross-cutting prioritization choices (owner judgment)

These are not recommendations — they are framing axes the owner can pick by.

By blast radius
- Lowest disruption: A.1 (chemical depth), B.1 (public-only refresh), C.1 (filter UI), D.1 (data fill), E.1 (spot fixes).
- Highest disruption: A.3 + B.3 + C.3 + D.3 + E.3 — full deep build.

By legal exposure
- Zero new exposure: A.1, A.2 (gov data only), B.1, C.1, C.2, D.1, D.2, D.3, E.1, E.2, E.3.
- Medium exposure: B.2 (press headline aggregation — YOL-style 不法行為 case law applies).
- Higher exposure: B.3 (press + AI synthesis — copyright risk if AI tracks source).

By maintenance burden
- One-time: D.1 (rule fill), E.1-E.3 (responsive).
- Ongoing modest: A.1, A.2, B.1, C.1, C.2, D.2.
- Ongoing heavy: A.3 (CREATE-SIMPLE parity), B.2 / B.3 (press pipelines), C.3 (AI search), D.3 (circular search re-rank).

By data freshness gain
- Most fresh: B.3 (daily press) > B.2 (daily press) > B.1 (quarterly MHLW) > A.x (annual MHLW lists) > D.x (per-改正).

By user-visible scope
- Coverage breadth wins: A.2, B.2 / B.3, D.3.
- Depth wins: A.1, A.3, C.1 / C.2 / C.3, D.1, E.1 / E.2 / E.3.

---

## Investigation artifact metadata

- Document: `docs/data-expansion-feasibility-2026-05-13.md` (this file).
- Branch: `docs/data-expansion-feasibility-2026-05-13`.
- Base: `6e396c6b04a099f53c269e1ee325ae6710f0f9f0`.
- Draft PR: see commit log for branch (PR linked separately).
- No code modified. All investigation is read-only.
