# 06. 軸5 実務レベル

> 単に動くだけでなく「現場で使い続けられる」か。入力履歴・テンプレート・プリセットの充実度。エラー時・空状態の救済UI。データの正確性・最新性。出力結果が現場で実際に使える形式か。

---

## 「現場で続けて使える」評価マトリクス

| 機能 | 過去履歴 | テンプレ | プリセット | PDF品質 | エラー救済 | データ最新性 | 評価 |
| ---- | -------- | -------- | ---------- | ------- | ---------- | ------------ | ---- |
| /chatbot | localStorage 15セッション | エクスポートMD/TXT/JSON | サンプル質問6個(製造業偏重) | **なし** | 赤帯のみ | 法令 33+ 最新 | △ |
| /accidents-reports | 不要 | 30項目チェックPDF | 5業種 | print | - | 厚労省CC-BY 4.0 | ○ |
| /strategy/plan-generator | **なし(P0)** | 13業種×3規模=39 | 業種別 | print(印影なし) | - | 通達番号のみ | △ |
| /ky | localStorage v3 | 業種別プリセット6種 | 工種別 | print(署名PDF要再検証) | - | - | ○ |
| /safety-diary | localStorage v3 | 業種別プリセット5種 | 必須5+任意8 | print | - | - | ◎ |
| /chemical-database | なし | - | 建設業22物質プリセット | print | - | 2026-05-24取得 | ○ |
| /chemical-ra | なし | CREATE-SIMPLE | クイック10物質 | print | - | 8400物質と虚偽表記 | △ |
| /law-search | **なし(P0)** | - | - | - | - | 7076行収録 | △ |
| /law-hierarchy | 不要 | - | - | - | - | 法令体系 | ◎ |
| /circulars | お気に入りなし(P0) | - | - | - | - | 1069件 | ○ |
| /e-learning | **進捗保存なし(P0)** | 講師問題編集 | 入門20問+主要 | print | - | 静的 | △ |
| /education | - | PPTX | 12種特別教育 | DL可 | - | 修了証未実装 | △ |
| /faq | - | - | 200問 | - | - | 法令タグ付き | ◎ |
| /heat-illness-prevention | **R7チェック未保存(P1)** | 4テンプレ | WBGT即値 | print | - | R7.6.1施行対応 | ○ |
| /mental-health-management | **進捗保存なし(P1)** | 8ステップ+面接書 | 50人未満9ステップ | print | - | 改正対応 | ○ |
| /community-cases | **永続化なし(P0)** | 投稿フォーム | NGワード9 | localStorage | - | モック4件 | ✗ |
| /signage | localStorage(orientation/location) | 4テンプレ | 24拠点 | フルスクリーン | - | JMA 60分更新 | ○ |

---

## P0 実務阻害(過去履歴・進捗保存・データ正確性)

### R1: /strategy/plan-generator 過去保存・前年比較なし(P0)
- **状況**: `CopilotProvider.tsx:127` の `recordPlan` は**最新1件のみ**。`history`/`保存`/`一覧` がコード全体に無い。
- **影響**: 年次計画は**前年比較が命**。「昨年は墜落重視、今年は熱中症追加」のような差分編集が不可。
- **修正**: localStorage で過去3件保存+前年比較ハイライト UI。
- **工数**: 12h

### R2: /e-learning 受講者進捗保存なし(P0)
- **状況**: `STORAGE_KEY = "el-theme-overrides"` は**講師による問題編集の保存**で、受講者の正答ログ・進捗保存は皆無。再訪で `answers` 全リセット。
- **影響**: 法定教育の証跡として致命的(120分受講のエビデンスにならない)。
- **修正**: 受講者ID単位で進捗localStorage + 修了スコア表示。
- **工数**: 8h

### R3: /chemical-ra 「8,400物質超」虚偽表記(P0)
- **状況**: `/chemical-ra/page.tsx:88` の「8,400物質超」は実装 約3,700物質と乖離。
- **影響**: 信頼性損失。
- **修正**: 正確な数値「約3,700物質(MHLW告示177号 251 + NITE GHS 2,729 + PRTR 398 + 化審/毒劇/CWC/廃掃 255)」に訂正。コピー・JSON-LD・OG含め全箇所。
- **工数**: 1h

### R4: 計画ジェネレータ「10業種」コピー虚偽(P0)
- **状況**: コード上 13業種(`INDUSTRY_LABELS` `safety-plan.ts:27-41`)。コピーは10業種で全箇所(SEO/JSON-LD/featureList/OG)虚偽。
- **修正**: 全箇所「13業種」に統一。「small/medium/large」のラベルも揃え。
- **工数**: 1h

### R5: /community-cases 投稿が永続化されない(P0)
- **状況**: `ugc-store.ts:14-19` で serverStore がプロセス内メモリ。`clientAddSubmission` で localStorage 保存。**他ユーザー不可視**。
- **影響**: 「自動審査→公開」表記は虚偽。投稿者の信頼を裏切る。
- **修正**: Supabase等への接続(オーナー確認案件)。
- **工数**: 24h

### R6: 化学物質詳細ページに特化則/有機則/酸欠則欠落(P0)
- **状況**: `regulation-tag-labels.ts:8-17` の規制タグ9種に特化則/有機則/酸欠則/粉じん則/石綿則がない。製造業の最頻出規制(特化則第二類物質マーキング等)が `relatedLawTexts()` の安衛則文字列に閉じ込められ、詳細ページに表示されない。
- **修正**: 規制タグに5つ追加+表示ロジック実装。
- **工数**: 6h

### R7: /circulars と /law-search に お気に入り/コピー機能ゼロ(P0)
- **状況**: お気に入り/ブックマーク機能ゼロ(`law-search-panel.tsx` にgrep該当なし)。引用ボタン/コピーボタンゼロ。
- **影響**: 職長が現場で参照する条文を保存できない。報告書に貼り付けるユースケース不可。
- **修正**: localStorage お気に入り(最大20条文)+「条文+条番号」整形コピー。
- **工数**: 8h

---

## P1 実務改善

### R8: PDF出力品質(印鑑欄・ロゴ欄なし)
- **影響機能**: /strategy/plan-generator, /ky, /safety-diary, /heat-illness-prevention/r7-compliance, /mental-health-management/interview-guidance
- **問題**: すべて `window.print()` のみ。社印/代表者印/衛生管理者印/産業医印の枠なし。会社公文書化不可。
- **修正**: 1ツール(plan-generator)で react-pdf 化 + 印影4枠 + ロゴ画像URL入力 → 他に展開。
- **工数**: 16h(初回)、各機能 4h追加

### R9: KY 署名 PDF 埋め込み懸念(P0疑い・要実機)
- **状況**: `ky-page-content.tsx` で `signatures[i]` を画像表示する箇所が見当たらず、印刷時に署名が消える可能性。
- **修正**: 実機確認+PDFに署名PNG埋め込み実装。
- **工数**: 4h(実機確認+実装)

### R10: /mental-health-management に労働者本人セルフチェック無し(P0)
- **状況**: `/mental-health-management/stress-check/readiness-form.tsx:37-46` は「自社整備状況7問」のみ。労働者本人の57項目セルフチェックが存在しない。
- **影響**: 来訪者の半数の期待(本人診断)を裏切る。
- **修正**: /mental-health-management/self-check 新設(57項目セルフチェック・端末内処理・匿名)。
- **工数**: 8h

### R11: WBGT 計算結果 localStorage 保存なし(P1)
- **状況**: `wbgt-calculator-client.tsx:21` `useState` のみ。ブラウザ閉じると消失。
- **修正**: 1週間分の計算履歴保存。
- **工数**: 2h

### R12: R7チェックリスト localStorage 保存なし(P1)
- **状況**: `r7-compliance-client.tsx:21` `useState` のみ。社内点検運用に致命的。
- **修正**: チェック状態保存。
- **工数**: 2h

### R13: 面接指導書テンプレが出力不可(P1)
- **状況**: `interview-guidance/page.tsx:163-209` の医師意見書テンプレが「項目リスト」止まり。コピー/PDF/DOCX出力不可。
- **修正**: コピーボタン+PDF出力。
- **工数**: 4h

### R14: /accidents-reports CSV出力なし(P1)
- **状況**: PDF(print)のみ、CSV出力なし。Excel派の安全担当には致命的。
- **修正**: 各業種ページに「CSVダウンロード」ボタン。
- **工数**: 4h

### R15: /e-learning 修了証発行未実装(P1)
- **状況**: `fullharness/page.tsx:324` 「2026年秋より対応予定」、`lms/page.tsx:9` 「先行登録受付中」。
- **修正**: 2026秋待ち or 暫定スコア表示 → 「修了スコア90%」をスクショ用UIで提示。
- **工数**: 4h

---

## P2 実務改善

### R16: チャット履歴 検索なし(P2)
- 最大15セッション(`chatbot-panel.tsx:64`)で古いものは消失警告なし。
- 修正: 履歴検索ボックス追加。
- 工数: 4h

### R17: チャット エラーリトライボタンなし(P2)
- エラーUI(`:957`)は赤帯1行のみ。
- 修正: 「再送信」ボタン追加。
- 工数: 1h

### R18: 化学物質 複数混合RA未対応(P0★)
- 塗料・洗浄剤の混合作業は実務頻出。
- 修正: 複数物質ピッカー+混合RA(加算則の暫定実装)。
- 工数: 16h

---

## データ正確性・最新性

| データソース | 状態 | 評価 |
| ------------ | ---- | ---- |
| 安衛法 33法令 RAG | 監修済(コンサル登録番号260022) | ◎ |
| 通達 1069件 | jaish.gr.jp連携 | ◎ |
| 厚労省事故DB | CC-BY 4.0 / 死亡災害DB中心 | ○(件数の表記混乱) |
| 化学物質 MHLW告示177号 251 | 2023-04公示・最新 | ◎ |
| 化学物質 NITE GHS 2729 | 2026-05-24取得 | ◎ |
| 化学物質 計3700 | 「8400物質超」と虚偽表記 | ✗ |
| 法改正カレンダー | 自動更新 | ○ |
| 気象警報 JMA | 60分更新 | ○ |
| FAQ 200問 | relatedLaws/source付き | ◎ |
| 用語集 272語 | 五十音 | ◎ |
| 事故事例 curated | 5000件超表記 vs 業種別1670等 | ○(乖離注釈あり) |

---

## 「現場で続けて使える」総合評価

### Wow水準(維持必須)
- /faq 200問+法令タグ
- /glossary 272語五十音
- /law-hierarchy 階層マップ
- /chemical-database 規制法令統合UI
- /heat-illness-prevention WBGT即時計算+R7対応
- /mental-health-management 50人未満9ステップ
- /for/construction 役職別実務エントリ
- /ky 朝礼サイネージ10秒カウントダウン

### 致命欠落(P0即着手)
- /strategy/plan-generator 過去保存
- /e-learning 進捗保存
- /community-cases 永続化
- /chemical-database 特化則/有機則タグ
- /chemical-ra 8400物質虚偽
- /circulars/law-search お気に入り
- /mental-health-management 本人セルフチェック

### 改善余地(P1/P2)
- PDF出力品質(印鑑欄)
- KY署名PDF埋め込み確認
- 各種ツールのlocalStorage進捗保存

---

## 「現場で使えるPDF」評価

| 機能 | 印鑑欄 | ロゴ | docx/xlsx | 体裁 | 評価 |
| ---- | ------ | ---- | -------- | ---- | ---- |
| /ky | × | × | × | A4縮小可だが署名PNG埋込要再検証 | △ |
| /safety-diary | × | × | × | A4 | △ |
| /strategy/plan-generator | × | × | × | A4(衛生委員会審議用には体裁不足) | ✗ |
| /heat-illness-prevention/r7-compliance | × | × | × | A4 | △ |
| /mental-health-management/interview-guidance | × | × | × | (テンプレ項目のみ) | ✗ |

**全機能でPDFが「現場でそのまま使える」体裁未達**。最優先で /strategy/plan-generator に印鑑欄+ロゴ実装し、他機能に展開すべき。

---

## 削減・改修案サマリ

1. **/strategy/plan-generator 過去保存+前年比較**(P0/12h)
2. **/e-learning 受講者進捗保存**(P0/8h)
3. **/community-cases 永続化(Supabase)**(P0/24h・オーナー確認)
4. **化学物質特化則/有機則タグ追加**(P0/6h)
5. **/chemical-ra 8400→3700 訂正**(P0/1h)
6. **/circulars/law-search お気に入り+コピー**(P0/8h)
7. **/mental-health-management 本人セルフチェック新設**(P0/8h)
8. **PDF印鑑欄+ロゴ(plan-generatorで実装→展開)**(P1/16h)
9. **KY 署名PDF埋込確認**(P1/4h)
10. **R7/WBGT/メンタル進捗保存**(P1/各2h)

合計工数: 91h
