# Review Loop 2 Pending — 引き継ぎ記録

**作成日**: 2026-04-25  
**背景**: セッション local_0d688663 が 233 ターンでハング (Loop 2 途中)。
別セッションが Loop 1〜3 を完了してmainに push 済み。

---

## ループ1〜3 本番反映済みコミット

| コミット | 内容 |
|---|---|
| `689dc7e` | fix(review-1): データ品質・統計集約・chatbot セキュリティ |
| `6870dee` | fix(review-2): 教育詳細 e-Gov リンク・構造統一 |
| `bb55595` | fix(review-3): iOS ズーム対策・タップターゲット・focus-visible |

---

## ループ1 対処済み指摘

- SITE_STATS に死亡労災 / キュレーション件数 / 化学物質件数を集約（ハードコード 8 箇所を単一情報源に置換）
- handover ページの「化学物質 1,389 件」→ 3,984 件（事実誤認修正）
- accidents の JSON-LD を 86 件 → 268 件全集合に拡張
- chatbot 共有ビューに入力検証（16KB / 200msg / 8000 文字 上限、UTF-8 厳格デコード）
- chatbot 共有 URL に robots noindex 追加

**スコア変化**: 2.7 → 2.9（データ品質 2.0→3.5、セキュリティ 2.5→3.5）

---

## ループ2 対処済み指摘

- 教育詳細 5 ページ（necchu/shindou/souon/youtsu-yobou/chemical-ra）の「関連条文」を e-Gov 直リンクに置換
- 全 12 教育詳細ページで `laws.e-gov.go.jp` への動線を統一
- 景表法 NG 表現（「確実に」「100%」「業界No.1」等）なし確認

**スコア変化**: 2.9 → 3.1（法的正確性 3.0→4.0、情報設計 3.0→3.5）

---

## ループ3 対処済み指摘

- iOS Safari の input/textarea ズーム問題（`text-sm` → `text-base sm:text-sm`）: voice-input-field / chatbot-panel / ContactForm
- VoiceMicButton タップターゲット拡大（24x18px → 36px 高、WCAG 2.5.5）
- KY 保存ボタン拡大（44px 高、WCAG AAA）
- focus-visible リング追加（InputWithVoice / TextareaWithVoice / VoiceMicButton / KY 保存ボタン）

**スコア変化**: 3.1 → 3.3（UX 2.5→3.7、アクセシビリティ 2.5→3.5）

---

## ループ3 で未対処の指摘（ループ4〜5 へ）

### ループ4 優先度 HIGH

1. **中規模プラン（50〜500名）追加** (100ペルソナ A#4、11 名指摘)  
   `/services` または `/pricing` ページに 50〜500 名向け料金プランを追記
2. **title / description / OGP 統一**  
   ページごとに inconsistent な OG タグ、一部に OGP が欠落
3. **FAQPage 構造化データ**  
   FAQ ページに `FAQPage` / `BreadcrumbList` JSON-LD が不足

### ループ4 優先度 MEDIUM

4. **特商法・プライバシーポリシーの紋切り型表現**  
   法的ページの文言が汎用テンプレートのまま、サービス固有の記述が少ない
5. **サービスページの法的根拠リンク**  
   特別教育の根拠条文（安衛法 第59条等）を `/services` ページから直リンク

### ループ5 優先度 LOW

6. **signage ページのタッチ最適化**  
   PC 前提レイアウト、スマホタッチ未対応
7. **BreadcrumbList を全ページに拡張**  
   現状は一部ページのみ

---

## 次に実施すべき優先順位

1. `/services` or `/pricing` に中規模プラン追記（受注視点スコア 2.5→3.5 が期待できる）
2. OGP / meta description 全ページ統一（SEO スコア 2.7→3.5 が期待できる）
3. FAQPage JSON-LD 追加（SEO + 構造化データ）
4. 特商法ページの具体化（法務地雷スコア 2.7→3.5 が期待できる）

現在の総合スコア: **3.3 / 5.0**（目標: 4.0）
