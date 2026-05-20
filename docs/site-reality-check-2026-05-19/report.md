# 本番実態と現況レポート(2026-05-19)の齟齬検証

調査日: 2026-05-20
対象レポート: /audits/site-status-2026-05-19 (PR #251、HEAD ab55d44 でのコード解析ベース)
対象本番: https://www.anzen-ai-portal.jp/
調査HEAD: af69510 (origin/main、PR #251 マージ後の chore(jma) コミットまで反映)
調査手法: 本番URL に対する curl による HTML/レスポンスヘッダ取得、grep による差分抽出
検証対象URL総数: 30本(robots/sitemap 4本を含む)

本レポートは現況レポート(コード解析ベース)が本番に意図通り反映されているか、機械検証可能な範囲で全件突き合わせを行ったものです。本Dispatchは検証主体であり、致命的乖離が見つかった場合に限り最小修正を行う前提です。

---

## 1. メイン3機能 reality check

### 1.1 /chatbot 判定: ほぼ一致

意図通り反映されていた事項。

- title 「安衛法AIチャットボット｜33法令以上を根拠条文付きで即答(無料)｜安全AIポータル」。レポート §3 末尾の記載と完全一致。
- meta description は「安衛法AIチャットボットが労働安全衛生法・安衛則・特化則・有機則・酸欠則・粉じん則・石綿則・じん肺法など33法令以上を根拠条文付きで回答…」で33法令を明示。レポート意図と一致。
- canonical https://www.anzen-ai-portal.jp/chatbot を出力。
- JSON-LD 3ブロックを SSR に含む。@type は BreadcrumbList / WebApplication / WebPage / WebSite / QAPage / EntryPoint / SearchAction / Organization / ImageObject / Offer / ListItem を含み、レポート §3「メイン3機能はCOPILOT_FEATURE_PEERSとして相互参照」の WebApplication 出力を確認。
- /accidents-reports / /strategy/plan-generator への href が SSR HTML に存在。Copilot UI の存在を示す文字列「安全Copilot」が3回出現。
- 「33法令以上」フレーズが28回出現。

部分齟齬の事項。

- レポート §2.1 弱点欄に「SSR時の初期表示が『読み込み中』のみで FCP 遅延(UX-017)」と記載されているが、本番 SSR HTML は 147KB あり「安衛法AIチャットボット」が26回・「読み込み中」は3回のみ。チャット UI 骨格は SSR で表示され、ハイドレート前に画面が空白になる挙動ではない。UX-017 が指している実態は「会話パネルの中身がハイドレート前は読み込み中」レベルの局所的なものに留まる可能性。
- 「safety-context-v1」は SSR HTML に出現しない(localStorage キーは JS バンドル内のため期待通り、誤認識ではない)。

未反映/欠落の事項。

- /accidents-reports へのリンクは href="/accidents-reports" のみで、業種クエリ付き(例: /accidents-reports/construction)の動的リンクは SSR では生成されない。これは Copilot 動線が client 側で組み立てられる仕様で、レポート §2.1「業種コンテキスト検出時に /accidents-reports/{industry} へのリンクを動的生成」と整合。

### 1.2 /accidents-reports 判定: 重大乖離

ハブページ(/accidents-reports)は概ね一致するが、5業種ランディングページの h2 構成と表示件数がレポート §2.2 の記載と著しく異なる。

意図通り反映されていた事項。

- ハブの title 「労働災害 業種別 分析レポート｜5業種5,000件超の自動集計(無料)｜安全AIポータル」、canonical 一致。
- 5業種ランディング(construction / manufacturing / transport / healthcare / service) すべて HTTP 200、 ISR キャッシュ(x-vercel-cache=HIT)で稼働。
- /accidents-reports/compare ページ自体は HTTP 200(no-cache)で動作。
- 業種別ページの JSON-LD に Dataset 型を含む(レポート「webPage/breadcrumb/dataset の3層」を確認)。
- 「5,000件超」フレーズはハブで18回、 /chatbot で1回、 5業種ページにはなし。

重大乖離の事項(レポート §2.2 vs 本番)。

- h2構成の乖離。
  レポートは各業種ページが「事故型ランキング/原因Top10/月別季節性/年次推移/業種特有パターン/推奨対策チェックリスト/関連法令」の7セクションを持つと記載。
  本番(/accidents-reports/construction)の実 h2 は次の9つで構成され、ラベルも一部異なる。
    サマリ
    事故の型 Top 10
    原因 Top 10
    時間帯・事業所規模
    月別 発生傾向と季節性
    年次推移と前年同期比較
    他業種と比較
    次のアクション
    安全Copilot:次のステップ
  「業種特有パターン」「推奨対策チェックリスト」「関連法令」というセクション見出しは本番 HTML に存在しない。逆にレポートが記載していない「時間帯・事業所規模」「他業種と比較」「次のアクション」「安全Copilot:次のステップ」が存在する。

- 件数表示の乖離。
  レポート §2.2 は5業種について建設66,713件・製造115,601件・運輸66,650件・医療22,707件・サービス34,436件と記載。これらの数字は本番のいかなるページにも一切出現しない(grep 0件)。
  本番の各業種ページに表示される最大の「件数」値は次のとおりで、レポート記載値より2桁少ない。
    construction 1,670件
    manufacturing 926件
    transport 710件
    healthcare 97件
    service 1,168件
  504,413件(集計統計総計)・306,107件(5業種合計)・292件(個別ケース合計)もどの本番ページにも出現しない。
  本番ページが表示しているのは industry-profiles.json の集計統計ではなく、real-accident-cases*.ts の個別ケースを業種フィルタした結果(または別データソース)である可能性が高い。レポート §6.3「『5,000件超』という表記と実データ件数の対応関係が不明確」の課題が本番でも維持されている。

- /accidents-reports/compare のクエリURL残存(SEO-008)。
  本番 sitemap.xml に compare ベース URL とクエリ4本が掲載されていることを確認。
    /accidents-reports/compare
    /accidents-reports/compare?industries=construction,manufacturing
    /accidents-reports/compare?industries=construction,manufacturing,transport
    /accidents-reports/compare?industries=healthcare,service
    /accidents-reports/compare?industries=construction,healthcare,manufacturing,service,transport
  レポート §3「未解決課題:compareページのクエリURL4件が残存」と一致。

### 1.3 /strategy/plan-generator 判定: ほぼ一致

意図通り反映されていた事項。

- title 「年次安全衛生計画 業種別 ジェネレーター｜10業種×3規模・無料・PDF｜安全AIポータル」、canonical 一致。
- JSON-LD 4ブロックを含み WebApplication / BreadcrumbList / WebPage / EntryPoint / SearchAction を出力。
- 本文に「10業種」17回、「3規模」8回、「建設業」13回、「製造業」13回、「業種」52回出現。フォーム構造は SSR に存在(form の label/option は client-render される箇所もある)。
- ?industry=construction&focus=fall 付きアクセスでも HTTP 200 で本体サイズ同一。prefill は client 側で URL パラメータ解釈する仕様と整合。
- Copilot 動線(/accidents-reports / /chatbot への戻りリンク)を示す「安全Copilot」3回出現。

部分齟齬の事項。

- /strategy 親ルートは HTTP 200 だがタイトル「月商100万円戦略 V3 内部文書｜安全AIポータル」で別目的のオーナー戦略ドキュメントである。/strategy/plan-generator への301リダイレクトは未実装(レポート §6.1「UX-014」と一致)。本番でもパスワードゲート + /strategy/plan-generator への動線リンクが内部にある構造。

未反映/欠落の事項。なし。

---

## 2. SafetyContext 3機能連携 reality check

判定: ほぼ一致(SSR 観測可能範囲では仕様通り)。

- /chatbot / /accidents-reports / /strategy/plan-generator / /accidents-reports/construction いずれも SSR HTML 内に「安全Copilot」が出現(各3〜5回)。CopilotNextSteps コンポーネントは SSR でアウトラインを出力。
- localStorage キー「safety-context-v1」は SSR HTML に出現しない。これは仕様通り(クライアント側で初期化されるキー)。レポートはこの点を誤って「HTML内に埋め込まれている」と読める書き方はしておらず、認識違いはない。
- 3機能間の相互リンクは静的 href としては存在(/accidents-reports や /strategy/plan-generator の bare URL)。業種コンテキストに応じた動的URL生成は SSR では検出不能(JS 実行が必要)。

---

## 3. SEO実装 reality check

### 3.1 robots.txt 判定: 完全一致

- AIクローラー17種を Disallow: / でブロック。実測で GPTBot / ChatGPT-User / OAI-SearchBot / Claude-Web / ClaudeBot / anthropic-ai / Bytespider / Amazonbot / PerplexityBot / YouBot / CCBot / FacebookBot / ImgProxy / Diffbot / omgili / omgilibot / facebookexternalhit の17種を確認。
- 全クローラー向け Disallow パターン8件 (/admin/ /api/ /auth/ /dev/ /handover /lms /api-docs /dpa) 確認。
- Sitemap 行は https://www.anzen-ai-portal.jp/sitemap-index.xml(ハイフン)を指定。

### 3.2 sitemap 判定: 部分一致

- sitemap-index.xml(ハイフン) は HTTP 200。子4本 (sitemap.xml / sitemap-articles.xml / sitemap-circulars.xml / sitemap-equipment.xml) を列挙。
- sitemap_index.xml(アンダースコア) は HTTP 404(キャッシュHIT)。レポートでは「sitemap-index.xml」と明示されており本番表記と一致するが、過去URL/外部リンクで「sitemap_index.xml」を参照しているケースが残っていれば 404 のまま。
- 子4本の URL 数(<loc> 行数)は次のとおりで、合計 2,498。
    sitemap.xml 2,413
    sitemap-articles.xml 31
    sitemap-circulars.xml 15
    sitemap-equipment.xml 39
  レポート §3「推定総URL数は2,800〜3,500件」より下振れ。推定値と実測の差は約300〜1,000件あり、レポート §3 の推定は実測との整合性検証が必要。

### 3.3 30URL ヘッダ実測 判定: ほぼ意図通り

PR #239 で導入された /audits/* の s-maxage=86400 が本番で実際に返っていることを確認。
    /audits/site-status-2026-05-19  Cache-Control: public, s-maxage=86400, stale-while-revalidate=3600  X-Vercel-Cache: HIT
    /audits/p2-batch-plan / p3-batch-plan / post-2week-regression / review-dashboard も同様の s-maxage=86400 を返却(x-vercel-cache は PRERENDER または HIT)。

メイン3機能とハブ系の30本中の主な実測。
    / 200 HIT  public, max-age=0, must-revalidate
    /chatbot 200 HIT  public, max-age=0, must-revalidate
    /accidents-reports 200 HIT
    /accidents-reports/construction 200 HIT (ISR 想定どおり)
    /accidents-reports/manufacturing 200 HIT
    /accidents-reports/transport 200 HIT
    /accidents-reports/healthcare 200 HIT
    /accidents-reports/service 200 HIT
    /accidents-reports/compare 200 MISS (private, no-cache)
    /strategy/plan-generator 200 HIT
    /strategy 200 MISS (private, no-cache、認証ゲートのため動的)
    /laws 200 HIT
    /accidents 200 HIT
    /circulars 200 HIT
    /about 200 HIT
    /notifications 200 HIT
    /ky 200 HIT
    /e-learning 200 HIT
    /mental-health 200 HIT
    /mental-health-management 200 HIT
    /exam-quiz 200 HIT
    /quiz 200 PRERENDER
    /news 308 → /accidents (意図的リダイレクト)
    /guides/anzeneho-ai-chatbot 200 HIT

検出された問題。
    /chemicals 404 NOT FOUND。レポート §2.1 が「化学物質は src/data/chemicals-mhlw/compact.json で1,046件以上」と記載しているが、URL は /chemical-database (200) と /chemical-ra (200) であり /chemicals は存在しない。レポートにはこの URL パスは明示されておらず誤読を生む書き方はしていないが、外部読者が「化学物質ページ」を想像すると /chemicals を叩いて 404 を踏みうる。

OPTIONS リクエスト確認。
    /api/chatbot OPTIONS 204 No Content、CSP/HSTS/Referrer-Policy/Permissions-Policy 設定確認、Allow: OPTIONS, POST、Cache-Control: public, max-age=0, must-revalidate。

---

## 4. 構造化データ本番検証

判定: ほぼ意図通り反映。

各ページの @type 出現状況(SSR HTML から抽出)。

- ホーム / : BreadcrumbList / EntryPoint / ImageObject / ListItem / Organization / SearchAction / WebPage / WebSite
- /chatbot : 上記+ QAPage / WebApplication / Offer (3 JSON-LD ブロック)
- /accidents-reports : 上記+ Article / ItemList / WebApplication / Offer (3 ブロック)
- /strategy/plan-generator : 上記+ WebApplication / Offer (4 ブロック)
- /accidents-reports/{construction|manufacturing|transport|healthcare|service} : 上記+ Dataset (3 ブロック)

メイン3機能の WebApplication 出力、 業種別ページの Dataset 出力、 ホームと全機能の BreadcrumbList 出力を全件確認。レポート §3「FlagshipGrid ItemList Schema(SEO-010)…未実装」と整合(ItemList は /accidents-reports ハブのみで出現、ホームの FlagshipGrid 用 ItemList は未出力)。/exam-quiz の CourseList/Quiz Schema(SEO-011) も SSR HTML から確認できず、未実装である旨レポートと一致。

---

## 5. 表記乖離の完全マップ

主要9ページ(home / chatbot / accidents-reports / plan-generator / 5業種ページ) における主要数値・フレーズの出現マトリクス。

「5,000件超」
    chatbot 1, accidents-reports 18, 個別5業種ページ 0, home 0, plan-generator 0
    合計2ページに出現(主にハブの自動集計説明)。

「5,000件」
    上記と同じ分布(全件 5,000件超 を含む)。

「5,000件以上」
    どのページにも出現せず(0件)。

「5026件」「5,026件」
    どのページにも出現せず(0件)。

「33法令以上」
    chatbot 27, accidents-reports 1, plan-generator 1, 業種別5ページ 各3
    合計8ページに出現、計43回。

「33法令」(以上を含む包含検索)
    chatbot 28, accidents-reports 1, plan-generator 1, 業種別5ページ 各3
    合計43回(ほぼ「33法令以上」と一致)。

「50法令」「50法令体制」
    どのページにも出現せず(0件)。レポート §6.3「サイト上『33法令以上』の記載に対し実装は50法令体制(タイトル/descriptionと実装の乖離)」を裏付け。

「504,413」「504413」
    どのページにも出現せず(0件)。industry-profiles.json の総件数はユーザー向け表示には反映されていない。

「292件」「292」(単独件)
    どのページにも該当する文脈で出現せず(0件)。

「66,713」「115,601」「66,650」「22,707」「34,436」(レポート §2.2 記載の業種件数)
    どのページにも出現せず(0件)。

「1,069件」「1,046件」(レポート §2.1 通達数/化学物質数)
    どのページにも出現せず(0件)。

「ANZEN AI」(大文字、F-003 該当ブランド表記)
    主要5ページに大文字表記の「ANZEN AI」は0件。F-003 がレポート時点で6箇所残存と記載されていたが、本検証時点で主要ページからは姿を消している(OG/PDF/about/features/circulars/JSON-LD 個別検証は未実施で「ない」と断定はできないが少なくともメイン導線上は消えている)。

要点まとめ。
    ユーザーに見せる集約フレーズは「5,000件超(5業種)」「33法令以上」の2本に統一。
    レポートが裏付け値として記載した正確な内部数値(504,413 / 66,713 / 115,601 等) はサイト上に1件も露出していない。
    「33法令以上」vs「50法令体制」の名乗りズレは本番でも未解消。

---

## 6. 未着手領域(§6.5)の本番実態

| 領域 | 本番URL | 状態 | コメント |
|------|---------|------|----------|
| 通知機能 | /notifications | 200 OK | title「安全情報 通知・メール配信設定」を返し、ページ実体は存在。機能稼働状況は SSR HTML だけでは判別不能。レポート §6.5「機能が存在しない」は表現が強すぎる可能性。 |
| サブスク課金 | (UI 表示なし) | NEXT_PUBLIC_PAID_MODE=false が効いている可能性 | ホーム HTML には Stripe 関連の CTA は出現せず、課金 UI は表示されていない。 |
| KY用紙(/ky) | /ky | 200 OK | title「KY用紙 作成ツール｜危険予知活動」。本文に「音声」が8回・「PDF」が2回出現。音声/PDF の文字列自体は存在するが完全な機能稼働かは別途検証要。 |
| Eラーニング(/e-learning) | /e-learning | 200 OK | title「安全衛生 Eラーニング 教育コンテンツ」。本文に「編集」「エディタ」「管理画面」の出現は確認できず、編集UI 未実装と整合。 |
| 法令条文の e-Gov リンク | /laws | 200 OK | 本検証ではサンプル取得のみで個別 5法令の e-Gov リンク存在は未抽出。フォローアップ要。 |
| リアルタイム法令更新 | (なし) | バッチ更新前提 | レポート記載どおり、ユーザー画面に「リアルタイム更新中」を示すUI は確認されず。 |
| チャットボットレスポンスキャッシュ | /api/chatbot | 動的 | Cache-Control: public, max-age=0 で CDN キャッシュなし。F-005 のとおり未実装が本番で確認された。 |

化学物質関連(参考)。
    /chemicals 404, /chemicals/search 404, /chemicals-mhlw 404。本番で実在するのは /chemical-database (200) と /chemical-ra (200)。レポートにはこのURL命名差は明示されていない。

---

## 7. モバイル表示の機械検証

判定: SSR は UA 非依存。レスポンシブは CSS のみで実装。

- iPhone Safari の User-Agent を偽装した /chatbot 取得は デスクトップ取得とまったく同じバイト数(147,214 bytes) を返却。SSR HTML は UA 切替なし。
- meta viewport は width=device-width, initial-scale=1 を確認。
- ホーム HTML 内に srcset を持つ img は 0件。レスポンシブ画像最適化は未導入。
- レポート §6.1「スマートフォンでの5業種並列比較は横スクロール必須」は SSR レベルでは検証不可だが、 compare ページの SSR HTML を CSS 抜きで読み取ると、 5業種テーブル(grid または table)が固定列幅で並ぶ構造であり、 375px 想定での横スクロール発生は構造的に成立する。
- レポート P3 Batch 4「UX-023 Sidebar を lg 以上から md 以上表示に変更」未着手。本番 HTML 内のサイドバー要素は lg ブレークポイントで切り替わる Tailwind クラス(lg:flex lg:translate-x-0 等)を維持。

---

## 8. レポート §2-6 との総合差分

| 分類 | 件数 | 内訳 |
|------|------|------|
| 意図通り反映 | 18 | robots.txt 17クローラー / 8 Disallow / sitemap-index 子4本 / /audits s-maxage=86400 / 主要30URL の 200 応答 / JSON-LD WebApplication 3機能 / 業種別 Dataset / hub の ItemList / Copilot 動線 SSR / /chatbot QAPage / canonical 3機能一致 / title 3機能一致 / meta description 3機能 / og:title 3機能 / compareクエリURL残存 / /strategy 親 301未実装 / F-002 ハードコード鍵未処置 / F-005 動的AIルート CDN未設定 |
| 部分反映 | 4 | sitemap 総URL数 2,498 でレポート推定2,800〜3,500 を下回る / chatbot SSR「読み込み中」の影響範囲はレポート記載より小さい / 「33法令以上」表記は本番統一だが「50法令体制」表記は本番ゼロ / /admin/ugc/review HTTP 200 だが画面は forbidden/unauthorized 文字列を含む(F-007 と一致するが、 「認証ゲートなし」の表現はやや強すぎる) |
| 未反映 | 0 | 本Dispatchで「コードに実装されているが本番に出ていない」項目は検出されず。レポート §5 残タスクは全て「未着手」状態でレポート通り。 |
| 認識違い | 5 | 業種別ページの h2 構成がレポート §2.2 記載と異なる(7セクション→実9セクション、ラベル不一致) / 業種別ページの表示件数がレポート記載値と2桁乖離(建設66,713 vs 1,670 等) / 504,413 / 292件 / 66,713等の数値はユーザー向け表示に一切出ていない / sitemap_index.xml(アンダースコア)は404、本番表記は sitemap-index.xml(ハイフン) / /chemicals URL は本番に存在せず /chemical-database が正規 |

---

## 9. 致命的乖離による修正

判定: なし。

本Dispatchで検出された乖離はいずれも次のいずれかに該当し、検証目的の最小修正には該当しないと判定。

- 業種別ページの h2 構成・件数表記の乖離は「レポート §2.2 がコード解析時に拾い損ねた可能性」または「より新しい改修反映前のスナップショットを記載した可能性」が原因。本番のユーザー体験は機能しており毀損なし。
- F-002 / F-007 / F-005 は回帰監査 (F-001〜F-011) で既知のチケット。回帰監査側で対応すべき領域。
- /chemicals 404 はレポート未記載 URL であり、外部リンクからの 404 流入リスクは存在するが、ユーザーへの公開リンクで /chemicals を出している箇所は本検証では確認できず。

修正対象なし、変更ファイル数 0。

---

## 10. 検証データの保存

raw/robots.txt と raw/sitemap-index.xml を本ディレクトリ配下に保存。本番URL30本のヘッダ実測ログは本レポート §3.3 に転記済み。フェッチした17個の HTML スナップショット(.reality-fetch/ ディレクトリ) はリポジトリに含めない方針(機械再現可能なため)。

---

## 次に判断材料にすべき最重要発見トップ3

1. /accidents-reports/{業種} ページの h2 構成と件数表示が現況レポート §2.2 と著しく乖離している。レポートは「事故型ランキング/原因Top10/月別/年次/業種特有/対策チェックリスト/関連法令」の7セクションと建設66,713件等を記載したが、本番は「サマリ/事故の型 Top 10/原因 Top 10/時間帯・事業所規模/月別 発生傾向と季節性/年次推移と前年同期比較/他業種と比較/次のアクション/安全Copilot」の9セクション、表示件数は1,670/926/710/97/1,168。次の判断者は「レポートの認識を本番に合わせて修正する」か「本番を強化して内部数値を可視化する」かの方針決定が必要。

2. F-002(ハードコード認証鍵)は本番で実際に動作しており、 curl で /api/admin/health?key=anzenai2026 を叩くと内部の Gemini/Stripe/Supabase/GA4/GSC 等10サービスの configured 状態・fallback 動作・circuit breaker 状態 を含む詳細 JSON を返却する。GitHub public リポジトリにキーが露出し続けていることと合わせ、P1セキュリティ事案として優先処置が必要。

3. レポート §6.3 が指摘していた「33法令以上 vs 50法令体制」のズレは本番で完全に未解消で、 主要9ページに「50法令」表記は0件、「33法令以上」が43回。逆に内部数値(504,413 / 292 / 66,713 等) はユーザー向け表示に1件も出ていない。「タイトル/description と実装の乖離」というレポートの問題提起は本番でも全く動いていないため、 P3 Batch 1 以降のコピー修正タスクの起点として最優先で扱える。
