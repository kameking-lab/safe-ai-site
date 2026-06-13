# SEO/インフラ班 サイクルログ（並列マルチループ）

担当領域・契約は `loop-prompt-seo.txt` 参照。1イテレーション=1タスク、ゲート全緑(tsc/lint/vitest/build)後にPR。

---

## 2026-06-14 JST — 決裁A SNSリンクプレビュー復活（PR #522: seo/robots-fb-link-preview）

- robots.ts: `facebookexternalhit` を学習クローラ遮断リスト `AI_TRAINING_CRAWLERS` から、
  新設の専用許可リスト `SOCIAL_LINK_PREVIEW_BOTS`（`allow:/` ＋ 共通非公開パス `COMMON_DISALLOW` のみ除外）へ移動。
  これで FB/Messenger/Instagram にURLを貼った時の OGP リンクカード（og:image/og:title）が復活する。
- 学習用クローラ（GPTBot/ClaudeBot/FacebookBot/Bytespider/CCBot 等）の全面遮断は維持。
  ユーザー操作起点の OGP 取得 `facebookexternalhit` と、広告/インデックス用の `FacebookBot` を別UAとして明確化。
- 完了条件の og:image/og:title フォールバックは layout.tsx で `/api/og`（openGraph.images・twitter.images）が
  サイト全体テンプレートとして既に敷設済みであることを確認。本タスクでは robots 側のみ変更。
- 回帰テスト `src/app/robots.test.ts` を新設（5 it）。facebookexternalhit=Allow / 学習クローラ=Disallow:/ を固定。
- ゲート: `tsc --noEmit`=0 / `lint` errors=0（warning のみ既存） / `vitest run`（robots+sitemap）=17 pass / `build`=成功。
- BACKLOG-seo.md: C-3-3(#513)・C-3-4(#516) はマージ済のため [x] 完了へ移動。決裁A も [x] 完了。

---

## 2026-06-13 — 柱C-2 横断検索 /search 結果ページ新設（PR #518: seo/cross-search-results-page）

回収: PR #516（柱C-3-4 sitemap lastmod 動的化）をCI緑確認のうえ squash マージ→main を ff-only で同期。

着手: BACKLOG-seo 最上位の柱C-2（横断検索）。現状確認の結果、(a) インデックス(search-index.ts)は #514 で構築済、(b) 検索UIは app-shell の ⌘K コマンドパレット(CommandPalette.tsx)が既に `buildSearchIndex`/`searchItems` を消費していた。唯一の欠落は (c) 全件表示の結果ページ＝コマンドパレットは上位10件に固定で「もっと見る」先が存在しなかった。これを埋めた。

- `src/app/(main)/search/page.tsx`（server）＋`SearchResults.tsx`（client）を新設。URL `?q=`/`?cat=` を真実源にし、カテゴリタブ（すべて＋判例/通達/化学物質/教育/事故、件数バッジ付き）・空状態・0件状態・検索ボックス（クリア/送信）・全件リスト（カテゴリ色バッジ＋リンク）を実装。`noindex,follow`（サイト内検索の薄い重複ページをインデックスさせず、ヒット先のクロールは通す）。`PageJsonLd` で WebPage+BreadcrumbList。
- `search-index.ts`: `searchItems` に `limit` 引数を追加（既定10＝コマンドパレットの挙動は不変）。カテゴリ別件数集計 `countByCategory` を追加。
- `search-index.test.ts` を新規作成（スコアリング順・カテゴリ絞り込み・表記ゆれ正規化・limit・countByCategory・CATEGORY_META を9ケースで固定）。これまでテストが無かった検索ロジックを回帰から保護。
- `CommandPalette.tsx`: フッタに「すべての結果を見る → /search?q=<query>」導線を追加（2タップ以内で全件ページへ到達）。
- `json-ld.tsx`: `webSiteSchema()` の sitelinks SearchAction ターゲットを `/law-search?q=` から横断検索の `/search?q=` に正規化（サイト全体の検索ボックスの正しい入口に）。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warnings既存のみ・新規ファイルは警告0) / `vitest run`=200ファイル1665テスト全pass / `build`=成功（`○ /search` 静的生成を確認）。build再生成データ(rag-metrics-latest.json・chatbot-eval-fresh-results.json)は復元。working tree clean。

残: 決裁A（robots facebookexternalhit 許可リスト化）→ 柱C-4（共通 generateMetadata/JSON-LD/og フォールバック・lib部分）。

---

## 2026-06-14 — 柱C-4 JSON-LDヘルパー lib整備（PR #530: seo/c4-json-ld-lib-consolidate）

回収: PR #522（決裁A robots facebookexternalhit 許可化）をCI緑確認のうえ squash マージ。PR #524（柱C-2(b) 検索トリガ44px）は #522 マージ後に BACKLOG-seo.md が衝突したため origin/main を当該ブランチへ通常マージで解決（origin/main 版の「完了」再編を採用）→push、CI再走のため回収は次イテレーション。main を ff-only で同期。

着手: BACKLOG-seo 最上位の柱C-4（メタ部分）。現状確認: og:imageフォールバック(layout.tsx /api/og)・generateMetadataヘルパー(seo-metadata.ts の withSiteAlternates/withSiteOpenGraph/withSiteTwitter)・BreadcrumbList可視化(PageJsonLd + Breadcrumb)は既に敷設済み。残る穴は JSON-LDヘルパー本体（json-ld.tsx・約20関数）の (1) サイトURL/名のハードコード散在 と (2) テスト皆無 の2点だった。これを埋めた。

- `json-ld.tsx`: 散在する `"https://www.anzen-ai-portal.jp"`(22箇所) と `"安全AIポータル"`(13箇所) を `seo-metadata.ts` の `SITE_URL`/`SITE_NAME` へ集約。`apple-touch-icon.png` ロゴURLは `LOGO_URL` 定数へ一本化。ドメイン/サイト名変更時の修正点が1箇所に収束。**出力JSONは byte-identical（既存破壊0・捏造0）**。
- `json-ld.test.ts` 新規（23 it）: これまでゼロだった JSON-LDヘルパーの回帰テストを敷設。固定した不変条件＝`@context`/`@type` 正準値・`position` 1始まり(BreadcrumbList/HowTo/ItemList)・slice上限(ItemList10/FAQ20/DefinedTermSet50/Quiz10)・OG画像フォールバック(image欠落時 /api/og)・WebSite SearchAction の `/search` 正規化(/law-search 残存しない)・任意フィールド(image/keywords/offers/identifier/license/mentions)の条件出力。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warnings既存のみ) / `vitest run`=205ファイル1715テスト全pass(新規23含む) / `build`=成功。build再生成データ(rag-metrics-latest.json・chatbot-eval-fresh-results.json)は復元。working tree clean。

残: BACKLOG-seo 未着手キューは空。次イテレーションは補充の指針（site-critique の SEO/構造化データ系で自領域に閉じるもの）から起こす。
