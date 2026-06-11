# 外部酷評レビュー 2026-06-11 — 調査方法

独立インスタンス（Fable 5）による本番 https://www.anzen-ai-portal.jp/ への外部視点レビュー。
本体working tree不触・本番URLに対する読み取り専用調査のみ。ローカルビルド・テスト実行なし。

## 測定手段（すべて2026-06-11実施）
1. **全ルート列挙**: robots.txt → sitemap-index.xml → sitemap.xml(2,412 URL) + sitemap-articles(31) + sitemap-circulars(15) + sitemap-equipment(39) = ユニーク2,497 URL。
2. **HTTP一斉スイープ**: 全2,497 URLにGET（並列8）→ 状態コード・応答秒。
3. **メタ一斉抽出**: 非バルク全URL＋バルク(circulars/equipment/safety-signs)サンプル＝232 URLのSSR HTMLから title/description/canonical/OGP/JSON-LD/h1/SSRテキスト量 を機械抽出（scripts/meta-audit.mjs）。
4. **UXプロファイル**: Playwright(chromium)で主要17ルート × iPhone390×844/デスクトップ1280×800 を実機描画し、ページ高・リンク/ボタン数・40px未満タップターゲット数・12px未満文字・横スクロール・固定オーバーレイ・h1可視化時間・初期ビュー文字量を計測（scripts/page-profile.cjs）。
5. **Lighthouse 13.4.0**: 主要14ページ × モバイル/デスクトップ＝28本実測。
6. **ペルソナ実機操作**: 5ペルソナの「今日の用事」をPlaywrightで実操作・秒数とタップ数を記録。

## 表記
- 各指摘＝「症状(事実・測定値) → 実害 → 技術的な直し方 → 規模感(S/M/L)」。
- 事実と意見を区別。測定値は上記手段による実測。「〜と感じるはず」等は**意見**と明記。
- 重大度: S=放置するとユーザー/検索流入を恒常的に失う、A=主要動線の明確な摩擦、B=品質基準割れ、C=磨き残し。
