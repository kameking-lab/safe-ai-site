# 安全管理の基本と安衛法 配布物の再生成

## 正本と固定条件

- Web・PPTX の投影文面は `web/src/data/safety-seminars/safety-management-basics-osh-law.json` の `stage` を正本とする。
- `narration`、`claimIds`、音声12本、公開ファイル名、12枚構成は変更しない。
- PPTX のノートには詳しい本文、原稿、講師補足、claim ID、条文直リンクを含める。内部法令ナビも配布後に使える絶対URLで記録する。
- PDF は更新済み PPTX から変換し、同じ12枚を確認してから同時に公開パスへ置く。

## 検証済みの生成手順

2026-09-24、bundled Artifact Tool / LibreOffice がないことを再確認した。一方、リポジトリ既存の `scripts/pptx-to-images.ps1` とこのホストの PowerPoint COM は利用可能だった。オーナーへの再生成依頼は不要となった。既存スクリプトに任意の `-Pdf` 出力を追加し、同一のPPTXを非表示・読み取り専用で開いて全スライドを画像化し、PowerPointのPDF書き出しを使う。

1. `load_workspace_dependencies` で承認済みランタイムを解決する。
2. 次の環境変数を設定し、`web` で `node scripts/training/build-safety-management-basics-osh-law-pptx.mjs` を実行する。`SKILL_DIR` はPresentationsスキル、`RUNTIME_NODE_MODULES` はbundled pptxgenjs/jszipの依存、`RUNTIME_PYTHON` はbundled Pythonの絶対パス。`TRAINING_PPTX_OUTPUT` はweb内の未使用の一時出力先。既存公開ファイルを直接指定しない。
3. リポジトリルートで `pwsh -NoProfile -File scripts/pptx-to-images.ps1 -Pptx <候補.pptx> -OutDir <監査画像ディレクトリ> -Width 1600 -Pdf <候補.pdf>` を実行する。PowerPointが必要。LibreOfficeへ自動フォールバックしない。
4. finalizer の12枚・寸法 `12192000 × 6858000 EMU`・Yu Gothic・パッケージ検査を確認する。実行ごとに専用の一時ディレクトリを作るので、前回の検証receiptとの衝突は起こらない。
5. 全12枚の画像を目視し、PDFも12ページを別途描画する。PDFタイトル、全ページの `stage.headline`、私有URL不在、PPTXノート12件と条URLを検査する。
6. 検査後にPPTX/PDFを既存の `web/public/training/safety-seminars/safety-management-basics-osh-law/downloads/` へ同時にコピーする。

PowerPointは画像の縦横比を保つ。表紙はシーンを全面配置して左を既存の背景で覆い、右のチワワを潰さない。限定条件は白地で読みやすい濃色へ修正した。

## 2026-09-24 の同期結果

- PPTX: 12枚 / 12ノート / 651,823 bytes / SHA-256 `a77c7c5d5b9a33e53dad9ac12cab9679374ad96cbdc78f1eb0b015c6d8aa23ce`。
- PDF: 12ページ / タイトル「安全管理の基本と安衛法｜安全AIポータル」/ SHA-256 `b6954a1991ac9e3f1e79c4ac49d97bf8d2f94f43ef7b65b8072f514795337c78`。
- 全 `stage.headline` が該当PDFページから抽出でき、欠落0。PPTXノートに第28条の2を含む e-Gov 条アンカーを確認。私有Drive URLなし。
- 全12枚を PowerPoint 書き出し画像と PDFium のPDF描画で確認。文字切れ・重なり・同一ポーズ重複なし。
- 元の公開PPTX `9a6d305c…` と PDF `0d37f848…` は本PRで更新済み。
- ローカルの描画証跡は `../seminar-review-evidence/pptx-final/` と `../seminar-review-evidence/pdf-final/`。生成画像はstorage policyに従いコミットしない。

構造検査だけをPowerPointの目視確認と混同しない。今回はPowerPointで実際に開いて書き出した画像を目視したが、スライドショーモードの実機投影は未実施。
