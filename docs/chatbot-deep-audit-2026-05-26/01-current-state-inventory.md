# 01. 現状機能の網羅的把握（チャットボット）

監査日: 2026-05-28 / 対象 HEAD: `d80fc89f` / ベースライン: 866 tests・102 files 全pass

## 1.1 ルート・ファイル構成

### 画面（App Router）
- `web/src/app/(main)/chatbot/page.tsx` — メタデータ＋JSON-LD（WebPage/Breadcrumb/QAPage/WebApplication）
- `web/src/app/(main)/chatbot/ChatbotBody.tsx` — `"use client"`。ヘッダ・法令バッジ・利用ガイド・関連カード。`useTranslation()` を呼ぶが**i18nは全停止のためEN分岐はデッドコード**
- `web/src/app/(main)/chatbot/share/[id]/page.tsx` — 会話共有。**base64 URLデコードのみ（Supabase非連携）**、`robots: noindex`
- `web/src/components/chatbot-panel.tsx` — 約1,240行の単一巨大コンポーネント（チャットUIの本体）
- `web/src/components/chatbot/{notice-card,leaflet-card,notice-leaflet-list}.tsx` — 通達/リーフレット表示

### API
- `web/src/app/api/chatbot/route.ts` — 従来のJSON一括応答
- `web/src/app/api/chatbot/stream/route.ts` — SSEストリーミング（フロントの優先経路、失敗時はrouteへfallback）
- `web/src/app/api/chatbot/cache-stats/route.ts` — キャッシュ統計

### ライブラリ（RAG＋ハルシネーション制御）
- 検索: `rag-search.ts`, `search-index.ts`, `rag/bm25.ts`, `rag/reranker.ts`, `rag/synonyms.ts`, `query-expansion.ts`, `notice-search.ts`
- 正規化・照合: `article-number-normalize.ts`, `article-registry.ts`
- ハルシネーション3層: `chatbot-prompt-builder.ts`（Layer1）, `chatbot-citation-validator.ts`（Layer2）, `chatbot-fallback-logic.ts`（Layer3）
- 付帯: `chatbot-enrichment.ts`（関連法令・深掘り・範囲外検出）, `chatbot-notice-attachment.ts`, `chatbot-notice-detector.ts`, `chatbot-cache.ts`, `chat-history.ts`, `gemini.ts`
- Copilot: `lib/copilot/{keyword-routing.ts,types.ts}`

### データ
- 法令条文: `data/laws/*.ts`（54ファイル＋index/types）→ `allLawArticles` **1,048条文**
- 通達: `data/mhlw-notices.ts` **1,069件**（RAGが実際に引くのはこの配列のみ）
- リーフレット: `data/mhlw-leaflets.ts` **289件**
- FAQ: `data/faqs/faq-batch-1〜4` **200件**
- MLIT資料: `data/mlit-resources.ts` **62件**
- メタ: `data/law-metadata.ts`（**33法令キー**＝e-Gov URL＋改正日＋監査日付き）, `law-hierarchy.ts`
- 評価: `lib/rag-100q.fixture.ts`（実体115件）, `test/chatbot-fresh-100.json`（100件）, `data/chatbot-eval-*.json`

## 1.2 `/chatbot` でできること（機能一覧）

1. フリーテキスト質問（textarea、Cmd/Ctrl+Enter送信）
2. 音声入力（`VoiceMicButton`、Web Speech API、`ja-JP`固定）
3. 全音声会話モード（音声認識＋`speechSynthesis`読み上げ、TTSは400字で無言truncate）
4. 例示質問6件（ハードコードJP）／法令カテゴリ絞り込み`<select>`
5. `?q=` プレフィル（他機能からのディープリンク着地点）
6. SSEストリーミング応答（進捗→本文逐次→meta）。失敗時は非stream JSONにfallback、それも失敗ならエラーバナー
7. 回答に付随する構造化表示: scopeWarnings / source_type・confidence バッジ / sources（条文全文トグル・e-Govリンク）/ citations（出典トリプル）/ relatedLaws / digDeeperLinks / attachedNotices / attachedLeaflets / followups
8. 会話の保存（localStorage：アクティブ＋保存セッション最大15）、MD/TXT/JSONエクスポート＋JSONインポート
9. 共有（base64 URL、`/chatbot/share/[id]`）

## 1.3 RAGパイプライン（検索→生成→検証）

```
質問
 → expandQueryRich(expandQuery(質問))           # 口語→正式名＋同義語展開（追記式）
 → tokenize（NFKC正規化・条番号保護・助詞分割）
 → calcScore（手調整加点）＋BM25(0.5)tie-break ＋ reranker（top20メタ再順位）
 → applyPinnedTopics（約70トピックの強制注入、ヒット時 score 下限0.7）
 → normalizedScore = min(topScore/25, 1)
 → confidence閾値0.5未満なら「条文特定できず」degraded応答
 → Layer1: buildPromptWithWhitelist（許可条文リスト同梱）
 → Gemini 2.5-flash streaming（circuit breaker付き）
 → Layer2: validateCitations（応答中の条文番号をDB照合、Pattern A/B/C）
 → Layer3: buildFallbackDecision（direct/adjacent/out-of-scope）
 → enrichment（通達/リーフレット添付・関連法令・深掘り・範囲外/未接地検出）
 → meta送出
```

モデル: `gemini-2.5-flash`（`stream/route.ts:168`）。免責文 `AI_LEGAL_DISCLAIMER`（`gemini.ts`）。

## 1.4 既存メトリクス（本監査で再実行・2026-05-28取得）

- Recall@5: **100%**（main 115問・fresh 100問とも、失敗0）
- MRR: **0.798（main）/ 0.842（fresh）**
- Precision@5: 0.294 / 0.244 ※gold各1件設計のため上限0.2前後、低値は仕様
- Citation Accuracy@1 下限目標0.65 → **pass**
- 架空条文の検出率: **100%**（疑似応答テスト）
- 出典: `docs/rag-metrics-latest.json`, `chatbot-phase2-metrics.test.ts`, `rag-metrics.test.ts`

## 1.5 デッドコード／要整理候補

- **`data/circulars/expanded-circulars-batch-1〜4`（計200件）が完全に孤立**。検索・ページのどこからもimportされていない（参照は監査ページ1件と自己参照のみ）。2023-2025の化学物質/熱中症/健康通達を含むため、検証のうえ`mhlwNotices`へ取り込めば低コストで網羅性向上の余地（→doc03/13）
- `ChatbotBody.tsx` のEN分岐（`isEn`）はi18n全停止のため**実行されないデッドコード**（保守ハザード）
- `reranker.ts` 内の60件法令別名マップが `synonyms.ts:LAW_ALIASES` と二重管理（→doc02）

## 1.6 総合所見

実装は**非常に成熟**。ハルシネーション制御3層・circuit breaker・通達番号の実在検証・範囲外参照警告まで作り込まれており、「労働安全特化の無料AI相談窓口」として競合に対し明確な差別化がある。一方、**(a) 法令データに1件の重大な条番号誤り（doc03）**、**(b) 検索が純辞書依存で未知表現に弱い（doc02）**、**(c) UXの停止/再試行欠如と他機能との片方向動線（doc05/07）** が完成度90+到達の主なギャップ。
