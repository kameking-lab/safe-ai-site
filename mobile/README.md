# 安全AIポータル iOS v1

2026-11-03 / Bundle ID（仮）`jp.anzen-ai-portal.app` / iPhone・iOS 16以降。

Next.js App Router + TypeScript + Tailwindの静的画面をCapacitor 8へ同梱する。`web/`は変更しない。`server.url`、任意ホストのブリッジ許可、ダウンロードしたコードの実行は使わない。

## 実装範囲

- 事故速報：既存 `/api/signage-data` の `laborTrend`（GoogleニュースRSS）。見出しと元記事リンクのみ。記事本文の転載・原因推定なし。
- 事故統計：既存Webで公開する月別DB集計の2006〜2021年・16年分を同梱。年・事故型のフィルタ。収録件数であり、全国の年間発生総数ではないと表示。
- 法改正履歴：既存 `/api/revisions` の全公開レコード。同梱20件。年・キーワード検索。機械検証と人手未確認を区別。
- 最終取得分と保存記事をネイティブFilesystemの `LibraryNoCloud` へ保存。初回圏外は同梱の公的資料と統計・改正が読める。取得失敗・破損・保存失敗では旧データを破棄しない。
- 保存記事、読みやすい文字サイズ、ネイティブ共有シート、Safari View Controllerで出典閲覧、ネットワーク／復帰検知。端末データ削除。
- 安衛法チャット・化学物質RA：入力と同意、残数・停止理由、根拠原文・基準日・不足条件を表示。**サイト側の安全契約が未提供なら送信しない**。
- 気象警報：地点1件を保存、既存気象庁集約APIから画面表示。市町村コードなしの地点は代表地点と明示。元データの取得日時を使い、15分超・取得失敗・通信断を「現在警報なし」としない。
- ログイン・KY／ヒヤリハット記録・広告SDK・課金導線・Push／ローカル通知は含めない。

## 重要な未接続境界

これは**アプリ実装と未署名クラウドビルド定義**。本番サイトの疎通・Codemagic実行・実機・審査は未実施。

現行コミットには、統計更新API、匿名AI利用のサーバー日次枠、月5万円の原価停止を保証するアプリ向け契約がない。RAには公的データ照合のみで評価実行を停止する経路がある。新契約 `/api/mobile/v1/*` はこのタスクではサーバーへ実装／配備していない。したがって現在のサイトへ接続しても、AIは安全側で停止、統計は同梱版を維持する。これを本番提供済み・審査提出可能と扱わない。[API契約](docs/api-contract.md)に接続条件を記載。

## Windowsでの確認

```powershell
cd mobile
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

`npm run build` はアプリの静的ファイル `mobile/out/` のローカル生成のみ。WebやVercelのビルド・デプロイは行わない。`npm run ios:prepare` はWindowsでは即時拒否する。iOSの生成・コンパイルはCodemagicだけ。

ブラウザー試験は公開サイトへの通信をすべてfixtureまたは失敗へ置換し、AI実キー・外部APIを呼ばない。ブラウザーの圏外試験はサイト通信の遮断とnavigator状態の模擬。ネイティブの機内モード試験の代用ではない。

## Codemagic（定義のみ、実行しない）

ルートの `codemagic.yaml` は `working_directory: mobile`。固定npm lockから型・契約テスト→静的画面→macOSでSPM形式のiOSプロジェクト生成→Privacy Manifest・バージョン・アイコン注入→Simulatorビルド→未署名archive。

- `CODE_SIGNING_ALLOWED=NO`。Apple Team・証明書・provisioning・App Store Connectキーは不要。署名・export IPA・upload・publish・提出ステップなし。
- 成果物：Simulator `.app` zip、未署名 `.xcarchive` zip、ビルドログ、Swift Package解決結果。未署名archiveは実機へインストール／ストア提出できない。
- `ios/`は生成物としてignore。プロジェクト差分は `scripts/configure-ios.py` と `ios-resources/` で再現する。
- XcodeはCodemagicの `latest`。実行時のXcode・SDK・Swift Package.resolvedを成果物で確認し、その結果でピン留めする。WindowsでXcodeの動作を検証したとはしない。

## v1.1への差込点

`src/lib/policy.ts` の `EntitlementProvider` を、認証済みサーバーの共通権利とRevenueCat `anzen_pro` を照合する実装に差し替える。`PLAN_LIMITS` は無料3/1/1地点・通知なし、Pro50/10/10地点・通知あり。月額980円税込。v1はfree固定で、端末フラグや遠隔設定によるPro昇格経路なし。

商品枠と既存の短期安全レート／月5万円停止は別レイヤー。端末で消費数を正本化しない。認証・IAP・復元・権利共有・APNs・通知サーバーはv1.1で別実装／実機検証する。権利providerを交換するだけで課金や通知が完成するわけではない。

## データ更新

同梱資料は `npm run pack:seed` で元リポジトリの公開JSONだけから再生成。`src/data/manifest.json` に出典パス・元生成日時・SHA-256を保存。元ファイルの更新時のみ再生成する。報道本文、画像、SDS、法令全文、秘密設定、アカウント情報は同梱しない。

## 公式参照

- [Capacitor設定](https://capacitorjs.com/docs/config)、[HTTP](https://capacitorjs.com/docs/apis/http)、[FilesystemとPrivacy Manifest](https://capacitorjs.com/docs/apis/filesystem)、[Preferences](https://capacitorjs.com/docs/apis/preferences)
- [Next.js静的export](https://nextjs.org/docs/app/guides/static-exports)
- [Codemagic Capacitor](https://docs.codemagic.io/yaml-quick-start/building-an-ionic-app/)
- [Apple審査基準](https://developer.apple.com/app-store/review/guidelines/)

最終確認は2026-11-03。4.2の審査結果は保証しない。オフライン資料、端末保存、ネイティブ共有と表示設定を実際の使用手順で審査担当へ説明する。
