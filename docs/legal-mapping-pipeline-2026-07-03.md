# 化学物質×法体系横断 突合パイプライン（F2・2026-07-03確立）

診断 `docs/fable-diagnosis-2026-07-02/03-chemical-legal-mapping.md` の恒久対策（T3-3＋T3-4基盤）。
6月のコーパス条番号監査（`egov-caption-snapshot.ts`＋`article-caption-integrity.test.ts`）と同じ思想を
「物質×法令区分」に展開した。**合格基準「誤区分を1件入れるとCIが落ちる」を実証済み**。

## 1. 構成（4層）

```
e-Gov法令API v2（正本）
  │  web/scripts/etl/build-anei-beppyo-snapshot.mjs（ETL・手動/定期実行）
  ▼
web/src/data/legal/anei-beppyo-snapshot.ts（生成物・手書き禁止。revisionId/sha256付き）
  │  施行令別表第3（特化則1〜3類 全号）・別表第6の2（有機溶剤 全号）
  │  有機則1条（第一種/第二種の号列挙）・特化則38条の4（特別管理物質の号レンジ展開）
  │  施行令22条1項3号 原文（特化則健診の対象範囲＝第三類対象外・5/31の2除外の文言ガード）
  ▼
web/src/data/legal/cas-law-index.ts（人手レビュー層＝名前解決のみ。区分は一切持たない）
  │  CAS → 別表の号参照（nameContains による自己検査つき）or「非該当を確認済み」宣言
  ▼
web/src/data/legal/substance-legal-profile.ts（導出層）
  │  snapshot × index → 特化則区分/有機則種別/特別管理物質/健診対象 を機械導出
  ▼
web/src/data/legal/substance-legal-audit.test.ts（CIゲート・vitest常設）
     表示ソース（regulation-tag-labels の OSHAタグ表／mock 50物質 categories）を
     全件・両方向（偽陽性/偽陰性）で突合。過去の誤り（PR#578/#584是正前）の再発見テスト同梱
```

## 2. 何が落ちるようになったか

- **偽陽性**: 正本から導出できない区分を表示（例: 塩素にtokutei-3）→ `tokka-overclaim`
- **偽陰性**: 正本から導出される区分が表示に無い（例: 一酸化炭素の3類欠落）→ `tokka-missing`
- **手書きマッピングの侵入**: index未登録CASへの特別則タグ → `index-missing`
- **法改正の見落とし**: ETL再実行でsnapshotが変わると、号ずれ・削除号参照が `index-stale` で検知
- **解説文の陳腐化**: yuki-1「2物質」・tokutei-3「8種」の列挙がsnapshot件数・名称と突合される
- **健診の誤導出**: 特化則健診の対象範囲（令22条1項3号）を導出化。第三類（硫酸・塩化水素等）と
  エチレンオキシド/ホルムアルデヒドの健診偽陽性を遮断（この2系統は本PR是正の新規発見）

## 3. 法改正時の運用

1. `cd web && node scripts/etl/build-anei-beppyo-snapshot.mjs` を再実行（revisionId/sha256更新）
2. `npx vitest run src/data/legal` — 影響する号参照・表示タグが自動で落ちる
3. 落ちた箇所の cas-law-index / 表示データを e-Gov 現行条文で再レビューして是正
（テスト側の期待値を緩めることは禁止。正本が唯一の真実）

## 4. 他法令ドメイン（診断03(b)欠落側）の設計 — データ源の選定と型

`LegalDesignation`（substance-legal-profile.ts）は全ドメインを型定義済み。
`status: "designated" | "not-designated" | "unverified"` により「非該当を確認済み」と「未調査」を
区別できる（現行 concentration-limits.json のタグは全て unverified 扱い＝ミラー由来未突合）。

**量産（データ埋め切り・UI接続）は dataレーン O11。以下は選定済みのデータ源と突合方式。**

| ドメイン | 正本データ源 | 突合方式 |
|---|---|---|
| 毒劇法（毒物/劇物/特定毒物） | e-Gov `325AC0000000303`（法別表第1〜3）＋毒物及び劇物指定令 `325CO0000000073` | 本ETLと同型のAppdxTable/Itemパーサで号抽出→dokugeki-index（cas-law-index同型）。特定毒物の区分語彙を追加。名称→CAS解決はNITE-CHRIPを補助に、解決不能は群指定で保留（創作禁止） |
| 化管法（PRTR1/2） | NITE 化管法対象物質一覧（CASつき公式CSV/Excel） | 既存 prtr1/prtr2 タグをミラー（github.com/Ameyanagi/ra-law-db）由来から公式CSVへ差し替え再生成。件数をメタデータで固定 |
| 化審法（第一種/第二種特定・優先評価約1,100） | J-CHECK / METI公式リスト（CASつき） | cscl系タグの再生成＋優先評価の取込（knownLimitation解消） |
| 消防法（危険物別表第一） | e-Gov `323AC0000000186` 別表第一 | 品名例示（ガソリン・軽油等）のみ designated、それ以外は現行の物性型2層UI（要確認）を維持 |
| 高圧ガス保安法 | 一般高圧ガス保安規則 第2条（毒性ガス・可燃性ガスの品名列挙） | 品名列挙分のみ designated（アンモニア・塩素等）。列挙外は物性型のまま |
| 環境系（大気/水質/土壌） | 環境省公表リスト | 既存 extra-regulations.ts の方式を維持・拡充 |

### 監査v1の対象外（明示）

- **鉛則・四アルキル鉛則**（namari/yonalkyl タグ）: 令別表第4/第5が「業務」列挙のため物質スナップショットから
  導出不能。付与先CASをテストで固定（鉛=7439-92-1、四アルキル鉛=78-00-2）し無検証拡散を防止。
- **粉じん則・酸欠則・石綿則**: 作業/場所規制のため同上（タグ付与先は従来どおり限定的）。
- **AI経路**（chemical-ra regulatoryNotes・sds-extract）: T3-7（P2）。導出層（deriveAneiDesignations）が
  できたので、AI出力と構造化データの矛盾検出バリデータはこの上に載せられる。

## 5. 実証記録（2026-07-03）

- 塩素を `tokutei-3` に改変 → `tokka-overclaim`＋`tokka-missing` の2違反で vitest FAIL（是正後復元）
- mock トルエンを `有機溶剤1種` に改変 → `yuki-overclaim`＋`yuki-missing` で FAIL（復元）
- PR#578是正前の実データ6点（塩素/フッ化水素の3類、クロロホルム/四塩化炭素のyuki-1、
  アクリルアミドの特管誤付与、解説文2件）を再発見テストとして常設＝全件検出を恒久固定
- PR#584是正前の mock 代表6件（1類誤解・非収載物質への付与）も同様に常設
