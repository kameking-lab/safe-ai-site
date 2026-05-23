# GA4 / GSC 実測データ稼働状況

**作成日:** 2026-05-23
**作成者:** Claude (read-only audit)
**ブランチ:** `docs/ga4-gsc-status-2026-05-23`
**対象環境:** 本番 (https://www.anzen-ai-portal.jp/)

## 結論サマリ

| 項目 | 稼働状況 | 判定根拠 |
|------|----------|----------|
| **GA4 フロントエンド計測** | 不明（要本番HTML確認） | コード側は `NEXT_PUBLIC_GA_MEASUREMENT_ID` 設定の有無で挿入を分岐。本調査の実行環境は外向き通信が許可リスト管理されており本番HTMLを直接取得できない。 |
| **GA4 Data API（ダッシュボード裏側）** | 不明（要 Vercel 環境変数確認） | `GA4_PROPERTY_ID` + `GOOGLE_APPLICATION_CREDENTIALS_JSON` の両方が必須。未設定時は `buildMockStatsResponse` にフォールバック。 |
| **GSC OAuth 連携** | 不明（要 Vercel 環境変数確認） | `GSC_OAUTH_CLIENT_ID` / `GSC_OAUTH_CLIENT_SECRET` / `GSC_OAUTH_REFRESH_TOKEN` の3点全て必須。一つでも欠ければモック応答。 |
| **/admin/health-check** | 認証必須・稼働中（コード側） | `STRATEGY_AUTH_PASSWORD` クエリ未設定なら `notFound()`。GA4/GSC とは無関係（Vercel 利用量モニタリング専用）。 |
| **/api/admin/health** | 認証必須 | `ADMIN_HEALTH_KEY` 必須。services[] に GA4 / GSC の probe 結果が含まれる。 |

## 本調査での確認限界

本調査は Claude Code on the web の隔離コンテナで実行されており、外向き通信の許可リストにより `www.anzen-ai-portal.jp` への直接 HTTP 取得は不可（403 / "Host not in allowlist"）。
従って下記2点は本調査単独では判定不能、オーナー側での確認が必須：

1. 本番 HTML の `<head>`/`<body>` 内に `<script src=".../gtag/js?id=G-...">` が出力されているか
2. Vercel Production 環境変数に GA4/GSC 関連の6本（後述）が登録されているか

判定手段は `02-required-actions.md` の「セルフチェック手順」を参照。

## 稼働判定フロー（オーナー実行用）

### GA4 稼働中の確認手順
1. ブラウザで https://www.anzen-ai-portal.jp/ を開き「ページのソースを表示」
2. `googletagmanager.com/gtag/js?id=G-` を検索 → ヒットすれば **計測スクリプト稼働中**
3. GA4 管理画面 → リアルタイム → 上記操作直後にアクセス数が上がれば **Property 連携正常**
4. /admin/health-check?key=&lt;STRATEGY_AUTH_PASSWORD&gt; とは別に、`/api/admin/health?key=$ADMIN_HEALTH_KEY` の `services` 配列で GA4 の status を確認

### GSC 稼働中の確認手順
1. `curl https://www.anzen-ai-portal.jp/api/search-console?period=7d | jq '.source'` を実行
2. `"gsc"` が返れば **OAuth 連携正常**。`"mock"` なら同じレスポンスの `note` 欄に欠落理由が出る
3. /stats ダッシュボードにオーナー権限でアクセスし、右上のバッジが「GSC ライブ」表示なら稼働中、「GSC モック」なら未稼働

## 関連ドキュメント

- `01-implementation-summary.md` — 既存実装の構造サマリ
- `02-required-actions.md` — オーナー作業リスト
- `03-data-driven-roadmap.md` — 実測データ取得後の SEO 深化ロードマップ
- `docs/gsc-oauth-setup.md` — GSC OAuth 初期セットアップ手順
- `docs/site-status-2026-05-19/report.md` 3.2 - 3.4 — 直前の調査結果
