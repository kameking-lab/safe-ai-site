# BACKLOG-fable — Fable 5 手動セッション用キュー（枠は2026-07-07まで）

**運用**: 自動ループには入れない。社長が1日1回 `claude --model claude-fable-5` でセッションを起動し、上から1本「方式確立まで」出し切る。完成度より方式確立が成果物＝確立後の量産・横展開は各レーン（Opus/Sonnet）へ引き継ぐ。ゲート（tsc0/lint errors0/vitest全pass/build成功）・1ブランチ1PR・CI緑のみマージ・捏造0/水増し0/既存破壊0 は全レーン共通ルールに従う。

**7/7時点で未着手・未了のタスクの扱い（降格条件）**: 各タスク末尾の【7/8以降】に従う。

## 未着手（上から処理）
- [x] 【Fable】F1: KY用紙・直接操作UIの方式確立（診断 docs/fable-diagnosis-2026-07-02/02-ky-sheet-ui.md のT1+T2+T3）。useZoomPanフック＋PaperStage＋KyPrintSheetのeditable化＋ヘッダー6欄タップ入力。完了条件=本番相当ビルドで /ky/paper?canvas=1 が初期表示で用紙全体1画面フィット（PC/スマホ両スクショ）→現場名セルタップ→シート入力→用紙反映→localStorage保存。印刷HTML不変をスナップショットテストで最初に固定。【7/8以降】設計書が詳細のためOpusへ降格可。**→ 完了（2026-07-02・PR#609。全欄化T4-/打合せ書横展開T8-はレーンへ）**
- [x] 【Fable】F3: チャットボット生成品質evalの確立（診断04のT7）。実機23問のfixture化＋結論キーフレーズ判定で「検索evalに映らない結論誤り」を測る測定系を新設（chatbot-eval-phase2.tsの実装）。完了条件=RAG+テンプレ層がCIで回帰検出可能・診断04の23問が初期スコアとして記録される。これが無いとOpus/Sonnetのチャットボット改修（ux-tools/dataレーンのO4/O5/O12/S7）の合否が測れないため、着手順はF1の次。【7/8以降】Opusへ降格可。**→ 完了（2026-07-03。fixture=chatbot-genquality.fixture.ts（23問・結論キーフレーズ＋e-Gov正本アンカー）／採点器=chatbot-genquality-scorer.ts（○/△/×の機械化）／CIゲート=chatbot-genquality.test.ts（コーパス正本突合・RAG到達性・T1/T3/T8/T9回帰）／実機測定=npm run eval:chatbot-gen（chatbot-eval-phase2.ts）。誤答1件仕込み→検出をコーパス改変とレスポンス改変の両面で実証。本番ベースラインと失敗分類は docs/chatbot-genquality-eval-2026-07-03.md。残ギャップ（GQ23解雇予告の到達性ほか）はレーンへ）**
- [x] 【Fable】F2: 化学物質・法体系横断の突合パイプライン確立（診断03のT3-3+T3-4基盤）。e-Gov令別表第3/第6の2スナップショット回帰テスト常設＋特別則タグの正本ETL初版＋SubstanceLegalProfile型の設計実証（PR #578 の6点是正を機械検証が再発見できることをもって合格）。完了条件=誤区分を1件でも入れるとCIが落ちる。確立後の全物質展開・毒劇法再構築はdataレーン（O11）へ。【7/8以降】監査パイプラインの発明部分が本体のため、未着手ならOpus降格でなく次のFable枠まで凍結（暫定はT3-3のスナップショットテストのみOpusで先行可）。**→ 完了（2026-07-03。ETL=build-anei-beppyo-snapshot.mjs／CIゲート=src/data/legal/substance-legal-audit.test.ts。誤区分1件でCI落ちを実証・#578の6点＋#584代表6件の再発見テスト常設。健診導出の偽陽性2系統（第三類・エチレンオキシド/ホルムアルデヒド）も令22条突合で新規是正。他法令のデータ源選定と型は docs/legal-mapping-pipeline-2026-07-03.md → 量産はdataレーンO11）**

## 補充の指針
このキューへの補充は「真因不明の再診断・前任結論の再精査・監査ツールの発明・新方式の最初の1画面」のみ。量産・是正・横展開は積まない（各レーンへ）。

**7/8以降（Fable枠終了後）**: 本キューは「凍結棚」として存続。各レーンは発明級を見つけたらここへ1行積んで自分では着手しない。Opus降格の判断基準・次のFable枠での投入順は docs/fable-diagnosis-2026-07-02/11-operation-plan.md「7/8以降の確定運転計画」を正とする。F1〜F3は消化済み（2026-07-03時点で棚は空）。
