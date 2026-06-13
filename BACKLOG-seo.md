# BACKLOG-seo — SEO/インフラ班のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-seo.txt を参照。所有ファイル=sitemap*/robots/manifest/seo-lib/JSON-LDヘルパー/横断検索(search-index・fuzzy-search・notice-search・/search)/app-shell(検索UIのみ)/両layout(metadataのみ)。**着手前に必ず本番とコードの現状を確認**（走行中の全領域ループが先に消化している項目があるため、済みなら[x]にして次へ）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
（現在キュー空。次イテレーションは「補充の指針」から自領域タスクを起こす）

## 完了
- [x] 【柱C-4・S（メタ部分のみ）】JSON-LDヘルパー lib整備 — 済（seo/c4-json-ld-lib-consolidate / #530）。`json-ld.tsx` のハードコードしたサイトURL(22)/サイト名(13)を `seo-metadata.ts` の SITE_URL/SITE_NAME 単一ソースへ集約（出力JSON byte-identical・既存破壊0）。ロゴURLは LOGO_URL に一本化。これまでゼロだった JSON-LDヘルパー約20関数の回帰テスト `json-ld.test.ts`(23 it) を新設＝@context/@type・position 1始まり・slice上限(ItemList10/FAQ20/用語50/Quiz10)・OG画像フォールバック・SearchActionの/search正規化・任意フィールド条件出力を固定。generateMetadataヘルパー(withSiteAlternates/withSiteOpenGraph/withSiteTwitter)・BreadcrumbList可視化(PageJsonLd/Breadcrumb)・og:imageフォールバック(layout.tsx /api/og)は既存敷設済みを確認。各routeのページ別 generateMetadata/本文SSRは各route所有UI班の担当。
- [x] 【柱C-2・S 横断検索】(a) search-index 構築済(#514)。(b) 検索UI=⌘K コマンドパレット既存＋モバイル検索トリガを 44px タップ標的化(#524, WCAG 2.5.5)。(c) /search 結果ページ追加(#518)＝カテゴリタブ＋件数バッジ・空/0件状態・URL共有可・全件表示。searchItems に limit 引数(既定10で⌘Kは不変)＋countByCategory＋ユニットテスト固定。⌘K フッタに「すべての結果を見る→/search?q=」導線(2タップ到達)。webSiteSchema の SearchAction を /search に正規化。/search は noindex,follow。
- [x] 【柱C-3-3・S】欠落ページのsitemap追加 — 済（#513 マージ済。/court-cases・/whats-new・/site-records 系を sitemap.ts へ収載、sitemap.test.ts で回帰固定）。
- [x] 【柱C-3-4・S】lastmod動的化 — 済（#516 マージ済。各データ実更新日から生成・未来日capで阻止、lib/sitemap/lastmod）。
- [x] 【決裁A・柱C】SNSリンクプレビュー復活 — 済（seo/robots-fb-link-preview / #522）。facebookexternalhit を AI_TRAINING_CRAWLERS から専用 SOCIAL_LINK_PREVIEW_BOTS（Allow:/＋共通非公開パス除外）へ移動。FacebookBot等の学習クローラ遮断は維持。og:image/og:title/twitter card は layout.tsx で /api/og フォールバック敷設済みを確認。robots.test.ts で回帰固定（5 it）。

## 補充の指針（未着手3件未満で起こす）
- docs/site-critique-2026-06-11/01-seo-technical.md・05-lighthouse.md の SEO/構造化データ系で自領域に閉じるもの。
