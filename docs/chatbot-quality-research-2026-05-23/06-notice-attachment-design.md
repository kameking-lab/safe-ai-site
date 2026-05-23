# 通達・告示・リーフレット原文URL添付 設計

- 作成日: 2026-05-23
- 目的: 「通達・告示・リーフレットの原文URLを添付」(社長要求4)を実装
- 関連: 03-data-source-inventory.md(著作権)、04-hallucination-prevention-design.md

## 1. 現状の通達 DB 構造

### 1.1 ファイル

- web/src/data/mhlw-notices.ts: 約 1,069 件(AUTO-GENERATED FROM data/mhlw-notices.jsonl)
- ソース: data/mhlw-notices.jsonl(リポジトリ直下に存在想定)
- 自動生成: scripts/jsonl-to-ts.mjs

### 1.2 メタフィールド(MhlwNotice)

- id: string(例: mhlw-notice-0001)
- title: string
- noticeNumber: string | null(例: 基発0220号)
- issuedDate: string | null(ISO形式)
- issuedDateRaw: string | null(令和X年Y月Z日)
- issuer: string | null(例: 厚生労働省労働基準局)
- category: string(例: heat-stroke, chemicals, asbestos)
- categoryLabel: string(例: 熱中症、化学物質、石綿)
- subCategory: string
- docType: "通達" | "告示" | "指針"
- bindingLevel: "binding" | "indirect" | "reference"
- detailUrl: string | null(詳細ページ URL)
- sourceUrl: string | null(原文参照ページ)
- pdfUrl: string | null(PDF 直リンク)

### 1.3 リーフレット DB

- web/src/data/mhlw-leaflets.ts: 600件超
- メタ: id, title, publisher, publishedDate, target(general/worker/employer), category, sourceUrl, pdfUrl, detailUrl, pageCount, languages

### 1.4 MLIT 資料 DB

- web/src/data/mlit-resources.ts: 100件
- メタ: id, title, publisher, bureau, publishedDate, category, sourceUrl, pdfUrl, relatedLaws[], keywords[]

## 2. 設計目標

社長要求: 「通達・告示・リーフレットの原文URLを添付」

要件:
1. 条文と通達・告示・リーフレットを関連付けた構造化マッピング
2. 応答内で「この条文の関連通達はこちら」と原文URLを表示
3. URL は厚労省サイトの安定URL を優先、不安定なら別途スナップショット保管
4. UI 上で原文を新タブで開く動線

## 3. データ構造: 条文-通達マッピングDB

### 3.1 新規ファイル

web/src/data/article-notice-map.ts:

```ts
type ArticleNoticeMap = {
  // 条文ID(lawShort + articleNum)→ 関連通達ID配列
  [articleId: string]: {
    notices: string[];          // mhlw-notice-XXXX の id
    leaflets: string[];         // mhlw-leaflet-XXXX の id
    mlitResources?: string[];   // mlit-resource-XXXX(該当時のみ)
  };
};

export const articleNoticeMap: ArticleNoticeMap = {
  "労働安全衛生規則|第612条の2": {
    notices: ["mhlw-notice-1023", "mhlw-notice-1045"],  // 熱中症対策の通達
    leaflets: ["mhlw-leaflet-0234", "mhlw-leaflet-0301"],
  },
  "労働安全衛生法|第61条": {
    notices: ["mhlw-notice-0089"],
    leaflets: ["mhlw-leaflet-0056"],  // フォークリフト技能講習リーフレット
  },
  ...
};
```

### 3.2 マッピング初期収録

- 既存 PIN(55トピック)に該当する条文を優先整備(約55条文 × 1-3通達 × 1-3リーフレット)
- 初期目標: 200条文 × 平均2通達 = 400マッピング
- メンテナンス: 通達追加時にマッピングを同時追加

### 3.3 自動マッピングの可能性

- 既存 mhlw-notices.ts の category フィールド(heat-stroke, chemicals, asbestos 等)が条文カテゴリと整合
- 半自動マッピング: notice.category と article のキーワード/lawShort で対応付け
- 例: notice.category == "heat-stroke" → 安衛則第612条の2、安衛則第624条 等
- 推奨: 初期は手動マッピング(精度重視)、運用しながら自動マッピング候補生成

## 4. 応答フロー統合

### 4.1 現状(route.ts:230, 434-442)

- searchRelevantNotices(message, 3) で関連通達を独立検索(クエリベース)
- 回答末尾に【関連通達・告示】見出し付きで列挙
- 拘束力ラベル付き

### 4.2 改善案

二段階で通達を提示:

```
[条文ヒット] → article-notice-map で「この条文の通達」を取得
              + searchRelevantNotices(message) で「質問関連の通達」を取得
              ↓
   [Layer A] 条文に紐付く通達(主)
   [Layer B] 質問キーワードに合致する通達(補)
              ↓
   重複除外 → bindingLevel 順 → 最大5件
              ↓
   応答末尾に【関連通達・告示】+ URL リンク
```

これにより:
- 条文に明確に紐付く通達が最優先表示
- 質問キーワード経由でしか取れない通達も補完
- 該当条文がない Out-of-Scope ケースでも Layer B のみで提示可能

### 4.3 リーフレット表示

- 通達と同じ条文-リーフレット マッピングで取得
- 応答末尾に【関連リーフレット・教材】見出しで列挙
- target(general/worker/employer)を「現場用 / 管理者用 / 一般」とラベル表示
- pdfUrl をクリックで新タブで開く

例:
```
【関連通達・告示】
- 基発第0414001号(令和7年4月14日)・熱中症予防対策の徹底について(通達・行政解釈)
  https://www.mhlw.go.jp/...
- 安発第0306004号(令和6年3月6日)・改正安衛則の施行について(通達・行政解釈)
  https://www.mhlw.go.jp/...

【関連リーフレット・教材】
- 厚生労働省「STOP！熱中症 クールワークキャンペーン」リーフレット(現場用)
  https://www.mhlw.go.jp/content/001234567.pdf
- 中央労働災害防止協会「職場の熱中症予防」ポスター(現場用)
  https://www.jaish.gr.jp/...
```

## 5. 厚労省サイトの安定 URL 戦略

### 5.1 URL の安定性

厚労省サイトの URL パターン(調査結果):
- 通達 PDF: mhlw.go.jp/content/00XXXXXX.pdf — 比較的安定(数値 ID)
- 政策ページ: mhlw.go.jp/stf/seisakunitsuite/bunya/.../index.html — 改編で消えることあり
- 安全衛生情報センター(jaish.gr.jp): URL 構造が定期的に変わる傾向

### 5.2 推奨アプローチ

3つのオプション:

#### オプション A: e-Gov + 厚労省直リンクのみ

- 法令本文は e-Gov(laws.e-gov.go.jp/lawid/...) を直リンク
- 通達 PDF は mhlw.go.jp/content/... を直リンク
- リーフレット PDF も同上
- URL 切れ検出は別途(月次バッチで HEAD リクエスト → 404 検出 → 通知)

メリット: 実装シンプル、著作権リスク最小
デメリット: 通達ページが移動した場合に切れる

#### オプション B: スナップショット保管(Internet Archive 連携)

- 通達追加時に Internet Archive (web.archive.org) の Wayback API でスナップショット取得
- 原文URL + アーカイブURL の両方を保持
- 原文 URL 切れ時はアーカイブ URL にフォールバック

メリット: 切れ耐性
デメリット: Internet Archive 依存、応答が遅くなる可能性、サードパーティ依存

#### オプション C: PDF 本文を内部保管

- 厚労省 PDF を public/notices/ にダウンロード保管
- 自前 URL を提供
- 著作権: 政府標準利用規約で再配布可だが、トラフィック増の懸念

メリット: 完全な切れ耐性
デメリット: ストレージ、Vercel Blob 等の運用が必要、容量制限

#### 推奨

- オプション A を基本、重要通達(binding level = "binding" 等)のみオプション B を併用
- オプション C は Vercel Blob 上限(現状 BLOB_READ_WRITE_TOKEN を持っているため可)で実装可だが、まずはオプション A で運用、URL 切れの実頻度を計測してから判断

## 6. URL 検証の自動化

### 6.1 月次バッチで URL ヘルスチェック

- 全 mhlw-notices.ts と mhlw-leaflets.ts の sourceUrl + pdfUrl を HEAD リクエスト
- 404/410 を検出 → 自動 issue 作成 + 該当エントリにフラグ追加
- 実装: scripts/check-notice-urls.mjs(新規)、Cron で定期実行

### 6.2 既存 Vercel Cron との統合

- vercel.json の Cron 機能を使用(CRON_SECRET を既に持つ)
- 月初1日 03:00 JST 等に実行
- 結果を docs/notice-url-health-YYYY-MM.md に出力

## 7. UI 表示の改善案

### 7.1 既存 UI(ChatbotBody.tsx)

- 応答末尾に【関連通達・告示】を列挙(現状)
- bindingLevel ラベル表示済

### 7.2 改善案

- 通達カードコンポーネント(ChatbotNoticeCard)を新規導入
  - title + noticeNumber + 発出日 + 発出機関 + bindingLevel バッジ
  - 「📄 原文を見る」ボタン(新タブで pdfUrl を開く)
  - 「📋 詳細ページ」ボタン(detailUrl)
  - 「⚠️ 拘束力: 通達(行政解釈)」のような明示バッジ
- リーフレットカードコンポーネント(ChatbotLeafletCard)を新規導入
  - title + publisher + target(現場用/管理者用)
  - 「📕 PDFを開く」ボタン

### 7.3 折りたたみ vs インライン

- 通達 1-3 件: インライン展開
- 通達 4 件以上: 「すべての関連通達(N件)を表示」で折りたたみ
- リーフレットは常に折りたたみ(デフォルト3件表示、それ以上は展開)

これは オーナー判断必須(D2)とする。 実装はどちらでも可。

## 8. 想定精度・効果

- 通達原文URLの提示率: 既存 1,069 件のうち、PIN 対象 55 トピック関連の通達カバー率を初期 80%+ に
- ユーザー体験: 「条文だけでなく通達も原典で読める」という建設業向けの実務価値が向上
- ペルソナテスト失敗11件のうち、「通達/告示で答えがある」型(C2 夜勤暴力、C3 針刺し、E5 カスハラ)で △ → ◯ に近づく

## 9. 実装規模

- article-notice-map.ts の初期データ整備(200条文 × 平均2通達): 2日
- 通達検索フロー改修(2段階提示): 0.5日
- UI コンポーネント(NoticeCard, LeafletCard): 1日
- 月次 URL ヘルスチェックスクリプト: 0.5日
- テスト追加: 0.5日
- 合計: 3-5日

## 10. リスクと対策

- リスク1: 条文-通達マッピングの整備が手作業で時間がかかる
  - 対策: PIN 対象55トピック関連の通達から優先整備、それ以外は半自動マッピング(category 一致)
- リスク2: 厚労省 URL が大幅に変わると一斉に切れる
  - 対策: 月次ヘルスチェック + Internet Archive スナップショット保管(オプション B)
- リスク3: JAISH 等の著作権保護対象サイトへのリンクで誤解を招く
  - 対策: リンク先が「政府公式サイト」「中災防」等で区別。 mhlw-notices.ts に sourceType を追加(政府/公益団体/民間)
- リスク4: 通達本文の AI 生成要約が「JAISH 編集解説の置換」とみなされるリスク
  - 対策: 通達は title + noticeNumber + 発出日 + 拘束力 + URL の構造化情報のみ。 本文要約は生成しない

## 11. 著作権整理(再掲)

- 法令本文: 著作権法第13条で保護対象外。 e-Gov 直リンク + 引用は問題なし
- 通達原文: 政府標準利用規約(CC BY 4.0 互換)。 出典明記必須、改変なし、リンクは自由
- 厚労省リーフレット: 同上、リンクは自由
- JNIOSH 刊行物: 政府標準利用規約 + 帰属義務
- JAISH 編集解説: 著作権保護あり、リンクのみ、本文転載・要約禁止
- 建災防刊行物: 個別資料ごとに異なる、公開ページからのリンクは可

## 12. ベンチ拡張

- Notice Citation Rate: 通達引用の妥当性(noticeNumber + title が実在通達と一致)
- Article-Notice Mapping Coverage: PIN対象55トピック関連の通達カバー率
- URL Health Rate: 月次ヘルスチェックでの 200 OK 率
