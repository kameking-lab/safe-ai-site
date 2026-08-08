# Answer-first production result（2026-08-03 JST基準）

- Status: DEPLOYED / PASS（2026-08-08 JST）
- Production URL: https://www.anzen-ai-portal.jp/
- New Deployment ID: `dpl_ZDfFpkGCS2p86xXeavP4w2y5gPZb`
- Previous Deployment ID: `dpl_F5nbj5gPCdxNXDQa3tYSWFYVHoyz`
- Candidate smoke: READY、主要6 GET 200、固定12会話をJSON/SSE/legacyでPASS。promote前に`www`が旧IDを維持することを確認した。
- Public HTTP smoke: `/`、`/chatbot`、`/law-search`、`/risk`、`/chemical-ra`、`/ky/paper`、事故、法改正、Visual KYT、automation、safety-aiを含む主要14 GETが200。
- indexability: 通常ページの`X-Robots-Tag` noindex 0、一般crawlerは`Allow: /`、`sitemap.xml`と`sitemap-index.xml`は200。heat noindex回帰なし。
- Public conversation: 12ケース×JSON/SSE/legacy、通常30応答。answer-first 100%、substantive 100%、pure clarification 0%、context retention 100%、引用支持100%、カテゴリ飛躍0、緊急時通常回答0、PII外部送信0。
- Public browser: copy budget、320〜1440px、200%・400%、390px composer、根拠details、quick reply、bottom-nav/Cookie overlap、keyboard、forced colors、reduced motion、JavaScript無効をPASS。直前30 API要求による想定どおりの429は`Retry-After`後の単独再試験でPASS。
- Gemini: active生成4経路とhealth probeを`gemini-3.6-flash`へ統一。旧文字列は過去管理レポートだけで、稼働APIにはない。
- review: full gate PASS、独立レビューGO、P0=0、P1=0、P2=1（評価の呼称上の注意）、P3=2（非blocking）。
- rollback: 条件該当なし。未実施。直前Deploymentは復旧先として保持。

機械可読証跡は`evidence/answer-first-chatbot-2026-08-03/production/`に保存した。
