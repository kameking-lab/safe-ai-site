# 05. 軸4 直感性

> 「説明を読まないと使えない」要素の有無。ラベル・アイコン・配置から機能を推測できるか。期待される動作と実際の動作の一致度。「あれ?どうやって使うんだっけ?」と止まる箇所。

---

## 「説明を読まないと使えない」要素ランキング(P0級)

### N1: CopilotStepNav / CopilotMemo が初心者に伝わらない(P0)
- **要素**: `CopilotStepNav.tsx:75` 「安全Copilot」+「メイン3機能を連続して使うと、業種・関心事項が自動で引き継がれます」 / `CopilotMemo.tsx:39` 「Copilot記憶」
- **問題**: 「Copilot」「引き継ぎ」「記憶」は職長の語彙にない。空時は非表示(:30)だが業種検出されて出現する瞬間にユーザーは戸惑う。
- **影響**: チャットの邪魔。ファーストビューを食う。
- **修正**: chatbotから除去または下部に移動。CopilotMemo は「最近の業種: 建設業」程度のシンプルな表記に。
- **工数**: 4h

### N2: /qa-knowledge が空(P0)
- **状況**: `qa-knowledge/page.tsx:46-56` 自ら「まずはFAQ200問を」と誘導。**実装放棄ページ**。
- **影響**: ユーザーは「Q&Aがあると思って来たのに空だった」と離脱。SEO的にも canonical 設定済みで害。
- **修正**: 301 リダイレクト → /faq
- **工数**: 1h

### N3: /e-learning と /education の役割が不明確(P0)
- **現状**:
  - /e-learning = 222問クイズハブ(汎用)
  - /education = 12種法定教育の**営業ランディング**(料金・PPTX・問合せ)
- **問題**: 職長は「教育」と「Eラーニング」をほぼ同義に使う。/education の中身が「実は法定講座カタログ」なのは誤導。
- **修正**: /e-learning → /quiz、/education → /training に改名。または、両者の役割をハブで明示。
- **工数**: 6h

### N4: /circulars と /laws/notices-precedents が並存(P0)
- **状況**: 通達系2系統が並んで存在。`/laws/page.tsx:69-74` の「通達・判例(第2層出典)」と`/circulars`が並べて紹介されており、どちらが正か不明。
- **修正**: /laws/notices-precedents の通達部分 → /circulars に統合、判例だけ /precedents 新設に分離。
- **工数**: 12h

### N5: ホームH1が抽象的(P1)
- **要素**: H1「労働安全衛生のAI・DX活用ポータル」+ H2「現場の安全を、AIで変える。」
- **問題**: 抽象的、何ができるか分からない。Lighthouse SEO で「ファーストビューでの価値提案」評価も低い可能性。
- **修正**: H1を「KY・事故DB・安衛法AIチャットを1画面で」のような動詞・名詞列挙に置換。
- **工数**: 2h

### N6: HomeThreePillars の「A./B./C.」ラベル(P1)
- **状況**: 「A.直近の死亡事故」「B. 1週間警報」「C.法改正3件」(`home-three-pillars.tsx:174,247,325`)
- **問題**: 学術的ネーミング。「A.」「B.」「C.」のラベルが官庁文書臭、現場感ゼロ。
- **修正**: 「今日の死亡事故」「今週の警報」「最近の法改正」に直すだけで意味が通る。
- **工数**: 1h

### N7: WBGT計算機の「黒球温度」「自然湿球温度」tooltipなし(P1)
- **状況**: `wbgt-calculator-client.tsx:135-153` で専門用語が解説なし。任意項目だが「これ何?」と止まる。
- **修正**: tooltip/「?」ボタン追加。
- **工数**: 2h

### N8: /law-search の「条番号」と「キーワード」の使い分けが直感的でない(P1)
- **状況**: 検索バー欄が2つ(キーワード/条番号)並ぶ(`law-search-panel.tsx:364-383`)。職長が「518」だけタイプして即ヒットできるが、UI上で「条番号で検索したい場合」を冒頭で示さない。
- **修正**: タブ「キーワード | 条番号で直接」で明示。
- **工数**: 3h

### N9: チャット「サンプル質問押下=即送信」(P1)
- **状況**: `:589 handleSend(q)` でサンプル質問押下=即送信。確認ステップなし。
- **問題**: 誤タップで意図しない質問が飛ぶ。送信中はキャンセル不可。
- **修正**: 押下→入力欄にプリフィルし、ユーザーが内容確認後に送信ボタンを押す方式に変更。
- **工数**: 2h

### N10: チャット「検索対象」セレクタが入力欄の下(P2)
- **状況**: `chatbot-panel.tsx:963` の「検索対象」セレクタが入力欄の下。何のセレクタか不明、「all」で十分なはずなのに目立つ。
- **修正**: 折りたたみor削除(「all」固定)。
- **工数**: 1h

---

## 「期待動作と実動作の一致度」

| 機能 | ユーザー期待 | 実動作 | 一致 | コメント |
| ---- | ------------ | ------ | ---- | -------- |
| WBGT計算機 | 数値入れたら即判定 | useMemo 即時 | ◎ | Wow |
| チャットボット | 質問したら回答 | 10秒沈黙→回答 | ✗ | ストリーミング不足 |
| KY署名キャンバス | 1回でサイン | 名前タップ→開く→描く→閉じる | △ | 多手順 |
| 法令検索条番号 | 「518」入れたら原文 | キーワード/条番号欄分離、ヒット50件中スクロール | △ | 直接URLなし |
| 化学物質RA | 物質選んだらRA | クイックチップ → AI調査 → 結果 | ◎ | 直感的 |
| /qa-knowledge | Q&Aの蓄積を見る | 119行で空。FAQ誘導のみ | ✗ | 実装放棄 |
| /community-cases 投稿 | 投稿したら他人に見える | サーバメモリのみで他人不可視 | ✗ | 重大期待裏切り |

---

## 機能名・URL命名の問題

| URL | 期待される内容 | 実際 | 一致度 |
| --- | -------------- | ---- | ------ |
| /e-learning | クイズ・教材 | 222問クイズ | ◎ |
| /education | 教育コンテンツ | 法定教育**営業ランディング**(PPTX販売) | ✗ |
| /education-certification | 修了証発行 | 60種データベース(発行は2026秋〜) | △ |
| /lms | 学習管理システム | β登録待ち | ✗(空ページ) |
| /qa-knowledge | Q&Aナレッジ | 空ページ | ✗ |
| /faq | FAQ | 200問・カテゴリ付き | ◎ |
| /glossary | 用語集 | 272語+五十音 | ◎ |
| /accidents | 事故事例 | 全件検索 | ◎ |
| /accidents-reports | 事故レポート | 業種別5業種 | ○ |
| /accidents-analytics | 分析 | 統計表 | △(役割不明) |
| /laws | 法令 | 改正カレンダー(条文閲覧ではない) | △ |
| /law-search | 法令検索 | 条文・全文検索 | ◎ |
| /law-hierarchy | 法令階層 | 法→政令→省令→告示マップ | ◎ Wow |
| /circulars | 通達 | 1069件DB | ◎ |
| /laws/notices-precedents | 通達+判例 | /circulars と重複 | ✗ |
| /chemical-database | 化学物質DB | 3500物質 | ◎ |
| /chemical-ra | リスクアセスメント | CREATE-SIMPLE簡易判定 | △(専門用語) |
| /heat-illness-prevention | 熱中症予防 | WBGT/業種別/R7改正 | ◎ |
| /mental-health-management | メンタル対策実務 | 事業者向け実務ガイド | ○ |
| /for/construction | 建設業向け | 役職別実務エントリ | ◎ Wow |
| /industries/construction | 建設業 | 10セクションSEO重視 | △(/for/と重複) |

### 一致しない7件の処遇
- /education → /training に改名
- /qa-knowledge → 301 → /faq
- /education-certification + /lms → /training に統合
- /laws/notices-precedents の通達 → /circulars 統合
- /accidents + /accidents-reports + /accidents-analytics → /accidents 配下に統合(タブ化)
- /chemical-ra → /chemical-risk-assessment にリネーム(SEOも改善)
- /industries/construction と /for/construction → 役割明示(SEO用/実務用)

---

## 「あれ?どうやって使うんだっけ?」発生箇所トップ10

1. **/chatbot 起動時の CopilotStepNav** → 「Copilot って何?」
2. **チャット出典 17色バッジ** → 「色が何を意味してる?」
3. **KY 4ラウンド進行** → 「今 1R か 2R か?」(ステップバー無)
4. **計画ジェネレータ業種選択肢** → 「office? warehouse? fishery? 13個もある?『10業種』のはず?」
5. **/law-search で「条番号 518」**入力 → ヒット50件で「該当条文は?」
6. **/community-cases 投稿後** → 「いつ公開される?(永続化されていない)」
7. **/audits/* 14フォルダ** → 「これ自分用?ユーザー用?」
8. **WBGT 黒球温度・自然湿球温度** → 「これ何?どこで測る?」
9. **/qa-knowledge** → 「Q&A空?」
10. **/lms** → 「β登録?何ができる?」

---

## 削減・改修案サマリ

1. CopilotStepNav/CopilotMemo を chatbot から退避(P0/4h)
2. /qa-knowledge 301 → /faq(P0/1h)
3. /e-learning → /quiz、/education → /training 改名(P0/6h)
4. /circulars と /laws/notices-precedents 統合(P0/12h)
5. ホームH1書き換え(P1/2h)
6. HomeThreePillars ラベル現場語彙化(P1/1h)
7. WBGT用語tooltip追加(P1/2h)
8. /law-search タブ化(P1/3h)
9. チャットサンプル質問押下→プリフィル方式(P1/2h)
10. /audits/* の 8フォルダ /admin/ 移管(P0/4h)

合計工数: 37h
