# 調査: 本番RAG confidenceScore=0 問題 / CI rag-100q-fresh.test.ts タイムアウト

調査日: 2026-05-09
調査ブランチ: claude/eager-brahmagupta-31e6e7
調査時の main HEAD: c6a22bcf7119eb50b8c256bb3d88d1b40b62de45
本番URL: https://www.anzen-ai-portal.jp/chatbot

## 結論（先出し）

1. **本番RAGは正常動作している**。confidenceScore は 0 ではない。
   - 7問のUTF-8確実な実測で全件 0.7〜1.0、`source_type=rag`、`sources` が複数返却。
   - 「本番RAG=0」という前提は、検証時に PowerShell/curl が日本語クエリを CP932 で送り UTF-8 として受け取られた結果、サーバー側でトークン化に失敗し confidenceScore=0 になっていた**測定アーティファクト**だった。
   - サーバーが返した `followups[].prompt` 中の `${message}` echo がモジバケしていたことから、入力時点で既に文字化けしていたことが確認できる。

2. **CIの連続失敗は精度劣化ではなく vitest デフォルトタイムアウト 5000ms 不足が原因**。
   - `rag-100q-fresh.test.ts` の正答率は 60/100 = 60.0%、目標 55% を満たしている。
   - 100問を逐次評価する処理に 5384ms かかり、5000ms のテスト単位タイムアウトを超えて FAIL 扱いになっていた。
   - タスク指示書の「ローカル99.1%」は別テスト `rag-100q.test.ts`（114/115 = 99.1%）との混同。fresh セットは元々 55% の緩い閾値で運用されており、現在 60% で閾値クリア中。

3. **本番側の修正は不要**。CI の `it()` にタイムアウト引数を渡すだけで CI は復旧する見込み。

## Phase 1: コード把握

RAG関連ファイル一覧（探索結果）:

- `web/src/lib/rag-search.ts`
  - `searchRelevantArticlesWithScore(query, topK, category)` を export。
  - キーワード型RAG（TF-IDF ではなく、条文タイトル・キーワード・本文出現回数の加重和をスコアにする）。
  - PR #75 で導入された「PINNED_TOPICS」機構あり。トピック該当時に `normalizedScore` を最低 0.7 へ底上げする (`adjustedScore = hadPins ? Math.max(normalizedScore, 0.7) : normalizedScore`)。
  - `normalizedScore = min(topScore / 25, 1.0)` で 0〜1 に正規化。
- `web/src/app/api/chatbot/route.ts`
  - Node ランタイム（`runtime: 'edge'` 指定なし）。
  - `searchRelevantArticlesWithScore(message, 10, lawCategory)` を呼び出し、`normalizedScore >= 0.5` を採用閾値、`>= 0.75 && length>=2` を high 判定に使う。
  - hits=0 の場合は e-Gov 誘導の固定文言を返し、AIコールをスキップ。
- `web/src/data/laws/index.ts`
  - 33法令分のTSモジュールを直接 import して `allLawArticles` を構築。
  - `mhlw-extras.ts` のみ `@/data/laws-mhlw/compact.json` を import（951KB JSON 1ファイル）。
  - 動的 fs.readFile / fetch / DB 呼び出しは無し。Webpack のバンドルに静的に取り込まれる。
- `web/next.config.ts`
  - `outputFileTracingIncludes` は `/admin/status` のみ。法令データはコード経由 import なので追加トレース不要。
  - `serverExternalPackages` は GA系のみ。

つまり**本番ビルド成果物に法令データが乗らない経路は存在しない**。

## Phase 2: 本番側挙動の直接観察

UTF-8 を Node の `fetch` で確実に送信する `tmp/ragprobe/probe.mjs` で 7 問を本番に投げた結果（`tmp/ragprobe/results.json` に raw 保存）:

- Q1「施行令第20条で定める作業について教えて」 → confidenceScore=0.7, medium, rag, sources=10, 第61条「就業制限」が先頭
- Q2「足場の組立て等作業主任者が必要な作業は?」 → confidenceScore=1.0, high, rag, sources=10, 安衛則第565条が先頭
- Q3「熱中症対策として安衛則ではどのような措置が義務付けられていますか」 → 0.7, medium, rag, sources=10, 安衛則第612条の2 が先頭
- Q4「雇入れ時の安全衛生教育の内容を教えて」 → 1.0, high, rag, sources=13, 安衛法第59条 が先頭
- Q5「化学物質管理者の選任義務について」 → 0.72, medium, rag, sources=11, 安衛則第12条 が先頭
- Q6「玉掛け技能講習が必要な作業は何ですか」 → 1.0, high, rag, sources=10, クレーン則第221条 が先頭
- Q7「ストレスチェックは何人以上の事業場で義務ですか」 → 1.0, high, rag, sources=11, 安衛法第66条の10 が先頭

7/7 ともに `confidenceScore > 0`、`source_type=rag`、`sources` 充実。本番は機能している。

参考：CP932 経由で投げた最初の確認では `followups[].prompt` 内の echo クエリが `�{�s�ߑ�20���Œ�...` のようにモジバケしており、サーバーが受信時点で UTF-8 として復号できないバイト列を受け取っていたことが分かる。tokenize 後に有意トークンが残らず confidenceScore=0 になるのは仕様通りの結果。

Vercel 側の `.vercel/output` 検査やログ収集は、上記で本番動作が確定したため不要と判断し未実施。

## Phase 3: ローカル本番モード再現

「本番RAG=0」が誤前提だったため、ローカル `npm build && npm start` での再現確認は不要と判断（前提が崩れた時点で省略）。

## Phase 4: CI失敗の原因特定

### 4-1. 直近の web-ci 失敗ログ取得

`gh run view 25587471011 --log-failed` で取得（PR #78 マージ後の main プッシュトリガ）。

該当箇所抜粋:

```
[RAG 100Q fresh] 正答 60/100 = 60.0%
...（不正答 40件のリスト）...
❯ src/lib/rag-100q-fresh.test.ts (1 test | 1 failed) 5386ms
  × fresh セットの正答率が 55.00000000000001% 以上であること 5384ms

FAIL src/lib/rag-100q-fresh.test.ts > RAG 100問ベンチマーク (fresh) > fresh セットの正答率が 55.00000000000001% 以上であること
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ src/lib/rag-100q-fresh.test.ts:52:3
```

ポイント:

- 同一実行で `rag-100q.test.ts` は 114/115 = 99.1% で 3659ms 内に成功している。
- `rag-100q-fresh.test.ts` は **正答率としては 60% > 55% 目標を満たしている**が、テスト関数全体が 5384ms かかったため vitest の単一テスト デフォルトタイムアウト 5000ms を踏み抜いて落ちている。

### 4-2. 原因のメカニズム

`rag-100q-fresh.test.ts:52` の `it()` 内で `searchRelevantArticlesWithScore` を 100 回ループ実行している。RAG コーパスは PR #75 で 33 法令まで拡張され、`mhlw-extras.ts` も 951KB の JSON を含むため、各クエリで数千条文に対するスコア計算が走り、合計が CI ランナー上で 5 秒を超える状況。

### 4-3. ネットワーク / DB / 環境変数依存の有無

テスト本体は完全インプロセス。fixture 読み込みも `readFileSync` 1 回のみで `it()` の外。ネットワーク呼び出しは無し。タイムアウトは純粋な CPU バウンド時間。

### 4-4. 本番ゼロ問題との関連

**無関係**。CI のタイムアウトは「100問の累計実行時間」、本番のリクエストは「1問」。本番の 1 問あたり所要時間は keyword search だけなら数十ミリ秒オーダー（Gemini API 待ちが大半）。本番ロジック・データには影響しない。

## 特定した根本原因（単一）

CI 連続失敗の根本原因: **`rag-100q-fresh.test.ts` の `it()` 呼び出しに `timeout` 引数が無く、vitest デフォルト 5000ms に対して実時間 5384ms と僅か超過していること。**

「本番RAG=0」については根本原因なし（誤前提）。

## 修正方針

最小修正: `rag-100q-fresh.test.ts` の `it()` 第3引数で timeout を 30000ms に拡張。`rag-100q.test.ts` は現状 3.6s で収まっているが、PR #75 以降のコーパス拡張やマシン揺らぎを考慮し同様に拡張しておく（同種の連鎖失敗予防）。

代替案として `vitest.config.mts` に `testTimeout: 30000` をグローバル設定する手もあるが、他の単純なロジック単体テストが沈黙的に長時間化するリスクがあるため、対象テストにのみ局所適用する方針を採る。

## 推奨アクション（最終）

1. `rag-100q-fresh.test.ts` の `it()` に `{ timeout: 30000 }` を追加（このPRに含める）。
2. 同様の予防措置として `rag-100q.test.ts` にも `{ timeout: 30000 }` を付与。
3. 本ドキュメントを `docs/investigation-rag-prod-zero.md` として保存（このコミット）。
4. 確認用プローブスクリプト `tmp/ragprobe/` は調査痕跡として残し、`.gitignore` に基づき除外（`tmp/` がgit管理外なら自然に除外）か `docs/` 配下にスナップショットを残す。

## 計測 raw データ

`tmp/ragprobe/results.json` に7問の生レスポンスメタデータを保存。Worktree 削除に備え、本ドキュメントの「Phase 2」末尾に主要数値を抜粋済み。
