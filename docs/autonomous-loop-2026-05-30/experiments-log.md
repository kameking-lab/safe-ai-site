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
- **検証結果**: （実装後）
- 採否: （判断後）

