# 柱C-1 モバイル実速度の構造是正 第1弾（2026-06-12 完了）

対象: /accidents・/laws・/whats-new（流入上位3ページ）
完了条件: Lighthouse モバイル perf 90+ / CLS 0.1 以下を実測記録 → **達成（3ページ×3回連続 perf 91-94 / CLS 0.000）**
計測方法: lighthouse 13.4.0 `--only-categories=performance --form-factor=mobile --screenEmulation.mobile`、headless Chrome、localhost 本番ビルド（`npm run build`→`npm run start`）。全ラン主要値は `lh/summary.json` に保全（生JSONは baseline + 最終 fable6-8 のみ保持）。

## 結果サマリー

| ページ | baseline | 前セッション末(final1-4) | **最終(fable6-8, 3回連続)** |
|---|---|---|---|
| /accidents | perf 53 / LCP 11.8s / CLS 0.393 | perf 73〜87 / CLS 0.254が4回中2回 | **perf 91・91・91 / LCP 3.5s / CLS 0.000** |
| /laws | perf 71 / LCP 12.1s / CLS 0.064 | perf 88〜89 / CLS 0 | **perf 91・92・92 / LCP 3.3〜3.5s / CLS 0.000** |
| /whats-new | perf 74 / LCP 7.4s / CLS 0.064 | perf 91〜92 / CLS 0 | **perf 94・94・94 / LCP 3.0〜3.1s / CLS 0.000** |

## 真因（Fable 5 検収で特定）: Suspense サスペンドの静的HTML焼き込み

前セッション終了時点で /accidents に「4回中2回 CLS 0.254」が残っていた。Layout Instability API の attribution 実測で、**保護具セクション（ページ下部のはずの要素）が初回ペイント時に viewport 内 613px 位置に描画され、その後 6,900px 下へ押し出される**瞬間を捕捉。静的HTMLを直接検査すると `<!--$?--><template id="B:0">` … `$RC("B:0","S:0")` という**サスペンド境界の再生（フォールバック先行ペイント→後続バイトの hidden セグメントへのスワップ）が全ページの静的HTMLに焼き込まれていた**。

メカニズム（Next.js 16 / React streaming SSR）:
1. `(main)/layout.tsx` 直下の `await auth()` と、Suspense 境界内の client コンポーネントのモジュール非同期ロードが、プリレンダーの初回フラッシュまでに解決しない。
2. 未解決の境界はフォールバックを流し、本文は hidden セグメント + `$RC` スクリプトとして**後続バイト**に出力される。静的ページではこれがそのままHTMLに保存される。
3. ブラウザはフォールバック（`app/loading.tsx` のスケルトン）を先にペイントし得るため、(a) 本文ペイントがHTML後方の $RC 到達まで遅延（**LCPの正体**。前任が「初期HTMLのscriptタグ群＋render-blocking CSSが支配項」とした残り2.5sの大半はこれ）、(b) ペイントと$RCのレースで**間欠CLS**（同一ビルドでも計測ごとに出たり出なかったりした理由）。

### 是正内容（本セッション・サイト全域に効く）
1. **`app/loading.tsx` 削除**: 全ルート共通の Suspense 境界が諸悪の根源（どのページのどんな非同期も、この境界の焼き込みに化ける）。静的ページはプレンダー済みHTML+prefetch で十分速く、共通スケルトンは不要。動的レンダリング（ƒ）のユーザー向け11セグメント（/accident-news・/account・/faq/[category]・/chemical-database/[cas]・/chatbot/share/[id]・/pricing/success 等）にのみ**個別の loading.tsx** を再配置（ナビ即時フィードバックの維持。静的ページを含むセグメントには置かない）。
2. **`await auth()` の隔離**: (main)/layout を同期化し、認証は `<Suspense fallback={ログインボタン}>` の極小 UserMenuSlot ×2 に隔離。フォールバック=静的HTMLの焼き込み内容と同一のゲスト表示=同寸スワップでシフトゼロ。動的ページのログイン表示は従来どおり。
3. **ページ直下 Suspense の除去**（/accidents・/laws）: client コンポーネントのモジュールロードで境界がサスペンドするため、本文を包む Suspense は静的シェルからの除外装置として機能してしまう。サスペンドし得る非同期が無い本文は境界で包まない。
4. **`dynamic(ssr:true)` → 静的 import**（AccidentExtrasPanel）: `next/dynamic` は ssr:true でも React.lazy としてSSR初回パスでサスペンドする。データ本体（事故340KB・死亡災害DB 2.4MB）は内部の呼び出し時 dynamic import のままなので、コンポーネント本体の静的 import 化でバンドルは増えない。
5. **`useSearchParams` の最後の取り残し是正**（role-anchor-scroller）: loading.tsx 削除でビルドエラーとして表面化（これまで境界に飲み込まれ「/for/construction 全体がクライアント差し替え」として沈黙していた）。マウント後 window.location 読みに変更。
6. **PWAアイコン palette 圧縮**: manifest 経由で Chrome が起動時に取得する icon-192x192.png (42.8KB) が LCP クリティカル窓内の最大単一リソースだった → 15.2KB（apple-touch 38.9→13.2KB・icon-512 205→69.5KB も同時に）。
7. **Geist フォントの preload 停止**: latin 専用フォントで日本語UIの LCP 要素（CJK）には寄与しないのに、woff2 30KB が全ページの LCP クリティカル窓に入っていた。display:swap のまま preload のみ停止（数字・英字は描画後スワップ。実測CLSへの影響なしを fable6-8 で確認）。
8. **不採用**: `experimental.inlineCss`（render-blocking CSS 35KB の往復排除を狙ったが、HTML肥大で FCP 1.36→1.67s に悪化）。

### 前セッション実装分（WIP回収・検収済み）
1. **/laws SSR化**: 初期データを server page から `initialRevisions` prop で注入。`useSearchParams` 全廃、URL復元はマウント後 `window.location` 読み（深いリンク互換は回帰テストで担保）。
2. **CLS構造是正**: a11y案内バナーを「SSR常時描画＋pre-paintスクリプトで既読なら非表示」へ（baseline CLS 0.393 の主因だった全ページ共通 main 押し下げを排除）。
3. **バンドル除去**: `site-stats.ts` 静的リテラル化（`site-stats.test.ts` がビルドゲートで実データとの整合を機械検証）。`company-profile` の zod 依存除去。死亡災害DB(2.4MB)・accident-service・revision-service のデータ本体を呼び出し時 dynamic import 化。gtag lazyOnload。
4. **法令コーパス1.4MBのclient同梱根治**: chatbot-panel が UI 選択肢のためだけに `@/data/laws` を import → `law-category-options.ts` に分離。**Link 先ルートの RSC プリフェッチで client 参照チャンクが落ちるため、/chatbot へリンクする全ページが1.4MBを被弾していた**。
5. **"/" プリフェッチ汚染根治**: home-three-pillars の事故全件・法改正・JMA警報の静的 import を server 選定（`lib/home-three-pillars-data.ts`）+小さな結果の props 渡しへ。全ページのロゴリンク経由の巻き添えを排除。
6. **同型横展開**: risk-prediction-panel・signage-accident-education の事故データ静的 import を遅延化。
7. **タブ駆動データロード**: /accidents の事故データ取得を list/analysis タブ表示時のみに。クロス集計は IntersectionObserver 可視時ロード。
8. **/laws 二重フェッチ排除**・**home-screen 死コード削除（1155行→546行）**: 旧 variant 6種を削除し laws/accidents の2 variant のみに。

## 挙動回帰の担保
- `docs/third-party-reviews/scripts/mobile-perf-regression-2026-06-12.mjs` = **16チェック 16/16 PASS**（実行は web/ へコピーして `node tmp-regression-run.mjs`。docs 配下からは web/node_modules が解決できないため）。
  - 既存10: /laws JS無効SSR描画・?tab=chat/?status= 深いリンク・もっと見る30→91全件・/accidents ?tab=/?acc_type= 復元とURL同期・a11yバナーSSR表示/閉じる/pre-paint非表示
  - 新規6: **static-shell ガード**（3ページの静的HTMLに loading 焼き込みが無い・Suspense境界はUserMenu2個以下）・**/accidents 実測CLS<0.05×2回**（CPU 4x・モバイルviewport）・ハイドレーション後の保護具セクション残存
- vitest 全件 + tsc + lint + build（実行結果はPR参照）
- role-anchor-scroller.test.tsx を window.location 方式に追随（6テスト維持）

## 残課題（第2弾へ）
- 残り11ページ（baseline perf 49〜75）の再計測。**app/loading.tsx 削除・auth隔離・フォントとアイコンはサイト全域に効くため、大半は無修正で大幅改善しているはず**。ページ固有の残課題（/equipment-finder CLS 0.853 等）の個別是正と、各ページの「ページ直下 Suspense + useSearchParams」の同型パターン点検（real useSearchParams 残存: court-cases-browser・equipment-finder-client・law-search-panel・contact 等≒20ファイル。各ページ内の局所境界なので焼き込み範囲は当該ページに限定されるが、同じ手当で更に上がる）。
- /chatbot 自身・/law-search（法令コーパスがclient検索の本体）の実測と是正。
- 警告: **app/loading.tsx を復活させないこと**（全ページの静的HTMLにスケルトン焼き込みが再発する）。回帰スクリプトの static-shell ガードが検出する。
