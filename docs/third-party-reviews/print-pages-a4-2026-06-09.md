# 第三者レビュー: 各印刷ページ（WBGT結果／順化計画／緊急時対応ポスター）A4実機プレビュー

- 日付: 2026-06-09
- 対象: `/heat-illness-prevention/poster`（緊急時対応ポスター）／`/heat-illness-prevention/wbgt-calculator`（WBGT結果）／`/heat-illness-prevention/acclimatization`（暑熱順化 計画・記録書）
- 軸: 軸2（既存機能を第三者目線で使いやすく）／印刷物の実務品質
- 方式: Playwright（Chromium）で実データ入力 → `emulateMedia("print")` ＋ `page.pdf({format:"A4", preferCSSPageSize:true})` でA4実機プレビュー。PDFの `/Count` と各要素の bounding box で「枠線切れ・1枚に収まらない」を実測。

## ペルソナ
**桑原さん（48歳・地場ゼネコンの作業所 元請安全担当）**
- 熱中症ポスターは現場の詰所・各フロアに「A4で1枚ずつ」貼る。プリンタは現場の複合機。
- 「印刷ボタンを押したら、貼れる1枚がそのまま出てほしい。白紙が一緒に出てくると紙とトナーの無駄で、新人がポスターと白紙を間違えて貼る」。
- 順化計画は作業者ごとに1枚にまとめて本社へ提出。「表の途中で行が真っ二つに切れて次のページに渡ると、何日目の記録か分からなくなる。提出書類として失格」。
- 性格的にプレビューを必ず確認するタイプ。少しの崩れも見逃さない。

## 指摘（実測）
1. **【致命/ポスター】緊急時対応ポスターが2ページに分かれて印刷される。**
   現場名・連絡先を実際の長さ（例:「△△地区 連続立体交差 第3工区 高架橋上部工事」等）で入れると、ポスター本体は1ページ内（高さ約939px / A4印刷可能高さ約1009px）に収まっているのに、`page.pdf` の `/Count` は **2**。原因は (main) レイアウトのコンテンツラッパー（`PageContainer` の `py-6 sm:py-8` ＝上下24〜32px ＋ `#main-content > div` の `flex-1` による縦ストレッチ）。印刷時もこの縦パディング／引き伸ばしが残り、コンテンツ末尾の空白がそのまま2ページ目（ほぼ白紙）として排出されていた。**ポスターは1枚で貼るものなので、白紙の2枚目は実務上の明確な欠陥。**
2. **【順化計画】長い計画で表の行が改ページ位置で上下に切れる（枠線切れ）。**
   「＋日数を追加」で16日計画にすると2ページになり、16行目が改ページ境界で分断され得た。`tbody tr` に改ページ抑止（`break-inside: avoid`）が無く、見出し行の各ページ再表示（`thead { display: table-header-group }`）も明示されていなかった。
3. WBGT結果ページは入力欄が `print:hidden` で結果＋推奨対策＋出典のみ印刷され、1ページに収まっており崩れなし（健全）。横はみ出しは3ページとも0px。

## 改善（印刷専用・画面表示は不変）
- `web/src/components/layout/page-container.tsx`：`PageContainer` の縦パディングに `print:py-0` を追加。印刷時はページ余白を `@page`（15mm）が担うため、コンテナの縦パディングを詰める。**全印刷ページ共通**で末尾の白紙2ページ目を防止。
- `web/src/app/globals.css`（`@media print` 内）：
  - `#main-content, #main-content > div { flex: none; min-height: 0; }` ＝ 画面用の `flex-1`/`min-h-full` ストレッチを印刷時に解除し、ラッパーをコンテンツ高に縮める（白紙2ページ目の根本原因を是正）。
  - `table { page-break-inside: auto } / thead { display: table-header-group } / tr { page-break-inside: avoid }` ＝ 表の行が改ページで切れない・見出し行を各ページ先頭で繰り返す。順化計画など全ての印刷表に適用。
- いずれも `@media print` または `print:` バリアントのみ。画面表示・保存・CSV は不変。新規依存0・スキーマ不変・コンポーネントのロジック不変。

## 再レビュー（A4プレビュー再実測）
- ポスター（同じ長文データ）: `page.pdf` `/Count` = **2 → 1**。詰所に貼れる1枚がそのまま出力。白紙の2枚目は消失。横はみ出し0px。（docs/third-party-reviews/print-pages-a4-poster-after-2026-06-09.png）
- WBGT結果: 1ページ維持・崩れなし。
- 順化計画（16日）: 2ページ（16行＋様式で1枚に収まらないのは正当）。`tbody tr` の `break-inside` 計算値 = **avoid**（行が改ページで分断されない）、見出し行は各ページ先頭で再表示。
- 桑原さん「印刷を押したら貼れる1枚がそのまま出る。順化表も行が切れずに2枚目へ続く。これなら提出できる」＝採用ライン到達。

## ゲート
- `npx tsc --noEmit` = エラー0／`npm run lint` = errors0（warning47=既存）／`npx vitest run` = 1114 pass／`npm run build` = 成功。
- 再生成データ（chatbot-eval-fresh-results.json / rag-metrics-latest.json）は `git checkout --` で復元。temp（_print_review.mjs 等）削除済。
- 架空0・水増し0・既存破壊0。env/DB変更なし。main直接コミットなし（review/print-pages-a4-2026-06-09 ブランチ）。
