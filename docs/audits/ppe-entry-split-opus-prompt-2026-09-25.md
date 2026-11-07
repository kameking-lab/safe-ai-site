あなたは労働安全衛生とモバイルUXの独立レビュアーです。編集はせず、次の差分を審査してください。

対象: `git diff b5fd5351f4ba66e2033dde19c9044df985dc1bd8 -- web/src/components/safety-goods-panel.tsx web/src/data/goods-product-features.ts web/src/components/safety-goods-panel.test.tsx web/e2e/goods-real-photo-panel.spec.ts`

要件:
- 初期用品一覧で防じんマスクと防毒マスクが別画像・別カードとして見える。内部カテゴリは respiratory 共通でよい。
- URLに入口意図を保持し、戻る・再読込・フォーカス復帰が壊れない。
- 粉じん/ガスの入口は選定完了を意味せず、酸素、物質、濃度、混在、緊急、給気式の安全停止を共通フローで必ず通す。
- 危険条件、物質や濃度不明、給気式、緊急時は通販候補を出さない。未回答を問題なしとみなさない。
- API未設定時の実商品写真・星評価の欠測表示を維持し、偽商品・偽評価・転載写真を作らない。
- 390pxで読みやすく、入口が増えても検索しやすい。

既に実行した検証:
- Vitest 10/10 PASS
- TypeScript `tsc --noEmit` PASS
- Playwright `goods-real-photo-panel.spec.ts` 7/7 PASS（390px、Back、再読込、横はみ出し、API欠測を含む）

差分を実際に読んで、公開を止める欠陥があれば HOLD と具体的修正、なければ PASS と残る限界を日本語で返してください。法令上の安全条件、URL状態遷移、アクセシビリティ、誤推奨防止を優先してください。
