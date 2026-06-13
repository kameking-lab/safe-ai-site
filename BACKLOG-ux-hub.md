# BACKLOG-ux-hub — ハブ・サイネージ・トップ班のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-ux-hub.txt を参照。所有route=quick/faq/glossary/guides/features/industries/diversity/resources/handover/notifications/favorites/safety-signs/accidents/court-cases/signage、およびトップ((main)/page.tsx・home-screen.tsx・home-three-pillars.tsx)。**着手前に現状確認**（済みは[x]）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [ ] 【柱0バッチ8/9】ハブ/ナビ系一括(/quick・/faq・/glossary・/guides・/features・/industries・/diversity・/resources・/handover・/notifications・/favorites・/safety-signs)=アイコンファースト＋文字ダイエット中心・44pxタイル・折りたたみ。状態を持たない画面群なので結論カードは不要。※2026-06-14調査: /quick・/faq・/resources・/notifications・/safety-signs・/guides は既にアイコンファースト/44px概ね達成。残focusは/glossary・/industries・/diversity・/handover の文字ダイエット。
- [ ] 【柱0】サイネージ(/signage系)=1画面フィット維持の範囲で大型化・JIS安全色文法への統一。※PR #517(SignageFeaturedGoods削除)マージ済み。次サイクルで着手可。
- [x] 【決裁C・自走可】サイネージのアフィリエイト安全グッズは「出さない」決裁。SignageFeaturedGoods を全域Grepで参照ゼロ確認（本番・テスト・JSON）→本体削除→tsc/lint/test/build緑で既存破壊ゼロ確認。共有部品 goods-icons（safety-goods-panel が使用）は保持、data層 getSignageFeaturedSafetyGoods は data班凍結のため未使用exportとして残置（要 data班整理）。(2026-06-13 / ux-hub/decision-c-remove-signage-goods / PR #517)
- [x] 【柱C-6・A】/court-cases ページネーション: モバイル全高25,974px→初期20〜30件＋もっと見る＋タグチップ44px化。→ 初期24件＋「もっと見る（残りN件）」フル幅48pxボタン。分野タイルは既に44px達成済み。全高25,974px→9,939px。無読テスト8/8・vitest3件追加。(2026-06-14 / PR #523)
- [ ] 【柱3レビュー】トップページを「初訪の一人親方(スマホ)」ペルソナで実機レビュー→自分に関係ある機能への最短到達を改善。

## 補充の指針（未着手3件未満で起こす）
- 自領域route の柱0未適用箇所・無読テスト不合格画面・第三者レビュー指摘。404どん詰まり解消・視覚パンくず可視化(画面側)。
