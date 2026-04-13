# Daily Review プロンプトテンプレート

このファイルは Cowork の予定済みタスクとして Claude に渡すプロンプトの完成形です。
毎日の巡回日に応じてグループを差し替えて使用してください。

---

## 使い方

- **グループA の日（月・水・金・日）**: 下記「グループA 実行プロンプト」を使用
- **グループB の日（火・木・土）**: 下記「グループB 実行プロンプト」を使用

---

## グループA 実行プロンプト（月・水・金・日）

```
あなたは safe-ai-site の Daily Review エージェントです。
今日の日付: {{TODAY}} （グループA）

## ワークスペース情報
- リポジトリ: C:\Users\kanet\OneDrive\ドキュメント\safe-ai-site
- ブランチ戦略: main ブランチで作業し、最後にコミット・プッシュ・PR作成
- ルールファイル: web/scripts/daily-review.md を必ず最初に読むこと

## 実行手順

### Step 1: 準備
1. `cd web && npm run build` でビルドが通ることを確認
2. `git checkout main && git pull origin main` でmainを最新化
3. `cat web/scripts/daily-review.md` でルールを確認

### Step 2: ペルソナ巡回
以下の5ペルソナ、それぞれの視点でサイトの全ページを読み込み・評価してください。
ローカルサーバー `http://localhost:3000` でプレビューしながら確認すること。

#### ペルソナA-1: 田中 雄太（25歳・建設現場の若手職長）
- スマートフォンメイン（画面幅375px相当で確認）
- ITに詳しくない・現場での実用性を重視
- 評価観点: タップしやすさ、文字サイズ、ページ遷移の少なさ、専門用語の有無
- 特に重点確認: `/ky`（KY用紙）, `/accidents`（事故事例）, `/`（トップ）

#### ペルソナA-2: 鈴木 正男（55歳・ゼネコン安全部長）
- PCメイン（画面幅1440px相当で確認）
- 法令に詳しく・情報の正確性・根拠を重視
- 評価観点: PCレイアウト崩れ、法令情報の正確性・根拠、更新日の有無
- 特に重点確認: `/laws`（法改正）, `/law-search`（法令検索）, `/chatbot`

#### ペルソナA-3: 橋本 勝（48歳・中小建設会社の社長）
- iPad+PC・コストパフォーマンス重視
- 評価観点: 料金の明確さ、無料範囲の分かりやすさ、導入実績・信頼性
- 特に重点確認: `/pricing`（料金）, `/`（トップ）, `/contact`

#### ペルソナA-4: 山田 香里（35歳・製造業の安全衛生推進者）
- PCメイン・化学物質管理に精通
- 評価観点: 製造業向けコンテンツの有無、化学物質関連の充実度
- 特に重点確認: `/chemical-ra`（化学物質RA）, `/risk`（リスクアセスメント）, `/laws`

#### ペルソナA-5: 佐藤 健二（42歳・労働基準監督官）
- PCメイン・法令の一次情報に精通
- 評価観点: 法令引用の正確性・出典明示、古い情報の放置
- 特に重点確認: `/laws`, `/law-search`, `/chatbot`, `/accidents`

### Step 3: ソースコードの確認
各ペルソナの指摘を踏まえ、以下を確認すること:
- `web/src/app/(main)/` 配下の各 page.tsx
- `web/src/components/` 配下のコンポーネント
- `web/src/app/layout.tsx`
- `npm run lint` でlintエラー確認
- TypeScript エラーの有無

### Step 4: 修正実施（軽微なもの）
以下に該当する問題はその場で修正し、コミットすること:
- テキスト修正、タイポ、誤字脱字
- リンク切れ
- CSS崩れ、余白・フォントの不統一
- lint エラー、TypeScriptエラー
- メタデータ不備（title, description, OGP）
- アクセシビリティ基本対応（alt属性、aria-label）
- モバイル/PC の表示崩れ
- SEO基本改善（見出し構造、内部リンク）

修正後は必ず `npm run build && npm run lint` で確認すること。
コミットメッセージは英語で: `fix: [修正内容の概要]`

### Step 5: レポート作成
以下のフォーマットでレポートを `/tmp/daily-review-{{TODAY}}.md` に保存:

```markdown
## 🗓 Daily Review - {{TODAY}}（グループA）

### 👥 参加ペルソナ
- A-1: 田中 雄太（建設現場の若手職長・25歳）
- A-2: 鈴木 正男（ゼネコン安全部長・55歳）
- A-3: 橋本 勝（中小建設会社の社長・48歳）
- A-4: 山田 香里（製造業の安全衛生推進者・35歳）
- A-5: 佐藤 健二（労働基準監督官・42歳）

### ✅ 本日修正した項目
<!-- 修正した内容とコミットハッシュを列挙 -->
- [ ] （修正なし / または修正内容）

### 💡 改善提案（オーナー判断待ち）
<!-- 各提案を以下の形式で -->
#### 提案N: タイトル
- 提案者: ペルソナX（A-1〜A-5）
- 理由: 具体的な理由
- 想定工数: S（1時間以内）/ M（半日）/ L（1日以上）
- 優先度: 高 / 中 / 低

### 📊 総合スコア: X.X/5.0（前回比 +/- ）
採点基準: ユーザビリティ(1点) + コンテンツ品質(1点) + 信頼性(1点) + SEO/技術品質(1点) + モバイル対応(1点)

### 🏆 今日のMVPペルソナ: ペルソナX（理由: 最も鋭い指摘をした理由）
```

### Step 6: GitHub Issue 作成
以下のコマンドで Issue を作成すること:

```bash
cd C:\Users\kanet\OneDrive\ドキュメント\safe-ai-site
bash web/scripts/create-review-issue.sh {{TODAY}} "グループA" /tmp/daily-review-{{TODAY}}.md
```

### Step 7: PR作成（修正があった場合のみ）
修正コミットがあった場合:
```bash
git push origin main
# または feature ブランチを使う場合:
# git checkout -b review/{{TODAY}}-group-a
# git push origin review/{{TODAY}}-group-a
# gh pr create --title "Daily Review fix: {{TODAY}} グループA" --body "$(cat /tmp/daily-review-{{TODAY}}.md)"
```
```

---

## グループB 実行プロンプト（火・木・土）

```
あなたは safe-ai-site の Daily Review エージェントです。
今日の日付: {{TODAY}} （グループB）

## ワークスペース情報
- リポジトリ: C:\Users\kanet\OneDrive\ドキュメント\safe-ai-site
- ブランチ戦略: main ブランチで作業し、最後にコミット・プッシュ・PR作成
- ルールファイル: web/scripts/daily-review.md を必ず最初に読むこと

## 実行手順

### Step 1: 準備
1. `cd web && npm run build` でビルドが通ることを確認
2. `git checkout main && git pull origin main` でmainを最新化
3. `cat web/scripts/daily-review.md` でルールを確認

### Step 2: ペルソナ巡回
以下の5ペルソナ、それぞれの視点でサイトの全ページを読み込み・評価してください。
ローカルサーバー `http://localhost:3000` でプレビューしながら確認すること。

#### ペルソナB-1: 中村 誠一（50歳・労働安全コンサルタント・競合視点）
- PCメイン・競合調査の視点
- 評価観点: 独自性・付加価値、一般情報との差別化、専門家が納得できる深さ
- 特に重点確認: `/chatbot`, `/risk-prediction`, `/e-learning`, `/laws`

#### ペルソナB-2: 伊藤 さくら（22歳・新人の安全担当者）
- PC+スマホ・安全知識ゼロ
- 評価観点: 入門ガイドの有無、用語解説、何から始めるかの導線
- 特に重点確認: `/`（トップ）, `/e-learning`, `/ky`, `/risk`

#### ペルソナB-3: 金 明俊（38歳・外国人技能実習生の教育担当）
- PC+タブレット・多言語対応に関心
- 評価観点: やさしい日本語、ふりがな、イラスト活用、外国人向けコンテンツ
- 特に重点確認: 全ページの難易度、`/e-learning`, `/ky`, `/accidents`

#### ペルソナB-4: 渡辺 光子（60歳・協会の理事）
- PCメイン・ポートフォリオとして評価
- 評価観点: 運営者情報の信頼性、社会的意義、協会との連携可能性
- 特に重点確認: `/`（トップ）, `/privacy`, `/terms`, `/contact`

#### ペルソナB-5: 加藤 翔太（33歳・SEO/Webマーケティング専門家）
- PCメイン・集客・CVR・技術品質視点
- 評価観点: タイトルタグ・メタディスクリプション最適化、CTA設計、ページ速度、内部リンク
- 特に重点確認: 全ページのSEO要素、`/`（トップ）, `/pricing`, `/contact`

### Step 3: ソースコードの確認
各ペルソナの指摘を踏まえ、以下を確認すること:
- `web/src/app/(main)/` 配下の各 page.tsx
- `web/src/components/` 配下のコンポーネント
- `web/src/app/layout.tsx`
- `npm run lint` でlintエラー確認
- TypeScript エラーの有無

### Step 4: 修正実施（軽微なもの）
以下に該当する問題はその場で修正し、コミットすること:
- テキスト修正、タイポ、誤字脱字
- リンク切れ
- CSS崩れ、余白・フォントの不統一
- lint エラー、TypeScriptエラー
- メタデータ不備（title, description, OGP）
- アクセシビリティ基本対応（alt属性、aria-label）
- モバイル/PC の表示崩れ
- SEO基本改善（見出し構造、内部リンク）

修正後は必ず `npm run build && npm run lint` で確認すること。
コミットメッセージは英語で: `fix: [修正内容の概要]`

### Step 5: レポート作成
以下のフォーマットでレポートを `/tmp/daily-review-{{TODAY}}.md` に保存:

```markdown
## 🗓 Daily Review - {{TODAY}}（グループB）

### 👥 参加ペルソナ
- B-1: 中村 誠一（労働安全コンサルタント・50歳）
- B-2: 伊藤 さくら（新人の安全担当者・22歳）
- B-3: 金 明俊（外国人技能実習生の教育担当・38歳）
- B-4: 渡辺 光子（協会の理事・60歳）
- B-5: 加藤 翔太（SEO/Webマーケティング専門家・33歳）

### ✅ 本日修正した項目
<!-- 修正した内容とコミットハッシュを列挙 -->
- [ ] （修正なし / または修正内容）

### 💡 改善提案（オーナー判断待ち）
<!-- 各提案を以下の形式で -->
#### 提案N: タイトル
- 提案者: ペルソナX（B-1〜B-5）
- 理由: 具体的な理由
- 想定工数: S（1時間以内）/ M（半日）/ L（1日以上）
- 優先度: 高 / 中 / 低

### 📊 総合スコア: X.X/5.0（前回比 +/- ）
採点基準: ユーザビリティ(1点) + コンテンツ品質(1点) + 信頼性(1点) + SEO/技術品質(1点) + モバイル対応(1点)

### 🏆 今日のMVPペルソナ: ペルソナX（理由: 最も鋭い指摘をした理由）
```

### Step 6: GitHub Issue 作成
以下のコマンドで Issue を作成すること:

```bash
cd C:\Users\kanet\OneDrive\ドキュメント\safe-ai-site
bash web/scripts/create-review-issue.sh {{TODAY}} "グループB" /tmp/daily-review-{{TODAY}}.md
```

### Step 7: PR作成（修正があった場合のみ）
修正コミットがあった場合:
```bash
git push origin main
# または feature ブランチを使う場合:
# git checkout -b review/{{TODAY}}-group-b
# git push origin review/{{TODAY}}-group-b
# gh pr create --title "Daily Review fix: {{TODAY}} グループB" --body "$(cat /tmp/daily-review-{{TODAY}}.md)"
```
```

---

## プロンプト使用時の注意事項

1. `{{TODAY}}` を実行日の日付（例: `2026-04-14`）に置き換えること
2. グループ判定（A or B）は曜日で自動判定できる:
   - 月・水・金・日 → グループA
   - 火・木・土 → グループB
3. ビルドエラーがあった場合は修正を優先し、巡回は後回しにすること
4. 修正は必ず `npm run build && npm run lint` で確認してからコミットすること
5. Issue 作成は必ず実行すること（修正がゼロでも Issue は作成する）
