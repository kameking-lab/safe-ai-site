# 安衛法AI 現在状態

法令・回答基準日: 2026-08-09 JST
リリース観測日: 2026-08-10 JST
状態: **Production反映・production smoke PASS**

## 最終リリース対象snapshot

- Release candidate / Production source: `0f46b01ffd45e4a5e5572096f116933b2027fbe1`
- Release candidate tree: `4fd843a4c2e4667a7da7947dde2c9e87a78a2640`
- Audit evaluator source: `5e8cc33ee655067e041f84f50adc0ff166017985`
- 固定電気holdout: 72/72ケース・88ターン PASS
- 固定SHA-256: `122fc6dffb7dbd08a6665bf276883f2fefc7f8010730cb7803f25d66faca3554`

Release candidate treeはGitHub CIのPR merge treeと一致し、最終PreviewとProductionのsource commitも同一である。監査評価器は製品候補へ混入させず、deployment-disabled audit branchで固定した。

## 今回の修正範囲

- 通常応答を `directAnswer`、`assumptions`、`importantConditions`、`citations`、`clarificationQuestion`、`quickReplies`、`confidence`、`effectiveDateStatus` の契約へ統一した。
- 電気作業を、行為・電圧区分・充電状態・知りたい制度に分ける意味モデルを追加した。
- 同一タブ内では安全な構造化条件だけを保持し、follow-upを直前の電気文脈と結合する。ブラウザー/API境界の公開契約は `topicDomain`、`workAction`、`equipment`、`voltageClass`、`energizedState`、`roleType`、`qualificationType`、`workDate`、`confirmedChoices` の9キーだけであり、自由文会話と個人情報は永続化しない。
- 質問分類だけで応答を確定せず、意味モデルを検索クエリへ反映し、公式一次資料を行為・電圧・充電状態との対応で順位付けする。
- 回答は、現時点で分かる具体的な答え、主要条件、必要な場合だけ確認質問1件、回答内容に対応するquick reply最大3件の順で合成する。
- 電気工事士、電気取扱業務の特別教育、電気主任技術者、作業指揮者、作業主任者を別制度として扱う。
- チャットUIは自然文を先に表示し、根拠を1つの折りたたみに集約した。選択肢はcompact chip、回答後フィードバックは小型表示とした。
- ホーム、法令検索、資格finder等からは、URL・storage・analyticsへ生質問を残さない同一タブ1回限りのmemory handoffを使う。

## 電気分野の公式根拠

2026-08-09時点の一次資料として、e-Gov法令検索、厚生労働省、経済産業省の資料だけを正本にした。主な対象は労働安全衛生法、労働安全衛生法施行令、労働安全衛生規則、特別教育規程、電気工事士法・同施行令・同施行規則、電気事業法、経済産業省の電気工事士法Q&Aである。

実装上の境界は次のとおり。

- 見る、表示を確認する、異音・異臭を確認するだけなら、それだけで一律に国家資格が必要とは扱わない。
- 低圧の特別教育は、低圧充電電路の敷設・修理と、区画された場所で露出充電部のある開閉器を操作する業務を対象として扱う。低圧の測定・点検すべてが当然に対象とは断定しない。
- 高圧・特別高圧の充電電路または支持物の敷設、点検、修理、操作は特別教育の対象範囲として扱う。
- 配線の接続・取外し等は電気工事に該当し得るため、電気工事士制度を別に判定する。
- 電気主任技術者は事業用電気工作物の保安監督制度であり、個々の作業者に必要な免状・教育の代替とはしない。
- 電気作業全般に一律の作業主任者が必要とは扱わず、安衛則第350条の作業指揮者等と区別する。

## 固定holdout

- 名称: `electric-chatbot-holdout-2026-08-09`
- 固定時点: 実装修正前
- ケース数: 72
- 総ターン数: 88
- SHA-256: `122fc6dffb7dbd08a6665bf276883f2fefc7f8010730cb7803f25d66faca3554`
- 結果: 72/72 PASS
- 初回分類の評価対象: 67件、67/67 PASS
- 明示的なread-only電気文脈fixture: 5件
- 安全補正ledger: 1件
- first-turn useful answer率: 100%
- answer-first率: 100%
- substantive answer率: 100%
- pure clarification率: 0%
- context retention率: 100%
- irrelevant quick reply率: 0%
- unrelated domain jump: 0件
- 引用支持率: 100%
- 施行日整合率: 100%

各ケースの意味評価結果は `current-chatbot-evaluation.csv` に記録した。生の質問文や長文回答は収録していない。

固定質問のうち `EL-020`、`EL-031`、`EL-038`、`EL-070`、`EL-072` は、質問単体に電気domainを確定できる語がない。この5件だけは明示的なread-only電気文脈fixtureとして回答品質を評価し、残る67件は空の初期文脈から実分類を評価する。これにより、裸の「作業主任者」等を電気へ誤分類しても合格する偽陽性を防いだ。

`EL-047` のfrozen期待値 `visual-inspection` はholdout/checksumを変更せずledgerで `unknown` へ安全補正した。「配線は触らない」は否定条件であり、「盤外から見るだけ」という肯定的な行為を意味しないためである。最終contextは `workAction=unknown` と `confirmedChoices=配線非接触` を保持し、残る行為分岐を回答する。

引用評価は、URL、法令名、条番号、markerの一致だけで合格させない。回答中の法的命題に対応する項・号・該当抜粋が存在するかを検査し、正しいURL等を残したまま本文だけを別命題へ差し替えるpoisonテストが失敗を検出することも固定した。

## 最終検証

- 固定電気holdout: 72ケース・88ターン PASS。
- 空contextからの電気分類: 67/67 PASS。明示read-only context fixture: 5/5 PASS。
- AI OFFのactual JSON routeでも72/72と命題対応引用支持率100%を確認した。
- deep quick reply round-tripは51/51 PASS。このうち既存main 14分野で実際に生成したquick replyは39/39 PASSで、全件を次ターンへ入力して検証した。
- main 14分野はJSON 14/14、SSE 14/14 PASS。answer-first、同じ質問・chipの反復なし、domain維持、無関係domainへの遷移なし、privacy誤遮断なし、公開context 9キー限定を確認した。
- domain-first口語・短文25件をJSON/SSEの両経路で確認し、answer-first、主要分岐、公式根拠、無関係法源poison抑制をPASSした。
- exact citation claim検査は19/19 PASS。strict semantic citation、既知条件の再質問、低圧距離の誤断定、行為の膨張、否定条件反転の各poison回帰もPASSした。
- 最終full gateは13/13 PASS。Vitest 7,346件、Playwright 256件、privacy Playwright 2件がPASSした。
- GitHub CI performance budgetは51/51 Lighthouse runを採用し、`/laws` のclient JavaScriptは269,836 bytes（上限275,000 bytes）でPASSした。
- 保護Preview `dpl_2scBM6D1pHaMr2M4GT8cxTVvaY7e`（build `bld_3t5ukph6k`）で、JSON APIとbrowser SSE/UIを各72/72ケース・88/88ターン検証した。主要率はすべて100%、raw question leakは0件だった。
- 追加固定12ケースはbrowser・JSON・legacyでPASSし、通常質問30件のanswer-first、substantive answer、context retention、clarification correctness、citation supportはいずれも100%だった。
- Previewのchatbot POSTは211件、external AI使用0件、Preview mode欠落0件、監査failure 0件だった。Preview保護は `all_except_custom_domains`、監査後のbypassは0件だった。
- 実装担当と分離した読み取り専用の最終独立レビューはPASS。open P0=0、P1=0、P2=0、P3=0。
- Production `dpl_5LLzyucARx7TGaLj9PrfTQsyKJNm`（build `bld_cxrh3jgpr`）はsource `0f46b01ffd45e4a5e5572096f116933b2027fbe1`でREADYとなり、`https://www.anzen-ai-portal.jp/` に反映された。
- Production smokeは同一Productionを264/264 PASS（生成時刻 `2026-08-10T11:29:00+09:00`）。Attempt 1は旧progress契約とfocus raceによる監査側のfalse-negativeであり、監査ロジックを独立診断・修正して再実行した。
- push後の `web-ci` はsmokeをPASSした。full jobは35分上限で250件時点にキャンセルされたが、事前full gateは256件PASS済みで、CIのNext開発server再起動で白画面となった1件と未実行7件はexact candidateのproduction modeで再実行して全件PASSした。

## リリース進捗

| 項目 | 状態 |
|---|---|
| 固定holdout | PASS |
| 対象ローカルテスト | PASS |
| full gate | PASS（13/13、Vitest 7,346、Playwright 256 + privacy 2） |
| 独立レビュー | PASS（P0=0 / P1=0 / P2=0 / P3=0） |
| Preview | PASS（`dpl_2scBM6D1pHaMr2M4GT8cxTVvaY7e`） |
| Production反映 | PASS（`dpl_5LLzyucARx7TGaLj9PrfTQsyKJNm`） |
| production smoke | PASS（264/264） |
| commit / push / production tag | PASS（`production-20260810-answer-first`） |

緊急時遮断、PII外部送信前遮断、AI OFF、provider timeout、根拠不足時のfail-closedを維持したままリリースを完了した。rollbackは不要で、直前Production `dpl_87jKmHESX4ta9fdn4pmqbXF6erqt` を復旧対象として記録した。定期書込みworkflowは2026-08-10T11:55:21.4088794+09:00に、リリース前activeだったMHLW・e-Gov・news-feedの3本をactiveへ復帰し、リリース前から停止中だったJMAは `disabled_manually` を維持した。
