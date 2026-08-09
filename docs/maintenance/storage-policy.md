# safe-ai-site ストレージ保守ポリシー

最終更新: 2026-08-09 JST

## 目的と適用範囲

このポリシーは `safe-ai-site` と、名前と内容の両方から同サイト専用と確認できる snapshot・調査用 clone にだけ適用します。他プロジェクト、個人ファイル、資格カレンダー、YouTube、画像生成プロジェクト、`pic` は対象外です。

保守の目的は、production の再現性と安全上・法的な検証可能性を保ったまま、再生成可能な build 出力、test 出力、cache、重複 snapshot、raw evidence の無制限な増加を防ぐことです。

## 削除判断の分類

- `KEEP`: runtime、現在の source・test・fixture、使用中 asset、最新 rollback、法源 snapshot・hash など、現在の運用または検証に必要なもの。
- `DELETE_LOCAL`: Git から再生成できる build・test 出力、期限切れの local cache・raw evidence。
- `DELETE_REPOSITORY`: 誤って追跡された再生成物または重複物。参照ゼロと再生成可能性を確認して通常 commit で削除する。
- `DELETE_GITHUB`: retention を超え、安全な rollback・open PR・最新 run に不要な artifact、cache、merged branch。
- `ARCHIVE_ONE_COPY`: Git へ置かないが、直近の監査や rollback のため repo 外に一世代だけ必要なもの。
- `REVIEW_REQUIRED`: 所有関係、参照、固有差分、法的価値、再生成可能性のいずれかが不明なもの。確認できるまで削除しない。

削除前に、対象の絶対パス、Git 状態、source・CSS・metadata・manifest・test からの参照、runtime trace、再生成手順を確認します。ファイル名や wildcard だけでは削除しません。`git clean -fdx`、未確定成果を失う reset・stash・checkout、repo 外への無差別な再帰削除は禁止します。

## 絶対に保持する安全境界

- 施行中の法令、施行令、規則、告示、確認済み通達と、それらの法源 snapshot・checksum・canonical metadata。
- 化学物質、資格、事故、KYT、気象・WBGT、安全境界、schema、migration、runtime で使う画像と fixture。
- 現行 test。容量節約だけを理由に test を削除しない。
- 現在の production source、必要な設定、最新二世代の production rollback 情報。
- 外部専門家の確認に必要な一次資料の取得日時、原典 URL、hash。
- open PR、未統合作業、protected/default/release/production baseline/rollback branch。

秘密値、`.env*`、token、証明書、資格情報は archive・report・commit に含めません。PII や生の会話履歴も保存しません。

## Retention

| 対象 | 保持期間・世代 | 保管先 |
| --- | --- | --- |
| local raw evidence | 7日 | repo 外。Git へ入れない |
| screenshots・trace・HAR | 3日 | repo 外。Git へ入れない |
| local snapshot | 最新2件 | repo 外。production 前1件、cleanup 前1件を優先 |
| production rollback 情報 | 最新2件 | 現行要約と deployment metadata |
| GitHub Actions artifact | 7日 | 最新成功・最新失敗、release 最新2世代は別途保持 |
| GitHub Actions cache | 最終利用から14日 | 現行 lockfile hash の cache は保持 |
| audit summary | 現行版1件 | `docs/audits/current-*.{md,json}` を上書き |
| raw evidence | 原則0件 | Git へ入れない。必要時のみ repo 外に一世代 |
| build・test 出力 | task 終了まで | 終了時に削除 |

保持期間は次の優先順位で適用します。Gitで追跡するraw evidenceは常に0件を原則とし、task中のscreenshots・trace・HARは3日、その他のGit外local rawは最大7日です。法源確認やrollbackのため一世代だけ残す必要がある場合に限り、秘密値を除外した圧縮archiveをrepo外へ置き、manifestとchecksumを現行記録へ残します。

Actions artifact の upload には原則 `retention-days: 7` を設定します。release asset は最新 production 二世代と rollback に必要なものを保持します。cache は age だけで一括削除せず、key と lockfile hash を照合します。

## 監査記録

通常の監査状態は次の4ファイルを上書きし、日付違いの同種 report を増やしません。

- `docs/audits/current-state.md`
- `docs/audits/current-findings.json`
- `docs/audits/current-production-result.md`
- `docs/maintenance/storage-policy.md`

法的・安全上重要な過去情報だけを `docs/audits/archive/` に要約統合します。raw evidence を削除または repo 外へ移すときは、少なくとも次を current state または archive manifest に残します。

- 作成日時（JST）
- 対象 Deployment ID
- SHA-256 checksum（単一ファイルまたは archive manifest）
- 最終判定
- 主要 finding
- 削除・移動した raw evidence の種類
- 移動先がある場合は秘密値を含まない論理名

checksum を取得できない対象は空欄にせず `not-computed` と記録し、理由を添えます。

## Snapshot と evidence

snapshot は現在の Git tree と比較し、現在 Git にない固有かつ必要なファイルだけを回収します。snapshot 内の `node_modules`、`.next`、coverage、test output、trace、raw evidence、cache、log は保持しません。同一内容を snapshot と圧縮 archive の両方に保存しません。

snapshotにも`.env*`、token、証明書、資格情報、PIIを複製しません。資格情報のbackupが必要な場合は、この保守対象とは分離した暗号化済みの資格情報管理を使い、snapshot名目で平文保存しません。

`docs/audits/evidence` は永久保存庫にしません。Git に残せるのは、最新判定を再確認するための小さな機械可読 summary、checksum manifest、rollback metadata に限ります。画像、動画、trace、HAR、raw HTML、console log、coverage、Lighthouse raw、失敗 run の全出力は repo 外 retention の対象です。

## 各 task の終了手順

1. 対象ファイルだけ読む。
2. 編集前に `git status` を確認する。
3. 小さな変更 batch で編集する。
4. 対象 test を実行する。
5. full gate は最終変更後に一度だけ実行する。
6. Preview は一度だけ作成する。
7. production へ反映する。
8. production smoke を実行する。
9. production source を commit する。
10. GitHub へ push する。
11. production 対応の annotated tag を作成して push する。
12. `.next`、test output、期限切れ raw evidence を削除する。
13. task 専用 dev server と残留 test/build process を停止する。
14. untracked を0件または意図した最小件数に分類する。
15. 監査要約を `current-state` 系へ上書きする。
16. 同種の日付別 report を追加せず終了する。

Preview・production・外部送信を伴う操作は、その task の権限と安全境界に従います。実メール、実 push 通知、実決済は smoke に使いません。runtime に影響しない raw/cache 削除だけなら再 deployment は行いません。

## 自動保守の契約

`cleanup-safe.ps1` は既定を dry-run とし、明示的な `-Apply` がある場合だけ、allowlist された repo 内の再生成物を削除します。`npm run maintenance:cleanup` と `npm run maintenance:cleanup:dry` はどちらも dry-run、削除は意図が明確な `npm run maintenance:cleanup:apply` だけです。source、runtime data、`.env*`、Git metadata、repo 外パスは対象にしません。削除候補が安全条件を満たさない場合は `REVIEW_REQUIRED` として終了します。

保持期間はscript利用者が短縮・延長できない固定契約です。screenshots・trace・HARは3日、`lighthouse-raw*`を含むその他local rawは7日、build・test outputはtask終了時に削除します。`-Apply`直前にも内容hash、更新時刻、追跡状態、保護対象を再検証します。

容量 budget は、5 MB 以上の新規 tracked file、raw evidence の追加、build/test output の commit、100 MB 超の artifact、1,000件超の untracked 生成物、runtime と無関係な大量 JSON・画像を検出します。main・手動実行・定期実行・自動ETL完了後はcurrent tree全体を検査し、main上の検査は途中cancelしません。履歴内で追加後に削除された禁止生成物も検出します。法令・化学物質など正当な大規模 runtime data は、用途と所有者を記した明示 allowlist でのみ例外にします。

履歴検査のpolicy epochは、監査済みproduction commit `83f604e3a151fe645b594e2ca17b91cfa2435eae` を40桁SHAで固定します。event SHA、tag、`HEAD^`を代用せず、全eventでepochからHEADまでの追加・変更blobを走査します。epochが存在しない、またはHEADのancestorでない場合はfail closedです。epochを進められるのは、旧default branch版scannerで全範囲をPASSした通常PRだけです。そのPRへ旧SHA・新SHA、履歴blob件数、非runtime JSON・画像の件数とbytesを記録します。

PRのstorage scannerは、commit-message skipで抑止されない`pull_request_target`上でcontents read-only、credential非永続として動き、checkoutしたGit objectとfile metadataをdataとしてだけ検査します。PR由来のscript・package・buildは一切実行せず、Pythonはisolated modeで起動してcheckout上のmoduleをimportしません。別jobのtrusted reporterだけに`statuses: write`を与え、検査したimmutable merge SHAのhead parentへsuccess/failureを明示報告します。Vercelはcommit messageやfirst-parent差分をskip根拠にせず、deploy前にHEAD tree objectを同じfail-closed分類で検査し、違反または検査不能なら現行productionを維持します。安全なcommitはすべてbuildし、build開始時にもupload済みworkspaceを再検査します。

`web/public` はfail-closedのruntime asset置場です。既存の画像・font・動画、指定manifest等、`seminars/*.pptx`だけを許可し、それ以外の拡張子・拡張子なしfile・symlinkは公開しません。正当な配布物が必要な場合は、用途・owner・exact pathまたは限定suffixをレビューしてCI、Git ignore、root/web deploy ignore、deploy guardの全allowlistへ同時に明記します。directory名だけで正規sourceを除外しないよう、`build`・`trace`等の生成物判定はrepository直下または`web`直下の出力rootへ限定します。

## 現行 production baseline

- Production Deployment: `dpl_8hBD9HeQHpAmE6QEM5pMkcokotZQ`
- Production Build: `bld_h0oa3x2zc`
- Rollback Deployment: `dpl_muVQZ5RD32hSmpKxqzkamUA5hQTz`
- Baseline commit: `83f604e3a151fe645b594e2ca17b91cfa2435eae`
- Annotated tag: `production-20260809-83f604e3`
- Default branch integration: PR #972 で `main` へ統合

この baseline と rollback 情報を破棄する cleanup は禁止します。
