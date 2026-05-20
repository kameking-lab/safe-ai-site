# ISR Writes 全件棚卸し (2026-05-20)

## 背景
Vercel ISR Writes が月次キャップ 200,000 に対し 1,100,000+ (5.5x 超過)。
Hobby プラン復帰準備のため、無駄なリージェネレーションを止めて 70-80% 削減を狙う。

## 調査方法
`web/src/app/` 配下を以下のパターンで grep:
- `export const revalidate` (ページ/ルートハンドラ単位の ISR)
- `next: { revalidate: N }` (fetch レベルの ISR キャッシュ)
- `unstable_cache(..., { revalidate })` (関数キャッシュ)
- `generateStaticParams` (静的事前生成、ISR と組み合わせで使う場合あり)

## ページ/ルートハンドラ単位の ISR (export const revalidate)

| # | ファイル | 現値 | 推定URL数 | データソース | 実質更新頻度 | 月次ISR Writes試算 (1リージョン) |
|---|----------|------|-----------|--------------|--------------|----------------------------------|
| 1 | `web/src/app/(main)/accidents-reports/page.tsx` | 86400 (1d) | 1 | `getAllIndustriesSummary()` from静的 TS | 月次以下 (PR #156, #184) | 30 |
| 2 | `web/src/app/(main)/accidents-reports/[industry]/page.tsx` | 86400 (1d) | 5 (dynamicParams=false) | `getIndustryReport()` from `accident-analysis.ts` + `loader.ts`(readFileSync) | 月次以下 (R07確定値未公開、メモリ参照) | 150 |
| 3 | `web/src/app/(main)/accidents-reports/compare/page.tsx` | 86400 (1d) | 〜26 (searchParams `?industries=` の正準化済組合せ C(5,2)+C(5,3)+C(5,4)+C(5,5)) | 同上 | 同上 | 780 |
| 4 | `web/src/app/(main)/industries/page.tsx` | 86400 (1d) | 1 | `listIndustryContents()` from静的 TS | 月次以下 (PR #214) | 30 |
| 5 | `web/src/app/(main)/industries/[industry]/page.tsx` | 86400 (1d) | 10 (dynamicParams=false) | 静的 TS のみ | 月次以下 (PR #214) | 300 |
| 6 | `web/src/app/api/signage/jma/route.ts` | 300 (5m) | 1 | バンドル import (warnings/weather/earthquakes/index.json) | **再デプロイ時のみ反映** (cron は [skip ci] で Vercel build skip) | 8,640 |

**ページ単位 1リージョンあたり 月次合計: ~9,930**

Vercel Edge Network は約 18 リージョン (us-east, eu-west, ap-northeast 等) を持ち、リージョンごとに個別キャッシュを保持するため実測値は近似で `× 18`:
**実測推定 月次合計: ~178,740 (1.1M中の重要部分)**

## fetch レベルの ISR (next.revalidate)

| ファイル | 現値 | 外部 API | 業務的更新頻度 | 判定 |
|----------|------|---------|----------------|------|
| `web/src/app/api/weather-forecast/route.ts:89` | 3600 (1h) | Open-Meteo | 1h で十分鮮度 | 維持 (C) |
| `web/src/app/api/signage-data/route.ts:31,60` | 3600 (1h) | 外部 RSS/HTTP | 1h で十分 | 維持 (C) |
| `web/src/app/api/mhlw/search/route.ts:127` | 3600 (1h) | Vercel Blob | バッチ更新は週次 | 維持 (C) |
| `web/src/lib/signage/parse-labor-rss.ts:83` | 3600 (1h) | 厚労省 RSS | 日次〜週次 | 維持 (C) |
| `web/src/lib/weather/open-meteo-hourly.ts:139` | 1800 (30m) | Open-Meteo | 30m で適切 | 維持 (C) |

fetch レベルは外部 API 呼び出し回数を抑えるための妥当な設定。今回は変更対象外。

## generateStaticParams を使うが revalidate 未指定のページ

Next.js 16 規約: `generateStaticParams` のみで `revalidate` 未指定の場合、ビルド時に完全 SSG (ISR Writes ゼロ)。
以下は対象外 (既に SSG):
- `accidents/[id]`, `articles/[slug]`, `circulars/[id]`, `community-cases/[id]`,
  `equipment/[id]`, `exam-quiz/[slug]`, `exam-quiz/[slug]/result`, `faq/[category]`,
  `features/[category]`, `foreign-workers/status/[status]`, `safety-diary/[id]`,
  `safety-signs/category/[category]`, `safety-signs/industry/[industry]`,
  `safety-signs/sign/[id]`, `treatment-work-balance/illness-guide/[illness]`

## 主要データソースの更新頻度 (git log 直近 5ヶ月)

| データ | 更新コミット数 | 更新パターン |
|--------|----------------|--------------|
| `web/src/data/industries-content/` | 3件 (2026-01以降) | 機能追加時のみ |
| `web/src/data/accidents`, `lib/accident-analysis.ts` | 3件 (2026-01以降) | 機能追加時のみ |
| `web/src/data/jma/*.json` | 15分毎 (GitHub Actions cron) | **commit に `[skip ci]` 付与され vercel.json `ignoreCommand` で deploy skip** → デプロイ時のみ反映 |

## 結論
- accidents-reports / industries のページデータは TS / JSON とも実質静的。86400 (1d) は過剰。
- jma signage は cron commit が `[skip ci]` で deploy skip されるため、`revalidate=300` で頻繁再生成しても結果は同じ。バンドル import なので再デプロイまでデータ変化せず無意味。
