# 運転計画: 社長は結果を見るだけにするために（2026-07-02）

## 今の状態（前提）

- 自走ループは6/14から止まっていた（スケジューラの期限焼込みが真因。診断08参照）。エンジン（loop-runner.ps1・5レーンクローン・プロンプト）は無傷。
- レーンBACKLOGは今回の診断で補充済み。Fable枠は7/7まで。

## 社長が打つコマンド（この順で）

### 今日〜明日（ループ再点火の前に1本だけ）
まず自律運転の点火系を直す。これだけは手動で1回起動:

```
cd C:\Users\kanet\20260522\safe-ai-site
powershell -ExecutionPolicy Bypass -File .\loop-runner.ps1 -Lane ops -Model claude-opus-4-8 -UntilIso "2026-07-04T23:00:00"
```

→ opsレーン（新設BACKLOG-ops.md）の最上位タスク=O16（launcher＋config＋スケジューラ再登録＋planner/critic）をOpusが実装する。**これが終わると以降の点火・補給・点検は自動**になる。

### 7/3〜7/7（Fable枠の消化・1日1回）
Fableは自動ループに入れず、社長が1日1回このセッション相当を起動して仕分け表の【Fable】を1本ずつ指示:

```
claude --model claude-fable-5
「BACKLOG-fable.md の最上位タスクを1本、方式確立まで出し切れ」
```

順序: F1（KY直接操作UI）→ F3（チャットボットeval）→ F2（化学突合パイプライン）。
7/7時点で未了のFableタスクは BACKLOG-fable.md の各タスクに書いた降格条件に従い Opus へ移す（ファイル先頭の運用注記どおり）。

### 7/3以降（常設運転・O16完了後は全自動）
O16完了までの暫定は手動起動でよい:

```
powershell -File .\loop-runner.ps1 -Lane data     -Model claude-opus-4-8  -UntilIso "2026-07-31T23:00:00"
powershell -File .\loop-runner.ps1 -Lane ux-tools -Model claude-sonnet-5  -UntilIso "2026-07-31T23:00:00"
powershell -File .\loop-runner.ps1 -Lane ux-records -Model claude-sonnet-5 -UntilIso "2026-07-31T23:00:00"
powershell -File .\loop-runner.ps1 -Lane seo      -Model claude-opus-4-8  -UntilIso "2026-07-31T23:00:00"
powershell -File .\loop-runner.ps1 -Lane ux-hub   -Model claude-sonnet-5  -UntilIso "2026-07-31T23:00:00"
```

モデル割当の考え方: **法令正確性レーン（data）と共有基盤レーン（seo=検索・ops）はOpus、量産レーン（ux系3本）はSonnet 5**。レーンBACKLOG内の【Opus】タグ付きタスクがSonnetレーンに残っている場合、そのタスクはスキップして次を取る運用（プロンプトに明記済みの想定。O16のconfigでレーン×モデルを恒久化）。

O16完了後: スケジューラが「ログオン時＋毎日07:00」にlauncherを起動し、loop-config.json のとおり全レーンが自動再点火。期限延長は loop-config.json の untilIso を1行書き換えるだけ。

### 週次（自動化されるまでの間・5分）
- docs/loop-status.md（O16で新設）を開き、各レーンの最終稼働・直近マージ・残タスク数を見る。
- 止まっていたら理由が同ファイルに書いてある（黙って死なない設計）。

## 監視ポイント（社長が見るのはこの3つだけ）

1. **docs/loop-status.md** — ループが生きているか
2. **本番サイネージの気象データ時刻** — O2完了後は常に60分以内（18日凍結の再発検知はウォッチが自動通知）
3. **GitHubのマージ済みPR一覧** — 出荷の実体

## 7/8以降のモデル体制

- Fable枠終了 → 【Fable】残タスクはOpusへ降格（各タスクに降格可否を明記済み）。
- 次にFable枠が来たら: 「再診断・監査・新方式」だけを積んだ BACKLOG-fable.md を同じ運用で消化（今回の診断がテンプレート）。
- 週1のcritic（外部視点酷評）がS/A級を自動起票するので、**社長からのプロンプト投入はゼロでも診断→起票→実装→出荷が閉じる**。指示したいことができたときだけ、該当レーンのBACKLOG冒頭に1行足すか、Fableセッションを起動する。
