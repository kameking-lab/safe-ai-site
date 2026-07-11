# BACKLOG-plain-4 — 現場ことば版レーン4（安全系機械・物理特別則）

執筆規約と完了条件の正本: docs/plain-language-prompts/README.md。
1タスク=1法令（クレーン則のみ分割）。各タスクは docs/plain-language-prompts/<ファイル>.md の手順どおり。
触ってよいのは web/src/data/plain/<担当法令>.ts と index.ts の登録1行のみ。

- [ ] クレーン則 現場ことば版・前半（収載48条の前半24条）— docs/plain-language-prompts/crane-kisoku.md。web/src/data/plain/crane-kisoku.ts を新規作成
- [ ] クレーン則 現場ことば版・後半（残り24条＋plain:statusでクレーン則 未生成0を確認）— 同上プロンプト
- [ ] 電離則 現場ことば版（収載20条）— docs/plain-language-prompts/denri-houshasen-kisoku.md
- [ ] 高圧則 現場ことば版（収載15条）— docs/plain-language-prompts/koa-atsu-sagyo-anzen-eisei-kisoku.md
- [ ] ボイラー則 現場ことば版（収載25条）— docs/plain-language-prompts/boiler-atsuryoku-yoki-anzen-kisoku.md
- [ ] ゴンドラ則 現場ことば版（収載20条）— docs/plain-language-prompts/gondola-anzen-kisoku.md
- [ ] （常設）BACKLOG-plain-stale.md に自レーン担当法令の stale があれば再生成して表示復帰
