# BACKLOG-seo — SEO/インフラ班のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-seo.txt を参照。所有ファイル=sitemap*/robots/manifest/seo-lib/JSON-LDヘルパー/横断検索(search-index・fuzzy-search・notice-search・/search)/app-shell(検索UIのみ)/両layout(metadataのみ)。**着手前に必ず本番とコードの現状を確認**（走行中の全領域ループが先に消化している項目があるため、済みなら[x]にして次へ）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [ ] 【柱C-3-4・S DRY後追い】本体 `sitemap.ts` 冒頭の freshest 群（siteFreshest/freshestArticle/freshestNotice 等）を、新設 `lib/sitemap/freshness.ts` の `computeSitemapFreshness()` 利用へ寄せて単一ソース化する。**#537（sitemap.ts を編集中）のマージ後に着手**＝それまでは二重定義のまま据え置き（出力 byte-identical のため実害なし）。

## 完了
- [x] 【柱C-3-4 / A-3・S サイトマップ index/equipment の lastmod 動的化】`sitemap-index.xml` は全子サイトマップに当日（new Date()）を打っており、中身不変でも lastmod が毎日動く lastmod スパム（Google に無視され再クロール遅延）だった点を是正。新設 `lib/sitemap/freshness.ts` の純粋関数 `computeSitemapFreshness(buildToday)` で各セクション実データ最新日（本体=siteFreshest/記事=freshestArticle/通達=freshestNotice/保護具=equipmentDataUpdated、未来日はビルド日 cap）を導出し、index 4子＋ `sitemap-equipment.xml` の per-URL lastmod（同じく当日打ちだった）を実データ日へ差し替え。fallback 値は `sitemap.ts` と一致。freshness.test.ts(6 it)＋ index route.test.ts(4 it) で「cap値そのものを返さない＝当日固定でない」回帰を固定。`sitemap.ts`/circulars route は #537 と競合回避のため非改変。
- [x] 【柱C-3-2/A-3・S サイトマップ役割分担の是正】sitemap-circulars.xml が別系統データ officialNotices(nt-* ID)を出力し /circulars/[id] で全件404する幽霊URL(soft404)だった点を、正本 mhlwNotices(mhlw-notice-NNNN)へ差し替え。あわせて本体 sitemap.xml に直書きしていた個別通達/保護具URLを撤去し、専用子サイトマップ(sitemap-circulars/-equipment.xml＝sitemap-index 列挙)へ一本化（同一URLの二重掲載＝役割崩壊を解消）。route.test.ts(6 it)＋sitemap.test.ts に二重掲載なし回帰(3 it)を追加。
- [x] 【柱C-4・S（メタ部分のみ）】JSON-LDヘルパー lib整備 — 済（seo/c4-json-ld-lib-consolidate / #530）。`json-ld.tsx` のハードコードしたサイトURL(22)/サイト名(13)を `seo-metadata.ts` の SITE_URL/SITE_NAME 単一ソースへ集約（出力JSON byte-identical・既存破壊0）。ロゴURLは LOGO_URL に一本化。これまでゼロだった JSON-LDヘルパー約20関数の回帰テスト `json-ld.test.ts`(23 it) を新設＝@context/@type・position 1始まり・slice上限(ItemList10/FAQ20/用語50/Quiz10)・OG画像フォールバック・SearchActionの/search正規化・任意フィールド条件出力を固定。generateMetadataヘルパー(withSiteAlternates/withSiteOpenGraph/withSiteTwitter)・BreadcrumbList可視化(PageJsonLd/Breadcrumb)・og:imageフォールバック(layout.tsx /api/og)は既存敷設済みを確認。各routeのページ別 generateMetadata/本文SSRは各route所有UI班の担当。
- [x] 【柱C-4・S og:image欠落フォールバック(lib層)】#528 — withSiteOpenGraph/withSiteTwitter に DEFAULT_OG_IMAGE(/api/og 1200x630)を既定付与。Next.js は openGraph を浅マージ(丸ごと置換)するため、ページが独自 openGraph を export すると root の og:image が消える退行(実測 /bcp・/insurance 等=critique C-1)を、helper 利用 32 ページ一括で修復。route本文は不変。
- [x] 【柱C-2・S 横断検索】(a) search-index 構築済(#514)。(b) 検索UI=⌘K コマンドパレット既存＋モバイル検索トリガを 44px タップ標的化(#524, WCAG 2.5.5)。(c) /search 結果ページ追加(#518)＝カテゴリタブ＋件数バッジ・空/0件状態・URL共有可・全件表示。searchItems に limit 引数(既定10で⌘Kは不変)＋countByCategory＋ユニットテスト固定。⌘K フッタに「すべての結果を見る→/search?q=」導線(2タップ到達)。webSiteSchema の SearchAction を /search に正規化。/search は noindex,follow。
- [x] 【柱C-3-3・S】欠落ページのsitemap追加 — 済（#513 マージ済。/court-cases・/whats-new・/site-records 系を sitemap.ts へ収載、sitemap.test.ts で回帰固定）。
- [x] 【柱C-3-4・S】lastmod動的化 — 済（#516 マージ済。各データ実更新日から生成・未来日capで阻止、lib/sitemap/lastmod）。
- [x] 【決裁A・柱C】SNSリンクプレビュー復活 — 済（seo/robots-fb-link-preview / #522）。facebookexternalhit を AI_TRAINING_CRAWLERS から専用 SOCIAL_LINK_PREVIEW_BOTS（Allow:/＋共通非公開パス除外）へ移動。FacebookBot等の学習クローラ遮断は維持。og:image/og:title/twitter card は layout.tsx で /api/og フォールバック敷設済みを確認。robots.test.ts で回帰固定（5 it）。

## 補充の指針（未着手3件未満で起こす）
- docs/site-critique-2026-06-11/01-seo-technical.md・05-lighthouse.md の SEO/構造化データ系で自領域に閉じるもの。
