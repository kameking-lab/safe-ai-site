# Stripe決済フロー・Webhook処理・エラーハンドリング

作成日: 2026-04-26

---

## 1. 全体フロー

```
ユーザー → /pricing
  → [プラン選択] PricingCheckout コンポーネント
  → POST /api/stripe/checkout  ← Checkout Session 作成
  → Stripe Checkout (hosted page)
    → 決済成功 → /pricing/success?session_id=...
    → 決済キャンセル → /pricing
  → Stripe → POST /api/webhooks/stripe  ← Webhook
  → DB (Subscription テーブル更新)
  → /account  ← プラン状況確認
    → [プラン管理] ManagePlanButton
    → POST /api/stripe/portal  ← Customer Portal URL 生成
    → Stripe Customer Portal
      → 解約・プラン変更・支払い方法変更
      → 戻る → /account?portal_return=1
```

---

## 2. APIエンドポイント一覧

| エンドポイント | メソッド | 役割 |
|---|---|---|
| `POST /api/stripe/checkout` | POST | Checkout Session作成・Customer紐付け |
| `POST /api/stripe/portal` | POST | Customer Portal URL生成 |
| `POST /api/webhooks/stripe` | POST | Webhook受信・DB同期 |

---

## 3. Webhookイベント処理一覧

| イベント | 処理内容 |
|---|---|
| `checkout.session.completed` | Subscription upsert、planName/status=active、Customer/Subscription ID紐付け |
| `customer.subscription.created` | subscription.updateMany (self-healing付き) |
| `customer.subscription.updated` | planName・status・期間更新 (self-healing付き) |
| `customer.subscription.deleted` | planName=free・status=canceled |
| `invoice.payment_failed` | status=past_due |
| `invoice.payment_succeeded` | status=active（past_due → active 自己修復） |

### 冪等性保証

- 署名検証後、`StripeEvent.stripeEventId` で重複チェック
- 処理完了後にイベントIDをDBへ記録
- `StripeEvent` テーブルが未作成でも `try/catch` でフォールスルー（`prisma db push` 前でもビルド通過）

### リトライロジック

- DB書き込みは `withRetry(fn, 3回, 指数バックオフ 200ms→400ms→800ms)` でラップ
- 全リトライ失敗時は HTTP 500 を返し、Stripe側が再試行する

### 自己修復（self-healing）

- `customer.subscription.updated` で `stripeSubscriptionId` に一致するレコードが0件の場合
- `stripeCustomerId` で検索し `stripeSubscriptionId` を紐付けて更新
- 紐付けも失敗した場合は警告ログのみ（500は返さない）

---

## 4. SubscriptionステータスとDB状態

| Stripe status | DB planName | DB status | UIバナー |
|---|---|---|---|
| active | standard / pro / free | active | なし（緑バッジ） |
| past_due | 変わらず | past_due | 赤バナー: 支払い方法の更新を促す |
| unpaid | 変わらず | unpaid | 赤バナー: 対応を促す |
| canceled | free | canceled | 琥珀バナー: 利用期限と再加入案内 |

---

## 5. エラーケースと対応

### 決済失敗

- `invoice.payment_failed` → status=past_due → アカウントページに赤バナー表示
- Stripe Customer Portal から支払い方法を更新 → `invoice.payment_succeeded` → status=active に自動回復

### サブスク切れ（canceled）

- `customer.subscription.deleted` → planName=free, status=canceled
- アカウントページに「利用期限（currentPeriodEnd）まで利用可能」旨を表示
- 「再加入する」ボタン → /pricing → 既存の `stripeCustomerId` を引き継いで再チェックアウト

### 再加入時のCustomer引き継ぎ

- `POST /api/stripe/checkout` で `prisma.subscription.findUnique({ where: { userId } })` を確認
- `stripeCustomerId` が既存ならそのままCheckout Sessionに渡す
- Stripe側で同一顧客として処理されるため請求履歴が継続

### DB未設定（DATABASE_URL未設定）

- `/api/webhooks/stripe` → HTTP 503
- `/api/stripe/checkout` → Customer作成はスキップ、Checkoutは続行可能
- `/api/stripe/portal` → HTTP 503
- `/account` → DB読み込みスキップ、フリープラン表示

---

## 6. 必要な環境変数

| 変数名 | 必須 | 説明 |
|---|---|---|
| `STRIPE_SECRET_KEY` | 決済利用時 | Stripeシークレットキー |
| `STRIPE_WEBHOOK_SECRET` | Webhook利用時 | Webhookエンドポイントシークレット |
| `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM` | 決済利用時 | スタンダードプランの価格ID |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` | 決済利用時 | プロプランの価格ID |
| `NEXT_PUBLIC_SITE_URL` | 決済利用時 | success/cancel/return URLのベース |
| `DATABASE_URL` | サブスク管理時 | PostgreSQL接続文字列 |

---

## 7. DBスキーマ（Subscription + StripeEvent）

```prisma
model Subscription {
  id                   String    @id @default(cuid())
  userId               String    @unique
  stripeCustomerId     String?   @unique
  stripeSubscriptionId String?   @unique
  stripePriceId        String?
  planName             String    @default("free")  // free | standard | pro
  status               String    @default("active") // active | past_due | canceled | unpaid
  currentPeriodEnd     DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
}

model StripeEvent {
  id            String   @id @default(cuid())
  stripeEventId String   @unique  // 冪等性キー
  eventType     String
  processedAt   DateTime @default(now())
}
```

`StripeEvent` テーブルは `prisma db push` 後に有効になります。
テーブル未作成でもWebhookハンドラは動作しますが、冪等性保証はされません。

---

## 8. Vercelデプロイ時のWebhook設定手順

1. Stripeダッシュボード > 開発者 > Webhooks > エンドポイント追加
2. URL: `https://<your-domain>/api/webhooks/stripe`
3. 受信イベント:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. 生成された `Signing secret` を `STRIPE_WEBHOOK_SECRET` に設定

---

## 9. テスト用Stripeカード番号

| カード番号 | 動作 |
|---|---|
| `4242 4242 4242 4242` | 決済成功 |
| `4000 0000 0000 9995` | 決済失敗（insufficient_funds） |
| `4000 0000 0000 0341` | 決済成功後に自動失敗（past_dueテスト向け） |

有効期限: 任意の未来日、CVC: 任意3桁
