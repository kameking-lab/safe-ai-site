# 03. 法改正データ源調査（最重要）

監査日: 2026-05-28 / 結論: **e-Gov 法令API v2 で「構造データの自動取得」が新規env無し・誤読リスク低で実現可能**

## 3.1 公式データ源の評価一覧

### ◎ e-Gov 法令API v2（推奨・本命）
- URL: https://laws.e-gov.go.jp/api/2/ （Swagger: /api/2/swagger-ui）
- 利用条件: **無料・登録不要・APIキー不要**。データは**政府標準利用規約2.0（商用利用可、出典明示が条件）**
- 形式: **JSONネイティブ**（v2は2025-03-19リリースで簡易JSON対応）
- 本監査で実呼び出し検証済（`/api/2/laws`・`/api/2/keyword`）。`revision_info`が以下の**構造データ**を返す:
  - `law_title` / `abbrev` / `category` / `law_num`（法令番号）
  - `amendment_promulgate_date`（改正公布日）
  - `amendment_enforcement_date`（施行日）
  - `amendment_scheduled_enforcement_date`（施行予定日）
  - `amendment_enforcement_comment`（施行時期の注記＝「公布の日から起算して…政令で定める日」等）
  - `amendment_law_title` / `amendment_law_num`（改正法令名・番号）
  - **`current_revision_status`（`UnEnforced`＝施行前 / `CurrentEnforced`＝施行済）** ← 施行前/施行済の区別がそのまま取れる
  - `updated`（最終更新ts）/ `mission`（New等）/ `repeal_status`
- **誤読リスク: 低**。取得するのは「法令名・番号・公布日・施行日・施行状況」という**形式（事実）データのみ**。条文内容の解釈・要約は行わない＝月次速報ETLの「形式検証＋未確認明記＋推測値禁止」をそのまま適用可能
- 既存パイプライン適合: `revisions-ingest/parse.ts`の`officialDbRevisionImportMapper`が`lawId/enforcedAt/promulgatedAt/actNumber`を吸収する設計。e-Gov v2形状への小マッパー追加で接続可

### ○ 厚労省 新着情報 RSS（https://www.mhlw.go.jp/stf/news.rdf）
- **⚠️ 規約上、RSSコンテンツのWebサイト/メルマガ用の再配布は禁止**。**verbatim再掲は不可**
- 用途は「内部での新着検知のトリガー」に留めるべき。既存の報道feedはGeminiジャッジ＋出典URL＋AI要約で扱うが、**厚労省RSSの見出しそのものの再掲は避ける**（doc11で詳述）

### △ 官報（インターネット版官報 https://kanpou.npb.go.jp/）
- 公布情報の一次源だが、**機械可読APIは提供されておらず**、PDF/画像中心でスクレイピングは規約・技術の両面でハードルが高い。本Phase対象外（e-Govが公布日・法令番号を構造化提供するため代替可能）

### △ 厚労省 法令等データベース（https://www.mhlw.go.jp/hourei/）
- 通達・告示の検索はあるが**安定API無し**。試行運用の検索のみ。自動取込には不向き

### △ パブリックコメント／労政審 安全衛生分科会
- 改正の「予告・検討段階」。HTML構造が不安定で誤読リスク高。**自動取込は非推奨**、手動キュレーション＋公式リンクが安全

## 3.2 自動取得ETLの設計（e-Gov v2、月次速報パターン流用）

```
GitHub Action（月次cron、無料枠内）
 → scripts/etl/egov-revisions-fetch.ts
   1. 労働安全衛生関連の対象 law_id リスト（安衛法/安衛則/特化則/有機則/…）を順次 /api/2/laws?law_id= で取得
   2. revision_info から構造データのみ抽出（公布日/施行日/施行状況/法令番号/category/updated）
   3. 形式検証: 日付形式・必須フィールド・URL妥当性。欠損は「未確認」明示、推測で埋めない
   4. 直近（公布日 or updated が一定期間内）に絞って JSONL 化
   5. diff-only commit（差分が無ければコミットしない＝ビルドコスト削減）
 → 既存 revisions-ingest（e-Gov v2 マッパー）→ normalize → LawRevision → 既存UI
```

- **新規env不要**（e-Govは鍵不要）。`REVISIONS_REAL_SOURCE_*`はリモートfetch用だが、ETLは**ビルド時にJSONLを生成しコミット**する月次速報方式を採るため、本番fetchも不要
- 出典明示（政府標準利用規約2.0）: 各レコードに`source_url`（e-Gov該当法令ページ）＋「出典: e-Gov法令検索」を必須付与
- 解釈は一切しない。「やさしい解説」は別途**手動キュレーション記事**（既存`data/articles/*.json`）＋AI要約（公式誘導必須、doc07）で担保

## 3.3 法改正追跡の実現可能性

- **構造データ（いつ・どの法令が・公布/施行・施行前後）の自動取得: 実現可能性 90/100**（e-Gov v2で検証済）
- **改正内容の解釈・要約の自動化: 実現可能性は低く設計しない**（誤読＝信用毀損）。要約はAI補助＋公式誘導に限定（doc07）

## 3.4 誤読リスク評価（社長確定要件#3）

- 形式データ（日付・番号・施行状況）取込: **低リスク**（事実の機械転記、形式検証で担保）
- 「施行前/施行済」判定: e-Govの`current_revision_status`を**そのまま使用**（自前判定でなく公式値）＝低リスク。補助的に`今日 vs 施行日`でバッジ表示する場合も、公式の施行日を表示し断定解釈はしない
- 内容要約: **高リスク**。AI要約は「公式条文・官報で必ず確認」を必須付記し、断定回避

## 3.5 結論

**e-Gov法令API v2 が本ミッションの中核を解決する**：鍵不要・商用可・JSON・施行状況付き。既存の成熟したingest/UI資産に「e-Gov v2マッパー＋月次取込Action＋施行前/済表示」を足せば、「いつ・どの法律が・どう変わったか・施行前後」を自動かつ低誤読で提供できる。官報/パブコメは自動化せず公式リンク誘導に留める。
