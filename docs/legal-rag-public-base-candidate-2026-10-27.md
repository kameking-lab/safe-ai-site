# 本番コードと整合した法令RAGローカル候補

> 続きのローカル実装・検証は[配備準備と更新方針](legal-rag-release-readiness-2026-10-27.md)を参照。以下はdb0b708d段階の記録。

## 対象と変更

専用worktree `safe-ai`、ローカル枝 `codex/legal-rag-public-base-20261027`。旧枝 `codex/legal-rag-five-law-mvp-20261026` は `2cd1a990` に保持した。未コミット作業がないことを確認してから、本番 `bbc4bb730d77ee425ec463e9dce26d606b81556a` をmerge `5f3b4522` で取り込んだ。競合解決は不要だった。

本番との機能差分は既存の未公開RAG。既存25法令、犬、不要説明の削除、home/nav、法令検索・改正表示、E2E、package/lockは本番を保持した。Next **16.4.1**、Nextから解決するsharp **0.35.5**、Vitest **4.1.12**、Vite **8.1.6** をローカル実依存でも確認した。

追加コード `9076e14ff8f78a80f9011bee13afbc4f806f7d7c` は2ファイル18行。「今日・現在・現行・最新」等を固定資料日2026-10-26へ置き換えず、作業日を年月日で確認する。明示日と相対指定の併記も保留する。明示2026-10-26の根拠付き回答は維持する。

## 代表質問と確認できる出典

回答は保存資料の条件説明と原文確認を提供する。質問の条件が不足する場合の個別適用状態はunknown。対象日は **2026-10-26** であり、現在の効力確認を示すものではない。

| 代表質問 | 根拠の対応 | 確認を求める条件 |
| --- | --- | --- |
| 「2026年10月26日の玉掛け資格・特別教育は？」 | 安衛法61→安衛令20条16号→クレーン則221。安衛法59条3項→安衛則36条19号→クレーン則222 | 機種、機械のつり上げ荷重、玉掛けか運転か、資格・教育歴。吊荷重量との区別、0.5t/1t境界、教育省略条件を保存根拠で説明 |
| 「酸欠作業主任者と作業者の教育はどう違う？」 | 安衛法14→安衛令6条21号・別表6→酸欠則2/11。安衛法59条3項→安衛則36条26号→酸欠則12 | 場所構造、内容物、第一種/第二種、役割、講習歴、作業日。大臣指定場所の全範囲は未確認 |
| 「クレーン則91条の準用と読み替えは？」 | クレーン則91と56の原文を対応表示 | 移動式クレーンか、検査証・休止条件。91条だけで検査要否や使用再開可を確定しない |
| 「今日の玉掛け資格は？」 | 現在の効力を固定snapshotで補わず保留 | 明示した作業日を確認する |

5法令の原文は既存のe-Gov API取得物を使用。法ID・履歴ID・取得日時・原XML hash・条項号・XML位置・資料種別を維持する。下記は再取得を実行するためのリンクではなく、保存データの出典記録。

| 法令 | 履歴ID | 保存時の公式出典 |
| --- | --- | --- |
| 安衛法 | `347AC0000000057_20261001_507AC0000000033` | [e-Gov取得元](https://laws.e-gov.go.jp/api/2/law_data/347AC0000000057?asof=2026-10-26&response_format=json&law_full_text_format=xml&omit_amendment_suppl_provision=false) |
| 安衛令 | `347CO0000000318_20261001_508CO0000000196` | [e-Gov取得元](https://laws.e-gov.go.jp/api/2/law_data/347CO0000000318?asof=2026-10-26&response_format=json&law_full_text_format=xml&omit_amendment_suppl_provision=false) |
| 安衛則 | `347M50002000032_20261001_508M60000100116` | [e-Gov取得元](https://laws.e-gov.go.jp/api/2/law_data/347M50002000032?asof=2026-10-26&response_format=json&law_full_text_format=xml&omit_amendment_suppl_provision=false) |
| クレーン則 | `347M50002000034_20260401_508M60000100003` | [e-Gov取得元](https://laws.e-gov.go.jp/api/2/law_data/347M50002000034?asof=2026-10-26&response_format=json&law_full_text_format=xml&omit_amendment_suppl_provision=false) |
| 酸欠則 | `347M50002000042_20260401_508M60000100003` | [e-Gov取得元](https://laws.e-gov.go.jp/api/2/law_data/347M50002000042?asof=2026-10-26&response_format=json&law_full_text_format=xml&omit_amendment_suppl_provision=false) |

datasetは2,187文書（本則1,696・改正附則372・別表/様式119）、24,948,799 bytes。SHA256 `426e545590de90c0f66302a59b326c0eee83d8cd999c2b8535c48931510a6acb` を再照合した。原文再収集・既存データ上書きは行っていない。

## 差分検証と独立レビュー

- 本番依存をlockどおりに同期した。initial runは7ファイル209件PASS、API接続1ファイルはPrismaローカルクライアント未生成でimport前に停止。既存schemaからクライアントを生成（DB接続なし）後、その1ファイルだけ再検査し67件PASS、skip0。合計 **8ファイル276件PASS**。単一worker、Node heap 1GB。実行時間は初回15.79秒、API接続5.36秒。
- 対象はRAG HTTP JSON/SSE/no-JS/全文閲覧、代表横断根拠、時点・引用・UI、既存fallback、本番側のsearch-index/law-search/revision表示。API接続テストは外部fetchを禁止。追加は相対日付保留の回帰1ケースのみ。
- 変更2ファイルのESLint、`git diff --check`、storage deployment guard（3,787ファイル）PASS。
- 独立Astraはmerge `5f3b4522` と追加 `9076e14f` を読み取り確認。新規P1/P2なし。テストは実装担当の実行証跡として区別している。
- 旧候補 `f004707f` の760件および全体tsc PASSは歴史的証跡として維持。今回新HEADの全体tscは未実行で、旧結果を新HEADのPASSとして扱わない。全体build・追加サーバー・GitHub Actions再実行は行っていない。
- ローカル証跡は作業領域の `rag-public-base-delta-tests-20261027.json`、`rag-public-base-api-tests-20261027.json`、`rag-public-base-candidate-20261027.json`。初回import失敗も保存している。

## 未対応の範囲と追加公開1回に必要な作業

既存25法令の検索経路は維持する。今回の追加構造データ・代表横断応答は5法令の上記範囲に限定される。全25法令の附則/別表、全参照・準用、告示・通達/Q&A、期間別改正版、経過措置の個別適用、未取得68図の内容解釈は未対応。図を必要とする問いは不足を明示する。

公開前には次をローカルで実装・検収する必要がある。今回の本番同期で配置・起動条件は変更していない。

1. 固定データの本番用読み取り専用配置、配備物への同梱確認、5法令/履歴/hash/対象日の検証と不一致時の停止。現在のCWD相対ローカルパスをそのまま配備に流用しない。原本・manifestを一組で版管理し、旧版へ戻せる更新手順を用意する。
2. 本番用の明示的な有効化・即時無効化と全文閲覧経路の検証。現在はproduction/Vercelで必ず無効。ローカルフラグだけを本番へ通す変更では完了しない。
3. 現loaderの毎回約25MB読込/hashの負荷を減らす方式と、検索/全文表示の性能・現在日付/未収録範囲の表示を検証。統合後の全体型検査、必要な差分テスト、独立レビューを完了する。

上記を含む最終候補を本人が確認した後、GitHubの通常PR/必要CIを経て **Vercel本番build/deploy追加1回** にまとめる。今回その追加公開を実行していない。既存Vercelのbuild/hosting使用量に費用が生じる可能性があるが、金額は未算出。このMVPの保存データ検索・条件説明は新しいembedding/LLM/APIキーや本番DB反映を必要としない。料金・商品・規約の変更は含まない。
