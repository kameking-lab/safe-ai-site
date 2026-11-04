# 安全AIポータル iOS v1 — IOS3B

iPhone / iOS 16以降 / Capacitor 8 / RevenueCat公式SDK 14。M3の閲覧アプリを、ウェブと共通の全公開画面および初版からのIAPへ拡張。

## 共通実装

`web/src` をReact・データ・計算の唯一の正本として直接importする。`scripts/share-web.mjs` はimportだけのApp Routerページとpublic assetsを生成する。生成画面・資産はGit対象外で、mobile側に別の問題データを保守しない。

全247ルートの対応は [web-parity.json](docs/web-parity.json)、各モードは [ios3b-modes.md](docs/ios3b-modes.md)、全78試験・1,972問の検証は [web-parity-result.json](docs/web-parity-result.json)。KY記録・ヒヤリハット記録は所有者指定により除外。ビジュアルKYTは提供する。管理者・開発者画面は一般向けアプリの資産に含めない。

画面は同梱HTML・Reactで動作する。`server.url` を使ってサイト全体を遠隔表示する方式ではない。AI・認証・最新情報はサイトAPIへ接続する。

## ローカル確認

```powershell
cd web
npm ci --ignore-scripts
npx prisma generate
cd ../mobile
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Prisma generateはローカルの型生成のみ。DB接続・migrate deploy・db pushを行わない。購入・配信・外部AIはモックで検証する。ビルド中は外向き通信を遮断し、同梱データだけで全ページを生成する。省略なしの成果物は展開状態で約1.13 GiB。WindowsではXcodeのビルド・署名・実機動作は検証できない。

## ネイティブ機能

FilesystemのLibraryNoCloudに取得済み資料を保存し、通信失敗後も参照できる。購入権利はサーバーを正本とし、オフラインの自己申告でProにしない。認証トークンはKeychainへ保存。Share・ファイル出力・UIPrintInteractionController・APNs通知・Speechの端末内認識を接続した。

`ios-resources/NativeVault.swift` はKeychain・ローカルプラグイン登録・深いURLの静的Router・印刷・音声を実装する。音声はon-device認識が利用できる場合のみ有効。権限は利用時に求める。APNs操作はサイト側で会員と有効なPro権利を確認する。

## 課金・サーバー

共通設定は `web/src/lib/mobile/product-policy.json`。無料：チャット3回/日、RA1件/日、警報1地点・通知なし。Pro：チャット50回/日、RA10件/日、警報10地点・通知あり。月額980円税込の自動更新1種、entitlement `anzen_pro`。

既存Stripe購読を優先表示し、IAPの二重購入を止める。SDKのcustomerInfoだけではProに昇格しない。購入・復元後もサーバーで照合する。AppleとGoogleのサイト認証をPKCE経由で利用する。

追加スキーマは提案DDLのみ。本番DBへの適用・Apple/RevenueCat/APNs設定・実キーの投入は行っていない。各API・安全停止・必要設定は [API契約](docs/api-contract.md) と [公開前確認](docs/release-checklist.md) を参照。

CodemagicはiOSブランチの関連変更pushで署名付きIPAを作成し、App Store Connectへアップロードする定義。TestFlight配布・審査提出は自動実行しない。現時点では外部設定の仮置きがあり、CI実行・外部設定変更は行っていない。設定と提出の引継ぎは [IOS3H](docs/ios3h-release.md) を参照。

生成用の `capacitor.config.ts` のappIdは `jp.anzenaiportal.app`。CLIがハイフンを拒否するための生成専用IDで、Apple側には登録しない。`capacitor:sync:after` フックが `configure-ios.rb` を呼び、直接CLIでadd/syncした場合にも全App構成とnative runtimeを登録済み `jp.anzen-ai-portal.app` へ戻す。`verify-ios.rb` が生成後・署名設定後に検証する。認証復帰schemeは引き続き `anzenai`。

Windowsでのnativeファイル確認にはRubyとxcodeproj 1.27.0、Python 3が必要。上のbuild完了後に `npm run ios:prepare -- --allow-non-macos` と `npm run ios:test` を実行する。`BUILD_NUMBER` は正の整数、Store用は `ANZEN_APNS_ENVIRONMENT=production` とする。Windowsの成功はSwiftコンパイル・実profile・署名・アップロードの成功を意味しない。
