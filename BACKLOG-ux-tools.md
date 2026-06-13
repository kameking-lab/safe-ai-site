# BACKLOG-ux-tools — 機能UX班-B（判定・法令・統計系）のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-ux-tools.txt を参照。所有route=risk-prediction/risk/chemical-database/chemical-ra/chemical*/stress-check/mental-health*/treatment-work-balance/law-search/circulars/law-hierarchy/chatbot/stats/accidents-analytics/accidents-reports/accident-news/bcp/subsidies/insurance/organization/strategy/goods/leaflet/newsletter。**着手前に現状確認**（済みは[x]）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [x] 【柱0バッチ6/9】メンタル・両立系=ハブ3枚の長文折りたたみ＋plan-builder結論カード（PR #511 / commit 17ca4ad9 でmainに反映済。lane backlog未更新だったため確認のうえチェック）。
- [x] 【柱C-6・A】/circulars 初期件数制限（柱0バッチ4=PR/feat/law-search-visual-first でmain反映済。INITIAL_RENDER=24＋「さらに表示」24件ずつ＋種別チップ44px＋結論カード。/court-casesはux-hub領域のため対象外）。
- [x] 【柱C-7・A】事故統計の出力手段（2026-06-13 ux-tool/c7-accidents-export）。/accidents-analytics・/accidents-reports に CSV/要点コピー/共有/印刷ツールバーを新設（KY transcribe-export方式の横展開）。集計値はそのまま転記＝捏造なし。CSV/要点テキストは純関数(lib/export/csv・accidents-analytics/export・accidents-reports-export＝テスト17件)。h1は両ページ＋/risk・/risk-prediction・/law-search いずれも既に1個で多重/欠落なし（確認のみ）。無読テスト8/8 PASS。
- [ ] 【柱0バッチ9/9】その他ツール(/strategy/plan-generator・/subsidies+calculator・/bcp・/organization・/insurance・/chemical-database・/goods・/leaflet・/newsletter)=各ツールの判定/件数結論カードと文字ダイエット。**着手中(2026-06-14)**: 第1弾＝判定/件数ツール5本完了→/subsidies(7制度件数カード+ROI箱折りたたみ)・/subsidies/calculator(未試算→該当N件・冗長サマリー撤去)・/strategy/plan-generator(39テンプレ規模カード+Copilotナビ降格)・/chemical-database(収録物質/該当件数カード)・/goods(掲載品目/該当件数カード)＝PR #527。第2弾＝/insurance・/bcp・/organization 状態系結論カード＝PR #531(CI待ち)。**残**: /leaflet(印刷ラッパー=対象外候補)・/newsletter(登録前後の状態カード)。
- [x] 【柱3レビュー】リスクマップ(/risk)を「台風前日の元請安全担当」ペルソナで実機レビュー→警報・防災情報の実用性を改善（2026-06-14 ux-tool/risk-typhoon-persona-review）。気づき=3秒の結論カードは「今日」のみで、前日に効くのは「明日」だが従来は1週間予報タブの奥。是正=結論カード直下に「明日からの見通し」ストリップ新設（明日/明後日/3日後の全国最悪レベルを赤黄緑＋該当地域数で表示・タップでその日の予報マップへ）。今日は結論カードに任せ明日起点で重複/矛盾を回避。全値は既存Open-Meteo予報の日別再集計＝捏造なし（明日以降は予報ベースとUIに明記）。純関数 lib/risk/weather-outlook（テスト8件）。無読テスト9/9 PASS（risk-outlook-noread-2026-06-14）＋既存 risk-noread 11/11 維持。

## 補充の指針（未着手3件未満で起こす）
- 自領域route の柱0未適用箇所・無読テスト不合格画面・第三者レビュー指摘。chemical RA・チャットボットの深掘り。
