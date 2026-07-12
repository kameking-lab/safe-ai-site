リポジトリ: kameking-lab/safe-ai-site

【モデル確認】現在のモデルがSonnet 5でなければ /model claude-sonnet-5 に切り替えてから着手。

【役割: 安衛則 原文(fulltext)量産 執筆部隊2／全4部隊】
労働安全衛生規則（安衛則・egovLawId 347M50002000032）の全文ギャップ約1,000条を「現場の人でも理解できる端的な言い換え版（現場ことば版）」にする4部隊のうちの部隊2。**照合先は curated コーパスではなく原文＝全文スナップショット（laws-fulltext）**。担当は下記シャード（編/章範囲）のみ。他部隊の範囲・他法令には触れない。

【担当シャードと範囲（重複なし・約273条）】
- `web/src/data/plain/anei-kisoku/hen2-02-nieki-unpan.ts` … 第2編 第1章の2 荷役運搬機械等（**第151条の2〜第151条の175**・車両系荷役運搬機械等／既存14条・要執筆 約146条）
- `web/src/data/plain/anei-kisoku/hen2-03-kensetsu-kikai.ts` … 第2編 第2章 建設機械等（第152条〜第236条・車両系建設機械／くい打機くい抜機／高所作業車／軌道装置等／既存9条・要執筆 約104条）
- 境界注意: **第151条（枝番なし）は部隊1（hen2-01）の担当**。当シャードは第151条の2以降のみ。侵さない。

【はじめに読むもの（この順で）】
1. `docs/plain-language-prompts/README.md`（文体規約・完了条件の正本）
2. 見本A（原文=fulltext アンカーの v2 緑・実例）: `web/src/data/plain/anei-kisoku/hen2-01-kikai.ts` の **第117条**（ただし書・数値・義務主体を原文どおり保存し fidelity 全緑。generatedAt="2026-07-13"）
3. 見本B（品質基準）: `web/src/data/plain/sankketsu-kisoku.ts`
4. データ型: `web/src/data/plain/types.ts`
5. 用語集の見出し語: `web/src/data/glossary/`

【原文とハッシュの取り方（curated ではなく fulltext を使う）】
```
cd web
node scripts/plain-fulltext-digest.mjs 347M50002000032 --from 151 --to 151 --live-only   # hen2-02（第151条の枝番。第151条本体は書かない=部隊1）
node scripts/plain-fulltext-digest.mjs 347M50002000032 --from 152 --to 236 --live-only   # hen2-03
```
出力の各条 `{ articleNum, caption, isDeleted, hash, chars, text }`:
- `text` が言い換えの元（原文）。数値・単位・限度方向・義務主体・参照条・ただし書・罰則はここから拾う。
- `hash` を PlainArticle.sourceTextHash にそのまま転記する（＝原文一致=fresh）。
- `isDeleted:true` は書かない（`--live-only` で除外済み）。
- **既に担当シャードに存在する articleNum は再執筆しない**。live 条のうちシャードに無いものだけ書く。

【手順（1シャード=1ブランチ=1PR。上のシャード順に）】
1. `git fetch origin main && git checkout -B plain/anei-hen2-02-nieki origin/main`（次シャードは `plain/anei-hen2-03-kensetsu`）。
2. 対象シャードに未執筆 live 条を `{ ...META, articleNum, plainText, omissions?, sourceTextHash }` で追記。META は `generatedAt: "2026-07-13"`（**v2 強制モード**）・`model: "claude-sonnet-5"`・`checkStatus: "verified"`・`sourceRevisionId`=安衛則 latestRevision（`web/src/data/laws/law-metadata.ts`）。
3. `cd web && npm run plain:test` を回して**全緑**（fidelity v2 + fulltext アンカー + 整合 + 端的さラチェット）。赤はメッセージのトークンを本文/omissions に反映して再実行。**原文・他ファイルは変えない**。
4. `npx tsc --noEmit` 0 error → `npm run lint` 0 error → `npm run build` 成功。
5. 20〜30条ごとに commit/push（`git push -u origin <branch>`）。
6. シャードが埋まったら PR。本文に「書いた条数・fidelity照合結果（plain:test の結果行）・担当シャード名」。CI緑で **squash マージ**。次シャードへ。

【v2 ゲートを緑にする書き方（焼き込み・全て機械照合）】
- **原文(fulltext)基準**。数値・単位・期間・限度方向は原文どおり。表記ゆれは「%⇔パーセント」「100万分のN⇔Nppm」「3年間⇔3年」のみ。原文に無い数値・義務・条件の追加は捏造として fail。
- **義務主体は原文語**を同じ文に。義務種別の表現は固定（義務=しなければなりません／禁止=てはいけません・禁止です／努力義務=努めましょう／配慮義務=配慮しなければなりません）。
- **ただし書・適用除外を必ず保存**（v2）。本文に残すか omissions に内容を含めて宣言。
- **参照条番号・別表**は本文に残すか omissions に当該トークンを含めて宣言。
- **罰則**が原文にあれば本文で触れるか omissions で宣言（「罰」を含める）。
- **文長ゲート（現行基準）**: 括弧書きを除いた実読で 1文120字以内・全体400字以内。超えたら分割、省く部分は omissions。です・ます体・目安2〜4文（最大5文）。
- **「原文をご覧ください」等の読者放り出し禁止**（v2 で fail）。省略は omissions で内容を含めて宣言する。
- **omissions 宣言方式**: 省くものは黙って省かず、omissions に当該トークン（条番号・数値・「ただし」等）を含む文字列で明示する。

【絶対ルール】
- 触ってよいのは **担当シャードの .ts のみ**（hen2-02-nieki-unpan.ts / hen2-03-kensetsu-kikai.ts）。`index.ts`・レジストリ・コーパス原文・全文JSON・UI・lib・テスト・他部隊シャードは変更禁止。
- **生成物はコミットしない**。`npm run plain:status` を回したら commit前に `git checkout -- docs/plain-language-coverage.md BACKLOG-plain-stale.md` で戻す。**dirty になったら最新 main へ rebase → push で clean 化して CI 発火**（詳細: `docs/plain-ci-web-ci-firing-handbook-2026-07-11.md`）。
- 捏造0・main直接コミット禁止・CI緑のみマージ・逆質問せず自分で判断（迷う条は保守的に原文寄りへ）。
- **使用枠が尽きそう／セッションが切れそうなときは、そこまでの成果を必ず commit & push してから、どこまで進めた・残りどこか（シャード名と最後に書いた条番号）を正直に報告して終了する**。
