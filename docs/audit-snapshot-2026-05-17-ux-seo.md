# 監査スナップショット: 第三者目線 UX+SEO 激辛監査レポート 2026-05-17

- 監査ページ: `/audits/2026-05-17-ux-seo`
- ソース: `web/src/app/(main)/audits/2026-05-17-ux-seo/page.tsx`
- PR: #235 (`80121d8`)
- ベースHEAD: `41b77a7`
- 監査日: 2026-05-17
- スコープ: UX 8軸 (UX-A〜UX-H) + SEO 8軸 (SEO-A〜SEO-H)、PR #187 49件と非重複

**集計: P1=12件 / P2=30件 / P3=12件 / 合計54件 / 推定合計工数=152h**

---

## 激辛総評

1. 「メイン3機能 (chatbot / accidents-reports / strategy/plan-generator)」というオーナー戦略がコード実装に降りていない。トップCTA・モバイルボトムナビ・FlagshipNav・Footer のいずれもメイン3機能を最上位に置いておらず、戦略⇄実装の乖離が最大の歪み (UX-001/002/005, SEO-012)。
2. 「7目玉」と書くのに実装は10機能。FlagshipGrid h2「7つの主要機能」 vs FLAGSHIP_FEATURES.length === 10。第三者には誤情報として映る (UX-004, UX-009)。
3. 多言語化 (English Beta) は client-side i18n のみで Googlebot から英語版が見えず、SEO的に実質ゼロ。同時に sitemap で ja/en/x-default 全URL同一指定により Search Console 不適切判定のリスク。中途半端な多言語化は撤去 or /en プレフィックス本格化の二択 (SEO-004/005/015/023)。
4. Footer に未完成機能 (/api-docs / /qa-knowledge) リンク残存。PR #187 F-002/F-007 で本体は noindex/縮小済だが、リンクからの導線で利用者を未完成ページに送り続けている (UX-028/029, SEO-021)。
5. UX 認知負荷の累積。サイドバー9カテゴリ + FlagshipNav 10項目 + Footer 30+リンクの3層ナビ。NEW/AI/βバッジが8箇所超で「常時NEW」状態。コンサル目線では「機能を盛り過ぎてどれが目玉か分からない」 (UX-003/026)。
6. ラベル不一致が表面化。試験問題機能はナビ「演習問題」/ ページh1「学習用クイズ」/ メタtitle「安全衛生 資格試験 学習用クイズ」の3種類。PR #234 で nav は統一されたがページ本体は未追従 (UX-025)。
7. 検索可視性は限定的。「安衛法 AI チャットボット」「労働災害 業種別 分析 レポート」「年次安全衛生計画 業種 ジェネレーター」「化学物質 リスクアセスメント CREATE-SIMPLE」のいずれの主要クエリでも安全AIポータルは top10 圏外 (SEO-001/002/010/011)。

---

## UX カテゴリ

### UX-A: 主要動線の直感性

=== UX-001 [P1/UX-A] メイン3機能がトップ CTA・ヒーロー外、戦略との乖離 ===
該当URL: /
推定工数: 4時間
根拠: web/src/components/new-home-hero.tsx のCTAは /chatbot と /ky の2件のみ。/accidents-reports と /strategy/plan-generator はヒーロー直下動線に出てこず、HomeThreePillars 内の事故DBカードも /accidents (10年統合DB) に遷移、業種別レポート /accidents-reports へは到達しない。docs/homepage の『メイン3項目化』方針 (commit d81ac80) と実装の乖離。
解決方針: (a) ヒーローCTAを3項目に拡張 (安衛法AIチャット / 業種別 事故分析レポート / 年次安全衛生計画)。(b) HomeThreePillars 事故カードの遷移先を /accidents-reports にして実利用主導の動線にする。(c) 既存の /accidents へは『10年事故DB一覧へ』というセカンダリリンクに格下げ。

=== UX-002 [P1/UX-A] モバイルボトムナビ5項目がメイン3機能と非整合 (/accidents-reports と /strategy/plan-generator が無い) ===
該当URL: / (mobile <480px)
推定工数: 2時間
根拠: web/src/components/MobileBottomNav.tsx の ITEMS は home/ky/law-search/chatbot/account。メイン3機能のうち 2/3 (accidents-reports, strategy/plan-generator) が固定ナビから抜けている。モバイルユーザーは縦スクロール後にこれら主要機能へ辿り着く動線がない。
解決方針: ITEMS を [home, chatbot, accidents-reports, strategy/plan-generator, account] の5項目構成にリプレイス。検索とKYは2タップ以内 (ホーム+1) で到達できるよう、ホーム最上部に専用ショートカットを配置。

=== UX-003 [P2/UX-A] ナビゲーション3層構造の過剰 (FlagshipNav 10項目 + サイドバー 9カテゴリ 30+項目 + Footer 4カテゴリ 30+項目) ===
該当URL: 全ページ
推定工数: 12時間
根拠: (1) web/src/components/flagship-nav.tsx の FLAGSHIP_FEATURES は 10件 (10機能×サブ機能 56リンク以上)。(2) web/src/components/app-shell.tsx の NAV_CATEGORIES は 9カテゴリで item 数は約30。(3) web/src/components/footer.tsx は 4カテゴリで リンク数 30+。同じページに『主要機能』『関連データ』『プロジェクト』『規約』の重複ラベルが存在。Hick's Law 観点で選択肢が多すぎ、利用者は機能発見できず scrolling/scanning コストが累積する。
解決方針: (a) FlagshipNav を 7→3 に絞り、メイン3機能 (chatbot/accidents-reports/plan-generator) を最上位に置く。(b) サイドバーは『現場ツール / 学習 / 法令 / データ / プロジェクト』の5カテゴリに統合。(c) footer は『主要機能 3 / 関連データ / 規約』の3カラムに整理。重複リンクを排除。

=== UX-004 [P2/UX-A] 『7目玉』ラベルと FLAGSHIP_FEATURES 配列長 10 の数値ミスマッチ ===
該当URL: /, /features
推定工数: 1時間
根拠: web/src/config/flagship-nav.ts コメント `/** 7目玉の主要機能ナビゲーション定義 */`、web/src/components/flagship-grid.tsx の h2 表示 `『7つの主要機能』`、web/src/components/flagship-nav.tsx の aria-label `7目玉ナビゲーション` のいずれも『7』を主張。一方 FLAGSHIP_FEATURES 配列は safety-diary, ky, chemical-ra, signage, laws, chatbot, accidents, education-certification, industries, work-environment の10件。コードと表示の不一致は第三者には誤情報。
解決方針: FLAGSHIP_FEATURES を厳密に7件に絞る (education-certification, industries, work-environment を別カテゴリへ移動)、または表示文言を『10の主要機能』『主要機能セット』に統一。中途半端な『7』ラベルは即時撤去。

=== UX-005 [P1/UX-A] Footer『主要機能』7項目がオーナー戦略メイン3機能と非整合 ===
該当URL: 全ページフッター
推定工数: 2時間
根拠: web/src/components/footer.tsx:34-70 の『主要機能』カラムは 7項目固定で、メイン3機能のうち /accidents-reports が含まれず /accidents (10年DB) になっている。/strategy/plan-generator は『プロジェクト』カラムにも『関連データ』カラムにも無い。サイト全体動線で『主要』の定義が分裂。
解決方針: 『主要機能』カラムを上位3項目 (chatbot / accidents-reports / strategy/plan-generator) に整理し、残り4項目は『ツール』『データ』別カラムに移動。フッターの順序を docs/homepage の戦略3項目化と一致させる。

---

### UX-B: 検索・発見性

=== UX-006 [P2/UX-B] Ctrl+K 検索インデックスが5カテゴリのみ (notice/chemical/quiz/education/accident) で laws/industries/diversity/faq/glossary 未網羅 ===
該当URL: 全ページ (CommandPalette)
推定工数: 8時間
根拠: web/src/components/CommandPalette.tsx:24 の `CATEGORIES = ['notice','chemical','quiz','education','accident']` のみ。利用者が『腰痛 予防』『カスハラ』『熱中症 R7』『石綿 事前調査』『業種 建設』『FAQ 安全管理者』等を引いてもヒットしない。
解決方針: buildSearchIndex のソースを laws / industries / diversity / heat-illness-prevention / asbestos-management / faq / glossary / ky-examples / education-certification まで拡張。カテゴリ別フィルタも増やす。

=== UX-007 [P2/UX-B] モバイル『検索』ボタンとデスクトップ『Ctrl+K』が異なる機能 (前者は /law-search 遷移、後者は CommandPalette) ===
該当URL: 全ページ
推定工数: 2時間
根拠: web/src/components/MobileBottomNav.tsx の `search` item は href=/law-search で直接遷移。web/src/components/app-shell.tsx の PC `検索 Ctrl+K` ボタンは openCommandPalette を呼び出す。同じ『検索』ラベルだがモバイルは1機能遷移、PCはサイト横断検索。学習コストと混乱を生む。
解決方針: MobileBottomNav の『検索』も CommandPalette を開くボタンに変更 (openCommandPalette via useCommandPalette hook)。/law-search は副次動線として CommandPalette 内『法令検索』ショートカット行に出す。

=== UX-008 [P2/UX-B] ホーム本日のトピックカードに『業種別 事故分析レポート』『年次安全衛生計画』への動線がない ===
該当URL: /
推定工数: 3時間
根拠: web/src/components/home-three-pillars.tsx の3カードはそれぞれ /accidents, /risk, /laws へのCTA。メイン3機能のうち /accidents-reports と /strategy/plan-generator がトップの主要見出しから到達できない。
解決方針: (a) 事故カード『事故DBを見る →』を『業種別レポートを開く →』に変え /accidents-reports に。(b) 法改正カードに『年次計画を作る』のセカンダリCTAを追加し /strategy/plan-generator に誘導。

---

### UX-C: ファーストビュー価値伝達

=== UX-009 [P2/UX-C] ヒーロー直下『FEATURES 7つの主要機能』見出しが実装10機能と矛盾、第三者の信頼性低下 ===
該当URL: /
推定工数: 1時間
根拠: web/src/components/flagship-grid.tsx の h2: `『7つの主要機能』`。直下のグリッドには10枚カードが並ぶ。コンサル/労務担当者からは『数を盛っているのか、減らしたのか分からない』と映る。
解決方針: 見出しを『主要10機能』『現場をワンストップで支える機能群』等に修正、または10→7の絞り込みを実施。

=== UX-010 [P2/UX-C] 英語版ヒーローのブランド表記が『ANZEN AI Portal』のまま残存 (リブランド未完) ===
該当URL: / (lang=en)
推定工数: 1時間
根拠: web/src/components/new-home-hero.tsx:57 `{isEn ? 'ANZEN AI Portal' : '安全AIポータル'}`。直近 c6a22bc コミット (fix(branding): remove ANZEN AI from remaining alt attributes) で alt 属性のみ修正しているが、ヒーロー英語表記は ANZEN AI Portal のまま。
解決方針: 英語表記を 'ANZEN AI Portal' から 'Anzen AI Portal (Japan OSH research)' などに刷新するか、ja の『安全AIポータル』をそのまま英語版でも使い (固有名詞扱い)、サブタイトルだけ英訳。

=== UX-011 [P3/UX-C] メインCTA『安衛法AIに質問する』が初見ユーザーには略語 ===
該当URL: /
推定工数: 1時間
根拠: ヒーロー CTA1 は『安衛法AIに質問する』。安衛法 = 労働安全衛生法は専門用語。コンサル/労務担当者には自明だが、現場作業員や中小規模事業主には理解コストが発生する。
解決方針: CTAを『労働安全衛生法をAIに質問』『現場の安全ルールをAIに質問』等の平易表現に統一。略語使用は2スクロール目以降の専門セクションに限定。

=== UX-012 [P3/UX-C] ヒーロー直下 HomeThreePillars 3カードの AlertGenerator 配置がCTA過多 (1ページに5+ CTA) ===
該当URL: /
推定工数: 2時間
根拠: web/src/components/home-three-pillars.tsx は3カードそれぞれに『注意喚起文を作成』(AlertGenerator) + 詳細リンクの計6 CTA。ヒーロー2 CTA と合わせて First View 直下に8 CTA。Hick's Law 違反、初見ユーザーは『どこを押せばいい?』で停止する。
解決方針: AlertGenerator は3カード共通の1つにまとめる。または初期表示時はCTA非表示、ホバー/タップで露出。

---

### UX-D: コンテンツ消費性

=== UX-013 [P2/UX-D] /strategy/plan-generator のパンくず重複 (『戦略・計画』と『年次安全衛生計画ジェネレーター』が同じURLを指す) ===
該当URL: /strategy/plan-generator
推定工数: 1時間
根拠: web/src/app/(main)/strategy/plan-generator/page.tsx:38-42 の breadcrumbs: `[{name:'ホーム', url:'/'},{name:'戦略・計画', url:'/strategy/plan-generator'},{name:'年次安全衛生計画ジェネレーター', url:'/strategy/plan-generator'}]`。中間と末端のURLが同じ。JSON-LD でも重複が出力され、Google が『同一URLを階層的に持つ』壊れた BreadcrumbList と判定する。
解決方針: (a) /strategy をハブページとして実装し、中間パンくず URL を /strategy に。(b) または2階層目を削除して [ホーム, 年次安全衛生計画ジェネレーター] の2階層に。

=== UX-014 [P3/UX-D] /strategy ルートが孤立 (`/strategy` 直URLでアクセスしてもハブが無く、子ページ /strategy/plan-generator のみ) ===
該当URL: /strategy, /strategy/plan-generator
推定工数: 3時間
根拠: web/src/app/(main)/strategy/ に page.tsx は存在するが、UX-013 のパンくずが /strategy/plan-generator を『戦略・計画』として参照しているのは、ハブとしての /strategy が機能していないことを示す。ユーザーが URL を一段削って /strategy を見に行く動線で迷子になる。
解決方針: /strategy をハブ化し、配下の年次計画ジェネレーター以外の戦略ツール (RA, 教育計画) も統合。または、/strategy を削除し直接 /strategy/plan-generator にリダイレクト。

=== UX-015 [P3/UX-D] Footer の『主要機能』『関連データ』分類基準が不明瞭 (KY事例DB/メンタル/外国人労働者/グッズが『関連データ』扱い) ===
該当URL: 全ページフッター
推定工数: 2時間
根拠: web/src/components/footer.tsx の『関連データ』カラムには KY事例DB (ツール) / メンタル対策 (機能ハブ) / 外国人労働者 (機能ハブ) / 安全用品カタログ (ツール) が混在。第三者には『データ』と『機能』の境界が見えない。
解決方針: 『機能』(操作系) と『データ』(参照系) の二軸で分類整理。例: KY事例DB → データ、メンタル対策 → 機能、外国人労働者 → 機能、用品カタログ → 機能。

---

### UX-E: 操作フィードバック

=== UX-016 [P2/UX-E] AlertGenerator AI生成失敗時のエラー表示が生テキスト、再試行UI無し ===
該当URL: /
推定工数: 2時間
根拠: web/src/components/home-three-pillars.tsx:402 のフォールバック `setError(isEn ? 'Network error occurred.' : 'ネットワークエラーが発生しました。')`。ユーザーには『再試行』ボタンも『なぜ失敗したか』のヒントもない。失敗時の出口が無い。
解決方針: エラー時に (a) 再試行ボタン、(b) 'API使用上限/ネットワーク等を確認' の具体的ヒント、(c) 失敗が3回続いた場合の管理者連絡先誘導 (/contact) を表示。

=== UX-017 [P2/UX-E] Chatbot ページ SSR 時に『読み込み中』のみ表示、CSR mount まで First Contentful Paint がプレースホルダーのまま ===
該当URL: /chatbot
推定工数: 4時間
根拠: 本番 https://www.anzen-ai-portal.jp/chatbot に curl/WebFetch でアクセスしても初期 HTML には『読み込み中』のみ表示。サンプル質問チップ・プレースホルダーが SSR で出ない。スクリーンリーダー/Googlebot 視点で『何のためのページ?』が遅延理解になる。
解決方針: (a) chatbot-panel.tsx の EXAMPLE_QUESTIONS 等を SSR でも出力するよう Server Component 分離。(b) `<noscript>` 内に静的なサンプル質問リストを併設。

=== UX-018 [P3/UX-E] ホームページ統計バー (1,069件/5,026件/1,050点) が SSR/CSR 双方で数値が固定だが、CLS リスク有 ===
該当URL: /
推定工数: 2時間
根拠: web/src/components/new-home-hero.tsx の STATS は data/site-stats から取得。SITE_STATS.mhlwNoticeCount 等は static 値だが、フォントロード後にレイアウトシフトが発生し得る。viewport 375px で数値折り返しがあると CLS 増加。
解決方針: (a) 統計数値部分に CSS font-display: optional を採用するか、フォント先行ロード。(b) コンテナに固定の min-h を付与してロード前後でレイアウトが揺れない構造に。

---

### UX-F: アクセシビリティ実用度

=== UX-019 [P3/UX-F] 屋外モードトグルがPC上部+サイドバー底部の2箇所に重複配置 (機能は同期するがUI重複) ===
該当URL: 全ページ (PC)
推定工数: 1時間
根拠: web/src/components/app-shell.tsx:605-627 (PC top bar の屋外モードボタン) と 400-412 (サイドバー底部の屋外ボタン) で同一機能が2箇所に出る。視覚的にも『何が違うのか』が分からない。
解決方針: サイドバー底部の屋外ボタンを削除し、PC top bar の1箇所のみに集約。アクセシビリティトグル群 (ふりがな/やさしい/文字大/屋外) は1グループとしてトップバーに移動。

=== UX-020 [P3/UX-F] 言語切替セレクトボックスが PC/モバイルで2つの <select> 要素 (id 衝突は回避済だが重複) ===
該当URL: 全ページ
推定工数: 1時間
根拠: web/src/components/app-shell.tsx:416-433 (PC: id='app-lang-select-pc') と 472-493 (Mobile: id='app-lang-select-mobile') の2 <select>。ラベルは別だが機能完全重複。スクリーンリーダーで読み上げが冗長になる場合あり。
解決方針: 1つの <select> を CSS で PC/モバイル両対応 (display 切替) する、または ResponsiveSelect コンポーネントに抽出。

=== UX-021 [P2/UX-F] モバイルヘッダーでアクセシビリティトグル (ふりがな/やさしい/文字大) がデフォルト非表示 — ハンバーガーメニュー展開後のみ露出 ===
該当URL: 全ページ (mobile)
推定工数: 3時間
根拠: web/src/components/app-shell.tsx のモバイルヘッダーは 検索 + 屋外 + 言語 + テーマ + ユーザー + メニューの6要素のみ。ふりがな/やさしい/文字大はメニュー展開後の4ボタングループ内。日本語が苦手な利用者・高齢の現場作業員はメニューを開かないと機能発見できない。
解決方針: (a) 初回訪問時にバナーで『ふりがな/やさしい日本語/文字大の表示モードあります』を案内。(b) mobile ヘッダーに最低限『ふりがな』『文字大』を移動表示。

---

### UX-G: モバイル特有問題

=== UX-022 [P2/UX-G] ホームヒーロー統計バーが viewport 375px で text-[9px] サイズ — 視認性低 ===
該当URL: / (mobile)
推定工数: 1時間
根拠: web/src/components/new-home-hero.tsx:90-124 の統計バー: `grid-cols-3 gap-3 sm:gap-4` で 375px では1カラム75px幅。`text-[9px]` (9px) と `text-[10px]` (10px) が混在。Tailwind 標準の text-xs (12px) を下回るサイズは現場ユーザー(高齢/老眼) には読みづらい。
解決方針: (a) viewport <400px では2カラム+1カラムレイアウトに変更。(b) 最小フォントサイズを text-[11px] (11px) に統一。(c) 出典リンクは 'i' アイコンタップで開く。

=== UX-023 [P3/UX-G] サイドバーが lg (1024px〜) 以上でのみ表示、768〜1023px ではドロワー必須でタブレット縦持ち体験が悪い ===
該当URL: 全ページ (tablet 768x1024)
推定工数: 4時間
根拠: web/src/components/app-shell.tsx:325 `<aside className="hidden ... lg:flex">`。lg ブレイクポイント (1024px) 未満はモバイル扱いでハンバーガー必須。iPad 縦 (768x1024) や Surface Go ではサイドバーが常時表示されない。
解決方針: lg ブレイクポイントを md (768px) に下げ、タブレット縦持ちでもサイドバー固定。または md ではナビを上部水平バーに切り替え。

=== UX-024 [P2/UX-G] 右下フローティング ShareButtons がモバイル下部 MobileBottomNav の上に重なり、SNS共有時にホーム/KY/検索ボタンを覆う ===
該当URL: 全ページ (mobile)
推定工数: 2時間
根拠: web/src/components/app-shell.tsx:636 `<ShareButtons fixed />`。ShareButtons は fixed bottom right。MobileBottomNav も fixed bottom inset-x-0 z-40。ShareButtons パネル展開時にボトムナビの右側ボタンが見えない/タップできない可能性。
解決方針: (a) モバイルでは ShareButtons を画面右上か中央上に移動。(b) または MobileBottomNav 表示時 (≤480px) に bottom-16 (ナビ分のオフセット) を付与。

---

### UX-H: 認知負荷・情報設計

=== UX-025 [P2/UX-H] 演習問題機能ラベル3種類 (ナビ『演習問題』/ ページh1『学習用クイズ』/ メタtitle『安全衛生 資格試験 学習用クイズ』) ===
該当URL: /exam-quiz
推定工数: 2時間
根拠: (a) web/src/components/app-shell.tsx:98 nav label = '演習問題'、(b) web/src/app/(main)/exam-quiz/page.tsx:74 PageHeader title = '学習用クイズ（全資格対応）'、(c) 同 metadata.title = '安全衛生 資格試験 学習用クイズ'。PR #234 で nav は『演習問題』に統一されたが、ページ本体は未対応。
解決方針: 3箇所すべて『演習問題（全資格対応）』に統一。メタ description も連動更新。

=== UX-026 [P2/UX-H] NEW / AI / β バッジの過剰使用 (サイドバー8箇所超 + FlagshipNav 内のサブ機能にも分散) ===
該当URL: 全ページナビ
推定工数: 2時間
根拠: web/src/components/app-shell.tsx NAV_CATEGORIES で `badge: 'NEW'` が features/risk-prediction/chatbot/chemical-ra/mental-health-management/treatment-work-balance/plan-generator の7+件。`badge: 'AI'` も chatbot/risk-prediction/chemical-ra で3件。NEW が常時表示の利用者には『何が新しい?』が分からなくなり情報価値ゼロ。
解決方針: (a) NEW バッジは公開後30日のみ表示する有効期限機構を導入 (badgeUntil: 'YYYY-MM-DD')。(b) AI バッジは chatbot のみに絞る。

=== UX-027 [P2/UX-H] メンタル系3項目 (メンタル・カスハラ / メンタル対策実務 / 治療と仕事の両立支援) がサイドバー同カテゴリ並列で利用者に差分伝わらない ===
該当URL: /diversity, /mental-health, /mental-health-management, /treatment-work-balance
推定工数: 4時間
根拠: web/src/components/app-shell.tsx:128-133『多様な働き方』カテゴリに 4項目 (diversity/mental-health/mental-health-management/treatment-work-balance) が並列。利用者は『どれを開けばよいか』判断不能。メンタル系2項目 (mental-health vs mental-health-management) の境界がラベルから読めない。
解決方針: (a) /mental-health (旧 / 概念解説) は /mental-health-management (新 / 実務ハブ) に統合または301。(b) サイドバーは『多様な働き方 (diversity/foreign-workers)』『心身の健康 (mental-health-management/treatment-work-balance)』の2サブカテゴリに整理。

=== UX-028 [P1/UX-H] Footer に /api-docs リンクが残存 (本体は noindex 設定済だがフッター誘導は継続) ===
該当URL: 全ページフッター
推定工数: 1時間
根拠: web/src/components/footer.tsx:168-172 で /api-docs に静的リンク。ページ本体は noindex (curl で確認)、robots.txt でも Disallow 指定済 (PR #187 F-002)。しかしフッターからのリンクは未削除。ユーザーは『API ドキュメント』を期待してクリックし未完成ページに到達、信頼性毀損。
解決方針: footer.tsx から /api-docs リンクを削除。法人化後のAPI提供開始時に再追加。

=== UX-029 [P2/UX-H] Footer に /qa-knowledge『Q&A投稿募集』リンクが残存 (PR #194/#234 で縮小ランディング化済だが訴求残存) ===
該当URL: 全ページフッター
推定工数: 1時間
根拠: web/src/components/footer.tsx:109-113。F-007 の縮小判断で /qa-knowledge を投稿募集ランディングに絞り /faq へ301する設計。フッターの『Q&A投稿募集』ラベルは縮小方針と整合するが、関連データカラムの分類は『データ』として不適切。
解決方針: (a) ラベルを『Q&A 投稿募集 (準備中)』にしてプロジェクト/コミュニティ系カラムに移動。(b) もしくは投稿数が10件未満のうちは footer 表示から除外し /contact 経由のみに。

---

## SEO カテゴリ

### SEO-A: 検索意図と着地ページの整合

=== SEO-001 [P1/SEO-A] 主要検索クエリで安全AIポータルが Google 検索結果トップ10圏外 ===
該当URL: Google検索全般
推定工数: 0時間
根拠: WebSearch 2026-05-17 時点: (a)『安衛法 AI チャットボット』top10 はBotpress/Malwarebytes/JBS等の汎用記事、安衛法特化チャットボットの言及無し。(b)『労働災害 業種別 分析 レポート』top10 は JISHA / 厚労省 / osh-management.com / keiyaku-watch.jp。安全AIポータル不在。(c)『年次安全衛生計画 業種 ジェネレーター』top10 は厚労省/m3career/aemk.or.jp等の士業/コンサルブログ。当サイトの差別化機能は強力だが検索可視性ゼロ。
解決方針: (a) /chatbot, /accidents-reports, /strategy/plan-generator の title/description を主要キーワード前半に再構成。(b) これら3機能を起点とする internal-link hub を作り、業種別 LP に E-E-A-T 要素 (オーナー資格・登録番号) を埋め込む。(c) Google Search Console で当該クエリのインプレッション/CTR/ポジションを定常監視する仕組みをドキュメント化。

=== SEO-002 [P2/SEO-A] ロングテール『〜業 安全衛生計画書 テンプレート 無料』『〜業 KY 例 5業種』『熱中症 安衛則 612条の2 R7.6.1』などの未カバー意図 ===
該当URL: /strategy/plan-generator, /ky-examples, /heat-illness-prevention
推定工数: 16時間
根拠: 現状 metadata.description は機能訴求中心で、ユーザーの実検索意図 (『無料』『PDF』『2025 R7.6.1 改正後』『施行日』など) のロングテール語句が薄い。
解決方針: (a) /strategy/plan-generator の description に『無料・PDF出力可・建設業/製造業/運輸業/医療福祉/サービス業/小売業/飲食業/卸売業/倉庫業/事務系の10業種』を明示。(b) /ky-examples に『無料 KYT 例 建設業 鉄筋 高所作業 ヒヤリハット』等ロングテール H2 を追加。(c) /heat-illness-prevention に『安衛則第612条の2 令和7年6月1日施行』正規語句を最初の段落に。

=== SEO-003 [P3/SEO-A] ホームのキャッチコピー『現場の安全を、AIで変える。』が検索流入ワードとマッチしない (情緒的訴求のみ) ===
該当URL: /
推定工数: 1時間
根拠: h1=『現場の安全を、AIで変える。』。Google でこのフレーズは月間検索 0 (情緒コピー)。一方『労働安全衛生 サイト』『安全管理者 ツール』『安全衛生計画 無料』等のクエリには h1 が一致しない。タイトル/h1 と検索意図の乖離が CTR 低下を招く。
解決方針: h1 を『労働安全衛生のAI・データ活用ポータル』『安全管理者の業務を10機能で支える研究プロジェクト』等の検索意図ワードに変更し、キャッチコピーは subhead に格下げ。

---

### SEO-B: 技術SEO基盤

=== SEO-004 [P1/SEO-B] hreflang link 要素が HTML 内に出力されていない (layout.tsx の alternates.languages は同一URL指定) ===
該当URL: 全ページ
推定工数: 4時間
根拠: (a) web/src/app/layout.tsx:55-59 で alternates.languages = { ja: 'https://www.anzen-ai-portal.jp', en: '...', 'x-default': '...' } と3言語同URL指定。(b) 本番の HTML を curl + grep -ioE 'hreflang' で 0件確認。(c) サイトマップ側では同一URL hreflang を ja/en/x-default 3件emit。GoogleSearchConsole『不適切な hreflang』警告対象。
解決方針: (a) /en/ プレフィックス付きルートを実装し、本物の英語URLを発行。または (b) hreflang を完全に撤去し、ja のみで運用し『英語版は Beta、Googleには日本語版のみインデックス』と明示。中途半端な同一URL hreflang は害のみ。

=== SEO-005 [P1/SEO-B] sitemap.xml の全URL に ja/en/x-default 同一URL hreflang が出力 → Google Search Console 不適切判定リスク ===
該当URL: /sitemap.xml
推定工数: 2時間
根拠: 本番 curl 結果: 各 <url> ブロックに `<xhtml:link rel='alternate' hreflang='ja' href='...'/>`, `hreflang='en'`, `hreflang='x-default'` が全部同一URLを指す。Google: 『代替URL を持つときは、各代替URLは異なる必要があります』。web/src/app/sitemap.ts:247-254 の `alternates.languages` が全URLに同一を埋め込む実装。
解決方針: (a) sitemap.ts の alternates.languages ブロックを削除 (英語版 URL が無いなら hreflang は emit しない)。(b) 本格英語対応 (SEO-004) 完了後に /en/ プレフィックスURLを埋め込む。

=== SEO-006 [P2/SEO-B] sitemap lastModified の鮮度差が極端 (/pricing 2026-03-01, /privacy 2025-10-01, vs /accidents-reports/* 2026-05-16) ===
該当URL: /sitemap.xml
推定工数: 4時間
根拠: web/src/app/sitemap.ts:15-163。直近の更新 (2026-05-15〜17) と古い (2026-03-01, 2025-10-01) が混在。Googlebot は『更新が止まったサイト』判定で crawl 頻度を下げる。
解決方針: (a) 各ページの実コンテンツ更新タイミングと lastmod を git ベースで自動生成する (`scripts/refresh-sitemap-lastmod.mjs` を新設し、デプロイ前 prebuild フックで実行)。(b) 静的ハードコーディングを撤廃。

=== SEO-007 [P2/SEO-B] ホームページの meta description が145字超 (Google検索結果で切れる) ===
該当URL: /
推定工数: 1時間
根拠: web/src/app/(main)/page.tsx:10-11 `_desc = '労働安全衛生のAI・DX活用研究プロジェクト。...'`。文字数 = 145文字。Google検索結果の description は120字前後で切られるため、後半の主要文言が切り落とされる。
解決方針: description を100-120字に短縮し、主要キーワード3つ (労働安全衛生 / AI / DX) を前半に置く。例:『労働安全衛生のAI・DX活用研究プロジェクト。安衛法AIチャット、KY、業種別事故分析、年次安全衛生計画など現場運用機能を集約。無料。』(96字)

=== SEO-008 [P2/SEO-B] compare ページ sitemap に5つのクエリ組み合わせURL — クエリパラメータベース URL の sitemap 登録は重複コンテンツリスク ===
該当URL: /sitemap.xml (compare?industries=...)
推定工数: 3時間
根拠: web/src/app/sitemap.ts:30-33 で `compare?industries=construction,manufacturing` 等の query 付き URL 5件を sitemap 掲載。canonical は正規化されているが、Googleが sitemap 由来の URL を canonical 越権で indexing する事例あり。クエリ URL が public sitemap に出ること自体が稀。
解決方針: (a) クエリ付き URL を sitemap から除外し、/accidents-reports/compare のみ sitemap 掲載。(b) クエリ別ページは内部リンクから到達可能にし、sitemap で priority を持たせない。

---

### SEO-C: 構造化データ実装

=== SEO-009 [P1/SEO-C] /strategy/plan-generator BreadcrumbList JSON-LD が壊れたデータを持つ (UX-013 と同根、SEO 観点) ===
該当URL: /strategy/plan-generator
推定工数: 1時間
根拠: web/src/app/(main)/strategy/plan-generator/page.tsx:38-42 breadcrumbs 2階層目と3階層目の url が同じ /strategy/plan-generator。Google Rich Results Test で『同一URLを複数のpositionで参照する不正な BreadcrumbList』と判定される可能性。
解決方針: (a) /strategy ハブを実装し中間 URL を /strategy に。(b) または2階層に減らす ([ホーム, 年次安全衛生計画ジェネレーター])。

=== SEO-010 [P2/SEO-C] FlagshipGrid 10カードに ItemList Schema 未実装 — トップページが Google 検索結果で『機能リスト』のリッチスニペット候補にならない ===
該当URL: /
推定工数: 4時間
根拠: web/src/components/flagship-grid.tsx は plain な <ul> + <li> 構造。ItemList Schema.org JSON-LD が無く、Google が『FEATURES (主要機能)』を機能リストとして認識できない。ナレッジパネル/サイトリンク獲得の機会損失。
解決方針: FlagshipGrid に ItemList JSON-LD を埋め込み、各 ListItem に name/url/description を持たせる。複数 sitelinks 表示を狙う。

=== SEO-011 [P2/SEO-C] /exam-quiz 直下 CourseList / Quiz Schema 未実装 (LearningResource 機会損失) ===
該当URL: /exam-quiz, /exam-quiz/[slug]
推定工数: 6時間
根拠: web/src/app/(main)/exam-quiz/page.tsx は WebPage + BreadcrumbList のみ。各 CERT_QUIZZES エントリは Quiz / Course Schema 対応可能だが未実装。『〇〇試験 問題 無料』検索でリッチカード獲得の機会損失。
解決方針: (a) /exam-quiz トップに ItemList of Course Schema、(b) /exam-quiz/[slug] に Quiz Schema。

---

### SEO-D: 内部リンク構造

=== SEO-012 [P1/SEO-D] メイン3機能 (/chatbot, /accidents-reports, /strategy/plan-generator) 相互の内部リンク密度が低い ===
該当URL: /chatbot, /accidents-reports, /strategy/plan-generator
推定工数: 6時間
根拠: PR #225 のハブ&スポーク整理で /chatbot は法令系ハブから link in されたが、/accidents-reports → /strategy/plan-generator の相互リンクや、/strategy/plan-generator → /chatbot(『計画書条文確認はAIで』)の動線が薄い。Googlebot のPageRank流通効率が低下。
解決方針: (a) /accidents-reports の各業種カードに『この業種の年次計画を作る (/strategy/plan-generator?industry=...)』リンクを追加。(b) /strategy/plan-generator フォーム結果末尾に『生成計画書を AI に質問 (/chatbot)』リンク。(c) /chatbot サイドバーに『関連機能: 業種別事故レポート / 年次計画ジェネレーター』を常時表示。

=== SEO-013 [P2/SEO-D] /about ハブ (運営者情報) からメイン3機能への直接リンクが無く、E-E-A-T シグナルが分散 ===
該当URL: /about
推定工数: 3時間
根拠: /about は『研究プロジェクトについて』のハブ。オーナー資格・登録番号などのE-E-A-T訴求の中心だが、メイン3機能への文脈リンクが薄い。Googleは『専門家プロフィール → 専門分野コンテンツ』の関連性を E-E-A-T で重視。
解決方針: /about 末尾に『この研究の成果物 (メイン3機能)』カードを設置し /chatbot, /accidents-reports, /strategy/plan-generator へ。逆方向も /chatbot footer に『監修: 労働安全衛生コンサルタント(/about)』を恒久表示。

=== SEO-014 [P3/SEO-D] アンカーテキスト多様性不足 — Footer リンク文言が固定で、ロングテール変奏への露出機会喪失 ===
該当URL: 全ページ Footer
推定工数: 4時間
根拠: web/src/components/footer.tsx の『安衛法AIチャット』『化学物質RA』『重大事故ニュース』など anchor text が固定の専門用語短縮形。internal anchor の多様性が低く、Googleが当該キーワードの重要性を学習しにくい。
解決方針: (a) 一部リンクをロングテール表現に置換 (例: '安衛法AIチャット' → '労働安全衛生法AIチャット')。(b) ページごとに anchor text を 2-3 種類使い分け。(c) related-page-cards の cta テキストでロングテール語句を組み込む。

---

### SEO-E: コンテンツSEO

=== SEO-015 [P1/SEO-E] 英語コンテンツが client-side i18n のみ — Googlebot は静的 HTML の日本語版しか見えない、英語SEO実質ゼロ ===
該当URL: 全ページ
推定工数: 0時間
根拠: web/src/contexts/language-context.tsx の LanguageProvider は useState('ja') 初期化、localStorage から hydrate。Googlebot は static SSR の日本語 HTML をクロール。英語版コンテンツは JS 実行後のみ。Google が JS レンダリングする場合でも、localStorage に何も無い状態で初期表示は ja のままで、英語 indexing は事実上不可能。
解決方針: (a) 本格対応する場合は /en/ プレフィックスルート (Next.js i18n routing) を導入し SSR で英語HTMLをemit。(b) 簡易対応なら『Beta』ラベルを撤去し、英語切替機能は Footer 内 explanatory bar に格下げ。中途半端な多言語化を停止。

=== SEO-016 [P2/SEO-E] FlagshipGrid の英語コピー (EN_FEATURE_COPY) が 7件のみ — 残り3機能 (education-certification, industries, work-environment) の英語表示が日本語fallback ===
該当URL: /, /features
推定工数: 2時間
根拠: web/src/components/flagship-grid.tsx:8-44 EN_FEATURE_COPY のキーは safety-diary, ky, chemical-ra, signage, laws, chatbot, accidents の7件。FLAGSHIP_FEATURES 10件のうち education-certification, industries, work-environment の英語版は日本語を流す。
解決方針: EN_FEATURE_COPY に残り3機能を追加。(1) education-certification: 'Special Education & Skill Training DB'、(2) industries: 'Industry-Specific Safety Portal (10 industries)'、(3) work-environment: 'Working Environment Measurement & Classification'。

=== SEO-017 [P3/SEO-E] ホームの『FEATURES 7つの主要機能で...』文言とコンテンツ重複 — 同じ機能リストがフッターにも記載され thin content シグナル ===
該当URL: /, 全ページ Footer
推定工数: 2時間
根拠: (a) /page.tsx description = '安全衛生日誌・KY簡易作成・化学物質RA・サイネージ・法改正・安衛法AIチャット・重大事故ニュースの7つの主要機能'。(b) flagship-grid.tsx 内 h2 サブテキスト同様の機能列挙。(c) footer.tsx 主要機能カラム同じ7項目。サイト全ページで同一機能リストが3-4箇所重複。
解決方針: (a) ホームは『主要3機能 (chatbot/accidents-reports/plan-generator) + 関連7機能』に整理。(b) Footer は『機能ハブへ』の1リンクのみで /features にユーザー誘導。

---

### SEO-F: コア・ウェブ・バイタル

=== SEO-018 [P2/SEO-F] ホーム HTML サイズ 151KB / JS chunks 24 個 — INP / TBT 悪化リスク ===
該当URL: /
推定工数: 8時間
根拠: curl HEAD: Content-Length: 151,867 bytes。grep でJS chunks 24個ロード確認。CSS chunks 2個。PR #135 の Lighthouse 監査以降、84 PR でJSバンドル/コンポーネント追加 → Page Weight 監視不在で TBT/INP が継続劣化している可能性。
解決方針: (a) ホームページのみ Lighthouse CI を週次運用 (scripts/lighthouse-monitor.mjs)。(b) JS chunks 20個以下にバジェット設定。(c) AlertGenerator (Gemini 呼び出し UI) を 'use client' から動的 import 化し First Load JS から除外。

=== SEO-019 [P3/SEO-F] /api/og の動的 OG画像生成が CDN キャッシュヘッダ未設定の場合、SNS 共有時の TTFB が遅延 ===
該当URL: /api/og
推定工数: 2時間
根拠: web/src/app/layout.tsx:73 で og:image = '/api/og' の動的生成。各ページの og:image は ogImageUrl(title, desc) でクエリ付きで動的生成。Cache-Control が `public, max-age=31536000, immutable` でなければ Twitter/Facebook 共有のたびに再生成 → TTFB 増加。
解決方針: (a) /api/og レスポンスに `Cache-Control: public, max-age=31536000, immutable` を設定。(b) Vercel ImageOptimization の経路に切替 (next/og)。

=== SEO-020 [P2/SEO-F] ホームヒーロー直下 HomeThreePillars が `'use client'` 全体 SSR/CSR シフトリスク ===
該当URL: /
推定工数: 4時間
根拠: web/src/components/home-three-pillars.tsx:1 で `'use client'`。pickLatestFatalAccident / pickRecentLawRevisions / pickWarningWeather は useMemo で計算可能だが、Client Component のため初期 SSR で『現在公開中の死亡事例はありません』が一瞬出る可能性 (state 同期前)。FCP 後の CLS 増。
解決方針: (a) 3項目選択ロジックを Server Component に分離し props で渡す。(b) AlertGenerator のみ Client Boundary に。

---

### SEO-G: クローラビリティ

=== SEO-021 [P1/SEO-G] robots.txt の Disallow と Footer/SubNav 経由のリンク存在が衝突 (/api-docs) ===
該当URL: /robots.txt, 全ページFooter
推定工数: 1時間
根拠: /robots.txt は Disallow: /api-docs。web/src/components/footer.tsx には /api-docs リンクが残存。Googlebot は『リンクは追えるが crawl 禁止』状態でクロール予算を浪費。soft 404 シグナル。
解決方針: (a) footer.tsx から /api-docs リンク削除 (UX-028 と同根)。(b) /lms / /dpa など同様のリンクも全カラム横断棚卸し。

=== SEO-022 [P2/SEO-G] sitemap-index.xml と sitemap.xml の整合性検証が CI で行われていない (将来回帰のリスク) ===
該当URL: /sitemap.xml, /sitemap-index.xml
推定工数: 4時間
根拠: PR #180 で『URLの重複検査スクリプト』推奨が記載されたが、現状 scripts/ には sitemap 整合性チェッカーは無い。PR #232/#233 robots cache purge の後も継続検証なし。
解決方針: scripts/audit-sitemap-routes.mjs を新設し、(a) sitemap.xml の URL が routes と一致、(b) robots.txt Disallow と sitemap loc が衝突しない、(c) lastmod が今から1年以内、を CI で検証。

---

### SEO-H: 多言語SEO

=== SEO-023 [P1/SEO-H] html lang 属性が SSR では常に `ja` (language-context.tsx は client-side のみ更新) — Googlebot 視点で英語版が存在しないと判定 ===
該当URL: 全ページ
推定工数: 4時間
根拠: web/src/app/layout.tsx:98 `<html lang='ja'>`。web/src/contexts/language-context.tsx の applyHtmlLang は `document.documentElement.lang = ...` で client mount 後のみ更新。Googlebot は SSR 時点の lang=ja のみ参照。hreflang/英語切替 UI を併設しても英語版は索引化不可。
解決方針: (a) /en/ プレフィックス導入時に layout.tsx を [locale] 動的ルートに変更し SSR で lang を切替。(b) または英語版を諦め、lang=ja のみで運用し全ての英語 UI を撤去。

=== SEO-024 [P2/SEO-H] サイト全体に『English (Beta)』訴求があるが英語版コンテンツの indexability が無く GoogleSearchConsole で英語クエリインプレッションが期待できない ===
該当URL: 全ページ (language toggle)
推定工数: 0時間
根拠: language-context.tsx LANGUAGE_LABELS.en = 'English (Beta)'。EnglishBetaBanner コンポーネントもサイト上部に表示。しかし英語版URLは存在せず、Search Console で『英語からの流入』を計測しても 0 のまま。リブランド時に Beta 取り下げの判断が必要 (SEO-015/SEO-023 と連動)。
解決方針: (a) /en/ ルート実装で本格対応。(b) または英語切替 UI 撤去 + 主要ページのみ簡易英語ハブ (/about/en) のみ実装。中途半端な Beta 表記は撤去。

=== SEO-025 [P2/SEO-H] 言語切替時に URL が変わらず (localStorage 依存) — 共有URL で言語選択が再現できず、UX/SEO ともに不利 ===
該当URL: 全ページ
推定工数: 4時間
根拠: web/src/contexts/language-context.tsx の setLanguage は localStorage.setItem('language', lang) のみで URL を変更しない。利用者が英語版URLをコピーして共有しても、相手は ja で開く。Google も URL ベースで言語識別不能。
解決方針: Next.js i18n routing 導入で /en/* プレフィックスURL化。または langパラメータ ?lang=en でクエリ識別 + canonical で正規化。

---

## 採用/不採用判断テンプレート

```
UX-001 ?  ?  ?  ?
UX-002 ?  ?  ?  ?
UX-003 ?  ?  ?  ?
UX-004 ?  ?  ?  ?
UX-005 ?  ?  ?  ?
UX-006 ?  ?  ?  ?
UX-007 ?  ?  ?  ?
UX-008 ?  ?  ?  ?
UX-009 ?  ?  ?  ?
UX-010 ?  ?  ?  ?
UX-011 ?  ?  ?  ?
UX-012 ?  ?  ?  ?
UX-013 ?  ?  ?  ?
UX-014 ?  ?  ?  ?
UX-015 ?  ?  ?  ?
UX-016 ?  ?  ?  ?
UX-017 ?  ?  ?  ?
UX-018 ?  ?  ?  ?
UX-019 ?  ?  ?  ?
UX-020 ?  ?  ?  ?
UX-021 ?  ?  ?  ?
UX-022 ?  ?  ?  ?
UX-023 ?  ?  ?  ?
UX-024 ?  ?  ?  ?
UX-025 ?  ?  ?  ?
UX-026 ?  ?  ?  ?
UX-027 ?  ?  ?  ?
UX-028 ?  ?  ?  ?
UX-029 ?  ?  ?  ?
SEO-001 ?  ?  ?  ?
SEO-002 ?  ?  ?  ?
SEO-003 ?  ?  ?  ?
SEO-004 ?  ?  ?  ?
SEO-005 ?  ?  ?  ?
SEO-006 ?  ?  ?  ?
SEO-007 ?  ?  ?  ?
SEO-008 ?  ?  ?  ?
SEO-009 ?  ?  ?  ?
SEO-010 ?  ?  ?  ?
SEO-011 ?  ?  ?  ?
SEO-012 ?  ?  ?  ?
SEO-013 ?  ?  ?  ?
SEO-014 ?  ?  ?  ?
SEO-015 ?  ?  ?  ?
SEO-016 ?  ?  ?  ?
SEO-017 ?  ?  ?  ?
SEO-018 ?  ?  ?  ?
SEO-019 ?  ?  ?  ?
SEO-020 ?  ?  ?  ?
SEO-021 ?  ?  ?  ?
SEO-022 ?  ?  ?  ?
SEO-023 ?  ?  ?  ?
SEO-024 ?  ?  ?  ?
SEO-025 ?  ?  ?  ?
```

形式: `<ID> <採否(adopt/defer/reject)> <担当者> <着手予定週> <備考>`
