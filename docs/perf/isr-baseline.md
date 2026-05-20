# ISR Writes ベースライン (2026-05-20 / 変更直前)

## Vercel メトリクス (実測, 月初〜中盤集計)
- **ISR Writes**: 1,100,000+ (キャップ 200,000 の 5.5x 超過)
- **削減目標**: 200,000 以下 (70-80% 削減)

## 変更直前の `export const revalidate` 設定一覧

| ルート | 値 | 種別 |
|--------|-----|------|
| `web/src/app/(main)/accidents-reports/page.tsx` | 86400 (1d) | Hub (1 URL) |
| `web/src/app/(main)/accidents-reports/[industry]/page.tsx` | 86400 (1d) | Industry SSG (5 URL, dynamicParams=false) |
| `web/src/app/(main)/accidents-reports/compare/page.tsx` | 86400 (1d) | ※実質 dynamic (searchParams) |
| `web/src/app/(main)/industries/page.tsx` | 86400 (1d) | Hub (1 URL) |
| `web/src/app/(main)/industries/[industry]/page.tsx` | 86400 (1d) | Industry SSG (10 URL, dynamicParams=false) |
| `web/src/app/api/signage/jma/route.ts` | 300 (5m) | Signage |

## 直前のビルド出力 (npm run build)
- Compiled successfully in 12.1s
- 2,508 static pages generated using 31 workers in 16.7s
- Tests: 327 passed (327)

## 計測手順 (実装後フォローアップ用)

1. Vercel Dashboard → Project: safe-ai-site → Usage タブ
2. "ISR Writes" を選択し過去 30 日のチャートを参照
3. デプロイ日 (`origin/main` への merge コミット) を起点に
   - +7 日時点の日次平均 Writes
   - +14 日時点の累計 Writes
   を記録

## 関連 PR / 出典
- 現況レポート: `web/src/app/(main)/audits/site-status-2026-05-19/page.tsx`
- 監査根拠: PR #247 (Vercel usage monitoring dashboard)
