# 現場安全看板ライブラリ 現行状態

基準日: 2026-08-28 JST

## 公開候補

- 市場調査: 198商品、8事業者
- 確定テーマ: 100件（複数事業者確認 84件）
- 文字なしクリーンマスター: 100点、最適化WebPプレビュー: 100点
- 画像生成: 137回（再生成 37回。通常最大2回、独立QA是例外承認 3点のみ3回）
- 独立QA: 100/100 PASS、棒人間0、SVG人物0、埋込み文字0、外部ロゴ0
- 言語: 日本語・英語・ベトナム語・中国語簡体・インドネシア語（500文言、公式確認 24文言）
- 翻訳表示: ネイティブ確認済みとは表示しない

## 実装

- 一覧: `/materials/safety-images`
- 詳細: 静的100 URL、カテゴリ7 URL
- 編集: 文字、5言語、数値・単位、文字位置・サイズ・背景帯、ブランド表示
- 出力: JPEG・PNG・PDF、A4・A3・市場サイズ13種、300dpi設定
- privacy: 編集文字はURL・ファイル名・analytics・RUM・ログへ送らず、POST本文だけで処理
- rights: 安全AIポータル作成／商用利用可／加工可。法定・JIS適合品の代替とは表示しない
- legacy: 旧詳細は意味対応する301または410、旧画像・pilotは非公開

## 正本

- 市場: `docs/audits/current-safety-sign-market-inventory.csv`
- 生成: `web/src/data/safety-image-library/generation-ledger.json`
- QA: `docs/audits/current-safety-sign-qa.csv`
- 翻訳: `web/src/data/safety-image-library/translation-registry.json`
- レイアウト: `web/src/data/safety-image-library/layouts.json`
