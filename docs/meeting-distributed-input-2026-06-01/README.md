# 打合せ書 分散入力 → 自動集約（Phase 1 完了報告 ＋ オーナー実行手順）

元請の最大の痛み「重層下請の打合せ書を毎日手で集約する」を消すレバー。**協力会社が共有リンクから自社分を入力 → 元請の画面に自動集約**する機能。不可逆領域（Supabaseスキーマ）に踏み込むため、安全設計を最優先で段階的に進める。

## フェーズ進行
- **Phase 1（完了・このPR）**: スキーマSQL用意・サーバーAPI・クライアントUI・純粋ロジック・テスト。**本番DBは未変更**（クラウド未設定環境では API が 503 を返し、既存の打合せ書は localStorage で従来どおり動作）。
- **Phase 2（オーナー実行）**: 下記SQLを Supabase SQL Editor で実行（Path A）。
- **Phase 3（SQL適用後）**: 本番接続でクロス端末フロー＋セキュリティ検証 → 「使う」判定 → マージ。

## セキュリティ設計（要点）
既存の meeting/ky API と同じ **サーバー強制モデル**:
- DBアクセスはすべてサーバールート（`service_role`）経由。**匿名キーはテーブルに一切触れない**（RLS有効＋anonポリシー無し＝全行拒否）。
- **共有トークン(token)** が capability。token は1つの打合せ書(meeting_id)にスコープされ、サーバーが照合（別の打合せ書には使えない）。`/api/meeting/contribute/[token]`。
- 各協力会社の投稿は**サーバー生成の推測不能な contributionId**を鍵に自社分のみ編集。他社は他社の contributionId を知らない＝**他社の入力を書き換えられない**。
- 協力会社の GET は**現場名・作業日の最小コンテキスト＋自社分のみ**返す＝**他社機密を漏らさない**。
- 受理するのは `sanitizeContribution` が許可するフィールドのみ（会社名/作業/予想災害/リスク/対策等）。**元請の確定欄(actualCount)・追記欄(appendNote)・階層(parentId)は受け付けない**＝混入・改ざん防止。
- 元請の「取り込む」は**device_id 照合**で「自分が発行した共有の投稿」だけを集約（他端末の打合せ書は読めない）。集約は元請のローカル record にのみ反映し、再取り込みでも**元請の当日欄・追記欄・階層を保持**（協力会社に上書きさせない）。

> 注: マンデートは「RLSでトークン照合」を例示したが、本実装は**より厳しい「匿名アクセス全拒否＋サーバーでtoken照合」**を採用した。既存アーキテクチャと一致し、匿名キー流出時もテーブルに到達できない（anon+RLSトークン方式はテーブルを匿名キーに晒すため、書き込みスコープの安全確保が難しい）。判断の妥当性に疑義あればご指示を。

## Phase 1 で実装したもの
- スキーマSQL: `docs/meeting-distributed-input-2026-06-01/schema.sql`（追加のみ・冪等・RLS・service_role GRANT）
- 純粋ロジック: `web/src/lib/meeting/distributed.ts`（token生成・sanitize・merge）＋テスト9件
- サーバーAPI: `/api/meeting/share`（元請: 発行/取り込み）, `/api/meeting/contribute/[token]`（協力会社: 取得/投稿）
- クライアント: `DistributedInputBar`（元請の依頼/取り込みボタン）, `/safety-diary/contribute/[token]`（協力会社フォーム）
- 既存の打合せ書（階層・点検項目・AI提案・クラウド保管・印刷・翌日複製）は**非破壊**。

## 要件1: マージ競合しない仕組み（行レベル分離）
- **各協力会社は自社の行(`meeting_share_inputs` の1行＝固有 contribution_id)だけを書く**。別々の行なので**そもそも競合しない**（2社同時入力でも別行＝両方残る）。
- **元請の確定欄(actualCount)・追記欄(appendNote)は `meeting_records`（元請の別テーブル）にあり、協力会社が触る `meeting_share_inputs` とは物理的に別**。同一行・同一カラムを複数主体が触らない。
- 元請の「取り込み」は協力会社の行を**元請ローカルへコピー**する操作。再取り込みでも `mergeContributionsIntoContractors` が**元請の当日欄・追記・階層を保持**（協力会社の申告フィールドのみ更新）。
- 唯一「同一行を並行更新し得る」のは**同一社が同一 contribution_id を2タブ等で同時更新**する稀ケース。ここだけ**楽観ロック**: クライアントが最後に見た `submittedAt(base)` をサーバーが現在値と照合し、食い違えば **409 conflict** を返す→UIは最新を読み直して再編集を促す（**黙ってデータを消さない**）。last-write-wins による消失を防ぐ。
- 検証（テスト）: 「2社同時→別行で両方残る」「同一社の複数更新→単一行で最新反映」「base≠current→競合検知」。

## 要件2: 入力履歴・自動期限切れ・一つ前に戻す（オーナー負担ゼロ）
- 送信のたびに `meeting_share_input_history` に**スナップショットを追記**（誰=token/contribution・いつ=recorded_at・何=payload）。監査価値（誰がいつ何を入力したか追える）。
- **保持30日**（`HISTORY_RETENTION_DAYS`）。期限切れは**読み取り時に除外**（`activeHistory`）＋**書き込み時に自動削除**（`appendHistoryAndGc` が `recorded_at < now-30d` を毎回削除）。**専用cron不要・オーナーの手動運用ゼロ・無限蓄積しない**（無料枠内）。
- **一つ前に戻す**: `pickPreviousPayload` が現在より前の最新スナップショットを返す。協力会社フォーム（自社cid所有）と元請（token＋cid所有）の双方が `/api/meeting/contribute/[token]` の `mode:"revert"` で復元可能（完全な版管理ではなく「直前に戻す」程度）。
- 追加スキーマは**追記のみ**（履歴テーブル新規追加）。既存破壊なし。
- 検証（テスト）: 「30日超過は期限切れ判定」「activeHistory が期限切れ除外＋新しい順」「pickPreviousPayload が一つ前を返す／無ければnull」。

## Phase 1 テスト（純粋な認可・競合・履歴の不変条件 計16件）
- token: 64桁hex・毎回ユニーク・不正値拒否
- sanitize: 元請確定欄/当日欄/階層/id を受け付けない・risk クランプ・文字数上限・型強制
- merge: 新規追加／再取り込みで重複せず元請の当日欄・追記欄・階層を保持／元請の手作り行は不変／協力会社は当日欄を持ち込めない
- （DBレベルのRLS・クロストークン遮断・匿名拒否は Phase 3 で実DBに対して検証）

---

## 【オーナー実行手順 = Phase 2】
1. Supabase ダッシュボード → SQL Editor を開く（対象: safe-ai-site-ky）。
2. `docs/meeting-distributed-input-2026-06-01/schema.sql` の全文を貼り付けて実行。
   - 追加のみ・冪等。既存テーブル/データには触れません。
3. 末尾の確認クエリで `meeting_shares` と `meeting_share_inputs` の両方に `grantee=service_role` が出ればOK。
4. 実行できたら教えてください。Phase 3（本番接続での動作確認＋クロス端末＋セキュリティ検証）に進みます。

実行後の Phase 3 で、トークンA→打合せ書Bが不可・匿名直アクセス拒否・他社行の書き換え不可・現場シナリオ（各社スマホ入力→元請集約→印刷）の成立を検証し、「元請が明日から使う」とYesと言える状態を確認してからマージ判断します。
