# Review Loop 14 Report — アクセシビリティ（新キャンペーンLoop 9）

**日付**: 2026-04-26
**通算ループ**: 14（新キャンペーンLoop 9）
**観点**: WCAG 2.1 AA・スクリーンリーダー・キーボード操作・多言語

## 修正前スコア
4.87 / 5.0

## 主な検出問題

A. **AiSummaryModal に role="dialog" / aria-modal なし** → SR が「ダイアログ」と認識しない
A. **モーダル閉じるボタンに aria-label なし**（`×` のみ）→ SR が読み上げない
A. **モーダルが Esc キー・背景クリックで閉じない** → キーボード操作の閉路がない
A. **モーダル閉じるボタンの色コントラスト** text-slate-400 → 4.3:1（AA未達）
B. **法令検索 Input に aria-label なし** → placeholder のみ（SR で意図が伝わりにくい）
B. **UserMenu ドロップダウンに role="menu" なし** → メニュー項目の意味論不足
C. **ContactForm 業種選択が `<label>` ベース** → `<fieldset>/<legend>` でグルーピングすべき

## 実施した修正

| ファイル | 内容 |
|---|---|
| `law-search-panel.tsx` | `AiSummaryModal` に `role="dialog" aria-modal="true" aria-labelledby="ai-summary-title"` 追加。背景クリック onClose、Esc キー useEffect 追加。閉じるボタン `aria-label="このダイアログを閉じる"`、`min-h/w-[44px]`、`focus-visible:ring-2 ring-emerald-500 ring-offset-2`、色を `text-slate-600` に強化（コントラスト改善） |
| `law-search-panel.tsx` | フリーワード検索・条番号検索 `InputWithVoice` に `aria-label="法令フリーワード検索" / "条番号で検索"` 追加 |
| `user-menu.tsx` | ドロップダウンに `role="menu" aria-orientation="vertical"`、各項目（マイページ／プラン／ログアウト）に `role="menuitem"` 付与 |
| `ContactForm.tsx` | 業種ラジオ群を `<fieldset><legend>` 構造に変更（グルーピング意味論を明確化） |

## 確認事項
- header.tsx の reload ボタンは Loop 8 で `min-h/w-[44px]` 適用済
- user-menu.tsx は Loop 3 で Esc キー対応済
- tab-navigation.tsx は Loop 3 で focus-visible:ring 対応済
- スキップリンク・grobals.css の `prefers-reduced-motion` は別途レビュー対象

## 残課題
- フォーム inputs の `id`/`htmlFor` 厳密チェック（InputWithVoice ラッパーが id を伝播しない問題）
- 多言語 lang 切替時の動的 lang 属性更新
- WCAG 2.1 AAA レベル（コントラスト 7:1）への移行は工数大

## ビルド確認
- `npm run build` クリーン

## Loop 14 後 自己採点
**4.9 / 5.0**（前 4.87 → +0.03）

モーダルダイアログの aria-modal/Esc/背景クリック・閉じるボタンのコントラスト＆44pxは WCAG 2.1 AA の中核であり、SR 利用者・キーボード利用者の操作性が顕著に向上。
