# Phase 1a ベンチマーク記録

- 計測日: 2026-05-24
- ブランチ: claude/bold-feynman-SJLlz
- 基底ブランチ: main (HEAD 9a97bf2)
- 変更内容: 構造化条文 DB (article-registry) 導入 + 漢数字正規化 + PIN integrity 修正

## RAG 精度ベンチ

| ベンチセット | テスト数 | 正答数 | Recall@5 | 備考 |
|---|---:|---:|---:|---|
| rag-100q main | 115 | 115 | 100.0% | npm run eval:chatbot（chatbot-eval.ts 経由）|
| rag-100q fresh | 100 | 100 | 100.0% | rag-100q-fresh.test.ts 単体実行 |

before / after の比較:
- before（main HEAD 9a97bf2）: main 115/115、fresh 100/100（コミット履歴・既存 JSON より）
- after（本 PR）: main 115/115、fresh 100/100
- 結果: **degrade なし、両ベンチ 100% を完全維持**

## 単体テスト

| カテゴリ | 個数 | 結果 |
|---|---:|---|
| 全テストファイル | 49 | 全 pass |
| 全テストケース | 391 | 全 pass |
| Phase 1a 新規追加 | 27 | 全 pass |
| - article-number-normalize | 14 | pass |
| - article-registry | 12 | pass |
| - article-registry-pin-integrity | 1 | pass（修正後）|

## 構造化条文 DB カバレッジ

| 項目 | 値 |
|---|---:|
| 総 LawArticle レコード | 727 |
| ユニーク条文（lawShort × articleNum）| 715 |
| ユニーク lawShort 数 | 54 |
| 重複登録（corpus-gaps-fill との意図的重複）| 12 |
| LAW_METADATA 未登録の lawShort | 17 |

## PIN integrity 修正

PIN-構造化 DB 整合性チェックで silent fail していた 6 PIN を検出・修正:

- 有機則 第16条 → 第16条の2 と第28条で代替（同 trigger 内）
- 安衛則 第600条 → 第604条/607条/627条 で代替
- 安衛則 第536条 → 第519条 で代替
- クレーン則 第96条 → 第111条 で代替
- クレーン則 第23条 → 第69条 で代替
- 有機則 第16条（2 箇所目）→ 第5条 で代替

いずれも同一 trigger 内に有効な PIN が存在するため、本 PR では無効 PIN を
除外する形でクリーンナップ。 機能影響なし、silent fail のリスク解消。

## TypeScript / Lint / Build

- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors, 8 warnings（既存の未使用変数警告のみ、本 PR で増減なし）
- `npm run build`: 成功（Next.js 静的生成 + 動的ルート、エラーなし）

## Phase 2 への引き継ぎ

article-registry が提供する Phase 2 用 API:
- `getAllowedReferenceKeys()`: Pre-generation ホワイトリスト用 Set<string>
- `lookupArticle(lawShort, articleNum)`: Post-generation 照合用 lookup
- `hasArticle(lawShort, articleNum)`: 完全一致判定
- 漢数字／算用数字／枝番／項／号 の表記ゆれは正規化キー経由で吸収

Phase 2（ハルシネーション絶滅 3 層）の前提条件は本 PR で全て揃った。
