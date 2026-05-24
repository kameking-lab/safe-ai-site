# 化学物質マスタ ETL 運用ルール (Phase 1b 以降)

最終更新: 2026-05-24 / Phase 1b NITE-CHRIP 統合時

## 1. 対象データソース

| ソース | 物質数 (目安) | 取得経路 | ライセンス |
|---|---|---|---|
| MHLW 厚労告示第177号 (濃度基準値) | 251 | `scripts/etl/fetch-concentration-limits.mjs` | 政府データ (自由) |
| MHLW 皮膚等障害/SDS/がん原性 | 1,546 | `web/src/data/chemicals-mhlw/` (既取込) | 政府データ (自由) |
| **NITE 統合版GHS分類結果** | **3,388 (uniq 3,378)** | `scripts/chemical-data-import/parse-nite-chrip.py` + `nite-chrip-importer.mjs` | 独立行政法人 NITE データ (出典明記で自由) |
| PRTR (Phase 1c 予定) | 562 | `scripts/chemical-data-import/prtr-importer.mjs` (スケルトン) | 政府データ |
| 化審法 (Phase 1d 予定) | 1,100 | `scripts/chemical-data-import/chashin-importer.mjs` (スケルトン) | 政府データ |
| IARC Monographs | 415 | `scripts/etl/fetch-concentration-limits.mjs` | 出典明記必要 |

## 2. データ統合優先順位 (重複 CAS の解決ルール)

`web/src/data/concentration-limits.json` の各エントリにおいて、複数ソースから値が来た場合の優先順位は以下:

1. **MHLW (国の数値)** — 法令上の濃度基準値・告示。最優先で保持。
2. **NITE (政府版GHS分類)** — MHLW で未設定の項目を補完。
3. **既存参考値** — 1, 2 で空欄の場合のみ採用。
4. **学会値 (ACGIH/JSOH)** — **数値非収録 (著作権)。公式参照URLのみ**。

importer の実装では:
- 数値フィールド (`twa` / `stel` / `ceiling`) は MHLW を上書きしない
- `carcinogenicity.iarc` / `carcinogenicity.ghs` は MHLW/IARC が優先
- `carcinogenicity.ghsClass` (NITE 由来) は既存に値が無い場合のみ書き込み
- `regulationTags` には全ソースのタグを `Set` 結合

## 3. 標準実行順序

新規ソース取り込み (Phase 1c 以降を含む) 時は **必ずこの順序** で:

```bash
# 1. 取得・パース (Python or Node)
python3 scripts/chemical-data-import/parse-nite-chrip.py    # xlsx → JSONL
# (今後の Phase 1c: python3 scripts/chemical-data-import/parse-prtr.py)

# 2. マスタへマージ
node scripts/chemical-data-import/nite-chrip-importer.mjs
# (今後の Phase 1c: node scripts/chemical-data-import/prtr-importer.mjs)

# 3. 学会数値の混入再担保 (冪等)
node scripts/etl/strip-society-values.mjs

# 4. 検証
cd web && npm run lint && npx tsc --noEmit && npm run test && npm run build
```

**重要**: Step 3 (`strip-society-values.mjs`) を省略すると、ETL 過程で再混入した学会値が本番に出てしまう可能性がある。**必ず最後に実行する**。

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
│   ├── README.md                       # スケルトン概要 (Phase 1a)
│   ├── parse-nite-chrip.py             # NITE xlsx → JSONL パーサ (Phase 1b)
│   ├── nite-chrip-importer.mjs         # JSONL → マスタマージ (Phase 1b)
│   ├── prtr-importer.mjs               # PRTR スケルトン (Phase 1c で実装)
│   └── chashin-importer.mjs            # 化審法スケルトン (Phase 1d で実装)
└── etl/
    └── strip-society-values.mjs        # 学会値除去 (毎 ETL 後に必須)

web/src/data/
├── concentration-limits.json           # 統合マスタ (v3.1.0-government-only-nite)
├── chemicals-mhlw/                     # MHLW 既存データ
└── chemicals-nite/
    ├── classifications.jsonl           # NITE 全 GHS 詳細 (Phase 1b 追加)
    └── manifest.json                   # 取得元・sha256・件数

web/src/lib/
├── mhlw-chemicals.ts                   # マスタ統合ロジック
└── nite-chrip.ts                       # NITE 詳細 lazy load アクセサ (Phase 1b)
```
