# cycle-log-ops — 運用・自律運転インフラ班の作業ログ

## 2026-07-02 S13-a 報告の一元化（loop-status.md 自己報告区画）

BACKLOG-ops S13-a（報告の一元化）を実装。診断08 §D「各レーンがイテレーション末尾に最終稼働・直近マージPR・残open・判断1行を1ファイルへ書く」を、O16逸脱2の「launcher単独生成で概ね不要」判断を覆して正式実装した（理由: launcherは点火/日次でしか更新できず、permanent runnerが回る大半の時間は行が固定＝§Dの per-iteration 鮮度を原理的に出せない）。新規 `loop-report-status.ps1`（レーン別に最終稼働/直近PR(git log origin/main の`(#NNN)`・レーンscope優先)/残open(BACKLOG-<lane>.mdの`- [ ]`数)/判断1行を、`<!-- LANE-REPORT:BEGIN…END -->`区画へ**自レーン行だけ外科upsert**・ロックファイルで6レーン直列化・全失敗を非致命化・ASCIIソース＋`-WhatIf`）。集約は launcher が点火時に環境変数 `SAFE_AI_LOOP_STATUS`＝本体リポジトリの docs/loop-status.md 絶対パスを子へexportし、別クローンのレーンも**1ファイル**へ書く（loop-status.md は gitignore なので追跡churn無し）。launcher は全面書換え時に区画を**逐語保存**（`Add-LaneReportSection`）＋初回は enabled レーン数だけプレースホルダ行。loop-status-strings.txt に reportHeader/reportLine/reportEmptyNote/reportPlaceholder を追加。6レーンプロンプトに step5.5（報告一元化）を追記。**実測**: launcher `-WhatIf` で scaffold生成＋生きた行(ux-hub PRESERVE-TEST-ROW)の保存を確認、reporter で ops/data 2レーンが環境変数経由で同一ファイルへ書込み・ops再報告が行を重複せず置換（count=1）を確認＝S13-a完了条件充足。規約の正本は O16-implementation-notes.md「逸脱2の解消」。

## 2026-07-02 O16 一括（点火の恒久解＋補給＋点検）

BACKLOG-ops O16-a/b/c を1PRで実装。運転計画(11-operation-plan.md)手順①。

- **O16-a 点火の恒久解**: `loop-config.json`（untilIso/lanes×model/intervalを1ファイル化）＋ `loop-launcher.ps1`（引数ゼロ・configを読み6レーンをレーン別`-RepoPath`で冪等起動。ops=main tree、5コンテンツレーン=../safe-ai-lanes/<lane>クローン）。タスクスケジューラ `safe-ai-loop-runner` を launcher(引数ゼロ)＋「ログオン時＋毎日07:00」で再登録（`loop-launcher.ps1 -Register`）。**期限焼込みを排除**＝延長は loop-config.json の untilIso 1行のみ、スケジューラ再登録は二度と不要。期限超過時は `docs/loop-status.md` に停止バナーを書いて起動せず終了、毎日07:00再判定でバナーが更新され続ける＝「静かな死」を可視化。近接期限は稼働中に予告（warnWithinDays）。
- **O16-b 補給**: `loop-prompt-planner.txt`。launcher が各レーンBACKLOGの open<3 を検知したら、当該レーン起動直前に planner ワンショット（別タグ`<lane>-planner`・-MaxIterations 1・対象レーン注入の一時プロンプト）を先行実行。水増し禁止・実測完了条件必須をプロンプトで強制。
- **O16-c 点検**: `loop-prompt-critic.txt`。lastCriticIso（gitignore の loop-state.json）から criticEveryDays 超過でレーンループ前に critic ワンショットを1回起動→ critique docs 生成＋S/A級を該当レーンBACKLOG冒頭へ注入。
- **設計逸脱2点**（理由は O16-implementation-notes.md）: (1)可変状態 lastCriticIso は追跡config でなく gitignore の loop-state.json へ（opsレーンのclean-tree契約維持）。(2)loop-status.md は各レーン書込みでなく launcher単独生成＋gitignore（クロスクローン衝突回避、S13-aを概ね置換）。
- **検証**: PSParser構文チェック緑、`-WhatIf` スタブ試走（本物のclaude不使用）で config parse→期限判定→critic/plannerゲート→6レーン起動計画→status生成を確認。期限切れconfigで停止バナー分岐も確認。
- 次: 手順③（常設レーン点火）＝ launcher 実起動で data/seo/ops=Opus・ux系3本=Sonnet5 を立ち上げ。手順②(Fableデイリー)は社長の手動運用。
