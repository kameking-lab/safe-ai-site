# 09. 3デバイス検証

監査方法: `chatbot-panel.tsx`/`ChatbotBody.tsx`のTailwindクラス静的解析。**フルPlaywrightマトリクスは本監査では未実行**（Phase Bでビルド確認時に補完推奨）。

## 9.1 レスポンシブ設計（mobile-first）

- `PageContainer width="wide"`でmax-w制限（プロジェクトのmax-w-7xlルール準拠）。カード`p-4 sm:p-6`
- 例示質問グリッド`grid-cols-1 sm:grid-cols-2`、ツールバー`flex-wrap`
- textarea`text-base sm:text-sm`（iOSズーム防止）、送信/音声ボタン`shrink-0`
- チャット一覧`min-h-[320px] flex-1 overflow-y-auto`

## 9.2 デバイス別評価

- **スマホ375px（現場で質問）**: 概ね良好。ただし(a)assistantメタブロックの固定`ml-10`インデントが横幅を圧迫、(b)6色ピル＋digDeeper＋relatedLawsが縦に積みスクロール負荷大（doc05）
- **タブレット768px（事務所）**: 良好
- **PC1920px（本社）**: max-w制限で横間延びなし。バブル`max-w-[88%]`はワイド画面でやや広いが許容

## 9.3 既知のレイアウト懸念

- `flex h-full`ルート（`:543`）だが親がheight確定のflexコンテナでないため`h-full`/`flex-1`が意図通り効かず、一覧は`min-h`頼み
- エクスポートドロップダウン`absolute right-0`は外側クリッククローズなし

## 9.4 推奨

- **P2**: スマホでの`ml-10`インデント緩和＋アクション行の整理（doc05の3色化と統合）
- **検証P2**: Phase Bで`npx playwright test`の3デバイスマトリクスを1本追加し回帰固定（既存E2E資産流用）

## 9.5 結論

レスポンシブ基本設計は健全で表示崩れの重大欠陥はコード上見当たらない。改善余地はスマホでのアクション過多とインデント。フルデバイス実機検証はPhase B/次セッションで補完。
