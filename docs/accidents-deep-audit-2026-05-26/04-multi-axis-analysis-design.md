# 04 多観点分析機能（軸4）

## 現状（既に充実）
- 統計ダッシュボード（/accidents-reports）に: 業種別（industry-report）、月次トレンド（monthly-trend-chart）、年次、年齢別、事故型別、業種比較（comparison）、予防チェックリスト。
- 集約データ: aggregates-mhlw に by-age / by-industry / by-month / by-year / by-type-industry / deaths-by-* / industry-profiles / industry-ranking。
- AccidentCase 観点フィールド: 事故型(type)・業種(workCategory/industry_detail)・被害程度(severity)・原因(mainCauses)・労働者属性(worker_attribute)・事業所規模(company_size)・発生日(occurredOn)。

## 充足している観点
業種別・事故型別・年齢別・月別・年別・被害程度・原因・業種比較。

## データが薄く創作禁止のため追加困難な観点
- 時間帯別・曜日別・経験年数別・性別の**構造化集計**: 既存データに確実な値が無い。死傷DB（公式）には年齢・時間の軸があるが取込未実装。→ **公式データ取込（軸2/6）後に拡張**。現状は推測で作らない。

## 改善余地（実装可能・創作不要）
- M-1 クロス分析の強化: 「業種×事故型」「年齢×事故型」のクロス表は by-type-industry / by-age があり拡張可能。
- M-2 直感的グラフの追加（既存 recharts 等の流用）: 構成比・推移を1画面で。
- M-3 「気軽に」入口: 業種を1タップ選ぶと主要観点サマリーが出る導線（軸12）。

## 優先度
- P1: 既存集約データの未活用クロス（業種×事故型）の可視化強化。
- P2: 公式データ取込後に 時間帯/経験年数 軸を追加（データ確保が前提、創作禁止）。
