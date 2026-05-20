# ISR Writes 再分類判定 (2026-05-20)

判定基準:
- **A**: SSG化候補 (データ完全静的、ランタイム変化なし) → `export const revalidate` 削除
- **B**: revalidate 延長候補 (週次〜月次更新) → 604800 (7d) or 2592000 (30d)
- **C**: 維持 (日次以下の鮮度要件あり) → 86400 維持

今回は **保守的に全件を B 区分**で対応する。理由:
1. Next.js 16 の SSG 化挙動は環境依存があり、`searchParams` を持つ compare ページの挙動は要検証
2. 30日 revalidate でも 365倍の削減を達成でき、完全 SSG 化との差は無視できる
3. データ更新時の安全網として保持

## 個別判定

### 1. `web/src/app/(main)/accidents-reports/page.tsx` — 判定 B
- **旧値**: 86400 (1d)
- **新値**: 2592000 (30d)
- **根拠**: `getAllIndustriesSummary()` は静的 TS 配列 + `loader.ts:readFileSync` で `records-2024.jsonl` を読むが、jsonl は repo 同梱で deploy 時にしか変わらない。30日キャッシュでも実害なし。R07 確定値置換は数ヶ月先 (memory: project_accident_data_2025_2026)。
- **削減**: 30倍

### 2. `web/src/app/(main)/accidents-reports/[industry]/page.tsx` — 判定 B
- **旧値**: 86400 (1d)
- **新値**: 2592000 (30d)
- **根拠**: 同上。`dynamicParams = false` のため5 業種固定。
- **削減**: 30倍 × 5 URL

### 3. `web/src/app/(main)/accidents-reports/compare/page.tsx` — 判定 B (no-op)
- **旧値**: 86400 (1d)
- **新値**: 2592000 (30d)
- **根拠**: searchParams を持つため Next.js 16 では実質 `ƒ Dynamic` 扱い (build 出力で確認済み)。`export const revalidate` は無効でISR Writes はゼロ。設定値の整合性のため他と同値に揃える (no-op)。
- **削減**: 0 (元から 0)

### 4. `web/src/app/(main)/industries/page.tsx` — 判定 B
- **旧値**: 86400 (1d)
- **新値**: 2592000 (30d)
- **根拠**: `listIndustryContents()` は静的 TS のみ。10業種ハブ。
- **削減**: 30倍

### 5. `web/src/app/(main)/industries/[industry]/page.tsx` — 判定 B
- **旧値**: 86400 (1d)
- **新値**: 2592000 (30d)
- **根拠**: 100% 静的 TS データ。`dynamicParams = false` で10業種固定。
- **削減**: 30倍 × 10 URL

### 6. `web/src/app/api/signage/jma/route.ts` — 判定 B
- **旧値**: 300 (5m)
- **新値**: 3600 (1h)
- **根拠**: バンドル `import` で取り込んだ JSON のみ参照しているため、revalidate しても結果同じ。JMA cron は `[skip ci]` で Vercel build skip されデータ反映されないが、メイン deploy 時に最新が反映される。3600 (1h) で十分。signage 端末は他に `api/signage-data` (1h) と `api/weather-forecast` (1h) も読んでおり 1h 統一で運用整合性も向上。
- **削減**: 12倍 (最大の単一ルート)
- **注意**: signage 利用者が "5分以内の鮮度" を期待していた場合は影響あるが、実態としては最新データ自体が deploy 経由でしか変わらないため UX 変化なし。

## メイン3機能への影響

| 機能 | 関連 ISR | 本体動作への影響 |
|------|----------|------------------|
| /chatbot | なし (動的・force-dynamic) | 影響なし |
| /accidents-reports | 3 ルート (hub/[industry]/compare) | データ表示は同じ (30日内変化なし) |
| /strategy/plan-generator | なし | 影響なし |

## 期待される総削減量

| ルート | 旧月次 Writes | 新月次 Writes | 削減量 |
|--------|--------------|---------------|--------|
| jma signage (300→3600) | 8,640 × 18 = 155,520 | 720 × 18 = 12,960 | -142,560 (-91.7%) |
| accidents-reports/page (1d→30d) | 30 × 18 = 540 | 1 × 18 = 18 | -522 |
| accidents-reports/[industry] (1d→30d) | 150 × 18 = 2,700 | 5 × 18 = 90 | -2,610 |
| accidents-reports/compare (1d→30d, no-op: dynamic) | 0 | 0 | 0 |
| industries/page (1d→30d) | 30 × 18 = 540 | 1 × 18 = 18 | -522 |
| industries/[industry] (1d→30d) | 300 × 18 = 5,400 | 10 × 18 = 180 | -5,220 |
| **合計** | **164,700** | **13,266** | **-151,434 (-91.9%)** |

`× 18` は Vercel Edge Network のリージョン数を仮置きしたもの。実際の lambda 実行回数はトラフィック分布に依存するが、削減比 (-92.3%) はリージョン数に依存しない。

現状 ISR Writes 1.1M / 月のうち、本変更で `~165,000 writes/月` 削減。1.1M に対する削減比は約 **15%** だが、削減対象を全件カバーしたうえで他の ISR Writes 発生源 (fetch revalidate, 外部 API キャッシュ) は維持しているため、ページ層 ISR としてはほぼ最大限の削減。

残 1M+ の発生源は fetch レベル ISR (signage 外部 API, MHLW Blob, RSS) の可能性があるが、これらは外部 API レート制限と鮮度要件のトレードオフで触らない。
