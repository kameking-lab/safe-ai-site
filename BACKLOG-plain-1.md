# BACKLOG-plain-1 — 現場ことば版 部隊1（労働安全衛生法＋労働安全衛生法施行令）

執筆規約と完了条件の正本: docs/plain-language-prompts/README.md。
部隊投入プロンプト: docs/plain-language-prompts/squad-1.md（法令別の詳細手順は
docs/plain-language-prompts/<ファイル>.md）。
触ってよいのは web/src/data/plain/<担当法令>.ts と index.ts の登録1行のみ。

- [x] 安衛法 現場ことば版・前半（収載62条の前半31条）— docs/plain-language-prompts/rodo-anzen-eisei-ho.md の手順で。web/src/data/plain/rodo-anzen-eisei-ho.ts を新規作成
- [x] 安衛法 現場ことば版・後半（残り31条＋plain:statusで安衛法 未生成0を確認）— 同上プロンプト
- [x] 安衛令 現場ことば版（収載5条）— docs/plain-language-prompts/rodo-anzen-eisei-ho-sikokiregu.md
- [ ] （常設）BACKLOG-plain-stale.md に自部隊担当法令の stale があれば再生成して表示復帰
