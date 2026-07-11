# BACKLOG-plain-2 — 現場ことば版 部隊2（労働安全衛生規則・全編）

執筆規約と完了条件の正本: docs/plain-language-prompts/README.md。
部隊投入プロンプト: docs/plain-language-prompts/squad-2.md（詳細手順は
docs/plain-language-prompts/anzen-eisei-kisoku.md・全バッチ共通）。
原文は anzen-eisei-kisoku.ts に加え ashiba-sagyo-kisoku.ts（足場等・同じ安衛則）と
corpus-gaps-fill.ts の安衛則分も対象（収載計116条）。
触ってよいのは web/src/data/plain/anzen-eisei-kisoku.ts と index.ts の登録1行のみ。

- [x] 安衛則 現場ことば版・バッチ1（収載116条のうち先頭〜29条目）— web/src/data/plain/anzen-eisei-kisoku.ts を新規作成
- [x] 安衛則 現場ことば版・バッチ2（30〜58条目）
- [x] 安衛則 現場ことば版・バッチ3（59〜87条目。足場等ファイル分を含む）
- [x] 安衛則 現場ことば版・バッチ4（残り全部＋plain:statusで安衛則 未生成0を確認）
- [ ] （常設）BACKLOG-plain-stale.md に安衛則の stale があれば再生成して表示復帰
