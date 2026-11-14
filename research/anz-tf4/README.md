# TestFlight 再ログイン・化学RA表示の回帰検証（2026-11-14）

実装: `cx/anz-tf-fix-20261113`。Web/API: [PR #1109](https://github.com/kameking-lab/safe-ai-site/pull/1109)（`cx/anz-tf4-20261114`）。

## 原因と修正

ログイン完了はセッション保存と会員情報取得で終わり、RevenueCatの再識別・customerInfo更新・サーバーreconcileを実行していなかった。App Storeの商品取得によるidentifyだけでは、サーバーのPro権利が更新されない。ログアウト時のSDK切替も画面から背景実行されていた。

セッション保存後、同じセッションの重複要求をまとめて、RevenueCat識別 → キャッシュ破棄 → customerInfo取得 → サーバーreconcile → 権利再取得を実行する。SDKのProフラグは認可に使わない。ログアウトはサーバー失効 → SDK logOut → ローカル資格情報削除の順とし、世代・セッションの入替で古い応答を破棄する。購入開始は復帰処理を待ち、同時購入と競合しない。

Web側は送信されたappUserIdと認証会員を照合する。元の購入所有者確認・二重購入防止・Sandbox/Production区分を保持する。

化学RAは公式区分を変えず、`レベル4（大きい）★★★★`等の数字・短い説明・4段階の星へ変更した。`2-A`と`2-B`は別表記のまま。含有率は既存の%表示を保ち、リスク区分を確率へ換算していない。画面・印刷・CSVが同じ表示名を使う。

## 検証方法

- `mobile/e2e/relogin-pro.spec.ts`: 実際の静的アプリ・PKCE・セッション・会員UI・法令AI利用枠を実行し、RevenueCatプラグインとサーバーHTTPの境界だけを模擬する。
- 同一会員の初回ログイン → Pro → ログアウト → 同一会員で再ログイン → 自動Pro → 法令AI 50回 → ログアウト → 別会員で再ログイン → 無料のまま、を操作する。購入・復元ボタンは押さない。
- SDKが別会員でもProのキャッシュを返す条件で、サーバー結果だけを採用することを確認する。
- `mobile/tests/billing.test.ts`: 復帰の重複集約、同一セッションの世代競合からの再試行、別ログインへの入替時の破棄も確認する。
- `mobile/e2e/response-speed.spec.ts`: 購入・手動再読込・ログアウトの既存回帰を維持する。新規のログイン時reconcileと購入確定を区別するよう模擬ストアを更新した。
- 化学RAは実データのトルエンを選び、算用数字と星、横はみ出しなし、100%の含有率、印刷モードを確認する。
- CREATE-SIMPLEの既存公式一致試験: 2,760ケース・3,148成分の結果で不一致0件。

## ローカル証跡

生の画像・PDF・計測JSONは、このフォルダに保存し、容量管理のためGitには含めない。最終結果・実行コマンド・コミット一覧は `C:/Users/kanet/20260522/codex-run-20261110/reports/sp-4.md` に記録する。

- `chromium-phone-relogin.json` / `webkit-phone-relogin.json`: 再ログイン時間・SDK/API呼出順。
- `*-pro-recovered.png` / `*-pro-50.png` / `*-other-account-free.png`: Pro復帰・50回・別会員の無料表示。
- `*-chemical-iphone.png` / `*-chemical-full.png`: iPhone幅のリスク表示と全体。
- `chemical-print-color.pdf` / `chemical-print-grayscale.pdf`: カラー・白黒印刷。
- `chemical-print-*-page-*.png` / `pdf-verification.json`: PDFレンダリングと文字抽出確認。

Windows上のChromium/WebKitによる模擬検証であり、実機のApp Store/RevenueCat通信と新しいTestFlightビルドの実行は未確認。価格・回数・AI設定・費用記録は変更していない。マージ・本番配備・アプリのpushは行わない。

RevenueCatの同期・キャッシュ仕様の参照: [CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info)、[Caching](https://www.revenuecat.com/docs/test-and-launch/debugging/caching)。
