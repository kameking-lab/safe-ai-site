# BACKLOG-seo — SEO/インフラ班のタスクキュー（並列ループ・2026-06-13〜）

担当領域・契約・絶対ルールは loop-prompt-seo.txt を参照。所有ファイル=sitemap*/robots/manifest/seo-lib/JSON-LDヘルパー/横断検索(search-index・fuzzy-search・notice-search・/search)/app-shell(検索UIのみ)/両layout(metadataのみ)。**着手前に必ず本番とコードの現状を確認**（走行中の全領域ループが先に消化している項目があるため、済みなら[x]にして次へ）。マスター BACKLOG.md は参照専用。

## 未着手（上から処理）
- [ ] 【柱C-2・S 横断検索（残りを1イテレーション1サブで）】(a) web/src/lib/search-index.ts のインデックス拡充＋ユニットテスト固定（条文・通達・判例・標識・主要機能を串刺し／「アーク溶接 特別教育」→教育資格DBが上位）。(b) app-shell.tsx に共通検索UI（モバイル=アイコン1タップ展開・44px・CLS非破壊）。(c) /search 結果ページ（カテゴリ別・空状態・2タップ以内到達）＋本番実機検証。※(a)(c)はPR#518で着手済（マージ待ち）。残りは(b)app-shellの共通検索UI差し込み。
- [ ] 【柱C-4・S（メタ部分のみ・本文SSRは各route所有UI班）】サイト共通の generateMetadata 整備・JSON-LD(BreadcrumbList可視化のlib部分)・og:image欠落のフォールバック敷設。route本文の変更は当班はしない。※og:imageフォールバックは layout.tsx で /api/og 敷設済み（決裁A確認時）。残りは JSON-LD ヘルパーの lib 整備。

## 完了
- [x] 【柱C-3-3・S】欠落ページのsitemap追加 — 済（#513 マージ済。/court-cases・/whats-new・/site-records 系を sitemap.ts へ収載、sitemap.test.ts で回帰固定）。
- [x] 【柱C-3-4・S】lastmod動的化 — 済（#516 マージ済。各データ実更新日から生成・未来日capで阻止、lib/sitemap/lastmod）。
- [x] 【決裁A・柱C】SNSリンクプレビュー復活 — 済（seo/robots-fb-link-preview）。facebookexternalhit を AI_TRAINING_CRAWLERS から専用 SOCIAL_LINK_PREVIEW_BOTS（Allow:/＋共通非公開パス除外）へ移動。FacebookBot等の学習クローラ遮断は維持。og:image/og:title/twitter card は layout.tsx で /api/og フォールバック敷設済みを確認。robots.test.ts で回帰固定（5 it）。

## 補充の指針（未着手3件未満で起こす）
- docs/site-critique-2026-06-11/01-seo-technical.md・05-lighthouse.md の SEO/構造化データ系で自領域に閉じるもの。
