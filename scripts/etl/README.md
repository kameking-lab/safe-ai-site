# MHLW データ ETL スクリプト

厚生労働省公開データ (`mhlw-data/`) を読み込み、Next.js 側で扱いやすい JSONL に変換するスクリプト群。

## 入力
リポジトリルート直下の `mhlw-data/`（`.gitignore` 済み）。手元には以下 231 ファイル:

| カテゴリ | 件数 | 拡張子 | 中身 |
|---|---|---|---|
| shisho-db | 192 | .xls / .xlsx | 労働者死傷病報告（h18_01〜r03_12、月次） |
| deaths    | 18  | .xlsx / .pdf | 死亡災害DB（年次） + 分析報告書PDF |
| chemicals | 10  | .xlsx / .pdf | 化学物質リスト（がん原性・濃度基準・SDS・皮膚等障害） |
| laws      | 11  | .pdf         | 法令・指針PDF |

## 出力
`web/src/data/accidents-mhlw/`（将来は他カテゴリ用ディレクトリも追加）。

## 実行方法

```bash
# 前提: Python 3.10+、openpyxl, pandas
# PDF は pdfplumber か pypdf（フェーズ 2 で導入予定）

python scripts/etl/parse-shisho-db.py              # 全件パース
python scripts/etl/parse-shisho-db.py --only r03_12  # 1ファイルだけ

python scripts/etl/parse-deaths.py
python scripts/etl/parse-chemicals.py
python scripts/etl/parse-laws-pdf.py
```

すべて **冪等** (再実行しても結果は同じ)。出力は上書き。

## スキーマ
TypeScript 型定義は `web/src/types/mhlw.ts` を参照。Python 側は dict で扱い、JSONL の 1 行 = 1 レコード。

## ログ / デバッグ
各スクリプトは stderr に `[ok] 処理件数` / `[skip] 理由` / `[err] ファイル名: 例外` を出力。
`--verbose` で行レベルのトレースも出せる。
