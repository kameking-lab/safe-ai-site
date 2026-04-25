# Review Loop 8 Report — UX細部・タップターゲット・focus-visible（新キャンペーンLoop 3）

**日付**: 2026-04-26
**通算ループ**: 8（新キャンペーンLoop 3）
**観点**: タップ44px・focus-visible・キーボード操作・aria

## 修正前スコア
4.6 / 5.0

## 致命的問題（A）

1. **header.tsx 更新ボタン** h-9 w-9 (36px) 未達 + focus-visible なし
2. **user-menu.tsx ログイン/メニュー** py-1.5 (32px) + focus-visible なし
3. **tab-navigation.tsx** focus-visible ring なし
4. **user-menu.tsx ドロップダウン** Esc キー対応なし、aria-haspopup/aria-expanded なし
5. **scaffold-page.tsx 戻るリンク** focus-visible なし

## 重要問題（B）

6. **ContactForm focus ring opacity 20%** → WCAG AA 対比度懸念
7. **ky-record-list.tsx 削除ボタン** p-1.5 (28px) 誤タップリスク + 確認ダイアログなし

## 実施した修正

| ファイル | 修正内容 |
|---|---|
| `header.tsx` | 更新ボタン h-9→h-11 (44px)、focus-visible:ring-2 ring-emerald-500 ring-offset-2 |
| `user-menu.tsx` | ログイン/トリガー min-h-[44px]、`useEffect` で Esc キー処理、aria-haspopup="menu"/aria-expanded |
| `tab-navigation.tsx` | focus-visible:ring-2 ring-offset-2、active時 ring-blue-400 / 非active ring-blue-500 |
| `scaffold-page.tsx` | 戻るリンクに focus-visible ring 追加 |
| `ky-record-list.tsx` | 削除ボタン min-h/min-w-[44px]、`window.confirm` 確認ダイアログ、aria-label に会社名・日付付与、focus-visible ring-rose-500 |
| `ContactForm.tsx` | inputClass の focus ring opacity を 20%→40% に強化、focus-visible:ring-offset-2 追加 |

## ビルド確認
- `npm run build` クリーン

## Loop 8 後 自己採点
**4.7 / 5.0**（前 4.6 → +0.1）

WCAG 2.1 AA の主要違反（タップ44px・focus-visible・aria）は解消。
削除操作の確認ダイアログでデータ破壊リスクも低減。
