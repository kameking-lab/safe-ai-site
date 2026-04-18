# 厚労省データ統合計画 (MHLW Integration Plan)

手元の 231 ファイルを全面活用し、労働安全 AI サイトを根本強化するロードマップ。
フェーズ 0 (完了) の成果物を前提に、フェーズ 1〜5 を次セッション以降で実行する。

## 手元データのインベントリ

| カテゴリ | 件数 | 期間 | 主な用途 |
|---|---|---|---|
| shisho-db   | 192 (.xls/.xlsx) | 平成18年〜令和3年 (16年) | 事故データベース拡充・RAG・分析 |
| deaths      | 18 (.xlsx+.pdf)  | 令和元〜令和6           | 死亡災害DB・年次トレンド |
| chemicals   | 10 (.xlsx+.pdf)  | 最新                    | 化学物質DB・RA・SDS |
| laws        | 11 (.pdf)        | 最新                    | 法令検索・チャットボット根拠 |

## フェーズ 0: 基盤整備 ✅ (今セッションで完了)

- `scripts/etl/` に 4 つの Python パーサを追加
  - `parse-shisho-db.py` / `parse-deaths.py` / `parse-chemicals.py` / `parse-laws-pdf.py`
  - 全て冪等 (再実行可能)。`--only` で 1 ファイルだけ処理、`--dry-run` で件数確認のみ。
  - `_common.py` が `mhlw-data/` を複数候補から自動解決（worktree でも動作）。
- 共通スキーマ `web/src/types/mhlw.ts` を定義（Accident / Death / Chemical / LawArticle）。
- サンプル実行: `sisyou_db_r03_12.xlsx` → `web/src/data/accidents-mhlw/2021-12.jsonl` (2,634 行) を生成して動作確認。

---

## フェーズ 1: 全ファイルのパース ✅ (2026-04-19 完了)

**目的**: 231 ファイル全量を JSONL に変換し、以降のフェーズで扱える基礎データを用意する。

### 実行結果

| データ種別 | 出力 | 件数 | ファイルサイズ | リポジトリに含める |
|---|---|---|---|---|
| accidents (shisho-db) | `web/src/data/accidents-mhlw/*.jsonl` | 504,415 行 × 192 本 | 403 MB | **No (gitignore)** |
| accidents 集計 | `web/src/data/aggregates-mhlw/*.json` | 8 JSON | 65 KB | Yes |
| deaths | `web/src/data/deaths-mhlw/records-{YYYY}.jsonl` | 4,043 行 × 5 年 | 3.7 MB | Yes |
| chemicals | `web/src/data/chemicals-mhlw/chemicals.jsonl` | 3,984 行 | 3.9 MB | Yes |
| laws | `web/src/data/laws-mhlw/articles.jsonl` | 588 条文 | 796 KB | Yes |

- accidents の年レンジ: **2006 (H18) 〜 2021 (R3) の 16 年間**、月平均 2,600 件前後で安定。
- 事故の型 41 種、業種（大）31 種、年齢帯 7 バケット（-19/20s/30s/40s/50s/60s/70+）に集計済。
- deaths は 2019 (R1) 〜 2023 (R5) の 5 年、年 ~800 件。cross-tab 10 本 + 分析 PDF 3 本はフェーズ 2 で処理。
- chemicals は label_sds(2,341) / skin(1,237) / concentration(207) / carcinogenic(199) の 4 リスト統合。
  有効 CAS 1,591 行 / ユニーク 1,389、うち 186 CAS が 2 リスト以上に登場（＝クロス参照価値あり）。
- laws は 11 PDF で 588 条文。ただし縦書きレイアウトの PDF が多く
  articleNumber が null のレコードが 42% (249 件)。フェーズ 3 で再チャンク方針を見直す。

### データ配置の決定事項

**raw accidents JSONL (403 MB) はリポジトリに含めない**（.gitignore 追加済み）。理由:
- GitHub の push 上限 / Vercel のデプロイサイズ上限（50 MB 圧縮）を超える
- 検索/絞込/類似事例の UI は「全件シリアライズ送信」ではなく API 越しで十分

代替:
- **集計は `aggregates-mhlw/` (65 KB) をコミット済**。`/analytics` や `/accidents` の統計表示で即利用可能。
- **raw データを使う機能はフェーズ 2 以降で再生成方針**: 開発時は `scripts/etl/parse-shisho-db.py` で再生成、
  本番は CI / Vercel Build Hook / 外部ストレージ（S3 / Vercel Blob）のいずれかを選択する（→ 下記 Q1）。

### 成果物のまとめ

- commit 1 `feat(etl): parse all 192 shisho-db files (504,415 accidents)` — gitignore + aggregates + scripts
- commit 2 `feat(etl): parse all deaths files (5 years, 4,043 records)`
- commit 3 `feat(etl): parse all chemicals files (3,984 records, 1,389 unique CAS)`
- commit 4 `feat(etl): parse all law PDFs (588 articles from 11 PDFs)`
- 追加スクリプト: `scripts/etl/summarize.py`（バリデーション）、`scripts/etl/build-aggregates.py`（集計）

### オーナー確認事項（フェーズ 2 着手前）

- **Q1. raw accident データの配置先**:
  - A: gitignore のまま、開発時のみ `parse-shisho-db.py` で再生成（シンプル、Vercel デプロイはモック相当）
  - B: Vercel Blob / S3 にアップロードし、API Route から fetch（コスト数百円/月、本番で全件検索可）
  - C: Supabase に投入（CLAUDE.md の「要確認」対象。RAG 以外でも重宝）
- **Q2. 法令 PDF の縦書き問題**: 既存の pypdf から pdfplumber / pdf2htmlEX などに切替えてよいか

---

## フェーズ 2: 事故データベースの刷新

**目的**: `/accidents` を手書きモックではなく実データで駆動する。

### 現状

- `web/src/data/mock/real-accident-cases.ts` 等に手動で 100 件程度。
- `/accidents` ページ (`web/src/app/(main)/accidents/`) はモック配列を読んで一覧 / 検索表示。
- フェーズ 1 で `aggregates-mhlw/*.json` (65 KB) がリポジトリに入ったので、
  統計・グラフだけなら即実装可能。
- 生の 504k 行 JSONL は gitignored のため、Q1（配置先）の決定次第で
  詳細検索機能の実装アーキテクチャが変わる。

### 実行計画（オーナー確認 Q1 の答えに応じて分岐）

#### ステップ 1: 集計ドリブン UI (配置先決定を待たずに着手可)

1. **`web/src/lib/mhlw-aggregates.ts`** を新設
   - `aggregates-mhlw/*.json` を import して型付きで返すユーティリティ群
   - 型は `web/src/types/mhlw.ts` に追加 (`AccidentAggregate`, `YearlyBreakdown` 等)
2. **`/accidents` の統計セクション強化**
   - 16 年分の事故件数折れ線 × accidentType stacked
   - 年 × 業種のヒートマップ、年齢帯 × 年の積み上げ棒
   - 描画は既存 UI で使われているチャートライブラリ（要調査: recharts or 軽量自作）
3. **`/analytics` をスキャフォールド**（フェーズ 4 の前倒し半分）
   - 集計 JSON だけで完結するダッシュボード（トップ 5 事故型/業種 等）

commit 目標: `feat(accidents): surface MHLW 16-year aggregates on /accidents`

#### ステップ 2: 詳細検索 (Q1 確定後)

- **配置 A (gitignore 維持 / 開発用途)**: ローカル dev 時のみ動く詳細検索。
  `fs.readFileSync` で JSONL を読み、SSR で結果を返す。`NODE_ENV=development` ガード。
  Vercel 本番では機能無効化（統計のみ閲覧可）。
- **配置 B (Vercel Blob)**: `scripts/etl/upload-to-blob.py` で 192 JSONL をアップロード。
  API Route が範囲を指定して `ReadableStream` を受け、サーバ側でフィルタリング。
  メモリ節約のため `accidentType` / `industry.majorCode` で早期 break。
- **配置 C (Supabase)**: CLAUDE.md「要確認」。スキーマ: `accidents(id, year, month,
  industry_major_code, industry_major_name, accident_type_code, description, ...)`。
  GIN index で全文検索、btree で fast filter。

API design (配置に依らず共通):

```
GET /api/accidents/search
  ?yearFrom=2015&yearTo=2021
  &industryMajor=03
  &accidentType=15
  &ageBucket=50-59
  &q=墜落 脚立
  &limit=50&offset=0
→ { total, items: Accident[], facets: { byYear, byIndustry, byType } }
```

フィルタ実装はモック版 (`web/src/data/mock/accident-search.ts` 等) のロジックを
再利用し、バックエンドだけ配置に応じて差し替え。

#### ステップ 3: 類似災害機能

- 個別詳細ページ `/accidents/[id]` を新設（id は `{year}-{mm}-{seq}`）
- 「同業種（中分類一致） × 同事故型 × 直近 2 年」の 10 件を横並び表示
- 実装は上記 API の `related` エンドポイント

#### ステップ 4: フォールバック整理

- 既存モック (`real-accident-cases*.ts`) は削除せず、MHLW 配置 A で本番無効化
  される環境のみフォールバック。配置 B/C を選んだ時点でモック削除を検討。

### セーブポイント

- commit 1 `feat(accidents): surface MHLW 16-year aggregates on /accidents` (ステップ 1)
- commit 2 `feat(accidents): add search API backed by MHLW shisho-db` (ステップ 2)
- commit 3 `feat(accidents): show similar accidents on detail page` (ステップ 3)
- 変更ページ: `/accidents`, `/accidents/[id]` (新設), `/analytics` (スキャフォールド)

---

## フェーズ 3: 法令 RAG / チャットボット強化

**目的**: `/chatbot` と `/law-search` を MHLW 法令 PDF の条文で回答できるようにする。

### 前提

- フェーズ 1 で `web/src/data/laws-mhlw/articles.jsonl` が存在。
- OpenAI / Anthropic API は CLAUDE.md の「必ずオーナーに確認」対象なので、
  このフェーズ実行前に API キーの導入可否をオーナーに確認する。

### タスク

1. 埋め込み生成スクリプト `scripts/etl/embed-laws.py`
   - 各条文を Embedding API に投げ、`articles.embeddings.json` (または SQLite) に保存。
   - 冪等性のため、内容ハッシュをキャッシュ。
2. ランタイム検索 `web/src/lib/law-rag.ts`
   - コサイン類似度 top-K を返す関数。メモリ上で完結（件数 ~数千なら十分高速）。
3. `/chatbot` の system prompt を差し替え
   - 「回答は必ず [LawArticle] の text を根拠にする」指示。
   - UI に「根拠の条文」セクションを追加、sourceFile+articleNumber を引用表示。
4. `/law-search` を全文検索から RAG トップ 20 表示に切替。
5. 評価セット `docs/mhlw-rag-eval.md` に 20 問を用意し、回答精度を人手で採点。

### セーブポイント

- commit 1: `feat(laws-rag): embed law articles and add retrieval lib`
- commit 2: `feat(chatbot): ground answers on MHLW law articles`

---

## フェーズ 4: 分析タブの強化

**目的**: `/accidents` 内または新設 `/analytics` で、10年分の事故データをビジュアル化。

### タスク

1. 事前集計スクリプト `scripts/etl/build-analytics.py`
   - 年×事故型、年×業種、業種×事故型、月別季節性など 5〜10 本の集計を
     `web/src/data/accidents-mhlw/analytics/{name}.json` に事前生成。
   - ランタイムで生データを集計するとコスト高なので常に事前生成を使う。
2. `/analytics` ページ新設
   - recharts / lightweight-charts 等で折れ線・積み上げ棒・ヒートマップ。
   - 業種フィルタ、期間スライダー。
3. 死亡災害（`deaths-mhlw`）のレイヤーも重ねる
   - 「墜落・転落」死亡件数の年次推移など重要指標を別色でオーバーレイ。
4. KY (危険予知) への連携
   - 業種を選ぶと「その業種で多い事故型トップ 5」を KY テンプレに自動反映。

### セーブポイント

- commit 1: `feat(analytics): precompute accident aggregates from shisho-db`
- commit 2: `feat(analytics): add /analytics dashboard with drilldown`

---

## フェーズ 5: 化学物質モジュール強化

**目的**: `/chemical-database` / `/chemical-ra` を MHLW の最新 4 種リストで駆動する。

### タスク

1. 統合ビュー: `Chemical[]` を CAS RN でグルーピングし、
   「がん原性 / 濃度基準 / 皮膚障害 / SDS 対象」のフラグを付けた
   `chemicals-merged.json` を生成する `scripts/etl/merge-chemicals.py` を追加。
2. `/chemical-database` を検索式 (物質名・CAS RN) で引ける UI に改修。
   - 詳細ページで 4 種リストの該当フラグと適用日を表示。
3. `/chemical-ra`（リスクアセスメント）で、選んだ物質の濃度基準値を自動反映。
4. 化学物質関連 PDF (`shishin*.pdf`, `kihatsu_*.pdf`) を
   法令 RAG インデックスに追加（フェーズ 3 の拡張）。

### セーブポイント

- commit 1: `feat(chemicals): merge 4 MHLW lists into single lookup index`
- commit 2: `feat(chemical-ra): auto-populate exposure limits from MHLW concentration standards`

---

## 依存関係と優先順位

```
Phase 0 (done)
    ├── Phase 1 (all-file parse)
    │       ├── Phase 2 (accidents DB)
    │       ├── Phase 3 (law RAG) ← 要オーナー確認: API キー
    │       ├── Phase 4 (analytics)
    │       └── Phase 5 (chemicals)
```

- フェーズ 2, 4, 5 は並列実行可能（相互依存なし）。
- フェーズ 3 は API キーと課金発生のため、必ずオーナー承認後に着手。

## 未解決の論点（オーナー確認事項）

1. **JSONL をリポジトリに含めるか**: 全量 ~50 MB 見込み。含めれば CI 不要、含めなければビルド時生成が必要。
2. **Embedding API の選定**: OpenAI `text-embedding-3-small` / Anthropic / ローカル (multilingual-e5)。
3. **集計スクリプトを Python で書き続けるか / TypeScript で書き直すか**: 配布形態（Vercel 上で動かす必要があるか）次第。
4. **死亡災害の cross-tab シート**: 業種×局 / 業種×事故型 の 2 軸で分けてそれぞれ JSON 化でよいか。
