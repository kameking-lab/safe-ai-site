# BACKLOG-ux-tools — 機能UX班-B（判定・法令・統計系）のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-ux-tools.txt を参照。所有route=risk-prediction/risk/chemical-database/chemical-ra/chemical*/stress-check/mental-health*/treatment-work-balance/law-search/circulars/law-hierarchy/chatbot/stats/accidents-analytics/accidents-reports/accident-news/bcp/subsidies/insurance/organization/strategy/goods/leaflet/newsletter。**着手前に現状確認**（済みは[x]）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [x] 【柱0バッチ6/9】メンタル・両立系=ハブ3枚の長文折りたたみ＋plan-builder結論カード（PR #511 / commit 17ca4ad9 でmainに反映済。lane backlog未更新だったため確認のうえチェック）。
- [x] 【柱C-6・A】/circulars 初期件数制限（柱0バッチ4=PR/feat/law-search-visual-first でmain反映済。INITIAL_RENDER=24＋「さらに表示」24件ずつ＋種別チップ44px＋結論カード。/court-casesはux-hub領域のため対象外）。
- [x] 【柱C-7・A】事故統計の出力手段（2026-06-13 ux-tool/c7-accidents-export）。/accidents-analytics・/accidents-reports に CSV/要点コピー/共有/印刷ツールバーを新設（KY transcribe-export方式の横展開）。集計値はそのまま転記＝捏造なし。CSV/要点テキストは純関数(lib/export/csv・accidents-analytics/export・accidents-reports-export＝テスト17件)。h1は両ページ＋/risk・/risk-prediction・/law-search いずれも既に1個で多重/欠落なし（確認のみ）。無読テスト8/8 PASS。
- [x] 【柱0バッチ9/9】その他ツール=各ツールの判定/件数結論カードと文字ダイエット。第1弾(PR #527)=/strategy/plan-generator・/subsidies+calculator・/chemical-database・/goods。第2弾(2026-06-14 ux-tool/batch9-status-conclusion-cards / PR #531 main反映済)=状態系3ページ /insurance(未加入カード＋調達基準を折りたたみ)・/bcp(稼働率目標99%カード)・/organization(教育修了率83.5%カード＋要フォロー先チップ・全値KPI/DEPT配列から導出＝転記のみ)。第3弾(2026-06-14 ux-tool/batch9-newsletter-status-card / PR #535)=/newsletter(登録前後の状態カード=未登録(info/青)→登録完了(safe/緑)に色帯切替)。/leaflet(A4印刷PDF)は判定/件数の状態を持たない成果物のため結論カード対象外（水増し回避）。無読テスト 第2弾15/15＋第3弾7/7 PASS。
- [ ] 【柱3レビュー】リスクマップ(/risk)を「台風前日の元請安全担当」ペルソナで実機レビュー→警報・防災情報の実用性を改善。

## 補充の指針（未着手3件未満で起こす）
- 自領域route の柱0未適用箇所・無読テスト不合格画面・第三者レビュー指摘。chemical RA・チャットボットの深掘り。
