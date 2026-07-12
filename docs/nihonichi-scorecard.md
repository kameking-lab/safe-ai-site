# 日本一スコアカード — 機能別「日本一か」判定の正本（v1・2026-07-12）

- **これは何**: 社長の問い「日本一のUX/UI/SEOになっているか」を、感想ではなく**再計測可能な計器**で答えるための正本。機能ごとに (1)実在の競合 (2)測定可能な基準3〜5個 (3)自サイト実測値 (4)競合実測値 (5)判定 を持つ。
- **正本規律**: 本ファイルが唯一の正本。四半期ごとに §10 の手順で再計測し、現在値・判定・最終計測日を更新する（BACKLOG-ops に常設タスクあり）。**忖度も卑下も禁止。測っていないセルは「測定不能」と書く。**
- **判定の定義**: `勝` = 実測で競合を上回る ／ `並` = 基準により勝ち負けが割れる ／ `負` = 実測で競合が上回る ／ `測定不能` = 自他いずれかが未計測（理由と計測手段を必ず添える）
- **初回計測**: 2026-07-12（本番 https://www.anzen-ai-portal.jp/ ＋ 競合各サイトを同日curl/API実測。コミット `1ce7ef9` 時点のリポジトリ実カウント）
- **戦略側**: 負け・未測定セルを埋める施策の優先順位は `docs/nihonichi-strategy-2026-07-12.md`

---

## 0. 判定サマリ（2026-07-12）

| 機能 | 判定 | 一言根拠 |
|---|---|---|
| 1. 法令閲覧 | 並 | 読みやすさ・平易化は勝ち、全法令網羅はe-Govに負け |
| 2. 法令検索 | **勝** | 俗称着地率100% vs e-Gov「ユンボ」0件（双方実測） |
| 3. チャットボット | **勝**（競合不在） | 安衛法特化の生成AI競合を発見できず。本番51問eval 100% |
| 4. 化学RA | 並 | Web完結はCREATE-SIMPLE（Excel配布）に勝ち、公式性は負け |
| 5. KY/帳票 | 負（商用比） | AI事例提案の規模で商用に負け。無料公開枠では唯一 |
| 6. 教育/スライド | 負 | 法定講習・修了証の壁。無料学習としては独自 |
| 7. 事故統計/判例 | 並 | 鮮度・検索性は勝ち、全数性・判例規模は負け |
| 8. 通知/サイネージ | 二分 | サイネージ=勝ち（空白領域）、通知=負け（閉端末Push未実装） |
| SEO（横断） | **測定不能** | GSC未稼働（`source:"mock"`を本番実測）＝順位計器ゼロ |

---

## 1. 法令閲覧（/law-navi・/laws） — 判定: 並

**土俵の競合**: e-Gov法令検索（laws.e-gov.go.jp・デジタル庁）／安全衛生情報センター法令DB（jaish.gr.jp・中災防運営）

| # | 基準 | 自サイト現在値（実測） | 競合値（実測） | セル判定 |
|---|---|---|---|---|
| 1-1 | 条文ページのスマホ実用性（JSなしでHTML本文が返るか・TTFB） | 条ページ実HTML 178KB・TTFB 0.77s（/law-navi/347AC0000000057/61 curl実測 07-12） | e-Gov: **SPAシェル800バイトのみ・条文はJS必須**（同日curl実測）。jaish: Shift_JIS・viewportメタなし＝スマホ非対応 | 勝 |
| 1-2 | 現場ことば版（条文の平易化対訳）の有無と規模 | **512条収載・482条表示中**（20法令・fidelityゲート付き。`docs/plain-language-coverage.md`） | e-Gov: なし。jaish: なし。無料で条文単位の平易化対訳を出す競合サイトは探索で発見できず（07-12 WebSearch） | 勝（競合空白） |
| 1-3 | 全法令・全条文の網羅性 | 全文スナップショット**1法令（安衛則）1,182条**＋curated 1,076条/55ソース（site-stats.ts機械検証） | e-Gov: **全法令・全条文**（法令API v2で安衛法の2026-04-01施行改正反映を確認） | **負** |
| 1-4 | 改正の反映鮮度 | 安衛則全文 revisionId `20260701_506M60000100079`（2026-07-01時点版） | e-Gov: 最新（正本）。jaish: 安衛法本文 Last-Modified **2025-05-20**＝2026年4月施行改正が未反映の可能性大（curl実測） | e-Govと並・jaishに勝 |
| 1-5 | 原文（正本）到達の速さ | 各条ページから e-Gov 条番号アンカー（#Mp-At_61）へ**1タップ**（本番HTML実測） | —（自サイト固有の基準。e-Govは自身が正本） | 勝 |

**正直な注記**: 「全文1,182条」は安衛則1本のみ。安衛法・安衛令ほかは抄録（curated）。網羅性の負けは FT-D2〜D7（BACKLOG-data 既存タスク）が既定路線。

**再計測**: `cd web && npx vitest run src/data/laws-fulltext/fulltext-gates.test.ts src/lib/law-navi/permalink.test.ts` ＋ `npm run plain:status` ＋ `curl -s <条ページURL> | wc -c`（JSなしHTML実測）＋ e-Gov側 `curl -s https://laws.e-gov.go.jp/law/347AC0000000057 | wc -c`（SPAシェルのままか）

## 2. 法令検索（/search・⌘K・/law-search） — 判定: 勝

**土俵の競合**: e-Gov法令検索（キーワードAPI）／jaishサイト内検索

| # | 基準 | 自サイト現在値（実測） | 競合値（実測） | セル判定 |
|---|---|---|---|---|
| 2-1 | 俗称・現場ことば着地率（55ケースベンチ） | RAG **49/49=100%**・横断検索 **49/49=100%**・範囲外の正しい棄却 **5/5**（`docs/field-vernacular-bench-after-2026-07-11.json`） | e-Gov keyword API実測（07-12）: 「ユンボ」**0件**・「クビ」は野生動植物保護法等に誤着地・「バックホウ」安衛法系不達。正式語「車両系建設機械」なら87件中最上位が安衛法＝**正式語の世界** | **勝** |
| 2-2 | 条番号ゆらぎ耐性（「61条」「第六十一条」「安衛法61条」） | 正規化パーサで吸収（`article-number-normalize.ts`・O8-b。診断G2で実測動作） | e-Gov: 吸収しない（`docs/fable-diagnosis-2026-07-02/05-search-egov.md` G2実測） | 勝 |
| 2-3 | 検索品質eval（Recall@5） | rag-124問 **Recall@5 0.992・MRR 0.800**（`docs/rag-metrics-latest.json` 2026-07-11） | 競合に同種の公開evalなし＝比較対象不在 | 勝（単独計測） |
| 2-4 | 応答速度 | 入力→結果描画 **p50 206ms・p95 275ms**（代表10クエリ×4回=40サンプル実測 2026-07-12・`web/scripts/search-latency-bench.mjs`。ローカル本番ビルド計測。クライアント内検索でネットワーク往復なし） | e-Gov keyword API 0.5s前後（curl・サーバー往復あり） | 勝（自側実測206msでe-GovのAPI往復0.5sを下回る。※ローカル計測ゆえ本番URL実測は四半期再計測NIQ-OPS1で追加） |
| 2-5 | 検索対象の広さ | 安衛法体系＋労基法系＋通達＋サイト内機能（横断） | e-Gov: **全法令**（土俵が広い） | 負（ただし当サイトの土俵=安衛法領域では影響小） |

**再計測**: `cd web && npm run bench:field-terms` ＋ `npx vitest run src/lib/rag-metrics.test.ts src/lib/rag-100q.test.ts` ＋ 応答ms=`npm run build && npm start` の別窓起動後に `node scripts/search-latency-bench.mjs`（§2-4のp50/p95更新・生成JSONはコミットしない）＋ e-Gov側 `curl -s "https://laws.e-gov.go.jp/api/2/keyword?keyword=ユンボ"`（0件のままか）

## 3. 安衛法チャットボット（/chatbot） — 判定: 勝（競合不在）

**土俵の競合**: 厚労省 労働基準監督署チャットボット（FAQ選択型）／労務系SaaSのAI Q&A（SmartHR等・安衛法特化ではない）

| # | 基準 | 自サイト現在値（実測） | 競合値（実測） | セル判定 |
|---|---|---|---|---|
| 3-1 | 公開evalの正答率（51問・本番実測） | **47/47=100%**（strictAccuracy 1.0・範囲外4/4 handled・2026-07-11T16:48Z `docs/chatbot-genquality-51q-final-2026-07-11.json`） | 労基署チャットボット: 「個別の質問には対応していない」と自己申告（mhlw.go.jp案内・07-12実測）＝**条文Q&A不能**。精度公開している競合ゼロ | **勝** |
| 3-2 | 根拠条文添付率・引用検証 | 全回答に根拠条文＋e-Gov正本アンカー。引用はvalidateCitationsで機械検証・未検証引用に警告（route.ts実装） | 競合に該当機能なし | 勝 |
| 3-3 | ハルシネーション検出網 | 誤結論0・プレースホルダ漏出0（51問中）。既知欠陥はratchet台帳管理 | 比較対象なし | 勝（単独計測） |
| 3-4 | 応答速度・可用性 | streaming対応・レート制限40req/10分/IP。応答msの継続計測は未実施 | 労基署bot 1.1sで画面応答（中身はFAQ） | 測定不能（自側ms未計測） |
| 3-5 | 評価の第三者性 | **eval自作・第三者検証なし**（正直に明記。設計は反循環＝正解の出所はe-Gov正本でコーパス由来禁止） | — | 測定不能（構造上の弱点） |

**正直な注記**: 「100%」は自作51問での値。網を広げれば下がる（07-11に23問→51問拡張で一時95.7%に低下→retrieval是正で100%回復の実績）。数字より「検出網＋ratchetの仕組みがある」ことが競合との本質差。

**再計測**: `cd web && CHATBOT_EVAL_BASE_URL=https://www.anzen-ai-portal.jp CHATBOT_EVAL_INTERVAL_MS=18000 npm run eval:chatbot-gen`（レート制限に注意・約20分）

## 4. 化学物質RA（/chemical-ra・/chemical-database） — 判定: 並

**土俵の競合**: 厚労省CREATE-SIMPLE（職場のあんぜんサイト配布）／ケミサポ（労働者健康安全機構）／商用SDS管理SaaS（ケミカン・Dr.EHS等）

| # | 基準 | 自サイト現在値（実測） | 競合値（実測） | セル判定 |
|---|---|---|---|---|
| 4-1 | Web/スマホ完結性 | ブラウザのみでRA完結（CREATE-SIMPLE準拠ばく露評価・混合物対応・A4印刷様式） | CREATE-SIMPLE: **Excelマクロ(.xlsm)配布・ver3.2.1（2026.6）**＝Web版なし（07-12実測）。ケミサポ: 手順ガイド中心でRA計算ツールなし | **勝**（Web完結は唯一） |
| 4-2 | 収載物質数 | 全件検索 **3,695物質**（厚労省3,984取込とcuratedのマージ・site-stats機械検証）＋精選50物質 | あんぜんサイトのモデルSDS総件数: **未確認**（検索がASP.NET/JS必須で実測不可） | 測定不能（競合側） → 社長チェック§9-4 |
| 4-3 | 判定ロジックの公式性・追従性 | CREATE-SIMPLE「準拠」＝本家ver更新（3.2.1）への追従は手動 | 本家が正本。2026年6月にも更新実績＝更新が早い | **負**（公式性は本家） |
| 4-4 | 記録様式の実務適合（保存様式・確認印・30年保存注記） | A4印刷様式・確認印枠・台帳保存あり（実装確認） | CREATE-SIMPLEはExcelなので様式自由度はある | 並 |
| 4-5 | SDS管理（台帳・改訂追跡） | SDSアップロードパネルまで（管理SaaSではない） | 商用SaaS（ケミカン「累計2,000社以上」等）が強い | 負（土俵外と割り切るか要判断） |

**再計測**: site-statsテスト（`npm run test`に含まれる）＋ CREATE-SIMPLE配布ページ `curl -s https://anzeninfo.mhlw.go.jp/user/anzen/kag/ankgc07.htm | grep -o 'CREATE-SIMPLE[^"]*\.xlsm'`（ver番号の変化を監視）

## 5. KY/帳票（/ky・/ky-examples・/safety-diary） — 判定: 負（商用トップ比）

**土俵の競合**: HACARUS KY（AI危険提案）／竹中工務店×NTTドコモ KYアシスト／三菱電機ビルソリューションズ KY-Support（音声入力）／U-cube cogni 工事KY（音声認識）

| # | 基準 | 自サイト現在値（実測） | 競合値（公開情報） | セル判定 |
|---|---|---|---|---|
| 5-1 | 音声入力 | 実装済（Web Speech API・Chrome/Edge対応。CLAUDE.mdの「未完」は陳腐化） | 三菱電機KY-Support・U-cube cogni: 音声対応を公表 | 並 |
| 5-2 | AI危険提案の規模 | KY事例150件＋業種プリセット（AI提案は ky-assist 実装） | HACARUS: 「**約3,000件の災害事例から危険ポイント提案**」を公表 | **負**（規模20倍差。ただし自サイトは統合事故DB5,026件を保有=接続すれば逆転可能→戦略doc施策1） |
| 5-3 | 帳票出力（A4印刷/PDF） | 実装済（全建協/建災防様式寄せ・確認印枠） | 商用各社のPDF出力有無: **未確認**（デモ申込制） | 測定不能（競合側） |
| 5-4 | 導入コスト・即時性 | **無料・登録なし・ブラウザのみ**。無料一般公開のWeb KYツールは探索で他に発見できず | 商用は法人契約・デモ申込制 | 勝（無料枠では唯一） |

**再計測**: KY事例数 `grep -c "id:" web/src/data/ky-examples/*.ts`。競合はHACARUS/三菱電機のプレスページを年1確認。

## 6. 教育/スライド（/e-learning・/education） — 判定: 負

**土俵の競合**: 建設業教育協会（特別教育22種・安全衛生教育21種のWeb講習）／CIC・らくトレ（職長教育）／中災防（集合研修）／こころの耳（メンタル特化eラーニング）

| # | 基準 | 自サイト現在値（実測） | 競合値（公開情報） | セル判定 |
|---|---|---|---|---|
| 6-1 | 法定教育の代替可否（修了証の法的効力） | **不可**（修了証発行なし。当サイトの教育は自主学習用） | 商用各社: 法定特別教育・職長教育の修了証を発行（有料） | **負**（構造的。参入には登録教習機関級の実態が必要） |
| 6-2 | 無料で使えるコンテンツ量 | **45テーマ・約378問**（intro＋業種別6業種＋ハザード別。機械カウント） | こころの耳: 「15分でわかる」多数だがメンタル特化。現場安全の無料クイズ型は競合薄 | 勝（無料・現場安全の枠） |
| 6-3 | 教材の編集・カスタマイズ | **実装済**（ELearningEditorPanel・localStorage永続。CLAUDE.mdの「未実装」は陳腐化） | 商用は既製カリキュラム＝編集不可が通常 | 勝 |
| 6-4 | 受講記録の証跡 | なし（記録エクスポート未実装） | 商用: 受講管理・修了証PDF | 負 |

**再計測**: テーマ/問題数は `elearning-panel.tsx` の allThemes と `grep -c correctIndex web/src/data/mock/elearning-*.ts`。

## 7. 事故統計/判例（/accidents・/stats・/court-cases） — 判定: 並

**土俵の競合**: 職場のあんぜんサイト（死亡災害DB・死傷病DB・災害事例）／中労委 命令・裁判例DB／産労総研 労判Search（有料）

| # | 基準 | 自サイト現在値（実測） | 競合値（実測） | セル判定 |
|---|---|---|---|---|
| 7-1 | データ鮮度 | 統合10年DB **2015〜2026**・死亡DB 2019〜2024（site-stats） | あんぜんサイト: 死亡DB **〜令和5(2023)**＝2年遅れ・死傷DB **〜令和3(2021)**＝約5年遅れ（07-12ページ実測） | **勝** |
| 7-2 | Web検索性（スマホでの絞込・体験） | 統合10年 **5,026件**をWeb検索・スマホ対応 | 死傷DBは**月別Excelファイル配布**＝スマホで実質使えない（07-12実測） | 勝 |
| 7-3 | 全数性・規模 | curated 292件＋統合5,026件（元DB総数504,415件から抽出） | 死亡DBは**平成3年から全数**収載 | **負**（全数性は公的DB） |
| 7-4 | 判例の規模 | **89件**（実在確定判例のみ・現場向け解説付き） | 中労委DB: 裁判例約2,070件。労判Search: 約3,000件（有料） | **負**（規模。※判例コツコツ投入は歩留まり低下により凍結中＝規模戦はしない方針） |
| 7-5 | 統計の分析体験（業種別レポート等） | /accidents-analytics・/accidents-reports あり | あんぜんサイトの統計は平成21年以前＋厚労省本体へのリンク集 | 勝 |

**再計測**: site-statsテスト＋あんぜんサイト死傷DBページ `curl -s https://anzeninfo.mhlw.go.jp/anzen_pgm/SHISYO_FND.html | grep -o "令和[0-9]年"`（最新年の変化）

## 8. 通知/サイネージ（/notifications・/signage） — 判定: サイネージ勝・通知負

**土俵の競合**: 建設現場向け商用サイネージ（@WEEK・BANKEN・らくらく現場等＝ハード販売/レンタル＋汎用表示管理）

| # | 基準 | 自サイト現在値（実測） | 競合値（公開情報） | セル判定 |
|---|---|---|---|---|
| 8-1 | 安全コンテンツの自動配信（法改正・警報・災害事例） | 気象警報＋法改正＋重大災害を**15分自動更新**で表示（テストで機械固定） | 商用は表示管理が主で、安全コンテンツ自体を自動生成・配信する競合は発見できず | **勝**（空白領域） |
| 8-2 | 導入コスト | 無料・既存ディスプレイ＋ブラウザのみ | 商用はハード購入/レンタル＋月額 | 勝 |
| 8-3 | 閉じている端末へのPush通知 | **未実装**（VAPID鍵未発行=Path A制約。タブ表示中のOS通知・ベル・メール・RSSまで） | 商用アプリはネイティブPushあり | **負**（鍵発行=要オーナー判断で解消可能） |
| 8-4 | 実利用の実証 | **測定不能**（GA4未稼働のためサイネージ常設利用の実数が取れない） | — | 測定不能 → GSC/GA4稼働化（§9-1）で解消 |

**再計測**: `npx vitest run src/app/signage/page-refresh-config.test.ts`＋ /api/notify/feed のcurl応答確認。

## SEO（横断） — 判定: 測定不能

| # | 基準 | 現在値 | セル判定 |
|---|---|---|---|
| S-1 | 「労働安全衛生法」ヘッドタームのGoogle順位 | **測定不能**（GSC未稼働。2026-07-12本番実測: `/api/search-console` が `source:"mock"`・GA4 gtagタグ本番HTML不在） | 測定不能 |
| S-2 | インデックス済みURL数（/law-navi 717条ページ） | **測定不能**（同上。sitemap-laws.xml 717 URL・sitemap.xml 413 URLは配信済みを実測） | 測定不能 |
| S-3 | Lighthouse（品質基準90+） | モバイルPerformance **81.1**・LCP 5105ms（2026-05-14実測=約2ヶ月前。SEO 100・BP 99.5・A11y 93.8） | 負（自基準90+未達・要再実測） |
| S-4 | 構造化データ・技術SEO | JSON-LD 5層・robots/sitemap健全（実測200） | 勝ち筋（順位は測れないが技術面は整備済み） |

**正直な注記**: SEOの計器はGSC稼働まで**ゼロ**。1,182条＋現場ことば512条という弾があっても、着弾観測ができない。**GSC/GA4稼働化が唯一残っている社長作業**（手順: `docs/ga4-gsc-status-2026-05-23/02-required-actions.md`・所要約30分）。

---

## 9. 社長がスマホで5分でできる確認チェックリスト

未測定セル・体感差の実機確認。各1分以内。

1. **GSC稼働化が最優先**（これだけは確認でなく作業・約30分）: `docs/ga4-gsc-status-2026-05-23/02-required-actions.md` の手順でVercel環境変数6本＋Google側設定。完了確認は `https://www.anzen-ai-portal.jp/api/search-console?period=7d` をスマホで開いて `"source":"gsc"` になること。
2. **俗称検索の勝ち確認**: e-Govアプリ/サイトで「ユンボ 資格」を検索→着地しないこと確認 → 当サイト/searchで同じ検索→安衛法系条文に着地すること確認。
3. **チャットボット比較**: 労基署チャットボット（厚労省サイトから）で「フォークリフトに必要な資格は？」→FAQ誘導のみ確認 → 当サイト/chatbotで同質問→条文根拠付き回答を確認。
4. **化学RA競合セル埋め**: 職場のあんぜんサイト→「GHSモデルSDS検索」で総件数表示があればメモ（当サイト3,695件との比較用。機械では取得不能だった）。
5. **死傷DBの体験差**: あんぜんサイトの死傷病DB→Excelダウンロードが必要なことを確認 → 当サイト/accidentsで同じ調べ物がスマホ完結することを確認。
6. **商用KYのPDF出力有無**: HACARUS KY・KYアシストの資料請求ページでPDF出力の有無を確認（未確認セル5-3の解消）。

## 10. 再計測の運用（四半期・BACKLOG-opsに常設）

1. **自サイト側**（`cd web` で順に・約40分）:
   - `npm run plain:status`（現場ことば版カバレッジ→§1-2更新）
   - `npm run bench:field-terms`（俗称着地率→§2-1更新）
   - `npx vitest run src/lib/rag-metrics.test.ts src/lib/rag-100q.test.ts`（→§2-3更新）
   - 横断検索の応答ms（→§2-4更新）: `npm run build && npm start` を別窓で起動し `node scripts/search-latency-bench.mjs`（p50/p95を転記・生成JSONはコミットしない）
   - `CHATBOT_EVAL_BASE_URL=https://www.anzen-ai-portal.jp CHATBOT_EVAL_INTERVAL_MS=18000 npm run eval:chatbot-gen`（→§3-1更新）
   - `npm run test`（site-stats機械検証=各種件数→§4/5/6/7更新）
   - Lighthouseモバイル再実測（BACKLOG-ops既存タスクの `scripts/mobile-lighthouse.mjs`・静穏窓で→§S-3更新）
2. **競合側**（curl・約10分）: §1〜§8の各「再計測」行のcurlコマンドを実行し、変化があれば該当セルと判定を更新。特に (a) e-Gov「ユンボ」が0件のままか (b) CREATE-SIMPLEのver (c) あんぜんサイト死傷DBの最新年 (d) jaishのLast-Modified。
3. **GSC稼働後に追加**: S-1/S-2に実順位・indexed件数を記入（BACKLOG-seo LN-S3の計測スクリプト対象）。
4. 本ファイルの「初回計測」欄の日付・判定サマリ・各セルを更新し、判定が動いたセルを差分としてPRに明記。
5. **生成物はコミットしない**（.bench/*.json等は一次記録をdocs/へ写す場合のみ手動で要点を転記）。

## 11. 出典（競合実測の一次URL・2026-07-12取得）

- e-Gov条文SPA: https://laws.e-gov.go.jp/law/347AC0000000057 ／ keyword API: https://laws.e-gov.go.jp/api/2/keyword?keyword=ユンボ（0件=HTTP 404）
- jaish安衛法本文: https://www.jaish.gr.jp/anzen/hor/hombun/hor1-1/hor1-1-1-1-0.htm（Last-Modified 2025-05-20）
- 死亡災害DB: https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.html ／ 死傷DB: https://anzeninfo.mhlw.go.jp/anzen_pgm/SHISYO_FND.html
- CREATE-SIMPLE: https://anzeninfo.mhlw.go.jp/user/anzen/kag/ankgc07.htm（ver3.2.1 xlsmリンク）
- 労基署チャットボット: https://www.mhlw.go.jp/stf/roudoukijyunkantokusyo-chatbot.html
- HACARUS KY: https://hacarus.com/services/workplace-safety/ky/ ／ KY-Support: https://www.mebs.co.jp/press/260326.html
- 中労委DB: https://www.mhlw.go.jp/churoi/meirei_db/ ／ ケミカン: https://chemican.com/
- 建設業教育協会: https://k-k-k.jp/e-learning/ ／ こころの耳: https://kokoro.mhlw.go.jp/
