# Review Loop 4 Findings — SEO / 構造化データ

**日付**: 2026-04-25  
**前ループ**: Loop 3（UX・A11y）スコア 3.1→3.3  
**観点**: OGP欠落・FAQPage JSON-LD・BreadcrumbList

---

## 修正前スコア

Loop 3 後: **3.3 / 5.0**

主要マイナス要因（Loop 4 対応分）:
- laws/* 3 ページ・diversity/* 9 ページ（計 12 ページ中 10 ページ）に `openGraph` / `twitter` が未設定
  → SNS シェア時にカード画像なし、SEO スニペット不一致
- pricing ページの FAQ セクション（7 問）が `FAQPage` JSON-LD 化されておらず
  → Google リッチリザルト（FAQ カード）の機会損失
- ScaffoldPage を使う全ページで `BreadcrumbList` JSON-LD なし
  → Google の検索結果にパンくずリストが出ない

---

## 実施した修正

### 1. OGP（openGraph / twitter）を 10 ページに追加

`ogImageUrl(TITLE, DESCRIPTION)` を使い、`openGraph.images` と `twitter.images` を追加。
これで全ページが `/api/og?title=...&desc=...` で動的 OG 画像を出力する。

| ページ | 追加内容 |
|---|---|
| `laws/bcp` | openGraph + twitter |
| `laws/freelance-rosai` | openGraph + twitter |
| `laws/gig-work` | openGraph + twitter |
| `diversity/disability` | openGraph + twitter |
| `diversity/elderly` | openGraph + twitter |
| `diversity/foreign-workers` | openGraph + twitter |
| `diversity/lgbtq` | openGraph + twitter |
| `diversity/non-regular` | openGraph + twitter |
| `diversity/remote` | openGraph + twitter |
| `diversity/sogi` | openGraph + twitter |

スキップ（client component のため export metadata 不可）:
- `glossary/page.tsx`（"use client"）
- `diversity/women/page.tsx`（"use client"）

### 2. pricing ページに FAQPage JSON-LD を追加

7 問の Q&A を `FAQPage.mainEntity` として `<script type="application/ld+json">` に出力。
Google の FAQ リッチリザルトの対象ページになり、SERP での視認性向上が期待できる。

### 3. ScaffoldPage に BreadcrumbList JSON-LD を追加

`canonicalPath?: string` プロップを追加。指定があれば以下の 3 段構成の BreadcrumbList を出力：
```
ANZEN AI（/）→ [セクション名]（backHref）→ [ページタイトル]（canonicalPath）
```

`backLabel` の末尾「に戻る」を除去してセクション名に変換（例：「法改正一覧」）。

laws 3 ページ・diversity 7 ページの計 10 ページに `canonicalPath` を設定済み。
ScaffoldPage を使う既存の education/tokubetsu・roudoueisei 系ページは利用していないため
それらは次ループで対応可能（任意）。

---

## 本番デプロイ確認

- `tsc --noEmit` クリーン
- `npm run lint` — 新規エラーなし（10 pre-existing errors は別件）
- git push → Vercel 自動デプロイ済み（main @ 3b4c3f5）

---

## Loop 4 完了後の自己採点

| 観点 | Loop 3 後 | Loop 4 後 | コメント |
|---|---|---|---|
| 法的正確性 | 4.0 | 4.0 | 変化なし |
| 情報設計 | 3.5 | 3.5 | 変化なし |
| 文言トーン | 3.0 | 3.0 | 変化なし |
| 価格・ビジネス訴求 | 2.5 | 2.5 | 変化なし |
| **SEO・メタデータ** | **2.7** | **3.7** | **OGP 全ページ統一・FAQPage・BreadcrumbList 追加** |
| UX | 3.7 | 3.7 | 変化なし |
| アクセシビリティ | 3.5 | 3.5 | 変化なし |
| 競合比較 | 3.0 | 3.0 | 変化なし |
| データ品質 | 3.5 | 3.5 | 変化なし |
| 法務地雷 | 2.7 | 2.7 | 変化なし |
| セキュリティ | 3.5 | 3.5 | 変化なし |
| 受注視点 | 3.0 | 3.0 | 変化なし |

**Loop 4 後 総合スコア: 3.5 / 5.0**（前 3.3 → +0.2）

---

## Loop 4 で残った課題（ループ5へ）

### 優先度 HIGH

1. **特商法・プライバシーポリシーの紋切り型表現**  
   `/about`（特商法）は既に充実済み。`/privacy` も十分具体的。残課題は軽微。

2. **signage ページのタッチ最適化**  
   サイネージページはPC前提のフルスクリーン表示。スマホタッチが未最適化。

### 優先度 MEDIUM

3. **education 詳細ページに BreadcrumbList を追加**  
   ScaffoldPage 以外の独自レイアウト（tokubetsu/roudoueisei 系 12 ページ）も JSON-LD なし。

4. **services ページの特別教育根拠条文（安衛法 第59条）にe-Gov直リンク追加**  
   bullets が plain string のため、コンポーネント改修が必要。

5. **glossary・diversity/women の OGP**  
   "use client" コンポーネントのため `metadata` エクスポートが使えない。
   layout.tsx での OGP 設定、または静的 metadata を持つ Server Component ラッパーへの分割が必要。

### 優先度 LOW

6. **BearMap・Risk ページの構造化データ（LocalBusiness / Place）**
7. **sitemap.xml に lastmod・priority を追加**

---

## 次に実施すべき優先順位

1. glossary・women の OGP 対応（layout.tsx またはラッパー方式）
2. education 詳細 12 ページへの BreadcrumbList 追加
3. signage タッチ最適化
