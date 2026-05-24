# 化学物質マスタ ETL 運用ルール (Phase 1b/1c/1d 完了)

最終更新: 2026-05-24 / Phase 1c+1d (PRTR・化審法系) 統合時

## 1. 対象データソース

| ソース | 物質数 (実取込) | 取得経路 | ライセンス |
|---|---|---|---|
| MHLW 厚労告示第177号 (濃度基準値) | 251 | `scripts/etl/fetch-concentration-limits.mjs` | 政府データ (自由) |
| MHLW 皮膚等障害/SDS/がん原性 | 1,546 | `web/src/data/chemicals-mhlw/` (既取込) | 政府データ (自由) |
| **NITE 統合版GHS分類結果** | **3,388 (uniq 3,378)** | `parse-nite-chrip.py` + `nite-chrip-importer.mjs` | NITE データ (出典明記で自由) |
| **PRTR 化管法 第一種/第二種** | **398 ユニーク CAS** (法令562の72%) | `parse-regulatory-laws.py` + `prtr-importer.mjs` | 政府公開法令 (e-Gov 由来) |
| **化審法 (第一種特定/第二種特定)** | **34 ユニーク CAS** (優先評価1,100は未取込) | `parse-regulatory-laws.py` + `chashin-importer.mjs` | 政府公開法令 |
| 毒物及び劇物取締法 | 200 ユニーク CAS | 同上 (chashin-importer 経由) | 政府公開法令 |
| 化学兵器禁止法 (CWC) | 24 ユニーク CAS | 同上 (chashin-importer 経由) | 政府公開法令 |
| 廃棄物処理法 (特定有害産業廃棄物) | 12 ユニーク CAS | 同上 (chashin-importer 経由) | 政府公開法令 |
| IARC Monographs | 415 | `scripts/etl/fetch-concentration-limits.mjs` | 出典明記必要 |

## 2. データ統合優先順位 (重複 CAS の解決ルール)

`web/src/data/concentration-limits.json` の各エントリにおいて、複数ソースから値が来た場合の優先順位は以下:

1. **MHLW (国の数値)** — 法令上の濃度基準値・告示。最優先で保持。
2. **NITE (政府版GHS分類)** — MHLW で未設定の項目を補完。
3. **PRTR / 化審法 / 毒劇法 / CWC / 廃掃法 (法令タグ)** — 数値は持たず `regulationTags` で並列追加。
4. **既存参考値** — 1, 2, 3 で空欄の場合のみ採用。
5. **学会値 (ACGIH/JSOH)** — **数値非収録 (著作権)。公式参照URLのみ**。

importer の実装では:
- 数値フィールド (`twa` / `stel` / `ceiling`) は MHLW を上書きしない
- `carcinogenicity.iarc` / `carcinogenicity.ghs` は MHLW/IARC が優先
- `carcinogenicity.ghsClass` (NITE 由来) は既存に値が無い場合のみ書き込み
- `regulationTags` には全ソースのタグを `Set` 結合 (nite / prtr1 / prtr2 / cscl1 / cscl2 / cscl-other / poison-control / cwc / waste)
- `prtrLawReferences` / `chashinLawReferences` は法令別表参照を配列で蓄積

## 3. 標準実行順序

新規ソース取り込み時は **必ずこの順序** で:

```bash
# 1. 取得・パース (Python)
python3 scripts/chemical-data-import/parse-nite-chrip.py            # NITE xlsx → JSONL
python3 scripts/chemical-data-import/parse-regulatory-laws.py       # 法令JSONL → PRTR/化審法系 JSONL

# 2. マスタへマージ (順序: NITE → PRTR → 化審法系)
node scripts/chemical-data-import/nite-chrip-importer.mjs
node scripts/chemical-data-import/prtr-importer.mjs
node scripts/chemical-data-import/chashin-importer.mjs

# 3. 学会数値の混入再担保 (冪等。各 import メタを保持しつつ summary 再計算)
node scripts/etl/strip-society-values.mjs

# 4. 検証
cd web && npm run lint && npx tsc --noEmit && npm run test && npm run build
```

**重要**: Step 3 (`strip-society-values.mjs`) を省略すると、ETL 過程で再混入した学会値が本番に出てしまう可能性がある。**必ず最後に実行する**。
新規 import スクリプトを追加する場合は `strip-society-values.mjs` 側の `summarize()` と `newSources` 保持ロジックに同様の保存処理を追記すること。

## 4. 著作権遵守チェックリスト

新規データ取り込み時に必ず確認:

- [ ] 出典は政府機関・独立行政法人など著作権フリーまたは出典明記で自由利用可
- [ ] ライセンス文を `web/src/data/<source>/manifest.json` に記載
- [ ] 数値非収録ポリシー対象 (ACGIH/JSOH 等学会値) の混入が無い
  - `node scripts/etl/strip-society-values.mjs` の `removed entries: 0` を確認
- [ ] UI 表示時に出典ラベル (例: 「出典: NITE 統合版GHS分類結果」) を必ず表示
- [ ] 一次配布物 (xlsx/csv の生バイト列) を `web/public/` に置かない
  - 加工後の JSONL は OK (中間生成物は `tmp/` で `.gitignore` 済)

## 5. データソース別の更新頻度

| ソース | 更新頻度 | 確認方法 |
|---|---|---|
| MHLW 告示第177号 | 年1-2回 (改正時) | mhlw.go.jp/content/11300000/ の Last-Modified |
| NITE GHS 分類 | 年1回程度 (`list_nite_all.xlsx`) | chem-info.nite.go.jp の更新告知 |
| IARC Monographs | 評価会議ごと (年数回) | iarc.who.int のリスト |

四半期ごとに `scripts/chemical-data-import/parse-nite-chrip.py` を再実行し、差分を確認。
本番反映前に `git diff web/src/data/concentration-limits.json` で著しい削除がないことを確認。

## 6. トラブルシューティング

### Q. ネットワーク制約で nite.go.jp に直接到達できない場合
- A. ミラー経由で取得: `https://github.com/Ameyanagi/risk_assessment_list/raw/main/reference/list_nite_all.xlsx`
- ミラーのバージョン (manifest.json の `cached_at`) を確認し、正本との sha256 一致を検証

### Q. importer が物質を取りこぼす場合
- A. CAS 形式バリデーション (`/^\d{2,7}-\d{2,3}-\d{1,2}$/`) で弾かれている可能性
  - NITE データには複数 CAS 連結 (例: `"68515-48-0, 28553-12-0"`) や CAS 未割当物質が含まれる
  - 必要なら primaryCas + alternateCas 構造に拡張 (Phase 1c 以降検討)

### Q. テスト `Phase 1b NITE-CHRIP 統合` が失敗する場合
- A. 以下を順次確認:
  1. `web/src/data/chemicals-nite/classifications.jsonl` が存在するか
  2. `concentration-limits.json` の `summary.withRegulationNite` が 3,000 件以上か
  3. importer 実行後に strip-society-values が再走されているか

## 7. 関連ファイル一覧

```
scripts/
├── chemical-data-import/
│   ├── README.md                       # 概要・実行手順
│   ├── parse-nite-chrip.py             # NITE xlsx → JSONL パーサ (Phase 1b)
│   ├── parse-regulatory-laws.py        # 法令JSONL → PRTR/化審法系 JSONL (Phase 1c/1d)
│   ├── nite-chrip-importer.mjs         # NITE → マスタマージ (Phase 1b)
│   ├── prtr-importer.mjs               # PRTR → マスタマージ (Phase 1c)
│   └── chashin-importer.mjs            # 化審法+毒劇法+CWC+廃掃法 → マスタマージ (Phase 1d)
└── etl/
    └── strip-society-values.mjs        # 学会値除去 (毎 ETL 後に必須、各 import メタを保持)

web/src/data/
├── concentration-limits.json           # 統合マスタ (v3.3.0-government-only-nite-prtr-chashin)
├── chemicals-mhlw/                     # MHLW 既存データ
├── chemicals-nite/                     # NITE 詳細
│   ├── classifications.jsonl           # NITE 全 GHS 詳細 (Phase 1b)
│   └── manifest.json
├── chemicals-prtr/                     # PRTR 詳細 (Phase 1c)
│   ├── regulatory.jsonl
│   └── manifest.json
└── chemicals-chashin/                  # 化審法系 詳細 (Phase 1d)
    ├── regulatory.jsonl
    └── manifest.json

web/src/lib/
├── mhlw-chemicals.ts                   # マスタ統合ロジック (regulationTags 体制)
└── nite-chrip.ts                       # NITE 詳細 lazy load アクセサ (Phase 1b)
```

## 8. 残データソース候補 (Phase 1e 以降)

3,515 物質マスタを 12,000-15,000 物質規模に拡張するための追加データソース:

- **化審法 優先評価化学物質** (約1,100物質) — METI 公表 PDF/Excel。本ミラーには未収録
- **化審法 一般化学物質中の特定** (約700物質)
- **GHS-Japan オリジナル分類リスト** (環境省/経産省 Web公開分、約2,000物質)
- **職場あんぜんサイト Model SDS 全件** (厚労省、約3,000物質)
- **国際的な GHS データセット (EU CLP, 米OSHA)** — 出典・利用条件確認必要

これらは Phase 1e 以降で同じ `regulationTags` 体制に並列追加可能。
