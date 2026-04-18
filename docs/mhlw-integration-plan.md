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

## フェーズ 1: 全ファイルのパース

**目的**: 231 ファイル全量を JSONL に変換し、以降のフェーズで扱える基礎データを用意する。

### タスク

1. 依存ライブラリの導入
   - `xlrd` (← h18〜h24 の `.xls` 84 ファイルを読むため)
   - `pypdf` または `pdfplumber` (← 法令 PDF 11 本 + deaths/chemicals 内の PDF)
   - Python は既存の 3.12.4 を利用。インストール先は user site でも可。
2. `parse-shisho-db.py` を全件実行
   - 期待出力: `web/src/data/accidents-mhlw/{YYYY}-{MM}.jsonl` が 192 本。
   - 総件数は概算 30〜50 万行（r03_12 で 2,634 行 × 192 なら最大 50 万）。
   - 必要なら年単位に結合 (`{YYYY}.jsonl`) するスクリプトも追加検討。
3. `parse-deaths.py` で `sibou_db_r01〜r05.xlsx` を本実行 (5 本 × ~900 行)。
4. `parse-chemicals.py` で 4 本の xlsx を統合 JSONL に。
5. `parse-laws-pdf.py` で 11 本の PDF を条文 JSONL に。
6. 集計系 `*_16_sibou*.xlsx` / `20-kakutei.xlsx` の cross-tab 用パーサを追加
   (`parse-deaths-aggregate.py` を新設、出力 `aggregate-{YYYY}.json`)。

### 検証

- 各 JSONL を `head -3 | jq .` で目視。
- 件数サマリを `scripts/etl/summarize.py` (新設) で出力。
- Next.js 側はまだ参照しないので build は影響しない。

### セーブポイント

- commit: `feat(etl): parse all MHLW xls/xlsx to JSONL`
- 出力 JSONL も同コミットに含める（全量で ~50 MB 目安。GitHub 100MB 未満なので可）。
- 50MB を超えるようなら `web/src/data/accidents-mhlw/` 配下のみ `.gitignore` にし、CI/ビルド時生成へ切り替える意思決定をこのフェーズで行う。

---

## フェーズ 2: 事故データベースの刷新

**目的**: `/accidents` を手書きモックではなく実データで駆動する。

### 現状

- `web/src/data/mock/real-accident-cases.ts` 等に手動で 100 件程度。
- `/accidents` ページ (`web/src/app/(main)/accidents/`) はモック配列を読んで一覧 / 検索表示。

### タスク

1. ランタイムローダの実装
   - `web/src/lib/mhlw-loader.ts` を新設。`web/src/data/accidents-mhlw/*.jsonl` を
     Node 側で `fs.readFileSync` + `split('\n')` で読み込み、
     型付き配列 `Accident[]` を返す関数を提供。
   - ビルド時は Next.js の Server Component で読む（bundle に含めない）。
2. 一覧 API 化
   - `web/src/app/api/accidents/search/route.ts` を新設し、業種・事故型・年月・
     キーワードで絞り込めるようにする。モックのフィルタ実装を流用。
3. `/accidents` ページを一新
   - 事故件数の年次推移グラフ（accidentType 別）。
   - フィルタ: 業種（3階層）・事故の型・年齢帯・事業場規模。
   - ページング (10/50/100 件切替)。URL に query を反映。
4. 「類似災害を見る」ボタン
   - 個別詳細から、同業種×同事故型の最近 10 件を引く。
5. 既存モック (`real-accident-cases*.ts`) は削除しない。最初は
   MHLW データが無い場合のフォールバックとして残す（`|| mockCases`）。

### セーブポイント

- commit: `feat(accidents): replace mock cases with MHLW shisho-db data`
- 変更ページ: `/accidents`, `/accidents/[id]` (新設)。

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
