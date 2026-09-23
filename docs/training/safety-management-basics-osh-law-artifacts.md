# 安全管理の基本と安衛法 配布物の再生成

## 正本と固定条件

- Web・PPTX の投影文面は `web/src/data/safety-seminars/safety-management-basics-osh-law.json` の `stage` を正本とする。
- `narration`、`claimIds`、音声12本、ファイル名、12枚構成は変更しない。
- PPTX のノートには詳しい本文、原稿、講師補足、claim ID、条文直リンクを含める。
- PDF は更新済み PPTX から変換し、PPTX と同じ12枚を確認してから同時に公開する。

## PPTX 生成

生成スクリプトは `web/scripts/training/build-safety-management-basics-osh-law-pptx.mjs`。次の実行環境を明示する。

- `SKILL_DIR`: Presentations スキルの絶対パス
- `RUNTIME_NODE_MODULES`: `pptxgenjs` と `jszip` を含む承認済み Node.js 依存の絶対パス
- `RUNTIME_PYTHON`: 検証用 Python の絶対パス
- `TRAINING_PPTX_OUTPUT`: リポジトリ内の一時出力先。既存の公開ファイルを直接上書きしない

生成後は12枚、`12192000 × 6858000 EMU`、Yu Gothic、パッケージ整合性、見出し収まりを finalizer で確認する。さらに全12枚を画像化し、重なり、欠落、切れ、マスコットの重複がないことを目視確認する。

## PDF 同期

PDF は検証済み PPTX を同一環境の LibreOffice で変換する。12頁、タイトルメタデータ、全 `stage.headline`、私有URLがないことを確認する。PPTXだけ、またはPDFだけを更新しない。

## 2026-09-24 の再現性判定

この作業環境では PPTX 候補を12枚で生成し、構造・寸法・フォント検査まで通過した。候補の SHA-256 は `8db6803529cbf05b49c2004413384c82365f6e1c7856eeed9b3d498a88f60ab7`。

一方、承認済みランタイムに `@oai/artifact-tool` と LibreOffice がなく、全スライドの画像化とPDF変換を同じ手順で再現できなかった。このため公開中の PPTX/PDF はこのPRでは更新しない。公開中ファイルの SHA-256 は次のとおり。

- PPTX: `9a6d305c26f6101ccdcb8ebef8a55ff38fe7a3f61a8500374122ca617bfa27b3`
- PDF: `0d37f8483a91318341a01c02764e8a20b90fa14282701defed046376c364278c`

両ツールを備えたオーナー環境で、生成、全12枚の目視、PDF変換、検査を一続きで実行した後に2ファイルを同時更新する。
