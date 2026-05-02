# 環境変数 命名ガイド (2026-05-02)

プロジェクト: ANZEN AI (safe-ai-site)  
作成日: 2026-05-02

---

## 命名規則

| ルール | 説明 |
|--------|------|
| `NEXT_PUBLIC_*` | ブラウザに公開する変数。クライアントサイドで `process.env.NEXT_PUBLIC_XXX` として参照 |
| `*_KEY`, `*_SECRET`, `*_TOKEN` | シークレット。**絶対に `NEXT_PUBLIC_` プレフィックス禁止** |
| 大文字スネークケース | `GEMINI_API_KEY`、`BLOB_READ_WRITE_TOKEN` 等 |
| サービス名プレフィックス | `STRIPE_*`、`AUTH_*`、`RESEND_*`、`REVISIONS_*` でグルーピング |

---

## 正規変数一覧

### フロントエンド公開変数 (NEXT_PUBLIC_*)

| 正式名 | 用途 | 設定環境 | .env.example 記載 |
|--------|------|----------|-------------------|
| `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` | Amazon アソシエイトタグ | Production, Preview | ✅ |
| `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` | 楽天アフィリエイトID | Production, Preview | ✅ (修正済み) |
| `NEXT_PUBLIC_FORMSPREE_ID` | お問い合わせフォームID | Production, Preview | ✅ |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` | Stripe プロプランの Price ID | Production, Preview | ✅ |
| `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM` | Stripe スタンダードプランの Price ID | Production, Preview | ✅ |
| `NEXT_PUBLIC_SITE_URL` | 本番サイトURL (Stripe リダイレクト用) | Production, Preview | ✅ |
| `NEXT_PUBLIC_REVISIONS_INGEST_SOURCE` | 法改正データソース (`sample` or `real`) | Production, Preview | 追加推奨 |
| `NEXT_PUBLIC_API_MODE` | APIモード (`mock` or `live`) | Production | 追加推奨 |
| `NEXT_PUBLIC_WEATHER_API_MODE` | 気象APIモード上書き | Production | 追加推奨 |
| `NEXT_PUBLIC_PAID_MODE` | 課金機能フラグ (`false` or `true`) | 全環境 | 追加推奨 |
| `NEXT_PUBLIC_FORCE_ERROR` | エラーUI強制表示 (デバッグ専用) | Development のみ | 不要 |
| `NEXT_PUBLIC_FORCE_ERROR_TRANSPORT` | エラー伝達方式 (デバッグ専用) | Development のみ | 不要 |

### サーバーサイドシークレット

| 正式名 | 用途 | 設定環境 |
|--------|------|----------|
| `GEMINI_API_KEY` | Gemini API認証 (全AIチャット・要約機能) | Production, Preview, Development |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob ストレージ読み書き | Production, Preview |
| `STRIPE_SECRET_KEY` | Stripe 決済処理 | Production, Preview |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 署名検証 | Production (Preview は別途判断) |
| `AUTH_SECRET` | NextAuth セッション署名鍵 | Production, Preview, Development |
| `AUTH_GOOGLE_ID` | Google OAuth クライアントID | Production, Preview, Development |
| `AUTH_GOOGLE_SECRET` | Google OAuth クライアントシークレット | Production, Preview, Development |
| `DATABASE_URL` | Prisma/Postgres 接続URL | Production, Preview (Development は Supabase local) |
| `RESEND_API_KEY` | Resend メール送信APIキー | Production, Preview |
| `RESEND_AUDIENCE_ID` | Resend オーディエンスID | Production, Preview |
| `NOTIFY_FROM` | 送信元メールアドレス (デフォルトあり) | Production, Preview |
| `CRON_SECRET` | Cron ジョブ認証トークン | Production, Preview |
| `REVISIONS_REAL_SOURCE_URL` | 法改正リアルデータ取得URL | Production (real モード時) |
| `REVISIONS_REAL_SOURCE_FORMAT` | リアルデータフォーマット | Production (real モード時) |
| `REVISIONS_REAL_SOURCE_ALLOW_HOSTS` | 許可ホストリスト | Production (real モード時) |
| `REVISIONS_REAL_SOURCE_PAYLOAD_JSON` | テスト用ペイロード注入 | Development のみ |

---

## 廃止・削除予定変数

| 変数名 | 状態 | 対応 |
|--------|------|------|
| `GOOGLE_API_KEY` | `GEMINI_API_KEY` のフォールバックとして残存 | Vercel 設定済みの場合は放置可。新規設定不要 |
| `NEXT_PUBLIC_RAKUTEN_AFID` | `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` への改名前の名前 | Vercel から削除して正式名に移行 |
| `NEXT_PUBLIC_FEEDBACK_FORM_URL` | コード未参照 | Vercel から削除可 |
| `NEXT_PUBLIC_GSC_VERIFICATION` | `layout.tsx` に直書き済みで不使用 | Vercel から削除可 |

---

## `.env.example` 修正履歴

| ファイル | 変更内容 | 日付 |
|----------|----------|------|
| `web/.env.example` | `NEXT_PUBLIC_RAKUTEN_AFID` → `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` に修正 | 2026-05-02 |

---

## Vercel 設定コマンド例

```bash
# NEXT_PUBLIC_PAID_MODE を全環境に追加
echo "false" | vercel env add NEXT_PUBLIC_PAID_MODE production
echo "false" | vercel env add NEXT_PUBLIC_PAID_MODE preview
echo "false" | vercel env add NEXT_PUBLIC_PAID_MODE development

# NEXT_PUBLIC_SITE_URL を Production に設定
echo "https://safe-ai-site.vercel.app" | vercel env add NEXT_PUBLIC_SITE_URL production

# 楽天アフィリエイトID の命名修正（旧名削除 → 新名追加）
vercel env rm NEXT_PUBLIC_RAKUTEN_AFID production  # 既存があれば
echo "<affiliate-id>" | vercel env add NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID production
```

> **注意**: `vercel env add` はプロジェクトリンク (`vercel link`) 後に実行可能。  
> Vercel ダッシュボードから GUI で設定しても同等。
