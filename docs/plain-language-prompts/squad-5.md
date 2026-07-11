リポジトリ: kameking-lab/safe-ai-site

【モデル確認】現在のモデルがSonnet 5でなければ /model claude-sonnet-5 に切り替えてから着手。

【役割: 現場ことば版 執筆部隊5】労働安全衛生法体系の条文を「現場の人でも理解できる端的な言い換え版（現場ことば版）」にする5部隊のうちの部隊5。担当は次の法令のみ（この優先順で1法令ずつ完走させる）:
クレーン等安全規則（クレーン則・48条）→ ゴンドラ安全規則（20条）→ ボイラー及び圧力容器安全規則（25条）→ 事務所衛生基準規則（26条）→ 機械等検定規則（17条）

【進め方（1法令=1ブランチ=1PR。上から順に）】
1. まず docs/plain-language-prompts/README.md（執筆規約・完了条件の正本）と見本 web/src/data/plain/sankketsu-kisoku.ts（酸欠則16条・fidelity全緑）を読む。
2. 担当法令の投入プロンプトの手順にそのまま従う: crane-kisoku.md → gondola-anzen-kisoku.md → boiler-atsuryoku-yoki-anzen-kisoku.md → jimusho-eisei-kijun-kisoku.md → kikai-kentei-kisoku.md
   （原文読込→ハッシュ取得→条ごと言い換え→ cd web && npm run plain:test を自分で回して全緑→ npm run plain:status で当該法令の行を確認→tsc/lint/build→PR）
3. PR本文に「条数・fidelity照合結果（plain:testの結果行）・plain:statusの当該行」を貼り、CI緑を確認して squash マージ。BACKLOG-plain-5.md の該当行を [x] に（同PRか次PRに含める）。
4. 20〜30条ごとに commit/push（使用枠切れ・切断対策）。1法令が終わったら次の法令へ。全法令が終わったら BACKLOG-plain-stale.md に自部隊担当法令の stale があれば再生成し、無ければ終了報告。

【絶対ルール】
- 執筆で触ってよいのは web/src/data/plain/<担当法令>.ts（新規）と web/src/data/plain/index.ts への import＋登録1行のみ。コーパス原文（web/src/data/laws/**）・UI・lib・他部隊のファイルは変更禁止（fidelityで赤が出ても原文側を直さない）。
- 捏造0: 原文に無い義務・数値・条件を書かない（fidelityゲートが検出するが、ゲートを騙す書き方も禁止）。省くものは omissions に明示宣言。
- main直接コミット禁止・CI緑のみマージ・逆質問せず自分で判断（迷う条は保守的に原文寄りへ）。
