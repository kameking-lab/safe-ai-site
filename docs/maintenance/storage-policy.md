# safe-ai-site ストレージ保守ポリシー

最終更新: 2026-08-09 JST

## 目的と対象

Productionの再現性と安全上・法的な検証可能性を保ちつつ、再生成可能なbuild/test出力、cache、重複snapshot、raw evidenceを各task終了時に整理する。

対象は `safe-ai-site` と、名前と内容の両方から同サイト専用と確認できるsnapshot・調査cloneだけとする。資格カレンダー、YouTube、画像生成project、`pic`、他site・他repository、個人ファイルは対象外。

## 絶対条件

- `git clean -fdx`、force push、成果を失うreset/stash/checkout、wildcardだけを根拠にした大量削除を禁止する。
- 削除前に絶対path、Git状態、参照、再生成可能性、runtime/build traceを確認する。
- `.env*`、token、証明書、資格情報、PIIを表示・commit・archiveしない。
- runtime法令・通達・法源snapshot/hash、化学物質、資格、事故、KYT、schema/migration、使用中asset、現行test、最新rollbackを削除しない。
- 不明な対象は削除せず `REVIEW_REQUIRED` とする。

## 分類

- `KEEP`: runtime、現行source/test/fixture、使用asset、法源、最新rollback、未統合固有履歴。
- `DELETE_LOCAL`: Gitから再生成できるbuild/test出力、期限切れcache、raw evidence。
- `DELETE_REPOSITORY`: 参照0かつ再生成可能と確認したtracked生成物・重複物。
- `DELETE_GITHUB`: retention超過artifact/cache、条件を満たすmerged branch。
- `ARCHIVE_ONE_COPY`: Gitへ置かないが最新監査・rollbackに必要なrepo外の単一圧縮世代。
- `REVIEW_REQUIRED`: 所有・参照・runtime必要性・固有差分のいずれかが不明なもの。

## Retention

| 対象 | 保持 | 管理 |
| --- | --- | --- |
| local raw evidence | 7日 | repo外。Gitへ入れない |
| screenshots・trace・HAR | 3日 | repo外。Gitへ入れない |
| local snapshot | 最新2件 | production前1件、cleanup前1件を優先 |
| production rollback | 最新2世代 | deployment/build/source/tagを記録 |
| GitHub Actions artifact | 7日 | 最新成功・失敗、release最新2世代は別途保持 |
| GitHub Actions cache | 最終利用から14日 | 現行lockfile hashを保持 |
| audit summary | 現行1件 | `docs/audits/current-*` を上書き |
| raw evidence | Git上0件 | 必要時だけrepo外へ単一圧縮世代 |
| build・test出力 | task終了まで | task終了時に削除 |

## 各taskの標準終了手順

1. 対象ファイルだけを読む。
2. 編集前に `git status` を確認する。
3. 小さな変更batchで編集する。
4. 対象testを実行する。
5. full gateは最終変更後に1回だけ実行する。
6. Previewは1回だけ作成する。
7. Productionへ反映する。
8. Production smokeを実行する。
9. source・設定・test・必要dataをcommitする。
10. GitHubへ通常pushし、PRで統合する。
11. Production対応のannotated tagをpushする。
12. `.next`、test output、raw evidenceを削除する。
13. task専用dev serverと残留test/build processを停止する。
14. untrackedを0件または意図した最小数へ分類する。
15. 監査要約を `current-*` へ上書きする。
16. 同種の日付別reportを追加しない。

## 自動保守

- `npm run maintenance:audit`: byte単位のread-only棚卸しを作る。
- `npm run maintenance:cleanup:dry`: 削除候補を表示する。既定は常にdry-run。
- `npm run maintenance:cleanup:apply`: 明示的なapply時だけ、repo内allowlist対象を削除する。
- `scripts/maintenance/cleanup-safe.ps1` はsource、runtime data、`.env*`、`.git`、repo外pathを対象にしない。削除直前にpath・追跡状態・更新時刻・内容hashを再検証する。
- `scripts/maintenance/storage-audit.ps1` は一覧を何万行も出さず、集計・上位・分類を記録する。

## Repository budget

中央storage scannerは次をfail-closedで検出する。

- 5 MiB以上の新規tracked file（明示runtime allowlistを除く）。
- 100 MiB超の単一file。
- `docs/audits/evidence` のraw追加。
- `.next`、coverage、trace、screenshots、Playwright/Lighthouse/build/cacheのcommit。
- 1,000件を超えるuntracked生成物。
- runtimeと無関係な大量JSON・画像。
- `web/public` の未知拡張子、拡張子なしdump、archive、symlink、gitlink、nested未審査PPTX。
- production policy epoch後のadd-then-delete、再利用blob、type changeを含む禁止履歴。

法令・化学物質・資格・事故・KYT・source snapshot、使用中public asset、schema/migration、正当なfixtureは用途とownerを明示したallowlistだけで受け入れる。

## GitHub / ETL / Vercel

- main rulesetはdeletion・non-fast-forwardを禁止し、strictな `repository-hygiene-target` を必須化する。bypass actorは置かない。
- PR scannerは `pull_request_target` 上のtrusted workflowを使う。base repositoryのmerge refをbounded retryでSHAへ固定し、event base/headの正確な2親を検証する。
- PR treeはdataとしてだけ読む。PR内code/action/package/importを実行せず、credentialを保持せず、status publisherを別runnerへ分離する。
- 自動ETLはread-only generation jobと、fresh runner上のexact allowlist promotion jobに分離する。
- ETL候補は `automation/storage-gate/*` へ一時pushし、request固有status、candidate tip、単一parent、main raceを再検証した同一SHAだけをnon-forceでmainへ進める。
- Vercelは候補branchのDeploymentを作らず、同一SHAがmainへ進んだ時だけProduction buildする。
- Git履歴書換えは原則禁止。分析後に明示条件をすべて満たす場合だけ、repo外bundleとremote backup tagを作って検討する。

## 現行 Production / rollback

- 検証済み Production: `dpl_6fNnrgZyqyxs2B12JRhUXHRoJUVb` / `bld_h8uvtkv40` / source `4f7805b8936c272aa9c9be46d844530609aa1458`。
- 直前rollback: `dpl_DzzNYqXvD73JEwzQn7XqG1McWjbN` / `bld_c9m9gbv4n` / source `2def7a86ec79e2603e4e533c59ced6717629d1ec`。
- 最終監査文書統合後のDeployment IDは推測せず、annotated tag `production-20260809-maintenance-final` と完了報告に記録する。
