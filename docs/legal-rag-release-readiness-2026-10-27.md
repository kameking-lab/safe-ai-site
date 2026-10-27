# 5法令RAGの配備準備・更新方針

この候補は本番 `bbc4bb73` と整合した `db0b708d` の続き。変更はローカルのみで、push、Actions再実行、有料API、DB反映、Vercel build/deploy、本番環境値の変更は行わない。

## データ配置と起動

- 保存済みの5法令・2026-10-26・2,187文書を、内容を変更せずgzipへ格納した。原JSONは24,948,799 bytes、圧縮956,094 bytes。展開SHA256は `426e545590de90c0f66302a59b326c0eee83d8cd999c2b8535c48931510a6acb`。再取得・原本上書きなし。
- 配置は `web/src/data/legal-supplements/five-law-2026-10-26-426e545590de.json.gz`。public配下ではなく、Nodeサーバーだけが読む。JSON/SSE/no-JS/原文閲覧の4ルートに、選択中の1ファイルだけをoutputFileTracingIncludesで指定する。
- `legal-supplement-release.json` がrelease ID、圧縮/展開hash、size、対象日、5法令の履歴ID/原XML hashを固定する。既存lab manifestとの一致も検査する。
- 既定OFF。将来の有効化には `SAFE_AI_LEGAL_SUPPLEMENTS_RELEASE=five-law-2026-10-26-426e545590de` の完全一致が必要。`SAFE_AI_LOCAL_SUPPLEMENTS=true` 単独ではproduction/Vercelを有効にできない。preview/stagingは常にOFF。
- `SAFE_AI_LEGAL_SUPPLEMENTS_DISABLED=true` を優先し、温まったcacheも返さない。環境値は実行時に再確認するが、Vercel管理画面でのenv変更が稼働中deploymentへ即時反映すると仮定しない。停止時は、環境値を適用したdeploymentまたは既知の前版へ戻す操作を別途承認・検証する。
- 誤ったrelease IDを設定した場合、対象質問は「検証済み資料を読み込めない」と保留する。別の本文で補わない。原文閲覧は404。ファイル欠落/破損時は回答保留、原文閲覧503。

## 読込みと性能

初回だけ圧縮hash、サイズ制限付き展開、展開hash、法令・履歴・対象日を検査する。同時初回呼出しは同じ処理を待ち、以後は解析済みdatasetを再利用する。各回realpath/statと有効化条件を確認し、ファイル差替え・欠落・停止時は古いcacheを返さない。読込み前後のfile identity不一致も拒否する。

これは不変の配備物を前提とするcacheであり、書換え可能な共有ディスクや外部更新APIを追加した設計ではない。毎回25MBを読み直してhashする旧経路を廃止した。Windowsローカルの73件検査では初回約121ms、warm10回平均約0.88ms。同じdatasetを13呼出しで再利用した。I/O syscall回数は計測していない。実Vercel cold起動・メモリ・負荷時性能を保証する数値ではない。

## 更新・停止・切戻し

1. 更新前のコード、lab pin、release manifest、圧縮原本、選択中のrelease IDをcommit単位で保持する。現行配備物を稼働中に書き換えない。
2. 公式差分を確認できた場合だけ別作業で新XMLを取得する。法ID/履歴ID/取得日時/XML hash、本文・定義・例外・附則・別表・図未取得状態を保持し、同じ回答基準日のdatasetとpinをレビューする。今回この取得は実行していない。
3. ローカルの新pinと検証済み新JSONを用意した後、`node scripts/package-legal-supplements.mjs <新JSON> --replace-release <現在の正確なrelease-ID>` を実行する。旧IDを指定しない場合は書込み前に停止。新原本のhash/identityを検査してから不変gzipを作り、manifestは一時ファイルから置換する。既存同名gzipはbyte一致時のみ再利用し、異なるbytesでは停止する。
4. `node scripts/package-legal-supplements.mjs --check`、更新差分・境界/時点/引用回帰、型検査、独立レビューを行う。任意に対象日だけを「今日」へ進めない。準用/経過措置の個別適用は引き続き未確認とする。
5. 公開は新コード・pin・manifest・gzip・release環境値を同じ版として適用する。切戻しも全体を同じ旧版に戻す。環境値だけ旧IDへ戻すと、現コードに収録しないIDでは回答保留になる。

合成fixtureで初回作成、旧ID欠落の書込み前拒否、明示更新、同版再試行、旧原本の保持、pin/selectionを揃えた切戻しを検証した。実法令原本は変更していない。

原文リンクのdocument IDには履歴IDとXML位置を含む。現在のviewerは選択中のdatasetだけを表示する。次版で削除された履歴のリンクは404とし、別版へ自動置換しない。旧回答に保存した公式出典URLと履歴IDは残るが、サイト内の全旧版を永久表示するアーカイブは未対応。将来更新時は旧回答の資料対象日と閲覧版の対象日を含めて差分検収し、恒久アーカイブが必要なら別範囲で設計する。

## 検証の境界と公開承認範囲

- 新差分は2ファイル73件、skip0。既存の67件を含む。旧候補760件や直前276件と足し合わせて新候補の全件PASSと扱わない。
- 本番モードのHTTP検査はJSON/SSE/no-JSと原文viewerをローカルで直接呼ぶ。外部fetchは禁止し、本番共有レート制限のDB境界だけfixture化する。実DB可用性や実HTTP配備の検収ではない。既存ガードの順序は維持する。
- 先行検査のsandbox一時ファイルrename失敗、I/O計測mockの不成立、本番レート制限fixture不足も別ログに保持した。最終成功ログで置き換えて隠していない。
- 全体型検査と独立Astra再確認の結果は追記する。TTSと競合する重処理は起動しない。
- build禁止のため実Next trace生成・Linux/Vercel functionの同梱/CWD/起動は未検証。今回の構成確認と移動先コピーでのloader検査を、実配備成功とは扱わない。

本人へ示す機能差分は「5法令の代表横断質問、附則・別表の原文、出典と資料日、不足条件の確認」。既存25法令とわんこは維持する。全25法令の全附則/別表/告示、全準用、過去全時点、未取得68図、個別の法的適用確定は含めない。

追加公開の承認対象は、この検収済み候補の通常PR/required CI、本番のrelease ID設定、Vercel本番build/deploy **1回**、同SHAの主要質問/原文/停止設計/既存ホームの読戻し。Preview+本番の二重buildは行わない。新しいembedding/LLM/APIキー、DB書込み、価格/規約変更は不要。Vercel build/hostingの使用量には費用が生じ得る。公開自体は未実行で、承認待ち。
