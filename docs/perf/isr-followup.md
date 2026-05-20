# ISR Writes 実装後フォローアップ手順 (2026-05-20)

## 計測タイミング
- **T+7d** (デプロイ後7日): 2026-05-27 想定
- **T+14d** (デプロイ後14日): 2026-06-03 想定
- **T+30d** (新 revalidate=2592000 が一巡): 2026-06-19 想定

## 取得する数値

### Vercel Dashboard 経由
1. https://vercel.com/[team]/safe-ai-site/usage を開く
2. "ISR Writes" メトリクスを選択
3. 過去 7d / 14d / 30d の累計値を控える
4. 月次キャップ (Hobby: 200,000) との比率を計算

### 期待値 (試算)
- ベースライン日次平均: ~36,667 writes/日 (1.1M ÷ 30)
- 削減後試算: ~31,653 writes/日 (-13.7%, ~165K writes/月削減)
- **目標達成判定**: 月次 200K 以下に収まるか

## 残課題が判明した場合の追加対策候補

### 1. 高頻度 fetch revalidate (今回未対応)
| 対象 | 現値 | 追加削減候補値 | 影響 |
|------|------|----------------|------|
| `api/weather-forecast/route.ts` (3600) | 1h | 21600 (6h) | signage 天気の鮮度低下 |
| `api/signage-data/route.ts` (3600) | 1h | 7200 (2h) | signage RSS の鮮度低下 |
| `api/mhlw/search/route.ts` (3600) | 1h | 21600 (6h) | MHLW検索の鮮度低下 |
| `lib/signage/parse-labor-rss.ts` (3600) | 1h | 21600 (6h) | RSS鮮度低下 |
| `lib/weather/open-meteo-hourly.ts` (1800) | 30m | 3600 (1h) | 天気予報遅延 |

### 2. webhook 経由の revalidatePath/revalidateTag
- 該当箇所を grep してバッチ更新時の不要な revalidate を整理
- `grep -rn "revalidatePath\|revalidateTag" web/src`

### 3. Edge Network 設定
- Pro プラン移行で per-region ISR cache の挙動が変わるか確認
- `vercel.json` の `regions` 指定で region 数を制限する選択肢

## ロールバック手順
本 PR のリバート (`git revert <merge-commit>`) で全件元に戻る。SSG 化ではなく revalidate 値変更のみのため副作用なし。
