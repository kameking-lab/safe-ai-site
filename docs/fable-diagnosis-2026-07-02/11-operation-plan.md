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

## 7/8以降の確定運転計画（2026-07-03 Fable差分再診断F5で確定）

Fable枠3本（F1/F2/F3）消化と7/3差分監査の実測を踏まえた確定版。

### レーン構成・モデル配分: 現行維持（見直し不要）

Opus 4.8（data/seo/ops）＋Sonnet 5（ux-hub/ux-records/ux-tools）の6レーン継続。
根拠（7/3差分監査の実測）: 抜き打ち9系統中8合格（dataのe-Gov正本化はAPI生データ実照合で
全一致、seoのsitemap/検索0件フォールバック/PWA資産は本番実測合格、uxの44px/a11yは
モバイル実測合格、ops watchdog群は6レーン健在の自己報告網で実証）。唯一の未達は
Sonnetレーンの「完了条件を字面で満たす過学習」型（O5＝酸欠×資格を固定3フレーズの
実測で完了主張、自然文では不成立）。レーン構成でなく完了条件の書き方の問題と判断。

### 完了条件の新規律（全レーン・過学習対策）

RAG/チャットボット系タスクの完了条件は「自前の固定フレーズ実測」を禁止し、
**常設evalの該当ケースが○になること**（`npm run eval:chatbot-gen` のGQ番号、
fresh eval、F2突合ゲート等の作った本人以外の物差し）で書く。O5型の再発防止。
各レーンloop-promptへの反映はopsレーンの改修タスクとして積む（要・ops班）。

### 発明級タスクの扱い＝BACKLOG-fable.mdを「凍結棚」として存続

- 各レーンは発明級（真因不明の再診断・前任結論の再精査・監査ツールの発明・新方式の
  最初の1画面）を見つけたら BACKLOG-fable.md に1行積み、自分では着手しない。
- **Opus降格の判断基準**（棚で待つか、今降格して実装するか）:
  (i) 設計書が詳細で残りが実装 → 降格可（F1型）。
  (ii) 測定器・監査器の発明が本体 → 凍結して次のFable枠（F2/F3型。誤った物差しを
  量産に使う損害が待機コストを上回るため）。
  (iii) ユーザー被害が進行中の欠陥 → 発明含みでも降格可（放置コスト優先）。
  (iv) 降格する場合は完了条件に常設evalゲートを必ず付ける（上記新規律）。

### 次にFable枠が来たときの投入リスト雛形（上から消化）

1. 差分再診断（F5フォーマット: レーン完了タスクの抜き打ち実測→ゲート運用確認→台帳整合→本計画の更新）
2. 凍結棚（BACKLOG-fable）の消化＝方式確立まで、量産はレーン振替
3. evalの拡張（生成品質eval 23問→50問級＋fresh化=過学習検知セット、F2ゲートの他法令展開の方式部分）
4. 新機能の最初の1画面

### 未承認のため保留中（承認され次第BACKLOG-opsへ積む）

生成品質evalのnightly/週次自動実行＋ /about/chatbot-eval への結果併載
（本番Gemini APIを定期消費する運用変更のためオーナー承認待ち。現状は手動
`npm run eval:chatbot-gen` で完結。ベースライン90.5%＝docs/chatbot-genquality-eval-2026-07-03.md、
7/3夜の再測定も90.5%で大規模コーパス書換5本を経て非劣化を確認済み）。
