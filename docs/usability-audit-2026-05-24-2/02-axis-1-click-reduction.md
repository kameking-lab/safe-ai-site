# 02. 軸1 クリック数最小化

> 「3クリック以内で本質に到達」をターゲットに、全機能でクリック数を実測。サンプル質問・URLクエリ・既存ナビ動線でメイン3機能に1クリック以内で到達できれば◯。

---

## 機能別「実務完了までのクリック数」マトリクス

| 機能 | 主タスク | 現状クリック | 目標 | 削減手段 |
| ---- | -------- | ------------ | ---- | -------- |
| /chatbot | 条文質問→回答 | 4(入力) | 2 | 建設業サンプル質問追加(墜落/足場/KY/統括) |
| /accidents-reports | 業種別の直近事故 | **不可能** | 2 | 直近7日/30日タブ新設 |
| /strategy/plan-generator | 30人計画→PDF | 4 | 3 | 規模デフォルトsmall化 |
| /ky | KY 1枚作成 | 5最短/25実用 | 3 | 参加者デフォルト3名+ステップバー |
| /safety-diary | 1日分→保存 | 8-12 | 5 | KY→日誌ワンクリック転記 |
| /chemical-database | 物質→規制法令 | 2 | 2 | 維持 |
| /chemical-ra | 物質→RA結果 | 2 | 2 | 維持 |
| /law-search | 条番号→原文 | 4 | 1 | URLルート `/law/[law]/[num]` 新設 |
| /laws | 改正カレンダー閲覧 | 1 | 1 | 維持 |
| /circulars | 通達検索 | 2 | 2 | 維持 |
| /law-hierarchy | 階層俯瞰 | 1 | 1 | 維持(Wow) |
| /e-learning | クイズ開始 | 5-6スクロール | 2 | HomeScreen経由廃止・本体直表示 |
| /education | 法定教育の探索 | 2 | 2 | 維持(命名は「training」へ) |
| /faq | カテゴリFAQ閲覧 | 2 | 1 | トップに検索ボックス直置き |
| /glossary | 用語検索 | 2 | 1 | グローバルナビ昇格 |
| /qa-knowledge | (空ページ) | 119行のテンプレで中身ゼロ | **削除** | 301→/faq |
| /industries | 業種ハブ閲覧 | 2 | 2 | KY位置を5番目→1番目 |
| /industries/[industry] | 当日業務 KY起票 | 4(スクロール5回) | 2 | hero直下に「今日の3CTA」帯 |
| /for/construction | 役職別エントリ | 2(ホーム→バナー) | 2 | 維持(他9業種にも展開) |
| /heat-illness-prevention | WBGT判定 | 1 | 1 | 維持(Wow) |
| /mental-health-management | 規模別義務確認 | 0(着地即見える) | 0 | 維持(Wow) |
| /accidents | 個別事故 | 4-5 | 2 | ホームに直近3件 |
| /community-cases | 投稿 | 3 | 3 | 永続化(現状memory) |
| /signage | 全画面起動 | 2 | 1 | QR起動・常時待機モード |

---

## P0 級 ボトルネック(動線設計欠陥)

### B1: /accidents-reports に直近フィルタなし
- **状況**: `hub-filter.tsx:35-37` のフィルタ軸は q/type/month のみ。日付・年・「直近」軸が存在しない。
- **影響**: 朝礼前に「今週何があった?」を見る用途で **使えない**。
- **修正**: 詳細ページに「直近7日/30日/全期間」タブを追加。`accident-analysis.ts:537-541` の occurredKey を流用すれば実装軽量。
- **工数**: 8h

### B2: /law-search に条文番号直接URLなし
- **状況**: URLパラメータ `?law=...&art=518` は受信できるが、ホームから到達するUI(条文番号入力ボックス)がない。
- **影響**: 「518条原文確認」が4クリック+入力。法令検索の最頻使い方が遠い。
- **修正**: `/law/[law-slug]/[article-num]` ルート新設。ホームヒーローに条文番号入力ボックス追加。
- **工数**: 12h

### B3: /e-learning が HomeScreen 経由で重い
- **状況**: `e-learning/page.tsx:49` で `HomeScreen variant="elearning"` を経由。Accident/KY/通知/PDFまで束ねた巨大ハブで Eラーニングだけ開いて余計なパネルがロード。
- **影響**: クイズ開始までスクロール5-6+セレクト操作。
- **修正**: HomeScreen経由を廃止して本体パネル直表示。
- **工数**: 4h

### B4: /industries/[industry] の KY セクションが5番目
- **状況**: `industries/[industry]/page.tsx` 10セクション908行の縦長。当日業務「KY」までスクロール5回必要。
- **影響**: 業種ハブで「当日使える機能(朝礼前5分)」が見えない。
- **修正**: hero直下に「今日の3アクション」帯(KY/朝礼/日誌)。
- **工数**: 6h

### B5: KY → 日誌ワンクリック転記なし
- **状況**: KY記録の workDetail/riskRows を日誌の workContent/kyResult に流し込むAPIなし。`ky-page-content.tsx:1519-1558` RelatedPageCards は静的リンクのみ。
- **影響**: 手コピペ運用、3〜5分目標が崩壊。
- **修正**: KY保存後に「この内容で日誌を書く」ボタン → /safety-diary/new?fromKy={id}
- **工数**: 8h

### B6: ホーム「建設業の方はこちら」が最下段
- **状況**: `page.tsx:43-59` の建設業バナーがホーム最下段(FlagshipGrid+ThreePillars の下)。
- **影響**: ペルソナA本命施策と銘打つ割に最下段は矛盾。スマホでは3スクロール先。
- **修正**: ヒーロー直下に昇格。
- **工数**: 2h

---

## 「3クリック以内で本質到達」の達成率

| 評価 | 機能数 | 例 |
| ---- | ------ | -- |
| ◎(2クリック以下) | **8機能** | /chemical-ra, /chemical-database, /heat-illness-prevention, /mental-health-management, /law-hierarchy, /faq, /community-cases, /laws |
| ◯(3クリック) | **5機能** | /chatbot, /accidents-reports(ハブまで), /industries, /for/construction, /signage |
| △(4-5クリック) | **6機能** | /ky(最短), /strategy/plan-generator, /law-search, /accidents, /e-learning, /education |
| ✗(不可能) | **1機能** | /accidents-reports(直近事故) |

達成率: 8+5 = 13/20 (65%) → 目標 18/20 (90%)

---

## 削減候補トップ10

1. **/accidents-reports 直近7日/30日タブ追加**(P0/8h)
2. **/chatbot 建設業サンプル質問追加**(P0/2h)
3. **/law-search → /law/[law]/[num] 直接URL**(P0/12h)
4. **KY → 日誌ワンクリック転記**(P0/8h)
5. **/qa-knowledge 削除 → /faq 301リダイレクト**(P0/1h)
6. **ホーム建設業バナー昇格**(P0/2h)
7. **/industries/[industry] hero直下に「今日の3CTA」帯**(P0/6h)
8. **/e-learning HomeScreen経由廃止**(P0/4h)
9. **/glossary をグローバルナビに**(P1/1h)
10. **/faq トップに検索ボックス直置き**(P1/2h)

合計工数: 46h(約6営業日)で機能数あたり平均クリック削減効果は 1.8クリック。
