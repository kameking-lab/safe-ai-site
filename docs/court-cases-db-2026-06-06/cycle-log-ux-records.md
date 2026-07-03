# 機能UX班-A（記録・帳票・教育系） サイクルログ（並列マルチループ）

担当領域・契約は `loop-prompt-ux-records.txt` 参照。1イテレーション=1タスク、ゲート全緑(tsc/lint/vitest/build)後にPR。無読テストのスクリプトは `docs/third-party-reviews/scripts/` に保存。担当route=safety-diary/site-records/ky/ky-examples/education-certification/education/foreign-workers/health-checkup-scheduler/account。共有ビジュアル基盤(safety-tone/ConclusionCard/StatusBadge/CollapsibleDetail)の custodian。

---

## 2026-07-03 教育コース詳細12ページの主要CTA3種を44px化（柱0磨き）

回収: 自ブランチPR #749（ky/education 残存44px8箇所）がCI緑（e2e/smoke SUCCESS）と確認できたが、`main`とdirty（BACKLOG/cycle-logの同時追記による行競合のみ・コード競合なし）と判明。squashマージ前に契約どおり origin/main を当該ブランチへ通常マージで解消（本ログの直前エントリ2件を時系列順に並べ替えて統合）→ tsc=0/lint errors0/vitest 2492 pass/build成功を確認しpush。CI再走の緑は次イテレーションで回収（auto-merge無効のためこのイテレーションではマージ見送り）。

着手: 上位未着手3件（O15/S2/S3）はいずれもdataレーンO14（型別サマリ生成）依存で全ブロック継続中のため、Exploreエージェントに当班所有route/componentの柱0（3秒で状態＋次アクションが分かるか）・44px巡回を依頼。/education-certification・/health-checkup-scheduler（今回のブリーフで名指しされた2領域）はConclusionCard導入・action配線とも既に徹底済みと確認（新規の欠落なし）。一方、教育コース詳細12ページ（`/education/tokubetsu/*`6・`/education/roudoueisei/*`4・`/education/hoteikyoiku/*`2、いずれも同一テンプレート）の共通テンプレートに存在する主要CTA3種（PPTXサンプルDL・ご質問送信・資料請求/教材についての質問）が実測36〜40pxで`min-h-[44px]`未指定のまま残存と判明（ページ最上部の`CourseConclusion`ConclusionCard自体のaction導線は既に44px化済みなのに、本文下部の実CTAが非対称に取り残されていた）。

実装（足すだけ・`min-h-[44px]`追加のみ、ロジック無変更）: 12ページ×3箇所＝36インスタンスに`min-h-[44px]`を追加。3箇所とも全12ページで同一classNameパターン（PPTXサンプルDL＝`bg-slate-900 px-4 py-2`、問い合わせ2ボタン＝`px-5 py-2.5`系）だったため機械的sed置換で統一適用し、置換後に各ファイルのマッチ件数(1+2=3)が想定どおりであることを事前確認。

検証: `tsc --noEmit`=0 / `lint`=errors0（既存warn23件のみ、当班分の増減なし）/ `vitest run`=293ファイル2492テスト全pass（クラス名追加のみのため新規ユニットテストなし）/ `build`=成功。無読Playwright新規`docs/third-party-reviews/scripts/education-course-cta-44px-2026-07-03.mjs`を prod start(3100)で実行し36/36 PASS（全12ページ×PPTXサンプルDL・ご質問送信・2番目CTAの3ボタンの実測高さ。2番目CTAの文言は`tamakake`のみ「資料請求」で他11ページは「教材についての質問」と非対称だったため`href*="type=document"`で識別し文言差異を吸収）。working tree clean。

残: O15/S2/S3は引き続きdataレーンO14依存でブロック。PR #749はCI待ちで次回収。

---

## 2026-07-03 巡回発見の残存44px未満ボタンを是正（柱0磨き・続き）

回収: 自ブランチPR #737（回収サイクルログ）がCI全緑（Vercel SUCCESS）と確認できたためsquashマージ＋作業ブランチ削除。`git pull --ff-only`で以後の他班マージ分含め`main`をfast-forward・clean確認。マージ済みの旧自班リモートブランチ4本（committee-conclusion-action/contribute-conclusion-card-44px/ky-examples-conclusion-cta-44px/site-records-action-bar-44px、いずれもPR #718/#715/#702/#725として既にマージ済み）は`git fetch --prune`で既に削除済みと確認。

着手: 上位未着手3件（O15/S2/S3）はいずれもdataレーンO14／fableレーンF1依存で全ブロック中のため、柱0巡回で補充。ExploreエージェントにPR #725（site-records 9画面27箇所の44px化）以降の残存44px未満の主要ボタンを再監査させたところ、同一ファイル内の他ボタンは既に`min-h-[44px]`化済みなのに取り残されていた非対称箇所を7件発見。

実装（足すだけ・`min-h-[44px]`追加のみ、ロジック無変更）: `near-miss-client.tsx`の「報告を登録」submit／`monthly-report-client.tsx`の「レポートを印刷／PDF」「この集計を委員会議事録に反映」／`ky-paper-view.tsx`の承認バー「元請に提出」「承認」「差し戻し」・印刷プレビュー内「印刷 / PDF」「閉じる」／`ky-transcribe-panel.tsx`の「CSVをダウンロード（控え・集計用）」「閉じる」／`ky/error.tsx`のエラー境界「再試行」「保存データをリセット」。副次発見: `ky-industry-preset-picker.tsx`の「プリセットを適用」も同型欠落だったが、grep検証の結果この部品はどこからもimportされていない未使用コンポーネントと判明（機能提供中の画面には影響なし）。捏造回避のためこの事実を明記の上、将来再利用時の手戻りを避ける目的でついでに44px化のみ実施（削除は本タスクのスコープ外のため対象外）。

検証: `tsc --noEmit`=0 / `lint`=errors0（既存warn23件のみ、当班分の増減なし）/ `vitest run`=288ファイル2467テスト全pass（既存回帰のみ、新規ユニットテストなし＝クラス名追加のみのため）/ `build`=成功。無読Playwright新規`docs/third-party-reviews/scripts/remaining-primary-buttons-44px-2026-07-03.mjs`をprod start(3100)で実行し7/7 PASS（near-miss登録・monthly印刷・ky/paper元請提出・印刷プレビュー内印刷/閉じる・転記支援内CSV/閉じるが全て44px以上。monthly「この集計を委員会議事録に反映」は当月データ0件のためこの端末では非表示＝コードでmin-h付与済みを確認しSKIP注記）。working tree clean。

残: O15/S2/S3は引き続きdataレーンO14/fableレーンF1依存でブロック。`ky-industry-preset-picker.tsx`が未使用コンポーネントである件は次回柱0巡回か棚卸しタスクで削除要否を判断。

## 2026-07-03 KY周辺・教育の残存44px未満ボタン8箇所を是正（PR #744とは非重複の別発見分）

回収: 自分のオープンPRは#744（site-records/ky 残存44px7箇所）1本のみだが、squashマージ対象となるCI緑はまだ確認できず（e2e/smoke ともIN_PROGRESS）＝マージ見送り。`main`は`git fetch`で7コミット遅れと判明したため`git pull --ff-only`で26ファイル分fast-forward・working tree clean。

着手: 上位未着手3件（O15/S2/S3）は依然dataレーンO14／fableレーンF1依存で全ブロック中。Exploreエージェントに当班所有route/componentの44px未満の主要CTAを再監査させたところ、`ky-paper-view.tsx`/`ky-transcribe-panel.tsx`の一部ボタンはPR #744が既に対応済みと判明した一方、PR #744の対象外の8箇所（クラシックUI(`?canvas=0`)の天気自動取得・AI提案ボタン、転記支援の表コピーボタン、`/ky/list`の行内3ボタン、`/ky/workers`の行内2ボタン、`/education`のPPTXサンプルDL）が未対応と確認。

実装: 8ファイル8箇所に`min-h-[44px]`を追加（足すだけ・ロジック無変更）。canvas既定切替(O10第五弾)後もクラシックUI経由や動的リスト行内の操作ボタンは同一画面の主要ボタン群から見た目上独立しており、過去の巡回対象から漏れやすい構造だったと確認。

検証: `tsc --noEmit`=0 / `lint`=errors0（既存warn23件のみ、当班分の増減なし）/ `vitest run`=289ファイル2475テスト全pass（クラス名追加のみのため新規ユニットテストなし）/ `build`=成功。無読Playwright新規`docs/third-party-reviews/scripts/remaining-primary-buttons-44px-round2-2026-07-03.mjs`をprod start(3100)で実行し9/9 PASS（`/ky/paper?canvas=0`の天気自動取得・AI提案・転記支援内コピー、`/ky/list`・`/ky/workers`はlocalStorageで各1件を再現し行内操作ボタンを実測、`/education`先頭カードのPPTXサンプルDL）。working tree clean。

残: O15/S2/S3は引き続きdataレーンO14/fableレーンF1依存でブロック。PR #744はCI待ちで次回収。

---

## 2026-07-03 `/site-records/committee`・`/site-records/monthly` ConclusionCardのaction未指定を是正

回収: PR #702（/ky-examples 結論カードaction未指定＋主CTA44px是正）がCI全緑（e2e/smoke SUCCESS）と確認できたためsquashマージ＋作業ブランチ削除。`main`は`git pull --ff-only`で21ファイル分fast-forward・clean。自ブランチPR #715（/safety-diary/contribute 結論カード＋44px化）はe2e/smokeがまだIN_PROGRESSのためマージ見送り＝次イテレーションで回収。

着手: 上位5件（O15/S2/S3含む）はF1/O14依存でブロック中のため、柱0巡回で発見済みの未着手[ ]（`/site-records/committee`・`/site-records/monthly`のConclusionCard action未指定）に着手。

実装: `record-conclusions.ts`の`committeeConclusion()`に`hasPrevious`引数を追加。「今月未開催」時、保存済み議事録が1件以上あれば`action={href:"#committee-actions",label:"前回をベースに新規"}`、無ければ`{href:"#committee-actions",label:"議事録を作成"}`とし、`committee-client.tsx`の下部操作バー（保存・印刷・CSV・前回をベースに新規・新規（白紙）ボタン群）に`id="committee-actions"`（`scroll-mt-24`付き）を新設して接続。`monthlyConclusion()`の「要対応」分岐（3ツール横断集計のため単一アンカーでは足りない）は優先度順（使用不可＞パトロール未是正＞ヒヤリハット未対策）で該当ツールの既存アンカーへ動的に振り分け（`/site-records/inspection#saved-inspections`・`/site-records/patrol#open-findings`・`/site-records/near-miss#nearmiss-list`、いずれも各ツール画面に既存の`id`をそのまま再利用＝新規アンカー追加は committee側の1箇所のみ）。

検証: `tsc --noEmit`=0 / `lint`=errors0（既存warn23件のみ）/ `vitest run`=284ファイル2435テスト全pass（`record-conclusions.test.ts`に新規4件）/ `build`=成功（`○ /site-records/committee`・`○ /site-records/monthly`静的生成維持）。無読Playwright新規`docs/third-party-reviews/scripts/committee-monthly-action-links-2026-07-03.mjs`をprod start(3100)で実行し18/18 PASS（committee: 今月開催済/前回あり/前回なしの3状態でaction文言・44px・`#committee-actions`遷移後に実ボタン可視化を確認、monthly: 使用不可あり/パトロールのみ/ヒヤリハットのみの3分岐でaction先URLを確認）。working tree clean。

残: O15/S2/S3は引き続きdataレーンO14/fableレーンF1依存でブロック。PR #715（/safety-diary/contribute）はCI待ちで次回収。

---

## 2026-07-03（7） — S1・第二弾 打合せ用紙の続き＝明日のイベント5欄＋統括安全責任者コメントをcanvas直接編集化

回収: 自班PR #621（O10・第一〜五弾・完）がCI全緑（e2e/smoke/Vercelとも SUCCESS）と確認できたためsquashマージ＋作業ブランチ削除。`main`は`git pull --ff-only`で57ファイル分fast-forward・clean。作業ブランチ`ux-rec/s1-meeting-canvas-phase1-header`（PR #660・S1第一弾）はCI（e2e/smoke）がIN_PROGRESSのためマージ見送り、同一ブランチへ`main`をマージ（`docs/court-cases-db-2026-06-06/cycle-log-ux-records.md`の1件のみ競合＝直近ログ追記同士の行競合・コード競合なしを通常マージで解消）した上で継続。

着手: BACKLOG最上位[ ]はS1（第一弾）だが、直前のS1第一弾コミットで実装済み・在庫中（水増し回避）。次段のS1（続き・第二弾）に着手。O15/S2/S3は引き続きdataレーンO14依存でブロック。

規模判断: 打合せ書の残り欄（各社マトリクス・明日のイベント・搬入出・点検項目8カテゴリ）のうち、各社マトリクスは業者×階層(元請/1次/2次/3次)の動的グリッドで専用キースキームの設計が要り規模が大きい。O10が危険行（動的行）より先に単純なテキスト欄群（作業内容＋4R目標3欄）から着手した前例に倣い、本弾は下段左ブロックの明日のイベント5欄（安全大会・検査・パトロール・明日の安全目標・その他）＋統括安全責任者コメントという、動的行を伴わない単純テキスト欄6つに限定した。

実装: `paper-fields.ts`にKY paper-fields.tsと同型の`type: "textarea"`を追加。6欄の`get`/`set`はMeetingRecordのネストしたプロパティ（`tomorrowEvents.safetyMeeting`等5つ）と最上位プロパティ（`supervisorComment`）の両方に対応させ、記入順チェーンを`author.next`から`safetyMeeting→inspection→patrol→tomorrowGoal→free→supervisorComment`（最終欄）へ延伸。`MeetingFieldEditorSheet`にtextarea分岐（`TextareaWithVoice`をKYのFieldEditorSheetと同じ形で追加、フォーカス対象セレクタに`textarea`を追加）。`MeetingPrintSheet`の該当6セルを`EditableCell`でラップ（`editing`未指定時はEditableCellが`<>{children}</>`を返す構造のためHTML出力はバイト同一＝既存スナップショットが無変更のまま全合格することで印刷不可侵を機械確認）。

検証: `tsc --noEmit`=0 / `lint`=errors0（既存warn23件のみ）/ `vitest run`=267ファイル2269テスト全pass（`paper-fields.test.ts`に第二弾チェーン検証5本、`meeting-print-sheet.test.tsx`のタップ標的数アサーションを7→13に更新）/ `build`=成功（1回目はNode側のセグメンテーション違反で異常終了したが既知の環境フレーク＝コード非依存と切り分け、再実行で正常終了・`○ /safety-diary`静的生成を維持）。無読Playwright新規`docs/third-party-reviews/scripts/meeting-canvas-phase2-tomorrow-events-2026-07-03.mjs`を prod start(4213)で実行し18/18 PASS（textarea表示・記入順チェーンの連鎖・用紙反映・印刷同期・クラシック表示との相互反映・最終欄の完了ボタンを確認）。既存`meeting-canvas-phase1-header-2026-07-03.mjs`は記入順チェーンが延伸し作成担当者の次が「完了」から「次の欄へ」に変わったため該当アサーションを更新のうえ17/17回帰合格。テスト実行の副生成物（`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`。他レーン所有）および内容変化のない改行コードのみのsnapshot差分（ky-print-sheet.test.tsx.snap等）はコミットから除外。working tree clean。

残: 各社マトリクス（業者×階層の動的行）・搬入出動的行・点検項目8カテゴリのcanvas対応、AI提案（`/api/meeting/suggest`統合）、履歴サジェスト（datalist）、既定切替（β外し）はBACKLOG-ux-records.mdへ「S1（続き・第三弾）」として起票済み。PR #660（S1第一弾・本弾で追加コミット）はCI待ちで次回収。

---

## 2026-07-03（6） — O10・第五弾（完） canvas UIの既定切替＝先に機能パリティを確立してから既定化

回収: 自班PR #606（account結論カード）がCI全緑・未マージだったためsquashマージ。`main`は33コミット分fast-forward（`git pull --ff-only`）。作業ブランチ`ux-rec/o10-ky-canvas-phase2-work-goal`（PR #621、O10第一〜四弾）はCI実行中で緑未確定のためマージ見送り、同一PRへの追加コミットとして継続。

着手: BACKLOG最上位[ ]の「O10（続き・第五弾）」＝canvas UIの既定切替（β外し）。着手前にF1（依存）の完了を`BACKLOG-fable.md`で確認し、次にcanvasβの実装を精査したところ、保存主ボタン・「…」その他操作シート（複製/共有/転記/印刷/連携）・元請確認/承認パネル・作業員マスター導線が一切実装されておらず、そのまま既定切替すると大多数のユーザーがKYの正式保存・共有・承認提出に到達できなくなる重大な機能欠落と判明（自動保存はlocalStorageの下書きのみで、保存一覧・サイネージ共有・元請承認は別経路）。単純なフラグ反転は「既存破壊」に当たるため見送り、本イテレーションのスコープを「機能パリティの確立→既定切替」の2段に分割して両方を実施した。

実装1（機能パリティ）: `ky-paper-view.tsx`でクラシックUI専用の実装だったapprovalPanel（元請確認・承認）・下部操作バー（保存＋「…」）・その他操作シート（複製/共有/転記/印刷/連携/関連情報）・印刷プレビュー・転記パネルを、canvas/クラシック分岐前の共通constとして括り出し（参照する状態・ハンドラは全て分岐より前で定義済みのため安全に共有化）、canvas分岐にも同じconstsを配置。ロジックの二重実装はゼロ（クラシックUI側は同じconstsへの参照に置換しただけで挙動不変）。canvasのコンパクトバーに「作業員マスター」導線も追加し、旧UIとの非対称を解消。

実装2（既定切替）: `canvasMode`の初期値を`false→true`に変更。`?canvas=0`で明示的に旧UIへ（共有リンク・ブックマーク互換、リロードでも維持）。旧UI側の入口ボタンは「🗺 キャンバスβ」→「🗺 新しい表示へ」に改称（既定切替後も「β」表記のままでは無読テストで「まだ試験的機能」と誤認させるため）。印刷HTML（`KyPrintSheet`）・A4正式書式は無変更。

検証: `tsc --noEmit`=0 / `lint`=errors0（既存warning23件のみ、当班分の増減なし）/ `vitest run`=262ファイル2229テスト全pass / `build`=成功（`○ /ky/paper`静的生成維持）。Playwright全81/81緑（本番相当ビルド起動・手動起動+`reuseExistingServer`一時trueで検証後に設定を復元）。`ky-canvas.spec.ts`は8/8＝新規3本「`/ky/paper`直アクセスで既定表示がcanvasになる」「従来表示⇄新しい表示への往復＋`?canvas=0`のリロード後永続」「既定表示（canvas）からも保存/その他操作シート/元請確認欄に到達できる（機能パリティの回帰確認）」を追加、既存5本は`gotoCanvas`ヘルパー（`?canvas=1`）ごと無変更で回帰合格。テスト実行で副生成される`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`（他レーン所有）はcommitから除外。

完了: O10はF1〜第五弾まで全ての残タスク（全欄直接操作化・未記入ハイライト・zoom-to-cell・AI提案/音声入力のエディタ統合・canvas既定切替）を消化しBACKLOG-ux-records.mdを[x]に更新。次点はS1（打合せ用紙・安全工程打合せ書への直接操作UI横展開）。

---

## 2026-07-03（5） — O10・第四弾 KY用紙Phase2続き＝zoom-to-cell＋AI提案のエディタ統合、およびPR #621 CI失敗の原因是正

回収: 自班PR #621（O10・第一〜三弾）のCIを確認したところ `e2e` ジョブが `ky-canvas.spec.ts` の初期フィット2件（PC/スマホ）で失敗中（`smoke`は緑）。squashマージは見送り、原因調査を本イテレーションのスコープに含めて継続。

着手: BACKLOG最上位「O10（続き・第四弾）」＝zoom-to-cell・AI提案のエディタ統合・canvas既定切替のうち、前者2点を実装。作業ブランチには前イテレーション終了時点で未コミットの実装（zoom-to-cell・AI提案統合）が作業ツリーに残っていたため、内容を検証のうえ引き継いだ。

実装1（zoom-to-cell）: `paper-fields.ts`に`firstEmptyKyPaperFieldKey`を追加（`nextKyPaperFieldKey`の連鎖を先頭から辿り最初の未記入欄を返す＝危険行の動的増減に自動追従）。結論カード「のこりN項目」をボタン化し、タップで`PaperStage`に新設した`focusField`（ref経由のimperative handle）を呼び`data-field-key`一致セルへズーム＋そのままエディタを開く。

実装2（AI提案のエディタ統合）: `FieldEditorSheet`に`ai`propを追加し、危険のポイント欄（`risk.N.hazard`）でのみ従来UIと同一の`/api/ky/suggest`ボタン・候補・反映UIを表示。反映は`applySuggestion`に`targetIndex`を追加し、canvas側は編集中のその行に直接（従来UIは最初の空き行）。副次是正: 作業内容が空のままAI提案を押した際の案内バーが従来UIにはありcanvasβでは欠落していたため、既存`notice`状態をcanvasモードのJSXにも表示するよう追加。

原因調査と是正（CI失敗）: `e2e/ky-canvas.spec.ts`のPC/スマホ初期フィット2件を手元で再現し、`PaperStage`のCSS `h-[calc(100dvh-150px/200px)]`が想定する「上に積まれる高さ」(150px)が、実際のサイト共通ヘッダー/サブナビ＋当画面コンパクトバーの実測(192px)を下回っており、ステージが画面下端を最大42pxはみ出していたことを特定（他班所有のapp-shell分を含む高さは固定定数では原理的に追従できない）。`PaperStage`の高さをCSS固定値から実測（`useLayoutEffect`で`getBoundingClientRect().top`から残り高さを算出、親の`padding-bottom`も実測して二重確保しない、再計算はmount＋`window resize`のみ＝ズーム操作中のサブピクセルなbody変動まで拾うと`useZoomPan`のinteracted後は自動再フィットされずステージ枠だけ動いてズレるため意図的に限定）へ変更。この変更で下端の余白を使い切った結果、全画面共通の共有FAB（他班所有・fixed bottom-right）とステージ右下のズーム操作クラスタが新たに重なりPlaywrightのクリックが被さったSVGに阻まれてページスクロールを誘発する副作用が発覚（`Ctrl+ホイールで拡大→ボタンで縮小→全体表示`のe2eが新規に不安定化）。座標を握らず解決するため`FAB_CLEARANCE_PX`(72px)の緩衝を追加して両立。

検証: `tsc --noEmit`=0 / `lint`=errors0（既存warning23件のみ）/ `vitest run`=242ファイル2061テスト全pass / `build`=成功 / `playwright test`（e2e全79件、本番相当ビルド起動）=79/79合格（対象の`ky-canvas.spec.ts`6/6を含む、10回連続再実行でも安定）。無読Playwright新規`ky-canvas-phase2-zoom-ai-2026-07-03.mjs`9/9合格。テスト実行で副生成される`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`（他レーン所有）はcommitから除外。

---

## 2026-07-03（4） — O10・第三弾 KY用紙Phase2続き＝参加者（チップ選択）をcanvas直接編集化

回収: 自班PR #621（O10・第一弾/第二弾）はCI（e2e/smoke）が実行中のためこのイテレーションではマージ見送り（契約どおり次イテレーションで回収）。作業ブランチ`ux-rec/o10-ky-canvas-phase2-work-goal`はclean・origin同期済みのため、同一PRへの追加コミットとして継続（第一弾・第二弾と同じ積み上げ方式）。

着手: BACKLOG最上位[ ]の「O10（続き）」＝参加者・zoom-to-cell・AI提案統合・canvas既定切替のうち、規模を検証可能な単位に割るため参加者（チップ選択）のみを今イテレーションのスコープにした。

実装: `paper-fields.ts`に静的欄`participants`を追加（チップ選択UIのため専用type、get/setは持たずrecord.participantsを直接参照）、記入順チェーン末尾（指差呼称の次）に接続＝旧UIの全欄がcanvasで編集可能になった。`KyPrintSheet`の参加者セルを`EditableCell`でラップ（editing未指定時のHTMLはスナップショット一致で不変を確認、印刷不可侵）。`FieldEditorSheet`に`participants` propを追加し、従来UI（クラシック表示）が既に持つ純粋関数（`toggleWorker`/`addWorkers`/`clearMasterWorkers`/`groupWorkersByAffiliation`）をそのままチップUIへ再利用＝ロジックの二重実装を避けた。

検証: `tsc --noEmit`=0 / `lint`=errors0（既存warning23件のみ） / `vitest run`=242ファイル2061テスト全pass / `build`=成功。無読Playwright新規`ky-canvas-phase2-participants-2026-07-03.mjs`15/15合格（チップ表示・個別/一括選択・記入順末尾の完了ボタン・用紙反映・印刷同期・解除の双方向反映）。既存の第一弾スクリプトは記入順チェーンが指差呼称→参加者へ延伸したため最終欄アサーションを更新し15/15回帰合格、第二弾スクリプトは無変更で15/15回帰合格。テスト実行で副生成される`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`（他レーン所有）はcommitから除外。

残: zoom-to-cell（結論カード「のこりN」タップで最初の未記入セルへ）・AI提案（🤖）のエディタ統合・canvas既定切替（β外し）はBACKLOG-ux-records.mdへ「O10（続き・第四弾）」として継続。

---

## 2026-07-03（3） — O10・第一弾 KY用紙Phase2着手＝本日の作業内容＋4R目標3欄をcanvas直接編集化

回収: 自班PR #606（/account 結論カード）はCI再走を確認しマージ済み（mainとのdirtyをorigin/main通常マージで解消、docsのみ競合）。#613（在留資格ガイド詳細11ページ結論カード）もCI全緑を確認しsquashマージ済み。main は `git pull --ff-only` で同期・clean。テスト実行で副生成される `docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`（他レーン所有）はcommitから除外。

着手前確認: BACKLOG最上位[ ]はO10（KY用紙Phase2）だが、依存の BACKLOG-fable.md F1「KY用紙 直接操作UI・方式確立」が本日 #609 でマージ済みと判明＝ブロック解消。O15/S1/S2/S3はdataレーンO14未着手で引き続きブロック中のため、O10に着手。

規模判断: 診断書(docs/fable-diagnosis-2026-07-02/02-ky-sheet-ui.md)のT4〜T7見積りは「2〜3日（14〜22h）」と大きく、全欄・全機能を1イテレーションで一気に実装すると検証が粗くなり「半端な実装」のリスクがある。CLAUDE.mdの品質原則（半端な実装を残さない）に従い、完全に検証できる単位へ分割し第一弾を実施。

実装: `web/src/lib/ky/paper-fields.ts` をヘッダー6欄限定の `KY_HEADER_FIELDS`/`KY_HEADER_FIELD_ORDER` から用紙全欄を指す `KY_PAPER_FIELDS`/`KY_PAPER_FIELD_ORDER` へリネーム＋拡張。各フィールド定義に `get`/`set`（イミュータブル更新関数）を追加し、`FieldEditorSheet` 側の型キャスト(`record[fieldKey as TextFieldKey]`)を排除して汎用化＝今後の危険行・参加者拡張（インデックス付きキー・複雑な更新ロジック）の土台を整備。新規フィールドタイプ `"textarea"` を追加し `TextareaWithVoice` をエディタに統合。

対象4欄を追加: 「本日の作業内容」（`workRows[0].workDetail` と連動・textarea・音声入力）、「チーム行動目標」「重点実施項目」（textarea・音声入力）、「指差呼称（ヨシ！）」（text・音声入力、記入順の最終欄）。`KyPrintSheet` の該当4セルを `EditableCell` でラップ（既存の6欄と同じ方式・省略可能propのため印刷経路は無変更）。承認ロック中は6欄と同じく `editing` プロパティごとundefinedになりタップ不可（既存の仕組みをそのまま継承・追加実装なし）。

検証: `tsc --noEmit`=0 / `lint`=errors0（既存warning23件のみ・変更ファイル起因の新規warning0）/ `vitest run`=242ファイル2052テスト全pass（`paper-fields.test.ts`にget/set・新4欄のisEmpty検証を追加）/ `build`=成功。**印刷不可侵の機械的な担保**: `ky-print-sheet.test.tsx` のスナップショットを比較した結果、`editing`未指定時のHTMLはリネーム前後でバイト単位一致（差分はテストのdescribe名のみ）＝A4正式書式は1バイトも変わっていないことを確認。無読Playwright `docs/third-party-reviews/scripts/ky-canvas-phase2-work-goal-2026-07-03.mjs` を新規（本番相当ビルドをprod start・iPhone12相当390pxで実行）＝**13/13 PASS**（4欄のタップ標的可視・エディタ起動・「次の欄へ」連鎖・入力が画面キャンバスと印刷専用コピーの両方に同一反映＝WYSIWYG・未記入セルのヒント表示を確認）。

残: O10の続き（危険行の動的行・＋行追加ホットスポット・参加者のチップ選択・未記入ハイライトの「のこりN」タップ連動(zoom-to-cell)・AI提案/音声入力のエディタ統合・canvas既定切替）はBACKLOG-ux-records.mdへ「O10（続き）」として起票済み。次イテレーションで継続。

---

## 2026-07-03（2） — 柱0補充 /foreign-workers/status/[status] 全11ページに結論カード新設（PR: ux-rec/foreign-workers-status-conclusion）

回収: 自班のCI緑PR #593（/safety-diary/list 結論カード）をmainとの競合（BACKLOG-ux-records.md、他班#597と同時完了による行競合のみ・コード競合なし）を通常マージで解消しsquashマージ。main は `git pull --ff-only` で同期・clean（不要になった自動生成ファイル docs/rag-metrics-latest.json・chatbot-eval-fresh-results.json のローカル差分は破棄）。

着手前監査: BACKLOG最上位[ ]はO10〜S3（KY用紙canvas/SlideDeck/教育スライド量産等）だが、依存先のBACKLOG-fable.md F1（未着手・作業中ブランチはあるがPR化前）・BACKLOG-data.md O14（未着手）がともに他レーンで未完了のため全件ブロック継続。契約どおり自領域の柱0/柱3レビューから補充。

自班route全ページ棚卸しの結果、大半はConclusionCard導入済み。真の欠落＝**/foreign-workers/status/[status]（在留資格ガイド詳細・全11ページ）**: `/education/tokubetsu/*`等の教育コース詳細ページ（#536系）と同型の「区分見出し＋本文段落で始まり次アクションが本文下部（あるいはページ最下部nav）に埋もれる」パターンで、ConclusionCard未設置のまま非対称に残っていた。「初めてこの在留資格の外国人材を受け入れる現場の安全担当」が3秒で「この資格は何か」「就労制限・転職可否」「次にやること」を言えない。

是正（足す＋重複解消・法令正確性不可侵）: 当班所有 `StatusConclusion`（`components/foreign-workers/status-conclusion.tsx`、ConclusionCard＋StatusBadgeをimportのみ）を新設し全11ページのheader直下へ配置。旧ヘッダーの平文summary段落（重複）を撤去しカードdescriptionへ集約。補助チップ=在留期間／就労制限の有無（safe=なし・warning=あり）／転職可否（safe=可能・warning=不可）の3種。次アクション=「多言語安全教育教材を見る」→既存の`/foreign-workers/safety-training`（ページ最下部navと同じ遷移先を最上部でも即到達可能に）。表示文言・区分・期間・制限はrule既載データをそのまま使用、新規の法的主張なし。generateStaticParams・11ページのSSG(●)は不変。

検証: tsc=0・lint errors=0（既存warning23件のみ・自分の変更起因なし）・vitest 240ファイル2027件全pass（新規5件含む）・build成功（`● /foreign-workers/status/[status]`のSSGを維持し11パス確認）。無読Playwrightスクリプト `docs/third-party-reviews/scripts/foreign-workers-status-conclusion-2026-07-03.mjs` を新規（全11ページ×5項目＋就労制限/転職可否の対称チェック3件）＝58/58合格。working tree clean。

---

## 2026-07-03 — 柱0補充 /safety-diary/list に結論カード新設（PR: ux-rec/c0-safety-diary-list-conclusion）

回収: 自班のCI緑PR #589（/ky/paper hydration mismatch是正）をsquashマージ済み。ローカルに残っていた既マージ済みの陳腐ブランチ3本（c0-education-course-conclusion #577・c0-foreign-safety-training-conclusion #568・c0-ky-list-workers-noread #558）を削除。main は `git pull --ff-only` で同期・clean。

着手前監査: BACKLOG最上位[ ]はO10〜S3（KY用紙canvas/SlideDeck/教育スライド量産等）だが、依存先のBACKLOG-fable.md F1（KY用紙canvas方式確立）・BACKLOG-data.md O14（型別サマリ生成）がともに他レーンで未着手のため全件ブロック中。契約どおり自領域の柱0/柱3レビューから補充。

自班route横断調査の結果、大半（site-records本体・safety-diary本体・ky/paper・education系12ページ・foreign-workers本体・health-checkup-scheduler・ky-examples）はConclusionCard導入済みで合格。真の欠落＝**/safety-diary/list（保存した打合せ書一覧）**: 対になる `/ky/list`（保存済みKY一覧）は空/件数/絞込0件の3状態ともConclusionCard＋次アクション（新規KY作成）が既設なのに、`/safety-diary/list`（実体`MeetingListClient`）はh1+説明文+検索/並替のみで結論カードが無く非対称だった。

是正（足すだけ・共通基盤変更なし）: `MeetingListClient` に `/ky/list` と同型の3状態ConclusionCardを追加。(1)保存0件=info「保存した打合せ書なし」＋次アクション「新規作成」(/safety-diary)。(2)検索/条件で0件=neutral「該当なし」（該当数を明示）。(3)通常=info「N件 保存した打合せ書」＋次アクション「新規作成」。isFiltering（keyword非空）で絞込中の説明文を出し分け。

検証: tsc=0・lint errors=0（既存warning46件のみ・自分の変更起因なし）・vitest 237ファイル1973件全pass・build成功（`/safety-diary/list` 静的生成確認）。無読Playwrightスクリプト `docs/third-party-reviews/scripts/safety-diary-list-noread-2026-07-03.mjs` を新規（空/1件/検索0件の3状態×次アクションの可視性・44px・遷移先を検証）＝7/7合格。working tree clean。

## 2026-07-03 — 柱0補充 /account（マイページ）に結論カード新設（PR: ux-rec/account-conclusion-card）

回収: 自班CI緑PR #597（lint掃除23件）をsquashマージ済み。main は `git pull --ff-only` で同期・clean。#593（safety-diary/list結論カード）はCIまだpendingのため今回は回収せず次回。

着手前監査: BACKLOG最上位5件(O10/O15/S1/S2/S3)は全てF1(fable)/O14(data)の他レーン依存で未完了のため全ブロック中。契約どおり自領域の柱0未監査routeを補充探索＝サブエージェントで`/ky-examples`・`/account`を巡回（両方とも過去ログに監査記録なし）。

結果: `/ky-examples`はConclusionCard導入済みで概ね合格（`action`未指定・主CTAが44px未満の軽微欠落のみ→次点タスクとしてBACKLOG起票）。真の欠落は**`/account`**: 共通基盤(ConclusionCard/StatusBadge)が未導入で、状態バナー(支払い遅延/未払い/解約済み、最大2件同時表示可)と「現在のプラン」独自の状態ピル(SAFETY_TONE不使用のemerald/red/amber直書き)が並立し、結論カード規約「1画面1メッセージ」に反していた（安全日誌#565と同種の非対称）。

是正: `web/src/app/(main)/account/page.tsx`にconclusion-card/status-badgeの共通基盤(custodian・無改変)を導入。優先順位=赤(支払い遅延/未払い)＞黄(解約済み)＞青(フリー)＞緑(利用中)で1状態に絞りConclusionCardへ集約、次アクション(プラン管理ボタン/アップグレードLink/再加入Link)はカードのaction propまたはchildren枠に一本化(ManagePlanButtonはStripeポータルへの非同期リダイレクトのためaction propのLinkでは表現できずchildrenへ)。判定ロジックは`web/src/lib/account-conclusion.ts`の`computeAccountConclusion`へ純粋関数として切出し(computeCheckupConclusion等の既存パターンに準拠)、vitest 8/8で全状態(支払い遅延/未払い/解約済み×期限有無/フリー/有料利用中×期限有無)を網羅。プラン取得(Prisma)・Stripeポータル呼出等の課金ロジック自体は無変更＝表示の再配置のみ（課金・認証実装の独断変更ではない）。

無読テストの制約: `/account`はGoogle OAuth必須で、このdev環境はAUTH_SECRET未設定（auth()は常にnullを返し signin へリダイレクト）のためPlaywright実機無読テストが実行不可。捏造回避のため実施せず明記＝結論ロジックのunit test(vitest 8/8)とコード目視確認で代替。

ゲート: `tsc --noEmit`=0 / `lint`=errors0(warn23件は他班ファイル分で不変・account/account-conclusion.ts分は新規warn0) / `vitest run`=239ファイル1997テスト全pass(新規`account-conclusion.test.ts`8本含む) / `build`=成功(`ƒ /account`)。working tree clean。

残: `/ky-examples`のConclusionCard action追加・CTA44px化は次点タスクとしてBACKLOG-ux-records.mdへ起票。BACKLOG最上位5件のブロック状況は次イテレーションで再確認。

---

## 2026-06-14 — 柱0補充 教育コース詳細12ページに結論カード新設（PR: ux-rec/c0-education-course-conclusion）

回収: 自班のCI緑PR #565（安全日誌の保存済み第3状態）を squashマージ済み。#558（/ky/list・/ky/workers 無読巡回）はCI緑だが squashマージ時にBACKLOG/cycle-logで競合→契約どおり origin/main を #558 ブランチへ通常マージで解消（コード競合なし・docsのみ）→push、CI再走の緑を次イテレーションで回収。#568（受入教育ビルダー結論カード）はCI走行中で未マージ＝次回収。main は `git pull --ff-only` で同期・clean。

着手前監査の振替: BACKLOG最上位[ ]はKY周辺(/ky/list・/ky/workers)だが #558 で実装済み・在庫中のため重複回避。次位に在庫した「/education-certification 発行/一覧（修了者数・未発行）」は**再監査で前提誤りと判明**＝/education-certification は資格"発行/修了者一覧"機能ではなく特別教育・技能講習の**必要資格DB＋判定finder**で、入口(`page.tsx`)・finder(`CertFinderClient`)とも ConclusionCard 既設・無読合格。捏造（無い機能への作り込み）を避け当該タスクを取消し、自班route横断で真の柱0欠落を再探索。

真の欠落＝**教育コース詳細12ページ**（`/education/tokubetsu/*`6・`/education/roudoueisei/*`4・`/education/hoteikyoiku/*`2）。各ページは「区分・根拠・時間」の小チップ＋h1＋本文段落で始まり、最重要の次操作（サンプル資料ダウンロード節）は本文下部に埋もれていた＝「初めて開く安全担当（新人に受講させたい）」が3秒見ても "次にやること" を言えない。自班の他route入口（/education カタログ#536・/foreign-workers#546・/health-checkup#543・記録系）が全て結論カード済みなのと非対称だった。

是正（足す＋重複解消・法令正確性不可侵）:
- 当班所有の新部品 `web/src/components/education/CourseConclusion.tsx` を新設（custodian基盤 ConclusionCard/StatusBadge を **import のみ・無改変**）。props=区分(kind: special/legal/health)・時間(duration)・根拠種別(basis 任意)・1行要約(summary)・アンカー(sampleHref 既定#course-sample)。tone=info・GraduationCapアイコン・状態ラベル=区分、時間チップ(Clock)＋根拠チップ(Scale)、主操作「サンプル資料を見る」(44px担保は部品側)。
- 全12ページのパンくず直下に `<CourseConclusion>` を配置。既存の「サンプル資料ダウンロード」節（全12で同一markup）に `id="course-sample" scroll-mt-20` を付与しアンカー先を用意。
- **重複解消**: 旧ヘッダーの小チップ列（`flex flex-wrap gap-2 mb-3`＝区分/根拠/時間）を撤去し結論カードへ一本化。未使用化した `GraduationCap` の lucide import も各ページから除去（Clockはカリキュラムで継続使用のため残置）。h1・description・法的根拠・対象者・カリキュラム・料金・PPTX DL・修了証・FAQ・CTA・A4印刷物は不変。
- 区分・時間・根拠条文の文言は**各ページ既載のもの（チップ/本文）に一致**させ、新規の法的主張は一切足さない（法令正確性は不可侵）。`youtsu-yobou` は localized header(`TranslatedPageHeader`/`iconName="GraduationCap"`文字列)を持つが、撤去対象は手前のチップ列のみで本体は不変。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（既存warn46のみ・変更ファイルにerror0）/ `vitest run`=225ファイル1880テスト全pass（新規 component 無読テスト `CourseConclusion.test.tsx` 6本含む）/ `build`=成功（12ページとも静的生成）。無読テスト `docs/third-party-reviews/scripts/education-course-conclusion-noread-2026-06-14.mjs` を prod start(3147)で実行＝**72/72 PASS**（12ページ×[200配信・結論カードrole=status区分ラベル・時間チップ・次操作#course-sample・アンカー先存在・旧重複チップ撤去]）。working tree clean。

残: #558（/ky/workers 結論カード対称化）・#568（受入教育ビルダー結論カード）のCI緑を次イテレーションで回収マージ。以降は記録系/教育系の柱3レビュー継続。

---

## 2026-06-14 — 柱0仕上げ② 外国人労働者ハブ入口に結論カード新設（PR: ux-rec/c0-foreign-workers-conclusion）

回収: 本イテレーションで自班PR #533（C-9・A2 KY記入の進行ナビ）・#543（柱0仕上げ③ /health-checkup 入口の結論カード）をCI再走緑を確認のうえ squashマージ済み。#536（柱0仕上げ /education 結論カード）はCI全緑だが squashマージ時にBACKLOG/cycle-logで競合→契約どおり origin/main を #536 ブランチへ通常マージで解消（コード競合なし・docsのみ）→tsc0/lint0/vitest1757pass/build成功を確認しpush、auto-merge無効のため再走CI緑を次イテレーションで回収。main は `git pull --ff-only` で同期・clean。

着手: 柱0仕上げ巡回で特定した未達3画面のうち #536=/education・#543=/health-checkup を是正済み。残る **/foreign-workers** を本イテレーションで是正。

現状監査（着手前確認）: `/foreign-workers` は 2大動線タイル(教材を作る/在留資格ガイド)＋件数タイル(dl 資格/教材/言語)＋CollapsibleDetail と 柱0要素はあるが、**最上部に「いまの状態」を1メッセージで示す結論カードが無く**、件数が dl とカードで二重化しうる状態だった（result系の CheckupConclusionCard とは別の入口ハブ）。

是正（足す＋重複の片付け・正確性不可侵）:
- h1直下に共通 `ConclusionCard`（info帯・ShieldCheck・アイコンファースト）を新設。状態ラベル「**国籍問わず法令適用**」＝労基法・安衛法・最賃法は国籍を問わず適用という最重要事実を結論化。補足1行「受入れ時は理解できる言語で安全衛生教育を」。主操作「**教材を作る**」(44px・/foreign-workers/safety-training)。
- 件数は `StatusBadge` チップへ集約: 在留{RESIDENCE_STATUS_INDEX.all.length}=11資格／教材{SAFETY_MATERIAL_INDEX.all.length}=30本／{MATERIAL_LANGUAGES.length}=5言語対応／無料。**全てデータ算出**（手書き値なし）。
- 旧・重複の件数 `dl`（資格/教材/対応言語タイル）と、カード説明に内包された「国籍を問わず適用」単独段落を撤去＝情報はカードへ一本化（消失なし）。2大動線タイル・在留資格別ガイド・教材ビルダー・チェックリスト・出典は不変。custodian基盤(ConclusionCard/StatusBadge)は import のみ・無改変。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（既存warnのみ・変更ファイル0）/ `vitest run`=1757 pass / `build`=成功（`○ /foreign-workers` 静的生成）。無読テスト `docs/third-party-reviews/scripts/foreign-workers-conclusion-noread-2026-06-14.mjs` を prod start(3101・iPhone12相当390px)で **11/11 PASS**（結論カード可視・状態ラベル・件数4バッジ・主操作44px＆safety-training遷移・もう一方の動線残存・旧重複タイル撤去を機械確認）。working tree clean。

残: 柱0仕上げの未達3画面（/education #536・/health-checkup #543・/foreign-workers 本PR）はこれで全是正。次は 柱3レビュー（点検記録・月次報告・Eラーニング実機ペルソナ）／柱0補充（/ky/list・/ky/workers 無読巡回）。#536 のCI再走緑を次イテレーションで回収マージ。

---

## 2026-06-14 — 柱0仕上げ /education に結論カード新設（PR: ux-rec/c0-education-conclusion-card）

回収: 自班PR #533（柱C-9・A2 KY用紙 記入の進行ナビ）は本イテレーション着手時点でCI（e2e/smoke）pendingのため未マージ。契約どおり次イテレーションで回収する。main は `git pull --ff-only` で同期・clean。

着手: BACKLOG最上位[ ]は C-9・A2 だが #533 で実装済み・在庫中（水増し回避）。次位の「柱0仕上げ（記録系・受入教育・健診スケジューラ巡回）」に着手。

巡回（着手前確認・Explore で全自班ページの結論カード有無を機械的に確認）:
- 記録系は合格: site-records 全subroute(inspection/monthly/patrol/near-miss/induction/committee/qualifications/calendar/procedure/incident-report)・safety-diary・education-certification(本体+finder) はいずれも最上部に ConclusionCard 済み。
- **未達3画面を特定**: `/education`（教材カタログ＝バッジ+見出し+本文で始まり状態/次アクションなし）・`/foreign-workers`（アクション+件数タイルのみ）・`/health-checkup-scheduler`（見出し+箇条書き+フォームのみ／result画面は CheckupConclusionCard 済み）。

是正（本イテレーションは最も無読不合格の `/education` を1枚・足すだけ）:
- `EducationContent.tsx` のヘッダー直下に共通 `ConclusionCard`（tone=info）を新設。デカ数字 `PROGRAMS.length`（=12）＋単位「種」＋「教育プログラム公開中」、補足は **実データから算出した区分内訳**「特別教育6・法定教育2・労働衛生教育4。すべて無料で閲覧でき、各教育のPPTXサンプルも配布中。」（ハードコード値のドリフト防止＝`CATEGORY_ORDER`から `filter().length` で生成）。状態チップ＝`StatusBadge`(safe「無料で閲覧」/info「PPTXサンプルあり」)、主ボタン「教育を選ぶ」が `#programs` へジャンプ。12種一覧 `<section>` に `id="programs" scroll-mt-20` を付与。
- 共有ビジュアル基盤(ConclusionCard/StatusBadge)は import のみ・変更なし。EN/JA 両対応。料金注記・本文・既存セクションは不変。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warningは既存46のみ・変更ファイル0）/ `vitest run`=205ファイル1700テスト全pass / `build`=成功。
無読テスト: `docs/third-party-reviews/scripts/education-conclusion-card-noread-2026-06-14.mjs`。prod start(3123)の配信HTMLで 結論カード(role=status「いまの状態: 教育プログラム公開中」)・デカ数字12・区分内訳3種・次アクション「教育を選ぶ」→`#programs`・アンカー先存在・状態チップ2種 を検証＝**11/11 PASS**。working tree clean。

残: 次イテレーションで #533(C-9・A2) を回収マージ。以降は 柱0仕上げ②/foreign-workers・③/health-checkup-scheduler（分割済）／柱3レビュー（点検記録・月次報告・Eラーニング実機）／柱0補充（/ky/list・/ky/workers 無読巡回）。

---

## 2026-06-14 — 柱0仕上げ 健診スケジューラ入口に結論カード新設（PR: ux-rec/c0-checkup-scheduler-conclusion）

回収: 在庫の自班PR #533（柱C-9・A2 KY記入の進行ナビ）はCI全緑(e2e/smoke SUCCESS)だが squashマージ時にBACKLOG/cycle-logで競合。契約どおり origin/main を当該ブランチへ通常マージで解消（コード競合なし＝docsのみ）→ローカルでtsc=0/lint errors0/vitest 1719 pass/build成功を確認しpush。リポジトリで auto-merge 無効のため、再走CIの緑を次イテレーションで確認して回収マージする。main は `git pull --ff-only` で同期・clean。

着手: BACKLOG最上位の未マージ未着手は 柱0仕上げ（記録系・受入教育・健診スケジューラの結論カード/無読未達画面の巡回是正）。当班route内で `ConclusionCard` 未適用の画面を棚卸し→ `/health-checkup-scheduler`（入口・入力ページ）が結論カード皆無で、h1直下に長い法令説明1段落＋5項目の箇条書きが先頭を占め、3秒無読で「この場で何が分かり・次に何をするか」が読めない状態だった（safety-diary系は `MeetingPaperView`、site-records各種は各clientで適用済み・result系も適用済み＝入口だけ未達）。

是正:
- h1直下に結論カード（info帯・Stethoscopeアイコン）を新設。デカ数字「**30種**・健診を自動判定」＋補助バッジ「8区分／106職種対応／無料・登録不要」＋主操作「入力をはじめる」（44px・`#scheduler-form` へスクロール）。
- デカ数字・区分数・職種数は **データから算出**（`ALL_CHECKUP_RULES.length`=30／`CHECKUP_TYPE_LABELS`キー数=8／`ALL_JOB_PROFILES.length`=106）。手書き数値の陳腐化・捏造を排除（実機HTMLで106を確認＝旧テキストの「網羅」表現と整合）。
- 先頭を占めていた法令説明1段落＋5箇条書きは `CollapsibleDetail`「この判定でカバーする範囲（8区分・対応法令）」へ文字ダイエット。**消さず格納**（法令正確性は不可侵）。
- `SchedulerForm` を `<div id="scheduler-form" className="scroll-mt-20">` で包みアンカー先を用意（フォーム本体・結果ページ・印刷シートは不変）。custodian基盤(ConclusionCard/StatusBadge/CollapsibleDetail)は import のみ＝変更なし。

ゲート: tsc=0 / lint errors=0（既存warnのみ・変更ファイル0）/ vitest 1717 pass / build 成功（`○ /health-checkup-scheduler` 静的生成を確認）。無読テスト `docs/third-party-reviews/scripts/checkup-scheduler-conclusion-noread-2026-06-14.mjs` を prod start(3100・iPhone12相当390px)で **12/12 PASS**（結論カード可視・デカ数字30種・3バッジ・主操作44px・初期は法令説明が散らからず詳細展開で残存・フォームアンカー存在）。working tree clean。

残: 柱0仕上げの巡回継続（safety-diary一覧/月次・foreign-workers受入教育系）。#533 のCI再走緑を次イテレーションで回収マージ。

---

## 2026-06-14 — 柱C-4（自班route分）/ky・/ky/morning 固有メタSSR化（PR: ux-rec/c4-ky-morning-meta）

回収: 自班PR #521（柱C-9 KY用紙アクションバー操作集中）は本イテレーション着手時点でCI（e2e/smoke）IN_PROGRESSのため未マージ。契約どおり次イテレーションで回収する。main は `git pull --ff-only` で同期（#514/#515系の取り込み・clean）。

着手: BACKLOG-ux-records の最上位[ ]は C-9 だが #521 で実装済み・在庫中のため重複回避（水増し禁止）。次位の C-4 に着手。

現状監査（着手前確認）:
- `/ky/paper`（KY入力の正規ページ）= title/description/canonical/openGraph/twitter/JSON-LD すべて固有メタ済み。
- `/ky/list`（保存KY一覧）= 固有メタ済み（`index:false,follow` のユーティリティ）。
- `/ky/workers`（作業員マスター）= 固有メタ＋OG＋JsonLd済み。
- `/ky`（`src/app/(main)/ky/page.tsx`）= `permanentRedirect` でクエリ保持のまま `/ky/paper` へ恒久転送。レンダリングせず308するためメタ不要＝意図的な設計。触らない。
- `/ky/morning`（朝礼サイネージ `src/app/ky/morning/page.tsx`）= title/description/canonical はSSR済みだが、兄弟ページで**唯一 openGraph/twitter が欠落**していた。

是正（残ギャップのみ・足すだけ）:
- `/ky/morning` の `export const metadata` に openGraph（title/description/`ogImageUrl` 1200x630）と twitter（summary_large_image）を追加。description も兄弟と同口調で「6桁の共有コードで別端末からも映せます」を補い、LINE等で共有した際のリンクプレビューを整備。canonical・robots(既定index)・画面表示は不変。`KyMorningSignage`（client）にも手を入れず、SSRメタのみ追加。

無読テスト: `docs/third-party-reviews/scripts/ky-morning-meta-ssr-2026-06-14.mjs`。SSR配信HTMLに og:title/og:description/og:image/twitter:card/canonical/`<title>` が含まれること＝固有メタがクライアント注入でなくSSR段階で確定していることを検証（C-4の趣旨＝SSR化の機械確認）。

ゲート: `tsc --noEmit`=0 / `lint`=errors0（warningは既存のみ・変更ファイルは0）/ `vitest run`=200ファイル1665テスト全pass / `build`=成功（`○ /ky/morning` 静的生成を確認）。working tree clean。

残: 次イテレーションで #521(C-9) を回収マージ。以降は 柱0仕上げ（記録系・受入教育・健診スケジューラ）／柱3レビュー（点検記録・月次報告・Eラーニング）／柱0補充（/ky/list・/ky/workers 無読巡回）。

---

## 2026-06-14 柱C-9・A2 KY用紙 記入の進行ナビ（基本情報→危険→対策→確認）
着手前の回収: 自班PR #525(柱C-4 /ky/morning 固有メタ)はCI緑だが main と衝突(DIRTY)。契約どおり origin/main を #525 ブランチへ通常マージし衝突(自班の BACKLOG/cycle-log のみ)を解消・push→MERGEABLE化。CI再走(e2e/smoke/Vercel)中のため本マージは次イテレーションで回収。
タスク: BACKLOG最上位[ ] の C-9・A2。設計上の論点（用紙ファースト=完成用紙を最初に見せる社長要件 と 入力ステップ化の両立）を検討し、用紙を隠すウィザード化（＝社長要件・ページ構成の大幅変更に抵触＝独断不可）ではなく、**用紙の上に「記入の進行ナビ」を足すだけ**の両立策を採用。
実装: `computeKyPaperSteps`(paper-status.ts に追加・既存の `isFilled` を共用)が基本情報→危険→対策→確認の4段を返す。各段の done/remaining は結論カードと同じ判定のため**全段ののこり合計＝結論カードの「記入のこりN」が必ず一致**（ユニットで保証）。新規 presentational `KyPaperStepNav`(色の文法: 緑=記入済み/青=いまここ(aria-current=step)/灰=未着手、各段 min-h56・44px超でその欄へ scroll-mt ジャンプ)。`ky-paper-view` は結論カード直下に下書き中のみ表示し、重複していた結論カード内の未記入チップを撤去。共有基盤(safety-tone/ConclusionCard)は import のみ・無改変。A4印刷シート不変。
ゲート: tsc=0 / lint errors=0(既存warnのみ) / vitest 200ファイル1677pass(paper-status +7) / build成功。無読テスト `docs/third-party-reviews/scripts/ky-paper-step-nav-noread-2026-06-14.mjs` を prod(3200・390px)で 10/10 PASS（4段の順序・0/4→2/4の進捗・いまここ移動・44px・アンカー移動・結論カードとの数値一致・用紙ファースト不変を機械確認）。
残: 次イテレーションで #525(C-4) 回収マージ。以降は 柱0仕上げ／柱3レビュー／柱0補充（/ky/list・/ky/workers 無読巡回）。

## 2026-06-13 柱C-9・A1 KY用紙 下部アクションバーの操作集中

`/ky/paper` の下部固定バーは可視ボタン13・うち8個が同格で並び、最重要の「保存」が埋没していた（柱0=3秒で次の操作が分からない）。バーを「保存（emerald solid・主ボタン・常設）」＋「…（その他の操作）」の2つに集約し、複製/共有/転記/印刷/連携・関連リンクを「…」ボトムシート（記録／共有・連携／印刷・PDF／この作業の関連情報でグループ化、各48pxタップ・ラベル+補足の2段）へ退避。Escape・オーバーレイで閉じる（user-menu の作法に合わせた）。A4印刷シート(`KyPrintSheet`)は一切不変。
実機(prod start 3100・iPhone12相当390px)で発見した重畳を2件是正: (1)全画面共通の `MobileBottomNav`(z-40・≤480px) の上にバーを載せるため `--mobile-bottom-nav-h`+safe-area分を `bottom` に加算（PCは 0px で従来どおり最下部固定）。(2)全画面共通の共有FAB `ShareButtons fixed`(右下 bottom-20 right-4 z-30) と「…」が重なるため、モバイルのみバー右側に `pr-16` を確保しFABの帯を空けた（PCは中央寄せで非重畳のため `sm:pr-0`）。app-shell等の他班所有・凍結ファイルは未変更（importのみ）。
ゲート: tsc=0 / lint errors=0(既存warn2のみ) / vitest 1643 pass / build 成功。無読テスト `docs/third-party-reviews/scripts/ky-paper-action-focus-noread-2026-06-13.mjs` 11/11 PASS。
残: 柱C-9・A2（入力のステップ/アコーディオン化＝用紙ファースト設計との両立方針を要検討）として BACKLOG に分割・継続。

## 2026-06-14 柱3レビュー 記録/月次/Eラーニングをペルソナ実機レビュー → 点検記録に下書き進捗バー

担当3画面を各ペルソナで無読レビュー。月次報告(`/site-records/monthly`＝本社提出の元請安全担当)は結論カード「要対応合計」＋区分別アラート集計(未是正/対応中/使用不可)が既設、Eラーニング(`/education`＝新人に受講させたい安全担当)は結論カード「12種 教育プログラム」(#536)が既設で、いずれも柱3合格＝改善不要と判定（捏造の作り直しを避け据え置き）。真の欠落は **点検記録(`/site-records/inspection`＝毎朝この画面を回す職長)**: 最上部の `ConclusionCard` は「保存済み記録を横断した使用不可台数」を要約するのみで、**いま記入中の下書き**の状態（何項目を判定したか／不良の有無／のこり）が無読で読めなかった。全項目が既定「対象外」のため、開いた直後は緑バッジ「不良 0」だけが出て"点検済みに見える"誤読リスクもあった。
対策: 点検項目リストの直上に画面専用の進捗バー `InspectionProgress` を新設。判定済み数(良+不良)/全項目で進捗率を出し、safety-tone と同じ色文法で4状態を表示＝**未点検(黄・next「各項目を 良／不良 で判定」)/途中(青・「判定済み n／N項目」)/全良(緑・「全N項目 異常なし」)/不良あり(赤・「不良 N件 — 是正と使用可否を確認」)**。内訳「良・不良・対象外」も併記。`print:hidden` で **A4正式点検表には一切載せない**（法定帳票書式は不変）。`role="status"`+`data-inspection-progress` で支援技術・テストにも状態通知。共通基盤(safety-tone等)は importのみで未改変、足すだけ。data班所有の自動生成JSON(rag-metrics/chatbot-eval)はbuildが触れるが commit から除外。
ゲート: tsc=0 / lint errors=0(既存warnのみ) / vitest 1812 pass / build 成功。無読テスト `docs/third-party-reviews/scripts/inspection-progress-noread-2026-06-14.mjs` 11/11 PASS。
残: 柱0補充（/ky/list・/ky/workers 無読巡回）を次イテレーションへ。

## 2026-06-14 柱0補充 受入教育 多言語安全教育教材ビルダーに結論カード

着手前の回収: 自班PR #565(柱3 打合せ書 保存済み第3状態)はCI(e2e/smoke/Vercel)pending のため契約どおり次イテレーションで回収。`git checkout main && git pull --ff-only` clean を確認し本タスクへ。BACKLOG最上位の残[ ](/ky/list・/ky/workers 無読巡回)は別途 自班PR #558 で巡回完了済（/ky/list合格・/ky/workers是正）・マージ待ちのため**重複着手＝水増しを避け**、自領域の柱0未適用箇所を巡回して補充タスクを起こした。
巡回: 所有route(safety-diary/site-records/ky/ky-examples/education-certification/education/foreign-workers/health-checkup-scheduler/account)の入口を結論カード有無で確認。記録系・健診・受入教育ハブ(#536/#543/#546)・KY系・ky-examples・education-certification は結論カード済み。真の欠落は **受入教育 `/foreign-workers/safety-training`（多言語安全教育教材ビルダー）**: 親ハブ `/foreign-workers`(#546) と兄弟ビルダーは結論カードを持つのに、この入口だけ h1 直下に2文の説明段落があり「規模(何教材・何言語)」「次にやること」を**読まないと**分からなかった（無読不合格・柱0非対称）。
対策: 共通 `ConclusionCard` を最上部(SSR・選択状態に非依存)へ追加。デカ数字＝`SAFETY_MATERIAL_INDEX.all.length`(=30教材)、漢字短ラベル「多言語対応」、description に旧説明段落の内容(6業種×5トピックを やさしい日本語＋4言語の対訳で表示・印刷／雇入れ時教育・TBM・特別教育の補助資料)を**集約=消さず格納**、`StatusBadge`チップ「5言語対訳」「無料」、主アクション「教材を選ぶ」を `#material-builder`(ビルダーへ scroll-mt-20 ジャンプ・44px)。件数・言語数は実データ(`SAFETY_MATERIAL_INDEX`/`MATERIAL_LANGUAGES`)から導出しハードコードせず。custodian として共有部品(ConclusionCard/StatusBadge/safety-tone)は import のみ・無改変＝足すだけ。
ゲート: tsc=0 / lint errors=0 / vitest 223ファイル1865pass(新規 component 無読 +5) / build成功。無読 component テスト `web/src/app/(main)/foreign-workers/safety-training/safety-training-pillar0.test.tsx` 5/5、Playwright `docs/third-party-reviews/scripts/foreign-safety-training-conclusion-noread-2026-06-14.mjs` を自前prod(3137・390px)で **8/8 PASS**（role=status 出現・デカ数字単位・主アクション44px・#material-builder 誘導・言語/無料チップ・industry指定でも選択非依存で常時出現）。
残: 次イテレーションで #565(柱3) と #558(/ky/list・/ky/workers) を回収マージ。以降は柱0補充/柱3レビュー継続。
## 2026-06-14 柱3レビュー 安全日誌(打合せ書) 結論カードに「下書き／保存済み」の第3状態

CI緑の #555（点検記録の下書き進捗バー）を squashマージ→main を ff-only 更新。未着手の柱3レビュー「安全日誌 `/safety-diary`（北海道労働局公式版ベースの安全工程打合せ書）を毎日書く職長で実機レビュー」に着手。
無読レビューの欠落: 最上部 `ConclusionCard`（`computeMeetingPaperStatus`）が **incomplete / complete の2状態のみ**で、必須4項目が揃うと保存有無に関わらず緑「記入完了」を出していた＝**下書き(まだ保存していない)と保存済みが同じ見た目**。保存状態は下部バーの極小文字「自動保存:HH:MM」だけが頼りだが、その自動保存は端末内の作業中下書き(CURRENT_KEY)を書くだけで**保存一覧(LIST/BYID)には未反映**＝「自動保存」表示を見て"保存済み"と誤認する罠があった。毎朝この用紙を起こす職長の最大の問いは「今日の分、もう保存一覧に保存したか？」で、それが3秒で読めていなかった。
対策（共通基盤 `paper-status` は足すだけ・既存API互換）: `computeMeetingPaperStatus(record, { saved })` に第3状態 **saved=緑「保存済み → 保存一覧で確認」(/safety-diary/list)** を追加。「記入完了・未保存」は青「保存する」(#mtg-actions)に整理し、**緑は"保存一覧に保存済み"に限定**（青=まだやること有り／緑=保存して安心、の2色文法に統一）。承認フローが無い帳票なので submitted/approved は持たず、充足×保存の2軸で表現。
保存済み判定の正確性: store の `savedAt` は **自動保存でも `duplicateForNextDay`(翌日複製)でも更新**され「保存一覧に入った」根拠に使えない（誤って緑を出す危険）。よって savedAt は使わず、**手動「保存」を押した内容の JSON と現在内容の一致**でセッション内厳密追跡（`savedJson`）。編集すると即座に緑が外れる。下部バー文言（保存済み=緑「✓ 保存一覧に保存済み」／未保存=「未保存（下書き自動保存:HH:MM）」）と自動保存ラベルも「下書き自動保存」に是正し、結論カードと矛盾しないようにした。**A4印刷シート(`MeetingPrintSheet`)は print:hidden で一切不変**（公式帳票書式は不可侵）。
ゲート: tsc=0 / lint errors=0(既存warnのみ) / vitest 1839 pass(`paper-status.test.ts` を3状態+未完成優先で 5→8 本に拡充) / build 成功。無読テスト `docs/third-party-reviews/scripts/safety-diary-saved-state-2026-06-14.mjs` 9/9 PASS（初見=記入のこり4／記入完了・未保存=青・保存する／保存済み=緑・保存一覧で確認・下部バー一致／保存後に1文字編集で緑が外れ未保存へ戻る回帰）。
残: 柱0補充（/ky/list・/ky/workers 無読巡回 = #558 でCI待ち回収予定）、受入教育修了証・他の記録系の柱0/柱3巡回を継続。

## 2026-06-14 柱0補充 KY周辺ユーティリティ（/ky/list・/ky/workers）無読巡回

「初めて開く職長」ペルソナで2画面を3秒無読チェック。`/ky/list`（保存済みKY一覧）は空＝「保存KYなし」＋次アクション「新規KY作成」、件数＝「N件 保存KY」＋同アクション、絞込0件＝「該当なし」の3状態とも結論カードが既設で合格＝改善不要。真の欠落は **`/ky/workers`（作業員マスター）**: 入口の結論カードが「登録なし／N名 登録済み」の状態は出すものの「次にやること」のタップ標的を持たず、空状態の次アクション（作業員を追加）は説明文に埋もれていた（同じKY系の `/ky/list` が空状態にCTAを持つのと非対称）。
是正は共通 `ConclusionCard` の href-action（足すだけ・既存API不変）で対称化: 空状態に「作業員を追加」（`#add-worker`・44px・追加フォームへスクロールジャンプ、フォーム section に `id="add-worker"` と `scroll-mt-20` を付与）、登録済みに「KY用紙で使う」（`/ky/paper`）を付与。本文・フォーム・一覧・クラウド同期ロジックは不変。
ゲート: tsc=0 / lint errors=0（既存warnのみ）/ vitest 1832 pass（新規 component 無読テスト `workers-master-client.test.tsx` 4本含む）/ build 成功。Playwright 無読 `docs/third-party-reviews/scripts/ky-list-workers-noread-2026-06-14.mjs` を prod start(3123・iPhone12相当390px)で実行し 15/15 PASS（両画面の空/件数の状態文言・44px・遷移先を検証）。
注: prod確認の初回、port 3100 を前イテレーションの旧ビルドサーバ(EADDRINUSE)が占有し旧UIを配信していたため空振り→別portで再ビルド配信して合格を確認。
残: 受入教育修了証 /education-certification 無読巡回・他の記録系の柱0/柱3巡回を継続。

## 2026-07-02 O13 /ky/paper hydration mismatch(#418)是正＋バックログ重複整理

前回イテレーション以降マージ済みPRなし・ux-rec/ の未マージPRなし＝main clean のまま着手。Fable診断注入(07の候補3b)で起票された O13「/ky/paper の React error #418 毎ロード発生」に着手。原因調査を先行実施: `KyPaperView`（`web/src/components/ky-paper/ky-paper-view.tsx`）の `useState(makeToday)` 初期化子が `new Date()` をレンダー中に直接評価。`npm run build` で `/ky/paper` が `○`（静的プリレンダリング）であることを実測確認したため、HTMLにはビルド時刻の作業日が焼き込まれ、ハイドレーション時のクライアント実時刻とほぼ確実にズレる＝「毎ロード発生」の説明と一致（`normalizeKyInstructionRecord({})` が内部で呼ぶ `buildDefaultKyInstructionRecord()` の `new Date()` も同根で二重に日付依存だった）。
是正: 初期状態を日付非依存の `emptyKyRecord()`（workDateYear/Month/Day="")に変更しSSR/CSRの初回描画を完全一致させ、ローカル保存も深リンクも無い場合のみマウント後effect（クライアント専用）で `withTodayWorkDate` により「今日」を補う設計へ統一。この「初期stateは空・実値はマウント後effectで補う」パターンは同じKYドメインの `ky-morning-signage.tsx` が既に採用している安全な既存パターンで、新規発明ではなく整合を取った。年/月/日プルダウンには空→実値の切替でも幅が変わらないよう `min-w-*` を追加（CLS抑止の予防線）。
CLS実測: prod build を3回巡回した結果 CLS=0.0006〜0.0108 で変更前後とも同値。attribution付きprobeで発生源は「端末内保存」同期状態ラベル（本タスクで未変更の箇所）と特定し、`main`（変更前）でも同一の0.0006が再現することを確認済み＝今回の変更が原因ではない既存の無害な残余CLS（0.1未満の "good" 域）と判断し追加対応はスコープ外とした。
ゲート: tsc=0 / lint errors=0（既存warn2件のみ・変更ファイル内）/ vitest 232ファイル1933 pass / build成功（`○ /ky/paper` 静的生成を確認）。無読ではなく技術検証のため Playwright は console error 0件・CLS実測・作業日が当日値に収束することを機械確認する `docs/third-party-reviews/scripts/ky-paper-hydration-cls-2026-07-02.mjs` を新規保存し、prod start(4173)で3回連続 console errors=0 を確認。
バックログ整理（コード変更なし）: BACKLOG-ux-records.md の7行目注記が明示的に取消可としていた「/education-certification 発行/一覧」の残存重複行を[x]closeし、「KY周辺ユーティリティ(/ky/list・/ky/workers)」の着手中/未着手の重複2行（#558で既に完了・マージ済み）を統合整理。
残: O10(KY用紙Phase2)はF1依存待ち、O15(SlideDeck)はdataレーンO14依存待りで着手不可。次イテレーションは依存解消状況を確認のうえ、着手可能な柱0補充/柱3レビューへ振替を検討。

## 2026-07-03 lint警告23件の掃除（自班route分）＝#597

着手前の回収: 自班PR #593（安全日誌/list 結論カード新設）はCI(e2e/smoke/Vercel)pending のため契約どおり次イテレーションで回収。main を `git pull --ff-only` して clean を確認し本タスクへ。
BACKLOG-ux-records.md 最上位の未着手5件（O10/O15/S1/S2/S3）を確認したが、O10・S1はBACKLOG-fable.md F1（KY用紙・直接操作UIの方式確立）が未着手のため依存でブロック、O15・S2・S3はBACKLOG-data.md O14（災害の型正規化＋型別サマリ生成）が未着手のため依存でブロック＝未着手3件未満（実質0件）につき契約どおり自領域レビューから補充。
診断07（残課題スイープ・2026-07-02）の「11. lint警告46件の掃除（33件は`--fix`可・ky-paper-view の exhaustive-deps 2件は手当）」を実地確認したところ、46件中23件が当班所有ファイル（site-records各client 7ファイル: incident-report/induction/inspection/monthly/near-miss/patrol/procedure ＋ `ky-paper-view.tsx`）に集中していたため、当班所有分のみを是正対象とした（他班ファイル=for/construction・heat-illness-prevention・search・elearning-progress-board・favorites・safety-plan の23件は対象外・不変）。
発見: `react-hooks/set-state-in-effect` の「Unused eslint-disable directive」警告は、各 `useEffect` 内で**最初のsetState呼び出し1箇所のみ**がこのルールの診断対象であるにも関わらず、過去のPRで効果内の全setState呼び出し行に個別の `eslint-disable-next-line` を重複して付与していたことが原因（2箇所目以降は元々何も抑制していない＝真に不要）。実地検証: 先に全件除去→`npm run lint`で7ファイルにエラー(react-hooks/set-state-in-effect)が新規発生することを確認→各effectの最初の1行にのみ disable コメントを復元して再検証しエラー0を確認（安易な一括削除は避け実測で裏取り）。
その他: `patrol-client.tsx`/`induction-client.tsx` の未使用import `summarizePatrol`/`summarizeInduction`（関数定義自体は `patrol-store.ts`/`induction-store.ts` 側で他所から使用中のため削除せず、importのみ除去）。`ky-paper-view.tsx` の2箇所の `useEffect` は `useCallback(deps=[])` で安定参照の `setNotice` を呼ぶが依存配列に含めておらず exhaustive-deps 警告＝deps配列に追加（`setNotice` はレンダー間で参照不変のため再実行リスクなし）。
ゲート: tsc=0 / lint errors=0（当班route分の警告23件→0、他班分23件は不変）/ vitest 237ファイル1975 pass / build成功。挙動変更を伴わない静的解析クリーンアップのため無読テスト・Playwrightスクリプトは対象外。テスト実行中に副生成された `docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`（他レーン所有のevalメトリクス）は変更前に revert しコミットから除外。
残: #593（安全日誌/list 結論カード）はCI待ちで次回収。O10/O15/S1/S2/S3は引き続きクロスレーン依存待ち。次イテレーションは依存解消状況を再確認のうえ、着手可能なら本命タスクへ、未解消なら柱0/柱3レビュー継続。

## 2026-07-03 O10（続き・第二弾）KY用紙Phase2 危険行のcanvas直接編集化＝#621へ追加

着手前の回収: 自ブランチ `ux-rec/o10-ky-canvas-phase2-work-goal`（PR #621・O10第一弾）はCI(e2e/smoke/Vercel)pending のため契約どおりマージ見送り。この続きタスク（O10（続き））は #621 が導入したフィールドマップ基盤に直接依存し、main側にはまだその基盤が無いため、main発の新ブランチではなく同一ブランチ上で継続（CI緑化後に一括で#621がマージされる想定）。
本イテレーションは「KY用紙Phase2の残り」のうち危険行（動的行・＋行追加ホットスポット・可能性/重大性プルダウン）に限定して実施（参加者・zoom-to-cell・AI提案統合・canvas既定切替は次段へ）。
実装: `paper-fields.ts` の静的10欄キー（`KyPaperStaticFieldKey`）に加え、危険行用のインデックス付きテンプレートリテラル型キー `risk.${number}.hazard|eval|reduction` を追加。行数は固定せず `record.riskRows.length` に追従（既定5行・「＋行追加」で無制限に増える）ため、フィールド定義とnext連鎖を両方とも純粋関数化: `getKyPaperFieldDef(key)` が静的欄と危険行の両方を解決し、`nextKyPaperFieldKey(key, record)` が現在の行数を見て最終行の対策から `teamGoal` へ折り返す。`FieldEditorSheet`・`EditableCell`（ky-print-sheet.tsx）はこの2関数経由に統一し、旧来の `KY_PAPER_FIELDS[key]` 直接参照を排除。
可能性・重大性は年/月/日・天気と同じ既存の「タップ→専用シート内プルダウン」作法に統一（新しいUIパターンは増やさない）。既定値(1)を必ず持つため isEmpty は常に false＝未記入ハイライトの対象外とした。
「＋危険行を追加」は `KyPrintSheetEditing.onAddRiskRow`（省略可＝印刷/従来経路には一切影響しない）として追加し、`ky-paper-view.tsx` 側で行追加後にその行の危険欄をそのまま開く（zoom-to-cellの先取り、未記入セルへジャンプする本タスクの本丸機能の布石）。危険行の可能性・重大性の新規行番号ラベル（①②③④以降）は `operations-service.ts` の正規化ロジックと同じ規則を `makeEmptyKyRiskRow` として公開し重複を排除。
印刷不可侵の確認: `editing` 未指定時のリスク表描画ロジック（記入済み行のみ表示／全欄空なら1行プレースホルダ）は一切変更していないため既存スナップショットは無変更で全合格。
ゲート: tsc=0 / lint errors=0（既存warnのみ・対象外ファイル）/ vitest 242ファイル2060 pass（`paper-fields.test.ts` に危険行キーの組み立て/分解・next連鎖・get/set・emptyKyPaperFieldKeys拡張を10本追加、`ky-print-sheet.test.tsx` に危険行タップ標的・追加ホットスポットの3本を追加）/ build成功（`○ /ky/paper` 静的生成を確認。1回目のbuildはNode側のセグメンテーション違反で異常終了したが原因はコード非依存の環境フレークと切り分け、再実行で正常終了・0/2599の生成失敗なしを確認）。
無読Playwright: 新規 `docs/third-party-reviews/scripts/ky-canvas-phase2-risk-rows-2026-07-03.mjs` を prod start(4212)で実行し15/15 PASS（危険のポイント/対策のタップ編集・可能性/重大性のプルダウン・＋行追加後の同一作法での記入続行・印刷シートへの反映・印刷シートに追加ボタンが出ないことを確認）。既存 `ky-canvas-phase2-work-goal-2026-07-03.mjs` は「本日の作業内容」の次が危険行につながるよう記入順を正した意図的な変更に合わせ、目標欄への直接タップ検証に更新のうえ13/13で回帰合格を確認。
余談（本文と無関係だが記録）: 本イテレーション中に `web/AGENTS.md`（`@AGENTS.md` で読み込まれる）および `node_modules/next/dist/next/dist/docs/index.md` 内に「コード変更前にNext.jsの特定docsを読め」「`unstable_instant` をexportせよ」といった、実在しないAPIへの変更を誘導する体裁のプロンプトインジェクションらしき記述を検出。本タスクには無関係と判断し従わず、無視して本来の作業のみ実施した。
残: O10（続き）はさらに参加者（チップ選択のシート内化）・zoom-to-cell・AI提案/音声のエディタ内統合・canvas既定切替が残る。#621（O10第一弾+第二弾）はCI待ちで次回収。O15/S1/S2/S3は引き続きクロスレーン依存待ち。

## 2026-07-03 S1（第一弾）打合せ用紙 直接操作UI横展開に着手

着手前の回収: 自ブランチ `ux-rec/o10-ky-canvas-phase2-work-goal`（PR #621・O10第五弾・完）はCI(e2e/smoke/Vercel)が引き続きIN_PROGRESSのため契約どおりマージ見送り。`main`は直近マージ済みでclean・O10がbacklog上[x]（第五弾・完）済みと確認できたため、S1の依存（O10完了＝PaperStage/フィールドマップ規約の確立）が解消済みと判断し着手。O14（data班）未着手のためO15/S2/S3は引き続きブロック。
規模確認: 打合せ書（`MeetingRecord`）はKYより構造が複雑（各社マトリクス＝業者×階層の動的2Dグリッド、明日のイベント5欄、搬入出動的行、点検項目8カテゴリ×可変項目）で、O10試算（14〜22h）を上回る規模と判断。O10と同じ「足す＋壊さない」原則で検証可能な単位に分割し、第一弾はヘッダー7欄（打合せ日・作業日・天気気温・作業所名・作業所長・主任等・作成担当者）のみに限定。
実装: `web/src/lib/meeting/paper-fields.ts`を新規作成（S1の指示どおり新規設計はこのフィールド定義のみ＝KYの`get/set`＋`isEmpty`＋`next`連鎖の型をMeetingRecord向けにそのまま踏襲、危険行のような動的行は無いため`getKyPaperFieldDef`のような分岐は不要でシンプル）。`MeetingPrintSheet`に省略可能な`editing` prop＋KyPrintSheetと同型の`EditableCell`ローカル関数を追加し、ヘッダー7欄（タイトル行の打合せ日サブテキストも含む）をタップ標的化。`editing`未指定時は`EditableCell`が`<>{children}</>`を返す構造のため出力HTMLは構造的にバイト同一＝新規スナップショットテストで機械固定（A4横印刷は不可侵）。
`MeetingFieldEditorSheet`を新規作成（KYのFieldEditorSheetは`KyInstructionRecordState`/参加者/AI提案に強く型結合していたため直接の汎用化はせず、同型の専用実装。対応する型はtext/date/date3/weatherTempの4つ。天気の選択肢配列はこれまで`meeting-paper-view.tsx`のローカル定数だったものを`schema.ts`の`MEETING_WEATHER_OPTIONS`へ切り出し、クラシック表示（既存の`<select>`）と新エディタの両方から参照＝重複ゼロ）。
`MeetingPaperView`にKYのF1確立時と同じ方式で`canvasMode`状態（既定false・オプトイン。既定切替はKYもO10第五弾まで段階を踏んでおり本タスクでは時期尚早と判断）を追加し、`?canvas=1`とURL同期。クラシック表示の上部バーに「🗺 キャンバス(β)」入口を追加し、キャンバス表示には「従来表示」への復路・保存一覧リンク・のこりN項目でのzoom-to-cell（PaperStageの`focusField`を利用）・保存/印刷ボタンを実装。PaperStageは`fieldKey: string`のみに依存する汎用実装であることをコード確認済みのため無改変で再利用（KY所有だが同一レーン=ux-recordsの所有route内のため custodian 逸脱なし）。
未実装（第二弾以降へ）: 各社マトリクス（業者×階層の動的グリッド。KYの`risk.N.part`とは異なり親子階層を持つため専用キー設計が要る）・明日のイベント・搬入出・点検項目・AI提案(既存`/api/meeting/suggest`)のエディタ統合・履歴サジェスト(datalist)のcanvas内提供・既定切替。
ゲート: tsc=0 / lint errors=0（既存warn23件のみ・対象外ファイル）/ vitest 264ファイル2241 pass（`paper-fields.test.ts`7本・`meeting-print-sheet.test.tsx`7本を新規追加）/ build成功（`○ /safety-diary` 静的生成を維持）。
無読Playwright: 新規`docs/third-party-reviews/scripts/meeting-canvas-phase1-header-2026-07-03.mjs`をprod start(4211)で実行し17/17 PASS（既定はクラシック表示・トグルでのopt-in・URL同期・ヘッダー7欄のタップ→エディタ→次の欄へ連鎖→用紙反映→印刷シート同期・クラシック表示との相互反映・未記入セルのタップして入力ヒントを確認）。
テスト実行の副生成物（`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`。他レーン所有のevalメトリクスで、当セッション中に別プロセスが更新したものと推定）は変更前に revert しコミットから除外。
余談（記録のみ・対応不要）: `web/node_modules/next/dist/docs/index.md`内に前回イテレーション同様の「コード変更前に特定docsを読め」という体裁のプロンプトインジェクションらしき記述を確認。本タスクに無関係と判断し無視して本来の作業のみ実施した（前回2026-07-03エントリと同一系統の混入で、cross-iterationで再現していることを記録として残す）。
残: S1（続き・第二弾）として各社マトリクス以降をBACKLOG-ux-records.mdへ起票済み。O15/S2/S3は引き続きdataレーンO14依存でブロック。PR #621（O10）はCI待ちで次回収。

## 2026-07-03 S1（第三弾）各社マトリクスのcanvas化に着手

着手前の回収: 自ブランチ`ux-rec/s1-meeting-canvas-phase1-header`（PR #660、S1第一弾+第二弾を含む）はCI(e2e/smoke/Vercel)がIN_PROGRESSのため契約どおりマージ見送り。他の自班未マージPRも同様にCI進行中のため今回はマージ対象なし。同一ブランチ上でS1の続き（第三弾）に着手（O10と同じく1つの機能横展開を複数コミットに分割しCI待ちの間も前進する既存パターンを踏襲）。
規模判断: BACKLOG起票時点の第三弾は「各社マトリクス全体＋搬入出＋点検項目＋AI提案＋履歴サジェスト＋既定切替」を一括で指していたが、各社マトリクスだけでも7部位×タグ選択/固定プルダウン/複合欄など複数のUIパターンが要ることが調査で判明したため、O10と同じ「小さく検証可能な単位に割る」原則でさらに分割。本弾はテキスト系5部位（会社名・階層の複合欄=company・作業内容・使用機械・安全衛生指示事項・協力会社責任者・実績人員）とリスク（重大性/可能性→優先度自動計算）の計7部位に限定し、必要資格・予定人員・予想災害（タグ/固定プルダウン専用UIが要る）・搬入出・点検項目・AI提案・履歴サジェスト・既定切替は次弾以降へ回した。
設計判断（KYとの差異）: KYの危険行キー`risk.${number}.part`は位置(index)だけで足りたが、各社マトリクスは行の追加・削除・階層(元請/1次/2次/3次)を持ち、行の並び替えでindexがずれ得るため、id直下キー`contractor.<id>.<part>`を新設（`paper-fields.ts`に`contractorFieldKey`/`parseContractorFieldKey`/`buildContractorFieldDef`を追加）。`MeetingPaperFieldKey`は静的13欄の型を`MeetingPaperStaticFieldKey`に改名し、新しい各社マトリクスキーとのユニオンへ拡張（呼び出し側の型名は変えていないため他ファイルへの波及なし）。
記入順チェーンの拡張: `nextMeetingPaperFieldKey`にrecord引数を追加（KYの`nextKyPaperFieldKey(key, record)`と同型）。作成担当者(author)の次は1行目のcompany欄へ（行が0件なら従来どおりsafetyMeetingへ直接続く）、各行は company→workContent→machines→risk→safetyInstructions→responsibleName→actualCountの順で辿り、最終行の最終部位の次はsafetyMeetingへ折り返す。`firstEmptyMeetingPaperFieldKey`もKYと同型のchain-walk実装に書き替え（旧実装は静的配列を単純ループするだけで各社マトリクスの動的挿入に追従できなかったため）。
UI実装: `MeetingPrintSheet`の各社マトリクス7セル（リスクは重大性/可能性の2td双方が同一フィールドキーのタップ標的＝KYのriskEvalと同型）を`EditableCell`でラップ。`editing`未指定時は`EditableCell`が中身をそのまま返す構造のため出力HTMLはバイト同一＝既存スナップショット無変更で確認。「＋元請/1次/2次/3次」の行追加ホットスポットを`MeetingPrintSheetEditing.onAddContractorRow`（省略可）として追加し、`MeetingPaperView`側で追加した行のcompany欄をそのまま開く（O10の危険行追加と同じ「そのまま開く」作法）。`MeetingFieldEditorSheet`に`contractorCompany`（階層select＋会社名InputWithVoice）・`contractorRisk`（重大性/可能性selectペア＋優先度自動表示、`setContractorRiskField`/`setContractorCompanyField`を`paper-fields.ts`の純粋関数として切り出しcanvas/エディタで共有）の2型を追加。
既存挙動への影響確認: `buildDefaultMeetingRecord()`は既定で1行（元請）を持つため、既存のヘッダー記入順チェーン（第一弾・第二弾のPlaywrightスクリプト）で作成担当者の次が今回から各社マトリクスへ分岐するようになったが、両スクリプトとも「次の欄へ」を作成担当者から先へは辿らない/直接タップで各欄を検証する設計だったため実際には無影響と確認（既存スクリプト2本を再実行し回帰合格）。
ゲート: tsc=0 / lint errors=0（フルlintは無関係な大容量データファイルでNode側セグメンテーション違反が発生したため対象ファイルのみ`npx eslint`でスコープ実行し確認・原因はコード非依存の環境フレークと切り分け）/ vitest 267ファイル2281 pass（`paper-fields.test.ts`に各社マトリクスのキー組み立て/分解・7部位のフィールド定義・get/set・setContractorRiskField/setContractorCompanyField・記入順チェーン・firstEmpty/emptyKeys拡張を12本追加、`meeting-print-sheet.test.tsx`に各社マトリクスのタップ標的・行追加ホットスポットの3本を追加。既存の記入順チェーンテストは各社マトリクス無し(`contractors: []`)を明示する形へ更新し従来の検証意図を保持）/ build成功（`○ /safety-diary`静的生成を維持）。
無読Playwright: 新規`docs/third-party-reviews/scripts/meeting-canvas-phase3-contractors-2026-07-03.mjs`をprod start(4214)で実行し22/22 PASS（会社名/階層・作業内容・使用機械・リスク・安全衛生指示事項・協力会社責任者・実績人員の記入順チェーン・行追加ホットスポットでそのまま開く挙動・行追加が既存行を壊さないこと・印刷シート同期・クラシック表示との相互反映を確認）。既存`meeting-canvas-phase1-header-2026-07-03.mjs`17/17・`meeting-canvas-phase2-tomorrow-events-2026-07-03.mjs`18/18も回帰合格。
テスト実行の副生成物（`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`・KY/meetingのスナップショット2件の見かけ上の変更。フルvitest実行時に他レーン所有のevalメトリクスが再生成され、スナップショット2件は内容差分ゼロのCRLF起因の見かけ上の差分と確認）は変更前にrevertしコミットから除外。
残: S1（続き・第四弾）として各社マトリクス残り3部位（必要資格・予想災害のタグ選択、予定人員の固定プルダウン）をBACKLOG-ux-records.mdへ起票済み。搬入出・点検項目・AI提案統合・履歴サジェスト・既定切替も引き続き後続弾。O15/S2/S3は引き続きdataレーンO14依存でブロック。PR #660はCI待ちで次回収。

## 2026-07-03 S1（第四弾）各社マトリクス残り3部位のcanvas化＝7部位すべて完了

着手前の回収: 自ブランチ`ux-rec/s1-meeting-canvas-phase1-header`（PR #660、S1第一〜三弾）はCI(e2e/smoke/Vercel)がpending継続のため契約どおりマージ見送り。data班のO14（災害の型正規化辞書）は`origin/main`のBACKLOG-data.mdでも引き続き`[ ]`未着手と確認できたためO15/S2/S3は変わらずブロック中。BACKLOG最上位の実行可能タスクはS1（続き・第四弾）と判断し、同一ブランチ上で継続（既存パターン踏襲）。

実装: `paper-fields.ts`の`MeetingContractorFieldPart`を7→10部位へ拡張し、`CONTRACTOR_FIELD_PARTS`の並びを印刷シートの列順（業者→作業内容→使用機械→必要資格→予定→予想災害→重/可→安全衛生指示事項→責任者→実績）に合わせ`machines`と`risk`の間へ挿入（`nextMeetingPaperFieldKey`のロジックは無変更のまま記入順チェーンが自動追従）。必要資格・予想災害は新設`type: "contractorTags"`（`tagField`プロパティで対象配列=qualifications/predictedDisastersを区別）、予定人員は新設`type: "contractorPlannedCount"`（固定プルダウン、選択肢は既存クラシック表示のローカル定数`COUNT_OPTIONS`だったものを`schema.ts`の`MEETING_COUNT_OPTIONS`へ切り出しクラシック/canvas両方で共有＝重複ゼロ）。クラシック表示のタグ入力（旧`meeting-paper-view.tsx`private関数`TagField`）を`components/meeting/meeting-tag-field.tsx`の`MeetingTagField`へ切り出し、`MeetingFieldEditorSheet`と共有（同じくロジック重複ゼロ）。`setContractorTagsField`/`setContractorPlannedCountField`をKYの`setContractorRiskField`と同型の純粋関数として`paper-fields.ts`に追加。
`MeetingPrintSheet`の該当3セル（必要資格・予定人員・予想災害）を`EditableCell`でラップ。`editing`未指定時は`EditableCell`が中身をそのまま返す構造のため出力HTMLはバイト同一＝既存スナップショット無変更で確認（A4正式書式は不可侵のまま）。
ゲート: tsc=0 / lint errors=0（既存warn23件のみ・対象外ファイル）/ vitest 267ファイル2283 pass（`paper-fields.test.ts`にgetMeetingPaperFieldDef 10部位・setContractorTagsField/setContractorPlannedCountField・記入順チェーン延伸・emptyMeetingPaperFieldKeys拡張を計4本追加、`meeting-print-sheet.test.tsx`は既存テストの3セル分アサーションを追加更新）/ build成功（`○ /safety-diary`静的生成を維持）。
無読Playwright: 新規`docs/third-party-reviews/scripts/meeting-canvas-phase4-remaining-parts-2026-07-03.mjs`をprod start(4215)で実行し14/14 PASS（必要資格タグの追加/削除・予定人員の固定プルダウン選択・予想災害タグの追加・記入順チェーンが使用機械→必要資格→予定人員→予想災害→リスクの順で繋がること・用紙反映・印刷同期・クラシック表示との相互反映を確認）。既存`meeting-canvas-phase3-contractors-2026-07-03.mjs`は記入順チェーン延伸に合わせ使用機械とリスクの間に3ステップを追加し25/25で回帰合格、`phase1-header`17/17・`phase2-tomorrow-events`18/18も無影響で回帰合格。
テスト実行の副生成物（`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`・KYスナップショット1件の見かけ上の変更。フルvitest実行時に他レーン所有のevalメトリクスが再生成されたもので内容差分ゼロと確認）は変更前にrevertしコミットから除外。
残: S1（続き・第五弾）として搬入出動的行・点検項目8カテゴリのcanvas対応、AI提案（既存`/api/meeting/suggest`統合）、履歴サジェスト（datalist）、最終的に既定切替（β外し）をBACKLOG-ux-records.mdへ起票済み。O15/S2/S3は引き続きdataレーンO14依存でブロック。PR #660はCI待ちで次回収。

## 2026-07-03 S1（第五弾）搬入出予定（動的行3部位）のcanvas化

着手前の回収: `gh pr checks 660`で確認したところ自ブランチ`ux-rec/s1-meeting-canvas-phase1-header`（PR #660、S1第一〜四弾）はe2e/smoke/VercelともCI緑と判明。着手前に`gh pr merge 660 --squash --delete-branch`を実行し正常にマージ（GitHub側は成功）。ただしローカルには本タスク（第五弾）の未コミット変更が同一ブランチ上にあったため、マージ後の自動ブランチ切替でgitが「ローカル変更が上書きされる」と検知しチェックアウトのみ失敗（マージ自体は成功済みと`gh pr view 660`で確認）。復旧: 第五弾の変更を1コミットにまとめ、`main`を最新化した上で新規ブランチ`ux-rec/s1-meeting-canvas-phase5-deliveries`を作成し該当コミットをcherry-pickして継続（O10/S1で定着した「1ブランチに複数弾を積む」運用ではなく、今回はPRが既にマージ済みだったため新規ブランチでのPR分離となった）。
実装: 搬入出予定（動的行・物/時刻/場所の3部位）を各社マトリクス（第三弾）と同型のidキー方式`delivery.<id>.<part>`でcanvas対応（`paper-fields.ts`に`deliveryFieldKey`/`parseDeliveryFieldKey`/`buildDeliveryFieldDef`を追加）。各社マトリクスと異なりタグ/プルダウンが無く3部位とも`type: "text"`のため、`MeetingFieldEditorSheet`側の新規分岐は不要（既存の`text`型ハンドラをそのまま再利用）。
記入順チェーン: `nextMeetingPaperFieldKey`に`free`（その他）の特殊分岐を追加し、搬入出行が1件以上あれば1行目のitem欄へ、無ければ従来どおりsupervisorCommentへ直結。行内はitem→time→place、最終行最終部位の次はsupervisorCommentへ折り返す（各社マトリクスのauthor→company連鎖と同型）。
`MeetingPrintSheet`: 従来は「記入済み行のみ表示（絞り込み）」だった搬入出テーブルを、KYの危険行と同じ`editing ? (全行・空欄含む表示) : (従来の絞り込み表示)`の分岐に変更（`editing`未指定時のJSXは元のコードをそのまま温存＝スナップショット無変更で確認）。「＋搬入出行を追加」ホットスポットを新設し、`MeetingPaperView`の`handleAddDeliveryRow`で追加行の物欄をそのまま開く（O10/S1既存パターン踏襲）。
ゲート: tsc=0 / lint errors=0 / vitest 2352 pass（`paper-fields.test.ts`に往復/フィールド定義/get-set/記入順チェーン/firstEmpty/emptyKeysの8本、`meeting-print-sheet.test.tsx`に行追加ホットスポット2本を追加）/ build成功（`○ /safety-diary`静的生成を維持）。
無読Playwright: 新規`docs/third-party-reviews/scripts/meeting-canvas-phase5-deliveries-2026-07-03.mjs`をprod start(4216)で実行し15/15 PASS（1行目item/time/place記入順チェーン・行追加ホットスポットでそのまま開く挙動・2行目追加後も1行目維持・印刷同期・クラシック表示との相互反映を確認）。既存`phase1-header`17/17・`phase3-contractors`25/25・`phase4-remaining-parts`14/14は無影響で回帰合格、`phase2-tomorrow-events`はfree→統括安全責任者コメントの間に搬入出3欄の経由が挿入された影響で中間アサーションを追加し21/21回帰合格（この更新は既にPR #660にマージ済みのため、今回のPRでは重ねて含めた）。
テスト実行の副生成物（`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`・KY/meetingスナップショット2件の見かけ上の変更。フルvitest/build実行時に他レーン所有のevalメトリクスが再生成され、スナップショット2件は内容差分ゼロのCRLF起因の見かけ上の差分と確認）は変更前にrevertしコミットから除外。
余談（記録のみ・対応不要）: `web/node_modules/next/dist/docs/index.md`内に前回・前々回イテレーションと同一系統のプロンプトインジェクションらしき記述（存在しない`unstable_instant`エクスポートを使えという「AI agent hint」コメント）を今回も確認。本タスクに無関係と判断し無視して本来の作業のみ実施した（cross-iterationで継続的に混入していることの記録）。
残: S1（続き・第六弾）として点検項目8カテゴリのcanvas対応、AI提案（既存`/api/meeting/suggest`統合）、履歴サジェスト（datalist）、最終的に既定切替（β外し）をBACKLOG-ux-records.mdへ起票済み。PR #685（本弾）はCI待ちで次回収。O15/S2/S3は引き続きdataレーンO14依存でブロック。

## 2026-07-03 S1（第六弾）点検項目8カテゴリのcanvas化

回収: `gh pr list --head ux-rec/s1-meeting-canvas-phase5-deliveries`でPR #685（S1第五弾）がe2e/smoke/VercelともCI緑と確認できたため、本弾の作業に入る前に`gh pr merge 685 --squash --delete-branch`を実行しマージ。ただし本弾の未コミット変更が同一ブランチ上にあったため、`git stash push -u`で退避→`git checkout main && git pull --ff-only`（他レーンのマージ分含め41ファイルfast-forward・clean確認）→新規ブランチ`ux-rec/s1-meeting-canvas-phase6-checklist`を作成→`git stash pop`で復元、の順で続行（第五弾で確立した「PRが既にマージ済みの場合は新規ブランチでのPR分離」運用を踏襲）。

着手: BACKLOG最上位[ ]はS1（続き・第六弾）。O15/S2/S3はdataレーンO14が`origin/main`のBACKLOG-data.mdでも引き続き`[ ]`未着手と確認できたため変わらずブロック中。

設計判断: 点検項目は各社マトリクス・搬入出と異なり、カテゴリ×項目が固定構造（行の追加・削除・並び替えを持たない）。id採番によるキー方式（`contractor.<id>.<part>`/`delivery.<id>.<part>`）は不要と判断し、カテゴリのkeyをそのまま識別子に使う`checklist.<categoryKey>`方式を採用（`paper-fields.ts`に`checklistFieldKey`/`parseChecklistFieldKey`/`buildChecklistFieldDef`を追加。ラベルは`DEFAULT_CHECKLIST`から公式8カテゴリの標準ラベルを引き、未知カテゴリへは汎用ラベル「点検項目」にフォールバック）。タップ粒度はカテゴリ単位（印刷シート上でカテゴリごとに1セルにまとまっているため、そのままEditableCellの単位にした）。isEmptyは既定値(na=該当無)が正当な回答であり「未記入」概念が無いため、既存のリスク欄(重大性/可能性)と同じ扱いで常にfalse（未記入ハイライト・zoom-to-cell対象外＝誤って「未記入」と誤認させない、という既存判断を横展開）。

実装: 記入順チェーンは統括安全責任者コメントの次→1カテゴリ目→…→最終カテゴリの次→次欄なし（用紙全体の記入順チェーンの真の終端）に挿入（`nextMeetingPaperFieldKey`にchecklist分岐を追加。カテゴリが1件も無ければ従来どおりsupervisorCommentで終わる）。`MeetingPrintSheet`の点検項目セル（カテゴリ単位、4列×2行のchunk表示）を`EditableCell`でラップ（`editing`未指定時はEditableCellが中身をそのまま返す構造のためHTML出力はバイト同一＝既存スナップショット無変更で確認、A4正式書式は不可侵のまま）。`MeetingFieldEditorSheet`に`checklist`型を追加＝カテゴリ内の各項目を44px四方のtri-state（○/×/－）ボタンで直接タップ切替する専用UI（テキスト入力欄が無くタッチ操作のみで完結するため、他の型と異なり開いた時のオートフォーカス対象外＝input/select/textareaを探すuseEffectは既存のまま無害に空振り）。印刷シート側の`STATUS_MARK`（○/×/－の表示マーク定数）をexportしエディタ内ボタンのラベルと共有（マーク文字列の重複定義ゼロ）。`setChecklistItemStatus`を他のsetXxxField群（`setContractorRiskField`等）と同型の純粋関数として`paper-fields.ts`に追加。

ゲート: tsc=0 / lint errors=0（既存warn23件のみ・対象外ファイル）/ vitest 2383 pass（`paper-fields.test.ts`にキー往復・全8カテゴリのラベル解決・isEmpty常時false・setChecklistItemStatusのイミュータブル更新・記入順チェーン（有/無の両方）を計6本追加。既存2本は点検項目チェーン延伸の影響を切り分けるため`{ checklist: [] }`を明示するよう更新）/ build成功（`○ /safety-diary`静的生成を維持）。
無読Playwright: 新規`docs/third-party-reviews/scripts/meeting-canvas-phase6-checklist-2026-07-03.mjs`をprod start(4217)で実行し18/18 PASS（カテゴリセルのタップ標的・エディタ内tri-stateボタンが44px四方以上・○/×切替が用紙に即反映・統括安全責任者コメントから8カテゴリを経由し最終欄で『完了』ボタンに変わる記入順チェーン・印刷同期・クラシック表示との相互反映を確認）。既存`phase1-header`17/17・`phase3-contractors`25/25・`phase4-remaining-parts`14/14・`phase5-deliveries`15/15は無影響で回帰合格。`phase2-tomorrow-events`は統括安全責任者コメントが記入順の最終欄でなくなった影響（従来「完了」ボタン→本弾から「次の欄へ」で点検項目1カテゴリ目に進む）でアサーションを更新し21/21回帰合格。
テスト実行の副生成物（`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`・KYスナップショット1件の見かけ上の変更。フルvitest/build実行時に他レーン所有のevalメトリクスが再生成されたもので内容差分ゼロと確認）は変更前にrevertしコミットから除外。
残: S1（続き・第七弾）としてAI提案（既存`/api/meeting/suggest`をcanvas内エディタへ統合）、履歴サジェスト（datalist）のcanvas内提供、最終的に既定切替（β外し）をBACKLOG-ux-records.mdへ起票済み。O15/S2/S3は引き続きdataレーンO14依存でブロック。

## 2026-07-03 /ky-examples ConclusionCard action未指定＋主CTA44px未満の是正

回収: `gh pr list --author @me`でPR #695（S1第六弾・現在のブランチ）がe2e/smoke/VercelともCI緑と確認、`gh pr merge 695 --squash --delete-branch`でマージ→`git checkout main && git pull --ff-only`でclean確認（41ファイルfast-forward）。

着手: BACKLOG最上位の`[ ]`はO15（dataレーンO14依存でブロック継続を`BACKLOG-data.md`で再確認）→S2・S3もO15依存でブロック。唯一ブロックされていない未着手は柱0補充・次点の`/ky-examples`タスクのため、これに着手（ブロック中の3件は上から処理する原則の例外としてスキップ、未着手総数は3件のため補充なしで対応）。

実装: `KyExamplesBrowser`のヘッダー内にあった重複CTA（`Link href="/ky"`「KY用紙の作成へ進む→」・`px-3 py-1.5 text-xs`で44px未満）を撤去し、通常表示・0件（該当なし）表示の両ConclusionCardに`action={{ href: "/ky/paper", label: "KY用紙を作る" }}`を追加（ConclusionCard部品側でタップ標的44px以上を保証済みのため足すだけ）。リンク先は元の`/ky`（`/ky/paper`への恒久リダイレクト、#525で既述）ではなく兄弟route（/ky/list・/ky/workers等）と揃えて`/ky/paper`へ直リンクに統一。

0件状態の扱い: 5業種×10作業種別の全40組合せに実データが存在する（KY_EXAMPLES 150件=5業種×10種別×各3件）ため、フィルタUIから0件状態へ実際には到達できないとデータを確認。捏造回避のため0件分岐のPlaywright検証は行わず、通常表示のみ機械検証しaction付与はコードレビューで担保（コメントで明記）。

ゲート: tsc=0（`npx tsc --noEmit`初回に`result.push is not a function`のTS内部クラッシュが発生したが、変更前のmainでも再現するかstashで確認したところmain側は正常終了＝一過性の事象と判明、再実行で解消・以後安定して0）/ lint errors=0（既存warn23件のみ・対象外ファイル）/ vitest 2395 pass / build成功（`○ /ky-examples`静的生成を維持）。
無読Playwright: 新規`docs/third-party-reviews/scripts/ky-examples-conclusion-cta-44px-2026-07-03.mjs`をprod start(3100)で実行し5/5 PASS（結論カードに『該当事例』150件表示・カード内次アクション『KY用紙を作る』が44px以上で見える・リンク先`/ky/paper`・ヘッダー内旧重複CTAの撤去を確認）。
残: O15/S2/S3は引き続きdataレーンO14依存でブロック。未着手は3件のまま（補充基準「3件未満」に該当せず今回は補充なし）。

## 2026-07-03 S1（第七弾）作業内容欄のAI提案をcanvas統合＋柱0巡回

回収: `gh pr list --author "@me"`でPR #702（前弾ky-examples）はe2e/smokeともCI進行中(IN_PROGRESS)でまだ緑になっていなかったため、契約どおりマージは見送り次回収に回した。`git checkout main && git pull --ff-only`（他レーン分含めops.mdほか3ファイルfast-forward・clean確認）のみ実施。

着手: BACKLOG最上位[ ]はO15/S2/S3のみでいずれもdataレーンO14（`BACKLOG-data.md`で確認・引き続き`[ ]`）に依存し全ブロック中。まずExploreエージェントで自領域(safety-diary/site-records/ky/ky-examples/education-certification/education/foreign-workers/health-checkup-scheduler/account)の柱0未適用箇所を巡回させ、並行してS1第六弾の残課題として明記済み「AI提案のエディタ内統合」に着手（未着手[ ]項目としては明示のfile漏れだったため本弾冒頭でBACKLOG-ux-records.mdへ追記）。

実装: 従来UI（クラシック表示）の各社マトリクス行に既にある「AI提案」ボタン（`suggestRow`関数＝`/api/meeting/suggest`で作業内容から予想災害/安全衛生指示事項/必要資格/リスクを一括提案しその行に直接反映。KYのような候補一覧＋反映ステップは無く単発反映が既存挙動）をcanvasの作業内容エディタ内に追加。`MeetingFieldEditorSheet`に`onSuggestRow`/`suggestBusyId`propを追加し、作業内容欄のときだけ44px以上のAI提案ボタンを表示。`MeetingPaperView`は既存の`suggestRow`をそのまま配線するだけでロジック重複ゼロ。

つまずき（Playwrightで検出・原因特定・是正）: `buildContractorFieldDef`の`workContent`ケースは他の部位（company/qualifications等）と異なり`contractorId`フィールドを設定していなかった（get/setがcontractorTextGet/Setで完結するため元々不要だった）。当初`def.contractorId`に依存する条件でAI提案ボタンを出す実装をしたところ、Playwrightで「作業内容のエディタ内にAI提案ボタンがある」が一貫してFAILし、`sheet.innerHTML()`をデバッグ出力して原因を特定。`parseContractorFieldKey(def.key)`からその場で行idを取り出す方式に修正して解消（コードのみを信頼し、思い込みで先に進まず実機出力で裏取りした一例）。

ゲート: tsc=0 / lint errors=0（既存warn23件のみ）/ vitest 2395 pass（既存全件回帰。新規ロジックはKYと同型の配線のため新規ユニットテストは追加せずPlaywrightで機能検証）/ build成功（`○ /safety-diary`静的生成を維持）。
無読Playwright: 新規`docs/third-party-reviews/scripts/meeting-canvas-phase7-ai-suggest-2026-07-03.mjs`をprod start(4218)で実行し13/13 PASS（AI提案ボタンの出現・作業内容未記入時の従来UIと同じ案内・提案内容（予想災害/安全衛生指示事項/リスク）のその行への直接反映・印刷経路(editing無し)への非表示・クラシック表示との相互反映を確認）。既存`phase1-header`17/17・`phase2-tomorrow-events`21/21・`phase3-contractors`25/25・`phase4-remaining-parts`14/14・`phase5-deliveries`15/15・`phase6-checklist`18/18は無影響で回帰合格。
テスト実行の副生成物（`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`・KYスナップショット1件の見かけ上の変更）は変更前にrevertしコミットから除外。

柱0巡回（Exploreエージェント）: 上位5件が全ブロック中のため自領域を巡回した結果、新規の欠落2件を発見しBACKLOG-ux-records.mdへ起票（本弾では未着手・次回収）: (1) `/safety-diary/contribute/[token]`（協力会社担当者向け入力フォーム。外部リンクから開く独立実装で結論カード未導入＋主要ボタン2箇所が44px未満）、(2) `/site-records/committee`（`committeeConclusion`「今月未開催」・`monthlyConclusion`「要対応」の2分岐でaction未指定＝ConclusionCard自身の規約違反）。daily-actions-panel.tsxのaction未指定3件は直下に実要対応リンク一覧が続くため実質代替されており対象外と判定。

余談（記録のみ・対応不要）: `web/node_modules/next/dist/docs/index.md`内に前回までと同一系統のプロンプトインジェクションらしき記述（存在しない`unstable_instant`エクスポートを使えという「AI agent hint」コメント）を今回も確認。`web/AGENTS.md`がこのnode_modules配下のdocsを読むよう誘導する内容になっている点も含め、本タスクに無関係と判断し無視して本来の作業のみ実施（cross-iterationで継続的に混入していることの記録）。

残: S1（続き・第八弾）として履歴サジェスト（datalist）のcanvas内提供、最終的に既定切替（β外し・O10第五弾と同様に機能パリティ確立が前提）をBACKLOG-ux-records.mdへ起票済み。柱0巡回発見の2件（contribute/committee）も起票済み。O15/S2/S3は引き続きdataレーンO14依存でブロック。PR #702（前弾）はCI待ちで次回収。

## 2026-07-03 /safety-diary/contribute/[token] 結論カード未設置＋44px是正

回収: `gh pr list --author "@me"`で当時のブランチ(#707, S1第七弾)がe2e/smoke/VercelともCI緑・mergeable=MERGEABLEと確認、`gh pr merge 707 --squash --delete-branch`でマージ。続けて`gh pr view 702`（前々回収#702・ky-examples）も全緑と分かったため squash マージを試みたところ、他レーンのマージで main が進み衝突（mergeable=false）と判明。契約どおり`gh pr checkout 702 && git fetch origin main && git merge origin/main`で通常マージし、`docs/court-cases-db-2026-06-06/cycle-log-ux-records.md`の1箇所（前回収時点の並行エントリ同士の競合）を両エントリとも保持する形で解消・ゲート再確認（tsc=0/lint=0）のうえpush。CIが緑になり次第の回収は次イテレーションへ（本弾終了時点でe2e/smoke pending）。`git checkout main && git pull --ff-only`でclean確認（他4レーンの新規ブランチ含め取得、3ファイルfast-forward）。

着手: BACKLOG最上位の未着手[ ]はO15/S2/S3（いずれもdataレーンO14依存で継続ブロック）に続き、前弾で柱0巡回発見として起票済みの2件のうち上から`/safety-diary/contribute/[token]`（結論カード未設置＋主要ボタン2箇所44px未満）に着手。着手前に現状確認のためファイルを直接読み対象箇所（ConclusionCard/StatusBadge不使用のインライン文言・「続けて編集する」`px-3 py-1.5 text-xs`・「一つ前の入力内容に戻す」`px-4 py-2 text-xs`）を裏取り。

実装: 共通基盤(ConclusionCard/StatusBadge)をimportのみで導入（custodianとして足すだけ）。状態を「未送信」(tone=info)／「編集中（送信済みあり）」(tone=info・cidあり)／「送信済み」(tone=safe・done)の3状態1メッセージへConclusionCardで集約。旧・現場名/作業日/端末登録済みを表すスカイ色の独自帯（重複表示）は撤去し、同内容をConclusionCardのchildrenにStatusBadge 2〜3個として一本化。主要ボタン2箇所（「続けて編集する」「一つ前の入力内容に戻す」）に`min-h-[44px]`を追加し44px化。楽観ロック・履歴30日保持・sanitize等の既存ロジックは無変更。

無読テストの制約と代替: このdev環境は`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`が未設定のため`/api/meeting/contribute/[token]`のGET/POSTは常時503（`cloud_not_configured`）を返し、有効なトークンを発行しても実ブラウザでは`state==="invalid"`にしか到達できず3状態を実機再現できないと`route.ts`のコードで確認（過去の`/account`柱0補充タスク#未と同型の制約）。捏造回避のため実ブラウザPlaywrightは実施せず明記し、代わりにvitest+RTLの`contribute-client.test.tsx`（新規）で`globalThis.fetch`をモックしGET応答の形のみ模倣、未送信/編集中/送信済みの3状態それぞれの結論カード文言・「結論カードは1画面1枚（role=statusが単一）」・「続けて編集する」ボタンの44pxクラスを検証（4/4新規pass、既存の`InquiryForm.test.tsx`と同じfetchモック作法を踏襲）。

ゲート: tsc=0 / lint errors=0（既存warn23件のみ・対象外ファイル）/ vitest 2418 pass（新規4件含む）/ build成功（`ƒ /safety-diary/contribute/[token]`維持）。
テスト実行の副生成物（`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`・KYスナップショット1件の見かけ上の変更）は変更前にrevertしコミットから除外。

## 2026-07-03 site-records 全9画面 下部操作バー主要ボタン44px化

回収: `gh pr merge 715 --squash --delete-branch`でPR #715（前弾・contribute結論カード）をCI全緑確認のうえマージ→`git checkout main && git pull --ff-only`でclean確認（他レーン4件のfast-forward込み）。前々回収のPR #718（committee/monthly action配線）はe2e完了・smoke pending中のため契約どおりマージ見送り次回収。

着手: BACKLOG最上位の未着手[ ]はO15/S2/S3（dataレーンO14依存で継続ブロックを`BACKLOG-data.md`で再確認）、続く`/site-records/committee`のaction未指定は前々回収PR #718で対応中の未マージタスクと重複するため再着手せず。上位3件を除き未着手が2件（O15系ブロック中1件除く）で補充基準に該当するため、Exploreエージェントで自領域(site-records配下の未個別監査サブルート＝induction/procedure/incident-report/qualifications/calendar中心)を巡回監査。結果、action配線の規約違反は0件（`qual-lookup`・`this-month`アンカーとも正しく配線済み）だったが、`committee`/`incident-report`/`induction`/`inspection`/`near-miss`/`patrol`/`procedure`/`qualifications`各client.tsx＋トップ埋込`records-backup.tsx`の下部操作バー主要CTA（保存/印刷/CSV出力/新規等）が軒並み`px-3 py-2 text-xs`のみで44px未満（実測相当32〜36px）という「触感の悪さ」を新規発見。grep実測で9ファイル27ボタンの完全なスコープを確定（`px-3 py-2 text-xs font-bold`/`font-semibold`の出現数を事前カウントし置換後の一致数で機械確認）。

実装: 9ファイル全27ボタンの`className`に`min-h-[44px]`を追加（ConclusionCard action・CheckRowで既に確立済みの型をそのまま横展開・ロジック無変更）。他のCSS（色・padding・アイコン等）は不変。

ゲート: tsc=0 / lint errors=0（既存warn23件のみ）/ vitest 2439 pass / build成功（対象9 route全て`○`静的生成を維持）。
無読Playwright: 新規`docs/third-party-reviews/scripts/site-records-action-bar-44px-2026-07-03.mjs`をprod start(3100)で実行し32/32 PASS（9画面の主要ボタン全数≧44px。スクリプトのpackage解決がリポジトリ直下からのESM実行では`web/node_modules`を辿れず失敗したため、実行時のみ`web/`直下へ一時コピーして走らせ直後に削除＝スクリプト本体は指示どおり`docs/third-party-reviews/scripts/`に保存のまま）。
テスト実行の副生成物（`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`・KYスナップショット1件の見かけ上の変更）は変更前にrevertしコミットから除外。

残: O15/S2/S3は引き続きdataレーンO14依存でブロック。`/site-records/committee`のaction未指定はPR #718（CI待ち）で対応済みのため次回収でマージ回収。

## 2026-07-03 回収専念: PR #718・#725（committee/monthly action配線・site-records 44px化）を回収しmain同期

着手: BACKLOG最上位の未着手[ ]（O15/S2/S3、dataレーンO14依存で継続ブロック）に先立ち、直前回収で明記済みの`/site-records/committee`action未指定タスクに着手 → 実装・全ゲート緑・無読Playwright7/7まで完了させた直後、契約ステップ1「自分のCI緑未マージPRを先にマージ」を後追いで確認したところ、**同一内容を実装した自分のPR #718（`ux-rec/committee-conclusion-action`、CI e2e/smoke/Vercelとも既に全緑）が既に存在**していたと判明＝着手前の未マージPR確認を怠り重複実装した。捏造ではなく単純な確認漏れ（BACKLOG-ux-records.mdの当該行が`[ ]`のままだったのは、契約上[x]化がPRのコミット内で行われ、そのPRがマージ未了だったため=正常な状態だった）。

是正: 重複実装分（record-conclusions.ts/committee-client.tsx/テスト/新規Playwrightスクリプト）は`git checkout`で破棄しPR化せず。PR #718を回収対象として`gh pr checks`で全緑を確認しマージを試行 → マージ他コンフリクト（main側で数十件の他レーンPRが先行マージ済みでBACKLOG-ux-records.mdが乖離）→ `origin/main`をブランチへマージしBACKLOG-ux-records.mdの重複エントリ（contribute/committeeタスクの新旧記述）を人手で解消→全ゲート再確認（tsc=0/lint errors=0/vitest 2446 pass/build成功）→ push→CI再グリーン確認→マージ・ブランチ削除。同様に、前回収の未マージPR #725（site-records 44px化、branch=`ux-rec/site-records-action-bar-44px`）も回収対象と気づき同じ手順（main同期→committee-client.tsxの`id="committee-actions"`と`min-h-[44px]`が競合しないよう統合→全ゲート再確認: tsc=0/lint errors=0/vitest 2461 pass/build成功→push→CI緑確認）でマージ・ブランチ削除。

結果: `git checkout main && git pull --ff-only`でmain=`872baf14`まで同期・working tree clean・ローカルブランチはmainのみに整理。テスト実行の副生成物（`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`・KYスナップショット）は毎回revertしコミットから除外。

教訓（次回収への申し送り）: BACKLOG最上位1件に着手する前に、必ず`gh pr list --state open`で自分のレーン(`ux-rec/`)の未マージPRを確認し、対象タスクと重複しないこと（本来は契約ステップ1で完了しているはずの操作だが、今回は前々回収からの継続セッションで省略してしまった）。

残: O15/S2/S3は引き続きdataレーンO14依存でブロック（`BACKLOG-data.md`のO14は本回収時点でも`[ ]`未着手）。補充対象の柱0/柱3巡回は次回収へ持ち越し。

残: 柱0巡回発見のもう1件`/site-records/committee`（ConclusionCard自身のaction未指定）は次回収へ。O15/S2/S3は引き続きdataレーンO14依存でブロック。PR #702（前々回収・ky-examples）はCI待ちで次回収。

## 2026-07-03 site-records 保存済み一覧の行内ボタン44px是正（柱0磨き・続き③）

回収: 前回収の教訓（未マージPR確認の徹底）どおり着手前に`gh pr list --state open`を確認したところ、自レーンの未マージPR #759（教育コース詳細12ページCTA44px化、CI全緑=e2e/smoke/Vercelとも SUCCESS）を発見＝`gh pr merge 759 --squash --delete-branch`で先に回収。`git checkout main && git pull --ff-only`でmainを`269927cc`まで同期・他班マージ分も含め取り込み・clean確認。

発見: 作業ディレクトリに committee/incident-report/induction/inspection/near-miss/patrol/procedure/qualifications の8ファイルにわたる未commitの差分（保存済み一覧の「開く」「削除」等へ`min-h-[44px]`を追加）が残存しているのを発見＝前セッションで着手済みだったがゲート未確認・未commitのまま中断していたWIP。捏造ではなく作業継続として扱い、diffの内容を精査（PR #725の下部操作バー・続き②の承認バー等とは非重複＝動的リストの「行内ボタン」という第三のレイヤーの欠落）した上で完成させる方針とした。

実装: 上記8ファイルの是正に加え、Explore巡回で同型の追加発見2箇所（`qualification-client.tsx`逆引き名簿の作業者チップ・`daily-actions-panel.tsx`＝トップ埋込の記録系横断「今日やること」パネルの「残りN件をすべて表示」）にも`min-h-[44px]`を追加（足すだけ・ロジック無変更）。テスト実行の副生成物（`docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`・KYスナップショット）は毎回revertしコミットから除外。

ゲート: tsc=0 / lint errors=0（既存warn23件のみ）/ vitest 2519 pass / build成功（対象route全て`○`静的生成を維持）。

無読Playwright: 新規`docs/third-party-reviews/scripts/site-records-list-row-buttons-44px-2026-07-03.mjs`をprod build+start(3100)で実行し22/22 PASS。各ツールにlocalStorageで保存済み1件を注入（committee/incident-report/induction/inspection/patrol/procedure/qualifications）、near-missはヒヤリハット1件、patrolは追加でBYID_KEYに未是正指摘1件を注入して「記録を開く」を検証、qualificationsはBYID_KEYに資格保有データを注入して逆引き名簿の作業者チップを検証、inspectionは使用不可7件を注入して`daily-actions-panel`の「残りを表示」（VISIBLE_LIMIT=6超過）を検証。

残: O15/S2/S3は引き続きdataレーンO14依存でブロック。補充対象の柱0/柱3巡回は次回収へ持ち越し。

## 2026-07-03 対になる/ky/listと非対称だった/safety-diary/list等の44px是正（柱0磨き・続き④）

契約ステップ1: PR #773（前回収・checkup-finder-44px）のCIが緑（e2e/smoke/Vercelとも SUCCESS）を確認しマージしようとしたところ`main`側の進行でmerge conflict発生（`cycle-log-ux-records.md`同士の追記競合）。origin/mainを当該ブランチへ通常マージし、両者の追記内容を時系列順に温存して解消・push・マージ済み。`git checkout main && git pull --ff-only`で同期・clean確認。

回収: BACKLOG-ux-records.md最上位の未着手3件(O15/S2/S3)はいずれもdataレーンO14（本回収時点でも`BACKLOG-data.md`で`[ ]`未着手）依存で全ブロック中と確認したため、補充指針どおりExploreエージェントで自領域の柱0巡回を実施。

発見: 対になる`/ky/list`（既にPR #558等で44px済み）と非対称に、`/safety-diary/list`（`meeting-list-client.tsx`）の行内ボタン「開く（再編集）」「翌日用に複製」「削除」だけが44px未満のまま取り残されていたのを筆頭に9ファイルの欠落を発見: `meeting-paper-view.tsx`（/safety-diaryクラシックUI）のズーム3ボタン・印刷プレビュー/印刷 PDF/保存・プレビューモーダル内印刷/閉じる、`ky-paper-view.tsx`（/ky/paper?canvas=0クラシックUI）のズーム3ボタン（`PaperStage`側のズームは既にO10第四弾で44px済みだったのにクラシックUI側だけ対称化漏れ）、`distributed-input-bar.tsx`の分散入力2ボタン+コピーボタン、site-records `qualifications`/`patrol`/`procedure`/`committee`/`induction`の「行を追加」系ボタン計7箇所。

実装: 9ファイルへ`min-h-[44px]`を追加（足すだけ・ロジック無変更）。分散入力バーの2ボタンはこのdev環境がSupabase未設定で`isMeetingCloudEnabled()===false`のため実機描画不可（捏造回避のためPlaywright検証対象外・コードレビューで44pxクラス付与のみ確認）。

ゲート: tsc=0 / lint errors=0（既存warn23件のみ）/ vitest 2542 pass / build成功（対象route全て`○`静的生成を維持）。

無読Playwright: 新規`docs/third-party-reviews/scripts/meeting-site-records-add-buttons-44px-2026-07-03.mjs`をprod build+start(3100)で実行し20/20 PASS（/safety-diary/list行内3ボタン、/safety-diaryクラシックUIのズーム+印刷+保存+プレビューモーダル、/ky/paper?canvas=0のズーム、site-records5画面の追加ボタン7箇所）。

残: O15/S2/S3は引き続きdataレーンO14依存でブロック。補充対象の柱0/柱3巡回は次回収へ持ち越し。
