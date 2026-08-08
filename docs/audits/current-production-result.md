# 現行Production結果

最終更新: 2026-08-08 JST
最終判定: **PASS**

## Deployment

- URL: `https://www.anzen-ai-portal.jp/`
- Production Deployment / Build: `dpl_muVQZ5RD32hSmpKxqzkamUA5hQTz` / `bld_ih5hragbz`
- 直前の安全なDeployment: `dpl_7LroCVRPQtGKmXCoCnHgwpKD5gA2`
- 二世代前: `dpl_ZDfFpkGCS2p86xXeavP4w2y5gPZb`
- Preview Deployment / Build: `dpl_7mUWiQbR2AA96peqgfeZ645BVpHj` / `bld_earw5mv3f`
- Runtime source: `10ad210b87ca777f399e210b0981cb5f86f66adf`
- Annotated tag: `production-20260808-answer-first-maintenance-final`
- Integration: PR #972、履歴書換えなし

www、apex、`safe-ai-site.vercel.app`は新Deploymentへalias済み。production全体noindex、robots `Disallow: /`、sitemap消失、heat noindex回帰、主要5xxは0。rollbackは不要で、直前Deploymentを保持する。

## Answer-first品質

- 通常質問: answer-first 100%、substantive answer 100%、pure clarification 0%
- context retention 100%、clarification correctness 100%、citation support 100%
- 確認質問最大1件、quick reply最大3件、回答操作最大2件、カテゴリ飛躍0
- 「電気作業の資格は？」は配線工事・充電部付近・設備操作の主要分岐を回答してから必要条件を確認
- 続く「作業主任者」は電気作業での位置付けを説明し、酸欠・有機溶剤・石綿へ飛ばない
- 緊急時通常回答0、PII外部送信0、AI外部利用0の固定production評価
- 対象法源: 労働安全衛生法、施行令、安衛則、クレーン等安全規則、有機則、特化則、酸欠則、石綿則、粉じん則、鉛則、電離則、関連告示、確認済み厚労省通達

## Gate / smoke

- Preview 12会話: browser/APIともPASS、JSON 12件、SSE 10/10
- Production 12会話API: PASS
- GET-only production smoke: 251/251 PASS、非GET試行0
- JMA・主要route境界: 16/16 PASS。degraded時もliveと誤表示しない
- full gate closure: PASS。単一full runの旧raw依存だけを自己完結fixtureへ修正し、対象10/10、route safety 135/135、TS/ESLint/diffを再確認
- 独立最終review: runtime P0/P1/P2/P3 0/0/0/0、rollback blocker 0

`japan-leading-production-smoke`の旧12 failureは全件predicate driftだった。通常/noscript H1、fail-closed理由、compact nav、架空例ラベル、mail-client境界へ同期後、GET-onlyで251/251を確認した。runtime変更や追加deployは行っていない。

## 保守結果

- sourceはcommit/push済みbranchとPR #972でGitHubへ正本化
- `.gitignore`、`.vercelignore`、storage budget、7日artifact retention、dry-run既定cleanupを適用
- raw・build・test生成物は削除し、repo外の最終raw 1世代と法源保護archiveだけを保持
- cleanup後のproduction回帰0、rollback未実施
