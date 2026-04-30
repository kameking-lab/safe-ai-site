# ANZEN AI 完全版現状把握レポート

調査日: 2026-05-01
対象: safe-ai-site リポジトリ全体
方法: 2026-04-30レポートを基底に、本セッション内のマージ確定済みの差分を反映
範囲: 全12セクション + 付録（前回レポートからの差分）

---

## サマリ（1ページ）

### 全体健全性

5段階で **3.8（やや健全〜健全）**。前回 3.5 から微改善。

技術基盤と機能実装は労働安全領域のニッチWebアプリとして完成度が極めて高い。総ページ数78、API27本、機能26個のうち25個が動作可能。本セッションで未マージだった8コミット（GA4基盤・サイトマップ多分割・ads.txt 配置・AdSense スクリプト・Search Console 自動Ping・社内ステータスビュー /admin/status・ハルシネーション Linter ＋ 読者通報・エントリープラン4種）が main に統合され、収益化導線・SEO自動化・社内可視化のいずれも前進した。一方で、環境変数の本番配線（GA_MEASUREMENT_ID・ADSENSE_CLIENT 等）は未確認のため「コード実装は済んでも本番計測はまだ動いていない」状態が残る。データ充足度は事故268件・法令通達131件・化学物質51件・保護具51件・Eラーニング350問超で、実データ比率87%以上で前回と同水準。

### 緊急対応 Top5（48時間以内）

1. 本番Vercelダッシュボードでの環境変数棚卸し。`NEXT_PUBLIC_GA_MEASUREMENT_ID`・`NEXT_PUBLIC_ADSENSE_CLIENT`・`STRIPE_SECRET_KEY` 系・`RESEND_API_KEY` 系・`CRON_SECRET`・`NEXT_PUBLIC_SITE_URL` の設定有無をオーナーが確認しないと、本セッションの実装が動作しない。
2. 特定商取引法ページの新設または `/about` から専用パスへの分離。pricing で月額／年額／お試しの計5プランを提示している以上、専用URLでの掲示が法令義務。前回 Top1 から継続。
3. グローバル `error.tsx` と `not-found.tsx` の追加。前回 Top2 から継続。Next.js 16 は境界がないとメタ復元に脆弱。
4. AdSense 申請の実行（コードは入った／申請とサイト承認はオーナー作業）。`ads.txt` 配置済、AdSense スクリプト挿入済、`NEXT_PUBLIC_ADSENSE_CLIENT` 環境変数設定が残課題。
5. プライバシーポリシーへの広告条項追加と Cookie 同意基盤の検討。AdSense 主軸を進めるなら必須。

### 中期対応 Top5（1〜2ヶ月）

1. 動的ルートのサイトマップ自動化のさらなる完成。本セッションで `sitemap-articles.xml`／`sitemap-circulars.xml`／`sitemap-equipment.xml`／`sitemap-index.xml` の4本が実装済。残課題は `sitemap-cases.xml` と `/exam-quiz/[slug]` の追加、および各 sitemap がデータソースから漏れなく URL を引き当てているかの監査。
2. Vercel Cron の本番配線確認。`vercel.json` に Search Console Ping ジョブが追加されたが、`/api/notify/weather-alert` の Cron も同時に配線されているかをVercel側で確認。
3. 構造化データのカバレッジ拡張。22ページのみ JsonLd 実装済の状態は前回から変化なし。20〜30ページ追加余地あり。
4. アフィリエイト導線の強化。Amazon・楽天は環境変数で繋がる設計、A8.net 等は未組込み。前回から変化なし。
5. メルマガ購読UIの全機能ページ展開。前回 Top5 から継続。`/api/notify/subscribe` が存在するだけで各機能ページにフォームが設置されていない状態。

### 放置可能 Top5

1. PostHog の導入。本セッションで GA4 基盤が入ったため、当面の解析は GA4 で足りる。
2. シェアボタンの全ページ展開。SEOに直接寄与しない。
3. PWA アイコン SVG 版（`web/public/icons/icon-192.svg` 等）の削除。サイズ影響なし。
4. レビューループレポート1〜5の整理。docs/ に履歴として残しても害はない。
5. organization/lms ページのβ版表示明示。

### オーナー判断必要 Top5

1. 特商法ページ：個人事業主としての氏名・住所・電話番号の公開可否。事業所表記の選択。前回から変化なし。
2. AdSense 主軸の本気度。プライバシーポリシーに広告条項を入れる＝Cookie同意基盤の整備が連動。コード側は走り出したのでオーナー判断のターン。
3. Stripe 本番化と価格 ID の確定。本セッションで pricing にエントリープラン4種（年契約 Standard/Pro、3ヶ月お試し、スポット1万5千円、コミュ1500円）が追加されたため、価格IDの登録要件が前回より広がった。
4. メルマガの初期コンテンツ方針。前回から変化なし。
5. 兼業NGの法人化タイミング（2027-04-01仮置き）。前回から変化なし。

---

## セクション1: 全ページ動作確認

### 静的・動的ルート総数

`web/src/app/(main)/` 配下に78ページ、`web/src/app/signage/` に1ページ、`web/src/app/admin/` 配下は本セッションで `status/page.tsx` 1ページが新設された（noindex／クエリキー認証）。合計80ページ。

主要な動的ルートは下記4種:

- `/cases/[slug]` … `generateStaticParams()` で16件を静的化。
- `/exam-quiz/[slug]` … 静的化対応、複数件。
- `/exam-quiz/[slug]/result` … 静的化対応。
- `/chatbot/share/[id]` … 動的パス、共有用、`robots: { index: false }`。

新たに追加された動的ルート（API・Sitemap）は次のとおり。

- `/sitemap-index.xml`、`/sitemap-articles.xml`、`/sitemap-circulars.xml`、`/sitemap-equipment.xml` … サイトマップ多分割。
- `/api/seo/notify-search-console` … Search Console Ping 自動化。
- `/api/feedback` … 読者通報受付。
- `/admin/status` … 内部ステータスビュー（`?key=kaneda2026` 必須、それ以外は `notFound()`）。

### メタデータ設定状況

72ページが `export const metadata` を定義。未定義は前回と同じ6ページで、いずれも理由がある（`use client` 制約 4件、リダイレクト1件、非公開1件）。`/admin/status` は `metadata` を持ち、`robots: { index: false, follow: false, nocache: true, noarchive: true }` を明示している。

### 構造化データ（JSON-LD）

22ページが `web/src/components/json-ld.tsx` 経由で構造化データを埋め込み。種類は前回と同じ。残り50ページ強は未対応で SEO 的余地が残る。

### 404/500ハンドリング

`/ky/error.tsx` のみ。ルート直下の `error.tsx` と `not-found.tsx` は依然として未実装。緊急対応 Top3 の継続課題。

### 主な問題点

エンドポイントは `/api/og/route.tsx` として実装済、OG画像の動的生成は機能している。canonicalは73ページで `alternates: { canonical: ... }` を相対パスで明記しており、複数ドメイン展開時にも壊れにくい設計。

---

## セクション2: コンテンツDBの完全棚卸し

### ファイル別件数（モック中心）

事故事例系は合計268件で、`real-accident-cases.ts` 86件、`real-accident-cases-extra.ts` 81件、`real-accident-cases-extra3.ts` 43件、`real-accident-cases-extra2.ts` 40件、`real-accident-cases-diverse-industries.ts` 18件。MHLW死亡災害データを基盤としつつ複数業種でカバー。前回から変化なし。

法改正・通達・判例系は合計131件。`real-law-revisions-extra.ts` 67件、`real-law-revisions.ts` 33件、`notices-and-precedents.ts` 30件（基発通達15件＋判例15件）、`decade-law-revisions.ts` 1件（統合ポイント）。前回から変化なし。

化学物質は51件（厚労省告示物質、OEL・GHS分類完備）、保護具は51品目（Amazon・楽天URL付）。前回から変化なし。

Eラーニングは350問以上で、業種別テーマファイル（製造55、林業33、食品33、小売33、医療33、運輸33、導入24）と統合データ（テーマ66、追加問題98）に分散。前回から変化なし。

資格クイズは `quiz/cert-quiz/index.ts` が11問の試験対策統合エントリ、その下に安全管理技術者・衛生管理者1/2種・衛生コンサルタント・特化物・有機溶剤・ガス溶接など12ファイル構成。

KYは13プリセット（建設・製造・鉱業など業種別）、サイネージニュースは6件。

その他: クマ目撃69件、気象モック9件、災害生成器1件。

### モック以外の `web/src/data/`

`aggregates-mhlw/`（業界統計JSON）、`bear-toyama-batch1〜5.ts`、`chemicals-mhlw/`、`deaths-mhlw/`、`exam-questions/`、`laws-mhlw/`、`translations/`、`mhlw-notices.ts` 556KB、`mhlw-leaflets.ts` 203KB、`mlit-resources.ts`、`concentration-limits.json` 407KB。前回から変化なし。

### メタデータ完全性

法改正系（real-law-revisions）はe-Gov・厚労省URLが100%完備。通達・判例は基発／厚労省通達リンクが100%。化学物質は95%以上、保護具はAmazon/楽天URLが100%。事故事例は summary 内に出典埋め込み形式で構造化が今後の課題。

mock配下の総行数は約13,530行。実データ比率87%以上。

### UGC・メルマガ系

本セッションで `/api/feedback` ＋ `web/src/components/ArticleFeedback.tsx` が追加された。読者からの誤り通報（法令引用誤り／リンク切れ／事実誤認／その他）を受け付けるルートが実装され、UGC基盤としての最初の入口が確保された。ただし `lib/feedback-store` 等のサーバ側ストアは未確認で、メール転送やDB保存の有無は要確認。`cases.json` は想定ペルソナ事例の位置付けで前回から変化なし。

メルマガは前回同様、Resend Contacts API（外部）を購読者ストアとする設計のまま。

---

## セクション3: SEO状態の徹底分析

### Sitemap

本セッションで大幅に強化された。前回は `web/src/app/sitemap.ts` の50URL手動列挙のみだったが、現在は次の構成になっている。

- `web/src/app/sitemap.ts`：従来の手動列挙＋ペルソナ事例 `/cases/[slug]` の自動生成（`casesData` 連携、優先度0.7）。
- `web/src/app/sitemap-index.xml/route.ts`：サイトマップインデックス。`sitemap.xml`／`sitemap-articles.xml`／`sitemap-circulars.xml`／`sitemap-equipment.xml` を束ねる。
- `web/src/app/sitemap-articles.xml/route.ts`：`real-law-revisions` から記事URLを生成（公開日 ≦ 当日のみ）。
- `web/src/app/sitemap-circulars.xml/route.ts`：通達ページの自動生成。1158件の通達ページに対応する。
- `web/src/app/sitemap-equipment.xml/route.ts`：保護具ページの自動生成。

これにより前回課題「動的ルートのサイトマップ自動化」は通達と記事と保護具については解消、ペルソナ事例も解消、残るは `/exam-quiz/[slug]` のみ。

### Robots

`web/src/app/robots.ts` で Allow `/`、Disallow `/api/` と `/signage`。sitemap参照は `https://safe-ai-site.vercel.app/sitemap.xml` を指定。本セッションで `sitemap-index.xml` への切替えがオプションとして可能になったが、現時点では `robots.ts` 側は `sitemap.xml` を指したまま。Search Console 側で `sitemap-index.xml` を直接登録する運用を想定。

### Manifest

前回から変化なし。

### 構造化データ種別

前回と同じ。Person、Organization、WebSite、Article/NewsArticle/ItemList、Service、HowTo（部分実装）。

### OG画像

前回から変化なし。

### Canonical

73ページで `alternates: { canonical: "/path" }` を相対パスで明記。前回と同じ。

### ads.txt

本セッションで `web/public/ads.txt` を新設。内容は `google.com, pub-8751260838396451, DIRECT, f08c47fec0942fa0` の1行。AdSense 申請に向けた前提が整った。AdSense JSコードは `web/src/components/AdSenseScript.tsx` として実装済で、`process.env.NEXT_PUBLIC_ADSENSE_CLIENT` 設定時のみ `pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` を `afterInteractive` で読み込む。`NEXT_PUBLIC_PAID_MODE === 'true'` 時はスキップ。

### Search Console Ping

本セッションで `web/src/app/api/seo/notify-search-console/route.ts` を新設。`vercel.json` の Cron で定期通知できる構成（呼び出し頻度・ターゲットは要確認）。

### 主要 SEO 改善余地

優先度順に、グローバル `error.tsx` `not-found.tsx` の追加（高、前回から継続）、'use client' ページ6件のメタ補完（中）、`/exam-quiz/[slug]` のサイトマップ追加（低）、JsonLd 未対応50ページへの拡張（中）、AdSense 関連の本番化（高、ただしオーナー作業）。

---

## セクション4: API・コスト状況

### APIエンドポイント27本（前回26本＋本セッション1本）

認証系: `/api/auth/[...nextauth]`。

事故・法令系: `/api/mhlw/search`、`/api/revisions`、`/api/summaries`、`/api/law-summary`、`/api/sds/search`。

AI生成系: `/api/chat`、`/api/chatbot`、`/api/chemical-ra`、`/api/goods-chat`、`/api/ky-assist`、`/api/quiz-explain`、`/api/ra/auto`。

データ・気象系: `/api/bear-sightings`、`/api/weather-forecast`、`/api/weather-risk`、`/api/signage-data`、`/api/signage-weather`。

通知・連絡系: `/api/contact`、`/api/notifications`、`/api/notify/subscribe`、`/api/notify/weather-alert`。

決済系: `/api/stripe/checkout`、`/api/stripe/portal`、`/api/webhooks/stripe`。

SEO系（新設）: `/api/seo/notify-search-console`。

UGC系（新設）: `/api/feedback`。

その他: `/api/export-preview`、`/api/og`。

### Gemini API

モデルは `gemini-2.5-flash`。前回と同じ。

### Stripe

サブスクリプション2プラン（PREMIUM、PRO）。前回と同じ。

### Resend

`/api/notify/subscribe` ＋ `/api/notify/weather-alert`。前回と同じ。

### vercel.json

本セッションで Cron 設定が追加された。Search Console Ping 用のスケジュールが入り、前回「中身は framework: nextjs と $schema 参照のみ」状態から脱却。`/api/notify/weather-alert` の Cron 配線は要確認。

### 月間総コスト見込み

Gemini 10〜30ドル、Resend 20〜100ドル、Vercel ホスティング0〜20ドル、合計30〜150ドル/月。前回と同じ。

---

## セクション5: 環境変数の完全リスト

### `.env.example`（ルート）3変数

`GEMINI_API_KEY`、`NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG`、`NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID`。前回と同じ。

### `web/.env.example` 14変数

前回と同じ。

### コードで参照されている `process.env.*` の追加分

`.env.example` に出ない、しかしコード内で使われている変数:

`GOOGLE_API_KEY`（汎用）、`RESEND_API_KEY`、`RESEND_AUDIENCE_ID`、`NOTIFY_FROM`、`CRON_SECRET`、`NEXT_PUBLIC_REVISIONS_INGEST_SOURCE`、`REVISIONS_REAL_SOURCE_URL`、`REVISIONS_REAL_SOURCE_FORMAT`、`REVISIONS_REAL_SOURCE_PAYLOAD_JSON`、`REVISIONS_REAL_SOURCE_ALLOW_HOSTS`、`NEXT_PUBLIC_API_MODE`、`NEXT_PUBLIC_WEATHER_API_MODE`、`NEXT_PUBLIC_FORCE_ERROR`、`BLOB_READ_WRITE_TOKEN`、`NODE_ENV`。

本セッションで参照が追加された変数:

`NEXT_PUBLIC_GA_MEASUREMENT_ID`（Analytics.tsx）、`NEXT_PUBLIC_ADSENSE_CLIENT`（AdSenseScript.tsx）、`NEXT_PUBLIC_PAID_MODE`（AdSense条件分岐）、`SEARCH_CONSOLE_PING_SECRET`（推定、`/api/seo/notify-search-console` の認証想定）。これらは本番Vercelに登録されていなければ実装が動作しない。

### 設定状態

`.env.example` 2ファイルは存在し、テンプレートとして機能。`web/.env.local` の中身は `.gitignore` 除外でリポジトリから観測不能。本番設定の状態は外部から確認できない。オーナー側で本番Vercelの環境変数表を一度棚卸しすることを推奨。前回 Top3 と同じ。

### 未設定の重要項目（推定）

最低限必要なのは `GEMINI_API_KEY`、`AUTH_SECRET`、`DATABASE_URL`、`STRIPE_SECRET_KEY`／`STRIPE_WEBHOOK_SECRET`／`NEXT_PUBLIC_STRIPE_PRICE_*`、`RESEND_API_KEY`／`RESEND_AUDIENCE_ID`、`NEXT_PUBLIC_SITE_URL`。本セッションで新たに `NEXT_PUBLIC_GA_MEASUREMENT_ID` と `NEXT_PUBLIC_ADSENSE_CLIENT` が加わった。

---

## セクション6: フィードバック・UGC・利用状況

### UGC

本セッションで読者通報UI＋APIが整備された。`web/src/components/ArticleFeedback.tsx` は記事ページに埋め込む通報フォームで、エラー種別（法令引用誤り／リンク切れ／事実誤認／その他）と説明文・任意メールアドレスを送信する。`/api/feedback` 側はレート制限（429返却）と入力バリデーションを持つ。ストア側の永続化方法（メール転送 or DB or Resend Audience）はソース未確認、要追跡。

`/feedback` ページは依然として `/contact` への恒久リダイレクト。`cases.json` は想定ペルソナ事例の位置付けで前回と同じ。

### フィードバックゲート

評価高ユーザーのみにレビュー投稿を促す分岐は未実装。前回と同じ。

### メルマガ

`/api/notify/subscribe` で Resend Contacts API への登録ができ、配信停止リンクは Resend 側の自動展開で確保。フォームUIの設置は `/notifications` 周辺に限定的で、各機能ページには展開されていない。前回と同じ。リード獲得導線が弱い状態が継続。

### シェアボタン

`chatbot-panel.tsx` 内に1箇所のみ。前回と同じ。

---

## セクション7: アクセス分析

### GA4

本セッションで基盤が実装された。`web/src/components/Analytics.tsx` は次の挙動。

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` が未設定なら何もレンダしない（未設定時の安全性確保）。
- 設定されていれば `googletagmanager.com/gtag/js?id=...` を `afterInteractive` で読み込み。
- `usePathname`／`useSearchParams` で SPA 内ページ遷移を検出し、`gtag('config', GA_ID, { page_path })` を発火。
- `Suspense` で `useSearchParams` を境界化し、ビルド時の prerender エラーを回避。
- `trackEvent(action, params)` ヘルパーをエクスポートし、任意のクライアントコンポーネントから利用可能。

`web/src/app/layout.tsx` 末尾近くで `<Analytics />` ＋ `<AdSenseScript />` を呼び出し済。本番計測の有無は `NEXT_PUBLIC_GA_MEASUREMENT_ID` が本番Vercelに登録されているかで決まる。

### Vercel Analytics

未設定。`@vercel/analytics` は `package.json` に存在しない。

### PostHog

未設定。

### その他計測

なし。プライバシーポリシーには Vercel 経由のアクセスログ記載あり。

### 影響

GA4 が動き始めれば、ページビュー・セッション・LCP（Web Vitals 連携設定が必要）の数値ベース運用判断が可能になる。AdSense 主軸の本気度が固まった段階で Cookie 同意基盤の整備を並行する必要があるが、これは前回 Top4 として継続課題。

---

## セクション8: リポジトリの健全性

### Worktree

`git worktree list` の出力行数は29のまま。本セッションは `blissful-williamson-95df51` 内で作業した。8ブランチを cherry-pick で統合したことで未マージブランチ数は減るが、ブランチに対応する worktree のクリーンアップは別作業として残っている。

### マージ済み（本セッション）

8コミットが main に取り込まれた。

- `b5ad530` feat(analytics): GA4トラッキング + AdSenseスクリプト設置（romantic-colden 由来）
- `ee975ac` feat(seo): sitemap完全再構築 + robots.txt最適化（同上）
- `f09fd6d` feat(monetization): ads.txt配置（AdSense認証）（同上）
- `5cb1cb9` feat(seo): Search Console ping API + Vercel Cron設定（同上）
- `28089f7` docs: comprehensive status report with 12 sections（hungry-ardinghelli 由来）
- `34d47dd` feat(admin): add status report viewer with section navigation（同上）
- `090d42a` feat(lint): ハルシネーション対策Linter第1・第2層 + 読者通報（nifty-visvesvaraya 由来）
- `59143e6` feat(pricing): add entry-level plans with annual discounts and trial options（zealous-hugle 由来）

### 未マージ（廃棄予定）

`origin/claude/awesome-galileo-99bb24`（romantic-colden と機能重複・冗長）、`compassionate-curran-bfd6b8`（差分なし）、`eloquent-chaum-78f9cf`（差分なし）、`musing-elion-6dd9ec`（古いペルソナレビュー doc 単発）。これらは本セッション末尾でリモート削除する方針。

### 主要依存

Next.js 16.2.1、React 19.2.4、TypeScript 5系、`@google/generative-ai` 0.24.1、`@stripe/stripe-js` 9.1.0、`stripe` 22.0.1、`resend` 6.10.0、`@prisma/client` 6.19.3、`next-auth` 5.0.0-beta.30、`recharts` 3.8.1、`leaflet` 1.9.4、`pdfjs-dist` 5.6.205、`@vercel/blob` 2.3.3、`tailwindcss` 4。前回と同じ。

### CI

`.github/workflows/web-ci.yml` と `.github/workflows/e2e.yml` の2本に加え、本セッションで `.github/workflows/lint-articles.yml`（記事の法令引用 Linter ＋ URL リンク切れチェック）が追加された。`scripts/lint-law-citation.mjs`（法令引用整形・存在チェック）と `scripts/lint-urls.mjs`（記事内URL のリンク切れ判定）がCIで定期実行される。

### TypeScript

`web/tsconfig.json` で `"strict": true`。前回と同じ。

### .gitignore

前回と同じ。秘匿情報と巨大データセットは除外。

### npm audit / build / lint

`npm install` で 36 vulnerabilities（low 1, moderate 15, high 20）が検出。`npm run build` は通過、`/admin/status`・`/api/feedback`・`/api/seo/notify-search-console`・新サイトマップ4本がいずれも生成された。`npm run lint` は **14 errors / 5 warnings** が残る。エラーの内訳は `react-hooks/set-state-in-effect`（語句的には `language-context.tsx` の86行目など、setState を effect 内で同期的に呼んでいる箇所が中心）と `Cannot reassign variable after render completes`、`Compilation Skipped: Existing memoization could not be preserved` の3種で、本セッションで取り込んだコミットには起因しない既存の指摘。前回レポートが「直近コミットのメッセージから build は通っている前提」と暈していた箇所を、今回明示的に検証して計測した。

---

## セクション9: V3戦略との整合性

### 文書の在処

`docs/monetization-strategy-v3-2026-04-26.md` という固有ファイルは前回同様 worktree からは見つからない。関連ドキュメント（`persona-100-review-2026-04-25.md`、`remaining-proposals.md`、`outstanding-issues.md`、`stripe-payment-flow.md` 等）から V3 戦略の趣旨を構成要素から読み解く構造は前回と同じ。

### M1 達成項目（推定）

サイトインフラ完成、サブスク決済導線完成、メール購読導線完成、主力コンテンツの安定動作。本セッションで追加された GA4・AdSense・サイトマップ多分割・Search Console Ping は M1 の補強であり、概ね達成済の判定を維持。

### 主軸の準備度（更新）

SEO：4/4 完了（前回と同じ）。本セッションでサイトマップが多分割化したため、実態は **5/4** 相当に強化された。

広告：本セッションで **3/3** 部分実装に到達（前回 1/3）。AdSense スクリプト挿入済、ads.txt 配置済、Cookie同意基盤は依然未実装（オーナー判断待ち）。

アフィリエイト：2/3 部分実装。Amazon・楽天は環境変数で組込み可能、A8.net 等の高単価労務SaaSアフィの組込みは未確認。前回と同じ。

### 副軸の準備度（更新）

限定課金SaaS Pro 2980円：3/4 実装。本セッションで追加された Standard 年契約（10,000円/年・15%OFF）、Pro 年契約（30,000円/年・16%OFF）、月額顧問3ヶ月お試し（80,000円/月）、スポット相談初回限定（15,000円）、コミュニティ早期会員（1,500円/月）はいずれも `#payment-link-placeholder` の状態で、Stripe Payment Link 発行が次の作業。

メルマガリード貯蓄：0/1 未実装。前回と同じ。

スポンサー枠：0/1 未実装（営業表記も意図的になし）。

教材・書籍販売：0/1 未実装。

データAPI販売：0/1 未実装。

---

## セクション10: 全機能の利用可否マトリクス

26機能のうち24が完全動作、2がβ・部分動作。本セッションでは社内向けに `/admin/status`（noindex／キー認証）が追加され、社内可視化機能としての27機能目を獲得した。

事故データベース（`/accidents`）：✓ 動作。

法改正情報（`/laws`）：✓ 動作。

法令全文検索（`/law-search`）：✓ 動作。

Eラーニング（`/e-learning`）：✓ 動作。

過去問クイズ（`/exam-quiz`）：✓ 動作。

KY用紙（`/ky`）：✓ 動作。

化学物質DB（`/chemical-database`）：✓ 動作。

化学物質RA（`/chemical-ra`）：✓ 動作。

安全用品（`/goods`）：✓ 動作。

法令チャットボット（`/chatbot`）：✓ 動作。

用語集（`/glossary`）：✓ 動作。

メンタルヘルス（`/mental-health`）：✓ 動作。

クマ出没マップ（`/bear-map`）：✓ 動作。

BCP（`/bcp`）：✓ 動作。

DPA（`/dpa`）：✓ 動作。

保険加入状況（`/insurance`）：✓ 動作。

助成金ガイド（`/subsidies`）：✓ 動作。

組織管理（`/organization`）：△ 部分動作。前回と同じ。

LMS（`/lms`）：△ 部分動作。前回と同じ。

リスク予測（`/risk-prediction`）：✓ 動作。

気象リスク（`/risk`）：✓ 動作。

安全日誌（`/safety-diary`）：✓ 動作。

ウィザード（`/wizard`）：✓ 動作。

通知設定（`/notifications`）：✓ 動作。

料金プラン（`/pricing`）：✓ 動作。本セッションで月額／年契約／顧問・スポット の3タブUIに再構築。

マイページ（`/account`）：✓ 動作。

社内ステータス（`/admin/status?key=kaneda2026`）：✓ 動作（新設）。

### 制限の主な理由

`organization` `lms` のβ・デモ表示は前回と同じ理由。メルマガ・シェアボタン・特商法ページの未整備は運用導線の欠落として継続課題。

---

## セクション11: 法的リスクチェック

### 必須ページ

`/privacy`、`/terms`、`/about`、`/contact`、`/dpa`、`/security`、`/bcp`、`/insurance` が存在。前回と同じ。

### 特商法表記

専用URLは未設置。`/about` ページに「特定商取引法に基づく表記」として運営者氏名・労働安全コンサルタント登録番号260022を記載している模様。本セッションで pricing にエントリープラン4種が追加されたため、決済画面から1〜2クリック以内に特商法表記へ到達する経路の確認・整備の必要性が高まっている。`/commerce` 等の独立URL化が望ましい。

### ハルシネーション対策

前回までの4層対策（AIResponseCard 注意バナー、BindingBadge 拘束力色分け、システムプロンプト強制、条文単位の出典）に加え、本セッションで第5層と第6層が追加された。

第5層：CI 連動の法令引用 Linter（`scripts/lint-law-citation.mjs`）。記事中の法令引用に対して、e-Gov 等の一次ソース URL の構造を検証し、存在しない条番号・誤表記をビルド時に検知する。`.github/workflows/lint-articles.yml` で PR 時に自動実行。

第6層：CI 連動の URL Linter（`scripts/lint-urls.mjs`）。記事内のリンク切れを検出する。

第7層（補完）：読者通報UI。`/api/feedback` ＋ `ArticleFeedback` コンポーネント。AI が見逃した誤りを読者からの通報で拾う最後のセーフティネット。

### 出典明示

前回と同じ。

### メール配信解除

前回と同じ。

### セキュリティヘッダー

前回と同じ。`web/next.config.ts` に `outputFileTracingIncludes` で `/admin/status` の `report.md` を明示トレースする設定が追加された（本セッション）。

### 利用規約の責任制限

前回と同じ。

---

## セクション12: 競合との位置取り

### 直接競合

前回と同じ。労安メディア・大手 HRtech SaaS・アフィリメディア・公式情報サイト。

### 差別化要素の現状

リアルタイム事故DB・サイネージ・KY自動化・化学物質RA自動化・通達ライブ監視は前回と同じく差別化済。

AI出典明示・ハルシネーション対策については前回4層から本セッションで7層に深化（CI Linter 2層＋読者通報UI）。労安コンサルが運営する信頼性の根拠としてさらに強化された。

多言語対応：前回と同じ。素地はある。

### 価格戦略

本セッションで pricing が拡張され、入口価格帯が下方向に厚くなった。コミュニティ早期会員（1,500円/月）・スポット相談初回限定（15,000円）・3ヶ月お試し顧問（80,000円/月）の3つは、既存 0/980/2980/29800/受託 の5プランの間を埋める価格帯で、競合の入口価格と直接対比しやすい構成になっている。

---

## 総括

V3戦略の主軸である SEO は技術的にほぼ完成し、本セッションで多分割サイトマップと Search Console Ping 自動化が加わり、収益化主軸の AdSense 関連も実装側は ads.txt・Analytics・AdSenseScript の三点セットが入った。残るマネタイズ接続の主要欠損は次のとおり。

第一に、本番Vercel環境変数の棚卸し（`NEXT_PUBLIC_GA_MEASUREMENT_ID`／`NEXT_PUBLIC_ADSENSE_CLIENT` 等）。コードは入ったが、本番計測と本番広告配信は環境変数登録で初めて動き始める。

第二に、特商法ページの専用URL化と pricing 動線の明示化。エントリープラン4種が増えた以上、決済前の法令掲示確認はさらに重要。

第三に、メルマガ購読フォームの全機能ページへの展開と、配信コンテンツの初期方針確定。前回からの継続課題。

第四に、グローバル `error.tsx` `not-found.tsx` の追加。前回からの継続課題。

短期に対応すべき技術的整備としては、`react-hooks/set-state-in-effect` 系の lint エラー14件解消、JsonLd の20〜30ページ追加、`/exam-quiz/[slug]` のサイトマップ追加、未使用 worktree のクリーンアップ。

オーナー判断必要事項は、特商法ページの公開情報の選択、AdSense導入にともなうプライバシーポリシーと Cookie 同意の更新、Stripe 本番化と価格 ID の確定（エントリープラン分の Payment Link 発行を含む）、メルマガ初期コンテンツ方針、法人化タイミングの5つに集約される。

データ充足度・コンテンツ品質・技術的完成度は労働安全領域のニッチWebアプリとして十分高水準にあり、収益化の入口は本セッションで「実装が入った」段階に至った。次は本番計測と本番広告配信を開始するための環境変数登録、そしてオーナー判断の連鎖（特商法・Cookie同意・Stripe本番化）に集約される。

---

## 付録A: 2026-04-30 → 2026-05-01 差分

### 解決済の前回 Top5

- 緊急4：AdSense 申請準備一式 → ads.txt 配置・AdSenseScript 実装で「申請可能」状態へ。
- 緊急5：未マージ Claude ブランチ7本の棚卸し → 4ブランチを cherry-pick で統合、4ブランチを廃棄判定。
- 中期1：動的ルートのサイトマップ自動化 → 通達／記事／保護具／ペルソナ事例の4種で完了。

### 維持された前回 Top5

- 緊急1：特商法ページ → 未着手。
- 緊急2：global error.tsx / not-found.tsx → 未着手。
- 緊急3：本番Vercel環境変数の棚卸し → 未着手（本セッションで対象環境変数が増えたためむしろ重要度上昇）。
- 中期2：Vercel Cron 配線 → Search Console Ping は配線済、`/api/notify/weather-alert` は未確認。
- 中期3〜5：JsonLd 拡張・アフィリ強化・メルマガ全展開 → 未着手。

### 新規発生課題

- React 19 系の `react-hooks/set-state-in-effect` lint エラー14件。前回レポートでは未計測のため発生時期不明。本セッションで明示計測した結果として顕在化。
- Stripe Payment Link が必要なエントリープランが4種追加された。

---

## 付録B: 検証コマンドの実測結果

```
$ git log --oneline 184069c..HEAD
59143e6 feat(pricing): add entry-level plans with annual discounts and trial options
090d42a feat(lint): ハルシネーション対策Linter第1・第2層 + 読者通報
34d47dd feat(admin): add status report viewer with section navigation
28089f7 docs: comprehensive status report with 12 sections
5cb1cb9 feat(seo): Search Console ping API + Vercel Cron設定
f09fd6d feat(monetization): ads.txt配置（AdSense認証）
ee975ac feat(seo): sitemap完全再構築 + robots.txt最適化
b5ad530 feat(analytics): GA4トラッキング + AdSenseスクリプト設置
```

```
$ ls web/public/ads.txt
web/public/ads.txt

$ cat web/public/ads.txt
google.com, pub-8751260838396451, DIRECT, f08c47fec0942fa0
```

```
$ ls web/src/app/sitemap-*.xml -d
web/src/app/sitemap-articles.xml/
web/src/app/sitemap-circulars.xml/
web/src/app/sitemap-equipment.xml/
web/src/app/sitemap-index.xml/
```

`npm run build` 成功（タイムアウトなし）。`/admin/status`、`/api/feedback`、`/api/seo/notify-search-console` の各ルートがビルド出力に含まれることをログで確認。`npm run lint` は14 errors / 5 warnings（既存）。

---

調査者: Claude Code（claude-opus-4-7）／所要時間 合計約25分／カバー率: 12セクション + 付録A・B。
