# サイネージ 死蔵部品 棚卸し＆結線可否判定（2026-06-09）

BACKLOG軸2タスク「死蔵サイネージ部品の棚卸し＆結線可否判定（signage-risk-prediction / signage-danger-alert / signage-featured-goods / japan-weather-map が参照0件）。価値あるものは結線、不要は削除して保守負債を減らす。」の実施記録。

## 調査方法
`web/src/` 全体を対象に、各コンポーネント名（`SignageRiskPrediction` 等）を grep し、自ファイル以外からの参照を確認。4部品とも自ファイル以外からの import 0件＝死蔵を確認。
ただし削除前に「同じ補助ファイルを生きた機能が共有していないか」を依存グラフで確認した（重要）。

## 判定結果

| 部品 | 内容 | 判定 | 根拠 |
|------|------|------|------|
| `signage-risk-prediction.tsx` (`SignageRiskPrediction`) | 気象（気温・降水）から当日のリスク（熱中症・週明け注意・降雨スリップ等）を `computeTodayRisks` で自動判定し色分け表示。`/risk-prediction` へ導線。 | **結線** | サイネージのコア用途（朝礼前の安全要点把握）に直結。表示データ `state.riskData`(SiteRiskWeather) は既に取得済で追加フェッチ不要。`useMemo` ベースの純導出で副作用なく安全。6月＝熱中症期で価値が最大。 |
| `japan-weather-map.tsx` (`JapanWeatherMap`) | モックの地域ブロック着色マップ。コメントで「気象庁の注意報・警報とは一致しません」と明示。 | **削除** | サイネージ map モードには既に**実データ**の `JapanPrefectureWarningMap`(気象庁JSON) が結線済で上位互換。本ラッパーはモック前提で誤解を招き、どこからも使われない純然たる負債。 |
| `signage-danger-alert.tsx` (`SignageDangerAlert`) | 高リスク警報検知で全画面赤アラート＋音声読み上げ。手動発動ボタン＋警報時自動発動チェックボックス。 | **保留（後続タスク化）** | 緊急アラートとして価値は高いが、`useEffect` 内 `setState`（自動発動）の挙動は要慎重検証（チャットボットの無限再レンダリング事故と同型の注意点）。結線UIの1画面フィット影響も含め、独立タスクで丁寧に実装・実機検証する。 |
| `signage-featured-goods.tsx` (`SignageFeaturedGoods`) | Amazon/楽天アフィリエイトの安全グッズ一覧。 | **保留（オーナー判断・Path A）** | サイネージ（現場掲示）にアフィリエイト商品を出す是非は収益方針＝オーナー判断事項（CLAUDE.md: アフィリエイト関連はオーナー確認）。専用 `/goods` ページが既にあるため機能欠落はない。 |

## 削除前の依存確認（誤削除防止）
- `japan-weather-map-mock.ts` と `japan-map-svg.tsx` は **生きている**（`/api/signage-weather` ルート・`/risk` の `WeatherForecastPanel` が使用）。よってモック/SVGは温存し、**ラッパー `japan-weather-map.tsx` 1ファイルのみ削除**。

## 実施した変更
1. `SignageRiskPrediction` をサイネージ右サイドバー先頭に結線（`weatherData={state.riskData}`）。サイドバー用に section へ `xl:max-h-[34vh]` と `shrink-0` を付与し、既存のトレンド/法改正(flex-1)の表示領域を圧迫しないよう上限を設定。
2. `japan-weather-map.tsx`（孤立ラッパー）を削除。

## 検証（Playwright 実機）
- `/signage` を 1920×1080（横長TV）で描画。`本日のリスク予測` 見出しの存在を確認。
- **1画面フィット維持**: 横方向オーバーフロー 0px・縦方向オーバーフロー 0px（`scrollWidth==clientWidth==1920`, `scrollHeight==clientHeight==1080`）。
- 1080×1920（縦長TV）でも横オーバーフロー 0px。
- スクリーンショット: `signage-risk-prediction-wired-2026-06-09.png`（右上に赤の高リスクカード＝6月の熱中症高リスクを先頭表示）。

## ゲート
tsc=0 / lint errors=0 / vitest=1105 pass / build=成功。架空0・水増し0・既存破壊0。env/DB変更なし。
