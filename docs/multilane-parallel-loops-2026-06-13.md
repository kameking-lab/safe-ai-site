# 並列マルチループ設計（2026-06-13）

社長指示「ペースを5倍に。SEO班・機能UX班のように担当を分けて並列で回せ」への設計と構築。
週次使用量上限は本日リセット済みのため、班数の天井は使用量ではなく **(1) ファイル衝突回避** と **(2) CI同時実行枠** で決める。

## 結論（推奨班数）
**推奨5班**（衝突なく切れる実際のファイル境界がこの粒度）。CI上は最大6〜7班まで耐えるが、6班目以降は共有コンポーネントの取り合いが増え衝突で逆に遅くなるため、まず5班で回す。さらに速くしたいときは ux-tools を「判定系」「法令・統計系」に割って6班に増やせる（後述）。

## CI枠の根拠（これが班数の物理的上限）
- リポジトリは **public**。GitHub標準ホストランナーは public では **分数無制限・無料**。つまり「月$5・Stop usage」課金枠は標準ランナーの並列ループには実質効かない（課金は班数の制約にならない）。
- 効くのは **同時実行ジョブ数**：無料プランは Linux で **最大20ジョブ同時**。
- PR 1本(web/** 変更)で走るのは **web-ci(smoke) + e2e の2ジョブ**。マージ(push to main)で web-ci(smoke+full)の2ジョブ。docs/設定のみのPR(paths:web/**外)は **CIを消費しない**。
- 5班なら定常 5×2=10ジョブ + マージ重複と cron(jma/news-feed等)で peak 12〜14 < 20。6班でも 12〜16 < 20。**5〜6班はCI枠に余裕**。7班超で20に近づくため非推奨。
- さらに詰まり回避に **班ごとにイテレーション間隔をずらす**（120/135/150/165/180秒）。全班が同時刻にPRを出さない。

## 班構成（領域はファイル単位で重ねない＝衝突回避の核心）
各班は専用クローンで動き、自分の BACKLOG-<班>.md だけを読み、自領域のファイルだけ触る。ブランチ接頭辞も分離。

1. **seo班**（接頭辞 seo/・BACKLOG-seo.md・cycle-log-seo.md）
   - 所有: web/src/app/sitemap*・sitemap-*.xml/・robots.ts・manifest.ts / web/src/lib/seo/・JSON-LDヘルパー / 横断検索(lib/search-index.ts・fuzzy-search.ts・notice-search.ts・(main)/search/) / **共有シェルの custodian**=app-shell.tsx・app/layout.tsx・(main)/layout.tsx（検索UI/metadataのみ）
   - 主タスク: C-2横断検索・C-3-3/3-4・決裁A(robots facebookexternalhit)・JSON-LD整備
2. **data班**（data/・BACKLOG-data.md・cycle-log-data.md）
   - 所有: web/src/data/** のみ（コーパス・education-rules・law-metadata・mock・各 *.test.ts）
   - 主タスク: コーパス是正残9法令・教育資格DB残(licenses/job-chief)監査・law-metadata
   - UIは data を読むだけなので、UI各班と物理的に1ファイルも重ならない（最もクリーンな班）
3. **ux-records班**（ux-rec/・BACKLOG-ux-records.md・cycle-log-ux-records.md）
   - 所有route: safety-diary/site-records/ky/ky-examples/education-certification/education/foreign-workers/health-checkup-scheduler/account ＋ その専用components
   - **共有ビジュアル基盤の custodian**=safety-tone.ts・ConclusionCard/StatusBadge/CollapsibleDetail（足すだけ・他班はimportのみ）
   - 主タスク: C-9(KY操作集中)・C-4(自班routeのSSR/meta)・記録系柱0仕上げ
4. **ux-tools班**（ux-tool/・BACKLOG-ux-tools.md・cycle-log-ux-tools.md）
   - 所有route: risk-prediction/risk/chemical*/stress-check/mental-health*/treatment-work-balance/law-search/circulars/law-hierarchy/chatbot/stats/accidents-analytics/accidents-reports/accident-news/bcp/subsidies/insurance/organization/strategy/goods/leaflet/newsletter ＋ その専用components
   - 主タスク: 柱0バッチ6/9・C-6(/circulars)・C-7(統計出力)
5. **ux-hub班**（ux-hub/・BACKLOG-ux-hub.md・cycle-log-ux-hub.md）
   - 所有route: quick/faq/glossary/guides/features/industries/diversity/resources/handover/notifications/favorites/safety-signs/accidents/court-cases/signage ＋ **トップ**(page.tsx・home-screen.tsx・home-three-pillars.tsx)
   - 主タスク: 柱0バッチ8(ハブ/ナビ)・サイネージ柱0・決裁C(SignageFeaturedGoods削除)・C-6(/court-cases)

### 共有ファイルの単独所有（取り合い禁止）
- app-shell.tsx / app/layout.tsx / (main)/layout.tsx → **seo班のみ**
- safety-tone.ts / ConclusionCard / StatusBadge / CollapsibleDetail → **ux-records班のみ**（足すだけ・破壊しない）
- (main)/page.tsx / home-screen.tsx / home-three-pillars.tsx → **ux-hub班のみ**
- web/src/data/** → **data班のみ**
- 跨るタスクは「自領域分だけ実施し、他班領域は BACKLOG に『要・他班(該当班)』と注記して自分ではやらない」。

## 衝突回避の仕組み（多層）
1. **領域分離**: 上記のとおり route サブツリー＋データ層＋共有ファイル単独所有で、2班が同一ファイルを触らない。
2. **専用クローン**: 各班は独立クローンで動くので、`git checkout main`・ブランチ作成・ローカルビルドがローカルで衝突しない（共有は GitHub origin のみ）。
3. **班別BACKLOG/cycle-log**: BACKLOG-<班>.md・cycle-log-<班>.md は別ファイル＝複数班が同時に書いても main 上で衝突しない。
4. **稀な衝突の解決**: それでも origin/main 取り込み時に衝突したら、従来どおり origin/main を当該ブランチへ通常マージで解決→push（force-push権限なし前提）。
5. **班別ガード**: loop-runner.ps1 -Lane <名> は同名班の二重起動だけ弾き、別班と従来ループ(no-Lane)は同時起動を許す。

## runner の並列対応（loop-runner.ps1 に -Lane を追加）
- `logs/loop-<lane>-<stamp>.log` にログ分離。
- -Lane 指定時、既定プロンプトは `loop-prompt-<lane>.txt`（無ければ loop-prompt.txt にフォールバック）。
- 単一インスタンスガードを **班単位** に: コマンドラインの `-Lane <同名>` を持つ他プロセスだけを衝突と判定。別班・従来ループは許可。
- 既存バックオフ（連続短時間失敗で5分→10分待機・成功で即復帰）は全班に継承＝万一5時間枠に当たっても各班が安全に待機・自動復帰。

## 移行手順（社長が実行・既存ループは衝突しない形で切替）
現在「全領域ループ(no-Lane・BACKLOG.md・日曜10:00まで)」が main working tree で稼働中。並列化への切替はこの順で（このPRをマージしただけでは既存ループは無影響＝loop-prompt.txt/BACKLOG.md は不変）。

1. **このPRをマージ**（runner -Lane対応・班別プロンプト/BACKLOG・スクリプトが各クローンへ入る土台）。
2. **既存の全領域ループを停止**（並列開始時のみ）: 全領域ループと班が同じタスクを二重実行しないため、切替時に1回だけ止める。該当の PowerShell ウィンドウを閉じるか Ctrl+C。タスクスケジューラ登録(safe-ai-loop-runner)があれば一旦無効化。
3. **クローン作成＋依存導入**（1回）:
   `powershell -ExecutionPolicy Bypass -File .\scripts\multilane\setup-lanes.ps1`
   → <repo親>\safe-ai-lanes\{seo,data,ux-records,ux-tools,ux-hub} に5クローン＋各 web で npm ci。
4. **全班起動**（日曜10:00まで・Opus）:
   `powershell -ExecutionPolicy Bypass -File .\scripts\multilane\start-all-lanes.ps1 -UntilIso "2026-06-14T10:00:00"`
   → 各班が自前ウィンドウで起動（間隔ずらし済み）。

### 班ごとに手動起動する場合（任意・1班だけ動かす等）
`powershell -ExecutionPolicy Bypass -File <クローン>\loop-runner.ps1 -Lane seo -RepoPath <クローン> -Model claude-opus-4-8 -IntervalSeconds 120 -UntilIso "2026-06-14T10:00:00"`
（lane名と接頭辞を seo / data / ux-records / ux-tools / ux-hub に替える）

### ログの見方
`Get-Content -Wait <クローン>\logs\loop-<lane>-*.log`

## 6班に増やす場合（さらに高速化したいとき）
ux-tools を分割: ux-tool-judge（risk*/chemical*/stress-check/mental*/treatment）と ux-tool-law（law-search/circulars/law-hierarchy/chatbot/stats/accidents-*/その他ツール）。プロンプト/BACKLOG を複製して所有routeを二分し、start スクリプトの $laneIntervals に195秒で追記。CI peakは ~16ジョブで20未満。
