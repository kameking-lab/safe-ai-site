# 全体リッチ化キャンペーン 進捗リスト（2026-07-12開始）

オーナー方針: 「どのページにも文脈の合うポーズのチワワ」「アイコン・背景・ボタンもリッチに」。
第1弾（PR#933/#934/#935）の品質は承認済み、物量を5倍に拡大する。
不可侵: JIS安全色・コントラストAA・3秒無読・A4帳票・サイネージ1画面・LCP/CLS実測。

## ポーズライブラリ（目標33種以上）

第1弾6種（配置済み・本番反映済み）:
bow（エラー2種）/ thinking（404・EmptyState3箇所）/ pointing（トップヒーロー）/
teacher（教育スライド表紙）/ salute（完了4画面）/ head-clean（OGP）

第2波12種（PR-A対象）:
- ky-writing 合格 → /ky一覧空状態・/ky/paper操作バー2箇所
- water-break 合格 → 熱中症WBGT記録簿の空状態
- tamakake-signal 合格 → /construction-calc ヘッダー
- chemical-lab 合格 → /chemical-ra ヘッダー
- law-reading 合格 → /law-navi ヘッダー
- chat-talk 合格 → /chatbot ウェルカム画面
- detective 合格 → /accidents ヘッダー
- binoculars 合格 → /search 検索前状態
- shovel-dig 合格 → （PR-Bで掘削計算ページへ）
- banzai 合格 → 教育スライド クイズ正解ボックス
- megaphone 再生成中（初回は偽透過で棄却）→ サイネージ朝礼スクリプト
- seasonal-summer 再生成中（初回は生成途中プレビュー収集で棄却）→ トップ季節演出

第3波15種（queue.jsonにbacklog済み・PR-B対象）:
court-scale / ppe-check / news-read / calendar-plan / health-check / measure-meter /
world-friends / stamp-doc / weather-look / first-aid / sleeping / tablet-dx /
calculator / rain-coat / trophy

## アイコン画像化（PR-C対象）
- icon-sheet-1/2（3x3統一タッチ×2枚=18個）生成キュー投入済み
- 分割: scripts/imagegen/slice_sheet.py → 24-64px実寸検品 → クイックアクセス10タイル＋
  FlagshipGrid絵文字12個の置換から着手。lucideは視認性劣位箇所のフォールバック

## 背景・ボタン・面（PR-D対象）
- hero-bg-dawn（夜明けの現場・低コントラストイラスト）生成キュー投入済み
- 主要CTAのグラデ/ホバー/押下感・カード質感・空状態背景はCSSで実装予定

## リッチ化済みページ一覧（マスコット常設）
本番反映済み: トップ / 404 / エラー2種 / 事故DB(空) / 判例(空) / 新着(空) /
教育スライド表紙 / 決済完了 / 問い合わせ完了 / 通知登録完了 / ニュースレター完了 /
サイネージ(ヘッダー) / OGP全ページ / ヘッダー・フッター全ページ

PR-A実装済み（未マージ）: KY一覧 / KY用紙 / 熱中症記録簿 / チャットボット /
横断検索 / 法令ナビ / 化学物質RA / 建設計算 / 事故DBヘッダー / クイズ正解 /
サイネージ朝礼モーダル

未着手（PR-B以降）: 労災判例ヘッダー / 保護具DB / 新着ハブヘッダー / 年間計画 /
健診スケジューラ / 作業環境測定 / 外国人向け / 現場記録 / 防災マップ / 打合せ書 /
法改正一覧 / e-learning本体 / FAQ / about
