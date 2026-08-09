# 安全資格Eラーニング設計書（2026-08）

最終更新: 2026-08-09 JST
対象: 安全AIポータル / 次の資格
公開原則: 公式一次資料に結び付かない正答・選択肢解説は公開しない

## 1. 結論

旧履歴から、安全資格向けの問題データ約2,510問と `/exam-quiz` 系engineを発見した。ただし、問題群には権利記録、公式URL、公式正答との機械照合、法令版、各誤答肢の一次根拠がなく、現行の監査資料もAI生成facsimileとして削除対象にしていた。したがって旧問題本文はProductionへ戻さず `private_draft` とする。

第一弾は次の方式で新規構築する。

- 協会の公表問題・正答PDF: `permission_required`。Gitへ保存せず、公開UIは `link_only`。
- e-Gov法令: `public_domain`。独自問題のatomic fact根拠に利用。
- 厚生労働省作成資料: `official_open_license`。出典・加工表示を行い、第三者素材は除外。
- 問題文・選択肢・解説: `user_authored` の独自表現。
- runtime生成AI: 使用しない。
- 自動採点: 選択式だけ。記述式は公式PDF、論点チェック、関連法令、個人メモだけを提供し、採点・模範解答・合否予測を行わない。
- 学習状態: Reactのtab内メモリだけ。`localStorage` へ時間・進捗・streak・履歴を書かない。

## 2. 第一弾公開範囲

| courseId | 資格 | 選択式科目 | 初期公開目標 |
|---|---|---|---:|
| `first-class-health-officer` | 第一種衛生管理者 | 関係法令、労働衛生 | 4問 |
| `second-class-health-officer` | 第二種衛生管理者 | 関係法令、労働衛生 | 4問 |
| `occupational-safety-consultant` | 労働安全コンサルタント | 産業安全一般、産業安全関係法令 | 4問 |
| `occupational-health-consultant` | 労働衛生コンサルタント | 労働衛生一般、労働衛生関係法令 | 4問 |

第一種・第二種作業環境測定士は、公式一覧と最新PDFへの権利安全な学習resourceを先行表示する。自動採点問題は各選択肢の根拠収集と独立review完了後にだけ追加する。

初期問数は網羅性ではなく監査可能性を優先した最小セットである。問数を増やすときもreview manifest単位で追加し、自動公開しない。

## 3. 権利マトリクス

公開可能な原文は `user_authored`、`explicit_reuse_permission`、`official_open_license`、`public_domain` だけとする。

| rightsStatus | 原文公開 | link | Production問題 |
|---|---:|---:|---:|
| `user_authored` | 可 | 可 | 可 |
| `explicit_reuse_permission` | 条件内で可 | 可 | 可 |
| `official_open_license` | 条件内で可 | 可 | 可 |
| `public_domain` | 可 | 可 | 可 |
| `link_only` | 不可 | 可 | 不可 |
| `permission_required` | 不可 | 可 | 不可 |
| `unknown` | 不可 | 原則不可 | 不可 |
| `prohibited` | 不可 | 条件確認 | 不可 |

安全衛生技術試験協会のリンク方針はリンクを原則自由としているだけで、問題・選択肢・正答の転載、翻案、商用教材化を許諾していない。著作権法36条も、実際の試験問題としての必要範囲の利用であり、試験後のWeb問題集化の根拠にしない。

## 4. Source registry

`web/src/data/safety-elearning/source-registry.json` は次を必須とする。

```text
sourceId, publisher, sourceType, sourceUrl, sourcePdfUrl,
examName, qualificationId, subject, examDate, publicationDate,
questionNumber, officialAnswerAvailable, officialExplanationAvailable,
rightsStatus, checkedAt, contentHash, lawVersionAsOf, active
```

運用規則:

1. 一覧URLを主source、変更され得るPDF URLを補助sourceとして保持する。
2. PDF/HTML本文は `.cache/safety-elearning/` にのみ置き、Gitへ入れない。
3. `contentHash` はremote変更検出に使い、公開画面や完了報告に表示しない。
4. `active=true` はHTTP 200確認済みかつ内容一致した一次資料だけ。
5. 協会PDFの `officialExplanationAvailable` は全て `false`。
6. 免許試験の実施日は推測せず、判明している実施期間をnoteで分離する。
7. コンサルタント法令科目の出題基準日（2025-04-01）と現在法（2026-08-09確認）を別フィールドで扱う。

## 5. Atomic source facts

解説がLLMの記憶へ退行しないよう、問題とは別にatomic fact registryを持つ。

```ts
interface SafetySourceFact {
  factId: string;
  sourceId: string;
  claimKey: string;
  paraphrasedFact: string;
  locator: string;
  validFrom: string | null;
  validTo: string | null;
  checkedAt: string;
}
```

- `claimKey` は一つの意味に固定する。
- `validFrom` は確認に用いた現行法令版の基準日であり、規定の制定日・初回施行日を意味しない。
- 同じfactを別の意味で使うための別ID採番を禁止する。
- `sourceFactIds` が空の選択肢解説はbuildを失敗させる。
- factの意味と解説の整合は完全自動判定できないため、独立review manifestを必須にする。

## 6. 問題schema

```ts
interface SafetyQuestion {
  questionId: string;
  qualificationId: string;
  subjectId: string;
  sourceMode:
    | "verbatim_allowed"
    | "original_source_grounded"
    | "official_link_exercise"
    | "private_draft";
  sourceQuestionId: string | null;
  sourceYear: number | null;
  sourceQuestionNumber: number | null;
  questionText: string;
  choices: readonly { choiceId: string; text: string }[];
  officialCorrectChoiceIds: readonly string[];
  answerEvidenceIds: readonly string[];
  explanationByChoice: readonly {
    choiceId: string;
    verdict: "correct" | "incorrect";
    shortReason: string;
    detailedReason: string;
    sourceFactIds: readonly string[];
    officialLinks: readonly string[];
    verified: boolean;
  }[];
  officialSourceLinks: readonly string[];
  lawSources: readonly {
    sourceId: string;
    locator: string;
    sourceFactIds: readonly string[];
  }[];
  lawAsOf: string;
  currentLawAsOf: string;
  currentLawChanged: boolean;
  rightsStatus: SourceRights;
  reviewStatus: "draft" | "source_verified" | "independently_reviewed";
  generatedAt: string;
  verifiedAt: string;
}
```

追加固定値:

- `interactionType`: `single_choice` のみを公開manifestへ入れる。
- `shuffleMode`: 初期版は全問 `fixed`。法令説明と表示順のずれを防ぐ。
- `answerAuthority`: `official_primary_source_fact`。この表示は「協会公式問題の正答」を意味せず、独自問題の正答が公式一次資料のfactから機械的に決まることを示す。
- `sourceQuestion*`: 独自問題は `null`。協会問題の番号や場面を推測対応させない。

UIでは独自問題を「協会公式問題」「公式過去問」と表示しない。

## 7. Publish validator

build前とunit testで次をfail-closedに検証する。

1. schema、enum、foreign key、ISO日付。
2. questionId、choiceId、sourceId、factId、claimKeyの一意性。
3. 正答IDがchoice集合の部分集合で1件以上。
4. `choices` と `explanationByChoice` が1対1。
5. 正答・全誤答の各解説に、解決可能な `sourceFactIds` と公式HTTPS linkが1件以上。
6. `verified=true`、`reviewStatus=independently_reviewed`、review manifest収載。
7. law effective rangeが `lawAsOf` を包含し、現行確認が `currentLawAsOf` と一致。
8. `currentLawChanged=true` のとき「出題当時」「現在」の両説明を必須化。
9. `private_draft` と記述式が自動採点manifestへ0件。
10. exact duplicateと正規化duplicateが0件。
11. `link_only` / `permission_required` の原文がpublic bundleへ0件。
12. raw PDF commitが0件。
13. learning routeからAI SDK、AI endpoint、runtime fetchが0件。
14. active source linkのstored statusが200。network link checkはrelease gateで再実行。
15. review manifestにない問題がProductionへ0件。

協会の公式正答がない問題を「公式過去問」として自動採点することは0件とする。独自問題は、公開法令factから一意に導かれる正答をvalidatorと独立reviewで固定する。

## 8. 問題engineの状態機械

```text
unanswered -> selected -> incorrect -> unanswered -> selected -> correct -> next
```

- 初期表示は資格名、科目、`n問目 / N問`、問題文、選択肢だけを優先する。
- 誤答時: 選択肢、「不正解」、1〜3文の理由、根拠、`もう一度選ぶ`。`次へ` は出さない。
- 正答時: 「正解」、正しい理由、必要な誤答肢の短い理由、根拠、`次へ`。
- 誤答後も同じ問題で正答できる。
- sessionの初回正答数と誤答questionIdだけをメモリに持ち、終了時に誤答問題を再出題できる。
- reloadやtab終了後の復元は行わない。個人情報を保存しない。
- 1〜5で選択、Enterで回答。正答後のEnterだけ次問へ進める。
- input/textarea/select/contenteditable/IME入力中はshortcutを無効化する。
- feedbackは `aria-live=polite` / `aria-atomic=true`。色だけで正誤を伝えない。
- feedback、次ボタン、次の問題見出しへfocusを管理する。

## 9. Responsive / accessibility / offline

- 390pxで横overflow 0、44px以上のtap target、長いURLは折返す。
- dark、forced colors、reduced motionをCSSで明示する。
- native `fieldset` / `legend` / radioを基本とする。
- page titleとh1を資格ごとに固有化し、Next.js route announcerを働かせる。
- Service Workerは `/e-learning/safety` 配下だけをnetwork-firstでversion cacheする。一度オンラインで開いたコースだけoffline再利用可能とし、公式外部リンクはオンライン必須と表示する。
- cached画面にはsource確認日と法令基準日を表示し、最新法令と誤認させない。

## 10. 記述式resource

安全コンサルタントの機械・電気・化学・土木・建築安全、衛生コンサルタントの健康管理・労働衛生工学は自動採点対象外とする。

表示可能:

- 協会公式問題PDFへのlink
- 一般的な答案構成手順
- 関連法令へのlink
- ユーザー自身の一時メモ欄
- 「公式正答なし・非採点」の短い表示

メモはcomponent memoryだけで、保存、採点、送信をしない。

## 11. 永続学習記録の撤去

安全AIポータル:

- 旧 `safe-ai:elearning-progress:v1` は削除しない。
- 公開UIから読み込まず、新規書込み・削除を停止する。
- `/education/progress` は `/e-learning` へ退避し、時間・累積・詳細進捗を公開しない。
- 旧Eラーニングpanelのattempt保存effectを除去する。
- App shellの「進捗保存」訴求を除去する。

次の資格:

- 現行runtimeには学習時間・streak・学習履歴のstorageがないため、新設しない。
- `my-calendar:v1`、`credentials:v1`、`profile:v2` とprofile v1 read-only migrationを保持する。
- 受験予定、保有資格、カレンダー、資格力scoreを壊さない。
- 既存migrationは変更・削除せず、runtime未使用legacy schemaと文書化する。

## 12. 「次の資格」mapping

safe-ai-siteのProductionを先に公開し、HTTP 200と資格名・courseIdを確認後にcalendarをactive化する。

mappingは完全URLを明記し、slugから推測生成しない。

```text
qualificationId, qualificationSlug, destinationUrl, courseId, title,
httpStatus, contentMatch, verifiedAt, active
```

優先順位:

1. IPA -> 既存 `kakomon-ai.jp` mapping（変更しない）
2. 安全資格 -> `www.anzen-ai-portal.jp` の検証済み実在course
3. 内部course
4. 公式無料教材
5. 書籍

初期mappingはcalendarに存在する3資格（第一種・第二種衛生管理者、労働安全コンサルタント）から開始する。労働衛生コンサルタント等を資格masterへ追加する場合は、資格データ自体の一次情報監査を別gateとし、学習URLだけを理由に架空masterを追加しない。

## 13. Source adapter

adapterは次の段階を持つが、自動公開機能を持たない。

```text
discover -> classifyRights -> extractQuestionAndAnswer
-> collectOptionFacts -> validate -> manualReviewManifest -> publish
```

採用条件:

- 公式一次情報
- 問題と公式正答が公開
- 試験年度が明確
- 安定URLまたは追跡可能な親一覧
- rights分類可能
- 正答を機械検証可能

`autoPublish` は常に `false`。IPAは既存連携済みのため今回再収集しない。

## 14. Release gate

Next.js 16.2.11でwebpack buildと明示的なdynamic renderingを組み合わせても、Firefox／WebKitの実測ではframework scriptとRSC inline scriptへのnonce付与を確認できなかった。したがって既定では互換CSPのみを強制し、偽陽性になる厳格Report-Onlyは送信しない。`strict-dynamic`を含む厳格CSPは、Chromium・Firefox・WebKitでframework scriptを含む全scriptのnonce付与とconsole error 0を再確認し、明示的なverified gateを有効にした場合だけ強制へ昇格する。

- lint / TypeScript (`tsc --noEmit`) / unit / build
- 全question/rights/answer/evidence/law/descriptive/duplicate/leakage validator
- learning record removal / localStorage migration / safety mapping validator
- external link check / SEO audit
- Playwright Chromium / Firefox / WebKit / 390px mobile
- wrong -> no advance、correct -> next、keyboard、focus、live region
- console/page error、hydration warning、duplicate ID、invalid ARIA 0
- local Production build smoke後、Vercel Productionでも同じcourseを再実行
- safe-ai-siteを先にmerge/deployし、calendar mappingは公開course確認後にmerge/deploy
- 独立read-only reviewで不合格なら同じrunで修正し再実行

## 15. 監査境界

- この設計は専門家・法務監修の代替ではない。
- `verifiedAt` は記録された範囲の一次資料照合日であり、資格試験全範囲の正確性保証ではない。
- source更新または法令revision変更を検知した問題は自動非公開にし、人手reviewへ戻す。
