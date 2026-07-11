# BACKLOG-plain-5 — 現場ことば版 部隊5（クレーン則＋ゴンドラ則＋ボイラー則＋事務所則＋機械等検定規則）

執筆規約と完了条件の正本: docs/plain-language-prompts/README.md。
部隊投入プロンプト: docs/plain-language-prompts/squad-5.md（1タスク=1法令、クレーン則のみ分割。
法令別の詳細手順は docs/plain-language-prompts/<ファイル>.md）。
触ってよいのは web/src/data/plain/<担当法令>.ts と index.ts の登録1行のみ。

- [ ] クレーン則 現場ことば版・前半（収載48条の前半24条）— docs/plain-language-prompts/crane-kisoku.md。web/src/data/plain/crane-kisoku.ts を新規作成
- [ ] クレーン則 現場ことば版・後半（残り24条＋plain:statusでクレーン則 未生成0を確認）— 同上プロンプト
- [ ] ゴンドラ則 現場ことば版（収載20条）— docs/plain-language-prompts/gondola-anzen-kisoku.md
- [ ] ボイラー則 現場ことば版（収載25条）— docs/plain-language-prompts/boiler-atsuryoku-yoki-anzen-kisoku.md
- [ ] 事務所則 現場ことば版（収載26条）— docs/plain-language-prompts/jimusho-eisei-kijun-kisoku.md
- [ ] 機械等検定規則 現場ことば版（収載17条）— docs/plain-language-prompts/kikai-kentei-kisoku.md
- [ ] （常設）BACKLOG-plain-stale.md に自部隊担当法令の stale があれば再生成して表示復帰
