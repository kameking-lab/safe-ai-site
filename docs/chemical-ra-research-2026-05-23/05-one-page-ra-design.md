# 05: 1枚紙RA設計（A4縦・用紙ファースト型UI）

作成日: 2026-05-23
方針: KY/日誌(#263)と同じ「用紙ファースト型UI」で設計。画面と印刷で同じ見た目、印刷時に崩れない CSS、A4縦1枚に収まる項目構成。

---

## 1. 設計コンセプト

- **用紙ファースト型**: スマホ画面でも「縦長A4プレビュー」が見える。タップで詳細展開。
- **印刷最優先**: `@media print` で1枚完結、改ページ禁止、フォントサイズ固定。
- **オフライン運用前提**: PWA キャッシュで電波無くても印刷可能（Phase 2 後半）。
- **法令準拠の証跡として保存可能**: ファイル名規約「RA_物質名_作業内容_YYYYMMDD.pdf」

## 2. A4縦 項目構成（最終案）

A4縦 (210mm × 297mm)、上下左右マージン 10mm、本文 190 × 277mm 領域に以下を配置:

```
┌─────────────────────────────────────────────┐
│ [ヘッダー: 14mm]                            │
│  化学物質リスクアセスメント記録             │
│  作成日 2026-05-23 / 作成者 ○○○ / 事業場 ○○ │
│  作業名 ○○○○ / 作業場所 ○○○○             │
├─────────────────────────────────────────────┤
│ [物質情報: 30mm]                            │
│  物質名 / 別名 / CAS番号 / 成分濃度         │
│  GHS絵表示 [4-6枚アイコン]                  │
│  GHS区分 (火災爆発・健康・環境)             │
├─────────────────────────────────────────────┤
│ [基準値: 18mm]                              │
│  8時間濃度基準値 ○○ ppm (MHLW告示177)      │
│  短時間 ○○ ppm / 皮膚 ◯ / IARC グループ ○  │
│  ※ JSOH/ACGIH リンクのみ                    │
├─────────────────────────────────────────────┤
│ [健康影響: 24mm]                            │
│  主な健康影響                                │
│   ・吸入: ○○○○○○○○○○○○○                  │
│   ・経皮: ○○○○○○○○○○○○○                  │
│   ・経口: ○○○○○○○○○○○○○                  │
├─────────────────────────────────────────────┤
│ [作業条件入力: 24mm]                        │
│  取扱量 ○○○ / 換気 ○○○ / 作業時間 ○○分    │
│  作業形態 ○○ / 保護具レベル ○○             │
├─────────────────────────────────────────────┤
│ [リスク判定: 36mm 強調枠]                   │
│  総合リスクレベル: 【  III: 要改善  】     │
│  内訳: 吸入 III / 経皮 II / 経口 I / 環境 I/火災 II
│  推定ばく露指数 ○.○○ (基準値1.0)           │
│  判定根拠 ○○○○○○○○                       │
├─────────────────────────────────────────────┤
│ [推奨保護具: 30mm]                          │
│  □ 防毒マスク (有機ガス用、JIS T 8152準拠) │
│  □ 耐溶剤手袋 (ニトリル製、EN374適合)      │
│  □ 化学防護服 (耐溶剤、JIS T 8115)          │
│  □ 保護メガネ (ゴーグル、JIS T 8147)        │
├─────────────────────────────────────────────┤
│ [換気・取扱い遵守事項: 36mm]                │
│  優先順位: 工学的対策→管理的対策→保護具    │
│  ・○○○○○○○○○○○                          │
│  ・○○○○○○○○○○○                          │
│  ・○○○○○○○○○○○                          │
├─────────────────────────────────────────────┤
│ [関連法令: 18mm]                            │
│  ・有機溶剤中毒予防規則 第5条              │
│  ・安衛則 第577条の2                       │
│  ・特化則 第○条 (該当時)                   │
├─────────────────────────────────────────────┤
│ [緊急時対応概要: 24mm]                      │
│  皮膚 → ○○○ / 眼 → ○○○ / 吸入 → ○○○      │
│  火災 → ○○○                                │
├─────────────────────────────────────────────┤
│ [入手先・関連リーフレットURL/QR: 18mm]      │
│  SDS: ○○○URL / リーフレット: ○○○URL       │
│  [QRコード 印刷時用]                        │
├─────────────────────────────────────────────┤
│ [フッター: 15mm 免責]                       │
│  本書はリスクアセスメント支援ツールが生成。 │
│  最終判断は事業者・専門家が行ってください。 │
│  作成 yyyy-MM-dd HH:mm  ID: ○○○○            │
└─────────────────────────────────────────────┘
```

合計: 約 287mm（A4 縦内寸 277mm に対し圧縮で収まる）

## 3. UI コンポーネント分割案

```
web/src/app/(main)/chemical-ra/
├── page.tsx                       # 既存（ヘッダ＋ガイドリンク）
├── product-search/                # 既存
├── one-page/                      # ★新規
│   ├── page.tsx                   # 1枚紙RA ページ
│   └── print.css                  # 印刷専用 CSS（必要時）
└── detail/                        # ★新規（詳細判定モード、06参照）
    └── page.tsx

web/src/components/ra/
├── one-page-ra-sheet.tsx          # ★新規 A4縦コンテナ
├── ra-header.tsx                  # 作業情報入力
├── ra-substance-block.tsx         # 物質情報
├── ra-limit-block.tsx             # 基準値
├── ra-health-effects.tsx          # 健康影響
├── ra-work-conditions.tsx         # 作業条件入力
├── ra-risk-verdict.tsx            # リスク判定（強調枠）
├── ra-ppe-checklist.tsx           # PPE チェックリスト
├── ra-controls-list.tsx           # 換気・取扱い遵守
├── ra-laws-list.tsx               # 関連法令
├── ra-emergency.tsx               # 緊急時対応
├── ra-urls-block.tsx              # URL/QR
├── ra-footer.tsx                  # 免責
└── ghs-pictograms.tsx             # GHS 絵表示SVGコンポーネント
```

各コンポーネントは `web/src/lib/ra-engine.ts` の出力を受けて表示。

## 4. CSS 設計指針

```css
/* @media print 用 */
@media print {
  .one-page-ra-sheet {
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 10mm;
    page-break-after: avoid;
    page-break-inside: avoid;
    font-size: 9.5pt;
    line-height: 1.3;
  }
  .no-print { display: none; }
  .ra-verdict { border: 2pt solid black; padding: 4mm; }
}

/* @media screen 用 */
@media screen {
  .one-page-ra-sheet {
    max-width: 800px;
    aspect-ratio: 210 / 297;
    margin: 1rem auto;
    /* スマホでは縦長プレビュー */
  }
}
```

Tailwind の `@page` ユーティリティと、`print:` プレフィックスを活用。

## 5. PDF出力

3案あり、オーナー判断必須:

| 案 | ライブラリ | 利点 | 欠点 |
|----|----------|------|------|
| A | ブラウザ印刷ダイアログ + HTML | 追加依存ゼロ、Lighthouse 影響なし | ブラウザ依存（Safari と Chrome で改ページ挙動差） |
| B | `@react-pdf/renderer` | サーバ生成可、ブラウザ非依存 | 既存CSS再利用不可、別途デザイン |
| C | `jspdf` + `html2canvas` | クライアント生成、HTML 再利用 | 画質劣化、大きいファイル |

**推奨**: 案A（ブラウザ印刷）でPhase 2を出し、Phase 4以降に案B（@react-pdf/renderer）への移行を検討。

`09-owner-decisions.md` で確認。

## 6. データ取得フロー

```
[ユーザー入力]
  物質名 or CAS → /api/chemical-ra に POST
  作業条件（換気・取扱量・時間） → CREATE-SIMPLE 入力

[サーバ]
  → mhlw-chemicals.ts findByCas / searchMergedChemicals
  → concentration-limits.json から TWA/STEL/Ceiling 取得
  → chemical-substances-db.ts から 専門解説 50物質マッチ確認
  → ra-engine.ts で 5経路統合判定
  → Gemini で「わかりやすい解説」3-5行生成
  → ChemicalRaResponse + 1枚紙用拡張データ返却

[クライアント]
  → OnePageRaSheet に流し込み
  → 印刷ボタン / PDF出力ボタン
  → URL 共有用の query string にエンコード
```

## 7. 共有・保存

- ローカルストレージ: 「マイ物質」「最近の判定結果」を `chemical-ra:one-page-history-v1` に保存
- URL クエリ: 主要パラメータをBase64URLにシリアライズして共有可能（`?sheet=...`）
- 印刷: ブラウザネイティブ印刷
- PDF保存: 印刷ダイアログ → PDFに保存（Chrome/Edge/Safari標準）

## 8. アクセシビリティ

- 物質名・CAS入力は `aria-label` + 候補リスト（既存 `MhlwChemicalSelector`）
- リスク判定の色だけでなく**テキスト併記**（赤=IV「直ちに改善」）
- A4 縦印刷で本文 9.5pt 以上を維持（弱視配慮）
- QR コードは alt属性で URL を読み上げ可能に

## 9. 印刷品質テスト基準

Phase 2 完了時の受入基準:

- A4縦1枚に収まる（はみ出しゼロ）
- 改ページ無し
- Chrome / Edge / Firefox / Safari で同じレイアウト
- GHS絵表示の解像度 300dpi 以上
- 印刷後の本文文字サイズ ≥ 9.5pt
- QR コードのスキャン成功率 100%

## 10. 既存実装からの拡張ポイント

- `ChemicalRaPanel` の現在の出力（カード型）を残しつつ、「1枚紙プレビュー」タブを追加
- `/api/chemical-ra` 応答に `onePageSheet?: OnePageSheetData` を追加（既存応答型を破壊しない）
- `OnePageSheetData` 型は `web/src/lib/ra-engine.ts` で定義
- 既存 `RelatedPageCards` 経由で `/chemical-ra/one-page` への動線を追加

Phase 2 着手時に既存コードを最大限再利用し、新規UIは「足し算」で実装する。
