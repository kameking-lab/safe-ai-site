# 07 全周の再棚卸し — S/A級フォロー・6月残課題・新規欠陥スイープ（2026-07-02）

診断のみ（コード変更なし）。判定材料 = git履歴（タグ `sprint-parallel-end-2026-06-14` 前後）・コード実査・本番実測（curl/Playwright）・build/lint実行。

**大前提の確認（実測済）**: 6/14タグ以降のコミットは185件、全て自動データ更新（jma / news-feed / e-Gov law revisions / MHLW月次速報）で**機能変更ゼロ**。つまり6/14時点の残課題は手つかずのまま現在に至る、という前提はgit上で正しい。

---

## 1. 6/11外部酷評 S/A級フォロー（現況判定）

### S級（5件）: 是正済3・部分2

| 項目 | 判定 | 根拠 |
|---|---|---|
| S-1 sitemap毒シェル31記事（canonical=トップ） | **是正済** | #507 sitemap-articles幽霊URL是正（記事正本を lib/articles に一本化）。本番実測は§3参照 |
| S-2 KYトップ等のCSR空シェル＋汎用メタ | **部分** | /ky は /ky/paper へ308恒久リダイレクト化（クエリ引継ぎ・`web/src/app/(main)/ky/page.tsx`）＋/ky/paper に固有metadata、/ky/morning は #525 で固有メタSSR化、/laws はSSR化（#500系）。**残: /signage/map（#466以降未更新・SSR406字のまま）、/for/construction の本文SSR仕上げ**（#500でクライアント差替えの沈黙は解消したがSSR本文量は未検証） |
| S-3 判例DB・新着・記録キットのsitemap不在 | **是正済** | #513（court-cases/whats-new/site-records追加）＋#574（事故個別ページ）。本番sitemap実測は§3 |
| S-4 モバイルLCP6〜10秒・CLS最大0.853 | **部分** | 第1弾完了（#500: app/loading.tsx削除＝Suspense焼き込み根治・auth隔離・対象3ページ /accidents /laws /whats-new で perf 91-94 / CLS 0.000 実測、docs/site-critique-2026-06-11/c1-mobile-perf-structural-2026-06-12.md）。**残: 第2弾＝残り11ページの再計測と個別是正（/equipment-finder CLS 0.853等）・/chatbot・/law-search の実測**（同docの「残課題」節のまま未着手） |
| S-5 サイト横断検索ゼロ | **是正済** | #514（検索インデックス）＋#518（/search・⌘K）＋#524（モバイル44pxトリガ）＋収載拡充（#552用語集・#561事故・#566条文・#571通達深リンク）＋#541（404ページにも検索） |

### A級（A-1〜A-7＋E-1/E-2/P4 = 10件）: 是正済6・部分3・未着手1

| 項目 | 判定 | 根拠 |
|---|---|---|
| A-1 robots.txt AI検索ボット全遮断 | **是正済**（オーナー決裁済） | #493 学習系/検索引用系の分離、#522 facebookexternalhit許可、#553 後発学習UA遮断拡張 |
| A-2 内部運用レポート公開 | **是正済** | #493 で7ルート撤去。**本番実測: /audits/hobby-recovery-forecast-2026-05-19 と /audits/site-status-2026-05-19 は404・sitemapにaudits 0件・コードにルートなし**（本日確認） |
| A-3 sitemap構造崩壊・lastmod固定 | **是正済** | #516（lastmod動的化・未来日cap）・#537（circulars子sitemap正本化・二重掲載撤去）・#547（index/equipmentのlastmod是正）・#556（freshness単一ソース化） |
| A-4 旧equipment ID 39件の幽霊sitemap | **是正済** | #509（保護具正本 getAllEquipment へ一本化） |
| A-5 a11y 93〜97頭打ち | **部分** | h1是正（#545 /chemical-ra・#506 KY印刷シート・#505 risk-prediction等）・44px化多数。ただし「aria-label必須のlint強制」「ページ単位でa11y100到達」の完了記録なし（柱C-11に残置のまま） |
| A-6 巨大1ページリスト | **是正済** | /circulars 初期件数制限（#508）・/court-cases 初期24件＋もっと見る（#523・26,000px→9,939px）・/whats-new は柱0で初期30件化済 |
| A-7 KY用紙モバイル操作集中 | **是正済** | #521（保存を主ボタン化・複製/共有/転記/印刷は「…」シートへ）＋#533（基本情報→危険→対策→確認の進行ナビ） |
| E-1 E-E-A-T監修者バイライン | **部分** | 本番実測: /guides詳細にPerson JSON-LD（労働安全衛生コンサルタント登録260022）＋可視監修表記、/articles にPerson authorあり。**一方、判例詳細は author=Organization のみ・通達詳細/FAQにも監修バイラインなし**。共通バイライン部品は未整備（該当コンポーネント0件）。BACKLOG柱C-8は未チェックのまま |
| E-2 コンサル相談CVパス | **未着手** | /contact 配下は critique 以前（#148）から変更なし。2タブ化・専門ページ下部の「コンサルタントに相談」カードとも未実装。BACKLOG柱C-10が未チェックのまま |
| P4 /accidents 出力手段ゼロ | **部分** | #520 で **/accidents-analytics・/accidents-reports** にCSV/要点コピー/共有/印刷ツールバー新設。**本番実測: /accidents 本体はレンダリング後DOMにも出力ボタンなし**（分析ページへの誘導バナーで代替） |

**S/A級の未了カウント: 15項目中、完全未着手1（E-2）＋部分5（S-2・S-4・A-5・E-1・P4）＝未了6件、是正済9件。**

---

## 2. 6月スプリント残課題の現況

情報源: BACKLOG-data/seo/ux-*.md（レーン正本）・BACKLOG.md（マスター・参照専用）・docs/fable-reexamination-2026-06-10/・docs/multilane-parallel-loops-2026-06-13.md。

### 未着手のまま残っているもの（6/14以降コミットゼロなので当然に残存）

1. **コーパス残: 一般法・指針等 約60フラグ**（BACKLOG-data 未チェック）
   - 全730エントリ監査（corpus-egov-full-audit-2026-06-10.md: 481フラグ検出）のうち、安衛則/安衛法（第2弾）＋衛生系規則群（第3・4弾: ボイラー・ゴンドラ・鉛・電離・粉じん・事務所・高圧・船員・じん肺・四アルキル鉛・石綿）は是正完了。**残るは一般法・指針等の約60フラグ**（機械監査でフラグ数再算出→多い順に法令単位で是正→「全コーパスe-Gov整合」宣言、が未実施）。
2. **教育資格DB監査残**（BACKLOG-data 未チェック）
   - skill-training.ts の捏造2件（特定粉じん作業主任者技能講習・高圧室内作業主任者技能講習）は #501 で是正済（§3で抜き取り検証済）。**残: licenses.ts（免許）・job-chief.ts（職長/作業主任者）の実在性・安衛令6条/20条の号番号・時間数の全件突合＋skill-training.ts 残エントリの号・時間数**（skill-training-fabrication-and-heat-notice-2026-06-13.md「残課題」節に明記）。
3. **S級残（柱C）**: 上記§1のとおり C-1第2弾（残り11ページのモバイルperf再計測・/equipment-finder CLS等）・C-4残り（/signage/map・/for/construction）・**C-8（E-E-A-T バイライン）・C-10（コンサルCV）・C-11（B/C級一括: description27ページ・視覚パンくず・データ鮮度表示ほか）**。
4. **柱0残**: バッチ8/9・9/9はレーンで完了済（#529・#527/#531/#535。マスターBACKLOGのチェック未反映はレーン運用の仕様）。レーン正本の残 = **/education-certification の3秒無読チェック**（BACKLOG-ux-records 未チェック1件。/ky/list・/ky/workers 分は PR #558 で回収済）。
5. **決裁B: Web Push設計ドラフト** — docs に該当ドラフトなし（`*push*`/`VAPID` 検索ヒットなし）。「設計ドラフトまでは自走可」だったが**未着手**。
6. **クロスレーン申し送りの取り逃し**: BACKLOG-data #538 の注記「synonyms.ts:166 気積→事務所則第14条は誤り（正は第2条・第14条は排水）」が**今も未修正**（`web/src/lib/rag/synonyms.ts:166` 実査で確認）。データ層は正したのに検索シノニムが誤条番号を指し続けている＝チャットボット/横断検索で「気積」を引くと誤条文に誘導され得る実害あり。
7. 軽微: scripts/audit/internal-link-graph.json の陳腐データ（#477削除ファイル残留・実害なし・「ついで処理」指定のまま）。

### 「済」抜き取り検証（3件・全て合格）

| 検証対象 | 方法 | 結果 |
|---|---|---|
| ① #501 技能講習DB捏造2件是正 | `web/src/data/education-rules/skill-training.ts` 実査 | **合格**。捏造2件は削除され、削除理由コメント付き（粉じんに作業主任者制度なし／高圧室内は免許制で licenses.ts の lic-koatsu-shitsunai-chief が正本、licenses.ts 側の実在も確認） |
| ② #493 内部運用レポート撤去 | 本番curl＋コード＋sitemap | **合格**。/audits 2ルートとも本番404・`app/(main)/audits` ルート不存在・本番sitemap.xml内 audits 0件 |
| ③ #569 石綿則コーパス条番号是正 | **e-Gov法令API v2 生データ（417M60000100021）と本日ライブ突合** | **合格**。第1条=事業者の責務・第19条=石綿作業主任者の選任・第27条=特別の教育・第36条=測定及びその記録・第44条=呼吸用保護具が、コーパス `web/src/data/laws/sekimen-kisoku.ts` の articleNum⇄articleTitle と完全一致（旧誤番号 第10条選任/第14条保護具/第36条特別教育 は全て是正されている） |

---

## 3. 新規の重大欠陥スイープ

### (b) build / lint（本日実行・web/）

- `npm run build`: **成功（エラー0）**。
- `npm run lint`: **エラー0・警告46**。内訳はほぼ「Unused eslint-disable directive（react-hooks/set-state-in-effect）」の残骸（site-records系client・favorites・elearning-progress-board等）＋ `ky-paper-view.tsx` の exhaustive-deps 2件＋ `patrol-client.tsx` の未使用import 1件。33件は `--fix` で自動除去可能。

### (c) 6/14以降の自動データ取込の品質（抜き取り）

- **jma**: `web/src/data/jma/*.json` は fetchedAt 2026-07-02T07:50Z（当日）。warnings/weather は47都道府県分のスキーマ整合・出典/ライセンス表記あり。earthquakes は items:[]（異常ではなく直近該当なしの形）。**健全**。
- **news-feed**: approved 23 / rejected 27（承認率46%）。approved/index.json 全23件に headline・source.url・score・provenance が揃いスキーマ欠損ゼロ。承認内容も労安関連（MHLW検討会・石綿労災速報値・労働災害動向調査等）で on-topic、明白な誤取込なし。**健全**。
  - 軽微な品質ゆらぎ: NHKの週次熱中症搬送数記事が5月は relevance 25 で却下、6/23の同種記事（月次まとめ）は 85 で承認と、LLM判定（gemini-2.5-flash）の一貫性が揺れている。壊れたデータではないが判定基準の明文化余地あり。
- **e-Gov law revisions / MHLW月次速報**: 取込コミットは正常に積まれている（eb372f49・9773f8df）。中身の抜き取りは未実施（低リスク・既存パイプライン）。

### (a) 本番20ページ巡回＋S/A級の本番実測

本番21ページ巡回（サブエージェントによるcurl＋Playwright実測。スクショ計27枚: scratchpad/shots/audit/ に desktop-*.png 22枚＋mobile-*.png 5枚）。

**巡回結果: 全21ページ200（リダイレクト経由含む）・"Application error"等ゼロ・空白ページゼロ・モバイル390pxのレイアウト崩れなし。コンソールエラーは1ページのみ。**

| パス | HTTP | 破綻 | コンソールエラー |
|---|---|---|---|
| / | 200 | なし | 0 |
| /ky → /ky/paper | 308→200 | なし | **1（React #418 hydration mismatch・毎ロード再現・デスクトップ/モバイル両方）** |
| /ky/morning | 200 | なし | 0 |
| /accidents ・ /accidents-analytics | 200 | なし | 0 |
| /chatbot ・ /circulars ・ /laws ・ /whats-new | 200 | なし | 0 |
| /court-cases ・ /heat-illness-prevention ・ /heat-illness-prevention/log | 200 | なし | 0 |
| /education ・ /guides ・ /chemical-ra ・ /site-records ・ /signage | 200 | なし | 0 |
| /foreign-workers ・ /e-learning ・ /search ・ /accident-news | 200 | なし | 0 |

（旧パス /revisions・/accidents/statistics・/chemical-substances・/elearning・/news は 404 または 308 で現行パスに整理済み）

S/A級の本番裏取り（§1の判定に反映済みの主な実測値）:
- sitemap.xml は381 URL・court-cases詳細100件超/whats-new/site-records配下10ページ収載、sitemap-articles.xml は実記事10件のみ・旧 /articles/lr-real-* は404化・self-canonical化（S-1/S-3裏取り）。
- /ky/paper はSSR HTMLにh1「作業前 危険予知活動表（KY）」＋固有title/description/canonical（S-2裏取り）。
- robots.txt は学習系23種Disallow／AI検索系（OAI-SearchBot・ChatGPT-User・Claude-User・Claude-SearchBot・PerplexityBot等）Allowの二層（A-1裏取り）。
- /circulars は収録1,069件に対し初期SSR24件＋「さらに表示」（A-6裏取り）。

### 新規欠陥（今回の発見・タスク化対象）

1. **［新規・要調査］/ky/paper で React error #418（hydration mismatch）が毎ロード発生**: 中核機能ページ。表示破綻は未確認だが、SSR/CSR不一致はLCP要素の再描画・柱C-1で直したCLSの再劣化リスク。SSR/CSRで分岐する値（日付・localStorage・乱数系）が第一容疑。
2. **［新規・情報露出］/handover（引き継ぎ書）が本番でHTTP 200・誰でも閲覧可能**: noindex,nofollow＋robots Disallowでインデックスは防止済みだが、URL直打ちで内部運用情報に到達できる。A-2（内部文書撤去）の同類残党。
3. **［既知残の実害確認］synonyms.ts:166「気積→事務所則第14条」誤マッピング**（§2-6）: データ班が#538で正した条番号に検索シノニム層が追随しておらず、本番の「気積」検索/チャットボットが誤条文（第14条=排水）へ誘導し得る。
4. 軽微: lint警告46件（§3-b）・news-feed LLM判定のゆらぎ（§3-c）。

---

## 4. タスク化候補一覧

各: 目的 / 完了条件 / 優先度 / 想定規模。

### P0（本番の正確性・信頼に直結）

1. **synonyms.ts 気積の誤条番号是正**
   - 目的: 「気積」検索/チャットボットが事務所則第14条（排水）へ誘導される誤案内を止める（データ班#538の申し送り取り逃し）。
   - 完了条件: `lib/rag/synonyms.ts:166` を第2条へ是正＋rag回帰テスト緑。
   - 優先度: P0 ／ 規模: S（1行＋テスト）。
2. **教育資格DB残監査（licenses.ts / job-chief.ts ＋ skill-training残エントリ）**
   - 目的: 本番公開中の資格・教育DBの捏造/誤記リスク根絶（skill-trainingで実際に捏造2件が出た前科あり）。
   - 完了条件: 全エントリを安衛令6条/20条・各規程とe-Gov機械突合し、snapshotテストで恒久固定。
   - 優先度: P0 ／ 規模: M（法令単位分割・2〜4イテレーション）。
3. **コーパス最終弾: 一般法・指針等 約60フラグ是正**
   - 目的: 「全コーパスe-Gov整合」を宣言できる状態にする（残る最後の未整合ブロック）。
   - 完了条件: 機械監査で法令別フラグ再算出→全是正→スナップショット固定→宣言をdocsに記録。
   - 優先度: P0 ／ 規模: M。

### P1（新規欠陥＋S/A級の未了消化）

3b. **/ky/paper の React #418（hydration mismatch）是正**（新規発見）
   - 目的: 中核機能ページの毎ロードhydrationエラーを根絶し、柱C-1で獲得したCLS 0.000の再劣化リスクを断つ。
   - 完了条件: SSR/CSR分岐値（日付・localStorage初期値・乱数系が第一容疑）を特定して是正、本番相当ビルドでコンソールエラー0を確認。
   - 優先度: P1 ／ 規模: S〜M（原因調査込み）。
3c. **/handover の公開閉鎖**（新規発見・情報露出）
   - 目的: 引き継ぎ書（内部運用情報）へのURL直打ち到達を塞ぐ（A-2内部文書撤去の同類残党。noindexは済みだがアクセス制御なし）。
   - 完了条件: ルート撤去（docsへ退避）または認証ゲート化。本番404/403を確認。
   - 優先度: P1 ／ 規模: S。
4. **柱C-8: E-E-A-T監修者バイライン敷設（残り面）**
   - 目的: YMYL隣接の法令コンテンツに「誰が書いたか」シグナルを配信面で出す。/guides・/articles は実装済みなので残り面への横展開。
   - 完了条件: 共通バイライン部品（氏名・労働安全コンサルタント登録260022・aboutリンク）＋Person JSON-LDを**通達詳細/判例詳細/FAQ**テンプレートに配線（判例詳細は現状 author=Organization のみ）。
   - 優先度: P1 ／ 規模: S〜M（部品1個＋配線）。
5. **柱C-10: コンサル相談CVパス**（未着手のA級）
   - 目的: 受注ポートフォリオとしての「この人に頼みたい」を受け止める器を作る。
   - 完了条件: /contact 2タブ化（同一Formspree・件名プレフィックス）＋専門ページ下部に相談カード。
   - 優先度: P1 ／ 規模: S。
6. **柱C-1第2弾: モバイルperf残り11ページの再計測と個別是正**
   - 目的: 第1弾の全域是正（loading.tsx削除等）で「大半は無修正で改善しているはず」の仮説を実測で確定し、残る個別問題（/equipment-finder CLS 0.853、/chatbot・/law-search のコーパスclient検索）を潰す。
   - 完了条件: 11ページのLighthouseモバイル実測記録＋perf90未満ページの是正（ページ直下Suspense＋useSearchParams同型パターン約20ファイルの点検を含む）。
   - 優先度: P1 ／ 規模: M〜L。
7. **柱C-4残り: /signage/map・/for/construction のSSR/固有メタ仕上げ**
   - 完了条件: 両ページのSSR本文・generateMetadata整備、静的HTML検査で確認。
   - 優先度: P1 ／ 規模: S。
7b. **柱C-7残り: /accidents 本体への出力ボタン**（P4部分残）
   - 目的: 元請の「月例会議資料に貼る」を着地ページで完結させる（#520の /accidents-analytics 実装を本体一覧・集計ブロックへ横展開）。
   - 完了条件: /accidents の集計/検索結果にCSV・要点コピー・共有URLの3ボタン、本番DOMで確認。
   - 優先度: P1 ／ 規模: S〜M。

### P2（磨き・運用）

8. **柱C-11: B/C級一括**（description50字未満27ページ・視覚パンくず・404後続・データ鮮度表示・aria-label lint強制 ほか） — P2 ／ S×多数（ついで消化可能な粒度に分割済み）。
9. **決裁B: Web Push設計ドラフト作成**（自走可能な範囲＝docsのみ。実装はVAPID鍵待ち） — P2 ／ S。
10. **/education-certification 3秒無読チェック**（ux-recordsレーン残1件） — P2 ／ S。
11. **lint警告46件の掃除**（33件は`--fix`可・ky-paper-view の exhaustive-deps 2件は手当） — P2 ／ S。
12. **news-feed LLM判定の一貫性ガイド**（週次熱中症搬送記事の判定ゆらぎ是正: 承認基準をプロンプトに明文化） — P3 ／ S。
13. **internal-link-graph.json 再生成**（陳腐データ・「ついで処理」指定） — P3 ／ S。
