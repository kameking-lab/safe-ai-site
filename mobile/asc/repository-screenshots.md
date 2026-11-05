# Windows Playwright掲載画像

実際のCapacitor用 `mobile/out` をローカルHTTPで配信し、既存Windows WebKitで撮影。
6.9相当1320×2868（CSS 440×956、3倍）、6.5相当1242×2688（414×896、3倍）、
iPad 13相当2064×2752（1032×1376、2倍）のRGB JPEG、各5枚。
[Apple仕様](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)参照。
画像は拡大縮小・合成・UIの書き換えを行わず、viewportとscaleで原寸描画します。

`npm run build` 後に `node scripts/serve.mjs` を起動し、別シェルで
`node scripts/asc_capture_windows.mjs`。空の出力先を指定可能。
撮影順は事故速報・法改正・事故統計・KY事例データベース・法令検索。
実際の同梱資料は「最新ではありません」の表示を残し、接続状態のみオフラインを再現します。
APIや外部サイトへの通信と変更リクエストは送信前に拒否。応答の差し替え、
ストレージへの架空データ投入、AI実行、会員・課金・Push操作はありません。

manifestの撮影元ソース・撮影スクリプト・画像のSHA-256と個別目視結果を検証します。
全画像の目視確認後に `visual_review` をapprovedとし、確認時刻と可読性等の項目を記録します。
掲載CIは撮影せず、保存済みの画像を完全decode・寸法・白画面・ハッシュ・目視記録で検査します。

これはWindowsブラウザーによる実装UIの撮影であり、iOS実機やSimulatorの撮影ではありません。
Windowsのフォント・safe-area・ネイティブ機能には差があります。OSのstatus barを合成しません。
実機とのピクセル一致や審査通過を保証しません。
