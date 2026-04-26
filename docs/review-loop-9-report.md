# Review Loop 9 Report — SEO・構造化データ追い込み（新キャンペーンLoop 4）

**日付**: 2026-04-26
**通算ループ**: 9（新キャンペーンLoop 4）
**観点**: HowTo/Breadcrumb 共通化・canonical・Twitter card

## 修正前スコア
4.7 / 5.0

## 検出した問題

1. `/contact` に Twitter card と canonical が抜けていた
2. `/ky` に HowTo 構造化データなし（4ラウンド法は典型的な HowTo ターゲット）
3. `json-ld.tsx` に Breadcrumb / HowTo の共通関数なし

## 実施した修正

| ファイル | 内容 |
|---|---|
| `json-ld.tsx` | `howToSchema()` / `breadcrumbSchema()` 共通関数を追加 |
| `app/(main)/contact/page.tsx` | `alternates.canonical: "/contact"` と `twitter` メタを追加 |
| `app/(main)/ky/page.tsx` | KY 4ラウンド法を `HowTo` JSON-LD として出力、canonical 追加 |

注: `metadataBase` が root layout で `https://safe-ai-site.vercel.app` に設定済みのため、子ページの `canonical: "/path"` は Next.js が自動的に絶対URLに解決する（設計通り）。

## 残課題

- `/chatbot` の Q&A セクションに FAQPage JSON-LD（Loop 10で対応）
- `/risk-prediction`, `/risk` 等の手順を HowTo 化（Loop 7で深堀）
- Organization schema の sameAs に LinkedIn/Twitter プロフィール追加（オーナー判断待ち）

## ビルド確認
- `npm run build` クリーン

## Loop 9 後 自己採点
**4.75 / 5.0**（前 4.7 → +0.05）

リッチスニペット適合性が向上。HowTo/Breadcrumb 共通関数で次ループ以降の追加が容易に。
