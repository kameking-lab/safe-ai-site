# BACKLOG-ux-hub — ハブ・サイネージ・トップ班のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-ux-hub.txt を参照。所有route=quick/faq/glossary/guides/features/industries/diversity/resources/handover/notifications/favorites/safety-signs/accidents/court-cases/signage、およびトップ((main)/page.tsx・home-screen.tsx・home-three-pillars.tsx)。**着手前に現状確認**（済みは[x]）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [x] 【柱0バッチ8/9】ハブ/ナビ系一括(/quick・/faq・/glossary・/guides・/features・/industries・/diversity・/resources・/handover・/notifications・/favorites・/safety-signs)=アイコンファースト＋文字ダイエット中心・44pxタイル・折りたたみ。状態を持たない画面群なので結論カードは不要。→ /industries ヘッダーを3段落（10業種インライン列挙＋クローラ向けキーワード段落）から1文ガイドへ圧縮、/glossary 五十音インデックスを44×44pxタップ標的化、/diversity 導入文ダイエット＋目次チップ44px化（一次資料確認の注意書きは保持）。/handover は noindex＋key gate の社内文書のためペルソナ対象外として除外。vitest 10件追加・無読テスト8/8 PASS。(2026-06-14 / ux-hub/pillar0-batch8-text-diet / PR #529)
- [x] 【柱0】サイネージ(/signage系)=1画面フィット維持の範囲で大型化・JIS安全色文法への統一。→ JIS安全色「注意＝黄は黒系文字」へ統一。リスク予測「中」バッジ・現場安全状態「要対応」チップ/出典バッジの3箇所の amber-500地×白文字（約2.1:1）を text-amber-950 へ是正。色クラス入替のみで1画面フィット不変。回帰ガードvitest14ケース追加・無読テスト8/8 PASS。(2026-06-14 / ux-hub/signage-pillar0-jis-colors / PR #534)
- [x] 【決裁C・自走可】サイネージのアフィリエイト安全グッズは「出さない」決裁。SignageFeaturedGoods を全域Grepで参照ゼロ確認（本番・テスト・JSON）→本体削除→tsc/lint/test/build緑で既存破壊ゼロ確認。共有部品 goods-icons（safety-goods-panel が使用）は保持、data層 getSignageFeaturedSafetyGoods は data班凍結のため未使用exportとして残置（要 data班整理）。(2026-06-13 / ux-hub/decision-c-remove-signage-goods / PR #517)
- [x] 【柱C-6・A】/court-cases ページネーション: モバイル全高25,974px→初期20〜30件＋もっと見る＋タグチップ44px化。→ 初期24件＋「もっと見る（残りN件）」フル幅48pxボタン。分野タイルは既に44px達成済み。全高25,974px→9,939px。無読テスト8/8・vitest3件追加。(2026-06-14 / PR #523)
- [x] 【柱3レビュー】トップページを「初訪の一人親方(スマホ)」ペルソナで実機レビュー→自分に関係ある機能への最短到達を改善。→ 実機レビューの結論: 最上部「現場ですぐ使う」(0スクロール10タイル/44px)・Hero・3本柱は良好。唯一の測定可能な欠陥＝ペルソナバンドがモバイル1列で「一人親方」カードが建設業カードのフル高さ分(約180px)下に隠れていた。バンドをモバイル2列化(建設業=左上に温存・一人親方=右上の初手行へ)＋狭い2列では説明文を畳みアイコン/役割名/タグで3秒スキャン化。建設業の先頭優先(読み順1番目)は不変。無読テスト9/9・vitest2件追加。(2026-06-14 / ux-hub/top-pillar3-persona-review)
- [x] 【柱0補充】/accidents 事故DB 最上部操作のタップ標的44px化。→ 事故情報ハブナビ4チップ(px-3 py-1≈28px)・クイック検索の入力欄/検索ボタン(py-2≈38px)・事故型チップ(min-h-[36px])・保存事例の削除ボタン(px-2 py-1≈24px) が44px未満で親指操作が押し損ねサイズだった。いずれも min-h-[44px]／h-11 w-11 へ是正(純粋なクラス追加でレイアウト不変)。AccidentTypeGridは既に44px達成済み。vitest 8件追加・無読テスト5/5 PASS(実 boundingBox 測定)。(2026-06-14 / ux-hub/accidents-pillar0-44px-targets)

## 補充の指針（未着手3件未満で起こす）
- 自領域route の柱0未適用箇所・無読テスト不合格画面・第三者レビュー指摘。404どん詰まり解消・視覚パンくず可視化(画面側)。
