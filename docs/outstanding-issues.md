# Outstanding Issues トラッキング

## 対応済み

### ✅ 法改正一覧 + 事故DBに業種フィルタ追加（2026-04-19）
- コミット: `ed3676e` fix(laws,accidents): ensure industry filter works with multi-select and URL params
- 変更ファイル: `web/src/components/law-revision-list.tsx`, `web/src/components/accident-database-panel.tsx`
- 内容:
  - 業種フィルタを3業種→10業種に拡張（建設/製造/医療福祉/運輸/林業/食品/小売/清掃/化学/電気）
  - マルチセレクト対応（複数選択可、OR条件）
  - URLクエリパラメータ連動: `/laws?industries=construction,manufacturing` / `/accidents?acc_industries=...`
  - 選択中の件数バッジ表示（N業種選択中 / X件）
  - 「フィルタをリセット」ボタン追加

### ✅ 過去問クイズのデフォルト難易度を逆順修正（2026-04-19）
- コミット: `5a12c19` fix(exam-quiz): set beginner default and prioritize by difficulty
- 変更ファイル: `web/src/app/(main)/exam-quiz/exam-quiz-client.tsx`
- 内容:
  - デフォルト資格: `health-2nd`（第二種衛生管理者, 入門）を確定
  - 難易度レベルを4段階に拡張: 入門 / 中級 / 上級 / 最上級
  - 労働安全コンサルタントを「最上級」に昇格（旧: 上級）
  - 難易度クイック選択を4列に拡張（入門→中級→上級→最上級）
  - 資格セレクトのoptgroupを難易度順（入門が先）に並び替え

### ✅ AccidentAnalysisPanelに出典・サンプル数明記（2026-04-19）
- コミット: `aa4b9d5` fix(accidents): explicit data sources and sample sizes on all charts
- 変更ファイル: `web/src/components/accident-analysis-panel.tsx`, `web/src/components/mhlw-accident-analysis-panel.tsx`
- 内容:
  - AccidentAnalysisPanel（収録事例タブ）: `SiteDataDisclaimer` バナー追加
    「当サイト独自収集事例・統計的代表性なし」を明示
    MHLW公式統計は「MHLW実データ分析」タブへ誘導
  - MhlwAccidentAnalysisPanel（MHLW実データ分析タブ）:
    死亡災害グラフ（業種別・事故型別ランキング）: `DeathSourceFooter` 追加
    出典: 厚生労働省 死亡災害DB N=4,043件 令和元〜令和5年
    死亡 vs 休業4日以上 オーバーレイ: 左右両軸の出典・N数を明記

---

## 未対応（残課題）

- [ ] /laws 業種フィルタ: 細分業種セレクト（multi-select対応後に再設計が必要）
- [ ] /accidents MHLW 50万件検索タブへの業種フィルタ連携
- [ ] AccidentAnalysisPanel: 折れ線グラフに「労働災害動向調査」ラベル追加
- [ ] 多言語対応の導入（`docs/remaining-proposals.md` 参照）
- [ ] Eラーニング編集機能
- [ ] KY用紙完成（音声入力・PDF出力）
