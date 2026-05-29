# 01. 現状のレスポンシブ実装把握

## 1.1 構成

- ルート: `web/src/app/ky/morning/page.tsx`（`(main)`外＝独立フルスクリーン）→ `components/ky-morning-signage.tsx`（354行）
- 動的子: `components/accidents/signage-accident-education.tsx`（本日の安全啓発・日替わり・6言語見出し）
- 補助: `lib/signage/use-wake-lock.ts`（スリープ抑止）, `lib/signage/signage-labels.ts`（6言語ラベル）, `signage-prefs.ts`（言語保持）
- データ: localStorage `ky-record` または `?code=6桁`（クラウド共有・8秒ポーリング）

## 1.2 現状のレスポンシブCSS（良い点）

- ルート: `min-h-screen`、内側 `mx-auto w-full max-w-[2200px] flex flex-col px-[clamp(1rem,3vw,4rem)] py-[clamp(0.75rem,2vw,2rem)]`（max幅キャップ＋clampパディング＝良い）
- **フォントは全面 `clamp(min, Nvw, max)`**（流体タイポグラフィ）:
  - 日付 `clamp(1.5rem,3.2vw,3.5rem)` / 主作業 `clamp(1.8rem,5vw,6rem)` / リスク見出し `clamp(1.4rem,3.6vw,4.5rem)` / 対策 `clamp(1.1rem,2.6vw,3rem)` / 行動目標・指差呼称 `clamp(1.8rem,4.5vw,5.5rem)` / カウントダウン `clamp(4rem,10vw,12rem)`
- 機能: フルスクリーンAPI同期・スリープ抑止(useWakeLock)・6言語トグル・印刷モード(`print:`)・唱和カウントダウン＋ビープ

→ **横方向（幅）のスケールは良好**。文字可読性は高い。

## 1.3 現状の弱点（核心）

1. **高さ（縦）が一切考慮されていない**。フォントは`vw`（幅）のみ依存し、セクションは`mt-6`＋`p-6/p-8`＋`rounded-3xl`で縦に積層。viewport高さに対して内容高さが固定的に大きく、**ほぼ全デバイスで縦オーバーフロー**（doc00実測）。
2. `min-h-screen`=100vh（`100dvh`でない）→ モバイルのURLバー分ズレ。
3. `vw`ベースclamp＋`max-w-[2200px]`の不整合: 超ワイドでは文字が早期に上限到達＋コンテンツ幅が2200pxで止まり左右に大余白（高さは埋まらない）。
4. ヘッダ操作（言語/全画面/印刷/編集に戻る）が`text-xs px-3 py-1`＝タップ標的<44px。
5. レイアウトは常に単一カラム（縦長には合うが、横長・ワイドでは高さが余りつつ縦に溢れる二重の非効率）。

## 1.4 Tailwind breakpoints利用状況

- `sm:p-8` が各カードに付く程度。`md/lg/xl` のレイアウト分岐や orientation 分岐、`grid` 多段、`dvh`/`vh`、container queries は**未使用**。
- → デバイス別の縦フィット戦略が無く、単一カラム＋vwフォントのみで全デバイスを賄おうとしている。

## 1.5 結論

土台（流体フォント・max幅・フルスクリーン・6言語・印刷）は良好で**壊さず活かす**。不足は**「高さ方向の単一画面フィット」**の一点に集約される。改修は orientation/サイズに応じた縦フィット（自動縮尺 or 2カラム＋余白圧縮）＋`dvh`＋タップ標的で、既存の良い部分を保ったまま実現できる。
