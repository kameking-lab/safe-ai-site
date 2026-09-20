# 建設計算・研修・安全看板 横断Production結果

基準日: 2026-08-28 JST

## Release

- Production: `https://www.anzen-ai-portal.jp/`
- Deployment: `dpl_CKyCHVBQTZ7785EX9JBbcBjsGe9e`
- 直前Production / rollback: `dpl_75mTcJCSfgxc6ch9LRJz72vHZNYP`
- Preview: `dpl_8amGBS3RVwXokJQV7A77LyCEe5aL`
- release tag: `production-safety-sign-library-20260828`

## 横断判定

- 建設計算: 12計算、明示計算、式・単位・丸め・仮定、copy/CSV/PDF、31日端末履歴、offline-after-loadを本番確認。高リスク安全判定0。
- 研修: 安全研修1件とAI実務研修1件を各20枚、手動音声、字幕、全文原稿、PPTX/PDF・配布物・クイズ付きで本番確認。
- 安全看板: 市場根拠100テーマ、実生成100点、5言語、文字・数値・ブランド編集、JPEG/PNG/PDF、13サイズを本番確認。
- 本番横断read-only smoke 258/258、関連Playwright 15/15、看板100詳細とdownload smoke、WAF smoke、runtime error log 0。
- 横断独立再レビュー: P0 0、P1 0、計算式・単位・丸め・教材事実の未解決P2 0。自動修正10件。
- 改善案として、看板mobile performance、販売証拠分散、限定art pass、安全研修PDF容量、公式source healthを残す。公開阻害ではない。
- Production昇格後のrollback条件に該当せず、rollbackは実施していない。
