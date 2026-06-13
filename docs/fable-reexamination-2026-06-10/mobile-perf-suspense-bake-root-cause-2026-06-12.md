# 再精査: モバイル実速度の「構造的限界」は loading.tsx のサスペンド焼き込みだった（2026-06-12）

## 前任（Opus 4.8 時代〜前セッション）の判断
1. 「lantern simulated LCP の残り支配項は**初期HTMLのscriptタグ群＋render-blocking CSS**。さらなる削減は**ページ別エントリ分割**（home-screen の laws/accidents 分離）が次の一手」（c1 doc 前セッション版・残課題欄）。
2. /accidents の間欠 CLS 0.25 は「AccidentExtrasPanel を dynamic(ssr:false→ssr:true) にすれば解消」とコメントに記載（home-screen.tsx）。だが ssr:true 化後の final1-4 計測でも 4回中2回 CLS 0.254 が再現しており、**是正されていないままセッションが中断**していた。
3. サイト横断の Lighthouse 監査（docs/site-critique-2026-06-11）は「layout-shifts 検出ノードが全ページ共通で main#main-content」=**症状**を正確に記録していたが、原因は「mountedゲートでmainを隠す実装」と推定していた。

## Fable の発見
- 静的HTMLの直接検査で `<!--$?--><template id="B:0">`（フォールバック）→ hidden セグメント → `$RC` スワップという**サスペンド再生が全静的ページのHTMLに焼き込まれている**ことを確認。原因は (a) `(main)/layout.tsx` 直下の `await auth()`、(b) Suspense 境界内 client コンポーネントのモジュール非同期ロード、(c) `dynamic(ssr:true)`=React.lazy のSSRサスペンド。これらが `app/loading.tsx` の全ルート共通境界に集約されて焼き込まれていた。
- 「初期HTMLのscriptタグ群が支配項」は誤り。**本文が $RC スワップまでペイントされない**ことが simulated LCP 残り約2.5sの主因（スクリプト群はその窓に入っていただけ）。エントリ分割は不要だった。
- 間欠CLSの正体は「初回ペイント vs $RC スワップのレース」。同一ビルド・同一HTMLでも計測ごとに出たり出なかったりする（Layout Instability attribution で保護具セクションの 613px→6,900px 押し下げを直接捕捉）。
- ssr:true 化が効かなかった理由: 境界が**入れ子**（loading.tsx ≻ ページ直下 Suspense ≻ dynamic の自前境界）で、内側だけ畳んでも外側の焼き込みが残るため。
- 副次発見: loading.tsx 削除でビルドエラーとして**沈黙していた CSR ベイルアウト**が表面化（/for/construction の useSearchParams）。共通 loading 境界は「エラーを症状ごと飲み込む装置」にもなっていた。

## 是正内容
- app/loading.tsx 削除 + 動的ユーザー向け11セグメントへ個別 loading.tsx 再配置 / auth() を UserMenuSlot（同寸フォールバック）へ隔離 / ページ直下 Suspense 除去（/accidents・/laws）/ AccidentExtrasPanel 静的 import 化 / role-anchor-scroller の useSearchParams 排除 / PWAアイコン palette 圧縮 / Geist preload 停止。
- 結果: /accidents 53→91・/laws 71→92・/whats-new 74→94（3回連続・CLS 全て 0.000）。**この根治はサイト全域（約2,600ページ）の静的HTMLに自動で効く**。
- 再発防止: mobile-perf-regression スクリプトに static-shell ガード（境界数≤2・スケルトン焼き込み検出）+ 実測CLSガードを追加。16/16 PASS。

## 教訓（次の同型調査のため）
- Lighthouse スコアの前に**静的HTMLを直接読む**（`curl | grep '<template id="B:'`）。サスペンド焼き込みは1行で検出できる。
- 「計測ごとに出たり消えたりするCLS」はレース。原因はHTML側で決定的に存在する。
- Next.js App Router で `loading.tsx`（特にルート直下）は静的ページに対して**無料ではない**。境界内のあらゆる非同期（auth・client モジュールロード・React.lazy）がスケルトン焼き込みに化ける。

## Opus 4.8 再開時の回収・再検証（2026-06-13）
Fable ループ中断で WIP 退避していた本ブランチ（fix/mobile-perf-structural-c1）を回収。origin/main を通常マージで取り込み、ゲート全通過（tsc 0 / lint errors 0 / vitest 1578 pass / build 成功）。

**重要な落とし穴（記録）**: マージ後の最初の検証で mobile-perf-regression が 13/16〜11/14 と振れ、「もっと見る不展開・a11y バナー dismiss 不発・タブURL非同期」を一時「回帰」と誤認しかけた。真因は **`.next` ビルドの内部不整合**（HTMLが参照する chunk hash が disk 上に無く、JS/CSS が 404・`text/plain` で配信され**ハイドレーション自体が起きていなかった**）。`.next` を消して**クリーン再ビルド**した瞬間、同一コードで **16/16 PASS** に回復。
→ 教訓追加: **挙動の回帰検証の前に必ずクリーン再ビルド**（古い/部分的な `.next` は chunk 不整合で偽の「ハイドレーション失敗」を生む）。stale サーバーがポート3000に残留している可能性も毎回確認（`netstat -ano | grep :3000`）。

**Lighthouse モバイル実測再確認（lighthouse 13.4.0・localhost prod build・warm cache・2026-06-13）**:
| ページ | perf | LCP(ms) | FCP(ms) | TBT(ms) | CLS |
|--------|------|---------|---------|---------|-----|
| /accidents | 91 | 3464 | 1354 | 10 | 0.000 |
| /laws | 91 | 3526 | 1355 | 9 | 0.000 |
| /whats-new | 92 | 3374 | 1205 | 8 | 0.000 |

全ページ perf 90+ / CLS 0.000（基準 perf90+・CLS0.1以下を満たす）。Fable 実測（91/92/94・CLS 0.000）と整合。mobile-perf-regression 16/16 PASS（static-shell 境界≤2・実測CLS<0.05・もっと見る30→91・タブURL同期・a11y dismiss すべて緑）。→ **本番 main へ反映可と判断、PR 化。**
