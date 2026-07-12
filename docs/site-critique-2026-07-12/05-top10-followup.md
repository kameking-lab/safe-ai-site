# 05 前回酷評Top10のその後（2026-06-11 → 2026-07-12 実測判定）

**判定集計: 解消7・一部解消2（#6 /circulars転送量、#9 Person JSON-LD）・未解消0。**

## 任務2: 前回酷評Top10のその後（1件ずつ実測）

### 1. モバイルLCP6-10s / CLS0.853 — **解消（一部残課題）**
- 証拠: 上表。コア機能ページは Perf 91-96 / LCP≦2.9s / CLS≦0.059。CLAUDE.md 品質基準「Performance 90+」を10ページ中8ページが満たす。
- 残: /chemical-ra 79（LCP4.1s）、/search 71（CLS0.185/TBT628ms）。

### 2. サイト横断検索ゼロ — **解消**
- 証拠: /search が存在（200、title「サイト内 横断検索｜安全AIポータル」）。ヘッダーに検索ボタン（aria-label「検索を開く（Ctrl+K）」のコマンドパレット）。実クエリ「足場」で **検索結果 234件**（headless Chrome実測）。カテゴリタブ・URL共有可・最大300件表示（web/src/app/(main)/search/SearchResults.tsx、lib/search-index のクライアントlexical検索）。
- 品質メモ: 検索ページ自体の Perf 71 / CLS 0.185（上記1の残課題）。

### 3. sitemap毒シェル31記事（canonical=トップの空記事） — **解消**
- 証拠: sitemap-articles.xml は現在 **実在10記事**のみ（lr-real-* は全て消滅）。旧URL /articles/lr-real-2016-001・lr-real-2026-003 は **404**。新記事 /articles/freelance-rosai-2024 は 200・固有title「フリーランス労災保険（2024年特別加入拡大）」・**self-canonical**・h1あり・author Person JSON-LD あり。

### 4. KYトップのCSR空シェル＋汎用メタ — **解消（別解: リダイレクト方式）**
- 証拠: /ky は **308 → /ky/paper** に恒久リダイレクト。/ky/paper は固有title「KY用紙 作成ツール｜危険予知活動表（用紙ファースト）」・self-canonical・**SSR本文4,456字**（前回 /ky は32字・汎用メタ・canonical=トップ）。
- 残メモ: /ky/paper のSSR HTMLに h1 が無い（前回はh1が2個 → 今回0個。1個にすべき）。A11y 93 は10ページ中最下位。

### 5. 判例DB・新着・記録キットのsitemap不在 — **解消**
- 証拠: sitemap.xml（413 URL）に /court-cases 系 **90 URL**（個別判例含む: /court-cases/rikujou-jieitai-hachinohe 等）、/whats-new **1 URL**、/site-records 系 **11 URL**（/site-records/patrol 等）を収載確認。sitemap-index.xml は7ファイル構成に再編済み。

### 6. /circulars 巨大1ページリスト — **一部解消**
- 証拠: 初期DOM描画は **24件＋「さらに表示（残り1,045件）」** の逐次表示に変更（headless Chrome実測: 描画リンク24・ボタン73。前回はボタン416個・モバイル47画面分）。DOM肥大とCLSの実害は解消。
- 未解消部分: URLページネーションではなく show-more 方式（?page=2 は同一内容）。**HTML転送量は870KB**のまま（全1,069件のデータがRSCペイロードに同梱）— 低速回線の初回バイト負担は残る。

### 7. /accidents 出力手段ゼロ — **解消**
- 証拠: /accidents のSSR HTMLに **「CSVダウンロード」「コピー」「共有」ボタン**を確認（`<button>…CSVダウンロード</button>` 等）。h1 も追加済み（前回B-1のh1ゼロも解消）。

### 8. 内部運用レポート公開 — **解消**
- 証拠: /audits/hobby-recovery-forecast-2026-05-19・/audits/site-status-2026-05-19・/audits とも **404**。sitemap.xml 内 "audits" 一致 **0件**。robots.txt からも露出なし。

### 9. E-E-A-T監修者バイライン（Person JSON-LD） — **一部解消**
- 解消部分: 記事（/articles/freelance-rosai-2024）に `author: {"@type":"Person","name":"安全AIポータル 編集部（労働安全衛生コンサルタント監修）","url":"…/about"}` を確認。/laws 個別ページ（/laws/freelance-rosai）に可視バイライン「労働安全コンサルタント監修（登録番号 260022）」を確認。
- 未解消部分: /laws 個別ページの JSON-LD は Organization/WebSite/BreadcrumbList のみで **Person なし**。/whats-new にも Person なし。Person名も実名でなく「編集部（…監修）」の汎用名。

### 10. AI検索ボット遮断 — **解消（推奨どおりPath A採用）**
- 証拠: robots.txt で **OAI-SearchBot・ChatGPT-User・PerplexityBot・Claude-Web/Claude-User/Claude-SearchBot・YouBot を Allow: /** に分離。学習系（GPTBot・ClaudeBot・CCBot・Google-Extended・Applebot-Extended・Bytespider等）は Disallow: / を継続。前回提案（検索系のみ開放）と完全一致。

## 総括
- Top10のうち **解消7件（#1,2,3,4,5,7,8,10 のうち#1は残課題付き）・一部解消2件（#6,9）・未解消0件**。
- 前回レビュー最大の主張「画面が出るまでの6秒を直せ」は本番で実証的に解決（コアページ LCP 1.2〜2.9s / CLS 0.000）。
- 次の優先候補（実測ベース）: ① /chemical-ra の LCP 4.1s、② /search の CLS 0.185/TBT 628ms、③ /circulars の 870KB HTML、④ /ky/paper の h1 欠落と A11y 93、⑤ /laws 個別ページへの Person JSON-LD 展開。
