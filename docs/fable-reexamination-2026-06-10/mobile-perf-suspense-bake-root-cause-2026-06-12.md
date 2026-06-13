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
