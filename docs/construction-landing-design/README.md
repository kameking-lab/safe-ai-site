# 建設業向けランディング /for/construction — 設計図

作成日: 2026-05-23
ブランチ: `claude/construction-landing-page-H8qTo`
作業背景: ペルソナA（建設業職長・元請安全担当・現場代理人、現在◯率37.5%）の押し上げ。

---

## 1. 目的と差別化

### 既存 `/industries/construction` との違い

- `/industries/construction`: 10業種の一つとしてSEO最適化・条文/通達/事故事例/KY/化学物質/教育/FAQ を網羅する**情報集約ハブ**。
- `/for/construction`: 建設業の3役職（職長／元請安全担当／現場代理人）の**業務時間軸（当日／月次／年次）で動線を整理**する**ランディング**。
  - 「自分向けに作られた」と一目で分かる役職別エントリ
  - 当日朝礼に間に合うツール（KY・朝礼ネタ・本日の事故例）を最上段に
  - 月次運用（議題・パトロール・KY実例）と年次運用（計画書ジェネレータ）を中段に
  - 主要法令・統計・外部リソースを下段に

URL 設計:
- `/industries/construction` は維持（変更禁止）
- 新設は `/for/construction` のみ
- `/for/` 名前空間は将来的に他業種ペルソナLPの拡張余地

---

## 2. ペルソナと困りごとの動線設計

### ペルソナA: 建設業職長

| 困りごと | 現状クリック数 | /for/construction 配置 |
|---|---|---|
| 今日のKYを3分で作りたい | 3クリック (top→/ky→industry select) | Hero直下「当日使える」ボックス |
| 朝礼で話すネタが欲しい | なし | 「本日の事故例」+「朝礼ネタ提案」 |
| 足場点検基準を引きたい | 3クリック (top→/laws→search) | 「法令早見」ブロック |

### ペルソナA: 元請安全担当

| 困りごと | /for/construction 配置 |
|---|---|
| 統括安全衛生責任者の選任要件 | 「法令早見」+「役職別エントリ - 元請安全担当」 |
| 安全衛生委員会の議題 | 「月次運用」 |
| パトロールチェックリスト | 「月次運用」 |

### ペルソナA: 現場代理人

| 困りごと | /for/construction 配置 |
|---|---|
| 年次安全衛生計画書 | 「年次運用」→ plan-generator |
| 計画届(安衛法88条)の準備 | 「法令早見」 |
| 重層下請の安全衛生指導 | 「役職別エントリ - 現場代理人」 |

---

## 3. セクション構成（上から下）

### 3.1 Hero
- 見出し: 「建設現場の安全衛生、ここに集約」
- リード: 「職長・元請安全担当・現場代理人の3役職向けに、当日・月次・年次の運用をまとめたエントリポイント。」
- バッジ: `建設業特化` / `個人運営研究プロジェクト` / `無料`
- 統計サマリ: 建設業 事故事例件数・うち死亡・最多事故型（accident-analysis から自動取得）
- CTA 3つ: 「KY用紙を作る」「事故分析レポート」「年次計画ジェネレータ」

### 3.2 役職別エントリ (3列)
- 職長向け（橙）: KY、朝礼ネタ、本日の事故例、フルハーネス特別教育
- 元請安全担当向け（青）: 統括安全衛生責任者要件、混在作業連絡調整、店社安全衛生管理者、安全衛生協議会議事録
- 現場代理人向け（緑）: 計画届(88条)、年次計画書、安全衛生委員会議題、パトロールチェックリスト

### 3.3 当日使える機能
- KY用紙（建設プリセット） — `/ky?industry=construction`
- 朝礼ネタ提案 — 今日の天気/事故事例から自動生成（既存 chat へリンク）
- 本日の事故例 — accidents-reports/construction の最新3件

### 3.4 月次運用
- 安全衛生委員会議題テンプレ — `/strategy/plan-generator?industry=construction#monthly` （アンカー想定）
- 建設業パトロールチェックリスト — `/industries/construction#patrol` または既存リンク
- KY実例150件 — `/ky-examples?industry=construction` （建設業ぶんは現状30件、表記注記）

### 3.5 年次運用
- 年次安全衛生計画ジェネレータ — `/strategy/plan-generator?industry=construction`
- リスクアセスメント雛形 — `/risk` 等
- 教育記録・特別教育リスト — `/education-certification/finder?industry=construction`

### 3.6 法令早見
建設業頻出条文を6カテゴリで一覧化:
- 墜落・転落: 安衛則 第518条〜第533条
- 足場: 安衛則 第564条〜第575条
- 統括安全衛生責任者: 安衛法 第15条〜第15条の3
- 計画届: 安衛法 第88条
- クレーン: クレーン等安全規則
- 石綿: 石綿障害予防規則 第3条〜第4条の2
- 粉じん・じん肺: 粉じん則／じん肺法
- 熱中症: 安衛則 第612条の2

各項目から `/law-search?q=...` へ。

### 3.7 統計
- 建設業労災実数（厚労省公開データ）— accident-analysis レイヤから取得
- 業界傾向（最多事故型・死亡シェア）

### 3.8 外部リソース
- 厚労省「職場のあんぜんサイト」
- 建設業労働災害防止協会（建災防）
- 国土交通省 建設現場リーフレット
（リーフレットは MLIT_RESOURCES / MHLW_LEAFLETS を参照、ない場合は外部URLのみ）

### 3.9 関連ページ
- `/industries/construction`（網羅情報ハブへ）
- `/accidents-reports/construction`
- `/asbestos-management`
- `/heat-illness-prevention`

---

## 4. 既存コンポーネント再利用

| 既存 | 用途 |
|---|---|
| `PageContainer`, `Section`, `CardGrid`, `Cluster`, `Stack` | レイアウト基盤 |
| `Breadcrumb` | パンくず |
| `JsonLd` + `webPageSchema` + `breadcrumbSchema` | 構造化データ |
| `withSiteOpenGraph`, `withSiteTwitter`, `ogImageUrl` | メタデータ |
| `constructionContent` from `data/industries-content/construction.ts` | 重点課題・通達・教育・FAQ |
| `getIndustryReport("construction")` from `lib/accident-analysis` | 統計サマリ |

新規UIは Hero と役職別エントリの3列カードのみ。それ以外はすべて既存パターンを踏襲。

---

## 5. メタデータ・SEO

- title: `建設業の安全衛生ポータル｜職長・元請・現場代理人向けエントリ /for/construction`
- description: 「建設業職長・元請安全担当・現場代理人向けに当日・月次・年次の運用をまとめたランディング。KY用紙・足場/墜落/クレーン/石綿/熱中症の法令早見・年次計画ジェネレータへ集約。」
- canonical: `/for/construction`
- JSON-LD: `WebPage` + `BreadcrumbList` + `ItemList`（役職別エントリと月次/年次運用ツール）

---

## 6. 内部リンク補強

| 補強元 | 追加先 | 配置 |
|---|---|---|
| `/` (home) | `/for/construction` | FlagshipGrid 下に「建設業の方はこちら」帯 |
| `/industries/construction` | `/for/construction` | 既存 Hero下 or 推奨セクション末尾 |
| `/chatbot` | `/for/construction` | ページ内 quick-link |
| `/accidents-reports/construction` | `/for/construction` | 既存 layout 内 cross-link |
| `/strategy/plan-generator` (建設業選択時) | `/for/construction` | 補助リンク |

---

## 7. 禁止事項チェック

- 「最大」「業界No.1」等の誇大表現: ❌ 使わない
- 法令本文の逐語転載: ❌ 条文番号と要約のみ
- 創作データ: ❌ 既存data層のみ参照
- URL変更: ❌ `/industries/construction` は維持
- 企業向け表現: ❌ 「個人運営研究プロジェクト」体裁を維持
- main直接コミット: ❌ `claude/construction-landing-page-H8qTo` で作業

---

## 8. レスポンシブ

- 375px (mobile): 全セクション1列
- 768px (tablet): 役職別エントリ 2-3列、その他適宜
- 1024px+ (desktop): 役職別エントリ 3列、`max-w-7xl` でセンタリング
- 1920px (full HD): 横間延びしないよう `PageContainer width="full"` で `max-w-7xl`
