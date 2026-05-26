# 01 現状機能の網羅的把握（軸1）

調査日 2026-05-26 / main HEAD 29ed250a

## ページ
- `/accidents`（154行）— 事故事例の閲覧・検索ハブ。HomeScreen(variant=accidents)でタブ切替（mhlw-search 等）、NewsFeedSection、AccidentsMetaInfo、LadderStatsCard。
- `/accidents/[id]`（253行）— 事故事例の詳細。
- `/accidents-reports`（分析ハブ）— HubFilter＋getAllIndustriesSummary。
- `/accidents-reports/[industry]`（業種別レポート）— industry-report-view。
- `/accidents-reports/compare`（業種比較）— comparison-view、comparison-monthly-chart。

## コンポーネント
- analysis: accident-analysis-panel / mhlw-accident-analysis-panel（**統計ベース、AI非搭載**）、accident-database-panel、accident-extras-panel、accidents-meta-info。
- reports: hub-filter / industry-report-view / comparison-view / comparison-industry-selector / comparison-monthly-chart / monthly-trend-chart / prevention-checklist / top-cases-tabs / report-print-button / report-print-meta。
- education/AccidentsByCategory、chemical/accident-cross-section（化学物質P1-3連携）。

## ライブラリ
- lib/accident-analysis.ts、accident-comparison.ts、accident-related.ts、accident-source.ts、accidents-reports-filter.ts、services/accident-service.ts。
- lib/accidents-analytics/（aggregators / loader / types / index）— 統計集約。
- lib/chemical/accident-cross-search.ts（物質×事故）。

## データ
- 質的ケーススタディ: 約292件（real-accident-cases* 7ファイル合算）。AccidentCase 型: id/title/occurredOn/type(事故型)/workCategory/severity/summary/mainCauses/preventionPoints/industry_detail/worker_attribute/company_size/source/provenance。
- 統計フルコーパス: **5,026件**（死亡4000＋休業2800規模のmock生成、2021-2025、Excel差し替え前提、PR #207で品質監査済）。site-stats.ts に accidents10yCount="5,026"。
- 集約JSON: aggregates-mhlw/ に accidents-by-{age,industry,month,year,type-industry}.json、deaths-by-{industry,year}.json、industry-{profiles,ranking}.json、summary-2025/2026-preliminary.json。

## API
- /api/mhlw/search（事故検索）、/api/safety-alert、/api/notifications、/api/newsletter/send。**事故AI分析のAPIは無し**。

## 既に充実している点
- 多観点の統計ダッシュボード（業種別・月次トレンド・年次・年齢別・事故型別）、業種比較、予防チェックリスト、A4印刷、出典表示、ニュースフィード。3デバイス横スクロールなし（軸9）。

## ギャップ（要点）
- **AI分析が無い**（パネルは統計のみ）→ 軸7の機会。
- 「直近の事故」自動取込が無い（NewsFeedはRSS）。月次速報/e-Stat未統合（軸6）。
- 多言語なし（軸8）。
- KYからの事故サジェスト動線が弱い（safety-diaryは一部連携、chemicalはP1-3済）（軸10）。
- 細粒度の観点（時間帯/曜日/経験年数）は構造化データが薄い（軸4、データ無いものは創作しない）。
