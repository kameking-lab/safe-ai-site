# Vercel 環境変数 棚卸しレポート

**実施日**: 2026-05-01  
**対象プロジェクト**: safe-ai-site (`prj_b2brgXdwQpnpmEN6gc3vtNFm6m7a`)  
**Vercel組織**: kameking-lab's projects (`team_fmzwEegB8SRsADNmwXkBUN34`)

---

## 0. 重要な発見: プロジェクトリンクのズレ

`web/.vercel/project.json` が **`prj_jKi1sU2tD2mX25vHrCfdSFi2BiBv`（プロジェクト名: "web"）** を指しているが、
実際にデプロイされているのは **`prj_b2brgXdwQpnpmEN6gc3vtNFm6m7a`（プロジェクト名: "safe-ai-site"）**。

Vercel CLIで `vercel env list` を実行すると「0 variables」と表示されるのはこのため。

---

## 1. Vercel 設定済み環境変数 (27件)

すべての環境（production / preview / development）に設定済み（※`STRIPE_WEBHOOK_SECRET`は本番・preview のみ）。

| キー名 | 全環境 | 備考 |
|--------|--------|------|
| `BLOB_READ_WRITE_TOKEN` | ✅ | Vercel Blob ストレージ |
| `DATABASE_URL` | ✅ | Neon Postgres (プール接続) |
| `DATABASE_URL_UNPOOLED` | ✅ | Neon Postgres (直接接続) |
| `GEMINI_API_KEY` | ✅ | Google Gemini AI |
| `NEON_PROJECT_ID` | ✅ | Neon 管理用 |
| `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` | ✅ | Amazon アフィリエイト |
| `NEXT_PUBLIC_API_MODE` | ✅ | mock/live 切り替え |
| `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` | ✅ | 楽天アフィリエイト |
| `NEXT_PUBLIC_REVISIONS_INGEST_SOURCE` | ✅ | 法改正データソース |
| `NEXT_PUBLIC_SITE_URL` | ✅ | サイトURL (Stripe用) |
| `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM` | ✅ | Stripe スタンダード価格ID |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` | ✅ | Stripe プロ価格ID |
| `PGDATABASE` | ✅ | Neon 自動設定 |
| `PGHOST` | ✅ | Neon 自動設定 |
| `PGHOST_UNPOOLED` | ✅ | Neon 自動設定 |
| `PGPASSWORD` | ✅ | Neon 自動設定 |
| `PGUSER` | ✅ | Neon 自動設定 |
| `POSTGRES_DATABASE` | ✅ | Neon 自動設定 |
| `POSTGRES_HOST` | ✅ | Neon 自動設定 |
| `POSTGRES_PASSWORD` | ✅ | Neon 自動設定 |
| `POSTGRES_PRISMA_URL` | ✅ | Neon Prisma 用 |
| `POSTGRES_URL` | ✅ | Neon 自動設定 |
| `POSTGRES_URL_NON_POOLING` | ✅ | Neon 自動設定 |
| `POSTGRES_URL_NO_SSL` | ✅ | Neon 自動設定 |
| `POSTGRES_USER` | ✅ | Neon 自動設定 |
| `STRIPE_SECRET_KEY` | ✅ | Stripe 秘密鍵 |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ | 本番・preview のみ（development 未設定） |

---

## 2. コード参照あり・Vercel 未設定（動作不能または機能無効）

### 🔴 重要度：高（設定しないと機能が壊れる）

| キー名 | 参照ファイル | 影響 |
|--------|------------|------|
| `AUTH_SECRET` | `src/auth.ts`, `src/proxy.ts` | Google認証が完全に無効 |
| `AUTH_GOOGLE_ID` | `src/auth.ts` | Google OAuth 不可 |
| `AUTH_GOOGLE_SECRET` | `src/auth.ts` | Google OAuth 不可 |
| `RESEND_API_KEY` | `api/notify/subscribe`, `api/notify/weather-alert` | メール送信・通知機能が動作しない |
| `CRON_SECRET` | `api/notify/weather-alert` | Cron認証が通らない（天気アラートが動作しない） |

### 🟡 重要度：中（機能の一部が動作しない）

| キー名 | 参照ファイル | 影響 |
|--------|------------|------|
| `RESEND_AUDIENCE_ID` | `api/notify/subscribe`, `api/notify/weather-alert` | メーリングリスト登録不可 |
| `NEXT_PUBLIC_FORMSPREE_ID` | `ContactForm.tsx` | お問い合わせフォームがメーラー起動にフォールバック |

### 🟢 重要度：低（任意・開発用・フォールバックあり）

| キー名 | 参照ファイル | 備考 |
|--------|------------|------|
| `GOOGLE_API_KEY` | `api/chat`, `api/chatbot` | `GEMINI_API_KEY` があるので問題なし |
| `NOTIFY_FROM` | notify routes | デフォルト値あり (`ANZEN AI <noreply@anzen-ai.com>`) |
| `STRIPE_WEBHOOK_SECRET` | (development 未設定) | 開発環境でのみ問題 |
| `REVISIONS_REAL_SOURCE_URL` | revisions 関連 | `NEXT_PUBLIC_REVISIONS_INGEST_SOURCE=sample` なら不要 |
| `REVISIONS_REAL_SOURCE_ALLOW_HOSTS` | revisions 関連 | 同上 |
| `REVISIONS_REAL_SOURCE_FORMAT` | `api/revisions` | 同上 |
| `REVISIONS_REAL_SOURCE_PAYLOAD_JSON` | `data/mock/law-revisions.ts` | 同上 |
| `NEXT_PUBLIC_WEATHER_API_MODE` | `lib/services/service-factory.ts` | 省略可（デフォルト動作） |
| `NEXT_PUBLIC_FORCE_ERROR` | `lib/services/service-factory.ts` | 開発テスト用のみ |
| `NEXT_PUBLIC_FORCE_ERROR_TRANSPORT` | `lib/services/service-factory.ts` | 開発テスト用のみ |

---

## 3. 照合リストとの差分

### A. 公開系

| 照合リストのキー | 状態 | メモ |
|----------------|------|------|
| `NEXT_PUBLIC_PAID_MODE` | ❌ コード参照なし | 未実装。将来用か削除候補 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | ❌ コード参照なし | GAタグが埋め込まれていない |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | ❌ コード参照なし | AdSense未実装 |
| `NEXT_PUBLIC_AMAZON_AFFILIATE_ID` | ⚠️ 名前不一致 | コードは `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` を使用。Vercel設定済み |
| `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` | ✅ 設定済み | |
| `NEXT_PUBLIC_SITE_URL` | ✅ 設定済み | |

### B. API系

| 照合リストのキー | 状態 |
|----------------|------|
| `GEMINI_API_KEY` | ✅ 設定済み |
| `DATABASE_URL` | ✅ 設定済み |
| `AUTH_SECRET` | ❌ **未設定（重要）** |
| `AUTH_GOOGLE_ID` | ❌ **未設定（重要）** |
| `AUTH_GOOGLE_SECRET` | ❌ **未設定（重要）** |

### C. 決済系

| 照合リストのキー | 状態 |
|----------------|------|
| `STRIPE_SECRET_KEY` | ✅ 設定済み |
| `STRIPE_WEBHOOK_SECRET` | ✅ 設定済み（本番・preview） |

### D. メール系

| 照合リストのキー | 状態 |
|----------------|------|
| `RESEND_API_KEY` | ❌ **未設定** |
| `CRON_SECRET` | ❌ **未設定** |

### E. 外部系

| 照合リストのキー | 状態 | メモ |
|----------------|------|------|
| `HF_TOKEN` | ❌ コード参照なし | HuggingFace未使用 |
| `MOSHIMO_PROMOTION_ID` | ❌ コード参照なし | もしもアフィリエイト未実装 |
| `A8_NET_MEDIA_ID` | ❌ コード参照なし | A8.net未実装 |

---

## 4. Vercel設定あり・コード参照なし（削除候補）

以下は Vercel Neon 連携が自動設定するシステム変数。アプリコードからは直接参照されていないが、
**削除不要**（Neon 統合の管理に使用、または Prisma が内部的に利用する可能性あり）。

- `DATABASE_URL_UNPOOLED`, `NEON_PROJECT_ID`
- `PGDATABASE`, `PGHOST`, `PGHOST_UNPOOLED`, `PGPASSWORD`, `PGUSER`
- `POSTGRES_DATABASE`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL_NO_SSL`, `POSTGRES_USER`

---

## 5. 優先設定リスト

### 今すぐ設定すべき（機能に影響あり）

```
# 認証（現在は認証機能が完全に無効化されている）
AUTH_SECRET=<openssl rand -base64 32 で生成>
AUTH_GOOGLE_ID=<Google Cloud Console で取得>
AUTH_GOOGLE_SECRET=<Google Cloud Console で取得>

# メール通知（通知機能が動作しない）
RESEND_API_KEY=<Resend ダッシュボードで取得>
RESEND_AUDIENCE_ID=<Resend ダッシュボードで取得>
CRON_SECRET=<openssl rand -base64 32 で生成>
```

### 将来的に設定（機能追加時）

```
# お問い合わせフォーム
NEXT_PUBLIC_FORMSPREE_ID=<Formspree プロジェクトID>

# Google Analytics（コード側の実装も必要）
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# AdSense（コード側の実装も必要）
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXX

# もしもアフィリエイト/A8.net（コード側の実装も必要）
MOSHIMO_PROMOTION_ID=
A8_NET_MEDIA_ID=
```

### 確認が必要な項目

- `NEXT_PUBLIC_PAID_MODE`: コードに参照なし。サブスク機能実装時に検討
- `NEXT_PUBLIC_AMAZON_AFFILIATE_ID` vs `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG`: `.env.example`と照合リストで名前が違う。どちらが正しいか確認

---

## 6. プロジェクトリンク修正の推奨

`web/.vercel/project.json` が誤ったプロジェクト ("web") を指している。
`vercel link` を正しい "safe-ai-site" プロジェクトに再実行することを推奨。

```bash
cd web
vercel link --project safe-ai-site --team kameking-labs-projects
```

---

*このレポートは 2026-05-01 に自動生成されました。環境変数の値は一切含まれていません。*
