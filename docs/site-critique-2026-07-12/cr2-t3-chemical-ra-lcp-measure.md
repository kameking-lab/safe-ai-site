# CR2-T3: /chemical-ra LCP 是正 — 実測記録

## 診断（本番 2026-07-12・04-lighthouse.md より）
- /chemical-ra: Perf **79** / LCP **4.1s** / TBT 320ms / CLS 0.041（10ページ中唯一の要改善帯）
- LCP要素の 87% が Render Delay。主因は 2 点（+ 1 点は据え置き）:
  1. page.tsx が `<Suspense fallback={<PageSkeleton/>}>` で `ChemicalRaPanel` を包み、
     panel が client の `useSearchParams()` を呼ぶため、静的プリレンダーが Suspense
     フォールバックへ落ち、静的HTMLに「スケルトン先行→$RCスワップ」が焼き込まれていた
     （STEP1フォーム＝LCP要素がスワップ完了まで描画されない）。/laws C-1 と同一構造。
  2. `chemical-slim-index.json`（≈679KB）が panel/UnifiedChemicalSearch から静的 import
     され、ファーストビューの client チャンクに同梱＝ハイドレーションの主スレッド負荷。

## 是正
- `page.tsx`: `ChemicalRaPanel` の `<Suspense>` ラッパを撤去（+ 未使用 import 削除）。
- `chemical-ra-panel.tsx`: `useSearchParams()` を撤去し、マウント後に
  `new URLSearchParams(window.location.search)` から読む（/laws・laws-page-client と同方針）。
  → STEP1 フォーム（LCP要素）が静的HTMLに含まれ、フォールバックスワップが消える。
- ③ 679KB の JSON 遅延は、`mhlw-chemicals-slim.ts` の同期API（化学監査テスト
  mhlw-chemicals-slim.test.ts が同期に全件比較）を壊すため今回は据え置き。
  Suspense/useSearchParams 撤去だけで Perf90+ を達成したため不要と判断。

## 実測 before → after
| 指標 | before(本番 07-12) | after(local `next start`・LH12 simulated mobile) |
|---|---|---|
| Perf | 79 | **90** |
| LCP | 4.1s | 3.5s |
| TBT | 320ms | **40ms** |
| CLS | 0.041 | 0.052 |

- 静的HTML検証: 是正後の `.next/server/app/chemical-ra.html` に STEP1 フォーム
  （`chemical-onebox-input`・「物質名・CAS番号・製品名を入力」ラベル・STEP表記）が
  含まれ、旧「化学物質リスクアセスメントを読み込み中」スケルトンは 0 件。
- 注: local `next start` は本番CDN/圧縮/キャッシュを持たないため絶対値は本番と差が出る
  （04章の計測でも他ページは本番の方が良好）。本番再実測はマージ・デプロイ後に実施。
- 回帰: vitest 3147 pass / build成功 / lint 0 error。#874 の結論ファーストUIは不変。
