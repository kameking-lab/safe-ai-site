# 現場安全看板ライブラリ Production結果

基準日: 2026-08-28 JST

## リリース

- Production URL: `https://www.anzen-ai-portal.jp/materials/safety-images`
- Deployment: `dpl_CKyCHVBQTZ7785EX9JBbcBjsGe9e`
- Preview: `dpl_8amGBS3RVwXokJQV7A77LyCEe5aL`
- 直前Production / rollback: `dpl_75mTcJCSfgxc6ch9LRJz72vHZNYP`
- release tag: `production-safety-sign-library-20260828`

## 公開内容

- 市場調査198商品・8事業者から100テーマを確定し、複数事業者確認は84テーマ。
- 文字なしクリーンマスター100点、最適化preview 100点。生成137回、再生成37回、独立QA例外承認の3回生成は3点。
- 独立QA 100/100 PASS。棒人間0、SVG人物0、埋込み文字0、外部画像・外部ロゴ0。
- 日本語、英語、ベトナム語、中国語簡体、インドネシア語の500文言。公式確認は日本語4・外国語20で、残る外国語はバックトランスレーション済み・native未確認と表示。
- 任意文字、数値・単位、文字位置・サイズ・背景帯、チワワ・©を後付け編集。JPEG/PNG/PDF、13サイズ、300dpi設定に対応。
- 旧低品質100点は一覧・検索・download・sitemapから除外し、旧172 asset URLを301/410/404で安全に処理。

## Gateとsmoke

- full gate: TypeScript PASS、ESLint error 0、Vitest 7,585 PASS / 2 SKIP、Playwright 280 PASS / 1 SKIP、production build 3,444 pages、npm audit 0、secret/PII scan 0。
- Preview: 全path noindex/nofollow/noarchive、robots Disallow、Analytics/RUM/Service Worker停止、メールdry-run、Production不変を確認。320/390/768/1024/1440px、400%相当、5言語、no-JS、console/asset error 0。
- Production: hub/detail 100、original 100、preview 100、download HEAD 300、size 13、実JPEG/PNG/PDFと編集PDF、privacy-safe filename、WAF 429を確認。
- Lighthouse: mobile 87 / accessibility 100 / best practices 100 / SEO 100、desktop 100。
- 独立レビュー: P0 0、P1 0、公開阻害P2 0。rollback未実施。
