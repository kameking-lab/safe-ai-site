# FeedbackGateModal 非ブロッキング化（柱1是正・第三者レビュー §C 対応）

- 日付: 2026-06-13（Opus 4.8 ループ）
- 対象: `web/src/components/FeedbackGateModal.tsx` / `web/src/lib/usage-tracker.ts`
- 起票元: `docs/third-party-reviews/noread-sweep-2026-06-11.md` §C
- ブランチ: `fix/feedback-gate-nonblocking`

## ペルソナと指摘（再掲・§C より）

**ペルソナ**: 毎朝KYと朝礼でこのサイトを使う現場監督。ヘビーユーザー。スマホ片手で
作業前の数分に素早く入力したい。我慢の限界＝「作業の途中で操作を止められること」。

**指摘（実測）**:
- `(main)/layout.tsx` 常駐の `FeedbackGateModal` が、利用スコア閾値超で**どのページでも**
  マウント1.5秒後に `aria-modal` 中央モーダル（背景暗転 `bg-slate-900/60`・`z-[60]`）を出す。
- ノーリードスイープ実測で、`/accidents-analytics` 表示時にモバイル初回ビューを**完全に覆った**。
- 発火条件が利用量ベースのため、KY記入中・朝礼前・帳票印刷前など**作業の文脈を選ばず割り込む**。
  ヘビーユーザーほど頻繁に中断される設計で、「毎朝の習慣にする」というサイト方針と正面衝突。

## 改善（実装）

1. **非ブロッキングな下部バナーへ降格**（中央モーダル→PWAインストール促しと同じ作法）
   - `aria-modal` 廃止・背景暗転（`bg-slate-900/60`）廃止・フォーカストラップなし。
   - `role="dialog"` + `aria-labelledby` は維持（スクリーンリーダー向け）。
   - 位置 `fixed inset-x-3 bottom-[calc(var(--mobile-bottom-nav-h,0px)+12px)] z-30 max-w-md`。
     既存の `--mobile-bottom-nav-h`（globals.css・PWA促しと共用）でモバイル下部ナビと重ならない。
   - `z-30`（従来 `z-[60]`）= 最前面を奪わない。本文操作を一切ブロックしない。
   - 内容を1メッセージ＋3アクション（改善提案・シェア・あとで）にダイエット。タップ対象 `min-h-[44px]`。

2. **作業画面では出さない**
   - `usage-tracker.ts` に純関数 `isWorkContextPath(pathname)` を新設。
     `/ky` 系・`/signage` 系を「完全一致 or `<prefix>/` 始まり」で抑止。
     `/ky-examples`（事例の**閲覧**）のような接頭辞一致の別ルートは対象外＝表示を許可。
   - コンポーネントは `usePathname()` を購読し、作業画面に**遷移した瞬間に即座に引っ込める**
     （`if (!open || isWorkContextPath(pathname)) return null;`）。
   - 印刷ビューは `print:hidden` で消える（A4帳票出力に懇願バナーが混入しない）。
   - 補足: `/signage` 系・`/ky/morning` は `(main)` レイアウト外のため元々マウントされないが、
     防御的に純関数側でも明示抑止（将来 `(main)` 配下に移っても安全）。

3. **既定スヌーズを 7 日 → 30 日**（`SNOOZE_DAYS_DEFAULT`）
   - 閉じる（X）・「あとで」・フッター動線すべて引数なしの既定スヌーズに統一。
   - ヘビーユーザーほど早く再表示される問題を緩和。

## 再評価（ペルソナ目線）

- バナーは画面下部に小さく出るだけで、KY/朝礼/印刷の作業を妨げない。
- 作業画面（/ky・/signage）では一切出ない → 「作業中に止められる」我慢の限界に抵触しない。
- 一度閉じれば30日は出ない → ヘビーユーザーの毎朝の習慣を壊さない。
- 「これなら使い続けられる」と言える状態に到達。

## 無読テスト（社長指示・全レビュー必須）

本件は安全状態の表示ではなくフィードバック導線のため、JIS安全色文法・「いまの状態/次にやること」
の対象外。ただし**作業の邪魔をしない**ことが本質なので、無読相当の検証として「3秒見て本文操作が
止まっていないと分かるか」を機械検証に落とし込んだ（下記 Playwright・バナーが画面下半分にあり
本文を覆わない / 全画面暗幕 inset-0 要素が0個）。

## 検証

- ユニット: `usage-tracker.test.ts` に12件追加（`isWorkContextPath` の /ky・/signage・接頭辞一致除外・
  null安全・通常ページ許可、`SNOOZE_DAYS_DEFAULT===30` と既定スヌーズ）。`npx vitest run` 全 pass。
- ゲート: `npx tsc --noEmit`=0 / `npm run lint`=errors 0 / `npm run build`=成功。
- Playwright 実機（prod server・モバイル 390×844・`serviceWorkers:"block"`）: **7/7 PASS**
  - /accidents: バナー表示 / `aria-modal` なし / `bg-slate-900/60` なし / `print:hidden` あり /
    `bottom-` で下部固定 / 画面下半分に位置（本文非被覆）
  - /ky/paper: バナー非表示
  - スクリプト: `docs/third-party-reviews/scripts/feedback-gate-verify-2026-06-13.mjs`（恒久保存）

## 申し送り

- バナーとPWAインストール促しは同じ `z-30` / 下部位置のため、両方の発火条件が同時に満たされると
  重なる可能性がある（実際は発火条件が異なり稀）。気になれば一方をやや上にオフセットする余地あり。
- 「2度と表示しない」完全 dismiss（`dismissFeedbackGate`）は未配線のまま（既存仕様踏襲）。
  今回は既定スヌーズ30日で中断頻度を十分下げたため見送り。
