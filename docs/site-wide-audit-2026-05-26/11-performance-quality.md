# 11. パフォーマンス・技術品質（軸11）

評価: **88 / 100**

## ベースライン（本監査で実測）
- `npm run build`: ✅ 成功（exit 0）
- `npm run test`: ✅ **939件 / 115ファイル 全pass**（35.4s）
- TypeScript strict・any禁止運用は CLAUDE.md 準拠。lint 運用あり。

## 強み
- **静的化**: 大半のページが Static / SSG プリレンダリング。動的は server-rendered on demand（事故詳細・記事等）。
- **サイトマップ規模健全**: 静的149＋動的コレクション。`sitemap-index.xml` で分割（クローラ負荷分散）。
- **画像/OGP**: `ogImageUrl` で動的OG生成。
- **a11y**: skip-link、`aria-*`、フォーカスリング、ハイコントラスト/文字大トグル。WCAG配慮が広範。

## 留意点（実測ではなくコード観察ベース）
- **Lighthouse 実測は本監査では未取得**: 本番URLは外部到達制約（prior audit と同じ 403 想定）、ローカルLighthouseは dev サーバ起動が必要で本セッションでは未実施。CLAUDE.md 目標（Perf90+/A11y90+）の継続監視を推奨。
- **recharts の重量**（前回監査指摘）: `/accidents-reports` 詳細のチャート凡例がモバイルで重い可能性。該当は機能内部課題（本監査=全体最適の範囲外）。
- **client component 多用**: ナビ・ホーム主要要素が "use client"。ハイドレーション量は許容だが、トップの FlagshipGrid/HomeThreePillars 等は将来 RSC 化でJS削減余地。

## ビルドコストの観点
- 本監査の実装（命名統一・フッター追記・sitemap整理）は**新規依存・新規ページ・重い処理を増やさない**ため、ビルド時間/Vercelコストへの増分は実質ゼロ。

## 改修方針
- 定期 Lighthouse 測定の運用化（段階）。本監査スコープの実装はパフォーマンス中立。
