# Main 3 Features — Strategic Enhancement Design

- **Status:** Draft proposal (no code change in this PR).
- **Date:** 2026-05-15 (JST).
- **Scope:** Take the three main features proposed in Draft PR #173 (`/chatbot`, `/accidents-reports`, `/strategy/plan-generator`) and design value-adds that put each one beyond the reach of the closest competitor for the next ≥5 years. Five strategic perspectives are applied per feature, then consolidated into a single evolution roadmap with P0/P1/P2 priorities.
- **Out of scope:** Implementation. No code change in this PR. All proposals are decision-grade for owner sign-off, not engineering-grade specs.
- **Decision required from owner:** Approve / amend the P0 list in §6.

---

## 1. Why this document exists

The seven-perspective draft meeting in [docs/homepage-main-features-draft-2026-05-15.md](docs/homepage-main-features-draft-2026-05-15.md) (Draft PR #173) converged on a main-3 grid of `/chatbot`, `/accidents-reports`, `/strategy/plan-generator`. The owner reviewed the proposal and raised a sharper question:

> "If we narrow to three, each one must carry enough value-add that no competitor can catch up. Where exactly is the moat for each — and is it durable for five years?"

This document answers that question feature by feature. The diagnostic from PR #173 holds (the *structure* is right), but the value proposition per feature, as currently shipped, is not yet at the moat depth the owner is asking for:

| Feature                       | PR #173 claim                                          | Owner's pushback                                                                                  |
|-------------------------------|---------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| `/chatbot`                    | "No competitor offers AI Q&A grounded in 安衛法."        | True in early 2026, but JISHA launched **a chatbot on 2026-04-01**. Pure AI-Q&A as a category is differentiating for ≤12 months. |
| `/accidents-reports`          | "Per-industry analytical pages beat anzeninfo's flat list." | Industry-by-industry case analysis is what 中災防 and 建災防 already publish — in PDF, but the substance is similar. We need a structural reason they cannot match us. |
| `/strategy/plan-generator`    | "Consultant-grade output competitors don't generate."    | Annual cadence means a visitor uses it once a year. Repeat-visit hook is missing.                 |

The three pushbacks are different in kind — defensive vs. parity vs. retention — and each demands a different kind of value-add. The remainder of this document treats them on their own terms before re-integrating them into a coherent roadmap.

---

## 2. Phase A — Current capabilities (fact-grounded, from code)

This section is not the full re-inventory in PR #173; it is the minimum factual baseline needed before designing enhancements. Source paths are linked so every claim can be audited.

### 2.1 `/chatbot`

- Entry: [web/src/app/(main)/chatbot/page.tsx](web/src/app/(main)/chatbot/page.tsx); body: [web/src/app/(main)/chatbot/ChatbotBody.tsx](web/src/app/(main)/chatbot/ChatbotBody.tsx); API: [web/src/app/api/chatbot/route.ts](web/src/app/api/chatbot/route.ts); panel: [web/src/components/chatbot-panel.tsx](web/src/components/chatbot-panel.tsx).
- Capability surface:
  - RAG over **33+ laws** (安衛法, 安衛則, クレーン則, 有機則, 特化則, 酸欠則, 石綿則, じん肺法, 粉じん則, 電離則, ボイラー則, ゴンドラ則, 足場則, 高圧則, 作業環境測定法, 労基法, 労災保険法, 育児介護休業法, 雇用均等法, etc.).
  - Citations rendered inline (article-and-paragraph granularity); see [web/src/lib/rag-article-number.test.ts](web/src/lib/rag-article-number.test.ts).
  - 100-question Recall@5 benchmark publicly published at [`/about/chatbot-eval`](web/src/app/(main)/about/chatbot-eval/page.tsx).
  - Share-by-URL flow at [`/chatbot/share/[id]`](web/src/app/(main)/chatbot/share/[id]/page.tsx).
  - Bilingual UI (JA / EN beta).
- Data assets behind it:
  - Law corpus (33+ acts/regulations) — ingested.
  - **Circulars/告示 1,069 entries** at `/circulars` (PR #162) — referenced but **not yet wired into RAG** as a separate retrieval channel per [docs/rag-deferred-improvements-2026-05-13.md](docs/rag-deferred-improvements-2026-05-13.md).
  - News-feed pipeline at [web/src/data/news-feed/approved/index.json](web/src/data/news-feed/approved/index.json) + daily ETL [.github/workflows/news-feed-daily.yml](.github/workflows/news-feed-daily.yml) — also not yet wired in.
- Gaps visible from code:
  - No image / SDS-label / equipment-nameplate upload.
  - No voice input.
  - No multi-turn memory across sessions.
  - No "ask about my plan" — chatbot does not see the user's generated annual plan, KY, or accident-report context.

### 2.2 `/accidents-reports`

- Entry: [web/src/app/(main)/accidents-reports/page.tsx](web/src/app/(main)/accidents-reports/page.tsx); per-industry page: [web/src/app/(main)/accidents-reports/[industry]/page.tsx](web/src/app/(main)/accidents-reports/[industry]/page.tsx); report view: [web/src/components/accidents-reports/industry-report-view.tsx](web/src/components/accidents-reports/industry-report-view.tsx); analysis lib: [web/src/lib/accident-analysis.ts](web/src/lib/accident-analysis.ts).
- Capability surface:
  - 5 industries pre-generated (construction, manufacturing, transportation, medical-welfare, service).
  - Per-industry: accident-type ranking, cause Top-10, monthly seasonality, year-over-year trend, recommended controls, related laws.
  - JSON-LD `Dataset` schema per report (license CC-BY-4.0).
  - Daily revalidation (`revalidate = 86400`).
  - Linked outwards to `/accidents-analytics` (25-axis dashboard) and `/risk-prediction`.
- Data assets behind it:
  - `data/accidents-10years.jsonl` (PR #104 et al.) plus editorial-curated cases.
  - **Total combined cases: ~5,000+** (the home hub renders the running combined count).
  - Industry coverage limited to 5 — many key industries (林業, 港湾, 倉庫, 化学, 鉱業, 電気) are not yet pre-generated.
- Gaps visible from code:
  - No user-supplied case ingestion (e.g. "我が社のヒヤリハットを匿名で投稿").
  - No similarity search ("我が社の作業内容に似た過去事例を見せて").
  - No image / video evidence on case records.
  - No subscriptions ("この業種で新しい死亡事故が出たら通知").
  - No multi-industry filtering ("建設×墜落×屋根" cross-cut).
  - Report content updates with the dataset, but the human-readable narrative is a fixed template — not yet AI-generated commentary per industry.

### 2.3 `/strategy/plan-generator`

- Entry: [web/src/app/(main)/strategy/plan-generator/page.tsx](web/src/app/(main)/strategy/plan-generator/page.tsx); form: [web/src/components/safety-plan/plan-generator-form.tsx](web/src/components/safety-plan/plan-generator-form.tsx); templates: [web/src/data/safety-plan-templates/](web/src/data/safety-plan-templates/).
- Capability surface:
  - **10 industries** templated (construction, manufacturing, transportation, medical, food, retail, wholesale, warehouse, service, office) × **3 size bands** (≤49 / 50–299 / ≥300 employees) = **30 base permutations**.
  - Each template merges with a common base (`base/common-goals.ts`, `common-laws.ts`, `common-measures.ts`, `common-schedule.ts`) so industry overrides are additive.
  - Output: 基本方針, 重点目標, 実施事項, 月別スケジュール (with national safety/health weeks pre-marked), 関連法令.
  - Browser PDF output.
- Data assets behind it:
  - Hand-curated templates by the owner (the consultant).
  - Cross-linked to `/laws`, `/circulars`.
- Gaps visible from code:
  - No prior-year accident data ingestion ("if your last fiscal year had 3 falling accidents, prioritize 墜落・転落 in 重点目標").
  - No company-specific input beyond industry + size (no chemical inventory, no equipment list, no shift pattern).
  - No save / version / share / collaborator review.
  - No alignment with the **annual 建災防 実施事項** publication or MHLW labor-bureau templates.
  - No follow-up: a plan is generated, the user leaves, and the site has no reason to bring them back for 11 months.

---

## 3. Phase B — Competitive differential analysis

Each of the three features is sized up against the named competitors. Findings come from a fresh 2026-05 sweep of public pages; uncertain entries are explicitly flagged. See Appendix §A for the full source list.

### 3.1 `/chatbot` — competitive landscape for OSH-law AI Q&A

| Competitor                                   | Has AI Q&A on 安衛法 / OSH law?                                              | Source                                                                                          |
|----------------------------------------------|------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| 中央労働災害防止協会 (`jisha.or.jp`)         | **A chatbot was launched 2026-04-01.** Scope (full law Q&A vs. site-FAQ) not publicly verifiable; dedicated `/info/chatbot.html` returns 404. **Confirmation required.** | https://www.jisha.or.jp/ (news index 2026-04-01)                                                |
| 厚労省 職場のあんぜんサイト (`anzeninfo`)    | No AI chatbot. Keyword search + static FAQ only.                              | https://anzeninfo.mhlw.go.jp                                                                     |
| 建設業労働災害防止協会 (`kensaibou.or.jp`)   | No AI chatbot. Has an "ICT/AI labor-disaster-prevention" reference database (vendor case studies, not Q&A). | https://www.kensaibou.or.jp/safe_tech/ict/use/ict/ai/index.html                                  |
| e-Gov 法令検索                                | Keyword search only; no Q&A.                                                  | https://laws.e-gov.go.jp                                                                         |
| 厚労省 労働基準監督署 chatbot                | AI-powered FAQ on 労働条件・安全衛生・労災保険 (general). Does **not** answer statutory-interpretation questions. | https://www.mhlw.go.jp/stf/roudoukijyunkantokusyo-chatbot.html                                   |
| Japanese B2B SaaS (PKSHA, Ricoh, OfficeBot)  | Generic chatbots; no 安衛法 domain grounding verified.                        | —                                                                                                |
| US OSHA / EU-OSHA                            | No AI chatbot on the authority site itself. (Several US third-party tools — HSI Sky, oshaask, viAct — exist.) | https://www.osha.gov ; https://osha.europa.eu                                                    |

**Verdict — `/chatbot`:**
- *Currently winning:* unique RAG depth (33+ acts), published 100-question Recall@5 benchmark, in-line citations, English support.
- *Currently at parity:* nothing.
- *Currently losing:* **the existence of JISHA's 2026-04-01 chatbot is a yellow flag.** If JISHA's chatbot has full-law Q&A, the gap closes. If it is site-FAQ, the gap holds. Owner action required: verify JISHA chatbot scope before publishing any "no competitor offers this" marketing.

### 3.2 `/accidents-reports` — competitive landscape for industry-filtered accident analytics

Taxonomy axes (4 levels of capability):
- **(a)** Raw case lookup — keyword/filter search returning individual records.
- **(b)** Curated PDF / static reports updated annually.
- **(c)** Interactive industry-filtered dashboard.
- **(d)** Auto-generated analytical commentary (causes, patterns, recommended controls).

| Competitor                                          | a   | b   | c     | d   | Source                                                                                                       |
|------------------------------------------------------|-----|-----|-------|-----|---------------------------------------------------------------------------------------------------------------|
| 厚労省 職場のあんぜんサイト (`anzeninfo`)            | yes | yes (3-yr rotation) | no    | no  | https://anzeninfo.mhlw.go.jp/user/anzen/tok/bnsk00.html                                                       |
| JAISH / JISHA 分析データ                              | —   | yes | no    | no  | https://www.jaish.gr.jp/anzen/sai/bunsekidata/bunsekidata_index.html                                          |
| 建災防 (建設業労働災害防止協会)                       | —   | yes | no    | no  | https://www.kensaibou.or.jp/safe_tech/statistics/index.html                                                   |
| 林災防 / 陸災防                                       | —   | yes | no    | no  | https://www.rinsaibou.or.jp/disaster/toukei.html ; https://rikusai.or.jp/occurrence_situation/                |
| 港湾労災防                                            | yes | yes | partial | no  | https://kouwansaibou.or.jp/search.html                                                                        |
| 労働安全衛生総合研究所 JNIOSH (Power BI prototype)    | —   | —   | yes (prototype) | no  | https://www.jniosh.johas.go.jp/publication/mail_mag/2024/186-column-1.html                                    |
| US OSHA Severe Injury Reports dashboard               | yes | —   | yes   | no  | https://www.osha.gov/severe-injury-reports                                                                    |
| EU-OSHA OSH Barometer                                 | —   | —   | yes   | no  | https://visualisation.osha.europa.eu/                                                                         |
| Japanese commercial SaaS at (c)+(d)                   | **not verified — appears to be empty** | https://built.itmedia.co.jp/bt/articles/2601/19/news113.html (one construction-site bot, scope ≠ same)        |

**Verdict — `/accidents-reports`:**
- *Currently winning:* combines (a) lookup, (b) curated narrative, **(c) interactive industry filtering**, and **(d) auto-rendered narrative templates** in a single product — no verified Japanese player covers all four.
- *Currently at parity:* the raw data sources are public (anzeninfo + 死傷病報告 open data), so anyone could in principle replicate the (a) layer.
- *Currently losing:* per-industry curated PDF *content* from 建災防 / JISHA carries decades of institutional authority that a freshly-generated narrative does not match. The narrative-template approach risks reading as auto-generated unless reinforced with named expert sign-off.

### 3.3 `/strategy/plan-generator` — competitive landscape for annual safety plans

Same taxonomy.

| Competitor                                                   | a   | b (free Word/Excel template) | c (interactive web generator) | d (AI / industry × scale customization) | Source                                                                                                                                                                                                                                  |
|--------------------------------------------------------------|-----|------------------------------|--------------------------------|-----------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 都道府県労働局 (MHLW prefectural bureaus)                    | —   | **yes (Excel, free, per-prefecture, with worked examples)** | no                              | no                                       | https://jsite.mhlw.go.jp/nagano-roudoukyoku/hourei_seido_tetsuzuki/anzen_eisei/anzeneisei_nenkankeikakusyo.html ; https://jsite.mhlw.go.jp/ehime-roudoukyoku/hourei_seido_tetsuzuki/anzen_eisei/anzen_eisei_yousikikankei.html              |
| 中央労働災害防止協会 (JISHA)                                  | —   | not verified (paid books + consulting) | no                              | no                                       | https://www.jisha.or.jp                                                                                                                                                                                                                  |
| 建設業労働災害防止協会 (Kensaibou)                            | —   | yes (annual 実施事項 PDF; not a fill-in template) | no                              | no                                       | https://www.kensaibou.or.jp/public_relations/enforcement_plan/index.html                                                                                                                                                                  |
| (一社)安全衛生マネジメント協会                                | —   | **yes (Excel + worked example, free)** | no                              | no                                       | https://www.aemk.or.jp/plan_sheet01.html                                                                                                                                                                                                  |
| HRTech / 建設SaaS (Money Forward Cloud Construction, etc.)    | —   | yes (Word, SEO-driven) | no                              | no                                       | (multiple, SEO landing pages)                                                                                                                                                                                                            |
| US OSHA private SaaS (J.J.Keller, Safety Plan Builder, OSHAMap) | —   | —                            | **yes**                         | partial (NAICS code expansion)            | https://www.jjkeller.com ; https://safetyplanbuilder.com (US-centric, not Japanese)                                                                                                                                                       |
| EU-OSHA OiRA                                                  | —   | —                            | **yes (63 sectors, English coverage 11)** | partial (sector-driven, not size-driven)  | https://oiraproject.eu/                                                                                                                                                                                                                  |
| Japanese commercial SaaS at (c)+(d)                            | **not verified — appears to be empty** | (slogan generators only)                                                                                                                                                                                                                |

**Verdict — `/strategy/plan-generator`:**
- *Currently winning:* the **only** verifiable Japanese (c)+(d) offering. (a)+(b) is saturated; (c) is empty; (d) is empty.
- *Currently at parity:* the *content* of the plan is comparable to a labor-bureau Excel template. The differentiator is the assembly + the industry/scale routing.
- *Currently losing:* annual cadence — no other competitor has solved this either, but a one-shot tool is structurally limited regardless of who builds it.

### 3.4 Cross-feature takeaway

| Feature                       | Moat type today          | Moat depth     | Sustainable for 5 years if we add…                                                                |
|-------------------------------|--------------------------|----------------|--------------------------------------------------------------------------------------------------|
| `/chatbot`                    | Capability (AI Q&A)      | Shallow (≤12mo) | depth: 通達 + 告示 RAG, multimodal (image upload), proprietary 通達 dataset, expert sign-off       |
| `/accidents-reports`          | Format (interactive + commentary) | Medium    | data exclusivity: user-contributed anonymized cases, similarity search, expert annotation         |
| `/strategy/plan-generator`    | Category (AI generator)  | Medium (because empty) | retention: prior-year accident integration, monthly check-ins, version history, committee workflow |

These are the three "what to add" verticals that the next section explores from five strategic perspectives.

---

## 4. Phase C — Five-perspective value-add design meeting

For each feature, five strategic perspectives generate value-add candidates. Each perspective has a sharp, single-axis lens; conflicts between perspectives are surfaced rather than reconciled here (reconciliation happens in §5).

The five perspectives are:

- **P1. Tech differentiation** — what AI/LLM/data-engineering capability is hard for a competitor to replicate?
- **P2. Data exclusivity** — what user-contributed or accumulating dataset becomes impossible to copy?
- **P3. Habit formation** — what shifts cadence from annual / one-shot to weekly / daily?
- **P4. Community & network effects** — what makes each new user increase the value for all existing users?
- **P5. Expert authority** — what is anchored to the consultant's certification (労働安全コンサルタント 第260022号) or to named professional sign-off that competitors cannot copy?

### 4.1 `/chatbot` — five perspectives

#### P1. Tech differentiation
- **C1-T1. Hybrid retrieval: laws + 通達 + 告示 + 質疑応答集.** Today RAG indexes laws only. Wire `data/mhlw-notices.jsonl` (1,069 通達/告示) and the future 質疑応答集 archive as a *separate* retrieval channel with a typed citation (article / circular / Q&A). Effect: a question like "ボイラー検査の延長申請の要件" gets cited from the 通達, not approximated from the act text. — Implementation risk: medium (deferred per [docs/rag-deferred-improvements-2026-05-13.md](docs/rag-deferred-improvements-2026-05-13.md)). Differentiation strength: high; no public OSH chatbot in Japan cites 通達 by number.
- **C1-T2. Multimodal evidence input.** Accept image uploads of (i) SDS sheets, (ii) equipment nameplates / 銘板, (iii) signage / 標識. The chatbot extracts the substance / 機械等の種別 and grounds the answer in the corresponding 条文 (e.g. 特化則 vs. 有機則 boundary for an organic solvent SDS). — Implementation risk: medium (vision model + structured extraction). Differentiation strength: high; no Japanese OSH chatbot offers SDS-grounded Q&A.
- **C1-T3. Conversation-aware site memory.** When the user generates a plan in `/strategy/plan-generator` or starts a KY in `/ky`, the chatbot in that session can read it (with explicit consent) and answer "我が社の今年度の重点目標に照らして、フォークリフトの定期自主検査の頻度は?" — Implementation risk: medium. Differentiation strength: very high; it is impossible for a stand-alone chatbot (JISHA's or any competitor's) to do this because they don't host the upstream artifacts.

#### P2. Data exclusivity
- **C1-D1. Verified-circular index with stable IDs.** PR #162 ships 1,069 通達/告示 entries. Adding a curated layer with the original PDF URL, ingestion date, MHLW classification, and a hash-stable internal ID gives the chatbot a citation surface no competitor can copy without re-doing the curation. — Differentiation strength: high; this is the consultant's IP.
- **C1-D2. Question/answer log → re-fed corpus.** Every answered question can be reviewed by the consultant and, if signed off, becomes a curated Q&A entry that future queries are retrieved against. This compounds: month 12 corpus is materially better than month 0. — Implementation risk: low–medium. Differentiation strength: very high (the data flywheel is the moat). Privacy: must respect 個人情報 — see §7.

#### P3. Habit formation
- **C1-H1. Weekly digest email.** Subscribe a user; once a week, ship "your three most-asked categories this week + 3 new circulars in those areas + 1 quiz question." Repeat-visit hook. — Implementation risk: low (Resend already in env). Differentiation strength: medium; converts a tool into a relationship.
- **C1-H2. "Save & follow-up" reminders.** If the user asks "石綿の事前調査の期限は?", offer to set a reminder 1 month before that deadline. — Implementation risk: medium (date extraction + reminder scheduler).

#### P4. Community & network effects
- **C1-N1. Public anonymized Q&A archive at `/qa-knowledge`.** When a user submits a question and the consultant signs off on the answer, both are indexed publicly (anonymized) and become SEO/community assets. Existing `/qa-knowledge` route can host this. — Differentiation strength: high (the archive is also a strong long-tail SEO asset; users become authors).
- **C1-N2. "Was this useful?" with expert override.** Thumbs-up/down feeds into the retrieval ranking; the consultant has a moderation override. — Risk: low.

#### P5. Expert authority
- **C1-A1. Named consultant byline on flagship answers.** Top-N high-frequency questions get a "Reviewed by 労働安全コンサルタント 第260022号" stamp. — Differentiation strength: very high; the JISHA chatbot, by virtue of being a generic institutional chatbot, cannot put a single named consultant's reputation on the line. This is impossible to replicate without an equivalent consultant.
- **C1-A2. Disclaimer hierarchy.** Three tiers: (i) AI auto-generated, (ii) AI + consultant-reviewed, (iii) consultant-authored. Each tier gets a different visual tag and a different liability statement.

### 4.2 `/accidents-reports` — five perspectives

#### P1. Tech differentiation
- **C2-T1. Similarity search ("我が社の作業に似た過去事例").** User types "建設現場でクレーンで吊った鉄骨を地上で誘導" → vector retrieval over the 5,000+ case base returns the most similar 5 cases with similarity score. — Implementation risk: medium (embeddings already used for RAG). Differentiation strength: very high; no Japanese authority site offers this.
- **C2-T2. Auto-generated narrative per industry, refreshed monthly.** Today the narrative is a template merged with data. Replace the static commentary with an LLM-generated commentary (e.g. 200 words per industry) that explains *why* the Top-3 patterns matter this quarter. Cache stable, regenerate on dataset refresh. — Differentiation strength: high; this turns the report from a data dump into a readable article.
- **C2-T3. Geographic + season-of-year cross-cut.** Heatmap of 死亡事故 by prefecture × month, filterable by industry. — Differentiation strength: medium (US OSHA has the geo cut; nobody has it Japan-side at this depth).

#### P2. Data exclusivity
- **C2-D1. User-contributed anonymized incident submissions.** A form for users to submit ヒヤリハット and minor incidents (anonymized). Curated, fed into the corpus. After ≥1,000 submissions across industries, the dataset is structurally bigger than anzeninfo's because anzeninfo only records 休業4日以上. — Differentiation strength: very high; competitors cannot match this without the same UGC funnel. Privacy + legal review required (consent, anonymization).
- **C2-D2. Editorial expansion to additional industries.** Today: 5. Target: 12 (add 林業, 港湾, 倉庫業, 化学工業, 鉱業, 電気業, 警備業). The labor-disaster-prevention organizations cover this in PDF; we are missing surfaces. — Risk: low–medium (template-friendly). Differentiation strength: high (combined with auto-narrative).
- **C2-D3. Time-cohort pages.** "Last 12 months / last 5 years / last 10 years" toggles so the report reads as a living trend rather than a snapshot. — Risk: low.

#### P3. Habit formation
- **C2-H1. "Industry alert" subscription.** Per industry, opt in for an email when (i) a new fatal accident is added, (ii) a new pattern emerges (ML-driven). Owner of a 建設業 site receives an alert within hours of a similar fatal accident hitting the database. — Differentiation strength: very high (this is a real-world OSH need that no Japanese site solves).
- **C2-H2. Monthly industry briefing email.** 5-bullet summary of the past month's accidents in the user's industry, generated automatically. — Risk: low.

#### P4. Community & network effects
- **C2-N1. Discussion threads on individual case records.** Anonymized commenting ("我が社では別の対策を取った"). Light moderation. — Differentiation strength: medium–high (creates UGC SEO and increases time-on-page).
- **C2-N2. Voting on "most relevant controls".** Each case lists candidate 推奨対策; users vote on which they implemented. After enough votes, the report can rank controls by adoption rate. — Differentiation strength: medium; structural moat against an isolated content site.

#### P5. Expert authority
- **C2-A1. Named consultant commentary on the top 10 cases per industry.** A short paragraph by the consultant per top case, explaining (i) what's distinctive, (ii) what's typically missed in 再発防止. — Differentiation strength: very high; institutional PDFs from 中災防 / 建災防 don't bind to a single named expert at the case level.
- **C2-A2. "Independent review" badge per report.** Each per-industry report carries a "reviewed and signed off by 労働安全コンサルタント 第260022号 on YYYY-MM-DD" stamp, refreshed on dataset update. — Differentiation strength: very high; competitors must staff a comparable consultant network to match this.

### 4.3 `/strategy/plan-generator` — five perspectives

#### P1. Tech differentiation
- **C3-T1. Prior-year incident ingestion.** User uploads (or pastes) last year's incident log (CSV or text). The generator weights 重点目標 / 実施事項 toward the actual incident types observed. — Differentiation strength: very high; no labor-bureau Excel does this. Implementation risk: medium (privacy considerations).
- **C3-T2. Chemical inventory ingestion.** User pastes (or links via `/chemical-database`) the substances on site → generator routes the plan to the correct 化学物質RA cadence, SDS check schedule, 健診 frequency. — Differentiation strength: high (only an integrated portal can do this).
- **C3-T3. AI commentary section per goal.** Each 重点目標 gets a 100-word "なぜこの目標が重要か" generated paragraph, citing 通達 numbers. — Differentiation strength: medium (this *looks* like consulting deliverable polish).

#### P2. Data exclusivity
- **C3-D1. Anonymized aggregate "what other 建設業 ≥50名 companies set as goals" benchmarks.** Once we have ≥50 plans generated and ≥20% opt-in for anonymized benchmark, surface "70% of similar-sized 建設業 prioritized 墜落・転落 last year." — Differentiation strength: very high (network effect data; competitors must wait for their own funnel).
- **C3-D2. Annual 建災防 実施事項 + MHLW labor-bureau template ingestion.** Track each year's official 実施事項 (kensaibou.or.jp/public_relations/enforcement_plan) and the labor-bureau Excel revisions. Bake the current year's official guidance into the generator output. — Differentiation strength: high (positions the generator as *more current than the bureaus' own static Excel*).

#### P3. Habit formation — **highest leverage for this feature**
- **C3-H1. Monthly check-in: "Are you on track for this month's items?"** A reminder email shipped on the first of each month, listing the items the plan scheduled for that month, with one-click "done / delayed / N/A." Result: the user touches the plan **12 times a year, not once.** — Differentiation strength: very high; this is the single fix to the annual-cadence problem.
- **C3-H2. Plan vs. actual ledger.** End of fiscal year, the system surfaces the user's check-in trail as "% of items completed on schedule." Feeds back into next year's generation. — Differentiation strength: high.
- **C3-H3. "Plan update" trigger on major events.** When a new 通達 lands in the user's industry, or a fatal accident matches the user's industry/scale pattern, prompt: "your plan was generated 4 months ago — do you want a delta update on item 7?" — Risk: medium.

#### P4. Community & network effects
- **C3-N1. Committee review workflow.** The plan supports multi-user comments before finalization (read-only invite by email link, no account required). The 安全衛生委員会 review meeting becomes an in-product event, not a sidetrack to Word + email. — Differentiation strength: very high; competing free Excel templates cannot offer this without becoming SaaS.
- **C3-N2. "Adapt from a similar company" template gallery.** Anonymized plans (opt-in) become public templates ranked by industry × scale × completion-rate. — Differentiation strength: high (network-effect data).

#### P5. Expert authority
- **C3-A1. Optional paid consultant review.** Owner reviews the generated draft for a fee (e.g. ¥30k–¥80k) before the committee meeting. Lead-gen direct from product → consulting practice. — Differentiation strength: very high; this is the consulting business model embedded in the SaaS surface.
- **C3-A2. Per-template consultant byline.** Each industry/scale template footnote lists "designed and maintained by 労働安全コンサルタント 第260022号" and a version+date. Refresh quarterly. — Differentiation strength: very high.

---

## 5. Phase D — Integrated evolution proposal per feature

Synthesis of §4 into a single forward design per feature. Each subsection lists the **selected** value-adds (subset of §4 candidates), names a single positioning statement, and notes the 5-year defensibility.

### 5.1 `/chatbot` — evolved design

**Positioning statement.** *"The only Japanese OSH chatbot whose answers cite 通達 and 告示 by number, accept SDS / 銘板 image input, and carry named-consultant sign-off on the most-asked questions."*

**Selected value-adds (subset of §4.1):**
1. **C1-T1** — Hybrid retrieval over 安衛法 + 安衛則 + **通達/告示 1,069 entries** + curated Q&A. Inline typed citations.
2. **C1-T2** — Multimodal: SDS image upload → substance extraction → 特化則 / 有機則 routing. (Phase 1: SDS only. Phase 2: equipment nameplates.)
3. **C1-D2** — Consultant-reviewed Q&A flywheel: every answered question can be promoted to a curated entry with a typed citation, re-fed into retrieval.
4. **C1-A1** — Named consultant byline on the top-50 highest-frequency answers.
5. **C1-T3** — Cross-feature memory (read user's plan / KY in same session).

**Deferred / rejected for now:**
- C1-H1 weekly digest (do it after subscription infra is shared with `/accidents-reports`).
- C1-H2 deadline reminders (medium complexity, payoff smaller than C1-T1/T2).
- C1-N1 public Q&A archive — *strongly recommended* but contingent on privacy / IP review.

**5-year sustainability check:**
- The JISHA chatbot, even if it grows to full-law Q&A, is institutional — it cannot bind to a single named consultant (C1-A1) and is unlikely to ingest user-side artifacts (C1-T3). Both are structural moats.
- The 通達 + 告示 corpus is curated IP; replicating it requires re-doing the curation. The Q&A flywheel deepens this moat over time.
- Multimodal SDS input is technically replicable in 18 months; that is fine — it is a 2-year time-advantage, not a 5-year one, and §5.4 below shows why it does not need to carry the moat alone.

### 5.2 `/accidents-reports` — evolved design

**Positioning statement.** *"The first Japanese accident-analytics surface that combines anzeninfo-grade data, similarity search, named-consultant commentary, and a real-time industry alert subscription — refreshed daily."*

**Selected value-adds (subset of §4.2):**
1. **C2-T1** — Similarity search by free-text work description.
2. **C2-T2** — Auto-generated narrative per industry per quarter, refreshed on dataset update.
3. **C2-D2** — Industry expansion from 5 to 12 (add 林業, 港湾, 倉庫, 化学, 鉱業, 電気, 警備).
4. **C2-H1** — Industry alert subscription (new fatal accident match → email).
5. **C2-A1 + C2-A2** — Named consultant commentary on top-10 cases per industry; "independent review" badge on each report.

**Deferred / rejected for now:**
- C2-D1 user-contributed UGC submissions — *high upside but* requires privacy framework, content moderation, and legal review. Park to P1/P2.
- C2-N1 discussion threads / C2-N2 voting — UGC infrastructure; same parking lot.

**5-year sustainability check:**
- Similarity search and per-industry narrative are technically replicable but the dataset + the named consultant commentary together create a compound moat.
- Industry alerts are a habit-forming surface that re-converts the visitor monthly.
- If a competitor builds (c)+(d) by 2027, our (a)+(b)+(c)+(d) + expert + alerts stack still wins.

### 5.3 `/strategy/plan-generator` — evolved design

**Positioning statement.** *"The only Japanese annual safety plan generator that ingests last year's incidents, refreshes monthly with check-in nudges, and routes you to a real labor-safety consultant for a paid sign-off."*

This is the feature with the most upside because every competitor is at the (a)+(b) Excel layer or paid consulting layer. (c)+(d) is empty; we are alone. The work to do is to (i) close the cadence gap and (ii) wire in the consulting upsell.

**Selected value-adds (subset of §4.3):**
1. **C3-H1** — Monthly check-in email + in-product status: turns annual → monthly cadence.
2. **C3-T1** — Prior-year incident ingestion: incident log → weighted 重点目標.
3. **C3-D2** — Annual 建災防 実施事項 + MHLW labor-bureau ingest pipeline.
4. **C3-A1** — Paid optional consultant review (lead-gen funnel for the consulting practice).
5. **C3-N1** — Committee review workflow (multi-user comments without account creation).

**Deferred / rejected for now:**
- C3-T2 chemical inventory routing — high payoff; depends on `/chemical-database` data quality. Park to P1.
- C3-D1 benchmark aggregation — depends on user-funnel maturity. Park to P1.
- C3-N2 template gallery — depends on user opt-in volume. Park to P2.

**5-year sustainability check:**
- Cadence (C3-H1) is the single structural fix that turns a one-shot tool into a relationship. Once a user has a 12-month monthly-touch history with the plan, switching cost is high.
- Owner's consultant practice (C3-A1) becomes the brand anchor that no competitor can replicate without an equivalent consultant.
- The C3-D2 ingest pipeline keeps the generator *more current* than the labor-bureau Excels (which update annually with a 2–3 month lag).

### 5.4 Cross-feature compounding

The three evolved features reinforce each other:

- A user starts at `/chatbot` (asks a question) → discovers `/accidents-reports` (sees the case behind the question) → discovers `/strategy/plan-generator` (builds their plan informed by both).
- A monthly check-in (`C3-H1`) re-engages the same user with the chatbot ("ask why item 4 is on this month's list?") and the reports ("see industry trend last month").
- Named-consultant sign-off (C1-A1 / C2-A1 / C3-A2) is the *single* moat across all three; it cannot be replicated by any institutional competitor without licensing the consultant, and a consulting practice is not a license-able asset.
- User data — questions asked, plans generated, alerts subscribed — compounds into retrieval quality, narrative quality, and benchmark quality over 12+ months.

This compounding is the load-bearing argument for the "3 main features" structure: each one alone is a useful tool; the three together are the moat.

---

## 6. Phase E — Prioritization (P0 / P1 / P2)

Items are listed by feature, with **(effort × impact)** as a 1–5 scale, **(differentiation strength)** as Low / Med / High / Very High, and a target shipping window. Effort is engineering-hours-or-equivalent; impact is owner judgment.

### 6.1 P0 — ship within 3 months

| ID       | Feature                    | Value-add                                                         | Effort | Impact | Diff.     | Why P0                                                                                                  |
|----------|-----------------------------|-------------------------------------------------------------------|:------:|:------:|-----------|----------------------------------------------------------------------------------------------------------|
| P0-1     | `/chatbot`                  | C1-T1 — Hybrid retrieval over 通達/告示 1,069 entries              | 3      | 5      | High      | Closes the most visible RAG gap; the 通達 corpus already exists in repo, only retrieval wiring missing.   |
| P0-2     | `/chatbot`                  | C1-A1 — Named consultant byline on top-50 high-frequency answers   | 2      | 4      | Very High | Cheapest moat per unit work; only the owner can grant this.                                              |
| P0-3     | `/accidents-reports`        | C2-T2 — Auto-generated narrative per industry per quarter          | 3      | 4      | High      | Turns report from data dump into article; SEO + UX gain.                                                  |
| P0-4     | `/accidents-reports`        | C2-A1 + C2-A2 — Consultant commentary on top-10 cases + report-level badge | 3 | 5      | Very High | Same expert-authority moat as P0-2, applied to the analytics surface.                                    |
| P0-5     | `/strategy/plan-generator`  | C3-H1 — Monthly check-in email + in-product status                 | 4      | 5      | Very High | The single fix to the annual-cadence problem; this is the most important P0.                            |
| P0-6     | `/strategy/plan-generator`  | C3-A1 — Paid optional consultant review (sign-off + invoice flow)   | 3      | 5      | Very High | Direct revenue + lead-gen for the consulting practice; no other competitor can match.                    |
| P0-7     | cross-cutting               | C1-A1 / C2-A1 / C3-A2 visual & legal framework for consultant sign-off | 2 | 4      | Very High | The "stamp" needs a uniform design language across the three features; do it once.                       |

**P0 owner deliverables (depend on owner, not engineering):**
- Confirm JISHA's 2026-04-01 chatbot scope (does it answer full-law Q&A, or is it site-FAQ?). Until confirmed, do not publish "no competitor offers OSH AI Q&A" marketing.
- Curate the top-50 highest-frequency chatbot questions (the byline list for P0-2).
- Write the 5 × 10 = 50 case commentaries for the 5 current industry reports (P0-4).
- Approve the visual + legal framework for the consultant sign-off stamp (P0-7).

### 6.2 P1 — ship within 6 months

| ID       | Feature                    | Value-add                                                         | Effort | Impact | Diff.     | Why P1                                                                                                  |
|----------|-----------------------------|-------------------------------------------------------------------|:------:|:------:|-----------|----------------------------------------------------------------------------------------------------------|
| P1-1     | `/chatbot`                  | C1-T2 — Multimodal SDS upload + 特化則 / 有機則 routing            | 5      | 4      | High      | Vision pipeline + structured extraction; high engineering complexity.                                    |
| P1-2     | `/chatbot`                  | C1-D2 — Consultant-reviewed Q&A flywheel                            | 3      | 4      | Very High | Moderation UI + retrieval index pipeline; depends on volume.                                             |
| P1-3     | `/chatbot`                  | C1-T3 — Cross-feature memory (read plan / KY in same session)       | 4      | 4      | Very High | Requires authenticated session + consent flow.                                                            |
| P1-4     | `/accidents-reports`        | C2-T1 — Similarity search by free-text work description             | 4      | 4      | Very High | Embeddings exist; needs work-description-aware query path.                                               |
| P1-5     | `/accidents-reports`        | C2-D2 — Industry expansion 5 → 12                                   | 4      | 3      | High      | Pure editorial + template extension; can run in parallel.                                                |
| P1-6     | `/accidents-reports`        | C2-H1 — Industry alert subscription                                 | 4      | 4      | Very High | Email subscription infra + matching rules; reuse from P0-5.                                              |
| P1-7     | `/strategy/plan-generator`  | C3-T1 — Prior-year incident ingestion                               | 4      | 4      | Very High | CSV parser + safe ingest + classification; privacy review.                                               |
| P1-8     | `/strategy/plan-generator`  | C3-D2 — 建災防 + MHLW labor-bureau annual ingest                    | 3      | 3      | High      | Pipeline + freshness monitor.                                                                            |
| P1-9     | `/strategy/plan-generator`  | C3-N1 — Committee review workflow (anonymous link comments)         | 5      | 4      | Very High | Multi-user collaboration without accounts; needs share-token design.                                     |

### 6.3 P2 — explore within 12 months

| ID       | Feature                    | Value-add                                                         | Notes |
|----------|-----------------------------|-------------------------------------------------------------------|-------|
| P2-1     | `/chatbot`                  | C1-H1 weekly digest + C1-H2 deadline reminders                     | After subscription infra matures; reuse with `/accidents-reports` alerts. |
| P2-2     | `/chatbot`                  | C1-N1 — public anonymized Q&A archive in `/qa-knowledge`           | Privacy / IP review required. SEO upside large. |
| P2-3     | `/accidents-reports`        | C2-D1 — user-contributed anonymized incident submissions           | UGC + moderation + legal. The single biggest data moat if executed; the single biggest legal liability if not. |
| P2-4     | `/accidents-reports`        | C2-T3 — Geographic + month heatmap                                 | Polish surface; SEO. |
| P2-5     | `/accidents-reports`        | C2-N1 + C2-N2 — case-record discussion + control-adoption voting    | After P2-3. |
| P2-6     | `/strategy/plan-generator`  | C3-T2 — chemical inventory routing                                  | Depends on `/chemical-database` data quality maturity. |
| P2-7     | `/strategy/plan-generator`  | C3-D1 — anonymized benchmark aggregation                            | Depends on funnel volume ≥ 200 plans. |
| P2-8     | `/strategy/plan-generator`  | C3-T3 — AI commentary per 重点目標                                  | Polish; high cost-per-token at scale, evaluate. |
| P2-9     | `/strategy/plan-generator`  | C3-N2 — anonymized template gallery                                  | Network-effect surface; opt-in required. |
| P2-10    | `/strategy/plan-generator`  | C3-H3 — plan-update prompts on regulatory or accident events         | High-touch retention. |

### 6.4 Cross-cutting infrastructure that unlocks multiple P0/P1 items

- **Email subscription + reminder scheduler.** Used by P0-5, P1-6, and P2-1. Build once.
- **Authenticated session + consent flow.** Used by P0-5, P1-3, P1-7, P3-1 (consulting upsell). Build once.
- **Consultant sign-off CMS (a lightweight editor for the consultant to bless answers, commentary, templates).** Used by P0-2, P0-4, P0-7, P1-2. Build once.
- **Citation type system (article / 通達 / 告示 / Q&A / case-id).** Used by P0-1, P1-1, P1-2, P1-3. Type-safe across surfaces.

These four pieces of infrastructure are the *real* engineering investment behind the proposal. Approving the P0 list approves these by implication.

---

## 7. Risk register

### 7.1 JISHA chatbot scope uncertainty
- A JISHA chatbot launched 2026-04-01 (verified). The scope is **not publicly verifiable** — the dedicated page returns 404; the news post is brief. **Action:** owner contacts JISHA (or uses the chatbot once in production) to confirm whether it does (a) site-FAQ only, (b) general OSH FAQ, or (c) full 安衛法 Q&A. Decision tree:
  - (a) or (b) → publish "the only Japanese OSH chatbot citing 通達 by number" — proceed as designed.
  - (c) → reposition to "the only Japanese OSH chatbot citing 通達 with named-consultant sign-off, multimodal evidence input" — same product, sharper claim.

### 7.2 UGC and privacy
- C2-D1 (user-contributed incidents) and C3-T1 (prior-year incident ingestion) both touch sensitive content. **Action before any P0 launch:** privacy policy section explicitly covering (i) consent for incident contribution, (ii) anonymization standard (employer name removed, date generalized to month, location to prefecture), (iii) data retention. Coordinate with `/terms` and `/privacy`.

### 7.3 Liability on consultant sign-off
- C1-A1, C2-A1, C3-A2 attach the owner's consultant number to specific answers and analyses. **Action:** explicit disclaimer hierarchy (tier 1 AI auto / tier 2 reviewed / tier 3 authored) per C1-A2. Coordinate with legal review.

### 7.4 Cost of LLM at scale
- Auto-narrative per industry per quarter (C2-T2) and multimodal SDS extraction (C1-T2) are token-heavy. Budget: estimate token spend per industry-quarter and cap.

### 7.5 Hallucination on 通達 citations
- Misciting a 通達 number is worse than no citation. **Action:** retrieval-only citation policy — the chatbot may not generate a 通達 number that is not present in the retrieved chunks. Unit test enforced in [web/src/lib/rag-100q.test.ts](web/src/lib/rag-100q.test.ts) extended to 通達.

---

## 8. Open questions for the owner

1. Approve the P0 list (§6.1) or amend?
2. Owner is willing to write the top-50 chatbot commentary + 5 × 10 = 50 accident-report case commentaries within 3 months?
3. Acceptable price band for the paid consultant review of generated plans (C3-A1 / P0-6)? Suggested band ¥30k–¥80k for the design draft.
4. Acceptable to begin collecting opt-in email subscribers (P0-5) without paid-mode infrastructure, on the existing Resend account?
5. Confirm JISHA chatbot scope (§7.1) within the next 2 weeks?
6. Greenlight the four cross-cutting infrastructure pieces (§6.4) in advance of feature-level P0 work?

---

## Appendix A — sources consulted

### A.1 Japanese authority sites
- 中央労働災害防止協会 (chatbot announced 2026-04-01): https://www.jisha.or.jp/
- 中災防 分析データ index: https://www.jaish.gr.jp/anzen/sai/bunsekidata/bunsekidata_index.html
- 中災防 自社サイト分析データ: https://www.jisha.or.jp/info/bunsekidata/index.html
- 厚労省 職場のあんぜんサイト: https://anzeninfo.mhlw.go.jp/
- 厚労省 労働災害原因要素の分析: https://anzeninfo.mhlw.go.jp/user/anzen/tok/bnsk00.html
- 厚労省 労働基準監督署 chatbot: https://www.mhlw.go.jp/stf/roudoukijyunkantokusyo-chatbot.html
- 建設業労働災害防止協会 統計: https://www.kensaibou.or.jp/safe_tech/statistics/index.html
- 建災防 ICT/AI database: https://www.kensaibou.or.jp/safe_tech/ict/use/ict/ai/index.html
- 建災防 年度実施事項: https://www.kensaibou.or.jp/public_relations/enforcement_plan/index.html
- 林災防 災害統計: https://www.rinsaibou.or.jp/disaster/toukei.html
- 陸災防 発生状況: https://rikusai.or.jp/occurrence_situation/
- 港湾労災防 災害データ検索: https://kouwansaibou.or.jp/search.html
- 労働安全衛生総合研究所 (JNIOSH) Power BI prototype: https://www.jniosh.johas.go.jp/publication/mail_mag/2024/186-column-1.html
- e-Gov 法令検索: https://laws.e-gov.go.jp/

### A.2 Free annual-plan Excel templates (Japanese)
- 長野労働局: https://jsite.mhlw.go.jp/nagano-roudoukyoku/hourei_seido_tetsuzuki/anzen_eisei/anzeneisei_nenkankeikakusyo.html
- 愛媛労働局: https://jsite.mhlw.go.jp/ehime-roudoukyoku/hourei_seido_tetsuzuki/anzen_eisei/anzen_eisei_yousikikankei.html
- 青森労働局: https://jsite.mhlw.go.jp/aomori-roudoukyoku/hourei_seido_tetsuzuki/anzen_eisei/hourei_seido/roudoukijun_kenkoanzen_00004.html
- 佐賀労働局: https://jsite.mhlw.go.jp/saga-roudoukyoku/jirei_toukei/anzen_eisei/_119925.html
- 石川労働局: https://jsite.mhlw.go.jp/ishikawa-roudoukyoku/newpage_00405.html
- 安全衛生マネジメント協会: https://www.aemk.or.jp/plan_sheet01.html
- 安全衛生マネジメント協会 resources: https://www.aemk.or.jp/resources.html

### A.3 Global comparators
- US OSHA: https://www.osha.gov/
- US OSHA Severe Injury Reports: https://www.osha.gov/severe-injury-reports
- EU-OSHA: https://osha.europa.eu/
- EU-OSHA OSH Barometer: https://visualisation.osha.europa.eu/
- EU-OSHA OiRA (online risk assessment): https://oiraproject.eu/
- HSENation OSHA chatbot (US, third-party): https://hsenation.com/ai-tool/osha-regulations-chatbot/
- viAct OSHA compliance chatbot (US, third-party): https://www.viact.net/ai-agents/osha-compliance-chatbot
- HSI Sky AI safety assistant (US, third-party): https://hsi.com/blog/ask-sky-safety-question-ai-safety-assistant
- OSHA Ask (US, third-party): https://www.oshaask.com/
- L is B × 矢作建設工業 construction-site chatbot (JP, scope ≠ OSH-law Q&A): https://built.itmedia.co.jp/bt/articles/2601/19/news113.html

### A.4 In-repo source pointers
- Chatbot UI + API: [web/src/app/(main)/chatbot/page.tsx](web/src/app/(main)/chatbot/page.tsx), [web/src/app/api/chatbot/route.ts](web/src/app/api/chatbot/route.ts), [web/src/components/chatbot-panel.tsx](web/src/components/chatbot-panel.tsx).
- Chatbot eval: [web/scripts/chatbot-eval.ts](web/scripts/chatbot-eval.ts), [web/src/app/(main)/about/chatbot-eval/page.tsx](web/src/app/(main)/about/chatbot-eval/page.tsx).
- RAG tests: [web/src/lib/rag-100q.test.ts](web/src/lib/rag-100q.test.ts), [web/src/lib/rag-article-number.test.ts](web/src/lib/rag-article-number.test.ts).
- RAG deferred items: [docs/rag-deferred-improvements-2026-05-13.md](docs/rag-deferred-improvements-2026-05-13.md).
- Accident reports: [web/src/app/(main)/accidents-reports/page.tsx](web/src/app/(main)/accidents-reports/page.tsx), [web/src/app/(main)/accidents-reports/[industry]/page.tsx](web/src/app/(main)/accidents-reports/[industry]/page.tsx), [web/src/components/accidents-reports/industry-report-view.tsx](web/src/components/accidents-reports/industry-report-view.tsx), [web/src/lib/accident-analysis.ts](web/src/lib/accident-analysis.ts).
- Plan generator: [web/src/app/(main)/strategy/plan-generator/page.tsx](web/src/app/(main)/strategy/plan-generator/page.tsx), [web/src/components/safety-plan/plan-generator-form.tsx](web/src/components/safety-plan/plan-generator-form.tsx), [web/src/data/safety-plan-templates/](web/src/data/safety-plan-templates/).
- Circulars / 通達 dataset: [data/mhlw-notices.jsonl](data/mhlw-notices.jsonl), [web/src/data/mhlw-notices.ts](web/src/data/mhlw-notices.ts).
- News-feed pipeline: [web/src/data/news-feed/](web/src/data/news-feed/), [.github/workflows/news-feed-daily.yml](.github/workflows/news-feed-daily.yml).

### A.5 Methodology limits
- All competitor findings are from a 2026-05 sweep of publicly reachable pages. Where a page could not be loaded or the scope was ambiguous, the finding is annotated "not verified" — decisions in §6 do not depend on unverified findings.
- The five perspectives in §4 are simulated by a single model. The owner should treat the value-add catalog as a structured brainstorm, not a multi-stakeholder vote. Final P0 selection in §6 narrows on owner-judgment terms (impact, effort, moat strength).
- No A/B / engagement data underpins the moat-depth claims; they rest on competitive structure (who exists, who could replicate, who has the consultant). Owner should validate by running the P0 batch and measuring (i) chatbot retention, (ii) accident-report alert subscribers, (iii) plan check-in rate at month 3.

---

**End of draft. Awaiting owner decision on §6.1 and §8 before any implementation work begins.**

---

## 9. Post-draft updates (2026-05-17)

### 9.1 Relevant PRs merged since this document was written

The following PRs shipped after this strategy document was authored and are relevant to the main-3 roadmap:

| PR | What shipped | Roadmap relevance |
|----|-------------|-------------------|
| #223 feat(resilience) | Circuit breakers + fallbacks for `/api/chatbot`; degraded-mode RAG reply when Gemini quota exhausted | Reduces P0-1 / P0-2 blast radius (chatbot stays responsive during quota incidents) |
| #226 feat(accidents-reports) | `/accidents-reports/compare` — 2-5 industry side-by-side comparison with differential highlights, 10 panels, recharts overlay | Aligns with P1-5 spirit (cross-industry analytical surface); not a full P1-5 (industries still 5, not expanded to 12) |
| #228 feat(resilience) | Phase-2 fallbacks across 9 more routes | Further resilience for chatbot + plan-generator adjacent routes |

### 9.2 §8 open questions — status

| Q# | Question | Status |
|----|----------|--------|
| Q1 | Approve P0 list (§6.1)? | Open — no explicit owner approval recorded. Main-3 confirmed per #173/PR #176 commission, but P0 implementation details still pending owner action. |
| Q2 | Owner willing to write 50 consultant commentaries within 3 months? | Open |
| Q3 | Acceptable price band for consultant review (¥30k–¥80k)? | Open |
| Q4 | Begin email subscribers without paid-mode (P0-5)? | Open — paid-mode infrastructure not yet activated (`NEXT_PUBLIC_PAID_MODE=false`) |
| Q5 | Confirm JISHA chatbot scope within 2 weeks? | Open — 2-week window from 2026-05-15 = 2026-05-29. No confirmation recorded. |
| Q6 | Greenlight 4 cross-cutting infra pieces (§6.4)? | Open |

### 9.3 P0 implementation status (as of 2026-05-17)

None of the P0 items (P0-1 through P0-7) have shipped. The `docs/rag-deferred-improvements-2026-05-13.md` still lists 通達 retrieval wiring as deferred (P0-1 precondition).

Next recommended dispatch: P0-1 (通達/告示 hybrid retrieval wiring into chatbot) — all corpus data already in-repo, only the retrieval path needs wiring.
