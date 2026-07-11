# コーパス全文収載アーキテクチャ — 構造判断と段階計画（2026-07-12）

- 種別: **設計書のみ（実装なし）**。実装タスクは BACKLOG-data 冒頭の FT-D/FT-P 系（本書参照付き）へ分割済み。
- 起票: Fable セッション（社長指示「安衛法体系の全条文が読め、現場ことばで読める、への構造判断」）
- 位置づけ: `docs/fable-diagnosis-2026-07-02/T7-egov-fulltext-ingest-design.md`（Path A 取込設計ドラフト）の**後継＝構造判断の確定版**。T7 が「オーナー確認事項」として留保した (a) コーパスと全文の関係 (b) バンドル分離 (c) データ所有 (d) 更新頻度 に本書で結論を出す。取得作法・ライセンス整理（政府標準利用規約2.0・API キー不要・オフライン生成）は T7 §4/§7 をそのまま踏襲し再説明しない。
- 関連正本: `docs/horei-navi-foundation-2026-07-11/01-diagnosis-and-design.md`（法令ナビ基盤・URL 規則）、`web/src/data/plain/types.ts`（現場ことば版の鮮度設計）、`web/scripts/etl/egov-revisions-fetch.ts`（snapshot 取得作法の先例）。

---

## 0. 結論（1段落）

**既存キュレーションコーパス（`web/src/data/laws/**`）を全文へ拡張するのではなく、全文スナップショット層（`web/src/data/laws-fulltext/`・機械生成・法令単位チェックイン・revisionId/sha256 アンカー）を別に新設し、キュレーションコーパスを「その部分集合＋注釈層（keywords・itemNumberMap・抄録スニペット）」に再定義する。** 本文の表示正本は fulltext > curated の解決順。クライアント検索・RAG の入力は現行どおり curated のまま（全文はクライアントバンドルに載せない）。法令ナビは fulltext 収載法令の全条にページを広げ（712→中核3法で約1,400、以降数千規模）、SEO は「付加価値条件を満たす条のみ index/sitemap 収載」で段階開放する。取込は安衛則→安衛法・安衛令→特別則（plain 済み法令優先）の順。全文取込=Opus、plain 執筆・再検証=Sonnet。

---

## 1. 前提（実測ベースの現状）

- curated コーパス: `web/src/data/laws/*.ts` に手収録 `LawArticle[]`（articleNum 実数 761 レコード・見出しスナップショット等込みの公称 1,065条）。安衛則 92条（実法令 677条）・安衛法 61条・安衛令 5条＋別表 snapshot。**抄録**であり、未収録条番号は「該当なし」になる（G7。S6 の e-Gov フォールバックで止血済み）。
- 法令ナビ: `LAW_NAVI_ENTRIES`（`lib/law-navi/permalink.ts`）= egovLawId 保有 46法令 × curated 条文 ≈ **712条ページ**を `generateStaticParams`＋`dynamicParams=false` で静的生成。sitemap-laws.xml も同一集合（幽霊 URL 0）。
- 現場ことば版: `web/src/data/plain/*.ts` 5法令 73条。`sourceTextHash`（コーパス原文のハッシュ）不一致で自動 stale、fidelity ゲート（数値・限度方向・義務主体・参照条・罰則の機械照合）が CI 常設。
- 検索/RAG: クライアント横断検索（`lib/search-index.ts`・⌘K）と RAG（`lib/rag-search.ts`・BM25+dense・keywords 加点 +5/+3・PINNED_TOPICS）はどちらも `allLawArticles`（curated）を食う。チャットボット eval ベースライン strictAccuracy **0.952**（2026-07-04〜追跡）。
- snapshot 思想の先例: `egov-revisions-fetch.ts`（diff-only・skip 明示・出典必須）、`anei-beppyo-snapshot.ts`（lawId+revisionId+sha256 アンカー・「生成物・手書き禁止」）、`egov-caption-snapshot.ts`（e-Gov 取得値をチェックインし整合テストで固定）。柱1是正キャンペーンは条番号照合を revisionId（例 `20260701_506M60000100079`）付きで記録する規律を確立済み。

---

## 2. 論点1: キュレーションコーパスと全文レイヤーの関係 — 構造判断

### 2-1. 選択肢

- **案A（拡張）**: curated の各法令ファイルへ全条文を追記/差替えし、コーパス自体を全文化する。
- **案B（二層）**: 機械生成の全文スナップショット層を別に持ち、curated はその部分集合（＝人手の注釈・検索品質層）として存続。**← 採用**

### 2-2. 判断: 案B（二層構成）。理由5点

1. **手書きと生成物の混在禁止（既存規律との整合）**: curated ファイルは人手レビューの成果（柱1是正の号ずれ発見・是正のような判断が本文に埋まっている）。ここへ ETL が書き込むと、再取得のたびに手修正が上書きで失われる/逆に ETL 出力へ人手が混ざる。リポジトリは既に「snapshot=生成物・手書き禁止」「curated=人手」を分離する規律で運用されており、案A はこれを壊す。
2. **クライアントバンドルの不可侵（T7 §5 の宿題への回答）**: `allLawArticles` はクライアント検索・RAG が直接 import する。安衛則だけで本文が現行の約7倍になる全文を合流させると初回 JS・`sw.js` プリキャッシュ・LCP が確実に劣化する。二層なら **fulltext はサーバー/ビルド専用**（server-only loader・法令単位 JSON の遅延 import）にでき、クライアント側は現状維持＋軽量インデックスだけで済む。
3. **検索・RAG の品質防衛**: RAG のスコアは keywords 加点に強く依存する。keywords の無い数千条を BM25 母集団へ一括投入すると、キュレートされた中核条文の順位が長文ノイズに希釈されるリスクが高い（chatbot eval 0.952 を賭けた博打になる）。二層なら「全文は明示参照（条番号直指定）のときだけ引く」から始め、全文の BM25 投入は eval ガード付きの後続実験に分離できる。
4. **plain（現場ことば版）の鮮度設計が壊れない**: plain は `sourceTextHash`（表示原文のハッシュ）で stale を検出する。案A で curated 本文を一括差替えすると既存 73条の plain が**一晩で全 stale**（UI から全消滅）する。二層＋法令単位の表示切替なら、fulltext 化した法令だけが stale になり、同じ波内で Sonnet が再検証する運用に載る（fidelity 設計が意図どおり機能する形の stale）。
5. **改正追従の単純さ**: 全文層は「e-Gov のミラー」なので、改正検知（既存 `etl-egov-revisions.yml`）→該当法令の fulltext 再取得→sha256 差分→plain 自動 stale、という一本道になる。案A では「機械更新すべき部分」と「人手部分」の境界判定が毎回必要になる。

### 2-3. 各層の再定義

```
[全文スナップショット層]  web/src/data/laws-fulltext/<egovLawId>.json   ← 新設・機械生成のみ
   e-Gov 法令API v2 の条文全文ミラー。revisionId/sha256/fetchedAt/出典アンカー。
   表示正本（law-navi 条文ページの本文）・条番号カバレッジの正本。
        ▲ 整合テスト: curated(articleNum) ⊆ fulltext(articleNum)、caption一致
[キュレーション層]        web/src/data/laws/*.ts                        ← 現行・人手のみ
   keywords（検索/RAG 品質）・itemNumberMap（号ハルシネーション防止）・
   抄録 text（クライアント検索スニペット・fulltext 未収載法令の表示本文）。
   fulltext 収載後は「検索品質と注釈のための部分集合」であり本文正本ではない。
[注釈・派生層]            plain/ topics.ts beppyo.ts glossary            ← 現行
   join キーは全層共通で (egovLawId, articleNum 正規表記)。
```

- **curated の text は削除しない**（クライアント検索のスニペット・非 fulltext 法令の表示に現役）。ただし fulltext 収載法令では「表示本文」の役割を降りる。
- 号マップ・keywords の全文条への機械候補生成は可能だが v1 ではやらない（人手レーンの既存フロー＝scan→人手採録を維持）。

### 2-4. 下流への影響まとめ

- **検索品質**: クライアント横断検索は不変＋「condex」（fulltext 由来の条番号+見出しのみの軽量インデックス）を追加。未収録条番号で 0件だった検索が「条の存在＋見出し＋条文ページへのリンク」を返せる（S6 フォールバックは異常系として維持）。
- **RAG**: 母集団は curated のまま。追加は「クエリが条番号を直指定し curated に無い場合、fulltext から当該条をサーバー側で引いて文脈注入」のみ。全文 BM25 投入は後続の eval ガード付きタスクに分離。
- **法令ナビ生成**: `LAW_NAVI_ENTRIES` を「curated 由来 ∪ fulltext 由来」に拡張。712→中核3法で約1,400（安衛則677+安衛法約120+安衛令約30＋既存46法令、重複は egovLawId/artSlug で除去）→特別則展開で数千。既存 712 URL は**不変（追加のみ）**。前後条ナビは fulltext 法令では実条連続になり「収録条文の前後」の注記が外れる。
- **plain 対象**: 対象母数が curated 761 から全文数千条へ広がる。優先順位は §7-2。長大条文（項多数）は当面 omissions 明示で条単位のまま（項単位分割スキーマ拡張は必要が実証されてから）。
- **ビルド時間**: 静的生成は /circulars≈1,158 ページの実績があり中核3法（約1,400）は既知レンジ内。波ごとにビルド時間を実測記録し、Vercel ビルド上限の 80% を超えたら「fulltext 法令のみ dynamic + キャッシュ」へ切替える緊急弁を予め設計に含める（§8-4）。

---

## 3. 論点2: e-Gov API v2 全文 ETL の設計

### 3-1. 取得（T7 §4 踏襲・差分のみ記す）

- 新規 `web/scripts/etl/egov-fulltext-fetch.ts`。作法は `egov-revisions-fetch.ts` と同一: API キー不要・オフライン実行（手動 or GitHub Actions cron）→チェックイン・**diff-only**（fetchedAt 以外に差分が無ければ書かない）・skip-on-missing（skipped 配列に理由付き計上・捏造ゼロ）・政府標準利用規約2.0 の出典文字列必須。
- エンドポイント: `GET /api/2/law_data/{lawId}`（XML 全文）。lawId は `LAW_METADATA.egovLawId` を単一ソースとし、`TARGET_LAWS`（revisions ETL・実在検証済み20法令）と突合。
- 出力: `web/src/data/laws-fulltext/<egovLawId>.json`（TS でなく JSON: 巨大ファイルの tsc コスト回避・「生成物であって手書きしない」ことの形式的強制）。読み手は `web/src/lib/laws-fulltext/loader.ts`（`server-only` import・法令単位 dynamic import）のみ。

### 3-2. スキーマ

```ts
type FulltextLaw = {
  lawId: string;          // e-Gov 法令番号（例 347M50002000032）
  lawTitle: string;       // e-Gov 返却の正式名（LAW_METADATA.fullName と突合テスト）
  revisionId: string;     // e-Gov 履歴 ID（例 20260701_506M60000100079）— 柱1是正と同じ形式
  fetchedAt: string;      // ISO。diff 比較からは除外
  source: string;         // "e-Gov 法令API v2（政府標準利用規約2.0・出典明示）"
  sha256: string;         // articles の正規化直列化のハッシュ（改ざん・差分検知アンカー）
  articleCount: number;
  skipped: { articleNum: string; reason: string }[];  // 取得不能条の明示（黙って欠かさない）
  articles: FulltextArticle[];
};
type FulltextArticle = {
  articleNum: string;     // 当サイト正規表記（"第151条の2"）。e-Gov XML の Num 属性から正規化
  caption: string;        // 条見出し。無い条は ""（egov-caption-snapshot と一致テスト）
  isDeleted: boolean;     // 「削除」条。本文 "削除" のまま採録し UI で明示（欠番にしない）
  paragraphs: {           // 項の構造保持（AI 文脈・将来の項単位 plain に備える）
    num: number;
    text: string;
    items?: { num: string; text: string }[];  // 号。num は漢数字表記（"一","八の二"）＝ itemNumberMap キーと同一規約
  }[];
  text: string;           // 表示用フラット本文（項番号・号マーカー保持）
  sortKey: number[];      // [条, 枝1, 枝2] — 連番検証・前後条ナビの整列キー
};
```

### 3-3. 構造要素の扱い（別表/号/枝番/ルビ）

- **枝番**: e-Gov XML の Article Num 属性（枝番は区切り記号連結）→当サイト表記「第66条の8」へ正規化。既存 `lib/article-number-normalize.ts` の `parseArticleNum` と**ラウンドトリップテスト**（正規化→パース→スラグ→逆解決が全条一意）で固定。artSlug 規則（`151-67`）は法令ナビ既定のまま不変。
- **号**: Paragraph/Item のネストを `paragraphs[].items[]` に構造保持しつつ、表示用 `text` には「一　…」のマーカー付きで平文化。curated の `itemNumberMap` は人手注釈として存続（fulltext の items と一致するかの突合テストを追加＝号ずれの機械検出が全文で可能になる）。
- **ルビ**: `<Ruby>` は基底文字のみ残し `<Rt>`（読み）を除去。除去件数を ETL 実行レポートに計上（黙った変形をしない）。読み仮名の表示が欲しくなったら別フィールド追加で対応（v1 はやらない）。
- **別表（AppdxTable）**: v1 の取込対象は**本則の条文本文のみ**。別表は既存の専用 snapshot 系（`anei-beppyo-snapshot.ts`・`law-navi/beppyo.ts`＝意味インデックス）が正本であり二重化しない。ただし AppdxTable の**題名一覧だけ**は取得して beppyo.ts の網羅性チェック（未収載別表の検出）に使う。表構造の全文 HTML 化は品質リスクが高く別フェーズ。
- **附則（SupplProvision）**: v1 対象外（明示）。施行期日の情報は revisions ETL の担当。

### 3-4. 取込検証ゲート（チェックイン前に全緑必須・vitest 常設）

1. **形式**: 空本文 0・articleNum パース成功 100%・(lawId, articleNum) 重複 0。
2. **連番**: sortKey 昇順で第1条→最終条の欠番検出。削除条は isDeleted=true でのみ許容（欠番＝取得漏れとして落とす）。
3. **既存正本との突合**: caption が `egov-caption-snapshot.ts` と一致／curated の articleNum が fulltext に全て存在（curated ⊆ fulltext。存在しない＝どちらかが誤り→CI 落ち）／lawTitle が `LAW_METADATA.fullName` と一致。
4. **号突合**: curated に itemNumberMap がある条は、号番号集合が fulltext の items と一致。
5. **規模アンカー**: articleCount が法令ごとの期待値（例: 安衛則 677条規模）±既知の改正差分内。乖離は改正か取得バグ→人手確認へ。
6. **出典**: source・revisionId・fetchedAt 必須。sha256 再計算一致。

### 3-5. 改正追従

- 既存 `etl-egov-revisions.yml`（改正メタの定期取得）が新しい revision を検知した法令について、fulltext 再取得を実行（同一ワークフローへのステップ追加 or 月次 cron。**revisionId が変わったときだけ**本文差分が生まれる設計なので diff-only と噛み合う）。
- 再取得で本文が変わった条 → plain の `sourceTextHash` 不一致 → **自動 stale（UI 非表示・再生成キュー）**。これが「改正で古い言い換えを見せ続けない」の全文版であり、既存 plain の鮮度設計をそのまま全文へ延長する。

---

## 4. 論点3: 段階計画（波ごとに計測しながら進める）

| 波 | 内容 | 規模 | 担当想定 |
|---|---|---|---|
| Wave 0 | ETL スクリプト＋スキーマ＋検証ゲート＋loader（server-only） | 基盤のみ | Opus |
| Wave 1 | **安衛則**（347M50002000032）全677条 — 最大の穴 | +約585条 | Opus |
| Wave 2 | 表示統合（law-navi 本文解決・ページ拡張・SEO ゲート）＋検索統合（condex・RAG 条番号フォールバック） | ページ712→約1,290 | Opus |
| Wave 3 | **安衛法**（347AC0000000057）・**安衛令**（347CO0000000318） | +約150条 | Opus |
| Wave 4 | 特別則第1陣＝**plain 済み5法令**（酸欠則・粉じん則・電離則・石綿則・じん肺則）→ plain 再検証とセット | 法令単位で順次 | Opus＋Sonnet |
| Wave 5 | 特別則第2陣（有機則・特化則・クレーン則・鉛則・高圧則・ボイラー則・ゴンドラ則…） | 数千ページ域へ | Opus |
| Wave 6 | 労基法系・じん肺法・作環測法ほか（TARGET_LAWS 残） | — | Opus |
| 並行 | plain 執筆: 新規対象条（topics メンバー→検索流入上位→残り） | 継続 | Sonnet（BACKLOG-plain レーン） |

- **1法令=1イテレーション**（BACKLOG-data の既存規律）。各波で (a) ビルド時間 (b) first-load JS 非増加 (c) eval:chatbot-gen (d) 検索応答 <200ms を実測記録してから次へ。
- Wave 2 を Wave 1 の直後に置く理由: データだけ入れて表示面が無いと検証が机上になる。安衛則1法令で end-to-end を立ててから横展開する（法令ナビ基盤がフォークリフト1分野で先に end-to-end を立てた方式の踏襲）。
- Wave 4 で plain 済み法令を優先する理由: 表示原文の切替（抄録→全文）で既存 plain が stale になるのは設計どおりの挙動だが、放置すると「現場ことば版が消えたページ」が増える。取込と再検証を同じ波で閉じて非劣化を保つ。

---

## 5. 論点4: リスクと不可侵

### 5-1. 法令正確性（最優先・不可侵）

- 機械取込のみ・解釈/要約/整形の創作ゼロ。取得不能は skipped 明示（捏造ゼロ）。削除条は「削除」を明示採録（欠番と区別）。
- §3-4 の検証ゲート全緑がチェックインの必要条件。ゲートは vitest 常設＝以後の再取得でも自動で効く。
- 出典明示（政府標準利用規約2.0）: 条文ページの e-Gov リンク＋取得日 revisionId をフッターに表示（既存「収録は抄録・原文は e-Gov」の透明性文言は fulltext 法令では「e-Gov ○○改正版に基づく全文収載・取得日」へ更新）。

### 5-2. 既存機能の非劣化（回帰ゲート一覧）

- チャットボット: `eval:chatbot-gen` strictAccuracy **≥0.952**（追跡ベースライン）。RAG 母集団を変えない設計自体が第一の防衛線。
- 横断検索: `search-index.test.ts` の回帰23クエリ（フォークリフト/爪のやつ/35条/別表第3…）全緑。condex 追加でスコア序列が変わらないこと（condex は 0件救済にのみ効く重み設計）。
- 法令ナビ: `permalink.test.ts` の一意性・幽霊 URL 0 を拡張集合で維持。**既存712 URL は削除・変更しない**（追加のみ）。
- plain: `fidelity.test.ts` 全緑。stale 化は許容（設計どおり）だが、Wave 4 で同波再検証を義務化。
- 性能: /law-search 応答 <200ms・first-load JS 非増加・LCP 非劣化（fulltext をクライアントに載せない構造で担保し、波ごとに実測）。

### 5-3. SEO（数千ページ化の品質管理）

- **リスク**: e-Gov 原文の単純ミラーは thin/duplicate content。数千ページを一括 index 開放するとサイト全体の品質評価を毀損しうる。
- **方針＝付加価値条件付きの段階開放**: ページ生成は全条行う（サイト内導線・前後ナビ・検索着地のため）。ただし **index/sitemap 収載は付加価値条件を満たす条のみ**: (a) plain verified がある、または (b) topics（分野）メンバー、または (c) itemNumberMap・glossary マッチ等の注釈シグナルあり。条件未満は `robots: noindex,follow`＋sitemap 非収載。plain 執筆が進むほど indexable が自動で増える＝「コンテンツで裏づけてから開く」。
- sitemap-laws.xml の lastmod は `CORPUS_LASTMOD` 定数から revisionId 由来（法令単位）へ。件数は 50k 制限に遠く単一ファイル維持。既収載712条は現状の収載を維持（後退させない）。

### 5-4. ビルド・運用

- 静的生成の実績レンジ（/circulars≈1,158）を超えて増える Wave 5 以降は、ビルド時間を波ごとに記録し、Vercel ビルド上限の 80% 到達で「fulltext 法令のみ dynamic rendering + CDN キャッシュ」へ切替える緊急弁（route 単位の切替で URL は不変）。
- Vercel ビルドは外部ネットワーク非依存（T7 §4.1）: 取得はオフライン→チェックイン。CI 安定・main 常時デプロイ可能を崩さない。
- データ所有: `web/src/data/laws-fulltext/**` と ETL は **data 班**。表示統合（law-navi/app 側）・検索統合は実装 PR 単位で横断（タスクに明記）。

## 6. やらないこと（本設計の明示境界）

- 附則・別表の表構造の全文取込（v1 対象外。別表は既存 snapshot 系が正本）。
- 全文の BM25/RAG 母集団への投入（eval ガード付きの後続実験タスクとしてのみ許可）。
- curated コーパスの text 一括削除・機械上書き（人手層は人手のまま）。
- 全文条への keywords/itemNumberMap の機械自動生成チェックイン（候補生成→人手採録の既存フローを維持）。
- 新規 env・課金・外部サービス追加（e-Gov API v2 は API キー不要・revisions ETL で導入済みソース）。

## 7. BACKLOG 分割（実装タスクの正本は BACKLOG-data 冒頭・FT-D/FT-P 系）

- FT-D1（Opus・P0）: ETL 基盤＋検証ゲート＋安衛則全文チェックイン（Wave 0+1）
- FT-D2（Opus・P0）: 表示統合＝law-navi 本文解決・ページ拡張・前後ナビ実条化（Wave 2 前半）
- FT-D3（Opus・P0）: SEO ゲート＝付加価値条件付き index/sitemap（Wave 2 前半）
- FT-D4（Opus・P1）: 検索統合＝condex＋RAG 条番号フォールバック＋非劣化 eval（Wave 2 後半）
- FT-D5（Opus・P1）: 安衛法・安衛令 全文（Wave 3）
- FT-D6（Opus・P2）: 特別則第1陣＝plain 済み5法令（Wave 4）
- FT-D7（Opus・P2）: 特別則第2陣以降（Wave 5-6・1法令=1イテレーション）
- FT-P1（Sonnet・P1）: plain 再検証 wave（fulltext 化で stale になった条の再照合）
- FT-P2（Sonnet・P2）: plain 新規対象の執筆（topics メンバー→検索流入上位の順・BACKLOG-plain レーンへ分配可）

各タスクの完了条件・参照節は BACKLOG-data 側に記載。実装者は着手前に本書 §3-4（検証ゲート）と §5-2（非劣化ゲート）を必読のこと。
