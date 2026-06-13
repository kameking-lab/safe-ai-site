# BACKLOG-ux-records — 機能UX班-A（記録・帳票・教育系）のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-ux-records.txt を参照。所有route=safety-diary/site-records/ky/ky-examples/education-certification/education/foreign-workers/health-checkup-scheduler/account。共有ビジュアル基盤(safety-tone.ts・ConclusionCard/StatusBadge/CollapsibleDetail)の custodian=当班（足すだけ・壊さない）。**着手前に現状確認**（走行中ループが柱0の多くを消化済み＝済みは[x]）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [x] 【柱C-9・A1】KY用紙 下部アクションバーの操作集中: 固定ボタン13→「保存(solid主ボタン)」＋「…」の2つに集約。複製/共有/転記/印刷/連携は「…」その他操作シート(記録/共有・連携/印刷・PDF/関連でグループ化)へ退避。全画面共通の共有FAB・モバイルボトムナビとの重畳も解消。A4印刷シートは不変。無読11/11合格。(2026-06-13, #PR)
- [ ] 【柱C-9・A2】KY用紙 入力のステップ/アコーディオン化: 可視入力34を 基本情報→危険→対策→確認 のステップ/アコーディオンに整理(結論カード「記入のこりN」と整合)。※用紙ファースト(完成用紙を最初に見せる)設計との両立方針を要検討。A4印刷シートは不変。
- [ ] 【柱C-4・S（自班route分）】/ky・/ky/morning の固有メタ(generateMetadata)・静的説明のSSR化。sitemap収載は seo班。
- [ ] 【柱0仕上げ】記録系・受入教育・健診スケジューラで結論カード/無読テストが未達の画面を巡回し是正（バッチ1/3/5の積み残し・本番実機で確認）。
- [ ] 【柱3レビュー】点検記録(/site-records/inspection)を「始業前点検を毎日回す職長」、月次報告(/site-records/monthly)を「本社提出の元請安全担当」、Eラーニング(/education)を「新人に受講させたい安全担当」ペルソナで実機レビュー→改善。

## 補充の指針（未着手3件未満で起こす）
- 自領域route の柱0未適用箇所・無読テスト不合格画面・第三者レビュー指摘。
