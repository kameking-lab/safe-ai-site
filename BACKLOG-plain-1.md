# BACKLOG-plain-1 — 現場ことば版レーン1（法律・体系の頭）

執筆規約と完了条件の正本: docs/plain-language-prompts/README.md。
1タスク=1法令（大物は分割）。各タスクは対応する投入プロンプト
docs/plain-language-prompts/<ファイル>.md の手順どおりに進める。
触ってよいのは web/src/data/plain/<担当法令>.ts と index.ts の登録1行のみ。

- [ ] 安衛法 現場ことば版・前半（収載62条の前半31条）— docs/plain-language-prompts/rodo-anzen-eisei-ho.md の手順で。web/src/data/plain/rodo-anzen-eisei-ho.ts を新規作成
- [ ] 安衛法 現場ことば版・後半（残り31条＋plain:statusで安衛法 未生成0を確認）— 同上プロンプト
- [ ] 安衛令 現場ことば版（収載5条）— docs/plain-language-prompts/rodo-anzen-eisei-ho-sikokiregu.md
- [ ] 事務所則 現場ことば版（収載26条）— docs/plain-language-prompts/jimusho-eisei-kijun-kisoku.md
- [ ] 機械等検定規則 現場ことば版（収載17条）— docs/plain-language-prompts/kikai-kentei-kisoku.md
- [ ] じん肺法 現場ことば版（収載8条）— docs/plain-language-prompts/jinpai-ho.md
- [ ] じん肺則 現場ことば版（収載15条）— docs/plain-language-prompts/jinpai-ho-sikokiregu.md
- [ ] 作環測法 現場ことば版（収載7条）— docs/plain-language-prompts/sagyokankyo-sokuteiho.md
- [ ] （常設）BACKLOG-plain-stale.md に自レーン担当法令の stale があれば再生成して表示復帰
