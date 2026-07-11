
リポジトリ: kameking-lab/safe-ai-site

【モデル確認】現在のモデルがSonnet 5でなければ /model claude-sonnet-5 に切り替えてから着手。

【役割】安全AIサイトの「現場ことば版」執筆担当。担当は **じん肺法（じん肺法）** の1法令のみ。
コーパス収載の全条（約8条）を、現場の人でも理解できる端的な言い換えにして、
機械照合（fidelityゲート）全緑でPRする。

【はじめに読むもの（この順で）】
1. docs/plain-language-prompts/README.md（執筆規約・完了条件の正本）
2. 見本: web/src/data/plain/sankketsu-kisoku.ts（酸欠則16条・品質基準）
3. 原文: web/src/data/laws/jinpai-ho.ts（＋ web/src/data/laws/corpus-gaps-fill.ts に
   じん肺法の条があればそれも対象）
4. 用語集の見出し語: web/src/data/glossary/（専門語はこの表記に合わせる）

【手順】
1. `git checkout main && git pull --ff-only` → 作業ブランチ `plain/jinpai-ho` を作成。
2. ハッシュ取得: `cd web && node scripts/plain-source-digest.mjs src/data/laws/jinpai-ho.ts`
   （corpus-gaps-fill.ts に担当条がある場合はそちらにも実行）
3. `web/src/data/plain/jinpai-ho.ts` を新規作成し、
   `export const plainJinpaiHo: PlainArticle[]` に全条を執筆。
   - egovLawId: "335AC0000000030"
   - 文体規約・メタ項目は README のとおり（義務主体は原文語・数値/限度方向は原文どおり・
     原文に無い義務/数値の追加禁止・省略は omissions に明示宣言）
4. `web/src/data/plain/index.ts` に import と PLAIN_LAW_FILES への1行を追加
   （このファイルの変更はその1行だけ。他は触らない）。
5. fidelityテストを自分で回して全緑にする:
   `cd web && npm run plain:test`
   赤が出たらメッセージのトークン（欠落数値・主体・参照条）を本文か omissions に
   反映して再実行。**原文を変えるのは禁止**。
6. `cd web && npm run plain:status` で じん肺法 の行が
   「済(fresh)=じん肺法の収載条数・未生成0」になることを確認。
7. ゲート: `npx tsc --noEmit` 0 error / `npm run lint` 0 error / `npm run build` 成功。
8. 20〜30条ごとに commit/push（枠切れ対策）。最終PRの本文に
   「条数・fidelity照合結果（plain:test の結果行）・plain:status の当該行」を貼る。
9. CI緑を確認して squash マージ。BACKLOG-plain-N.md の担当行を [x] にして同PRに含める。

【絶対ルール】
- 捏造0（原文に無い義務・数値・条件を書かない。fidelityゲートが検出するが、
  ゲートを騙す書き方も禁止）
- 触るのは web/src/data/plain/jinpai-ho.ts と index.ts の登録1行のみ
- main直接コミット禁止・CI緑のみマージ
- 逆質問せず自分で判断。判断に迷う条は保守的に（原文寄りに）言い換える
