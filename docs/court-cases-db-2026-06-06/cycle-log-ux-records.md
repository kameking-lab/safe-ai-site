# 機能UX班-A（記録・帳票・教育系） サイクルログ（並列マルチループ）

担当領域・契約は `loop-prompt-ux-records.txt` 参照。1イテレーション=1タスク、ゲート全緑(tsc/lint/vitest/build)後にPR。無読テストのスクリプトは `docs/third-party-reviews/scripts/` に保存。担当route=safety-diary/site-records/ky/ky-examples/education-certification/education/foreign-workers/health-checkup-scheduler/account。共有ビジュアル基盤(safety-tone/ConclusionCard/StatusBadge/CollapsibleDetail)の custodian。

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

## 2026-06-13 柱C-9・A1 KY用紙 下部アクションバーの操作集中

`/ky/paper` の下部固定バーは可視ボタン13・うち8個が同格で並び、最重要の「保存」が埋没していた（柱0=3秒で次の操作が分からない）。バーを「保存（emerald solid・主ボタン・常設）」＋「…（その他の操作）」の2つに集約し、複製/共有/転記/印刷/連携・関連リンクを「…」ボトムシート（記録／共有・連携／印刷・PDF／この作業の関連情報でグループ化、各48pxタップ・ラベル+補足の2段）へ退避。Escape・オーバーレイで閉じる（user-menu の作法に合わせた）。A4印刷シート(`KyPrintSheet`)は一切不変。
実機(prod start 3100・iPhone12相当390px)で発見した重畳を2件是正: (1)全画面共通の `MobileBottomNav`(z-40・≤480px) の上にバーを載せるため `--mobile-bottom-nav-h`+safe-area分を `bottom` に加算（PCは 0px で従来どおり最下部固定）。(2)全画面共通の共有FAB `ShareButtons fixed`(右下 bottom-20 right-4 z-30) と「…」が重なるため、モバイルのみバー右側に `pr-16` を確保しFABの帯を空けた（PCは中央寄せで非重畳のため `sm:pr-0`）。app-shell等の他班所有・凍結ファイルは未変更（importのみ）。
ゲート: tsc=0 / lint errors=0(既存warn2のみ) / vitest 1643 pass / build 成功。無読テスト `docs/third-party-reviews/scripts/ky-paper-action-focus-noread-2026-06-13.mjs` 11/11 PASS。
残: 柱C-9・A2（入力のステップ/アコーディオン化＝用紙ファースト設計との両立方針を要検討）として BACKLOG に分割・継続。
