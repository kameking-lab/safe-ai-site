# 事故件数突合調査 2026-05-20

調査日: 2026-05-20
調査者: Dispatch（AI自律作業）
参照レポート: docs/site-reality-check-2026-05-19/report.md (PR #255)

---

## 1. 調査対象と手法

/accidents-reports 5業種ランディングページ（construction / manufacturing / transport / healthcare / service）に表示される「事故件数」が、内部データ（industry-profiles.json）の数値と著しく乖離している旨が PR #255 で確認されていた。本調査でその原因を特定し、対応方針を決定した。

---

## 2. 本番表示数値 vs 内部データ実値

| 業種 | 本番表示件数 | industry-profiles.json (建設業等) |
|------|------------|----------------------------------|
| 建設業 (construction) | 1,670件 | 66,713件 |
| 製造業 (manufacturing) | 926件 | 115,601件 |
| 運輸業 (transport) | 710件 | 66,650件 |
| 医療・福祉 (healthcare) | 97件 | 18,808件（保健衛生業） |
| サービス業 (service) | 1,168件 | 34,436件（接客娯楽業等） |

---

## 3. 乖離の原因（データソース不整合・集計範囲の違い）

### 本番表示の件数出典

`/accidents-reports/[industry]` ページは `src/lib/accident-analysis.ts` の `getIndustryStats()` を使用。この関数は `loadCombinedCases()` が返す CombinedCase[] を業種フィルタして件数を集計する。

`loadCombinedCases()` の構成:
- **deaths-mhlw/compact.json**: 厚労省 死亡災害DB 2019〜2023年分 4,043件（死亡事例のみ）
- **deaths-mhlw/records-2024.jsonl**: 厚労省 死亡災害DB 2024年分 〜739件（死亡事例のみ）
- **curated cases**: real-accident-cases*.ts の合算 〜290件（重篤・curated事例）

→ **合計 〜5,072件（死亡・重篤中心）を5業種にマッピングしたもの**

建設業 1,670 = compact.json の建設業死亡 1,319 + records-2024の建設業分 + curated 建設業 118件 ≒ 1,670件

### industry-profiles.json の出典

`src/data/aggregates-mhlw/industry-profiles.json` は別系統のデータで、厚労省「職場のあんぜんサイト」死傷災害データベース（2006〜2021・月別 jsonl）全件集計。  
**休業4日以上の全死傷事例（死亡から軽傷まで含む）** の15年累積値。建設業 66,713件はこの別集計値。

### 結論

**2つの数値は異なるデータソース・集計範囲を指しており、どちらも正しい**。  
乖離の本質は「件数の集計範囲が画面上で明示されていなかった」こと（集計範囲注記不足）。

- 本番 1,670件 = 死亡・重篤中心（2019〜2024）
- 66,713件 = 休業4日以上全件（2006〜2021 15年累積）

---

## 4. 実施した修正（Step 2a: 集計範囲注記追加）

### 変更ファイル: `web/src/components/accidents-reports/industry-report-view.tsx`

1. **KpiCard「事故事例 合計」キャプション変更**
   - 変更前: `厚労省データ＋curated事例の合算（${yearLabel}）`
   - 変更後: `死亡災害DB＋curated事例（${yearLabel}）※休業4日以上全件は別集計`

2. **ヘッダーの母集団ラベル変更**
   - 変更前: `母集団${num(stats.total)}件`
   - 変更後: `死亡災害DB中心 ${num(stats.total)}件`

3. **フッター出典注記追加**
   - 「死亡・重篤事例を中心とした記録が対象」「休業4日以上の全死傷件数（建設業は年間約14,000件規模）は含まず、別集計」の旨を明記

---

## 5. その他の表示乖離チェック

- **「5,000件超」表記**: ハブページ(/accidents-reports)での記載。loadCombinedCases() の総件数（〜5,072件）を指す表現で概ね妥当。注記追加不要。
- **「33法令以上」表記**: site-stats.ts に SITE_STATS.lawArticleCount として管理。allLawArticles.length から動的生成のため常に実態と一致。問題なし。

---

## 6. 残課題（別タスク化）

- industry-profiles.json の休業4日以上集計値（66,713件等）を活用した「全件統計ビュー」の追加（死亡DB視点と全件統計の並列表示）
- /accidents-reports ハブページの「5,000件超」フレーズに対して死亡DB中心であることの注記追加検討
