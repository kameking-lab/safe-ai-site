# 柱1是正: isNewSince が未来日を「新着」と恒久判定（/whats-new・新着バッジ）

日付: 2026-06-11 / 発見経路: 柱0タスク（/whats-new ビジュアルファースト化）の無読テスト HM-3 で実機検出

## 前任の判断

`web/src/lib/news-hub-types.ts` の新着判定（news-completion 2026-05-29 で導入）:

```ts
export function isNewSince(item, lastVisit, now = new Date()) {
  return lastVisit ? item.date > lastVisit : isRecent(item.date, 30, now);
}
```

- 初訪問側（`isRecent`）には「未来日は新着扱いしない」のガードとコメントがある。
- 再訪問側（`lastVisit` 分岐）は単純な文字列比較 `item.date > lastVisit` のみ。

## Fable の発見

法改正アイテムは `date = enforcement_date || publishedAt`（news-hub.ts:51）であり、**施行日が将来の改正は date が未来日**になる。このため再訪問ユーザーには:

- 未来日アイテムが**毎回「新着」バッジ付き**で表示され続ける（lastVisit をいくら更新しても `未来日 > 今日` は真のまま）。
- 「新着のみ」フィルタ・新着件数も同様に**ゼロに到達できない**＝「全部確認した」状態が存在しない。
- 偽警告の常態化はオオカミ少年化（柱0の色文法ルールが禁じる事象そのもの）。記録キット改修(#486)では「報告ゼロは青=偽安心防止」まで設計していた前任が、新着ハブでは逆向きの偽警告を見落とした。

再現: Playwright で `lastVisit=2020-01-01` を仕込み /whats-new 閲覧→トップ復帰でバッジが消えない（無読テスト HM-3 が FAIL）。

## 是正内容

- `isNewDateSince(date, lastVisit, now)` を新設し、lastVisit 分岐に `date <= 今日(ローカルYMD)` を追加（`isRecent` のコメント済み方針と整合）。`isNewSince` はこれに委譲。
- 回帰テスト追加: `news-conclusions.test.ts`（未来日はバッジ・件数に数えない／施行日が将来の改正だけなら緑=新着なし）。
- 「施行が近い」ことの告知は、同PRで導入した結論カードの**黄=施行間近（60日以内・残日数つき）**が正規の経路として担う＝未来日情報は失われない。

## 影響範囲

`isNewSince` の使用箇所は /whats-new クライアントと新設の結論関数のみ（メール配信セグメントは別関数）。既存テスト 1497 件パス・無読テスト 27/27 PASS。
