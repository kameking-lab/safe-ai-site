# 既存実装サマリ — GA4 / GSC

**目的:** どのコードがどの環境変数を要求し、未設定時にどう振る舞うかを一覧化する。

## 1. GA4（フロントエンド計測）

### 1.1 主要ファイル

| ファイル | 行 | 役割 |
|----------|-----|------|
| `web/src/components/Analytics.tsx` | 14, 36-51 | gtag.js 動的ロード + ページビュー追跡 |
| `web/src/lib/track-events.ts` | 13-24 | `trackEvent()` / `trackAffiliateClick()` ユーティリティ |
| `web/src/app/layout.tsx` | 12, 101, 103, 108 | preconnect/dns-prefetch + `<Analytics />` 配置 |
| `web/src/components/privacy/cookie-status.tsx` | 4 | プライバシーページでの GA 有効/無効表示 |

### 1.2 環境変数

| 変数名 | スコープ | 必須 | 未設定時の挙動 |
|--------|----------|------|----------------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | クライアント | 必須 | `Analytics.tsx` は `null` を返し `<script>` を一切出さない |

### 1.3 動作

- 設定あり: `<Script src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}" strategy="lazyOnload">` をレンダ。pathname 変更ごとに `gtag('config', GA_ID, { page_path })` を発火。
- 設定なし: 何もしない（プライバシーページに「未連携」表示）。

## 2. GA4（バックエンド = Data API）

### 2.1 主要ファイル

| ファイル | 役割 |
|----------|------|
| `web/src/lib/stats/ga4-client.ts` | `BetaAnalyticsDataClient` を動的 import → サマリ/MAU/ページ TOP10/流入元 を取得 |
| `web/src/lib/stats/page-analytics-client.ts` | 個別ページの流入詳細を取得 |
| `web/src/app/api/stats/route.ts` | `/api/stats?period=7d|30d|90d` |
| `web/src/app/api/stats/page-analytics/route.ts` | `/api/stats/page-analytics` |
| `web/src/app/(main)/stats/StatsDashboardImpl.tsx` | 上記2APIをフェッチして可視化 |

### 2.2 環境変数

| 変数名 | 必須 | 用途 |
|--------|------|------|
| `GA4_PROPERTY_ID` | 必須 | GA4 プロパティID（数値） |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | いずれか必須 | サービスアカウント JSON 文字列 |
| `GOOGLE_APPLICATION_CREDENTIALS` | いずれか必須 | サービスアカウント JSON ファイルパス |

### 2.3 動作

- `isGa4Configured()` が false の場合 `buildMockStatsResponse(period)` を返却。
- live 取得に失敗した場合も同様にモック応答に切り替え、`source: "mock"` をセット。
- 取得項目: DAU / MAU / PV / 平均セッション時間 / 直帰率 / ページ別 TOP10 / 流入元 TOP10。

## 3. GSC（Search Console）

### 3.1 主要ファイル

| ファイル | 役割 |
|----------|------|
| `web/src/lib/stats/search-console-client.ts` | OAuth refresh-token フロー + searchAnalytics クエリ |
| `web/src/app/api/search-console/route.ts` | `/api/search-console?period=7d|30d|90d` |
| `scripts/etl/gsc-oauth-init.mjs` | refresh token 取得用ローカルスクリプト（1回実行） |
| `scripts/etl/gsc-add-property.mjs` | プロパティ追加補助スクリプト |

### 3.2 環境変数

| 変数名 | 必須 | 用途 |
|--------|------|------|
| `GSC_OAUTH_CLIENT_ID` | 必須 | OAuth クライアント ID |
| `GSC_OAUTH_CLIENT_SECRET` | 必須 | OAuth クライアントシークレット |
| `GSC_OAUTH_REFRESH_TOKEN` | 必須 | 長期 refresh token（init スクリプトで取得） |
| `GSC_SITE_URL` | 任意 | プロパティ識別子。未設定なら `NEXT_PUBLIC_SITE_URL` → デフォルト `https://www.anzen-ai-portal.jp/` |
| `GOOGLE_SITE_VERIFICATION` | 任意 | layout.tsx の meta verification 出力用 |

### 3.3 動作

- `isConfigured()` が false → `buildMockSearchConsoleResponse(period, "credentials missing")` を返却。
- live 失敗時もモックにフォールバックし `note` 欄に理由（401 invalid_grant / 403 等）を格納。
- 取得項目: サマリ（impressions/clicks/ctr/position） + クエリ TOP30 + ページ TOP30 + 国 TOP10 + デバイス TOP5。
- 認証方式の経緯: サービスアカウントは個人 Gmail 所有 GSC プロパティに「ユーザー追加」できないため OAuth refresh token 方式を採用（`docs/gsc-oauth-setup.md` 参照）。

## 4. ヘルスチェック関連

### 4.1 `/admin/health-check`

| 項目 | 値 |
|------|----|
| 認証 | `?key=<STRATEGY_AUTH_PASSWORD>` 必須（未設定なら 404） |
| 内容 | Vercel 利用量（ISR writes / edge requests / function invocations / bandwidth） |
| GA4/GSC との関連 | **なし**（Vercel API 専用） |

### 4.2 `/api/admin/health`

| 項目 | 値 |
|------|----|
| 認証 | `Authorization: Bearer <ADMIN_HEALTH_KEY>` または `?key=` |
| 内容 | `services` 配列に GA4 / GSC（INDEXNOW 経由） / Vercel Blob / Open-Meteo 等の probe 結果 |
| GA4 probe | `GA4_PROPERTY_ID` + `GOOGLE_APPLICATION_CREDENTIALS_JSON` の有無のみチェック（実クエリは打たない） |
| GSC probe | 注意: 現状の probe は `INDEXNOW_KEY` で IndexNow API への HEAD のみ。**OAuth 経路の生死は判定していない** |

### 4.3 `/api/seo/notify-search-console`

- 認証: `CRON_SECRET`（未設定だと誰でも叩ける）
- sitemap reachability HEAD + IndexNow 通知（Bing/Yandex/Naver/Seznam 向け、Google は IndexNow 非対応）
- GA4/GSC との連携機能はなし

## 5. 既存ダッシュボード表示

`/stats`（noindex）にて：

- 上部バッジ: GA4 `source === "ga4"` で「ライブ」、`"mock"` で警告枠表示
- GSC バッジ: `gsc.source === "gsc"` で「GSC ライブ」、それ以外で「GSC モック」
- セクション: サマリ / 流入元 / ページ別 / SEO サマリ / SEO クエリ / SEO ページ

オーナー本人がアクセスする際は URL ガード（コード調査時点では `/stats` 自体は noindex のみで認証なし、ただし内部利用前提）。
