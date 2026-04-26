# Review Loop 6 Report — データ品質・整合性（新キャンペーンLoop 1）

**日付**: 2026-04-26
**通算ループ**: 6（新キャンペーンLoop 1）
**観点**: 数字統一・重複・法令引用正確性

## 修正前スコア
4.4 / 5.0

## 検出した致命的問題（影響度A）

1. **令和7年厚生労働省令第XX号** プレースホルダ残存（real-law-revisions.ts:562）
2. **publication_date 空欄**（lr-real-2025-003 熱中症対策）
3. **法律第33号 official_notice_number 未設定**（lr-real-2025-001）
4. **令和6年厚生労働省令（施行）** が曖昧（lr-real-2025-004）

## 実施した修正

| 対象 | 修正内容 |
|---|---|
| lr-real-2025-001 | `official_notice_number: "法律第33号"` を追加 |
| lr-real-2025-003 | `revisionNumber` を `第13号` に確定、`publication_date: "2025-04-15"`、`official_notice_number: "厚生労働省令第13号"` を補完 |
| lr-real-2025-004 | `revisionNumber` を「令和5年厚生労働省令第29号（2025年施行分）」に正規化 |

## 数字整合性チェック結果

| 数字 | SITE_STATS 定義 | ページ参照箇所 | 整合性 |
|---|---|---|---|
| 504,415 件 | accidentDbCount | handover, mhlw-* | OK |
| 4,043 件 | mhlwDeathsCount | handover, mhlw-similar-cases | OK |
| 1,389 件 | fatalDisastersR5 | handover | OK |
| 3,984 件 | chemicalsMhlwCount | handover | OK |
| 1,127 条文 | ragArticleCount | handover | OK |

→ サイト全体の数字は `site-stats.ts` で一元管理されており重大な不整合なし。

## ビルド確認
- `npm run build` クリーン
- TypeScriptエラーなし

## Loop 6 後 自己採点
**4.5 / 5.0**（前 4.4 → +0.1）

データ品質は実データベース（504K件・4K件）に基づくため信頼性高。
残るは表記ゆれ（条番号スペース等）軽微案件のみ。
