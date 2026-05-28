# 01. 現状機能の網羅的把握（事故速報＋法改正）

監査日: 2026-05-28 / 対象 HEAD: `6cff6568`（PR #304 マージ後）/ ベースライン: 896 tests pass

## 1.1 重要な前提訂正

ミッションは「法改正追跡は未実装(新規)」を前提とするが、**実態は法改正追跡が約70-80%実装済**。ETLパイプライン・API・サービス層・リッチUI・厳選データ100件＋解説記事10件が既に存在する。**唯一「公式ソースからの実データ自動取込」だけが未稼働**（インフラは配線・テスト・SSRF防御まで完成、接続先が空）。

## 1.2 事故速報（accident-news）— 既存実装

ルート3系統:
- `/accidents` — 事例DB＋最新シグナル。AI注意喚起(`AccidentAiAnalyzer`)・直近公式リンク(`OfficialRecentLinks`)・トレンドAI要約(`AccidentTrendSummary`)・報道自動収集feed(`NewsFeedSection`)
- `/accidents-reports` — 業種別レポート＋月次速報(`MonthlySokuhouSection`)＋多軸分析＋e-Stat公式表(`EstatOfficialTables`)。`revalidate=2592000`(30日)
- `/accidents-analytics` — 25軸統計ダッシュボード（成熟）

ETL・データ:
- 月次速報ETL: `web/scripts/etl/mhlw-monthly-fetch.ts`＋`.github/workflows/etl-mhlw-monthly.yml`（cron `0 0 15 * *`、diff-only、厳格ヘッダ検証）→ `data/accidents/monthly-sokuhou.json`（令和8年4月速報、fetchedAt 2026-05-27）。**稼働中**
- 報道feed: `.github/workflows/news-feed-daily.yml`（daily cron `0 21 * * *`）3段（RSS取得→Geminiジャッジ→commit）→ `data/news-feed/approved/index.json`（10件、最新2026-05-27、NHK/厚労省）
- e-Stat: `/api/accidents/estat`（カタログ＝表メタのみ、数値は出さず誤読回避）。`E_STAT_API_KEY`未設定なら503でセクション非表示
- トレンドAI要約: `/api/accidents/trend-summary`（gemini-2.5-flash、オンデマンド、非キャッシュ、ハルシネーションガード強、ただし**月次速報でなくcuratedサンプル集計**）

## 1.3 法改正（law-revision）— 既存実装

ETLパイプライン `web/src/lib/revisions-ingest/`:
- `index.ts`/`types.ts`/`parse.ts`（`defaultRevisionImportMapper`＋`officialDbRevisionImportMapper`＝公式DB風キー`lawId/enforcedAt/promulgatedAt/actNumber`吸収）/`normalize.ts`（種別推定・URL検証・日付正規化）/`load-sample.ts`（空配列）/`load-real.ts`（HTTPS fetch＋SSRF防御、env未設定で空）
- テスト完備（load-real/normalize/parse）

サービス・API・UI:
- `services/revision-service.ts`（mock＋api）、`/api/revisions/route.ts`（GET、ingestSource解決、診断ヘッダ）
- `components/law-revision-list.tsx`（978行）: キーワード/年範囲/業種10種(URL同期)/対象属性/規模/種別/影響度フィルタ・施行日ソート・公布日/施行日別表示・e-Gov原文リンク・AI要約・自社プロファイル連動
- `/laws`ページ→`LawsPageClient`→`HomeScreen variant="laws"`→`LawRevisionList`
- `/circulars`（通達一覧）、`/articles`＋`/articles/[slug]`（法改正解説記事）

データ:
- `data/mock/real-law-revisions.ts`(33件)＋`real-law-revisions-extra.ts`(67件)＝**100件**（2016〜2027、未来施行ぶんも収録）
- `data/articles/*.json`（10件、うちlaw-update 5件: heat-stroke-2025/freelance-rosai-2024/fullharness-2022/scaffold-3rd-rail-2024/stress-check-50。やさしい解説＋公式URL付き、ただし施行日/根拠条文は本文埋込で非構造化）

## 1.4 デッドコード／要整理候補

- `data/mock/decade-law-revisions.ts`（status reportのみ参照、画面未配線）
- e-Stat: `E_STAT_API_KEY`未設定なら全セクション非表示（本番で見えていない可能性）
- 報道feed: analytics集計からは意図的に除外（二重集計回避）
- 孤立した`circulars/expanded-circulars-batch-*`（前監査で既出、検索未接続）

## 1.5 既存環境変数（本サブシステム）

`NEXT_PUBLIC_REVISIONS_INGEST_SOURCE`(sample/real切替)・`REVISIONS_REAL_SOURCE_URL`(未設定＝空)・`REVISIONS_REAL_SOURCE_ALLOW_HOSTS`(SSRF許可)・`REVISIONS_REAL_SOURCE_FORMAT`(default/official-db)・`REVISIONS_REAL_SOURCE_PAYLOAD_JSON`・`E_STAT_API_KEY`。**いずれも既存。e-Gov法令APIは鍵不要のため新規env追加なしで自動取込可能（doc03）**。

## 1.6 総合所見

両機能とも**土台は成熟**（事故速報~70/100、法改正~75/100）。事故速報の弱点は「新着性・速報の一元表示・速報→トレンド連動」、法改正の弱点は「実データ自動取込が空回り」「施行前/施行済の区別が無い」。**最大の好機は、鍵不要のe-Gov法令API v2から構造データ(施行日・施行状況)を自動取込し、既存の成熟UIに施行前/済バッジを足すこと**（doc03/04/13）。
