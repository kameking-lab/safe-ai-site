# 安全AI：AdSenseの審査視点による品質修正と再レビュー用記録

対象: https://www.anzen-ai-portal.jp / 基点: `a9e27880a32f05a92ed1c5a40b73c4611b7fe867`（PR1067）。調査開始は2026-10-11、追加の一次資料照合は2026-10-12 JST。申請は審査中のまま維持する。この変更はdraft PR用で、本番公開・申請取り下げ・重複申請を行わない。

Googleの内部審査理由や合格を推定していない。確認するのは、利用者が目的を達成できるか、根拠と表示が一致するか、独自の実用価値があるか、広告に適さない状態を広告対象にしていないかである。[独自コンテンツと使いやすさ](https://support.google.com/adsense/answer/12176698?hl=ja)、[価値の低い画面](https://support.google.com/publisherpolicies/answer/11112688?hl=ja)、[複製コンテンツ](https://support.google.com/publisherpolicies/answer/11190248?hl=ja)、[誤解を招く表示](https://support.google.com/publisherpolicies/answer/11185754?hl=en)を判断の参照にした。noindexは広告品質や内容品質の改善そのものを代替しない。

## 既存修正との照合

- PR1066の文脈9項目・回答フィードバック、PR1067の印刷用GHS全分類・CAS表示・絵表示・部分データ表示は、本番HTMLと基点コードを照合した。これらを今回の新規成果に数えない。
- 10/8回復計画と10/11機能別UXレビュー、親のAstraによる本番独立レビューを入力とした。
- NITEのGHSリンクは実際に到達するため、当初のリンク切れ疑いを撤回した。URLの変更は行っていない。
- 入力・未完成機能・設定等に広告を出さない既存の広告許可範囲を維持した。JMAの定期更新を追加・復活していない。KY連携の新規実装はない。

## 独立レビューの7項目と対応

| 優先度 / 欠陥 | この変更での対応 | 再レビューで残る確認 |
|---|---|---|
| P0 回転刃物の軍手質問が電気盤へ誤分類され、訂正後も低圧資格の回答を反復 | 回転刃物・手袋の文脈を優先。ボール盤等の複合語を電気盤と判定しない。訂正後の電圧・古い選択肢を除去し、安衛則111条の条件付き禁止を回答 | 「ボール盤で穴あけするとき、軍手を使ってよいですか？」と、電気回答からの訂正を実画面で再実行 |
| P1 10/1法改正カードの要約が日付・タイトルだけで空の節を表示 | 個人ばく露測定について、改正前後・適用条件・現場で確認する3項目と一次資料を収録。全事業場への一律測定義務と誤記しない。未収録カードの空見出しを非表示 | 安衛法と安衛則の2カードを開き、通達と対象作業・資格の対応を再照合 |
| P1 現行版未確認の重要根拠があっても先頭で資格を断定 | e-GovのCurrentEnforced版、保存本文hash、確認日を別の記録に固定。重要根拠のどれかが未確認なら先頭結論を保留。本文hashだけで現在性を保証しない | フォークリフトの安衛法61条＋安衛令20条、過去・将来日付、Q&A未確認時の保留 |
| P1 品質表示の8/1日付と監修表示の範囲が曖昧 | 8/1は公開URL台帳の確認日と明記。現行本文の機械照合、AI評価、外部専門家のレビューを区別。一般ガイドの一律「コンサルタント監修」を撤去 | 実績・監修・人数・資格の新しい裏付けのない表示がないか |
| P1 RA印刷が条件やSDSを失い、CSVには未使用NaNや内部キーが出る | RAを「参考情報・条件記録」とし、作業・時間・換気・SDS・不足・未評価・参照資料を保持。旧保存で復元不能なら明記。計算CSVを日本語ラベルと単位にし、未使用入力を除外。旧法面入力エラーと45度境界の注意文も修正 | 保存記録の再印刷、条件を多く入れた長い記録、複数ページ、グレースケール |
| P1 RSS中心の速報・薄い化学詳細が独自の意思決定価値を十分に示さない | 報道件数を記事数と明記し、続報を事故件数と混同しない。広範な内容拡充や重複事故の同定は未完了 | **未解決**。少数の一次資料を個別に読み、対象条件・現場での確認事項・収録範囲を追加する次の内容改善が必要 |
| P1 未実装の予測・年間計画、運営用統計、設定ページが一般利用者の目的と合わない | 旧予測を主要ナビから除き、事故分析画面は実在の安全確認へ案内。運営用統計は公開利用者に短い案内と公式統計の入口を表示。会社設定の実際の3利用先を明示し、メール配信などの未提供機能を誇張しない。設定2ページと未完成特集3ページをnoindex・sitemap非収載 | **部分対応**。新しい機能や独自記事の実装完了を意味しない。保護具候補・年間計画の実用性は追加レビュー対象 |

## 一次資料の照合

- `web/src/data/laws/current-revision-verification.json`: 主要25法令の公式CurrentEnforced版と、全条スナップショットの本文hashを一致確認した。差異のあった10法令は公式本文から再取込し、検索用66抜粋と回答用2,944条を再生成した。検索pin・同義語・公開件数も更新。fresh評価のQ88・Q90は公式現行番号へ機械的に更新し、質問・判定閾値・保留分類は変更していない。過去の公開評価スナップショットは更新していない。
- `web/src/data/laws/primary-current-verification.json`: 電気関連6抜粋、石綿告示第1項、安衛則563条の補完本文の計8件を再照合。石綿告示に欠けていた定義・適用条件を公式本文へ差し替えた。563条は全条本文と、従来の取込処理が落とすSubitem2を別々に照合した。
- 資料の取得日を単に今日へ書き換えない。確認日はJSTで扱い、hash・版・URLの変更、確認日前への遡及、31日超の期限、historical指定では確認済みとしない。回答基準日は2026-10-12 JSTに固定し、実行時計による自動延長をしない。
- これらは機械的な本文・版照合であり、専門家の解釈・適用確認ではない。経産省電工Q&Aの旧PDFはHTTP403で再取得できず、熱中症ガイドラインの要約は今回逐語再照合していない。両者を今回の確認済み件数に加えない。Q&Aに依存する工事士不要の判断は保留し、確認済みの感電防止条文の回答は維持する。

参照: [安衛則](https://laws.e-gov.go.jp/law/347M50002000032)、[ボール盤と軍手の厚労省事例](https://anzeninfo.mhlw.go.jp/hiyari/hiy_0391.html)、[基発0730第2号](https://www.mhlw.go.jp/content/11300000/001736054.pdf)、[安全衛生特別教育規程](https://www.mhlw.go.jp/web/t_doc?dataId=74085000&dataType=0&pageNo=1)、[石綿事前調査者告示](https://www.mhlw.go.jp/web/t_doc?dataId=74ab7748&dataType=0&pageNo=1)。

再照合の再現コマンド（webディレクトリ、Node 22.13以降）:

```powershell
node --experimental-strip-types scripts/etl/verify-current-legal-revisions.mjs <一時証拠ディレクトリ>
node --experimental-strip-types scripts/etl/verify-primary-legal-excerpts.mjs <一時証拠ディレクトリ>
node scripts/etl/build-legal-preservation-manifest.mjs
```

照合不能・版不一致の資料を現在扱いへ昇格しない。生の公式応答は一時ディレクトリへ保存し、リポジトリには確認記録と本文のみを収録する。

## 検証と印刷例

- 関連108テストファイル: **2,658 / 2,658成功**。JSON/SSE、訂正、文脈選択肢、電圧・充電状態、引用の主張単位、過去/将来/未確認版、計算、化学物質、保存、公開範囲、サイトマップを含む。
- 条番号更新・公開件数・現行基準日の追加9テストファイル: **151 / 151成功**。凍結済み電気質問72件とチェックサムは変更していない。
- `tsc --noEmit --incremental false`: 成功。
- 変更ソース84ファイルのESLint: エラー0・警告3（既存ref cleanup 1、生成ファイルの不要なeslint-disable 2）。
- 実APIを使う印刷Playwright: **3 / 3成功**。トルエン7分類、アセトン5分類、エタノール6分類。いずれも作業時間1時間と不足事項を保持し、A4各1ページ。PDF本文抽出とPopplerのページ画像による目視確認で、欠落・重なり・確認欄だけの孤立ページがないことを確認した。
- `git diff --check`: 成功。
- 全ユニットテスト892ファイル: **8,183成功・2skip・未解消の失敗0**。全体実行では8,171成功・12失敗・2skip。その12件は参照資料の読込時点・未展開画像・改正前gold条番号で、環境と正解の2条番号を修正後、該当8ファイル34件を再実行して成功した。全体をもう一度まとめて再実行した結果ではない。

下のJSONブロックに、PDFのページ数・本文確認・SHA-256を収録した。機械可読JSONの原本はリポジトリ外の一時証拠フォルダにも保存した。試験入力のPDF原本はローカルの `../safeai-adsense-quality-evidence-20261011/audit-evidence/pdf/chemical-{CAS}.pdf` に保存し、リポジトリの証拠ディレクトリ除外方針に従ってコミットしない。

## 実行環境と公開前の未確認事項

隔離worktreeを使用した。共有checkoutへのreset/clean/stash/一括add、大容量コピー、新しい有料API、権限拡張を行っていない。既存node_modulesを参照し、ローカルproduction buildは実行していない。依存の実体はNext 16.3.5、package.jsonは16.2.11のため、通常のクリーンCI buildを別途確認する。

全体テスト用の画像・講習資料は基点Gitのblobと一致する334ファイルを確認して既存コピーを参照した。必須アイコン等の小さなファイルのみ約1MBを展開した。チワワの画像・UIは変更していない。draft PRの完全なpreviewで実物を確認し、広告の許可画面、スマホ、印刷、相談メール起動を親のAstraで再レビューする。メール送信・ログイン・申請操作は行わない。

今回のコード修正だけでサイト全体の独自価値が十分になったとは結論しない。下記の追加修正・編集解説を含め、最終previewで親のAstraによる独立レビューが必要である。

## Astra追加指摘の修正と実物確認

親のAstraは `48bc4a9473e390187bfb187ede7f411f0c833473` の限定的な否定除外、保存後の実記録再取得、元記録保護、厚労省2事例の原典照合を独立確認し、新しい公開阻止所見なしとした。その後の短いUI補足として、保存記録の印刷ボタン付近に「変更を印刷に反映するには保存してください。」を追加した。未保存編集では原本を印刷する仕様を変更していない。

- 「電気の配線ではなく、ボール盤の回転刃への軍手の巻き込まれ」「ボール盤の感電ではなく、回転刃に軍手が巻き込まれる」は、旧電気文脈が残る誤答をJSON/SSEで再現した。明示的に否定した電気作業語だけを分類から除外し、残る配線・結線・感電防止の相談は電気作業として扱う。旧2表現と追加2表現の新規/訂正×JSON/SSEの実HTTP16ケース、フォークリフト0.8t/1tの両経路4ケースで本文・条文・基準日を確認した。未確認版を保留する既存fixtureも対象単体テストで維持した。
- 保存RAを1時間/SDS旧版から8時間/SDS-v2へ編集して別記録保存すると、元の復元payloadを印刷する不具合を修正。保存後に実際の保存レコードをローカルで読み、画面の印刷対象・記録日・再読み込みURLを同じ新記録へ更新する。元記録は上書きしない。未保存の編集では元の印刷条件を保持する。クラウド同意なしでは送信ゼロ。
- 架空の長い印刷試験入力（作業25行・既存対策18行・追加案22行・保護具12行、長い製品版文字列）を実APIから保存/復元/編集/再保存/再読込。A4 **3ページ**を全文抽出・全ページ目視し、77行・8時間・SDS-v2・2026-10-20の記録日・未確認/未評価・出典が欠けないことを確認。試験日付は固定時計による架空日付であり、実際のRA実績ではない。
- コンクリート10m×5m×0.2m、ロス5%、積載4.5m³の画面/CSV/1ページPDFが、正味10m³・ロス込み10.5m³・3台・最終車1.5m³で一致することを確認。積載量0では旧結果・印刷を消去する。375pxでチャット/RA/法改正/相談種別切替に横あふれがなく、相談を送信しないことを確認。
- 10月の2改正の要点・対象条件・対応・改正前後の一次資料リンクと、未解説の有機則カードに空の対応/業種見出しを出さないことを実ブラウザで確認した。
- 化学詳細（トルエン/アセトン）は、引火性液体の日本語ラベル、部分収録、収録データ版、原典取得日時未収録、製品SDS第2/3/8項の確認、同じCASのNITE原典を表示。物質が異なる/偽装されたURLはリンクに使わない。新たな濃度値・分類や製品への適用判定を追加しない。
- 事故速報は、厚労省No.100003/100005の過去事例2件について、確認できた経過・原典で分からない点・自社条件を折りたたみで追加。原典に発生日の記載はない。No.100005の隔離済み旧データは感電/重傷になっていたため墜落/死亡へ訂正したが、人手確認whitelistを拡張せず詳細ページの404を維持する。直近RSSの裏付けや件数には使わない。原典の「安全帯」の旧手法を現在の設備へそのまま適用させない。
- CIのMRR一致検査の原因は、通常ベンチマークがコミット済み `docs/rag-metrics-latest.json` を上書きし、並列テストの順番で公開値と不一致になることだった。公開値と10/8原本（MRR 0.8756535947712418）は一致している。通常テストの書き込みを止め、明示した `RAG_METRICS_REPORT_PATH` へだけ現在の測定を出力する。原本・公開値・判定閾値は変更しない。照合日も一致検査へ加えた。
- 追加コア検証6ファイル189件成功。その後の**全892ファイル再実行は8,195成功・2skip・失敗0（全8,197件）**。さらに化学詳細2ファイル10件、事故出典4ファイル20件と最終訂正1ファイル2件を検証した。型検査、追加差分lint、CI/previewの最終結果は下の記録とPRに記載する。

追加原典の取得HTMLはコミットせず、SHA-256を記録する。

- No.100003: `60e3e695c91aa3e9f4029bf331f5f321e58bd9a89ce7be566e097a2022c14e4d`
- No.100005: `d32d3cf902fc42bdf0291676665bc7e51cacd64c2150948f0cb840eab304d2ba`
- 長い保存RA PDF（3ページ）: `7953e7d8f540ea23e61a9a3fc81fad8e6d28dc3484be0b94f179497082a79922`

## 最終CIで検出した限定修正

`87af6317` のクリーンCIでは、全892テストファイルが **8,200成功・2skip・失敗0（全8,202件）**、本番ビルド・厳格CSP・容量ガード・Vercel Preview生成が成功した。E2Eは339成功・1skip・3失敗、smokeは39成功・1失敗・後続3件未実行だった。原因は次の2点である。

- 化学物質RAの検索前の説明が189文字となり、既存の130文字上限を超えていた。説明とチワワの案内を短くし、公的情報・条件の整理、リスク値を計算しないこと、公式CREATE-SIMPLEと最新の製品SDSを使うことを保持した。上限を変更していない。
- live smokeが、先頭の未解説カードにも旧見出し「3行要約」「対象業種」を要求していた。実際に解説を収録した個人ばく露測定の改正カードを指定し、変更点・第三管理区分等の適用条件・現場対応・一次資料リンクと、空の業種見出しを出さないことを検査するよう改めた。

失敗した3検査だけを実ブラウザで再実行し、**3 / 3成功**。追加2ファイルのlintと `git diff --check` も成功した。全件再監査は行っていない。失敗時だけのCIコメント投稿は既存トークンの権限不足で403だったが、権限を拡張せず、テストの原因を修正した。この限定修正後のコミットに対する最終CI結果はPRとリポジトリ外の検証記録へ追記する。

## 機械可読な検証記録

非実行用JSON・画像の125ファイル制限に合わせ、短い検証記録は本Markdownへ集約する。容量ガードの制限は変更していない。

```json
{
  "baseCommit": "a9e27880a32f05a92ed1c5a40b73c4611b7fe867",
  "relatedUnitTests": {
    "files": 108,
    "tests": 2658,
    "passed": 2658,
    "failed": 0
  },
  "typecheck": "passed",
  "printPlaywright": {
    "passed": 3,
    "failed": 0
  },
  "pdfEvidence": [
    {
      "cas": "108-88-3",
      "ghsClassifications": 7,
      "pages": 1,
      "pageSizePoints": [
        594.95996,
        841.91998
      ],
      "sha256": "fff48182bc66d075af2919e6b85626526feb510423dcfc66f12f9d8e8e122398",
      "sizeBytes": 115780,
      "casPresent": true,
      "durationOneHourPresent": true,
      "unassessedNoticePresent": true,
      "inputAndMissingFieldsPresent": true,
      "visualReview": "Poppler page images inspected; no overlap, clipping or orphan signoff page",
      "localEvidenceFile": "../safeai-adsense-quality-evidence-20261011/audit-evidence/pdf/chemical-108-88-3.pdf"
    },
    {
      "cas": "67-64-1",
      "ghsClassifications": 5,
      "pages": 1,
      "pageSizePoints": [
        594.95996,
        841.91998
      ],
      "sha256": "69e5ee8ff4544a80b633bc55f6548ccfa6f7b35b9ee48a66d781b585c380ec91",
      "sizeBytes": 112350,
      "casPresent": true,
      "durationOneHourPresent": true,
      "unassessedNoticePresent": true,
      "inputAndMissingFieldsPresent": true,
      "visualReview": "Poppler page images inspected; no overlap, clipping or orphan signoff page",
      "localEvidenceFile": "../safeai-adsense-quality-evidence-20261011/audit-evidence/pdf/chemical-67-64-1.pdf"
    },
    {
      "cas": "64-17-5",
      "ghsClassifications": 6,
      "pages": 1,
      "pageSizePoints": [
        594.95996,
        841.91998
      ],
      "sha256": "a3b9759b7615128d7634e31f9cc789f95ed163dfed311468ebc358f8e0b976df",
      "sizeBytes": 113212,
      "casPresent": true,
      "durationOneHourPresent": true,
      "unassessedNoticePresent": true,
      "inputAndMissingFieldsPresent": true,
      "visualReview": "Poppler page images inspected; no overlap, clipping or orphan signoff page",
      "localEvidenceFile": "../safeai-adsense-quality-evidence-20261011/audit-evidence/pdf/chemical-64-17-5.pdf"
    }
  ],
  "productionBuild": "Clean CI builds passed on c3d9772; final followup check results are linked on draft PR1068",
  "productionDeployment": "not performed",
  "adsenseApplication": "unchanged; pending",
  "remainingReview": [
    "Final head CI completion; core changes independently reviewed by parent Astra"
  ],
  "additionalPropagationTests": {
    "files": 9,
    "tests": 151,
    "passed": 151,
    "failed": 0
  },
  "changedSourceLint": {
    "files": 84,
    "errors": 0,
    "warnings": 3
  },
  "assetReuse": {
    "filesMatchingBaseBlobs": 334,
    "copies": "read-only use of existing assets; about 1MB of small files materialized"
  },
  "fullUnitTests": {
    "method": "Full 892-file run, followed by rerun of eight affected suites after materializing missing verification assets and updating two renumbered gold citations",
    "files": 892,
    "tests": 8185,
    "passed": 8183,
    "failed": 0,
    "skipped": 2,
    "rerunFiles": 8,
    "rerunTests": 34,
    "rerunPassed": 34,
    "rerunFailed": 0,
    "originalFullRun": {
      "passed": 8171,
      "failed": 12,
      "skipped": 2
    }
  },
  "previewDeployment": {
    "firstCommit": "941300f0d8c1665548902343a5ba704300f31b7f",
    "initialStatus": "ignored by existing storage deployment guard",
    "cause": "Adding one non-runtime audit JSON exceeded the 125-file count budget",
    "resolution": "Consolidate compact verification JSON in the existing audit Markdown; keep raw evidence outside Git"
  },
  "astraFollowup": {
    "coreUnit": {
      "files": 6,
      "tests": 189,
      "passed": 189
    },
    "fullUnit": {
      "files": 892,
      "tests": 8197,
      "passed": 8195,
      "failed": 0,
      "skipped": 2,
      "scope": "before final chemical/accident editorial additions"
    },
    "incrementalUnit": [
      {
        "files": 2,
        "tests": 10,
        "passed": 10
      },
      {
        "files": 4,
        "tests": 20,
        "passed": 20
      },
      {
        "files": 1,
        "tests": 2,
        "passed": 2
      }
    ],
    "http": {
      "rotatingToolNewAndCorrection": 16,
      "forkliftBranches": 4,
      "transports": [
        "JSON",
        "SSE"
      ],
      "passed": 20
    },
    "browser": {
      "regressionCases": 8,
      "method": "seven passed in full run, remaining source-case boundary corrected and passed in targeted rerun",
      "unresolvedFailures": 0,
      "longRaRealApi": 1,
      "shortRaRealApi": 3,
      "cloudRequestsWithoutConsent": 0,
      "inquirySubmissions": 0,
      "viewportWidth": 375
    },
    "longRaPdf": {
      "pages": 3,
      "sha256": "7953e7d8f540ea23e61a9a3fc81fad8e6d28dc3484be0b94f179497082a79922",
      "uniqueInputLines": 77,
      "allInputLinesPresent": true,
      "editedCopyDurationHours": 8,
      "editedCopySdsVersion": "SDS-v2",
      "originalRecordUnchanged": true,
      "allPagesVisuallyChecked": true
    },
    "concrete": {
      "input": {
        "lengthM": 10,
        "widthM": 5,
        "heightM": 0.2,
        "lossPercent": 5,
        "truckCapacityM3": 4.5
      },
      "screenCsvPdfMatch": true,
      "pdfPages": 1,
      "netVolumeM3": 10,
      "volumeWithLossM3": 10.5,
      "truckCount": 3,
      "finalTruckVolumeM3": 1.5,
      "capacityZeroClearsOldResult": true
    },
    "metricsRace": {
      "publishedSnapshotPreserved": "2026-10-08T14:33:32.233Z",
      "publishedMrrPreserved": 0.8756535947712418,
      "ordinaryTestWritesHistoricalReport": false,
      "explicitExportVariable": "RAG_METRICS_REPORT_PATH"
    },
    "newEditorial": {
      "verifiedPastCaseNotes": 2,
      "caseIds": [
        "100003",
        "100005"
      ],
      "humanWhitelistExpanded": false,
      "case100005DetailStatus": 404,
      "chemicalDetailCases": [
        "108-88-3",
        "67-64-1"
      ]
    },
    "printNotice": {
      "parentIndependentReviewedCommit": "48bc4a9473e390187bfb187ede7f411f0c833473",
      "unitFiles": 2,
      "unitPassed": 15,
      "unitFailed": 0,
      "longRaBrowserPassed": 1,
      "pdfPages": 3,
      "allPdfTextMatchesPriorVerifiedPdf": true
    }
  }
}
```
