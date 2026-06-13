# BACKLOG-seo — SEO/インフラ班のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-seo.txt を参照。所有ファイル=sitemap*/robots/manifest/seo-lib/JSON-LDヘルパー/横断検索(search-index・fuzzy-search・notice-search・/search)/app-shell(検索UIのみ)/両layout(metadataのみ)。**着手前に必ず本番とコードの現状を確認**（走行中の全領域ループが先に消化している項目があるため、済みなら[x]にして次へ）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [x] 【柱C-2・S 横断検索】(a) search-index 構築済(#514)。(b) 検索UI=⌘K コマンドパレットが既存(buildSearchIndex/searchItems を消費)。(c) **新規 /search 結果ページ追加**＝カテゴリタブ＋件数バッジ・空/0件状態・URL共有可・全件表示。searchItems に limit 引数追加(既定10で⌘Kは不変)＋countByCategory＋ユニットテスト9本固定。⌘K フッタに「すべての結果を見る→/search?q=」導線(2タップ到達)。webSiteSchema の SearchAction を /law-search→/search に正規化。/search は noindex,follow(サイト内検索の薄い重複ページ抑止)。
  - 追補: app-shell モバイル検索トリガを 36px→44px(WCAG 2.5.5 タップ標的)へ。固定サイズで CLS 非破壊・dark variant 補完・aria-keyshortcuts 付与。spec の「44px」を充足。
- [x] 【柱C-3-3・S】欠落ページのsitemap追加: /court-cases・/whats-new・/site-records系を収載済(#513)。
- [x] 【柱C-3-4・S】lastmod動的化: 各データの実更新日から生成・未来日capで阻止(#516)。
- [ ] 【決裁A・自走可・柱C】SNSリンクプレビュー復活: robots.ts の facebookexternalhit を学習クローラ遮断(AI_TRAINING_CRAWLERS)から検索引用系の許可リスト(Allow:/＋共通非公開パス除外)へ移す。他の学習クローラ(GPTBot/ClaudeBot/FacebookBot/Bytespider等)遮断は維持。完了条件=robots出力でfacebookexternalhitがAllow扱い＋主要ページにog:image/og:title(欠落はフォールバック)。
- [ ] 【柱C-4・S（メタ部分のみ・本文SSRは各route所有UI班）】サイト共通の generateMetadata 整備・JSON-LD(BreadcrumbList可視化のlib部分)・og:image欠落のフォールバック敷設。route本文の変更は当班はしない。

## 補充の指針（未着手3件未満で起こす）
- docs/site-critique-2026-06-11/01-seo-technical.md・05-lighthouse.md の SEO/構造化データ系で自領域に閉じるもの。
