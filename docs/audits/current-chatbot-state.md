# 安衛法AI 現在状態

基準日: 2026-08-09 JST
状態: **リリース候補の独立レビューPASS（full gate・Preview・本番は未実行）**

## 独立レビュー対象snapshot

- Source HEAD: `cb3b56075c398ea241bfa7af6985d9a8b764bba9`
- Reviewed working-tree diff fingerprint: `df01ce3270d766712bdcd8f1f1ec6d6ab45908fb`（`git diff --binary | git hash-object --stdin`）
- 固定電気holdout: 72/72ケース・88ターン PASS
- 固定SHA-256: `122fc6dffb7dbd08a6665bf276883f2fefc7f8010730cb7803f25d66faca3554`

fingerprintは独立レビューに渡したworking-tree差分を識別する値であり、この監査文書自体の後続更新は含まない。

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

## 現在までのcandidate検証

- 固定電気holdout: 72ケース・88ターン PASS。
- 空contextからの電気分類: 67/67 PASS。明示read-only context fixture: 5/5 PASS。
- AI OFFのactual JSON routeでも72/72と命題対応引用支持率100%を確認した。
- deep quick reply round-tripは51/51 PASS。このうち既存main 14分野で実際に生成したquick replyは39/39 PASSで、全件を次ターンへ入力して検証した。
- main 14分野はJSON 14/14、SSE 14/14 PASS。answer-first、同じ質問・chipの反復なし、domain維持、無関係domainへの遷移なし、privacy誤遮断なし、公開context 9キー限定を確認した。
- domain-first口語・短文25件をJSON/SSEの両経路で確認し、answer-first、主要分岐、公式根拠、無関係法源poison抑制をPASSした。
- exact citation claim検査は19/19 PASS。strict semantic citation、既知条件の再質問、低圧距離の誤断定、行為の膨張、否定条件反転の各poison回帰もPASSした。
- 最新対象Vitest: 12ファイル・1,246テスト PASS。
- 実装担当と分離した読み取り専用の独立レビューはPASS。open P0=0、P1=0、P2=0、P3=0。
- 72ケース・88ターンをdeployed browser SSE/UIで評価するPreviewテストは実装済みだが、保護Previewではまだ実行していない。

これらは候補snapshotの対象検証と独立レビューであり、最終full gate、保護Preview、本番smokeの代わりではない。

## リリース進捗

| 項目 | 状態 |
|---|---|
| 固定holdout | PASS |
| 対象ローカルテスト | PASS |
| full gate | PENDING |
| 独立レビュー | PASS（P0=0 / P1=0 / P2=0 / P3=0） |
| Preview | PENDING |
| Production反映 | PENDING |
| production smoke | PENDING |
| commit / push / production tag | PENDING |

緊急時遮断、PII外部送信前遮断、AI OFF、provider timeout、根拠不足時のfail-closedは維持しているが、最終判定はfull gateとPreview、本番smokeの完了後に更新する。
