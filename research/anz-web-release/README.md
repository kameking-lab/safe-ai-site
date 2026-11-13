# 安全AI Web公開準備の検証記録

2026-11-13 / `cx/anz-web-release-20261113`

ローカルの `next build --webpack` と `next start` で画面を確認した記録です。外部AI・DB・課金サービスには接続していません。チャットの本文は画面検証用のモックです。

## 画面

- PC: 1440 × 1000。`chemical-ra-pc.png`、`chatbot-initial-pc.png`、`chatbot-streaming-pc.png`、`chatbot-complete-pc.png`。
- iPhone幅: 390 × 844。`chemical-ra-iphone.png`、`chatbot-initial-iphone.png`、`chatbot-streaming-iphone.png`、`chatbot-complete-iphone.png`。
- ブラウザはChromium。iOS実機の検証ではありません。
- 化学RAはトルエン・液体・中量・窓／換気扇・1日8時間・週5日。粉体は対象外として選択不可、リスク結果まで確認。
- 法令チャットは送信先とプライバシーリンクが一行で表示され、追加チェックボックス・同意ダイアログなしで送信。長文の受信中も文頭を維持し、横にはみ出さないことを確認。
- 初期スクリプトの `js-enabled` クラスが失われても、初期化済みのチャットが見えることを確認。

## ストリーミングと費用処理

`web/src/app/api/chatbot/stream/route-streaming.test.ts` は実際のRoute Handlerを読み、Gemini SDKと費用台帳だけをモックにしています。最初のtext受信時点で最終生成チャンクが未到着であること、精算の完了前には確定metaを返さないこと、中断で生成を止めて精算を待つことを検証しています。

ブラウザの別モックは約41msで最初の本文、約4秒で完了。受信途中のスクリーンショットと、最終チャンク到着前の描画を検証しています。数値と文頭の座標は `browser-pc.json` と `browser-iphone.json` に記録しています。

## 検証結果と残件

- 最終ビルド成功。静的ページ3,486件。
- 最終E2E: 25件成功（`anz-web-release`、`chemical-ra`、`ai-safety-boundary`、`chatbot` のJavaScript有効時）。
- 関連単体テスト: 40ファイル678件成功。チャットページの追加確認: 3ファイル10件成功（重複を含む）。
- 全体単体テスト: 8,504件成功・13件失敗・2件スキップ。失敗は `legal-extractive-answer.test.ts` の既存13件。`origin/main` のソースを直接読み込む比較実行でも同じ13件が失敗。詳細は `baseline-test-summary.json`。
- 拡張確認したJavaScript無効時の既存E2E 2件はローカル本番環境で503。設定を緩める変更はしていません。
- 実際のGemini応答は未確認。オーナーの公開判断後にClaudeがPreviewで確認する既定の手順へ引き継ぎます。

実行スクリプトとログ: 実行フォルダの `tools/aw-1/`。
作業レポート: 実行フォルダの `reports/aw-1.md`。

## 生の証跡の保全先（aw-3）

画像8件・JSON3件は、実行フォルダの `tools/aw-3/evidence/anz-web-release/` に保全しました。リポジトリの保存規則に従い、ここには要約とSHA-256を残します。ファイル名だけの参照はこの保全先を指します。移動前後のバイト一致を確認済みです。

| ファイル | バイト | SHA-256 |
| --- | ---: | --- |
| `baseline-test-summary.json` | 2860 | `ae625fb197c3f363909374c103a769c9be1bba104e36b7ef47caa564b4c932a4` |
| `browser-iphone.json` | 353 | `51aea6533ee327c0fe36aca195d887dec52e6e6d6428943c01a3848a5757ba86` |
| `browser-pc.json` | 339 | `547fddea0621bfd017df4bf4b80bbb27a2a93b7cc9f73df3858796813054bbc7` |
| `chatbot-complete-iphone.png` | 49068 | `c0999306ef0c56ea4d0e366bdf179800ff6b206665e1458d99d41fc1f913e7db` |
| `chatbot-complete-pc.png` | 93466 | `144738be3046cb852efc30bd800b7b95c354fd6b8b9a93390a54a29494358a3e` |
| `chatbot-initial-iphone.png` | 42002 | `0020d32d33a4c06562afcf80e91180603e0e4a59212b4d98b307486cab1b4c9a` |
| `chatbot-initial-pc.png` | 87129 | `2177d01e2664f532b24abd529b4b3f986e896bbda1fbd4da03d9bbed98c5cb6c` |
| `chatbot-streaming-iphone.png` | 38843 | `b53540334a410f393cf42d2b45b3fb7019afd5092cb88d27a30faf26669b95b9` |
| `chatbot-streaming-pc.png` | 88799 | `ab671c06a9dac92a6619e2fda312a425cced1a78339b62980169858b487cd806` |
| `chemical-ra-iphone.png` | 571774 | `338e22d4fa4473b60f5073935f6728a613502aebc730a0da9239c518bb601df2` |
| `chemical-ra-pc.png` | 603351 | `00a5a4465be2cbdc512b20304605fc5de7a75a348a6c9d3f6255d89c9cd65429` |
