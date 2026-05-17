# Homepage Main Features Draft — 7-Perspective Draft Meeting

- **Status:** Draft proposal (no code change in this PR).
- **Date:** 2026-05-15 (JST).
- **Scope:** Narrow the homepage "7つの主要機能" (`FlagshipGrid`) down to **3 or fewer** main feature cards, propose new candidates, and design a secondary placement for everything else so that no existing route loses its inbound traffic path.
- **Out of scope:** Implementation. Code changes will follow in a separate dispatch after owner sign-off.
- **Decision required from owner:** Approve / amend the proposed main 3, then file an implementation ticket.

---

## 1. Current state (Phase 1)

### 1.1 Where the "7 features" are defined

- Definition: [web/src/config/flagship-nav.ts](web/src/config/flagship-nav.ts) — `FLAGSHIP_FEATURES` array (7 entries).
- Card grid component: [web/src/components/flagship-grid.tsx](web/src/components/flagship-grid.tsx) — `FlagshipGrid` renders the 7 cards in a 4-column XL grid (so the last row is asymmetric: 4 + 3).
- Used in: [web/src/app/(main)/page.tsx](web/src/app/(main)/page.tsx).
- Top-page layout order today:
  1. `NewHomeHero` — hero title, two CTAs (`/chatbot`, `/ky`), 3 stat tiles.
  2. `HomeThreePillars` — "本日の安全トピック": A. 直近の死亡事故 / B. 警報級悪天候 / C. 直近の法改正3件 (already covers `/accidents`, `/risk`, `/laws`).
  3. `FlagshipGrid` — the 7-card grid in question.

### 1.2 The current 7 features (verbatim from code)

| # | id            | Label           | Card title                       | Target URL        | Subitems |
|---|---------------|-----------------|----------------------------------|-------------------|----------|
| 1 | safety-diary  | 安全衛生日誌    | 安全衛生日誌                     | `/safety-diary`   | 3 |
| 2 | ky            | KY簡易作成      | KY簡易作成                       | `/ky`             | 3 |
| 3 | chemical-ra   | 化学物質RA      | 化学物質リスクアセスメント       | `/chemical-ra`    | 3 |
| 4 | signage       | サイネージ      | サイネージ表示                   | `/signage`        | 3 |
| 5 | laws          | 法改正一覧      | 法改正・通達                     | `/laws`           | 4 |
| 6 | chatbot       | 安衛法AIチャット | 安衛法AIチャット                | `/chatbot`        | 3 |
| 7 | accidents     | 重大事故ニュース | 重大事故・労災ニュース          | `/accidents`      | 3 |

### 1.3 Routes available on the site (May 2026 inventory)

Confirmed against `origin/main` (`git ls-tree -r --name-only origin/main`, 137 page routes). Relevant high-value routes that compete for the main-3 slots:

**Operational tools (do something):**
- `/chatbot` — 安衛法AIチャット (live, RAG-backed)
- `/ky` — KY簡易作成 (live, hero CTA already)
- `/chemical-ra` — 化学物質RA (CREATE-SIMPLE preset)
- `/strategy/plan-generator` — 安全衛生計画ジェネレーター (AI-assisted plan builder)
- `/health-checkup-scheduler` — 健診スケジューラ
- `/safety-diary` — 安全衛生日誌
- `/signage` — サイネージ表示
- `/pdf` — KY PDF出力

**Reference / database tools (find something):**
- `/law-search` — 安衛法条文検索
- `/laws` — 法改正一覧
- `/law-hierarchy` — 法令体系マップ
- `/circulars` — 通達・告示1069件
- `/chemical-database` — 化学物質DB 1546物質
- `/equipment-finder` — 機械等技術指針
- `/education-certification` — 特別教育・技能講習 77種
- `/glossary` — 用語集250語
- `/qa-knowledge` — Q&Aナレッジ

**Industry / situational hubs:**
- `/accidents` — 重大事故ニュース
- `/accidents-reports` — 業種別事故レポート
- `/accidents-analytics` — 25軸ダッシュボード
- `/industries` — 5業種ランディング (new, PR #160)
- `/heat-illness-prevention` — WBGT計算機 + R7 (PR #170, in review)
- `/foreign-workers` — 外国人労働者支援
- `/treatment-work-balance` — 治療と仕事の両立
- `/mental-health` — メンタルヘルス
- `/asbestos-management` — 石綿管理 (PR #171)
- `/bcp` — BCP

**Content / community:**
- `/articles`, `/ky-examples` (150件), `/community-cases`, `/stats`, `/risk-prediction`, `/lms` (waitlist).

### 1.4 What is already prominent above the 7-grid

| Surface         | Already promotes |
|-----------------|---------------------------------------------------|
| Hero CTA #1     | `/chatbot`                                        |
| Hero CTA #2     | `/ky`                                             |
| 3-pillar A      | `/accidents` (latest fatal accident)              |
| 3-pillar B      | `/risk` (warning-grade weather)                   |
| 3-pillar C      | `/laws` (3 most recent revisions)                 |

**Implication:** the 7-grid currently duplicates traffic paths that the upper sections already serve (`/chatbot`, `/ky`, `/accidents`, `/laws`). Re-using one of those slots in the main-3 grid is fine when the upper card surfaces *data* and the grid card surfaces the *tool*, but pure duplicates should be demoted.

---

## 2. Seven independent perspectives (Phase 2)

Each perspective evaluates the 7 features and proposes its own "main 3" without consulting the others. Reasoning is grounded in observable signals (search demand, regulatory deadlines, route maturity, competitor coverage), not preference.

### 2.1 Perspective 1 — SEO marketer

**Signal basis:** estimated monthly search volume in Japan, keyword competitiveness vs `e-Gov`, `anzeninfo.mhlw.go.jp`, `jisha.or.jp`; long-tail leverage; E-E-A-T fit.

Rough monthly-search bracket for the dominant keyword behind each route (order-of-magnitude, not exact):

| Route                  | Top keyword                       | Bracket (JP/mo) | Competition |
|------------------------|-----------------------------------|------------------|-------------|
| `/ky`                  | KY 危険予知 / KY活動表           | 1k–5k            | medium      |
| `/laws`                | 労働安全衛生法 改正              | 5k–10k           | high (e-Gov dominates) |
| `/chatbot`             | 安衛法 AI / 労働安全 ChatGPT     | 200–1k           | low (unique) |
| `/chemical-ra`         | 化学物質 リスクアセスメント      | 500–2k           | medium      |
| `/accidents`           | 労災 事例 / 死亡事故 厚労省      | 1k–5k            | high (anzeninfo dominates) |
| `/safety-diary`        | 安全衛生日誌 (フォーム需要のみ)  | 200–500          | low demand  |
| `/signage`             | 安全 サイネージ                  | <200             | no demand   |

**Evaluation of current 7:**
- KEEP `/chatbot`: unique long-tail magnet, low competition, AI brand pull, future-proof.
- KEEP `/laws` but redirect main slot to `/law-search`: same keyword cluster, but the tool page outperforms the news list for long-tail conversion.
- KEEP `/accidents` but redirect main slot to `/accidents-reports`: industry-filtered URLs (`/accidents-reports/建設`, `/manufacturing`, etc.) generate per-industry long-tail.
- DROP `/safety-diary`: ~500/mo demand, mostly people looking for blank forms.
- DROP `/signage`: ~0 organic demand.
- KEEP `/ky` but it is already in hero CTA — does not need a card slot.
- KEEP `/chemical-ra` but smaller volume; could be promoted via `/chemical-database` for SDS long-tail.

**New main-card candidates (SEO):**
- `/heat-illness-prevention` — seasonal spike (June–September), `WBGT`, `熱中症 義務化` is a 2025-2026 trending query.
- `/accidents-reports` — industry-keyword long-tail.
- `/law-search` — high-volume head term with conversion intent.

**SEO main 3:**
1. `/chatbot` — unique branded long-tail.
2. `/law-search` — head-term volume, internal tool beats news list.
3. `/accidents-reports` — industry × incident long-tail multiplier.

### 2.2 Perspective 2 — Construction-site safety officer

**Signal basis:** daily/weekly cadence of construction safety work; 朝礼 → KY → 作業指示 → 安全パトロール → ヒヤリハット → 災害時報告 loop; subcontractor-tier reality.

**Evaluation of current 7:**
- KEEP `/ky`: every site every day, must produce paper/PDF for 元請 confirmation. Highest operational fit.
- KEEP `/accidents` (but route to `/accidents-reports?industry=建設`): "他社の事故から学ぶ" is a written safety policy at most general contractors.
- KEEP `/strategy/plan-generator` (not in current 7) for annual 年間安全衛生計画.
- DROP `/chemical-ra`: rarely used on construction sites (asbestos handled via `/asbestos-management`; solvents are SDS-driven, not RA-driven on a typical site).
- DROP `/safety-diary`: 元請の現場代理人 already uses 工事日報 systems (Hatakeyama, Adoit, 現場365). Yet another diary tool is not differentiating.
- DROP `/signage`: jobsite displays exist on long projects only; small/medium sites use paper.
- DROP `/laws`: needed but covered via 3-pillars and `/law-search`.
- DROP `/chatbot` from main but keep in hero: site officers ask the AI from the hero CTA, not from a card.

**New main-card candidates (construction):**
- `/strategy/plan-generator` for annual planning.
- `/foreign-workers` — site-foreman pain point (technical-intern + 特定技能 mix).
- `/equipment-finder` — 足場・揚重・保護具 (国家検定品 explicit).

**Construction main 3:**
1. `/ky` — daily must-do (despite being hero CTA, a card reinforces the brand promise).
2. `/accidents-reports` — peer-learning, business-justified.
3. `/strategy/plan-generator` — annual deliverable that 安全衛生委員会 demands.

### 2.3 Perspective 3 — Manufacturing safety manager

**Signal basis:** 化学物質規制R7 (autonomous management transition 2024-04 onwards, full enforcement still rolling), 特別教育マトリクス, 健診管理, ヒヤリハット → ライン停止 reality, multi-shift 24h operation.

**Evaluation of current 7:**
- KEEP `/chemical-ra`: R7 改正 mandates RA for ~700 substances ramping to ~2,900. This is the headline regulatory burden for any 中堅製造業 right now.
- KEEP `/chatbot`: manufacturing safety managers field one-off questions constantly (有機則 vs 特化則 boundary, 健診頻度, 設備改造届).
- DROP `/ky` from main: KY is more 建設業 vocabulary; manufacturing usually uses ヒヤリハット + 危険源洗い出し, served better by `/accidents-reports` and `/chemical-ra`.
- DROP `/safety-diary`: 工場では 操業日誌 + 設備管理システムが既に存在.
- DROP `/signage`: 工場掲示板 では限定的需要.
- DROP `/laws` and `/accidents` from main: replaced by `/law-search` / `/accidents-reports` (more analytical surfaces).
- ADD `/education-certification`: 77種の特別教育・技能講習を一覧/フィルタは strong fit (フォークリフト、玉掛、研削といし、足場、フルハーネス…).
- ADD `/health-checkup-scheduler`: 有機・特化物・電離・じん肺 etc. の健診頻度を一覧化する surface.

**Manufacturing main 3:**
1. `/chemical-ra` — the R7 anchor.
2. `/chatbot` — solver of one-off interpretation questions.
3. `/education-certification` — owns the special-education matrix.

### 2.4 Perspective 4 — Independent safety consultant (the owner)

**Signal basis:** consultant deliverables (年間計画書, 教育資料, 診断レポート, 法改正啓発). Differentiation vs 中災防 (`jisha.or.jp`) and 安衛機構. Ownership IP that the consulting practice can showcase.

**Evaluation of current 7:**
- KEEP `/chatbot`: the differentiator vs `jisha.or.jp` and `anzeninfo.mhlw.go.jp`. Neither competitor offers an AI Q&A grounded in 通達 + 条文.
- ADD `/strategy/plan-generator`: consultants are paid to produce these; an AI-assisted generator is a marketing asset that converts.
- ADD `/accidents-analytics` (the 25-axis dashboard): something a consultant can show a client during a 安全衛生委員会.
- DROP `/safety-diary`: not consulting-grade output.
- DROP `/signage`: no consulting upsell.
- DROP `/ky` from main but keep in hero: KY is a free-tier acquisition tool, not the differentiator.
- DROP `/laws` and `/accidents` from main: served by upper sections.
- DROP `/chemical-ra` from main: covered well, but `/chemical-ra` does not differentiate the consulting brand the way the plan generator does.

**Consultant main 3:**
1. `/chatbot` — brand-defining capability.
2. `/strategy/plan-generator` — converts to consulting engagements.
3. `/accidents-reports` — talkable artifact for client briefings.

### 2.5 Perspective 5 — UX designer

**Signal basis:** Hick's Law (decision time grows with options), Miller 7±2 applies to short-term memory not navigation; for primary-action menus, 3–5 is the canonical recommendation. Asymmetric grid (4+3) is visually weaker than balanced (3+3 or 4+4). First-time-visitor "what is this for?" must answer in 3 seconds.

**Audit of the current layout:**
- Hero already lists two of the seven (`/chatbot`, `/ky`) as primary CTAs. The grid below silently duplicates them. Confusion: am I supposed to scroll down to find them again?
- 7-card grid at xl breakpoint produces 4 + 3 → asymmetric trailing row, weakest cards (signage, safety-diary) end up in the leftover row.
- "配下機能 N 件" microcopy at card bottom adds cognitive load without conversion benefit.
- Three sections in a row (hero → pillars → grid) each compete for the first interaction. The pillars section is data (passive consumption), the grid is tool entry (active navigation) — but they look visually similar (rounded cards in a row).

**Evaluation of current 7:**
- KEEP one strong "Talk to AI" tool slot.
- KEEP one strong "Do a thing right now" slot.
- KEEP one strong "Learn what happened" slot.
- The other four should compress into a 2軍 grid (secondary discovery).

**UX main 3 (by archetype):**
1. `/chatbot` — Conversational ask (matches the hero's AI promise).
2. `/ky` — Concrete daily task (matches the hero's KY CTA).
3. `/accidents-reports` — Browseable learning surface (covers the "passive" archetype).

This 3-card layout is balanced (1 row × 3) and each card maps to a distinct user intent (ask / do / learn).

### 2.6 Perspective 6 — Competitive analysis

**Signal basis:** feature comparison vs the three primary peers a Japanese safety practitioner already uses.

| Capability                              | 中災防 jisha.or.jp | 厚労省 anzeninfo | 建災防 kensaibou | 安全AIポータル |
|-----------------------------------------|---------------------|-------------------|--------------------|-----------------|
| 法令検索                                | partial             | yes               | no                 | yes (`/law-search`) |
| 通達/告示 アーカイブ                    | weak                | partial           | no                 | yes (`/circulars`, 1,069件) |
| 事故事例DB                              | partial             | yes (gold std)    | partial (建設)     | yes (`/accidents-reports`, industry-filtered) |
| 化学物質RA                              | educational         | SDS index         | no                 | yes (`/chemical-ra` CREATE-SIMPLE) |
| 特別教育 教材                           | yes (paid courses)  | partial           | yes (建設)         | yes (`/education-certification` 77種 index) |
| 統計ダッシュボード                      | no                  | yes (national)    | yes (建設)         | yes (`/accidents-analytics` 25軸) |
| **AI Q&A**                              | **no**              | **no**            | **no**             | **yes (`/chatbot`)** |
| **計画書ジェネレーター**                | **no**              | **no**            | **no**             | **yes (`/strategy/plan-generator`)** |
| KY 雛形                                 | yes (PDF)           | yes (PDF)         | yes (PDF)          | yes (`/ky` interactive) |
| サイネージ ダッシュボード               | no                  | no                | no                 | yes (`/signage`) — low demand |
| 安全衛生日誌                            | no                  | no                | no                 | yes (`/safety-diary`) — low demand |

**Where the moat is:** `/chatbot`, `/strategy/plan-generator`, `/accidents-analytics`, `/chemical-ra` (interactive CREATE-SIMPLE) — capabilities no peer offers. Promote these.

**Where we are at parity or behind:** `/laws`, `/accidents` (news), `/circulars` — useful but won't outrank `anzeninfo` or `e-Gov` for head terms. Demote to 2軍.

**Where we have a unique build that lacks demand:** `/safety-diary`, `/signage` — keep them as long-tail/utility surfaces but don't claim a main slot.

**Competitive main 3:**
1. `/chatbot` — the one capability competitors don't have.
2. `/strategy/plan-generator` — the consultant-grade output competitors don't generate.
3. `/accidents-reports` (linked to `/accidents-analytics`) — the analytical surface that beats `anzeninfo`'s flat-list browsing.

### 2.7 Perspective 7 — Five-year outlook

**Signal basis:** 2026 → 2031 regulatory and demographic trajectory.

Trends with high confidence:
- 化学物質規制R7 → R12: autonomous management transition continues to add substances; substantial RA demand growth in 中小企業 (今後5年で売上が伸びる領域).
- メンタルヘルス: ストレスチェック 50名未満事業所への義務化議論が継続. `/mental-health` の重要度が上がる.
- 外国人労働者: 育成就労制度 (2024-06成立) で500万人時代へ. `/foreign-workers` 多言語UI需要拡大.
- 治療と仕事の両立: がん罹患の就労継続支援は政策の柱. `/treatment-work-balance`.
- 熱中症: R7改正で予防対策の事業者義務化 (2025-06施行) → `/heat-illness-prevention` の通年化.
- AI/LLM: 汎用AIが法令検索に十分使えるようになる → 純粋な検索系はコモディティ化. 業界特化の判断・推論部分は差別化が持続.

**Demoted by 5-year outlook:**
- `/laws` (news list) — e-Gov + 汎用LLM がコモディティ化.
- `/signage` — needs grew with IoT but plateaued; not on the trend curve.
- `/safety-diary` — likely to be absorbed by 工事日報 SaaS.

**Promoted by 5-year outlook:**
- `/chatbot` — domain-specialized AI keeps its premium for ≥5 years (training data + 通達/RAG moat).
- `/chemical-ra` — R7 → R12 wave.
- `/accidents-analytics` — accumulating data moat; harder to replicate later.

**Future-proof main 3:**
1. `/chatbot` — specialty AI moat.
2. `/chemical-ra` — R7 chemical wave.
3. `/accidents-analytics` — data-accumulation moat.

---

## 3. Draft meeting — consensus and conflict (Phase 3)

### 3.1 Vote tally per route across perspectives

Each perspective contributed a "main 3". Tally of mentions:

| Route                          | SEO | 建設 | 製造 | コンサル | UX | 競合 | 将来 | Total |
|--------------------------------|:---:|:----:|:----:|:--------:|:--:|:----:|:----:|:-----:|
| `/chatbot`                     |  ●  |      |  ●   |    ●     | ●  |  ●   |  ●   | **6** |
| `/accidents-reports`           |  ●  |  ●   |      |    ●     | ●  |  ●   |      | **5** |
| `/strategy/plan-generator`     |     |  ●   |      |    ●     |    |  ●   |      | **3** |
| `/chemical-ra`                 |     |      |  ●   |          |    |      |  ●   | **2** |
| `/ky`                          |     |  ●   |      |          | ●  |      |      | **2** |
| `/accidents-analytics`         |     |      |      |          |    |      |  ●   | **1** (plus implicit linkage from コンサル + 競合) |
| `/law-search`                  |  ●  |      |      |          |    |      |      | **1** |
| `/education-certification`     |     |      |  ●   |          |    |      |      | **1** |

### 3.2 Consensus to **keep promoted**

- **`/chatbot`** — 6/7 perspectives. Unanimous on differentiation, brand fit, future-proofing.
- **`/accidents-reports`** — 5/7 perspectives. Strong for SEO long-tail, construction practitioner learning, UX "learn" archetype, competitive moat.

### 3.3 Consensus to **demote off the main grid**

Unanimous across all 7 perspectives:
- **`/safety-diary`** — low demand, redundant with construction SaaS, no SEO pull, no differentiation.
- **`/signage`** — near-zero organic demand, niche use case.

Strong (≥5 perspectives) for demotion:
- **`/laws`** — already covered in the 3-pillars block above the grid; e-Gov + LLMs commoditizing.
- **`/accidents`** (the news feed) — already covered in 3-pillars block; the *reports* surface (`/accidents-reports`) is the better main-card target.

### 3.4 The contested third slot — three credible candidates

The first two main-grid slots are uncontested (`/chatbot`, `/accidents-reports`). The third slot has three live contenders:

| Candidate                      | Strengths                                                                 | Weaknesses                                                              | Backed by                          |
|--------------------------------|---------------------------------------------------------------------------|-------------------------------------------------------------------------|------------------------------------|
| **`/strategy/plan-generator`** | Consultant-grade output, no competitor offers it, marketing-ready demo.   | Annual cadence — doesn't bring repeat traffic. Newer route, less SEO mass. | 建設 / コンサル / 競合 (3 votes)    |
| **`/chemical-ra`**             | R7 regulation tailwind, manufacturing core need, durable demand 5 years out. | Industry-specific (mostly 製造), not visible to construction practitioners. | 製造 / 将来 (2 votes)               |
| **`/ky`**                      | Daily action, already-loved feature, strong KW intent.                    | Already in the **hero CTA** above — a third surface duplicates.         | 建設 / UX (2 votes)                 |

### 3.5 Resolving the contested slot

Decision criteria, applied in order:

1. **Avoid hero duplication.** `/ky` is already a hero CTA. A card slot for it would be the third surface promoting the same destination on the same screen.
   - **Eliminates `/ky` from main grid.** It remains discoverable from hero CTA + 2軍 + global nav.

2. **Differentiation > frequency.** The remaining contenders both have 1+ vote moat arguments:
   - `/chemical-ra`: differentiated by depth (CREATE-SIMPLE + 化学物質DB 1546物質) and regulatory tailwind.
   - `/strategy/plan-generator`: differentiated by *category* (no peer has it).

3. **Cross-industry reach.** The grid is the top-page common surface; cards must speak to both construction and manufacturing visitors.
   - `/chemical-ra` skews 製造業 heavily.
   - `/strategy/plan-generator` outputs an annual plan that **every regulated workplace ≥50 employees must produce**, regardless of industry — universal applicability.

4. **Owner brand fit.** The owner is an independent 労働安全コンサルタント. A plan-generator card on the homepage is also the owner's portfolio anchor for consulting clients.

5. **Recovery path for `/chemical-ra`.** Even if not in main 3, it gets prominent 2軍 placement and dedicated industry-hub linkage (`/industries/manufacturing` → `/chemical-ra`). Its R7 traffic does not depend on the homepage main grid.

**Resolution:** the third slot goes to **`/strategy/plan-generator`**, with `/chemical-ra` placed first in the 2軍 grid to ride the R7 wave without occupying scarce hero-adjacent real estate.

### 3.6 Counter-arguments and responses

| Objection                                                          | Source       | Response                                                                                                                              |
|--------------------------------------------------------------------|--------------|---------------------------------------------------------------------------------------------------------------------------------------|
| "R7 化学物質規制 is the biggest 5-year wave — `/chemical-ra` must be main." | 将来 / 製造 | `/chemical-ra` keeps a high-visibility 2軍 slot + `/industries/manufacturing` linkage + 通達 routing via `/circulars`. R7 traffic does not require the main grid to reach the page. |
| "KY is the actual daily product — keep it prominent."              | 建設 / UX   | Hero CTA already does this. Adding a card creates redundancy, not amplification.                                                       |
| "Plan generator is annual, low repeat traffic."                    | (anticipated) | True — but the visitor who sees the plan generator on the homepage *remembers what this site is for*. It is a brand-shaping surface, not a daily-task surface. |
| "Three cards is too few — site looks empty."                       | (anticipated) | The 2軍 grid (six cards) sits directly below. Total surfaces ≥ 9 on the top page (3 main + 6 secondary + features link). No visual emptiness. |
| "Why demote `/laws` when the news list still draws traffic?"        | (anticipated) | The 3-pillars section above already exposes the three most recent revisions with their CTAs. The main-grid `/laws` slot is a literal duplicate. |

---

## 4. Final proposal (Phase 4)

### 4.1 Main 3 features

| #  | Card title                                | Subtitle (1 line)                                              | Primary URL                  |
|----|-------------------------------------------|----------------------------------------------------------------|------------------------------|
| 1  | **安衛法AIに聞く**                        | 条文・通達・告示を出典付きで即答する専門家AI                  | `/chatbot`                   |
| 2  | **業種別の事故から学ぶ**                  | 建設・製造・運輸・医療福祉・林業の事故事例と分析を業種で絞り込み | `/accidents-reports`         |
| 3  | **年間安全衛生計画をAIで作る**            | 業種・規模・前年度実績から年間計画書のドラフトを10分で生成     | `/strategy/plan-generator`   |

**Why these three (consolidated rationale):**
- Each maps to a distinct user intent: **ask (chatbot) / learn (reports) / build (plan generator)**.
- Each is a capability that the three primary peers (中災防, anzeninfo, 建災防) do not offer in this form.
- Each works across construction and manufacturing — no industry is left without a relevant card.
- None duplicates the hero CTAs (`/chatbot` does — but the hero says "質問する", the card says "出典付きで即答する" — different framing, same destination is acceptable when the hero is the primary action verb and the card is the value proposition).

### 4.2 Where each demoted feature goes

No route loses its inbound path. Demoted features get a secondary grid plus existing-section coverage.

**2軍 grid — secondary discovery, 6 cards, 3 columns × 2 rows on lg, 2 × 3 on sm, 1 × 6 on xs:**

| Slot | Card                          | URL                  | Why it's here, not main                                          |
|------|-------------------------------|----------------------|-------------------------------------------------------------------|
| 2-1  | KY簡易作成                    | `/ky`                | Already hero CTA; daily-use, do not let go cold.                  |
| 2-2  | 化学物質RA                    | `/chemical-ra`       | R7 wave; ride via 2軍 + industries hub.                            |
| 2-3  | 法令検索                      | `/law-search`        | Replaces `/laws` slot; tool > news list for repeat use.            |
| 2-4  | 特別教育・技能講習            | `/education-certification` | 製造業 anchor; supports `/industries` cross-link.           |
| 2-5  | 熱中症対策ハブ                | `/heat-illness-prevention` | Seasonal spike (Jun–Sep); R7 義務化 tailwind.              |
| 2-6  | 業種別ランディング            | `/industries`        | Funnels by industry, picks up the long-tail.                       |
| —    | "全機能一覧 →"                | `/features`          | Existing escape hatch for everything else.                         |

Reconciliation table for the 7 demoted-or-relocated current features:

| Current 7-grid feature  | New placement                                                                                     |
|-------------------------|---------------------------------------------------------------------------------------------------|
| 安全衛生日誌            | Move out of homepage grid → `/features` index + global nav.                                       |
| KY簡易作成              | Stays as hero CTA **and** appears in 2軍 grid.                                                    |
| 化学物質RA              | 2軍 grid (slot 2-2) + linked from `/industries/manufacturing` + `/chemical-database` cross-link.   |
| サイネージ              | Out of homepage grid → `/features` index + footer link + `/signage` itself stays live.            |
| 法改正一覧              | Already covered in 3-pillars-C; `/law-search` takes the 2軍 slot. `/laws` retained on `/features`. |
| 安衛法AIチャット        | **Main 3 (slot 1)**.                                                                              |
| 重大事故ニュース        | Already covered in 3-pillars-A; the analytical surface `/accidents-reports` becomes main 3 slot 2. |

### 4.3 Wireframe (text)

```
┌────────────────────────────────────────────────────────────────────────┐
│ NewHomeHero  — UNCHANGED                                              │
│  • H1: 現場の安全を、AIで変える。                                      │
│  • Hero CTA #1: 安衛法AIに質問する → /chatbot                          │
│  • Hero CTA #2: KYを3分で作る → /ky                                    │
│  • 3 stat tiles (MHLW通達 / 事故事例 / 保護具DB)                       │
└────────────────────────────────────────────────────────────────────────┘
                          (max-w-7xl mx-auto px-4)
┌────────────────────────────────────────────────────────────────────────┐
│ HomeThreePillars — UNCHANGED ("本日の安全トピック")                    │
│  ┌── A. 直近の死亡事故 ─┐  ┌── B. 警報級の悪天候 ─┐  ┌── C. 法改正3件 ─┐
│  │ → /accidents          │ │ → /risk               │ │ → /laws         ││
│  └───────────────────────┘ └───────────────────────┘ └─────────────────┘
└────────────────────────────────────────────────────────────────────────┘
                          (max-w-7xl mx-auto px-4)
┌────────────────────────────────────────────────────────────────────────┐
│ FlagshipGrid → MainThreeGrid (NEW, 3 cards, 1 row × 3 on lg)           │
│  FEATURES                                                              │
│  3つの主要機能                                                          │
│  AIで聞く・業種別に学ぶ・年間計画を作る——3つでこのサイトの全貌を体験.   │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐    │
│  │ 💬               │ │ 📊               │ │ 📋                   │    │
│  │ 安衛法AIに聞く   │ │ 業種別事故レポート │ │ 年間計画をAIで作る   │    │
│  │ 出典付きで即答    │ │ 5業種で深堀り    │ │ 10分で計画ドラフト   │    │
│  │ → /chatbot       │ │ → /accidents-    │ │ → /strategy/         │    │
│  │                  │ │   reports        │ │   plan-generator     │    │
│  └──────────────────┘ └──────────────────┘ └──────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
                          (max-w-7xl mx-auto px-4)
┌────────────────────────────────────────────────────────────────────────┐
│ SecondaryGrid (NEW, 6 cards, 3 × 2 on lg, 2 × 3 on sm, 1 × 6 on xs)    │
│  もう一歩進める                                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐                                            │
│  │ KY   │ │ 化学 │ │ 法令 │                                            │
│  │      │ │  RA  │ │ 検索 │                                            │
│  └──────┘ └──────┘ └──────┘                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐                                            │
│  │ 特別 │ │ 熱中 │ │ 業種 │                                            │
│  │ 教育 │ │ 症   │ │ 別LP │                                            │
│  └──────┘ └──────┘ └──────┘                                            │
│  全機能一覧 →  (/features)                                              │
└────────────────────────────────────────────────────────────────────────┘
                  ... (existing below-the-fold blocks unchanged)
```

### 4.4 Component-level implementation notes (for the follow-up dispatch — not in this PR)

- Reuse `FlagshipGrid` styling primitives but rename to `MainThreeGrid` (3-up on lg, 1-up on xs).
- Build `SecondaryGrid` as a separate component with denser cards (smaller padding, no subitem count, no description — just icon + title + 1-line subtitle).
- Update `FLAGSHIP_FEATURES` definition or split into `MAIN_FEATURES` + `SECONDARY_FEATURES` in `web/src/config/flagship-nav.ts` to keep type safety.
- `metadata.description` in [web/src/app/(main)/page.tsx:9-10](web/src/app/(main)/page.tsx) must be rewritten from "7つの主要機能" to the new framing.
- `flagship-nav.ts` is also consumed by header navigation — verify no regressions in `flagship-nav.tsx` before deleting features.
- All seven current routes remain live; only the homepage card surface changes.

### 4.5 Open questions for the owner

1. Is the third slot **`/strategy/plan-generator`** acceptable, or do you want **`/chemical-ra`** (R7 wave) or **`/ky`** (daily use) there instead?
2. Are you OK with the 2軍 grid being 6 cards, or do you prefer 4?
3. Should the "全機能一覧" link become a 7th 2軍 card (more visual weight) or stay as a text link?
4. Should the 2軍 grid title be "もう一歩進める" (proposed), "その他の機能", or "現場別ツール"?
5. Should `/signage` and `/safety-diary` be removed from the global header nav as well, or only from the homepage?

---

## 5. Appendix — methodology and source pointers

### 5.1 Methodology limits

- Search-volume brackets are order-of-magnitude estimates derived from public keyword tools and competitor SERPs as of 2026-05. They are decision-grade, not contract-grade. Owner should validate with their preferred SEO tool before final sign-off.
- Perspectives are simulated by a single model. Owner should treat this document as a structured argument, not a multi-stakeholder vote. The vote tally is a thinking aid, not authoritative weight.
- No A/B test data exists for the current 7-grid; the demotion of `/safety-diary` and `/signage` is based on demand-side signals, not engagement metrics. A follow-up dispatch should review GA4 / Plausible CTR for the current grid before committing the demotion permanently.

### 5.2 Source pointers in this repo

- 7-feature definition: [web/src/config/flagship-nav.ts](web/src/config/flagship-nav.ts).
- Card grid: [web/src/components/flagship-grid.tsx](web/src/components/flagship-grid.tsx).
- Three-pillars topic block: [web/src/components/home-three-pillars.tsx](web/src/components/home-three-pillars.tsx).
- Hero: [web/src/components/new-home-hero.tsx](web/src/components/new-home-hero.tsx).
- Top page composition: [web/src/app/(main)/page.tsx](web/src/app/(main)/page.tsx).
- Features index (escape hatch): `/features` route.

### 5.3 External references consulted

- 厚労省「職場のあんぜんサイト」 anzeninfo.mhlw.go.jp.
- 中央労働災害防止協会 jisha.or.jp.
- 建設業労働災害防止協会 kensaibou.or.jp.
- 化学物質規制改革 (R7 自律的管理): MHLW press releases 2022-2025.
- 育成就労制度 (2024年法案): MOJ / MHLW 2024-06.
- 熱中症 予防対策事業者義務化 (2025-06施行): MHLW 2024 改正告示.

---

**End of draft. Awaiting owner decision on §4.5 before any implementation work begins.**

---

## 6. Post-draft updates (2026-05-17)

### 6.1 Main-3 selection confirmed

Owner reviewed this document and confirmed the main-3 selection (`/chatbot`, `/accidents-reports`, `/strategy/plan-generator`). The follow-up strategic enhancement design was documented in [docs/main-three-strategic-enhancement-2026-05-15.md](docs/main-three-strategic-enhancement-2026-05-15.md) (PR #176).

### 6.2 F-category decisions (§4.5 Q5 — partial answer)

PR #234 (merged 2026-05-17) confirmed the F-category feature dispositions that affect §4.5 Q5:

| Feature | Decision | Homepage implication |
|---------|----------|----------------------|
| F-005 `/signage` | `kept-by-owner` | Stays in global nav; homepage grid demotion from main-3 still valid |
| F-007 `/qa-knowledge` | `reduced-by-owner` | Demoted to FAQ 200問 redirect landing; not a main-3 candidate |
| F-008 accidents trio | `kept-by-owner` | `/accidents-reports` in main-3 confirmed; `/accidents` and `/accidents-analytics` remain live |
| F-010 `/safety-diary` | `reduced-by-owner` | Reduced to 2 pages; homepage grid demotion confirmed |

### 6.3 §4.5 open questions — status

| Q# | Question | Status |
|----|----------|--------|
| Q1 | Third slot `/strategy/plan-generator` vs `/chemical-ra` vs `/ky`? | **Confirmed: `/strategy/plan-generator`** (owner decision per PR #176 commission) |
| Q2 | 6 cards in 2軍 grid? | Open — pending implementation dispatch |
| Q3 | "全機能一覧" as card vs text link? | Open — pending implementation dispatch |
| Q4 | 2軍 grid title? | Open — pending implementation dispatch |
| Q5 | Remove `/signage` and `/safety-diary` from global header nav? | `/signage` stays (kept-by-owner). `/safety-diary` stays in nav (2 pages retained); homepage grid demotion confirmed |

### 6.4 Implementation status

Homepage still renders `FlagshipGrid` (7-card) as of 2026-05-17. The main-3 implementation (`MainThreeGrid` + `SecondaryGrid`) is pending a future implementation dispatch. Routes are unchanged.
