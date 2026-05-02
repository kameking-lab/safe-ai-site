# STRIPE_WEBHOOK_SECRET Development 設定判断

調査日: 2026-05-02  
対象変数: `STRIPE_WEBHOOK_SECRET`

---

## 現状

| 環境 | 推奨設定 | 理由 |
|------|----------|------|
| **Production** | ✅ 必須 | Stripe ダッシュボードの本番 Webhook エンドポイントに紐づく署名シークレット |
| **Preview** | ✅ 推奨 | Vercel Preview の URL でテスト用 Webhook エンドポイントを作成した場合 |
| **Development** | ⚠️ 条件付き | Stripe CLI を使う場合は CLI が別途シークレットを発行 |

---

## 判断: Development 環境に `STRIPE_WEBHOOK_SECRET` を設定すべきか

### 結論: **Stripe CLI 経由のローカルテストを使う場合は設定しない（CLI が別シークレットを使用）**

#### 理由

1. **Stripe CLI は独自の Webhook シークレットを生成する**  
   `stripe listen --forward-to localhost:3000/api/webhooks/stripe` 実行時に  
   `whsec_<ランダム文字列>` が表示される。これが Development 用シークレット。

2. **本番 / Preview のシークレットをローカルで共有するのは危険**  
   本番シークレットが `web/.env.local` に残ると漏洩リスクが高まる。

3. **コードはすでにオプション対応済み**  
   `web/src/app/api/webhooks/stripe/route.ts:33` の実装を確認:
   ```typescript
   const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
   if (!webhookSecret) {
     // 未設定時は署名検証をスキップ or エラー返却
   }
   ```
   → 未設定時にクラッシュしない設計であれば、Development では設定なしでも安全。

---

## Development でのローカル Webhook テスト手順

```bash
# 1. Stripe CLI のインストール（未インストールの場合）
# https://stripe.com/docs/stripe-cli

# 2. ログイン
stripe login

# 3. Webhook 転送開始 (このコマンドで表示される whsec_xxx を .env.local に設定)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# → "Your webhook signing secret is whsec_xxxxxxxx" と表示される

# 4. web/.env.local に設定
# STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx（CLI が表示した値）

# 5. Stripe イベントの発火テスト
stripe trigger payment_intent.succeeded
```

---

## Preview 環境の Webhook 設定手順

Preview デプロイで Webhook をテストする場合:

1. [Stripe ダッシュボード](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. **Add endpoint** → URL: `https://<preview-url>.vercel.app/api/webhooks/stripe`
3. イベント: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. エンドポイントの **Signing secret** をコピー
5. Vercel Preview 環境変数に `STRIPE_WEBHOOK_SECRET=<シークレット>` を設定

---

## アクションアイテム

| アクション | 担当 | 優先度 |
|------------|------|--------|
| Production の `STRIPE_WEBHOOK_SECRET` がVercel に設定済みか確認 | オーナー | 高 |
| Preview Webhook エンドポイントが必要か判断 | オーナー | 中 |
| Development は Stripe CLI を使ったローカルテストを標準化 | オーナー | 低 |

---

## 最終決定

```
STRIPE_WEBHOOK_SECRET:
  Production  → 必須設定 (本番 Webhook エンドポイントのシークレット)
  Preview     → 推奨設定 (Preview用エンドポイントが存在する場合)
  Development → 設定しない (Stripe CLI の whsec を .env.local に個人設定)
```
