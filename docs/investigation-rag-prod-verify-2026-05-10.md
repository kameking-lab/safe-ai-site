# 検証: 本番RAG実動作 再確認 (2026-05-10)

調査日: 2026-05-10
調査ブランチ: claude/busy-swirles-b7dac8
調査時の main HEAD: 03e92f8cf21cb5b040de8c778c7f9ccb8e796214 (実体は a87ec9929ed9d46d533e8e632d96837590a1d889 + JMA定期更新)
本番URL: https://www.anzen-ai-portal.jp/api/chatbot
前段調査: docs/investigation-rag-prod-zero.md (PR #79 でマージ済)

## 結論(先出し)

1. **本番RAGは大部分のクエリで正常動作している**。「本番RAG完全停止」は誤り。前段PR #79 の主結論(CP932測定アーティファクト+CIタイムアウト)は裏付けられた。
2. **ただし「条番号直接指定」クエリで再現性100%の精度問題が新規発見された**。
   - Q3「労働安全衛生規則第565条について」 → 3回連続で confidenceScore=0.32、ソース先頭が無関係な国交省航空局ドローンガイドライン、回答は採用閾値(0.5)未満のフォールバック文言。
   - 「安衛則第565条について教えて」では source_type が `ai_inference` まで落ちる(score=0.12)。
3. **CI連続失敗(rag-100q-fresh.test.ts)は PR #79 で `{ timeout: 30000 }` 適用により解決済み**。直近の web-ci(a87ec99, c5de63a)はいずれも success。本番ゼロ前提との関連は無し。

## Phase 1: UTF-8 確実送信での本番5問実測

実装: `tmp/ragprobe-verify/probe.mjs` (Node の `fetch` に `TextEncoder().encode(body)` で UTF-8 バイトを直接渡し、Content-Type を `application/json; charset=utf-8` で送信)。

実測結果(plain text、表禁止):

- Q1「施行令第20条で定める作業について教えて」 : http=200, confidenceScore=0.7, source_type=rag, sources=10, 1st=安衛法第61条(就業制限)
- Q2「足場の組立て等作業主任者が必要な作業は?」 : http=200, confidenceScore=1.0, source_type=rag, sources=10, 1st=安衛則第565条
- Q3「労働安全衛生規則第565条について」 : http=200, confidenceScore=0.32, source_type=rag, sources=3, 1st=国土交通省(航空局)・無人航空機ガイドライン (NG)
- Q4「特別教育が必要な業務は?」 : http=200, confidenceScore=1.0, source_type=rag, sources=10, 1st=安衛則第36条系
- Q5「クレーン運転士の資格について」 : http=200, confidenceScore=1.0, source_type=rag, sources=10

raw データ: `tmp/ragprobe-verify/results.json`

## Phase 2: 結論判定

タスク指示書の判定基準:
- 全5問で confidenceScore > 0.5 → 「本番RAG正常動作」断言
- 1問でも 0 → 「部分問題あり」+ 再現性確認
- 全問 0 → 「完全停止」

実測結果: 4問が > 0.7、1問(Q3)が 0.32(< 0.5、ただし > 0)。

判定: **「全完全停止」でも「全件正常」でもない中間ケース。「本番RAGはおおむね正常動作するが、特定パターン(条番号直接指定)で部分問題あり」**。

### Q3 再現性検証

`tmp/ragprobe-verify/probe-q3-repro.mjs` で同種クエリ6本投入:

- 「労働安全衛生規則第565条について」x3 → 全て score=0.32, 同一の無関係ソース(国交省ドローンガイドライン)
- 「安衛則第565条について教えて」 → score=0.12, source_type=ai_inference (RAGが完全空振りでAIフォールバック)
- 「労働安全衛生規則第565条の内容を教えて」 → score=0.28, 同一の無関係ソース
- 「労働安全衛生規則565条について」(第省略) → score=0.32, 同一の無関係ソース

raw: `tmp/ragprobe-verify/results-q3-repro.json`

再現性100%。**測定アーティファクトではなく、本物のRAG精度問題**。

### Q3 失敗のメカニズム推定

`web/src/lib/rag-search.ts` のキーワード型スコアリングは、条文タイトル・キーワード・本文出現回数の加重和。「565」「労働安全衛生規則」のような条番号トークンは、本文にほとんど自然出現しない一方、無関係なドキュメントの「キーワード:安全」「労働」が薄く広く加点され、特異性のある条文オブジェクトを上回るシグナルが立たない。Q2 で 565条が満点で取れるのは「足場」キーワードが強く効くためで、条番号そのものでの引きはできていない。

これは前段PR #75(PINNED_TOPICS 機構)で扱われた領域だが、「条番号→該当条文」のピンニングは未実装と推測される。

## Phase 3: CIテスト rag-100q-fresh.test.ts タイムアウト調査

PR #79 にて以下が適用済み(`web/src/lib/rag-100q-fresh.test.ts` 確認):

```
it(`fresh セットの正答率が ${TARGET_ACCURACY * 100}% 以上であること`, { timeout: 30000 }, () => { ... })
```

直近 main の web-ci 実行(`gh run list --branch main --workflow web-ci`):
- a87ec99 (PR #79 マージ): success
- c5de63a (JMA chore): success

CIタイムアウト連続失敗は完全解消。本番ゼロ問題との関連は無し(前段PR #79 の判断と一致)。

## 修正PR要否判断

- **CI修正**: 不要(PR #79 で適用済、直近2回 success)
- **本番Q3問題の修正**:
  - 影響範囲: 「条番号直接指定」型クエリのみ。一般的な意味検索クエリ(「足場の組立て等作業主任者」等)は1.0で正常引きできるため、ユーザー大半の用途では問題が顕在化しない。
  - ただし「労働安全衛生規則第N条について」は安衛分野では極めて自然なクエリで、ユーザーが法令名+条番号で問い合わせるケースは想定される。
  - 修正は `rag-search.ts` の条番号抽出ロジック追加(クエリから「第N条」「N条」を抽出し、対応 articleNum に直接ヒット加算)が最小実装。ただし以下の理由で**本タスクでは独断PR作成を見送る**:
    - rag-search.ts はサイトのコア検索ロジックで、回帰リスクが大きい(他100問テストへの影響)。
    - PINNED_TOPICS との優先順位設計を含むため、オーナー判断が必要。
    - タスク注意書き「ロールバック独断禁止」「法令データ中身に深入りしない」のスピリットに照らし、検索アルゴリズム変更は別PRで明示的に依頼を受けて実施すべき。

## 推奨アクション

1. オーナーに本ドキュメントのQ3再現結果を共有し、「条番号直接指定クエリのRAGピンニング」を別タスクとして起票するか判断を仰ぐ。
2. 起票する場合の修正方針案: `rag-search.ts` に条番号トークン抽出を追加し、抽出された (法令名, 条番号) ペアと一致する article に対してスコア下駄を入れる。回帰防止のため `rag-100q.test.ts` / `rag-100q-fresh.test.ts` 両方の通過を必須とする。
3. CI / 本番一般動作については現状維持で問題なし。

## 報告サマリ(タスク指示フォーマット)

- 作業開始時の main HEAD SHA: 03e92f8cf21cb5b040de8c778c7f9ccb8e796214 (実体としては a87ec9929ed9d46d533e8e632d96837590a1d889 + JMA定期更新)
- Phase 1 各 confidenceScore 実測値: Q1=0.7 / Q2=1.0 / Q3=0.32 / Q4=1.0 / Q5=1.0 (全件 source_type=rag, http=200)
- Phase 2 結論: 「本番RAGはおおむね正常動作。完全停止ではない。ただしQ3型(条番号直接指定)クエリで再現性100%の部分精度問題あり」
- Phase 3 CIタイムアウト原因: vitest 単一テストのデフォルト 5000ms に対して fresh 100問逐次評価が 5384ms かかった「実時間僅か超過」。本番ゼロ問題とは無関係。PR #79 で `{ timeout: 30000 }` 適用済、直近 web-ci 連続 success で解消確認。
- 修正未実施: 本タスクでは独断修正PR非作成。docs/investigation-rag-prod-verify-2026-05-10.md を main 反映予定。
- 推奨アクション: Q3「条番号直接指定」精度問題を別タスクとしてオーナー判断を仰ぐ。CI / 一般動作は現状維持で OK。
