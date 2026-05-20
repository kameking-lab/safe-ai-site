# Edge Requests 発生源の特定 (2026-05-19 計測時点)

調査日: 2026-05-19
対象期間: 2026-05-01 以降の MTD 1,007,000 件（Hobby上限 1,000,000 の 100.7%）
月末予測: 1,590,000 件 / 159% (blocked)
出典: `docs/perf/hobby-baseline-2026-05-19.md`

## 1. 確認した前提

- **`middleware.ts` は本リポジトリに存在しない**（`web/src/` 配下に `middleware*` ファイルなし）。matcher 設定の最適化余地はゼロ。
- Vercel における Edge Requests は「Vercel Edge Network が受けた全 HTTP リクエスト」を含む（静的アセット・関数呼び出し・リダイレクト・CDN cache HIT すべて）。
- Function Invocations は別メトリクス。Edge cache HIT は Edge Request としてカウントされ続けるが、Function Invocation は発生しない。

## 2. 発生源の寄与度推定

| 発生源 | 推定/日 | 推定/月 | 寄与率 | 根拠 |
|--------|---------|---------|--------|------|
| Googlebot を中心とした SEO クローラ巡回（サイトマップ約 3,500 URL） | ~3,500-5,000 | ~105K-150K | 6.6-9.4% | sitemap.ts の URL 数 × 主要BOTの週次フル巡回 |
| 静的アセット (`/_next/static/*`, 画像, フォント) | ~25,000-30,000 | ~750K-900K | ~50% | 1ページあたり 30〜50 アセット × 訪問数。Vercel Edge cache でほぼ HIT |
| ページ HTML / SSG / ISR ページ | ~5,000 | ~150K | ~10% | DAILY_TARGETS 53,000 - 上記アセット分の残差 |
| `/api/signage/jma` ポーリング（15分） | ~96/タブ/日 | ~3K/タブ/月 | < 1% | signage-map-client.tsx:43 REFRESH_INTERVAL_MS=15min |
| `/api/signage-data` ポーリング（30分） | ~48/タブ/日 | ~1.4K/タブ/月 | < 1% | signage/page.tsx:32 REFRESH_INTERVAL_MS=30min |
| `robots.txt` / `sitemap.xml` クローラ取得 | ~50-200 | ~1.5K-6K | < 0.5% | robots.txt は `s-maxage=0` で CDN キャッシュなし（PR #233） |
| Apex→www 301 リダイレクト | 不明 | <数K | < 1% | next.config.ts redirects |
| 旧URL（/chat, /news, /jiko 等）308リダイレクト | 不明 | <数K | < 1% | next.config.ts redirects |

**主要構造**: 静的アセット ~50%、ページ HTML ~10%、クローラ ~10%、その他 ~30%。

## 3. 削減余地の評価

### 高効果（直接 HTTP リクエストを減らす）

- **Signage ポーリング間隔の延長**
  - `signage-map-client.tsx` 15min → 30min（直接 50% 削減）
  - `signage/page.tsx` 30min → 60min（直接 50% 削減）
  - 効果範囲: アクティブな signage 表示クライアント数に比例。低トラフィックでは Edge 全体への影響は限定的。

### 中効果（Function Invocations を減らす：副次効果あり）

- **`robots.txt` の `s-maxage` 復元**
  - PR #233 で `s-maxage=0` 強制（Disallow 変更の即時反映目的）。Disallow 変更は安定したため復元可能。
  - 0 → 86400 (24h)。Edge cache HIT は引き続き Edge Request として計上されるが、Function Invocations は大幅削減。

### 低効果 / 副作用大（実施しない）

- **静的アセットの max-age 延長**: 既に Next.js が `_next/static/*` に `immutable` を自動設定。これ以上の最適化余地はない。
- **redirects 整理**: 旧URL（/chat, /news 等）は SEO バックリンクが存在するため削除リスクあり。
- **クローラブロック強化**: AI bots は既にブロック済み。Googlebot/Bingbot を制限するのは SEO 観点で不可。

### 構造的に対処不可（コード側）

- 静的アセット ~50% は Next.js の自動キャッシュに依存。リファクタや route 統廃合がない限り削減不能。
- Googlebot 巡回は sitemap 縮小しない限り直接削減不可。サイトマップは SEO 上必要。

## 4. ISR 追加削減候補（fetch revalidate 延長 / on-demand 生成）

`docs/perf/isr-followup.md` の "1. 高頻度 fetch revalidate" 候補を本フォローアップで適用。

| 対象 | 現値 | 新値 | 判定根拠 |
|------|------|------|----------|
| `api/weather-forecast/route.ts` (open-meteo daily) | 3600 (1h) | 21600 (6h) | 日次予報。6h で次日予報精度に影響なし |
| `api/signage-data/route.ts` (JMA fetch + unstable_cache) | 3600 (1h) | 7200 (2h) | 外側 CDN cache が `s-maxage=300` で 5分の鮮度を確保。内側を 2h でも UX への影響なし |
| `api/mhlw/search/route.ts` (Blob 検索) | 3600 (1h) | 21600 (6h) | Blob 内容は手動更新のみ。6h は過剰に保守的でも十分 |
| `lib/signage/parse-labor-rss.ts` (Google News) | 3600 (1h) | 21600 (6h) | トレンド表示用。news 更新 6h 単位で十分 |
| `lib/weather/open-meteo-hourly.ts` (hourly forecast) | 1800 (30m) | 3600 (1h) | hourly データの上流更新は 1h サイクル。30m は過剰 |

## 5. 本 followup 後の予想

### Edge Requests
- 構造的に削減困難な静的アセット部分（~50%）が大半のため、本 followup 単独では大幅削減は見込みにくい。
- 期待値: 1,590,000/月 → ~1,500,000-1,550,000/月（-3〜6%）。Hobby 上限 1,000,000 への到達は依然困難。
- 抜本対策候補: Pro プラン継続 or sitemap 大幅縮小 or トラフィック構造の見直し。

### ISR Writes（前回 #252 後の残課題）
- fetch revalidate 5箇所の延長で、該当ルートの再生成頻度を 6〜12 倍延長。
- 期待値: 残 1,080,000/月 → ~900,000-950,000/月（-12〜17%）。+ 前回削減との合算で目標 200K まで距離あり。

## 6. 結論

Edge Requests 159% の主因は**構造的トラフィック構成**（静的アセット + クローラ）。コード側で安全に直接削減できるのは signage ポーリング・robots.txt キャッシュのみで、効果は数 % にとどまる。

抜本対策としては「Pro プラン継続」または「クローラブル URL 数の意図的削減（sitemap 縮小・noindex 付与）」が必要。本 followup ではコード変更で安全に取れる範囲を実装し、ISR 追加削減と組み合わせて Hobby 復帰可能性を 30% → 35-40% に引き上げる。
