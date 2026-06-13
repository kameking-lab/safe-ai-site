# 機能UX班-A（記録・帳票・教育系） サイクルログ（並列マルチループ）

担当領域・契約は `loop-prompt-ux-records.txt` 参照。1イテレーション=1タスク、ゲート全緑(tsc/lint/vitest/build)後にPR。無読テストのスクリプトは `docs/third-party-reviews/scripts/` に保存。担当route=safety-diary/site-records/ky/ky-examples/education-certification/education/foreign-workers/health-checkup-scheduler/account。共有ビジュアル基盤(safety-tone/ConclusionCard/StatusBadge/CollapsibleDetail)の custodian。

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
