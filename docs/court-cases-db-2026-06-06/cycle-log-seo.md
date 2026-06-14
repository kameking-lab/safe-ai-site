# SEO/インフラ班 サイクルログ（並列マルチループ）

担当領域・契約は `loop-prompt-seo.txt` 参照。1イテレーション=1タスク、ゲート全緑(tsc/lint/vitest/build)後にPR。

---

## 2026-06-14 — 柱C-2 横断検索の通達を個別詳細へ深リンク化（PR: seo/c2-notices-deeplink）

回収: 緑だった PR #556（C-3-4 DRY sitemap freshest 単一ソース化）を squash マージ→main を ff-only 同期・clean 確認。#561（C-2 事故深リンク）は #556 マージで BACKLOG/cycle-log が追記衝突→当該ブランチへ origin/main を通常マージで解決（両 [x]・両イテレーション記録を併存・force-push なし）し再 push（CI 再走は次イテレーションで回収）。#566（C-2 法令条文収載）は CI（e2e/smoke）進行中＝マージ不可、次回回収。

着手: BACKLOG 未着手キューは空（C-3-4 DRY が #556 で消化済）。補充指針（site-critique 01-seo-technical の C-2＝横断検索の発見性）から、走行中の #561/#566 と非競合（search-index.ts の別ブロック＝通達ブロックのみ改変）の自領域タスクを選択。

- **現状確認（実バグ）**: 横断検索(/search・⌘K)の通達カテゴリ（mhlwNotices 全件）は url が `/resources?q=<title slice 50>` だったが、`resources-client.tsx` を grep した結果 `?q=` URL パラメータを**一切読まない**ことを確認。＝検索した個別通達へ到達できず、毎回 /resources の全1,158件一覧へ無フィルタで落ちていた（#561 の事故フラットリンクと同型・かつ q が黙殺される分さらに悪い発見性の穴）。一方 `/circulars/[id]` 詳細ルートは `generateStaticParams` が mhlwNotices 全件の id を解決する（findNotice で照合・未解決は notFound()）ことを確認＝深リンク先が必ず実在。
- **修正（自班所有の search-index.ts のみ）**: 通達ブロックの url を `/circulars/${n.id}` へ深リンク化。正本 mhlwNotices 由来 id のため検索結果→詳細が**必ず解決（幽霊URL/soft404 0）**し、今後の通達データ追加にも自動追従する。subtitle（noticeNumber/docType + 発出日）は据え置き。データ・ルート・他班ファイルは一切不変。捏造0＝既存正本データのみ使用。
- **テスト**: `search-index.test.ts` に2本追加（計14 it）。①全 notice が `/circulars/<id>` で始まり `/resources?q=` を含まず、url の id == item.id（`notice-<id>`）対応＝旧バグと幽霊URL を固定。②深リンク先 id 集合 == 正本 `mhlwNotices` の id 集合・件数一致＝詳細の generateStaticParams が解決する集合との一致を固定（将来の取りこぼし検知）。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings 既存46のみ・自班ファイル0）/ `vitest run`=223ファイル1865テスト全pass（新規2含む） / `build`=成功。build 再生成データ（docs/rag-metrics-latest.json・chatbot-eval-fresh-results.json）は復元。working tree clean。

残: #561・#566 の CI 緑回収＆マージ。補充は site-critique 残件のうち自領域に閉じるもの（化学物質/教育カテゴリも同様に `/chemical-database?q=`・`/e-learning` フラットリンク＝深リンク余地ありだが #561/#566 のマージ後＝search-index.ts 競合回避のため後続イテレーションで）。

---

## 2026-06-14 — 柱C-2 横断検索に法令条文（law）を収載（PR: seo/c2-laws-cross-search）

回収: CI 緑だった自分の PR #553（決裁A robots 学習UA拡張）を squash マージ→main を ff-only 同期・clean 確認。#556（C-3-4 DRY sitemap freshness）は #553 マージで BACKLOG/cycle-log の追記衝突→当該ブランチへ origin/main を通常マージで解決（両イテレーション記録を併存・force-push なし）し push。#556 は CI 再走のため回収は次イテレーション（CI は元々 e2e/smoke 緑）。

着手: 補充指針（site-critique 01-seo-technical の C-2＝横断検索の発見性）。在庫キュー先頭の C-3-4 DRY後追いは #556 で実施済み（マージ待ち）のため、非競合の自領域タスクとして「法令条文の横断検索収載」を選択。

- **現状確認（捏造・水増しなし）**: 横断検索インデックス(`search-index.ts`)は 判例/事故/化学物質/通達/教育/用語 の6カテゴリを収載するが、**法令本文(`@/data/laws`)が 0 件**だった。安全関連ユーザーの最頻・最高意図クエリ「安衛則 第○条」「足場 規則」等が /search・⌘K で全くヒットせず、法令を引く唯一の手段が専用ページ /law-search のみという発見性の穴。
- **修正（自班所有の検索ファイルのみ）**: `search-index.ts` に `law` カテゴリを追加。`@/data/laws` の `allLawArticles` を read-only import し、curated 中核（厚労省PDF補完=`mhlwLawArticles` は law 値が文書バンドル名で条文単位の深リンクUXに合わず除外。`law/index.ts` の LAW_SOURCE_COUNT と同じ方針）を数百条規模収載。`(law, articleNum)` でユニーク化。title=`略称 条番号`（例「安衛則 第518条」＝略称の前方一致・条番号の部分一致に効く）、subtitle=`正式名称　条文見出し　本文冒頭`（正式名称・見出し語からのヒットと結果一覧での即答）。url=`/law-search?law=<正式名称>&art=<条番号>` で当該条文へ深リンク（パネルの filter `a.law===selectedLaw` と同形＝full law 名で確実に解決）。
- **UI（当班 C-2 検索UI）**: `/search` SearchResults と app-shell の ⌘K CommandPalette のカテゴリ配列に `law` を**先頭**追加（法令は中核コンテンツ）＋アイコン `BookText`。`CATEGORY_META`(配色=teal)・`countByCategory` の初期化も拡張。ページ説明文に「法令条文」を追記。
- **網羅の限界を明記**: 厚労省PDF抽出の補完ソース（mhlwLawArticles）は条文単位の深リンクに不適なため除外。必要なら別途 /law-search の mhlw モードで引ける（当班外データ）。今回収載分は実在の法令条文データで、これまで検索 0 件だった分の純増。
- **テスト**: `search-index.test.ts` に law 統合テスト4本を追加（300条以上収載・全件 /law-search 深リンク・略称/正式名称/見出し語ヒット・深リンク URL がパネルと同形＋id 一意＋PDF補完混入なし）。CATEGORY_META 網羅テストにも law を追加。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warnings 既存のみ・自班ファイル0) / `vitest run`（search-index.test.ts=16 pass）/ `build`=Compiled successfully。working tree clean。

残: #556 の CI 緑回収＆マージ → 補充は site-critique の自領域に閉じる残件（横断検索の AND トークン化・法令略称ゆれ吸収など）から起こす。

---

## 2026-06-14 — 柱C-2 横断検索に用語集（glossary）を収載（PR: seo/c2-glossary-cross-search）

回収: 緑だった PR #537（C-3-2 サイトマップ役割分担）を squash マージ→main を ff-only 同期・clean 確認。#537 マージで PR #541（C-2 404横断検索）・#547（C-3-4 sitemap-index lastmod）が BACKLOG/cycle-log の追記衝突で CONFLICTING→ origin/main を各ブランチへ通常マージで解決(force-push不可を遵守)・全ゲート再緑(tsc0/lint0/vitest全pass/build成功)を確認し push。#541/#547 とも CI 再走のため回収は次イテレーション。

着手: 補充指針（site-critique 01-seo-technical の C-2＝横断検索の発見性）。在庫キューは空、かつ先頭の C-3-4 DRY後追いは依存先 `lib/sitemap/freshness.ts` が未マージ #547 にしか無く着手不可のため、双方と非競合の自領域タスクとして「横断検索の用語集収載」を選択。

- **現状確認**: 横断検索インデックス(`search-index.ts`)は 判例/事故/化学物質/通達/教育 の5カテゴリを収載するが、**用語集(/glossary・約251語)が 0 件**だった。「足場とは」「玉掛けとは」等の高意図クエリが /search・⌘K で全くヒットしない発見性の穴。
- **修正（自班所有の検索ファイルのみ）**: `search-index.ts` に `glossary` カテゴリを追加。`@/data/glossary` の 4 バッチ 152 語を read-only import で収載（id=`glossary-<term>`・title=用語名・subtitle=`読み　定義冒頭60字`・url=/glossary）。subtitle に読み(かな)と定義冒頭を載せることで、用語名／かな読み／定義中の語のいずれからもヒットし、結果一覧に定義が即表示される。`/search` の `SearchResults.tsx` と app-shell の ⌘K `CommandPalette.tsx`（いずれも当班 C-2 検索UI）にカテゴリ配列＋アイコン(BookMarked)＋件数タブを追加。`CATEGORY_META`(配色=indigo)／`countByCategory` の初期化も拡張。
- **網羅の限界を明記（捏造・水増しなし）**: /glossary 本体 `page.tsx` に直書きされた基礎語約99語は ux-hub 所有ページ内で未 export のため対象外。完全網羅には用語データの `@/data/glossary` 一元化が要るが、それは他班(data/ux-hub)領域＝当班では行わない。今回収載した 152 語は実在データで、これまで検索 0 件だった分の純増。
- **テスト**: `search-index.test.ts` に glossary 統合テスト3本を追加（実データ buildSearchIndex で 152語以上収載・全件 /glossary リンク・id 接頭辞／用語名・かな読み・定義語ヒット／countByCategory の all が glossary 含む全合計一致）。CATEGORY_META 網羅テストにも glossary を追加。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warnings 既存のみ) / `vitest run`=212ファイル1790テスト全pass（新規3含む） / `build`=成功。build 再生成データ(rag-metrics-latest.json・chatbot-eval-fresh-results.json)は復元。working tree clean。

残: #541/#547 の CI 回収→マージが最優先。補充は site-critique 残件のうち自領域に閉じるもの（C-3-4 DRY後追いは #547 マージ後に解禁）。

## 2026-06-14 — 柱C-2 404 ページに横断検索ボックス（PR: seo/c2-404-cross-search）

回収: 緑だった PR #528（C-4 og:image lib層）を squash マージ→main を ff-only 同期・clean 確認。#528 マージで PR #530（JSON-LD lib consolidate）が CONFLICTING（seo-metadata.ts 周辺ではなく BACKLOG/cycle-log の追記衝突）→ origin/main を通常マージで解決(force-push不可)・全ゲート再緑を確認し push。同様に PR #537（C-3-2 サイトマップ役割分担）も #528 マージで追記衝突→通常マージで解決・全ゲート再緑・push。#530/#537 とも CI 再走のため回収は次イテレーション。

着手: 補充指針（site-critique 01-seo-technical）の **C-2「404どん詰まり」**。在庫キュー先頭の C-4(JSON-LD) は #530 で着手中・本体 sitemap.ts は #537 で改変中のため、双方と衝突しない自領域タスクとして C-2 を選択（横断検索＝当班の C-2 領域）。

- **現状確認**: 404 は2系統。`(main)/not-found.tsx` は app-shell 配下（ナビ＋⌘K 検索あり・リンク6本）で問題なし。critique が実測した「ヘッダーナビ0・検索手段なし・リンク4本」はグローバル fallback の `app/not-found.tsx`（app-shell 外）だった。ここを是正。
- **修正（グローバル shell ページのみ）**: `app/not-found.tsx` に (1) サイト内横断検索ボックス＝JS 非依存のネイティブ `<form action="/search" method="get">`（入力 `name="q"`、`/search` の `useSearchParams.get('q')` と一致）と (2) 主要機能ランチャー（法令/事故/判例/通達/KY/Eラーニング/安衛法チャット/問い合わせ＝全て sitemap 収載の実在ページ）を新設。旧URL流入・タイポ流入の取りこぼしを検索1発で回収できるようにした。app-shell 外で JS 描画に頼れないため、サーバーレンダリングのみで検索手段が成立するネイティブフォームを採用。入力/送信ボタンは `min-h-11`（44px・WCAG 2.5.5）。
- **テスト**: `not-found.test.tsx` 新規（5 it＝フォームが GET で /search へ送る・`name=q` 入力・ラベル紐付け・44px タップ標的・主要機能リンク実在・noindex,nofollow 維持）。
- **不可侵**: data/他班 route/機能コンポーネントには一切触れず。本ページはどの機能 UI 班にも属さないグローバル shell（robots/manifest と同列）で、追加要素は横断検索＝当班 C-2 領域に閉じる。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warnings 既存のみ) / `vitest run`=207ファイル1717テスト全pass（新規5含む） / `build`=成功。build 再生成データ(rag-metrics-latest.json・chatbot-eval-fresh-results.json)は復元。working tree clean。

残: #530（JSON-LD lib）/#537（サイトマップ役割分担）の CI 回収→マージが最優先。補充は site-critique の B 系（B-1 h1 構造は各ページ UI 班・当班外、B-2 description は lib テンプレ化が当班可能だが消費は各 route UI 班）から自領域に閉じるものを選定。

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

## 2026-06-14 — 柱C-4 og:image フォールバックを lib層で敷設（PR: seo/c4-og-image-fallback-lib）

回収: PR #522（決裁A robots facebookexternalhit 許可リスト化）が origin/main 追記と衝突→ origin/main を通常マージで解決(BACKLOG-seo.md・cycle-log-seo.md の追記衝突のみ、force-push不可を遵守)、ゲート再確認のうえ push。CI再走待ちは次イテレーションで回収。PR #524（C-2(b) モバイル検索トリガ 44px）はCI pending、これも次回回収。

着手: BACKLOG-seo 最上位の柱C-4（メタ部分のみ・lib層）。現状確認の結果、3要素のうち2つは既に整備済だった——(1) generateMetadata は `seo-metadata.ts`（withSiteAlternates/withSiteOpenGraph/withSiteTwitter）、(2) BreadcrumbList可視化は `page-json-ld.tsx`（JSON-LD WebPage+BreadcrumbList）＋ `breadcrumb.tsx`（可視 nav）。唯一の実バグは (3) og:image フォールバックの欠落だった。

- **発見した退行**: Next.js の metadata は openGraph を**浅マージ＝丸ごと置換**する（`node_modules/next/dist/docs/.../generate-metadata.md` L1358「All openGraph fields are replaced」で確認）。ルート `layout.tsx` が `images:[/api/og]` を敷いていても、ページが独自 `openGraph` を export すると root の画像ごと消え、og:image が欠落する。`withSiteOpenGraph` は type/locale/siteName/url は再付与していたが images は付け直していなかったため、helper を使う全ページが og:image を失っていた（実測 /bcp・/insurance 等＝site-critique C-1 と一致）。twitter も同様。
- **修正（lib層のみ）**: `seo-metadata.ts` に `DEFAULT_OG_IMAGE`(/api/og・1200x630・alt)/`DEFAULT_OG_IMAGE_URL` を新設し、`withSiteOpenGraph` の既定 `images` と `withSiteTwitter` の既定 `images` に敷設。`...extra` を後置きにしているため、ページが独自画像を渡せば従来どおり上書きされる。helper 利用 32 ページの og:image/twitter image フォールバックが route 本文を一切触らず一括復活。
- **テスト**: `seo-metadata.test.ts` を新規作成（12本）。canonical 絶対化・ルート末尾スラッシュ無し・先頭スラッシュ正規化・hreflang(ja/en/x-default)同一化・og 既定値・**画像フォールバック存在**・独自画像優先・twitter card+画像フォールバックを固定。これまで 32 ページが依存しながらテスト 0 本だった seo-lib を回帰から保護。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warnings既存のみ) / `vitest run`=201ファイル1682テスト全pass / `build`=成功。build再生成データ(rag-metrics-latest.json・chatbot-eval-fresh-results.json)は復元。working tree clean。

残: 未着手キューは空。次は補充指針（site-critique の SEO/構造化データ系で自領域に閉じるもの＝B-2 description テンプレートの lib化、C-2 404 横断検索ボックス等）から起こす。

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

---

## 2026-06-14 — 柱C-2(b) 仕上げ: モバイル検索トリガを 44px タップ標的へ（PR: seo/c2-search-ui-tap-target）

回収: PR #518（柱C-2 /search 結果ページ）をCI緑（e2e/smoke pass）確認のうえ squash マージ→main を ff-only 同期・clean 確認。決裁A（#522）と C-4 は未マージ/未着手のまま。

着手前の現状確認: main 版 BACKLOG では C-2 は [x]（検索UI=⌘K パレット既存を流用）だったが、C-2(b) の spec が明記する「44px・CLS非破壊」のうち **44px が未充足**だった。app-shell モバイルヘッダの検索アイコンボタンが `h-9 w-9`=36px で、WCAG 2.5.5（Target Size 拡張・44px）に未達。merge 済み実装が ⌘K パレットを流用しただけでトリガ自体の標的サイズは詰めていなかったため、この spec ギャップのみを閉じた（捏造・水増しなし）。

- `app-shell.tsx`: モバイル検索ボタンを `h-9 w-9`(36px)→`h-11 w-11`(44px)、アイコンも `h-4`→`h-5` に調整。固定サイズのため CLS 非破壊。あわせて欠けていた dark variant（`dark:border-slate-700 dark:bg-slate-800 …`）を隣接メニューボタンと揃えて補完し、`aria-keyshortcuts="Control+K"` を付与（支援技術にショートカットを明示）。
- 当班 custodian ファイル（app-shell.tsx）の検索UI限定の改変。他班所有領域・本文・メタ以外の見た目は不変。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings 既存のみ）/ `vitest run`=200ファイル1665テスト全pass / `build`=成功。build 再生成データ（rag-metrics-latest.json・chatbot-eval-fresh-results.json）は復元。working tree clean。

残: 決裁A（#522 CI待ち回収）→ 柱C-4（共通 generateMetadata/JSON-LD/og フォールバック・lib部分。json-ld.tsx に20関数既存・未テスト→回帰スイート固定が次の一手）。

---

## イテレーション: 柱C-3-4 / A-3 サイトマップ index/equipment の lastmod 動的化（seo/c3-sitemap-index-lastmod）

回収: 自分の CI 緑 PR #530（C-4 JSON-LD lib集約）を squash マージ。#537（C-3-2 役割分担是正）は #530 マージで BACKLOG/cycle-log が衝突→当該ブランチへ origin/main を通常マージで解決（追記の両立・force-push なし）し再 push（CI 再走は次イテレーションで回収）。#541（C-2 404 横断検索）は CI 進行中＝次イテレーション回収。main を ff-only で同期し clean 確認。

着手前の現状確認: BACKLOG キュー空のため「補充の指針」の docs/site-critique-2026-06-11/01-seo-technical.md を本番コードと突合。S-1（articles 毒シェル）・S-3（court-cases等 sitemap 不在）・A-1（AI検索ボット分離）・A-2（内部レポート公開→/admin/audits へ移動済＝COMMON_DISALLOW でカバー）・A-4（旧equipment ID シェル）は **既に是正済み** を確認（[x] 化対象なし）。残る実害として **A-3 の lastmod 信頼性**を精査: `sitemap.ts`（本体）は #516 で実データ日に追従済みだが、**`sitemap-index.xml` は全子サイトマップに当日（new Date()）を直打ち**＝中身不変でも lastmod が毎日動く lastmod スパムが残存。同型のバグが `sitemap-equipment.xml` の per-URL lastmod にも残っていた。

- 新設 `web/src/lib/sitemap/freshness.ts`: 純粋関数 `computeSitemapFreshness(buildToday)`。各セクション実データ最新日（freshestNews/LawRevision/Notice/CourtCase/accidents/equipment/article＋集約の siteFreshest）を `latestIsoDate`（#516）で導出。未来日はビルド日 cap で除外、fallback 値は `sitemap.ts` と一致させ出力乖離を防止。
- `sitemap-index.xml/route.ts`: 4子（本体=siteFreshest / 記事=freshestArticle / 通達=freshestNotice / 保護具=equipmentDataUpdated）の lastmod を実データ日へ。
- `sitemap-equipment.xml/route.ts`: per-URL lastmod を当日→equipmentDataUpdated（保護具DB生成日）へ。
- テスト: `freshness.test.ts`(6 it)＝形式/cap以下/決定性/「未来 cap を渡しても cap 値そのものを返さない＝当日固定の lastmod スパムでない」/siteFreshest 単調性。`sitemap-index.xml/route.test.ts`(4 it)＝sitemapindex 構造・4子列挙・lastmod 形式・各子が実データ最新日に一致。
- 競合回避: #537 が編集中の `sitemap.ts` 本体と circulars route は**非改変**。冒頭 freshest 群の DRY 寄せ（computeSitemapFreshness へ集約）は #537 マージ後の後追いタスクとして BACKLOG 未着手に明記。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings 既存のみ・自班ファイル 0）/ `vitest run`=212ファイル1759テスト全pass / `build`=Compiled successfully。working tree clean。

残: #537・#541 の CI 緑回収＆マージ → C-3-4 DRY 後追い（sitemap.ts を freshness.ts 利用へ・#537 マージ後）。

---

## 2026-06-14 柱C-2 横断検索の事故事例 全件収載＋個別詳細への深リンク化 (#561)

回収: #552（用語集横断検索）squashマージ済。#553（robots AI学習UA拡張）は #552 マージ後に BACKLOG/cycle-log で追記衝突 → origin/main を通常マージで解決し push（CI 緑は次イテレーションで回収）。

着手: 当班所有の横断検索を点検したところ、`search-index.ts` の事故カテゴリに2つの穴を発見。(1) 事故データは正本 `getAccidentCasesDataset()` が**7ファイル**を merge するのに対し、search-index は **5ファイルだけを手で import** しており `real-accident-cases-2024-2026`・`real-accident-cases-2025-preliminary` が横断検索から丸ごと欠落（近年・速報の事故が /search・⌘K で 0 ヒット＝発見性の穴）。(2) 全事故結果が一覧トップ `/accidents` へリンクし、検索した個別事故の詳細へ到達できなかった（`/accidents/[id]` 詳細ページは実在するのに未活用）。

修正: 事故ブロックを正本 `getAccidentCasesDataset()` 単一ソースへ寄せ（＝詳細 `/accidents/[id]` が `findAccident` で解決する集合そのもの）、url を `/accidents/<id>` へ深リンク化。正本由来IDのため検索結果→詳細が**必ず解決（幽霊URL/soft404 0）**し、今後の事故データ追加にも自動追従する（5/7 の手 import 漏れが再発しない）。subtitle に severity・occurredOn を追加し、件数増後の同名・類似事故を区別可能に。捏造0＝既存正本データのみ使用、新規データ作成なし。

テスト: `search-index.test.ts` に2本追加（計14 it）。①index の事故ID集合 == 正本 `getAccidentCasesDataset()` のID集合（欠落是正を固定＝将来ファイル追加漏れを検知）。②全件 `/accidents/<id>` 深リンク・裸 `/accidents` 不在・url id と item.id 対応（旧バグと幽霊URL を固定）。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings 既存のみ・自班ファイル0）/ `vitest run`=219ファイル1838テスト全pass / `build`=成功。working tree clean。

残: #553・#556 の CI 緑回収＆マージ → C-3-4 DRY 後追い（#537 マージ後）。

---

## イテレーション: 決裁A拡張 robots 後発AI学習専用UAの遮断拡張（seo/robots-ai-training-extended）

回収: 自分の CI 緑 PR #547（C-3-4/A-3 sitemap-index/equipment lastmod 動的化）を squash マージ。#552（C-2 用語集152語収載）は #547 マージで BACKLOG/cycle-log の追記が衝突→当該ブランチへ origin/main を通常マージで解決（両 [x] 追記を併存・force-push なし）し再 push（CI 再走は次イテレーションで回収）。main を ff-only で同期し clean 確認。

着手内容: 2026-06-11 オーナー決裁「学習系は遮断継続／検索引用系は許可」を、**その後に各社が分離・新設した AI学習専用UA へ機械的に拡張**（新規方針判断ではない）。`robots.ts` の `AI_TRAINING_CRAWLERS` に Google-Extended（Gemini学習）・Applebot-Extended（Apple Intelligence学習）・Meta-ExternalAgent（Meta AI学習・FacebookBot とは別UA）・cohere-ai(+cohere-training-data-crawler)・PanguBot・AI2Bot・Timpibot・Webzio-Extended・FriendlyCrawler・ImagesiftBot・img2dataset・Kangaroo Bot を追加。

不可侵の確認（検索流入を一切損なわない）: `*-Extended` は**学習オプトアウト専用UAで、検索インデックス用の Googlebot/Applebot とは別物**。Disallow にしても検索順位・流入には影響しない。あわせて許可リスト `AI_SEARCH_CITATION_BOTS` へ Anthropic 現UA（Claude-User＝ユーザー操作起点／Claude-SearchBot＝検索インデックス）を追記し、旧称 Claude-Web は後方互換で残置（学習用 ClaudeBot は遮断のまま）。

テスト: `robots.test.ts` に回帰3本を追加し計8 it。①後発学習UA(Google-Extended/Applebot-Extended/Meta-ExternalAgent/cohere-ai/AI2Bot/PanguBot)=disallow:/ かつ Allow:/ を持たない。②検索クローラ Googlebot/Applebot は**専用の遮断ルールを持たず** UA:* の Allow:/ が適用＝同名プレフィックスの -Extended 追加で巻き込まれていないことを保証。③Claude-SearchBot/Claude-User=Allow:/・ClaudeBot=disallow:/。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings 既存のみ）/ `vitest run`=215ファイル1813テスト全pass / `build`=Compiled successfully。working tree clean。

残: #552 の CI 緑回収＆マージ → C-3-4 DRY 後追い（sitemap.ts を freshness.ts 利用へ・#537 マージ後）。

---

## イテレーション: 柱C-3-4 / S DRY sitemap.ts freshest群を単一ソース化（seo/c3-sitemap-freshness-dry）

回収: 自分の未マージ PR #552（C-2 用語集横断検索）・#553（決裁A robots 学習UA拡張）は CI（e2e/smoke）進行中＝マージ不可のため次イテレーションで回収。main を ff-only で同期し clean 確認。

着手前の現状確認: BACKLOG 最上位（C-3-4 DRY 後追い）のブロッカー #537（sitemap.ts 編集中の C-3-2 役割分担是正）が **MERGED（2026-06-13）** であることを確認＝ブロック解除。本体 `sitemap.ts` は #543 で新設済みの `lib/sitemap/freshness.ts` と同一の freshest 計算ロジックを冒頭で**二重保持**したままだった（出力は一致するが片側更新で lastmod 乖離するリスク源）。

- `sitemap.ts` 冒頭の8変数（freshestNews/LawRevision/Notice/CourtCase/accidentsDataUpdated/equipmentDataUpdated/freshestArticle/siteFreshest）を、`computeSitemapFreshness(buildToday)` の分割代入に置換。fallback 値・未来日 cap 方針は freshness.ts を正本に一本化。
- 不要 import（mhlwNotices/lawRevisionCores/SERIOUS_CASES_META/buildNewsHubItems/equipmentDb/getPublishedArticleIndex）を撤去。`COURT_CASES`・`latestIsoDate` は courtCasePages の per-URL lastmod で継続使用。
- **出力 byte-identical**（同一入力・同一 latestIsoDate）。sitemap.test.ts/freshness.test.ts/sitemap-index route.test.ts 含む全テストで回帰固定。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings 既存のみ）/ `vitest run`=219ファイル1828テスト全pass / `build`=成功。build 再生成データ（docs/rag-metrics-latest.json・chatbot-eval-fresh-results.json）は復元。working tree clean。PR #556。

残: #552・#553 の CI 緑回収＆マージ → BACKLOG 未着手 0 件のため次は「補充の指針」（site-critique 01-seo-technical / 05-lighthouse の自領域項目）から補充。
