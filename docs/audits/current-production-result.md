# 現行 Production 結果

最終更新: 2026-08-09 JST
判定: **PASS**

## 検証済み Production

- URL: `https://www.anzen-ai-portal.jp/`
- Deployment / Build: `dpl_6fNnrgZyqyxs2B12JRhUXHRoJUVb` / `bld_h8uvtkv40`
- Source: `4f7805b8936c272aa9c9be46d844530609aa1458`
- Rollback Deployment / Build: `dpl_DzzNYqXvD73JEwzQn7XqG1McWjbN` / `bld_c9m9gbv4n`
- Rollback source: `2def7a86ec79e2603e4e533c59ced6717629d1ec`
- 最終tag: `production-20260809-maintenance-final`

最終監査文書を統合したmain commitにはVercelが新しいIDを割り当てる。そのIDは推測せず、annotated tagと完了報告に記録する。

## Answer-first / Gemini

- 12会話ケースをbrowser・JSON・SSE・legacyでPASS。
- answer-first / substantive / context retention / citation support = 100%。pure clarification = 0%。
- 「電気作業の資格は？」へ主要分岐を先に回答し、「作業主任者」は同じ電気作業文脈を維持。無関係カテゴリ飛躍0。
- 確認質問最大1、quick reply最大3、回答操作最大2。
- 緊急時通常法令回答0、PII外部送信0。active Gemini modelは `gemini-3.6-flash`。

## Repository / storage gate

- PR #975とPR #978を通常merge。force push・履歴書換え・admin bypassなし。
- Ruleset `#20600963` active、strict、required context `repository-hygiene-target`、GitHub Actions App `15368`、bypass 0。
- 正canary PR #979 / run `31299132669`はPASS・CLEAN。負canary PR #980 / run `31299199531`は公開archiveを検出しFAIL・BLOCKED。
- JMA run `31299250270`はstorage run `31299269685`で候補 `4f7805b…` を検査し、active ruleset下で同一SHAをmainへ昇格。候補Vercel Deployment 0、main Production Deployment 1。

## Gate / smoke

- Full gate: TypeScript、ESLint、Vitest 7,033、Playwright 254、production build、npm audit、storage、security/privacy/legal/chemical/KY/JMA/WBGT、metadata/indexability、responsive/accessibility、Lighthouse 51/51がPASS。
- Preview: `dpl_Dm7dKVRq5WtsVaRBUF6g9J4gmQJH`。SSO維持、全path noindex、robots Disallow `/`、Analytics/RUM/SW停止、mail dry-run、production非変更をPASS。
- Production: 主要13 route 13/13、robots一般group、sitemap、heat noindex、Visual KY、電気資格answer-first、作業主任者context、緊急119、PII遮断をPASS。
- 独立最終review: P0=0、P1=0、P2=0。保守上の非ブロッキングP3=3。
- rollback条件は0件。rollbackは実施していない。
