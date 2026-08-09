# 現行監査・保守状態

最終更新: 2026-08-09 JST
更新方式: この文書を上書きし、同種の日付別レポートを増やさない。

## Production 正本

- URL: `https://www.anzen-ai-portal.jp/`
- 検証済み Deployment / Build: `dpl_6fNnrgZyqyxs2B12JRhUXHRoJUVb` / `bld_h8uvtkv40`
- 検証済み source: `4f7805b8936c272aa9c9be46d844530609aa1458`
- 直前の安全な rollback Deployment / Build: `dpl_DzzNYqXvD73JEwzQn7XqG1McWjbN` / `bld_c9m9gbv4n`
- rollback source: `2def7a86ec79e2603e4e533c59ced6717629d1ec`
- 最終監査文書統合後の annotated tag: `production-20260809-maintenance-final`

Deployment ID はmain統合後にVercelが割り当てるため、監査文書自身の将来IDは推測しない。最終ID・build・rollbackはannotated tagと完了報告へ記録する。

## Answer-first 法令AI

- 「電気作業の資格は？」は、電気工事士・充電電路の特別教育・設備操作の主要分岐を先に答え、その後だけ確認質問を1件表示する。
- 続く「作業主任者」は電気作業の文脈へ結合し、作業主任者と作業指揮者の違いを説明する。酸欠・有機溶剤・石綿へ飛ばない。
- answer-first 100%、substantive answer 100%、pure clarification 0%、context retention 100%、citation support 100%。
- 確認質問は最大1件、quick replyは最大3件、回答操作は最大2件。
- 緊急時の通常法令回答0、PII外部送信0。active Gemini generation modelは `gemini-3.6-flash`。
- 対象法源は、労働安全衛生法・施行令・安衛則、主要特別規則、関連告示、確認済み厚生労働省通達、質問へ直接関係する確認済み一次資料。

## Storage cleanup 結果

| 項目 | cleanup開始前 | 記録済みpost-delete |
| --- | ---: | ---: |
| 対象scope | 207,580,925,677 B | 2,922,991,152 B |
| 回復容量 | - | 204,657,934,525 B（約190.602 GiB） |
| main repository | 35,416,448,859 B | 1,457,199,907 B（最終GC前の記録値） |
| `.git` | 198,467,716 B | 225,984,810 B（最終GC前の記録値） |
| `docs/audits` | 17,508,282,786 B | 11,686,177 B |
| visible untracked | 19,498件 / 17,931,768,982 B | 0件（最終commit前の記録値） |

- 削除操作累計: 1,056,959 files、約221,840 directories、207,618,022,516 B。再生成後に再削除した出力を含むため、正味回復量はscope差分を正本とする。
- snapshot rootは16件削除。production前1件、cleanup前1件、未統合固有履歴を持つlane/worktreeだけを保持した。
- `.next`、coverage、test-results、Playwright/Lighthouse raw、trace、logs、cache、Vercel local outputを安全なallowlist方式で整理した。
- runtime法令・化学物質・資格・事故・KYT・画像・migration、現行test、使用中asset、法源snapshot/hash、最新rollbackは削除していない。

## Git / GitHub

- production baselineはcommit・push済み。保守本体はPR #975、live storage fixはPR #978で通常mergeした。force push・履歴書換えは行っていない。
- remote branch 28件、local branch 2件、merged worktree 1件を安全条件付きで削除した。
- Actions artifact 3,970件 / 1,651,595,254 Bを削除。cache削除0件。最新成功・失敗・rollback用世代は保持した。
- `safe-ai-main-storage-gate` ruleset `#20600963` はactive。mainにdeletion禁止、non-fast-forward禁止、strictな `repository-hygiene-target`（GitHub Actions App `15368`）を必須化し、bypassは0。
- 正canary PR #979はrun `31299132669`でPASSし、active rulesetが`CLEAN`と判定。負canary PR #980は公開archiveを検出してrun `31299199531`でFAILし、rulesetが`BLOCKED`と判定した。両PRはmergeせず閉じ、branchを削除した。
- 実JMA ETL run `31299250270`は候補 `4f7805b…` を生成し、storage run `31299269685`のrequest固有statusを通過後、同一SHAをmainへnon-force昇格した。候補branchのVercel Deploymentは0、mainのProduction Deploymentは1。

## Gate / smoke

- Answer-first full gate: storage `31288334712`、web-ci `31288334720`、E2E `31288334719`、performance `31288334716`、すべてPASS。
- Maintenance final gate: storage `31296716001`、web-ci `31296716017`、E2E `31296716007`、performance `31296716011`、Vercel Preview `dpl_Dm7dKVRq5WtsVaRBUF6g9J4gmQJH`、すべてPASS。
- Maintenance fix exact-head: unit/safety、lint、production build、E2E、manual immutable storage dispatch `31298562071`がPASS。独立reviewはP0/P1/P2=0。
- Lighthouse 51/51、Vitest 7,033、E2E 254、npm audit 0 vulnerabilities。
- Production smoke: 主要13 route 13/13、robots一般group、sitemap、heat noindex、Visual KY、電気資格answer-first、作業主任者context、緊急119、PII遮断がPASS。

## Open findings

- P0=0、P1=0、P2=0、P3=3。
- P3: Actions artifactは1日保持のETL payloadがあり、期限切れ時はtype別 `repository_dispatch` でfresh生成する。
- P3: 通常testの一部に、runtime入力ではないRAG metrics / legal-RAG summary更新の既存副作用が残る。
- P3: cleanup applyは削除直前にhashを再検証するが、producer directoryを排他lockしたまま削除する方式ではない。producer停止を運用条件とする。
- GitHub Packages詳細inventoryだけは認証tokenに `read:packages` がなく `blocked-external`。runtime blockerではない。

Repo外archive manifest SHA-256: `44309034851AD8276E48A00B8275673E231423B8F0F758376B3A6ADD69A33FDF`。最新raw archive SHA-256: `F092DFF00D36BE7699ED8C98FE1730D766A7260258F4BA08AEA60165A3C0CA45`。法源保護archive SHA-256: `32876083B366B07C17CC93B111C410E18CDE2D6B2511873363C69BD5A3D84FDD`。
