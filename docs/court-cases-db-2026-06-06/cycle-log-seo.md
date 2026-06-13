# SEO/インフラ班 サイクルログ（並列マルチループ）

担当領域・契約は `loop-prompt-seo.txt` 参照。1イテレーション=1タスク、ゲート全緑(tsc/lint/vitest/build)後にPR。

---

## 2026-06-14 — 柱C-4 og:image フォールバックを lib層で敷設（PR: seo/c4-og-image-fallback-lib）

回収: PR #522（決裁A robots facebookexternalhit 許可リスト化）が origin/main 追記と衝突→ origin/main を通常マージで解決(BACKLOG-seo.md・cycle-log-seo.md の追記衝突のみ、force-push不可を遵守)、ゲート再確認のうえ push。CI再走待ちは次イテレーションで回収。PR #524（C-2(b) モバイル検索トリガ 44px）はCI pending、これも次回回収。

着手: BACKLOG-seo 最上位の柱C-4（メタ部分のみ・lib層）。現状確認の結果、3要素のうち2つは既に整備済だった——(1) generateMetadata は `seo-metadata.ts`（withSiteAlternates/withSiteOpenGraph/withSiteTwitter）、(2) BreadcrumbList可視化は `page-json-ld.tsx`（JSON-LD WebPage+BreadcrumbList）＋ `breadcrumb.tsx`（可視 nav）。唯一の実バグは (3) og:image フォールバックの欠落だった。

- **発見した退行**: Next.js の metadata は openGraph を**浅マージ＝丸ごと置換**する（`node_modules/next/dist/docs/.../generate-metadata.md` L1358「All openGraph fields are replaced」で確認）。ルート `layout.tsx` が `images:[/api/og]` を敷いていても、ページが独自 `openGraph` を export すると root の画像ごと消え、og:image が欠落する。`withSiteOpenGraph` は type/locale/siteName/url は再付与していたが images は付け直していなかったため、helper を使う全ページが og:image を失っていた（実測 /bcp・/insurance 等＝site-critique C-1 と一致）。twitter も同様。
- **修正（lib層のみ）**: `seo-metadata.ts` に `DEFAULT_OG_IMAGE`(/api/og・1200x630・alt)/`DEFAULT_OG_IMAGE_URL` を新設し、`withSiteOpenGraph` の既定 `images` と `withSiteTwitter` の既定 `images` に敷設。`...extra` を後置きにしているため、ページが独自画像を渡せば従来どおり上書きされる。helper 利用 32 ページの og:image/twitter image フォールバックが route 本文を一切触らず一括復活。
- **テスト**: `seo-metadata.test.ts` を新規作成（12本）。canonical 絶対化・ルート末尾スラッシュ無し・先頭スラッシュ正規化・hreflang(ja/en/x-default)同一化・og 既定値・**画像フォールバック存在**・独自画像優先・twitter card+画像フォールバックを固定。これまで 32 ページが依存しながらテスト 0 本だった seo-lib を回帰から保護。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warnings既存のみ) / `vitest run`=201ファイル1682テスト全pass / `build`=成功。build再生成データ(rag-metrics-latest.json・chatbot-eval-fresh-results.json)は復元。working tree clean。

残: 未着手キューは空。次は補充指針（site-critique の SEO/構造化データ系で自領域に閉じるもの＝B-2 description テンプレートの lib化、C-2 404 横断検索ボックス等）から起こす。

---

## 2026-06-13 — 柱C-2 横断検索 /search 結果ページ新設（PR: seo/cross-search-results-page）

回収: PR #516（柱C-3-4 sitemap lastmod 動的化）をCI緑確認のうえ squash マージ→main を ff-only で同期。

着手: BACKLOG-seo 最上位の柱C-2（横断検索）。現状確認の結果、(a) インデックス(search-index.ts)は #514 で構築済、(b) 検索UIは app-shell の ⌘K コマンドパレット(CommandPalette.tsx)が既に `buildSearchIndex`/`searchItems` を消費していた。唯一の欠落は (c) 全件表示の結果ページ＝コマンドパレットは上位10件に固定で「もっと見る」先が存在しなかった。これを埋めた。

- `src/app/(main)/search/page.tsx`（server）＋`SearchResults.tsx`（client）を新設。URL `?q=`/`?cat=` を真実源にし、カテゴリタブ（すべて＋判例/通達/化学物質/教育/事故、件数バッジ付き）・空状態・0件状態・検索ボックス（クリア/送信）・全件リスト（カテゴリ色バッジ＋リンク）を実装。`noindex,follow`（サイト内検索の薄い重複ページをインデックスさせず、ヒット先のクロールは通す）。`PageJsonLd` で WebPage+BreadcrumbList。
- `search-index.ts`: `searchItems` に `limit` 引数を追加（既定10＝コマンドパレットの挙動は不変）。カテゴリ別件数集計 `countByCategory` を追加。
- `search-index.test.ts` を新規作成（スコアリング順・カテゴリ絞り込み・表記ゆれ正規化・limit・countByCategory・CATEGORY_META を9ケースで固定）。これまでテストが無かった検索ロジックを回帰から保護。
- `CommandPalette.tsx`: フッタに「すべての結果を見る → /search?q=<query>」導線を追加（2タップ以内で全件ページへ到達）。
- `json-ld.tsx`: `webSiteSchema()` の sitelinks SearchAction ターゲットを `/law-search?q=` から横断検索の `/search?q=` に正規化（サイト全体の検索ボックスの正しい入口に）。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warnings既存のみ・新規ファイルは警告0) / `vitest run`=200ファイル1665テスト全pass / `build`=成功（`○ /search` 静的生成を確認）。build再生成データ(rag-metrics-latest.json・chatbot-eval-fresh-results.json)は復元。working tree clean。

残: 決裁A（robots facebookexternalhit 許可リスト化）→ 柱C-4（共通 generateMetadata/JSON-LD/og フォールバック・lib部分）。
