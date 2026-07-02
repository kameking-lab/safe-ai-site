# S6 運用ループ: 横断検索の 0 件クエリ週次確認手順（T4/T8）

対象: `/search`・⌘K の横断検索。診断書 05-search-egov.md の T4（0件フォールバック）+ T8（0件クエリ運用ループ）の運用面。コード側の 0 件フォールバック（e-Gov 誘導・収録範囲明示）は実装済み（`SearchResults.tsx` の `NoResults` / `lib/cross-search/egov-fallback.ts`）。本書は「0 件クエリをどう拾って改善へ回すか」の手順を定める。

## 何が計測されているか（既存の計装）

| イベント名 | 発火箇所 | パラメータ | 用途 |
|---|---|---|---|
| `search_results_view` | `/search` 結果表示時（`SearchResults.tsx`） | `query`, `category`, `result_count` | **0 件率**と 0 件クエリ本文の把握。`result_count=0` が改善対象。 |
| `search_zero_result_egov` | 0 件画面の「e-Gov法令検索で調べる」クリック | `query` | 0 件で取りこぼし e-Gov へ逃がした実数（＝機会損失の下限）。 |

いずれも GA4（`trackEvent` → gtag、`components/Analytics.tsx`）。送信先は `NEXT_PUBLIC_GA_MEASUREMENT_ID` 設定時のみ。

## 週次手順（目安 15 分／週）

1. **0 件クエリの抽出**: GA4 → 探索（自由形式）で、イベント `search_results_view` を `event_count` 集計、ディメンションに `query`、指標に `result_count`（カスタム指標が無ければセグメントで `result_count = 0` を絞る）。`result_count = 0` の `query` を件数降順に並べる。
2. **0 件率の記録**: `search_results_view` 全体に占める `result_count = 0` の割合を控える（週次トレンド）。併せて `search_zero_result_egov` の件数（e-Gov 逃がし数）を控える。
3. **上位 0 件クエリを 4 分類にトリアージ**（多い順に潰す）:
   - **同義語ギャップ**（口語・別表記が条文語に届かない。例「アスベスト」「ヘルメット」）→ `lib/query-expansion.ts`（cross-search の `score.ts` が `expandQuery` で流用）にシノニム追加。
   - **法令エイリアスギャップ**（正式名称・かな読み・別略称が届かない。例「あんえいほう」「労働安全衛生規則 第○条」）→ O8-c（`law-metadata` エイリアス展開）。
   - **条番号ゆらぎ**（「安衛法61条」「第六十一条」「61-2」など）→ `lib/cross-search/article-query.ts`（O8-b の `normalizeArticleQuery`）にパターン追加。
   - **真の未収載**（curated 抄録に無い条文・所管外テーマ）→ 0 件フォールバックで e-Gov へ誘導済み。頻出なら T7（e-Gov API v2 全文取込、**外部API＝オーナー確認事項**）の優先度シグナルとして記録。
4. **回帰の固定**: 修正した 0 件クエリは `search-index.test.ts`（本番インデックス回帰、`it.each`）へ 1 行足し、再発を防ぐ。

## 成功指標

- 週次 `result_count = 0` 率が低下トレンドにあること。
- 上位 0 件クエリのうち、同義語・エイリアス・条番号ゆらぎ由来（＝データはあるのに検索が殺している型）が翌週までに解消されること。
- 真の未収載クエリは e-Gov 逃がしが機能し、`search_zero_result_egov` が発火していること（どん詰まりゼロ）。

## 担当境界（並列ループ）

- 本手順・`/search` の 0 件フォールバック・`search-index`/`cross-search` の同義語/エイリアス/条番号は **SEO/インフラ班**。
- `/law-search`（法令全文検索パネル `law-search-panel.tsx`）の 0 件画面・収録外条番号の e-Gov 条アンカー誘導（`#Mp-At_N`）は **当該 UI 班の所有**＝要・他班（本タスクの対象外）。
