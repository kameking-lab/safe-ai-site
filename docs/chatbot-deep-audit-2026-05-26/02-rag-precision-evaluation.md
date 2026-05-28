# 02. RAG精度評価

監査日: 2026-05-28 / メトリクスは本監査で再実行した実測値

## 2.1 検索アルゴリズムの実体（重要）

`searchRelevantArticlesWithScore`（`rag-search.ts:668`）は **完全な語彙（lexical）検索**。埋め込み・ベクトル検索は**一切ない**。

構成:
1. **クエリ展開（2段）**: `expandQuery`（口語→正式名の正規表現）→ `expandQueryRich`（同義語・法令別名辞書）。いずれも**追記式**（語を足すだけ）
2. **トークン化**: NFKC正規化→「565条→第565条」整形→条番号トークン保護→助詞分割→2文字未満除外
3. **dense score（`calcScore`, `rag-search.ts:792`）**: 手調整の加点（本文出現 上限5・タイトル一致+6・条番号一致+10・キーワード完全+5/部分+3・法令名+4・2語以上一致で `一致語数²` ボーナス）。これが支配的シグナル
4. **BM25（`rag/bm25.ts`）**: 本物のBM25実装だが、dense>0の文書への**tie-break加点（+0.5×bm25）にのみ使用**、dense==0ならスキップ。混合すると100Qベンチが悪化したためと明記（`rag-search.ts:688`）
5. **reranker（`rag/reranker.ts`）**: top20をメタ再順位（法令名言及+8・改正表ペナルティ−3・連番条クラスタ+4・基底条番号一致+3）
6. **PIN（`applyPinnedTopics`, `rag-search.ts:624`）**: 約70トピックの`{law, articleNum}`を先頭強制注入。**実精度の主動力はこのPIN**。ヒット時 score 下限0.7
7. **normalizedScore = min(topScore/25, 1)**

## 2.2 実測メトリクス（2026-05-28、`docs/rag-metrics-latest.json`）

| 指標 | main(115問) | fresh(100問) |
|------|------------|-------------|
| Recall@5 | 1.000 | 1.000 |
| MRR | 0.798 | 0.842 |
| Precision@5 | 0.294 | 0.244 |

- Citation Accuracy@1: 下限0.65をpass（`chatbot-phase2-metrics.test.ts`）。MRR≒0.8はtop-1正答が約65〜70%であることと整合
- 架空条文検出: 100%（疑似応答での Pattern A 検出）
- Precision@5の低さはgold各1件設計による構造的なもので、**精度問題ではない**

## 2.3 ハルシネーション制御（3層＋付帯）の評価

- **Layer1（同梱ホワイトリスト, `chatbot-prompt-builder.ts`）**: RAGヒット条文のみを「出力可能な条文番号リスト」として明示。範囲外引用を事前抑止。号番号マップ（`itemNumberMap`）も同梱
- **Layer2（事後照合, `chatbot-citation-validator.ts`）**: 応答中の条文参照を全抽出し、`article-registry`と機械照合。Pattern A=DB非存在（高リスク）／B=ホワイトリスト外／C=号番号不整合。SSEではretryせず警告追記＋信頼度降格（社長指示通り）
- **Layer3（`chatbot-fallback-logic.ts`）**: direct（score≥0.75 & 条文≥2）/ adjacent / out-of-scope の3tier
- **付帯**: 通達番号の実在検証（`chatbot-notice-detector.ts`、捏造番号を除去）、範囲外法令参照検出（`detectOutOfScopeLawReferences`）、未接地表現検出（`detectUngroundedAssertions`）、circuit breaker（連続4失敗で60秒遮断）

設計は堅牢。**Layer2が架空条文を100%検出する点は競合の汎用LLMにない最大の信頼性優位**。

## 2.4 失敗・脆弱性（false negative/positive のリスク源）

1. **意味検索がない**: 辞書・PINに載らない言い換えは取りこぼす。高いベンチ値は約70のPIN（≒100Q解答キー）と約130同義語が支えており、**未知表現での実フィールド精度はベンチより低い可能性が高い**
2. **PIN過適合**: `PINNED_TOPICS`にはベンチQ番号や衝突回避ハック（「車両系建設機械 単体は除外」等）のコメントが残り、ベンチ最適化の色が濃い。新規phrasingはPINの恩恵を受けない＝保守負荷大
3. **辞書の四重管理**: `synonyms.ts` / `query-expansion.ts` / `reranker.ts`内別名 / `notice-search.ts` が部分重複・別管理 → ドリフト risk
4. **漢数字の条番号検索がスコアラ未対応**: 正規化ユーティリティは存在するが`tokenize`が算用数字前提。「第六十一条」直接検索はPIN頼み
5. **`detectUngroundedAssertions`が貧弱**: 「と考えられます」等の語が2個以上で発火する語数ヒューリスティックのみ。容易に回避され false negative 多
6. **決定的tie-breakなし**: 同点時の順序が配列順＝不安定
7. **マジックナンバー多数・由来不明**: /25、PIN下限0.7、閾値0.5/0.75、加点6/10/5/4。BM25を弱める必要があった点はスコアラの過適合兆候
8. **共起ボーナス `一致語数²`**: 関連密度に関係なく多語一致の長文を過大評価し得る

## 2.5 改善余地（→ doc13 で優先度付け）

- **P1: 同義語・口語辞書の拡張**（特に2024化学物質改正の口語: 「化学物質の責任者」「ばく露の基準」等）。最小リスクで未知表現耐性を底上げ
- **P1: 4辞書の単一ソース化**（`synonyms.ts`へ集約、reranker/notice-searchはそこを参照）。ドリフト解消
- **P2: 漢数字条番号をtokenizeでも正規化**。PIN依存を減らす
- **P2: `detectUngroundedAssertions`の強化**（接地語との近接判定など）
- **P3: 軽量な意味検索の検討**（Gemini埋め込みは追加コスト・環境変数増を伴うため社長判断。当面はlexical＋辞書拡張で十分との判断が妥当）
- **継続: 決定的tie-break追加**（同点時 lawShort+条番号昇順）で再現性確保

## 2.6 結論

**RAG精度は「収録範囲内の質問」では極めて高い（Recall@5 100%・架空条文検出100%）**。リスクは「収録範囲外・未知表現」での沈黙的な取りこぼしと、それを支えるPIN/辞書の保守負荷。意味検索の不在は最大のアーキ上のギャップだが、コスト制約（環境変数追加禁止・月¥10,000）下では**辞書拡張＋単一ソース化＋決定的tie-break**が費用対効果最良の打ち手。
