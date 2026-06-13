# SEO/インフラ班 サイクルログ（並列マルチループ）

担当領域・契約は `loop-prompt-seo.txt` 参照。1イテレーション=1タスク、ゲート全緑(tsc/lint/vitest/build)後にPR。

---

## 2026-06-14 — 柱C-3-2/A-3 サイトマップ役割分担の是正（PR: seo/c3-circulars-sitemap-canonical）

回収: 緑だった PR #524（C-2(b) 44px）を squash マージ→main を ff-only 同期・clean 確認。緑だった PR #528（C-4 og:image フォールバック lib層）は #524 マージで BACKLOG-seo.md・cycle-log-seo.md が追記衝突→ origin/main を通常マージで解決(force-push不可を遵守)し push、CI 再走は次イテレーションで回収。#530（JSON-LD lib consolidate）は CI pending、次回回収。

着手前の現状確認: 補充指針（site-critique 01-seo-technical）を上から実機照合。S-1(articles soft404)・S-3(欠落 sitemap)・A-2(/audits 露出)・A-4(equipment 幽霊URL)・C-1(og:image) は既に是正済を確認。**未是正だったのは A-3 の役割崩壊**で、これを閉じた（捏造・水増しなし＝既存の作り直しではない実バグ修正）。

- **発見した実バグ**: `sitemap-circulars.xml` が `officialNotices`(data/mock/notices-and-precedents・`nt-*` ID)から `/circulars/<id>` を出力していたが、`/circulars/[id]` ルートの `generateStaticParams` は `mhlwNotices`(`mhlw-notice-NNNN`)しか解決しない。両データはID体系が完全に別（nt-2018-harness 等 vs mhlw-notice-0001 等）で、子サイトマップの全URLが 404＝幽霊URL(soft404)だった。柱C-3-2 で sitemap-equipment.xml に施した是正（safetyGoodsItems→getAllEquipment）と同型の取りこぼし。
- **発見した二重掲載**: 本体 `sitemap.xml`(sitemap.ts)が個別の `/circulars/<id>`(mhlwNotices 全件)・`/equipment/<id>`(getAllEquipment 全件)を直書きする一方、専用子サイトマップ(sitemap-circulars/-equipment.xml＝sitemap-index が列挙)も同一URLを出力。同じURLが2つのサイトマップに重複し、A-3 の「役割分担崩壊」状態だった。
- **修正（自班所有の sitemap ファイルのみ）**: ①`sitemap-circulars.xml` を正本 `mhlwNotices` へ差し替え、lastmod は発出日(issuedDate)追従＋null fallback＋未来日 cap（`latestIsoDate`、柱C-3-4 と整合）。②本体 `sitemap.ts` から `circularPages`・`equipmentPages` の直書きと spread を撤去し、個別ページは専用子サイトマップに一本化（本体は各セクションのランディング /circulars・/equipment-finder のみ保持）。データ・ルートは一切変更せず。
- **テスト**: `sitemap-circulars.xml/route.test.ts` を新規作成（6 it＝件数一致・全URLが mhlwNotices に解決・幽霊URLゼロ・nt-* 不在・lastmod の ISO/未来日なし・発出日追従）。`sitemap.test.ts` に役割分担の回帰（3 it＝個別通達/保護具URLが本体に直書きされない・ランディングは残す）を追加。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warnings 既存のみ) / `vitest run`=206ファイル1709テスト全pass / `build`=成功。build 再生成データ(rag-metrics-latest.json・chatbot-eval-fresh-results.json)は復元。working tree clean。

残: 未着手キュー先頭は柱C-4（JSON-LD lib 整備＝#530 で着手中）。次は #528/#530 のCI回収→マージを優先し、補充は site-critique の B 系（B-1 h1 構造・B-2 description）で自領域に閉じるものから。

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

## 2026-06-14 — 柱C-2(b) 仕上げ: モバイル検索トリガを 44px タップ標的へ（PR: seo/c2-search-ui-tap-target）

回収: PR #518（柱C-2 /search 結果ページ）をCI緑（e2e/smoke pass）確認のうえ squash マージ→main を ff-only 同期・clean 確認。決裁A（#522）と C-4 は未マージ/未着手のまま。

着手前の現状確認: main 版 BACKLOG では C-2 は [x]（検索UI=⌘K パレット既存を流用）だったが、C-2(b) の spec が明記する「44px・CLS非破壊」のうち **44px が未充足**だった。app-shell モバイルヘッダの検索アイコンボタンが `h-9 w-9`=36px で、WCAG 2.5.5（Target Size 拡張・44px）に未達。merge 済み実装が ⌘K パレットを流用しただけでトリガ自体の標的サイズは詰めていなかったため、この spec ギャップのみを閉じた（捏造・水増しなし）。

- `app-shell.tsx`: モバイル検索ボタンを `h-9 w-9`(36px)→`h-11 w-11`(44px)、アイコンも `h-4`→`h-5` に調整。固定サイズのため CLS 非破壊。あわせて欠けていた dark variant（`dark:border-slate-700 dark:bg-slate-800 …`）を隣接メニューボタンと揃えて補完し、`aria-keyshortcuts="Control+K"` を付与（支援技術にショートカットを明示）。
- 当班 custodian ファイル（app-shell.tsx）の検索UI限定の改変。他班所有領域・本文・メタ以外の見た目は不変。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings 既存のみ）/ `vitest run`=200ファイル1665テスト全pass / `build`=成功。build 再生成データ（rag-metrics-latest.json・chatbot-eval-fresh-results.json）は復元。working tree clean。

残: 決裁A（#522 CI待ち回収）→ 柱C-4（共通 generateMetadata/JSON-LD/og フォールバック・lib部分。json-ld.tsx に20関数既存・未テスト→回帰スイート固定が次の一手）。
