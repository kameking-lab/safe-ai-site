# BACKLOG-ux-hub — ハブ・サイネージ・トップ班のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-ux-hub.txt を参照。所有route=quick/faq/glossary/guides/features/industries/diversity/resources/handover/notifications/favorites/safety-signs/accidents/court-cases/signage、およびトップ((main)/page.tsx・home-screen.tsx・home-three-pillars.tsx)。**着手前に現状確認**（済みは[x]）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [ ] 【柱0バッチ8/9】ハブ/ナビ系一括(/quick・/faq・/glossary・/guides・/features・/industries・/diversity・/resources・/handover・/notifications・/favorites・/safety-signs)=アイコンファースト＋文字ダイエット中心・44pxタイル・折りたたみ。状態を持たない画面群なので結論カードは不要。
- [ ] 【柱0】サイネージ(/signage系)=1画面フィット維持の範囲で大型化・JIS安全色文法への統一。
- [ ] 【決裁C・自走可】サイネージのアフィリエイト安全グッズは「出さない」決裁。SignageFeaturedGoods を(i)全域Grepで本番・テストの参照ゼロを確認→(ii)参照ゼロなら本体と未使用アセット/型を削除→(iii)tsc/lint/test/build緑で既存破壊ゼロ保証。参照が残る場合はその導線も非表示化。
- [ ] 【柱C-6・A】/court-cases ページネーション: モバイル全高25,974px→初期20〜30件＋もっと見る＋タグチップ44px化。
- [ ] 【柱3レビュー】トップページを「初訪の一人親方(スマホ)」ペルソナで実機レビュー→自分に関係ある機能への最短到達を改善。

## 補充の指針（未着手3件未満で起こす）
- 自領域route の柱0未適用箇所・無読テスト不合格画面・第三者レビュー指摘。404どん詰まり解消・視覚パンくず可視化(画面側)。
