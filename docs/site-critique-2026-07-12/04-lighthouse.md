# 04 Lighthouseモバイル実測（本番・主要10ページ・C-1後＝FT-D2前ベースライン）

**重大度サマリ**: A=1（/chemical-ra Perf 79・LCP4.1s）・B=2（/search CLS0.185/TBT628ms、/ky/paper h1欠落+A11y93）。C-1の主張（モバイル実速度）は本番で解消を独立確認。

生JSON要約: lh/summary.json（フルJSONは容量9.5MBのためリポジトリ非収載。再計測手順は本文の計測環境を参照）。

- 対象: 本番 https://www.anzen-ai-portal.jp/ （リポジトリ /home/user/safe-ai-site は読み取りのみ、コード変更なし）
- 前回基準: docs/site-critique-2026-06-11/（05-lighthouse.md, 06-top10.md, 01-seo-technical.md, lh/summary.json）

## 計測環境（任務1）

- Lighthouse 13.x CLI（scratchpad に npm 導入）+ Playwright Chromium（/opt/pw-browsers/chromium-1194/chrome-linux/chrome）
- モバイル・デフォルト simulated throttling。`--chrome-flags="--headless=new --no-sandbox --proxy-server=http://127.0.0.1:34697 --ssl-version-max=tls1.2"`
- **本番サイトに対して直接計測**（ローカルビルド代替は不要だった）。ただしサンドボックスの egress プロキシ経由のため、Chrome の TLS1.3 ハンドシェイクがプロキシで reset される問題があり `--ssl-version-max=tls1.2` で回避（TLS検証は有効のまま。プロキシCAはNSSストアに登録）。simulated throttling がネットワーク条件を正規化するため比較可能性は高いが、絶対値には計測経路差が乗りうる。
- 生JSON: scratchpad/lh/prod-*.json（10本）

## 任務1: Lighthouseモバイル実測結果（本番・2026-07-12）

| ページ | Perf | A11y | BP | SEO | LCP | CLS | TBT | 前回モバイルPerf(6/11) |
|---|---|---|---|---|---|---|---|---|
| / | 93 | 96 | 100 | 100 | 2.5s | 0.000 | 229ms | 95 (LCP2.2s/CLS0.064) |
| /accidents | **91** | 97 | 100 | 100 | 2.9s | 0.000 | 207ms | **49** (LCP6.6s/CLS0.393) |
| /laws | **92** | 97 | 100 | 100 | 2.8s | 0.000 | 188ms | **66** (LCP10.4s) |
| /law-navi | 96 | 97 | 100 | 100 | 2.2s | 0.000 | 181ms | (前回計測なし) |
| /whats-new | **93** | 96 | 100 | 100 | 2.4s | 0.000 | 253ms | **75** (LCP6.4s) |
| /chemical-ra | **79** | 97 | 100 | 100 | **4.1s** | 0.041 | 320ms | 68 (LCP7.2s/CLS0.156) |
| /chatbot | **94** | 97 | 100 | 100 | 2.8s | 0.059 | 122ms | 74 (LCP6.7s) |
| /ky (→/ky/paper) | **91** | 93 | 100 | 100 | 1.2s | 0.052 | 362ms | 69 (LCP7.1s) |
| /education | 93 | 96 | 100 | 100 | 2.6s | 0.000 | 202ms | (前回計測なし) |
| /search | 71 | 97 | 100 | 69* | 2.7s | 0.185 | 628ms | (前回計測なし) |

*/search の SEO 69 は `noindex, follow` 意図設定による is-crawlable 減点（検索結果ページのnoindexは正当。欠陥ではない）。

### C-1（モバイル性能構造対策）の判定: **大幅改善・ほぼ達成**
- 前回「14ページ中90+は1ページのみ・LCP6〜10s・CLS最大0.853」→ 今回計測10ページ中 **8ページが Perf 91〜96**、LCP は全ページ 1.2〜2.9s（chemical-ra のみ4.1s）、**CLS はコア8ページで 0.000〜0.059**。
- 最悪だった /accidents 49→91（LCP 6.6s→2.9s、CLS 0.393→0.000）、/laws 66→92（LCP 10.4s→2.8s）。C-1 の SSR 化＋loading.tsx 撤去の効果が本番でも再現していることを独立計測で確認。
- 残る弱点: ① /chemical-ra Perf 79（LCP 4.1s — 10ページ中唯一 LCP>4s 手前の「要改善」帯、CLS 0.041）。② /search Perf 71（CLS 0.185・TBT 628ms — クライアント検索インデックス構築のコスト）。③ /ky/paper は TBT 362ms と A11y 93 が下位。

