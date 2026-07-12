リポジトリ: kameking-lab/safe-ai-site

【モデル確認】現在のモデルがSonnet 5でなければ /model claude-sonnet-5 に切り替えてから着手。

【役割: 安衛則 原文(fulltext)量産 執筆部隊1／全4部隊】
労働安全衛生規則（安衛則・egovLawId 347M50002000032）の全文ギャップ約1,000条を「現場の人でも理解できる端的な言い換え版（現場ことば版）」にする4部隊のうちの部隊1。**照合先は curated コーパスではなく原文＝全文スナップショット（laws-fulltext）**。担当は下記シャード（編/章範囲）のみ。他部隊の範囲・他法令には触れない。

【担当シャードと範囲（重複なし・約275条）】
- `web/src/data/plain/anei-kisoku/hen1-tsusoku.ts` … 第1編 通則（第1条〜第100条／既存30条・要執筆 約182条）
- `web/src/data/plain/anei-kisoku/hen2-01-kikai.ts` … 第2編 第1章 機械による危険の防止（第101条〜第151条・**枝番なしの第151条まで**／既存6条・要執筆 約57条）
- 境界注意: **第151条（枝番なし）は当シャード**。第151条の2以降（車両系荷役運搬機械等）は部隊2（hen2-02）の担当。侵さない。

【はじめに読むもの（この順で）】
1. `docs/plain-language-prompts/README.md`（文体規約・完了条件の正本）
2. 見本A（原文=fulltext アンカーの v2 緑・実例）: `web/src/data/plain/anei-kisoku/hen2-01-kikai.ts` の **第117条**（研削といし。ただし書「直径50mm未満は適用対象外」・数値・義務主体を原文どおり保存し fidelity 全緑。generatedAt="2026-07-13"）
3. 見本B（品質基準）: `web/src/data/plain/sankketsu-kisoku.ts`（酸欠則・端的さ）
4. データ型: `web/src/data/plain/types.ts`（PlainArticle の各フィールド）
5. 用語集の見出し語: `web/src/data/glossary/`（専門語はこの表記に合わせる）

【原文とハッシュの取り方（重要・curated ではなく fulltext を使う）】
担当範囲の原文本文と sourceTextHash は次で一括取得する（curated の plain-source-digest.mjs は使わない）:
```
cd web
node scripts/plain-fulltext-digest.mjs 347M50002000032 --from 1   --to 100 --live-only   # hen1
node scripts/plain-fulltext-digest.mjs 347M50002000032 --from 101 --to 151 --live-only   # hen2-01
```
出力の各条 `{ articleNum, caption, isDeleted, hash, chars, text }`:
- `text` が言い換えの元（原文）。数値・単位・限度方向・義務主体・参照条・ただし書・罰則はここから拾う。
- `hash` を PlainArticle.sourceTextHash にそのまま転記する（＝原文一致=fresh。転記ミスは stale で UI 非表示になる）。
- `isDeleted:true`（「削除」条）は plain を書かない。`--live-only` で既に除外済み。
- **既に担当シャードに存在する articleNum（既存条）は再執筆しない**。digest の live 条のうちシャードに無いものだけ書く。

【手順（1シャード=1ブランチ=1PR。上のシャード順に）】
1. `git fetch origin main && git checkout -B plain/anei-hen1-tsusoku origin/main`（次シャードは別ブランチ `plain/anei-hen2-01-kikai`）。
2. 対象シャードに、range の未執筆 live 条を `{ ...META, articleNum, plainText, omissions?, sourceTextHash }` で追記。
   - META は既存シャード（例 hen2-01-kikai.ts）と同じ形。`generatedAt: "2026-07-13"`（**v2 強制モード**。FIDELITY_V2_SINCE 以降）、`model: "claude-sonnet-5"`、`checkStatus: "verified"`、`sourceRevisionId` は当該法令の latestRevision（`web/src/data/laws/law-metadata.ts` の 安衛則）。
   - hen4 等の空シャードを埋める場合はファイル冒頭コメントの META スキャフォールドを追加してから書く。
3. `cd web && npm run plain:test` を自分で回して**全緑**にする（fidelity v2 + fulltext アンカー + 整合 + 端的さラチェット）。赤が出たらメッセージのトークン（欠落数値・主体・参照条・ただし書）を本文か omissions に反映して再実行。**原文・他ファイルは変えない**。
4. `npx tsc --noEmit` 0 error → `npm run lint` 0 error → `npm run build` 成功。
5. 20〜30条ごとに commit/push（`git push -u origin <branch>`。使用枠切れ・切断対策）。
6. シャードが埋まったら PR（draft可）。本文に「書いた条数・fidelity照合結果（plain:test の結果行）・担当シャード名」を貼る。CI緑を確認して **squash マージ**。次のシャードへ。

【v2 ゲートを緑にする書き方（焼き込み・全て機械照合される）】
- **原文(fulltext)基準**。数値・単位・期間・限度方向（以上/以下/未満/超）は原文どおり保存。表記ゆれは「18パーセント⇔18%」「100万分の10⇔10ppm」「3年間⇔3年」のみ許容。原文に無い数値・義務・条件の追加は捏造として fail。
- **義務主体は原文語**（事業者・労働者・請負人・注文者・元方事業者…）をその義務の同じ文に入れる。「会社」「作業員」への言い換え禁止。義務種別の表現は固定（義務=しなければなりません／禁止=てはいけません・禁止です／努力義務=努めましょう〈義務に格上げ禁止〉／配慮義務=配慮しなければなりません）。
- **ただし書・適用除外を必ず保存**（v2）。原文の「ただし〜この限りでない／適用しない／除く」は本文に「ただし〜」等で残すか、omissions に「ただし書（〜）は省略」と当該内容を含めて宣言する。
- **参照条番号・別表**（例: 法第31条第1項・第552条・令別表第6）は本文に残すか、omissions に当該トークンを含めて宣言する。
- **罰則**が原文にあれば本文で触れるか omissions で宣言（「罰」を含める）。
- **文長ゲート（現行基準）**: 括弧書き（条参照・注記＝読み飛ばせる）を除いた実読で **1文120字以内・全体400字以内**。超えたら文を分割し、省く部分は omissions で宣言。です・ます体、目安2〜4文（最大5文）。
- **「原文をご覧ください」等の読者放り出しは禁止**（v2 で fail）。省略は必ず omissions で当該内容を含めて宣言する（丸投げ文言を書かない）。
- **omissions 宣言方式**: 省くもの（参照・改正経緯・細目の列挙・ただし書 等）は黙って省かず、omissions に当該トークン（条番号・数値・「ただし」等）を含む文字列で明示する。宣言があるものだけゲートを通る。

【絶対ルール】
- 触ってよいのは **担当シャードの .ts ファイルのみ**（hen1-tsusoku.ts / hen2-01-kikai.ts）。`anei-kisoku/index.ts`・レジストリ・コーパス原文（`web/src/data/laws/**`）・全文JSON・UI・lib・テスト・他部隊のシャードは変更禁止（fidelityで赤が出ても原文側やテストを直さない）。
- **生成物はコミットしない**。`npm run plain:status` は確認用に回してよいが、commit前に `git checkout -- docs/plain-language-coverage.md BACKLOG-plain-stale.md` で必ず戻す（各自の再生成版をコミットすると後続マージで PR が dirty 化し web-ci が発火しなくなる。詳細: `docs/plain-ci-web-ci-firing-handbook-2026-07-11.md`）。**dirty になったら最新 main へ rebase → push で clean 化して CI 発火**。
- 捏造0・main直接コミット禁止・CI緑のみマージ・逆質問せず自分で判断（迷う条は保守的に原文寄りへ）。
- **使用枠が尽きそう／セッションが切れそうなときは、そこまでの成果を必ず commit & push してから、どこまで進めた・残りどこか（シャード名と最後に書いた条番号）を正直に報告して終了する**（中途半端に握りつぶさない）。
