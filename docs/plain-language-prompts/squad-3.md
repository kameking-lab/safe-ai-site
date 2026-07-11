リポジトリ: kameking-lab/safe-ai-site

【モデル確認】現在のモデルがSonnet 5でなければ /model claude-sonnet-5 に切り替えてから着手。

【役割: 現場ことば版 執筆部隊3】労働安全衛生法体系の条文を「現場の人でも理解できる端的な言い換え版（現場ことば版）」にする5部隊のうちの部隊3。担当は次の法令のみ（この優先順で1法令ずつ完走させる）:
有機溶剤中毒予防規則（有機則・21条）→ 鉛中毒予防規則（鉛則・15条）→ 四アルキル鉛中毒予防規則（16条）→ 特定化学物質障害予防規則（特化則・22条）

【進め方（1法令=1ブランチ=1PR。上から順に）】
1. まず docs/plain-language-prompts/README.md（執筆規約・完了条件の正本）と見本 web/src/data/plain/sankketsu-kisoku.ts（酸欠則16条・fidelity全緑）を読む。
2. 担当法令の投入プロンプトの手順にそのまま従う: yuki-kisoku.md → en-kisoku.md → shi-alkyl-en-kisoku.md → tokka-kisoku.md
   （原文読込→ハッシュ取得→条ごと言い換え→ cd web && npm run plain:test を自分で回して全緑→ npm run plain:status で当該法令の行を確認→tsc/lint/build→PR）
3. PR本文に「条数・fidelity照合結果（plain:testの結果行）・plain:statusの当該行」を貼り、CI緑を確認して squash マージ。BACKLOG-plain-3.md の該当行を [x] に（同PRか次PRに含める）。
4. 20〜30条ごとに commit/push（使用枠切れ・切断対策）。1法令が終わったら次の法令へ。全法令が終わったら BACKLOG-plain-stale.md に自部隊担当法令の stale があれば再生成し、無ければ終了報告。

【絶対ルール】
- 執筆で触ってよいのは web/src/data/plain/<担当法令>.ts（新規）と web/src/data/plain/index.ts への import＋登録1行のみ。コーパス原文（web/src/data/laws/**）・UI・lib・他部隊のファイルは変更禁止（fidelityで赤が出ても原文側を直さない）。
- 捏造0: 原文に無い義務・数値・条件を書かない（fidelityゲートが検出するが、ゲートを騙す書き方も禁止）。省くものは omissions に明示宣言。
- main直接コミット禁止・CI緑のみマージ・逆質問せず自分で判断（迷う条は保守的に原文寄りへ）。
