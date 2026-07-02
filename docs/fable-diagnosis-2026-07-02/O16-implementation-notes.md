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
- 影響: これで社長が見る1ファイルは launcher が毎回作る。Sonnetタスク S13-a（各レーンプロンプトへ「自レーン行更新」を追記）は本方式で概ね不要になる。S13-a を消化するSonnetレーンは、この事実を確認した上で「launcher単独生成に置換済み」としてスキップ or 縮小してよい。

## planner / critic ワンショットの衝突回避
planner（補給）と critic（点検）は loop-runner.ps1 を `-MaxIterations 1` ＋**別レーンタグ**（`<lane>-planner` / `site-critic`）で起動する。別タグなので永続レーンのガードに弾かれない。かつ **永続レーンを起動する前に**（planner はそのレーン起動直前・critic はレーンループ全体の前に）ブロッキング実行するため、同一クローン内で永続runnerと git 操作が衝突しない。ハングに備え timeout（planner 20分・critic 30分）で kill して続行する。planner は対象レーン名を注入した一時プロンプトを渡す（共有テンプレートに対象BACKLOGを教えるため）。

## 起動系の入口
- 恒久運転の入口は `loop-launcher.ps1`（引数ゼロ）。既存の `scripts/multilane/start-all-lanes.ps1` は単一モデル前提の旧入口で、レーン×モデルの恒久化・opsレーン・補給/点検ゲートを持たない。今後の常設運転は launcher が正。start-all-lanes.ps1 は手動一括起動の予備として残置。
