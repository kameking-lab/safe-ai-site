# テーマ6: 災害の型別・安全教育スライドの自動生成（データドリブン）設計報告

日付: 2026-07-02 / 対象: https://www.anzen-ai-portal.jp/ （リポジトリ web/ 配下）
調査方法: リポジトリ実測（データファイルのキー・件数はスクリプトで実カウント）。コード変更なし。

---

## 1. データ資産の棚卸し（実測）

### 1.1 事故統計（web/src/data/aggregates-mhlw/ ほか）

| ファイル | 内容 | 期間・規模（実測） | 型分類の状態 |
|---|---|---|---|
| `aggregates-mhlw/accidents-by-year.json` | 年×災害の型 件数 | **2006〜2021年の16年分・総504,415件**（meta.json） | **41個の型キーが混在**（後述の表記ゆれ） |
| `aggregates-mhlw/deaths-by-year.json` | 年×型 死亡者数 | 2019〜2023年・4,043人 | **19キーでクリーン**（厚労省正式表記「墜落、転落」等） |
| `aggregates-mhlw/accidents-by-type-industry.json` | 型×業種 件数 | 全年合算（**年次軸なし**） | 表記ゆれそのまま（`#REF!`ゴミキー、「はさまれ、巻き込まれ」「はさまれ・巻き込まれ」「はさまれ巻き込まれ」3系統併存、業種名にも全角/半角中黒ゆれ） |
| `aggregates-mhlw/accidents-by-month.json` / `by-industry` / `by-age` | 月次・業種・年齢帯 | 2006年〜 | 型軸なし |
| `aggregates-mhlw/summary-2025-preliminary.json` / `summary-2026-preliminary.json` | 速報集計（個票なし） | 2025年通年・2026年1〜3月 | 集計値のみ。出典・ライセンス（政府標準利用規約2.0）をJSON内に明記済み |
| `data/accidents/monthly-sokuhou.json` | 月次速報（業種小分類別 死亡/死傷） | 令和8年4月末累計まで | 型軸なし。**GitHub Actions `etl-mhlw-monthly.yml` が毎月15日に自動取得→コミット**（自動追従の既存実績） |

### 1.2 死亡災害個票（web/src/data/deaths-mhlw/）

- `compact.json`: **4,043件（2019〜2023）**。フィールド: `id / year / month / description（災害状況の自由文）/ industry / industryMedium / cause（起因物分類: 例「物上げ装置、運搬機械」）/ type / workplaceSize / occurrenceTime`。**typeは厚労省正式表記でクリーン**（「墜落、転落」1,062件、「はさまれ、巻き込まれ」588件など）。
- `records-2024.jsonl`: 739件（prefecture / age / gender 付き）。
- ローダ実装済み: `web/src/lib/accidents-analytics/loader.ts` の `loadCombinedCases()` が 個票4,043＋2024年739＋curated事例291 ≒ **5,073件を統合**（キャッシュ付き）。

### 1.3 事故事例DB（curated、web/src/data/mock/real-accident-cases*.ts）

- **291件**（実測: real-accident-cases.ts 86 / -extra 81 / -extra2 40 / -extra3 43 / -2024-2026 8 / -2025-preliminary 16 / -diverse-industries 18、集約は `data/mock/accident-cases.ts` の `getAccidentCasesDataset()`）。
- 型フィールドは **union型で正規化済み**: `AccidentType`（`web/src/lib/types/domain.ts` L140、22値・中黒表記「墜落」「はさまれ・巻き込まれ」…）。
- **原因・対策が構造化済み**: `mainCauses: string[]`（自由文）、`preventionPoints: string[]`、`severity`、`provenance`（mhlw/curated/synthetic/preliminary）、`source`（出典URL）。
- 型別の件数分布（実測）: 飛来・落下46 / 墜落41 / 有害物等との接触41 / はさまれ・巻き込まれ31 / 火災24 / 感電23 / 崩壊・倒壊21 / 転倒12 / 車両12 / 激突され7 / 高温・低温6 / 交通事故6 / 切れ・こすれ5 / 溺水5 / **爆発3・動作の反動3・酸欠/熱中症/振動障害/低体温症/有害光線/有害物質は各1件**（レア型は「事例2件」枠が埋まらない→死亡個票のdescriptionで補完可能）。

### 1.4 型に紐づく既存の再利用可能資産

| 資産 | ファイル | スライドでの用途 |
|---|---|---|
| 型別ピクトグラム（22型×固有グリフ、JIS Z 9103準拠の黄/黒） | `web/src/lib/accidents/accident-pictogram-map.ts` ＋ `components/accidents/accident-type-pictogram.tsx` | 表紙・見出しのビジュアル |
| 型別「一般的対策」1行辞書 | `web/src/lib/accident-news/serious-cases.ts` の `GENERAL_MEASURES_BY_TYPE`（表記ゆれエイリアスも部分吸収済み） | 対策スライドの種データ |
| 型フィルタのエイリアスパターン | `web/src/lib/accidents-reports-filter.ts` の `ACCIDENT_TYPE_PATTERNS`（fall/caught/trip/shock） | 正規化辞書の先行実装 |
| 教育コース→型/業種マッチング | `web/src/data/education-context.ts` の `accidentMatch: {types?: AccidentType[], industries?, keywords?}` ＋ 業種統計・チェックリスト・監修コメント | 教育コース詳細への配備口（既存の紐付け実績） |
| 型別集計関数 | `lib/accidents-analytics/aggregators.ts`: `aggregateTypeRanking` / `aggregateTypeTrendByYear` / `aggregateIndustryTypeMatrix` ほか15種（プロセス内キャッシュ） | 統計スライドの計算ロジック |
| チャート | recharts ^3.8.1、`components/charts/lazy-chart.tsx`（遅延マウント）、`/accidents-analytics` の `AnalyticsDashboardImpl.tsx`（Line/Bar/Pie/ヒートマップ15種超） | 統計チャートスライド |
| 印刷（A4/改ページ） | `app/(main)/leaflet/LeafletPrintView.tsx`（`@page A4・page-break-after:always`の確立パターン）、`app/globals.css` のprintヘルパ3ブロック、`features/print/print-features-client.tsx`、`heat-illness-prevention/poster` | PDF相当の印刷モード |
| クイズ | `LearningQuestion {question/options/correctIndex/explanation}`（`lib/types/operations.ts`）＋ `components/elearning-panel.tsx`（採点・localStorage進捗 `recordThemeAttempt`） | クイズスライド。Eラーニング30テーマと形式共用 |
| 多言語日替わり教育パネル | `components/accidents/signage-accident-education.tsx`（日付シードで事例ローテ、6言語） | 朝礼/サイネージ配備の先行例 |

### 1.5 既存の教育系機能とスライドUIの有無

- `/education`: 12コース（特別教育6・法定教育2・労働衛生4）。**マーケ＋カリキュラム紹介ページであり、スライドUIはない**。教材の実体は `public/seminars/*.pptx`（10本、静的ファイル・データ非連動）。
- `/e-learning`: MCQクイズプレイヤ（30テーマ、業種別パック含む）。`LearningTheme` に slides/steps フィールドは**ない**。テーマは「高所作業・墜落制止」等のトピック軸で、災害の型タクソノミとの構造的紐付けは**ない**。
- **サイト全体にスライド/プレゼン/カルーセル型の汎用コンポーネントは存在しない**（実測: components配下grepで該当なし）。→ スライドプレイヤは新規、部品（チャート・印刷CSS・ピクト・クイズ）は再利用。

### 1.6 サイネージ・朝礼の組込み口

- `/signage`（`app/signage/page.tsx`）: 固定グリッド構成・60分毎データ再取得。パネルはレジストリでなく直接JSX合成。中央エリアに `DisplayMode = "floorplan" | "map" | "workdocs"` の切替＋シナリオプリセット（朝礼前/休憩時間/退場時）→ **モード追加が自然な注入点**。
- `/ky/morning`（`components/ky-morning-signage.tsx`）: KY用紙のフルスクリーン表示＋`SignageAccidentEducation`（日替わり事例）を内蔵。**「本日の型」スライド1枚の日替わり差し込み口として最適**。`useFitToScreen`/`useWakeLock`/印刷/6言語切替が実装済み。

### 1.7 データ更新の自動化の現状

- 自動: `etl-mhlw-monthly.yml`（毎月15日、monthly-sokuhou.json を自動コミット→Vercel再デプロイ）。
- 手動: `scripts/etl/build-aggregates.py`（生JSONL 400MB超はリポ外/Blob。aggregates-mhlw/*.json を書き出し）、`web/scripts/etl/parse-mhlw-preliminary.py`（速報サマリ）。
- vercel.json cron 3本はいずれも統計再生成には無関係。**「JSONコミット→ビルド時に静的import→全ページ再生成」がこのリポジトリの追従モデル**（スライドもこれに乗せれば追加インフラ不要）。

---

## 2. ギャップ特定

| # | ギャップ | 深刻度 | 根拠（実測） |
|---|---|---|---|
| G1 | **災害の型の正規化層がない（最大ギャップ）**。3系統の表記が併存: ①集計JSON=厚労省読点表記＋大量ゆれ（by-yearで実測41キー、正体は21分類。「崩壊、到壊」の誤字、`#REF!`、半角中黒「墜落･転落」等）、②死亡個票=正式表記でクリーン、③事例DB=独自union「墜落」「はさまれ・巻き込まれ」。既存の`typeRanking`も「墜落、転落」と「墜落」を別カウントしている | 高 | §1.1, 1.3 |
| G2 | **型キーの正本（canonical enum）とURLスラッグがない**。`AccidentType` unionは厚労省21分類と不一致（車両・熱中症・振動障害などサイト独自値を含み、「踏抜き」「破裂」「激突」を欠く） | 高 | domain.ts L140 |
| G3 | **「多い原因」の構造化が半分**。curated事例の`mainCauses`は自由文で頻度集計不可。ただし死亡個票4,043件の`cause`（起因物分類）は集計可能で、`aggregateCause()`も実装済み→型×起因物のクロスが未実装なだけ | 中 | §1.2, aggregators.ts L186 |
| G4 | **型別の対策チェックリストが未整備**。既存は1行辞書（GENERAL_MEASURES_BY_TYPE）のみ。スライドには法令根拠つき5項目程度の点検リストが必要（education-context.tsのchecklistとKYプリセットが素材になる） | 中 | §1.4 |
| G5 | **スライドプレイヤ（表示/投影/印刷の3モード）が存在しない** | 中（新規だが部品は揃う） | §1.5 |
| G6 | **型別クイズがない**。LearningQuestion形式は確立済みだが、型を主キーにした問題プールがない（既存30テーマから流用可能なのは墜落・酸欠・熱中症周辺のみ） | 低〜中 | §1.5 |
| G7 | **確定統計の鮮度**: 型別年次は2021年まで、死亡は2024年まで、2025/2026は速報集計のみ。スライドに「データ基準日・出典」の自動表示が必須（誤解防止＋政府標準利用規約の出典明記） | 低（設計で吸収） | §1.1 |
| G8 | レア型の事例不足（酸欠・熱中症等は curated 1件）→ 死亡個票 description のフォールバック表示で補完（出典表記つき） | 低 | §1.3 |

---

## 3. 設計

### 3.1 (a) データパイプライン: 型別サマリの生成

**方針: 新規cron・中間JSON生成ジョブは作らない。** 既存の `getAnalyticsAggregates()` と同型の「ビルド時に静的importデータから計算・プロセス内キャッシュ」方式で、データJSONのコミット＝スライド自動更新を実現する（Vercel再デプロイで全静的ページ再生成）。

新設ファイル（いずれも web/src/）:

1. `lib/accidents/type-normalization.ts` — **正規化辞書（G1/G2の解）**
   - `CANONICAL_HAZARD_TYPES`: 厚労省21分類を正本とする（墜落・転落 / はさまれ・巻き込まれ / 転倒 / 飛来・落下 / 激突され / 激突 / 切れ・こすれ / 崩壊・倒壊 / 高温・低温の物との接触 / 有害物等との接触 / 感電 / 火災 / 爆発 / 破裂 / 踏み抜き / おぼれ / 交通事故（道路） / 交通事故（その他） / 動作の反動・無理な動作 / その他 / 分類不能）。表示は中黒表記に統一、`mhlwLabel`（読点表記）を併記保持。
   - `HAZARD_TYPE_ALIASES: Record<string, CanonicalHazardType>`: 実測41キー＋事例DB union 22値＋serious-cases.tsの既存エイリアスを全て吸収。**未知キーは例外でなく `unknown` バケットに落とし、テストで検知**（§3.4）。
   - `hazardTypeSlug`: URL用スラッグ（fall / caught-in / trip / flying-falling-object / struck-by / cut-abrasion / collapse / hot-cold-contact / harmful-substance / electric-shock / fire / explosion / drowning / traffic-road / overexertion …）。accidents-reports-filter.ts の fall/caught/trip/shock と互換にする。
2. `lib/hazard-slides/build-summary.ts` — `getHazardTypeSummaries(): HazardTypeSummary[]`（キャッシュ付き）
   - 入力: `accidents-by-year.json`（16年トレンド）＋ `deaths-by-year.json`＋`compact.json`（死亡・起因物・時間帯・業種）＋ `accidents-by-type-industry.json`（業種クロス）＋ `loadCombinedCases()`（事例選定）＋ summary-preliminary（最新速報の注記）。すべて正規化辞書を通してから集計。
   - 出力（型ごと）: `{ type, slug, pictogram, kpi: {annualCases2021, deaths2019to2024, trendDirection}, yearTrend[], topIndustries[5], topCauses[5]（compact.jsonのcause頻度）, timeDistribution[], featuredCases[2]（curated優先・不足時は死亡個票description、出典必須）, measures（対策辞書参照）, quiz（問題プール参照）, dataAsOf: {source, years, generatedFrom} }`
3. `data/hazard-slides/measures-by-type.ts` — **人手作成の型別対策辞書（G4の解）**: 型ごとに `{ headline, checklist: {text, lawRef?}[5], ppe?, relatedEducationSlugs, relatedElearningThemeIds }`。素材: GENERAL_MEASURES_BY_TYPE・education-context.tsのchecklist・ky-industry-presets.ts。
4. `data/hazard-slides/quiz-by-type.ts` — 型別 `LearningQuestion` 1〜3問（既存形式を流用、G6の解）。

### 3.2 (b) スライド生成（テンプレ駆動）

新ルート: `app/(main)/education/hazard-slides/page.tsx`（21型ハブ、ピクトグラムグリッド）＋ `[slug]/page.tsx`（`generateStaticParams` で全型を静的生成）。

**定型スライド構成（1型＝6枚）**:
1. 表紙 — ピクトグラム＋型名＋死亡者数KPI（deaths 2019–2024）＋「16年で◯%減/増」
2. 統計 — 年次トレンド（Line, 2006–2021）＋業種トップ5（Bar）＋データ基準日/出典フッタ
3. 多い原因トップ5 — 起因物頻度（compact.json 4,043件由来）＋時間帯分布
4. 事例2件 — curated事例（summary/mainCauses/preventionPoints/出典リンク）。レア型は死亡個票descriptionをフォールバック
5. 対策チェックリスト — measures-by-type（法令根拠つき、□チェック印刷対応）
6. クイズ1問 — LearningQuestion（投影モードではタップで正解開示、Web表示ではelearning-panel同様の採点）

**コンポーネント設計（components/hazard-slides/）**:
- `SlideDeck.tsx` — 3モード: `view`（縦スクロール・通常ページ）/ `present`（フルスクリーン1枚送り、キーボード←→・タップ、`useFitToScreen`/`useWakeLock`再利用、URLハッシュ`#3`でページ共有）/ `print`（`window.print()`）。
- 各スライドは `.slide-page` = 16:9固定比（投影）＋ `@media print { size: A4 landscape; page-break-after: always }`（LeafletPrintView.tsxのパターン移植）。
- チャートはrecharts再利用。ただし**printモードではLazyChart（IntersectionObserver遅延）を使わず即時マウント**（未表示チャートが白紙印刷になる既知の落とし穴）。
- PDFは「印刷→PDF保存」で賄い、サーバサイドPDF生成ライブラリは導入しない（依存追加はオーナー確認事項のため）。

### 3.3 (c) 配備先統合

| 配備先 | 実装 | 対象ファイル |
|---|---|---|
| 教育コース詳細（12ページ） | `education-context.ts` の `accidentMatch.types` を正規化辞書経由でスラッグ解決→「この教育に関係する型別スライド」カード | `components/education/EducationContextSections.tsx` |
| 朝礼 `/ky/morning` | `SignageAccidentEducation` と同じ日付シードで「本日の型」を選び、表紙＋対策の2枚ダイジェストを差し込み（`?slide=<slug>`で固定も可） | `components/ky-morning-signage.tsx` |
| サイネージ `/signage` | `DisplayMode` に `"education"` を追加し中央エリアで日替わり型スライドを自動送り（既存60分リフレッシュに便乗） | `app/signage/page.tsx` |
| Eラーニング | 型別クイズを `LearningTheme` としても登録し `/e-learning` に露出、スライド→クイズ相互リンク | `components/elearning-panel.tsx`, `data/mock/` |
| 事故DB/分析 | `/accidents` 型グリッド・`/accidents-analytics` 型ランキングから該当スライドへ深リンク | `components/accidents/accident-type-grid.tsx` |

### 3.4 (d) データ更新追従

- **仕組み自体はゼロ工数**: サマリはビルド時計算のため、`etl-mhlw-monthly.yml` の月次自動コミットや `build-aggregates.py` 再実行→コミットで自動的にスライドが最新化される（既存デプロイフローに完全に乗る）。
- **ガードを追加**: ①`type-normalization.test.ts` — 集計JSON・個票・事例DBの全型キーをエイリアス辞書に通し、未知キーが出たらテスト失敗（将来のETLで新たな表記ゆれが入っても検知）。②`build-summary.test.ts` — 全スラッグでKPI・事例2件・対策5項目が非空であることを固定（スライドの空白ページ防止）。③各スライドフッタに `dataAsOf`（例「確定値2021年・死亡2024年・速報2026年4月時点」）と出典を自動表示（G7対応・政府標準利用規約の出典明記）。
- 将来: build-aggregates.py をGitHub Actions月次に載せる案は生データがBlob/ローカルのため別途設計（本テーマのスコープ外、タスクT10として提案のみ）。

---

## 4. 段階計画と規模感（S=半日以内 / M=1〜2日 / L=3日以上）

| フェーズ | 内容 | 規模 |
|---|---|---|
| **P1 正規化基盤** | 型正規化辞書＋スラッグ＋未知キー検知テスト。既存typeRankingの二重計上是正はスコープ外に隔離（別Issue） | **M** |
| **P2 サマリ生成** | `getHazardTypeSummaries()`＋墜落・転落の対策辞書/クイズ1型分＋テスト | **M** |
| **P3 テンプレ確立（1型）** | SlideDeck（view/present/print 3モード）＋6枚テンプレ＋ `/education/hazard-slides/fall` を本番品質で1本通す。実機で投影・A4印刷を確認 | **L** |
| **P4 量産横展開** | 主要8型（墜落・転落/はさまれ/転倒/飛来・落下/激突され/切れ・こすれ/高温・低温/感電）の対策辞書・クイズ整備→`generateStaticParams`で残り型も展開（レア型は死亡個票フォールバック）＋ハブページ | **M**（データ作業中心） |
| **P5 配備統合** | 教育詳細/朝礼/サイネージ/Eラーニング/事故DBの5箇所に組込み | **M** |
| **P6 追従ガード仕上げ** | サマリ非空テスト・dataAsOfフッタ・速報注記・E2E（印刷/投影スモーク） | **S** |

合計目安: 6〜9営業日。P1→P2→P3は直列、P4以降はP3のテンプレ確立後に並行可。

## 5. 提案タスク一覧

| ID | タスク | 目的 | 完了条件（実測基準） | 依存 | 優先度 | 規模 |
|---|---|---|---|---|---|---|
| T1 | 型正規化辞書 `type-normalization.ts` | G1/G2解消。3表記系統を21分類正本に統一 | by-year実測41キー・事例DB22値・compact19キーの全てがエイリアス解決され、未知キー検知テストがCIで緑 | なし | **P0** | M |
| T2 | 型別サマリ生成 `getHazardTypeSummaries()` | 統計→原因→対策の1セットJSONを型ごとにビルド時生成 | 21型全てで kpi/yearTrend/topIndustries/topCauses が非空、vitest緑、`npm run build` 通過 | T1 | **P0** | M |
| T3 | 対策辞書＋クイズ（墜落・転落1型分） | テンプレ確立用の完全データ1型 | 墜落・転落で checklist5項目（法令根拠つき）＋quiz1問がサマリに載る | T1 | P0 | S |
| T4 | SlideDeck コンポーネント（view/present/print） | スライドUI基盤の新設 | `/education/hazard-slides/fall` が①スクロール表示②フルスクリーン矢印送り③A4横・6枚改ページ印刷 の3モードで崩れなし（Playwrightスクショ＋実印刷確認） | T2,T3 | **P0** | L |
| T5 | 統計チャートスライド（recharts print対応） | 既存チャート資産のスライド流用 | printモードでチャートが白紙にならない（LazyChart不使用を確認） | T4 | P1 | S |
| T6 | 主要8型の対策辞書・クイズ量産 | 教材の中身（人手作成、捏造禁止・出典必須） | 8型のスライドが全枚非空・出典表示つきで生成される | T3,T4 | P1 | M |
| T7 | 全型横展開＋ハブページ | 21型カバー | `generateStaticParams` で全スラッグ生成、レア型は死亡個票フォールバックが「出典: 厚労省死亡災害DB」表記つきで表示、リンク切れゼロ | T6 | P1 | S |
| T8 | 配備統合5箇所（教育詳細/朝礼/サイネージ/Eラーニング/事故DB） | 雇入れ時教育・職長教育・朝礼・サイネージの実利用動線 | 各入口から2タップ以内でスライド到達。/ky/morning で日替わり差し込みが翌日変化することを日付モックE2Eで確認 | T4 | P1 | M |
| T9 | 追従ガード（非空テスト・dataAsOfフッタ・速報注記） | データ更新でスライドが黙って壊れない | aggregates JSONの型キーを1つ改変するとCIが赤になることを確認。全スライドフッタに基準日・出典表示 | T2 | P1 | S |
| T10 | （提案のみ・オーナー確認）build-aggregates.py の月次CI化 | 確定統計の自動追従を人手ゼロに | 生データ置き場（Blob）設計の合意後に別途 | T9 | P2 | M |
| T11 | （別Issue推奨）`/accidents-analytics` typeRanking の表記ゆれ二重計上是正 | 既存ダッシュボードの品質改善（T1の副産物） | 「墜落、転落」と「墜落」が統合カウントされる | T1 | P2 | S |

**リスク/留意**: 教材の統計・事例は全て出典明記（政府標準利用規約2.0）。curatedのprovenance=synthetic/preliminaryはスライドの「事例」枠に使わない（featuredCases選定でmhlw/curatedに限定）。依存パッケージ追加なし（PDF生成はブラウザ印刷で代替）のためオーナー確認事項に抵触しない。
