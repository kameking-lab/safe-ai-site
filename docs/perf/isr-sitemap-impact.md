# Sitemap への影響 (2026-05-20)

## 変更内容
6 ルートの `export const revalidate` のみ変更。`generateStaticParams` / `dynamicParams` は無変更。
- accidents-reports/[industry]: 5 URL (建設・製造・運輸・医療福祉・サービス) — 変化なし
- industries/[industry]: 10 URL (10業種) — 変化なし

## sitemap.xml への影響
**なし**。

- `web/src/app/sitemap.xml/route.ts` (静的 sitemap) または個別 sitemap-* は URL 列挙のみ。
- ISR 周期 (revalidate 値) は sitemap 出力に含まれない。
- `<lastmod>` 値も無変更 (これらは別途 datePublished / dateModified から生成される)。

## クローラへの影響
- Googlebot / Bingbot は HTTP 200 + 同じ HTML を受け取る。
- `Cache-Control` 等の HTTP ヘッダは Next.js のデフォルト挙動 (s-maxage が revalidate と同期) なので、CDN-cached 期間が延びる。
  - 旧: `s-maxage=86400` 相当 (1d)
  - 新: `s-maxage=2592000` 相当 (30d)
- Edge Cache hit rate 向上 → Origin 負荷低減 → Lighthouse TTFB スコアにも僅かにプラス。
