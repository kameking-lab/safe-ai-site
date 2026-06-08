<#
.SYNOPSIS
  安全AIサイト 無人自走ループ runner（Claude Code CLI を一定間隔で起動し、BACKLOG の次タスクを1つずつ進める）

.DESCRIPTION
  ターン制のClaude Codeは「報告で1ターン終了→次の人間入力まで停止」する。
  このスクリプトが人間の代わりに、一定間隔で `claude` を headless 起動し続けることで、
  無人で BACKLOG.md のタスクを1イテレーション=1タスクずつ消化する。

  各イテレーションでClaudeは:
    1) CI緑の自分の未マージPRをマージ→main pull→clean
    2) BACKLOG.md の未着手タスクを1つ実行（第三者ペルソナ→Playwright→改善→再レビュー、or 判例コツコツ）
    3) 1ブランチ→ゲート(lint0/tsc0/test pass/build)→push→PR作成
    4) BACKLOG/cycle-log を更新。未着手が3件未満なら新タスクを補充
  これにより main は常時デプロイ可能を保ちつつ、人間入力なしで回り続ける。

.PARAMETER IntervalSeconds
  各イテレーション後の待機秒（既定 120）。CIは非同期で回り、次イテレーションが緑PRを回収する。

.PARAMETER MaxIterations
  最大イテレーション数（既定 0 = 無制限。Ctrl+C で停止）。

.PARAMETER UntilIso
  この日時(ISO 例 "2026-06-09T09:13:00")を過ぎたら停止（既定 空 = 無期限）。

.EXAMPLE
  # 標準的な起動（リポジトリ直下で）
  powershell -ExecutionPolicy Bypass -File .\loop-runner.ps1

.EXAMPLE
  # 5分間隔・火曜09:13まで
  powershell -ExecutionPolicy Bypass -File .\loop-runner.ps1 -IntervalSeconds 300 -UntilIso "2026-06-09T09:13:00"
#>
[CmdletBinding()]
param(
  [int]$IntervalSeconds = 120,
  [int]$MaxIterations = 0,
  [string]$UntilIso = "",
  [string]$RepoPath = $PSScriptRoot,
  [string]$ClaudeCmd = "claude",
  [string]$Model = ""
)

$ErrorActionPreference = "Continue"
Set-Location $RepoPath

$logDir = Join-Path $RepoPath "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$runStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logDir "loop-$runStamp.log"

function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  Write-Host $line
  Add-Content -Path $logFile -Value $line
}

# 各イテレーションで Claude に渡すプロンプト（単一タスク・自己補充・安全停止）。
# 「収束したら止まる」と「止まるな」を混ぜない: 1イテレーション=1タスク完結、空にしない設計。
$IterationPrompt = @'
あなたは安全AIサイト(kameking-lab/safe-ai-site, web/)の無人自走エージェント。今回は「1イテレーション=BACKLOGの1タスク」だけ確実に進める。逆質問せず自分で判断。

手順:
1) まず自分の作った CI緑の未マージPRがあれば squash マージ→`git checkout main && git pull --ff-only`→working tree clean を確認(前回PRの回収)。失敗してるPRは原因を直すか安全に放置しログ。
2) リポジトリ直下 BACKLOG.md を読み、未着手(`[ ]`)の最上位タスクを1つ選ぶ。未着手が3件未満なら、選ぶ前に新しい改善タスクを2〜3件 BACKLOG に追記(既存機能を使いやすくする深掘り/見つかった具体的欠点。新機能は目からウロコ級のみ)。
3) そのタスクを実行。軸2(既存機能改善)なら必ず第三者レビュー方式: 厳しいペルソナを具体生成→なりきって Playwright で実操作(dev server `cd web; npm run dev` かビルド/本番)→面倒・分かりにくい点を忖度なく列挙→インパクト大の欠点を改善→再度ペルソナ目線で再レビュー。docs/third-party-reviews/ に(ペルソナ・指摘・改善・再評価)を記録。軸1(判例)なら出典2つ以上で確証の取れる確定判例のみ追加(架空0)。
4) 1ブランチ(feat/... か chore/...)で作業。ゲート: `cd web` で npx tsc --noEmit=0, npm run lint=errors0, npx vitest run=全pass, npm run build=成功。データ再生成ファイルは `git checkout -- web/src/data/chatbot-eval-fresh-results.json docs/rag-metrics-latest.json`。
5) commit(末尾に Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>)→push→`gh pr create`。**main直接コミット禁止**(やってしまったら branch退避+`git reset --hard origin/main`で是正)。
6) BACKLOG.md の当該タスクを `[x]` に更新し、docs/court-cases-db-2026-06-06/cycle-log.md に1段落記録。メモリ(必要なら)更新。
7) 完了したらこのターンを終える(次の起動は runner が行う)。

厳守: 捏造禁止/水増し禁止(既存の作り直しで件数稼ぎ禁止・本物の前進のみ)/既存破壊禁止/テスト落ちmerge禁止/env・DB独断変更禁止(Path A)/main常時デプロイ可能・clean維持/安全タグ all-features-loop-start-2026-06-05 維持。1タスクで終え、無理に複数を詰め込まない。
'@

$iter = 0
Write-Log "=== loop-runner 開始 (interval=${IntervalSeconds}s, max=$MaxIterations, until='$UntilIso', repo=$RepoPath) ==="
Write-Log "ログ: $logFile"

while ($true) {
  $iter++
  if ($MaxIterations -gt 0 -and $iter -gt $MaxIterations) { Write-Log "MaxIterations 到達。終了。"; break }
  if ($UntilIso -ne "") {
    try { if ((Get-Date) -ge [datetime]::Parse($UntilIso)) { Write-Log "期限 $UntilIso 到達。終了。"; break } } catch {}
  }

  Write-Log "----- イテレーション #$iter 開始 -----"
  $claudeArgs = @()
  if ($Model -ne "") { $claudeArgs += @("--model", $Model) }
  # headless(-p)・権限スキップ(bypass)で1ターン実行。出力をログに追記。
  $claudeArgs += @("--dangerously-skip-permissions", "-p", $IterationPrompt)
  try {
    & $ClaudeCmd @claudeArgs 2>&1 | Tee-Object -FilePath $logFile -Append
    Write-Log "イテレーション #$iter 完了 (exit=$LASTEXITCODE)"
  } catch {
    Write-Log "イテレーション #$iter で例外: $($_.Exception.Message)"
  }

  if ($MaxIterations -gt 0 -and $iter -ge $MaxIterations) { Write-Log "MaxIterations 到達。終了。"; break }
  Write-Log "次イテレーションまで ${IntervalSeconds}s 待機..."
  Start-Sleep -Seconds $IntervalSeconds
}
Write-Log "=== loop-runner 終了 ==="
