# AI解説の事前生成（キャッシュウォーム）cron 設計ドラフト — 2026-07-11

LN-S2（BACKLOG-seo）の後段。**実装は要オーナー確認**（vercel.json への cron 追加＝環境変更のため）。
本ドキュメントは設計の起票のみ。

## 前提（本PRで整備済み）

- `/api/law-summary` は GET 化済み: `GET /api/law-summary?law=<正式名称|略称>&articleNum=<第N条>&mode=explain`
- 同一条文は同一URLに収束し、`cdnCacheHeaders("INDUSTRY")`（s-maxage 4h 系）で Vercel エッジにキャッシュされる
- 条文ページは 712条（egovLawId 保有 46法令・LAW_NAVI_ENTRIES 正本）

## 目的

初回アクセスの AI解説生成は Gemini live で約10秒かかる。アクセス上位の条文を cron で先に叩いて
エッジキャッシュを温めておけば、実ユーザーの初回クリックでも HIT（ms オーダー）にできる。

## 設計案

1. **対象選定**: ウォーム対象は全712条ではなく上位N条（コスト・クォータ配慮）。
   - 第1段階（GSC 連携前）: 分野インデックス `LAW_NAVI_TOPICS` の articles（現場需要の人手キュレーション済み
     ≈ 200条・重複除去後）を優先度リストとして使う。
   - 第2段階（LN-S3 で GSC 計測が入った後）: GSC の /law-navi/* 表示回数上位で並べ替える。
2. **cron エンドポイント**: `GET /api/cron/warm-law-summary`（`CRON_SECRET` 認証・既存 cron 群と同様）。
   1回の実行で K 条（例: 20条）を順に `GET /api/law-summary?...&mode=explain` へ内部 fetch し、
   進捗カーソルは KV ではなくリストの日次ローテーション（day-of-year % ページ数）で無状態に決める。
3. **頻度**: エッジキャッシュ TTL（4h）との整合で 1日2〜3回。クォータ: K=20 × 3回/日 = 60生成/日以内。
4. **ガードレール**: circuit breaker "gemini" を共有しているため、cron 失敗の連続で
   ユーザー向け生成まで落とさないよう、ウォームは breaker open 時に即時中断する。

## 完了条件（実装時）

- 同一条文の AI解説2回目リクエストが `x-vercel-cache: HIT`（実測して PR に記録）
- ウォーム対象条文の初回ユーザー体感が live 生成 10s → HIT ms オーダー

## オーナー確認事項

- vercel.json への cron 追加の可否（既存 cron 数・課金プランの cron 上限）
- 1日あたりの Gemini 生成上限（コスト許容値）
