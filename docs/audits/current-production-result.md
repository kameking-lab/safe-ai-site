# 安衛法AI Production結果

基準日: 2026-08-09 JST
リリース状態: **RELEASE_PENDING**

## リリース前Production baseline

- URL: `https://www.anzen-ai-portal.jp/`
- Deployment ID: `__RELEASE_PREVIOUS_DEPLOYMENT_ID__`
- Build ID: `__RELEASE_PREVIOUS_BUILD_ID__`
- Runtime source commit: `__RELEASE_PREVIOUS_SOURCE_COMMIT__`
- 観測時刻: `__RELEASE_BASELINE_OBSERVED_AT_JST__`

Production反映直前に現Productionを再取得し、その時点のDeploymentを上記tokenへ記録してrollback対象として確定する。定期JMAデプロイによる更新を考慮し、古いIDは転記しない。

## 今回のリリース結果

- Preview Deployment ID: `__RELEASE_PREVIEW_DEPLOYMENT_ID__`
- 新Production Deployment ID: `__RELEASE_NEW_DEPLOYMENT_ID__`
- 新Production Build ID: `__RELEASE_NEW_BUILD_ID__`
- Release source commit: `__RELEASE_SOURCE_COMMIT__`
- 直前Production Deployment ID: `__RELEASE_PREVIOUS_DEPLOYMENT_ID__`
- Annotated production tag: `__RELEASE_PRODUCTION_TAG__`
- Production smoke: `__RELEASE_PRODUCTION_SMOKE_STATUS__`
- Rollback: `__RELEASE_ROLLBACK_STATUS__`

上記tokenは、full gate、独立レビュー、Preview、本番反映とsmokeが完了するまで捏造せず保持する。リリース担当は確定値へ機械的に置換し、`RELEASE_PENDING`を最終結果へ更新する。

## 現在の判定

| 項目 | 状態 |
|---|---|
| 固定電気holdout 72ケース | PASS |
| 対象ローカル検証 | PASS（72/72ケース・88ターン） |
| full gate | PENDING |
| 独立レビュー | PASS（P0=0 / P1=0 / P2=0 / P3=0） |
| Preview | PENDING |
| Production反映 | PENDING |
| production smoke | PENDING |
| rollback | NOT_EVALUATED |

現時点ではProduction反映、production smoke、rollback不要を主張しない。

独立レビュー対象はSource HEAD `cb3b56075c398ea241bfa7af6985d9a8b764bba9`とreviewed diff fingerprint `df01ce3270d766712bdcd8f1f1ec6d6ab45908fb`。deep quick reply 51/51、main 14分野の生成quick reply 39/39、JSON 14/14、SSE 14/14、exact citation claim 19/19をPASSした。固定holdout SHA-256は `122fc6dffb7dbd08a6665bf276883f2fefc7f8010730cb7803f25d66faca3554` のまま変更していない。
