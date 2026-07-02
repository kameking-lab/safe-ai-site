# モバイル perf 第2弾 再計測ハーネス（横断計測・ops）

診断 07 P1-6「柱C-1 第2弾＝残り11ページのモバイル perf 再計測」を、静穏なマシンで
1コマンド再現するための計測ハーネス。第1弾（`c1-mobile-perf-structural-2026-06-12.md`
の docs/site-critique-2026-06-11/）はアドホックに lighthouse を叩いていたのを固定化した。

## 使い方

```
# 自己検証のみ（Chrome/サーバ不要・CI でも 0 終了）
node scripts/mobile-lighthouse.mjs --dry-run

# 本実行（別ターミナルで本番ビルドを起動してから）
cd web && npm run build && npm run start   # ← 端末A（:3000）
node scripts/mobile-lighthouse.mjs         # ← 端末B（リポジトリ直下）
```

出力は `docs/perf/mobile-wave2-<YYYY-MM-DD>/`（summary.md / summary.json / 各生JSON）。
perf<90 のページを summary.md 末尾に列挙する。

## 計測条件（第1弾と同一・比較可能性のため厳守）

`lighthouse --only-categories=performance --form-factor=mobile --screenEmulation.mobile`、
headless Chrome、localhost 本番ビルド、各ページ 3 回の中央値。

## 実行タイミングの制約（重要）

- **他レーンが停止した静穏なマシンで実行する。** 6レーン同時稼働下では CPU 競合で
  Lighthouse の数値が無効化する（第1弾は「3回連続安定」を完了条件にしていた）。この
  制約のため BACKLOG-ops.md の本タスク（line 13）は「ハーネス整備済・実測は静穏窓待ち」
  の状態で保留している。
- lighthouse は `npx` 経由で都度取得（package.json 依存は追加しない＝env/依存の独断
  追加禁止＝Path A を侵さない）。未導入なら `--dry-run` が導入手順を案内する。

## 既定の対象11ページ

第1弾で 90+ 達成済みの `/accidents`・`/laws`・`/whats-new` を除外し、診断 07 C-1 残課題で
名指しされた問題ページ（`/equipment-finder` CLS 0.853・`/chatbot`・`/law-search`）を核に
主要ユーザー導線を採録:

`/` `/chatbot` `/law-search` `/court-cases` `/equipment-finder` `/chemical-database`
`/chemical-ra` `/education` `/e-learning` `/contact` `/accidents-analytics`

`--targets path/to/targets.json`（`["/path", ...]` 形式）で上書き可。
