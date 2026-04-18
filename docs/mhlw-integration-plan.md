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

### ステップ 2a: 集計ドリブン UI ✅ (2026-04-19 完了)

配置先決定 (Q1) を待たずに集計 JSON (65 KB, リポジトリ同梱) だけで動く統計 UI を実装した。

- `web/src/components/mhlw-accident-analysis-panel.tsx` (新設、390 行) — recharts で
  事故の型 / 業種 / 年次推移 / 年齢帯 / 月別平均の 5 チャートを描画。
- `aggregates-mhlw/{accidents-by-year, accidents-by-industry, accidents-by-age,
  accidents-by-month, meta}.json` の 5 本を import し、`useMemo` で集計。
- `/accidents` の「分析」タブを 3 分割:
  - **一覧** (既存 `AccidentDatabasePanel`)
  - **MHLW実データ分析** (新 `MhlwAccidentAnalysisPanel`, 504,415 件ベース)
  - **収録事例（参考）** (旧 `AccidentAnalysisPanel`, ~300 件の手動収録)
- 相当する commit: `bf10012 feat(accidents): integrate MHLW 504K real statistics into analysis`

### ステップ 2b: Vercel Blob 検索インフラ ✅ (2026-04-19 完了, オーナー作業待ち)

配置 B (Vercel Blob) を前提として、年別シャードで raw JSONL を配信する仕組みを実装した。
**Blob 未設定時はフォールバックメッセージを返して UI が壊れないように設計**。

- `scripts/etl/upload-to-blob.mjs` (新設、142 行) — 年別 16 シャード (~25 MB/本) として
  `mhlw-accidents/{YYYY}.jsonl` に同期。`--only 2021` / `--dry-run` 対応。成功後に
  `aggregates-mhlw/blob-manifest.json` を書き出す。
- `web/src/app/api/mhlw/search/route.ts` (新設、202 行) — Blob から JSONL をストリーム取得し、
  year / industry / type / keyword / limit / offset でサーバ側フィルタ。`availableYears`
  をレスポンスに同梱。Blob 未設定時は `{ ok: false, fallback: true, source: "fallback" }`
  で早期リターン。
- `web/src/components/mhlw-accident-search-panel.tsx` (新設、263 行) — 検索フォーム +
  結果カード。フォールバック時はアンバー色の注意帯を表示。
- 依存追加: `@vercel/blob`。
- 相当する commit: `fad8693 feat(accidents): add MHLW Blob search infrastructure`

#### オーナー作業 (Q1 = B を選んだ場合に必要)

1. Vercel ダッシュボードで Blob ストア作成
2. `BLOB_READ_WRITE_TOKEN` を環境変数に設定
3. ローカルで `web/src/data/accidents-mhlw/*.jsonl` (403 MB) を再生成
4. `node scripts/etl/upload-to-blob.mjs` 実行でシャード投入 (~5 分見込)
5. デプロイ後、`/accidents` の検索タブで Blob ソースに切替わる

未実施でもサイト全体は正常動作（フォールバック UI のみ表示）。

### ステップ 2c: 化学物質・死亡災害・法令を横断統合 ✅ (2026-04-19 完了)

事故データに続き、残り 3 カテゴリ（化学物質・死亡災害・法令）を UI/RAG に組み込んだ。
raw データが軒並み gitignore されておらず中規模（4 MB 前後）だったので、
build-time ETL でゼロ加工の JSONL → 軽量 JSON に整形して `dynamic()` 遅延読み込みする方針を採用。

#### 実装サマリ

- `scripts/etl/build-chemicals-compact.mjs` — chemicals.jsonl (3,984 行) から
  ヘッダ / 注記 / CAS単独行を落とし、`col1`/`col2` (GHS名 / 法令名) を昇格。
  `web/src/data/chemicals-mhlw/compact.json` (865 KB, 3,943 物質) を生成。
- `scripts/etl/build-deaths-compact.mjs` — 5 年分の死亡災害 JSONL を 1 ファイルに
  集約し、byYear / byType / byIndustry ヒストグラムを同梱した compact.json
  (2.4 MB, 4,043 件) を生成。
- `scripts/etl/build-laws-compact.mjs` — 縦書き PDF 抽出で 1 字ごとに入る `\n`
  を除去し、articleNumber が null の目次/前文を除外。
  `web/src/data/laws-mhlw/compact.json` (210 KB, 295 条文) を生成。
- `web/src/components/mhlw-chemical-search-panel.tsx` — /chemical-database に
  「MHLW 3,943物質（横断）」タブとして追加。カテゴリ別件数バッジ、名称 / CAS
  / 備考検索、50件/ページの paginated list。
- `web/src/components/mhlw-deaths-panel.tsx` — /accidents に「死亡災害 (4,043件)」
  タブとして追加。業種・事故種別・年・キーワード絞り込み。
- `web/src/data/laws/mhlw-extras.ts` + `web/src/data/laws/index.ts` 修正 — 295 条文を
  `LawArticle` 形式で `allLawArticles` に追加。`rag-search.ts` の実装には触れず、
  既存キーワード RAG が自動的に新条文をスコアリング対象にするようになった。
- 相当する commit:
  - `ed8f247 feat(mhlw): surface chemicals 3,943 and deaths 4,043 from MHLW`
  - `0f039ee feat(laws): merge MHLW 295 extra articles into RAG index`

#### フェーズ 2 後の残タスク（優先度順）

1. **オーナー作業: Blob トークン設定 + 年別シャード投入** (2b)。
2. **個別詳細ページ `/accidents/[id]`** (類似災害機能付き) — Blob 投入後に着手。
3. **モック (`real-accident-cases*.ts`) の削除可否** — Blob 投入後、実データで
   代替できると判断した時点で別コミットで整理。現状はフォールバックとして残置。
4. **ファセット (byYear / byIndustry / byType)** を search API に追加 — 現状は
   総件数＋ページングのみ。
5. **法令 PDF の再抽出** — 現状の縦書き抽出は単語単位で壊れている（articleNumber
   が null の 293 レコードが残る）。pdfplumber / pdf2htmlEX 等で再パースすれば
   RAG カバレッジをほぼ倍にできる。フェーズ 3 で対応。
6. **LAW_NAME_HINTS の精緻化** — build-laws-compact.mjs の PDF → 法令名マッピング
   は推測値。オーナー側で PDF 内容を確認して正式名称に差し替えると引用精度が
   上がる。

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
Phase 0 (done) ✅
    ├── Phase 1 (all-file parse) ✅
    │       ├── Phase 2a (accidents aggregates UI) ✅
    │       ├── Phase 2b (Blob search infra) ✅ ← オーナー作業待ち
    │       ├── Phase 2c (chemicals / deaths / laws 横断統合) ✅
    │       │       └── 残: /accidents/[id], モック整理, PDF 再抽出
    │       ├── Phase 3 (law RAG, embedding) ← 要オーナー確認: API キー
    │       ├── Phase 4 (analytics)
    │       └── Phase 5 (chemicals, chemical-ra 連携)
```

- フェーズ 2, 4, 5 は並列実行可能（相互依存なし）。
- フェーズ 3 は API キーと課金発生のため、必ずオーナー承認後に着手。
- フェーズ 2b のオーナー作業（Blob トークン設定 + シャード投入）が完了するまで、
  2c のうち類似災害ロジックは着手できない（raw データが無いと集計しか返せない）。

## 未解決の論点（オーナー確認事項）

1. **JSONL をリポジトリに含めるか**: 全量 ~50 MB 見込み。含めれば CI 不要、含めなければビルド時生成が必要。
2. **Embedding API の選定**: OpenAI `text-embedding-3-small` / Anthropic / ローカル (multilingual-e5)。
3. **集計スクリプトを Python で書き続けるか / TypeScript で書き直すか**: 配布形態（Vercel 上で動かす必要があるか）次第。
4. **死亡災害の cross-tab シート**: 業種×局 / 業種×事故型 の 2 軸で分けてそれぞれ JSON 化でよいか。
