# BACKLOG-ux-records — 機能UX班-A（記録・帳票・教育系）のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-ux-records.txt を参照。所有route=safety-diary/site-records/ky/ky-examples/education-certification/education/foreign-workers/health-checkup-scheduler/account。共有ビジュアル基盤(safety-tone.ts・ConclusionCard/StatusBadge/CollapsibleDetail)の custodian=当班（足すだけ・壊さない）。**着手前に現状確認**（走行中ループが柱0の多くを消化済み＝済みは[x]）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [ ] 【柱C-9・A】KY用紙モバイルの操作集中: /ky/paper は可視入力34＋画面下固定ボタン13で「保存」が同格8ボタンに埋没。保存を主ボタン化(solid常設)・複製/共有/転記/印刷は「…」シートへ・入力は基本情報→危険→対策→確認のステップ/アコーディオン化(結論カード「記入のこりN」と整合)。A4印刷シートは不変。
- [x] 【柱C-4・S（自班route分）】/ky・/ky/morning の固有メタ・SSR化。監査の結果 /ky/paper・/ky/list・/ky/workers は固有メタ済み、/ky は意図的な恒久リダイレクト（canonicalな /ky/paper へ転送・メタ不要）。残ギャップ＝/ky/morning が兄弟ページで唯一 openGraph/twitter 欠落だったため SSR メタに追加（LINE等の共有プレビュー整備）。sitemap収載は seo班。
- [ ] 【柱0仕上げ】記録系・受入教育・健診スケジューラで結論カード/無読テストが未達の画面を巡回し是正（バッチ1/3/5の積み残し・本番実機で確認）。
- [ ] 【柱3レビュー】点検記録(/site-records/inspection)を「始業前点検を毎日回す職長」、月次報告(/site-records/monthly)を「本社提出の元請安全担当」、Eラーニング(/education)を「新人に受講させたい安全担当」ペルソナで実機レビュー→改善。
- [ ] 【柱0補充】KY周辺ユーティリティの無読テスト巡回: /ky/list（保存済みKY一覧）・/ky/workers（作業員マスター）を「初めて開く職長」ペルソナで3秒無読チェック→空状態・件数・次アクションが結論カード相当で即読めるか是正。

## 補充の指針（未着手3件未満で起こす）
- 自領域route の柱0未適用箇所・無読テスト不合格画面・第三者レビュー指摘。
