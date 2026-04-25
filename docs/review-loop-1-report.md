# Review Loop 1 Report — Critical bugs & data quality

**日付**: 2026-04-25
**対象**: Chrome R9 激辛レビュー (2.7/5.0) → Loop 1 修正
**観点**: データ品質・致命的バグ・数字不整合

---

## 修正前スコア

R9: **2.7 / 5.0**

主要マイナス要因（Loop 1 関連）:
- 統計数字（504,415 / 4,043 / 268 / 1,389）が複数ファイルでハードコード散在
- handover ページの「化学物質 1,389 件」が事実誤認（実際は 3,984 件）
- accidents ページの description は "268件" を謳うが、JSON-LD には 86 件分しか出力していない
- chatbot 共有ビュー: 入力長制限ゼロ、JSON 構造検証ゼロ → 巨大ペイロード DoS / 不正 JSON でレンダリング異常の可能性
- chatbot 共有ビューが noindex 指定なし → クロール対象になり、共有 URL が検索結果に露出するリスク

---

## 実施した修正

### 1. SITE_STATS の単一情報源化（4 数字を集約）

`web/src/data/site-stats.ts` に以下を追加：
- `mhlwDeathsCount: "4,043"`（厚労省 死亡災害 DB・2019〜2023 5年分）
- `siteCuratedCaseCount`（real-accident-cases* 5 ファイルの自動集計＝ 268 件）
- `chemicalsMhlwCount: "3,984"`（厚労省 化学物質情報 DB）

`SITE_STATS_META` にも全項目の出典・取得日を追加。

### 2. ハードコード 8 箇所を SITE_STATS 参照に置換

| ファイル | 修正箇所 |
|---|---|
| `app/(main)/accidents/page.tsx` | description 504,415/4,043/268 |
| `app/(main)/about/page.tsx` | STATS の死亡災害 4,043 |
| `app/(main)/handover/page.tsx` | 化学物質 1,389→3,984、死亡労災 R5 行を新設 |
| `components/home-screen.tsx` | 事故 DB タブラベル 3 個 |
| `components/mhlw-accident-search-panel.tsx` | ヘッダー・フォールバック説明 3 箇所 |
| `components/mhlw-accident-analysis-panel.tsx` | 出典脚注 2 箇所 |
| `components/accident-analysis-panel.tsx` | DataDisclaimer の N=504,415 |
| `components/ky-page-content.tsx` | RelatedPageCards 説明文 |

### 3. 事故 DB 正規化 — accidents/page.tsx の JSON-LD を全集合に

修正前: `realAccidentCases` のみ（86 件）を `newsArticleListSchema` に投入していたため、
description で謳う「サイト収録 268 件」と一致せず、構造化データの不整合あり。

修正後: `getAccidentCasesDataset()` を使用し 5 ファイル合算（86+81+40+43+18 = 268 件）を全件出力。

### 4. chatbot 共有ビュー — 入力検証を実装

`web/src/app/(main)/chatbot/share/[id]/page.tsx`:
- `id` の最大長を 16 KB に制限
- メッセージ件数を最大 200 に制限
- 各メッセージの本文を最大 8,000 文字に制限
- ソース引用を最大 20 件・各 200/2,000 文字に制限
- `escape(atob(id))` の deprecated パターンを `TextDecoder("utf-8", { fatal: true })` に置換（不正 UTF-8 で失敗するように）
- ロール `r` を `"u" | "a"` に厳格化
- `metadata.robots = { index: false, follow: false }` を追加（共有 URL が検索結果に露出しないように）

### 5. handover ページの事実誤認を修正

化学物質「1,389 件」→「3,984 件」（実際の `chemicals.jsonl` 行数と一致）。
死亡労災（R5・建設業）1,389 件は別行として明示。

---

## 本番デプロイ確認

- `npx next build` 成功（全 51 ページ・全 38 API ルートが prerender）
- `npm run lint` — 修正したファイルに新規エラー無し（既存の language-context.tsx 由来 10 errors は別件）
- コミット & push 後、Vercel 本番デプロイで `/accidents`, `/chatbot/share/<id>`, `/handover?key=...`, `/about`, `/ky` の curl 確認

---

## Loop 1 完了後の自己採点

| 観点 | Loop 1 前 | Loop 1 後 | コメント |
|---|---|---|---|
| 法的正確性 | 3.0 | 3.0 | 変化なし |
| 情報設計 | 2.5 | 3.0 | 数字の出典統一・SITE_STATS 集約で誠実度↑ |
| 文言トーン | 3.0 | 3.0 | 変化なし |
| 価格・ビジネス訴求 | 2.5 | 2.5 | 変化なし |
| SEO・メタデータ | 2.5 | 2.7 | chatbot 共有 noindex 化 |
| UX | 2.5 | 2.5 | 変化なし |
| アクセシビリティ | 2.5 | 2.5 | 変化なし |
| 競合比較 | 3.0 | 3.0 | 変化なし |
| **データ品質** | **2.0** | **3.5** | **化学物質誤記訂正・JSON-LD 完全化・SITE_STATS 単一情報源化** |
| 法務地雷 | 2.5 | 2.5 | 変化なし |
| **セキュリティ** | **2.5** | **3.5** | **chatbot 共有の入力検証・長さ制限・noindex 追加** |
| 受注視点 | 3.0 | 3.0 | 変化なし |

**Loop 1 後 総合スコア: 2.9 / 5.0**（前 2.7 → +0.2）

データ品質とセキュリティは Loop 1 の重点だったため底上げ。文言・UX・SEO は次ループ以降。

---

## Loop 1 で残った課題（次ループ以降）

- 教育詳細ページの統一不足（11 ページ間の構造差）
- 法的根拠リンクが本文中に少ない（指摘 #5 由来）
- モバイル 375px での KY 入力欄密集（指摘 #15 由来）
- 構造化データの拡張（FAQPage, BreadcrumbList が一部のみ）
- 特商法・プライバシーポリシーの紋切り型表現
