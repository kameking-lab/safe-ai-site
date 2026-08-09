# Answer-first production result（2026-08-03 JST基準）

- Status: PASS（2026-08-09 JST）
- Production URL: https://www.anzen-ai-portal.jp/
- Deployment / Build: `dpl_8hBD9HeQHpAmE6QEM5pMkcokotZQ` / `bld_h0oa3x2zc`
- Merge commit / source / tag: `83f604e3a151fe645b594e2ca17b91cfa2435eae` / `e84b39995af2313e7069d215b6981a1e030fb37a` / `production-20260809-83f604e3`
- Previous production / build: `dpl_muVQZ5RD32hSmpKxqzkamUA5hQTz` / `bld_ih5hragbz`（READY、rollback先として保持）
- Full gate: Vitest 7,032、Playwright 254、Lighthouse 51/51、performance budget failure・warning 0。独立UltraレビューGO、P0=P1=P2=P3=0。
- Production GET smoke: 254/254。主要17 route、alias、canonical/indexability、robots、sitemap、heat noindex、CSPを確認。5xx 0。
- 固定12会話: 390×844ブラウザー12/12、JSON/SSE/legacy API 36/36。通常40応答でanswer-first・substantive・context retention・citation support各100%、pure clarification 0%。
- 上限・安全: 確認質問1、quick reply 3、回答操作2。カテゴリ飛躍、緊急時通常回答、PII外部送信0。composer・bottom nav・Cookie重なり0。
- Gemini: 稼働4経路の共有モデル `gemini-3.6-flash`、モデルguard 6/6 PASS。
- Runtime境界: JMA取得障害はdegraded表示へfail-safe、未表示県0。実メール・push・決済0。
- Rollback: 条件不成立のため未実施。直前Productionを削除せず保持。

機械可読結果は `evidence/answer-first-chatbot-2026-08-03/production/` に保存した。
