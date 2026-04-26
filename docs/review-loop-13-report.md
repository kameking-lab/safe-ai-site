# Review Loop 13 Report — パフォーマンス（新キャンペーンLoop 8）

**日付**: 2026-04-26
**通算ループ**: 13（新キャンペーンLoop 8）
**観点**: Core Web Vitals・バンドル・画像・キャッシュ

## 修正前スコア
4.85 / 5.0

## 主な検出問題

A. **/api/og に Cache-Control ヘッダーなし** → OG画像が毎回再生成、SNS clawler に遅延
A. **mhlw-law-articles-panel の遅延読み込み未確認** → 実は law-search-panel.tsx で `dynamic()` ラップ済み（誤検出）
B. **大型JSONインポート**（chemicals 1.0MB / deaths 2.4MB / laws 0.9MB） → サーバーサイドでのみ参照されており、Next.js の自動 chunk 分割に委ねる方針
B. **useCallback 不足** → 個別箇所多数、影響軽微
C. **Recharts 動的読込** → 既に dynamic 化済み

## 実施した修正

| ファイル | 内容 |
|---|---|
| `web/src/app/api/og/route.tsx` | `ImageResponse` の `headers` に `Cache-Control: public, max-age=86400, s-maxage=604800, immutable` を追加。クライアント24h・CDN7日キャッシュで OG 画像取得を高速化 |

## 確認事項

- `MhlwLawArticlesPanel` は既に `dynamic()` で遅延読込（law-search-panel.tsx L11-14, L273） → A-1 は誤検出
- 大型JSONはサーバーAPI経由で消費、クライアントバンドルに含まれない → 影響限定的
- `next/image` は全サイト導入済、`priority` は LCP 画像のみ

## 残課題

- Lighthouse CI を CI/CD に統合（未整備）
- `dynamic-images` バリエーション（モバイル/PC で異なる画像）
- Service Worker 検討（オフライン対応含む）

## ビルド確認
- `npm run build` クリーン

## Loop 13 後 自己採点
**4.87 / 5.0**（前 4.85 → +0.02）

OG画像キャッシュで SNS シェア時の表示速度が改善。大型バンドル系は既に最適化済みで、構造的改善余地は限定的。
