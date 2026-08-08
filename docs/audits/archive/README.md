# 監査 archive の運用

このディレクトリは、法的・安全上重要で、現行要約だけでは将来の判断根拠を失う過去情報を小さく統合して残す場所です。日付別 report や raw evidence の永久保存庫ではありません。

## 現行正本

- `../current-state.md`
- `../current-findings.json`
- `../current-production-result.md`
- `../../maintenance/storage-policy.md`

通常の監査は上記を上書きします。archive を追加するのは、法源・安全境界・production rollback・重大 finding の経緯を現行版から除く必要がある場合だけです。

## 保存してよい内容

- 対象日時と Deployment ID
- production 対応 commit・annotated tag・rollback ID
- SHA-256 checksum または checksum manifest
- 最終判定と P0/P1 の主要 finding
- 法源 snapshot の取得元・取得日・hash
- 削除・repo 外移動した raw evidence の種類と処置

## 保存しない内容

- screenshot、動画、Playwright/Lighthouse trace、HAR、coverage
- console log、raw HTML dump、失敗 run の全出力
- `.next`、test output、cache、local snapshot、`node_modules`
- 秘密値、`.env*`、token、証明書、PII、生の会話履歴
- 現行 summary と同じ内容の日付違い複製

## Raw evidence 処分記録の必須項目

raw を削除または repo 外へ一世代 archive するときは、次の metadata を `current-state.md` または小さな JSON manifest に残します。

| 項目 | 形式 |
| --- | --- |
| `createdAtJst` | ISO 8601（JST） |
| `deploymentId` | `dpl_...` |
| `sha256OrManifest` | SHA-256、manifest path、または理由付き `not-computed` |
| `finalDecision` | PASS / FAIL / ROLLED_BACK |
| `majorFindings` | 高重要度 finding の短い要約 |
| `rawEvidenceTypes` | screenshots / trace / HAR / logs / HTML / coverage 等 |
| `disposition` | deleted / archived-one-copy / retained-review-required |

archive 自体も最小限とし、同じ bytes を snapshot、zip、Git の複数箇所に残しません。不明な資料は削除せず `REVIEW_REQUIRED` とします。

## 現行の法源保存manifest

`legal-source-preservation-manifest.json` は、runtimeで使う法令全文・法令metadata・確認済み通達・周辺法令snapshotを、ファイル数・bytes・集約SHA-256で固定します。個別file hashをpath順に連結したmanifest文字列のSHA-256であり、raw file一覧をこのディレクトリへ複製しません。外部review待ちやhash未確定の資料は同manifestで`REVIEW_REQUIRED`として扱います。
