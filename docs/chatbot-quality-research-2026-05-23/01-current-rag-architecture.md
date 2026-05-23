# 現状RAG実装の完全把握

- 作成日: 2026-05-23
- 対象: /chatbot API および関連ライブラリ
- 範囲: web/src/app/api/chatbot/, web/src/lib/rag*, web/src/lib/notice-search.ts, web/src/lib/chatbot-*, web/src/data/laws/, web/src/data/mhlw-*

## 1. エントリーポイント

- web/src/app/api/chatbot/route.ts(520行)
  - POST ハンドラ(216-520行)
  - リクエスト型 ChatbotRequest: { message, history?, lawCategory? }
  - レスポンス型 ChatbotResponse: answer + sources + source_type + confidence + confidenceScore + followups + notices + citations + relatedLaws + digDeeperLinks + scopeWarnings
- web/src/app/api/chatbot/cache-stats/route.ts(統計エンドポイント)

## 2. 検索フロー(関数レベル)

クエリは以下の順序で処理される:

1. リクエスト受領(route.ts:217-224)
2. lawCategory 取得(route.ts:229)。 "all" | "安衛法" | "安衛則" | "クレーン則" | "有機則" | "特化則" | "酸欠則" の7択
3. 関連通達検索(route.ts:230) → searchRelevantNotices(message, 3)
4. キャッシュ照合(route.ts:233-244) → cacheKey + getCachedResponse(history なしのみ)
5. API キー検査(route.ts:246) → 未設定なら RAG 結果のみ返却(247-283行)
6. RAG 検索(route.ts:286) → searchRelevantArticlesWithScore(message, 10, lawCategory)
7. MLIT 資料検索(route.ts:288) → searchMlitResources(message, 3)
8. 信頼度判定(route.ts:294-307)
   - CONFIDENCE_THRESHOLD = 0.5。 0.5未満の条文は除外
   - high: normalizedScore >= 0.75 かつ relevantArticles >= 2 件
   - medium: それ以外で RAG ヒットあり
   - low: RAG ヒットなし
9. 低信頼時テンプレート返却(route.ts:310-349) — e-Gov 誘導 + scopeWarnings
10. Gemini Flash 呼出(route.ts:354-370) — withCircuitBreaker(gemini, ..., failureThreshold=4, cooldownMs=60000)
11. Gemini 失敗時 degraded 応答(route.ts:371-414)
12. 出典/関連法令/dig deeper 計算(route.ts:416-419)
13. 出典文字列追記(route.ts:421-432) → formatCitationTriples or formatSourceCitations
14. 関連通達追記(route.ts:434-442) — 拘束力ラベル付き
15. 関連法令追記(route.ts:444-450)
16. sources 整形(route.ts:452-463)
17. ハルシネーション抑制(route.ts:465-498) → detectOutOfScopeLawReferences, detectUngroundedAssertions
18. レスポンス返却 + キャッシュ書込み(route.ts:500-519)

## 3. RAG 検索 内部詳細

- web/src/lib/rag-search.ts (919行)
- searchRelevantArticlesWithScore(query, topK, category) — エクスポート関数(667-738行)
  - 入力: query, topK=10, category="all"
  - 出力: { articles, topScore, normalizedScore }

### 3.1 クエリ前処理

- expandQuery(query) — web/src/lib/query-expansion.ts。 軽量な口語→正式名展開(例: 「フォークリフト」→「フォークリフト 最大荷重 就業制限」)
- expandQueryRich(expanded) — web/src/lib/rag/synonyms.ts。 安全衛生分野特化100+パターンの語彙ゆれ補正
- tokenize(expanded) — rag-search.ts:751-782
  - normalizeSearchText で表記揺れ吸収(全角半角・大文字小文字)
  - 「第」なし数字+条 を正規化(例: "565条" → "第565条")
  - 条番号トークンを先抽出して保護(/第\d+条(?:の\d+)?(?:第\d+項)?(?:第\d+号)?/g)
  - 句読点・括弧・主要助詞(は・が・を・に・で・の・も・と・へ・や・か・について・に関する 等)で分割
  - 最小 2 文字以上のトークンを Set 化して返す

### 3.2 スコアリング(デンス側 + BM25)

- corpus = category == "all" ? allLawArticles : allLawArticles.filter(...)
- 各 article に対し:
  - calcScore(article, queryTokens) — rag-search.ts:791-873
    - 条文テキスト出現回数(最大5回)+1ずつ
    - 条文タイトル一致 +6
    - 条文番号一致 +10(双方向 startsWith で枝番誤マッチ防止)
    - キーワード完全一致 +5、部分一致 +3
    - 法令名マッチ +4(括弧除去後比較)
    - 複数トークン共起ボーナス: matchedTokenCount^2
  - bm25Score(bm25Index, article, queryTokens) — web/src/lib/rag/bm25.ts
  - 合算: final = dense + 0.5 × bm25(BM25_BOOST=0.5)
  - dense=0 の article は BM25 を適用しない(再現率保護)

### 3.3 リランク

- rerank(filtered, query, 20) — web/src/lib/rag/reranker.ts
- 上位20件にメタデータ・ベースの軽量リランク
  - 法令略称明示ボーナス +8
  - 連番クラスタボーナス +1〜4
  - 改正版ペナルティ -3

### 3.4 正規化スコア

- normalizedScore = min(topScore / 25, 1.0)
- 分母25 の根拠: タイトル一致6 + キーワード完全一致5 + テキスト一致数回 + 共起ボーナス ≒ 25

### 3.5 PINNED_TOPICS

- rag-search.ts:41-621 で 55 トピック定義
- 各トピック: { triggers: string[], pins: { law, articleNum }[] }
- triggers のいずれかが query に含まれれば pins を結果先頭に強制差込
- applyPinnedTopics(query, articles) → { articles, hadPins }(623-649行)
- ピン適用時は normalizedScore を最低 0.7 まで引き上げ
- 主要トピック例: 職長教育、熱中症、健康診断、有機溶剤健診、特化健診、石綿健診、電離健診、じん肺健診、作業環境測定、局所排気装置、死傷病報告、工事計画届、化学物質管理者、SDS、リスクアセスメント、玉掛け、クレーン運転、定期自主検査、石綿事前調査、酸欠換気、就業制限、フォークリフト、特化物区分、足場手すり(563条+518条)、パワハラ、子の看護休暇、店社安全衛生管理者、漏電遮断器、プレス機械、研削といし、妊産婦時間外、年次有給休暇、粉じん作業 ほか

## 4. プロンプト構築

- SYSTEM_PROMPT(route.ts:84-110): 11項目のルール
  - 提供条文のみで回答
  - 法令名・条番号は参照条文のみ使用
  - 号番号の独自変換禁止
  - ハルシネーション禁止
  - 「○○則第XX条(施行：YYYY年MM月、所管：厚生労働省)」3点セット明示
  - 範囲外は「本ツールの提供データ範囲外」を明示
- buildUserPrompt(question, context, mlitContext) — route.ts:112-128
  - 【参照法令条文】セクション
  - 【関連する所管省庁の公式ガイドライン・通達(参考)】セクション
  - 【質問】セクション
- buildContextFromArticles(articles) — rag-search.ts:901-918
  - 各記事を【法令名(略称)条文番号「タイトル」】+ 本文 + itemNumberMap(号番号と対象業務の対応) で連結

## 5. 通達検索

- web/src/lib/notice-search.ts
- searchRelevantNotices(query, k=3) を route.ts:230 で呼出
- 通達データ: web/src/data/mhlw-notices.ts(約 1,069 件、AUTO-GENERATED FROM data/mhlw-notices.jsonl)
- MhlwNotice 型: id, title, noticeNumber, issuedDate, issuedDateRaw, issuer, category, categoryLabel, subCategory, docType, bindingLevel("binding"|"indirect"|"reference"), detailUrl, sourceUrl, pdfUrl
- NOTICE_BINDING_LABELS: "告示(拘束力あり)" / "通達(行政解釈・間接拘束)" / "指針(参考)"
- スコアリング: トークン全マッチ +1、タイトル一致 +0.5、2020年以降 +0.2、binding +0.3

## 6. MLIT 資料検索

- web/src/data/mlit-resources.ts(100件)
- searchMlitResources(query, 3) を route.ts:288 で呼出
- MlitResource 型: id, title, publisher, bureau, publishedDate, category, subcategory, targetAudience, sourceUrl, pdfUrl, relatedLaws, keywords

## 7. 引用検証(citation-validator系)

- web/src/lib/chatbot-enrichment.ts に実装
- detectOutOfScopeLawReferences(answer, hitLawShorts) — 381-402行
  - 正規表現: /([一-龥ぁ-んァ-ヴA-Za-z0-9]{2,12}(?:法|則|規則|指針|通達|告示|条例))第\s*[一二三四五六七八九十百0-9]+条/g
  - 指示語(同法・本法・上記法令)は除外
  - KNOWN_LAW_SHORTS(37法令略称)に含まれないものを out-of-scope として返す
- detectUngroundedAssertions(answer) — 408-425行
  - weasel word(と考えられます/と思われます/のはずです/おそらく/多分 等)が2件以上で true
- buildStructuredCitations(articles) — 295-320行
  - { lawShort, fullName, articleNum, articleTitle, issuer, effectiveDate, searchHref, egovHref } の構造化
  - 重複除外 + 最大5件
- suggestRelatedLaws(message, articles) — 165-214行
  - RELATED_LAW_GROUPS(化学物質群、安衛則・クレーン・ゴンドラ、酸欠、健診・じん肺、電離、労基系、育介・均等)に基づき関連法令を最大4件サジェスト
- suggestDigDeeperLinks(message, articles) — 219-289行
  - TOPIC_TO_ACCIDENT_QUERY(事故事例)
  - TOPIC_TO_CIRCULAR_CATEGORY(通達カテゴリ)
  - KEYWORD_TO_INDUSTRY_SLUG(業種別レポート、5業種)
  - 上位条文の law-search リンクを 1 件追加

## 8. キャッシュとサーキットブレーカー

- web/src/lib/chatbot-cache.ts
  - LruTtlCache: 最大100エントリ、TTL 24時間
  - cacheKey(query, lawCategory) = `${lawCategory}::${normalizedQuery}`
  - normalizedQuery = 空白折りたたみ + lowercase + 末尾句読点削除
  - 統計: hits / misses / evictions / expirations / size
- web/src/lib/external/circuit-breaker.ts
  - withCircuitBreaker(name, fn, { failureThreshold, cooldownMs })
  - 連続失敗時に CircuitOpenError を投げる

## 9. コーパス全体

- web/src/data/laws/index.ts(169行)
  - allLawArticles = [...各法令の articles 配列] を結合した単一フラット配列
  - 50法令体制: 基幹33 + 拡張12 + 施行令・規則等
  - 主要法令ファイル:
    - rodoAnzenEiseiHo(安衛法)
    - rodoAnzenEiseiHoSikokiregu(安衛法施行令)
    - anzenEiseiKisoku(安衛則)
    - craneKisoku(クレーン則)
    - yukiKisoku(有機則)
    - tokkaKisoku(特化則)
    - sankketsuKisoku(酸欠則)
    - sagyokankyoSokuteiho(作環測法)
    - jinpaiHo(じん肺法)
    - jinpaiHoSikokiregu(じん肺則)
    - denriHoushasenKisoku(電離則)
    - sekimenKisoku(石綿則)
    - funjinKisoku(粉じん則)
    - enKisoku(鉛則)
    - shiAlkylEnKisoku(四アルキル鉛則)
    - jimushoEiseiKijunKisoku(事務所衛生則)
    - kikaiKenteiKisoku(機械等検定規則)
    - hakenAnzenEisei(派遣安衛)
    - ashibaSagyoKisoku(足場関連)
    - gondolaAnzenKisoku(ゴンドラ則)
    - boilerAtsuryokuYokiAnzenKisoku(ボイラー則)
    - koaAtsuSagyoAnzenEiseiKisoku(高圧則)
    - kensetsuGyoho(建設業法)
    - kensetsuRosaiBoshiKitei(建災防規程)
    - rodoKijunHo, rodoKijunHoSikokiregu(労基法・規則)
    - rodoKeiyakuHo(労契法)
    - rodoShaSaigaiHoshoHokenHo(労災保険法)
    - ikujiKaigoKyugyoHo(育児・介護休業法)
    - koyoKintoHo(均等法)
    - karoshiBoshiHo(過労死防止法)
    - rosaiBoshiDantaiHo(労災防止団体法)
    - kenkoZoshinHo(健康増進法)
    - koatsuGasHoanHo(高圧ガス保安法)
    - soonKiseiHo(騒音規制法)
    - kashinHo(化審法)
    - dokugekiHo(毒劇法)
    - shokuhinEiseiHo(食品衛生法)
    - kowanRodoHo(港湾労働法)
    - seninAnzenEiseiKisoku(船員労働安全衛生則)
    - shokugyoAnteiHo(職安法)
    - shokugyoNoryokuKaihatsuSokushinHo(職能法)
    - saiteiChinginHo(最賃法)
    - mentalHealthShishin(メンタル指針)
    - kenkoHojiZoshinShishin(THP指針)
    - kagakuBusshitsuKanriShishin(化学物質RA指針)
    - vdtGuideline(VDT指針)
    - mhlwLawArticles, corpusGapFillArticles, kajuRodoTaisaku ほか補完データ
- web/src/data/laws-mhlw/
  - articles.jsonl: 1,426 行(1条文 = 1行JSON)
  - compact.json: 929 KB の複合フォーマット
  - _manifest.json: 取込み元 PDF とレコード数(複数 PDF を統合)

## 10. メタデータ

- web/src/data/laws/law-types.ts
  - LawArticle = { law, lawShort, articleNum, articleTitle, text, keywords[], itemNumberMap? }
- web/src/data/laws/law-metadata.ts
  - LAW_METADATA: 37法令のメタ(lawShort, fullName, issuer, enactedOn, egovLawId?)
  - ARTICLE_EFFECTIVE_DATES: 特定条文の改正・新設施行日(9件、例: 安衛則612条の2 = 令和7年6月1日施行 熱中症対策)

## 11. テスト・評価

- web/scripts/chatbot-eval.ts(npm run eval:chatbot)
- フィクスチャ:
  - web/src/lib/rag-100q.fixture.ts: 約 116 問
  - web/src/lib/rag-100q.test.ts: 100問基準ベンチ(top-5 recall 目標 85%)
  - web/src/lib/rag-100q-fresh.test.ts: セカンダリ 100問
  - web/src/lib/rag-article-number.test.ts: 条番号パーザテスト
  - web/src/lib/rag-search.test.ts: 単体テスト
  - web/src/lib/rag-metrics.test.ts: メトリクス集計
- 最新結果: docs/rag-metrics-latest.json
  - main: n=115, recall@5=1.0, precision@5=0.294, MRR=0.798, failures=[]
  - fresh: n=100, recall@5=1.0, precision@5=0.244, MRR=0.842, failures=[]
  - topic_breakdown 全 34 トピックでヒット 100%

## 12. UI

- web/src/app/(main)/chatbot/page.tsx
  - metadata.title: 「安衛法AIチャットボット｜33法令以上を根拠条文付きで即答(無料)」
  - SearchAction JSON-LD で searchUrlTemplate = /chatbot?q={search_term_string}
- web/src/app/(main)/chatbot/ChatbotBody.tsx
  - CORE_LAWS: 安衛法・安衛則・足場則・クレーン則(4)
  - SPECIALTY_LAWS: 有機則・特化則・酸欠則・石綿則・じん肺法・粉じん則・電離則・ボイラー則・ゴンドラ則・高圧則・作環測法・労基法・労災保険法・育介法・均等法(15)
  - USAGE_GUIDE: RAG 方式・法改正注記・法的アドバイス非対象・33法令以上対応・労働安全衛生コンサルタント監修

## 13. シーケンス図(テキスト)

```
[Client]
   |
   | POST /api/chatbot {message, history, lawCategory}
   v
[route.ts]
   |
   |-- searchRelevantNotices(message, 3) -- (mhlw-notices.ts)
   |-- cacheKey + getCachedResponse(key)  -- (chatbot-cache.ts) [hit→return]
   |-- check apiKey                       -- [missing→RAGのみ返却]
   |-- searchRelevantArticlesWithScore   -- (rag-search.ts)
   |       |
   |       |-- expandQuery → expandQueryRich → tokenize
   |       |-- corpus filter (category)
   |       |-- calcScore + bm25Score → final
   |       |-- rerank (top20)
   |       |-- applyPinnedTopics(query, top10)
   |       |-- normalizedScore (PIN: min 0.7)
   |       v
   |   { articles, topScore, normalizedScore }
   |
   |-- searchMlitResources(message, 3)    -- (mlit-resources.ts)
   |-- confidence判定 (<0.5: low→template)
   |-- buildContextFromArticles(articles)
   |-- withCircuitBreaker("gemini", () => Gemini.generateContent(systemPrompt + userPrompt + history))
   |       [失敗→degraded応答]
   |       v
   |   answer (string)
   |
   |-- buildStructuredCitations(articles)
   |-- suggestRelatedLaws(message, articles)
   |-- suggestDigDeeperLinks(message, articles)
   |-- formatCitationTriples → answer 追記
   |-- 関連通達 追記 (binding label付き)
   |-- 関連法令 追記
   |-- detectOutOfScopeLawReferences(answer, hitLawShorts) → 警告追記
   |-- detectUngroundedAssertions(answer) → scopeWarnings 追記
   |
   v
[Response] { answer, sources, citations, relatedLaws, digDeeperLinks, notices, scopeWarnings, ... }
```

## 14. 主要 API パスの一覧

- POST /api/chatbot — メインの質問応答
- GET /api/chatbot/cache-stats — キャッシュ統計
- /chatbot — UI ページ(SearchAction JSON-LD で ?q= プリフィル対応)
