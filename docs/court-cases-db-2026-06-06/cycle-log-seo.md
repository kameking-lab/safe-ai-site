# SEO/インフラ班 サイクルログ（並列マルチループ）

担当領域・契約は `loop-prompt-seo.txt` 参照。1イテレーション=1タスク、ゲート全緑(tsc/lint/vitest/build)後にPR。

---

## 2026-07-03 — OGP画像(/api/og)の透かしドメインを SITE_URL 単一ソース化＋og-url.ts 回帰テスト（PR: seo/og-watermark-domain-single-source）

回収: 前イテレーション着手の自班 CI 緑 PR を回収＝#691（法令名かな読みエイリアス12法令）が CLEAN/MERGEABLE のため squash マージ→`git checkout main && git pull --ff-only`→clean。#698（page-json-ld 単一ソース化）は #691 マージで BACKLOG/cycle-log の [x] 追記が CONFLICTING/DIRTY→当該ブランチへ `origin/main` を通常マージ（force-push なし）で解決し両完了エントリを併存させ push、CI 再走を次イテレーションで回収。#704（JSON-LD @id グラフ化）は e2e/smoke pending のため持ち越し。他班 OPEN PR（#702/#701/#694/#693 等）は不可侵。

着手判断: BACKLOG-seo 未着手キューは空（O17/T6・T7 は Path A 設計ドラフト＝オーナー承認待ち）＋在庫 PR は #698/#704 の2本（<3）のため補充指針に従い自領域から新規補充。**構造化データ・OGP の全域再監査**を実施＝#530/#698 で JSON-LD（json-ld.tsx / page-json-ld.tsx）はサイトURLを `seo-metadata.ts` 単一ソース化済みだが、**OGP画像 route `api/og/route.tsx` が透かしに `anzen-ai-portal.jp` をリテラル直書きで取り残されている**ことを特定＝`SITE_URL` を替えると透かしだけ旧ドメインへ無言ドリフトする同型の穴。対象（api/og route・og-url・seo-metadata）は当班所有（"og-image 関連 route"・seo-lib）で、in-flight の #698(page-json-ld.tsx)・#704(json-ld.tsx) とは非重複＝衝突ゼロを確認して選択。

- **現状（実バグ＝OGP透かしのドリフト源）**: `api/og/route.tsx` が右下透かしに `anzen-ai-portal.jp` を直書き。edge runtime の ImageResponse で全ページ共通の 1200×630 SNSカード画像を生成する route で、`SITE_URL`（=`https://www.anzen-ai-portal.jp`）変更時に透かしだけ旧ドメインへ乖離する（tsc は文字列リテラルのドリフトを検知しない）。
- **修正（当班所有のみ）**: `seo-metadata.ts` に `SITE_DISPLAY_HOST`（`SITE_URL` からプロトコル・`www.`・末尾スラッシュを除いた表示用ホスト＝現行 `anzen-ai-portal.jp`）を新設し、route の透かしを `{SITE_DISPLAY_HOST}` へ差し替え（edge-safe＝seo-metadata は `next` 型 import のみで node 依存なし）。**挙動不変**＝導出値が現行透かしと同一のため描画は byte 相当で不変。
- **テスト（無テスト解消＋ハードコード回帰ガード）**: 無テストだった OGP画像URL生成ヘルパー `og-url.ts`（layout.tsx metadata・json-ld.tsx が全ページの og:image に使用）に `og-url.test.ts`(9 it)を新設＝(1)ogImageUrl: title のみ/desc/lang='ja'省略(route 既定 ja と整合)/lang='en'のみ付与/記号・空白の URLエンコード往復 (2)SITE_DISPLAY_HOST: SITE_URL 由来導出・プロトコル/www./スラッシュ/パス不在・現行本番ドメイン一致で挙動固定 (3)**og route ソースのハードコード回帰ガード**＝SITE_DISPLAY_HOST を seo-metadata から import・`{SITE_DISPLAY_HOST}` 使用・裸ドメインリテラル不在（page-json-ld 直書きガードと同方針）。
- **実測検証（end-to-end）**: dev server を起動し `curl /api/og`・`/api/og?title=…&lang=en` ＝ともに HTTP200・`image/png`・1200×630 RGBA PNG を確認、既定画像を目視で透かし `anzen-ai-portal.jp`・タグライン・タイトルが従来どおり描画されることを確認。
- **ゲート**: `tsc --noEmit`=0 / `eslint`(4ファイル)=errors0 / `vitest run`=**全2411テスト緑**（新規9含む・skipped1）/ `build`=成功。build 再生成物（rag-metrics-latest.json・chatbot-eval-fresh-results.json）は `git checkout` で復元・dev 検証の一時PNGは削除＝working tree は api/og route・seo-metadata・og-url.test の3ファイル＋BACKLOG/cycle-log のみで clean。
- **要・他班なし**＝全て当班所有（OGP画像 route・seo-lib）内で完結。

残: 本 PR＋#698(再走)＋#704 の CI 緑回収＆マージ（次イテレーション 1)）。次の未着手は補充の指針§に従い自領域から補充。
## 2026-07-03 — 柱C-4 PageJsonLd のサイトURLを seo-metadata.ts 単一ソース化（PR: seo/page-json-ld-site-url-single-source / #698）

回収: 前イテレーション着手済み(working tree に未コミット)の本タスク(page-json-ld 単一ソース化)を完成させて出荷。並行して自班 CI 緑 PR を2本回収＝#684（カテゴリタブ単一ソース化）を squash マージ→`git checkout main && git pull --ff-only`→clean。#691（法令名かな読みエイリアス）は #684 マージで BACKLOG/cycle-log の [x] 追記が衝突(CONFLICTING/DIRTY)→当該ブランチへ `origin/main` を通常マージ（force-push なし）で解決＝両完了エントリ(かな読み/カテゴリタブ/notice-search)を全て併存させ push、CI 再走を次イテレーションで回収。他班 OPEN PR は不可侵。着手前の working tree にあった再生成物（rag-metrics-latest.json・ky/meeting print snapshot・chatbot-eval-fresh-results.json）は `git checkout` で復元。

着手判断: 未着手キューの実装タスクは空（O17/T6・T7 は Path A 設計ドラフト＝オーナー承認待ち）。前イテレーションで着手済みだった **PageJsonLd のサイトURL単一ソース化**（柱C-4 の未消化残＝#530 で `json-ld.tsx` は集約済みだが sibling の `page-json-ld.tsx` がドメイン直書きのまま取り残されていた）を完成。対象は当班所有の JSON-LD ヘルパー lib 領域＝他班 in-flight と非重複。

- **現状（実バグ＝構造化データのドリフト源）**: `page-json-ld.tsx`（全ページ共通の汎用 WebPage + BreadcrumbList + 可視パンくず出力ヘルパー）が `const SITE_BASE = "https://www.anzen-ai-portal.jp"` とドメインを直書き保持。`SITE_URL` を変えると `json-ld.tsx` 系は追従するのに本ヘルパーだけ旧ドメインへ取り残され、WebPage `@id`/`url` と BreadcrumbList の `item` 絶対URLが乖離する（tsc は文字列リテラルのドリフトを検知しない）。
- **修正（当班所有のみ）**: `SITE_BASE` を `import { SITE_URL } from "@/lib/seo-metadata"` 由来へ差し替え（エイリアス名 `SITE_BASE` は呼び出し側の可読性のため残し、値の直書きだけ撤去）。出力 JSON-LD は SITE_URL が同値のため不変＝挙動 byte 相当で無改変。
- **テスト（ハードコード回帰ガード付き）**: `page-json-ld.test.tsx`(5 it)を新設＝(1)既定パンくずが `${SITE_URL}/pricing` 等の絶対URLを出力・position 1始まり連番 (2)明示パンくずの全 item が `SITE_URL` prefix (3)keywords/contributor(Person)/isPartOf(SITE_NAME/SITE_URL) の WebPage 伝播 (4)可視パンくず `<nav aria-label="パンくずリスト">` を1つ描画 (5)**ソース文字列に `SITE_URL` の裸ドメインを一切埋め込まない**＝再度の直書き取り残しを機械検知（json-ld.tsx 集約と同方針の drift ガード）。
- **ゲート**: `tsc --noEmit`=0 / `eslint`=errors0（既存 warn 23 は無改変・当該2ファイル外）/ `vitest run`=**全2382テスト緑**（新規5含む）/ `build`=成功。build 再生成物は `git checkout` で復元。working tree は page-json-ld.tsx/test の2ファイル＋BACKLOG/cycle-log のみで clean。
- **要・他班なし**＝全て当班所有の JSON-LD ヘルパー lib 内で完結。

残: 本 PR #698＋#691(再走) の CI 緑回収＆マージ（次イテレーション 1)）。次の未着手は補充の指針§に従い自領域から補充。

---

## 2026-07-03 — 柱C-2 法令名かな読みエイリアスを現場頻用12法令へ拡張（PR: seo/law-alias-kana-readings-field-laws）

回収: 自班 CI 緑 PR #674（RSSフィード自動発見）を squashマージ→`git checkout main && git pull --ff-only`→clean。#680（notice-search テスト）は #674 マージで BACKLOG/cycle-log の [x] 追記が衝突→当該ブランチへ `origin/main` を通常マージ（force-push なし）で解決＝両完了エントリを併存させ push、CI 再走を次イテレーションで回収。#684（カテゴリタブ単一ソース化）は CI pending のため持ち越し。他班 OPEN PR は不可侵。

着手判断: BACKLOG-seo 未着手キューは空（Fable診断の実装消化済・O17/T6・T7 は Path A 設計ドラフトでオーナー承認待ち）＋既存の補充候補「カテゴリタブ単一ソース化」は #684 で in-flight のため、補充指針に従い自領域から新規補充。**発見性の全域再監査**を実施＝(1) 静的ルート172本を sitemap.ts＋子sitemap6本と機械突合＝孤立ページ0（39差分は全て admin/auth/dev/print/redirect/noindex/user-generated で正しく非収載）、(2) robots(決裁A済)・manifest・sitemap-index は既達、(3) 横断検索10カテゴリも populate 済。真に残る穴として、**法令名かな読みエイリアス表(`law-alias.ts`)が現場頻用法令をカバーしていない**ことを特定＝LAW_METADATA 38法令中エイリアスは20法令のみ、うち検索可能条文を持つのに読みエイリアスが無い12法令（建設業法・労災保険法・均等法・育介法・最賃法・職安法・職能法・女性則・年少者則・作環測法・四アルキル鉛則・機械等検定規則）が音声/かな入力で0件になる取り逃し。※対象ファイル `law-alias.ts`（＋test）は in-flight の #680(notice-search.test)・#684(search-index/SearchResults/CommandPalette)と非重複＝衝突ゼロを確認して選択。

実装: `LAW_NAME_ALIASES` に12法令のかな読み（略称の機械的音読み・コンテンツに literal 非出現＝既存ヒット非奪取の不変条件を厳守）を追加。**空振りエイリアス0の保証**＝収載前に `allLawArticles`/`mhlwLawArticles` を集計し全12法令が実在の検索可能条文を持つことを機械確認（建設業法4・労災保険法8・均等法4・女性則3…）。**実測検証**＝expandLawAliases＋searchCrossIndex で raw かな読みは0件→展開後に各法令の実条文が4/8/4/3件ヒットすることを確認（取り逃し是正を実証）。

回帰: `law-alias.test.ts` に頻用12法令の展開1本＋条番号分解後段の他語保持1本を追加。既存の同期ガード(`LAW_ALIAS_SHORTS`⊂`KNOWN_LAW_SHORTS`)が全12略称の LAW_METADATA 実在を自動担保。locked不変条件(就業制限1位=安衛法61条・石綿事前調査1位=石綿則3条)は新読みトークンが当該クエリに非出現のため無影響。

ゲート: `tsc --noEmit`=0（NODE_OPTIONS=--max-old-space-size=8192）/ `eslint`(2ファイル)=errors0 / `vitest run`=**全2351テスト緑**（cross-search 34含む・新規2）/ `build`=成功。build 再生成物（rag-metrics-latest.json・ky/meeting print snapshot・chatbot-eval-fresh-results.json）は `git checkout` で復元。working tree は law-alias.ts＋test の2ファイル＋BACKLOG/cycle-log のみで clean。

残: 本 PR＋#680(再走)＋#684 の CI 緑回収＆マージ（次イテレーション 1)）。次の補充は自領域から。

---

## 2026-07-03 — 横断検索カテゴリタブの単一ソース化（DRY・回帰／PR: seo/search-category-tabs-single-source）

回収: 自班の CI 緑 PR を回収＝#670（保護具 横断検索）を squash マージ→`git checkout main && git pull --ff-only`→clean。#674（RSS フィード自動発見）は #670 マージで origin/main と CONFLICTING（BACKLOG/cycle-log の [x] 追記衝突2件のみ・コードは auto-merge）だったため当該ブランチへ `origin/main` を通常マージ（force-push なし）で解決し push＝CI 再走を次イテレーションで回収。#680（notice-search 回帰テスト）は CI 実行中のため持ち越し。他班 OPEN PR は不可侵。

着手判断: BACKLOG-seo 未着手キューは空（O17/T6・T7 は Path A 設計ドラフト=オーナー承認待ち）。補充候補にあった **横断検索カテゴリタブの単一ソース化**（着手条件=#670 マージ後＝対象3ファイルの in-flight 衝突回避）を、#670 マージ完了により着手。

- **現状確認（実バグ＝ドリフト源）**: `/search` の `SearchResults.tsx` と ⌘K の `CommandPalette.tsx` が**同一の順序付き配列 `const CATEGORIES: SearchCategory[] = ['law','faq','precedent','notice','chemical','equipment','education','accident','glossary','sign']` をハンド重複**で保持。faq/sign/equipment 等の追補の度に両ファイルを手更新する必要があり、片方を忘れるとそのUIだけ新カテゴリのタブが欠落する（tsc も CATEGORIES 配列の欠落は検知しない＝アイコン switch のみ網羅検査される）。
- **修正（自班所有のみ）**: `search-index.ts`（当班 owned）に表示順の単一ソース `export const SEARCH_CATEGORIES: readonly SearchCategory[]` を新設（CATEGORY_META の直後・JSDoc で SEARCH_CATEGORY_PRIORITY との別軸を明記）。両UIはこれを import し、ローカル `CATEGORIES` const を撤去＝`CATEGORIES.map`→`SEARCH_CATEGORIES.map`、URL の cat 検証 `(CATEGORIES as string[]).includes`→`(SEARCH_CATEGORIES as readonly string[]).includes`。アイコン switch（各UIの JSX 固有・className 差・tsc 網羅済）と表示ロジックは無改変＝二重管理だけを解消。
- **テスト（両方向ドリフト検知）**: `search-index.test.ts` に describe「SEARCH_CATEGORIES — カテゴリタブ単一ソースのドリフト固定」3本追加＝(1)`[...SEARCH_CATEGORIES].sort()` == `Object.keys(CATEGORY_META).sort()`（メタに足してタブ出し忘れ／タブにあるのにメタ無しの**双方**を1つの等価で検知）(2)`new Set(SEARCH_CATEGORIES).size === length`（重複0＝同一タブ二重描画防止）(3)`countByCategory([], '')` の全 SEARCH_CATEGORIES キーが 0 初期化（未集計カテゴリ防止）。既存 CATEGORY_META テストは equipment を列挙漏れしていた（9型のみ）が、本 set 等価テストが全キーを網羅するため実質補強。
- **ゲート**: `tsc --noEmit`=0 / `eslint`(4ファイル)=errors0（warn は SearchResults 既存の未使用 disable directive 1・当該行は無改変）/ `vitest run`=**全2314テスト緑**（新規3含む・搬入前 2311→2314）/ `build`=成功（NODE_OPTIONS=--max-old-space-size=6144）。build 再生成物（rag-metrics-latest.json・chatbot-eval-fresh-results.json・ky-print-sheet snapshot）は `git checkout` で復元。working tree は search-index.ts/test・SearchResults・CommandPalette の4ファイルのみで clean。
- **要・他班なし**＝全て当班所有ファイル（search-index lib＋検索UI 2面）内で完結。

残: 本 PR＋#674(再走)＋#680 の CI 緑回収＆マージ（次イテレーション 1)）。次の未着手は補充。

---

## 2026-07-03 — 柱C-2 横断検索 notice-search.ts の回帰テスト新設（PR: seo/search-categories-single-source）

回収: 前イテレーションの自班 CI 緑 PR #666（安全標識 横断検索）を squashマージ→`git checkout main && git pull --ff-only`→clean。#670（保護具 横断検索）は #666 マージで search-index.ts/SearchResults/CommandPalette/BACKLOG/cycle-log が衝突(DIRTY)→**origin/main を当該ブランチへ通常マージ**で解決＝`SearchCategory` union は equipment(HEAD)∪sign(main) の和集合に、CATEGORIES 配列・countByCategory・CategoryIcon も両方併存させ、BACKLOG/cycle-log の [x] 完了エントリは3本(保護具/標識/化学物質)を全て残す（force-push 不可を厳守）。tsc0・lint errors0・全2311テスト緑・build成功を確認して push＝CI 再走は次イテレーションで回収。#674(RSS)は CI pending のため持ち越し。他班 OPEN PR は不可侵。

着手判断: BACKLOG-seo 未着手は 0 件（O17/T6・T7 は Path A 設計ドラフト=オーナー承認待ち）のため補充の指針§に従い自領域から補充。まず**発見性の全面監査**を実施＝(1) 動的ルート全20種([id]/[cas]/[slug]…)を generateStaticParams と sitemap 収載で機械突合し**全 indexable 名前空間が子sitemap or 静的収載で網羅済**を確認（/accidents-reports/[industry] は INDUSTRY_CONFIGS の5 slug=sitemap 5件と一致・user生成の /safety-diary・/chatbot/share は noindex で正しく非収載）、(2) 横断検索10カテゴリ(law/notice/chemical/equipment/sign/faq/education/accident/precedent/glossary)が全て buildSearchIndex で populate 済を確認、(3) robots(決裁A済)・sitemap-index(lastmod 動的化 C-3-4 済)も既達。真に残る穴として、当班 C-2 領域の `lib/notice-search.ts`（チャットボットの通達出典提示に直結）が**テスト皆無**を特定。※本来やりたい CATEGORIES 単一ソース化(SearchResults/CommandPalette のハンド重複を search-index 集約)は、対象ファイルが in-flight の #670 と全面衝突するため見送り、in-flight PR が触らない notice-search を選択。

実装: `notice-search.test.ts`(9 it)を新設。実データ `@/data/mhlw-notices`(100件・binding無/indirect78/reference22)を直接流し、入力ガード(空/空白/1文字語→0件)・トピック語ヒットの id 実在性(捏造0)・シノニム展開(アスベスト→石綿タイトル)・自然文正規化・k 上限制御・ランキング決定性(小k=大k先頭・冪等)・NoticeHit の正本射影一致・NOTICE_BINDING_LABELS 網羅 を固定。**コード変更0**＝既存挙動の特徴づけ回帰のみ（水増し無し）。

ゲート: `tsc --noEmit`=0（NODE_OPTIONS=--max-old-space-size=8192。既定は tsc worker OOM segfault=139 のため増量が定石）/ `eslint`(新規1ファイル)=errors0 / `vitest run`=272ファイル**2317テスト全緑**(notice-search 9含む) / `build`=成功。build 再生成物(rag-metrics-latest.json・ky-print-sheet snapshot・chatbot-eval-fresh-results.json)は `git checkout` で復元。working tree は新規 notice-search.test.ts＋BACKLOG/cycle-log のみで clean。

残: 本 PR＋#670＋#674 の CI 緑回収＆マージ（次イテレーション 1)）。次の補充候補: CATEGORIES 単一ソース化(#670 マージ後に着手＝衝突回避)。

---

## 2026-07-03 — 発見性 実在RSSフィード4本を全ページ<head>で自動発見可能化（PR: seo/rss-feed-autodiscovery / #674）

回収: 自班の CI 緑 PR #657（化学物質 sitemap）を squashマージ→`git checkout main && git pull --ff-only`→clean。#666（安全標識 横断検索）が #657 マージで origin/main と CONFLICTING（BACKLOG/cycle-log の [x] 追記衝突2件のみ・コードは auto-merge）だったため当該ブランチへ `origin/main` を通常マージ（force-push なし）で解決し push＝CI 再走を次イテレーションで回収。#670（保護具 横断検索）は CI 実行中のため持ち越し。

着手判断: BACKLOG-seo 未着手キューは空（O17/T6・T7 は Path A 設計ドラフト=オーナー承認待ち）のため補充の指針§に従い自領域から補充。**発見性サーフェスの全域監査**を実施＝(1) sitemap: 全 [param] 動的ルート族（accidents/articles/chemical-database/circulars/court-cases/equipment/faq/features/foreign-workers/industries/safety-signs×3/illness-guide/accidents-reports）が子sitemap or sitemap.ts の `.map()` で収載済＝**穴なし**、(2) robots/manifest: 既達、(3) **RSSフィード**: `/feed/{news,law-revisions,accident-reports,serious-cases}.xml` の4本が実在・クロール可（robots で /feed 非Disallow）なのに**どのページ `<head>` からも `<link rel="alternate">` で広告されておらず自動発見不能**の真の穴を特定（`grep application/rss+xml src` は生成lib `lib/rss.ts` のみヒット＝alternate リンク0）。

実装: `lib/seo/feeds.ts`（当班owned `lib/seo/**`）を単一ソースに新設＝`SITE_FEEDS` 登録簿(path+title)＋`rssAlternateTypes()`。ルート `layout.tsx`（当班 core/shell custodian）の `alternates` に `types: application/rss+xml` を追加。Next Metadata の `alternates.types`（node_modules 型定義で `AlternateLinkDescriptor[]` を確認）が全ページ共通 `<head>` に `<link rel="alternate" type="application/rss+xml" href title>` を出力＝`metadataBase` により相対path `/feed/*.xml` を絶対URLへ解決。既存 `canonical` は保持・`openGraph`/`twitter` は無改変（openGraph 浅マージ地雷を回避）。

回帰: `feeds.test.ts` 5本＝(1)登録簿2本以上・path形式 (2)path重複0 (3)全 path が実在 `route.ts`(GETハンドラ)へ node:fs で解決＝**幽霊フィードリンク0**（manifest.test/sitemap孤立突合と同方針）(4)登録 title が各 route の RSS channel title と一致＝**drift ガード**（route 側のタイトル変更で失敗）(5)`rssAlternateTypes()` 網羅。**実測検証**＝build 後 `.next/server/app/*.html` を grep し4本の `rel=alternate type=application/rss+xml`（絶対URL・正 title）出力を確認。

ゲート: `tsc --noEmit`=0 / `eslint`(3ファイル)=errors0 / `vitest run`=**全2304テスト緑**（新規5含む）/ `build`=成功（NODE_OPTIONS=--max-old-space-size=6144）。build 再生成物（rag-metrics-latest.json・ky-print-sheet snapshot・chatbot-eval-fresh-results.json）は `git checkout` で復元。working tree は layout.tsx＋新設 lib/seo/{feeds.ts,feeds.test.ts} の3ファイルのみで clean。

残: 本 PR #674＋#666(再走)＋#670 の CI 緑回収＆マージ（次イテレーション 1)）。次の未着手は補充。

---

## 2026-07-03 — 柱C-2 追補 横断検索に保護具(安全用品DB 1,050件)を収載（PR: seo/c2-equipment-cross-search）

回収: 前イテレーションの自班 PR を CI 緑で回収＝#653（PWA ショートカット）を squash マージ→main を ff-only 同期。#657（化学物質 sitemap）は #653 の追記と BACKLOG-seo.md で衝突→`git merge origin/main` を当該ブランチへ通常マージして解決（両完了項目を併存・force-push 不可を遵守）し push、CI 再走は次イテレーションで回収。他班 OPEN PR は不可侵。

着手: BACKLOG-seo 未着手キューは空（Fable診断の実装は消化済・O17/T6・T7 は Path A 設計ドラフトでオーナー承認待ち）。補充指針に従い自領域（横断検索の発見性）を再点検＝横断検索カテゴリと実在の indexable コンテンツ集合を機械突合。

- **現状確認（実バグ）**: `search-index.ts` のカテゴリは law/notice/chemical/education/accident/precedent/glossary/faq の8型のみ。一方 `/equipment/[id]`（保護具 個別詳細・約1,050件）が実在し `sitemap-equipment.xml` に個別収載済み・`generateStaticParams` が `getAllEquipment()` の eq-NNNN 全件を解決・detail は自己canonical/indexable。**にもかかわらず横断検索(/search・⌘K)に equipment カテゴリが無く、フルハーネス・防じんマスク・安全帯・保護帽 等 現場が最も検索する保護具名が丸ごと0件**＝#561 accident・化学物質と同型の発見性の穴。sitemap 静的ルート全件（page.tsx 155本）を sitemap.ts と機械突合し新規孤立 sitemap 対象が無いことも確認済（/feedback・/safety-diary/new は redirect、/ky/list・/safety-diary/list・…/result は robots index:false で正しく非収載）。
- **修正（自班所有のみ）**: `search-index.ts` に `equipment` カテゴリを新設。正本 `getAllEquipment()`（＝detail の generateStaticParams・sitemap-equipment と同一ソース）を dynamic import し title=製品名・subtitle=カテゴリ名＋規格・keywords=カテゴリ名/小分類/メーカー/JIS規格（industries/hazards は英語コード＝日本語検索に無意味なため除外＝ノイズ回避、regulations は法令権威クエリ汚染回避のため除外）・url=`/equipment/<id>`（正本由来＝必ず解決・幽霊URL0・データ追加に自動追従）。`SEARCH_CATEGORY_PRIORITY` の**末尾**に配置＝保護具は商品レコメンド(アフィリエイト)で権威が低く、同点タイブレークでも法令・通達・判例の上位を決して奪わない。`CATEGORY_META`(amber/保護具) と `countByCategory` の初期化 Record も拡張。UI(SearchResults/CommandPalette)へ保護具タブ＋`HardHat` アイコンを追加（既存 faq/glossary 追加と同パターン、検索UIのみ改変）。
- **テスト**: `search-index.test.ts` に equipment describe（3 it）追加＝①正本 getAllEquipment と件数・ID集合一致＋500件超の非空虚性 ②全件 /equipment/<id> 深リンク・裸/equipment・/equipment-finder 不在・url↔id 対応(幽霊URL0) ③フルハーネス/墜落制止用器具/メーカー/JIS でヒット＋subtitle非空。既存 countByCategory 合計テストへ c.equipment を追加。**locked不変条件**（T1-T3＝「就業制限」1位=安衛法61条・「石綿 事前調査」1位=石綿則3条 等）が保護具追加後も不変であることを既存回帰で確認（末尾優先度＋keyword を JP有意語に限定した効果）。tsc0・lint errors0・全2267テスト緑（新規3含む）・build成功。
- **要・他班（注記のみ・当班は非改変）**: 保護具一覧 `/equipment-finder` 本文の改善は所有 UI 班(ux-tools)の担当。当班は横断検索インデックスの発見性のみ是正した。

---

## 2026-07-03 — 柱C-2追補 横断検索に安全標識(JIS Z 9101・約110種)を収載（PR: seo/c2-safety-signs-cross-search / #666）

回収: 自班の緑・未マージ PR #647（FAQ200問）を squashマージ→`git checkout main && git pull --ff-only`→clean。#653（PWA/かな折り畳み却下）が origin/main と CONFLICTING（BACKLOG/cycle-log の追記衝突のみ・コードは auto-merge）だったため当該ブランチへ `origin/main` を通常マージ（force-push なし）で解決し push（CI 再走は次イテレーションで回収）。#657（化学物質 sitemap）は CI 実行中のため持ち越し。

着手判断: BACKLOG-seo 未着手は 0 件（O17/T6・T7 は Path A 設計ドラフト=オーナー承認待ち）のため補充の指針§に従い自領域から補充。site-critique 01(S-1〜A-4)/robots(A-1) を再点検し、大半は既達を確認（sitemap-articles=実在記事の動的生成済／robots のAI検索引用系=OAI-SearchBot/ChatGPT-User/PerplexityBot は許可リスト済／/audits 内部レポートはページごと削除済）。残る真の発見性の穴として、横断検索が **安全標識(safety-signs)** を1件も収載していない点を特定＝`@/data/safety-signs` の JIS Z 9101 準拠 約110種（禁止/警告/指示/安全状態/防火）は個別詳細ページ `/safety-signs/sign/[id]` が既に sitemap 収載済みなのに、⌘K・/search から 0 件で、発見手段が /safety-signs ハブ回遊のみだった（用語・FAQ とも別軸の視覚標識の直接照会）。

実装: `search-index.ts` に `sign` カテゴリ新設。`SAFETY_SIGNS`(node:fs非依存=ブラウザ安全)＋`SIGN_CATEGORIES`(分類ラベル) を read-only import。title=標識名・subtitle=分類ラベル+意味(90字cap)・keywords=英名(nameEn)+分類ラベル+関連法令(statute+article・article は任意のため三項で string[] を保証)。url=`/safety-signs/sign/<id>`＝詳細の `generateStaticParams` が SAFETY_SIGNS 全件 id を返し未知 id を `notFound()` で弾く＝**収載集合＝解決集合（幽霊URL0）**。UI(SearchResults/CommandPalette)に 標識 タブ＋Signpost(amber) を追加、CATEGORY_META/countByCategory/CATEGORIES を拡張。同点タイブレークは `SEARCH_CATEGORY_PRIORITY` で用語と同じ参照系ティア（glossary の次・chemical/accident の前）に置き、法令・教育・FAQ より下位＝locked不変条件「就業制限」1位=安衛法61条(O8-a/T8) は標識名と非衝突。

回帰: search-index.test.ts に sign describe 3本追加＝(1)全SAFETY_SIGNS収載(件数一致・裸/safety-signs不在・深リンク)(2)id集合が正本SAFETY_SIGNSに解決(generateStaticParams一致=soft404ゼロ)(3)標識名「立入禁止」→/safety-signs/sign/no-entry・英名「No entry」・関連法令「労働安全衛生規則 第325条」ヒット＋意味subtitle。既存 glossary の countByCategory 合計テストに c.sign を追記（query「安全」が標識にも当たるため）、CATEGORY_META 網羅テストに sign を追記。

ゲート: `tsc --noEmit`=0（初回 tsc worker が segfault=139＝OOM、NODE_OPTIONS=--max-old-space-size=6144 で再実行し 0）/ `eslint`(4ファイル)=errors0(warn は既存の未使用 disable directive 1・当該行は無改変)/ `vitest run`=264ファイル**2241テスト全緑**（sign 3本含む）/ `build`=成功。build 再生成物（rag-metrics-latest.json・chatbot-eval-fresh-results.json・ky-print-sheet snapshot）は `git checkout` で復元。working tree は search-index.ts/test・SearchResults・CommandPalette の4ファイルのみで clean。

残: 本 PR #666＋#653＋#657 の CI 緑回収＆マージ（次イテレーション 1)）。次の未着手は補充（記事横断検索は data班のブラウザ安全集約待ち＝要・他班・O17 実装はオーナー承認待ち）。

---

## 2026-07-03 — 柱C-3-3 追補5 化学物質 個別詳細ページ約3,515本を子サイトマップ収載（PR: seo/c3-3-chemicals-sitemap）

回収: 自班の CI 緑 PR #641（教育 全テーマ源拡張）を squashマージ→main を ff-only 同期。PR #647（FAQ収載）は #641 マージで search-index.ts が追記衝突→**origin/main を当該ブランチへ通常マージ**で解決（BACKLOG/cycle-log の追記衝突2件はどちらも [x] 完了エントリのため両方残す・コードは auto-merge・tsc0/search-index.test 45緑を確認）してpush＝CI再走を次イテレーションで回収。PR #653（PWAショートカット）はまだ e2e/smoke IN_PROGRESS で持ち越し。force-push 不可を厳守。

着手: BACKLOG-seo 未着手キューは空（O17/T6・T7 は Path A 設計ドラフト＝オーナー承認待ち）。補充指針に従い自領域の「実在 indexable ページの sitemap 発見性」を再点検。静的172ルートは追補4で消化済のため**動的ルート族**を sitemap 収載と機械突合＝features/safety-signs/illness-guide/court-cases は本体 sitemap.ts が `.map()` で全件展開済、accidents/articles/circulars/equipment は子sitemap済。唯一の大穴として `/chemical-database/[cas]`（濃度基準DB **約3,515物質**の個別詳細・自己canonical・indexable・on-demand ISR）が**全sitemap不在**を発見＝サイト最大級の未収載独自コンテンツ（事故290・保護具より遥かに大きい）。

実装: 子サイトマップ `sitemap-chemicals.xml/route.ts` を新設（accidents/equipment と同形）。正本＝`CONCENTRATION_LIMITS.substances` のキー集合（3,515・全て `[0-9-]` にノーマライズ済）を単一ソースに全件 `/chemical-database/<cas>` を深リンク。**幽霊URL0**＝詳細ページが同集合外の CAS を `notFound()` で弾く＝キー集合＝解決集合そのもの。**canonical乖離0**＝全キーが URL 安全なので loc（要エンコード面）と詳細 canonical `/chemical-database/${cas}`（decodeURIComponent 面）が 1:1 一致。lastmod は `CONCENTRATION_LIMITS.generatedAt`（2026-05-24）へ追従＝`lib/sitemap/freshness.ts` に `chemicalsDataUpdated` を追加し index と単一ソース化（当日打ち lastmodスパム回避）。`sitemap-index.xml` へ本子を6番目に登録（本体→記事→事故→通達→保護具→化学物質）。robots は sitemap-index 広告済のため自動発見。priority 0.6・monthly。

回帰: `sitemap-chemicals.xml/route.test.ts` 5本（正本キー全件一致・1000超の非空虚性・裸/chemical-database不在・全キー`[0-9-]`のみ＝エンコード乖離0・lastmod=chemicalsDataUpdated当日固定でない）＋`freshness.test.ts` 1本（chemicalsDataUpdated=2026-05-24）＋`sitemap-index.xml/route.test.ts` を6子構成へ更新（5→6件）。

ゲート: `tsc --noEmit`=0 / `eslint`(変更5ファイル)=errors0 / `vitest run`=263ファイル2233テスト全緑 / `build`=成功（NODE_OPTIONS=--max-old-space-size=6144）。build 再生成物（rag-metrics-latest.json・ky-print-sheet snapshot・chatbot-eval-fresh-results.json）は `git checkout` で復元。working tree は本タスクの5ファイル（新設 route/test 2＋freshness.ts/test＋index route/test）のみ。

要・他班（注記のみ）: 一覧 `/chemical-database`(index) の client は `getAllMergedChemicals()` 全件へ「開く」リンクを出すが `CONCENTRATION_LIMITS.substances` 外の CAS は詳細で notFound＝潜在ソフト404。sitemap は解決集合のみ収載で正だが client 側リンク条件是正は所有UI班(ux-tools)担当。

残: 本 PR＋#647＋#653 の CI 緑回収＆マージ（次イテレーション 1)）。

---

## 2026-07-03 — 柱C-3-3 追補4 孤立していた実在ツールページ /ky/workers を sitemap 収載（PR: seo/c3-3-supplement4-ky-workers-sitemap）

回収: 自班の未マージ `seo/` PR は無し（直近の #627 追補2・#635 O17設計ドラフト等は main へマージ済）。`git status` clean・main を ff-only 同期済み。他班の OPEN PR（#636 data 等）は触らず。

着手: BACKLOG-seo 未着手キューは空（Fable診断の実装タスクは消化済、O17/T6・T7 は Path A 設計ドラフトで実装オーナー承認待ち）。補充指針に従い、site-critique の S-1/S-3 系「実在 indexable ページの sitemap 発見性」を自領域で再点検＝静的ルート全件（page.tsx 193本）を sitemap 収載 URL と機械突合。

- **現状確認（実バグ）**: `find src/app -name page.tsx` の静的（非動的）ルート172本と、`sitemap.ts` の literal url + 子サイトマップ収載分を機械 diff。差分40本を1本ずつ「robots index:false / redirect・notFound スタブ / robots.ts Disallow 配下（/admin,/auth,/dev,/api-docs,/lms,/dpa）/ リリース前デモ / ツール状態ページ」で分類した結果、**唯一 `/ky/workers`（作業員マスター）だけが真の孤立ページ**と判明＝`robots` 上書き無し（＝index:true）・`alternates.canonical:"/ky/workers"` 自己canonical・`PageJsonLd` 付・OG 完備の実在ツールなのに全 sitemap 不在。兄弟 `/ky/paper`（追補3で収載済）と同じ KY全面再設計 Phase1-3（#285）で追加されたのに漏れていた。
- **修正（自班所有の sitemap.ts のみ）**: `/ky/workers` を `/ky/paper` の直後へ追加。lastmod は当該再設計日 `2026-05-25`（兄弟と同節・当日打ちの lastmod スパム回避）、priority 0.7（ツール従属ページ）、changeFrequency monthly。データ・ルート・他班ファイルは一切不変。捏造0＝実在 page.tsx のみ収載。
- **テスト**: `sitemap.test.ts` に追補4 describe（3 it）追加＝①/ky/workers 収載 ②lastmod==2026-05-25 ③非収載境界 /ky/list（保存済みKY一覧・robots index:false のツール状態）は不収載。追補2 の境界ロック思想を KY 配下へ延伸し、機械的全ページ追加＝誤収載の再発を防止。sitemap.test 24 it 緑・全2178テスト緑・tsc0・lint errors0・build成功。
- **要・他班（注記のみ・当班は非改変）**: 突合中に `/organization`（正式リリース前デモ）と `/profile`（ユーザ個別ページ）が page 側で `robots index:false` を持たず**潜在的に indexable** な点を発見。sitemap からは正しく除外済み（内部リンク経由クロールのみ）だが、根治には当該ページの generateMetadata へ noindex 付与が要る＝所有 UI 班の担当。/search（当班所有）は既に noindex,follow で問題なし。

---

## 2026-06-14 — 柱C-2 横断検索の通達を個別詳細へ深リンク化（PR: seo/c2-notices-deeplink）

回収: 緑だった PR #556（C-3-4 DRY sitemap freshest 単一ソース化）を squash マージ→main を ff-only 同期・clean 確認。#561（C-2 事故深リンク）は #556 マージで BACKLOG/cycle-log が追記衝突→当該ブランチへ origin/main を通常マージで解決（両 [x]・両イテレーション記録を併存・force-push なし）し再 push（CI 再走は次イテレーションで回収）。#566（C-2 法令条文収載）は CI（e2e/smoke）進行中＝マージ不可、次回回収。

着手: BACKLOG 未着手キューは空（C-3-4 DRY が #556 で消化済）。補充指針（site-critique 01-seo-technical の C-2＝横断検索の発見性）から、走行中の #561/#566 と非競合（search-index.ts の別ブロック＝通達ブロックのみ改変）の自領域タスクを選択。

- **現状確認（実バグ）**: 横断検索(/search・⌘K)の通達カテゴリ（mhlwNotices 全件）は url が `/resources?q=<title slice 50>` だったが、`resources-client.tsx` を grep した結果 `?q=` URL パラメータを**一切読まない**ことを確認。＝検索した個別通達へ到達できず、毎回 /resources の全1,158件一覧へ無フィルタで落ちていた（#561 の事故フラットリンクと同型・かつ q が黙殺される分さらに悪い発見性の穴）。一方 `/circulars/[id]` 詳細ルートは `generateStaticParams` が mhlwNotices 全件の id を解決する（findNotice で照合・未解決は notFound()）ことを確認＝深リンク先が必ず実在。
- **修正（自班所有の search-index.ts のみ）**: 通達ブロックの url を `/circulars/${n.id}` へ深リンク化。正本 mhlwNotices 由来 id のため検索結果→詳細が**必ず解決（幽霊URL/soft404 0）**し、今後の通達データ追加にも自動追従する。subtitle（noticeNumber/docType + 発出日）は据え置き。データ・ルート・他班ファイルは一切不変。捏造0＝既存正本データのみ使用。
- **テスト**: `search-index.test.ts` に2本追加（計14 it）。①全 notice が `/circulars/<id>` で始まり `/resources?q=` を含まず、url の id == item.id（`notice-<id>`）対応＝旧バグと幽霊URL を固定。②深リンク先 id 集合 == 正本 `mhlwNotices` の id 集合・件数一致＝詳細の generateStaticParams が解決する集合との一致を固定（将来の取りこぼし検知）。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings 既存46のみ・自班ファイル0）/ `vitest run`=223ファイル1865テスト全pass（新規2含む） / `build`=成功。build 再生成データ（docs/rag-metrics-latest.json・chatbot-eval-fresh-results.json）は復元。working tree clean。

残: #561・#566 の CI 緑回収＆マージ。補充は site-critique 残件のうち自領域に閉じるもの（化学物質/教育カテゴリも同様に `/chemical-database?q=`・`/e-learning` フラットリンク＝深リンク余地ありだが #561/#566 のマージ後＝search-index.ts 競合回避のため後続イテレーションで）。
## 2026-06-14 — 柱C-3-3 事故事例 個別ページのサイトマップ収載（PR: seo/c3-accidents-sitemap）

回収: 緑だった PR #561（C-2 事故 横断検索の正本寄せ・深リンク化）を squash マージ→main を ff-only 同期・clean 確認。#561 マージで PR #566（C-2 法令 横断検索）が `search-index.ts`／`search-index.test.ts`／BACKLOG の3点で CONFLICTING→ origin/main を当該ブランチへ通常マージで解決(force-push不可を遵守)＝両機能(law＋accident)が search-index に併存することを確認、全ゲート再緑(tsc0/lint0/該当18テストpass/build成功)→push。#566 と #571（C-2 通達 深リンク）は CI 再走のため回収は次イテレーション。

着手: 在庫キュー空のため補充指針（site-critique 01-seo-technical）から自領域に閉じる項目を選定。#566/#571 が `search-index.ts` を編集中のため横断検索への新カテゴリ追加（保護具など）は競合過多と判断、**サイトマップ（別ファイル＝独立マージ可能）**の穴を選択。

- **現状確認（実コード grep）**: `/accidents/[id]`（事故事例 個別詳細・約290件・`dynamicParams=true` でオンデマンド生成・固有 canonical/title/description/OG を持つ実在ページ）が**どのサイトマップにも不在**。本体 `sitemap.ts` には一覧 `/accidents` しか無く、判例 `/court-cases/[id]` は収載済みなのに事故DB（サイト最大級の独自コンテンツ）だけ個別ページが漏れていた発見性の穴。#561 で横断検索は既に `/accidents/<id>` へ深リンク済みのため、サイトマップ収載で「検索で引ける／sitemapで巡回される」が揃う。
- **修正（当班所有のサイトマップ層のみ）**: 子サイトマップ `app/sitemap-accidents.xml/route.ts` を新設（既存の circulars/equipment/articles と同形）。正本 `getAccidentCasesDataset()` を単一ソースに `/accidents/<id>` を全件列挙（重複ID除去＝横断検索の収載ロジックと同形）。lastmod は当日打ち（lastmod スパム）を避け、`computeSitemapFreshness().accidentsDataUpdated`（事故DBスナップショット生成日）を全URL共通で使用＝事故の `occurredOn`（災害発生日）はページ更新日でないため不採用。`sitemap-index.xml` に本子を登録（本体→記事→**事故**→通達→保護具の5子構成）。robots は既に sitemap-index を広告しているため自動発見される。
- **テスト**: `sitemap-accidents.xml/route.test.ts` 新設4本（application/xml urlset／正本の全ユニークIDを `/accidents/<id>` 出力＝件数一致・幽霊URL0／裸 `/accidents` 不在・全件個別深リンク／lastmod が accidentsDataUpdated で当日固定でない）。`sitemap-index.xml/route.test.ts` を5子構成へ更新（列挙順・lastmod 5件・各子=対応セクション実データ日）。
- **不可侵の遵守**: `/accidents/[id]` ルート本文・事故データは他班所有のため非改変（読むだけ）。当班はサイトマップ生成のみ。捏造・水増しなし＝既存実在ページの発見性を回復しただけ。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warnings 既存のみ) / `vitest run`=225ファイル1880テスト全pass（新規8含む） / `build`=成功（`/sitemap-accidents.xml` ルート登録を確認）。working tree clean。

残: #566/#571 の CI 回収→マージが最優先。補充は横断検索への保護具（equipment）収載が次の有力候補だが、#566/#571 マージ後に着手して `search-index.ts` の競合を避ける。
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

## 2026-07-02 O8-a（P0・診断T1）: /search・⌘K を死蔵 cross-search エンジンへ載せ替え

診断書 05-search-egov.md が指摘した「一番賢い実装が完全死蔵」＝`lib/cross-search/`（空白AND＋シノニム展開＋keywords重み＋カテゴリ優先タイブレーク、6月実装＆テスト済みだがどこからも import されず）を、本番の /search・⌘K へ配線した。旧 `searchItems` はクエリ全体を 1 つの部分文字列として扱うため 2 語クエリが全滅（今日の敗因の大半）していた。

- `cross-search/score.ts`: `searchCrossIndex` を `ScorableItem`（keywords 任意）でジェネリック化し、`CrossSearchItem` 専用から汎用スコアラへ。`categoryPriority` オプションを追加（未指定は従来の cross 標準＝cross-search.test.ts は不変で緑）。WeakMap キャッシュ・variantScore/termScore もジェネリック対応。
- `search-index.ts`: `SearchItem` に任意 `keywords` を追加。build 各カテゴリへ keyword を供給（law=条文keywords+articleTitle+法令名+略称+条番号 / precedent=field+issues+court / accident=workCategory+type+severity+industry_detail / chemical=cas+name_en / notice=docType+番号+category+issuer / glossary=reading）。`searchItems` を `searchCrossIndex` へ委譲し、law/education を上位に寄せる `SEARCH_CATEGORY_PRIORITY` を渡す。`normalizeSearchText` 直接依存を撤去（エンジン内で正規化）。
- **不可侵の非改変**: 深リンク（/circulars/<id>・/accidents/<id>・/law-search?law=&art=）・カバレッジ・glossary 収載は一切触らず維持。UI（SearchResults.tsx / CommandPalette.tsx）は公開 API 不変のため無改修。

本番インデックス実測（buildSearchIndex 経由）:
- 「石綿 事前調査」→ 1位 石綿則 第3条（事前調査及び分析調査）
- 「クレーン 過負荷」→ 1位 クレーン則 第23条（過負荷の制限）
- 「足場 作業床」→ 1位 安衛則 第518条（作業床の設置等）、第563条（足場における作業床）も3位以内
- ボーナス「就業制限」→ 1位 安衛法 第61条（診断 T8 の意図も同エンジンで充足）
- 応答は全クエリ <25ms（完了条件 200ms を大きく下回る）

回帰: search-index.test.ts に AND/keywords/シノニム単体3本＋本番2語クエリ収束4本（it.each で石綿・クレーン・足場・就業制限）を追加。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings 既存のみ）/ `vitest run`=232ファイル1940テスト全pass / `build`=成功。build 再生成データ（docs/rag-metrics-latest.json・chatbot-eval-fresh-results.json）は復元。working tree clean。

残: O8-b（条番号クエリパーサ）・O8-c（法令エイリアス辞書）が P0 で続く。

---

## 2026-07-03 O8-b 条番号クエリパーサ（法令名＋条番号の複合）＝診断T2（#591）

前サイクルの O8-a（#586）を CI 緑確認のうえ squash マージ → `main` を ff-only 同期。前サイクルで宙吊りにしていた WIP ブランチ `seo/o8b-article-number-parser` は、当時の古い `main` から派生していたため他班の既マージ作業（jma データ・loop スクリプト・chemical-db・BACKLOG-data 等）を丸ごと reverting する差分を巻き込んでおり再利用は危険と判断。最新 `main` から新ブランチ `seo/o8b-article-query-parser` を切り、WIP から O8-b 該当の 5 ファイルのみ（`cross-search/article-query.ts`＋test・`cross-search/index.ts` の export・`search-index.ts` の配線・`search-index.test.ts` の T2）を救出して起点にした。O8-a の squash マージ内容が WIP の O8-a ベースと byte 一致することは `git diff main..WIP -- search-index.ts` が O8-b 差分のみを示すことで確認済み。

作業: `lib/cross-search/article-query.ts` に純粋関数 `normalizeArticleQuery` を新設し、`searchItems` の `searchCrossIndex` 委譲の直前に前処理として配線。横断検索(/search・⌘K)の生クエリに含まれる「法令名＋条番号」の地続き表現（e-Gov でも 0 件になる診断書 比較 a,b）を、curated 条文インデックスのタイトル/keywords へ合流できる正規形へ書き換える。(1) 地続き「安衛法61条」→「安衛法 第61条」（cross-search の AND エンジンは空白区切り各語で扱うため分解が必須）、(2) 漢数字「第六十一条」→「第61条」（/law-search の `kanjiToNum` と同一ロジックを当班 lib へ再実装＝コンポーネント内非公開関数で import 不可）、(3) 全角数字「６１条」半角化・枝番「61-2条」「第10条-3」→「第61条の2」「第10条の3」。誤変換防止として全分岐で末尾「条」を必須にし、裸の数字・日付範囲「2024-2026」・「第一種」「三大災害」を素通し＝O8-a の 2 語 AND 検索（石綿 事前調査/クレーン 過負荷）を一切壊さない。

完了条件充足（本番インデックス回帰 `search-index.test.ts` T2）: 「安衛法61条」「安衛法 88条」「安衛則563条」「第六十一条」がいずれも 1 位に該当条文（category=law・`/law-search?law=&art=` 深リンク）。回帰: 単体 `article-query.test.ts` 11本＋統合 T2 4本。UI(SearchResults/CommandPalette)・深リンク・カバレッジは API 不変で無改修。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings は他班ファイルの既存のみ）/ `vitest run`=234ファイル1964テスト全pass / `build`=成功。build 再生成データ（docs/rag-metrics-latest.json・web/src/data/chatbot-eval-fresh-results.json）は commit 前に `main` から復元。working tree clean。

残: O8-c（法令エイリアス辞書＝正式名称・かな読み・別略称の展開）が P0 で続く。S6（0件時 e-Gov フォールバック＋ランキング調整）が P1。

---

## 2026-07-03 S6: 横断検索 0件時の e-Gov フォールバック＋収録範囲明示＋0件クエリ運用ループ（診断T4+T8）

診断書 05-search-egov.md の G7短期（収録の透明性）と T8運用面。着手時、O8-c（法令エイリアス）は自班 PR #600 が CI 保留で in-flight のため、未着手最上位の次点 S6 を着手。S6 は T4（0件フォールバック）＋T8（ランキング調整＋0件クエリ運用ループ）の合成。

**背景（診断の穴）**: 横断検索は curated 抄録（安衛則は実際には第677条まであるが未収載条番号あり）を検索対象にしており、0 件が「規定が存在しない」と誤読されると安全上のリスク（G7）。従来の `/search` 0件画面は汎用アドバイス＋`/law-search`・`/chatbot` リンクのみで、原文（e-Gov）への逃がしも収録範囲の断りも無かった。

**実装（自領域のみ）**:
- `lib/cross-search/egov-fallback.ts` 新設＝`EGOV_LAW_SEARCH_URL`（到達可能な e-Gov ポータルトップに固定）＋`egovHandoffQuery`（引継ぎクエリ整形）。e-Gov 新 UI は SPA でキーワードのディープリンク URL が非公開＝誤ったクエリ付き URL は幽霊リンクになり得るため（`lsg0500` は詳細ルートで検索ではない、WebFetch でも SPA シェルしか返らず検証不能）、**「常に到達可能なトップ＋検索語コピーで引継ぎ」**に固定＝幽霊リンク 0 を保証。実測でトップは HTTP200・検索ボックス有を確認。
- `SearchResults.tsx` の `NoResults` を刷新: (1) 収録範囲明示コピー「見つからない＝規定がないではない」（未収載≠規定なし・原文は e-Gov 確認）、(2) e-Gov 外部リンク（target=_blank rel=noopener）＋検索語コピーボタン（`navigator.clipboard` ガード付き）、(3) 既存 `/law-search`・`/chatbot` 導線を min-h-[40px] タップ標的で維持。
- 計装 `trackEvent('search_zero_result_egov', {query})` を e-Gov クリックに追加＝既存 `search_results_view{result_count}` と併せ 0 件率と e-Gov 逃がし数を計測可能に。
- `docs/fable-diagnosis-2026-07-02/s6-zero-result-runbook.md` 新設＝週次手順（GA4 で result_count=0 抽出→同義語/エイリアス/条番号ゆらぎ/真の未収載の 4 分類トリアージ→`search-index.test.ts` の it.each へ回帰追加）。

**ランキング（T8）**: 「就業制限」1位＝安衛法61条は O8-a で既達で、`search-index.test.ts` の it.each（`{query:'就業制限', rank:1}`）で既にロック済み。SEARCH_CATEGORY_PRIORITY で law 最優先のため現状維持を確認し、**再実装せず**（既存の作り直しで件数を稼がない）。

**要・他班**: `/law-search`（`law-search-panel.tsx`＝UI 班所有）の 0 件画面・収録外条番号→e-Gov 条アンカー(`#Mp-At_N`)誘導は当班の領域外＝対象外と明記。

回帰: `egov-fallback.test.ts`(2 it)＋`SearchResults.test.tsx`(3 it・next/navigation モックで no-hit クエリを固定→0件描画で e-Gov/収録範囲/コピー導線を検証)。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings は他班ファイルの既存のみ）/ `vitest run`=240ファイル1994テスト全pass / `build`=成功。build 再生成データ（docs/rag-metrics-latest.json・web/src/data/chatbot-eval-fresh-results.json）は commit 前に `main` から復元。working tree clean。

残: O8-c（PR #600 CI 待ち→次イテレーションで回収）、O18（条文参照の自動リンク）、O17（条文パーマリンク＋束ね）が続く。

---

## O8-c 法令名かな読みの正略称展開（診断書 05-search-egov.md T3・比較 c）

横断検索(/search・⌘K)で e-Gov も当サイトも 0 件だった**法令名かな読み**（「あんえいほう」「くれーんそく」等＝現場のうろ覚え・音声入力で頻発）を該当条文へ着地させた。着手前に本番インデックスで切り分け実測: 正式名称「労働安全衛生規則 第563条」→既に 1 位＝安衛則563条・別略称「労安衛法 61条」→既に 1 位＝安衛法61条（keyword「安衛法」への部分一致で拾える）＝**正式名称・別略称は O8-a で解決済み**。残る真の穴は**かな読み**（あんえいほう/あんえいそく/くれーんそく/ゆうきそく/とっかそく/さんけつそく/せきめんそく/ふんじんそく/じんぱいほう…が全て 0 件＝インデックスにもコンテンツにも literal で現れない）。この一次調査に基づき、水増しを避けて「読み」に絞った（e-Gov API `abbrev` 由来の別略称の辞書化は既存の部分一致で概ね解決済みのため見送り）。

実装: `lib/cross-search/law-alias.ts` に純粋関数 `expandLawAliases` を新設。かな読み・稀な漢字別表記（塵肺法）トークンを正略称（安衛法・じん肺法…）へ **normalizeSearchText 経由の完全一致で差し替え**（部分一致は誤爆源のため不採用）。差し替えても失うヒットが無い語だけに限定＝既存 AND 検索を無改変。`searchItems` の cross-search 委譲直前へ O8-b の後段として `expandLawAliases(normalizeArticleQuery(query))` を配線（読み＋条番号「あんえいほう88条」は先に「あんえいほう 第88条」へ分解済みのため読みが独立トークンになり展開が効く）。エイリアス表のキー（正略称）は data/law-metadata.ts の `LAW_METADATA`（read-only import）に実在する lawShort であることを同期ガードテストで担保＝診断書の「law-metadata 連携」要件を、data班領域を改変せず lib 層で満たした。

完了条件充足（本番インデックス回帰 `search-index.test.ts` T3）: 「あんえいほう」→安衛法の条文がヒット（全件 安衛法条文で他法令へ流れない）・6 読み it.each（安衛法/安衛則/クレーン則/有機則/特化則/酸欠則）・「あんえいほう 88条」→1位 安衛法88条（O8-b と相乗）・「労働安全衛生規則 第563条」→1位 安衛則563条は不変（読み展開が既存ヒットを奪わない回帰）。回帰: 単体 `law-alias.test.ts` 10本＋統合 T3 8本。UI(SearchResults/CommandPalette)・深リンク・カバレッジは API 不変で無改修。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings は他班ファイルの既存のみ）/ `vitest run`=235ファイル1981テスト全pass / `build`=成功。build 再生成データ（docs/rag-metrics-latest.json・web/src/data/chatbot-eval-fresh-results.json）は commit 前に `main` から復元。O8-b(#591) 上にスタック（PR base=seo/o8b-article-query-parser）。working tree clean。

残: S6（0件時 e-Gov フォールバック＋ランキング調整）が P1。O18（条文本文の参照自動リンク）が P1。

---

## O18 条文本文の参照自動リンク（診断書 05-search-egov.md T5・比較 h）

条文カード本文に素テキストで現れる条番号参照（「第30条」「第30条第1項」「安衛則第36条」「クレーン等安全規則第23条」等＝紙のコピーと同じ死んだテキスト）を、収録済みなら当サイト深リンク `/law-search?law=<正式名称>&art=<条番号>`（内部）、収録外でも法令番号があれば e-Gov 条アンカー `https://laws.e-gov.go.jp/law/<id>#Mp-At_<N>`（外部）へ変換する純粋関数 `linkifyArticleReferences` を `lib/law-links/article-ref-linkify.ts` に新設。診断書 比較 h（参照ジャンプの完敗）の返上。

領域境界: リンカーは **表示非依存のセグメント配列**（`{text}` / `{text,href,external}`）を返す lib 層の純粋関数＝発見性/内部リンクは当班領域。条文カードへの結線（`article.text` を linkify して `<a>` を描く 1 行）は law-search-panel.tsx＝ux-tools 所有のため **要・他班**とし当班は着手せず、リンカー本体と「解決率100%・幽霊リンク0」のビルド時保証テストまでを担当（loop-prompt「跨りは自領域分だけ実施し他班分は要・他班と注記」）。返り値を JSX でなくデータにしたのはこの結線を 1 行で済ませ、かつ当班側で完結させるため。

法令正確性は不可侵のため「解決できない・曖昧な参照は一切リンク化しない」を設計原則にした（誤リンクは消すのでなく作らない）: (1)「令第6条」「法第43条」「同法第20条」等 直前が別法令を示す文字（令/法/則/例/同/附/別/表/章/節/款）の裸参照は参照先法令が一意に定まらないためスキップ、(2) 収録外の枝番（第○条の△）は e-Gov 条アンカーが基条（Mp-At_N）しか指せず枝番へ着地できないため e-Gov フォールバックは基条参照のみ、(3) 未知の法令名接頭も非リンク。参照先解決の唯一のソースは read-only import（捏造0）＝`allLawArticles`(curated 中核・mhlwLawArticles 補完は law 値が文書バンドル名で深リンク不可のため除外＝search-index.ts と同方針)の収録集合＋`@/data/law-metadata` の LAW_METADATA（略称→正式名称・e-Gov 法令番号 egovLawId）。名前アルタネーションは正式名称＋略称を長い順に並べ最長一致（「労働安全衛生法施行令」が「労働安全衛生法」より先に当たる）。

DRY: 漢数字/全角/枝番/項の数値化は O8-b `article-query.ts` の非公開ロジック（元は /law-search の kanjiToNum 再実装）を `lib/law-links/kanji-numerals.ts`（`NUM_CLASS`/`toArabic`/`kanjiRunToArabic`）へ切り出し、article-query.ts をそこへ載せ替え（挙動不変・article-query.test.ts 11本で回帰固定）。リンカーも同じ変換を共有。

完了条件充足: `article-ref-linkify.test.ts` 12本。核は**コーパス全文回帰**＝curated 全条文の text にリンカーを流し、生成された全リンクが (a) 内部なら decode した `${正式名称}|${条番号}` が収録集合に存在、(b) e-Gov なら法令番号が LAW_METADATA の既知 egovLawId かつ `Mp-At_<正整数>`、を満たすことを検証＝「生成リンクの解決率100%・幽霊リンク0」。加えて非空虚性（実生成リンク>20＝空虚に pass しない）とセグメント連結==入力（表示の欠落・重複0）を恒久固定。単体は 内部/略称接頭/漢数字/収録外e-Gov/令ブロック/同法ブロック/枝番非リンク/未知法令 を網羅。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings は他班ファイルの既存のみ）/ `vitest run`=240ファイル2033テスト全pass / `build`=成功。UI/深リンク/カバレッジは非改変。main から分岐（O8-c #600 マージ後）。working tree clean。

残: S6（0件時 e-Gov フォールバック）実装済み・PR #607 CI 待ち。O17（条文パーマリンク /laws/[law]/[art]＋束ねパネル・P2/L）が次の本丸で、O18 のリンカーを束ねパネルの参照解決へ再利用予定。

---

## 2026-07-03 T7 設計ドラフト（Path A）: e-Gov API v2 全文取込の設計書起票（診断 T7/G7 中期策）

回収/衝突解決: CI 緑だった自班 PR #607（S6）が main 進行（O8-c #600 ほか）で CONFLICTING 化 → 当該ブランチへ origin/main を**通常マージで解決**（force-push 不可を遵守）。衝突は3点＝(a) `cross-search/index.ts`＝両者が別 export 行を追加のみ→両立ユニオン、(b) BACKLOG-seo.md 未着手＝HEAD が O8-c・main が S6 を残置＝**両方とも完了済み**のため両除去し O18/O17/e-Gov のみ残す、(c) BACKLOG/cycle-log 完了節＝S6 と O8-c の両追記を併存。tsc0・cross-search 32テスト緑・lint errors0 を確認し push（CI 再走は次イテレーションで回収）。#614（O18）は CI 進行中で今ターンはマージ不可。

着手判断: 未着手最上位は S6（#607 in-flight）→O18（#614 in-flight）→O17（**L・O18 の未マージ linkifier に依存**）→e-Gov API 全文取込（**Path A・設計のみ**）。in-flight 2件と依存関係を踏まえ、**コード非改変でゼロ競合・独立マージ可能**な T7 設計ドラフトを選択（docs のみ＝#607/#614 と衝突面ゼロ）。

- **成果物**: `docs/fable-diagnosis-2026-07-02/T7-egov-fulltext-ingest-design.md` 1本のみ（コード0・データ0）。診断 G7（収録カバレッジの穴＝抄録1,065条で安衛則の未収録条が「規定なし」と誤読されるリスク）の中期策を設計に落とした。短期止血（0件フォールバック）は S6 で実装済みのため、本書はカバレッジ穴そのものの中期埋め。
- **設計の核（既存資産の拡張＝新規基盤ではない）**: `scripts/etl/egov-revisions-fetch.ts`（e-Gov API v2 ETL・認証不要・政府標準利用規約2.0・実在検証済み lawId×20・diff-only・skip-on-missing の作法）／`egov-caption-snapshot.ts`＋`article-caption-integrity.test.ts`（チェックイン済みスナップショット＋整合テストの先例）／`LAW_METADATA.egovLawId`／`LawArticle` 型／`allLawArticles` 集約／`scripts/law-data-import/README.md`（取得手順既記）を土台に再利用する方針を明記。
- **方式の要点**: (1) 「ビルド時に外部API」ではなく**オフライン取得→git チェックイン→静的 import**（CI/デプロイ再現性・main 常時デプロイ可能の担保）、(2) **新規 env 不要**（API キー無し）、(3) 段階投入（安衛法/令/則→主要特別則→その他）、(4) **バンドル肥大対策＝検索インデックスと本文の分離・遅延ロード・PWA プリキャッシュ見直し**（診断 G8 の宿題＝SEO/ux-tools/PWA 班の横断合意要）、(5) 原文サンプル照合・削除条ガード・出典必須のテスト設計。
- **Path A 境界の明示（§8/§10）**: 外部API本番取込みの是非・データ所有（`web/src/data/laws/**` は data 班領域）・取得頻度（単発 or Vercel Cron）は**オーナー/他班判断**。SEO班は「全文が入った後の検索インデックス統合＋カバレッジ透明性」に限る。本イテレーションでは取得スクリプト・データ・`search-index.ts`・`sw.js` を一切書かない＝設計ドキュメント1本が成果物。

ゲート: **コード変更0**（docs＋BACKLOG＋本ログのみ）につき tsc/lint/vitest/build は本質的に非改変で全緑維持。working tree clean。

残: #607（S6）・#614（O18）の CI 緑回収＆マージ。次の未着手は O17（条文パーマリンク＋束ねパネル・O18 の linkifier マージ後に着手）。T7 は**オーナー GO 待ち**（承認後 P2 実装は data 班/オーナー主導）。

---

## 2026-07-03 柱C-3-3 追補2: 孤立していた実在indexableページ4本をsitemap収載＋非収載境界を回帰固定

回収: CI 緑だった自班 PR #614（O18）を squash マージ → main へ O18（`lib/law-links/*`）着地。続けて #617（T7 設計ドラフト・docs のみ）が #614 マージで BACKLOG-seo.md／cycle-log-seo.md に追記衝突 → 当該ブランチへ origin/main を**通常マージで解決**（force-push 不可を遵守）し #617 もマージ。両ブランチは --delete-branch 済み。#623（C-3-3 accidents）は前イテレーションの成果で CI 進行中＝今ターンはマージ対象外。main を ff-only 同期し clean 確認。

着手判断: 未着手最上位は O17（条文パーマリンク /laws/[law]/[art]＋束ねパネル）だが、これは**新規コンテンツページ本体＝ux-tools 所有**の本文構築が主で当班単独完結しない（P2・L・当班分は sitemap/JSON-LD スライスのみでページ実体がまだ無い）。当班の in-lane タスクが 3 件未満のため loop-prompt「3件未満なら自領域から補充」に従い、**C-3-3（欠落sitemap）の続きを自領域で補充**＝孤立 indexable ページの機械的な再監査を実施。

監査手法（捏造0・全数突合）: `find src/app -name page.tsx` の全 194 ルート → route-group/dynamic を正規化し**静的173本**を抽出 → sitemap.ts の url 文字列と `comm -23` で差集合 → 差分 41 本を1本ずつ (a) noindex か（`index:false`/COMMON_DISALLOW 配下 admin/auth/dev/api-docs/dpa/handover/lms）(b) redirect スタブか (c) 自己canonical & 実コンテンツか で判定。

追加した実在孤立ページ（4本・自己canonical確認済み）:
- **`/accident-news`** ＝「重大災害事例ブラウザ」。厚労省 死亡災害DB の類型検索（業種/事故型/原因/年）・`revalidate=86400`・OG付・`alternates.canonical="/accident-news"`。判例 /court-cases[id] や /accidents は収載済みなのに、この独自コンテンツ browser だけ全 sitemap 不在だった。lastmod は `accidentsDataUpdated`（freshness.ts で `SERIOUS_CASES_META.generatedAt` から算出＝当該ページのデータ源そのもの）に追従＝/accidents と同一値を共有。priority 0.85 / weekly。
- **`/heat-illness-prevention/{acclimatization,log,poster}`** ＝令和7年6月施行 改正安衛則（第612条の2）対応の実在ツール3本。暑熱順化計画・WBGT記録帳票・緊急対応ポスター印刷。いずれも自己canonical・PageJsonLd（構造化データ）・固有メタ。親 /heat-illness-prevention と兄弟3本（wbgt-calculator/industry-risk/r7-compliance）は収載済みなのに、後発のこの3本だけ漏れていた。兄弟と同節のため lastmod=2026-05-16・priority 0.8・monthly を踏襲。

非収載境界の明示ロック（機械的全ページ追加＝誤収載の再発防止）:
- redirect スタブは実体URLでないため除外＝`/about/cases`（→/about）・`/quick-start`（→/quick）は `redirect()` のみのファイル。
- リリース前デモは除外＝`/organization`「組織管理ダッシュボード｜デモ版…正式リリース前のデモ版です」（モック）。noindex 付与は ux 班判断のため当班は sitemap 非収載に留める。
- 印刷専用ユーティリティ `/accident-news/print` は除外。
- noindex（admin/auth/dev/account/favorites/stats）・utility（/pdf・各 print・/signage/display・/search）は従来どおり除外。

回帰: `sitemap.test.ts` に describe「柱C-3-3 追補2」5本追加＝(1) /accident-news 収載 (2) 熱中症3本収載 (3) /accident-news の lastmod == /accidents（死亡災害DB同一源）(4) 非収載境界＝redirect スタブ・デモ・印刷は false。全 19 本。子 sitemap は無改変（単一 URL のため本体 pages 配列へ直書き＝circulars/equipment/articles/accidents の動的子とは役割分担を維持）。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings は他班ファイルの既存のみ）/ `vitest run`=255ファイル2142テスト全pass / `build`=成功。build 再生成物（rag-metrics-latest.json・ky-print-sheet snapshot・chatbot-eval-fresh-results.json）は `git checkout` で復元。working tree は sitemap.ts / sitemap.test.ts の2ファイルのみ。

残: #623（C-3-3 accidents 個別ページ）・本 PR の CI 緑回収＆マージ。次の未着手は O17（**要・ux-tools**＝ページ本体は他班・当班分は sitemap/JSON-LD スライス。ページ実体着地後に着手）。決裁A は既達確認済み。

---

## 2026-07-03 柱C-3-3 追補3: 二重着手 #623 の統合＝/ky/paper のみ収載・/organization はデモ版のため非収載を堅持

回収状況: 前イテレーションで CI 緑だった #614(O18)・#617(T7) はマージ・ブランチ削除済み。今ターン頭で自班 PR を再点検すると、**同じ「孤立ページ収載」を古い base で並走していた別ブランチ #623 が存在**（CI 緑）。だが `gh pr merge 623` は clean merge 不可（base が古く他班の大量ファイル追加とドリフト）。安易にマージ解決する前に #623 の実追加を精査した。

精査結果（#623 が追加した6本の判定）:
- `/accident-news`＋`/heat-illness-prevention/{acclimatization,log,poster}` の**4本は本ブランチ #627(追補2)と重複**。しかも本ブランチの方が良質＝/accident-news の lastmod を `accidentsDataUpdated` へ動的追従させ、非収載境界（redirect/デモ/print）を回帰ロック済み。#623 は静的 lastmod（2026-06-13 等）で劣る。両者マージすると**同一URLが二重掲載＝役割崩壊＋水増し**。
- `/organization` は #623 が追加していたが、**本ブランチ追補2の非収載境界テストが `expect(has("/organization")).toBe(false)` で明示的に禁止**している。page.tsx を実査＝タイトル「組織管理ダッシュボード｜デモ版」・「正式リリース前のデモ版です」・架空の拠点名/社員数(273名)/修了率のデモ値・全ボタン disabled「デモ版（正式リリース後に有効化）」。**検索エンジンに index させるべきでないモック**であり #623 の追加は誤り。#627 の境界判断が正しい。
- 残る `/ky/paper` の**1本だけが正当な未収載孤立ページ**＝`robots: { index: true }`・`alternates.canonical="/ky/paper"`・HowTo JSON-LD・`/pdf` の permanentRedirect 先（sitemap.ts 既存コメントも /pdf→/ky/paper を明記）。KY入力の正規ページなのに全 sitemap 不在だった。

対応: `/ky/paper` を本ブランチ #627 へ取り込み（/ky-examples の直後・lastmod=page.tsx 最終更新 2026-05-25・priority 0.75・monthly）。これで #627 が #623 の正当分を完全に内包し、誤収載(/organization)を含む #623 は superseded として close＋ブランチ削除する（未マージだが自班の誤り含む重複ブランチ＝放置すると将来 /organization 誤収載の再マージ事故になるため統合して閉じる）。

回帰: `sitemap.test.ts` 追補2 describe に2本追加＝(1) `/ky/paper` 収載 (2) 非収載境界＝`/pdf`（/ky/paper への permanentRedirect スタブ）は false＝実体URLのみ収載しリダイレクト元は載せない原則を固定。sitemap.test は 21本 全 pass。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warnings は他班ファイルの既存のみ・当班差分は sitemap.ts/sitemap.test.ts の2ファイルのみ）/ `vitest`=sitemap.test 21本緑 / `build`=成功。working tree clean。

残: 本 PR #627 の CI 緑回収＆マージ・#623 の close/delete。次の未着手は O17（**要・ux-tools**）。

---

## 2026-07-03 O17/T6 条文パーマリンク＋束ねパネル＝Path A 設計ドラフト起票（実装はオーナー承認待ち）

回収: 前イテレーションの PR #627（追補2＝孤立4本収載＋非収載境界＋/ky/paper 統合）の CI 緑（e2e/smoke pass・full skip）を確認し squash マージ→ブランチ削除。`git checkout main && git pull --ff-only` で clean 確認。BACKLOG-seo の未着手は O17/T6 のみ＝1件（<3）。

着手判断: BACKLOG-seo 最上位の唯一の未着手 O17（条文パーマリンク `/laws/[law]/[art]`＋束ねパネル）を精査。**これは数百〜約1,065本の新規 indexable URL名前空間 `/laws/*` の新設**であり、CLAUDE.md「必ずオーナーに確認すること＝**ページ構成の大幅変更（URL変更を伴うもの）**」に該当。URL/canonical は一方通行のドア（後からのURL変更はSEO資産を毀損）。sibling タスク T7（e-Gov全文取込＝外部API）を本レーンが **Path A 設計ドラフト**で扱った先例に倣い、**SEO班単独で実装着手せず設計ドラフトを起票**する判断。

実データ監査で「一度に完成できない」ことを技術的に確定: 束ね（G6）の中身＝条文↔各DBの相互参照を精査した結果、(a) **通達**は `mhlwNotices.lawRef`＋title 地の文の条番号を **O18 リンカで機械抽出＝捏造なしで導出可能**、(b) **判例(COURT_CASES)** は `field`/`issues` が topical で**条文キーの構造化フィールド無し**、(c) **教育資格/用語**も条文キー無し＝いずれも **keyword 推測で埋めるのは捏造（法令正確性不可侵）**＝data班の条文キー付きマップが前提（要・他班）。よって Phase1骨格（SEO班単独・捏造ゼロ）→Phase2通達束ね（リンカ導出）→Phase3判例/資格（data班マップ前提）の段階투입が必然。

成果物: `docs/fable-diagnosis-2026-07-02/T6-law-permalink-bundle-design.md`（設計のみ・コード/データ生成0）。§2 URL設計（推奨案A `/laws/<egovLawId>/<artSlug>`＝ASCII安定・e-Gov原文1:1・改称不変・slug衝突ゼロ回帰）／§4 Phase1本文（**O18 リンカを本文へ通し G4 条間リンクをライブ化**＝これまで描画面ゼロで dormant だったリンカが初の描画面を得る）／§5 捏造ゼロの境界監査表／§7 schema.org `Legislation` JSON-LDヘルパー案（既存 LegalDocument=通達 と別型）／§8 e-Gov 透明性（枝番は基条アンカー誤着地を避け非アンカー）／§10 thin/duplicate 対策（`/law-search` ツール面と競合させず `/laws/*` を唯一 indexable home）／§11 オーナー・他班判断事項／§12 Path A 境界。

副次: BACKLOG-seo の O17 を [x]（Path A 化）へ移動。未着手の実装タスクは 0 件になったため、次イテレーションは補充の指針§（site-critique の SEO/構造化データ系で自領域に閉じるもの）から補充する旨を明記。

ゲート: コード変更 0（docs のみ）＝`tsc --noEmit`/`lint`/`vitest`/`build` は非改変で全緑維持（前 PR #627 の CI 緑で担保）。working tree は docs/BACKLOG/cycle-log の3差分のみで clean。

残: 本 PR の CI 緑回収＆マージ（次イテレーション 1)）。O17 実装は**オーナーの明示指示待ち**（承認時の着手単位は Phase1＝SEO班単独・捏造ゼロ）。

---

## 2026-07-03 PWA ショートカット横断検索/AI質問 追加＋幽霊ショートカット回帰ガード（＋かな折り畳み調査・却下）

契約1) 自班の未マージ PR 回収: #647（FAQ200問 横断検索収載）は CI 実行中のため次イテレーションへ持ち越し。#641（教育 全9テーマ源＋深リンク）が origin/main と CONFLICTING だったため当該ブランチへ `origin/main` を通常マージ（衝突は BACKLOG-seo.md 完了欄の両追記を併存で解決＝force-push なし）→ tsc0/lint errors0/全2222緑/build 成功を確認して push（CI 再走は次イテレーションで回収）。main は `git pull --ff-only` で最新化。

本題（補充タスク＝未着手0のため自領域から）: App Router 動的 `manifest.ts` のショートカットが KY/法改正/事故DB の3本のみで、当班担当の**発見性の入口=横断検索(/search)** と **安衛法即答=AIチャットボット(/chatbot)** がインストール済みユーザーの1タップ導線から欠落していた穴を是正。両ルートの `page.tsx` 実在を確認のうえ現場頻用順（KY→横断検索→AI質問→法改正→事故DB）で収載。`/search` は noindex だがショートカットはクローラ非関係のため収載可＝コメントで明示。**幽霊ショートカット防止**として新設 `manifest.test.ts`（5 it）が全ショートカット URL・start_url を `page.tsx` 実在へ機械突合（sitemap 孤立ページ突合と同方針）。tsc0・lint errors0・全2224テスト緑（新規5含む）・build 成功。再生成データ（rag-metrics-latest.json / ky-print-sheet snapshot / chatbot-eval-fresh-results.json）は復元し working tree clean。

副次（負の結果を記録＝再試行防止）: 当初は横断検索の共有正規化 `fuzzy-search.ts::normalizeSearchText` に**かな折り畳み（ひらがな→カタカナ）**を試作したが、full suite で **RAG ベンチが退行**（`chatbot-phase2-metrics` Citation@1 66%→59%・Recall@5 100%→88%、`rag-100q-fresh` 90%→85%）。原因は `normalizeSearchText` が cross-search(score.ts) と**チャットボット RAG(rag-search.ts) の両方が直接依存する共有関数**で、部分一致スコアラへの blanket かな折り畳みが異script衝突で精度を希釈するため。cross-search 側 locked 不変条件は通ったが、同種の日本語キーワード検索 ground truth である RAG ベンチの5pt退行は cross-search 精度も同様に希釈する強い証左＝`既存破壊0/水増し0`原則で不採用・revert。将来は共有正規化ではなく cross-search 専用パス限定＋cross-search 独自ベンチ整備が前提。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warnings既存23) / `vitest`=2224 pass / `build`=成功。working tree は manifest.ts(M)＋manifest.test.ts(new)＋BACKLOG/cycle-log の docs のみ。

残: 本 PR＋#647＋#641 の CI 緑回収＆マージ（次イテレーション 1)）。

---

## 2026-07-03 柱C-2追補 横断検索に FAQ(200問) を収載＝質問インテントの発見性

着手前確認: PR #637(/ky/workers sitemap収載)がCI緑のため squashマージ→main を ff-only pull→clean。BACKLOG-seo 未着手0件のため補充の指針§に従い自領域から補充。site-critique(01/05)のSEO/構造化データ系はすべて既達を機械確認（sitemap孤立ページ=0/A-2 audits は/admin/配下でrobots Disallow済/S-1 articles・A-4 equipment の毒シェルは解消済）。次の実データ穴として、横断検索が7カテゴリ止まりで `@/data/faqs` のキュレーション済み **FAQ 200問** が0件ヒットだった質問インテントの欠落を特定（用語 glossary=「○○とは」とは別軸）。/articles 収載は正本 getPublishedArticleIndex が今も node:fs 依存＝data班のブラウザ安全モジュール前提で引き続き blocked（要・他班）を再確認し回避。

実装: `search-index.ts` に `faq` カテゴリ新設。`ALL_FAQS`(node:fs非依存=ブラウザ安全)を read-only import し title=質問文・subtitle=回答冒頭80字(結果一覧で即答)・keywords=tags＋関連法令・url=`/faq/<category>`(sitemap収載の実在カテゴリ一覧＝law-system/management/chemical/health-education で必ず解決＝幽霊リンク0)。UI(SearchResults/CommandPalette)に FAQ タブ＋HelpCircle(sky)を追加、CATEGORY_META/countByCategory/CATEGORIES を拡張。

locked不変条件の保全: 追加後、O8-a/T8 の locked テスト「就業制限」1位=安衛法61条 が退行（概念名で始まる FAQ 質問のタイトル前方一致 65点 が条文キーワード完全一致 55点=articleTitle「就業制限」に勝ち1位を奪取）を CI 前に検知。FAQ結果タイトルに慣用の「Q. 」接頭を付し前方一致(65)→部分一致(45)へ落として権威条文の1位を堅持（FAQは下位で発見可能）＝スコアリング根拠をコード内コメントに明記。

ゲート: `tsc --noEmit`=0 / `npm run lint`=errors0(warnは既存) / `npx vitest run`=261ファイル2213テスト全緑（FAQ describe 3本追加） / `npm run build`=成功（初回は Next の TS worker が OOM で segfault=3221225477、標準 tsc は独立に緑のため NODE_OPTIONS=--max-old-space-size=6144 で再実行し成功＝コードエラーではない）。build が再生成した docs/rag-metrics-latest.json・chatbot-eval-fresh-results.json・ky-print-sheet snapshot は checkout で復元。working tree は search-index.ts/test・SearchResults・CommandPalette・BACKLOG・cycle-log のみで clean。

要・他班: 個別FAQ深リンク(/faq/<category>#<id>)は /faq ページ本文(UI班)の FAQItem にアンカー＋hashオープンが前提のため今回はカテゴリ一覧へ寄せた(glossaryと同方針)。

残: 本 PR の CI 緑回収＆マージ（次イテレーション 1)）。

---

## 2026-07-03 柱C-2 追補: 横断検索の教育(Eラーニング)を全テーマ源へ拡張＋個別テーマ深リンク化（PR: seo/c2-elearning-all-themes-deeplink）

回収: 前イテレーションの自班 PR #637（柱C-3-3 追補4＝/ky/workers 収載）は今ターン頭で CI 未緑（smoke/e2e/Vercel pending）だったため未回収＝次イテレーションへ持ち越し。main は clean・BACKLOG-seo の未着手は 0 件（O17/T6 は Path A 設計ドラフト済＝オーナー承認待ち）のため、補充の指針§に従い自領域（横断検索）から補充。

着手判断: site-critique 01/05 の SEO/構造化データ系を再点検し、大半は既達を確認。候補「法改正記事(/articles)の横断検索収載」は正本 `getPublishedArticleIndex` が `node:fs`(readdirSync/process.cwd) 依存＝**ブラウザ非安全**で、client の `buildSearchIndex` からは import 不可（アグリゲート先の `src/data/articles/` は data班所有）＝**要・他班**と判定し BACKLOG に注記。代わりに完全に自領域（`search-index.ts` 単独）で閉じる真の欠落を発見・是正。

穴の実体: 横断検索(/search・⌘K)の education カテゴリが、`ELearningPanel` が `allThemes` として実際に描画する **9 テーマ源**（入門コース＋汎用カタログ＋追補＋業種別6分野=製造/医療福祉/運輸/林業/食品/小売）のうち `elearningThemesCatalog` **1 源だけ**を import しており、業種別・入門・追補テーマが横断検索から丸ごと欠落（近年追加分が引けない発見性の穴＝#561 の accident 5/7ファイル欠落と同型）。加えて全件が一覧トップ `/e-learning` へリンクし、検索した個別テーマへ到達できなかった（一覧落ち）。

是正: `search-index.ts` の education ブロックを panel の `allThemes` と同じ 9 源の union（`theme.id` 重複除去）へ寄せ、単一ソース化。url を panel が受け取る深リンク `/e-learning?theme=<id>#el-quiz` へ変更。**幽霊リンク0の保証**＝panel line 79-86 が `allThemes.some(t=>t.id===themeParam)` で id を検証し一致時のみテーマを開く（未知idは無視して先頭表示）＝収載源が allThemes と同一のため深リンクは必ず解決。`el-quiz` アンカーは panel line 177 に実在確認。keywords に `sourceType`/`level`/`industry_detail` を補い業種語（「製造業」等）からも引ける。データ(src/data/mock/**)は import のみ・非改変。UI(SearchResults/CommandPalette)は education タブが既存のため CATEGORY_META 含め無改変。

回帰: `search-index.test.ts` に education describe 3本追加＝(1) index の ID 集合が panel 全テーマ源(allThemes の union)と `toEqual` 一致＝1源import欠落の再発を固定（業種別 el-mfg-chemical/el-hc-back/el-rt-slipfall 収載も明示）、(2) 各件が `/e-learning?theme=<id>#el-quiz` 深リンク・裸 /e-learning 不在・深リンク先 id が allThemes に実在（幽霊リンク0）、(3) 業種語「製造業」で 1 件以上ヒット。

ゲート: `tsc --noEmit`=0 / `lint`(search-index.ts+test)=errors0 / `vitest run`=257ファイル2178テスト全pass（search-index.test は 42 pass）/ `build`=成功。build 再生成物（rag-metrics-latest.json・ky-print-sheet snapshot・chatbot-eval-fresh-results.json）は `git checkout` で復元。working tree は search-index.ts / search-index.test.ts の2ファイルのみ。

残: 本 PR＋前 PR #637 の CI 緑回収＆マージ（次イテレーション 1)）。次の未着手は補充（記事横断検索は data班のブラウザ安全集約待ち＝要・他班）。O17 実装はオーナー承認待ち。

---

## 2026-07-03 柱C-4 JSON-LD 主要エンティティの @id グラフ化（PR #704 / seo/json-ld-entity-graph-id）

**着手理由**: BACKLOG-seo.md の未着手キューが空（O17/T6・T7 は Path A 設計ドラフト化済み＝実装オーナー承認待ち）のため、補充の指針（site-critique 01-seo-technical.md の SEO/構造化データ系で自領域に閉じるもの）に従い自領域から補充。着手前に sitemap（articles=実在記事動的生成へ是正済み・accidents/equipment/chemicals/court-cases/safety-signs/foreign-workers 等の個別ページ収載済み）と robots（AI検索引用系許可・学習系遮断・FBプレビュー復活が既達）を実測し、既済でないことを確認。記事の横断検索収載は data班のブラウザ安全集約モジュール待ち＝要・他班のため今回対象外。

**穴**: 全ページ `<head>` で `organizationSchema()` と `webSiteSchema()` を別々の JSON-LD として出力しているが、両者が `@id` で同定されず相互リンクも無く、検索エンジンからは「無関係の2ノード」に見えていた。加えて Article/NewsArticle/WebApplication/WebPage の author/publisher/provider/isPartOf が自サイト組織・サイトを name/url でインライン再宣言＝同一の実世界エンティティが複数の別ノードに分裂し、ナレッジグラフ/ブランド同定シグナルを希釈していた。

**是正**: `json-ld.tsx` に安定 @id を新設（`ORG_ID=${SITE_URL}/#organization`・`WEBSITE_ID=${SITE_URL}/#website`＝SITE_URL 単一ソース由来・ハードコード無し）。Organization/WebSite に @id を付与し、WebSite→Organization を `publisher:{ "@id": ORG_ID }` 参照で結線。共有 `PUBLISHER_REF`（→Article/NewsArticle リスト・WebApplication provider へ自動波及）・`newsArticleSchema` publisher・`webPageSchema` の isPartOf/publisher にも @id を付し、全ての「自サイト組織/サイト」ノードを1つの正準ノードへ集約。自己参照 `sameAs:[SITE_URL]`（同定価値ゼロのバリデータ smell＝外部権威プロフィール未整備）を除去。挙動は JSON-LD の意味論的リンク付けのみで可視UI/ルーティング/メタ本文は無改変。

**回帰**: `json-ld.test.ts` に「エンティティグラフ: 発行主体ノードの @id 集約」describe 追加＝Organization/WebSite の @id 形式・WebSite.publisher が ORG_ID 参照・sameAs 不在・Article/NewsArticle/WebApplication/WebPage の発行主体ノードが全て ORG_ID/WEBSITE_ID を指すことを固定。既存 SearchAction(/search 正規化)・OG フォールバック等の不変条件は非改変。

**ゲート**: `tsc --noEmit`=0 / `lint`=errors0（warnは既存の別ファイル）/ `vitest run`=282ファイル2400テスト全pass（json-ld.test は 31 pass）/ `build`=成功。build 再生成物（rag-metrics-latest.json・chatbot-eval-fresh-results.json）は `git checkout` で復元。working tree は json-ld.tsx / json-ld.test.ts の2ファイルのみ。

**残**: 本 PR #704＋既存 PR #698(PageJsonLd 単一ソース)・#691(かな読みエイリアス) の CI 緑回収＆マージ（次イテレーション 1)）。発行主体グラフの完全集約（serviceSchema.provider・courseListSchema.provider・datasetSchema.creator 等の低頻度ノードの @id 化）は本 PR で primary グラフを固めたうえでの follow-up 候補。記事横断検索は要・他班（data班ブラウザ安全集約待ち）。O17/T6・T7 実装はオーナー承認待ち。
