# 機能UX班-A（記録・帳票・教育系） サイクルログ（並列マルチループ）

担当領域・契約は `loop-prompt-ux-records.txt` 参照。1イテレーション=1タスク、ゲート全緑(tsc/lint/vitest/build)後にPR。無読テストのスクリプトは `docs/third-party-reviews/scripts/` に保存。担当route=safety-diary/site-records/ky/ky-examples/education-certification/education/foreign-workers/health-checkup-scheduler/account。共有ビジュアル基盤(safety-tone/ConclusionCard/StatusBadge/CollapsibleDetail)の custodian。

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
