# サイネージ再設計 実装記録（2026-05-26 / feat/signage-redesign）

Phase B 監査（docs/signage-deep-audit-2026-05-25/）の改修案から、**クラウド非依存・賛否なし・手戻りゼロ**の
P0/P1 を実装。本番Supabase障害（Phase A）の解消を待たずに投入できる項目のみを対象とした。

## 実装した改修

### P0-1 大画面フルスクリーン化（最重要）
- 問題（実測）: `/ky/morning` が `(main)` レイアウトの AppShell（サイドバー＋ヘッダー＋`max-w-7xl`=1280px）配下にあり、1920px画面でコンテンツ1280px・左右黒帯、フォント48px据え置き。CLAUDE.md「サイネージはフルスクリーン前提」と乖離。
- 対応: ルートを `app/(main)/ky/morning/` → `app/ky/morning/` へ移動（`/signage` と同じく `(main)` 外へ）。**URLは `/ky/morning` のまま不変**（route group は経路に影響しない）。AppShell外装が外れ真のフルスクリーン化。
- さらに見出し/作業/リスク/目標を `clamp()` 流体タイポに変更（大画面ほど拡大、最大 work detail 6rem=96px / リスク 4.5rem）。
- 実測（Playwright・本番相当ローカル）: 1920pxで content幅 1280px → **1920px**（黒帯解消）。375/768pxは横スクロールなし維持。
- スクショ: docs/signage-deep-audit-2026-05-25/screenshots/after-largescreen-1920.png

### P0-2 画面スリープ抑止（Wake Lock）
- `lib/signage/use-wake-lock.ts`: Screen Wake Lock API でサイネージ表示中の画面暗転を抑止。非対応ブラウザは無害フォールバック、前面復帰時に再取得。`record !== null` の間有効。

### P1-1 フルスクリーンAPI導線
- ヘッダーに「⛶ 全画面 / 🗕 全画面解除」トグル。`requestFullscreen`/`exitFullscreen`、`fullscreenchange` に状態同期。

### P1-4 多言語トグル（固定ラベル辞書・API不要）
- `lib/signage/signage-labels.ts`: 日/英/越/中/タガログ/インドネシアの6言語で固定UIラベルを辞書化。
  KY本文（作業内容・危険・対策）は職長入力の日本語のまま（本文AI翻訳併記は P2）。
- `lib/signage/signage-prefs.ts`: 選択言語を localStorage 保持。
- ヘッダーに🌐言語セレクト。実測: ja「本日の主な作業」→ vi「Công việc chính hôm nay」切替確認。
- スクショ: after-vietnamese.png

### P1-7 印刷モード
- ヘッダーに「🖨 印刷」。`window.print()`＋`print:` クラスで操作系を非表示・白背景化し、掲示板貼り出し用にA4出力。

## 非対象（次フェーズ）
- 6桁コード堅牢化(QR併設 P1-2)・表示モード追加(P1-3)・時刻自動切替(P1-6)・サウンド強化(P1-5): 本セッションは大画面/スリープ/全画面/多言語/印刷の確実な土台を優先。次PRで継続。
- 打合せ書サイネージ・KY本文翻訳・PWAオフライン: 中期(P2)。
- 本番Supabase障害(6桁共有/同期): オーナー対応（docs/g1-verification-2026-05-25/fix.sql）。

## 品質ゲート
- TypeScript: tsc --noEmit 0 errors
- ESLint: 0 errors（変更ファイル無警告）
- テスト: 781 passed（既存772 + 新規9: signage-labels 6 / signage-prefs 3）
- ビルド: 成功（/ky/morning は静的プリレンダー ○ として生成）

## 新規/変更ファイル
- 移動: app/(main)/ky/morning/page.tsx → app/ky/morning/page.tsx
- 変更: components/ky-morning-signage.tsx
- 新規: lib/signage/{signage-labels.ts, signage-labels.test.ts, signage-prefs.ts, signage-prefs.test.ts, use-wake-lock.ts}
- 監査スクリプト: scripts/signage-device-audit.mjs（3ビューポート実測・再利用可）
