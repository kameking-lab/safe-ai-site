# 02 カリキュラム網羅ゲート — 「法定を確実に満足」を宣伝でなく機械保証にする

- 位置づけ: 本パックの差別化(1)「法定の教育項目(科目・範囲・時間)の充足を保証」の実装原理。fidelityゲート(`web/src/lib/plain/fidelity.ts` + 常設CI `web/src/data/plain/plain-fidelity.test.ts`)と同じ思想 — **人の宣言ではなく、正本スナップショットとの機械照合でCIを落とす**。
- 本docは設計のみ。実装はEDU-D1/D2(BACKLOG-data)・EDU-O1(BACKLOG-ops)。

## 1. 何を保証し、何を保証しないか(ゲートの守備範囲)

保証する(=CIで機械検証する):
1. **科目の網羅**: 告示正本の学科科目・範囲(号レベル)の全項目に、対応するスライドが1枚以上存在する。1項目でも未カバーならCIが赤。
2. **時間の充足**: デッキが提示する「標準タイムテーブル」の科目別合計が法定時間以上である(スライド枚数ではなく、デッキメタの科目別配分時間で照合)。
3. **実技の非代替宣言**: 実技科目を含む教育(フルハーネス・低圧電気等)では、デッキに「実技は本教材では実施できません。事業者が別途実施してください」の実技科目カード(科目名・法定時間付き)が存在する。欠落したらCIが赤。
4. **正本の鮮度**: カリキュラム正本スナップショットが告示の e-Gov 現行版と一致する(改正されたら snapshot テストが赤くなり、教材側の追随を強制)。
5. **根拠表示**: 各デッキの表紙・配布物に根拠(則条番号・告示番号・科目/時間)が表示されている。

保証しない(=ゲートの外。利用規約と免責で扱う → 01/05参照):
- 利用者側の教育「実施」の適法性(講師・受講者の理解度・記録・実技の質)。スライドを映すだけでは特別教育を実施したことにならない。
- 改変後の教材の法定充足(改変した瞬間に保証は失効 → 05の利用規約で明示)。

## 2. データ構造(3層)

### 層1: カリキュラム正本レジストリ(新規) `web/src/data/education-curriculum/`
特別教育規程等の告示正本を科目・範囲・時間まで構造化する。置き場は data 班所有の `web/src/data/` 配下(education-rules と並置)。

```ts
// types.ts(案)
export type CurriculumUnit = {
  unitId: string;            // 例 "fullharness-gakka-1"
  kind: "gakka" | "jitsugi"; // 学科/実技
  subject: string;           // 告示の科目名を正本表記のまま(例「作業に関する知識」)
  scopeItems: string[];      // 告示「範囲」欄の項目を分割収載(照合の最小単位)
  minHours: number;          // 法定時間(時間単位・0.5刻み)
};
export type EducationCurriculum = {
  curriculumId: string;      // 例 "se-36-41-fullharness"(education-rules のID体系に整合)
  name: string;
  basis: {
    ruleRef: string;         // 例「安衛則第36条第41号」
    kokuji: string;          // 告示名・番号・改正履歴(正本表記)
    egovLawId?: string;      // e-Gov 法令IDが存在する告示のみ
  };
  units: CurriculumUnit[];
  totalGakkaHours: number;   // units から機械導出し、既知の法定合計とテストで突合
  totalJitsugiHours: number | null; // 実技なし教育(粉じん等)は null
  educationClass: "special" | "circular"; // 安衛則36条系 or 通達・ガイドライン系
};
```

- 正本取得: e-Gov 法令検索に収載されている告示(安全衛生特別教育規程=昭和47年労働省告示第92号 等)は既存 ETL 作法(`scripts/etl/`・`build-anei-beppyo-snapshot.mjs` の雛形)でスナップショット化。e-Gov 非収載の告示・通達は MHLW 原文 PDF/HTML を出典URL・取得日付きで手動転記し、**転記もスナップショットテストでピン留め**(special-education.test.ts の `OFFICIAL_ART36_ITEMS` と同型)。
- 通達ベース教育(熱中症等)は「法定時間」が存在しないため `minHours` はガイドライン推奨値または null とし、ゲートは科目網羅のみ照合する(educationClass="circular" で分岐)。

### 層2: デッキ→法定項目の対応表(スライド側メタ)
セミナーYAML(`data/seminars/*.yaml`)の各スライドに対応情報を追記する。

```yaml
meta:
  curriculum_id: se-36-41-fullharness   # 層1への参照。無い教材(職長向け読み物等)は対象外
  timetable:                            # 標準タイムテーブル(科目別配分)
    - unit: fullharness-gakka-1
      minutes: 60
slides:
  - layout: big_number
    covers:                             # このスライドがカバーする法定項目
      - fullharness-gakka-1/scope-2
```

- `covers` は `unitId/scopeItem` 参照。1枚が複数項目をカバー可、1項目を複数枚でカバー可。
- 統計・事例などの追加スライド(法定外の付加価値)は `covers: []` で明示。**法定項目の水増しに使えない**(existence 方向のみ照合するため)。

### 層3: 照合ゲート(純関数+常設テスト)
fidelity と同じ2段構え。

- 純関数 `checkCurriculumCoverage(curriculum, deck): Violation[]`(新規 `web/src/lib/education-curriculum/coverage.ts`)。違反種別(案):
  - `scope-uncovered`: 範囲項目にスライド0枚(**主目的。1件でCI赤**)
  - `hours-shortfall`: timetable 科目合計 < minHours
  - `jitsugi-notice-missing`: 実技科目があるのに非代替宣言スライドなし
  - `unknown-ref`: covers が正本に存在しない項目を参照(幽霊参照)
  - `basis-display-missing`: 表紙に根拠表記なし
- 常設テスト `web/src/data/education-curriculum/curriculum-coverage.test.ts` が「curriculum_id を宣言した全デッキ」を回して違反0を要求。YAML はリポジトリ直下だが、fidelity が `../laws-fulltext/*.json` を読むのと同型で web テストから読める(agent調査で確認済み)。
- **裏切り検出の実証**(fidelity.test.ts と同作法): 実データから科目1項目の covers を意図的に外すと `scope-uncovered` が必ず出るテストを常設。「これが落ちなくなったらゲートの故障」。
- npm スクリプト命名(既存慣例 `plain:test`/`plain:status` に整合): `curriculum:test` / `curriculum:status`(網羅レポート・対応表Markdown生成)。

## 3. UI表示(保証の可視化)
- 各教育詳細ページの CURRICULUM 手書き配列(現状 `fullharness/page.tsx` 等に直書き)を層1レジストリ参照へ置換 — **ページ表示・PPTX・ゲートが単一正本**になる。
- デッキごとに「法定対応表」(科目×範囲×時間×対応スライド番号)を自動生成して掲示・配布物に同梱。末尾に「本対応表は e-Gov 正本スナップショット(取得日)との機械照合をCIで常時実施」の一文と検証日を出す。誇大宣伝ではなく検証事実のみを書く。
- 改正で snapshot が古くなった場合: fidelity の stale 隔離と同様、**当該デッキの「法定充足」表示を自動で降ろす**(バッジ非表示+「改正確認中」表示)。保証が切れた状態で保証を名乗らない。

## 4. 段階導入(ratchet)
- 初期は初期ラインナップ3〜5本(03参照)のみ curriculum_id を宣言しゲート対象へ。既存の他デッキ(サンプル10枚)は宣言なし=対象外として共存。
- fidelity の `*_SINCE` 日付ゲート・`RATCHET_MAX` 作法をそのまま使い、対象を増やす方向のみ許す。
