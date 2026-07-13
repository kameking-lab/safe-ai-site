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

第3波15種（PR-B）:
- 合格・配置済み9種: court-scale(判例) / news-read(新着) / health-check(健診) /
  measure-meter(作業環境測定) / stamp-doc(現場記録) / weather-look(通知) /
  tablet-dx(機能一覧) / calculator(建設計算・safe判定時のみ) / trophy(e-learning進捗)
- 再生成待ち6種: ppe-check / calendar-plan / first-aid / sleeping（十字が黒で棄却）、
  rain-coat（偽市松）、world-friends（未生成）
  ※ 2026-07-12 22:50頃 ChatGPTのレート制限モーダル
  （modal-conversation-history-rate-limit）に到達。規律通り突破せず冷却待ち。
  本日の実測: 1日で約60枚生成した時点で発動。再開後 --only で6種を回す

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

PR-B実装済み（未マージ）: 労災判例 / 新着ハブ / 健診スケジューラ / 作業環境測定 /
現場記録 / 通知センター / 機能一覧 / 建設計算結果 / e-learning進捗

未着手（再生成待ち含む）: 保護具DB(ppe-check) / 年間計画(calendar-plan) /
両立支援(first-aid) / 外国人向け(world-friends) / オフライン(sleeping) /
気象警報フォーム(rain-coat) / 法改正一覧 / FAQ / about


## 第4波（2026-07-13・PR#963/#964）
- 絵文字→lucide/自作ピクト 約95箇所置換: chatbot(21)/KY用紙(13)/保護具(12・自作PPEピクト活用)/
  化学RA(8)/天気グリフ(13)/ペルソナ3頁(26)/打合せ書(5)＋死コードhome-value-hero削除(16)
- ポーズ: calendar-plan構図変更（手帳+ペン）で合格→年次計画配置＝**32種体制**。
  rain-coatは計4回＋機械リタッチ不成立で**恒久温存**（weather-lookが防災文脈を代替）
- 面リッチ化第2弾: SectionWave（インラインSVG波デバイダ）＋トップのセクション地色リズム＋タイル質感
- E2E追従: 絵文字ラベル参照2spec修正。lucide Mapのグローバル衝突はエイリアスで回避
- 残存絵文字: 約230個/58ファイル（glossary等の長尾・各1〜9個）→次節


## 第5波（2026-07-13・PR#966/#967/#968）
- 絵文字掃討完遂: ユーザー露出214→26個（3並行エージェントで87ファイル約190箇所置換、
  tsc/lint/build/再カウントで検収）。残置26個は全て理由付き（Leaflet地図マーカー同一性・
  文字列リテラル・コメント・iOS共有模倣・データ由来）。admin6個は対象外継続
- LCP検証の決着（実測5回×3条件のA/B）: 面装飾チューン(#967)無効・GTMブロック無効・
  画像ブロック無効→キャンペーン要素は全て容疑から除外（perf96/CLS0維持、中央値2.7s）。
  残る仮説=週末レーンマージ群のJS総量増。issue #960に実測追記済み
- 面リッチ化横展開: エメラルドグラデのヘッダーバンドを construction-calc / law-navi /
  chatbot / education/pack / features に統一適用、education/packにteacher配置
- テスト追従: 絵文字ラベル参照の44px系unit3本＋ky-canvas e2eを修正
