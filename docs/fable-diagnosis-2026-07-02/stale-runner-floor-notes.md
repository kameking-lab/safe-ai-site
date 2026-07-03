# 点火系: live-but-ancient runner floor 調査＋協調的cycle 実装ノート（2026-07-03）

BACKLOG-ops「点火系: hot-swap 未搭載の旧 runner floor 調査＋設計」の記録。設計正本は
`08-autonomous-operations.md` §A（点火）、hot-swap 本体は #675、heartbeat は #672。

## 1. 仮説と実測（floor 該当の確認）

**仮説**: 永続 runner は起動時にスクリプト全体をプロセスへ読み込むため、hot-swap self-update
(#675) / runner駆動 heartbeat (#672) が landing する **前に起動していた** live runner は self-update
コード自体を持たず、clone が新コードを pull しても永久に stale。watchdog / `-HealOnly` は **DEAD**
runner しか復活させない（Get-LanesToHeal は「不在レーン」だけを対象）ため、live-but-ancient runner は
既存のどの復旧経路からも不可視で、PC 再起動まで旧コードを実行し続ける。

**実測**（2026-07-03 17:4x JST、6レーン稼働下で `Get-CimInstance Win32_Process` のプロセス起動時刻）:

| lane | PID | プロセス起動 | 判定 |
|------|-----|------------|------|
| ops | 26724 | 2026-07-03 06:38:54 | **below floor** |
| data | 15124 | 2026-07-03 06:38:57 | **below floor** |
| seo | 16248 | 2026-07-03 06:39:00 | **below floor** |
| ux-tools | 26040 | 2026-07-03 06:39:03 | **below floor** |
| ux-records | 23452 | 2026-07-03 06:39:06 | **below floor** |
| ux-hub | 32276 | 2026-07-03 06:39:10 | **below floor** |

fix の landing 時刻（`git log --first-parent main`）:
- #672 heartbeat: 2026-07-03 **13:30:22** +0900
- #675 hot-swap self-update: 2026-07-03 **13:43:09** +0900

6レーン全てが両 fix の landing より **約7時間前** に起動 ⇒ **全6レーンが floor 該当**。#672 を持たない
ため heartbeat を打てず（telemetry の「seo/ux-records が runner旧版で heartbeat未搭載」表示の真因。
他4レーンはエージェントが step5.5 を実行し行が新しく見えていただけで、runner 自体は同じく未搭載）、
#675 を持たないため self-update で自ら exit できず、永久に stale。**過剰対応ではなく実在の floor**。

## 2. 設計: version-floor marker ＋ 協調的 cycle

「実行中イテレーションを壊さない end-of-iteration 合図」を、**live runner にコードを注入せず**
（注入不能＝それが floor の定義）**外部プロセス（launcher/watchdog）から** 実現する。

### version-floor marker
`loop-config.json` に `runnerFloorIso`（＝#675 landing の `2026-07-03T13:43:09+09:00`）を新設。
プロセス起動時刻がこの instant より前の永続 runner を「below floor」と判定する。空／不正な marker は
cycle 全体を no-op に倒す（marker 不在時は決して kill しない fail-safe）。runner-code の破壊的変更を
稼働中レーンへ強制配備したい時だけ bump する運用 marker。

### 協調的 cycle（kill-only ＋ idle ゲート）
launcher に追加（全て純関数は `-SelfTest` で網羅・live 部は `-WhatIf` dry-run で実証）:
- `Test-RunnerBelowFloor(ProcStart, FloorIso)` — 純。marker 前起動なら true。空/不正 marker は false。
- `Test-ShouldCycleStaleRunner(BelowFloor, ChildCount)` — 純。**below floor かつ idle(子プロセス0)** の時だけ true。
  子プロセス≥1＝claude ターン実行中＝busy、-1＝スキャン失敗（unknown）は共に **busy 扱い＝cycle しない**。
- `Get-RunnerProcInfo` / `Get-ProcChildCount` / `Get-AncestorPids` — live スキャン（never throw）。
- `Invoke-StaleRunnerCycle` — idle な below-floor runner を **Stop-Process するだけ**（relaunch しない）。
  `-WhatIf` は log のみ。`-ExcludePids` で本 launcher の先祖 runner を除外（belt-and-braces）。

**なぜ idle=子プロセス0 が安全な合図か**: runner はイテレーション中 `claude` を子として起動し、
イテレーション間は `Start-Sleep` するだけで子を持たない。子0＝Claude ターンが完全終了しツリーが clean
＝hot-swap 本体が使う exit ポイントと同一。従って idle 時のみ kill すれば **in-flight イテレーションを
決して壊さない（既存破壊0）**。

**kill-only 設計**: cycle は kill だけ。relaunch は既存経路が担う——full pass は cycle 後に `$running`
を再スキャンして ignition ループが起動、`-HealOnly` は cycle 後に再スキャンして Get-LanesToHeal が
「DEAD」となったレーンを復活。二重起動ロジック不要。

### 自己ブートストラップ（drain 経路）
watchdog は毎 interval **新しい** `powershell -File loop-launcher.ps1 -HealOnly` を spawn する
（loop-watchdog.ps1:280）＝常にディスク上の最新 launcher を読む。本 PR が main へ merge され ops clone が
pull すれば、次の heal パスが新 cycle コードを実行し、各 below-floor レーンをその sleep 窓で1つずつ
cycle→fresh コードで復活させる。ops runner 自身も watchdog の別プロセスツリー（ops が先祖でない）から
sleep 中に cycle される。**無人で drain**、手動再起動不要。

## 3. 実証（この PR で実行）

- `loop-launcher.ps1 -SelfTest` → **ALL PASS**（既存＋新規12 assertion: floor 5・cycle 4・no-op 1・境界含む）。
- `loop-launcher.ps1 -HealOnly -WhatIf`（live）→ 全6レーンを below floor と検出。5レーンは BUSY で
  **deferred**（kill せず）。ops は先祖除外で不評価。**何も kill せず**。
- `loop-launcher.ps1 -WhatIf`（full pass, live）→ 6レーン全て BUSY で deferred（ops は当該 run で
  先祖スキャンが部分失敗したが **idle ゲートが busy 判定で保護**＝多層防御が意図通り機能）。**何も kill せず**。

## 4. 運用メモ
- marker を空にすれば cycle は完全に無効（機構ごと停止できる安全弁）。
- 将来 runner-code の破壊的変更を稼働レーンへ強制配備する際は #675 と同様、変更 landing 時刻へ
  `runnerFloorIso` を bump するだけでよい（コード変更不要）。
- idle ゲート＋先祖除外＋marker 不在 no-op＋scan 失敗 busy 倒し、の4層で「稼働中の正常 runner を誤爆
  kill しない」を担保。
