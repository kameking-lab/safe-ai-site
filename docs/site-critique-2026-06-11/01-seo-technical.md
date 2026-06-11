# レンズC: テクニカルSEO監査（実測 2026-06-11）

## S-1. sitemap収載の31記事が「中身ゼロ＋canonical=トップ」の毒シェル
- **症状(事実)**: sitemap-articles.xml の全31 URL（/articles/lr-real-2016-001 〜 lr-real-2026-003）は HTTP 200 を返すが、SSR本文テキスト32文字・h1ゼロ・titleはサイト共通デフォルト「安全AIポータル｜現場の安全を、AIで変える。」・**canonicalがトップページ(https://www.anzen-ai-portal.jp)を指す**。/articles 一覧ページからのリンクは0本（orphan）。同型シェルが /about/cases・/pdf にも存在。
- **実害**: Googleに「この31ページはトップの重複」と宣言している状態。クロールバジェット浪費＋トップページのcanonicalシグナル汚染。法改正記事という検索需要のあるコンテンツ枠が丸ごと死んでいる。
- **直し方**: ①実在しない記事IDは404を返す(generateStaticParams外はnotFound())。②sitemap-articles.xmlを実在記事から動的生成。③実在するならSSRで本文・固有メタを出す。
- **規模感**: S（修正自体はM=ルートの404化とsitemap生成修正）。

## S-2. KY機能トップ等の主要ページがCSR空シェル（SSRテキスト32〜50字）
- **症状(事実)**: /ky（KY活動のトップ・sitemap収載）はSSR本文32文字・h1ゼロ・title/OGPがサイト共通デフォルト。/for/construction（建設業向け営業LP）はtitleこそ固有だがSSR本文50文字。/ky/morning 114文字・/signage/map 406文字。ブラウザではJSで描画される（Playwright実測: /ky本文1,649字）。
- **実害**: robots.txt が Disallow: /api/ のため、Googlebotのレンダリングがクライアントfetchに依存する部分は恒久的に空。仮にレンダリングされても、/kyはtitle・descriptionが汎用のままなので検索結果の見た目で全敗する。「KY活動 デジタル」等の獲得可能クエリを自ら捨てている。
- **直し方**: ①静的に決まる説明・見出し・使い方をServer Componentで出す（操作UIはClientのまま）。②各ページにgenerateMetadataで固有title/description/canonicalを付与。
- **規模感**: S（KYは中核機能。修正M）。

## S-3. 判例DB・新着・記録キットがsitemap不在
- **症状(事実)**: /court-cases（判例88件＝他に無い独自コンテンツ）・/whats-new（SSR本文15,313字）・/site-records とその配下が、どのsitemapにも載っていない（grep一致0件）。いずれも200で実コンテンツあり。
- **実害**: サイト最大の差別化コンテンツ（確定判例DB）の発見をGoogleの内部リンク巡回任せにしている。新着ページの鮮度シグナルも伝わらない。
- **直し方**: sitemap生成ロジックに3セクション（court-casesは個別判例の詳細URLがあるならそれも）を追加。
- **規模感**: S（修正S=sitemap配列に追記）。

## A-1. robots.txtがAI検索ボットを全遮断（方針判断＝Path A案件）
- **症状(事実)**: GPTBot・OAI-SearchBot・ChatGPT-User・PerplexityBot・ClaudeBot・CCBot等17種を Disallow: /。
- **実害(意見と明記)**: 現場の人が「足場 点検 頻度」をChatGPT/Perplexityに聞く時代に、AI回答の引用元として一切登場しない。学習拒否(GPTBot/CCBot)と検索引用(OAI-SearchBot/PerplexityBot/ChatGPT-User)は別物で、後者まで塞ぐのは流入機会の放棄。
- **直し方**: 検索系UA(OAI-SearchBot・ChatGPT-User・PerplexityBot)のみAllowに分離。学習系は遮断継続でよい。**オーナーの方針判断が必要（Path A）**。
- **規模感**: A（修正S=robots.ts数行）。

## A-2. 内部運用レポート2本が本番公開＋sitemap収載
- **症状(事実)**: /audits/hobby-recovery-forecast-2026-05-19（title「Vercel Hobby復帰予測レポート 2026-05-19 — Dispatch A/Bベースライン」・本文15,616字）と /audits/site-status-2026-05-19 がsitemap.xmlに収載され誰でも閲覧可能。インフラ課金状況・内部運用の詳細が露出。
- **実害**: 労働安全の専門ポータルの検索結果・回遊に内部文書が混入。専門性の印象を毀損し、運用情報(コスト逼迫等)を顧客候補に晒す。
- **直し方**: ルートごと削除または noindex + robots Disallow: /audits/ + sitemap除外。docs/はリポジトリに残せば足りる。
- **規模感**: A（修正S）。

## A-3. sitemapの構造崩壊とlastmod固定
- **症状(事実)**: sitemap-index配下のsitemap-circulars.xmlは15件しか無いのに、本体sitemap.xmlに通達1,070件・保護具1,050件が直書き（役割分担が崩壊）。トップのlastmodは2026-04-19のまま（changefreq=dailyと自己矛盾）。多数のlastmodが4月末で停止。
- **実害**: lastmodが信用できないsitemapはGoogleに無視され、毎日更新している新着・通達の再クロールが遅れる。
- **直し方**: セクション別sitemapに再編（static/articles/circulars/equipment/court-cases…）し、lastmodをデータの実更新日から生成。
- **規模感**: A（修正M）。

## A-4. 旧equipment ID 39件がsitemap-equipment.xmlに残存＝全部シェル
- **症状(事実)**: sitemap-equipment.xmlの39 URL（ee-/fg-/hc-/fa-/hf-/ho-/hp-/mt-/rm-/sb-/misc-）はすべてh1ゼロの空シェル（現行IDはeq-NNNN形式で本体sitemapに1,050件）。応答も遅い（fg-002=3.5秒等、ISRキャッシュ無し挙動）。
- **実害**: S-1と同じsoft-404群。サブsitemap自体が丸ごと陳腐。
- **直し方**: sitemap-equipment.xmlを現行ID生成に差し替えるか削除。未知IDはnotFound()。
- **規模感**: A（修正S）。

## B-1. h1の欠落・重複
- **症状(事実)**: h1ゼロ＝/accidents・/accidents-analytics・/laws・/law-search・/goods（SSR時点。/accidentsはJS描画後もh1なしの疑い、Playwright上もh1Text=null→要確認は本文中心の構造）。h1が2個＝/ky/paper・/risk・/risk-prediction・/safety-diary。
- **実害**: 見出し構造がページ主題をGoogleに伝えない。スクリーンリーダーのランドマーク移動も壊れる。
- **直し方**: 各ページ1つのh1（ページ名）に統一。デカ数字カードはh1にしない。
- **規模感**: B（修正S×9ページ）。

## B-2. description不足・title超過
- **症状(事実)**: 200ページ中、description 50字未満が27ページ（/faq/* 33〜47字・/foreign-workers/status/* 33〜47字・/privacy・/terms・/quick等）。title 60字超4件（最大63字）。
- **実害**: SERPでの説明文がGoogle自動生成になり、クリック率を運に任せる。
- **直し方**: 80〜110字のdescriptionテンプレート（誰向け・何ができる・根拠法令）をセクション別に整備。
- **規模感**: B（修正M=27ページ分の文言）。

## C-1. og:image欠落ページ
- **症状(事実)**: /audits×2・/signage×2・/bcp・/contact・/insurance・/privacy・/security・/terms・/about配下2 にog:imageなし。
- **直し方**: デフォルトOG画像をlayoutでフォールバック設定。規模感C/S。

## C-2. 404ページがどん詰まり
- **症状(事実)**: 404ページは本文199字・リンク4本・ヘッダーナビ0・検索手段なし（Playwright実測）。
- **実害**: 旧URL流入・タイポ流入を全部取りこぼす。
- **直し方**: not-found.tsxに主要9機能のランチャー＋横断検索ボックスを置く。
- **規模感**: B（修正S）。
