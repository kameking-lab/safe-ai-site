# Lighthouse実測（13.4.0・2026-06-11・各ページ モバイル(標準スロットリング)/デスクトップ）

形式: perf/a11y/bp/seo、LCP秒、CLS。品質基準は CLAUDE.md「Performance 90+ / Accessibility 90+」。

## モバイル（ほぼ全滅 — 14ページ中90+は1ページのみ）
- / … 95/96/100/100 LCP2.2s CLS0.064 ← 唯一の合格
- /accidents … **49**/97/100/100 **LCP6.6s CLS0.393**
- /equipment-finder … **52**/96/100/100 LCP6.3s **CLS0.853**
- /court-cases … **53**/97/100/100 LCP6.3s **CLS0.313**
- /site-records … **53**/96/100/100 LCP6.3s **CLS0.680**
- /laws … **66**/97/100/100 **LCP10.4s** CLS0.064
- /chemical-ra … **68**/97/100/100 LCP7.2s CLS0.156
- /ky … **69**/97/100/100 LCP7.1s
- /for/construction … **72**/96/100/100 LCP7.1s
- /chatbot … **74**/97/100/100 LCP6.7s
- /articles … **75**/96/100/100 LCP6.3s
- /heat-illness-prevention … **75**/96/100/100 LCP6.5s
- /whats-new … **75**/96/100/100 LCP6.4s
- (404ページ計測2本はスコア対象外)

## デスクトップ（全て88〜99で問題なし）
- 最低 /accidents 88、他は93〜99。LCP 0.9〜1.7s、CLS≦0.1。

## S-4. モバイルLCP 6〜10秒・CLS最大0.853の構造原因（実測に基づく診断）
- **症状(事実)**: Lighthouseのlayout-shifts検出ノードが全ページ共通で `main#main-content` そのもの（=本文ブロック全体が後から出現/差し替わる）。モバイルLCPが機能ページ一律6〜7秒（/laws 10.4s）に対しトップだけ2.2s。メインスレッド合計1.4〜2.4s（Script Evaluation 0.5〜0.8s + Style&Layout 0.3〜0.9s）。gtag.js(166KB・未使用39%≒66KB)が初期ロードに同梱。
- **実害**: Core Web Vitals「不良」(LCP>4s)としてモバイル検索順位に直接効く。現場のスマホ(中位機)では体感はさらに悪い。CLS 0.3〜0.85は「タップ直前にボタンが動く」レベル。
- **直し方(優先順)**: ①本文をServer Componentで初期HTMLに含める（localStorage依存部分だけクライアント子コンポーネント化し、`mounted`ゲートで main 全体を隠す実装を排除）。②動的部分はスケルトンを同寸で先置きしCLSゼロ化。③gtagを next/script `strategy="lazyOnload"` 化。④/laws・/circulars等の巨大リスト（後述: モバイルDOM高39,461px）は初期N件+遅延描画。
- **規模感**: S（直し方①が本丸。ページ群を順に、修正M〜L）。

## A-5. アクセシビリティ93〜97で頭打ち
- **症状(事実)**: 全28本でa11y 93〜97。100に届かない一律減点はコントラスト・aria関連（個別auditはJSON参照）。h1欠落ページ(01-seo B-1)と重なる。
- **直し方**: h1是正と合わせ、Lighthouse a11y指摘をページ単位で潰す（safety-toneのWCAG機械検証は実装済みなのでレガシー直書き色が残党）。規模感B。

生JSONの保存場所（ローカル計測機）: %TEMP%/lh/*.json（28本）。
