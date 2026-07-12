リポジトリ: kameking-lab/safe-ai-site

【モデル確認】現在のモデルがSonnet 5でなければ /model claude-sonnet-5 に切り替えてから着手。

【役割: 安衛則 原文(fulltext)量産 執筆部隊4／全4部隊】
労働安全衛生規則（安衛則・egovLawId 347M50002000032）の全文ギャップ約1,000条を「現場の人でも理解できる端的な言い換え版（現場ことば版）」にする4部隊のうちの部隊4。**照合先は curated コーパスではなく原文＝全文スナップショット（laws-fulltext）**。担当は下記シャード（編/章範囲）のみ。他部隊の範囲・他法令には触れない。

【担当シャードと範囲（重複なし・約214条）】
- `web/src/data/plain/anei-kisoku/hen2-06-batsuboku-tsuiraku-tsuuro.ts` … 第2編 第8〜10章 伐木作業等・墜落飛来崩壊等・通路足場等（第477条〜第574条・伐木造材/墜落防止/足場/作業構台／既存25条・要執筆 約48条。削除条多め）
- `web/src/data/plain/anei-kisoku/hen3-eisei.ts` … 第3編 衛生基準（第575条〜第653条・有害作業環境/保護具/気積換気/採光照明/温度湿度/休養/清潔/食堂/救急用具／既存21条・要執筆 約81条）
- `web/src/data/plain/anei-kisoku/hen4-tokubetsu.ts` … 第4編 特別規制（第654条〜第682条・元方事業者等/機械等貸与者等/建築物貸与者に関する特別規制／既存0条＝**空シャード**・要執筆 約39条）

【はじめに読むもの（この順で）】
1. `docs/plain-language-prompts/README.md`（文体規約・完了条件の正本）
2. 見本A（原文=fulltext アンカーの v2 緑・実例）: `web/src/data/plain/anei-kisoku/hen2-01-kikai.ts` の **第117条**（ただし書・数値・義務主体を原文どおり保存し fidelity 全緑。generatedAt="2026-07-13"）
3. 見本B（品質基準）: `web/src/data/plain/sankketsu-kisoku.ts`
4. 空シャードの埋め方（見本）: `web/src/data/plain/anei-kisoku/hen4-tokubetsu.ts` 冒頭コメントの META スキャフォールド。第654条（架設通路についての措置。注文者×義務・参照 法第31条第1項/第552条）は `plain-fulltext-anchor.test.ts` の gap 実証テストに忠実版の書き方が載っているので参考にする。
5. データ型: `web/src/data/plain/types.ts` ／ 用語集の見出し語: `web/src/data/glossary/`

【原文とハッシュの取り方（curated ではなく fulltext を使う）】
```
cd web
node scripts/plain-fulltext-digest.mjs 347M50002000032 --from 477 --to 574 --live-only   # hen2-06
node scripts/plain-fulltext-digest.mjs 347M50002000032 --from 575 --to 653 --live-only   # hen3
node scripts/plain-fulltext-digest.mjs 347M50002000032 --from 654 --to 682 --live-only   # hen4
```
出力の各条 `{ articleNum, caption, isDeleted, hash, chars, text }`:
- `text` が言い換えの元（原文）。数値・単位・限度方向・義務主体・参照条・ただし書・罰則はここから拾う。
- `hash` を PlainArticle.sourceTextHash にそのまま転記する（＝原文一致=fresh）。
- `isDeleted:true` は書かない（`--live-only` で除外済み。hen2-06 は削除条が多い）。
- **既に担当シャードに存在する articleNum は再執筆しない**。live 条のうちシャードに無いものだけ書く。
- 空シャード hen4 を埋める場合は、まず冒頭コメントの META スキャフォールドを実コードとして追加してから各条を書く。

【手順（1シャード=1ブランチ=1PR。上のシャード順に）】
1. `git fetch origin main && git checkout -B plain/anei-hen2-06-tsuuro origin/main`（次シャードは `plain/anei-hen3-eisei` → `plain/anei-hen4-tokubetsu`）。
2. 対象シャードに未執筆 live 条を `{ ...META, articleNum, plainText, omissions?, sourceTextHash }` で追記。META は `generatedAt: "2026-07-13"`（**v2 強制モード**）・`model: "claude-sonnet-5"`・`checkStatus: "verified"`・`sourceRevisionId`=安衛則 latestRevision（`web/src/data/laws/law-metadata.ts`）。
3. `cd web && npm run plain:test` を回して**全緑**（fidelity v2 + fulltext アンカー + 整合 + 端的さラチェット）。赤はメッセージのトークンを本文/omissions に反映して再実行。**原文・他ファイルは変えない**。
4. `npx tsc --noEmit` 0 error → `npm run lint` 0 error → `npm run build` 成功。
5. 20〜30条ごとに commit/push（`git push -u origin <branch>`）。
6. シャードが埋まったら PR。本文に「書いた条数・fidelity照合結果（plain:test の結果行）・担当シャード名」。CI緑で **squash マージ**。次シャードへ。

【v2 ゲートを緑にする書き方（焼き込み・全て機械照合）】
- **原文(fulltext)基準**。数値・単位・期間・限度方向は原文どおり。表記ゆれは「%⇔パーセント」「100万分のN⇔Nppm」「3年間⇔3年」のみ。原文に無い数値・義務・条件の追加は捏造として fail。
- **義務主体は原文語**を同じ文に（第4編は注文者・元方事業者・機械等貸与者・建築物貸与者が主体。原文どおりに）。義務種別の表現は固定（義務=しなければなりません／禁止=てはいけません・禁止です／努力義務=努めましょう／配慮義務=配慮しなければなりません）。
- **ただし書・適用除外を必ず保存**（v2）。本文に残すか omissions に内容を含めて宣言。
- **参照条番号・別表**（例: 法第31条第1項・第552条）は本文に残すか omissions に当該トークンを含めて宣言。
- **罰則**が原文にあれば本文で触れるか omissions で宣言（「罰」を含める）。
- **文長ゲート（現行基準）**: 括弧書きを除いた実読で 1文120字以内・全体400字以内。超えたら分割、省く部分は omissions。です・ます体・目安2〜4文（最大5文）。
- **「原文をご覧ください」等の読者放り出し禁止**（v2 で fail）。省略は omissions で内容を含めて宣言する。
- **omissions 宣言方式**: 省くものは黙って省かず、omissions に当該トークン（条番号・数値・「ただし」等）を含む文字列で明示する。

【絶対ルール】
- 触ってよいのは **担当シャードの .ts のみ**（hen2-06-batsuboku-tsuiraku-tsuuro.ts / hen3-eisei.ts / hen4-tokubetsu.ts）。`index.ts`・レジストリ・コーパス原文・全文JSON・UI・lib・テスト・他部隊シャードは変更禁止。
- **生成物はコミットしない**。`npm run plain:status` を回したら commit前に `git checkout -- docs/plain-language-coverage.md BACKLOG-plain-stale.md` で戻す。**dirty になったら最新 main へ rebase → push で clean 化して CI 発火**（詳細: `docs/plain-ci-web-ci-firing-handbook-2026-07-11.md`）。
- 捏造0・main直接コミット禁止・CI緑のみマージ・逆質問せず自分で判断（迷う条は保守的に原文寄りへ）。
- **使用枠が尽きそう／セッションが切れそうなときは、そこまでの成果を必ず commit & push してから、どこまで進めた・残りどこか（シャード名と最後に書いた条番号）を正直に報告して終了する**。
