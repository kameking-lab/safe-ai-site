リポジトリ: kameking-lab/safe-ai-site

【モデル確認】現在のモデルがSonnet 5でなければ /model claude-sonnet-5 に切り替えてから着手。

【役割: 現場ことば版 v2 リライト部隊】
fidelity v2（漢数字正規化・拡張単位・ただし書保存・「原文をご覧ください」禁止・主体語彙外の義務検出・安衛則 fulltext アンカー）の**強制モードで違反した既存 84 条**を、v2 全緑に書き直す。新規執筆ではなく**既存エントリの是正**。キューの正本は `BACKLOG-plain-v2-rewrite.md`。

【担当（84条・法令別。BACKLOG-plain-v2-rewrite.md「## v2 強制モードで違反した 84 条」）】
- 安衛則(347M50002000032) 26条 / 安衛法(347M50002000034) 13条 / 安衛則の一部(347M50002000033) 6条 /
  特化則(347M50002000039) 12条 / 有機則(347M50002000036) 1条 / クレーン則(347M50002000041) 5条 /
  電離則(347M50002000043) 4条 / 鉛則系(347M50002000035) 3条 / 施行令(347CO0000000318) 3条 /
  検定則(347M50002000045) 1条 / 高圧則(347M50002000040) 1条 / 鉛則(354M50002000018) 2条
- 内訳の大半は [style]（括弧書き除外後 1文120字/全体400字の分割）。一部は [duty-out-of-vocab]
  （「選任」「文書」「記録」「許可」「プッシュプル型換気装置」等の**義務主体を omissions か本文に明示**）。
- 違反の逐条詳細: `docs/plain-v2-audit-2026-07-13/violations.json`（articleNum・kind・message・原文抜粋）。

【はじめに読むもの（この順で）】
1. `docs/plain-language-prompts/README.md`（文体規約・完了条件の正本）
2. `BACKLOG-plain-v2-rewrite.md`（キュー・運用ルール・ratchet 下げ方）
3. `docs/plain-v2-audit-2026-07-13/violations.json`（直す違反の具体トークン）
4. 見本（v2 緑）: 安衛則 `web/src/data/plain/anei-kisoku/hen2-01-kikai.ts` の **第117条**（ただし書・数値・主体を保存して緑）／`web/src/data/plain/sankketsu-kisoku.ts`

【対象エントリの在り処（重要）】
- 対象の PlainArticle は各法令ファイルにある。**安衛則(347M50002000032) はシャード化済み**なので、対象条は
  `web/src/data/plain/anei-kisoku/hen*.ts` のいずれかにある（例: 第4条・第34条・第52条の2 は hen1-tsusoku.ts、
  第256条/第285条は hen2-04… のように編/章で分かれる）。`grep -rl '"第◯◯条"' web/src/data/plain/anei-kisoku/` で特定。
- それ以外の法令は従来どおり `web/src/data/plain/<法令>.ts` 単一ファイル。

【手順（法令ごと＝1ブランチ=1PR。小さくまとめて回す）】
1. `git fetch origin main && git checkout -B plain/v2-rewrite-<法令略称> origin/main`。
2. 対象条を書き直す:
   - [style] は文を分割し、括弧書き除外後 **1文120字以内・全体400字以内**にする。省く細目は omissions に当該トークンを含めて宣言。
   - [duty-out-of-vocab] は当該主体語（「選任」「文書」「記録」等の主語）を **plainText の同じ文に含める**か、omissions に「〈主体〉の義務は…」と当該主体を含めて宣言する。
   - 書き直した条は **`generatedAt` を "2026-07-13" 以降に更新**（v2 強制モードに載せる）。数値・限度方向・義務主体・参照・ただし書・罰則は原文どおり保存（捏造0）。
3. 安衛則を fulltext 由来で書き直す場合（BACKLOG「## 安衛則 gap-fill/簡略コーパス乖離条」）は、照合先を原文＝全文にする:
   `cd web && node scripts/plain-fulltext-digest.mjs 347M50002000032 --from <条> --to <条>` で原文 text と hash を取り、
   plainText を原文準拠に直して `sourceTextHash` を fulltext の hash に更新する。
4. ratchet を実数まで下げる（**下げるのみ・上げない**）:
   - `web/src/data/plain/plain-length-ratchet.test.ts` の `RATCHET_MAX=79` を、是正後の実測免除条数まで下げる（`WORST_CEIL=778` も最悪1文が縮んだら下げる）。
   - 安衛則を fulltext 化した条があれば `web/src/data/plain/plain-fulltext-anchor.test.ts` の `RATCHET_MAX=102`（乖離条数）を実測まで下げる。
5. `cd web && npm run plain:test` を回して**全緑**。`node scripts/plain-v2-audit.mjs` で残り違反件数を再測し、直した条が消えていることを確認。
6. `npx tsc --noEmit` 0 error → `npm run lint` 0 error → `npm run build` 成功。
7. 20〜30条ごとに commit/push（`git push -u origin <branch>`）。PR 本文に「直した条数・kind別内訳・plain:test の結果行・audit 残数の前後」を貼る。CI緑で **squash マージ**。BACKLOG-plain-v2-rewrite.md の該当行を [x] に（同PRに含める）。

【絶対ルール】
- 触ってよいのは **対象法令の plain ファイル**（安衛則は該当シャード `anei-kisoku/hen*.ts`、他法令は `<法令>.ts`）と、
  必要なら安衛則 fulltext リライト時の `corpus-gaps-fill.ts` の安衛則 gap-fill 条、および上記2本の ratchet テスト（**下げる方向のみ**）だけ。
  コーパス原文（`web/src/data/laws/**` の本体）・全文JSON・UI・lib・fidelity 実装・他法令ファイルは変更禁止（fidelityで赤が出ても原文側やゲート実装を直さない）。
- **生成物はコミットしない**。`npm run plain:status` を回したら commit前に `git checkout -- docs/plain-language-coverage.md BACKLOG-plain-stale.md` で戻す。**dirty になったら最新 main へ rebase → push で clean 化して CI 発火**（詳細: `docs/plain-ci-web-ci-firing-handbook-2026-07-11.md`）。
- 捏造0・「原文をご覧ください」等の読者放り出し禁止・main直接コミット禁止・CI緑のみマージ・逆質問せず自分で判断（迷う条は保守的に原文寄りへ）。
- **使用枠が尽きそう／セッションが切れそうなときは、そこまでの成果を必ず commit & push してから、どの法令のどこまで直した・残りどこかを正直に報告して終了する**。
