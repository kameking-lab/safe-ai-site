# 化学物質データ統合スクリプト

化学物質RA万能化 Phase 1 において、本番DBを 1,546 物質 → 12,000-15,000 物質まで
拡張するための取得スクリプト群。

## 進捗

- Phase 1a (完了 PR #271): ACGIH/JSOH 数値除去 + 公式参照リンク化
- **Phase 1b (完了 2026-05-24): NITE-CHRIP 3,388 物質統合 (1,546 → 3,513 物質)**
- Phase 1c (未着手): PRTR (562) 取り込み
- Phase 1d (未着手): 化審法 (1,100) 取り込み + UI 横断調整

詳細運用ルール: `docs/chemical-ra-phase1b/etl-operations-guide.md`

## スクリプト

| ファイル | データソース | 追加物質数 | 状態 |
|---|---|---|---|
| `parse-nite-chrip.py` + `nite-chrip-importer.mjs` | NITE-CHRIP (政府版 GHS 分類) | 3,388 (uniq 3,378) | **実装完了** |
| `prtr-importer.mjs` | PRTR 第一種(462)・第二種(100) | ~562 | スケルトン |
| `chashin-importer.mjs` | 化審法 (特定/優先評価/監視) | ~1,100 | スケルトン |

## NITE-CHRIP 実行手順 (Phase 1b 完了形)

```bash
# 1. 元 xlsx 取得 (NITE 公式 or ミラー)
curl -sL -o scripts/chemical-data-import/tmp/list_nite_all.xlsx \
  "https://www.chem-info.nite.go.jp/chem/ghs/files/list_nite_all.xlsx"
#   または (本セッション環境のように nite.go.jp 到達不可の場合):
# curl -sL -o scripts/chemical-data-import/tmp/list_nite_all.xlsx \
#   "https://github.com/Ameyanagi/risk_assessment_list/raw/main/reference/list_nite_all.xlsx"

# 2. xlsx → JSONL パース (Python, openpyxl 必要)
pip install openpyxl
python3 scripts/chemical-data-import/parse-nite-chrip.py

# 3. concentration-limits.json へマージ
node scripts/chemical-data-import/nite-chrip-importer.mjs

# 4. 学会数値再除去 (冪等、必須)
node scripts/etl/strip-society-values.mjs

# 5. 検証
cd web && npm run lint && npx tsc --noEmit && npm run test && npm run build
```

## 共通フロー

各スクリプトは以下の手順で動作する想定:

1. 公式 URL から CSV/XML をダウンロード(`./tmp/`)
2. パース → 中間 JSON 化(`./tmp/{source}-parsed.json`)
3. 既存 `web/src/data/concentration-limits.json` と CAS でマージ
4. 統合結果を `web/src/data/concentration-limits.json` に書き戻し
5. ソース別タグ(`nite` / `prtr` / `chashin`)を `regulationTags` フィールドに付与

## NITE-CHRIP 取得手順 (Phase 1b 着手時のガイド)

1. アクセス先: https://www.nite.go.jp/chem/chrip/chrip_search/systemTop
2. データ形式: 個別物質ページから HTML 抽出、もしくは公開 CSV (CHRIP)
3. ライセンス: 政府機関データ(出典明記のうえ自由利用可)
4. CAS マッピング: NITE 番号 → CAS の対応表は CHRIP の物質基本情報に含まれる
5. 抽出項目:
   - 政府版 GHS 分類 (健康・環境・物理化学危険性)
   - 絵表示, H/P コード
   - 労働安全衛生法対象有無
6. 想定処理時間: 約3,300物質 ×  リクエスト間隔 1s = 1時間以内

## PRTR 取得手順

1. アクセス先: https://www.env.go.jp/chemi/prtr/risk0.html
2. データ形式: 政令別表 Excel (xlsx)
3. ライセンス: 政府データ(自由利用可)
4. 抽出項目:
   - 第一種指定化学物質 462 件
   - 第二種指定化学物質 100 件
   - 取扱量しきい値(1トン/年 等)

## 化審法 取得手順

1. アクセス先: https://www.meti.go.jp/policy/chemical_management/kasinhou/
2. データ形式: METI 公表リスト Excel/PDF
3. 抽出項目:
   - 第一種特定化学物質
   - 第二種特定化学物質
   - 優先評価化学物質
   - 監視化学物質

## マージロジック共通仕様

- キー: CAS 番号
- 衝突時: 既存値を保持(MHLW > NITE > PRTR > 化審法 の優先順位)
- 新規物質: `source: "reference"` + `regulationTags: ["nite", ...]` を付与
- 物質名: 日本語名を優先(NITE 由来の正式名)

## 検証

統合後は以下を確認:
- `npm run lint`: 0 errors
- `npx tsc --noEmit`: 0 errors
- `npm run test`: 既存テスト全 pass
- 主要10物質(石綿/ホルムアルデヒド/トルエン/メタノール/塩化メチレン/ジクロロメタン/ベンゼン/鉛/クロム/カドミウム)で /chemical-database 動作
