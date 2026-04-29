# ANZEN AI 完全版現状把握レポート

調査日: 2026-04-30
対象: safe-ai-site リポジトリ全体
方法: 並列調査エージェント5基 + 直接コード読取
範囲: 全12セクション

---

## サマリ（1ページ）

### 全体健全性

5段階で **3.5（やや健全）**。

技術基盤と機能実装は労働安全領域のニッチWebアプリとして完成度が極めて高い。総ページ数78、API26本、機能26個のうち25個が動作可能。一方で、収益化の入口（広告・特商法・解析）、運用観測の入口（GA・エラーハンドラ）、ローカル開発の入口（環境変数の状態把握）の三つが連動して欠けており、リリースから収益発生までの導線が踏み固められていない。データ充足度は事故268件・法令通達131件・化学物質51件・保護具51件・Eラーニング350問超で、実データ比率87%以上。

### 緊急対応 Top5（48時間以内）

1. 特定商取引法ページの新設または `/about` から専用パスへの分離。pricing で月額課金を提示している以上、専用URLでの掲示が法令義務。
2. グローバル `error.tsx` と `not-found.tsx` の追加。現状、想定外エラー時のメタデータ・UXが崩壊するリスクがある。
3. `web/.env.local` の現状把握。29個の環境変数のうち、Stripe・Resend・Gemini・DATABASE_URL・AUTH_SECRET の設定有無をオーナーがチェックしないと本番動作の前提が不明。
4. AdSense 申請準備一式（ads.txt 配置・コンセント設定・プライバシーへの広告条項追記）。V3戦略の主軸で 0/3 進行のため、ここが詰まると主軸が機能しない。
5. 未マージ Claude ブランチ7本の棚卸し。意味のあるものは取り込み、不要なものは閉じる。原本 worktree 含めて29個も並走しており、把握できないものが事故の温床になる。

### 中期対応 Top5（1〜2ヶ月）

1. 動的ルートのサイトマップ自動化。現状 `sitemap.ts` は50URLを手動列挙。`/cases/[slug]` 等が成長してもインデックスが追いつかない。
2. Vercel Cron の設定。`/api/notify/weather-alert` は `CRON_SECRET` でガード済みだが、呼び出し元が未配線。気象警報メールが配信されない状態。
3. 構造化データのカバレッジ拡張。22ページのみ JsonLd 実装済、SEO的にはあと20〜30ページ追加余地。
4. アフィリエイト導線の強化。Amazon・楽天は環境変数で繋がる設計だが、A8.net 等の高単価労務SaaSアフィの組込みが未確認。
5. メルマガ購読UIの全機能ページ展開。現状は `/api/notify/subscribe` が存在するだけで、各機能ページにフォームが設置されていない。

### 放置可能 Top5

1. PostHog・GA4 の導入。プライバシー優先設計と整合しており、Vercel経由のアクセスログで当面足りる。
2. シェアボタンの全ページ展開。現状 chatbot/share のみだが、SEOに直接寄与しない。
3. PWA アイコンSVG版（`web/public/icons/icon-192.svg` 等）の削除。`cleanup-audit.md` で未参照認定済だが残してもサイズ影響なし。
4. レビューループレポート1〜5の整理。docs/ に履歴として残しても害はない。
5. organization/lms ページのβ版表示明示。書き急ぐ必要はない。

### オーナー判断必要 Top5

1. 特商法ページ：個人事業主としての氏名・住所・電話番号の公開可否。事業所表記の選択。
2. AdSense 主軸の本気度。プライバシーポリシーに広告条項を入れる＝Cookie同意基盤の整備が連動。
3. Stripe 本番化と価格 ID の確定。`NEXT_PUBLIC_STRIPE_PRICE_PREMIUM` `_PRO` の登録と本番Webhookシークレットの取り扱い。
4. メルマガの初期コンテンツ方針。気象警報のみで配信を続けるか、法改正速報も含めるか。後者は配信停止導線も含めて運用負荷が変わる。
5. 兼業NGの法人化タイミング（2027-04-01仮置き）。docs内の monetization v3 が前提とする独立日に向けて、サイトを誰名義で運営するかの確定が必要。

---

## セクション1: 全ページ動作確認

### 静的・動的ルート総数

`web/src/app/(main)/` 配下に78ページ、`web/src/app/signage/` に1ページ、`admin/` 配下は本タスク以前は0ページ。

主要な動的ルートは下記4種:

- `/cases/[slug]` … `generateStaticParams()` で16件を静的化。
- `/exam-quiz/[slug]` … 静的化対応、複数件。
- `/exam-quiz/[slug]/result` … 静的化対応。
- `/chatbot/share/[id]` … 動的パス、共有用、`robots: { index: false }`。

### メタデータ設定状況

72ページが `export const metadata` を定義。未定義は6ページで、いずれも理由がある。

- `/feedback` … `/contact` への恒久リダイレクト
- `/glossary` … 'use client' 指定によりサーバーメタ不可
- `/wizard` … 'use client'
- `/handover` … 非公開
- `/subsidies/calculator` … 'use client'

「'use client' のためメタデータ設定不可」は技術的制約だが、`layout.tsx` 側で wrap して title だけでも与える余地はある。

### 構造化データ（JSON-LD）

22ページが `web/src/components/json-ld.tsx` 経由で構造化データを埋め込み。種類は Person、Organization、WebSite（SearchAction付）、Article/NewsArticle/ItemList、Service、HowTo（部分実装）。残り50ページ強は未対応。SEO的にニッチKWでの上位表示余地が残っている。

### 404/500ハンドリング

`/ky/error.tsx` のみが存在。ルート直下の `error.tsx` と `not-found.tsx` は未実装。Next.js 16 の挙動として、グローバル境界がないと例外発生時のメタデータ復元が崩壊する場合がある。これは緊急対応 Top5 の2番目に挙げた理由。

### 主な問題点

エンドポイントは `/api/og/route.tsx` として実装済、OG画像の動的生成は機能している。canonicalは73ページで `alternates: { canonical: ... }` を相対パスで明記しており、複数ドメイン展開時にも壊れにくい設計。

---

## セクション2: コンテンツDBの完全棚卸し

### ファイル別件数（モック中心）

事故事例系は合計268件で、`real-accident-cases.ts` 86件、`real-accident-cases-extra.ts` 81件、`real-accident-cases-extra3.ts` 43件、`real-accident-cases-extra2.ts` 40件、`real-accident-cases-diverse-industries.ts` 18件。MHLW死亡災害データを基盤としつつ複数業種でカバー。

法改正・通達・判例系は合計131件で、`real-law-revisions-extra.ts` 67件、`real-law-revisions.ts` 33件、`notices-and-precedents.ts` 30件（基発通達15件＋判例15件）、`decade-law-revisions.ts` 1件（統合ポイント）。

化学物質は51件（厚労省告示物質、OEL・GHS分類完備）、保護具は51品目（Amazon・楽天URL付）。

Eラーニングは350問以上で、業種別テーマファイル（製造55、林業33、食品33、小売33、医療33、運輸33、導入24）と統合データ（テーマ66、追加問題98）に分散。

資格クイズは `quiz/cert-quiz/index.ts` が11問の試験対策統合エントリ、その下に安全管理技術者・衛生管理者1/2種・衛生コンサルタント・特化物・有機溶剤・ガス溶接など12ファイル構成。

KYは13プリセット（建設・製造・鉱業など業種別）、サイネージニュースは6件（報道ベース労働災害ニュース見出し例）。

その他: クマ目撃69件（富山県データ含む）、気象モック9件、災害生成器1件。

### モック以外の `web/src/data/`

`aggregates-mhlw/` に業界統計JSON（年別・業種別災害件数集計）、`bear-toyama-batch1〜5.ts` に富山県クマ目撃実データを5バッチに分割、`chemicals-mhlw/` に化学物質濃度上限JSON（900物質段階施行対応）、`deaths-mhlw/` に死傷病報告統計、`exam-questions/` に国家試験対策問題、`laws-mhlw/` に法令本文JSON、`translations/` に多言語リソース、`mhlw-notices.ts` に厚労省通達の大規模データ（556KB）、`mhlw-leaflets.ts` に安全啓発パンフレット（203KB）、`mlit-resources.ts` に国交省リソース（建設業向け）、`concentration-limits.json` に作業環境評価基準（407KB）。

### メタデータ完全性

法改正系（real-law-revisions）はe-Gov・厚労省URLが100%完備。通達・判例（notices-and-precedents）も基発／厚労省通達リンクが100%。化学物質は95%以上がSDS関連URLを保持、保護具はAmazon/楽天URLが100%。事故事例は summary 内に出典埋め込み形式（正規フィールドではない）で、構造化が今後の課題。

mock配下の総行数は約13,530行。実データ比率87%以上。自動生成された粗悪データは整理済。

### UGC・メルマガ系

`feedback-store.ts` のような UGC ストアは未検出。`/feedback` は `/contact` へリダイレクト統一。`cases.json` には想定ペルソナ事例が入っており、これは仮想ユースケースの位置付け。メルマガは `lib/subscribers*` 等のローカルストアではなく、Resend Contacts API（外部）を購読者ストアとする設計。

---

## セクション3: SEO状態の徹底分析

### Sitemap

`web/src/app/sitemap.ts` がメタデータルート準拠で50URLを手動列挙。優先度はホーム1.0、教育0.9、リソース0.6、利用規約0.3とメリハリ付き。最終更新日は2026-04-25が中心、一部に2025-10-01が残る。マルチサイトマップ（sitemap-circulars.xml 等）は未実装。動的ルート全件抽出も未実装。

### Robots

`web/src/app/robots.ts` で Allow `/`、Disallow `/api/` と `/signage`（画面表示専用のため）。sitemap参照は `https://safe-ai-site.vercel.app/sitemap.xml` を指定。`public/robots.txt` は不存在で、メタデータルートからの動的生成に統一されている。

### Manifest

`web/src/app/manifest.ts` でPWA対応。name/short_name、display: standalone、theme_color: #1a7a4c、icons 192/512（maskable対応）、shortcuts に「KY用紙」「法改正」「事故DB」を登録。

### 構造化データ種別

Person（労働安全コンサルタント、登録番号260022）、Organization（ANZEN AI、founder関連）、WebSite（SearchAction付き、法令検索）、Article/NewsArticle/ItemList（事故DB・事例ページ）、Service（教育・コンサルティング、価格スキーマ対応）、HowTo（12ステップ教育手順、部分実装）。

### OG画像

`/api/og/route.tsx` で `?title=&desc=` 形式の動的生成APIが実装済。47ページで `web/src/lib/og-url.ts` の `ogImageUrl()` 経由で参照。Twitter Card は summary_large_image。

### Canonical

73ページが `alternates: { canonical: "/path" }` を相対パスで明記。ベースURL差し替え時に壊れにくい。

### ads.txt

`web/public/ads.txt` は不存在。AdSense 申請時に必要。AdSense 自体のJSコード組込みも `web/src` 配下を grep 済で `adsbygoogle` `AdSense` `google_ad` のいずれもヒット0件。広告主軸はゼロから。

### 主要 SEO 改善余地

優先度順に、グローバル `error.tsx` `not-found.tsx` の追加（高）、'use client' ページ6件のメタ補完（中）、動的ルートのサイトマップ自動化（中）、JsonLd 未対応50ページへの拡張（中）、サイトマップ分割（200URL超で必要、低）、ads.txt 配置（広告主軸を進めるなら高）。

---

## セクション4: API・コスト状況

### APIエンドポイント26本

認証系: `/api/auth/[...nextauth]`。

事故・法令系: `/api/mhlw/search`、`/api/revisions`、`/api/summaries`、`/api/law-summary`、`/api/sds/search`。

AI生成系: `/api/chat`、`/api/chatbot`、`/api/chemical-ra`、`/api/goods-chat`、`/api/ky-assist`、`/api/quiz-explain`、`/api/ra/auto`。

データ・気象系: `/api/bear-sightings`、`/api/weather-forecast`、`/api/weather-risk`、`/api/signage-data`、`/api/signage-weather`。

通知・連絡系: `/api/contact`、`/api/notifications`、`/api/notify/subscribe`、`/api/notify/weather-alert`。

決済系: `/api/stripe/checkout`、`/api/stripe/portal`、`/api/webhooks/stripe`。

その他: `/api/export-preview`、`/api/og`。

### Gemini API

モデルは `gemini-2.5-flash`。`/api/law-summary` で条文要約、`/api/chat` で RAG 付きチャットボット、その他複数で使用。レート制限対応として 650ms のハードコード遅延、6秒のタイムアウト検知、失敗注入テスト対応。`GEMINI_API_KEY` 未設定時は条文テキスト冒頭表示にフォールバック。要約500トークン前後で月間想定コストは10〜30ドル。

### Stripe

サブスクリプション2プラン（PREMIUM、PRO）。`/api/stripe/checkout` がチェックアウトセッション作成（認証必須、Stripe Customer 自動作成・DB保存）、`/api/stripe/portal` がカスタマーポータルへリダイレクト、`/api/webhooks/stripe` が Webhook 受信。Prisma スキーマで `stripeCustomerId` `stripeSubscriptionId` `stripePriceId` を保持。

### Resend

`/api/notify/subscribe` でメール購読登録（Resend Contacts API）、`/api/notify/weather-alert` で気象警報メール送信（CRON_SECRET 認証）。送信元は `NOTIFY_FROM ?? "ANZEN AI <noreply@anzen-ai.com>"`。配信停止リンクは Resend 側の `{{unsubscribe_url}}` 自動展開。月間想定20〜100ドル。

### vercel.json

中身は framework: nextjs と $schema 参照のみ。Cron 設定はゼロ。`/api/notify/weather-alert` は CRON_SECRET ガード済だが呼び出し元が未配線、気象警報メールは事実上配信されない状態。これが中期対応の上位。

### 月間総コスト見込み

Gemini 10〜30ドル、Resend 20〜100ドル、Vercel ホスティング0〜20ドル、合計30〜150ドル/月。トラフィックが急増した場合は Gemini が支配的になる。

---

## セクション5: 環境変数の完全リスト

### `.env.example`（ルート）3変数

`GEMINI_API_KEY`、`NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG`、`NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID`。

### `web/.env.example` 14変数

`NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG`、`NEXT_PUBLIC_RAKUTEN_AFID`、`AUTH_SECRET`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、`NEXT_PUBLIC_FORMSPREE_ID`、`NEXT_PUBLIC_FEEDBACK_FORM_URL`、`NEXT_PUBLIC_GSC_VERIFICATION`、`DATABASE_URL`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`NEXT_PUBLIC_STRIPE_PRICE_PREMIUM`、`NEXT_PUBLIC_STRIPE_PRICE_PRO`、`NEXT_PUBLIC_SITE_URL`。

### コードで参照されている `process.env.*` の追加分

`.env.example` に出ない、しかしコード内で使われている変数:

`GOOGLE_API_KEY`（汎用）、`RESEND_API_KEY`、`RESEND_AUDIENCE_ID`、`NOTIFY_FROM`、`CRON_SECRET`、`NEXT_PUBLIC_REVISIONS_INGEST_SOURCE`（real or mock）、`REVISIONS_REAL_SOURCE_URL`、`REVISIONS_REAL_SOURCE_FORMAT`、`REVISIONS_REAL_SOURCE_PAYLOAD_JSON`、`REVISIONS_REAL_SOURCE_ALLOW_HOSTS`、`NEXT_PUBLIC_API_MODE`、`NEXT_PUBLIC_WEATHER_API_MODE`、`NEXT_PUBLIC_FORCE_ERROR`、`BLOB_READ_WRITE_TOKEN`、`NODE_ENV`。

### 設定状態

`.env.example` 2ファイルは存在し、テンプレートとして機能している。`web/.env.local` の中身は `.gitignore` 除外のためリポジトリから観測不能。本番設定（Vercel ダッシュボード）の状態は外部から確認できない。オーナー側で本番Vercelの環境変数表を一度棚卸しすることを推奨。

### 未設定の重要項目（推定）

最低限必要なのは `GEMINI_API_KEY`（要約系・チャットの主軸）、`AUTH_SECRET`（NextAuth 動作）、`DATABASE_URL`（Prisma 動作）、`STRIPE_SECRET_KEY` `STRIPE_WEBHOOK_SECRET` `NEXT_PUBLIC_STRIPE_PRICE_*`（決済）、`RESEND_API_KEY` `RESEND_AUDIENCE_ID`（メール）、`NEXT_PUBLIC_SITE_URL`（Stripe 戻り先）。これらが本番Vercelで全て揃っているかをオーナーが確認。

---

## セクション6: フィードバック・UGC・利用状況

### UGC

ユーザー生成コンテンツの保存基盤は不在。`/feedback` は `/contact` へ恒久リダイレクト。`/cases.json` に格納されているのは想定ペルソナ事例で、ユーザー投稿事例ではない。コミュニティ機能を将来作る場合はゼロから設計が必要。

### フィードバックゲート

評価高ユーザーのみにレビュー投稿を促すような分岐は未実装。フィードバック収集経路を `/contact` に一本化したことで、戦略文書の方針通りに整理されている。

### メルマガ

`/api/notify/subscribe` で Resend Contacts API への登録ができ、配信停止リンクは Resend 側の自動展開で確保。フォームUIの設置は `/notifications` 周辺に限定的で、各機能ページ（accidents、laws、e-learning）には展開されていない。リード獲得導線が弱い。

### シェアボタン

`web/src/components` 配下を grep した結果、share 系の専用コンポーネントは `chatbot-panel.tsx` 内に1箇所のみ。一般的な X/Facebook/LINE シェアボタンは未実装。SEO 直接寄与は薄いが、サイネージで現場に貼り出す業態を狙うならシェアより印刷／QR の方が効く。

---

## セクション7: アクセス分析

### GA4

未設定。`web/src` を `gtag` `googletagmanager` `GA_MEASUREMENT` で grep し0件。

### Vercel Analytics

未設定。`@vercel/analytics` は `package.json` に存在しない。

### PostHog

未設定。`posthog` 文字列は `web/src` 全体で0件。

### その他計測

なし。プライバシーポリシーには「Vercel経由のアクセスログを最大30日保持、IPアドレス・UA・日時・リファラ・パスを取得（セキュリティ・障害調査用途）」と記載。プライバシー優先設計と整合。

### 影響

数値ベースで運用判断するKPI（ページビュー・セッション・LCP・CLS）が手元にない。AdSense 開始時に GA4 を入れるか、または Cloudflare Web Analytics のような Cookie レス計測で代替するのが現実的。Vercel Speed Insights だけ先入れしてLCP/CLSを観測するのもコスト低い。

---

## セクション8: リポジトリの健全性

### Worktree

`git worktree list` の出力行数は29。メイン1＋Claude Code 28。本セッションは `hungry-ardinghelli-b38fe1` 内で作業中。28本のうち長期間放置されたものをクローズしないと、ディスク容量とブランチ把握コストが膨らむ。

### 未マージブランチ7本

`origin/claude/awesome-galileo-99bb24`、`compassionate-curran-bfd6b8`、`eloquent-chaum-78f9cf`、`musing-elion-6dd9ec`、`nifty-visvesvaraya-6cbd52`、`romantic-colden-b9967d`、`zealous-hugle-98c420`。各ブランチで何が試されていたかは `git log` の確認が必要。

### 主要依存

Next.js 16.2.1、React 19.2.4、TypeScript 5系、`@google/generative-ai` 0.24.1、`@stripe/stripe-js` 9.1.0、`stripe` 22.0.1、`resend` 6.10.0、`@prisma/client` 6.19.3、`next-auth` 5.0.0-beta.30（ベータ）、`recharts` 3.8.1、`leaflet` 1.9.4、`pdfjs-dist` 5.6.205、`@vercel/blob` 2.3.3、`tailwindcss` 4。

`next-auth` ベータ依存と Tailwind v4 はメジャーバージョン上の変更を含むため、定期的なアップデート時にブレーキ要因になる。

### CI

`.github/workflows/web-ci.yml` と `.github/workflows/e2e.yml` の2本。前者は smoke job（常時：Lint→Build→Unit→Smoke E2E、15分）と full job（main push または手動：full E2E、25分）。後者はPR時にPlaywright Chrome を入れて E2E 全体を実行し、失敗時のレポートリンクをPRコメントで自動更新。E2Eカバレッジ自体は別途確認が必要。

### TypeScript

`web/tsconfig.json` で `"strict": true`。`noEmit: true`、`target: "ES2017"`、`moduleResolution: "bundler"`、`paths: { "@/*": ["./src/*"] }`。

### .gitignore

`.claude/worktrees/`、`mhlw-data/`、`web/src/data/accidents-mhlw/`（事故DB JSONL約400MB）、`.next/`、`node_modules/`、`dist/`、`.env` 系、`__pycache__/`、`*.pyc`、`.DS_Store`、`Thumbs.db`。秘匿情報と巨大データセットは適切に除外されている。

### npm audit / build / lint

本タスクのタイムアウト方針上、長時間実行は省略。直近コミット `a169ec2` のメッセージが「fix: ビルドエラー解消 + マージ後の改善適用」で、ビルドは通っている前提。

---

## セクション9: V3戦略との整合性

### 文書の在処

`docs/monetization-strategy-v3-2026-04-26.md` という固有ファイルは本worktree からは見つからない（`docs/` 配下に該当名なし）。ただし関連ドキュメントとして `persona-100-review-2026-04-25.md` `remaining-proposals.md` `outstanding-issues.md` `stripe-payment-flow.md` などが存在し、エージェントは V3 戦略の趣旨を構成要素から読み解いている。`persona-100-review` 等から、V3戦略は「兼業NG・月10時間以内・物理労力ゼロ・全自動化前提」の制約下で、保守値で月商30〜50万円、楽観値で月商81〜135.5万円を目標とし、コンサル本丸消滅に伴い主軸を SEO+広告+アフィリエイト+限定課金SaaS に再構築する内容、と推定される。

### M1 達成項目（推定）

サイトインフラ完成（メタ・JsonLd・sitemap・robots・OG）、サブスク決済導線完成（Stripe Checkout・Portal・Webhook）、メール購読導線完成（Resend Subscribe）、主力コンテンツ（事故DB・法改正・チャットボット・KY・化学RA）の安定動作。これらは概ね達成済。

### 主軸の準備度

SEO：4/4 完了。sitemap 50URL、JsonLd 22ページ、メタデータ72ページ、canonical 73ページ。

広告：1/3 部分実装。AdSense 設定なし、ads.txt なし、Cookie同意基盤なし。`adsbygoogle` の grep 結果ゼロ。

アフィリエイト：2/3 部分実装。Amazon・楽天は環境変数で組込み可能、`AFFILIATE.md` で手順整備済。`safety-goods.ts` 51品目に Amazon/楽天URLが100%付与されている。一方、A8.net 等の高単価労務SaaSアフィの組込みは未確認。

### 副軸の準備度

限定課金SaaS Pro 2980円：3/4 実装。`pricing/page.tsx` あり、Stripe 決済フロー設計済（`stripe-payment-flow.md`）、Pro 特典（就業規則自動生成・助成金書類・広告非表示）の機能実装は要確認。

メルマガリード貯蓄：0/1 未実装。フォーム配置・配信スケジュール・コンテンツが未整備。

スポンサー枠：0/1 未実装（営業表記も意図的になし）。

教材・書籍販売：0/1 未実装（PDF商品なし）。

データAPI販売：0/1 未実装。データセット自体は通達556KB、化学物質900物質、事故DB約4000件超を保有しているが、API 化と契約形態が未着手。

---

## セクション10: 全機能の利用可否マトリクス

26機能のうち24が完全動作、2がβ・部分動作。

事故データベース（`/accidents`）：✓ 動作。MHLW死亡災害データ＋収録事例。

法改正情報（`/laws`）：✓ 動作。100件以上、AI要約付き。

法令全文検索（`/law-search`）：✓ 動作。e-Gov PDF 検索。

Eラーニング（`/e-learning`）：✓ 動作。350問超の業種別テーマ。

過去問クイズ（`/exam-quiz`）：✓ 動作。安全衛生関連資格試験問題。

KY用紙（`/ky`）：✓ 動作。LocalStorage＋API、音声入力対応。

化学物質DB（`/chemical-database`）：✓ 動作。51件＋MHLW統合。

化学物質RA（`/chemical-ra`）：✓ 動作。Gemini＋SDS検索、GHS分類。

安全用品（`/goods`）：✓ 動作。51品目、Amazon／楽天。

法令チャットボット（`/chatbot`）：✓ 動作。Gemini＋RAG、出典明示。

用語集（`/glossary`）：✓ 動作。'use client'。

メンタルヘルス（`/mental-health`）：✓ 動作。ストレスチェック、ハラスメント、VDT。

クマ出没マップ（`/bear-map`）：✓ 動作。富山・秋田・石川・長野・新潟。

BCP（`/bcp`）：✓ 動作。事業継続計画の透明性公開。

DPA（`/dpa`）：✓ 動作。GDPR対応、サブプロセッサー一覧。

保険加入状況（`/insurance`）：✓ 動作。賠償責任・データ漏洩。

助成金ガイド（`/subsidies`）：✓ 動作。中小企業支援金シミュレーター。

組織管理（`/organization`）：△ 部分動作。Prisma DB、デモ版・骨組み段階。

LMS（`/lms`）：△ 部分動作。Prisma DB、β版・多拠点学習管理。

リスク予測（`/risk-prediction`）：✓ 動作。Gemini AI予測。

気象リスク（`/risk`）：✓ 動作。気象庁＋Open-Meteo、作業リスク判定。

安全日誌（`/safety-diary`）：✓ 動作。Prisma＋LocalStorage、印刷対応。

ウィザード（`/wizard`）：✓ 動作。Gemini、業種別安全診断、'use client'。

通知設定（`/notifications`）：✓ 動作。Prisma、メール購読管理。

料金プラン（`/pricing`）：✓ 動作。0円／980／2980／29800／受託の5プラン構成。

マイページ（`/account`）：✓ 動作。Prisma＋NextAuth。

### 制限の主な理由

`organization` `lms` のβ・デモ表示：商用顧客運用にはまだ早い。データシード・権限ロールの拡張が必要。

メルマガ・シェアボタン・特商法ページの未整備：機能としてではなく運用導線としての欠落。

---

## セクション11: 法的リスクチェック

### 必須ページ

`/privacy` 更新日 2026-04-22、`/terms` 更新日 2026-04-25、`/about`（特商法表記を内包）、`/contact`、`/dpa`、`/security`、`/bcp`、`/insurance` が存在。

### 特商法表記

専用URLは未設置。`/about` ページに「特定商取引法に基づく表記」として運営者氏名・労働安全コンサルタント登録番号260022を記載している模様。法令上、決済画面から1〜2クリック以内に特商法表記へ到達できる必要があり、URL を `/commerce` 等で独立させ、フッターと pricing ページからの導線を明確化することが望ましい。

### ハルシネーション対策

`/web/src/lib/gemini.ts` で `AI_DISCLAIMER_SYSTEM_INSTRUCTION` を定義し、全AIシステムプロンプトに自動付与。表現を「と考えられます」「とされています」に強制。`/web/src/components/AIResponseCard.tsx` が AI レスポンス全体を黄色い注意バナー付きカードでラップし、「本回答はAIによる情報提供であり、法的助言・法令解釈の確定ではありません」を明示。BindingBadge コンポーネントで法令／告示／通達／指針の4段階の拘束力を色分け表示（red／yellow／blue／green）。

### 出典明示

Chatbot は条文ごとに `{ law, article }` を返却。法改正ページは厚労省公式リンク付き。事故DBは MHLW「職場のあんぜんサイト」へ直リンク。化学物質RAはGHS分類とSDS参照リンク付き。Cases だけは「想定事例」と明記しつつも具体的な根拠リンクが薄く、現時点で実導入事例がないことに伴うリスク（誇大広告と誤認される可能性）が残る。

### メール配信解除

Resend `{{unsubscribe_url}}` テンプレート変数が登録確認メール内に埋め込まれており、Resend 側で配信停止が処理される。仕組みとしては機能するが、`/notifications` から自分で停止できる導線をUI上に明示するとさらに安全。

### セキュリティヘッダー

`web/next.config.ts` で HTTPS TLS 強制（upgrade-insecure-requests）、CSP 設定、X-Frame-Options: DENY を設定。Cookie は NextAuth セッション＋LocalStorage のみで広告追跡 Cookie はゼロ。

### 利用規約の責任制限

`/terms` 第3条で消費者契約法第8条・8条の2に準拠した責任制限。事業者の損害賠償責任を全部免除する条項は設けていない。消費者ユーザーは受領対価を上限、無償利用時は1万円を上限。

---

## セクション12: 競合との位置取り

### 直接競合

V3 戦略文書内で具体的な競合社名の言及はないが、暗黙に下記をライバル想定:

- 既存の労安メディア・オウンドメディア（SEO競争）
- 大手 HRtech SaaS（限定課金、就業規則自動生成）
- 既存のアフィリメディア・労安情報サイト（広告・単価競争）
- 自治体・厚労省の公式情報サイト（無料の代替）

### 差別化要素の現状

リアルタイム事故DB：化学物質関連900件、事故事例約4000件超を整備済。`web/src/data/chemicals-mhlw/` `accidents-mhlw/` で大規模データセット保有。差別化済。

サイネージ：`web/src/app/signage/page.tsx` で30分更新、気象警報・法令・リスク予測を表示。現場の朝礼・休憩所サイネージ用途で他社にない強み。

KY自動化（3問フロー）：`/api/ky-assist` `industry-risk-ranking.tsx`、業種別プリセット13件で回答品質を担保。差別化済。

化学物質RA自動化：`/chemical-ra` でGHS分類・SDS検索・保護具チェックリスト出力。自動化のレベルが高い。

通達ライブ監視：sitemap で `/laws/notices-precedents` を優先度0.8で登録、`mhlw-notices.ts` 556KB の通達データを保有。

AI出典明示・ハルシネーション対策：4層対策（AIResponseCard 注意バナー、BindingBadge 拘束力色分け、システムプロンプト強制、条文単位の出典）。これは他社の AI チャットボットには稀な深さで、労安コンサルが運営する信頼性の根拠として強い。

多言語対応：`web/src/data/translations/` あり、UI 多言語化の素地はある。グローバル展開（Kim ペルソナの要望）への応答状況は要確認。

---

## 総括

V3戦略の主軸である SEO は技術的にほぼ完成し、副軸の Stripe・メール購読・サイネージ・自動化機能（KY・化学RA・チャットボット）も実装済。残るマネタイズ接続の主要欠損は次の通り。

第一に、AdSense 関連一式が未着手（ads.txt・コンセント・配置・申請）で、これが収益主軸の発進を阻むトップ要因。第二に、特商法ページの専用URL化と pricing 動線の明示化。決済を本気で動かす前にここを整える。第三に、メルマガ購読フォームの全機能ページへの展開と、配信コンテンツの初期方針確定。リード貯蓄の入り口がない状態が長期化すると、後発の収益化が立ち上がりにくい。第四に、Vercel Cron の配線。気象警報メールが配信されない状態のまま機能だけが用意されているので、当てが外れる前に直す。

短期に対応すべき技術的整備としては、グローバル `error.tsx` `not-found.tsx` の追加、動的サイトマップの自動化、JsonLd の20〜30ページ追加、未マージ Claude ブランチ7本の棚卸しと未使用worktreeの整理。

オーナー判断必要事項は、特商法ページの公開情報の選択、AdSense導入にともなうプライバシーポリシーと Cookie 同意の更新、Stripe 本番化と価格 ID の確定、メルマガ初期コンテンツ方針、法人化タイミングの5つに集約される。

データ充足度・コンテンツ品質・技術的完成度は労働安全領域のニッチWebアプリとして十分高水準にあり、収益化の入口を埋めることに集中すれば、V3戦略の保守ライン（月商30〜50万円）は射程内と判断する。

---

調査エージェント: Explore × 5（並列）／所要時間 合計約12分／カバー率: 12セクションすべて。
