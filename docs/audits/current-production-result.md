# 安衛法AI Production結果

法令・回答基準日: 2026-08-09 JST
リリース観測日: 2026-08-10 JST
リリース状態: **RELEASED**

## リリース前Production baseline

- URL: `https://www.anzen-ai-portal.jp/`
- Deployment ID: `dpl_87jKmHESX4ta9fdn4pmqbXF6erqt`
- Build ID: `bld_pa3w4hhrb`
- Runtime source commit: `739188f0b4c5e5d8a6edfbe0d30074c5e455c4bd`
- 観測時刻: `2026-08-10T11:07:13.981+09:00`

外部Preview証跡 `external-operations-preview.json` が上記Deploymentを `verifiedCurrentAlias` として観測した正確な時刻を記録した。このDeploymentをrollback対象として凍結した。

## 今回のリリース結果

- Preview Deployment ID: `dpl_2scBM6D1pHaMr2M4GT8cxTVvaY7e`
- Preview Build ID: `bld_3t5ukph6k`
- 新Production Deployment ID: `dpl_5LLzyucARx7TGaLj9PrfTQsyKJNm`
- 新Production Build ID: `bld_cxrh3jgpr`
- Release source commit: `0f46b01ffd45e4a5e5572096f116933b2027fbe1`
- Release source tree: `4fd843a4c2e4667a7da7947dde2c9e87a78a2640`
- Audit evaluator source: `5e8cc33ee655067e041f84f50adc0ff166017985`
- 直前Production Deployment ID: `dpl_87jKmHESX4ta9fdn4pmqbXF6erqt`
- Annotated production tag: `production-20260810-answer-first`
- Production smoke: `PASS（264/264、生成時刻 2026-08-10T11:29:00+09:00）`
- Rollback: `NOT_REQUIRED`
- 定期書込みworkflow復帰: **PASS**（`2026-08-10T11:55:21.4088794+09:00`、MHLW・e-Gov・news-feed=`active`、既存停止のJMA=`disabled_manually`）

## 現在の判定

| 項目 | 状態 |
|---|---|
| 固定電気holdout 72ケース | PASS |
| 対象ローカル検証 | PASS（72/72ケース・88ターン） |
| full gate | PASS（13/13、Vitest 7,346、Playwright 256 + privacy 2） |
| 独立レビュー | PASS（P0=0 / P1=0 / P2=0 / P3=0） |
| Preview | PASS（211 POST、external AI 0、failure 0） |
| Production反映 | PASS（source commit一致） |
| production smoke | PASS（264/264） |
| rollback | NOT_REQUIRED |

Production反映とsmokeは完了し、rollbackは実行していない。必要時の復旧先は直前Production `dpl_87jKmHESX4ta9fdn4pmqbXF6erqt` である。

最終独立レビュー対象はcandidate/source `0f46b01ffd45e4a5e5572096f116933b2027fbe1`、tree `4fd843a4c2e4667a7da7947dde2c9e87a78a2640`、audit evaluator `5e8cc33ee655067e041f84f50adc0ff166017985`。固定holdout SHA-256は `122fc6dffb7dbd08a6665bf276883f2fefc7f8010730cb7803f25d66faca3554` のまま変更していない。

Production smoke Attempt 1は、製品不具合ではなく旧progress契約とfocus raceによる監査側のfalse-negativeだった。監査ロジックを独立診断・修正し、同一Production Deploymentで264/264 PASSを確認した。

push後の `web-ci` はsmoke jobをPASSした。full jobは35分上限で250件時点にキャンセルされ、Next開発serverのメモリ再起動時に1件が白画面となった。事前full gateは256件PASS済みであり、当該1件と未実行だった末尾7件をexact candidateのproduction modeで再実行し、全件PASSを確認した。
