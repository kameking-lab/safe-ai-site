# Answer-first chatbot state（2026-08-03 JST基準）

実装・評価の再検証日: 2026-08-08 JST。法令回答は実行時計ではなく、確認済み一次資料の監査上限である2026-08-03 JSTへ固定した。リリース日は本番反映後に記録する。

## 結果

逆質問を回答前の必須ゲートにしていた分類処理を廃止し、JSON、SSE、AI OFF、retrieval-only、no-script、ホーム引継ぎ、follow-up、legacy `/api/chat`を同じanswer-first契約へ統一した。通常応答は、結論、条件、必要な場合だけ確認質問1件、quick reply最大3件の順で返す。

- 「電気作業の資格は？」: 電気工事士が関係する配線・設備工事と、安衛則上の低圧・高圧・特別高圧の充電電路等に係る特別教育を先に説明し、最後に作業区分を1件だけ確認する。
- 続く「作業主任者」: 電気作業全般に共通する作業主任者制度ではないこと、安衛法14条・施行令6条の指定作業と、安衛則350条の作業指揮者は別制度であることを説明する。酸欠・有機溶剤・石綿へは飛ばない。
- 広い資格質問、手すり、玉掛け、高所作業車、酸欠監視、有機溶剤、範囲外質問も、現在分かる結論を先に返す。緊急・PIIだけは検索・キャッシュ・外部AIより前で遮断する。

## 会話評価

2026-08-08に固定12ケースをJSON、SSE、legacy、実ブラウザーで再実行した。通常質問40応答の集計は次のとおり。

| 指標 | 実測 |
| --- | ---: |
| answer-first率 | 100% |
| substantive answer率 | 100% |
| pure clarification率 | 0% |
| context retention率 | 100% |
| clarification correctness | 100% |
| citation support率 | 100% |
| 確認質問最大数 | 1 |
| quick reply最大数 | 3 |
| 回答操作最大数 | 2 |
| 無関係カテゴリ飛躍 | 0 |
| 緊急時通常回答 | 0 |
| PII外部送信 | 0 |

機械可読結果は `evidence/answer-first-chatbot-2026-08-03/preview/conversation/` と `evidence/answer-first-chatbot-2026-08-03/production/conversation-evaluation.json` に固定した。

## 法令RAG

- 既存固定評価: retrieval 102/102、safety abstention 22/22、MRR 0.8757、Citation@1 80.4%、Layer 2 false positive 0%、hallucination detection 100%。既存質問・goldは変更していない。
- 独立固定220件: retrieval対象140ケースでRecall@5 100%、MRR 0.9776、nDCG@10 0.9842、条文Top-1精度135/140（96.43%）。citation support 100%、施行日精度100%、dangerous miss 0。全220件中210件が通常PASSで、残る10件は未収録の過去時点一次資料を捏造せず保留した安全なsource gapである。
- 追加holdout: 18ケース、必須根拠54/54、primary MRR 0.9352。テスト21/21 PASS。既存220件のchecksumは変更していない。

対象コーパスは25法令・2,933条文・63確認済み抜粋・確認済み厚労省告示276号1件。未確認・隔離中通達は回答根拠から除外する。

## Gemini

稼働中の生成4経路（chatbot JSON、chatbot SSE、建設計算、KY提案）は、固定GAモデル `gemini-3.6-flash`へ統一した。JSON・SSE・KYは保守中の`@google/genai` 2.16.0へ移行し、旧SDK、旧モデル、3.6で廃止された生成parameter、prefilled model turnは0。RESTのAPIキーはURLへ含めず`x-goog-api-key`で送る。モデル固有health probe、timeout・abort、外部AI release flagを維持する。

## UI・サイト横断

390×844を基準に、回答後のcompact chip、折りたたみ根拠、回答操作最大2、1本の会話、sticky composerの非重なりへ整理した。サイト横断ブラウザー監査は、copy budget 16画面で主操作前最大104文字・通常時警告カード0・内部評価語0、responsive 10画面を320〜1440pxでoverflow 0、3画面を200%・400%相当でoverflow 0、chatbotでforced colors・reduced motion・composer overlap 0、12画面でJavaScript無効時の主操作を確認した。

## Release結果

- full gate: 123 critical suites、TypeScript、ESLint、全Vitest、全Playwright、production build、npm audit、法令・AI safety・JMA/WBGT・chemical・KY・事故・Visual KYT・automation・CSP・rate limit・SEO・responsive・accessibility・LighthouseをPASS。失敗ID0。
- 独立最終レビュー: GO。P0=0、P1=0。独立重点1042/1042 tests PASS。
- Preview: `dpl_A3sDGZT8veqfQ5dSu8kgX5Bys9Zh`。SSO/noindex/robots/dry-run境界と12会話のAPI・実ブラウザーをPASS。
- Production: `dpl_ZDfFpkGCS2p86xXeavP4w2y5gPZb`をpromote。主要14 GET、12会話×JSON/SSE/legacy、390pxを含む公開ブラウザーsmokeをPASS。rollback条件なし。
