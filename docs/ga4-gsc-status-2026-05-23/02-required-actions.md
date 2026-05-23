# オーナー作業リスト — GA4 / GSC 稼働化

**前提:** コード側はすべて実装済み。動作させるには Vercel 環境変数登録と Google 側（GCP / GA4 / GSC）の管理操作が必要。

## 0. セルフチェック手順（先に実施）

**所要時間: 約5分。これにより本ドキュメントの作業のうちどれが未完か特定できる。**

```bash
# 1) GA4 計測スクリプトが本番に挿入されているか
curl -s https://www.anzen-ai-portal.jp/ | grep -oE 'googletagmanager\.com/gtag/js\?id=G-[A-Z0-9]+'
# 出力例: googletagmanager.com/gtag/js?id=G-XXXXXXXXXX → 稼働中
# 出力なし → NEXT_PUBLIC_GA_MEASUREMENT_ID 未設定 or デプロイ未反映

# 2) GSC API の生死
curl -s "https://www.anzen-ai-portal.jp/api/search-console?period=7d" | jq '{source, note}'
# {"source":"gsc","note":null} → OAuth 連携稼働中
# {"source":"mock","note":"credentials missing"} → 環境変数3本のいずれか未設定
# {"source":"mock","note":"GSC 401: invalid_grant"} → refresh token 失効（再取得が必要）

# 3) /api/admin/health で GA4 Data API の設定有無
curl -s "https://www.anzen-ai-portal.jp/api/admin/health?key=${ADMIN_HEALTH_KEY}" | jq '.services[] | select(.name|test("GA4|Search"))'
```

## 1. GA4 稼働化作業

### 1.1 GCP / GA4 側（一度きり）

| # | 作業 | 完了確認方法 |
|---|------|--------------|
| 1 | GA4 プロパティ作成（未作成の場合）。データストリームに `https://www.anzen-ai-portal.jp` を登録 | GA4 管理画面 → データストリームに測定ID `G-XXXXXXXXXX` が表示される |
| 2 | サービスアカウント作成（GCP Console → IAM → サービスアカウント）。JSON キーをダウンロード | `client_email` が控えられている |
| 3 | GA4 管理画面 → プロパティ設定 → アクセス管理 で上記サービスアカウントを「閲覧者」で追加 | アクセス管理一覧に表示される |

### 1.2 Vercel 環境変数登録（Production スコープ）

| 変数名 | 値 |
|--------|----|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | 1.1-1 の `G-XXXXXXXXXX` |
| `GA4_PROPERTY_ID` | 1.1-1 のプロパティID（数値、10桁前後） |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | 1.1-2 のJSON全文を文字列として（改行は `\n` でエスケープ） |

登録後 **再デプロイ必須**（Deployments → 最新 → ⋯ → Redeploy、または空コミット push）。

### 1.3 稼働確認（デプロイ後10分以内）

1. ホームページを別ブラウザで開き、GA4 リアルタイムで自セッションが見えること
2. `/stats` を開き、上部バッジが「ライブ」表示で DAU/PV に実数が入ること
3. セルフチェック手順 1 と 3 がそれぞれ稼働判定になること

## 2. GSC 稼働化作業

### 2.1 GCP 側 OAuth クライアント作成（一度きり）

`docs/gsc-oauth-setup.md` 全手順に従う。要約:

| # | 作業 |
|---|------|
| 1 | GCP Console → APIs & Credentials → OAuth クライアント ID 作成（Web application） |
| 2 | Authorized redirect URI に **`http://localhost:8765/oauth2/callback`** を完全一致で追加 |
| 3 | OAuth consent screen を External / Testing で構成（テストユーザーに `kenshi.ycc@gmail.com` を追加） |

### 2.2 Vercel 環境変数 2本を先に登録

| 変数名 | 値 |
|--------|----|
| `GSC_OAUTH_CLIENT_ID` | 2.1-1 のクライアント ID |
| `GSC_OAUTH_CLIENT_SECRET` | 2.1-1 のシークレット |

### 2.3 ローカルで refresh token 取得

```bash
export GSC_OAUTH_CLIENT_ID=<step 2.2 と同じ値>
export GSC_OAUTH_CLIENT_SECRET=<step 2.2 と同じ値>
node scripts/etl/gsc-oauth-init.mjs
```

ブラウザが開き `kenshi.ycc@gmail.com` で同意 → ターミナルに refresh token が出力される（ファイルには書き出されない）。

### 2.4 Vercel に3本目を登録 + 再デプロイ

| 変数名 | 値 |
|--------|----|
| `GSC_OAUTH_REFRESH_TOKEN` | 2.3 の出力値 |

再デプロイ後 `curl https://www.anzen-ai-portal.jp/api/search-console | jq '.source'` が `"gsc"` を返せば稼働。

### 2.5 OAuth アプリを Production に Publish（推奨）

Testing モードのままだと refresh token が **7日で失効**する。GCP Console の OAuth consent screen → Publish App を押下（Google の verification は scope が sensitive かつ単一ユーザー利用のため不要）。
Production 公開を選ばない場合、週次で 2.3 を再実行する運用が必要。

## 3. GSC データ取得開始予測

| ステップ | 開始タイミング |
|----------|--------------|
| API 経由でデータ取得 | 環境変数3本セット + 再デプロイ完了直後（即時） |
| GSC 側で過去データ蓄積 | サイトを既に GSC に登録済なら過去16ヶ月分が即取得可能 |
| サイト未登録の場合 | プロパティ登録 → 所有権確認 → 約2-3日で impressions 集計開始（クリック実数は検索流入が発生してから） |

GSC プロパティ `https://www.anzen-ai-portal.jp/` が `kenshi.ycc@gmail.com` で**所有権確認済み**かは GSC コンソール上で要確認（未確認なら `GOOGLE_SITE_VERIFICATION` を Vercel 環境変数に追加して再デプロイ → GSC で「メタタグ」方式で確認）。

## 4. 作業件数サマリ

| カテゴリ | 件数 | 概算工数 |
|----------|------|----------|
| GCP / GA4 管理操作 | 3件（プロパティ作成・サービスアカウント・閲覧者追加） | 30-40 分 |
| GCP OAuth クライアント作成 | 1件（consent screen 含む） | 15-20 分 |
| ローカル refresh token 取得 | 1件 | 5 分 |
| Vercel 環境変数登録 | 6本（GA4 計測 + GA4 Data API + GSC OAuth 3本） | 10 分 |
| 再デプロイ + 稼働確認 | 2回 | 15 分 |
| **合計** | — | **約 1.5 時間（GA4 既設定済みなら 30-45 分）** |

## 5. 既知の落とし穴

| 症状 | 原因 / 対処 |
|------|-------------|
| `/api/search-console` が `source: "mock"`、`note: "credentials missing"` | 環境変数3本のいずれかが Production スコープに未登録 |
| `/api/search-console` が `source: "mock"`、`note: "GSC 401: invalid_grant"` | refresh token 失効（7日 Testing 制限 / パスワード変更 / 手動 revoke）→ 2.3 を再実行 |
| `/api/search-console` が `source: "mock"`、`note: "GSC 403"` | OAuth ユーザーが該当プロパティの所有者ではない。GSC で `kenshi.ycc@gmail.com` の所有権確認状況を確認 |
| init script で `redirect_uri_mismatch` | OAuth クライアントの redirect URI が `http://localhost:8765/oauth2/callback` と完全一致していない |
| GA4 リアルタイムに自セッションが出ない | (a) ブラウザに広告ブロッカー (b) `NEXT_PUBLIC_GA_MEASUREMENT_ID` が typo (c) ビルドキャッシュにより未反映 → 強制再デプロイ |
