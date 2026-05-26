# 01 現状機能の網羅的把握とデッドコード探索（軸1）

調査日: 2026-05-26 / main HEAD 581058e2

## 重大発見: サイネージは「2系統」が未統合で並存

| 系統 | ルート | 目的 | 入力源 | 状態 |
|---|---|---|---|---|
| 系統1 KY朝礼サイネージ | `/ky/morning` | KY用紙を全画面表示し朝礼唱和 | KY用紙(`ky-record` localStorage)/6桁コード | 朝礼特化・シンプル(268行) |
| 系統2 現場ダッシュボード | `/signage`, `/signage/display`, `/signage/map` | 気象警報・労災ニュース・法改正・図面・天気の常設表示 | API(気象庁/ニュース/法改正) | 高機能(components/signage/* 約1,673行) |

→ この2つは**互いにリンクが弱く**、別物として育っている。1日フロー（軸9）の分断の根本原因。

## 系統1: KY朝礼サイネージ `/ky/morning`

構成ファイル:
- `components/ky-morning-signage.tsx`(268行) — 本体
- `components/morning-digest.tsx`(230行) — ※`/ky/morning` から参照されていない（要確認＝デッドコード候補）
- `lib/ky/signage-code.ts`(16行)+`.test.ts` — 6桁コード生成（24h TTL・衝突回避）
- `app/api/ky/signage/route.ts`(85行) — signage_sessions 読み書き

機能:
- 端末内 `ky-record` 表示 または `?code=6桁` でクラウド共有KY取得（8秒ポーリング）
- 表示: 日付/天気・本日の主な作業・リスクTop3・行動目標・指差呼称
- 唱和カウントダウン10秒＋880Hzビープ1回
- 6桁コード入力フォーム（別端末から開く）

入力経路: KY用紙(`ky-paper-view.tsx`)の「サイネージへ」「別端末で共有」ボタン → 6桁コードは**通知テキストで表示**（QRなし・モーダルなし）。

## 系統2: 現場ダッシュボード `/signage`

機能（既にかなり成熟）:
- 表示モード3種: 図面(floorplan)/地図(map)/作業資料(workdocs)
- **シナリオプリセット**: 朝礼前🌅/休憩時間☕/退場時🌆（C-003、既存！）
- 縦長/横長切替（縦置きTV対応・localStorage保持）
- 地点選択、気象庁警報マップ、労災ニュースRSS、法改正Top5、毎時天気
- 自動更新60分・visibility考慮、フロアプランエディタ、本日の書類
- スマホには「PC・大画面TV表示用」バナー
- サブルート: `/signage/display`(全画面)、`/signage/map`(地図単体)

到達経路: footer / for/construction / safety-signs / chatbot から（＝発見可能）。

## デッドコード/重複候補
- `components/morning-digest.tsx`(230行): `/ky/morning` から未参照。要grep精査（別ページ専用か、本当に死んでいるか）。
- `components/today-safety-dashboard.tsx`: `ky-record` を読む別ダッシュボード。系統1/2との役割重複の可能性。
- 系統1と系統2で「サイネージ」概念が二重定義 → 用語・導線の統一が必要。

## 整合性チェック結果
- `ky-record` localStorage キー: 書込(ky-paper-view)と読込(ky-morning-signage)で一致 → **分裂バグなし（健全）**。
- 6桁コードロジック: 24h TTL・衝突6回再試行・期限切れ410 → 設計は堅実。
- **本番では signage_sessions が permission denied で6桁共有が機能していない**（Phase A G-1参照）。コードは正しいがインフラ障害。

## i18n
- next-intl 等の多言語ライブラリ**未導入**。全UI日本語ハードコード。翻訳ファイルなし（軸7はグリーンフィールド）。
