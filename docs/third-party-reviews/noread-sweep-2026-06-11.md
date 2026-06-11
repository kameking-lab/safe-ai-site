# 全ページ無読巡回＋無読テスト一括検収（柱0・2026-06-11）

タスク「リスクマップ(/risk)＋未着手の残り全ページ巡回＋全機能の無読テスト一括検収」の巡回・検収部の記録。
/risk本体の改修は `risk-visual-first-2026-06-11.md` を参照。

## A. 一括検収: 保存済み無読テスト11本の再実行 = **229/229 PASS（回帰ゼロ）**

prodビルド（main bffa0b48 + /risk改修ブランチ）に対し `docs/third-party-reviews/scripts/` の全スクリプトを再実行:

| スクリプト | 結果 |
|---|---|
| visual-language-noread-2026-06-10 | 8/8 |
| ky-noread-2026-06-10 | 12/12 |
| heat-noread-2026-06-10 | 23/23 |
| records-noread-2026-06-11 | 20/20 |
| records-noread-phase2-2026-06-11 | 21/21 |
| chemical-noread-2026-06-11 | 18/18 |
| accidents-courts-noread-2026-06-11 | 23/23 |
| chatbot-noread-2026-06-11 | 23/23 |
| judgment-noread-2026-06-11 | 26/26 |
| whats-new-laws-noread-2026-06-11 | 27/27 |
| learning-foreign-noread-2026-06-11 | 28/28 |
| risk-noread-2026-06-11（本イテレーション新設） | 11/11 |

計 240/240。サイネージ(18/18)は PR #497 未マージのため対象外（マージ後の次回検収で実行）。

## B. 残り全ページ巡回（スクリーニング実測）

スクリプト: `scripts/noread-sweep-2026-06-11.mjs`（スマホ390×844・prod server）。
ファーストビューの機械計測: 最大フォントpx / 80px四方以上の図版(G) / 可視文字数 / 80字超段落数 /
結論カードrole=status(S) / h1数。スクリーニング合格 = デカ視覚要素あり かつ 文字量≦1200 かつ 長段落≦1。
**自動判定はスクリーニングであり、最終判定はスクショ目視＋起票で行った。**

```
route                                 font  big  chars  paras  status  h1  judge
/risk                                  48    G    235     0      S     1   PASS（本イテレーション改修）
/ky                                    48    -    426     0      S     2   PASS（柱0済・h1=2のみ残）
/features                              22    G    462     0      -     1   PASS（図版あり）
/risk-prediction                       22    -    228     0      -     2   FAIL
/safety-diary                          22    -    331     0      -     2   FAIL（冒頭が説明ブロック）
/safety-diary/new                      22    -    331     0      -     2   FAIL
/ky/list                               22    -    256     0      -     1   FAIL
/ky-examples                           22    -    287     0      -     1   FAIL
/law-search                            22    -    374     0      -     1   FAIL
/circulars                             22    -    252     0      -     1   FAIL
/law-hierarchy                         22    -    401     1      -     1   FAIL
/safety-signs                          22    -    426     1      -     1   FAIL
/education-certification               24    -    265     0      -     1   FAIL
/education-certification/finder        22    -    316     0      -     1   FAIL
/education                             22    -    389     1      -     1   FAIL
/strategy/plan-generator               22    -    470     0      -     1   FAIL
/subsidies                             22    -    389     1      -     1   FAIL
/subsidies/calculator                  22    -    207     0      -     1   FAIL
/treatment-work-balance                22    -    518     1      -     1   FAIL
/treatment-work-balance/plan-builder   22    -    413     0      -     1   FAIL
/mental-health-management              22    -    544     1      -     1   FAIL
/mental-health                         22    -    542     1      -     1   FAIL
/bcp                                   22    -    594     2      -     1   FAIL
/organization                          22    -    434     1      -     1   FAIL
/glossary                              22    -    349     0      -     1   FAIL
/faq                                   22    -    395     0      -     1   FAIL
/guides                                22    -    577     2      -     1   FAIL
/industries                            30    -    600     2      -     1   FAIL
/diversity                             22    -    507     1      -     1   FAIL
/accident-news                         22    -    460     1      -     1   FAIL
/accidents-reports                     22    -    557     1      -     1   FAIL
/accidents-analytics                   22    -    620     1      -     1   FAIL（※下記モーダル）
/stats                                 30    -    634     3      -     1   FAIL
/chemical-database                     22    -    589     1      -     1   FAIL
/goods                                 24    -    381     0      -     1   FAIL
/quick                                 22    -    345     0      -     1   FAIL
/handover                              22    -    395     0      -     1   FAIL
/insurance                             22    -    563     1      -     1   FAIL
/heat-illness-prevention/r7-compliance 22    -    520     0      -     1   FAIL
/heat-illness-prevention/poster        22    -    433     0      -     1   FAIL
/resources                             22    -    518     1      -     1   FAIL
/leaflet                               22    -    445     1      -     1   FAIL
/notifications                         22    -    419     0      -     1   FAIL
/favorites                             22    -    555     1      -     1   FAIL
/newsletter                            22    -    435     0      -     1   FAIL
```

42画面が不合格 → BACKLOG柱0に**9バッチ＋是正1件**として起票（1バッチ=1イテレーションの粒度）。
計測上の注意: /accidents-analytics 以降の数値は下記モーダルがオーバーレイした状態で計測している
（いずれも判定を覆す差ではない）。

## C. 巡回で見つけた重大事項（柱1是正起票）

**FeedbackGateModal（フィードバック懇願モーダル）が全画面割込み**:
- `(main)/layout.tsx` 常駐。利用スコアが閾値を超えると**どのページでも**マウント1.5秒後に
  `aria-modal` の中央モーダル（背景暗転）で「ご意見・シェアで応援・次回でいい(7日)」を表示。
- スイープ実測でモバイル初回ビューを**完全に覆う**ことを確認（`/accidents-analytics` で発火）。
  発火条件が利用量ベースのため、KY記入中・朝礼前・帳票印刷前など**作業の文脈を選ばず割り込む**。
- ヘビーユーザーほど頻繁に中断される設計 = 「毎朝の習慣にする」方針と正面衝突。
- 是正方針（起票済み）: 非ブロッキングな下部バナー/トーストへ降格・作業画面（/ky系・/signage系・
  印刷ビュー）では出さない・「7日延期」より長い既定スヌーズ。

## D. 横断の小発見

- 多重h1: /risk-prediction・/safety-diary(系)・/ky ハブで h1=2 を実測（/riskは本イテレーションで是正済み）。
  各バッチ改修時に同時是正する（柱C-7にも記載あり）。
- PWA service worker により Playwright `page.route` モックは `serviceWorkers: "block"` 必須
  （risk-noread で実証・スクリプト内コメントにも明記）。
- ポート3000に前イテレーションの古いprodサーバーが残留していると**古いビルドを検証してしまう**。
  検収前に必ずkill→再起動（このイテレーションで実際に踏んだ。EADDRINUSEで気づける）。
