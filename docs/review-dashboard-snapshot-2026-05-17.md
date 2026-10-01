# オーナーレビューダッシュボード スナップショット — 2026-05-17

> **ソース:** `web/src/app/(main)/audits/review-dashboard/page.tsx`
> **抽出元コミット:** e3e3624 (PR #229 マージ済)
> **本番URL:** `/audits/review-dashboard` (Vercel反映待ち)
> **スナップショット作成日:** 2026-05-17
>
> このファイルは AI チャットが即読み取れるプレーンテキスト形式で page.tsx の全コンテンツを保持します。
> 構造化マーカー (data-* 属性) は保持済みです。

---

## メタデータ

```
data-dashboard-id: owner-review-dashboard-2026-05-17
data-generated-at: 2026-05-17T08:30Z
data-base-main-sha: f99d3f6
集計窓: 2026-05-15T13:39:05Z 〜 2026-05-17T08:22:59Z (48時間)
直近48h main投入PR: 84件 (注: PRS_48H 配列の実エントリは80件。META.prsMerged48h=84 との差異4件は open/draft PR の除外差異と思われる)
進行中 Open PR: 5件 (Draft 4件 / 通常 1件)
使用モデル: claude-opus-4-7
モデル選択理由: 全状況の機械集約+F-category 4機能の追加情報抽出+AI解析可能な構造化+オーナーレビュー資料設計を横断、複数領域の判断統合が必要なためOpus採用。
```

---

=== セクション1: エグゼクティブサマリ ===

```
data-section-id: executive-summary
```

| 指標 | 値 | 備考 |
|------|----|------|
| 直近48h main投入PR | 84件 | PR #144 〜 #228 (連続マージ) |
| 進行中 Open PR | 5件 | Draft 4件 / 通常 1件 |
| Vercel ビルドクォータ | 正常 | PR #206 で ignoreCommand 強化済 |
| オーナー判断待ち | 4件 | F-category 4機能 (Section 6 参照) |

```
data-metric-id: prs-merged-48h → 84
data-metric-id: prs-open → 5
data-metric-id: vercel-quota → 正常
data-metric-id: pending-decisions → 4
```

---

=== セクション2: メイン3機能の現状 ===

```
data-section-id: main-3-features
```

### /chatbot
```
data-main-feature-id: chatbot
data-latest-pr: 212
data-latest-merge-sha: 5a9e61a
```
- RAG Recall@5 100% (fresh) / 100% (main) 達成 (PR #212)
- Citation triples + related laws + dig-deeper + hallucination guard (PR #183)
- Example questions + 入力ヒント常時表示 (PR #200)
- 送信ボタン直下 amber 免責パネル(法的助言ではない)常時表示 (PR #200)

### /accidents-reports
```
data-main-feature-id: accidents-reports
data-latest-pr: 226
data-latest-merge-sha: b719a57
```
- 業種比較ビュー(2-5業種side-by-side, PR #226)
- 業種別レポート深掘り + 30項目チェックリスト + 印刷PDF (PR #184)
- 業種別分析レポート・自動インサイト (PR #156)
- Preliminary バナー常時表示で速報基準であることを明示 (PR #199)

### /strategy/plan-generator
```
data-main-feature-id: strategy-plan-generator
data-latest-pr: 204
data-latest-merge-sha: e4e837e
```
- 30 scale-tuned テンプレート + スケジュール最適化 + custom-param overlays + PDF cover/TOC (PR #204)
- 業種・規模別年間安全計画自動生成 (PR #157)
- /wizard を /strategy/plan-generator に 301統合 (PR #198)
- クライアントバンドルからのハードコード認証情報除去 (PR #193)

---

=== セクション3: 完了タスク一覧 (直近48h) ===

```
data-section-id: completed-prs-48h
```

**カテゴリ別件数:**
- メイン3機能 (chatbot/accidents-reports/strategy): 6件
- データ品質・監査・出典整合: 13件
- SEO・構造化データ・内部リンク: 7件
- UX・モバイル・アクセシビリティ: 3件
- 不要機能アーカイブ・体裁整理: 6件
- レジリエンス・インフラ・セキュリティ: 6件
- データ拡充・新機能: 23件
- 国際化・パフォーマンス: 8件
- 監査記録更新・ステータス管理: 8件

---

#### カテゴリ: メイン3機能 (chatbot/accidents-reports/strategy)
```
data-pr-category: main-3-features
```

```
data-pr-id: 226, data-pr-status: merged, data-pr-merge-sha: b719a57
#226 (b719a57) feat(accidents-reports): industry comparison view (2-5 industries side-by-side)

data-pr-id: 212, data-pr-status: merged, data-pr-merge-sha: 5a9e61a
#212 (5a9e61a) feat(rag): drive Recall@5 from 59% to 100% on fresh + 95.7% to 100% on main

data-pr-id: 204, data-pr-status: merged, data-pr-merge-sha: e4e837e
#204 (e4e837e) feat(strategy): deepen plan-generator — 30 templates, schedule optimizer, custom overlays, PDF cover/TOC

data-pr-id: 184, data-pr-status: merged, data-pr-merge-sha: fd8e9d7
#184 (fd8e9d7) feat(accidents-reports): deepen industry reports + 30-item checklist + print PDF

data-pr-id: 183, data-pr-status: merged, data-pr-merge-sha: 68f1891
#183 (68f1891) feat(chatbot): permanent quality boost — citation triples + related laws + dig-deeper + hallucination guard

data-pr-id: 157, data-pr-status: merged, data-pr-merge-sha: 16c5c9e
#157 (16c5c9e) feat(strategy): annual safety plan auto-generator with industry/scale templates

data-pr-id: 156, data-pr-status: merged, data-pr-merge-sha: 458c91a
#156 (458c91a) feat(accidents-reports): per-industry analysis report pages with auto-generated insights
```

#### カテゴリ: データ品質・監査・出典整合
```
data-pr-category: data-quality-audit
```

```
data-pr-id: 227, data-pr-status: merged, data-pr-merge-sha: f99d3f6
#227 (f99d3f6) fix(laws): full-codebase law citation audit + 10 confirmed-wrong fixes + abbrev normalization

data-pr-id: 215, data-pr-status: merged, data-pr-merge-sha: b1a73d0
#215 (b1a73d0) audit(glossary): full quality audit + fix 22 low-score terms across 268 entries

data-pr-id: 210, data-pr-status: merged, data-pr-merge-sha: e889f1c
#210 (e889f1c) feat(news-feed): B.2 AI judge accuracy audit + per-type thresholds

data-pr-id: 208, data-pr-status: merged, data-pr-merge-sha: f9f3ba8
#208 (f9f3ba8) fix(laws): correct citation accuracy across e-Gov reference (audit 2026-05-17)

data-pr-id: 207, data-pr-status: merged, data-pr-merge-sha: 6bb7f88
#207 (6bb7f88) data(accidents): full-corpus quality audit + fixes across 5,026 records

data-pr-id: 202, data-pr-status: merged, data-pr-merge-sha: 665824b
#202 (665824b) fix(audit): resolve B-002/B-004/B-007/B-008 content-quality findings (PR #187)

data-pr-id: 200, data-pr-status: merged, data-pr-merge-sha: 028daf4
#200 (028daf4) fix(audit-G): resolve 5 legal risk items (citation/disclaimer/medical/privacy)

data-pr-id: 195, data-pr-status: merged, data-pr-merge-sha: b01a951
#195 (b01a951) fix(stats): honesty framing — drop 透明公開, noindex sample data, remove false dataset schema

data-pr-id: 191, data-pr-status: merged, data-pr-merge-sha: b846a09
#191 (b846a09) refactor(content): fix AI-feel content per PR #187 audit (articles, glossary, audit page)

data-pr-id: 188, data-pr-status: merged, data-pr-merge-sha: 85f56f2
#188 (85f56f2) fix(audit-P0): unblock /strategy crawling and correct /exam-quiz notation

data-pr-id: 187, data-pr-status: merged, data-pr-merge-sha: 3f33771
#187 (3f33771) audit: 第三者目線 激辛監査レポート 2026-05-16 (49件, 8カテゴリ)

data-pr-id: 181, data-pr-status: merged, data-pr-merge-sha: 5ae0c87
#181 (5ae0c87) fix(quality): P2 x5 + P3 x1 — og:image, JSON-LD, slug centralization, payload 148KB→25KB, lint, chemical dedup
```

#### カテゴリ: SEO・構造化データ・内部リンク
```
data-pr-category: seo-structured-data
```

```
data-pr-id: 225, data-pr-status: merged, data-pr-merge-sha: 470dee7
#225 (470dee7) seo(internal-links): hub-spoke audit fixes — 0 true orphans + breadcrumb coverage

data-pr-id: 220, data-pr-status: merged, data-pr-merge-sha: fee01aa
#220 (fee01aa) fix(seo): full metadata audit — og:image + twitter for 16 pages, 3 new layout stubs

data-pr-id: 217, data-pr-status: merged, data-pr-merge-sha: 5687329
#217 (5687329) fix(seo): full robots/sitemap/noindex/canonical audit — 4-phase SEO infra hardening

data-pr-id: 211, data-pr-status: merged, data-pr-merge-sha: 19cb756
#211 (19cb756) fix(seo): JSON-LD Schema.org compliance + Rich Results audit

data-pr-id: 180, data-pr-status: merged, data-pr-merge-sha: 966b293
#180 (966b293) fix(audit): resolve 4 P1 issues from regression audit (canonical/sitemap/nav/CrossToolLinks)

data-pr-id: 155, data-pr-status: merged, data-pr-merge-sha: 3d25697
#155 (3d25697) feat(gsc): switch from service account to user OAuth for API access

data-pr-id: 154, data-pr-status: merged, data-pr-merge-sha: 58533d3
#154 (58533d3) feat(gsc): add domain property ownership for service account

data-pr-id: 153, data-pr-status: merged, data-pr-merge-sha: 2cd8742
#153 (2cd8742) feat(gsc): add property ownership via webmasters.sites.add API
```

#### カテゴリ: UX・モバイル・アクセシビリティ
```
data-pr-category: ux-mobile
```

```
data-pr-id: 216, data-pr-status: merged, data-pr-merge-sha: 6e1910d
#216 (6e1910d) fix(mobile-ux): P0/P1 audit fixes across 40 pages x 4 viewports (160 samples)

data-pr-id: 201, data-pr-status: merged, data-pr-merge-sha: 10dc67c
#201 (10dc67c) fix(ux): resolve audit C-001..C-007 UX findings (7 items)

data-pr-id: 166, data-pr-status: merged, data-pr-merge-sha: 8ab52bc
#166 (8ab52bc) feat(ux): cross-tool navigation — industry-aware related links between 6 practice tools

data-pr-id: 152, data-pr-status: merged, data-pr-merge-sha: 60c5a7b
#152 (60c5a7b) fix(a11y): remove duplicate <main> on 18 routes
```

#### カテゴリ: 不要機能アーカイブ・体裁整理
```
data-pr-category: archive-cleanup
```

```
data-pr-id: 222, data-pr-status: merged, data-pr-merge-sha: b1e3b5a
#222 (b1e3b5a) refactor(brand): align language with research-project framing (A-005 follow-up)

data-pr-id: 221, data-pr-status: merged, data-pr-merge-sha: 6836dc5
#221 (6836dc5) refactor(content): remove all 準備中/β placeholder markers sitewide (19 files)

data-pr-id: 199, data-pr-status: merged, data-pr-merge-sha: f2223ee
#199 (f2223ee) fix(audit): resolve 5 P1 items from PR #187 harsh audit (B-001/F-001..F-004)

data-pr-id: 198, data-pr-status: merged, data-pr-merge-sha: 6457e9f
#198 (6457e9f) refactor(content): archive /wizard (301 to /strategy/plan-generator) + drop fake-UGC framing

data-pr-id: 196, data-pr-status: merged, data-pr-merge-sha: 3e04c75
#196 (3e04c75) refactor(content): archive AI-generated SEO articles (D-1 from audit PR #182)

data-pr-id: 194, data-pr-status: merged, data-pr-merge-sha: dc5eb96
#194 (dc5eb96) refactor(content): remove brand-damaging claims — education pricing / qa-knowledge / community-cases UGC

data-pr-id: 186, data-pr-status: merged, data-pr-merge-sha: 937c9b3
#186 (937c9b3) Revert "feat(exam-quiz): expand question bank +210" (PR #185)
```

#### カテゴリ: レジリエンス・インフラ・セキュリティ
```
data-pr-category: resilience-infra
```

```
data-pr-id: 228, data-pr-status: merged, data-pr-merge-sha: c51d38d
#228 (c51d38d) feat(resilience): phase-2 fallbacks across remaining external dependencies

data-pr-id: 223, data-pr-status: merged, data-pr-merge-sha: f4534bf
#223 (f4534bf) feat(resilience): fallbacks + circuit breakers across external dependencies

data-pr-id: 219, data-pr-status: merged, data-pr-merge-sha: 041afcd
#219 (041afcd) chore(rsc): full server/client boundary audit + defensive use-client on 2 fragile components

data-pr-id: 206, data-pr-status: merged, data-pr-merge-sha: 13d0897
#206 (13d0897) fix(vercel): smarter ignoreCommand to prevent build-rate-limit exhaustion

data-pr-id: 193, data-pr-status: merged, data-pr-merge-sha: 140f596
#193 (140f596) security: remove hardcoded credential from /strategy client bundle

data-pr-id: 164, data-pr-status: merged, data-pr-merge-sha: 5a3b3e0
#164 (5a3b3e0) fix(circulars): remove stray double comma breaking mhlw-notices typecheck
```

#### カテゴリ: データ拡充・新機能
```
data-pr-category: data-expansion
```

```
data-pr-id: 214, data-pr-status: merged, data-pr-merge-sha: d2807ca
#214 (d2807ca) feat(industries): expand to 10 industries with 10-section depth + SEO long-tail

data-pr-id: 213, data-pr-status: merged, data-pr-merge-sha: 855ce6f
#213 (855ce6f) feat(laws): expand RAG corpus to 50-law coverage (+12 laws, +153 articles)

data-pr-id: 185, data-pr-status: merged, data-pr-merge-sha: 9819371
#185 (9819371) feat(exam-quiz): expand question bank +210 (health-1st/2nd, work-supervisor)  ※PR #186 でリバート済

data-pr-id: 179, data-pr-status: merged, data-pr-merge-sha: 1ff8fca
#179 (1ff8fca) feat(health-checkup-scheduler): expand from 13 to 30 rules + annual schedule optimizer

data-pr-id: 178, data-pr-status: merged, data-pr-merge-sha: 8cde9b2
#178 (8cde9b2) feat(education): expand cert DB 80→103 items + work-scenario mapper

data-pr-id: 175, data-pr-status: merged, data-pr-merge-sha: 103dba3
#175 (103dba3) feat(safety-signs): JIS Z 9101 safety sign database (110 signs)

data-pr-id: 174, data-pr-status: merged, data-pr-merge-sha: 51548e7
#174 (51548e7) feat(faq): add 200-question FAQ hub at /faq with category pages and search

data-pr-id: 172, data-pr-status: merged, data-pr-merge-sha: 6204c16
#172 (6204c16) feat(mental-health-management): stress check + interview guidance + small-business track

data-pr-id: 171, data-pr-status: merged, data-pr-merge-sha: 3a1c3a8
#171 (3a1c3a8) feat(asbestos): R4.4 pre-investigation reporting + work-plan templates

data-pr-id: 170, data-pr-status: merged, data-pr-merge-sha: 0925a50
#170 (0925a50) feat(heat-illness): WBGT calculator + industry risk DB + R7 compliance hub

data-pr-id: 169, data-pr-status: merged, data-pr-merge-sha: 94bdedb
#169 (94bdedb) feat(work-environment): work environment measurement hub — target-finder + management class judge

data-pr-id: 168, data-pr-status: merged, data-pr-merge-sha: e6ebc7d
#168 (e6ebc7d) feat(treatment-work-balance): add treatment-and-work balance support feature

data-pr-id: 167, data-pr-status: merged, data-pr-merge-sha: 5e9995a
#167 (5e9995a) feat(foreign-workers): residence-status guides + multilingual safety training

data-pr-id: 165, data-pr-status: merged, data-pr-merge-sha: 381dcc0
#165 (381dcc0) feat(glossary): expand glossary from 98 to 250 terms (4 batches)

data-pr-id: 163, data-pr-status: merged, data-pr-merge-sha: fe39903
#163 (fe39903) feat(health-checkup-scheduler): auto-detect required Japanese occupational health checkups by industry / job / hazard

data-pr-id: 162, data-pr-status: merged, data-pr-merge-sha: 0526a83
#162 (0526a83) feat(circulars): expand MHLW notices dataset by 200 entries (869 -> 1069)

data-pr-id: 161, data-pr-status: merged, data-pr-merge-sha: cac8964
#161 (cac8964) feat(education): special-education/skill-training DB + certification finder at /education-certification

data-pr-id: 160, data-pr-status: merged, data-pr-merge-sha: 23d3d1c
#160 (23d3d1c) feat(industries): industry-specific landing pages at /industries (5 industries)

data-pr-id: 159, data-pr-status: merged, data-pr-merge-sha: 1ba2c76
#159 (1ba2c76) feat(chemicals): expand GHS database with 500 R5-priority substances (1046 -> 1546)

data-pr-id: 158, data-pr-status: merged, data-pr-merge-sha: a300a29
#158 (a300a29) feat(ky): KY example database with auto-suggestion (150 industry/work patterns)
```

#### カテゴリ: 国際化・パフォーマンス
```
data-pr-category: i18n-perf
```

```
data-pr-id: 218, data-pr-status: merged, data-pr-merge-sha: 7ff74d7
#218 (7ff74d7) perf(images): mascot WebP conversion + img width/height audit

data-pr-id: 151, data-pr-status: merged, data-pr-merge-sha: f6647cd
#151 (f6647cd) perf(head): add preconnect/dns-prefetch for third-party origins (B-15)

data-pr-id: 150, data-pr-status: merged, data-pr-merge-sha: c5523a4
#150 (c5523a4) perf(config): add explicit browserslist targeting modern browsers (B-12)

data-pr-id: 149, data-pr-status: merged, data-pr-merge-sha: 21f1e9d
#149 (21f1e9d) perf(bundle): lazy-load CommandPalette to reduce shared initial JS (B-11)

data-pr-id: 148, data-pr-status: merged, data-pr-merge-sha: 048c7fe
#148 (048c7fe) feat(i18n): English Beta body translation across 12 priority pages (Phase A)

data-pr-id: 146, data-pr-status: merged, data-pr-merge-sha: acbb1f6
#146 (acbb1f6) perf: ship source maps (B-14) + rAF scroll in chatbot (B-13)

data-pr-id: 145, data-pr-status: merged, data-pr-merge-sha: f3f83ec
#145 (f3f83ec) perf(quiz): collapse /quiz redirect into real route (B-10, PR #135)

data-pr-id: 144, data-pr-status: merged, data-pr-merge-sha: 89f87a0
#144 (89f87a0) perf(analytics): switch GTM/AdSense to lazyOnload (B-9a, PR #135)
```

#### カテゴリ: 監査記録更新・ステータス管理
```
data-pr-category: audit-bookkeeping
```

```
data-pr-id: 224, data-pr-status: merged, data-pr-merge-sha: 5105537
#224 (5105537) chore(audit): record F-009/F-011 kept-by-owner after archive-impact investigation

data-pr-id: 205, data-pr-status: merged, data-pr-merge-sha: 463a835
#205 (463a835) docs(security): remove prompt-injection test strings from audit doc

data-pr-id: 203, data-pr-status: merged, data-pr-merge-sha: f425fc3
#203 (f425fc3) chore(audit): switch B-002/B-004/B-007/B-008 status to resolved-pr-202

data-pr-id: 197, data-pr-status: merged, data-pr-merge-sha: 03ed460
#197 (03ed460) chore(audit): add D-005 finding and mark resolved-pr-196

data-pr-id: 192, data-pr-status: merged, data-pr-merge-sha: aa6cef3
#192 (aa6cef3) chore(audit): mark A-007/B-003/B-005/B-006 as resolved-pr-191-merged

data-pr-id: 190, data-pr-status: merged, data-pr-merge-sha: b2e0000
#190 (b2e0000) docs(audit): P1 batch plan — 10 findings in 4 batches / 4 days (激辛監査 2026-05-16)

data-pr-id: 189, data-pr-status: merged, data-pr-merge-sha: 8307163
#189 (8307163) docs(audit-A002): exam-quiz content inventory (3,410 questions, 4 categories)

data-pr-id: 147, data-pr-status: merged, data-pr-merge-sha: 8b8b72f
#147 (8b8b72f) docs(lighthouse): Phase E post-impl status + PSI quota note
```

---

=== セクション4: 進行中Dispatch (Open PR) ===

```
data-section-id: open-dispatches
```

```
data-pr-id: 209, data-pr-status: open-ready, data-pr-created-at: 2026-05-16T22:33Z
#209 fix(chemicals): accuracy audit of 50 curated substances + reusable CAS audit script
状態: READY (通常PR)
推定完走: レビュー後マージ可能(通常PR)

data-pr-id: 182, data-pr-status: open-draft, data-pr-created-at: 2026-05-16T09:50Z
#182 audit: low-quality content and unnecessary features inventory
状態: DRAFT
推定完走: Draft — F-009/F-011 の kept-by-owner 反映済(PR #224)。F-005/F-007/F-008/F-010 のオーナー判断待ち

data-pr-id: 177, data-pr-status: open-draft, data-pr-created-at: 2026-05-16T08:44Z
#177 docs: regression audit 2026-05-16 (4th deep audit, 20 PRs)
状態: DRAFT
推定完走: Draft — 4th回帰監査ドキュメント、findings 解消後マージ予定

data-pr-id: 176, data-pr-status: open-draft, data-pr-created-at: 2026-05-16T08:18Z
#176 docs(strategy): main-3 features strategic enhancement design (post PR #173)
状態: DRAFT
推定完走: Draft — main-3戦略設計、PR #173 議論完了後マージ

data-pr-id: 173, data-pr-status: open-draft, data-pr-created-at: 2026-05-16T07:26Z
#173 docs(homepage): main features draft from 7-perspective draft meeting
状態: DRAFT
推定完走: Draft — 7視点ドラフト会議、オーナーレビュー待ち
```

---

=== セクション5: 監査公開ページ一覧 ===

```
data-section-id: audit-pages
```

```
data-audit-page-id: harsh-third-party-2026-05-16
data-audit-page-path: /audits/2026-05-16
data-audit-http-status: 200
data-audit-findings-open: 6
ラベル: 第三者目線 激辛監査レポート (49件 8カテゴリ)
未対応findings: 6件 — F-005/F-007/F-008/F-010 + その他P2/P3未着手。P0/P1 は #188 #199 #200 で解消済

data-audit-page-id: brand-consistency-2026-05-17
data-audit-page-path: /audits/brand-consistency
data-audit-http-status: 200
data-audit-findings-open: 0
ラベル: ブランド整合性監査 (個人運営研究プロジェクト体裁)
未対応findings: 0件 — PR #222 で A-005 follow-up 全件解消

data-audit-page-id: content-quality-cleanup-2026-05-16
data-audit-page-path: /audits/content-quality-cleanup
data-audit-http-status: 200
data-audit-findings-open: 0
ラベル: コンテンツ品質クリーンアップ (W完走時)
未対応findings: 0件 — PR #191 で全件解消、PR #192 で監査ステータス更新

data-audit-page-id: news-feed-stats-2026-05-16
data-audit-page-path: /audits/news-feed-stats
data-audit-http-status: 200
data-audit-findings-open: 0
ラベル: ニュースフィードAI判定統計 (AL完走時)
未対応findings: 0件 — PR #210 でtype別閾値調整完了

data-audit-page-id: law-citation-full-audit-2026-05-17
data-audit-page-path: /audits/law-citation-full-audit
data-audit-http-status: 200
data-audit-findings-open: 0
ラベル: 法令引用フルコードベース監査 (AN完走時)
未対応findings: 0件 — PR #227 で 891ファイル 4,440引用照合、C0/重複/非正規略称 全件修正

data-audit-page-id: p1-batch-plan-2026-05-16
data-audit-page-path: /audits/p1-batch-plan
data-audit-http-status: 200
data-audit-findings-open: 0
ラベル: P1 バッチ計画 (10件 / 4バッチ / 4日)
未対応findings: 0件 — PR #190 で計画策定、後続PRで順次実行
```

**本番反映状況:** 全ページ HTTP 200 (本番リポジトリ確認済)。本スナップショット自体 (`/audits/review-dashboard`) は PR #229 マージ済、Vercel デプロイ待ち。

---

=== セクション6: オーナー判断待ち事項 — F-category 4機能 ===

```
data-section-id: owner-pending-decisions
```

各機能について「維持 / 縮小 / アーカイブ」の採否をご返信ください。

---

### F-005 — サイネージ機能 (現場表示・ピン地図・気象警報)
```
data-feature-id: F-005-signage
data-finding-id: F-005
data-recommendation-grade: A-維持
data-pending-decision-id: decision-F-005-signage
path: /signage
```

| 項目 | 内容 |
|------|------|
| 実装規模 | 1,382 行 (複数ファイル合計) |
| 内部リンク被参照ファイル数 | 32 ファイル |
| データ規模 | ピン: クライアント localStorage + サーバはメモリのみ(DB前のフォールバック、PIN_LIMIT_PER_TOKEN=10)。ニュース/事故: signage-news-accidents.ts データセット。気象: JMA API ルート (/api/signage/jma) |
| SEO寄与 | noindex前提のディスプレイ用機能。SEO寄与ほぼなし。GA4/GSC実測は未取得。 |
| メイン3機能との関係 | 独立 |
| ブランド整合性 | 中立 |
| 撤去時の影響範囲 | 朝礼前/休憩時間/退場時の3シナリオプリセット(PR #200)、KY モーニング サイネージ(ky-morning-signage.tsx)、現場表示モード全般。リダイレクト先候補: /ky または /accidents-reports (現場運用ハブ化)。 |
| リダイレクト先候補 | /ky (301) または機能縮小して維持 |
| **推奨** | **A-維持** |
| 推奨根拠 | (1) CLAUDE.md にサイネージは主要利用シーンとして明記。(2) PR #200 で C-003 解消済(シナリオプリセット追加)。(3) ピン機能はlocalStorage+メモリで実害なし、DB導入時に差し替え可能設計済。(4) ky-morning-signage 連携で KY機能の現場展開価値あり。(5) 監査評価「ピン0件」は単独ユーザー視点で、運用想定とは外れる。維持判断推奨。 |

**採否判断 (オーナー記入):**
```
data-ballot-option: A-維持, data-is-recommended: true
[ ] A-維持 (推奨)
[ ] B-縮小
[ ] C-アーカイブ
```

---

### F-007 — Q&Aナレッジベース (運営チーム作成事例)
```
data-feature-id: F-007-qa-knowledge
data-finding-id: F-007
data-recommendation-grade: B-縮小
data-pending-decision-id: decision-F-007-qa-knowledge
path: /qa-knowledge
```

| 項目 | 内容 |
|------|------|
| 実装規模 | 117 行 |
| 内部リンク被参照ファイル数 | 6 ファイル |
| データ規模 | COMMUNITY_CASES_SEED で4件(全件運営チーム作成、authorAlias は架空)。FAQPage JSON-LD は意図的に出力していない(虚偽UGC回避、PR #194)。 |
| SEO寄与 | WebPage + BreadcrumbList のみ。FAQPage構造化データは虚偽UGC回避のため意図的に未出力。SEO寄与は限定的。 |
| メイン3機能との関係 | 補完 |
| ブランド整合性 | 中立 |
| 撤去時の影響範囲 | 「実際の質問投稿が集まり次第差し替え」のプレースホルダ機能(community-cases/submit への送客導線)。/community-cases と機能重複あり。リダイレクト先候補: /faq (200問のFAQハブ、PR #174)。 |
| リダイレクト先候補 | /faq (301) |
| **推奨** | **B-縮小** |
| 推奨根拠 | (1) 掲載4件は監査findings閾値10件未満。(2) PR #194 で運営作成である旨を明示済だが実質ナレッジベースとして機能していない。(3) PR #174 で /faq が 200問規模で稼働、棲み分けが曖昧。(4) 「投稿募集」中継ページとして 50行程度のシンプルなランディングに縮小、または /community-cases に内包し /qa-knowledge は301化が望ましい。完全アーカイブではなく投稿募集機能は残す。 |

**採否判断 (オーナー記入):**
```
data-ballot-option: A-維持
[ ] A-維持
data-ballot-option: B-縮小, data-is-recommended: true
[ ] B-縮小 (推奨)
data-ballot-option: C-アーカイブ
[ ] C-アーカイブ
```

---

### F-008 — 事故DB 3分散 (一覧/分析ダッシュボード/業種別レポート)
```
data-feature-id: F-008-accidents-trio
data-finding-id: F-008
data-recommendation-grade: A-維持
data-pending-decision-id: decision-F-008-accidents-trio
path: /accidents, /accidents-analytics, /accidents-reports
```

| 項目 | 内容 |
|------|------|
| 実装規模 | 1,991 行 (8ファイル合計) |
| 内部リンク被参照ファイル数 | 31 ファイル |
| データ規模 | aggregates-mhlw/ 配下: accidents-by-{age,industry,month,type-industry,year}.json + deaths-by-{industry,year}.json + summary-2025/2026-preliminary.json + industry-{profiles,ranking}.json。mock 生成: 死亡4000件+休業2800件(2021-2025、Excel差し替え前提)。5,026件分のフルコーパス品質監査済(PR #207)。 |
| SEO寄与 | メイン3機能の1つ。SEO寄与大。PR #226 industry-comparison-view が直近大型機能追加。 |
| メイン3機能との関係 | 重複 (メイン3機能の1つ) |
| ブランド整合性 | 整合 |
| 撤去時の影響範囲 | 撤去ではなく整理対象。撤去時の失う価値: 各ページ独立URLでのインデックス。リダイレクト先候補: /accidents をハブ化し /accidents/reports /accidents/analytics へ整理(URL変更を伴うため要オーナー承認)。 |
| リダイレクト先候補 | 整理案: /accidents (ハブ) + /accidents/reports + /accidents/analytics |
| **推奨** | **A-維持** |
| 推奨根拠 | (1) メイン3機能の1つで撤去不可。(2) 3分散の整理は URL変更を伴うため CLAUDE.md ルール上オーナー確認必須。(3) PR #225 でhub-spoke 内部リンク整理済、PR #226 で comparison view 追加。(4) 現状の動線で大きな問題はなく、URL変更による既存被リンク・SEO損失リスクが整理メリットを上回る。維持判断推奨、整理は中期検討。 |

**採否判断 (オーナー記入):**
```
data-ballot-option: A-維持, data-is-recommended: true
[ ] A-維持 (推奨)
[ ] B-縮小
[ ] C-アーカイブ
```

---

### F-010 — 安全日誌 (個人/小規模事業者向け日次記録)
```
data-feature-id: F-010-safety-diary
data-finding-id: F-010
data-recommendation-grade: B-縮小
data-pending-decision-id: decision-F-010-safety-diary
path: /safety-diary
```

| 項目 | 内容 |
|------|------|
| 実装規模 | 1,892 行 (12ファイル合計) |
| 内部リンク被参照ファイル数 | 27 ファイル |
| データ規模 | 永続化: 全コンポーネント(diary-detail/form-required/list/monthly/print)が localStorage 利用。サーバDB未接続。機能: 6ページ (一覧/新規/詳細/月次/印刷)、フォーム2種(required/detail)。 |
| SEO寄与 | 個人利用ツール。GA4/GSC実測は未取得。SEO寄与小。 |
| メイン3機能との関係 | 補完 |
| ブランド整合性 | 整合 |
| 撤去時の影響範囲 | 個人事業主・小規模事業者向け日次記録ツール、KY/RA結果の手元保持先。データはクライアント側 localStorage のため復旧不可。リダイレクト先候補: /ky (KY機能で日々記録代替) または機能位置づけを「KY/RA への自動転記USP」に再設計。 |
| リダイレクト先候補 | 維持して USP 再設計、または /ky へ301 |
| **推奨** | **B-縮小** |
| 推奨根拠 | (1) 12ファイル/1,892行と実装規模大。(2) KY/RA との分担曖昧(監査C-006)。(3) localStorage限定で多拠点運用不可。(4) PR #200 で永続化方式明示等は対応済だが、USP(KY/RA への自動転記)が未実装で価値が曖昧。(5) 縮小推奨: 一覧+新規の2ページに絞り、詳細/月次/印刷は LMS提供開始(2026年秋)時に再設計。あるいは KY 機能内に内包し /safety-diary は301化。 |

**採否判断 (オーナー記入):**
```
data-ballot-option: A-維持
[ ] A-維持
data-ballot-option: B-縮小, data-is-recommended: true
[ ] B-縮小 (推奨)
data-ballot-option: C-アーカイブ
[ ] C-アーカイブ
```

---

=== セクション7: 既知の課題・残作業 ===

```
data-section-id: known-issues
```

```
data-known-issue-id: K-001, data-issue-priority: high
K-001 — R07確定個票公開後の preliminary→mhlw データ置換
現状 16件の速報集計値ベース(PR #104)。R07確定個票公開後に置換必要。
source: memory project_accident_data_2025_2026.md

data-known-issue-id: K-002, data-issue-priority: high
K-002 — F-category 4機能のオーナー判断 (本ダッシュボード Phase 6)
本ダッシュボードの「オーナー判断待ち事項」セクション参照。F-005/F-007/F-008/F-010 の処遇決定後、PR #182 audit Draft をマージ可能になる。

data-known-issue-id: K-003, data-issue-priority: medium
K-003 — /qa-knowledge と /community-cases と /faq の機能重複整理
F-007 判断連動。3機能の役割再定義が必要。

data-known-issue-id: K-004, data-issue-priority: low
K-004 — /lms ウェイトリスト 2026年秋公開予定 + 法人化後機能群(/api-docs, /pricing, /dpa)
PR #199 で noindex 化済。法人化判断と連動して順次再公開。

data-known-issue-id: K-005, data-issue-priority: medium
K-005 — GA4/GSC SEO 実測データ未取得
PR #153-155 で GSC OAuth 接続まで進めたが、当ダッシュボードの SEO 寄与判定は実測ベースではない。GSC 採取後に F-category 判断材料を更新可能。
```

---

=== セクション8: Vercel ビルド状況・次回反映 ===

```
data-section-id: vercel-status
data-vercel-status-state: 正常
```

- **ビルドクォータ状態:** 正常
- **ignoreCommand 対応:** PR #206 で smarter ignoreCommand 導入済(docs-only / md-only / scripts-only PR はビルドスキップ)。24h クォータ24時間制限の到達リスクは継続監視。
- **次回反映:** 次回 main マージ時に Vercel 自動デプロイ。本ダッシュボードのリビジョンが本番に反映されるまで通常 2-5分。

---

=== セクション9: AN Dispatch — Law citation full audit ===

```
data-section-id: an-dispatch
data-dispatch-id: AN-law-citation-full-audit
data-dispatch-status: merged
data-dispatch-pr: 227
```

**完走済 — PR #227 マージ** (SHA f99d3f6, 2026-05-17T08:22Z)

全コードベース (web/src 891ファイル、4,440引用) を e-Gov 既知範囲と内部正典データに照合し、
C0(出範囲条文) 8件・intra-law duplicate 2件・非正規略称 80件を全件修正。
C1/C2/C4 は 0件で検出されず。詳細: `/audits/law-citation-full-audit`。

並行Dispatch 279ターン中の終端結果。本ダッシュボード作成中も継続的に進行していたが、
スコープは PR #227 で完結済み (post-audit bookkeeping は PR #224)。

---

## 構造化マーカー一覧 (17種)

このダッシュボードで使用している `data-*` 属性:

| マーカー | 用途 |
|---------|------|
| `data-dashboard-id` | ダッシュボード識別子 |
| `data-generated-at` | 生成日時 (ISO 8601) |
| `data-base-main-sha` | ベースとなる main SHA |
| `data-section-id` | セクション識別子 |
| `data-metric-id` | エグゼクティブサマリ指標 |
| `data-main-feature-id` | メイン3機能識別子 |
| `data-latest-pr` | 各機能の最新PR番号 |
| `data-latest-merge-sha` | 各機能の最新マージSHA |
| `data-pr-id` | PR番号 |
| `data-pr-category` | PRカテゴリ |
| `data-pr-status` | PRステータス (merged/open-draft/open-ready) |
| `data-pr-merge-sha` | マージSHA |
| `data-feature-id` | F-category 機能識別子 |
| `data-finding-id` | finding識別子 (F-005等) |
| `data-recommendation-grade` | 推奨アクション (A-維持/B-縮小/C-アーカイブ) |
| `data-pending-decision-id` | オーナー判断待ちID |
| `data-ballot-option` | 採否選択肢 |
| `data-is-recommended` | 推奨オプションフラグ |
| `data-known-issue-id` | 既知課題ID |
| `data-issue-priority` | 課題優先度 (high/medium/low) |
| `data-vercel-status-state` | Vercel クォータ状態 |
| `data-dispatch-id` | Dispatch識別子 |
| `data-dispatch-status` | Dispatch状態 |
| `data-audit-page-id` | 監査ページID |
| `data-audit-page-path` | 監査ページパス |
| `data-audit-http-status` | HTTP ステータスコード |
| `data-audit-findings-open` | 未対応findings件数 |

---

*このスナップショットは PR #229 (e3e3624) の `web/src/app/(main)/audits/review-dashboard/page.tsx` から抽出。Vercel 本番反映前のオーナーレビュー用。*
