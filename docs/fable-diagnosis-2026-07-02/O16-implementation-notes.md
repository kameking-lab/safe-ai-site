# O16 実装ノート（loop-launcher.ps1 / loop-config.json）2026-07-02

診断08 §A〜§D の設計に忠実に実装した。実機で成立させるため2点だけ最小修正した。理由を残す。

## スケジューラ期限焼込み問題の恒久解（この実装の主眼）

真因（診断08）は「期限をスケジューラ登録時に焼き込む → 延長判断が人間の記憶依存」＋「期限切れで exit 0 の静かな死 → 停止が3週間不可視」の複合。恒久解を3層で入れた:

1. **期限を config に分離**: `loop-config.json` の `untilIso` 1行が唯一の稼働期限。スケジューラの Action には引数を一切焼き込まない（`loop-launcher.ps1` を引数ゼロで呼ぶだけ）。延長＝この1行を書き換えるだけ。スケジューラの再登録は二度と不要。
2. **毎日07:00トリガで「静かな死」を可視化**: トリガを「ログオン時」＋「毎日07:00」の2本にした。期限超過時、launcher はレーンを起動せず `docs/loop-status.md` の最上部に大きな停止バナー（「!!! 停止中: 稼働期限を超過 !!!」＋再開手順）を書いて終了する。毎日07:00にこの判定が再実行されるので、バナーは毎日更新され続ける＝「1回成功して消える」旧挙動と違い、止まっている事実が常に見える。
3. **期限切れ前の予告**: `warnWithinDays`（既定3日）以内に入ると、レーンが**まだ稼働中のうちに** loop-status.md へ「残りN日・今のうちに延長を」と予告する。旧設計の鶏卵（期限を延長すべき"次スプリント"が、期限切れで発火しなかった）を、稼働中の予告で断つ。

副次効果: 毎日07:00の再起動は、死んだレーンの**自動復活**も兼ねる（loop-runner.ps1 のレーン別単一インスタンスガードにより、生存レーンは自己終了・死亡レーンだけ再起動＝冪等）。

## 設計からの最小逸脱2点（理由付き）

### 逸脱1: 可変状態は loop-config.json ではなく gitignore の loop-state.json に置く
08 §A は `lastCriticIso` を loop-config.json に置く設計。しかし **opsレーンは本体リポジトリ(main tree)で走る**ため、launcher が追跡対象の loop-config.json を毎回書き換えると、opsレーンの「git clean を確認して終える」契約が常に破れる（tree が汚れっぱなし）。
- 最小修正: 人手編集する不変設定（untilIso/lanes/model/criticEveryDays）は追跡する loop-config.json に残し、launcher が書き換える可変状態（lastCriticIso）だけを **gitignore の loop-state.json** に分離した。config分離の設計意図（期限は1行・版管理）はそのまま保つ。

### 逸脱2: loop-status.md は「各レーンが自分の行を書く」のではなく launcher単独が生成（gitignore）
08 §D は各レーンがイテレーション末尾に自分の行を更新する設計。しかし**各レーンは別クローンで走る**ため、追跡ファイルに各クローンから行を書くと恒常的なクロスクローン衝突・churn になる。
- 最小修正: launcher が本体リポジトリで全レーンを config から知っているので、観測可能な状態（実行中プロセス走査・最新ログの時刻・BACKLOG の open 数）から**consolidatedな loop-status.md を単独生成**する。gitignore にしてローカル専用にする（版管理しない実行時ダッシュボード）。
- 影響: これで社長が見る1ファイルは launcher が毎回作る。

### 逸脱2の解消＝S13-a を実装した（2026-07-02）
逸脱2は「S13-aは概ね不要」と判断したが、これは**過小評価だった**。launcher単独生成は「ログオン時／毎日07:00／点火時」しか更新されない＝permanent runnerが回っている大半の時間は行が固定のまま（最新PRも判断も反映されない）。§Dが求める「イテレーション末尾ごとの最終稼働・直近PR・残open・判断1行」は、launcherには per-iteration フックが無いので原理的に出せない。よって S13-a を正式実装した。逸脱2が挙げたクロスクローン衝突の懸念は次の設計で解消済み:
- **追跡ファイルchurn無し**: loop-status.md は gitignore。各クローンから書いても版管理は汚れない。
- **集約先は1ファイル**: launcher が点火時に環境変数 `SAFE_AI_LOOP_STATUS`＝本体リポジトリの docs/loop-status.md 絶対パスを子（各レーンrunner）へ export。別クローンで走るレーンも自分のローカル複製ではなく**この1ファイル**へ書く。解決順は `-StatusPath` > 環境変数 > `<clone>/docs/loop-status.md`（最後はopsレーン＝本体リポジトリ用の正しい既定）。
- **衝突しない上書き**: 各レーンは `loop-report-status.ps1` で自レーン行だけを外科的に upsert（キー`- <lane> :`・置換のみ・重複しない）。6レーン同時書込みはロックファイルで直列化。失敗は全て非致命（レーンのイテレーションを壊さない）。
- **launcherが領域を保存**: launcher の全面書換え時、`<!-- LANE-REPORT:BEGIN … END -->` 区画を**逐語保存**するので生きた行が消えない。区画が無い初回は enabled レーン数だけプレースホルダ行を出す。
- **規約（このファイルが正）**: 本体上部＝launcher所有（期限バナー/スケジューラ健全性/点火行）、区画＝レーン所有（自己報告）。マーカーはASCIIリテラル固定。日本語ラベルは loop-status-strings.txt（reportHeader/reportLine/reportEmptyNote/reportPlaceholder）。両スクリプトともASCIIソース＋`-WhatIf`ドライラン自己検証つき。
- 実測: launcher `-WhatIf` で区画scaffold生成・生きた行の保存を確認。reporter で2レーン（ops/data）が環境変数経由で同一ファイルへ最終稼働/直近PR/残open/判断1行を書込み・再報告が行を重複せず置換することを確認（S13-a 完了条件を満たす）。

## planner / critic ワンショットの衝突回避
planner（補給）と critic（点検）は loop-runner.ps1 を `-MaxIterations 1` ＋**別レーンタグ**（`<lane>-planner` / `site-critic`）で起動する。別タグなので永続レーンのガードに弾かれない。かつ **永続レーンを起動する前に**（planner はそのレーン起動直前・critic はレーンループ全体の前に）ブロッキング実行するため、同一クローン内で永続runnerと git 操作が衝突しない。ハングに備え timeout（planner 20分・critic 30分）で kill して続行する。planner は対象レーン名を注入した一時プロンプトを渡す（共有テンプレートに対象BACKLOGを教えるため）。

## 起動系の入口
- 恒久運転の入口は `loop-launcher.ps1`（引数ゼロ）。既存の `scripts/multilane/start-all-lanes.ps1` は単一モデル前提の旧入口で、レーン×モデルの恒久化・opsレーン・補給/点検ゲートを持たない。今後の常設運転は launcher が正。start-all-lanes.ps1 は手動一括起動の予備として残置。
