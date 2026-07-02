# cycle-log-ops — 運用・自律運転インフラ班の作業ログ

## 2026-07-03 報告系補充 `最終更新:` を毎イテレーションの正直なハートビート化

BACKLOG-ops の未着手[ ]が line12（掃除系）/line14（perf第2弾実測）の2件のみで、両方とも「他レーン停止＝静穏窓待ち」でブロック（現に6レーン全稼働＝ops07:02/ux-tools07:04/ux-hub06:52）。3件未満につき契約どおり運用4系統（点火・補給・点検・報告）の欠陥から**補充**（機能改善は積まない）。**発見した報告系の欠陥**: 監視ポイント#1「ループが生きているか」の一次シグナルである先頭 `最終更新:` 行を刻印するのは launcher のみ（ログオン＋毎日07:00）。ところが `loop-report-status.ps1` は毎イテレーションこのファイルを書換えるのに `最終更新:` を更新しない＝launcherパス間（07:00〜次回ログオンで最悪ほぼ丸1日）は全レーンが生存していても時刻が凍結。社長は「生存」と「無言の死」を区別できず、実際に本イテレーション冒頭の実ファイルは `最終更新 06:38`（O17前の launcherパス）で凍結し、既に解消済みの「管理者を待っています」大声バナーが偽装表示されていた。**修正**（`loop-report-status.ps1` 当班所有・自己完結）: 書込み直前に region 外の `最終更新:` 行を label 接頭辞（`{NOW}` 前の文字列）一致で**その場更新のみ**（新規作成せず launcher の所有を尊重／strings 欠落時は接頭辞が非日本語キーになり無マッチ＝安全 no-op）。これで `最終更新:` は「少なくとも1レーンが X 時点で生存」の真のハートビートになり、どのレーンかは既存の per-lane `最終稼働` 行が示す。launcher バナー（復活/期限）の一時的staleは次の定期パスで自己修復するため本PRでは触らない。**実測**: (1)`-WhatIf` がハートビート予告を出力しファイル無変更・ロック無取得。(2)実ファイルの temp コピーへ実書込み→`最終更新` 06:38:53→現在時刻へbump、launcher の点火行（`- ops : model=...`・prefix衝突）/他レーン報告行（ux-hub 06:52/#587）/region markers はすべて不変、ops 報告行のみ外科upsert を確認。web/src 不変につき tsc ゲート対象外。

## 2026-07-02 S13-b プロンプト鮮度是正＋バックオフ3段化（5/10/30分）

BACKLOG-ops S13-b を実装＝(1)プロンプトのモデル非依存化 と (2)runnerバックオフ上限の10分→30分延長。**(1)モデル非依存化**: 6プロンプト（data/seo/ux-records/ux-tools/ux-hub の各1行目「あなたは Claude Opus 4.8。」＋各 Co-Authored-By 行のモデル名焼込み、legacy `loop-prompt.txt` は加えて【再開直後の最優先(2026-06-13)】節・「Opus 4.8時代/Fable 5期」の歴史記述・「大きい仕事に向くモデル」の自己申告）を、ops/planner/critic と同じ「モデル名はrunnerの -Model が正であり、自分のモデルを名乗る必要はない」＋「commit(末尾に Co-Authored-By 行・モデル名はセッションの実モデル)」へ置換。処理済みの再開節はloop-prompt.txt からのみ存在したので同時に除去。**実測**: `Opus|Sonnet|Haiku|Fable|4.8|claude-[a-z]|再開最優先|再開直後` を全 loop-prompt*.txt に Grep してマッチ0＝焼込みゼロを確認。**(2)バックオフ3段化**: インライン計算を純関数 `Get-BackoffSeconds($fails,$interval)` へ抽出し 3連続=5分/4連続=10分/5連続以上=30分(1800s)キャップの3段へ拡張（従来は4+で10分キャップ）。normal intervalを下回らない性質は維持。`-SelfTest` スイッチを新設＝Claude CLI/スケジューラ非依存でスケジュール表(fails 0/2/3/4/5/9)＋30分キャップ到達を assert し PASS/FAIL を exit code で返す（契約「PowerShellスクリプトは-WhatIf/ドライラン相当の自己検証」を充足）。**実測**: `powershell -File loop-runner.ps1 -SelfTest` が全6ケースOK＋「30-min cap reached: YES」＝PASS(exit0)、fails=5で1800s到達を確認。web/src 不変につきtscゲート対象外。

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

## 2026-07-03 O17: 自動復活の管理者不要化（Startup フォルダ経由・admin待ちゼロ）

BACKLOG-ops 未着手の最上位は「掃除系一括」だが web/src を触る掃除で他レーン全6本が稼働中（loop-status.md 実測=全レーン起動）のため契約通りスキップ。運用4系統の欠陥から補充＝**点火系の最大欠陥「PC再起動後の自動復活が admin 待ちで数週間未有効」**を着手。

- **実測で前提を検証**: 現行スケジューラ タスク `safe-ai-loop-runner` は RunLevel=**Limited**/LogonType=Interactive/UserId=kanet（＝非elevated）だが action は旧 `loop-runner.ps1 -UntilIso "2026-06-12T08:00:00"`（3週間前に失効した焼込み期限＝O16が殺すはずの失敗が現存）。launcher の -Register 拒否メッセージの理由「既存タスクがelevatedだから更新に admin 必要」は**虚偽**。ただし非admin での Register-ScheduledTask を Limited/Interactive タスクで実プローブ→**Access Denied**＝この環境ではタスク登録自体に admin が要る（＝「残1手動 admin」は不可避）ことを確定。
- **admin不要の本線を新設**: `loop-launcher.ps1 -InstallUserStartup`＝現ユーザー Startup フォルダ（`[Environment]::GetFolderPath('Startup')`・既に note-worker-startup.cmd の先例あり・書込み可を実測）に `safe-ai-loop-launcher.cmd`（`powershell -WindowStyle Hidden -File <launcher>`）を配置。Task Scheduler も admin も不要で PC再起動→ログオン時に launcher が起動し全レーン冪等復活。冪等・-WhatIf対応・post-verify（ファイル存在＋launcherパス参照を確認、無ければ throw）。
- **status の警告を2分岐**: 復活経路（admin の scheduler / admin不要の startup）が**両方無い時だけ大声バナー**（-InstallUserStartup を案内）、**startup済みなら静かなINFO**（再起動復活はOK・-Register は毎日07:00点検の任意上乗せ）。`Get-StartupResurrectionHealth` 追加。-Register 拒否メッセージも正確化し admin不要の -InstallUserStartup を第一推奨に。
- **検証**: PSParser 構文緑／`-InstallUserStartup -WhatIf`（書込みゼロ・would 表示）→実インストール（post-verify PASS・cmd 実配置確認）→ launcher 通常 `-WhatIf` で banner が「startup済み=静かなINFO・scheduler=stale」へ分岐することを dryrun status で実測。web/src 不触＝tsc/lint/build 対象外。
- **効果**: 「残1手動＝管理者で -Register を1回」の admin 依存を解消。Startup エントリ実配置済みのため、次回ログオン以降は admin 操作ゼロで自動復活が効く（毎日07:00の定期点検だけは任意で admin -Register を上乗せ可能）。

## 2026-07-03 ops イテレーション — 横断計測: モバイル Lighthouse 第2弾ハーネス整備（PR: ops/mobile-lighthouse-harness）

自ブランチ未マージ PR ゼロ・main clean を確認。BACKLOG-ops の残タスクは2件とも P2 で、**両方とも静穏なマシンを要求**するため今は実行不可: (1) 掃除系一括＝web/src を触るため他レーン全6本稼働中（loop-status 実測=全レーン起動）は契約通りスキップ、(2) モバイルperf第2弾＝6レーン同時稼働下では CPU 競合で Lighthouse 数値が無効化（第1弾の完了条件は「3回連続安定」）。→ 契約「3件未満なら運用4系統の欠陥から補充」に従い、まず4系統を実測点検した。

- **4系統の健全性を実測**: 点火=launcher/config 正常＋runner の同一レーン多重起動ガード（process scan・fail-open・PID衝突で自exit, loop-runner.ps1:150-178）が launcher の無条件 Start-Process を冪等化＝欠陥なし。補給=planner の open<3 ゲート結線済。点検=critic の criticEveryDays/loop-state.json 結線済。報告=loop-report-status.ps1＋launcher の LANE-REPORT 逐語保存 稼働。**O17（自動復活 admin不要化）も実配置を実測確認**＝Startup フォルダに `safe-ai-loop-launcher.cmd`（launcher 参照）が 06:44 に配置済み（現 loop-status の大声バナーは 06:38 の旧 launcher 生成＝install 前のスナップショットで、次回 launcher pass で静かな INFO へ分岐する）。→ 明白な機構欠陥は無し。
- **補給として横断計測ハーネスを新設**: 保留中のモバイルperf第2弾（line 13）を静穏窓で誰でも1コマンド実行できるよう `scripts/mobile-lighthouse.mjs` を整備。第1弾はアドホックに lighthouse を叩いていたため同じ引数を毎回書き起こす必要があった。計測条件は第1弾と同一（`--only-categories=performance --form-factor=mobile --screenEmulation.mobile`・headless Chrome・localhost 本番ビルド・各3回中央値）。既定11ページ（第1弾達成済 /accidents・/laws・/whats-new を除外し、診断07 C-1 残課題で名指しの /equipment-finder・/chatbot・/law-search を核に実在ルートを採録）。lighthouse は npx 都度取得で **package.json 依存追加なし＝Path A 非侵**。summary.md 末尾に perf<90 ページを起票候補として列挙（起票自体は運用者/planner 担当）。`docs/perf/mobile-wave2-README.md` に手順と保留理由を明記。
- **ゲート（契約3）**: web/src 不触＝tsc/lint/vitest/build 対象外。ドライラン相当の自己検証を実測＝`node scripts/mobile-lighthouse.mjs --dry-run` が Chrome/サーバ無しで 11対象・出力先・lighthouse可用性・サーバ到達性を表示し **exit 0**。異常系も確認（--help=0／unknown arg=FATAL exit 1／不正 targets=明示エラー／--targets 上書き=解釈OK）。
- **BACKLOG-ops 更新**: ハーネス整備を [x] で追加、line 13 を「**実測実行のみ**（ハーネス整備済・静穏窓待ちで保留）」へ書き換え、実行手順と保留理由を明記。

## 2026-07-03 ops イテレーション（復活バナーの正直化＝Set-ResurrectionBanner）
- **PR #602 を squash マージ**（報告系ハートビート#602）→ main を ff-only 同期・clean 確認。未着手[ ]は line14/16 の2件のみで両方とも静穏窓待ち（他5レーン稼働中）＝3件未満につき運用4系統（報告）の欠陥から補充。
- **偽の大声アラームを発見・根絶**: loop-status.md 冒頭に大声バナー「## 注意: スケジューラが未更新（…-Register必須）」が居残る一方、#602 のハートビートが `最終更新` を毎イテレーション現在時刻へ更新するため **新しく見える偽アラーム**として監視ポイント#1を汚染していた。真因＝O17 で Startup エントリ（`safe-ai-loop-launcher.cmd`・06:44 配置）を置いても `-InstallUserStartup` は status を再生成せず `exit 0` する設計のため、install 前に旧 launcher が刻んだ大声バナーが凍結。scheduler は依然 stale だが Startup で PC再起動→復活は担保済＝O17 で admin は「任意」に降格したのに、バナーは admin 必須を煽り続けていた。
- **修正（loop-launcher.ps1 のみ・153+/24-）**: `Set-ResurrectionBanner` 新設。`Get-SchedulerHealth`／`Get-StartupResurrectionHealth` を `-InstallUserStartup` パス手前へ前方移動（重複定義は下部から除去）し、install 成功直後に status のバナー区画だけを外科置換（sched≠ok∧startup=ok→静かなINFO／両ok→バナー除去／両不可→大声）。`-AssumeStartupInstalled` で -WhatIf プレビューが install 後の状態を反映。
- **ASCII 厳守の構造的検出**: この .ps1 は純ASCII（PS5.x が BOMなし日本語を Shift-JIS 誤読）方針のため、日本語リテラルでの照合を排除。バナー区画を **deadline 行接頭辞・lanesHeader・warn/stopped 除外**の全アンカーを loop-status-strings.txt（UTF-8）から実行時読取りして構造的に特定＝現行文言も旧文言も deadline バナー混在も安全に処理。初回試作の日本語リテラル照合は二重バナーを生む不具合を dry-run で検出し撤去。
- **並走安全性**: 6レーンのハートビートと同じ `<status>.lock` を CreateNew+リトライで取得し read-modify-write を直列化（Preview は private dry へ書くため lock 不要）。finally で解放。
- **ゲート（契約3）**: web/src 不触＝tsc/lint/build 対象外。Parser::ParseFile で PARSE OK。-WhatIf ドライランで **大声→静かの1区画のみ置換**・レーン行/LANE-REPORT/監視ポイント/`最終更新`/deadline を diff で逐語保存を実測。full -WhatIf でも同一の静かな INFO 分岐（Scheduler=stale, Startup=ok）を確認。**実 install** で live dashboard の偽アラームを解消＝他5レーン稼働中でも lock で無衝突（並走 heartbeat の 07:23/07:26 の新しい行が残存）・lock 非リークを確認。
- **BACKLOG-ops 更新**: 本タスクを [x] で追加、補充理由（静穏窓ブロックで3件未満→報告系欠陥）を明記。

## 2026-07-03 (O・報告系補充) — 状態ファイルロックのstale-orphan回収（偽「ループ死亡」アラーム予防）

- **背景**: BACKLOG-ops 未着手[ ]は掃除系/perf実測の2件のみ・両方とも全6レーン稼働中で静穏窓待ちブロック（3件未満）→補充の指針に従い運用4系統(報告)の欠陥から補充。#602(ハートビート正直化)/#608(復活バナー正直化)が偽アラームを掃討してきた延長線上の残穴。
- **欠陥（実測で構造確認）**: loop-report-status.ps1 と loop-launcher.ps1 は同一の `docs/loop-status.md.lock` を `CreateNew` で取得するが、holder が mid-write（Ctrl-C／スリープ／クラッシュ）で殺されると `.lock` が finally に到達せず**永久に残存**。以後の全報告・バナー整合がロック取得を25回リトライ（5s）→失敗→非致命スキップ＝毎イテレーションのハートビート(`最終更新`)が凍結し、監視ポイント#1で「生存」と「無言の死」が区別不能に＝**偽の大声アラーム**を生む（#602/#608と同族）。
- **修正（loop-report-status.ps1 +51/-13）**: ロック取得を `Get-StatusLock($lockPath,$StaleSeconds=60,$Tries=25,$DelayMs=200)` に関数化＝正当な保持は全6レーン直列でも sub-second なので **60s 超のロックは live でありえない**→`Get-Item.LastWriteTime` で齢を測り stale なら**1回だけ外科回収して即retry（sleepなし）**、fresh lock は尊重して回収せず（過剰回収を防止）。二重回収レースは last-writer-wins に縮退（lock が既に許容）。
- **修正（loop-launcher.ps1 +12/-3）**: バナー整合の同一ロックループに同じ stale 回収をインライン適用（launcher は単発利用なので関数化せずインラインで launcher 流儀に合わせた）。
- **自己検証（契約3）**: `-SelfTest`（Claude/実status/ネット不要・temp限定）新設。(A)ロック無しからの clean acquire→true＋lock残置、(B)**fresh** foreign lock は回収されず→false＋残存、(C)**stale**（-120s backdate）は回収されacquire→true、の3系5アサート。`-Lane selftest -SelfTest` が **ALL PASS(exit 0)** を実測。
- **無回帰**: reporter `-WhatIf`（lock非取得のまま行計算）・launcher `-WhatIf`（banner reconcile を dry へ・7レーン点火予告）とも従来通り clean 実行を実測。
- **ゲート**: web/src 不触＝tsc/lint/build 対象外。ps1 のみ＋BACKLOG/cycle-log。
- **BACKLOG-ops 更新**: 本タスクを [x] で追加、補充理由を明記。
