# IOS3B 公開前確認・所有者対応待ち

今回のコード作業では本番DB・外部設定・実キー呼び出し・push・デプロイを行っていない。

1. `web/prisma/migrations/20261103000000_ios3b_shared_entitlements/migration.sql` は追加13テーブルの提案DDL。所有者承認後にバックアップ・影響確認・移行・復旧手順を準備して適用する。今回migrate deploy/db pushは禁止のため未実施。
2. 独立した検証DBで競合する最終1枠・購入予約・Webhook重複と逆順・返金・権利失効・アカウント切替・送信直前の通知停止を確認する。今回の競合テストはモックDBであり、実PostgreSQL確認ではない。
3. Appleに税込月額980円の自動更新1商品、RevenueCatに同じ商品・Offering・`anzen_pro`を設定する。実商品IDとキーは環境設定へ保存。購入の別会員移管方針は所有者が固定し、既存Stripe会員の有効期間・二重購入防止を確認する。
4. 必要な設定名：`MOBILE_LEDGER_ENABLED`、`MOBILE_IAP_ENABLED`、`REVENUECAT_IOS_PUBLIC_SDK_KEY`、`REVENUECAT_IOS_PRODUCT_ID`、`REVENUECAT_IOS_OFFERING_ID`、`REVENUECAT_SECRET_API_KEY`、`REVENUECAT_WEBHOOK_AUTHORIZATION`、任意の `REVENUECAT_WEBHOOK_SIGNING_SECRET`。秘密値をGit・ログ・報告へ書かない。

   購入の所有者照合には別途 `REVENUECAT_V2_SECRET_API_KEY`（`customer_information:subscriptions:read`）、`REVENUECAT_PROJECT_ID`、`REVENUECAT_IOS_V2_PRODUCT_ID` が必要。最後の値はApp Storeの商品IDではなくRevenueCat v2のproduct resource ID。v1の権利・有効期限とv2の安定したstore subscription ID・元会員を照合する。未設定時は販売停止。更新ごとのv1取引IDや購入日時を所有者キーに代用しない。旧実装の台帳が既に適用されていた場合は、誤った旧IDの照合・移行計画を別途承認してから公開する（今回本番適用なし）。
5. Apple認証：`AUTH_APPLE_ID`・`AUTH_APPLE_SECRET`とApple側のReturn URL・アプリ関連設定。Google有効時はApple必須。会員統合をメール一致で自動実施しない。審査用Sandbox会員は所有者がDBで明示指定する。
6. AI単価：`MOBILE_AI_PRICED_MODEL`、`MOBILE_AI_INPUT_JPY_PER_MILLION`、`MOBILE_AI_OUTPUT_JPY_PER_MILLION`、`MOBILE_AI_COST_MARGIN`（1.25以上）を確認する。未設定・価格不明では有料推論を止める。月5万円の原価ガードを外さない。
7. APNs：`MOBILE_APNS_ENABLED`、`MOBILE_APNS_ENVIRONMENT`、`APNS_KEY_ID`、`APNS_TEAM_ID`、`APNS_PRIVATE_KEY`、`APNS_TOPIC`、ビルド時の `ANZEN_APNS_ENVIRONMENT`。署名・APNs権限・worker起動を整備する。`MOBILE_MAINTENANCE_AUTHORIZATION` を専用管理する。旧Web Push停止とWebのPro通知移行を公開前に確認する。
8. Stripe：`STRIPE_ANZEN_PRO_MONTHLY_PRICE_ID` と `STRIPE_MANAGE_ONLY_PORTAL_CONFIGURATION_ID` を用意する。新販売の価格・税込・規約を整合させる。既存契約の値上げ・減額・移管は勝手に行わない。旧有料会員の台帳照合・価格移行は所有者承認後。
9. macOSでSPM・Swift・Keychain・静的Router・印刷・Speech・Push・IAPをビルド検証する。WindowsではiOSコンパイルと実機検証ができない。Codemagic実行・署名・App Store申請は未実施。
10. 実機とSandboxで購入・取消・保留・復元・更新・返金・失効・Apple/Google切替・再インストール・オフライン・通知の背景受信を確認する。APIセッションは30日で失効し、通知継続には再ログインが必要。約1.13 GiBの展開済み同梱資産について、IPA圧縮後サイズと初回起動を確認する。
11. 利用規約・プライバシー・App Privacy・審査説明を確認する。端末認識音声・RevenueCatへの会員ID/購入情報・通知先の保存を反映する。RA生成はサイト側で停止中であることを商品説明にも一致させる。4.2のオフライン・共有・通知は実機で証跡を残す。

一次資料：

- https://www.revenuecat.com/docs/getting-started/installation/capacitor
- https://www.revenuecat.com/docs/integrations/webhooks
- https://www.revenuecat.com/docs/customers/identifying-customers
- https://developer.apple.com/app-store/review/guidelines/
