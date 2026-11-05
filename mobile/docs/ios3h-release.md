# IOS3H: App Store Connectへの引継ぎ

## CIの確定仕様

- workflow: `anzen-ios-app-store`。`feat/ios-app-*` へのpush、変更対象 `mobile/**`・`web/**`・`codemagic.yaml`。webは直接importする正本なので対象に含める。
- Node 22.23.4。mobileとwebはそれぞれ固定npm lockfileを使う。webはlifecycleなしで導入し、Prismaは型生成だけを行う。DB操作は含まない。
- CM2のtsx ESM/CJS問題は過去問AIのTypeScript catalog loader固有。安全AIの生成entryは`.mjs`であり、そのcreateRequire修正を無条件移植しない。Node 22の通常typecheck/test/buildで検証する。
- SPMを維持。広告Podを使う過去問AIのCocoaPods設定は移植しない。SPMの `App.xcodeproj` を署名・build-ipa双方へ渡す。
- `capacitor:sync:after` で素材コピー・Ruby設定・読取検証を実行する。prepareだけでなく直接CLIでadd/syncした後も登録IDを復元する。`ios:test` は小さな隔離SPMプロジェクトで実CLIのaddと2回のsyncも実行する。
- `get-latest-testflight-build-number` はアップロード済みbuildの番号取得APIとして使用する。TestFlight配布の実行ではない。API失敗・非整数は停止、成功した空値は初回の0として+1。別workflowや手動uploadとの同時実行を避ける。
- `ios_signing` は `distribution_type: app_store` / `bundle_identifier: jp.anzen-ai-portal.app` の自動選択方式。profile名・certificate名を同じ設定に併記しない。
- `use-profiles` のexport optionsを検証してから、同じファイルをbuild-ipaに渡す。出力先はartifactと同じ `mobile/build/ios/ipa/*.ipa`。
- `publishing.app_store_connect.auth: integration`、`submit_to_testflight: false`、`submit_to_app_store: false`。アップロードのみ。テスター招待・beta group配布・審査・公開は行わない。

## 外部で作成・確認する値

| 場所 | 仮置き／予定名 | 作業 |
|---|---|---|
| Codemagic application | `TODO_ANZEN_CODEMAGIC_APP_ID`（文書上のみ） | 安全AIリポジトリを追加しYAML workflowを選ぶ。発行されたapplication IDは管理用。YAMLのworkflow名やApple IDとは別。Git連携・webhookも確認する |
| Codemagic team integration | **`App Store Key`**（YAML設定済み） | 過去問AIの既存連携を同じチームで再利用。新規キー作成・秘密変数複製は不要 |
| Codemagic variable group | `anzen_ios` は不要 | Apple ID、production APNs、CI/telemetryの公開値をYAMLのvarsへ設定済み。RevenueCat公開SDKキーはサーバーのbilling/configから取得するため `MOBILE_RC_IOS_PUBLIC_KEY` も不要。空の変数を追加しない |
| App Store Connect | **`6831079439`**（YAML設定済み） | Claudeが2026-11-05に作成した安全AIのレコード。SKUは今回の確定値に含まれず、推測・再作成しない |
| Apple Developer App ID | `jp.anzen-ai-portal.app` | Push＋IAP登録済み（2026-11-05の引継ぎ）。有効なApp Store profileにproduction APNs権限が含まれることを確認。Web版Sign in with Appleとの関連も別途確認 |
| Codemagic profile | `anzen_appstore`（予定reference名、未作成） | 上記ID・正しいTeam・App Store配布用profileを作成/取得し、Codemagicに登録。期限・証明書・production APNs権限を確認する |
| Codemagic certificate | `anzen_distribution`（予定reference名、未作成） | 対応するApple Distribution証明書と秘密鍵を安全に登録。自動選択方式なのでこのreference名自体はYAMLに不要 |
| ASC API key | 既存 `App Store Key` の値は記載しない | Key ID・Issuer ID・p8は既存integration管理。同じDeveloperチームの対象アプリ権限があるという引継ぎ。実認証は初回CIで確認 |

`jp.anzenaiportal.app` はCLI生成専用。Apple、署名profile、RevenueCatのStore接続、APNs topicには **`jp.anzen-ai-portal.app`** を使用する。OAuthの `AUTH_APPLE_ID` は関連するServices IDであり、機械的にBundle IDへ置換しない。復帰は `anzenai://auth/callback`。Universal Links用のAssociated Domainsは現状使わない。

## Claudeがブラウザで実施できる作業（権限・別途の外部変更許可がある場合）

今回の作業では外部設定変更・push・CI開始・提出は行わない。以下は次担当への手順であり実施済みではない。

| 作業 | 完了条件 |
|---|---|
| ASCアプリレコード | 作成済み `6831079439` / `jp.anzen-ai-portal.app` を確認する。別レコードを重複作成しない |
| アプリ情報 | 1.0.0、カテゴリ・年齢評価の回答、著作権、配信国、サポート `/contact` とプライバシー `/privacy` の公開URL、説明・検索語を入力。公開URLの到達性は次担当が確認 |
| IAP | 自動更新サブスクリプショングループと月額980円税込・1か月の1商品を作成。product IDはオーナーが確定した値。日本語表示名・説明・価格・配信地域・審査用購入画面を登録し、初回アプリ版と一緒に審査へ追加 |
| RevenueCat | Apple Storeとの接続、product・Offering/package・entitlement `anzen_pro` を設定。既存Stripe契約者を追加購入させないこと、別会員への購入自動移管を拒否する方針と整合させる。v2のresource IDをApp Store product IDと混同しない |
| Codemagic | 上のapplication・既存integration・profile/certificateを整備。group作成・仮置き置換は不要。登録後のpush/ビルド開始は次担当が実施 |
| スクリーンショット登録 | 実際のiOS画面で撮った6.9インチ対応画像（例: 1320×2868、PNG/JPEG、透過なし）を1〜10枚登録。候補: ホーム、法改正、KYT/学習、資料保存、Pro/購入。RA停止中の機能を稼働中と見せない。ブラウザのモック画像は実機動作証拠には使わない |
| App Privacy入力 | オーナー確認済みデータ取扱い表を入力。manifestが2項目だけだから「収集なし」と答えない。下記候補をサーバー/SDK/保存期間まで確認する |
| 審査情報 | 連絡先・ログイン手順・利用可能な審査アカウント・Proと無料の確認手順・購読復元/削除・RA停止・通知条件・オフライン動作を記載。資格情報はASCの専用欄にだけ保存 |
| build紐付け | upload後の処理完了と警告を確認し、1.0.0へbuildを選択。暗号化回答・IAP・必須metadataを確認。審査送信/公開は別途オーナー判断 |

アプリ作成はAccount Holder限定ではなく、Admin/App Managerにも可能。App Privacyも同様に権限付与で委任できる。Appleの[アプリ作成](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)、[App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)、[画像仕様](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)を参照。

App Privacyの照合候補: 会員ID・OAuthで取得する氏名/メール、購入履歴、利用履歴、SDS検索・AIへ送信するユーザーコンテンツ、選択した警報地点と通知device token、RevenueCatが処理する購入/診断情報。リンクの有無・目的・保存と第三者送信は実際の設定に基づき確定する。音声認識は端末内のみで音声をサーバーへ送信しないが、確定した文字をAIへ送る操作は別途評価する。端末にだけ保存するデータと運営が取得するデータを区別する。

審査ノートの下書き（資格情報は含めない）:

> 安全AIポータルは建設・現場の安全情報と学習・資料を提供します。初期画面・法改正・学習・保存資料はアプリへ同梱しています。会員機能はApple/GoogleによるWeb認証からアプリへ復帰します。Proは月額980円の自動更新1商品で、既存の有効なWeb契約者は同じアカウントで追加購入なく利用できます。購入の復元・購読管理・アカウント削除は会員画面から行えます。RA評価生成は現在停止中でProでも実行できません。通知は有効なProとログイン・地点登録が必要で、到達を保証するものではありません。音声入力は利用時の権限許可と端末内認識が可能な場合のみ動作します。審査用のログインと購入確認の手順は専用欄に記載します。

## オーナーの判断・操作、またはブラウザでは完結しない残作業

- **本人/契約:** Developer Programの加入・更新、本人確認、2FA、契約主体・税/銀行情報の正確性、Paid Apps Agreementの同意。Paid Apps Agreementの署名は[Account Holderの役割](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/)。秘密鍵の発行/保管・委任権限付与もオーナーの管理下で行う。
- **商品判断:** SKU/product ID・配信国・価格・税・購入移管方針・既存Stripe会員移行・著作権/教材再配布・プライバシー回答・AIの安全説明の最終承認。UI入力は委任できるが内容を推測で確定しない。
- **審査ログイン:** 現行はApple/Google OAuthのみ。ブラウザで架空のパスワードを作って解決しない。実際に審査者がアクセスできる専用アカウントと2FA等への対応を用意し、サーバー担当が審査用 `MobileIdentity.billingEnvironment=SANDBOX` を明示指定する。無料/失効会員で購入フローも確認できるようにする。[Apple審査情報](https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review)に従う。
- **サーバー担当:** バックアップ・復旧手順付きで提案migrationを検証DB→承認済み本番へ適用し、対応するweb/APIを公開する。ブラウザ操作だけでDB権利・cron・Webhook整合性は保証できない。今回その接続・適用は禁止。
- **macOS/実機担当:** SPM解決・Swiftコンパイル・archive・profile・production APNs entitlement・署名IPA・uploadの実結果、インストール/起動、約1.16 GiBの展開資産の圧縮IPAサイズ、Keychain・印刷・共有・音声・静的Routerを確認。スクリーンショット素材もここで作る。
- **Sandbox/端末検証:** 購入・取消・保留・復元・返金・失効・アカウント切替・再インストール・オフライン・通知の背景受信と30日期限切れを実施。TestFlight配布なしでもこの検証は省略できない。使用する開発/Ad Hoc等の端末配布手段はオーナーが決める。
- **最終承認:** 残る障害、サーバー準備、審査情報、実機証跡を確認して提出・公開を判断する。コードレビューPASSはApple審査合格や公開許可ではない。

## サーバー前提（値は安全な設定管理へ）

既存の[API契約](api-contract.md)と[公開前確認](release-checklist.md)を継承する。

1. `web/prisma/migrations/20261103000000_ios3b_shared_entitlements/migration.sql` と以降の必要migrationを移行計画に含める。実PostgreSQLで購入予約・最後の利用枠・重複/逆順Webhook・削除/Apple失効処理を検証する。
2. 共通台帳/販売: `MOBILE_LEDGER_ENABLED`、`MOBILE_IAP_ENABLED`。RevenueCat: `REVENUECAT_IOS_PUBLIC_SDK_KEY`、`REVENUECAT_IOS_PRODUCT_ID`、`REVENUECAT_IOS_OFFERING_ID`、`REVENUECAT_SECRET_API_KEY`、`REVENUECAT_V2_SECRET_API_KEY`、`REVENUECAT_PROJECT_ID`、`REVENUECAT_IOS_V2_PRODUCT_ID`、`REVENUECAT_WEBHOOK_AUTHORIZATION`、必要時 `REVENUECAT_WEBHOOK_SIGNING_SECRET`。Webhookは `/api/webhooks/revenuecat`、maintenanceは `/api/mobile/v1/maintenance`。
3. OAuth/セッション: `AUTH_SECRET`、`AUTH_APPLE_ID`、`AUTH_APPLE_SECRET`、Googleを使う場合の `AUTH_GOOGLE_ID` 等既存設定。Apple側のServices ID・Return URLとサイトの実ルートを整合させ、メール一致による会員自動統合はしない。
4. AI: `MOBILE_AI_PRICED_MODEL`、`MOBILE_AI_INPUT_JPY_PER_MILLION`、`MOBILE_AI_OUTPUT_JPY_PER_MILLION`、`MOBILE_AI_COST_MARGIN`（1.25以上）。既存の提供者資格情報を安全に管理する。月5万円、無料先行停止4.5万円、未価格モデル停止を維持する。RA停止/C4/product-policyは本作業の変更対象外。
5. APNs: `MOBILE_APNS_ENABLED`、`MOBILE_APNS_ENVIRONMENT`、`APNS_KEY_ID`、`APNS_TEAM_ID`、`APNS_PRIVATE_KEY`、`APNS_TOPIC=jp.anzen-ai-portal.app`、worker/cron用 `MOBILE_MAINTENANCE_AUTHORIZATION`。ビルドの `ANZEN_APNS_ENVIRONMENT=production` とサーバー/端末環境を合わせる。旧Web PushとPro通知移行を確認する。
6. Stripe: `STRIPE_ANZEN_PRO_MONTHLY_PRICE_ID`、`STRIPE_MANAGE_ONLY_PORTAL_CONFIGURATION_ID` と既存のStripe資格情報。既存契約・管理専用Portal・RevenueCatとの所有者照合に必要な設定を確認し、新規購入の二重化や無断価格変更を防ぐ。

署名/upload仕様は[Codemagic公式](https://docs.codemagic.io/yaml-publishing/app-store-connect/)および[署名設定](https://docs.codemagic.io/yaml-code-signing/signing-ios/)を確認。外部の実設定値・有効期限・権限・サーバー公開状態は、このコード変更からは確認済みとしない。
