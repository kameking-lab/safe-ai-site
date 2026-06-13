# BACKLOG-seo — SEO/インフラ班のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-seo.txt を参照。所有ファイル=sitemap*/robots/manifest/seo-lib/JSON-LDヘルパー/横断検索(search-index・fuzzy-search・notice-search・/search)/app-shell(検索UIのみ)/両layout(metadataのみ)。**着手前に必ず本番とコードの現状を確認**（走行中の全領域ループが先に消化している項目があるため、済みなら[x]にして次へ）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [ ] 【柱C-2・S 横断検索（残りを1イテレーション1サブで）】(a) web/src/lib/search-index.ts のインデックス拡充＋ユニットテスト固定（条文・通達・判例・標識・主要機能を串刺し／「アーク溶接 特別教育」→教育資格DBが上位）。(b) app-shell.tsx に共通検索UI（モバイル=アイコン1タップ展開・44px・CLS非破壊）。(c) /search 結果ページ（カテゴリ別・空状態・2タップ以内到達）＋本番実機検証。※(a)は走行中ループが着手済みの可能性大→現状確認して残りから。
- [ ] 【柱C-3-3・S】欠落ページのsitemap追加: /court-cases・/whats-new・/site-records系がどのsitemapにも不在→追加。route所有はUI班だが sitemap への収載は当班。
- [ ] 【柱C-3-4・S】lastmod動的化: lastmodが固定値(2026-04-19等・トップchangefreq=dailyと自己矛盾)→各データの実更新日から生成。
- [ ] 【決裁A・自走可・柱C】SNSリンクプレビュー復活: robots.ts の facebookexternalhit を学習クローラ遮断(AI_TRAINING_CRAWLERS)から検索引用系の許可リスト(Allow:/＋共通非公開パス除外)へ移す。他の学習クローラ(GPTBot/ClaudeBot/FacebookBot/Bytespider等)遮断は維持。完了条件=robots出力でfacebookexternalhitがAllow扱い＋主要ページにog:image/og:title(欠落はフォールバック)。
- [ ] 【柱C-4・S（メタ部分のみ・本文SSRは各route所有UI班）】サイト共通の generateMetadata 整備・JSON-LD(BreadcrumbList可視化のlib部分)・og:image欠落のフォールバック敷設。route本文の変更は当班はしない。

## 補充の指針（未着手3件未満で起こす）
- docs/site-critique-2026-06-11/01-seo-technical.md・05-lighthouse.md の SEO/構造化データ系で自領域に閉じるもの。
