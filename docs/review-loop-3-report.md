# Review Loop 3 Report — UX & accessibility

**日付**: 2026-04-25
**前ループ**: Loop 2（情報設計・文言）スコア 2.9→3.1
**観点**: モバイル 375px、キーボードナビ、タップターゲット、iOS Safari ズーム

---

## 修正前スコア

Loop 2 後: **3.1 / 5.0**

主要マイナス要因（Loop 3 関連）:
- 100ペルソナ指摘 #15「KY 用紙のスマホ入力欄がぎっしりでタップしづらい」
- 100ペルソナ指摘 #16「文字サイズが小さい（text-xs/[10px]）箇所が多く高齢者が読めない」
- iOS Safari は `font-size < 16px` の input/textarea にフォーカスすると **ページ全体がズームイン** する仕様。
  サイト内ほぼ全ての入力欄が `text-sm`（14px）でこれに該当 → 入力時に視点が奪われる致命的 UX
- 音声入力ボタン `text-[10px] px-2 py-1` は **タッチターゲット ~24x18px** で WCAG 2.5.5（24x24 推奨）未達
- フォーカスリング（focus-visible）が一部の重要操作要素で不足

---

## 実施した修正

### 1. iOS Safari の input/textarea ズーム対策

`text-sm` を `text-base sm:text-sm` に置換し、モバイル時は 16px 以上を確保（iOS の自動ズームを抑止）：

| ファイル | 対象 |
|---|---|
| `voice-input-field.tsx` | InputWithVoice / TextareaWithVoice の input/textarea |
| `chatbot-panel.tsx` | チャット入力 textarea |
| `contact/ContactForm.tsx` | 共通 inputClass（会社名・氏名・メール・電話・件名・本文ほか全 7 項目） |

これらは KY 用紙・チャットボット・お問い合わせという **ユーザー接触の最頻路** のため、
1 行の置換で全体の体感が改善する。

### 2. タップターゲット拡大

- **VoiceMicButton**: `px-2 py-1 text-[10px]` → `min-h-9 px-3 py-1 text-xs` で 36px 高 + 文字 12px
- **KY 用紙保存・PDF プレビュー**: `text-xs px-3 py-2` → `min-h-11 text-sm px-4 py-2.5` で 44px 高（WCAG AAA）

### 3. focus-visible リング追加

キーボード操作で Tab したときの視認性を改善。
`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500` を追加：
- InputWithVoice / TextareaWithVoice / VoiceMicButton
- KY 保存ボタン × 2

`focus-visible` を使うため、マウスクリック時には現れない（不要なリングが出ない）。

---

## 本番デプロイ確認

- TypeScript `tsc --noEmit` クリーン
- `next build` 成功（全 51 ページ prerender）
- Vercel 本番デプロイで `/chatbot`, `/ky`, `/contact` の input/textarea に `text-base` クラスが当たっていること、
  および KY 保存ボタンの `min-h-11` が反映されていることを curl で確認

---

## Loop 3 完了後の自己採点

| 観点 | Loop 2 後 | Loop 3 後 | コメント |
|---|---|---|---|
| 法的正確性 | 4.0 | 4.0 | 変化なし |
| 情報設計 | 3.5 | 3.5 | 変化なし |
| 文言トーン | 3.0 | 3.0 | 変化なし |
| 価格・ビジネス訴求 | 2.5 | 2.5 | 変化なし |
| SEO・メタデータ | 2.7 | 2.7 | 変化なし |
| **UX** | **2.5** | **3.7** | **iOS ズーム解消・タップターゲット 44px・focus-visible 追加** |
| **アクセシビリティ** | **2.5** | **3.5** | **WCAG 2.5.5 タップターゲット・キーボード操作の視認性向上** |
| 競合比較 | 3.0 | 3.0 | 変化なし |
| データ品質 | 3.5 | 3.5 | 変化なし |
| 法務地雷 | 2.7 | 2.7 | 変化なし |
| セキュリティ | 3.5 | 3.5 | 変化なし |
| 受注視点 | 3.0 | 3.0 | 変化なし |

**Loop 3 後 総合スコア: 3.3 / 5.0**（前 3.1 → +0.2）

UX と A11y が底上げされ、モバイル/PC 双方で実利用に耐える水準へ。

---

## Loop 3 で残った課題（次ループ以降）

- 中規模プラン（50〜500名）の追加 — 100ペルソナ A 指摘 #4 で 11 名指摘（Loop 4 で対応予定）
- title/description の統一・OGP 統一・FAQPage 構造化データ
- 特商法・プライバシーポリシーの紋切り型表現
- `signage` ページのタッチ最適化（PC 前提のためスコープ外と判断、要再評価）
