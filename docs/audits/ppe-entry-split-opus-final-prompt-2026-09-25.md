前回HOLDした保護具入口差分の修正後再審査です。編集せず、`git diff b5fd5351f4ba66e2033dde19c9044df985dc1bd8 -- web/src/components/safety-goods-panel.tsx web/src/components/safety-goods-wizard.tsx web/src/data/goods-product-features.ts web/src/components/safety-goods-panel.test.tsx web/src/components/safety-goods-wizard.test.tsx web/e2e/goods-real-photo-panel.spec.ts`を読み、前回の3つの公開BLOCKが解消したか判定してください。

修正内容:
1. 同ページの旧ウィザードは呼吸用保護具について具体候補・実商品カルーセル・通販リンクを一切出さず、`?category=respiratory&intent=...` の共通フローへ誘導する。
2. 防じん/防毒は、酸素、物質名、濃度、混在、緊急用途、給気式の6項目を個別に確認しないと商品例ボタンを有効化しない。未確認は保持し、混在・酸欠・物質/濃度不明・緊急用途は停止分岐。送気/不明入口は押した時点で停止表示。
3. 「呼吸用保護具」「呼吸」「送気」「空気呼吸器」でも防じん・防毒の両入口を検索できる。
4. 種類のブラウザBack時に選択元へフォーカスを戻すeffectを追加。

検証:
- Vitest 27/27 PASS
- TypeScript `tsc --noEmit` PASS
- Playwright 390pxの対象呼吸フロー PASS。ファイル全体は直前6/7までPASS後、最後のlocatorをexact化して当該1/1 PASS。最終全7件はこの再審査後にも再実行する。

法令安全表現、誤推奨防止、URL状態、戻る/再読込、アクセシビリティ、欠測表示に公開BLOCKがなければPASS、あればHOLDと修正点を日本語で返してください。
