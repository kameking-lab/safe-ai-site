# 現行Production結果

最終更新: 2026-08-09 JST
source freeze時点の最終判定: **PASS**

## 検証済みproduction baseline

- URL: `https://www.anzen-ai-portal.jp/`
- Deployment / Build: `dpl_8hBD9HeQHpAmE6QEM5pMkcokotZQ` / `bld_h0oa3x2zc`
- Rollback Deployment / Build: `dpl_muVQZ5RD32hSmpKxqzkamUA5hQTz` / `bld_ih5hragbz`
- Runtime source: `83f604e3a151fe645b594e2ca17b91cfa2435eae`
- Annotated tag: `production-20260809-83f604e3`
- Integration: PR #972、履歴書換えなし

PR #975の保守変更はdeploy設定を含むため、最終Preview後にproductionへ通常反映する。新Deployment / Buildはmerge後のVercel metadataで確認し、production tag annotationと最終報告へ記録する。推測値は記録しない。

## Answer-first / Gemini

- 12会話をbrowser・JSON・SSE・legacyでPASS。
- answer-first / substantive / context retention / citation support = 100%。pure clarification = 0%。
- 確認質問最大1、quick reply最大3、回答操作最大2、無関係カテゴリ飛躍0。
- 「電気作業の資格は？」へ主要分岐を先に回答し、「作業主任者」は同じ電気作業文脈を維持。
- 緊急時通常回答0、PII外部送信0。active Gemini modelは`gemini-3.6-flash`。
- 対象法源: 労働安全衛生法、施行令、安衛則、クレーン等安全規則、有機則、特化則、酸欠則、石綿則、粉じん則、鉛則、電離則、関連告示、確認済み厚労省通達。

## Gate / smoke

- Answer-first Preview: `dpl_C68J7CG36wTtknY7pszdrs2qWbSm` / `bld_ku74i3p5q`、PASS。
- Answer-first production GET routes 254/254、API JSON/SSE/legacy 36/36、390×844 fixed 12/12、PASS。
- Full gate: storage run 31288334712、web-ci 31288334720、E2E 31288334719、performance 31288334716、すべてPASS。
- Vitest 7,032 passed / 1 skipped、Playwright E2E 254/254、Lighthouse 51/51。
- 独立answer-first review: P0/P1/P2/P3 = 0/0/0/0、rollback条件0。

## 保守候補

- PR: #975
- local gate: TypeScript、ESLint、関連Vitest、production build、npm audit、diff、secret/PII、storage/cleanup probeをPASS。
- public/deploy guard: tracked public 326/326 allow、unknown raw・nested PPTX・nonregular fileはfail closed。
- cleanup後のruntime source差分はなく、deploy差分はbuild前storage guardとignore policy。
- 新しいproductionがsmokeをPASSするまでrollbackは`dpl_8hBD9HeQHpAmE6QEM5pMkcokotZQ`。
