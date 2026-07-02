# BACKLOG-ops — 運用・自律運転インフラ班のタスクキュー（2026-07-02新設）

担当領域: リポジトリ直下の loop-*.ps1 / loop-*.txt / loop-config.json / BACKLOG*.md の運用機構 / docs/loop-status.md / タスクスケジューラ登録 / 横断計測スクリプト。**web/src は原則触らない**（掃除系タスクのみ例外・他レーン停止時間帯に実行）。契約・絶対ルールは loop-prompt-ops.txt を参照。

## 未着手（上から処理）
- [x] 【Opus・P0】O16-a: 点火の恒久解＝loop-config.json＋loop-launcher.ps1（引数ゼロ・configのlanes/model/untilIsoを読んで各レーンrunnerを冪等起動）＋タスクスケジューラ再登録（launcherを「ログオン時＋毎日07:00」・引数焼込みゼロ）。untilIso超過時は docs/loop-status.md に停止理由を書いてから終了（黙って死なない）。設計は docs/fable-diagnosis-2026-07-02/08-autonomous-operations.md §A。→ 2026-07-02完了(PR)。恒久解3層＋逸脱2点は docs/fable-diagnosis-2026-07-02/O16-implementation-notes.md 参照。
- [x] 【Opus・P0】O16-b: 補給の自動化＝loop-prompt-planner.txt 新設（レーンBACKLOG open<3 で launcher が当該レーンで planner を1回先行起動。補充源の優先順=①診断docsの未起票タスク②直近critique S/A残③第三者レビュー自己診断。水増し禁止・実測完了条件必須を強制）。→ 2026-07-02完了(PR)。launcherに open<3 ゲート＋対象レーン注入の一時プロンプト＋別タグ非衝突ワンショットを実装。
- [x] 【Opus・P1】O16-c: 点検の自動化＝loop-prompt-critic.txt 新設＋launcher連動（lastCriticIsoから7日超で通常レーンより先に1回起動→docs/site-critique-<date>/ 生成→S/A級を該当レーンBACKLOG冒頭へ注入→lastCriticIso更新）。→ 2026-07-02完了(PR)。lastCriticIsoは gitignore の loop-state.json に保持(逸脱1)。
- [x] 【Sonnet・P1】S13-a: 報告の一元化＝docs/loop-status.md 規約新設＋各レーンプロンプトへ「イテレーション末尾に自レーン行を更新」を追記。→ 2026-07-02完了(PR)。新規 loop-report-status.ps1（レーン別に最終稼働/直近PR/残open/判断1行を外科upsert・ロック直列化・非致命）＋launcherが `SAFE_AI_LOOP_STATUS` を子へexportし集約先1ファイルへルーティング＋`<!-- LANE-REPORT -->`区画を逐語保存＋6レーンプロンプトに step5.5 追記。O16逸脱2（S13-a不要判断）を解消＝launcher単独生成は per-iteration更新できず§Dを満たせないため正式実装。完了条件（2レーン→status反映・再報告で重複せず置換）を実測確認。詳細は O16-implementation-notes.md「逸脱2の解消」。
- [x] 【Sonnet・P1】S13-b: プロンプト鮮度是正＝loop-prompt*.txt から「あなたはOpus 4.8」等のモデル名直書き・処理済みの【再開最優先2026-06-13】節を除去しモデル非依存化（runnerの -Model が正）。バックオフ上限を10分→30分の3段（5/10/30）へ延長。完了条件=全プロンプトにモデル名焼込みゼロ・runnerのバックオフテスト（ドライラン）で30分到達。→ 2026-07-02完了(PR)。6プロンプト(data/seo/ux-records/ux-tools/ux-hub＋legacy loop-prompt.txt)の1行目モデル自己申告と Co-Authored-By のモデル名焼込みを「モデル名はrunnerの -Model が正」＋「Co-Authored-By 行・モデル名はセッションの実モデル」へ置換、legacy から【再開直後の最優先(2026-06-13)】節と Opus/Fable 期の歴史記述を除去。焼込みゼロを Grep で実測（マッチ0）。runner バックオフを Get-BackoffSeconds へ関数化し 3→5分/4→10分/5+→30分の3段化＋`-SelfTest` ドライラン新設（Claude CLI不要・6ケース＋30分キャップ到達をアサート）→ `powershell -File loop-runner.ps1 -SelfTest` が PASS(1800s到達)を実測。
- [ ] 【Sonnet・P2】掃除系一括（他レーン停止時間帯に実行・1PR/群）: lint警告46件（33件は--fix、ky-paper-viewのexhaustive-deps 2件は手当）／scripts/audit/internal-link-graph.json 再生成／news-feed LLM判定基準の明文化（週次熱中症搬送記事の承認ゆらぎ是正）。診断 07-residuals-sweep.md P2群。
- [ ] 【Sonnet・P2】モバイルperf第2弾の再計測のみ（是正はしない）: 残り11ページのLighthouseモバイル実測を記録し、perf90未満だったページだけを該当レーンへ【Opus】タスクとして分割起票。診断07 P1-6。

## 補充の指針
運用機構の欠陥（点火・補給・点検・報告の4系統）と横断計測のみ。機能改善は積まない。
