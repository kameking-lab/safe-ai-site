# 09 3デバイス検証（軸9）

検証: Playwright(Chromium) で本番 /accidents・/accidents-reports を 375/768/1920px 実レンダリング。スクショ: screenshots/。

## 実測
| ページ | 375px | 768px | 1920px |
|---|---|---|---|
| /accidents | 横スクロールなし | なし | なし |
| /accidents-reports | 横スクロールなし | なし | なし |

両ページとも3デバイスでレイアウト崩れゼロ。

## 観察
- /accidents-reports のグラフ（recharts等）はモバイルでも収まっている。
- スマホでの分析ダッシュボードは情報量が多く、初見の導線（「まず業種を選ぶ」等）の明示で「気軽さ」が上がる（軸12）。
- Lighthouseは当環境にCLI/Chrome無く未測定（捏造せず）。本番Lighthouse実行を推奨。

## 優先度
- P2: モバイル初見導線の明示（軸12 と連動）。レイアウト自体は良好。
