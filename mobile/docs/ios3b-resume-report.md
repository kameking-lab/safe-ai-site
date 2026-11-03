# IOS3B 再開記録（2026-11-03）

既存worktree `safe-ai-site-m3-ios`、ブランチ `feat/ios-app-v1-20261103`、クリーンな `cddbe216` から再開した。元worktreeは変更していない。

## 今回の変更

- APIのRequest本文・メソッド・操作IDの保持、PKCEのKeychain保存、全画面の起動/復帰時ログイン処理を修正。
- ウェブと同じKYT印刷6形式、事故印刷条件、ガイド対象者、JST日替わり表示を復元。
- 組織別サイネージ管理を共通Reactと同じ所属権限チェックのサイトAPIへ接続。
- 警報の全地点カタログ・定期/復帰時更新・失敗時の未確認表示、通知登録の失敗/タイムアウト/後処理を修正。
- RevenueCat v1の更新取引IDを所有者キーに使う不具合を修正。v2の安定した購読ID・元会員と照合し、必要設定がなければ販売停止。秘密キーは設定名だけ記載。
- 通知送信と端末再登録を排他制御し、会員/セッション切替後の古いoutboxを破棄。
- 公開ウェブの確認で基点の古さが判明。ローカルの `origin/main`（607a1445）から死亡事故DB、再検証済み事故分析、研修2コースの正本をこのブランチのwebへ統合。mobileでコピー管理しない。2024年739件は正本JSONLから自動生成し、合計4,782件を共通検索・集計・印刷に使用。

対応表は `ios3b-modes.md`、全251ルートは `web-parity.json`、出力監査は `web-parity-result.json`。

## 検証

- mobile単体9ファイル48件成功、mobile型チェック成功。
- web関連43ファイル846件成功、web型チェック成功。
- 通信はモック。ビルドは外向き通信を遮断。公開サイトの照合は認証なしGETのみ。
- 最終ビルド成功：静的生成6,997件、HTML6,999ファイル。全78回1,972問（採点1,508問・採点なし464問）、図版参照2,075箇所・欠落0。問題ソースSHA-256は `80580800c7fab657722dca860902629ae4fefb907ed3b581f154caa71e0f7a05`。
- Playwright：Chromium/iPhone相当、WebKit/iPhone相当、PCで48件すべて成功。追加した死亡事故DB・分析モード・研修2コース・全地点カタログ・警報再取得失敗も確認。
- 収録251ルート群＝共通211、ネイティブ接続9、所有者指定除外15、管理/開発用16。展開済み資産1,231,763,995 bytes。IPA圧縮後サイズは未計測。
- 指定先の報告は今回の結果・対応表へ更新し、前回報告は同じフォルダの `ios3b-report.pre-resume-20261103.md` に保存する。

## 次回の残件

1. ウェブの共通ヘッダーにある表示設定（ふりがな・やさしい日本語・文字サイズ・屋外表示・テーマ等）をアプリへ共通部品で接続し、状態共有を確認する。M3側の文字サイズ設定だけで全モード同等とはしない。
2. 既存ルート内の最新版との全モード最終照合。今回の251ルート対応と問題数監査だけで完全同等とは宣言しない。
3. macOS/Xcode/実機でSwift・印刷・音声・再起動・購入/復元/保留/更新/返金/失効・通知を検証。Windowsでは未実施。
4. 所有者承認後に本番DB移行、Apple/RevenueCat/APNsの設定とSandbox確認。v2には別の秘密APIキーとproject/product resource IDが必要。既存Stripe有料会員の台帳移行・販売表示統一も公開前に必要。

現時点では「ウェブの全モードと完全同等で公開可能」とは判定しない。上記1・2はコード側の残作業、3・4は実機と所有者設定に関する残作業。既存RA独自評価は引き続き停止状態を維持する。

本番DBへの提案DDLは `web/prisma/migrations/20261103000000_ios3b_shared_entitlements/migration.sql`（追加13テーブル）。適用していない。外部設定名と公開前順序は `release-checklist.md`、API契約は `api-contract.md`。

## 変更ファイルの要点

- `mobile/src/lib/{web-transport,session,app-lifecycle,billing,push-registration}`、`mobile/ios-resources/NativeVault.swift`：通信・再起動ログイン・IAP・通知登録。
- `mobile/src/components/{native-lifecycle,account-panel,native-weather-panel,native-signage-fleet,shared-shell}`：会員/権利/警報/組織画面。
- webの印刷/ガイド/日替わり/サイネージ共通React部品と、`web/src/lib/mobile/*`・会員/通知Route Handler：共通機能とサーバー検証。
- `web/src/app/(main)/{fatal-accidents,accidents-analytics,training/safety-seminars}`、共通事故ライブラリ・教材・生成スクリプト：公開版で不足していた機能。
- `mobile/docs/*`、生成seed/manifest、関連テスト。

一次資料：公開ウェブの[全機能](https://www.anzen-ai-portal.jp/features)、[事故分析](https://www.anzen-ai-portal.jp/accidents-analytics)、RevenueCatの[v1 Customer](https://www.revenuecat.com/docs/api-v1/customers)、[v2購読モデル](https://www.revenuecat.com/docs/api-v2/subscription-data-model)、[v2会員リソース](https://www.revenuecat.com/docs/api-v2/customer/resources)。

push・デプロイ・本番DB接続/適用・外部設定変更・実キー呼び出し・破壊的Git操作は行っていない。
