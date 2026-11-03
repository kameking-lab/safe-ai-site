# IOS3B API契約

M3で未実装だったAPIをサイトのRoute Handlerとして実装。認証・共通権利・AIの安全条件をクライアントから緩和しない。

## 認証・権利

- `POST /api/mobile/v1/auth/start`：S256 PKCE。10分有効の認可フローを作成。
- `GET /api/mobile/v1/auth/authorize`：AppleまたはGoogleのサイト認証。Googleを有効にする場合はAppleも必須。認可codeだけを `anzenai://auth/callback` へ返す。
- `POST /api/mobile/v1/auth/exchange`：code・verifierを照合して一度だけセッションを発行。保存はハッシュのみ。端末はKeychainを使用。
- `POST /api/mobile/v1/auth/logout`：本人のセッションを失効し、関連する通知登録を停止。
- `GET /api/me/entitlements`：DBのStripe状態・検証済みApple権利を投影する。古いJWTのplanやクライアントのPro申告を正本にしない。
- `GET /api/mobile/v1/account`：本人のSDS履歴とアカウント情報。

会員APIはprivate/no-store。無効なBearerを別会員のCookie認証へフォールバックしない。Cookie認証の更新にはOrigin検査を行う。

## 購入・照合

- `GET /api/mobile/v1/billing/config`：公開SDKキー・商品・Offering・価格ポリシー・認証の準備状態。秘密APIキーは返さない。
- `POST /api/billing/purchase-intents`：Apple/Stripeを再確認し、会員ごとの排他ロックで購入予約。時間経過だけで保留を解放しない。
- `POST /api/billing/reconcile`：RevenueCatの最新subscriberを確認し、商品・store・環境・有効期限・`anzen_pro`を照合する。
- `POST /api/billing/cancel-intent`：StoreKitの明示的キャンセル後に再照合して解放。保留購入は解放しない。
- `POST /api/webhooks/revenuecat`：Authorizationを必須とし、任意でraw body HMACと5分の時刻検査。永続inboxで重複を除去し、順序を信用せず最新状態を再照合する。
- `POST /api/mobile/v1/maintenance`：専用認証でinbox再試行・警報outbox・期限切れ短期情報を処理。cron設定は変更していない。

権利は5分を超えたら提供元へ再照合する。障害時の既確認権利の猶予は最大24時間かつ支払済期限まで。失効・未払い・未確認は新規購入で解決させず確認待ちにする。通常会員にSandbox権利を付与しない。審査・テスト用は所有者がDBで指定する `MobileIdentity.billingEnvironment=SANDBOX` の会員のみ。今回DB指定は行っていない。

既存Stripeの有効会員は優先してPro表示。Stripe Checkoutも共通購入予約を確認する。Stripe Portalはサーバーで指定した管理専用Configurationを要求する。旧契約の価格・数量・期間は自動変更しない。

## AI・データ

- `GET /api/mobile/v1/capabilities`：サーバー安全契約・権利・日次枠・残数と停止状態。
- `POST /api/mobile/v1/ai`：既存chatbot処理を使い、同じ同意・根拠・安全検証を行う。requestIdを共通操作IDとして扱う。
- `/api/chatbot`・`/stream`・`/no-script`・`/api/chat`：会員のJST日次枠を共有し、Proは60秒10回まで。同じ操作の再送で再実行・再消費しない。
- `GET /api/mobile/v1/statistics`・`home-news`：既存公開データを投影。
- `GET /api/mobile/v1/chemical-ledger`：本人が所属する組織の台帳だけを取得。

原価予約はKYを含む実際のGemini呼び出し境界に適用する。未価格のモデルや上限不明の推論は停止。UTF-8入力サイズ・出力最大2048トークン・設定単価・安全係数で上限を予約し、提供者失敗も保守的に計上する。DB不明時に原価ガードを迂回しない。月5万円上限、無料分は4.5万円で先行停止。

現行のRA評価生成はウェブと同じ停止中。公的物質情報・SDS検索だけでRA完了や利用枠消費にしない。検証不能・同意不成立・根拠なしの結果を有料AI成功と偽装しない。ネイティブHTTPのSSEは受信完了後に既存リーダーへ渡すため、途中経過はまとめて表示される。

## 地点・通知

`GET/POST/PATCH/DELETE /api/me/weather-locations` は本人の地点を所有者検査・排他ロック付きで保存。無料1地点、Pro10地点。主地点を保持し、失効時の追加地点は削除せず停止する。全国地図や別地域の一時閲覧は無料。

`POST/DELETE /api/me/push-devices` は本人の有効セッションとPro権利を確認してAPNs先を保存。workerは送信直前にも権利・セッション・地点を再検査する。鮮度不明や取得失敗を警報解除としない。都道府県単位の通知であり、市町村精度を保証しない。同じ警報は安定IDで重複排除する。

APIセッションの期限は30日。長期未利用やログアウトで通知は停止し、再ログイン・再登録が必要。共通台帳を有効にする際は旧匿名Web Pushの登録・送信を停止し、無料通知への迂回を防ぐ。WebのPro通知移行は所有者側の公開前確認事項。
