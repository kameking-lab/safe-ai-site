# ハルシネーション絶滅 3層設計

- 作成日: 2026-05-23
- 目的: 「条文番号は絶対間違えない」を技術的に保証
- 構成: Pre-generation / Post-generation / Fallback の3層

## 1. 設計思想

社長要求は「条文番号は絶対間違えない」。 これは LLM(Gemini)の文面ルール頼みでは保証できない。 確率的軽減ではなく確定的検出が必要。

3層構成:
1. Pre-generation(回答生成前): プロンプトに「許可された条文番号ホワイトリスト」を構造化同梱
2. Post-generation(回答生成後): 応答内の条文番号を全件抽出 → 構造化条文DB照合 → 不一致は自動修正or破棄
3. Fallback: 該当条文なし時の「最も近い条文」提示(意味的類似度 + 階層的フォールバック)

## 2. Layer 1: Pre-generation 同梱

### 2.1 入力構築の変更

現状(route.ts:112-128, buildUserPrompt):
- 【参照法令条文】に条文本文を平文連結
- 「条文番号は提供された範囲のみ使用」を文面ルールで指示

提案:
- 【参照法令条文】の前に【出力可能な条文番号リスト】セクションを追加
- 各条文をマシン可読な ID(例: ANZ-HOU-061-01-11 = 安衛法 第61条 第1項 第11号)で構造化
- システムプロンプトに「このIDセット外の条文番号を引用する応答は禁止」を明記

例:
```
【出力可能な条文番号リスト(これ以外を引用してはならない)】
- 労働安全衛生法 第61条
- 労働安全衛生法施行令 第20条 第11号(対象業務: フォークリフトの運転(最大荷重1トン以上))
- 労働安全衛生規則 第151条の21
- 労働安全衛生規則 第151条の73
- 労働安全衛生規則 第151条の74

【参照法令条文】
...
```

### 2.2 itemNumberMap の活用強化

現状 LawArticle.itemNumberMap は号番号と対象業務の対応を保持(rag-search.ts:907-913 で context に含まれる)。 Layer 1 ではこの情報を Pre-generation のホワイトリストに昇格させる。

### 2.3 想定実装規模

- buildContextFromArticles の改修: 50行程度
- buildUserPrompt の改修: 30行程度
- システムプロンプト更新: 5-10行追加
- 推定工数: 1日

### 2.4 想定精度

- Gemini は構造化ホワイトリストを与えると、その範囲外の番号生成率が大幅低下する(OpenAI/Anthropic の Tool Use 系研究で実証済み)
- ただし完全排除ではない。 Layer 2 で補完

## 3. Layer 2: Post-generation 照合

### 3.1 抽出ロジック

応答テキストから条文番号を全件抽出:
- 法令略称 + 条文番号パターン: /([一-龥]{2,15}(?:法|則|規則|施行令|指針))\s*第([0-9一二三四五六七八九十百]+(?:の[0-9一二三四五六七八九十]+)?)条(?:\s*第([0-9一二三四五六七八九十]+)項)?(?:\s*第([0-9一二三四五六七八九十]+)号)?/g
- 漢数字 → アラビア数字正規化(docs/rag-deferred-improvements-2026-05-13.md の Item B と統合)
- 取り出した参照を { lawShort, articleNum, paragraph?, item? } に構造化

### 3.2 照合 DB

照合用の構造化条文 DB を整備:
- 既存 allLawArticles から (lawShort, articleNum) のセットを抽出
- 各 article に paragraphs と items の階層情報を保持(現状 itemNumberMap で部分対応、これを完全化)
- ファイル: web/src/lib/article-registry.ts(新規)
  - allowedReferences: Set<string> = Set of `${lawShort}|${articleNum}|${paragraph?}|${item?}`
  - lookup(ref): boolean

### 3.3 照合フロー

```
extract(answer) → references[]
for each ref in references:
  if !allowedReferences.has(ref.key()):
    if Layer 1 hit list contains ref.lawShort + ref.articleNum:
      → 「号番号誤り」: 自動修正候補を提示(itemNumberMap で正しい号を逆引き)
    else:
      → 「架空条文」: 該当文を強調 + 警告メッセージ追記 + 信頼度 high → low に降格
```

### 3.4 自動修正 vs 破棄

- 「条文番号が存在しない」(例: 第151条の23 が存在しない場合):
  - 該当文に「⚠️ 該当条文は提供データ範囲外」を付ける
  - 信頼度を degrade(high → medium、medium → low)
  - 自動破棄はせず、明示警告で運用
- 「号番号が誤っている」(例: 施行令第20条第10号と書いたが正しくは第11号):
  - itemNumberMap で正しい号を逆引きし、提案メッセージを追記
  - 「⚠️ 第10号ではなく第11号(フォークリフト)が該当します。 e-Gov でご確認ください」
- 「枝番が誤っている」(例: 第563条の2 と書いたが第563条のみ実在):
  - 同様に修正候補を提示

### 3.5 想定実装規模

- web/src/lib/article-registry.ts 新規: 200行程度
- 漢数字→アラビア数字正規化(deferred B と統合): 50行
- chatbot-enrichment.ts に validateArticleReferences 関数追加: 100行
- route.ts に Layer 2 統合: 50行
- 推定工数: 2-3日

### 3.6 想定精度

- 法令略称 + 条文番号 + 枝番 + 項 + 号 のレベルで照合できる
- 「架空条文番号 0%」を計測ベンチで実証可能(Citation Accuracy@1 メトリクス)
- 限界: 「号番号の対象業務が誤っている」(例: 第20条第11号を「玉掛け」と書く、正しくはフォークリフト)は照合できない。 これは Layer 1 の itemNumberMap で軽減

## 4. Layer 3: Fallback(該当なし時)

詳細は 05-fallback-logic-design.md。 概要のみ:

該当条文なし時(normalizedScore < 0.5)の3分岐:
1. 完全一致(条文Aが直接答える): 条文A引用
2. 部分一致(条文Aが関連): 条文A引用 + 「これは○○について規定、ご質問の△△は明示的規定なし、関連する一般条項として□□条があります」
3. 完全不一致(安衛法体系外): 「安衛法体系内では明示的規定なし、関連分野として[他法令]の[条文]が該当」or「労働災害防止指針に該当」へ誘導

### 4.1 意味的類似度の補強

現状の normalizedScore は keyword + BM25 + リランク。 「意味は近いが用語が違う」質問(例: 「足場の手すりはどのくらいの高さ?」)に弱い場合あり。

改善案:
- expandQueryRich(synonyms.ts) を 100+ パターンから 300+ パターンに拡張
- 上位5件の score 差が小さい場合は「部分一致」扱いで明示

### 4.2 階層的フォールバック

- レベル1: 法令一致 + 条文番号一致(完全一致)
- レベル2: 法令一致 + 関連条文(部分一致)
- レベル3: 関連法令の条文(他法令誘導)
- レベル4: 通達・告示・指針(規範的でない参考情報)
- レベル5: 「データ範囲外」(e-Gov 誘導 + 専門家相談)

## 5. 3層の組合せ動作

### 5.1 通常フロー(RAG ヒット時)

```
[Query] → RAG 検索 → relevantArticles
            ↓
[Layer 1] buildUserPrompt with allowedReferences whitelist
            ↓
Gemini.generateContent
            ↓
[Layer 2] extract refs from answer → validate against article-registry
            ↓
   if all valid: 出力
   if some invalid: 警告追記 + 信頼度降格
            ↓
[Response]
```

### 5.2 ヒットなしフロー(Fallback)

```
[Query] → RAG 検索 → normalizedScore < 0.5
            ↓
[Layer 3] 階層的フォールバック判定
   - 部分一致あり: 関連条文提示 + 「明示規定なし」明示
   - 関連法令あり: 他法令誘導
   - 完全不一致: e-Gov 誘導 + scopeWarning
            ↓
[Response]
```

## 6. データ整備要件

Layer 1-2 を成立させるには次のデータ整備が必須:

### 6.1 構造化条文 DB

- すべての LawArticle に paragraphs(項) と items(号) の階層情報を追加
- 現状の itemNumberMap は部分的。 全条文で完備が必要
- 主要条文(現行 PIN 対象55トピック+ペルソナテスト失敗11件の関連条文)から優先整備

### 6.2 法令略称マッピング

- KNOWN_LAW_SHORTS(37件、chatbot-enrichment.ts:335-374)を拡張
- 別表記(「労働安全衛生法施行規則」「労安衛則」「安衛施則」)を正規化テーブルで吸収

### 6.3 漢数字正規化

- docs/rag-deferred-improvements-2026-05-13.md の Item B と統合
- 「第六十一条」「第十一号」を「第61条」「第11号」に正規化
- 取込み時と応答抽出時の双方向で適用

## 7. 想定精度・限界・トレードオフ

### 7.1 達成可能ライン

3層実装後の想定:
- Citation Accuracy@1(条文番号正確性): 99.5%+
- Hallucination Rate(架空番号): 0.5% 未満
- Out-of-Scope Detection: 95%+

### 7.2 限界

- 文脈解釈の誤り(条文は正しいが解釈・対象業務が誤り)は照合できない
- 通達番号(基発第XXXX号)の照合は別途必要(mhlw-notices.ts の noticeNumber と照合)
- 「条文を引用しないで一般論で誤回答する」ケースは別の対策(回答内に必ず条文引用を含めるルール強化)

### 7.3 トレードオフ

- 厳格な照合 → 応答が冷たくなる(「該当規定なし」が増える)
- 緩い照合 → ハルシネーション残る
- 推奨: Layer 1 + Layer 2 は厳格、Layer 3(Fallback)はやや緩く「最も近い条文」を提示

## 8. 評価メトリクス(導入時)

- Citation Accuracy@1: 応答内の条文番号引用が実在条文と一致する率(枝番・号番号まで)
- Item-Level Match Rate: 号番号の対象業務まで一致する率
- Hallucination Rate: 応答内に存在しない条文番号が含まれた問の割合
- Out-of-Scope Detection Rate: 33/50法令枠外の質問で scopeWarning が正しく発出される率
- Self-Correction Rate: Layer 2 が誤りを検出して修正提案できた率

ベンチ拡張: 既存 rag-100q.fixture.ts に「期待引用に号番号レベルの正解」を追加。 別途「ハルシネーション誘発質問セット」(架空条文や曖昧質問)を 30 問追加して False Positive を計測。

## 9. 実装規模合計

- データ整備(構造化条文 DB の完備): 2日
- Layer 1 実装: 1日
- Layer 2 実装: 2日
- Layer 3 実装: 3日(05-fallback-logic-design.md と統合)
- 評価メトリクス整備: 1日
- 合計: 8-10日

## 10. リスクと対策

- リスク1: Layer 2 の正規表現が誤検知して通常応答も警告だらけになる
  - 対策: 既存テストケース(rag-100q-fresh)で False Positive 計測。 5% 未満を維持
- リスク2: Pre-generation ホワイトリストが長くなり Gemini のコンテキスト圧迫
  - 対策: 上位5条文のみ、各 200 文字以内に圧縮。 通達は別セクション
- リスク3: 修正提案が誤りを誘発(誤った正解候補を提示)
  - 対策: itemNumberMap が完備されている条文のみ修正提案、それ以外は警告のみ
- リスク4: 「該当規定なし」応答が増えて UX が悪化
  - 対策: Layer 3 で関連条文を必ず1件以上提示。 「データ範囲外」だけを返すのは最後の手段
