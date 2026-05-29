# 01. 現状の報道feed

## 1.1 実装

- ETL: `.github/workflows/news-feed-daily.yml`（日次cron 21:00 JST）→ `scripts/etl/fetch-news-feed.mjs`（RSS取得＋キーワード前処理）→ `scripts/etl/news-ai-judge.mjs`（Gemini 2.5 Flash 4スコア判定: 関連度/著作権リスク/誤情報リスク/重複）→ 承認分のみ `data/news-feed/approved/index.json`。
- ローダ: `lib/news-feed.ts`。表示: `components/news-feed-section.tsx`（/accidents の「報道・自動収集」セクション、警告スタイル＋「完全自動運用」注記）。
- 配信: `/feed/accident-reports.xml`（前セッション実装、事故速報＋報道）。新着ハブ `/whats-new` にも media カテゴリで集約。
- 現状: 承認10件、最新2026-05-28、NHK・厚労省等。

## 1.2 収録項目（entry）

- id / headline（見出し）/ aiSummary（自作要約）/ source{name,url,publisher,publishedAt,fetchedAt} / estimatedAccidentType / newsType / score{relevance,copyrightRisk,misinformationRisk,duplication} / approved / provenance。
- **構造化フィールド（業種・規模・原因・被害数・会社名）は無い**＝見出しレベル。`/accidents-analytics`（25軸）からは意図的に除外。

## 1.3 充足度評価（社長要件比）

社長要件「発生日時・場所・業種・作業内容・被害・発生原因・背景・関連会社・発注者を体系化」に対し:
- 発生日時: △（報道のpublishedAtのみ、事故発生日時は要約依存）
- 場所/業種/作業/被害/原因: ✕（構造化されておらず見出し＋要約のみ）
- 背景（同種頻度）: ✕（集計連携なし）
- 関連会社/発注者: ✕（収録せず＝法的にも常設は高リスク doc04）

→ **現状充足度 55/100**。最新の気づきには有効だが、「重大事例の体系カード」には未到達。

## 1.4 強みと方向性

- 強み: 著作権/誤情報をAIで管理し、出典リンク＋自作要約で安全運用している点（絶対禁止事項と整合）。
- 不足: **構造化された重大災害事例**（業種/作業/原因/規模/被害）の体系化。これは**会社名なしの匿名公式DB**（doc02）で安全に補える。
- → 方向性: 報道feed（最新の気づき）＋匿名公式DBの重大事例ブラウザ（体系・類型学習）の二層。会社名は出典リンク誘導に留める。
