# 建設計算・研修・安全看板 横断レビュー

基準日: 2026-08-28 JST
レビュー開始時Production: `dpl_75mTcJCSfgxc6ch9LRJz72vHZNYP`
修正後Production正本: `dpl_CKyCHVBQTZ7785EX9JBbcBjsGe9e`

## 結論

- 横断判定: GO。open P0 0、open P1 0、計算式・単位・丸め・教材事実の未解決P2 0。
- Productionで19主要route、12計算、研修2教材、看板100詳細、sitemap・canonical・robots・heat noindex・相談状態を確認した。
- 安全看板「一方通行」の曖昧な原本を独立レビューでP1と判定し、方向矢印と進行車両が一致する原本へ交換した。
- 単純修正は、計算A11Y・offline・履歴範囲・丸め説明・PDF文言・鉄筋概算警告、教材summary正本化、看板SEO・翻訳開示、smoke偽陽性の10件。
- 修正後の独立再レビューはP0 0、P1 0、公開阻害P2 0でGO。非阻害の改善P2は3件。本番横断smoke 258/258、関連Playwright 15/15、看板browser/download/WAF smokeを通過した。

## 建設計算ツール（94点）

良い点: 12計算が明示ボタン、同一純粋関数、式・単位・仮定・概算境界で統一される。31日端末履歴はサーバーへ送らない。高リスク構造・安全判定0。
課題: モバイル低速時の追加計測、12routeすべてのoffline直接assert、error-summary fallback test、CSVの機械可読性説明、結果cache方針。
修正済み: 日本語エラー、ARIA/focus、route別preload、slug限定履歴削除、±∞丸め表示、PDF保存文言、鉄筋真円概算警告。
残す改善案: 追加のテスト範囲とcache header計測。
最優先の次タスク: 全12route offline matrix。

## 安全研修・AI実務研修（94点）

良い点: 各20枚・音声・字幕・原稿・PPTX/PDFを共通データから公開。安全研修は法定教育代替でない境界が明確。AI研修は製品中立・一次資料確認・人間確認を一貫表示。
課題: 安全研修PDF約14.4MB、一部公式sourceのbot 403、音声の低速回線計測、download size budget、外部source healthのブラウザー併用。
修正済み: 墜落研修slide 20の3要点をJSON正本化し、生成contractを追加。
残す改善案: 視覚品質を落とさないPDF再圧縮と公式source定期監査。
最優先の次タスク: PDF size budget付き再圧縮検証。

## 現場安全看板ライブラリ（90点）

良い点: 198商品・8事業者を基に100テーマを確定。100点すべて文字・外部ロゴ・棒人間・SVG人物0で独立QA済み。5言語、数値・ブランド編集、13サイズ、JPEG/PNG/PDFをオンデマンド生成する。
課題: mobile Lighthouse 87、販売証拠URLの2事業者集中、一部複雑場面の即読性、翻訳native review未実施、カテゴリ横断の画風均一化。
修正済み: 一方通行P1原本、利用条件title、公式確認24（日本語4・外国語20）の透明な表示。
残す改善案: 測定型performance改善、メーカー一次URL追加、限定art pass、native review。
最優先の次タスク: mobile LCP内訳の実測と画像delivery改善。

詳細findingは `current-three-services-findings.json`、点数は `current-three-services-scorecard.csv`、release結果は `current-three-services-production-result.md` を正本とする。
