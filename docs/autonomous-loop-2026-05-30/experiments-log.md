# 攻めの実験ログ — 2026-05-30

各実験: 番号・テーマ・狙い・変更範囲・成功基準・検証結果・採否(理由)

---

## 事前調査メモ（重要）
- PR#311 で「命名統一(安全衛生日誌→安全工程打合せ書)・信頼性(footer登録番号260022)・SEO」は**実装済**。残存「安全衛生日誌」はmock/FAQ/internalのみ＝再対応不要。
- 既存ペルソナ入口は `/for/construction` のみ（約530行・法令引用/KYプリセット/統計の実データ充実＝品質基準）。
- ナビは2系統: ①PCサイドバー(app-shell.tsx, 6カテゴリ+α 約30項目) ②FlagshipNav(flagship-nav.tsx, 11項目横並び+ホバーPopover)。
- ベースラインテスト: 941 pass / 116 files（5/30 05:19実測）。

---

## 実験01: ペルソナ別入口の新設（トップ主役構成の再設計 #1）
- **狙い**: 初見の訪問者が「自分の立場」から1タップで実務エントリに入れる。現状は建設業のみ。一人親方/企業の安全衛生担当者/労働安全コンサルに専用ランディングを新設し、トップ最上部にペルソナ選択バンドを設置。
- **変更範囲**: 新規 `/for/solo` `/for/manager` `/for/consultant` の3ページ + 各page.test.tsx + 新コンポーネント `home-persona-entry.tsx` + `(main)/page.tsx`（建設業単独バナー→4ペルソナバンドへ）。
- **捏造防止方針**: 確立した法令事実（規模別義務・特別加入制度の存在等）と既存リポジトリの実データ(SITE_STATS等)のみ使用。具体施行日など不確実な点は断定せず法令チャット/法改正カレンダーへ誘導。新規統計値は作らない。
- **成功基準**: (1)3ページがconstruction同等の充実度(routing先が全て実在・thin templateでない) (2)トップ初見でペルソナ導線が明快 (3)既存941テスト維持+新規テストpass (4)lint/tsc/build 0エラー (5)既存導線(construction含む)非破壊。
- 検証結果:
  - lint **0 errors**（15 warningは全て既存・本変更由来0）/ tsc **0 errors**
  - test **955 pass / 119 files**（baseline 941 + 新規14、全pass）
  - build **成功**（3新規ルートを生成）
  - ローカル本番サーバ(`next start`)で実機確認: `/` `/for/solo` `/for/manager` `/for/consultant` `/for/construction` 全て **HTTP 200**。トップにペルソナバンド4枚＋各ページの見出し・規模別義務表(常時50人以上×10箇所)・主要内部リンク・登録番号260022 を実HTML上で確認。
  - Vercel preview: deploy **SUCCESS**（プレビューは保護で401・curl不可のためローカル本番で代替検証）
  - CI e2e/smoke: **両方 SUCCESS**（既存導線の回帰なしを確認）/ Vercel deploy SUCCESS
- 採否: **採用（squash merge PR #312 → main `c3e7cbe0`）**。理由: 初見の自己同定導線を1→4に拡張する mission #1 の高インパクト改善。3ページはthin templateでなく実データ・実ツールへ誘導、捏造なし、既存非破壊(e2e/smoke green)、/for/construction無改変。「やった気」でなく実務レベルへ前進。

---

## 実験02: 事故系4ルートの section サブナビ統合（事故ハブ化 / 初見の「どのツール?」解消）
- **狙い**: `/accidents`(DB検索) `/accidents-reports`(業種別分析) `/accidents-analytics`(統計) `/accident-news`(重大災害事例) の4ルートが初見で役割不明・相互移動しにくい問題を、既存 `LawHubNav` と同じ section サブナビパターンで解消。
- **判断**: PCナビ2系統統合は「導線ギャップ(例: /accidents-analytics は サイドバー未収録)を埋める追加作業＋高回帰リスク＋価値が主観的」のため後回し。代わりに低リスク高明快度の事故ハブ化を選択。新ルートは作らず(=5つ目の混乱を増やさない)、4ページ最上部に役割明示サブナビを置く。
- **変更範囲**: 新規 `AccidentHubNav`(+test) / 4ページに挿入 / accident-news の重複手動リンク3本→1本(別系統の whats-new のみ残置)に整理。
- **成功基準**: (1)4ページで現在地強調＋他3ツールの役割が1行で分かる (2)既存テスト維持+新規pass (3)lint/tsc/build 0 (4)既存非破壊。
- **検証結果**: lint 0 / tsc 0 / test **958 pass / 120 files**(+3) / build 成功。ローカル本番で4ページ全て HTTP 200・「事故情報ナビ」＋兄弟3リンク描画を確認。
- 採否: **採用（squash merge PR #313 → main `e549827b`）**。CI e2e/smoke 両 SUCCESS・Vercel SUCCESS。新ルート増設なしで4ルートの相互理解を底上げ、重複リンク削減も実施。実務レベルの初見オリエンテーションを改善。

---

## 中間: 網羅巡回（subagent静的解析）と検証
- Explore subagent で D(死活)/E(meta)/G(a11y)/H(数値整合) を静的走査 → 21件報告。**ただし要検証**:
  - 「broken /api-docs」→ (main)/api-docs は実在＝**誤検知**。
  - 「16ページ metadata 欠落」→ 大半が誤検知/対象外:
    - /ky /feedback /pdf /about/cases は **redirectのみ**(描画なし=metadata不要)。
    - /glossary /faq/search /faq/[category] /diversity/women /subsidies/calculator は **layout.tsx で metadata 提供済**(agentはpage.tsxのみ確認)。
    - **真の欠落は /faq のみ**(TITLE/DESC定数はあるが metadata export 無し)＝SEO/タブ名取りこぼし。
  - 「print-button アイコンのみ a11y」→ ボタンに可視テキスト「印刷 / PDF保存」あり＝**誤検知**(アクセシブル名あり)。
  - 「約3,700物質ハードコード3箇所」→ SITE_STATSは3,984(取込件数)で意味が異なり、3,700同士は相互に整合。誤って3,984へ統一すると逆に不正確化リスク→**保留**。
- 教訓: subagent所見は鵜呑みにせず全件検証。実害は /faq metadata 1件に収束。

## 実験03: 事故導線の命名整合（flagship）＋ /faq メタデータ補完
- **狙い**: (A) トップ主要機能グリッド/上部ナビが /accidents を「重大事故ニュース」と表示 → 実体は「事故データベース」で、クリック先と表示名が矛盾（初見の誤誘導）。さらに subItems に重大災害事例(/accident-news)が欠落。(B) /faq の metadata export 欠落を補完。
- **変更範囲**: flagship-nav.ts の accidents feature を「事故事例・分析」へ正名化＋4事故ツール全てを subItems に整理(+/accident-news追加) / flagship-grid.tsx の EN コピー整合 / faq/page.tsx に metadata export 追加(既存定数流用) / flagship-nav.test.ts 新規(命名・到達性ガード)。
- **成功基準**: ナビ表示名とクリック先の不一致解消、4事故ツールへ到達可、/faq に title/desc/canonical 出力、既存テスト維持+新規pass、lint/tsc/build 0。
- **検証結果**: lint 0 / tsc 0 / test **961 pass / 121 files**(+3) / build 成功。既存 feature-naming.test 維持。
- 採否: **採用（squash merge PR #314 → main `ff9dee79`）**。CI e2e/smoke 両 pass・Vercel pass。命名とクリック先の矛盾を解消し、欠落していた重大災害事例導線を追加、/faqのSEO取りこぼしも補完。

---

## 実験04: ペルソナ入口をグローバルサイドバーに常設（exp-01のIA完成）
- **狙い**: exp-01のペルソナ入口はトップのバンドのみ＝深いページからサイドバーで巡回するPC利用者には不可視。全ページのサイドバーに「立場から探す」第一級ナビ群(4立場)を常設し、どこからでも自己同定できるようにする。
- **変更範囲**: app-shell.tsx の NAV_CATEGORIES に「立場から探す」カテゴリ追加(建設業/一人親方/企業担当者/専門家)。既存「業種から」内の重複 for-construction を削除(命名は「建設業向け実務」→「建設業の現場」に統一)。UserRoundアイコン追加。
- **成功基準**: PC/モバイル両サイドバーから4ペルソナへ到達、重複排除、lint/tsc/build 0、既存テスト維持、非破壊。
- **検証結果**: lint 0 / tsc 0 / test 961 pass / build 成功 / ローカル本番で群描画確認。
- 採否: **採用（squash merge PR #315 → main `d35b6b81`）**。CI e2e/smoke 両 pass。ペルソナIAを全ページに展開し重複も解消。

---

## 中間: ナビ統合(2系統→1系統)の実現性分析 → 全面統合は却下、代わりにギャップ補完
- FlagshipNav の subItem href(48) と サイドバー href(39) を diff。
- **重大発見**: 2つのフラグシップ機能 `/education-certification`(特別教育・技能講習) と `/work-environment-measurement`(作業環境測定) が**サイドバーに皆無**（FlagshipNavのみに存在）。
- → デスクトップの FlagshipNav バー撤去は2機能を孤立させるため**却下**（mission の「迷ったら捨てる」を適用、撤去はやらない）。
- → 代わりに「2系統の被覆を一致させる」= サイドバーの抜けを埋める方が低リスク高価値と判断 → 実験05。

## 実験05: サイドバーのフラグシップ被覆の欠落補完（ナビ整合の本丸）
- **狙い**: 「サイト全体ナビゲーション」を謳うサイドバーから2つのフラグシップ機能が辿れない欠落を解消し、2ナビ系統の被覆を一致させる。
- **変更範囲**: app-shell.tsx に追加 — 特別教育・技能講習(/education-certification)→「学ぶ」、作業環境測定(/work-environment-measurement)→「現場で使う」、事故統計ダッシュボード(/accidents-analytics)→「分析する」。
- **成功基準**: 3機能がサイドバーから到達可、全flagship機能がサイドバー被覆、lint/tsc/build 0、既存テスト維持、非破壊。
- **検証結果**: lint 0 / tsc 0 / test 961 pass / build 成功 / ローカル本番で3項目描画確認。flagshipトップレベル機能の全サイドバー被覆を diff で確認。
- 採否: **採用（squash merge PR #316 → main `b5cd35da`）**。CI e2e/smoke 両 pass。撤去でなく被覆一致でナビ整合を底上げ（実害ある欠落の解消）。

---

## 実験06: IA不変条件の回帰テスト追加（exp-04/05のロック）
- **狙い**: 「全flagship機能はサイドバーから到達可」「トップにペルソナバンド4立場」という今回確立した不変条件を、将来のリグレッションから守る回帰テストを追加。
- **変更範囲**: app-shell.tsx の NAV_CATEGORIES を export / 新規 app-shell-nav.test.ts(flagship⊆sidebar 被覆 + 立場から探す4立場) / home-persona-entry.test.tsx(4ペルソナ・href・見出し)。
- **成功基準**: 不変条件をテスト化し全pass、lint/tsc/build 0、既存維持。万一 app-shell の import が jsdom で不安定なら config 抽出 or 当該テスト取り下げ。
- **検証結果**: lint 0 / tsc 0 / test **966 pass / 123 files**(+5) / build 成功。app-shell の vitest import クリーン。
- 採否: （CI green確認後に判断）

---

## 中間: 区画B(9機能の初見UX)深掘り → 既に実務レベル、product変更は見送り
- Explore subagent で6つの主要インタラクティブツールの初見/空状態を精査依頼 → 「年次計画/リスク予測が弱い」と報告。**全件検証**:
  - リスク予測: agentは「ワークサンプル無し」と推測 → **実際は QUICK_EXAMPLES のワンクリック例ボタン(line650)が存在＝誤検知**。初見良好。
  - 管理区分判定: 「A値/B値/管理濃度の専門用語が難」→ 当ツールの対象は作業環境測定士=専門家であり用語は適切。一人親方は作業環境測定を行わない。**実務上のギャップでない**。
  - 年次計画: 導入文＋<details>詳細あり。プレビュー追加は限界的＝「やった気」リスク。
  - 資格判定finder: クイック選択＋段階フォーム＝最良。
- 結論: コア9機能の初見UXは概ね実務レベル。subagent所見は読み込み不足による過剰検出。**ここでのproduct変更は見送り(やった気回避)**。コードベースは成熟。


---
# 第2ラウンド（機能別 実務深掘りシナリオ巡回）— 2026-05-30 09:21 JST 開始

## R2 シナリオ巡回サマリ（Playwrightで本番同等のローカル本番ビルドを実機操作）
全9機能をモバイル(iPhone13)で実機操作し初見〜操作を確認。結果:
- **KY(/ky/paper)**: 現場語ラベル＋各欄に音声入力、KYT 4ラウンド(1R危険→3R対策)、「AIに危険箇所を提案させる」、自動保存、sticky操作バー。空欄でAI押下時は「先に本日の作業内容を入力してください」と明示。**実務レベル**。
- **打合せ書(/safety-diary)**: 重層下請(＋元請/1次/2次/3次/下位)、行ごとにリスク(重大性×可能性→優先度)、AI提案/AIで該当項目を推論、公式版に戻す。モバイルで縦積み入力可。**実務レベル**。
- **化学物質RA(/chemical-ra)**: 3ステップ(物質を選ぶ→換気・取扱量を質的ドロップダウンで選ぶ→A4結果)。数値不要で非専門家到達可、混合物・A4印刷対応、Gemini AIバッジ、SDS取込。**実務レベル**(mission最重要懸念クリア)。
- **事故DB(/accidents)**: AccidentHubNav(R1)、業種×作業内容×期間検索、AI事故注意喚起、データ内訳・出典明示。
- **チャットボット(/chatbot)**: APIキー無/応答不可でもハード失敗せず「AIによる回答生成は現在ご利用いただけません」＋関連条文(安衛則563条等)・一般原則を提示する寄り添いフォールバック。**実務レベル**。
- **サイネージ(/ky/morning)**: 大きな空状態「KYデータが見つかりません」＋6桁コード入力＋作成導線。朝礼大画面向けに可読。
- **法改正(/laws)/新着(/whats-new)/重大災害(/accident-news)**: LawHubNav/新着ハブ/AccidentHubNav。各ハブ良好。
結論: コア9機能は概ね実務レベル。横断レビュー(R1)で触れなかった内部フローも実機で詰まりは少。**ただし精査で1件の自己作り込み不正確を発見**(下記r2-01)。

## 実験r2-01: 事故件数表記の正確化（R1で自分が入れた過大表現の是正）
- **発見**: `/accidents` の実体は詳細事例 **292件**(getAccidentCasesDataset, 画面表示「収録292件」)。一方 **5,026件** は統計ダッシュボード(/accidents-analytics)の統計データセット。R1で入れた AccidentHubNav/flagship の「/accidents=約5,000件を全件検索」は両者を混同し過大表現＝出典厳守サイトの信頼に関わる。
- **狙い**: 「約5,000件」は統計ダッシュボードに正しく帰属し、/accidents は「出典付き事例検索」と正確に表現。
- **変更範囲**: accident-hub-nav.tsx(accidents/analytics desc) / flagship-nav.ts(accidentsカード+subItem) の文言修正＋テストガード2件。
- **バンドル**: /for/construction の「3,515 物質を検索」(stale) を canonical 定数 MHLW_MERGED_CHEMICAL_COUNT(=3,695) 参照に変更し将来ドリフトを排除（化学物質件数の表記ゆれ是正）。
- **成功基準**: /accidentsを過大表現しない・5,000は統計に帰属・lint/tsc/build 0・既存966維持・非破壊。
- 検証結果: lint 0 / tsc 0 / test 968 pass / build OK / ローカル本番で /accidents 文言・/for/construction「3,695物質」描画を実機確認。
- 採否: **採用（squash merge PR #319 → main `29fcf639`）**。CI e2e/smoke 両 pass。出典厳守サイトの信頼に関わる自己作り込みの過大表現を是正。

## R2 追加検証（実機・エッジ/エラー/印刷/多言語）と判断
- **エラー/フォールバックUX**: chatbot(APIキー無→関連条文＋一般原則の寄り添い応答)、KY AI提案(キー無→定型提案＋「AI未設定」明示)、KY空欄AI(「先に作業内容を入力」)、KY別端末共有(クラウド未設定→「同じ端末ならサイネージへ」と代替提示) — **全て graceful**。実務レベル。
- **印刷**: /ky/paper・/accident-news/print は print メディアでナビchrome無し＝クリーンなA4配布物。
- **多言語サイネージ(/ky/morning)**: 日/英/越/中/Tagalog/尼の6言語で見出し・chromeが翻訳切替。可。Tagalogは一部見出しが英語フォールバック(軽微・翻訳作文は捏造リスクのため不介入)。
- **件数の33 vs 50法令**: about「RAG 33法令」(=評価トピック数) と chatbot「50法令以上」(=コーパス)が不一致。どちらが正かは内部仕様依存で確証できず、誤った数値置換は捏造リスク → **オーナー判断事項として申し送り(不介入)**。
- 結論: 9機能を実機シナリオで通し詰まりを探索したが、コア機能は graceful degradation 含め成熟。**安易な「やった気」マージは行わず**、確証ある是正(r2-01)のみ採用。

---
## 割り込みタスク(R2): 利用統計ダッシュボードのサンプル表記・テストデータ除去
- **発見の切り分け**: grep "サンプル" 全候補のうち、捏造に該当するのは **/stats（利用統計ダッシュボード）のみ**。
  - 他の「サンプル」は正当（PPTXサンプル教材DL・チャットのサンプル質問・ストレスチェックのサンプル様式・監査docのサンプル監査）＝対象外。
  - /accidents-analytics の数値(504,415/739件等)は厚労省実データ。1件の「サンプル数が限定的」は曜日curatedの正当な注記＝対象外。
- **/stats の実態**: GA4/GSC 未接続時(=現在の本番)に `buildMockStatsResponse` のモック数値を「サンプル」ラベル付きで表示。さらに **GA4接続時でも** features/flow/conversions/chatbot/insights/前期間比(deltas)は GA4 から取得できずモック値（ga4-client が fallback で埋める）。
- **対応(捏造を残さない原則を最優先)**:
  - 未接続時(`!anyLive`): モック数値を一切表示せず、**正直な空状態「利用統計は準備中です」**＋運営者向け接続手順＋データ出典への誘導のみ。
  - GA4 live時: **実測される指標のみ**表示（サマリのDAU/MAU/PV/平均セッション/直帰率・ページ別・流入元）。モック混入する features/flow/conversions/chatbot/insights/deltas は**非表示**にし、「GA4カスタムイベント連携後に対応予定」と正直に明示。
  - GSC live時のみ SEO セクション、page-analytics live時のみ該当セクション表示。
  - 「サンプル」ラベル・「※サンプル」バッジ・モック表示用デッドコード(SectionFeatures/Flow/Conversions/Chatbot/Insights/deltaPill/UsageBar)を**削除**。残る「サンプル」文字列は「サンプルは表示しない」旨の正直な説明のみ。
  - page.tsx タイトル「（サンプル表示）」除去。
- **env方針**: GA4/GSC 実接続は環境変数(GA4_PROPERTY_ID・認証情報)が必要＝**オーナー判断事項**。本タスクでは接続せず、空状態＋運営者向け手順で対応（env新規追加せず）。
- **stats-mock.ts / API は温存**（データ削除はせず、表示でモックを使わないだけ）。
- 検証: lint 0(警告0) / tsc 0 / test 968 pass / build OK / ローカル本番で /stats 空状態・モック非表示を実機確認。
- 採否: **採用（squash merge PR #321 → main `f72b2eb8`）**。CI e2e/smoke 両 pass。約227行のデッドモックコードも削除。CI不具合は検知されず別PR不要。

---
## エスカレ回答処理 — 項目1: 法令数の統一（33 vs 50 → 実測 55）
- **数えた根拠（実データ）**: 
  - `allLawArticles`（RAGコーパス全条文）の distinct `law` = **65**（実行時Set）。ただし内11件は `mhlw-extras`（`@/data/laws-mhlw/compact.json`＝厚労省PDF抽出の補完ソース）由来で、`law`値が「化学物質管理関連通達」「労働安全衛生法令関係」等の**文書バンドル名**＝個別法令として数えると水増し。
  - **curated 中核（専用法令データファイル）の distinct `law` = 55**（mhlw-extras除外）。内訳: 法令・規則(命令) 47 ＋ 指針/ガイドライン/通達 8。
- **確定値: 55**（curated 中核の法令・規則・指針等）。「33」は評価トピック/狭義curated核、「50以上」は概算で、いずれも不正確 → **実測55で統一**。
- **実装**: `src/data/laws/index.ts` に computed定数 `LAW_SOURCE_COUNT`（mhlw-extras除外でドリフト無し）。表記は狭義法令でない8件を含むため「**法令・規則・指針等**」と総称。
- **統一箇所(9ファイル)**: about(RAGピル) / chatbot(title/desc/JSON-LD/body×4) / law-search / for-consultant / app-shell(nav説明) / CopilotNextSteps / cross-tool-links / chatbot API注記。全て定数参照に。
- 検証: lint0/tsc0/build OK・ローカル本番で全ページ「55法令等」描画を実機確認。捏造ゼロ（実データのSet計数）。

---
## エスカレ回答処理 — 項目2: 化学物質件数の定義整理・統一
- **各数字の出自（実コード追跡）**:
  - **3,695** = `MHLW_MERGED_CHEMICAL_COUNT`（`getAllMergedChemicals().length`）= MHLW告示・NITE GHS・PRTR・化審/毒劇/化兵器/廃掃の各ソースを **CAS で統合後の規制対象物質数**。化学物質DB/RAの実検索対象＝**ユーザー向け正準値**。約7ファイルで既に定数参照。
  - **約3,700** = 上記3,695の概数（丸め）。**別物ではなく同一指標**。4ファイルでハードコードされていた。
  - **3,984** = `SITE_STATS.chemicalsMhlwCount`（厚労省「職場のあんぜんサイト」化学物質情報の取込件数）。**UIに非表示**（grep 0件）＝ユーザー混同なし。別メトリクスとして温存・本ログに定義記録。
  - 注: 報告で「292」を化学に併記したのは私の誤記。292は /accidents の詳細事例数(#319で対応済)であり化学物質とは無関係。
- **対応**: ハードコード「約3,700物質」4箇所（chemical-ra/page・product-search・for/manager・app-shell）を `MHLW_MERGED_CHEMICAL_COUNT` 参照に統一（ドリフト無し）。
  - メタ記述の内訳「MHLW告示251 + NITE GHS 2,729 + PRTR 398 + 化審/毒劇/CWC/廃掃 255」は合計3,633で総数3,695と不一致＝stale/未検証のため、**個別件数を削除しソース名のみ**（MHLW告示・NITE GHS・PRTR・化審/毒劇/化兵器/廃掃をCAS統合）に変更。捏造ゼロ。
- 検証: lint0/tsc0/test974/build OK・ローカル本番で全箇所「3,695物質」描画を実機確認。

---
## エスカレ回答処理 — 項目3: サイネージ6桁共有 / Supabase権限障害
- **状態確認の結論**: 本番のSupabase権限障害は**既に解決済**（2026-05-26、fix.sql相当をManagement APIで適用）。本セッションで本番 read-only 再確認: `/api/ky/signage?code=000000`→404 not_found・`/api/ky/records`→200 ok。権限エラー(502/42501)は再発なし＝6桁共有・KY同期は稼働中。過去メモ(MEMORY.md索引)が stale だったため修正。
- **私ができる範囲の改善（コード resilience・defense-in-depth）**:
  - `cloudCreateSignageSessionDetailed`（storage-adapter）新設。共有失敗理由を `cloud_not_configured/server_error/busy/network` に分類（fetchWithTimeout 12s）。
  - 「別端末で共有」を理由別の正直な案内に変更。従来は全失敗を「通信状況をご確認ください」と誤誘導していたが、**サーバー/権限障害(server_error)時は誤誘導せず、確実に動く同一端末フォールバック（「サイネージへ」=localStorage表示）へ誘導**。
  - 回帰テスト6件（理由マッピング）追加。
- **オーナー領域として明記（私は触れない）**: Supabase管理画面でのGRANT/SQL実行・env。再発時の fix.sql 再適用手順は docs/autonomous-loop-2026-05-30/signage-supabase-status-2026-05-30.md §末尾に整理。
- 検証: lint0/tsc0/test **980 pass**(+6)/build OK。

---
## エスカレ回答処理 — 項目4: 多言語の「整える」（力を入れず・捏造翻訳禁止）
- **実態調査**: 6言語トグルがある機能は /ky/morning のみ（signage-labels.ts: ja/en/vi/zh/tl/id）。accidents-labels・chemical-ra-labels も6言語で、いずれも**かな(未翻訳)混入0・空文字0・TODO0＝完成**。
  - Tagalog(tl)は本文ネイティブ品質（"Pangunahing Gawain Ngayon"/"Pagturo at Pagsigaw"等）。英語のままは `signageTitle` と `fullscreen` の2ラベルのみ。"壊れて見える"状態ではない（フィリピンは英語が公用語・現場の共通語としても妥当）。日本語のfallbackは残っていない。
  - → オーナーの枠組み（控えめ化 or「日本語が残る」注記）はTagalogには当てはまらない（ほぼ完成・日本語残存なし）。**捏造翻訳は禁止のため英語2ラベルは触れない**。
- **行った genuine 改善（再発防止・整え）**: signage-labels.test.ts に「**非日本語(en/vi/tl/id)のラベルに日本語かな(未翻訳fallback)が混入していないこと**」を検証する回帰ガードを追加。多言語が"壊れて見える"最大要因＝日本語の取りこぼしを将来にわたり防止（zhは漢字を正規使用のため対象外）。
- 既存の「全言語・全キー充足」テストと合わせ、i18nの完成度を二重にロック。捏造ゼロ。
- 検証: lint0/tsc0/test 981 pass(+1)/build OK。

---
# 第3ラウンド（モック全数排除 + 各機能を日本一基準で深掘り）

## 実験r3-01: inquiry メール送信元 example.com プレースホルダ是正（モック監査・既報#330）

## 実験r3-02: モバイル3重ナビの解消（FlagshipNavモバイルドロワー廃止）
- **発見(軸2: スマホ使いやすさ)**: モバイルに nav surface が3重 — ①bottom nav(5アイコン＋「もっと」シート5機能) ②ヘッダー「メニュー」ドロワー(全NAV_CATEGORIES) ③FlagshipNav「主要機能（10件）」ドロワー。R1監査(TIER2-#10)も「3層ナビ重複・どのメニュー?混乱」と指摘。③は①②と内容が重複し、全ページのモバイル先頭でチャム量＋迷子要因。
- **対応**: FlagshipNav をデスクトップ横並びバーのみに（FlagshipNavMobile 関数＋未使用import を削除）。モバイルは bottom nav＋もっと＋メニュー で全機能到達可（flagship⊆sidebar は exp-06 テストで担保済）。
- **検証**: lint0/tsc0/test981/build OK。ローカル本番モバイルで「主要機能（N件）」行が消え、KYコンテンツが約1行分上に繰り上がること、メニュー/bottom nav が健在で到達性が保たれることを実機確認。desktopバーは維持。
- **採否**: **採用（squash merge PR #331）**。CI e2e/smoke pass。到達性は bottom nav＋もっと＋メニューで担保。

## 実験r3-03: KY用紙に初見3ステップ案内を追加（日本一基準・初見で便利と体感）
- **発見(軸2)**: KY(/ky/paper)に初見向けガイドが皆無（grep: はじめて/使い方/ステップ/ガイド=0件）。初見の職長はフォーム＋8ボタンのツールバーに直面し「次に何をすべきか」「AIで危険を下書きできる」「そのまま朝礼サイネージに出せる(紙との決定的差)」が伝わらない。
- **対応**: フォーム上部に dismissable な3ステップ案内を追加（①現場・作業入力 ②🤖AIに危険箇所を提案で危険・対策を自動下書き ③保存→印刷 or サイネージへ で朝礼表示）。「紙と違いAIが下書き＋朝礼サイネージに出せる」と差別化を明示。localStorageで一度×すれば恒久非表示（リピーターの邪魔をしない）。
- **検証**: lint0(警告0)/tsc0/test981/build OK。ローカル本番モバイルで初見時に案内が描画されることを実機確認。
- **採否**: **採用（squash merge PR #332）**。CI pass。初見の職長にAI下書き＋朝礼サイネージの差別化を明示。

## 実験r3-04: 打合せ書に初見3ステップ案内を追加（KYと統一・複雑な重層下請ツールの初見救済）
- **発見(軸2)**: 打合せ書(/safety-diary, meeting-paper-view)も初見ガイド0件。KYより複雑（重層下請＋元請/1次/2次/3次/下位の階層追加・行ごとのリスク・AI推論）で、初見の元請担当が「何から手をつけるか」「AIで指示を下書きできる」「前日5分で1枚に＝紙との差」が分からない。（chemraはSTEP表示済で対象外）
- **対応**: KYと同じ dismissable パターンで3ステップ案内を追加（①作業日・現場 ②＋元請/＋1次で協力会社追加・各社の作業/予想災害/指示記入・AI提案で下書き ③保存→印刷で1枚に集約・共有）。localStorageで一度×すれば恒久非表示。
- **検証**: lint0/tsc0/test981/build OK。ローカル本番モバイルで初見描画を実機確認。
- **採否**: **採用（squash merge PR #333）**。CI pass。複雑な重層下請ツールの初見救済。

---
## R4 タスクA（出力品質）第1巡 — 2026-05-30 夜

@media print を Playwright(emulateMedia)で実レンダして全出力を監査。

| # | 出力 | 結果 | 是正 |
|---|------|------|------|
| R4-1 | 全印刷出力 | **崩れ2件** | サイトchrome(ログインボタン/表示モード行/ナビ)が全A4印刷に混入＋globalの header/footer 一括非表示で成果物の出典・免責まで巻添え消去 → app-shell chromeに print:hidden＋#main-content配下のheader/footer再表示。PR#335 merged |
| R4-2 | 化学物質RA A4記録 | **崩れ1件** | window.print()がページ全体印刷→検索フォーム/Geminiバッジ/SDS/混合物/保存一覧/関連カードが記録に混入 → 周辺セクションに print:hidden。記録ヘッダ＋結果＋確認欄＋免責のみ残す。PR#336 |
| - | accident-news/print | 是正後OK | タイトル/作成日/出典/免責 印刷復活を確認 |
| - | KY /ky/paper A4 | **検証済OK** | chrome無・はみ出し無・画面フォーム非表示・確認印枠ありの整ったA4様式 |
| - | 打合せ書 /safety-diary A4(横) | **検証済OK** | chrome無・はみ出し無・画面フォーム非表示 |
| - | features/print | **検証済OK** | chrome無・登録番号260022監修明記 |
| - | RSS /feed/{news,law-revisions,accident-reports,serious-cases}.xml | **検証済OK** | XML宣言/rss2.0/channel/item有・生アンパサンド無・本文転載過多無(最大273字要約)・content-type application/rss+xml |

第1巡 計: 実崩れ3件発見・全是正(うち2件はサイト全体に波及する高インパクト)、5系統 検証済OK。
**次ラウンド R4-3**: タスクB(労災裁判例コーナー)のレビュー＋レベルA実装に着手。出力品質の残り(年次計画preview/健診result/業種別レポートの実データ印刷、6桁/URL共有の相手画面再現)は時間が許せば R4-4 で。

---
## R4 続き（R4-2〜R4-5） — 2026-05-30深夜〜05-31未明

### R4-2: 化学物質RA A4記録の画面UI除去（PR#336 merged）
window.print()がページ全体を刷るため、A4実施記録に検索フォーム/Geminiバッジ/SDS/混合物/保存一覧/関連カードが混入。周辺セクションをprint:hiddenにし、記録ヘッダ＋結果＋確認欄＋免責のみ残す厚労省様式相当に是正。

### R4-3: 労災裁判例コーナー新設（PR#337 merged）
レビュー（docs/court-cases-audit-2026-05-30/README.md）→ /court-cases ＋ /court-cases/[id] を新設。実在確認済みの確定判例10件をキュレーション。捏造防止を最優先＝全件 裁判所裁判例検索・厚労省・法務省・判例集で裏取り。検証中に高知県観光事件（実は賃金判例）・イビデン事件（親会社責任否定のセクハラ）を誤りとして除外。データ整合テスト8件追加。

### R4-4: 残り成果物プリントの実レンダ検証（コード変更なし＝全てOK）
年次安全衛生計画書(/strategy/plan-generator/preview/*)・業種別事故分析レポート(/accidents-reports)・健診スケジュール判定(/health-checkup-scheduler/result) を@media printで実レンダ。いずれもchrome無・横はみ出し無・タイトル/年度/出典あり＝**検証済OK**（#335の全体修正が波及）。

### R4-5: 判例10→12件に拡充（PR#338）
航空自衛隊芦屋分遣隊事件(昭56.2.16・立証責任)・横浜南労基署長事件(平12.7.17・業務起因性)を追加（実在裏取り済）。争点カテゴリ「業務起因性」追加。test 989維持。

## R4 累計
- マージPR: #335(印刷chrome除去・全体), #336(化学RA画面UI除去), #337(裁判例コーナー10件)。CI中: #338(裁判例+2=12件)。
- タスクA: 実崩れ3件発見・全是正＋7系統 検証済OK。タスクB: 12件の実在確定判例コーナー新設。
- 全て捏造ゼロ・env無追加・実DB削除なし・会社名掲載なし。最終test 989 pass。
- 次（R4-6 候補）: 裁判例コーナーのまとめ印刷ビュー or さらなる判例の実在裏取り追加。出力品質の共有(6桁/URL)相手画面再現の確認。
