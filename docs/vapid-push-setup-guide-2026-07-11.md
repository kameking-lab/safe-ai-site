# Web Push（VAPID）鍵発行 5分手順書 — オーナー向け

- 種別: **手順書のみ（Path A維持）**。鍵を使う本Pushの実装は未着手（着手禁止の方針どおり）。
- 前提: 現在の通知ライト実装（2026-07-11・③章）は鍵なしで動いており、この手順は**任意**。
  実施すると「閉じている端末にも届くプッシュ通知」への拡張が可能になる。
- 関連設計: `docs/fable-diagnosis-2026-07-02/T8-signage-settings-and-web-push-design-drafts.md` Part B（データ設計・送信フロー詳細）。

## 手順（合計 約5分）

### 1. 鍵ペアを作る（1分）

ローカルPCのターミナルで（Node.js があれば何も入れずに実行可能）:

```bash
npx web-push generate-vapid-keys
```

出力例:

```
Public Key:  BClxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Private Key: 7Fxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- この2行を控える（Private Key は秘密情報。チャット等に貼らない）。
- `npx` の一時利用のみで、リポジトリへの依存追加はこの時点では不要。

### 2. Vercel に環境変数を設定する（3分）

Vercel ダッシュボード → safe-ai-site → Settings → Environment Variables で3件追加
（対象環境は Production / Preview / Development すべて）:

| 変数名 | 値 |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 手順1の Public Key |
| `VAPID_PRIVATE_KEY` | 手順1の Private Key |
| `VAPID_SUBJECT` | `mailto:kenshi.ycc@gmail.com`（通知の連絡先。変更可） |

### 3. Supabase に購読テーブルを作る（1分）

Supabase ダッシュボード → SQL Editor で実行（設計ドラフト B-4 のDDLそのまま）:

```sql
create table if not exists push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  prefecture    text,
  created_at    timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
-- service_role のみが読み書き（anonポリシーは作らない＝既存テーブルと同じ流儀）
```

### 4. 完了の連絡

上記3手順が済んだら、実装タスクに「VAPID鍵設定済み」と伝えるだけで、以下が実装可能になる
（現在の通知ライトはそのまま土台になる＝互換設計）:

- 購読API `POST /api/push/subscribe`（`web-push` npm依存の追加を含む＝この時点で依存追加の承認も兼ねる）
- 送信API `POST /api/notify/push-weather-alert`（既存 `CRON_SECRET` 認証・Resendメールと並走）
- `/notifications` の「プッシュ通知を有効にする」ボタン（既存の設定UIに追加）
- `public/sw.js` の push ハンドラ実データ化（プレースホルダー実装済み・notificationclick 対応済み）

## 互換設計のポイント（実装済みの土台）

- 通知payload型 `SiteNotification`（`web/src/lib/notifications/feed-types.ts`）は
  push payload としてそのまま `showNotification(title, {body, data:{url}})` に流せる形。
- 集約フィード `/api/notify/feed` が「何をいつ通知するか」の正本。push化の際は
  同じ判定（警報級のみ等）をサーバー側 cron に移すだけ。
- 既読・設定は端末内（localStorage）に隔離済みのため、購読テーブル追加と競合しない。

## やらないこと（この手順書の範囲外）

- 鍵発行前の push 実装（Path A）／新規外部サービスの契約／LINE・Slack連携（別途判断）。
