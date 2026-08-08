# Answer-first chatbot evidence（2026-08-03 JST基準）

このディレクトリは今回の変更だけの検証証跡を収録する。法令回答の基準日は2026-08-03 JST、実装・評価の再検証日は2026-08-08 JST。リリース日は本番反映後に記録し、古い成功報告を現行実測の代用にしない。

- `conversation-evaluation.json`: JSON、SSE、legacy、実ブラウザーの固定12ケース統合集計。
- `browser/conversation-evaluation-browser.json`: 実ブラウザー12ケース。
- `browser/service-first-browser-audit.json` / `.csv`: copy budget、responsive、400%、composer、forced colors、reduced motion、JavaScript無効。
- `full-gate/`: 最終source freeze後に一度だけ実行するfull gateとLighthouse。
- `preview/`: 唯一のPreview URL、SSO、noindex、robots、停止系、12ケースAPI/ブラウザー。
- `production/`: 新旧Deployment ID、candidate/public smoke、rollback判定。
- `independent-review.md`: 実装担当外の読み取り専用Ultraレビュー。
- `../../../../web/src/data/chatbot-eval-results.json`: fresh既存102 retrieval＋22 safety評価。
- `../service-first-copy-reduction-2026-08-02/legal-rag-evaluation-summary.json`: fresh独立固定220件評価。
- `../../legal-conversation-rag-results-2026-08-03.csv`: 今回の18ケースholdoutと固定評価summary。

評価データの区別:

- 追加answer-first holdoutは18ケース・必須根拠54件。canonical SHA-256は`5b290c555603783c69af34decc9e747e0149d892992ed94c9a96c175fb9d73d2`、file SHA-256は`7e2a70878db0cfc79d8cf69fc6fbe0a3322f74d48818c9642f6b3811510a8ef1`。
- 既存独立220件goldは変更していない。checksumは`6a3204bb4d029ded7e5ea9bf23bfe5fd843bfbed6334fb9ba08cba4fc27eff8d`。
- `legal-conversation-rag-results-2026-08-03.csv`のcurrent runと、上記frozen input/checksumを混同しない。

Previewとproductionは各工程を実行した後にだけ記録し、未実行のPASSやDeployment IDを作らない。
