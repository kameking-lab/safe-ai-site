# 08. SEO・流入設計（軸8）

評価: **92 / 100**（サイト最高評価軸）

## 検証で確認した強み
- **metadata 被覆率**: 高い。`src/lib/seo-metadata.ts` の `withSiteOpenGraph`/`withSiteTwitter` 共通ヘルパで title/description/canonical/OGP/Twitter を統一供給。クライアントページは `layout.tsx` でmetadata供給（Next.js正規パターン）。
  - ⚠ サブエージェントの「20ページmetadata欠落」は**誤検出**。/faq・/glossary・/diversity/women 等は layout.tsx でmetadataあり。/ky・/pdf・/about/cases・/feedback は **redirect**（metadata不要）。実害なし。
- **sitemap**: `sitemap.ts`（149静的＋動的コレクション=articles/equipment/safety-signs/circulars/illness）。`sitemap-index.xml` で分割。lastModified/priority/changeFreq 適切。
- **robots**: `/admin`・`/api`・`/auth`・`/dev`・`/handover`・`/lms`・`/api-docs`・`/dpa` を Disallow。本番ホスト `https://www.anzen-ai-portal.jp` 正。AIクローラ17種をブロック（学習利用抑止の方針）。
- **構造化データ**: root layout で **Organization＋WebSite JSON-LD（SearchAction付き＝サイトリンク検索ボックス）**。ページ別に BreadcrumbList/WebPage/FAQPage/Dataset/WebApplication/Course/Quiz/DefinedTermSet 等を `page-json-ld.tsx` から出力。網羅的。
- **内部リンク**: `RelatedPageCards` 25+ページ。検索着地後の回遊導線あり。

## 問題

### 【P2】sitemap にクエリ文字列URL
`/accidents-reports/compare?industries=construction,manufacturing` など**4本のクエリ付きURL**が sitemap に登録（sitemap.ts L30-33）。
- 検索エンジンが重複/パラメータURLとして扱い、canonical 評価が分散する軽微リスク。compare ページ本体（パラメータ無し）だけを登録すべき。
**改修（低リスク・本セッション実装）**: 該当4行を削除、または `/accidents-reports/compare` 単体に集約。

### 【P3】/audits/* 公開ページがコンテンツサイロ
- 公開維持の `/audits/*` 6ページに `RelatedPageCards` が無く、検索着地後の出口が無い。noindex で実害は限定的だが、内部リンク的に孤立。

### 【P3】コマンドパレットの人間向け検索アフォーダンス
- WebSite JSON-LD は SearchAction を宣言（→ /law-search）。一方、人間向けには⌘Kパレットがあるが「サイト内検索」という明示ラベルは弱い。

## 改修方針
- 本セッション: sitemap のクエリURL整理。
- 段階: /audits/* に関連導線、検索アフォーダンスの言語化。
