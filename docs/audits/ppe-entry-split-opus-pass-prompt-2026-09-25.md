保護具入口UXの公開前最終再審査です。ファイルを編集せず、次の差分を読んでください。

`git diff b5fd5351f4ba66e2033dde19c9044df985dc1bd8 -- web/src/components/safety-goods-panel.tsx web/src/components/safety-goods-wizard.tsx web/src/data/goods-product-features.ts web/src/components/safety-goods-panel.test.tsx web/src/components/safety-goods-wizard.test.tsx web/e2e/goods-real-photo-panel.spec.ts`

前回HOLDの公開BLOCKと指摘事項は次のように修正しました。

1. 呼吸用ウィザードで、条件が酸素不明または作業が閉所なら `intent=unknown&feature=oxygen`、危険物質不明なら `intent=unknown&feature=unknown` の停止経路へ送る。ボタン名も「停止条件を確認する」にし、酸欠時の「安易に入らず…」警告を維持した。
2. パネルを `intent=unknown` / `intent=supplied` で直接開いても、商品候補を出さず停止案内を表示する。
3. 6つのチェック切替は `replaceState` にし、戻る履歴をチェックごとに増やさない。
4. 前回PASSした、防じん/防毒の別画像入口、共通内部カテゴリ、6項目個別確認、危険条件停止、呼吸/送気検索、戻る・再読込・フォーカス復帰、欠測の誠実表示は維持した。

検証結果:
- Vitest 26/26 PASS
- TypeScript `tsc --noEmit` PASS
- Playwright Chromium 390pxを含む対象ファイル 7/7 PASS

法令安全表現、誤推奨防止、URL状態、戻る/再読込、アクセシビリティ、欠測表示に公開BLOCKがなければ明示的にPASS、あればHOLDと最小修正点を日本語で返してください。
