# 通知ライト実装（鍵なし・Path A維持） — 2026-07-11 ③章

社長方針「VAPID鍵は発行しない・新規の環境変数/シークレット/外部サービス契約/DBスキーマ変更なし」の制約下で、
今の構成でできる通知体験を実装した記録。鍵を使う本Pushは**未実装**（着手禁止のPath A維持。
発行時の手順書は `docs/vapid-push-setup-guide-2026-07-11.md`）。

## できること／できないこと（正直な整理）

| 経路 | 届く条件 | 実装 |
|---|---|---|
| サイト内通知センター（ベル） | サイトを開いたとき | ✅ 全ページのヘッダー常設 |
| 画面表示中のOS通知 | 対象ページを**開いている**タブがある間 | ✅ /notifications 設定・/signage トグル |
| メール配信 | 購読登録 | ✅ 既存（Resend）を継続 |
| RSS購読 | ユーザー側ツールが取得 | ✅ 法改正/警報/重大災害/新着すべて |
| **閉じている端末へのPush** | — | ❌ **VAPID鍵発行後**（互換設計済み・手順書あり） |

UI上も「ページを開いているタブからのみ発火します。ブラウザを閉じている端末には届きません」を
/notifications・サイネージトグルの title に明記している（誤解させない）。

## 構成

- 集約フィード `GET /api/notify/feed?pref=JP-13`
  - 気象警報（気象庁 bosai JSON・runtime 30分キャッシュ・注意報以上）＋
    新着ハブ `buildNewsHubItems()`（法改正・通達・重大災害事例・事故速報・報道）を
    `SiteNotification[]` に正規化して返す。CDN s-maxage=300。
  - サーバーは購読情報を一切持たない（既読・設定は端末内 localStorage
    `safe-ai:notif-read:v1` / `safe-ai:notif-settings:v1`＝backup.ts の一括バックアップ対象）。
- ベル `NotificationBell`（`components/notifications/notification-bell.tsx`）
  - app-shell のモバイルヘッダー＋PCトップバーに常設。15分ポーリング（非表示タブは休止）。
  - 未読バッジ（警報級を含むときは赤）。パネルで既読管理・カテゴリ表示・一次情報リンク。
  - 設定ONかつ許可済みのとき、警報級の新着は `maybeShowOsNotifications` でOS通知
    （通知済みIDを端末内に永続化しリロード再通知しない）。
- サイネージ `SignageOsNotifier`
  - 既存の15分refreshに便乗し、選択地点の警報**コード増分**でのみOS通知
    （初回スナップショット・継続・解除では発火しない＝RTLテストで機械固定）。
  - トグルは `signage-os-notify`（signage-danger-autospeak と同じ端末内保存の作法）。
- RSS `GET /feed/weather-alerts.xml`
  - 警報・特別警報が発表中の都道府県一覧（注意報はノイズのため除外）。既存 `/feed/*` の
    コンプラ方針（自サイト生成の事実サマリ＋出典リンク）を踏襲。Cache 5分/30分。
- `public/sw.js` に `notificationclick` を追加（タップ無反応の解消・将来push互換）。

## 将来の本Push互換

- `SiteNotification`（feed-types.ts）を push payload にそのまま流用できる。
- 発行後に追加するもの: `web-push` 依存・`/api/push/subscribe`・`/api/notify/push-weather-alert`・
  `push_subscriptions` テーブル・購読UI（設計は T8ドラフト Part B・手順書に記載）。

## 検証

- vitest: notification-store 4件・SignageOsNotifier 発火実測3件（増分のみ発火・OFFで不発・リロード再通知なし）
- Playwright無読: `docs/third-party-reviews/scripts/notifications-light-noread-2026-07-11.mjs`
  （ベル・パネル・既読・/notifications 設定・テスト通知発火・フィードAPI・RSS 2種）
