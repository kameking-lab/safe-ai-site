# Windows Playwright掲載画像

実際のCapacitor用静的出力をローカルHTTPで配信し、新規Windows WebKitで撮影。
6.9相当1320×2868（CSS 440×956、3倍）、6.5相当1242×2688（414×896、3倍）、
iPad 13相当2064×2752（1032×1376、2倍）のRGB JPEG、各5枚。
[Apple仕様](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)参照。
画像は拡大縮小・合成・UIの書き換えを行わず、viewportとscaleで原寸描画します。

既存の検証済み静的出力のあるmobileディレクトリで
`node <撮影リポジトリ>/mobile/scripts/serve.mjs 3287` を起動し、撮影リポジトリのmobileで
`node scripts/asc_capture_windows.mjs <空の出力先> <静的出力元のmobile> 3287`。
第2・3引数の省略時は現在のmobileと3213番ポートを使います。
再利用前にアプリソース・公開素材・生成スクリプトを比較し、各画面のHTTP応答と
静的HTMLのSHA-256が一致することも確認します。生成元に相違があれば撮影を停止します。
撮影順はホーム・画像で学ぶKY・法令検索（安衛法第8条）・安全看板・社内研修教材。
看板はA4横・日本語と英語を実際の操作で選択します。
APIや外部サイトへの通信と変更リクエストは送信前に拒否。応答の差し替え、
ストレージへの架空データ投入、AI実行、会員・課金・Push操作はありません。
画面の本文・未確認バッジ・注意書きは変更せず、通常のスクロールだけを行います。

manifestの撮影元ソース・公開素材・撮影スクリプト・画像のSHA-256と個別目視結果を検証します。
全画像の目視確認後に `visual_review` をapprovedとし、確認時刻と可読性等の項目を記録します。
掲載CIは撮影せず、保存済みの画像を完全decode・寸法・白画面・ハッシュ・目視記録で検査します。

これはWindowsブラウザーによる実装UIの撮影であり、iOS実機やSimulatorの撮影ではありません。
Windowsのフォント・safe-area・ネイティブ機能には差があります。OSのstatus barを合成しません。
実機とのピクセル一致や審査通過を保証しません。

2026-11-11の再撮影では、`b94a45d5e706bda0ce56b436b0614f84a1d9ba7c`を元に
前工程で生成・検査済みの出力を使用し、新規buildは行っていません。
この15枚は既存の掲載検査用セットです。現在のネイティブ設定はiPhone専用で、
iPad寸法の画像があることをiPad対応の根拠にはしません。
掲載用の説明付きPNG・一覧・文案は、指定出力先
`C:/Users/kanet/20260522/appstore-shots-20261110/anz/h-20261111/`に保存します。
CIがアップロードするのは、このリポジトリの無加工JPEG15枚です。
