# BACKLOG-seo — SEO/インフラ班のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-seo.txt を参照。所有ファイル=sitemap*/robots/manifest/seo-lib/JSON-LDヘルパー/横断検索(search-index・fuzzy-search・notice-search・/search)/app-shell(検索UIのみ)/両layout(metadataのみ)。**着手前に必ず本番とコードの現状を確認**（走行中の全領域ループが先に消化している項目があるため、済みなら[x]にして次へ）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [ ] 【柱C-4・S（メタ部分のみ・本文SSRは各route所有UI班）】JSON-LD ヘルパーの lib 整備（残りの仕上げ）。og:image欠落フォールバックは lib層で敷設済み(#528)。route本文の変更は当班はしない。

## 完了
- [x] 【柱C-3-2/A-3・S サイトマップ役割分担の是正】sitemap-circulars.xml が別系統データ officialNotices(nt-* ID)を出力し /circulars/[id] で全件404する幽霊URL(soft404)だった点を、正本 mhlwNotices(mhlw-notice-NNNN)へ差し替え。あわせて本体 sitemap.xml に直書きしていた個別通達/保護具URLを撤去し、専用子サイトマップ(sitemap-circulars/-equipment.xml＝sitemap-index 列挙)へ一本化（同一URLの二重掲載＝役割崩壊を解消）。route.test.ts(6 it)＋sitemap.test.ts に二重掲載なし回帰(3 it)を追加。
- [x] 【柱C-4・S og:image欠落フォールバック(lib層)】#528 — withSiteOpenGraph/withSiteTwitter に DEFAULT_OG_IMAGE(/api/og 1200x630)を既定付与。Next.js は openGraph を浅マージ(丸ごと置換)するため、ページが独自 openGraph を export すると root の og:image が消える退行(実測 /bcp・/insurance 等=critique C-1)を、helper 利用 32 ページ一括で修復。route本文は不変。
- [x] 【柱C-2・S 横断検索】(a) search-index 構築済(#514)。(b) 検索UI=⌘K コマンドパレット既存＋モバイル検索トリガを 44px タップ標的化(#524, WCAG 2.5.5)。(c) /search 結果ページ追加(#518)＝カテゴリタブ＋件数バッジ・空/0件状態・URL共有可・全件表示。searchItems に limit 引数(既定10で⌘Kは不変)＋countByCategory＋ユニットテスト固定。⌘K フッタに「すべての結果を見る→/search?q=」導線(2タップ到達)。webSiteSchema の SearchAction を /search に正規化。/search は noindex,follow。
- [x] 【柱C-3-3・S】欠落ページのsitemap追加 — 済（#513 マージ済。/court-cases・/whats-new・/site-records 系を sitemap.ts へ収載、sitemap.test.ts で回帰固定）。
- [x] 【柱C-3-4・S】lastmod動的化 — 済（#516 マージ済。各データ実更新日から生成・未来日capで阻止、lib/sitemap/lastmod）。
- [x] 【決裁A・柱C】SNSリンクプレビュー復活 — 済（seo/robots-fb-link-preview / #522）。facebookexternalhit を AI_TRAINING_CRAWLERS から専用 SOCIAL_LINK_PREVIEW_BOTS（Allow:/＋共通非公開パス除外）へ移動。FacebookBot等の学習クローラ遮断は維持。og:image/og:title/twitter card は layout.tsx で /api/og フォールバック敷設済みを確認。robots.test.ts で回帰固定（5 it）。

## 補充の指針（未着手3件未満で起こす）
- docs/site-critique-2026-06-11/01-seo-technical.md・05-lighthouse.md の SEO/構造化データ系で自領域に閉じるもの。
