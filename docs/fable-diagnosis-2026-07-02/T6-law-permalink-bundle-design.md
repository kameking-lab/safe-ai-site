# T6/O17 設計ドラフト — 条文パーマリンク `/laws/[law]/[art]` ＋束ねパネル

- 種別: **設計ドラフトのみ（Path A）**。本ドキュメントはコードもデータも生成しない。実装は **オーナーの明示指示待ち**。
  - 根拠: CLAUDE.md「必ずオーナーに確認すること＝**ページ構成の大幅変更（URL変更を伴うもの）**」。本タスクは数百〜約1,000本の**新規 indexable URL 名前空間 `/laws/*` の新設**＝サイトの発見面・内部リンク構造・sitemap 構成を作り替える大幅変更であり、URL/canonical は**一方通行のドア**（後からのURL変更はSEO資産を毀損する）。よって sibling タスク T7（e-Gov全文取込＝外部API）と同じ **Path A** で扱い、SEO班単独では実装着手しない。
- 起票: SEO/インフラ班（2026-07-03）
- 診断根拠: `docs/fable-diagnosis-2026-07-02/05-search-egov.md` G6（条文↔通達↔判例↔解説の束ね表示＝**e-Govに構造的に不可能な最大の勝ち筋**）／G4（条文間参照の自動リンク）／提案タスク **T6**（依存: T5）
- 関連完了タスク: **O18/T5**（条文参照の自動リンカ `lib/law-links/article-ref-linkify.ts`＝**本ドラフトで初めて描画面を得る**）、O8-a/b/c（cross-search 配線・条番号パーサ・エイリアス）、S6/T4（0件時 e-Gov フォールバック）、柱C-3-3（sitemap 収載の先例）、柱C-4（JSON-LDヘルパー lib）

---

## 0. 要約（結論先出し）

- **課題（勝ち筋2＝G6の実体化）**: e-Gov は通達1,069件・判例・実務解説・教育資格要件を**永遠に持てない（所管外）**。「安衛法61条を見たら、対象業務の政令・技能講習の通達・無資格運転の送検判例・教育の申込動線・原文e-Govまで1画面」は**当サイトだけが作れる**。現状、条文への安定URLは query string（`/law-search?law=&art=`）**のみ**で、(a) Google が個別条文をインデックスする受け皿が無い、(b) 条文を中心に周辺情報を束ねた恒久ページが無い。
- **本ドラフトの結論**:
  1. **URL設計は一方通行のドア**＝実装前にオーナー承認必須（§2）。推奨は **`/laws/<egovLawId>/<articleSlug>`**（ASCII安定・e-Gov原文と1:1対応・改称に強い）。
  2. **SEO班が捏造ゼロで今すぐ作れる層**（route基盤・self-canonical・**O18リンカで本文の条間リンクをライブ化**・sitemap受け皿・Legislation JSON-LD）と、**構造化された相互参照データが無いため今は作れない層**（条文↔判例↔教育資格の束ね＝§5）を分離する。後者を**架空マッピングで埋めるのは捏造＝不可**。
  3. 段階투입: **Phase 1（SEO班・骨格＝薄くない最小）** → **Phase 2（data班連携・束ねの中身）** → **Phase 3（相互リンク最適化）**（§9）。
- **オーナー/他班判断事項**（§11）: (a) `/laws/*` URL名前空間の新設可否とURLスキーム確定、(b) この新規ページの**所有班**（SEO班の発見性インフラpage＝`/search`の前例 か、UI班のfeature page か）、(c) 束ねデータの**構造化マッピング**（条文↔通達/判例/資格）の作成＝`web/src/data/**` は data 班領域、(d) 数百ページ静的生成のビルド時間/バンドル予算。

---

## 1. 現状の穴（測定済みの事実のみ）

| 観点 | 現状 | 出典 |
|---|---|---|
| 条文への安定URL | **query string のみ**（`/law-search?law=<正式名称>&art=<条番号>`）。`/law-search` の canonical は自身1本＝**個別条文はインデックス対象外** | search-index.ts:136-138 / law-search page |
| 束ね表示 | `/law-search` は条文カード単体表示。通達・判例・用語・教育資格への**恒久的な束ねページが無い** | G6 |
| 条間参照リンク | リンカ `linkifyArticleReferences`（O18）は**実装済みだが描画面ゼロ**（law-search-panel への結線は要・他班のまま dormant） | O18 完了メモ |
| curated 収録量 | 条文 **約1,065件**（50法令。`allLawArticles` から mhlw 補完バンドルを除いた集合） | 05-search-egov.md §22 / laws/index.ts |
| sitemap | `/law-search`（1 URL）のみ。個別条文の sitemap エントリは**ゼロ** | sitemap.ts |

**要点**: 「条文を中心にした束ね」も「条文の安定URL（SEO受け皿）」も現状は不在。両方を一度に埋めるのが T6。ただし**束ねの中身は構造化された相互参照データに依存**し、それが今は無い（§5）。

---

## 2. URL設計（★一方通行のドア＝オーナー承認必須）

条番号 `第61条` / 枝番 `第577条の2` / 項 `第10条第1項` は日本語・特殊文字を含み、法令名も改称され得る。dynamic segment に生の日本語を置くと encoding 事故・改称時のURL崩壊を招く。候補を比較する。

| 案 | 例 | 長所 | 短所 |
|---|---|---|---|
| **A: `/laws/<egovLawId>/<artNo>`（推奨）** | `/laws/347AC0000000057/61` `/laws/347M50002000032/577-2` | egovLawId は ASCII 安定・**e-Gov原文と1:1**・法令改称に不変・`LAW_METADATA.egovLawId` に既存。枝番=`577-2`・項=`577-2-p1` で表現可 | egovLawId が人間可読でない（→ `<title>`/breadcrumb/OGで補う） |
| B: `/laws/<lawShort-romaji>/<artNo>` | `/laws/anei-soku/577-2` | 可読 | ローマ字表記の恣意性・略称衝突・辞書メンテ＝新たな真実源が要る |
| C: `/laws/<正式名称url encoded>/<第N条>` | `/laws/%E5%8A%B4...%E5%89%87/%E7%AC%AC577...` | データ直結で実装容易 | URLが長大・不安定・改称で崩壊・共有時に文字化け＝**SEO最悪** |

- **推奨=案A**。理由: (1) 安定ASCII で共有・被リンク・GSC 分析に強い、(2) `egovLawId` を持つ法令だけを対象にすれば **e-Gov原文canonicalと必ず対応**（§8 の外部リンクも同一IDで導出）、(3) 枝番・項の表現を機械規則（`条-枝-p項`）で一意化でき **slug衝突ゼロ**を回帰で固定できる。
- **artSlug 規則（案）**: `第577条の2第1項` → `577-2-p1`、`第61条` → `61`。逆変換（slug→表示条番号）は curated データの `articleNum` を正本にし、**slug が既存条番号へ一意に逆写像できることをビルド時テストで固定**（幽霊URL 0）。
- **canonical**: 各 `/laws/...` は **self-canonical**（この新URLを条文の唯一の indexable な home にする）。`/law-search`（インタラクティブ・ツール面）は従来どおり自身canonical＝**個別条文では競合しない**＝duplicate-content 化しない（§10）。
- **egovLawId 未保有の法令**: 対象外（ページを作らない）。captureできる範囲を `LAW_METADATA` に依存させ、**捏造URLを作らない**。

> ⚠ この §2 の確定（特に案A採用と slug 規則）が**実装の前提**。オーナー承認前にコードは書かない。

---

## 3. 静的生成（Next.js）

- `generateStaticParams()` は **curated `allLawArticles`（mhlw補完バンドル除外＝search-index.ts / O18 と同一方針）** かつ **`LAW_METADATA.egovLawId` を持つ法令**の条文だけを列挙。
- 規模: 最大約1,065条 →（egovLawId 保有法令に限定するとやや減）。既存の静的大量ルート（`/circulars/[id]`≈1,158・`/accidents/[id]`≈290・`/court-cases/[id]`）と同オーダー＝**ビルド時間は許容範囲の実績内**だが、**バンドル/ビルド時間予算はオーナー確認（§11-d）**。
- `dynamicParams = false`（想定）＝未知slugは404。深リンク集合＝生成集合を回帰で一致させ soft-404 を防ぐ。

---

## 4. ページ本文構成（Phase 1＝薄くない最小）

「条文テキストの再掲だけ」では `/law-search` の重複＝thin/duplicate リスク。**O18リンカのライブ化**で e-Gov に無い付加価値を骨格段階から載せる。

1. **見出し**: `${lawShort} ${articleNum}`（例「安衛則 第577条の2」）＋ `articleTitle`（条文見出し）。
2. **本文（付加価値の核）**: `LawArticle.text` を **`linkifyArticleReferences(text, law)`（O18）** に通して描画。本文中の「第○条」「安衛則第36条」等が**内部条文へ1タップ遷移**（G4＝参照ジャンプの完敗返上）。**リンカは既に解決率100%・幽霊リンク0を回帰固定済み**＝新規ページで初めて実際の描画面を得る（O18完了メモの「描画面ゼロ・dormant」を解消）。
3. **号マップ**: `itemNumberMap` があれば号（一・二…）と主題を明示（AIハルシネーション防止データの可視化）。
4. **e-Gov原文リンク**: `LAW_METADATA.egovLawId` から `https://laws.e-gov.go.jp/law/<id>#Mp-At_<N>`（§8）＝**収録の透明性**（G7＝「当サイトは抄録、原文はe-Gov」）。
5. **パンくず**: ホーム → 法令検索 → `${lawName}` → `${articleNum}`（BreadcrumbList JSON-LD＝§7）。
6. **ナビ的束ね（データ捏造なしで即可能）**: 「この条文を横断検索」（`/search?q=${lawShort}${articleNum}`）・「law-search で開く」（`/law-search?law=&art=`）・同一法令の隣接条へのprev/next。

> Phase 1 は **route基盤＋self-canonical＋リンカ本文＋e-Gov透明性＋sitemap受け皿＋JSON-LD** で構成し、**架空の関連付けを一切持たない**（§5の束ねは Phase 2）。これだけでも「安定URL＋条間リンク＋原文導線」で `/law-search` にない恒久価値がある＝thin ではない。

---

## 5. 束ね（G6の中身）データソースの実在性監査 — ★捏造ゼロの境界

「関連通達≥1・判例≥1・教育資格導線」（T6 完了条件）を出すには**条文↔各DBの構造化された相互参照**が要る。現データを監査した結論:

| 束ね対象 | 現データの相互参照 | 今できるか | 判定 |
|---|---|---|---|
| **通達（mhlwNotices）** | `lawRef?: string`（自由文・任意）＋ **title に条番号が地の文で存在**（例「労働安全衛生規則第五百七十七条の二第二項…」） | **O18リンカを notice title/lawRef に流して条番号参照を抽出→条文キーへ逆引き**すれば、**捏造なし**で「この条文に言及する通達」を機械導出可能（漢数字対応済み） | **Phase 2で可（SEO班のリンカ資産で実現）** |
| **判例（COURT_CASES）** | `field`/`issues` は**topicalラベル**、参照は自由文PDFリンク。**条文キーの構造化フィールド無し** | 条文単位の紐付けは keyword 一致頼み＝**誤紐付け＝捏造リスク**。安易にやらない | **要・他班（data班が条文↔判例マップを持つまで保留）** |
| **用語集（glossary）** | topical。条文キー無し | 同上 | **保留 or topical関連のみ** |
| **教育資格（education/資格DB）** | 条文キー無し（`/e-learning` へ一律リンク） | 「61条→フォークリフト技能講習」等は**手動マッピングが要る** | **要・他班（data班）** |

- **原則**: 相互参照が構造化されていない束ねは、**keyword 推測でそれらしく埋めない**（法令正確性は不可侵・捏造0）。「関連≧1」の完了条件は、**通達（Phase 2・リンカ導出で捏造なし）**で満たし、判例/資格は data 班が条文キー付きマップを用意して初めて追加する。
- この監査結果が「T6 は一度に完成できず段階투입が必然」の**技術的根拠**（§9）。

---

## 6. O18リンカの相互リンク方針（内部リンクSEO）

- 現状 `linkifyArticleReferences` の内部 href は `/law-search?law=&art=`（テスト固定）。**リンカ本体は本PRで変更しない**（law-search-panel の将来結線・既存テストを壊さないため）。
- 代わりに **新ページ側で薄い後処理**（segment の内部hrefを、対象条文が `/laws/*` を持つ場合に permalink へ書き換える純粋関数）を **`lib/law-links/` に追加**し、**permalink 同士を相互リンク**させる（topical silo 強化＝SEO）。書き換えは「対象が生成集合に在る時だけ」＝幽霊リンク0を回帰固定。
- これは SEO班領域内（`lib/law-links/**` は当班が O18 で新設した lib）＝要・他班なしで完結。

---

## 7. 構造化データ（JSON-LD＝当班 lib）

- **新ヘルパー `legislationSchema()` を `components/json-ld.tsx` に追加**（schema.org **`Legislation`**）:
  - `legislationType`「Statute/Regulation」・`name`（`${lawName} ${articleNum} ${articleTitle}`）・`legislationIdentifier`（条番号）・`isPartOf`（親法令 Legislation）・`legislationJurisdiction`「JP」・`inLanguage`「ja」・`sameAs`（e-Gov原文URL）・`url`（self）。
  - 既存 `legalDocumentSchema`（通達用 `LegalDocument`）とは別型＝**条文は `Legislation` が適切**（Google の Legislation 構造化データに整合）。
- **BreadcrumbList**（既存 `breadcrumbSchema` を再利用）。
- テスト: `json-ld.test.ts` に `legislationSchema` の @type/必須プロパティ/e-Gov sameAs/isPartOf を固定（既存23itのパターン踏襲）。

---

## 8. e-Gov 原文リンク（収録の透明性＝G7）

- `LAW_METADATA.egovLawId` → `https://laws.e-gov.go.jp/law/<egovLawId>#Mp-At_<条番号のアラビア数字>`。
- 枝番（第577条**の2**）は e-Gov アンカーが**基条 `Mp-At_577` しか指せない**（O18 と同じ制約）＝**枝番条は「法令トップ＋条見出しへスクロール案内」に留め、誤着地アンカーを作らない**（法令正確性・幽霊アンカー0）。
- 出典明示（政府標準利用規約2.0）は既存 T7 ドラフト §の方針と一貫。

---

## 9. 段階투입（束ねは一度に完成しない＝§5の帰結）

| Phase | 内容 | 担当 | 捏造リスク |
|---|---|---|---|
| **1. 骨格** | `/laws/[...]` route・self-canonical・generateMetadata・**O18リンカ本文**・e-Gov透明性・prev/next・**sitemap-laws.xml 受け皿**・**Legislation JSON-LD**・回帰（slug一意・生成集合=深リンク集合・canonical・JSON-LD） | **SEO班（要・他班なし）** | なし（実在データのみ） |
| **2. 通達束ね** | O18リンカを mhlwNotices title/lawRef に流し「この条文に言及する通達」を機械導出（漢数字対応済み・捏造なし） | SEO班（リンカ）＋要確認: 通達データ所有=data班 | なし（導出は決定的・出典は原文title） |
| **3. 判例/資格束ね・相互リンク最適化** | 条文↔判例/教育資格の**構造化マップ**（data班が用意）＋ §6 permalink相互リンク | **要・他班（data班のマップが前提）** | マップが無い限り着手しない |

- **主要100条 Google インデックス**（T6完了条件）は Phase 1 の sitemap受け皿＋self-canonical＋Legislation JSON-LD で初めて計測可能になる（登録は Google 側の事後観測）。

---

## 10. 重複コンテンツ / thin-content 対策

- **`/law-search` と競合しない**: `/law-search` はツール面（自身canonical・per-article は index 対象でない）。`/laws/*` を**条文の唯一の indexable home**（self-canonical）にする＝二重掲載にならない。
- **thin回避**: 本文再掲だけにしない。Phase 1 時点で「**リンカ済み本文（条間リンク）＋e-Gov原文導線＋prev/next＋号マップ**」＝ e-Gov にも `/law-search` にも無い構成。Phase 2 の通達束ねで更に厚くする。
- **lastmod（sitemap-laws.xml）**: 当日打ち（lastmodスパム）を避け、条文データの実更新日 or 法令メタの版数に追従（`lib/sitemap/freshness.ts` の方針踏襲）。当日固定でないことを回帰。

---

## 11. オーナー / 他班 判断事項（★実装着手前に必要）

- **(a) URL名前空間 `/laws/*` の新設可否＋URLスキーム確定**（§2案A採用の是非）＝CLAUDE.md「ページ構成の大幅変更（URL変更を伴う）」＝**最重要・一方通行**。
- **(b) 新規ページの所有班**: `/laws/[law]/[art]` は当班が所有する**発見性インフラpage**（`/search` 結果ページの前例）として扱うか、UI班の feature page とするか。loop-prompt では当班の enumerated route は `/search` のみ＝**要・オーナー裁定**。
- **(c) 束ねデータの構造化マッピング**（条文↔判例↔教育資格）は `web/src/data/**`＝**data 班領域**。Phase 3 は data班のマップが前提（§5・§9）。
- **(d) ビルド予算**: 数百〜約1,000ページ静的生成のビルド時間・クライアントバンドルへの影響（既存大量ルートの実績内だが要合意）。
- env・外部API・課金は**不要**（全て read-only の既存 curated データと `LAW_METADATA` のみ）。

---

## 12. Path A 境界（本ドラフトの守備範囲）

- 本ドラフトは **設計のみ・コード/データ生成 0**。tsc/lint/vitest/build は非改変で全緑維持。
- 実装は **§11 のオーナー承認後**にのみ着手。承認が出た場合の**着手単位は Phase 1（SEO班単独・捏造ゼロ）**から。
- 当班の守備範囲（承認後）: route基盤・self-canonical/metadata・**O18リンカ本文結線（当班lib）**・permalink相互リンク（`lib/law-links/**`）・**sitemap-laws.xml＋index登録**・**Legislation JSON-LDヘルパー（`json-ld.tsx`）**・回帰テスト。
- **要・他班**: 条文↔判例/教育資格の構造化マップ（data班）・ページ本文のビジュアル調整がUI班判断となる場合の意匠（§11-b の裁定次第）。

---

## 付録: 実在確認済みの参照（本ドラフト作成時に監査した事実）

- `LawArticle` 型: `law` / `lawShort` / `articleNum` / `articleTitle` / `text` / `keywords` / `itemNumberMap?`（`src/data/laws/law-types.ts`）。
- `LAW_METADATA[lawShort].egovLawId`（例: 安衛法=`347AC0000000057`・安衛則=`347M50002000032`）（`src/data/law-metadata.ts`）。
- `linkifyArticleReferences(text, contextLawFullName)` → `ArticleRefSegment[]`（内部 href=`/law-search?law=&art=`・e-Gov href=`.../law/<id>#Mp-At_<N>`・解決不能は素テキスト）（`src/lib/law-links/article-ref-linkify.ts`）。
- `mhlwNotices[].lawRef?`（自由文・任意）＋ title に条番号地の文（`src/data/mhlw-notices.ts`）。
- `COURT_CASES[]` は `field`/`issues`（topical）で条文キー無し（`src/data/court-cases.ts`）。
- 既存 JSON-LD: `legalDocumentSchema`（LegalDocument＝通達）・`breadcrumbSchema`（BreadcrumbList）ほか（`src/components/json-ld.tsx`）。
</content>
</invoke>
