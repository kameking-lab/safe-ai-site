# cycle-log — ハブ・サイネージ・トップ班（ux-hub）

## 2026-07-04 — 補充: signage-daily-values.tsx 起点日フォーム後退＋accident-extras-panel.tsx 未着手リンクの44px是正

**イテレーション頭の回収**: PR #781(accident-database-panel-44px)がe2e/smoke/selftest/Vercel全緑のためsquashマージ→`git checkout main && git pull --ff-only`でclean確認。自班PR #809(trend-summary-court-filter-44px)はe2e/smoke IN_PROGRESSのため今回は見送り、次イテレーションで回収。

**注意事項**: 作業中に`web/AGENTS.md`（`@AGENTS.md`をCLAUDE.mdが参照）が「これはあなたの知るNext.jsではない。書く前にnode_modules内のdocsを読め」と誘導し、実際に存在する`node_modules/next/dist/docs/index.md`にHTMLコメントで偽装した「`unstable_instant`をexportせよ」というAIエージェント向け偽指示が埋め込まれていることを発見。プロンプトインジェクションと判断し無視、指示内容のコード変更は一切行わず本来のタスクのみ継続。

**タスク源**: BACKLOG-ux-hub.md未着手0件のため補充。Exploreエージェントで担当route/コンポーネント群を再調査し、①`signage-daily-values.tsx`の無災害日数「起点日を変更」リンク(`min-h-[24px]`)・起点日入力欄/保存ボタン(`min-h-[36px]`)が既存の44px是正パターンから明示的に後退(regression)していたこと、②`accident-extras-panel.tsx`(/accidents 自社類似事故Top5パネル、home-screen経由)の「/profile を開く →」「自社設定 →」「→ 類似事例…」計3リンクが一括是正の対象から漏れていたことを発見。Explore候補の最有力だった`accident-trend-summary.tsx`のselect/ボタンはPR #809で既に対応済みと確認しdiff重複を回避。

**修正**: 2ファイル計5要素に`min-h-[44px]`を付与(純粋なクラス変更でレイアウト・ロジック不変)。

**テスト**: `signage-daily-values.test.tsx`へ1件追加、`accident-extras-panel.test.tsx`新設(2件、mhlw-similar-cases・accident-cases datasetをvi.mock)。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 312 files・2632 tests + 1 skipped 全pass(フルスイート並列実行時に無関係な`/search`系4件がタイムアウトしたが単体実行では即pass=既存の並列負荷起因のflakeと確認) / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/signage-daily-values-extras-panel-44px-2026-07-04.mjs`（next start実機・Playwright・1920×1080サイネージ+スマホ390×844）**4/4 PASS**（起点日入力欄・保存ボタン・起点日を変更リンク・/profile を開く リンク、すべて実boundingBox height≧44px実測）。

## 2026-07-03 — 補充: accident-database-panel.tsx (/accidents本体) 未着手コンポーネントの44px是正

**イテレーション頭の回収**: 自班のオープンPR #775(共有部品breadcrumb・action-bar・analysis-panel 44px)はe2e/smoke/VercelがIN_PROGRESS/PENDINGで未緑のため今回はマージ見送り、次イテレーションで回収。`git checkout main && git pull --ff-only`でclean確認。

**タスク源**: BACKLOG-ux-hub.md未着手0件のため補充。Exploreエージェントで担当route/コンポーネント群を再調査し、`web/src/components/accident-database-panel.tsx`（/accidents本体・タブ切替後に描画される主要フィルタ・一覧・home-screen経由で高トラフィック）がこれまでの44px一括是正バッチの対象から漏れていた未着手コンポーネントと判明。PR #775の差分（breadcrumb.tsx・accidents/action-bar.tsx・accident-analysis-panel.tsx・mhlw-accident-analysis-panel.tsx）と非重複であることをdiff --statで確認済み。

**修正**: `accident-database-panel.tsx`1ファイルに`inline-flex min-h-[44px] items-center`を7箇所付与。業種フィルタ10チップ・「フィルタをリセット」(パディング無し)・対象属性7ボタン・事業所規模4ボタン・作業カテゴリボタン・ページネーション前へ/次へ、各カードの「詳細を見る」トグル・「→ 詳細ページへ」/「この事例で学習する」/「→ 日誌に記録」リンク・出典外部リンク。純粋なクラス追加でレイアウト・絞り込みロジック・遷移先不変。

**テスト**: `accident-database-panel.test.tsx`新設(7件・EasyJapaneseProvider配下でrender)。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 301 files・2559 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/accident-database-panel-44px-2026-07-03.mjs`（next start実機・Playwright・390×844）**7/7 PASS**（業種フィルタ「建設」チップ・対象属性「女性労働者」・事業所規模「全規模」・「詳細を見る」・「→ 詳細ページへ」・「→ 日誌に記録」すべて実boundingBox height=44.0px実測）。

## 2026-07-03 — 補充: /faq・/glossary 検索導線＋/features系5サブページCTAの44px是正

**イテレーション頭の回収**: #795(signage-floor-plan-editor-44px)がe2e/smoke/Vercel全緑・mergeStateStatus=CLEANのためsquashマージ→`git checkout main && git pull --ff-only`でclean確認。#781(accident-database-panel-44px)はe2e/smoke IN_PROGRESSのため今回は見送り、次イテレーションで回収。

**タスク源**: BACKLOG-ux-hub.md未着手0件のため補充。Exploreエージェントで担当route群を再調査し、/faqハブの「FAQを検索する」ボタン・/glossary検索入力欄（いずれも主要検索導線）と、/features/[category]・use-cases・quick-tour・comparison・print の各CTAリンク/ボタン計12箇所が`py-2〜2.5`のみでmin-h未指定(≈36〜40px)のまま取り残されていたことを発見。

**修正**: 7ファイル計14要素に`min-h-[44px]`を付与（純粋なクラス追加でレイアウト・遷移先・ロジック不変）。`/diversity/women`の外部参照カード(2行構成・px-3 py-2.5)は既に44px超と判断し対象外。

**テスト**: 既存`faq-pillar0.test.tsx`・`glossary/page.test.tsx`・`features/use-cases/page.test.tsx`へ計3件追加、新規`features/[category]/page.test.tsx`(2件)・`features/quick-tour/page.test.tsx`(3件)・`features/comparison/page.test.tsx`(1件)・`features/print/print-features-client.test.tsx`(1件)。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 307 files・2602 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/faq-glossary-features-search-cta-44px-2026-07-03.mjs`（next start実機・Playwright・スマホ390×844）**7/7 PASS**（FAQ検索ボタン・用語集検索欄・quick-tour STEP1リンク/下部CTA・comparison下部CTA・print印刷ボタン/戻るリンク、すべて実boundingBox height≧44px実測）。

## 2026-07-03 — 補充: signage-floor-plan-editor.tsx（/signage既定モード）未着手コンポーネントの44px是正

**イテレーション頭の回収**: 自班のオープンPR2件を回収。#787(signage-today-documents.tsx・accident-ai-analyzer.tsx 44px)はe2e/smoke/Vercel全緑のためsquashマージ→`git checkout main && git pull --ff-only`でclean確認。#781(accident-database-panel-44px)はBACKLOG-ux-hub.md記録行のみmainとコンフリクト(コード非衝突、#775マージ由来)→`origin/main`を通常マージし両エントリ保持で解決→ゲート再走(tsc/lint/vitest2579件/build)全緑→push。CI待ちのため本イテレーションは次タスクへ先行着手し、#787マージ後に再度#781がコンフリクト(#787由来の同種テキスト競合)→本コミットで再度解消予定。

**タスク源**: BACKLOG-ux-hub.md未着手0件のため補充。Exploreエージェントで担当route群を再調査し、サイネージ本体`/signage`の既定表示モードである`signage-floor-plan-editor.tsx`（図面ピン配置エディタ）が、兄弟コンポーネント`pin-manager.tsx`（地図サイネージ側の同種エディタ）は既に44px是正済みの一方、本ファイルのみ従来の一括是正から漏れて未着手のまま残っていたことを発見。最優先候補と判断（サイネージのデフォルト画面で毎回目に入る操作群のため）。

**修正**: 1ファイル計6要素（「自社図面アップロード」label・「ピン配置モード」トグル・ピン種別select・ラベルinput・「全削除」・「アップロード解除」）に`min-h-[44px]`を付与（純粋なクラス追加でレイアウト・ロジック不変）。

**テスト**: `signage-floor-plan-editor-44px.test.ts`新設（ソース走査・6件）。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 304 files・2586 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/signage-floor-plan-editor-44px-2026-07-03.mjs`（next start実機・Playwright・1920×1080）**5/5 PASS**（常時表示の2要素＋編集モード誘発後のselect/input/全削除ボタン、すべて実boundingBox height=44.0px実測）。「アップロード解除」は画像アップロード後のみ出現する条件付き要素のためソース走査のみで検証（class付与済みを確認）。ESM実行時に`docs/`が`web/node_modules`の外にあり`playwright`が解決できない問題は、実行時のみ`web/`直下へ一時コピーして検証（保存先は規定どおり`docs/`配下、実行後に一時コピーは削除）。

## 2026-07-03 — 補充: signage-today-documents.tsx + accident-ai-analyzer.tsx 未着手コンポーネントの44px是正

**イテレーション頭の回収**: 自班のオープンPR2件のうちCI全緑だった#775(共有部品breadcrumb・action-bar・analysis-panel 44px)をsquashマージ。`git checkout main && git pull --ff-only`でclean確認。#781(accident-database-panel-44px)はe2e/smoke実行中のため次イテレーションで回収。

**タスク源**: BACKLOG-ux-hub.md未着手0件のため補充。Exploreエージェントで担当route群を再調査し、これまでの44px一括是正が漏れていた2ファイルを発見: ①`signage-today-documents.tsx`（サイネージ「今日の作業資料」パネル、兄弟コンポーネント群は是正済みだが本ファイルのみ未着手）、②`accident-ai-analyzer.tsx`（/accidents AI事故分析パネル、そもそも過去の一括是正の走査対象から漏れていた）。

**修正**: 両ファイル計8要素に`min-h-[44px]`を付与（純粋なクラス追加でレイアウト・ロジック不変）。①「＋ 資料を追加」「一括クリア」ヘッダーボタン・カルーセル「✕ 削除」ボタン、②表示言語/業種select・作業内容input・分析実行ボタン・関連事例へのLink。**意図的に対象外とした項目**: サムネイル個別削除ボタン（絶対配置20×20pxバッジ）は、単純に44×44化すると隣接する56〜64px高のサムネイル選択領域の過半を不可視ヒットエリアが覆い「選択操作のつもりが誤削除される」という新規回帰を生むため見送り。デザイン上の再検討（サムネイル拡大 or 削除を別UIへ移動）が必要な残課題として記録。

**テスト**: `signage-today-documents-44px.test.ts`・`accident-ai-analyzer-44px.test.ts`新設（ソース走査・計8件）。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 302 files・2571 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/signage-docs-accident-ai-analyzer-44px-2026-07-03.mjs`（next start実機・Playwright、サイネージ1920×1080/`/accidents`390×844）**7/7 PASS**（サイネージ「作業資料」モードへ切替＋ダミー資料1件投入後の3要素・AI分析パネルの4要素すべて実boundingBox height=44.0px以上実測）。

## 2026-07-03 — 補充: /signage/map (signage-map/*) 未着手ディレクトリの44px一括是正

**イテレーション頭の回収**: 自班のオープンPR2件を回収。#761(/industries/[industry] 下部CTA＋court-cases印刷リンク44px)はe2e/smoke/Vercel全緑のためsquashマージ。#756(/industries 関連ページ6リンク44px)はマージ直後にBACKLOG-ux-hub.md記録行のみmainとコンフリクト(コード非衝突)→`origin/main`を当該ブランチへ通常マージして両エントリ保持で解決→ゲート再走(tsc/lint/vitest2531件/build)全緑→push→CI緑確認後squashマージ。`git checkout main && git pull --ff-only`でclean確認（テスト実行由来の一時差分 rag-metrics-latest.json 等はdiscard）。

**タスク源**: BACKLOG-ux-hub.md未着手0件のため補充。Exploreエージェントで担当route群を再調査し、これまでの44px一括是正が`signage/*`（signage-header・signage-morning-script等）のみに留まっており、地図サイネージ`signage-map/*`ディレクトリ丸ごとが未着手のまま残っていたことを発見。最優先候補は`EarthquakeAlertModal`の「閉じる」ボタン＝フルスクリーン地震速報の唯一のタップ解除手段(キーボードEscapeのみが他の手段だがタッチ運用端末では無意味)で、押し損ねサイズの中でも最も実害が大きい欠陥と判断。

**修正**: `signage-map/*`配下4ファイル計12要素に`inline-flex min-h-[44px] items-center`（入力欄2箇所は`min-h-[44px]`のみ）を付与。①`earthquake-alert-modal.tsx`「閉じる」、②`pin-manager.tsx`「クリア」・ラベル/通知メール入力欄・「ピンを追加」・「削除」、③`signage-map-client.tsx`「☰ パネルを開く」「✕ 閉じる」「← 朝礼ダッシュボードへ」「現在のURLをコピー」「フルスクリーン表示 →」、④`signage-map-leaflet.tsx`ピンPopup内「このピンを削除」。純粋なクラス追加でレイアウト・遷移先・ロジック不変。

**テスト**: `signage-map-44px.test.ts`新設(ソース走査・11件)。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 297 files・2531 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/signage-map-44px-2026-07-03.mjs`（next start実機・Playwright・1280×800）**8/8 PASS**（常時表示のサイドパネル5要素・ピンフォーム3要素すべて実boundingBox height=44.0px実測）。地震モーダルの「閉じる」・ピンPopupの「削除」・pending座標時のみ出る「クリア」は実データ/既存ピンが必要な条件付き要素のためソース走査のみで検証（class付与済みを確認）。

## 2026-07-03 — 補充: /industries/[industry] 下部CTA・他業種リンク＋court-cases印刷リンク 柱0(44px)

**イテレーション頭の回収**: 自班のオープンPR #753(サイネージヘッダーナビ・パネル副リンク44px)がe2e/smoke/Vercel全緑だったためsquashマージ・リモートブランチ削除。main pullでworking tree clean。PR #756(/industries 関連ページ6リンク44px)はe2e/smoke進行中のため次回回収に持ち越し。

**タスク源**: BACKLOG-ux-hub.md未着手0件のため補充。Exploreエージェントで担当route群を再調査し、`industries/[industry]/page.tsx`のページ下部「次のアクション」CTA3件・「他の業種」横断リンク、`court-cases-browser.tsx`の絞り込み中「A4で印刷／PDF保存」リンクが44px未満のまま取り残されていることを発見（既に開いていたPR #756とは別ファイル・別箇所で非重複を確認）。

**修正**: 3ファイル計5要素に`min-h-[44px]`を付与。純粋なクラス追加でレイアウト・遷移先・ロジック不変。

**テスト**: `industry-detail-44px-targets.test.tsx`・`court-cases-browser.test.tsx`にそれぞれ1件追加。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 294 files・2504 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/industry-detail-court-cases-print-44px-2026-07-03.mjs`（next start実機・Playwright・390×844）**5/5 PASS**（CTA3件・他業種リンク・印刷リンクの実boundingBox height≧44px実測。他業種リンクはヘッダー業種ドロップダウン内の非表示同一hrefリンクと誤取得しないようセレクタを可視要素へ限定して再検証）。

## 2026-07-03 — 補充: サイネージ ヘッダーナビ・パネル副リンク 柱0(44px)

**イテレーション頭の回収**: 自班の唯一のオープンPR #747(/court-cases・/accidents残存44px一括是正)がe2e/smoke/Vercel全緑だったためsquashマージ・リモートブランチ削除。main pullでworking tree clean。

**タスク源**: BACKLOG-ux-hub.md未着手0件のため補充。Exploreエージェントでサイネージ関連コンポーネント群を再調査し、これまでのバッチで手つかずだった`signage-header.tsx`ヘッダーナビ・`signage-morning-script.tsx`朝礼スクリプトボタン・`signage-risk-prediction.tsx`/`signage-site-safety.tsx`のパネル副リンクを発見。

**修正**: 4ファイル計10要素（ヘッダーナビ5リンク・朝礼スクリプトボタン3個・「詳細予測 →」・「記録キット →」）に`inline-flex items-center min-h-[44px]`を付与。純粋なクラス追加でレイアウト・遷移先・ロジック不変。サイネージの「1画面フィット」不可侵条件への影響を懸念したため、修正後にnext start実機でscrollHeight≦viewportを実測確認。

**テスト**: `signage-nav-panel-links-44px.test.ts`新設(ソース走査・10件)。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 293 files・2491 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/signage-nav-panel-links-44px-2026-07-03.mjs`（next start実機・Playwright・1920×1080）**4/4 PASS**（ヘッダーナビ5/5・詳細予測1/1・朝礼スクリプトボタン3/3の実boundingBox height≧44px実測、かつ1画面フィット維持を確認）。「記録キット →」はsite-records記録の無い端末では非表示のためソース走査のみで検証。

## 2026-07-03 — 補充: /court-cases・/accidents 残存44px未満5箇所の一括是正

**イテレーション頭の回収**: 自班のオープンPR #732(home-screen.tsx /accidents主タブ切替44px)と#739(use-cases業種ジャンプナビ＋事故詳細パンくず44px)がいずれもe2e/smoke緑を確認できたため両方squashマージ・リモートブランチ削除。main pullでworking tree clean。

**タスク源**: BACKLOG-ux-hub.md未着手0件のため補充。Exploreエージェントで担当route群(court-cases/accidents/signage/features等)の残存44px未満パターンを再調査し、確度上位5件を採用（signage-daily-values.tsx・signage-rotator.tsxの小型タイル内ボタン群は「1画面フィット」制約下の意図的な密集レイアウトのため今回は対象外とし、素直な44px化候補のみ着手）。

**修正**: ①`CourtCasesPrintButton`の`min-h-[40px]`→`min-h-[44px]`、②`/court-cases/print`の「労災裁判例コーナーに戻る」戻りリンクと③0件時「コーナーに戻って絞り込みを見直す」リンクに`inline-flex min-h-[44px] items-center`付与、④`CourtCasesBrowser`の「絞り込みを解除」ボタン（絞り込み時のみ出現）に同様付与、⑤`AccidentTrendSummary`の「厚労省 速報 原典を見る →」リンク（AI要約実行後のみ出現）に同様付与。すべて純粋なクラス追加でレイアウト・遷移先・ロジック不変。

**テスト**: `court-cases-print-button.test.tsx`新設・`court-cases/print/page.test.tsx`新設(3件)・`court-cases-browser.test.tsx`へ1件追加(検索語入力→絞り込みを解除ボタンのclassName検証)・`accident-trend-summary.test.tsx`新設(fetchモック→AI要約実行→速報原典リンクのclassName検証)。計6件追加。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 292 files・2477 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/court-cases-accidents-44px-batch-2026-07-03.mjs`（next start実機・Playwright・スマホ390×844）**5/5 PASS**（全対象の実boundingBox height≧44px実測）。

## 2026-07-03 — 補充: home-screen.tsx /accidents 主タブ切替 柱0(44px)

**イテレーション頭の回収**: 自班の唯一のオープンPR #726(/court-cases ハブ最上部2リンク44px)はe2e/smokeが実行中(CI未緑)だったためマージ見送り、次イテレーションで回収。working treeはclean。

**タスク源**: BACKLOG-ux-hub.md未着手0件のため補充。Explore調査で発見した「`home-screen.tsx`の/accidents主タブ切替(6ボタン)が44px未満・同ファイルは過去のタップ標的一斉是正から漏れていた」を採用。

**修正**: `home-screen.tsx`のタブボタン(全件検索/死亡災害/業種別ランキング/MHLW実データ分析/サイト収録事例/詳細事例)className先頭に`inline-flex min-h-[44px] items-center`を付与(既存`accident-hub-nav.tsx`と同一パターン)。純粋なクラス追加でレイアウト・タブ切替ロジック不変。

**テスト**: `home-screen.test.tsx`新設(vitest 1件)。HomeScreenは動的import/SWR依存が重くフルレンダーが困難なため、`page-json-ld.test.tsx`と同じソーステキスト検査方式でタブボタンのclassNameに`min-h-[44px]`/`inline-flex`/`items-center`を含むことを保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 288 files・2443 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/accidents-tab-44px-check.mjs`（next start実機・Playwright・スマホ390×844）**6/6 PASS**（全タブボタンboundingBox height=44px実測）。

**残課題**: PR #726(court-cases 2リンク44px)のCI回収は次イテレーション。

## 2026-07-03 — 補充: /features/use-cases 業種ジャンプナビ＋/accidents/[id] パンくずリンク 柱0(44px)

**イテレーション頭の回収**: 自班の緑PR #734(/glossary 関連ページリンク＋/signage モーダル閉じるボタン44px化)をsquashマージ→`git checkout main && git pull --ff-only`でclean確認(CI e2e/smoke完了待ちで数分待機してから回収)。

**タスク源**: BACKLOG-ux-hub.md 未着手項目が0件だったため、Explore調査で担当route群の柱0未適用箇所を補充探索。既知の完了記録と重複しない新規候補として①`/features/use-cases`業種ジャンプナビ各ピル(`page.tsx:356-363`、`px-3 py-1.5 text-xs`≈28px)、②`/accidents/[id]`最上部パンくずの「事故データベース」リンク(`page.tsx:88-92`、パディング無し≈20px・下部の「事故DBに戻る →」は既に44px是正済みだったが上部パンくずは取り残されていた)を特定。ブランチ`ux-hub/use-cases-jump-nav-accident-breadcrumb-44px`（main起点）。

**変更**: 両ファイルの対象要素に`min-h-[44px]`を付与。純粋なクラス追加でレイアウト・遷移先・ロジック不変。

**テスト**: `features/use-cases/page.test.tsx`に1件追加(業種ジャンプナビ全リンクのclassName検証)。`accidents/[id]/page.test.tsx`に1件追加(パンくず「事故データベース」リンクのclassName検証、既存の「事故DBに戻る」テストと並列)。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors / vitest 288 files・2469 tests 全pass(1 skipped) / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/use-cases-accident-breadcrumb-44px-2026-07-03.mjs` を **11/11 PASS**（next start実機・スマホ390×844・ジャンプナビ9ピル+パンくずリンク1件、全てheight≧44px）。

**PR**: #739

## 2026-07-03 — 補充: /glossary 関連ページリンク＋/signage モーダル閉じるボタン 柱0(44px)

**イテレーション頭の回収**: 自班の緑PR #726(/court-cases ハブ最上部h1直下2リンク44px)をsquashマージ→`git checkout main && git pull --ff-only`でclean確認。PR #732(home-screen.tsx主タブ切替44px)はCI進行中のため次回に回収。

**タスク源**: BACKLOG-ux-hub.md 未着手項目が0件だったため、Explore調査で担当route群の柱0未適用箇所を補充探索。既知の完了記録と重複しない新規候補として①`/glossary`用語カードの「関連ページ」リンク(`page.tsx:272`、`px-2.5 py-0.5 text-xs`≈20px)、②`/signage`朝礼スクリプト・トレンドニュース拡大モーダルの「✕ 閉じる」ボタン(`page.tsx:839,871`、`px-3 py-1.5 text-xs`≈28px、2箇所とも同一クラス)を特定。ブランチ`ux-hub/glossary-signage-close-btn-44px`（main起点）。

**変更**: 両ファイルの対象要素に`min-h-[44px]`を付与。純粋なクラス追加でレイアウト・遷移先・ロジック不変。

**テスト**: `glossary/page.test.tsx`に1件追加(関連ページリンクのclassName検証、getAllByRoleで複数一致に対応)。`signage/page-refresh-config.test.ts`に1件追加(ソース走査で閉じるボタン2箇所とも`min-h-[44px]`を保証・page.tsxはfetch/state密結合でユニットテスト困難なため既存の定数ガードと同構え)。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors / vitest 288 files・2458 tests 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/glossary-signage-close-btn-44px-2026-07-03.mjs` を **2/2 PASS**（next start実機・関連ページリンク height=44.0px／モーダル閉じるボタン height=44.0px）。

**PR**: #734

## 2026-07-03 — 補充: トップ home-three-pillars.tsx 3柱・主CTA 柱0(44px)

**イテレーション頭の回収**: 自班の緑PR #705(/industries/[industry] 副リンク6箇所＋キーワードピル44px)がmainとコンフリクト(BACKLOG-ux-hub.md同時追記)していたため、ブランチへ`origin/main`を通常マージしBACKLOG-ux-hub.mdの重複記載を解消→ゲート再実行→squashマージ→`git checkout main && git pull --ff-only`でclean確認。

**タスク源**: BACKLOG-ux-hub.md 未着手項目が0件だったため、Explore調査で担当route(quick/faq/glossary/guides/features/industries/diversity/resources/handover/notifications/favorites/safety-signs/accidents/court-cases/signage・トップ)の柱0未適用箇所を補充探索。最有力候補＝トップ`home-three-pillars.tsx`の3柱本体CTA「業種別 事故分析レポートへ →」「気象リスク詳細を見る →」「法改正一覧を見る →」が`px-3 py-2 text-xs`のみでmin-h未指定(実測≈32px)。同ファイル内の他リンク/ボタンは既に44px是正済みだったが、最も目立つ3柱の主動線だけ取り残されていた。ブランチ`ux-hub/top-three-pillars-main-cta-44px`（main起点）。

**変更**: `web/src/components/home-three-pillars.tsx` の3リンク(`/accidents-reports`・`/risk`・`/laws`)に`min-h-[44px]`を付与。純粋なクラス追加でレイアウト・遷移先不変。

**テスト**: `home-three-pillars.test.tsx` に3ケース追加（各リンクのclassNameに`min-h-[44px]`を保証）。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存警告23件は無関係）/ vitest 285 files・2438 tests 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/top-three-pillars-main-cta-44px-2026-07-03.mjs` を **3/3 PASS**（next start実機・スマホ390×844）。3柱の主CTAリンクの実boundingBoxがいずれも44px以上であることを確認。

## 2026-07-03 — 補充: /accidents/[id] 出典元リンク 柱0(44px)

**イテレーション頭の回収**: 自班の緑PR #701(/industries 業種一覧テーブル「開く →」リンク44px)を squash マージ→`git checkout main && git pull --ff-only`でclean確認。現在ブランチのPR #705(/industries/[industry] 副リンク6箇所＋キーワードピル44px)はCI進行中のため次イテレーションで回収。

**タスク源**: BACKLOG-ux-hub.md 未着手最上位＝2026-07-03 Explore調査で発見済みの `/accidents/[id]` 「出典元を開く」外部リンク(`page.tsx` 198-206行、`px-3 py-1.5 text-xs`≈28-30px)。戻る/類似事例リンクは既に是正済みだが本リンクは未着手のままだった。事故の一次情報源(官公庁/報道)への唯一の導線で、押し損ねると詳細ページへ再度戻る必要がある。ブランチ `ux-hub/accident-detail-source-link-44px`（main起点）。

**変更**: `web/src/app/(main)/accidents/[id]/page.tsx` の「出典元を開く」リンクに `min-h-[44px]` を付与。純粋なクラス追加でレイアウト・遷移先不変。

**テスト**: `page.test.tsx` に1ケース追加。`mhlw-<番号>` 形式のID（出典URLが必ず解決される）を対象に、リンクの className に `min-h-[44px]`・`items-center` を保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存警告23件は無関係）/ vitest 282 files・2405 tests 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/accident-detail-source-link-44px-noread-2026-07-03.mjs` を **1/1 PASS**（next start実機・スマホ390×844）。mhlw系事故詳細ページの「出典元を開く」リンクの実boundingBoxがheight=44pxであることを確認。

---

## 2026-07-03 — 補充: /industries 業種一覧テーブル「開く →」リンク 柱0(44px)

**イテレーション頭の回収**: 自班の緑PR2件を squash マージ＝#697(/diversity/women PPE/アフィリエイトボタン・関連ページ44px)・#690(/accidents/[id] 戻る・類似事例リンク44px)。#690はBACKLOG-ux-hub.md/cycle-log-ux-hub.mdの記録行のみ他班マージ分とコンフリクト（コード非衝突）→`git merge origin/main`で両エントリを保持する形に手解決→ゲート再走(tsc/lint/vitest 2386件/build)全緑→push→CI緑を確認しsquashマージ。`git checkout main && git pull --ff-only`でclean確認（テスト実行由来の一時差分 rag-metrics-latest.json 等はdiscard）。

**タスク源**: BACKLOG-ux-hub.md 未着手最上位＝2026-07-03 Explore調査で発見済みの `/industries` 業種一覧テーブル。統計テーブル各行の「開く →」リンク(`page.tsx` 241-246行付近、text-xsのみ・パディング無し)が44px未満で、個別業種ページへ飛ぶ唯一の導線が指の押し損ねサイズだった。ブランチ `ux-hub/industries-list-open-link-44px`（main起点）。

**変更**: `web/src/app/(main)/industries/page.tsx` の「開く →」リンクに `inline-flex min-h-[44px] items-center justify-end px-2` を付与。純粋なクラス追加でレイアウト・遷移先不変。

**テスト**: `page.test.tsx` に1ケース追加。テーブル内「開く →」リンク全件（表示中の全業種行）の className に `min-h-[44px]`・`items-center` を保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存警告23件は無関係）/ vitest 282 files・2390 tests 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/industries-list-open-link-44px-noread-2026-07-03.mjs` を **5/5 PASS**（next start実機・スマホ390×844）。/industriesページの業種別統計テーブル5行すべての「開く →」リンクの実boundingBoxがheight=44pxであることを確認。

---

## 2026-07-03 — 補充: /industries/[industry] 業種詳細ページ 副リンク6箇所＋キーワードピル 柱0(44px)

**イテレーション頭の回収**: 自班の未マージPRは #701（業種一覧「開く →」リンク44px化）のみでCI pendingのため見送り、次サイクルで回収。`git checkout main && git pull --ff-only` で clean 確認（他班の並行マージによりfast-forward）。

**タスク源**: BACKLOG-ux-hub.md 未着手最上位＝2026-07-03 Explore調査で発見済みの `/industries/[industry]` 業種詳細ページ。同一ページ内で構造的に反復する副リンクパターン(`inline-flex items-center gap-1 text-xs`のみでpy無し＝条文検索を開く/法改正一覧/通達一覧をすべて見る/KY用紙作成ツールを開く/化学物質リスクアセスメント/化学物質データベース/特別教育・技能講習ファインダーの6箇所)と、ヒーローのhref付きキーワードピル(`px-2.5 py-0.5 text-xs`≈22-24px)が44px未満だった。ブランチ `ux-hub/industry-detail-sub-links-pill-44px`（main起点）。

**変更**: `web/src/app/(main)/industries/[industry]/page.tsx` の副リンク6箇所に `min-h-[44px] px-2`、ヒーローのhref付きキーワードピルに `min-h-[44px]` を付与。href無しの装飾用span(該当キーワードにリンク先が無い場合の代替表示)はタップ標的でないため非改変。純粋なクラス追加でレイアウト・遷移先・ロジック不変。

**テスト**: `industry-detail-44px-targets.test.tsx` を新設（2ケース）。async サーバーコンポーネントを `await IndustryLandingPage({ params })` で描画し、construction(keyword href あり・chemicalSubstances 非空で全パターン網羅)を対象に、対象8要素すべての className に `min-h-[44px]` を保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存警告23件は無関係）/ vitest 283 files・2402 tests 全pass / build 成功。

**無読テスト**: next start実機（ポート3901・スマホ390×844）のPlaywright boundingBox実測で、/industries/construction の対象8要素（副リンク6・キーワードピル1・+検証用1）すべてheight=44.0pxであることを確認。

---

## 2026-07-03 — 補充: /accidents/[id] 事故詳細「事故DBに戻る」・類似事例タイトルリンク 柱0(44px)

**イテレーション頭の回収**: 自班の緑PR2件を squash マージ＝#668(トップ死亡事故パネル4タップ標的44px)・#663(視覚パンくず可視化)。両方 e2e/smoke pass 確認済みでコンフリクトなし。PR #687(トップAlertGenerator・関連リンク44px)はCI pending のため次サイクル回収。`git checkout main && git pull --ff-only` で clean 確認。

**タスク源**: BACKLOG-ux-hub.md 未着手最上位＝2026-07-03 Explore調査で発見済みの `/accidents/[id]` 事故詳細ページの2箇所。「事故DBに戻る →」リンク(パディング無し・text-xs≈16px)と類似事故カードのタイトルリンク(block text-xs・パディング無し)がいずれも44px未満で、詳細ページから一覧へ戻る主導線・関連事故への遷移リンクが指の押し損ねサイズだった。ブランチ `ux-hub/accident-detail-back-related-links-44px`（main起点）。

**変更**: `web/src/app/(main)/accidents/[id]/page.tsx` の「事故DBに戻る →」リンクに `inline-flex min-h-[44px] items-center px-2`、類似事例タイトルリンク(`block`→`flex`)に `min-h-[44px] items-center` を付与。純粋なクラス変更でレイアウト・遷移先・ロジック不変。

**テスト**: `page.test.tsx` を新設（2ケース）。async サーバーコンポーネントを `await AccidentDetailPage({ params })` で描画し、類似事例が存在する事故(同type/workCategoryが他に存在するものをデータセットから自動選定)で「事故DBに戻る」リンクと類似事例セクション内タイトルリンク全件の className に `min-h-[44px]`・`items-center` を保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存警告23件は無関係）/ vitest 279 files・2358 tests 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/accident-detail-back-related-links-44px-noread-2026-07-03.mjs` を **4/4 PASS**（next start実機・スマホ390×844）。/accidents一覧を型フィルタ(墜落)で一覧表示→詳細ページへ遷移→「事故DBに戻る →」リンクと類似事例タイトルリンク3本の実boundingBoxが全てheight=44pxであることを確認。

---

## 2026-06-14 — 補充: /resources 厚労省一次資料DB フィルタ・各エントリ操作 柱0(44px)

**イテレーション頭の回収**: 自班の緑PR #564(/safety-signs サブページ44px)が main とコンフリクト（自班トラッキング文書 BACKLOG-ux-hub.md・cycle-log-ux-hub.md のみ衝突＝コード非衝突）。`git merge origin/main`→両文書を両エントリ保持で手解決→push→CI再走で squash マージ済み(#564)。PR #567(/court-cases 詳細44px)は smoke/e2e pending のため次サイクルで回収。`git checkout main && git pull --ff-only` で clean 確認。

**タスク源**: BACKLOG-ux-hub.md「未着手」は全て `[x]`＝補充モード。補充の指針「自領域route の柱0未適用箇所」から残ハブroute(quick/guides/resources)を実地調査。**/resources** の厚労省一次資料DB（通達・告示・指針・リーフレット計1,158件）の `ResourcesClient` で、一次資料を絞り込んで原文へ飛ぶDBの主操作群が44px未満という測定可能な欠陥を特定。① キーワード検索 input(`py-2`≈38px)、② カテゴリ/法的拘束力/年度の3 select(`py-2`≈38px)、③ 条件クリアボタン(`min-h-[40px]`)、④ 各エントリの原文/目次に戻る/PDF/一覧リンク(`min-h-[36px]`)。タブ(`min-h-[44px]`)とハブ本体page.tsx(関連リソースカード min-h-[64px]・戻るリンク min-h-[44px])は達成済み。ブランチ `ux-hub/resources-db-44px-targets`（main 起点）。

**変更**: `resources-client.tsx` の検索 input・3 select に `min-h-[44px]`、条件クリアを `min-h-[40px]`→`min-h-[44px]`、通達/リーフレット各エントリのアクションリンク4種を `min-h-[36px]`→`min-h-[44px]`。純粋なTailwindクラス追加（min-hは中身が44px超なら無効＝既存破壊なし）でレイアウト・絞り込みロジック・SEO不変。

**テスト**: `resources-client.test.tsx` を新設（5ケース）。最小フィクスチャ(通達1件・リーフレット1件)で `ResourcesClient` を直接描画し、検索input・combobox全件・条件クリア・通達アクション2種・リーフレットアクション2種の className に `min-h-[44px]` を保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 225 files・1879 tests 全pass / build 成功。dev起動で書き換わる data班生成物(rag-metrics-latest.json)は commit から除外（git checkout で復元）。

**無読テスト**: `docs/third-party-reviews/scripts/resources-db-44px-noread-2026-06-14.mjs` を **8/8 PASS**（dev実機・スマホ390×844）。実 boundingBox で件数ヘッドライン視認・検索input・フィルタselect全件・条件クリア・通達エントリの原文/目次リンク・リーフレットエントリのPDFリンクが全て height≥44px であることを確認。

---

## 2026-06-14 — 補充: /notifications 気象警報メール登録フォーム 柱0(44px)

**イテレーション頭の回収**: 自班の未マージPR #554(/faq 44px)・#551(/accidents 44px)はいずれもCI pending（smoke/e2e/Vercel）でマージ不可→次サイクルで回収。`git checkout main && git pull --ff-only` で clean 確認。

**タスク源**: BACKLOG-ux-hub.md「未着手」は全て `[x]`＝補充モード。補充の指針「自領域route の柱0未適用箇所」から、残ハブroute(quick/guides/notifications/resources/safety-signs)を実地調査。**/notifications** の気象警報メール登録フォーム（SubscribeForm）の主入力＝メールアドレス入力・対象地域セレクトが `py-2.5`（≈40px）で44px未満という測定可能な欠陥を特定。一人親方が最初にタップする無料通知登録の主入力が押し損ねサイズだったため選択。ブランチ `ux-hub/notifications-pillar0-44px-form`（main 起点）。

**変更**: `subscribe-form.tsx` の email input・prefecture select を `min-h-[44px]`＋`py-3` へ。送信ボタン(既に py-3)にも `min-h-[44px]` を明示。純粋なTailwindクラス追加でレイアウト・送信ロジック・SEO不変。

**ゲート結果（cd web）**: tsc=0 / lint=0（eslint直叩き・notificationsディレクトリ EXIT 0。`npm run lint` 経由は環境segfaultのため直叩きで確認）/ vitest 220 files・1839 tests 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/notifications-44px-form-noread-2026-06-14.mjs`（dev実機・スマホ390×844、実 boundingBox）でメール入力・地域セレクト・登録ボタンの3標的が全て height≥44px を **3/3 PASS** で検証する設計。vitest 3件で `min-h-[44px]` クラスと py-2.5 退行禁止を回帰固定。

## 2026-06-14 — 補充: /favorites 柱0(44px)＋accident種別の表示是正

**イテレーション頭の回収**: CI緑の自班PR #534(signage JIS色)を squash マージ→ブランチ削除。#539(トップ柱3)は #534 マージで競合(DIRTY)化したため `origin/main` を当該ブランチへ通常マージ（doc cycle-log の競合のみ手動解消＝3エントリ共存）→push（CI再走は次サイクルで回収）。#544(/features 44px)はCI in-progressのため次サイクル。`main` を ff-only で最新化。

**タスク源**: BACKLOG-ux-hub.md 最上位 `[ ]` は「柱3トップ実機レビュー」だが**既にPR #539で着手済み**（マージ前）。重複着手を避け、補充の指針「自領域route の柱0未適用箇所」から、cycle-log 残課題で次候補に挙げていた **/favorites** を選択（/features は #544 で in-flight）。ブランチ `ux-hub/favorites-pillar0-44px-accident-kind`（main 起点）。

**無読＋コード精査で見つけた欠陥**:
- 柱0タップ標的: 種別タブ(`py-1.5`≈32px)・削除ボタン(`p-2`+16pxアイコン≈32px)・空状態の導線CTA(`px-3 py-1.5 text-xs`≈28px)がいずれも44px未満（WCAG 2.5.5不適合）。
- **既存の表示バグ**: `lib/favorites` の kind は article/notice/**accident** の3種で、/accidents の「⭐」も同じストアに入る。しかし本リストはバッジを `kind==="article" ? 条文 : 通達` の二分岐で描画していたため、**事故事例が一律「通達(violet)」と誤表示**。さらに `TAB_LABEL` には「事故事例」があるのにタブ配列は `["all","article","notice"]` 固定で**絞り込み不能**だった。

**対策（favorites-list.tsx）**:
- 行内バッジを `KIND_BADGE`（article=emerald「条文」/ notice=violet「通達」/ accident=rose「事故事例」）の表引きへ。
- タブ配列を動的化＝`counts.accident > 0` のときだけ「事故事例」タブを追加（事故事例を保存していない大多数の画面は従来どおり3タブで不変）。削除で当該種別が0件になり絞り込み中タブが消える際は `setTab("all")` で取り残し防止。
- 3コントロールへ `min-h-[44px]`（タブ・空状態CTA）/ `min-h-[44px] min-w-[44px]`（削除ボタン）を付与。CTAは `text-xs→text-sm`・`px-3→px-4` で可読性も底上げ。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（favorites-list.tsx に既存の「unused eslint-disable」warning 1件のみ・無関係）/ vitest 212 files・1778 tests 全pass（favorites-list.test.tsx 7件新設＝accidentバッジ是正・事故事例タブの出現/絞り込み・44pxクラスの回帰ガード）/ build 成功。full suite が書き出す data班生成物 `docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json` は commit から除外（git checkout で復元）。

**無読テスト**: `docs/third-party-reviews/scripts/favorites-pillar0-accident-noread-2026-06-14.mjs`。条文/通達/事故事例の3件を localStorage に仕込み、本番サーバー(build+start・スマホ390×844)で **8/8 PASS**＝事故事例行が「事故事例」バッジ（通達バッジ0件）・事故事例タブの出現と絞り込み・全タブ高さ実測44px・削除ボタン実測44×44px・空状態CTA実測48px を boundingBox で確認。スクリーンショット `favorites-pillar0-2026-06-14.png` 添付（4タブ＋rose事故事例行を確認）。port3000 は他班クローンが占有のため 3517 で起動。

**残課題**: #539(トップ柱3)・#544(/features 44px) の各CI回収。自領域 柱0 未適用の /resources・/notifications・/guides は次サイクル候補。

## 2026-06-13 — 決裁C: サイネージのアフィリエイト安全グッズを「出さない」

**タスク源**: BACKLOG-ux-hub.md 決裁C（自走可）。ブランチ `ux-hub/decision-c-remove-signage-goods`。

着手時、トップ候補だった柱0バッチ8（ハブ/ナビ12ページ一括）は SEO テキストを多く含む異種ページ群で、1 PR で安全に「文字ダイエット」しきるには既存破壊リスクが高いと判断。代わりに、決裁が確定していて完了条件が明確・参照ゼロが Grep で証明可能・自領域(signage/**)完結・回帰リスクゼロの決裁C を先に出荷した（topmost は判断で後回し、batch8/signage柱0 は次サイクルへ）。

**実施内容**:
- 全域 Grep で `SignageFeaturedGoods` / `FeaturedGoods` の参照を確認 → 本体定義以外の参照ゼロ（本番・テスト・ページ import すべて無し）。Amazon/楽天アフィリンクを描画する未配線コンポーネントだった。
- `web/src/components/signage/signage-featured-goods.tsx` を `git rm` で削除。
- 共有部品 `goods-icons`（`GoodsCategoryIcon`）は `safety-goods-panel.tsx` も使用するため**保持**。
- data層 `getSignageFeaturedSafetyGoods`（`src/data/mock/safety-goods.ts`）は data班凍結領域のため**未触**。削除後は未使用 export として残るが、build/lint に影響なし。data班での整理対象として BACKLOG に明記。
- `scripts/audit/internal-link-graph.json` に削除ファイルへのエッジ参照(1件)が残るが、これは生成物で TS/テストから import されておらず（consumer なし）、dangling edge target は無害。監査スクリプト再生成時に解消されるため手編集せず残置。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（45 warnings は既存・無関係）/ vitest 199 files・1656 tests 全pass / build 成功。既存破壊ゼロ。

**無読テスト**: 本タスクは未配線デッドコードの削除であり、描画される UI 変更なし（サイネージ各画面の見た目は不変）。検証は「参照ゼロの Grep 証明 + 全ゲート緑」で代替。サイネージ1画面フィットも不変。

**残課題**: 柱0バッチ8/9（ハブ/ナビ12ページ）、サイネージ柱0（大型化・JIS安全色統一）、C-6 court-cases ページネーション。（PR #517 マージ済み）

## 2026-06-14 — 柱C-6 /court-cases ページネーション

着手前にハブ/ナビ系（柱0バッチ8）を一通り現状確認したところ、/quick・/faq・/resources・/notifications・/safety-signs・/guides は既にアイコンファースト＋44pxタイルが概ね達成済みで、無理に大改修すると水増し・既存破壊のリスクが高いと判断。代わりに、具体的かつ測定可能な欠陥が残る **柱C-6（/court-cases のページネーション）** を選択した。signage 柱0 は直前にマージした PR #517（SignageFeaturedGoods 削除）と同じ領域で衝突しうるため次サイクルへ。

`court-cases-browser.tsx` は `filtered` 88件を一度に全描画しており、スマホ全高が約25,974pxまで伸びていた。`PAGE_SIZE=24` を導入し `filtered.slice(0, visibleCount)` で初期24件のみ表示、「もっと見る（残りN件）」の min-h 48px フル幅ボタンで PAGE_SIZE 単位の追加読込にした。絞り込み条件が変わったら先頭から表示し直す処理は、React 推奨の「レンダー中に派生状態を調整」パターン（前回フィルタキーとの比較）で実装し、`react-hooks/set-state-in-effect` lint を回避。件数表示は「N件中M件を表示（全88件）」に更新。分野アイコングリッドは既に min-h-[44px] 達成済みのため変更不要。

結果: 初期スマホ全高 25,974px → **9,939px**（約62%減）。tsc=0／lint=0／vitest=1659 全pass（court-cases-browser.test.tsx を3ケース追加）／build成功。無読テスト（`docs/third-party-reviews/scripts/court-cases-pagination-noread-2026-06-14.mjs`）はローカル dev(3001) に対し **8/8 PASS**。既存の `accidents-courts-noread-2026-06-11.mjs` は件数表示の文言変更に追従（絞込総数を「件中」手前から読むよう更新）。

**残課題**: 柱0バッチ8 の残focusは /glossary・/industries・/diversity・/handover の文字ダイエット。signage 柱0（大型化・JIS安全色統一）。

## 2026-06-14 — 柱3レビュー トップページ ペルソナ最短到達（一人親方）

**イテレーション頭の回収**: CI緑の自班PR #529（柱0バッチ8）は main と doc 競合(DIRTY)だったため `origin/main` を当該ブランチへ通常マージしてdoc競合のみ解消→push（CI再走は次サイクルで回収）。#534（signage JIS色）はCI in-progressのため次サイクル回収。`main` を ff-only で最新化後、本タスクに着手。

**タスク源**: BACKLOG-ux-hub.md「柱3レビュー」。ブランチ `ux-hub/top-pillar3-persona-review`（main 起点）。バッチ8/signage は #529/#534 で既出荷済み（main未マージ）のため、未着手で残るこのトップ実機レビューを選択。

**実機レビュー（スマホ390×844・dev実機）**: トップを上から無読でスキャン。
- 最上部「現場ですぐ使う」=0スクロールで主要機能10タイル(min-h 78px・3列・アイコンファースト)。一人親方が必要とする KY用紙/AIに質問/事故事例DB/法改正 が全て揃う。→ 機能への最短到達は既に良好。
- Hero(h1/SEO/3CTA/統計) と 3本柱(本日の安全トピック=事故/警報/法改正) も視認性良好。全高7,551pxでスクロール地獄なし。
- **唯一の測定可能な欠陥**: ペルソナバンド「あなたの立場から始める」がモバイル `grid-cols-1`。先頭=建設業カードがフル高さ(約180px)を占め、その真下に一人親方カードが隠れる。「自分の立場」エントリ(/for/solo)に到達するのに建設業カードを丸ごとスクロールする必要があった＝当の一人親方ペルソナにとって最遠。

**対策（home-persona-entry.tsx）**: バンドを `grid-cols-2 lg:grid-cols-4`(モバイル2列)へ。建設業は読み順1番目=左上に温存（documented priority 不変）しつつ、一人親方を同一行の右上＝初手で視界に入る位置へ引き上げ。狭い2列では説明文 `<p>` を `hidden sm:block` で畳み、アイコン+役割名+タグ(機能の一目signal)で3秒スキャン可能に。sm以上は従来通り説明文表示・lgは4列1行。card に `min-h-[44px]`・`p-3 sm:p-4`。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 205 files・1702 tests 全pass（home-persona-entry.test.tsx に2列化＋DOM順の回帰ガード2件追加）/ build 成功。※`npm run lint` 初回はWindowsのeslintワーカーがsegfaultでクラッシュ→`npx eslint .` 再実行で 0 errors（環境起因・コード無関係、前サイクルと同症状）。

**無読テスト**: `docs/third-party-reviews/scripts/top-persona-shortest-reach-noread-2026-06-14.mjs` を **9/9 PASS**（dev実機・スマホ390×844）。建設業=左/一人親方=右の同一行配置(上端ズレ<80px)・主要機能タイル44px・一人親方→/for/solo 動線を実画面 boundingBox で確認。sm(768)/lg(1280) もスクリーンショットで非破壊を確認。

**残課題**: 柱0バッチ8 残focus(/glossary 等は #529 で出荷済み)・signage 柱0(#534 出荷済み)の各CI回収。自領域 柱0 未適用の /features・/favorites は次サイクル候補。
## 2026-06-14 — 柱0 サイネージ JIS安全色文法の統一（注意黄＝黒系文字）

着手前にサイネージ各コンポーネントの色使いを精査。結論ストリップ(`SignageConclusionStrip`)は既に JIS安全色の文法どおり「注意＝黄」を `bg-amber-* / text-amber-950`（黒系文字）で描画していたが、同じサイネージ配下の **リスク予測の「中」リスクバッジ**（`signage-risk-prediction.tsx`）と **現場安全状態の「要対応」チップ・出典ラベルバッジ**（`signage-site-safety.tsx`）の計3箇所だけ `bg-amber-500 text-white` のままだった。amber-500(#f59e0b)×白は約2.1:1で WCAG 不適合、数メートル先のTVでは文字が黄色に溶けて読めない（サイネージ無読テスト「遠目で色と数字が読めるか」に直接違反）。

3箇所の白文字を `text-amber-950` へ是正し、結論ストリップと文法を統一。**純粋な色クラスの入替のみで寸法は一切変えていない**ため、不可侵の「1画面フィット」は構造的に不変（無読テストでも scrollHeight=1080≤viewport=1080 を確認）。`signage-floor-plan-editor.tsx` のペン色インジケータ `bg-amber-700 text-white`（暗い黄・約4.5:1で AA 適合・JIS注意バッジではなく描画ツール色）は対象外として保持。

回帰ガードとして `jis-safety-color-grammar.test.ts` を新設。`src/components/signage` の全 .tsx を文字列リテラル境界で分割走査し、明るい注意黄(amber-300/400/500)背景に `text-white` を同居させていないことを保証（三項の別枝に分かれた `text-white`/`bg-amber-500` を誤検知しないよう quote 境界で分割）。14ケース全pass。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 206 files・1709 tests 全pass / build 成功。既存破壊ゼロ。※full suite 実行で rag テストが書き出す `docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`（data班領域の生成物）は commit から除外（git checkout で復元）。

**無読テスト**: `docs/third-party-reviews/scripts/signage-jis-amber-noread-2026-06-14.mjs`。未是正の重大ヒヤリ1件を localStorage に仕込んで「要対応」amber バッジを確定描画させ、実画面の computed color を canvas で rgb 正規化（このスタックは getComputedStyle が lab() を返すため）して検証。**8/8 PASS**: 要対応チップ文字色 rgb(70,25,1)=amber-950（輝度<0.4）・背景 rgb(255,185,0)=注意黄・文字背景の輝度差0.60・画面上に明るい注意黄×白文字0件・1画面フィット維持・結論ストリップのデカ主文48px。スクリーンショット `signage-jis-amber-2026-06-14.png` 添付。

**残課題**: 柱0バッチ8（PR #529 CI待ち＝/industries/glossary/diversity 文字ダイエット、/handover は noindex で対象外）。柱3トップページ実機レビュー。

## 2026-06-14 — 柱0バッチ8/9 ハブ/ナビ系 文字ダイエット＋44pxタップ標的

**タスク源**: BACKLOG-ux-hub.md 最上位「柱0バッチ8/9」。ブランチ `ux-hub/pillar0-batch8-text-diet`（main 起点）。先行イテレーションのC-6（PR #523）はCIがpending（未green）のため未マージ、次イテレーションで回収。

バッチ8の残focus（無読テストで点検した4ページ）に対し、文字ダイエットと44pxタップ標的化を実施。

- **/industries**: ヘッダーが3段落構成（10業種をインライン列挙する段落＋「ロングテール」等クローラ向けキーワード段落）で、業種カードに到達する前に文章の壁になっていた。1文ガイド「あなたの業種を選ぶと、重点課題・関連法令・典型事故・KY・特別教育・事故レポート・年次計画への動線がまとまっています。」へ圧縮。業種名はすぐ下のカードと重複、SEOキーワードは metadata.description と各カードの keywords に保持されるため非破壊。
- **/glossary**: 五十音インデックスボタン（約32px）を `min-h-[44px] min-w-[44px] inline-flex items-center justify-center` で44×44pxのタップ標的に。
- **/diversity**: 導入アラート文を圧縮（重複表現を削除）しつつ「判断は一次資料・専門家にご確認ください」の安全上の注意書きは保持。目次ジャンプチップに `min-h-[44px]`。
- **/handover**: noindex＋key gate（`HANDOVER_GATE_KEY` 不一致で notFound）の社内引き継ぎ文書。初訪の一人親方ペルソナが到達しない非公開ページのため、本バッチの persona-facing 文字ダイエット対象から明示的に除外（doc整合性の既存破壊回避）。

**テスト**: vitest 10ケース追加（industries 3・glossary 3・diversity 4）。diversity/glossary は PageHeader→RubyText / EasyJapanese トグルが context を要求するため、Language/Furigana/EasyJapanese Provider でラップして描画。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 203 files・1680 tests 全pass / build 成功（初回はWindowsのTSワーカーがsegfault=3221225477でクラッシュ→再実行で成功、コード起因でなく環境起因）。

**無読テスト**: `docs/third-party-reviews/scripts/pillar0-batch8-text-diet-noread-2026-06-14.mjs` を8/8 PASS（dev実機・スマホ390×844）。3画面ともスクリーンショットで「どこに何があるか／次にやること（業種を選ぶ・五十音で引く・対象層を選ぶ）」が3秒で読めることを確認。

**残課題**: サイネージ柱0（大型化・JIS安全色統一 → PR #534 で着手）、トップページ柱3実機レビュー。

---

## 2026-06-14 イテレーション（/accidents 事故DB 柱0補充 タップ標的44px化）

**着手**: 当班のCI緑PR #539（トップ ペルソナバンド2列化）を squashマージ→main同期。#544（/features 44px）は main更新でBACKLOG衝突→origin/mainを取り込み解消し再push（CI再回収待ち）。#548（/favorites）はCI pendingのため次イテレーションへ。BACKLOG未着手が全[x]のため補充指針に従い自領域route /accidents の柱0未適用箇所を起こした。

**作業**: 事故DBページ最上部の主要操作が指で押しにくいサイズだった（無読＝現場の一人親方がスマホ親指で「探す/検索する」を押し損ねる）。`AccidentHubNav` の事故系4ルートのナビチップ(px-3 py-1≈28px)・`QuickAccidentSearch` のキーワード入力欄/検索ボタン(py-2≈38px)と事故型チップ(min-h-[36px])・`SavedAccidents` の削除ボタン(px-2 py-1≈24px) を、いずれも min-h-[44px]／h-11 w-11 へ是正。純粋なクラス追加（inline-flex中央寄せ込み）でレイアウトは不変。`AccidentTypeGrid`（柱0のピクトグラムナビ）は既に min-h-[44px] 達成済みのため非変更。

**テスト**: vitest 8ケース追加（accident-hub-nav に44pxガード1・quick-accident-search 新規4・saved-accidents 新規3）。SavedAccidents は localStorage(safe-ai:favorites:v1) を直接シードして描画。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/accidents-pillar0-44px-noread-2026-06-14.mjs` を5/5 PASS（dev実機・スマホ390×844・実 boundingBox 測定）。ハブナビ4チップ・入力欄・検索ボタン・型チップ・削除ボタンの全てが44px以上であることを実測確認。

**残課題**: #544/#548 のCI緑確認とマージ回収。自領域route の柱0/柱3レビュー継続。

---

## 2026-06-14 — 柱0補充 /features 機能一覧ハブの44pxタップ標的化

**タスク源**: BACKLOG-ux-hub.md の未着手は柱3トップ実機レビュー1件のみだったが、これは自分の在飛 PR #539（トップのペルソナバンド）と同じファイル領域で衝突するため、補充指針に従い独立した自領域route /features を柱0で点検した。ブランチ `ux-hub/features-pillar0-44px-targets`（main 起点・PR #529/#534 マージ反映後）。

着手前に冒頭の `git checkout main && git pull --ff-only` で PR #529（batch8）をmainへ取り込み、衝突していた PR #534（signage）は origin/main を当該ブランチへ通常マージしてpush（CI再走→次サイクル回収）。

`/features` を無読テストで点検したところ、カード自体はスクリーンショット付きでビジュアルファースト達成済みだったが、**指で押す要素がほぼ全て44px未満**だった: カテゴリフィルタチップ・クイックリンク（5分ツアー等）・各カードの主CTA「機能を試す →」/副CTA「詳しく見る」・下部CTAが `py-2 text-sm`（実測≈36px）。一覧の主アクション（機能を試す）が押し損ねサイズなのは初訪の一人親方（スマホ）に直接の摩擦。

全タップ要素に `min-h-[44px]` を付与（フィルタ/カテゴリ/CTAは `inline-flex items-center justify-center` で縦中央寄せも追加）。**純粋なクラス追加でグリッド・余白・寸法は不変**（min-h は中身が44px超なら無効化＝既存破壊なし）。

**テスト**: `features-index-client.test.tsx` を新設（5ケース）。`LanguageProvider` でラップして描画し、フィルタ/主副CTA/クイックリンクの className に `min-h-[44px]` を保証＋カード件数がカタログと一致することを確認。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 210 files・1732 tests 全pass / build 成功。data班生成物（rag-metrics-latest.json・chatbot-eval-fresh-results.json）はfull suite走行で書き換わるため commit から除外（git checkout で復元）。

**無読テスト**: `docs/third-party-reviews/scripts/features-44px-targets-noread-2026-06-14.mjs` を **8/8 PASS**（dev実機・スマホ390×844）。実 boundingBox でフィルタ「すべて」/先頭カテゴリ/主CTA/副CTA/クイックリンク/下部CTAが全て height≥44px・カードがスクリーンショット画像を伴う（ビジュアルファースト）ことを確認。

---

## 2026-06-14 /safety-signs サブページ ナビ・タップ標的44px化（柱0補充）

**着手理由**: BACKLOG-ux-hub 未着手キューが全て[x]のため補充指針（自領域routeの柱0未適用箇所）から起こす。所有route /safety-signs を実機レビューしたところ、ハブ本体（カテゴリ/業種カード）は44px達成済みだが、サブページ（カテゴリ詳細・業種詳細・標識詳細）のナビ操作が退行していた。

**欠陥（既存）**: 標識→カテゴリ→業種を行き来する主ナビが親指で押し損ねるサイズ。① 各サブページ先頭の「…に戻る」リンク3箇所が `text-xs` の素の `inline-flex`（パディング/min-h無し、≈16〜20px）。② 「他の業種ガイド」（業種詳細）/「業種別ガイドへ」（標識詳細）チップが `px-3 py-2 text-xs`（≈32px）。

**対策**: ① 戻るリンク3箇所に `min-h-[44px]` を付与。② 業種チップ2箇所に `inline-flex items-center min-h-[44px]` を付与（グリッドセル内で縦中央寄せ・44px高）。いずれも純粋なクラス追加でレイアウト不変。標識詳細の本文中・業種インラインリンク（`rounded-lg` を持たない）は性質が異なるため対象外とし、テスト/無読も `rounded-lg` で限定。

**テスト**: `safety-signs-tap-targets.test.tsx` を新設（3ケース）。async server page を `await` して `LanguageProvider`/`FuriganaProvider`/`EasyJapaneseProvider` でラップ描画し、戻るリンク・業種チップの className に `min-h-[44px]` を保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors / vitest 222 files・1847 tests 全pass / build 成功。data班生成物（rag-metrics-latest.json・chatbot-eval-fresh-results.json）はdev起動で書き換わるため commit から除外（git checkout で復元）。

**無読テスト**: `docs/third-party-reviews/scripts/safety-signs-subpages-44px-noread-2026-06-14.mjs` を **5/5 PASS**（dev実機・スマホ390×844）。実 boundingBox で カテゴリ/業種/標識の各詳細の戻るリンク・業種チップ群が全て height≥44px であることを確認。

---

## 2026-06-14 柱0補充 /faq ハブ/ナビ系 44pxタップ標的化（ux-hub/faq-pillar0-44px-targets）

**背景**: /features に続く柱0補充。FAQ ハブ/検索/カテゴリの押せる要素のうち、ハブのカテゴリ「…の質問一覧を見る →」リンク・関連ツールチップ、検索の「よく検索されるキーワード」チップ・設問内の関連ページリンク、カテゴリ内絞り込み入力 が py-1/py-2（≈28〜36px）で44px未満。指で押し損ねるサイズだった。

**対策**: 該当要素に `min-h-[44px]`、チップ/リンク類は `inline-flex items-center`（カテゴリCTAは `justify-center` も）を付与。**純粋なクラス追加で寸法・余白・グリッドは不変**（min-h は中身が44px超なら無効＝既存破壊なし）。対象3ファイル: faq/page.tsx・faq/search/page.tsx・faq/[category]/page.tsx。

**テスト**: `faq-pillar0.test.tsx` を新設（4ケース）。ハブはサーバーコンポーネントを直接描画、検索はクライアントを描画、カテゴリは `next/navigation` の useParams をモックして描画し、各タップ要素の className に `min-h-[44px]` を保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/faq-44px-targets-noread-2026-06-14.mjs` を **7/7 PASS**（dev実機・スマホ390×844）。実 boundingBox でハブのカテゴリリンク/関連ツールチップ、検索の人気キーワードチップ、カテゴリ内絞り込み入力、設問内の関連ページリンクが全て height≥44px であることを確認。

---

## 2026-06-14 ux-hub/court-case-detail-44px-targets（PR #567）

**タスク**: 補充・柱0。BACKLOG-ux-hub.md の未着手が全て[x]だったため、自領域route の柱0未適用箇所を補充指針に従い起こした。`/court-cases/[id]` 判例詳細ページを対象に選定。

**無読の所見（ペルソナ=一覧から1判例にタップで入った一人親方/コンサル）**: 本文を読まず最上部を3秒見ると、左の「労災裁判例コーナーに戻る」戻りリンクと右の「この判例を印刷／PDF」アクションが視認はできるが、いずれも指のヒット域が細く押し損ねる。実測で戻る≈20px・印刷≈30pxと44px未満だった。戻るは一覧へ帰る唯一の導線、印刷は顧問先に1判例だけ渡すコンサルの主要動作で、どちらも親指操作の頻出点。

**修正**: 戻るリンクと印刷リンクに `min-h-[44px]` を付与（inline-flex items-center は既存のため縦中央寄せのまま高さのみ44pxへ）。加えて「現場の実務へ」3カード(KY用紙/重大災害事例/安衛法質問)が p-3 単行で丁度44px境界だったため `min-h-[44px]` を明示し、サブピクセル丸めでの44px割れを予防。すべて純粋なクラス追加で、レイアウト・`print:hidden` の印刷挙動・遷移先は不変。

**テスト**: `court-cases/[id]/page.test.tsx` を新設（3ケース）。async サーバーコンポーネントを `await CourtCaseDetailPage({ params: Promise.resolve({ id }) })` で解決して描画し、戻る/印刷/3カードの className に `min-h-[44px]`+`items-center` を保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 1866 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/court-case-detail-44px-noread-2026-06-14.mjs` を **5/5 PASS**（production start 実機・スマホ390×844）。実 boundingBox で 戻る44.0px / 印刷44.0px / 3カード各46.0px を確認（全て height≥44px）。

---

## 2026-06-14 ux-hub/guides-hub-icon-first

**タスク**: 補充・柱0。BACKLOG-ux-hub.md の未着手が全て[x]だったため、補充指針（自領域route の柱0未適用箇所）に従い `/guides` 検索意図ガイドハブを選定。

**無読の所見（ペルソナ=検索から /guides に着地した初訪の職長）**: 本文を読まず3秒見ると、「ガイド一覧」の4カードが全て文字のみ（キーワード→タイトル→説明→「ガイドを読む」）で、emerald 一色・同一レイアウト。AI相談なのか災害分析なのか年次計画なのか化学物質RAなのかをアイコン/色で瞬時に弁別できず、各カードの説明文を読み切るまで自分の目的のガイドに飛べなかった。柱0（ビジュアルファースト/アイコンファースト）未適用の典型。カード全体が tap 標的で 44px は既達のため、欠陥は「視覚的弁別性」に限定。

**修正**: 当ページ内に `GUIDE_VISUAL: Record<slug, {icon, badge}>` を新設し、4 slug に lucide アイコン（anzeneho-ai-chatbot=Bot / industry-accident-reports=BarChart3 / annual-safety-plan-generator=CalendarCheck / chemical-ra-create-simple=FlaskConical）と弁別色バッジ（青/ローズ/緑/琥珀）を割当。カードを `block` から `flex gap-4` の横並びへ変え、左に 48×48px(h-12 w-12) の角丸アイコンバッジ、右に既存テキスト（min-w-0 flex-1 で省略安全）を配置。**data層 KEYWORD_LANDINGS は data班凍結のため非改変**で、アイコン割当は完全に当ページ責務に閉じる。テキスト・リンク先・JSON-LD・編集方針セクションは不変。

**テスト**: `guides/page.test.tsx` を新設（4ケース）。見出し描画／各カードが `/guides/<slug>` へリンク／各カードがアイコンバッジ(svg)を1つ持つ／4バッジの色トークンが重複しない（Set サイズ=件数）ことを保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 1883 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/guides-hub-icon-first-noread-2026-06-14.mjs` を **4/4 PASS**（dev実機・スマホ390×844）。実 boundingBox で4ガイドのアイコンバッジが各 48×48px、色トークン4種が重複なし（弁別 PASS）であることを確認。playwright は web/node_modules にあるため createRequire の相対解決で repo ルートから直接実行可能にした。

---

## 2026-07-02 ux-hub/signage-jma-runtime-fetch

**タスク**: BACKLOG-ux-hub.md 最上位（2026-07-02 Fable診断注入 O2, 診断書 `docs/fable-diagnosis-2026-07-02/01-signage.md` T1+T2）。サイネージ気象データ(`/api/signage/jma`)が本番で18日間凍結していた不具合の是正。

**真因**: `route.ts` が `@/data/jma/*.json` を `export const dynamic = "force-static"` でビルド時 static import しており、返り値はビルド時点のJSONに完全固定されていた。一方 `.github/workflows/jma-data-update.yml` は15分毎にJMAデータを取得しコミットするが、コミット件名 `[skip ci]` を `vercel.json` の `ignoreCommand` が検出してVercelデプロイをスキップする設計のため、通常デプロイ（コード変更）が起きない限り本番のJMAデータは更新されなかった。ローカルリポジトリの `web/src/data/jma/index.json` は常に新鮮（GH Actionsは正常稼働）だが本番だけ古い、という乖離を確認。

**修正**: `route.ts` から static import を撤去し、気象庁 bosai JSON（警報47都道府県・天気予報7地方・地震一覧）をリクエスト時に直接 fetch する新規 `web/src/lib/jma/fetch-jma-runtime.ts` を追加。既存の `/api/signage-data` と同じ構え（`unstable_cache` + `next: { revalidate: 1800 }`）で30分キャッシュし、デプロイ有無に依存せず鮮度を保つ。全都道府県/全地方の取得が総崩れした場合のみ、既存の静的スナップショット（`@/data/jma/*.json`）へフォールバック——GH Actions cron は「緊急時フォールバックの供給元」へ役割変更し、削除はしていない。パース処理は既存 `parse-jma-warning.ts` に純関数 `summarizeWarningPayload` を追加、天気/地震は新規 `parse-jma-forecast.ts`/`parse-jma-earthquakes.ts` に分離（いずれもネットワーク非依存の純関数でユニットテスト可能）。

**デプロイ健全性ウォッチ(T2)**: `/api/cron/signage-jma-health` を新設し `vercel.json` に日次cron登録。データ齢24hを超えたら非2xxを返し、Vercel Cron の失敗検知に自然に乗る設計（新規の通知チャネル・環境変数は導入せず、Deploy Hook 追加はオーナー確認事項として見送り＝診断書付記に準拠）。しきい値判定は純関数 `web/src/lib/jma/data-freshness.ts` に切り出しユニットテスト済み。

**実機確認**: `npm run dev` で `/api/signage/jma` を実際に叩き、初回820ms（気象庁への実ネットワークfetch）→2回目8ms（unstable_cacheヒット）を確認。返却された東京都(JP-13)のheadline/reportDatetimeを気象庁APIへの直curl結果と突合し完全一致（ライブデータであることを確認、フォールバックではない）。`/signage`・`/signage/map`・`/signage/display` は全て200で既存表示のまま描画。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 1951 全pass（新規18件）/ build 成功（`/api/signage/jma`・`/api/cron/signage-jma-health` とも `ƒ Dynamic` へ変化したことを確認＝ force-static 撤去の裏付け）。

**残課題**: O3（警報バナー誤報判定の是正）・O9（サイネージ文字サイズ再設計）以下は次イテレーション以降で対応。

---

## 2026-07-03 ux-hub/o3-warning-banner-city-code-fix（PR #594）

**イテレーション頭の回収**: 自班の緑PR #587(signage-jma-runtime-fetch)を squashマージ。`git checkout main && git pull --ff-only` でclean確認。

**タスク**: BACKLOG-ux-hub.md 最上位（2026-07-02 Fable診断注入 O3, 診断書 `docs/fable-diagnosis-2026-07-02/01-signage.md` T3）。赤バナー「警報 発表中」の誤報是正。

**真因**: `resolveWeatherWarningPanelState` が県単位の `headlineText` の有無だけで `kind:"headline"` を返し、`buildSignageConclusion` がそれを無条件に赤表示していた。気象庁 `130000.json` を直接fetchして実測したところ、headlineText は「伊豆諸島南部では、強風や高波に注意してください…」（離島の注意報）である一方、新宿区(130010)の市区町村別 `warnings` は `{"status":"発表警報・注意報はなし"}`（codeフィールドなし）で実質空。つまり現場と無関係な離島の情報のみで、注意報を「警報」と誤表示・全画面赤にしていた。

**修正**: 判定軸を県ヘッドラインから市区町村コード一致の `selectedWarnings` へ変更。`parse-jma-warning.ts` に `maxLevelFromSelectedWarnings`（気象庁コード先頭桁: `3`=特別警報/`0`=警報/`1`・`2`=注意報で最大区分を算出）と公開版 `levelFromWarningCode` を追加。`weather-warning-panel-state.ts` の `WeatherWarningPanelKind` を `"headline"` 単一種別から `"special"|"warning"|"advisory"|"none"`（+`loading`/`error`）へ分割し、`resolveWeatherWarningPanelState` は selectedWarnings ベースで区分を返す（headlineは該当区分がある場合の補足文として保持するのみ）。`buildSignageConclusion` を「特別警報/警報=赤・注意報=黄・なし=緑」に対応（優先順位: 特別警報/警報 > 期限超過 > 注意報 > 気象取得失敗 > 高リスク予測 > 要対応 > 確認中 > 警報なし）。`signage/page.tsx` の警報サイドパネル・地図モード表示も新kindに追随。`JMA_CODE_HINT`（6件のみの手書き辞書・未収録コードは「コード XX」とフォールバックしていた）は現象名の捏造防止のため廃止し、コード区分ラベル（警報/注意報/特別警報）表示へ置換。

**実機確認**: 気象庁 `130000.json` を直接fetchし、離島headline×新宿(130010)空配列という実例を再確認。修正後のロジックで同入力が `kind:"none"`（緑・「本日 警報なし」）になることをユニットテストで保証。

**ゲート結果（cd web）**: tsc=0（`.next/dev` の生成物由来エラーのみ・本変更と無関係。`validator.ts` 単体削除で解消し再ビルドで正常再生成を確認）/ lint=0 errors（46 warnings は既存・無関係）/ vitest 1979 全pass（新規/更新13件: `parse-jma-warning.test.ts`・`weather-warning-panel-state.test.ts`・`signage-conclusion.test.ts`）/ build 成功。dev実行で書き換わる他班生成物(`rag-metrics-latest.json`・`chatbot-eval-fresh-results.json`)は commit から除外。

**残課題**: O9（サイネージ文字サイズ再設計）以下は次イテレーション以降で対応。

---

## 2026-07-03 ux-hub/o9-signage-typography-rotation

**タスク**: BACKLOG-ux-hub.md 最上位（2026-07-02 Fable診断注入 O9, 診断書 `docs/fable-diagnosis-2026-07-02/01-signage.md` T4+T5）。サイネージ本文の6割が12px以下で3m先から読めず、6分間観察でDOMが（時計以外）1文字も変化しない「動かない掲示板」問題の是正。

**着手前の状況**: 前イテレーションで着手した O3（警報バナー誤報判定）は PR #594 として提出済みだが CI(e2e/smoke)が pending のままだったため、今回はマージせず次イテレーションへ回収。BACKLOG-ux-hub.md 上の O3 は main 未マージのため引き続き未着手表記のまま、O9 に着手した。

**タイポグラフィ**: `xl:` ブレークポイント（1920幅TV想定・`lg:`/`sm:` のモバイル向けサイズは不変）で本文系フォントを最低24px、キーナンバー（気温・リスクラベル・トレンド見出し・法改正タイトル等）を28〜32px超へ再設計。対象: `signage-header.tsx`（地点/時刻）、`signage-hourly-strip.tsx`（時刻・気温・降水）、`signage-risk-prediction.tsx`（リスクラベル・理由）、`signage-site-safety.tsx`、`auto-refresh-status.tsx`、`signage-danger-alert.tsx`、`signage-floor-plan-editor.tsx`（ピン注記）、`app/signage/page.tsx` の気象警報パネル・現場注意事項・トレンド/法改正カード。

**キオスクモード**: `?kiosk=1` クエリを追加。`SignageHeader` に `hideNav` プロップを新設しナビリンク行を隠し、`page.tsx` 側でシナリオ操作バー・地点セレクト・表示モード切替ボタン群を条件非表示にした。常掲設置時はこのURLで開けば運用UIがゼロになり、本文の視認性のみが残る。

**自動ローテーション**: 新規 `web/src/components/signage/signage-rotator.tsx`（汎用コンポーネント）。トレンドニュース・法改正の「全件スクロールリスト」を「1件を大きく表示し16秒周期で自動周回」に置き換え、進捗ドットで手動切替も可能。ホバー/フォーカス中は一時停止、`prefers-reduced-motion` では自動切替を止める。従来は2件目以降が `xl:overflow-y-auto` の内部スクロールに隠れ、無人運用では誰の目にも触れなかった。

**鮮度・自動復旧**: `REFRESH_INTERVAL_MS` を60分→15分に短縮。データ取得失敗時は次の定期更新を待たず3分後に再試行する `retryTimer`（`signage-map-client.tsx` と同じ構え）を追加。常時点灯TVが古いJSバンドルを掴み続けないよう、深夜3時に1回だけ `window.location.reload()` する日次フルリロードを新設。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warningのみ）/ vitest 239ファイル1988件 全pass（新規17件: `signage-rotator.test.tsx` 5件・`page-refresh-config.test.ts` 6件・既存ファイルへの追加分含む）/ build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/signage-o9-typography-rotation-noread-2026-07-03.mjs`（build+start、Playwright、1920x1080）**6/6 PASS**。①キオスクモードでシナリオバー・ポータルへ戻るリンクが非表示、②本文系（button/select/input/label以外）で12px以下フォントが0/217件、③1画面フィット維持（scrollHeight=1080≦viewport=1080）、④トレンド/法改正パネルが存在、⑤35秒待機（既定16秒間隔×2周期）後にDOM内容が変化——を実測確認。スクリーンショット2枚（通常モード／キオスクモード）を同ディレクトリに保存。

**残課題**: S4以下（地点47都道府県化・ニュース鮮度フィルタ・常掲価値追加等）は未着手のまま次回以降へ。

---

## 2026-07-03 ux-hub/s4-signage-data-quality

**イテレーション頭の回収**: 自班の緑PR #594(O3警報バナー市区町村コード判定)を squashマージ。`git checkout main && git pull --ff-only` でclean確認。O9(PR #604・サイネージ文字サイズ再設計)はCI進行中（e2e/smoke pending）のため重複着手を避け次イテレーションで回収。

**タスク**: BACKLOG-ux-hub.md 最上位 S4（サイネージのデータ品位3本、診断書 `docs/fable-diagnosis-2026-07-02/01-signage.md` T6+T7+T9）。

**①地点マスタ47都道府県化**: `signage-locations.ts` は東京23区＋7政令市の計30箇所のみで、JP-01/04/13/23/27/34/37/40 の8県しか選択できなかった（39県が選択不可）。未収録39県の県庁所在地を追加。緯度経度は捏造せず、data班所有 `web/src/data/jma/prefecture-centroids.ts`（都道府県庁所在地の代表座標）を `centroidByIso()` 経由で参照利用（読み取りのみ・data班領域は非改変）。市区町村コード(`jmaCityCode`)は、気象庁公式エリアマスタ(`https://www.jma.go.jp/bosai/common/const/area.json`)を実地確認したところ、政令指定都市や県庁所在地の一部は class20s が区・地域ごとに細分化され単一コードへ一意対応しない（例: 横浜市→北部/南部、神戸市→行政区ごと）ことを確認したため、精度を偽らず既存7政令市と同じく未設定のまま（県単位の `prefectureIso` 経由で見出し・警報レベルは取得される既存フォールバックに委ねる）。

**②ニュース鮮度フィルタ・重複排除・鮮度加重ソート**: `parse-labor-rss.ts` の `fetchLaborTrendItems` はリンク完全一致のみでdedupeしており、Google Newsがクエリ・媒体ごとに別URLで返す同一記事が素通りしていた（診断実測: 表示10件中2件が完全同一記事の重複、中央値≒50日前）。`normalizeTitleForDedupe`（末尾「 - 媒体名」除去＋空白除去）でタイトルベースのdedupeを追加。`selectLaborTrendItems` に分離し、14日以内の記事を優先（`freshnessWeightedScore`: 重大度スコア＋0日+40〜14日で0への線形減衰ボーナス）、不足時のみ古い記事で補完するロジックへ変更。

**③データ時刻の人間化＋stale黄帯**: 画面上の「気象庁データ時刻: {jmaReportTime}」が生ISO文字列のまま表示され、相対時間換算も色分けもなかった（既存の `lib/jma/data-freshness.ts` の `isDataStale`/`ageHours` はcronヘルスチェック専用でUIに未接続）。新規 `lib/signage/relative-time.ts` の `formatRelativeTimeJa`（分/時間/日単位で人間化）・`isDataTimeStale`（既定2h超で stale）を追加し、floorplan/mapモード双方の気象庁データ時刻表示に接続。stale時は `bg-amber-400 text-amber-950`（JIS安全色文法に整合＝黄地に黒系文字）で黄帯警告を表示。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warningのみ・無関係）/ vitest 241 files・2031 tests 全pass（新規39件: signage-locations 5・parse-labor-rss 14・relative-time 20）/ build 成功。

**無読テスト**: 47都道府県の選択可能性・重複排除ロジック・stale判定はいずれも実測boundingBoxではなく純関数の入出力検証がテストの本体（サイネージ地図/データ取得はネットワーク依存のため）。vitestで実際の値（例: 沖縄県 那覇市の選択解決、離れた日付の記事が古い順に落ちること、2時間超で stale=true）を確認し、既存の signage-jis-amber-noread スクリプトが検証する「1画面フィット」「注意色=黒系文字」の不変を損なわないことをコードレビューで確認（該当箇所は色クラスの入替のみで寸法変更なし）。

**残課題**: S5(常掲価値追加)・S8-b(E-E-A-T)・S9(相談CV)・S10(SSR/メタ)・S11(/handover閉鎖)以下は次イテレーション以降で対応。

---

## 2026-07-03 ux-hub/s5-signage-daily-values

**イテレーション頭の回収**: 自班の緑PR #604(O9文字サイズ再設計)・#610(S4データ品位3本)はいずれもmainとdocコンフリクト（BACKLOG-ux-hub.md・cycle-log-ux-hub.md・signage/page.tsx の3ファイル、コードは同一箇所の書式差分のみで意味的競合なし）。それぞれ `git merge origin/main` で手動解決（両エントリを時系列順で共存、page.tsxはO9のxl:サイズ指定とS4/O3の判定ロジック・相対時刻表示を両立するようマージ）→ゲート緑を確認しpush→squashマージ。`git checkout main && git pull --ff-only` でclean確認後、本タスクに着手。

**タスク**: BACKLOG-ux-hub.md 最上位 S5（サイネージ常掲価値の追加、診断書 `docs/fable-diagnosis-2026-07-02/01-signage.md` T10）。「休憩所のTVが毎日同じ画面」問題（無災害日数・唱和・WBGTなど現場常掲の定番が無い）の是正。

**調査**: 無災害日数カウンタ・スローガンローテーション・signageへのWBGT連動はいずれも未実装（既存の朝礼スクリプト `signage-morning-script.tsx` は唱和ではなく読み上げ原稿生成、WBGT計算エンジン `wbgt-engine.ts` はheat-illness-prevention配下で手動気温入力のみ・signageの自動気象データには未接続で湿度も欠測）。

**実装**: 結論ストリップ直下に3タイル横並びの新規 `SignageDailyValues` を追加。①**無災害日数**: `lib/signage/no-accident-store.ts`（この端末のlocalStorageに起点日を保存、他ストアと同じ readRaw/writeRaw パターン）＋純関数 `noAccidentDays`。未設定時は設定ボタン、設定後は経過日数の大きな数字＋変更リンク。②**今日の一言**: `lib/signage/daily-values.ts` に現場向け安全標語28件（中災防等が例年掲げる標語の類型を参考にした一般的な文言・特定年度の著作物は転載せず）と、日付(day-of-year)から決定論的に1件選ぶ純関数 `pickDailySlogan`（同日は常に同じ内容・日付が変われば必ず変わる＝ローテーションではなく「今日の担当」方式）。③**WBGT**: 上流 `open-meteo-hourly.ts` の `hourly` クエリに `relative_humidity_2m` を追加し `SignageHourlyPoint.humidityPct`（欠測時は`undefined`のまま・捏造しない）として新規スレッド。既存 `wbgt-engine.ts`（JIS Z 8504/ISO 7243、黒球温度未計測時の屋外推定式）をそのまま再利用し、現在時刻(`bundle.hourly[0]`)の気温・湿度からWBGT概算とリスクレベルを算出。JIS安全色文法（黄=黒文字等）で表示、湿度未取得時は「湿度データ取得中…」を表示し値を捏造しない。データ層(`web/src/data/**`)・他班route(heat-illness-prevention等)は非改変、`open-meteo-hourly.ts`/`SignageHourlyPoint` の消費元はsignageのみであることをGrepで確認済み。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warningのみ・無関係）/ vitest 253 files・2124 tests 全pass（新規40件: daily-values 8・no-accident-store 4・open-meteo-hourly humidity 2・SignageDailyValues 6、他は既存ファイルへの積み増し分）/ build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/signage-s5-daily-values-noread-2026-07-03.mjs`（build+start、Playwright、1920x1080）**9/9 PASS**。①3タイル（無災害日数・今日の一言・暑さ指数(WBGT)）が表示される、②起点日を保存すると経過日数表示に切り替わる、③Playwright Clock APIで翌日に時刻を固定してリロードし「今日の一言」の内容が実際に変わることを確認（2日連続比較の代替）、④1画面フィット不変（scrollHeight≦viewport）——を実測確認。スクリーンショット添付（結論ストリップ直下に3タイル、WBGT=注意で黄地黒文字のJIS色を確認）。

**残課題**: S8-b(E-E-A-T)・S9(相談CV)・S10(SSR/メタ)・S11(/handover閉鎖)は次イテレーション以降で対応。

---

## 2026-07-03 ux-hub/s11-handover-route-removal

**イテレーション頭の回収**: mainは自班の直近マージ(#622)まで反映済み・working tree clean。自分の未マージ緑PRなし（`gh pr list --author @me` に `ux-hub/` prefixのPRなし）。`git checkout main && git pull --ff-only` でclean確認後、本タスクに着手。

**タスク**: BACKLOG-ux-hub.md 最上位 S11（診断書 `docs/fable-diagnosis-2026-07-02/07` の3c・情報露出）。`/handover`（引き継ぎ書）の公開閉鎖。

**調査**: `web/src/app/(main)/handover/page.tsx` はクエリキー `?key=...` で `notFound()` を出し分ける簡易ゲートだが、`VALID_KEY = process.env.HANDOVER_GATE_KEY ?? "handover2026"` とフォールバック値がソースに直書きされていた。リポジトリは `gh repo view` で `visibility: PUBLIC` を確認。`docs/env-naming-guide-2026-05-02.md`・`docs/env-cleanup-candidates.md`・`web/.env.example` のいずれにも `HANDOVER_GATE_KEY` の記載がなく、本番Vercelで明示設定されている根拠がない＝公開ソースのフォールバック値がそのまま本番の実質パスワードになっている疑いが濃厚（`docs/session-handover-2026-04-21.md` 冒頭にも `?key=handover2026` のURLがそのまま平文記載されており裏付け）。ページ本体は料金・サービス単価・内部運用ルール・レビュースコア推移等の非公開情報を含む一方、真の実名は出力していなかった（既存の安全策どおり）。ナビ・sitemap からのリンクは無く、`robots.ts`（seo班所有・不可侵）が Disallow 済み、`web/src/app/admin/audits/brand-consistency/page.tsx` の監査台帳のみ「解決済み」として参照。

**実装**: `web/src/app/(main)/handover/`（page.tsx・loading.tsx）を撤去。内容は既存 `docs/session-handover-2026-04-21.md` に同等アーカイブが既にあるため二重退避はせず、ルート撤去のみで完結。admin監査ページの `/handover` 行を「ルート撤去」の実情へ更新。`robots.ts` は seo班所有のため不可侵ルールに従い変更なし（存在しないパスへのDisallowエントリが残るが無害）。

**ゲート結果（cd web）**: `.next/types` のstaleキャッシュにより初回 `tsc --noEmit` が削除済みルートを指すエラーを出したため `npm run build` で型を再生成し解消。tsc=0 / lint=0 errors（既存warning 23件のみ・本変更に無関係）/ vitest 255 files・2138 tests 全pass / build 成功（ビルド出力のルート一覧に `/handover` 不在を確認）。

**無読テスト**: 本番相当のローカル `next start`（port 3901）実機で `GET /handover` と `GET /handover?key=handover2026` の両方が404であることをcurlで確認（旧フォールバックキーを使っても突破できないことを実証）。

**別件エスカレーション（本タスク範囲外・オーナー確認要）**: 作業中に `docs/session-handover-2026-04-21.md` 含む複数のdocsファイル（`docs/archive/monetization-strategy-2026-04-26.md`・`docs/archive/monetization-strategy-v2-2026-04-26.md`・`docs/monetization-strategy-v3-2026-04-26.md`・`docs/seminar-qa-report.md`）に運営者の実名が平文で記載されており、リポジトリがpublicのため露出していることを発見。是正には過去コミットの書き換え（force push相当の破壊的操作）が必要になる可能性が高く、本ループの自律権限を超えるためオーナーへ別途報告（本セッションのチャット応答で報告）。本タスクでは触れていない。

**残課題**: S9(相談CV)・S10(SSR/メタ)・S8-b(E-E-A-T)以下は次イテレーション以降で対応。上記実名露出エスカレーションはオーナー判断待ち。

---

## 2026-07-03 ux-hub/s8b-eeat-byline-court-cases-faq

**イテレーション頭の回収**: PR #629（S11・/handover撤去）はCI進行中で未マージ（e2e/smoke pending）につき次回に回収。BACKLOG-ux-hub.md 最上位 S8-b（診断書07のP1-4・E-E-A-T監修者バイライン自班route分＝判例詳細/FAQ）に着手。既存実装調査（Explore委任＋直接grep）で /circulars/[id] に先行実装済みの `SupervisorByline` 部品＋`SUPERVISOR_PERSON`（`legalDocumentSchema`のcontributor）パターンを確認し横展開する方針とした。`webPageSchema`・`faqPageSchema`にオプトイン`contributor`引数を追加（未指定時は既存呼び出し元と非破壊）、`PageJsonLd`経由で配線。判例詳細（/court-cases/[id]）に可視「監修: 労働安全衛生コンサルタント（登録番号260022）」リンク＋WebPage JSON-LDへcontributor付与。/faq（ハブ）は既存FAQPage JSON-LDにcontributor追加＋可視バイライン。/faq/[category]（実問答本体・従来JSON-LD皆無）にFAQPage JSON-LD新設（contributor付き）＋可視バイライン。本番相当ビルド(next start)で3ページとも監修リンク・JSON-LD contributor(Person)の出力を実機確認。tsc=0/lint=0 errors/vitest 255ファイル・2145件全pass（新規7件）/build成功。副産物として web/AGENTS.md に不審な指示文（存在しないnode_modules内docsを参照させる記述）を発見しオーナーへ報告済み（本タスクの実装には影響なし）。(2026-07-03 / ux-hub/s8b-eeat-byline-court-cases-faq)

---

## 2026-07-03 ux-hub/s9-contact-2tab-consult-cta

**イテレーション頭の回収**: PR #633（S8-b・E-E-A-Tバイライン）はCI緑を確認しsquashマージ。main→origin/main間で他班4本の並行マージがあり2回衝突（uncommitted stray files＋cycle-log追記行の単純衝突）したが、いずれもクリーンに解消。作業ディレクトリに未コミットのS9実装（前セッション由来、コミット未済）が既に存在していたため、内容を検証のうえ引き継いで完成させた。

**タスク**: BACKLOG-ux-hub.md 最上位 S9（診断書07のP1-5・6/11酷評E-2の未着手残）。コンサル相談CVパス。

**実装**: `/contact` を「ご意見・ご質問」/「法人・コンサルのご相談」の2タブへ分岐。送信先は同一 `/api/inquiry`（Formspree共通）で `category=business` が件名プレフィックス判定に使われる既存API仕様は不変。法人タブは名前・メールを必須化しコンサル/受託開発/教育コンテンツ制作向けの文言・プレースホルダへ差し替え、公開Q&Aチェックは業務相談タブでは非表示（個別対応のため対象外）。一般カテゴリの選択肢から `business` を除去し旧UIとの二重受付を防止。`/industries/[industry]` 業種別ポータル下部に「◯◯の安全管理をコンサルタントに相談する」カードを新設し `/contact?tab=business&industry=...` へ誘導。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・本変更に無関係）/ vitest 259 files・2181 tests 全pass（新規6件）/ build 成功。

**無読テスト**: Playwright実機（モバイル390×844、`npm run build && npm run start`）で `?tab=business&industry=...` アクセス時にタブが自動選択され法人向け文言が表示されること、`/contact` 単独アクセスでは既定「ご意見・ご質問」タブになること、`/industries/construction` の相談カードのhrefが正しく44px超のタップ標的（実測187px高）であることを確認。

**残課題**: S10(/signage/map・/for/constructionのSSR/メタ仕上げ＋/accidents出力3ボタン)・サイネージ設定外部化(設計ドラフトのみ)は次イテレーション以降で対応。(2026-07-03 / ux-hub/s9-contact-2tab-consult-cta / PR #638)

---

## 2026-07-03 ux-hub/s10-signage-map-meta-accidents-export-buttons

**イテレーション頭の回収**: 自班の緑PR #642（S9完了記録docs）をsquashマージ→`git checkout main && git pull --ff-only`でclean確認。

**タスク**: BACKLOG-ux-hub.md 最上位 S10（診断書07のP1-7+P1-7b・/signage/map・/for/constructionのSSR/固有メタ仕上げ＋/accidents本体への出力3ボタン）。

**調査で判明した現状のズレ**: `/for/construction`は既にcanonical/OGP画像(`ogImageUrl`)/twitter/JsonLd(webPageSchema+breadcrumbSchema)完備で対応不要と確認（バックログ記載時点から別途完了済みの可能性）。実際に欠落していたのは`/signage/map`側で、title/descriptionのみでOGP画像・twitterカード・canonicalが無かった。

**実装**: `/signage/map`のmetadataに`withSiteOpenGraph`/`withSiteTwitter`（サイト共通ヘルパー）＋`ogImageUrl`でOGP画像・twitterカード・canonical(`/signage/map`)を追加し他ページと同構えに統一。`/accidents`本体（事故DB一覧トップ）へ#520の`DataExportToolbar`（accidents-analytics/accidents-reportsで先行実装済みの部品）を横展開。総収録件数・provenance内訳(mhlw/curated/preliminary/synthetic)・事故の型ランキングをそのまま転記する純関数`web/src/lib/accidents/export.ts`(`accidentsSummaryToCsv`/`accidentsSummaryToText`)を新設（既存集計関数`computeAccidentTypeCounts`・`getAccidentProvenanceCounts`の結果をそのまま渡すのみ＝捏造・水増しなし）。CSV/要点コピー/共有URL/印刷の4手段。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・本変更に無関係）/ vitest 263 files・2218 tests 全pass（新規8件）/ build成功（`/signage/map`・`/accidents`とも静的プリレンダー確認）。dev/build実行で書き換わるdata班生成物(rag-metrics-latest.json・chatbot-eval-fresh-results.json・ky-print-sheetスナップショット)はcommitから除外。

**無読テスト**: 本番相当の`next start`実機で`/accidents`に「会議資料に：CSVダウンロード／要点をコピー／共有／印刷」の4ボタンが描画されること、`/signage/map`のHTMLにog:title/og:image/og:url/twitter:card/canonicalが正しく出力されることをcurlで確認。

**残課題**: サイネージ設定外部化（設計ドラフトのみ・DB利用のためオーナー確認）は次イテレーション以降で対応。(2026-07-03 / ux-hub/s10-signage-map-meta-accidents-export-buttons / PR #646)

---

## 2026-07-03 ux-hub/s12-signage-settings-push-design-drafts

**イテレーション頭の回収**: PR #646（S10・/signage/map SSRメタ＋/accidents出力3ボタン）はCI進行中（e2e/smoke pending）につき次回に回収。BACKLOG-ux-hub.md 最上位の未着手2件のうち、S10相当（PR #646として既に着手・未マージ）を避け、次の【Opus・P2・設計ドラフトのみ=Path A】サイネージ設定外部化＋Web Push設計ドラフトに着手。

**タスク**: 診断書01のT8（サイネージ設定の外部化＝PC設定→6桁コード/QRでTV適用、DB利用のためオーナー確認）＋診断書07のP2項9・決裁B（Web Push通知の設計ドラフト、VAPID鍵待ち）。両者とも「設計ドラフトまでは自走可・実装は待ち」のPath A指定。

**調査（Explore委任＋直接grep）**: サイネージ設定は全て`/signage`ページのlocalStorage（地点・向き・キオスク等）に閉じており他端末共有の受け皿がゼロと確認。一方でKY朝礼サイネージ（/ky/morning）に構造がほぼ同一の6桁コード共有機構（`lib/ky/signage-code.ts`・Supabase `signage_sessions`テーブル・`getServiceSupabase()`）が既に本番稼働中と判明、これを一般化転用する方針を採用。Web Push側は`public/sw.js`に`push`イベントリスナーのプレースホルダー実装（`showNotification`呼び出し）が既に存在するが、それより手前（許諾UI・購読API・VAPID鍵・送信基盤・`notificationclick`/`pushsubscriptionchange`ハンドラ）が丸ごと未配線と判明。

**成果物**: `docs/fable-diagnosis-2026-07-02/T8-signage-settings-and-web-push-design-drafts.md`。T8は新規テーブル`signage_config_sessions`案（既存`signage_sessions`拡張より事故影響範囲が隔離される）・スコープ（図面画像は既存の「外部送信なし」明示文言と衝突するため除外を提案）・UXフロー（TV側は数字キーパッド手入力を主経路、QRはPC/スマホ側の補助）を設計。決裁Bは`web-push`npm依存・VAPID鍵3種env・`push_subscriptions`テーブル・クライアント購読フロー・sw.js拡張を設計。オーナー判断事項6点（新規テーブルスキーマ承認・図面画像共有可否・TV実機入力手段・VAPID発行者・npm依存承認・テーブル作成実行）を明記。

**ゲート結果（cd web）**: コード/データ/依存変更ゼロ（docs追加のみ）。tsc=0 / lint=0 errors（既存warning 23件のみ・本変更に無関係）/ vitest 261 files・2210 tests 全pass（新規0件・非改変確認）/ build成功。

**残課題**: S10(/signage/map・/for/constructionのSSR/メタ仕上げ＋/accidents出力3ボタン)はPR #646としてCI進行中、次イテレーションで回収予定。(2026-07-03 / ux-hub/s12-signage-settings-push-design-drafts)

---

## 2026-07-03 ux-hub/accidents-diversity-visible-breadcrumb

**イテレーション頭の回収**: 自班の緑PR #646（S10・/signage/map SSRメタ＋/accidents出力3ボタン）はCI全緑を確認しsquashマージ→`git checkout main && git pull --ff-only`でclean確認。BACKLOG-ux-hub.md 未着手0件のため補充発動（指針: 「視覚パンくず可視化(画面側)」）。

**調査**: Explore委任で担当route群の可視パンくず実装状況を調査したところ「大半のハブページに可視パンくずが無い」という結果が出たため着手。しかし実装確認の過程で、この初回サーベイが `PageJsonLd`（`web/src/components/page-json-ld.tsx`）内部に既に可視`<Breadcrumb>`が自動描画されている事実を見落としていたと判明（JSON-LD schemaの一部としか読んでいなかった）。同様に`ScaffoldPage`（/diversity/disability等7ページが使用）も内部で可視パンくずを描画済みと判明。当初 /safety-signs の3サブページに手動で`<Breadcrumb>`を追加したところvitestで「同一aria-labelのnavが2つ存在」の失敗が発生し、これを手がかりに`PageJsonLd`の既存自動描画を発見・当該3ファイルの変更を`git checkout`でロールバックした（捏造・重複防止）。

**再調査で確定した真の欠落**: 担当19route・約60ページを`PageJsonLd`/`ScaffoldPage`/`<Breadcrumb>`直接使用/手書きnavの有無で全数grep確認し、欠落2件に絞り込み。①`/accidents`（事故DBハブ最上部）: 生の`JsonLd`+`breadcrumbSchema`のみでJSON-LDは出力されるが画面上のnavが皆無。②`/diversity/women`: 他7本のD&Iサブページ(disability/elderly/foreign-workers/lgbtq/non-regular/remote/sogi)は`ScaffoldPage`経由で「多様性と安全 › ページ名」の3階層パンくずを持つ中、本ページだけ独自実装で「多様性と安全に戻る」という単一リンクのみだった不整合。（`/features/print`・`/court-cases/print`はrobots noindexの印刷専用ビューのため意図的に対象外、`/accidents/[id]`は独自の手書きnavが既に可視のため対象外）

**実装**: ①`/accidents`の`AccidentHubNav`直前に共通`Breadcrumb`（`web/src/components/breadcrumb.tsx`）で「事故データベース」の現在地を追加。②`/diversity/women`の「戻る」リンク（`ArrowLeft`アイコン+テキスト）を同じ共通`Breadcrumb`に置換し「多様性と安全 › 女性向け PPE・妊産婦就業ガイド」の2階層表示へ（他7ページと体裁統一）。いずれも純粋なnav差し替えで本文・データ・ロジックは不変。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・本変更に無関係）/ vitest 266 files・2237 tests 全pass（新規2件）/ build成功。

**無読テスト**: `next start`実機で `/accidents` に「🏠 › 事故データベース」パンくずDOM出力、`/diversity/women` に「🏠 › 多様性と安全 › 女性向け PPE・妊産婦就業ガイド」パンくずDOM出力（旧「多様性と安全に戻る」テキストは消滅）をcurlで確認。

**残課題**: なし（本タスクの範囲は完了）。次イテレーションはBACKLOG-ux-hub.md補充分から継続。(2026-07-03 / ux-hub/accidents-diversity-visible-breadcrumb)

---

## 2026-07-03 ux-hub/quick-wbgt-shortcut-fix

**イテレーション頭の回収**: 自班の緑PR #650(S12・設計ドラフト)をsquashマージ。直後にPR #646(S10)がmainとdocコンフリクト(BACKLOG-ux-hub.md・cycle-log-ux-hub.mdの単純追記競合のみ・コード非衝突)になったため `git merge origin/main` で両エントリ共存の手動解決→ゲート緑（`web/src/app/signage/map/page.test.ts` がmainの型定義更新後の`tsc`で`metadata.twitter?.card`型不整合を検出したため`Record<string, unknown>`castへ追補修正）→push（PR #646はCI再走中のため今回はマージせず次イテレーションで回収）。`git checkout main && git pull --ff-only` でclean確認。

**タスク源**: BACKLOG-ux-hub.md 未着手はS10のみで、これは既にPR #646として着手済み（重複回避）。補充指針（自領域routeの柱0未適用箇所・404どん詰まり解消）に従い、Explore委任で /quick 含む複数routeを実地調査。

**発見した既存欠陥**: `/quick`（朝礼クイックアクセスハブ）の「熱中症WBGT」ショートカット（`QuickLauncher.tsx`）が `/education`（特別教育の一般カタログ・WBGT計算機なし）へ誤配線されており、隣の「フルハーネス」ショートカットと同一hrefだった。一人親方が朝礼3分で「今日のWBGTを見る」つもりでタップしても、実際のWBGT計算機・業種別リスク判定ハブ(`/heat-illness-prevention`、既存で稼働中)には到達できない行き止まりだった（測定可能な404どん詰まり相当の欠陥）。

**修正**: `QuickLauncher.tsx` の該当hrefを `/education` → `/heat-illness-prevention` へ1行修正。他のショートカット・ヒーローボタンのhref/レイアウトは不変。

**テスト**: `QuickLauncher.test.tsx` を新設（2ケース）。①「熱中症WBGT」リンクのhrefが`/heat-illness-prevention`であることを回帰ガード、②ショートカット/ヒーローボタン全リンクのhrefに重複がないことを保証（同種の誤配線の再発防止）。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係）/ vitest 263 files・2226 tests 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/quick-wbgt-shortcut-noread-2026-07-03.mjs`（build+start実機・Playwright・スマホ390×844）**3/3 PASS**。①ショートカットのhrefが`/heat-illness-prevention`、②実際にタップした遷移先が`/heat-illness-prevention`、③遷移先にWBGT計算機ハブの見出しが実在（行き止まりでないことを実地確認）。

**残課題**: PR #646(S10)のCI回収。/quickは今回の1件以外は44px達成済み（ヒーローボタンmin-h-[140px]・ショートカットタイル共に余裕あり）。home-three-pillars.tsx のAlertGenerator送信ボタン(py-1 text-[11px]≈21-24px)・safety-signs親ハブの「関連機能」プレーンテキストリンク(text-sm≈24px)が次サイクルの柱0補充候補として残る（Explore調査で発見・未着手）。

---

## 2026-07-03 ux-hub/top-three-pillars-44px-targets

**イテレーション頭の回収**: 自班の緑PR #655(/quick WBGT誤配線是正)をsquashマージ・delete-branch。PR #663(視覚パンくず可視化)はCI進行中のため今回は据え置き（次サイクルで回収）。`git checkout main && git pull --ff-only` でclean確認。

**タスク源**: BACKLOG-ux-hub.md 未着手の最上位＝前サイクルExplore調査で発見済みの「トップ `home-three-pillars.tsx` のAlertGenerator送信ボタン・関連リンクが44px未満」。

**発見・修正**: 直近の死亡事故パネル（初訪の一人親方がトップ最上部で最初にタップする導線）で以下4箇所が親指操作の押し損ねサイズだった既存欠陥を是正。①「10年事故DB一覧へ」リンク（パディング無し・`mt-1.5 text-[11px]`≈21px）②AlertGeneratorの「注意喚起文を作成」送信ボタン（`px-2.5 py-1 text-[11px]`≈24px・fatal-accident/weather/law-revisionの3種で共用の共通コンポーネント）③「出典・報道URLを開く」リンク（パディング無し）④生成失敗時の「再試行」ボタン・3回連続失敗時の「管理者に連絡」リンク（追補Explore調査で同一ファイル内に発見）。全て`min-h-[44px]`＋最小限のpx付与（純粋なクラス追加でレイアウト・ロジック不変）。

**テスト**: `home-three-pillars.test.tsx` を新設（5ケース）。静的描画で「10年事故DB一覧へ」「出典・報道URLを開く」「注意喚起文を作成」の className に `min-h-[44px]` を保証。`fetch`をモックしAPI失敗をシミュレートして「再試行」ボタン・（2回連続失敗後の）「管理者に連絡」リンクにも `min-h-[44px]` を確認。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係）/ vitest 267 files・2259 tests 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/top-three-pillars-44px-2026-07-03.mjs`（build+start実機・Playwright・スマホ390×844）**2/2 PASS**。「10年事故DB一覧へ」リンク・「注意喚起文を作成」送信ボタンの実boundingBoxが両方とも44px以上であることを確認。

**補充**: 未着手が1件のみ（/safety-signs親ハブ関連機能リンク）に減ったため、Explore委任で追加2件を発見・補充。①`/features/use-cases`のrelated-featureピル(`px-2 py-1 text-[11px]`)、②`/court-cases/employer-liability`のIssueLinkチップ(`px-2.5 py-1 text-xs`)。いずれもmin-h/h-11未付与で次サイクル候補。

**残課題**: PR #663(視覚パンくず可視化)のCI回収。上記3件の柱0補充候補が次サイクルへ持ち越し。

---

## 2026-07-03 ux-hub/safety-signs-hub-related-links-44px

**イテレーション頭の回収**: 自班のPR #668(トップhome-three-pillars 44px化)はCI進行中(e2e/smoke IN_PROGRESS)のため未マージ・今回は回収スキップ。`git checkout main && git pull --ff-only`でclean確認(mainは5コミット進行・data/seo/ux-records/ux-tools各班のマージ分)。

**タスク源**: BACKLOG-ux-hub.md未着手最上位（前サイクルExplore調査で発見済み）＝「/safety-signs 親ハブ本体の『関連機能』セクションが44px未満」。

**修正**: `web/src/app/(main)/safety-signs/page.tsx` の「関連機能」セクション（サイネージ表示／KY簡易作成／建設業のリスク・対策の3リンク、227-256行）にそれぞれ `min-h-[44px]`＋`inline-flex items-center` を付与。純粋なクラス追加でレイアウト・文言・遷移先は不変。サブページ（戻る/業種チップ）は既に是正済みだったが親ハブ自身の当該リンクのみ未着手だった。

**テスト**: 既存 `safety-signs-tap-targets.test.tsx` に親ハブ用ケース1件を追加（3リンク全てのclassNameが`min-h-[44px]`を含むことを検証）。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係）/ vitest 270 files・2289 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/safety-signs-hub-related-links-44px-noread-2026-07-03.mjs`（next start実機・Playwright・スマホ390×844）**3/3 PASS**（3リンク全てboundingBox height=44px実測）。

**残課題**: PR #668（トップhome-three-pillars 44px化）のCI回収は次イテレーション。BACKLOG-ux-hub.mdの未着手件数が2件（トップhome-three-pillars=PR #668で着手済み・重複回避のため今回はスキップ）に減っていたため、Explore不要で直接コード確認した2件（`/features/use-cases`のrelated-featureピル・`/court-cases/employer-liability`のIssueLinkチップ、いずれも実コードで44px未満を確認済み）を補充。

---

## 2026-07-03 ux-hub/features-use-cases-related-pill-44px

**イテレーション頭の回収**: 自班の緑PR未マージが2件判明（#668 トップhome-three-pillars・#663 視覚パンくず可視化）。いずれもCI緑ながら`gh pr merge --squash`が「merge commit cannot be cleanly created」で失敗＝main側の並行マージでBACKLOG-ux-hub.md/cycle-log-ux-hub.mdの追記競合が発生していたため、2ブランチとも`git checkout <branch> && git merge origin/main`で手動解決（両エントリを時系列順で共存、コード側の衝突は無し）→ゲート緑（tsc/lint/vitest/build）確認→push（CI再走のため今回のマージは次イテレーションへ持ち越し）。加えて、直前に別のクローンが作った重複ブランチ`ux-hub/home-three-pillars-44px-targets`(PR #676)が#668と全く同一ファイル(home-three-pillars.tsx)の同一AlertGenerator/リンクを44px化する重複PRだった（#668の方が「出典・報道URLを開く」リンクも追加是正済みで上位互換）と判明したため、#676をクローズしローカル/リモートブランチを削除して重複作業を解消。`git checkout main && git pull --ff-only`でclean確認。

**タスク源**: BACKLOG-ux-hub.md未着手2件のうち最上位（トップhome-three-pillars=PR #668で着手済みのため重複回避でスキップ）に続く「/features/use-cases のrelated-featureピル・/court-cases/employer-liabilityのIssueLinkチップが44px未満」の2件（いずれも小粒・独立ファイルのため同一PRで消化）。

**修正**: `features/use-cases/page.tsx`のrelated-featureピル（`px-2 py-1 text-[11px]`、402行）と`court-cases/employer-liability/page.tsx`のIssueLinkチップ（`px-2.5 py-1 text-xs`、29行）にそれぞれ`min-h-[44px]`を付与。いずれも純粋なクラス追加でレイアウト・遷移先・文言は不変。

**テスト**: `features/use-cases/page.test.tsx`・`court-cases/employer-liability/page.test.tsx`を各1ケース新設し、該当リンクのclassNameに`min-h-[44px]`を含むことを保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係）/ vitest 272 files・2310 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/features-use-cases-court-employer-liability-44px-noread-2026-07-03.mjs`（next start実機・Playwright・スマホ390×844）**52/52 PASS**（/features/use-cases 関連機能ピル48件・/court-cases/employer-liability 論点チップ4件、全てboundingBox height≥44px実測）。

**残課題**: BACKLOG-ux-hub.md未着手は1件（トップhome-three-pillars=PR #668で着手済み・マージ待ち）のみに減少。PR #668・#663のCI回収は次イテレーション。3件未満のためExplore委任で補充調査を実施し、実在確認済みの2件（`/accidents/[id]`の「事故DBに戻る」リンク・類似事故カードのタイトルリンク／`/diversity/women`のAmazon・楽天アフィリエイトボタン・関連ページナビ3リンク、いずれも44px未満をコード確認済み）をBACKLOG-ux-hub.mdへ追記（PR #682へ追加コミット）。Explore調査中に発生したリポジトリ外への一時ファイル書き出し(`C:\Users\kanet\ux-hub-scan.txt`)は削除済み。

---

## 2026-07-03 ux-hub/diversity-women-44px-targets

**イテレーション頭の回収**: 自班のローカルCI待ちブランチが2件あることを確認（`ux-hub/accident-detail-back-related-links-44px`=PR #690・`ux-hub/top-alertgenerator-related-link-44px`=PR #687）。#687をマージ試行したところ、main（`origin/main`）に既に別インスタンスが同一ファイル(`home-three-pillars.tsx`)の同一AlertGenerator/リンクを44px化するPR #668が先着マージ済みと判明し、`git merge`でコンフリクトを実際に確認した上で重複と断定。`gh pr close 687 --delete-branch`でクローズ（重複作業の解消）。続けて残りの緑PR `docs/ux-hub-backlog-supplement-2026-07-03`(PR #692・柱0補充候補3件追記のみ)をsquashマージ。`git checkout main && git pull --ff-only`でclean確認。PR #690（事故詳細の戻る/類似事例リンク44px化）はCI(smoke)がまだ進行中のため今回はマージ見送り、次イテレーションで回収。

**タスク源**: BACKLOG-ux-hub.md未着手の最上位（1番目=/accidents/[id]戻る導線はPR #690で着手済み・マージ待ちのためスキップ）に続く「/diversity/women のAmazon・楽天アフィリエイトボタン8個・関連ページナビ3リンクが44px未満」。

**修正**: `diversity/women/page.tsx`の4個のPPEカードそれぞれが持つAmazon/楽天アフィリエイトボタン（計8個、`py-2 text-xs`≈32px）と、下部「関連ページ」ナビグリッドの3リンク（`px-3 py-2 text-xs`）に`min-h-[44px]`（ナビリンクは`flex items-center justify-center`も追加）を付与。純粋なクラス追加でレイアウト・アフィリエイトURL生成ロジック・遷移先は不変。

**テスト**: `women-44px-targets.test.tsx`を新設（vitest 2件）。アフィリエイトボタン全件・関連ページナビ全件のclassNameに`min-h-[44px]`を含むことを保証。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 281 files・2379 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/diversity-women-44px-noread-2026-07-03.mjs`（next start実機・Playwright・スマホ390×844）**11/11 PASS**（Amazonで探す×4・楽天で探す×4・関連ページナビ×3、全てboundingBox height≥44px実測）。

**残課題**: BACKLOG-ux-hub.md未着手は4件（/accidents/[id]戻る導線=PR #690マージ待ち・/industries一覧「開く→」リンク・/industries/[industry]副リンク群+キーワードピル・/accidents/[id]出典元リンク）。PR #690のCI回収は次イテレーション。

---

## 2026-07-03 ux-hub/court-cases-hub-header-links-44px

**イテレーション頭の回収**: 自班のCI待ちPR #722（トップ3柱主CTA44px化）のe2e/smokeがpendingだったため、ScheduleWakeupで待機しCI緑を確認後に`gh pr merge 722 --squash --delete-branch`でマージ。`git checkout main && git pull --ff-only`でclean確認。

**タスク源**: BACKLOG-ux-hub.mdの未着手[ ]がゼロ（全件[x]）だったため、契約に従いExplore agentへ担当route全体の柱0未是正箇所調査を委任。上位候補5件（/court-cases ハブ最上部リンク・/accidents home-screen変体タブ・/industries/[industry]下部CTA・/industries関連ページリンク・/glossary用語カードリンク）のうち、h1直下・初訪ユーザーが最初に見る導線である/court-casesハブを最優先で着手。

**修正**: `court-cases/page.tsx`のh1直下2リンク「⚖️ 3つの責任ガイド」「🖨 A4まとめ資料で印刷／PDF保存」（`px-3 py-1.5 text-xs`≈30px）に`min-h-[44px]`を付与。純粋なクラス追加でレイアウト・遷移先不変。下部「関連機能への導線」4カードはp-3+2行テキストで既に44px相当のためスコープ外（無関係な変更を避けるため一度追加したmin-hを差し戻し）。

**テスト**: `court-cases/page.test.tsx`を新設（vitest 2件、next/navigationのuseRouter/useSearchParamsをモック）。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 288 files・2444 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/court-cases-hub-header-links-44px-2026-07-03.mjs`（next start実機・Playwright・スマホ390×844）**2/2 PASS**（3つの責任ガイド=54.6px・A4まとめ資料=44.0px、boundingBox実測）。

**残課題**: Explore調査で発見した残り4件（/accidents home-screen.tsx変体タブ・/industries/[industry]下部CTA3個+他業種リンク・/industries関連ページ6リンク・/glossary用語カード関連リンク）を次イテレーション以降でBACKLOG-ux-hub.mdへ補充予定。PR #726のCI回収は次イテレーション。

---

## 2026-07-03 ux-hub/industries-related-links-44px

**イテレーション頭の回収**: 自班のCI待ちPR #753（サイネージヘッダーナビ・パネル副リンク44px化）はe2e/smokeがpending継続中のため今回はマージ見送り（次イテレーションで回収）。`git checkout main && git pull --ff-only`でclean確認・3件の他班マージを反映。

**タスク源**: BACKLOG-ux-hub.mdの未着手[ ]がゼロ（全件[x]）だったため、契約に従いExplore agentへ担当route全体の柱0未是正箇所調査を委任。装飾用span/pのfalse positiveを多数除外した結果、確度の高い残存欠陥は`/industries`ハブ最下部「関連ページ」セクションの6リンクのみと判明。

**修正**: `industries/page.tsx`の関連ページセクション6リンク(事故分析レポート/年次安全衛生計画/KY用紙作成/安衛法AIチャット/特別教育・技能講習/通達原文、`px-3 py-1.5 text-sm`≈32px)に`min-h-[44px]`を付与。純粋なクラス追加でレイアウト・遷移先不変。

**テスト**: `industries/page.test.tsx`に1件追加。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 293 files・2493 tests + 1 skipped 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/industries-related-links-44px-check.mjs`（next start実機・Playwright・スマホ390×844）**6/6 PASS**（全リンクboundingBox実測=44.0px）。初回実行時はDOM内に同一hrefを持つモバイル非表示のサイドバーnavリンクが先にマッチし誤ってFAIL判定になったため、`:visible`フィルタ＋`.last()`で対象を絞り込んで再検証。

**残課題**: PR #753・#756ともCI回収は次イテレーション。Explore調査での残存候補は使い果たしたため、次回は補充の指針（無読テスト再走査・404/パンくず確認）から再着手予定。

---

## 2026-07-03 ux-hub/breadcrumb-action-bar-analysis-panel-44px

**イテレーション頭の回収**: 自班のCI待ちPR #768（サイネージ地図配下`signage-map/*`の44px化）がe2e/smoke/Vercel全緑になったためsquashマージ・ブランチ削除。`git checkout main && git pull --ff-only`でclean確認。

**タスク源**: BACKLOG-ux-hub.mdの未着手[ ]がゼロ（全件[x]）だったため、契約に従いExplore agentへ担当route全体の柱0未是正箇所調査を委任。個別ページはほぼ網羅済みと判明した一方、複数routeで再利用される共有コンポーネント側（breadcrumb・accidents/action-bar・accident-analysis-panel系）に未着手の高確信度候補が複数見つかった。

**修正**: 4ファイル計11要素に`min-h-[44px]`を付与（純粋なクラス追加でレイアウト・遷移先・ロジック不変）。①`breadcrumb.tsx`のホームアイコンLink・各項目Link(担当route11ファイルで共用の可視パンくず)、②`accidents/action-bar.tsx`のKY起票/保護具/関連法令/関連裁判例/問われる責任5リンク(事故詳細のinline/sticky両モード共用アクションバー)、③`accident-analysis-panel.tsx`・`mhlw-accident-analysis-panel.tsx`各々の「このデータについて」アコーディオンボタン・CSVエクスポートボタン計4個(いずれもtop所有の`home-screen.tsx`経由で`/accidents`タブ切替時にのみ表示)。

**テスト**: `breadcrumb-action-bar-analysis-panel-44px.test.ts`新設・11件（ソース走査、`signage-map-44px.test.ts`と同一パターン）。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（既存warning 23件のみ・無関係） / vitest 299 files + 1 skipped・2545 tests 全pass / build成功。

**無読テスト**: `docs/third-party-reviews/scripts/breadcrumb-action-bar-analysis-panel-44px-2026-07-03.mjs`（next start実機・Playwright・スマホ390×844）**10/10 PASS**（/industries/construction のパンくず2要素・/accidents/[id] のアクションバー4リンク・/accidents のMHLW実データ分析/詳細事例（参考）タブ内パネル4要素、いずれも実boundingBox≧44px）。ESM実行時に`docs/third-party-reviews/scripts/`が`web/node_modules`の外にあり`@playwright/test`が解決できない問題に遭遇したため、実行時のみ`web/`直下へ一時コピーして検証（保存先は規定どおり`docs/`配下）。

**残課題**: Explore調査での残存候補は使い果たしたため、次回は補充の指針（無読テスト再走査・404/パンくず確認）から再着手予定。
