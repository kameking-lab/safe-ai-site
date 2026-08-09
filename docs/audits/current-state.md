# 現行監査・保守状態

最終更新: 2026-08-09 JST
更新方式: 本ファイルを上書きし、同種の日付別reportを追加しない。

## Production正本

- URL: `https://www.anzen-ai-portal.jp/`
- 保守開始時の検証済みDeployment / Build: `dpl_8hBD9HeQHpAmE6QEM5pMkcokotZQ` / `bld_h0oa3x2zc`
- Rollback Deployment / Build: `dpl_muVQZ5RD32hSmpKxqzkamUA5hQTz` / `bld_ih5hragbz`
- Runtime source: `83f604e3a151fe645b594e2ca17b91cfa2435eae`
- Annotated tag: `production-20260809-83f604e3`
- Integration: PR #972

保守変更はPR #975で通常mergeし、Preview・production smokeをPASSしたDeploymentを新しいannotated tagのmessageへ記録する。Deployment IDはVercelがmerge後に割り当てるため、source freeze時点で推測値を本書へ書かない。force push・履歴書換えは行わない。

## Answer-first品質

- 「電気作業の資格は？」は、配線工事・充電部付近の作業・設備操作の主要分岐を先に回答する。
- 続く「作業主任者」は電気作業の文脈へ結合し、酸欠・有機溶剤・石綿へ飛ばない。
- answer-first 100%、substantive answer 100%、pure clarification 0%、context retention 100%、citation support 100%。
- 確認質問最大1件、quick reply最大3件、回答操作最大2件、カテゴリ飛躍0。
- 緊急時通常回答0、PII外部送信0。Geminiのactive generation modelは`gemini-3.6-flash`。
- Full gate: storage / web-ci / E2E / LighthouseすべてPASS。独立answer-first review P0/P1/P2/P3 = 0/0/0/0。

## Storage cleanup

比較対象scopeはmain repositoryと、作業開始時に存在したsafe-ai専用snapshot・lane・worktreeだけとする。保守中に別taskが新規作成したactive e-learning worktreeは対象外で、内容を変更・削除していない。

| 項目 | cleanup開始 | post-delete計測 |
| --- | ---: | ---: |
| 対象scope | 207,580,925,677 B | 2,922,991,152 B |
| scope純回復 | - | 204,657,934,525 B（190.602 GiB） |
| main repository | 35,416,448,859 B | 1,457,199,907 B（final commit / GC前） |
| `.git` | 198,467,716 B | 225,984,810 B（final commit / GC前） |
| `docs/audits` | 17,508,282,786 B | 11,686,177 B |
| visible untracked | 19,498件 / 17,931,768,982 B | 0件（final commit後） |

- 削除操作累計: 1,056,959 files、約221,840 directories、207,618,022,516 B。task中に再生成・再削除したbuildを含むため、容量回復の正本はscope差分。
- snapshot root削除16。保持: `safe-ai-site-preedit-20260801-20260801-110228`、`safe-ai-site-cleanup-baseline-20260808`、固有の未統合履歴を持つlane/worktree。
- raw archiveはrepo外の最新一世代、法源snapshot/hashは別の保護archiveとして保持。runtime data、現行test、使用asset、rollbackを削除していない。
- `.next`、coverage、test-results、playwright-report、Lighthouse raw、logs、temp、Vercel local outputはtask終了時に0件。

## Git / GitHub

- remote branch削除28、local branch削除2、merged worktree削除1。
- Actions artifact削除3,970件 / 1,651,595,254 B。現行7日以内のrunと最新成功・失敗は保持。
- Actions cache削除0。現行lockfileに対応するrecent cacheを保持。
- snapshot削除16、release asset削除0、Git履歴書換えなし。
- GitHub Packages詳細だけはtokenに`read:packages`がなく`blocked-external`。秘密値は表示・保存していない。

## 保守安全境界

- cleanupは既定dry-run、削除は明示的`-Apply`のみ。7日local raw、3日screenshots/trace/HAR、task終了時build/test削除を固定。
- public assetはfail-closed allowlist。unknown extension、extensionless file、nested seminar PPTX、symlink・gitlinkをCIとdeployで拒否。
- 履歴budgetはproduction epoch `83f604e3a151fe645b594e2ca17b91cfa2435eae` から毎回走査し、add-then-delete、reused blob、type change、非runtime JSON/画像の件数・bytesを検査。
- PR scannerはcontents read-only `pull_request_target`、Python isolated mode、credential非永続でPR codeを実行しない。分離したtrusted reporterだけが検査済みPR headへstatusを書き込む。
- Vercelはcommit messageをskip根拠にせず、全safe commitをbuildする。committed treeまたはuploaded workspaceのguard失敗時は現行productionを維持する。

## Open findings

候補sourceの実装findingはP0=0。P1=1は、trusted PR-head statusの実PR証明とmain ruleset有効化が未完了であることだけで、production反映前に0へする。P3=1はcleanup producerを再帰削除中にlockしない追加hardeningで、既定dry-run・直前全hash再検証・保護対象fail closedは維持される。最終値はPR #975の独立review・Preview・production smokeと、production tag annotationで確定する。GitHub Packages inventoryだけは`blocked-external`で、runtime blockerではない。

repo外archive manifest SHA-256は`44309034851AD8276E48A00B8275673E231423B8F0F758376B3A6ADD69A33FDF`。最終raw archive SHA-256は`F092DFF00D36BE7699ED8C98FE1730D766A7260258F4BA08AEA60165A3C0CA45`、法源保護archive SHA-256は`32876083B366B07C17CC93B111C410E18CDE2D6B2511873363C69BD5A3D84FDD`。
