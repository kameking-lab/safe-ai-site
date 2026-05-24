# 建設業向けランディングページ /for/construction 設計

作成日: 2026-05-24
オーナー方針: 建設業振り切り、ペルソナA (建設業職長・元請安全担当・現場代理人) を 37.5% → 75% へ。

## 1. 既存資産との住み分け

| URL | 役割 | 主読者 | 内容軸 |
|-----|------|--------|--------|
| `/industries/construction` | 業種別「ハブ」(維持) | 業界調査者・新規読者 | 法令・統計・教育・FAQ・通達 (10セクション・444行) |
| `/for/construction` (新規) | **役職別「即実行エントリ」** | 職長・元請担当・現場代理人 | 当日/月次/年次の運用導線、即タップで使う機能の集約 |
| `/accidents-reports/construction` | 事故統計レポート | データ確認したい人 | 厚労省事故DB集計 |

→ /for/construction は「読む」ではなく「**使う**」を最優先。各セクションは 1〜2 タップで該当機能に到達。

## 2. ペルソナA困りごと → 機能マッピング

タスク指示書「ペルソナA困りごと10件」を建設業の典型業務に照らして:

| # | 困りごと | /for/construction での解消 |
|---|---------|---------------------------|
| 1 | 朝のKYネタが思いつかない | 役職「職長」セクション → KY建設業プリセット (3作業×3リスク) |
| 2 | 足場・高所の最新ルールが分からない | 「法令早見」セクション → 足場規則・墜落防止指針へリンク |
| 3 | 化学物質の規制が複雑 | 「化学物質」セクション → 建設業頻出20物質クイック |
| 4 | 元請への報告書が手間 | 役職「元請担当」セクション → 安全衛生日誌・統括責任者報告 |
| 5 | 安全衛生委員会の議題に困る | 「月次運用」セクション → 議題テンプレ・パトロールチェック |
| 6 | 年次安全衛生計画書の作成が大変 | 「年次運用」セクション → plan-generator (建設業選択済URL) |
| 7 | 朝礼/掲示の素材がない | 役職「職長」セクション → サイネージ・KY用紙印刷 |
| 8 | 事故事例を業種別に見たい | 「統計」セクション → /accidents-reports/construction |
| 9 | 安衛法を質問形式で確認したい | 全セクション末尾 → 法令チャット (建設業文脈で初期化) |
| 10 | 通達・告示の原文URLが必要 | 「関連通達」セクション → 建災防規程・墜落防止指針 URL |

## 3. 構成 (上から順)

### 3.1 Hero
- 一文: 「建設現場の安全衛生、ここに集約。」
- サブ: 「労働安全衛生コンサルタント (登録番号260022) が監修する研究プロジェクト。墜落・足場・重機・粉じん・化学物質まで、職長・元請担当・現場代理人が当日から使えます。」
- 役職別 3 エントリチップ (アンカーリンク):
  - 「職長 (朝礼・KY)」 → `#for-foreman`
  - 「元請担当 (統括管理)」 → `#for-manager`
  - 「現場代理人 (計画・報告)」 → `#for-supervisor`
- 誇大表現禁止 (「最大」「業界No.1」等使わない)

### 3.2 当日使える機能 (#today)
3 カラム (mobile では縦並び):
- KY用紙作成 → `/ky?industry=construction`
- 朝礼ネタ提案 → `/chatbot?q=今日の朝礼で話す建設業の安全ネタを提案して&category=anzeneisei`
- サイネージ掲示 → `/signage?industry=construction`

### 3.3 役職別エントリ (3セクション)

#### 3.3.1 #for-foreman (職長向け)
- KY 建設業プリセット 3 作業 (鉄骨建方・型枠解体・コンクリート打設) を要約表示
- 「もっと建設業のKYを見る」 → /ky-examples?industry=construction
- フルハーネス・足場点検チェックリストへのリンク
- 朝礼ネタ生成 CTA

#### 3.3.2 #for-manager (元請担当向け)
- 統括安全衛生責任者の選任要件 (安衛法第15条) 引用 (逐語転載は最小限・参照のみ)
- 安全衛生日誌で月次報告まとめ → /safety-diary
- 重層下請の元方事業者責任の参照 → /chatbot?q=...

#### 3.3.3 #for-supervisor (現場代理人向け)
- 年次安全衛生計画書ジェネレータ → /strategy/plan-generator?industry=construction
- パトロールチェックリスト + 是正報告
- 計画届 (安衛法第88条) 提出時期チェック

### 3.4 月次運用 (#monthly)
- 安全衛生委員会議題テンプレ (4月〜3月)
- 月次パトロールチェック
- 統括安全衛生責任者会議のひな型

### 3.5 法令早見 (#laws)
建設業特化条文に絞り、各 1〜2 行の概要 + 詳細ページリンク:
- 足場規則 (組立・点検)
- 安衛則 第518条〜第575条 (墜落・足場の構造)
- クレーン等安全規則 (玉掛け・転倒防止)
- 有機則 (溶剤暴露)
- 粉じん則 (じん肺・健診)
- じん肺法 (粉じん作業歴管理)
- 建設業労働災害防止規程 (建災防)

### 3.6 化学物質 (#chemical)
建設業頻出 20 物質 (`CONSTRUCTION_PRIORITY_CAS`) をカテゴリ別 (塗装系/解体系/防水系/地盤改良系/溶剤系) で表示:
- 各物質 CAS + 名称 + クイック検索リンク (/chemical-database/[cas])
- 化学物質RA起動 CTA → /chemical-ra
- 規制タグ説明への動線

### 3.7 統計 (#stats)
- /accidents-reports/construction への大型 CTA
- 厚労省「業種別労災発生状況」公開データ (実数値のみ。創作禁止)
  - 値の更新タイミング: 既存集計関数を再利用
- 主要事故型: 墜落・転落、はさまれ・巻き込まれ、激突など (industry-risk-ranking)

### 3.8 関連通達 (#circulars)
- 建災防規程
- 墜落防止指針 (基発0314第2号 足場の組立て等)
- 石綿事前調査の電子報告
- 一人親方の安全衛生対策
- アンザイ熱中症対策ガイドライン (建設業向け)
→ /circulars と /laws へのフィルタ済リンク

### 3.9 法令チャット CTA + 統一CTA
- 「法令チャットで質問する」 → /chatbot
- main-feature-next-actions コンポーネント (exclude なし、契約として使い分け)

## 4. クエリ動作 (?role=...)

クライアントコンポーネントで `role` パラメータを読み取り、該当アンカーへ初期スクロール:
- `?role=foreman` → `#for-foreman`
- `?role=manager` → `#for-manager`
- `?role=supervisor` → `#for-supervisor`
- 未指定 → ページ先頭 (Hero)

## 5. 動線強化 (他ページからの誘導)

| 起点 | 配置先 | 内容 |
|------|--------|------|
| ホーム `/` | flagship-grid 直後 or 既存「主要機能」末尾 | 「建設業の方はこちら」 emerald CTA バナー |
| `/industries/construction` | ページ上部 | 「実務で使う方は → /for/construction」 |
| `/accidents-reports/construction` | 既存 CrossToolLinks 直後 | /for/construction へのリンク |
| `/strategy/plan-generator` (industry=construction 選択時) | フォーム上部に補助バナー | 「建設業の関連資料は /for/construction」 |
| `/chatbot` (建設業文脈検出時) | 既存「この内容を活用」内 | 「→ 建設業ハブ」 |

## 6. SEO

- title: `建設業の安全衛生 — 職長・元請担当・現場代理人のための実務ポータル | 安全AIポータル`
- description: `墜落・足場・クレーン・粉じん・化学物質まで、建設業の現場で当日から使える KY 用紙・朝礼ネタ・年次計画・法令早見を集約。労働安全衛生コンサルタント (登録番号260022) 監修の研究プロジェクト。`
- OG image: 既存パターン踏襲 (`ogImageUrl(TITLE, DESCRIPTION)`)
- JSON-LD: WebPage + BreadcrumbList + ItemList (各セクション) + FAQPage (Hero 下に「よくある使い方」を含めた場合)
- sitemap.xml に追加

## 7. 構造化データ詳細

```json
{
  "@type": "WebPage",
  "@id": "https://www.anzen-ai-portal.jp/for/construction",
  "name": "建設業の安全衛生",
  "description": "...",
  "audience": [
    { "@type": "Audience", "audienceType": "建設業職長" },
    { "@type": "Audience", "audienceType": "建設業元請安全担当" },
    { "@type": "Audience", "audienceType": "建設業現場代理人" }
  ],
  "about": { "@type": "Thing", "name": "建設業労働安全衛生" }
}
```

## 8. 「個人運営研究プロジェクト体裁」維持ポイント

- 「労働安全衛生コンサルタント (登録番号260022) 監修の研究プロジェクト」を Hero に明示
- 「業界No.1」「最大」「シェア」等の誇大表現禁止
- 統計値は厚労省公開データ実数のみ。創作禁止
- 「使ってもらえると嬉しい」「フィードバック歓迎」のトーンを維持

## 9. 実装ファイル一覧

新規:
- `web/src/app/(main)/for/construction/page.tsx` (Server Component、metadata + 静的JSX)
- `web/src/components/for-construction/role-anchor-scroller.tsx` (Client Component、?role= 対応)
- `web/src/components/for-construction/role-entries.tsx` (役職別 3 セクション、Server)
- `web/src/components/for-construction/section-today.tsx` (当日使える機能)
- `web/src/components/for-construction/section-chemical.tsx` (建設業頻出 20 物質)

再利用 (import のみ、コード変更なし):
- `IndustryRiskRanking` (industry-risk-ranking.tsx)
- `CrossToolLinks` (cross-tool-links.tsx)
- `MainFeatureNextActions` (main-feature-next-actions.tsx)
- `PageJsonLd`, `JsonLd` + breadcrumb/itemList helpers
- `CONSTRUCTION_PRIORITY_CAS` (regulation-tag-labels.ts)
- `CONSTRUCTION_PRESET` (industries-content/construction.ts ※ 部分参照)

改修 (動線追加):
- `web/src/app/(main)/industries/construction/...` または共通 industries 配下: 上部バナー
- `web/src/components/cross-tool-links.tsx`: construction industry のとき /for/construction を含める
- `web/src/components/home-*.tsx` or `app/(main)/page.tsx`: 建設業CTAバナー追加
- `web/src/app/sitemap.ts`: /for/construction を追加

## 10. テスト方針

- `web/src/app/(main)/for/construction/page.test.tsx`: SSR レンダリング確認 (重要セクション存在)
- `web/src/components/for-construction/role-anchor-scroller.test.tsx`: ?role= パラメータ動作
- 内部リンク全件 200 確認 (既存テストツールがあれば再利用)

## 11. ペルソナA改善見込み試算

37.5% → 65〜75% を目標。試算根拠:
- 困りごと10件のうち、3クリック以上だったもの (推定 6件) を 1〜2タップに短縮 → +20pt
- 役職別 3 エントリ で「自分向け感」増 → +10pt
- 既存 /industries/construction はそのまま (情報深さは維持) → リバウンドなし

最終評価は本番 curl で 5 経路 200 確認 + 改善点リスト化で報告。
