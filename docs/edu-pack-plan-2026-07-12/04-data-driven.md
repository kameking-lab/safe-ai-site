# 04 データドリブンの中身 — 「直近の災害データと対策を常時反映」の実装設計

- 差別化(2)の実装原理。**hazard-slides(#881)の追従モデルをそのまま流用する**: 新規cron・中間層は作らず、「月次ETLがデータJSONをコミット→再デプロイ時に build 関数が再計算→静的再生成」(`web/src/lib/hazard-slides/build-summary.ts` L20-30 の確立済みdocコメント)。
- 本docは設計のみ。実装はEDU-D3(BACKLOG-data)・量産はEDU-S*(BACKLOG-ux-records)。

## 1. 教材の標準構成(1デッキの中身)

法定科目スライド(02のゲート対象)に、以下の**データ層スライド**を織り込む。順序は「最新統計→多い原因→実事例(出典付き)→対策→確認テスト」。

1. **最新統計**: 当該教育に対応する災害の型(下記マッピング)の死傷者数・死亡者数・順位・トレンド。データ源=`web/src/data/aggregates-mhlw/`(50万件事前集計・2006-2021)+`summary-2025-preliminary.json`(速報)+死亡個票(`deaths-mhlw/` 4,700件超)。hazard-slides の `HazardTypeSummary.kpi` の再利用。
2. **多い原因**: 型×業種 Top・時間帯分布・起因物(`topCauses`/`timeDistribution` 再利用)。
3. **実事例(出典付き)**: `loadCombinedCases()` の死亡個票+curated事例から当該型・当該業務の事例を採用。出典表記は既存 `FeaturedHazardCase` 作法(発生年・業種・出典)。**捏造0原則: 実在レコードのみ・要約は原文の範囲内**。
4. **対策**: `MEASURES_BY_TYPE`(対策辞書)+法令ナビ深リンク(`findEntryByShort()` → `/law-navi/[lawId]/[artSlug]`)。配布PPTX/PDFでは深リンクをQRコード or 短縮URL文字列で印字。
5. **確認テスト**: `QUIZ_BY_TYPE` → `LearningQuestion` 共通型。Web版は既存 QuizSlide(即時正誤+解説+AI解説API)、配布版は巻末に設問+正解表。Eラーニング(`/e-learning?theme=...`)への深リンクで受講後の復習導線も既存機構で成立。

## 2. 教育種別→災害の型マッピング(新規・小さい辞書)

hazard-slides は「災害の型」(21分類)軸、教育は「業務」軸なので、変換辞書を1つ作る。

```ts
// 例: web/src/data/education-curriculum/hazard-mapping.ts
export const CURRICULUM_HAZARD_MAP: Record<string, HazardTypeSlug[]> = {
  "se-36-41-fullharness": ["fall"],                    // 墜落・転落
  "se-36-4-teiatsu": ["electric-shock"],               // 感電
  "circular-necchu": ["extreme-temperature"],          // 高温・低温との接触
  // ...
};
```

- 型正規化層(`web/src/lib/accidents/type-normalization.ts`)の `HazardTypeSlug` union を使うため、未知キーはコンパイル+既存テストで検出される。
- 業種の絞り込み(例: フルハーネスは建設業比重)はスライド側で `topIndustries` を業務文脈でフィルタ。

## 3. 更新の自動追従と「鮮度の可視化」

- 月次: `etl-mhlw-monthly.yml`(毎月15日)が速報JSONを更新 → 統計スライドは再デプロイで自動追従。`dataAsOf`(既存フィールド)を統計スライドの隅に必ず印字し、**配布物にも「データ基準日」が残る**ようにする。
- 通達・告示の改正: 02の正本スナップショットが赤くなる → 教材更新を強制。今回の実例: `data/seminars/necchu.yaml` の準拠通達が旧「基発0420第3号」のまま残留(Eラーニング側は #95 で現行「基発0318第1号」に是正済み、PPTXだけ取り残し)。**単一正本化(02の層1)がこの再発を構造的に防ぐ**。
- 年次: 確定統計(死傷病報告確定値)反映は既存ETLのデータ更新に追従。教材側の作業ゼロ。

## 4. 競合との線引き(この設計が生む差)

- 建災防・中災防・メーカー資料は「発行時点の統計」で静止する(改訂は年〜数年単位)。本パックは**月次で統計・速報が動き、基準日が教材に印字される**。
- 「その辺の無料教材」は根拠条文・出典が薄い。本パックは全対策文に法令ナビ深リンク(条番号レベル)+事例に出典が付く。
- 差別化の証明はどちらも機械的(ETLコミット履歴・CIゲート)で、宣伝文句に依存しない。
