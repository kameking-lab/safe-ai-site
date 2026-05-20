# Edge Requests + ISR 追加削減 followup 試算 (2026-05-19)

策定日: 2026-05-19
適用 PR: (本 followup PR、self-merge 後に追記)
前提: PR #252 (ISR 全件見直し)、PR #253 (F-005 CDN cache)、PR #254 (Hobby 復帰予測ベースライン) を反映済み

---

## 1. 本 followup 変更内容まとめ

### Edge Requests 削減

| 対象 | 旧値 | 新値 | ファイル |
|------|------|------|----------|
| signage-map ポーリング | 15min | 30min | `web/src/components/signage-map/signage-map-client.tsx` |
| signage ダッシュボードポーリング | 30min | 60min | `web/src/app/signage/page.tsx` |
| `robots.txt` Cache-Control | `s-maxage=0` | `s-maxage=86400, swr=3600` | `web/next.config.ts` |
| `proxy.ts` matcher (Next.js 16) | `"/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"` | `"/_proxy-disabled-until-phase-4-3/:path*"` | `web/src/proxy.ts` |

### ISR Writes 削減 (fetch revalidate / unstable_cache 延長)

| 対象 | 旧値 | 新値 | 判定根拠 |
|------|------|------|----------|
| `api/weather-forecast/route.ts` (open-meteo daily) | 3600 (1h) | 21600 (6h) | 日次予報は次日精度に影響なし |
| `api/signage-data/route.ts` (JMA fetchJson) | 3600 (1h) | 7200 (2h) | 外側 CDN s-maxage=300 で 5分鮮度確保。内側 2h で UX 影響なし |
| `api/signage-data/route.ts` (unstable_cache 47都道府県) | 3600 (1h) | 7200 (2h) | 同上、prefecture levels 集計の更新間隔 |
| `api/mhlw/search/route.ts` (Blob 検索) | 3600 (1h) | 21600 (6h) | Blob は手動更新のみ |
| `lib/signage/parse-labor-rss.ts` (Google News RSS) | 3600 (1h) | 21600 (6h) | トレンド news は 6h で十分 |
| `lib/weather/open-meteo-hourly.ts` (hourly forecast) | 1800 (30m) | 3600 (1h) | hourly データの上流更新は 1h サイクル |

---

## 2. 効果試算

### Edge Requests

ベースライン: 1,590,000/月 (159%、blocked)。本 followup の主要寄与:

| 施策 | 推定月次削減 | 算出根拠 |
|------|------------|---------|
| `proxy.ts` matcher 制限 | ~30,000-80,000 | AUTH_SECRET 設定下で毎ページ訪問に発火していた no-op 関数を撤廃。Function Invocations が主要削減で、Edge cache HIT は計上され続けるが、proxy 通過時の Function 呼び出しが消える |
| signage ポーリング半減 | アクティブ display 数次第 | 1 display あたり ~3K Edge Requests/月 → ~1.5K/月。display 数 0-10 として 0-15K の範囲 |
| `robots.txt` CDN cache 復元 | ~1,000-5,000 (Function Invocations 経由) | クローラの robots.txt 取得が CDN HIT になる分の Function 削減 |
| ISR fetch revalidate 延長 (5件) | ~50,000-100,000 | 各 fetch の再生成回数 1/2〜1/6 化に伴う上流リクエスト削減 + Edge Function 起動削減 |

**保守的試算**: 1,590,000 → ~1,500,000 (-5.7%)、159% → 150%、依然 blocked
**中間試算**: 1,590,000 → ~1,450,000 (-8.8%)、159% → 145%、依然 blocked
**楽観試算**: 1,590,000 → ~1,350,000 (-15%)、159% → 135%、依然 blocked

→ **Hobby 復帰には届かない**（Edge Requests の主因は静的アセット + Googlebot 巡回という構造的要因）。

### ISR Writes (PR #252 後の残課題)

PR #252 後のベースライン: 1,080,000/月 (540%、blocked)。fetch revalidate 5件の倍率変更による効果:

| ルート | 寄与推定 (Edge ×18 リージョン仮定) |
|--------|-------|
| weather-forecast (6x延長) | -~50,000/月 |
| signage-data 内側 (2x延長) | -~30,000/月 |
| mhlw/search (6x延長) | -~20,000/月 |
| labor-rss (6x延長) | -~15,000/月 |
| open-meteo-hourly (2x延長) | -~10,000/月 |

合計推定: -~125,000/月 → 残 ~955,000/月 → 478% (依然 blocked)

→ **Hobby 復帰には届かない**（200K 上限まで構造的に大きい乖離）。

---

## 3. Hobby 復帰可能性の更新

PR #254 ベースライン時点: 約30% (ISR ready 確定だが Edge 不確実、と楽観試算した値)。

本 followup 反映後:

| シナリオ | Edge | ISR | 総合判定 | Hobby 復帰可能性 |
|---------|------|-----|---------|---------------|
| 保守的 | 150% blocked | 478% blocked | BLOCKED | < 5% |
| 中間 | 145% blocked | 478% blocked | BLOCKED | < 5% |
| 楽観 | 135% blocked | 478% blocked | BLOCKED | < 5% |

**結論**: 本 followup でもなお Hobby 復帰は事実上不可能。残課題は構造的:

1. **Edge Requests**: 静的アセット (~750K/月) と Googlebot 巡回 (~150K/月) が支配的。コード変更では到達不可。
2. **ISR Writes**: 1.08M → 0.96M で依然 200K の 4.8 倍。webhook 経由の revalidatePath 整理 or 主要 SSG ページの完全静的化が必要。

**実用的な選択肢**:

- **Pro プラン継続** (推奨)。Hobby は本サービス規模に不適合と判断。
- **トラフィック構造の抜本見直し** (sitemap 縮小、static export 化など) — 大規模リファクタが必要。

本 followup は「コード側で安全に取れる削減」を実施したマイルストーンとして位置付け、最終判断は 6/10 時点の実測値で行う。

---

## 4. メイン3機能への影響評価

| 機能 | 影響 |
|------|------|
| `/chatbot` | 影響なし。本 followup は signage / weather / 法改正検索 / labor RSS の revalidate のみ変更 |
| `/accidents-reports` | 影響なし。PR #252 で 30d revalidate 済み。本 followup は触れていない |
| `/strategy/plan-generator` | 影響なし。AI ルートで CDN cache (PR #253) 適用済み |

セキュリティヘッダ (CSP / HSTS / X-Frame-Options 等) と既存リダイレクト (apex→www / vercel.app→www / 旧 URL 短縮系) は `next.config.ts headers()` / `redirects()` で別管理のため、本 followup の影響範囲外。

---

## 5. ロールバック

各変更は単純な数値変更のため、本 PR の revert (`git revert <merge-commit>`) で完全に元へ戻る。副作用なし。

`proxy.ts` matcher のみ Phase 4-3 で保護ルートを実装するときに戻す必要があるが、その時点で matcher を改めて設計し直す前提のため、本 followup の値は中間状態として扱う。

---

ファイル生成日: 2026-05-19
比較対象: `docs/perf/hobby-baseline-2026-05-19.md`、`docs/perf/isr-baseline.md`、`docs/perf/isr-followup.md`
