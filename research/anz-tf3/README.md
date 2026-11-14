# iOSチャット・キーボード回帰確認

2026-11-14。ローカルの本番用static exportをPlaywright WebKitで検証。

- 画面390×844、上端safe area 59pxを模擬。
- キーボード表示：visualViewport height=500 / offsetTop=0。
- 追加質問：height=400 / offsetTop=120、document scrollY=100を別々に模擬。
- 初回・追加質問・無料上限・購入確認失敗後でcomposer下端はvisualViewport下端と一致（誤差2px未満）。追加質問の入力欄上端459px、composer下端520px、会話欄158.4px。
- キーボードを閉じると通常配置・下部ナビへ復帰。
- HTTPSの外部通信はすべて遮断またはローカル応答。ネイティブプラグイン境界のみ置換し、チャット描画・API変換・購入ガードは実装を使用。
- 実際のiOSキーボードとWKWebViewプロセスでの再現確認はTestFlightでの確認に残る。

画像：

- `free-followup-keyboard.png`：無料会員・「なんで？」入力中。
- `pro-followup-keyboard.png`：確認済みPro・追加質問入力中。
- `free-limit-keyboard.png`：無料上限・購入ボタン操作後。案内はカード内の1行のみ。
- `free-keyboard-closed.png`：無料上限・キーボードを閉じた状態。
- `pro-keyboard-closed.png`：Pro・キーボードを閉じた状態。

測定値：`free-geometry.json`、`pro-geometry.json`。

## sp-3-rv 追加点検

- 横向き844×390、上端safe area 0px、キーボード時height=210も検証。幅768px以上でもタッチ端末ならキーボード配置を適用する。composer下端209px（表示下端210pxと1px差）、会話欄34.4pxを保持。
- 縦向きへ戻し、height=320 / offsetTop=120 / innerHeight=320を模擬。入力内容の案内・通信エラー時もcomposer下端440px、会話欄78.4pxを保持。案内は会話欄内でスクロールできる。
- 無料残り1/3・0/3、Pro残り48/50、購入カード1個、同意ダイアログ・チェックボックスなしを検証。
- 追加画像6枚：`free-landscape-keyboard.png` / `pro-landscape-keyboard.png`、`free-privacy-keyboard.png` / `pro-privacy-keyboard.png`、`free-error-keyboard.png` / `pro-error-keyboard.png`。
- 既存画像5枚と座標JSON2件も再取得。実機の日本語キーボード・WKWebViewでの検証とは区別する。

再実行（mobile/）：

```powershell
npm run build
npx playwright test e2e/chat-keyboard.spec.ts e2e/guest-ai.spec.ts e2e/account-layout.spec.ts --project=webkit-phone --workers=1
```
