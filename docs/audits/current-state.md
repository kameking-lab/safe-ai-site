# 現行監査・保守状態

最終更新: 2026-08-08 JST
更新方式: このファイルを上書きし、同種の日付別reportを追加しない。

## 現在の正本

- Production: `https://www.anzen-ai-portal.jp/`
- Deployment / Build: `dpl_muVQZ5RD32hSmpKxqzkamUA5hQTz` / `bld_ih5hragbz`
- 直前の安全なDeployment: `dpl_7LroCVRPQtGKmXCoCnHgwpKD5gA2`
- 二世代前: `dpl_ZDfFpkGCS2p86xXeavP4w2y5gPZb`
- Deployed runtime source: `10ad210b87ca777f399e210b0981cb5f86f66adf`
- Production source tag: `production-20260808-answer-first-maintenance-final`
- Default branch integration: PR #972

force push・履歴書換えは行っていない。最終tagは、このProductionとruntime同一で、deploy対象外の監査・保守scriptを含む再現可能なsource commitへ付与する。

## Answer-first / Production判定

- Preview: `dpl_7mUWiQbR2AA96peqgfeZ645BVpHj` / `bld_earw5mv3f`、PASS
- Production 12会話API: PASS。answer-first 100%、substantive answer 100%、pure clarification 0%、context retention 100%、引用支持 100%
- 確認質問最大1件、quick reply最大3件、回答操作最大2件、無関係カテゴリ飛躍0
- 「電気作業の資格は？」は主要分岐を先に回答し、「作業主任者」は電気作業の文脈へ結合
- 緊急時通常回答0、PII外部送信0、Gemini利用経路は`gemini-3.6-flash`
- JMA・主要route境界: 16/16 PASS
- 現行契約へ更新したGET-only production smoke: 251/251 PASS、非GET試行0
- Runtime P0/P1/P2/P3: 0/0/0/0。rollback条件0、rollback未実施

full gateは最終変更系列で一度だけ実行した。13区分中12区分は初回PASSし、Vitestだけが削除対象の旧Lighthouse rawへ依存する7件で失敗した。テストを自己完結fixtureへ修正後、対象10/10、route safety 135/135、TypeScript、ESLint、diff checkをPASSさせたため、closure判定をPASSとする。全Playwright・production build・npm audit・privacy/safety境界は単一full gate内でPASS済み。

## 容量と削除結果

初回棚卸しはmain repoとsnapshot群で186,896,187,412 bytesだった。後から確認した専用lane/worktree 20,684,738,265 bytesを加え、保守対象の開始容量を207,580,925,677 bytesと確定した。

| 項目 | 開始 | post-delete計測 |
| --- | ---: | ---: |
| 対象scope | 207,580,925,677 B | 2,922,453,844 B |
| main repository | 35,416,448,859 B | 1,456,662,599 B |
| `.git` | 198,467,716 B | 221,926,097 B（final GC前） |
| `docs/audits` | 17,508,282,786 B | 299,286 B |
| untracked | 19,498件 / 17,931,768,982 B | 3件 / 11,841 B（このcurrent 3文書をcommit後0件） |
| C:空き容量 | 96,710,336,512 B | 395,353,223,168 B |

- scope純回復: **204,658,471,833 bytes**（190.603 GiB）
- 削除操作: 1,044,047 files / 219,900 directories / 206,012,005,478 bytes
- repo外archive: 15,146,631 bytes。rawは最終1世代、一次資料・hashは別の保護archive
- archive root全体: 18,902,506 bytes、manifest SHA-256 `44309034851AD8276E48A00B8275673E231423B8F0F758376B3A6ADD69A33FDF`
- 削除したsnapshot root: 16。保持: production前`safe-ai-site-preedit-20260801-20260801-110228`、cleanup前`safe-ai-site-cleanup-baseline-20260808`
- `safe-ai-lanes`は未統合local履歴がある5 source/`.git`を保持し、生成物16,188,131,042 Bだけ削除
- `fable-f1`は未統合2 commitのため保持し、生成物2,138,901,836 Bだけ削除
- 統合済み`fable-genq50` worktree 1件とlocal branch 1件を削除

削除bytesはtask中に再生成・再削除したbuildも含むため、容量回復の正本は開始scopeとpost-delete scopeの差とする。

## Git / GitHub

- remote branch削除4、local branch削除2、merged worktree削除1
- Actions artifact削除2,586件 / 654,867,277 B
- Actions cache削除0。現行lockfile cache 1件を保持
- release asset/package削除0、Git履歴書換えなし
- 履歴上の10 MB超blob 0。500 MB履歴書換え条件を満たさないためcurrent tree整理と通常GCだけを採用

## Archiveと安全境界

- raw archive: `answer-first-maintenance-final-20260808-raw.zip`、7,920,002 B、61 entries、SHA-256 `F092DFF00D36BE7699ED8C98FE1730D766A7260258F4BA08AEA60165A3C0CA45`
- 法源保護archive: `protected-source-validation-20260808.zip`、599,398 B、6 entries、SHA-256 `32876083B366B07C17CC93B111C410E18CDE2D6B2511873363C69BD5A3D84FDD`
- secret候補0、全entryを再読込してsource SHA-256一致0不一致
- runtime data、現行test、使用asset、法源snapshot/hash、最新rollback、未統合branchは保持
- Preview一時bypassはrotate/revoke済みで残存0。秘密値は記録していない

## Open finding

P0=0、P1=0、非blocking P2=4、P3=0。P2はActionsの成功/失敗例外retention自動化、履歴blobの小容量大量追加集計、smoke内Deployment IDの自己検証、`feature-portfolio`の旧`/resources`一クリックmetadataであり、現行runtime・rollbackを阻害しない。GitHub Packagesの詳細取得だけはtokenの`read:packages`不足で`blocked-external`。
