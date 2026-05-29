# 12. 実装ロードマップ

## Stage 1（本セッションPhase B）— 1画面フィットの核
- P0-1 fit-to-screen 自動縮尺（実寸測定→scale、表示系で有効化、純関数＋hook）
- P0-2 横長2カラム化（orientation/aspect分岐）
- P1-1 `100dvh`化 / P1-2 タップ標的44px / P1-3 余白縦圧縮
- 検証: fit計算の単体テスト＋Playwrightで主要サイズのオーバーフロー解消を確認

## Stage 2 — 仕上げ（P1-4/P2）
- P1-4 大画面の余白縮小・文字最大化
- P2-1 縦型最適化 / P2-2 6言語幅 / P2-3 スマホ縦の余白圧縮

## 設計（fit-to-screen）
```
useFitToScreen(contentRef, { enabled }):
  measure cw=content.scrollWidth, ch=content.scrollHeight（transformは layout box に影響しないので測定可）
  vw=window.innerWidth, vh=window.innerHeight（dvh実寸）
  scale = clamp(min(vw/cw, vh/ch), MIN, MAX)
  recompute on: resize, orientationchange, record変更, lang変更, 啓発内容変更（ResizeObserver併用）
  apply: content に transform: scale(scale); transform-origin: top center
         外側ラッパは h:100dvh + overflow:hidden（表示系）/ スマホ縦は無効＝自然スクロール
enabled = (orientation landscape) || (innerWidth >= 768)
print時は無効（通常フロー）
```

## 完了条件（共通）
1. `npm run build`成功 / `lint` 0 errors / `tsc` 0 errors
2. `npm run test` 既存924維持＋新規pass
3. 主要デバイスで scrollHeight ≤ viewport（オーバーフロー解消）をPlaywright確認
4. 既存8機能・サイネージ既存機能（フルスクリーン/スリープ抑止/6言語/印刷/共有）非破壊
5. branch→PR→CI緑→squash merge→本番確認

## リスクと停止条件
- transform縮尺で操作ボタン位置がずれる/印刷が崩れる → 印刷はフィット無効、操作はフィット外（固定ヘッダ）に配置
- スマホ縦で文字が小さくなりすぎ → スマホ縦はフィット無効＝自然スクロール（可読維持）
- 既存設計崩壊リスク高 → 段階展開（まずP0-1のみ→確認→P0-2）

## ビルドコスト
- CSS/クライアント計算主体。静的ビルドへの影響極小。新規依存・env追加なし。
