# 現状精度の実測

- 作成日: 2026-05-23
- 評価対象: web/src/lib/rag-search.ts, chatbot-enrichment.ts, route.ts
- 評価メトリクス: Recall@5, Precision@5, MRR, トピック別ヒット率

## 1. 評価スクリプトの構成

- npm run eval:chatbot → web/scripts/chatbot-eval.ts
- vitest によるテスト:
  - web/src/lib/rag-search.test.ts(単体)
  - web/src/lib/rag-article-number.test.ts(条番号パーサ)
  - web/src/lib/rag-metrics.test.ts(集計ロジック)
  - web/src/lib/rag-100q.test.ts(本評価ベンチ、100 問)
  - web/src/lib/rag-100q-fresh.test.ts(セカンダリ評価、100 問)
- フィクスチャ: web/src/lib/rag-100q.fixture.ts(約 116 問)
- メトリクス出力: docs/rag-metrics-latest.json(296 行、69法令の分布データを含む)

## 2. テストセットの構造

各フィクスチャ要素は概ね次の形:
- 質問文(日本語、自由文)
- 期待引用: { law(法令略称), articleNum(条文番号) } のセット
- topic ラベル(総則/組織/教育/健診/墜落/足場/クレーン/作環測/特化物/有機溶剤/酸欠/粉じん/石綿/電離/化学物質RA/熱中症/メンタル/労基/労災/育介・均等/職安/職能/派遣/最賃 等)

main(100問)と fresh(100問)は同じトピックに対し異なる言い回しを用意し、過学習を検出する設計。

## 3. 直近の Recall@5 実測値(docs/rag-metrics-latest.json)

- main: n=115(または100強)、recall@5=1.0、precision@5=0.294、MRR=0.798、failures=[]
- fresh: n=100、recall@5=1.0、precision@5=0.244、MRR=0.842、failures=[]
- topic_breakdown: main 全 34 トピック、fresh 全 23 トピックで100%ヒット

評価値の意味:
- Recall@5: 期待引用が上位5件に含まれる確率
- Precision@5: 上位5件のうち期待引用に該当する割合(複数引用を要求する問が含まれる場合に変動)
- MRR: 期待引用の最初の正解の逆順位平均

## 4. 数値の信頼性検証

### 4.1 ベンチ自体の堅牢性

- フィクスチャは過去のペルソナテストやインシデント由来の Q を 100+ 問集めたもの。 「自由文だが正解条文が一意に決まる質問」に偏っている
- PIN(55トピック)が直接マッチするように設計されているため、PIN ヒットケースでは Recall@5 が極めて高くなりやすい
- main と fresh が「同トピック異言い回し」で 100% を維持しているのは健全だが、「未知トピック」「想定外の自由文」への汎化はベンチ上では確認できない

### 4.2 PR #261 ペルソナテストとの突合

- ペルソナテスト(docs/persona-test-2026-05-23/report.md)では /chatbot が困りごと約30件の主機能となり、その大半で◯
- 33法令枠外の困りごと7件(D6 アルコール検知器、D9 適性診断、E5 カスハラ、A6 土砂崩壊前兆、C2 夜勤暴力、C5 感染就業制限 ほか)で △/✗ が集中
- 「実務対応フロー」型4件(C2 夜勤暴力、C3 針刺し、C5 感染就業制限、D10 労基署対応)も △
- ベンチ Recall@5 100% と実利用での△/✗ 同居が示すのは:
  - 「ベンチは法令本則カバー範囲内の質問に偏り」
  - 「自由文の枠外質問は scopeWarning 経由でブロックされる(信頼度0.5未満)」
  - 「実務フロー型は条文ヒットしても回答が不十分」

### 4.3 ベンチ未カバーの観点

- ハルシネーション率(架空条文番号の生成頻度)を直接測るベンチは未整備
- 「号番号ゆれ」(第151条の21 → 第151条の22 のような枝番ずれ)の検出ベンチも未整備
- 通達引用の妥当性ベンチも未整備

## 5. ハルシネーション検出機構の現状

### 5.1 Pre-generation(回答生成前)

- システムプロンプト(route.ts:84-110)で 11 項目のルールを Gemini に提示
  - 「参照法令条文のみに基づいて回答」
  - 「号番号を独自に変換・推測・並べ替えしない」
  - 「ハルシネーションは絶対に行わない」
  - 「○○則第XX条(施行：YYYY年MM月、所管：厚生労働省)」の3点セット
- ただし「許可される条文番号のホワイトリスト」を構造化して同梱する仕組みはない
- buildContextFromArticles(rag-search.ts:901-918) は条文を平文連結し、itemNumberMap(号番号→対象業務) も含めるが、Gemini にとって「これら以外を出すな」の強制力は文面ルール頼み

### 5.2 Post-generation(回答生成後)

- detectOutOfScopeLawReferences(answer, hitLawShorts) — chatbot-enrichment.ts:381-402
  - 法令略称レベルのフィルタ。 KNOWN_LAW_SHORTS(37 法令)に含まれない参照を検出
  - 検出時は scopeWarnings に追加 + answer 末尾に注記
- 既存の架空法令検出(route.ts:478-492)
  - 「通達第\d+条」「関連通達」「指針第\d+条」パターンで unverified 部分を抽出
  - 検出時は answer 末尾に注記
- detectUngroundedAssertions(answer) — chatbot-enrichment.ts:408-425
  - weasel word(と考えられます/と思われます/のはず/おそらく/多分)が2件以上で true
  - scopeWarnings に追記

### 5.3 ハルシネーション検出の限界

- 条文番号レベルでの照合がない:
  - 「労働安全衛生規則 第999条」のような実在しない条文番号を生成しても、KNOWN_LAW_SHORTS は「労働安全衛生規則」を許可するため検出されない
- 枝番ゆれの検出がない:
  - 「第563条の2」を「第563条の3」と書いても、両方が allLawArticles に存在する場合は問題なし、片方しか存在しない場合でも法令略称フィルタは通過
- 通達番号の検出がない:
  - 架空の「基発第0220号」を生成しても、mhlw-notices.ts と照合する処理はない(指針第\d+条 のヒューリスティック検出のみ)
- 号番号ゆれの検出がない:
  - 「第20条第11号」を「第20条第10号」と書いた場合、施行令第20条の itemNumberMap と照合する処理はない

## 6. 信頼度判定の現状

- normalizedScore < 0.5: relevantArticles = [] とし、テンプレート応答(e-Gov 誘導)を返す(route.ts:294-349)
- normalizedScore >= 0.5: Gemini 呼出
- normalizedScore >= 0.75 かつ articles >= 2: confidence = "high"
- それ以外: confidence = "medium"
- PIN ヒット時は normalizedScore を最低 0.7 まで引き上げ(applyPinnedTopics)

## 7. 評価結果から見える論点

- ベンチ 100% は「PIN + コアコーパスでカバーできる質問」の話。 これを「ハルシネーション率 0%」「条文番号正確性 100%」と読み替えてはいけない
- 社長要求「条文番号は絶対に間違えない」を満たすには:
  - 出力フェーズで条文番号を全件抽出 → 構造化 DB 照合 → 不一致は破棄/修正、という Post-generation チェック層が必要
  - Gemini の入力に「許可された条文番号 + 号番号一覧」を構造化して同梱する Pre-generation 制約層が必要
- 詳細設計は 04-hallucination-prevention-design.md

## 8. メトリクス取得改善の提案(設計検討用)

現状ベンチに追加すべきメトリクス:

- Citation Accuracy@1: 応答内の条文番号引用が実在条文と一致する率(枝番・号番号まで)
- Hallucination Rate: 応答内に存在しない条文番号が含まれた問の割合
- Out-of-Scope Detection Rate: 33/50法令枠外の質問で scopeWarning が正しく発出される率
- Notice Citation Rate: 通達引用の妥当性(通達番号・タイトルが実在通達と一致)
- Fallback Quality: 完全一致なし時に「最も近い条文」が妥当な代替を提示できる率
