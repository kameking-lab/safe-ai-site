# ニュースフィード AI判定基準の明文化 — 週次熱中症搬送記事の承認ゆらぎ診断（2026-07-04）

作成: ops班（運用・自律運転インフラ）。BACKLOG-ops.md 掃除系一括タスクの
「news-feed LLM判定基準の明文化（週次熱中症搬送記事の承認ゆらぎ是正）」の**明文化パート**。

> **スコープと限界（重要）**
> 本書は既存の判定パイプラインの基準を**そのまま文書化**し、実データで観測された
> 承認ゆらぎの**根本原因を特定**し、解消のための**選択肢を社長／data班に提示**する
> ものである。**判定プロンプト（`scripts/etl/news-ai-judge.mjs`）や
> フィルタ（`scripts/etl/news-feed-filters.mjs`）の挙動は本書では一切変更しない**。
> どの記事を採録するかは編集方針（editorial）の判断であり、AIパイプラインの
> 内容ロジック変更は data班の所有領域かつ社長承認事項（Path A）ゆえ、
> ops が独断で確定しない。§5 の決定は社長の1行判断を待つ。

---

## 1. パイプライン全体像（B.2 自律ニュースフィード）

```
fetch-news-feed.mjs                 … NHK/厚労省等をキーワード粗フィルタで収集
        │  → scripts/etl/data/news-feed-candidates.json
        ▼
news-feed-filters.mjs : prefilter() … 見出しだけで NEGATIVE_PATTERNS に当たれば
        │                             Gemini を呼ばず即 reject（コスト節約）
        ▼
news-ai-judge.mjs : Gemini 2.5 Flash … 1候補=1コール・structured JSON で4スコア
        │                             ＋newsType＋独自要約＋推定災害種/業種
        ▼
news-feed-filters.mjs : classifyOutcome() … per-type閾値で approved/pending/rejected
        │
        ▼
web/src/data/news-feed/{approved,rejected,pending}/index.json
        （approved 最新200件 / rejected 最新500件 / pending 最新200件で回転）
```

Gemini 呼び出しは `temperature: 0.1`（ほぼ決定的だが完全ではない）。
`GEMINI_API_KEY` 未設定時は judge が exit 0 で無変更ショートサーキット（ローカル安全）。

---

## 2. 4スコアゲート（`scripts/etl/news-feed-filters.mjs`）

Gemini が各候補に対して 0-100 の4スコアを返す。**4条件すべてを満たすと approved**。

| スコア | 意味 | 合格条件（BASE） | 低いほど安全か |
|--------|------|------------------|----------------|
| `relevance` | 労働災害・労働安全衛生報道としての関連性 | **≥ 70** | 高いほど良い |
| `copyrightRisk` | 著作権法32条の引用要件を満たすかの逆指標 | **≤ 30** | 低いほど安全 |
| `misinformationRisk` | 一次ソース特定可能性・信頼性の逆指標 | **≤ 30** | 低いほど安全 |
| `duplication` | 事故DB（累計5,000件超）との重複度 | **≤ 50** | 低いほど新規 |

### per-type 閾値の緩和（2026-05-17監査で確定）

`thresholdsFor(newsType)` が type ごとに BASE を上書きする。**緩めるのは監査で
誤発火が実証された type のみ**（保守的既定）。

| newsType | relevanceMin | duplicationMax | 緩和理由 |
|----------|:---:|:---:|----------|
| `accident_report` | 70 | 50 | 原則（4条件すべて厳格） |
| `administrative_notice` | 70 | **100** | 委員会・審査会告知は事故DBの重複対象外（recurrence は構造的） |
| `statistics_release` | **60** | **100** | 全国労災統計等は見出しだけだと relevance 60-69 に沈むが真に on-topic |
| `general_news` / `unknown` | 70 | 50 | ドリフト防止のため厳格維持 |

### 3-state 分類（`classifyOutcome`）

- **approved**: 違反理由ゼロ。
- **pending**（人手レビュー行き・`pending/index.json`）: 違反が**1件のみ**かつ次のいずれか
  - relevance が floor を小差で下回る（50 ≤ relevance < relevanceMin・他は clean）
  - accident_report で duplication が僅かに超過（51-70・他は clean）
- **rejected**: それ以外。`rejectionReasons` に人間可読の理由を格納。

---

## 3. newsType 判定基準（`news-ai-judge.mjs` の JUDGE_INSTRUCTION）

Gemini はまず4類型から newsType を選ぶ。**relevance のスコアレンジは newsType に従属**する。

| newsType | 定義 | relevance 指示レンジ |
|----------|------|----------------------|
| `accident_report` | 実際の労災・事故・健康被害の発生報道 | 業務起因明示 85-95 / 見出しに業務起因なしの一般事故 30-50 |
| `administrative_notice` | 行政の会議・委員会・審査会・制度改正の開催/発表案内 | 労安衛関連なら 80-95 |
| `statistics_release` | 統計・調査・白書・実態調査の発表 | 労災統計なら 80-95 |
| `general_news` | 上記以外。業務との明確な関連が見出しから読めない一般ニュース（**学校熱中症・家庭内事故・観光客・刑事事件等**） | 30 以下 |

### prefilter の負パターン（Gemini 前に即 reject）

見出しだけで明らかに非労働の文脈は AI コール前に落とす（`prefilter()`）。意図的に
narrow＝「見落とし（AIに委ねる）＞誤爆（判定すべきものを黙って落とす）」。

| tag | 正規表現の要旨 |
|-----|----------------|
| school-context | 小中学校・小学校・中学校・高校・大学・児童・生徒・学生 |
| childcare-context | 保育園・幼稚園・こども園 |
| home-context | 家庭で/自宅で/室内で…高齢者/エアコン使用…高齢者 |
| tourist-context | 観光客・登山客・海水浴・キャンプ場…事故・釣り客 |
| sports-context | スポーツ…事故・部活動・練習中…生徒 |
| commute-school-context | 通学・通園・登校中・下校中 |

---

## 4. 承認ゆらぎの根本原因（実データで確定）

`web/src/data/news-feed/{approved,rejected}/index.json` の実採録を突合すると、
**内容がほぼ同型の「全国熱中症搬送 集計記事」が newsType の揺れによって承認/却下を
またいで振れている**ことが観測できる（2026-07-04 時点）。

**approved 側:**
- 「5月の全国熱中症搬送4176人 2015年以降2番目の多さ」→ `statistics_release` rel=85 → **承認**

**rejected 側（ほぼ同型なのに）:**
- 「熱中症 搬送者数 全国で1100人余1人死亡（5月18日～24日）」→ `general_news` rel=25 → **却下**
- 「熱中症 搬送者数 5月11～17日に全国で1000人以上 1人死亡」→ `general_news` rel=25 → **却下**

### なぜ振れるか

1. **prefilter を素通りする**: 週次熱中症搬送の集計見出し（「熱中症 搬送者数 全国で…」）は
   NEGATIVE_PATTERNS のどれにも一致しない（学校/家庭/観光の語が無い）→ Gemini に到達。
2. **newsType のどのバケットにも綺麗に嵌らない**: 全設定横断（職場＋屋外＋家庭＋…）の
   集計搬送数は、特定の労災 `accident_report` でも、労災統計 `statistics_release`（プロンプト例は
   労働災害統計/化学物質実態調査）でも、`administrative_notice` でもない。
3. **明文の規則が無い**: 集計搬送数の扱いについてプロンプトが何も規定していないため、
   Gemini は見出しのフレーミング手掛かりで newsType を選ぶ。「◯月の全国搬送4176人
   2015年以降2番目」は比較統計の体裁→`statistics_release`（rel 85・**承認**）に寄り、
   「熱中症 搬送者数 全国で1100人余（週）」は速報ティッカーの体裁→`general_news`
   （rel 25・**却下**）に寄る。`temperature: 0.1` でも見出し文言が週ごとに変わるため
   分類が安定しない＝**承認ゆらぎ**。

要するに、**「複数設定横断の熱中症搬送 集計カウント記事」に対する明文の判定規則が
基準に欠落している**のが一次原因である。ゆらぎは Gemini の非決定性ではなく、
**基準の穴**（未規定領域）を反映している。

---

## 5. 社長／data班への決定事項（Path A・ops は独断確定しない）

ゆらぎ解消には「集計熱中症搬送記事を一貫して**承認**するか**却下**するか」を
編集方針として1つに定める必要がある。どちらでもゆらぎは消える。ops はプロンプト/
フィルタを変更せず、以下を提示するに留める。

### 選択肢A: 一貫して**承認**（夏季の熱中症予防喚起素材として採録）
- 論拠: 週次/月次の全国熱中症搬送集計は職場での熱中症を含み、猛暑期の予防喚起として
  現場ユーザーに有用。approved 側に既に「5月の全国熱中症搬送4176人」が入っており、
  却下側の週次版と編集価値は実質同等。
- 実装イメージ（data班が担う・要社長承認）: JUDGE_INSTRUCTION の `statistics_release`
  定義に「全国/地域の熱中症搬送・救急搬送の集計発表（消防庁週報等）を含む」を1行明記し、
  relevance を統計扱い（80-95）で安定させる。

### 選択肢B: 一貫して**却下**（職場文脈が明示されない集計は非採録）
- 論拠: 業務起因が見出しから読めない全国集計は労働安全ポータルの主旨から外れる、
  という現行 general_news 方針の徹底。
- 実装イメージ（data班が担う・要社長承認）: `NEGATIVE_PATTERNS` に「職場/作業/労働/
  事業場 等の文脈語を伴わない裸の『熱中症 搬送者数 …人』集計」を落とす負パターンを追加
  （narrow に・職場語を伴うものは残す）。prefilter 段でコストゼロ却下に統一。

### ops の推奨（非拘束）
現場運用ポータルの性格（猛暑期の予防喚起価値）と、approved 側に既に月次集計が
定着している一貫性から、**選択肢A（一貫承認）**を推奨。ただし最終判断は編集方針＝
社長／data班に委ねる。本書は決定の土台であり、決定そのものではない。

---

## 6. 参照

- 判定プロンプト: `scripts/etl/news-ai-judge.mjs`（JUDGE_INSTRUCTION・4スコア）
- ゲートロジック: `scripts/etl/news-feed-filters.mjs`（prefilter / thresholdsFor / classifyOutcome）
- 収集: `scripts/etl/fetch-news-feed.mjs`
- 出力: `web/src/data/news-feed/{approved,rejected,pending}/index.json`
- 消費UI: `web/src/lib/news-feed.ts`（approved を読み込む surface loader）
- 監査の起点: `news-feed-filters.mjs` 冒頭コメント（2026-05-17 初回cron監査の2問題）
