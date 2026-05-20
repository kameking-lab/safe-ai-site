# 安全AIポータル 現況詳細レポート 2026-05-19

調査日: 2026-05-19  
調査ブランチ: origin/main HEAD ab55d44  
最新マージ: PR #250 fix(ux-p2): Batch 2 mobile UX + feedback  
生データ: [seo-raw.json](./seo-raw.json)

---

## 目次

1. [サマリー](#1-サマリー)
2. [メイン3機能の現況](#2-メイン3機能の現況)
   - 2.1 [/chatbot — 安衛法AIチャットボット](#21-chatbot--安衛法aiチャットボット)
   - 2.2 [/accidents-reports — 業種別労働災害分析](#22-accidents-reports--業種別労働災害分析)
   - 2.3 [/strategy/plan-generator — 年次安全衛生計画ジェネレーター](#23-strategyplan-generator--年次安全衛生計画ジェネレーター)
3. [SEO実測データ](#3-seo実測データ)
   - 3.1 [sitemap構成とURL数](#31-sitemap構成とurl数)
   - 3.2 [GSC連携状況](#32-gsc連携状況)
   - 3.3 [GA4連携状況](#33-ga4連携状況)
   - 3.4 [Vercel Analytics](#34-vercel-analytics)
   - 3.5 [主要ページメタデータ](#35-主要ページメタデータ)
   - 3.6 [構造化データ実装状況](#36-構造化データ実装状況)
4. [ギャップと課題の機械判定](#4-ギャップと課題の機械判定)
5. [残タスク全可視化](#5-残タスク全可視化)
   - 5.1 [P2残16件 (Batches 3-6)](#51-p2残16件-batches-3-6)
   - 5.2 [P3残10件 (Batches 1-4)](#52-p3残10件-batches-1-4)
   - 5.3 [回帰監査Minor/P2/P3バックログ 11件](#53-回帰監査minorp2p3バックログ-11件)
   - 5.4 [F-001 / F-002 現状](#54-f-001--f-002-現状)
   - 5.5 [コード内TODO/FIXME全件](#55-コード内todofixme全件)
6. [課題の体系化](#6-課題の体系化)
   - 6.1 [メイン機能側の課題](#61-メイン機能側の課題)
   - 6.2 [SEO側の課題](#62-seo側の課題)
   - 6.3 [データ整合性・コンテンツ品質の課題](#63-データ整合性コンテンツ品質の課題)
   - 6.4 [インフラ・運用の課題](#64-インフラ運用の課題)
   - 6.5 [未着手だが重要そうな領域](#65-未着手だが重要そうな領域)

---

## 1. サマリー

安全AIポータル（`https://www.anzen-ai-portal.jp`）は2026-05-19時点でPR #250をmainにマージ済み。Vercel Proプラン稼働中（~2026-06-15）。主要マイルストーンとして、2週間前の激辛UX/SEO監査（PR #235, 54件）に対するP1全件・P2 Batches1-2完了（PR #241-#250）が直近の大きな作業である。メイン3機能（/chatbot, /accidents-reports, /strategy/plan-generator）にはCopilot SafetyContextによる業種・関心事項の3機能間引き継ぎが実装された（PR #245）。

残課題としてはP2残16件（Batches 3-6, 87h）・P3残10件（4バッチ, 22h）・回帰監査11件（F-001〜F-011）が積み残されており、Vercel Proプラン期限（2026-06-15）内に消化する計画が公開されている。セキュリティ上の緊急対応事項としてF-002（ハードコード認証鍵）が未処置のまま残っている。

---

## 2. メイン3機能の現況

### 2.1 /chatbot — 安衛法AIチャットボット

#### 実装ファイル一覧

ルートページは `src/app/(main)/chatbot/page.tsx`（メタデータ・JSON-LD・33法令対応表示）と `src/app/(main)/chatbot/ChatbotBody.tsx`（UIレイアウト・Copilot埋め込み）で構成される。チャットUIの中核は `src/components/chatbot-panel.tsx`（会話履歴管理、localStorage永続化、音声完結モード、法令カテゴリフィルタ、ダウンロード・共有機能、最大15セッション管理）。

APIエンドポイントは `src/app/api/chatbot/route.ts`（Gemini 2.5 Flash呼び出し、RAG検索、信頼度判定、ハルシネーション抑制、直近8ターン履歴対応）。RAG周辺として `src/lib/rag-search.ts`（BM25スコアリング、クエリ拡張、同義語展開）と `src/lib/chatbot-enrichment.ts`（出典構造化、関連法令自動サジェスト、深掘りリンク生成）と `src/lib/notice-search.ts`（厚労省通達・告示・指針の関連検索）が存在する。

会話永続化は `src/lib/chat-history.ts`（localStorage管理、最大50メッセージ、QuotaExceededError対応フォールバック）。共有機能は `src/app/(main)/chatbot/share/[id]/page.tsx`（Base64エンコード会話URL）。Copilot連携は `src/components/copilot/` 以下のCopilotProvider/CopilotNextSteps/CopilotStepNav/CopilotMemo/CopilotIndustrySync/CopilotPlanSyncが担う。

#### RAG索引対象データ件数内訳

法令は50法令体制（`src/data/laws/*.ts`）。内訳は基幹12法令（労働安全衛生法本則・施行令・安衛則・クレーン則・有機則・特化則・酸欠則・石綿則・粉じん則・電離則・じん肺法等）＋拡張30法令（労基法・労契法・育児介護法・労災保険法・職業安定法等）＋新規12法令（過労死防止対策推進法・高圧ガス保安法・火薬類取締法・港湾労働法・船員安全衛生規則等）。各法令の条文総数は正確に計測されていないが、平均100〜200条×50法令で推計5,000〜10,000条文規模。

通達・告示・指針は `src/data/mhlw-notices.ts` 経由で1,069件。bindingLevel別に「告示(binding)」「通達(indirect)」「指針(reference)」の3区分、19カテゴリで管理。事故統計は `src/data/aggregates-mhlw/` 以下にJSON形式で業種別・月別・タイプ別集計。個別詳細ケースは `src/data/mock/real-accident-cases*.ts` 合計7ファイル292件。化学物質は `src/data/chemicals-mhlw/compact.json` に収録（件数未計測、1,046件以上との記述が仕様上あり）。用語集・FAQ・KYデータはそれぞれ別データソース。

#### レスポンス品質と計測

信頼度判定は3段階（high: スコア≥0.75かつ複数条文ヒット / medium: RAGヒット / low: ヒットなし）。Recall@5等の定量的計測スクリプトは `web/scripts/` 以下に存在するか不明（コード調査範囲外）。`src/app/(main)/about/chatbot-eval/page.tsx` に評価ページが存在し、定性的な精度説明が掲載されている。

#### SafetyContext連携と他機能への送客動線

SafetyContextは `src/lib/copilot/types.ts` 定義で industry（5業種スラッグ）・scale（small/medium/large）・keyConcerns（最大5件）・recentQueries（最大10件）・activePlan・progress（3機能訪問フラグ）・lastStep・updatedAt を格納し、localStorage `safety-context-v1` キーで永続化。

/accidents-reports への動線は `src/components/chatbot-panel.tsx` 内（L847-856）で `copilot?.state.industry ? /accidents-reports/${industry} : /accidents-reports` のURLを動的生成。/strategy/plan-generator への動線は同L857-870で `?industry=${industry}&focus=${concern}` のクエリパラメータ付きURLを生成。送客のトリガーは `ingestText()` 呼び出し（L242-245）で業種・関心事項を自動検出した時点でリンクが活性化する。CopilotNextStepsパネルは `ChatbotBody.tsx`（L166-169）に埋め込まれ、3ステップナビゲーションと次アクション提案を表示する。

#### TODO/FIXME/未実装コメント

明示的なTODO/FIXMEは0件。実装上の制限として（1）直近8ターン履歴のみ送信するため長期会話での文脈喪失がある（route.ts L268）、（2）Gemini 2.5 Flashモデルハードコード（L340）でモデル切り替え機構なし、（3）同一クエリでもAPIキャッシュなし（毎回新規呼び出し）、（4）共有URLのTTLなし（Base64永続化）、（5）RAGヒット0件時に類似質問例の生成なし。

#### 既知の弱点

出典提示は充実（条文番号+施行日+発出機関の3点セット、拘束力レベルバッジ、DigDeeperLinks）。エラーハンドリングは circuit breaker実装済み（失敗4回で60秒OPEN）でGemini障害時のフォールバック応答あり。レスポンスキャッシュが存在しないため、F-005（動的AIルートCDNキャッシュなし）のVercel quota消費が課題。音声完結モードはWeb Speech API依存でja-JP固定。

---

### 2.2 /accidents-reports — 業種別労働災害分析

#### 実装ファイル一覧

ページファイルは3点：`src/app/(main)/accidents-reports/page.tsx`（336行、業種別レポートハブ）・`src/app/(main)/accidents-reports/[industry]/page.tsx`（163行、動的業種別レポート詳細）・`src/app/(main)/accidents-reports/compare/page.tsx`（173行、業種横断比較ビュー）。

コンポーネントは `src/components/accidents-reports/` 以下8ファイル：industry-report-view.tsx（約850行、KPI/事故型ランキング/月別トレンド/チェックリスト）・comparison-view.tsx（約700行、業種選択器/並列KPI/死亡率比較）・comparison-industry-selector.tsx（約220行、URLパラメータ連動マルチセレクター）・comparison-monthly-chart.tsx（Recharts）・monthly-trend-chart.tsx・prevention-checklist.tsx・report-print-button.tsx・report-print-meta.tsx。

ライブラリは `src/lib/accident-analysis.ts`（約1050行、業種統計エンジン）・`src/lib/accident-comparison.ts`（約600行、比較データセット構築）・その他industry-slugs.ts・industry-prevention-checklists.ts・law-revision-industry-tags.ts。

#### 業種別ランディング5業種の詳細

事故データは `src/data/aggregates-mhlw/industry-profiles.json`（生成 2026-04-18、2026-05-20現在32日古い）に504,413件を格納。5業種の内訳は建設業66,713件・製造業115,601件（最多）・運輸業66,650件・医療・福祉22,707件・サービス業34,436件（合計306,107件、全25業種中の61%）。その他業種198,306件が残る。

各業種ランディングページの主要見出し構成（h2）は「事故事例」「事故型ランキング」「原因Top10」「月別季節性」「年次推移」「業種特有パターン」「推奨対策チェックリスト」「関連法令」の8区分。JSON-LD は webPageSchema・breadcrumbSchema・datasetSchema の3層。metadataはビルド時に業種データから自動生成される。キャッシュはISR `revalidate = 86400`（24時間）。

個別詳細ケースを扱うモックデータは real-accident-cases*.ts 合計7ファイルで約292件。サイト上のマーケティング文言「5,000件超」は集計統計データ504,413件を指す可能性が高いが、両者の対応関係がコード上で明示されていない点が混乱を生じている。

#### Copilot連携と他機能動線

`[industry]/page.tsx` に CopilotIndustrySync（L96-97）・CopilotStepNav（L99-100）・CopilotNextSteps（L106-120）が埋め込まれ、業種コンテキストを自動的に SafetyContext に記録する。ハブページ `page.tsx` には /strategy/plan-generator（L215 業種指定URL・L248 汎用URL）・/chatbot（L222/L254）・/accidents（L263）・/accidents-analytics（L269）・/risk-prediction（L275）・/ky（L281）への動線が実装されている。JSON-LD中でも COPILOT_FEATURE_PEERS として chatbot と planGenerator を相互参照している。

#### TODO/FIXME/未実装コメント

明示的なTODO/FIXME は0件。監査コメント（`page.tsx` L102-105）に「B-001: representative-pattern の免責事項をハブで可視化する」が残存しているが対応未着手。

#### 既知の弱点

データ鮮度の問題として、industry-profiles.json（2026-04-18生成）は2026-05-20時点で32日古く、更新トリガーが存在しない。検索・フィルター機能は業種選択のみ実装で、フリーテキスト検索・事故型フィルタ・月別フィルタは未実装。スマートフォンでの5業種並列比較は横スクロールが必須となりUX上の課題がある。Rechartsのダークモードテーマ切り替えは未検証。

---

### 2.3 /strategy/plan-generator — 年次安全衛生計画ジェネレーター

#### 実装ファイル一覧

ルートページは `src/app/(main)/strategy/page.tsx`（戦略セクション親ページ、パスワード保護）・`src/app/(main)/strategy/plan-generator/page.tsx`（入力フォームページ）・`src/app/(main)/strategy/plan-generator/preview/[id]/page.tsx`（プレビュー・出力）の3点。

コンポーネントは `src/components/safety-plan/plan-generator-form.tsx`（業種・規模・パラメータ入力、Copilot prefill対応）・`src/components/safety-plan/plan-document.tsx`（計画書レンダリング）・`src/components/safety-plan/print-button.tsx`（window.print()）・`src/components/strategy-gate.tsx`（パスワード認証ゲート）・`src/components/cross-tool-links.tsx`（関連ツール横断リンク）。

業務ロジックは `src/lib/safety-plan-generator.ts`（generatePlan/regenerateFromTemplateId）。テンプレートデータは `src/data/safety-plan-templates/index.ts`（30テンプレートビルド）と同フォルダ以下の base/*.ts（共通実施事項・目標・法令・スケジュール）と industries/ 以下10ファイル（各140〜187行）。

#### 30テンプレートの分類軸別内訳

10業種×3規模の固定組み合わせ。業種は建設業(construction)・製造業(manufacturing)・運輸交通業(transportation)・医療・福祉(medical)・サービス業(service)・小売業(retail)・飲食業(food)・卸売業(wholesale)・倉庫・運送取扱業(warehouse)・事務系(office)の10種。規模はsmall（〜49人）・medium（50〜299人）・large（300人以上）の3段階。テンプレートIDは `{industry}-{scale}` 形式（例: construction-medium）。

テンプレート構造は5層：基礎層（commonMeasures + commonGoals + commonLaws、全業種共通）→規模層（getScaleAdditions + getScaleLawReferences）→業種層（industryMeasures + industryGoals + industryLaws）→業種×規模交互作用層（getIndustryScaleOverlay）→カスタム層（applyCustomParameters）。

#### 入力パラメータ一覧

ユーザー入力は9項目：industry（必須、select）・scale（必須、select）・fiscalYear（必須、number、2025〜2040）・organizationName（任意、maxLength=64）・focusAreas（任意、MeasureCategory配列、複数選択）・specialWork（任意、SpecialWorkId配列）・hasOverseas（任意、boolean）・overworkPriority（任意、high/normal/low）・notes（任意、maxLength=2000）。URLパラメータからの自動prefill（?industry=, ?focus=）に型ガード（isIndustryId等）を使用。

#### 生成ロジックの大枠フロー

AIを使用しない完全ルールベース生成。フォーム送信→PreviewPage（URL パラメータを読み込み）→regenerateFromTemplateId()→findTemplateById()でテンプレート取得→applyCustomParameters()（specialWork / overseas / overwork / detectFocusAreas適用）→prioritizeMeasures()→dedupeGoals()/dedupeMeasures()→GeneratedPlanオブジェクト生成→PlanDocumentでレンダリング。

出力フォーマットはHTML（ブラウザ表示）とPDF（window.print()経由）の2種。MarkdownやWord出力は未実装。customGoalsフィールドは型定義にはあるがUIに入力欄なし（常に空配列）。

#### Copilot連携

`plan-generator-form.tsx`（L17-20でuseOptionalCopilot、L101-161でprefillエフェクト）がSafetyContextから業種・規模・重点取組みを自動入力。フォーム送信時に `copilot.recordPlan()`（L184-191）で計画をコンテキストに記録。プレビューページにもCopilotPlanSync（L12）・CopilotNextSteps（L250-264）が埋め込まれ、events-reports / chatbot への横断リンクを表示する。/accidents-reports への具体的動線は `plan-generator-form.tsx` L397-411（`/accidents-reports/{reportSlug}`）、/chatbot への動線はL413-421（`/chatbot?q=...`）。

#### TODO/FIXME/未実装コメント

明示的なTODO/FIXME は0件。

#### 既知の弱点

農業・林業・漁業が未対応（10業種に含まれない）。派遣・請負の明示的考慮なし。「従業員数」の定義（パート・派遣含むか）が未明文化。複数業種を営む企業（コンビニ等）への対応なし。focusAreasとspecialWorkの優先度競合の解決順が未定義。notes入力が2000文字許容のためURLが3000文字超になる可能性あり。PDF品質はブラウザ印刷設定依存でサーバー側PDF生成なし。Copilot prefillメッセージは初回訪問時のみ表示（2回目以降は引き継ぎが視覚的に伝わらない）。

---

## 3. SEO実測データ

### 3.1 sitemap構成とURL数

`src/app/sitemap.ts`（メインsitemap）が中核で静的169URL＋動的URLを返す。動的URLソースは通達告示（mhlwNotices、~1069件）・公開記事（getPublishedArticleIndex、~50件）・保護具DB（getAllEquipment、~500-1000件）・機能カテゴリ（FEATURE_CATEGORIES、~10件）・安全標識カテゴリ（SIGN_CATEGORIES）・安全標識業種別（INDUSTRIES）・安全標識個別（SAFETY_SIGNS、~1500件）・疾病ガイド（ILLNESS_CATEGORIES）。推定総URL数は2,800〜3,500件。

sitemap-index.xml（`/sitemap-index.xml/`）が親で、子sitemapとして上記sitemap.tsと `sitemap-articles.xml/`・`sitemap-circulars.xml/`・`sitemap-equipment.xml/` の4本立て。

未解決の課題：SEO-008として `/accidents-reports/compare?industries=...` のクエリパラメータ付き4URLがsitemapに残存（重複コンテンツリスク）。SEO-006としてlastModifiedがハードコードで鮮度差が極端（/chatbotのlastModified 2026-04-01はPR #245 2026-05-18より大幅に古い）。SEO-022として sitemap-index と sitemap.xml の整合性CI検証なし。

robots.tsは `src/app/robots.ts` で管理。全クローラー向けDisallowは /admin/, /api/, /auth/, /dev/, /handover, /lms, /api-docs, /dpa。AI系クローラー17種を / でブロック（PR #239実装）。/audits/ は意図的にDisallow除外（AI WebFetchでの監査ページ参照を可能にするため）。

### 3.2 GSC連携状況

`src/lib/stats/search-console-client.ts`（219行）にOAuth実装あり。認証方式はユーザーOAuth（リフレッシュトークン方式）。必要環境変数はGSC_OAUTH_CLIENT_ID / GSC_OAUTH_CLIENT_SECRET / GSC_OAUTH_REFRESH_TOKEN の3点。いずれか1つでも未設定の場合、`isConfigured()` がfalseを返しモックデータ（`src/data/mock/search-console-mock.ts`）にフォールバックする。セットアップ手順は `docs/gsc-oauth-setup.md` に記載。

ローカル環境からVercel環境変数の実設定状況は確認不可のため、実データ取得が稼働しているかは本番ダッシュボード（/stats）での確認が必要。稼働時は クエリ別TOP30・ページ別TOP30・国別TOP10・デバイス別TOP5 を取得可能。

### 3.3 GA4連携状況

フロントエンド計測は `src/components/Analytics.tsx` で `NEXT_PUBLIC_GA_MEASUREMENT_ID` 環境変数制御。未設定時はnull返却でスクリプト不挿入。ページビューは pathname/searchParams連動で自動追跡、カスタムイベントは `trackEvent()` ユーティリティを通じて発火。

バックエンドAPI取得は `src/lib/stats/ga4-client.ts` でサービスアカウントJSON認証（GA4_PROPERTY_ID + GOOGLE_APPLICATION_CREDENTIALS_JSON / GOOGLE_APPLICATION_CREDENTIALS）。未設定時はモックデータ返却。稼働時はDAU/MAU/PV/平均セッション時間/直帰率/ページ別TOP10/流入元TOP10を取得可能。

### 3.4 Vercel Analytics

PR #247で `/admin/health-check`（Vercel usage monitoring dashboard）を実装。Vercel Analytics APIからの取得状況はVercelプランとダッシュボードAPIキーの設定次第。Web Analytics（ページ別アクセス数）はVercel Pro以上で有効だが、ローカル調査では実データ取得不可。

### 3.5 主要ページメタデータ

主要6ページのメタデータを静的コード調査で確認：

/chatbot のtitleは「安衛法AIチャットボット｜33法令以上を根拠条文付きで即答（無料）」、descriptionは33法令列挙付き長文、canonicalは /chatbot、OG画像は動的生成（/api/og）、JSON-LDはWebPage/BreadcrumbList/QAPage/WebApplicationの4層。

/accidents-reports のtitleは「労働災害 業種別 分析レポート｜5業種5,000件超の自動集計（無料）」、revalidate=86400（24時間ISR）、JSON-LDはWebPage/BreadcrumbList/ArticleList/WebApplicationの4層。

/strategy/plan-generator のtitleは「年次安全衛生計画 業種別 ジェネレーター｜10業種×3規模・無料・PDF」、JSON-LDはWebPage/WebApplication/BreadcrumbListの3層。

/laws のtitleは「安全衛生法 改正情報一覧 最新」、priority=0.9、lastModified=2026-04-19。/accidents はpriority=0.9、lastModified=2026-04-19。/faq はpriority=0.9、lastModified=2026-05-16。

### 3.6 構造化データ実装状況

`src/components/json-ld.tsx` に Organization・WebSite・WebPage・BreadcrumbList・QAPage・WebApplication・NewsArticle・Dataset・FAQPage 等のスキーマファクトリが集約。コードベース全体で125ファイルがJSON-LDを使用。メイン3機能は COPILOT_FEATURE_PEERS として相互参照（mentions フィールド）。

WebSite スキーマはサイト全体に1件、SearchAction（法令検索URL）を含む。Organization スキーマはabout/logo/knowsAbout を含む。BreadcrumbList は最大3〜4階層。FlagshipGrid への ItemList スキーマ（SEO-010）と /exam-quiz への CourseList/Quiz スキーマ（SEO-011）はP2 Batch 4で実装予定で現時点では未実装。

---

## 4. ギャップと課題の機械判定

コード規模に対してアクセスが極端に少ない可能性のある機能として /strategy/plan-generator が挙げられる。sitemap lastModified が2026-05-16と新しく、コード規模（安全計画生成エンジン4,000行超）に対してsitemap priority が0.8と標準的だが、URL構造として `/strategy/plan-generator/preview/[id]` のプレビューURLがsitemapに未掲載であり、生成された計画への直接アクセス経路が存在しない。

/strategy親ルートが孤立している（UX-014）。/strategyへのアクセス時はパスワードゲートが表示されるが、/strategy/plan-generatorへの301リダイレクトが未実装のため、URLを直打ちしないと到達できない。

sitemapのlastModified鮮度差として、/chatbot が2026-04-01（PR #245による大幅改修2026-05-18より48日古い）、/accidents が2026-04-19（業種比較ページは2026-05-17更新）というギャップがある。これはGoogleのクロール優先度判定に影響する可能性がある（SEO-006）。

内部リンク観点では、/about ページから メイン3機能（/chatbot・/accidents-reports・/strategy/plan-generator）への直接リンクが未実装（SEO-013）。ホームのトピックカードから /accidents-reports・/strategy/plan-generator への動線が欠如（UX-008）。これらはP2 Batch 4で対応予定。

robots.ts の Disallow設定と sitemap の整合性として、/audits/ はDisallow除外（AI WebFetch許可）かつ各ページはmetadata.robots { index: false }設定されており、検索エンジンインデックスからは除外されているが意図的な設計。整合性CI検証は未実装（SEO-022）。

ホームHTMLは151KB・JSチャンクは24個（SEO-018）、HomeThreePillarsが全体として 'use client' 化されているためSSR/CSRのクライアントバウンダリが最適化されていない（SEO-020）。これらはP2 Batch 6でCWV改善予定。

---

## 5. 残タスク全可視化

### 5.1 P2残16件 (Batches 3-6)

計画ファイル: `src/app/(main)/audits/p2-batch-plan/page.tsx`  
Batch 1・2完了済み（PR #246, #250）。残16件、87時間。

**Batch 3: Navigation Restructure + Mental Hub（2026-05-27〜2026-06-01, 16h, 計画中）**

タスク2件。UX-003（12h）はFlagshipNav 10→3削減・NAV_CATEGORIES 9→5統合・Footer 4→3列整理。UX-027（4h）は/mental-health→/mental-health-management の301統合・Sidebar 2サブカテゴリ分割。依存: Batch 1/2完了後。

**Batch 4: Internal Linking + Structured Data（2026-06-02〜2026-06-06, 16h, 計画中）**

タスク4件。UX-008（3h）はホームトピックカードからメイン3機能への動線追加。SEO-013（3h）は/aboutページからメイン3機能への直接リンク追加。SEO-010（4h）はFlagshipGrid ItemList Schema実装。SEO-011（6h）は/exam-quiz CourseList/Quiz Schema実装。依存: Batch 3完了後。

**Batch 5: Sitemap/Tech SEO + Long-tail Content（2026-06-07〜2026-06-11, 27h, 計画中）**

タスク4件。SEO-006（4h）はsitemap lastModifiedのgit log自動取得スクリプト化。SEO-008（3h）はcompareページのクエリURL4件をsitemapから除外。SEO-022（4h）はsitemap整合性CI検証スクリプト新設。SEO-002（16h）はロングテールキーワード（「〜業 計画書 テンプレート 無料」「熱中症 安衛則612条の2」等）のdescription/h2への挿入。依存: SEO-002はBatch 3完了後。

**Batch 6: CWV + Search Expansion + Chatbot SSR + i18n（2026-06-12〜2026-06-15, 28h, 計画中）**

タスク5〜6件。UX-006（8h）はCommandPaletteの検索インデックス5→全カテゴリ拡張。UX-017（4h）はchatbot SSR時の「読み込み中」FCP遅延をServer Component分離で解消。SEO-018（8h）はホームHTML 151KB/JS 24chunks削減（weekly Lighthouse化・AlertGenerator動的import）。SEO-020（4h）はHomeThreePillarsのServer Component分離。SEO-024/025（4h）は英語表記i18n統一判断。依存: Batch 5と並行可。

### 5.2 P3残10件 (Batches 1-4)

計画ファイル: `src/app/(main)/audits/p3-batch-plan/page.tsx`  
先行解消2件済（UX-020/SEO-019）。残10件、22時間。

**Batch 1: Copy & CLS Quick Wins（2026-05-21〜2026-05-23, 5h, 計画中）**

タスク4件。UX-011（1h）はメインCTA「安衛法AIに質問」を「労働安全衛生法をAIに質問」に変更。UX-019（1h）は屋外モードトグルをPC topbar集約（sidebar底部ボタン削除）。SEO-003（1h）はh1を「労働安全衛生のAI・DX活用ポータル」に変更。UX-018（2h）は統計バーCLSリスク解消（min-h付与）。依存なし。

**Batch 2: Footer Restructure（2026-05-28〜2026-05-30, 6h, 計画中）**

タスク2件。UX-015（2h）はFooter「関連データ」の分類を機能vs データで再編。SEO-014（4h）はFooterアンカーテキストをロングテール置換。依存: Batch 1完了後。

**Batch 3: Alert Consolidation & Strategy Hub（2026-06-04〜2026-06-06, 5h, 計画中）**

タスク2件。UX-012（2h）はHomeThreePillarsの3カードAlertGeneratorを1つに統合。UX-014（3h）は/strategyを/strategy/plan-generatorに301リダイレクト（vercel.json）。依存: Batch 2完了後。

**Batch 4: Navigation Breakpoint & Thin Content（2026-06-10〜2026-06-12, 6h, 計画中）**

タスク2件。UX-023（3h）はSidebarをlg以上からmd以上表示に変更。SEO-017（3h）はhome/footer/meta の機能リスト3〜4箇所ほぼ同文のthin content整理。依存: Batch 3完了後。

### 5.3 回帰監査Minor/P2/P3バックログ 11件

監査ファイル: `src/app/(main)/audits/post-2week-regression/page.tsx`  
対象期間: 2026-05-05〜2026-05-19（14日間）・対象PR数: 173件・検出: 11件。

P1 2件、P2 3件、P3 6件。

F-001（P1, Data integrity）: 未来日付の事故レコード mhlw-2026-001（occurredOn: 2026-07-08、本日より49日先の未来）。`web/src/data/mock/real-accident-cases-2024-2026.ts:143-162`。

F-002（P1, Security）: ハードコード認証鍵 `const VALID_KEY = '<REDACTED>'`（旧固定鍵）を `/api/admin/health/route.ts:6` に記述していた。GitHubパブリックソースに露出。security/f002-admin-health-auth で `process.env.ADMIN_HEALTH_KEY` 化済み。

F-003（P2, Brand consistency）: ANZEN AI Portal 残存6箇所（OG画像英語tagline・印刷PDF発行元・About英語見出し・Features英語hero・Circulars英語footer・Dataset JSON-LD creator）。PR #246では部分対応のみ。

F-004（P2, Resilience）: Gemini API呼び出し（6 APIルート）にCircuit Breaker未適用。`src/lib/external/circuit-breaker.ts` はResend向けのみ使用。

F-005（P2, Vercel quota）: 動的AIルート10本（chat/chatbot/law-summary/quiz-explain/ky-assist/summaries/translate/safety-alert/sds/goods-chat）にCDNキャッシュなし。PR #239で静的ルートのキャッシュは追加したが最頻度AI推論ルートは未対応。

F-006〜F-011（P3）: データファイル年度命名不整合・管理画面認証ゲート漏れ2件・labelメタデータ表記混在・コミットメッセージ誤記・データプロバナンス文書化不足。

### 5.4 F-001 / F-002 現状

**F-001**: `real-accident-cases-2024-2026.ts:143-162` の mhlw-2026-001レコードは occurredOn=2026-07-08（未来日付）かつ provenance='mhlw'（厚労省公式扱い）。本Dispatch内では処理しない。推奨対応は（1）occurredOn を2025-07-08に修正しタイトル整合、（2）レコード削除、（3）provenance='scenario'変更＋disclaimerフィールド追加の3択。複数の監査ページ（post-2week-regression/2026-05-16/brand-consistency）で言及済み。

**F-002**: `/api/admin/health/route.ts:6` の旧固定鍵 `const VALID_KEY = '<REDACTED>'` はGitHub公開リポジトリに露出。返却内容はservice statusのみだが内部URL/環境情報の公開リスクあり。PR #193で同種の修正実施済みにもかかわらず再発したケース。security/f002-admin-health-auth で `process.env.ADMIN_HEALTH_KEY` に変更済み。残る作業は Vercel 本番環境変数の設定と旧鍵のローテーション（Gitヒストリからの消去は任意）。

### 5.5 コード内TODO/FIXME全件

`src/` 以下の全TypeScript/TSXファイルで明示的なTODO/FIXME は0件（`grep -rn "//.*TODO|//.*FIXME"` の結果）。実質的な未完成事項はF-001〜F-011と各バッチ計画に記録されており、コードコメント形式ではなく監査ページのJavaScriptデータとして管理されている。

---

## 6. 課題の体系化

### 6.1 メイン機能側の課題

**/chatbot**

Gemini APIのレスポンスキャッシュが存在しないため、同一クエリでも毎回新規呼び出しが発生しVercel Functions invoは都度消費される（F-005関連）。Gemini APIルート6本にCircuit Breakerが未適用で（F-004）、トラフィックスパイク時や quota枯渇時に全件失敗するリスクがある。直近8ターンのみ送信するため長期会話での文脈喪失がある。SSR時の初期表示が「読み込み中」のみでFCP遅延を生じさせる（UX-017、P2 Batch 6で対応予定）。共有URLのTTLが存在せず生成した会話URLが永続化される。

**/accidents-reports**

データ更新のトリガー機構がなく、industry-profiles.json（2026-04-18生成）が32日以上古い状態で運用されている。フリーテキスト検索・事故型フィルタ・月別フィルタが未実装で、業種選択以外の絞り込み手段がない。スマートフォン（375px）での5業種並列比較ビューは横スクロールが必須となりUXが損なわれる。マーケティング文言の「5,000件超」と実モックデータ（292件）・集計統計（504,413件）の関係が不明確で、外部読者が誤解する可能性がある。比較ページのsitemap掲載クエリURL（4件）は重複コンテンツリスクあり（SEO-008）。

**/strategy/plan-generator**

農業・林業・漁業・派遣・請負など10業種外の業態に対応するテンプレートがない。PDF出力がブラウザ印刷依存でサーバー側PDF生成なし（品質・余白・改ページが不定）。URLが最大3000文字超になる可能性があり、QRコード化やURL共有が困難。/strategyルート（親）から/strategy/plan-generatorへの301リダイレクトが未実装でURL孤立（UX-014）。Copilot prefillの視覚フィードバックが初回訪問時のみ表示される。

### 6.2 SEO側の課題

sitemapのlastModifiedハードコードにより、Googleのクロール優先度が実際の更新頻度と乖離している（SEO-006、P2 Batch 5で対応予定）。/chatbotのlastModified（2026-04-01）はPR #245の実装（2026-05-18）より48日古く、再クロール優先度が下がる可能性がある。

compareページのクエリURL4件がsitemap掲載済みで重複コンテンツリスクがある（SEO-008）。FlagshipGridへのItemList Schema（SEO-010）と/exam-quizへのCourseList/Quiz Schema（SEO-011）が未実装でリッチスニペット候補化が遅れている。

FooterアンカーテキストがサイトナビゲーションURLの固定文言で多様性不足（SEO-014）。home/footer/meta での機能リスト記述が3〜4箇所ほぼ同文でthin content判定リスク（SEO-017）。ロングテールキーワード（「〜業 計画書 テンプレート 無料」「熱中症 安衛則612条の2 R7.6.1」等）が主要ページのdescription/h2に未掲載（SEO-002）。

ホームHTML 151KB・JS 24chunksはCWVのTBT/INP悪化リスクがある（SEO-018）。HomeThreePillarsの全体 'use client' によりSSR/CSRの境界が最適でなくFCP後CLS懸念あり（SEO-020）。h1「現場の安全を、AIで変える。」が検索意図ワードと不一致（SEO-003）。

sitemap整合性のCI検証が存在せず、手動でのみ確認可能（SEO-022）。GSC連携の実稼働状況がローカルから確認不可で、モックデータでダッシュボードが表示されている可能性がある。

### 6.3 データ整合性・コンテンツ品質の課題

F-001: 未来日付事故レコード（2026-07-08）が provenance='mhlw' として掲載されており、ユーザーが未確定事象を公式データと誤認するリスクがある。AI WebFetchがこれを引用した場合の拡散リスクも指摘されている。

F-006: real-accident-cases-2025-preliminary.ts に2026年Q1のレコード（preliminary-2026-003〜006）が混在しており、年度別メンテナンス時の検索漏れリスクがある。

F-010: curated-2026-002（2026-03-15発生）の編集方針が文書化されておらず、provenance='curated' の意味論が不明確。

事故データ件数の表記不整合: サイトが謳う「5,000件超」の根拠が不明確で、実モックケース292件・集計統計504,413件・速報データ114件（2026年1-3月）の関係が整理されていない。

法令数の表記: サイト上「33法令以上」と記載されているが実装は50法令体制（`src/data/laws/index.ts` L114）で、タイトル/descriptionと実装の間に乖離がある。

### 6.4 インフラ・運用の課題

Vercel Proプランは2026-06-15で期限切れ（PR #247でHobby降格後の制限を事前計測済み）。P2 Batch 6（2026-06-12〜06-15）がPro期限ギリギリに設定されており、遅延リスクがある。

F-002（/api/admin/healthのハードコード認証鍵）が未修正でGitHub publicリポジトリに露出中。PR #249で検出・記録されたが本Dispatchでは処理しない（セキュリティ対応としては最優先）。

動的AIルート10本のCDNキャッシュ未設定（F-005）によりVercel Functions invocationが蓄積。同一クエリでも毎回Functionsを消費するためHobby降格後の無料枠超過リスクがある。Gemini APIの Circuit Breaker が6本のルートに未適用（F-004）で障害時の連鎖影響が大きい。

週次Lighthouse監視スクリプト（scripts/lighthouse-monitor.mjs）はP2 Batch 6での実装予定で未稼働。パフォーマンス回帰の自動検出機構が存在しない。sitemap整合性CI検証も同様に未実装（SEO-022）。STRATEGY_AUTH_PASSWORDのローテーション手順が文書化されていない。

### 6.5 未着手だが重要そうな領域

リアルタイム法令更新: 現状は手動バッチ更新（mhlw-notices.jsonl）で、厚労省のWebサイトからの自動取り込みは未実装。年度更新ごとに手動対応が必要。

通知機能: CLAUDE.mdの優先課題に記載されているが実装ゼロ。/notifications ページはsitemapに掲載されているが機能が存在しない。

サブスク課金: NEXT_PUBLIC_PAID_MODE=false のままでStripe実装は用意されているが稼働していない。Vercel Proプランのコストを回収する手段がない状態。

KY用紙の完成: /ky ページは存在するが音声入力・PDF出力が未実装（CLAUDE.mdの優先課題）。

Eラーニング編集機能: e-learning関連のデータファイルは充実しているが、コンテンツ編集UIは未実装。

チャットボットのレスポンスキャッシュ: 同一クエリへの重複API呼び出しを防ぐインメモリまたはRedisキャッシュが未実装。

法令条文の e-Gov リンク: law-metadata.tsに egovLawId フィールドが存在するが、全法令でのカバレッジ確認と実リンク化が未完了。

---

*以上、レポート総語数約7,000語（日本語換算）。外部Claudeが本URLを読むことで安全AIポータルの2026-05-19時点の完全な現況把握が可能な粒度で記述した。*

*生データファイル: [seo-raw.json](./seo-raw.json)*
