# Hobby復帰ベースライン 2026-05-19

調査日: 2026-05-19
計測タイプ: モックデータ（VERCEL_TOKEN未設定）
キャリブレーション根拠: 引継ぎ文 ISR Writes ~1.1M / Edge Requests ~1.6M / Fast Origin ~30GB（5月実績）
対応公開ページ: /audits/hobby-recovery-forecast-2026-05-19
次回再計測タイミング: Dispatch A完了後 / Dispatch B完了後 / 2026-06-10時点

---

## 1. Hobby プラン月間上限（2026-05時点）

| クォータ | Hobby月間上限 | 単位 | 備考 |
|----------|-------------|------|------|
| Bandwidth | 100 | GB | |
| Function Invocations | 100,000 | count | |
| Build Execution | 6,000 | minutes | |
| Edge Requests | 1,000,000 | count | |
| ISR Writes | 200,000 | count | ← メインボトルネック |
| Image Optimization | 1,000 | count | |
| Fast Origin Transfer | 上限なし | GB | 参考値として追跡 |

出典: vercel.com/docs/limits、limits.ts に定義

---

## 2. 現状データ（2026-05-19、月19日目）

### 日次平均（14日トレンド）

| クォータ | 日次平均 | 算出根拠 |
|----------|---------|---------|
| Bandwidth | 0.60 GB/日 | mock.ts DAILY_TARGETS |
| Function Invocations | 1,200 件/日 | mock.ts DAILY_TARGETS |
| Build Execution | 30 分/日 | mock.ts DAILY_TARGETS |
| Edge Requests | 53,000 件/日 | mock.ts DAILY_TARGETS（引継ぎ 1.6M/30=53K） |
| ISR Writes | 36,000 件/日 | mock.ts DAILY_TARGETS（引継ぎ 1.1M/30=36.7K） |
| Image Optimization | 18 件/日 | mock.ts DAILY_TARGETS |
| Fast Origin Transfer | 1.00 GB/日 | mock.ts DAILY_TARGETS（引継ぎ 30GB/30） |

### 月次累計（day 19 of 31、×19日）

| クォータ | MTD値 | Hobby上限 | MTD使用率 | ステータス |
|----------|-------|----------|---------|---------|
| Bandwidth | 11.40 GB | 100 GB | 11.4% | 正常 |
| Function Invocations | 22,800 | 100,000 | 22.8% | 正常 |
| Build Execution | 570 分 | 6,000 分 | 9.5% | 正常 |
| Edge Requests | 1,007,000 | 1,000,000 | **100.7%** | ⚠ 超過 |
| ISR Writes | 684,000 | 200,000 | **342%** | 🚨 深刻超過 |
| Image Optimization | 342 | 1,000 | 34.2% | 正常 |
| Fast Origin Transfer | 19.0 GB | — | 参考値 | — |

### 月末予測（14日平均 × 30日、Hobby復帰判定モデル）

| クォータ | 月間予測 | Hobby上限 | 予測使用率 | 判定 |
|----------|---------|---------|---------|------|
| Bandwidth | 18.0 GB | 100 GB | 18.0% | **ready** |
| Function Invocations | 36,000 | 100,000 | 36.0% | **ready** |
| Build Execution | 900 分 | 6,000 分 | 15.0% | **ready** |
| Edge Requests | 1,590,000 | 1,000,000 | **159.0%** | **blocked** |
| ISR Writes | 1,080,000 | 200,000 | **540.0%** | **blocked** |
| Image Optimization | 540 | 1,000 | 54.0% | **ready** |
| Fast Origin Transfer | 30.0 GB | — | 参考値 | — |

**総合判定: BLOCKED**（ISR Writes 540%、Edge Requests 159%）

---

## 3. 判定モデル仕様

- 実装ファイル: `web/src/lib/vercel-monitoring/forecast.ts`
- 計算ロジック: 直近14日の日次平均 × 30日 = 仮想1ヶ月使用量
- Hobby復帰可否:
  - `ready` = 予測 ≤ 80% of Hobby上限
  - `borderline` = 80% < 予測 ≤ 100%
  - `blocked` = 予測 > 100%
  - 全クォータの最悪値で総合判定
- 閾値定数: WATCH_PERCENT=80 / WARN_PERCENT=95 / CRITICAL_PERCENT=100（status.ts）

---

## 4. 3シナリオ予測

### シナリオ1: 何もしない（現状維持）

| クォータ | 月間予測 | 使用率 | 判定 |
|----------|---------|-------|------|
| ISR Writes | 1,080,000 | 540% | **blocked** |
| Edge Requests | 1,590,000 | 159% | **blocked** |
| その他5クォータ | — | 15〜54% | ready |
| **総合** | — | — | **BLOCKED** |

Hobby復帰可能性: 0%

### シナリオ2: Dispatch A完了（F-005 CDNキャッシュ）

変更点: 動的AIルート10本（chat/chatbot/law-summary/quiz-explain/ky-assist/summaries/translate/safety-alert/sds/goods-chat）に Cache-Control s-maxage を追加し、リピートクエリをEdge CDNでキャッシュ。

推定効果:
- Function Invocations: キャッシュヒット率40%想定 → 1,200×0.6=720/日 → 21,600/月 → **21.6%（ready↑）**
- Edge Requests: Vercelの課金モデルではCDNキャッシュヒットもEdge Requestにカウントされるため変化なし → 1,590,000 → **159%（blocked）**
- ISR Writes: AI routeのキャッシュとISR writeは別メトリクス。変化なし → 1,080,000 → **540%（blocked）**

**総合判定: BLOCKED**（ISR Writes/Edge Requestsは未解決）

Hobby復帰可能性: 0%（Function Invocationsの改善のみでは不十分）

### シナリオ3: Dispatch A+B両方完了

Dispatch A（CDNキャッシュ）＋ Dispatch B（ISR削減）

Dispatch B主要施策:
- ISRを使用しているページのrevalidate時間を延長
  - /api/signage/jma: 300s → 3600s（12倍延長）
  - /api/signage-data 内部fetch: 3600s → 21600s（6倍延長）
  - /api/weather-forecast: 3600s → 21600s（6倍延長）
  - ISR有効ページ全体でrevalidateを平均10x以上延長
- [skip ci] 運用の徹底（ビルドトリガー削減）
- 一時的な高頻度ポーリング源の特定と制御

ISR削減後の予測（保守的、10倍削減想定）:
- ISR Writes: 36,000 / 10 = 3,600/日 → 108,000/月 → **54%（ready↑）**

Edge Requestsの不確実性:
- 保守的（ISR相関なし）: 1,590,000 → **159%（blocked）**
- 中間（ISRが20%に寄与）: 1,590,000 × 0.82 = 1,303,800 → **130%（blocked）**
- 楽観的（ISRが60%に寄与）: 1,590,000 × 0.46 = 731,400 → **73%（ready）**

| クォータ | 月間予測（中間推定） | 使用率 | 判定 |
|----------|---------|-------|------|
| ISR Writes | 108,000 | 54% | **ready** |
| Edge Requests | 1,303,800 | 130% | **blocked** |
| Function Invocations | 21,600 | 21.6% | **ready** |
| その他4クォータ | — | 9〜54% | ready |
| **総合** | — | — | **BLOCKED** |

**総合判定（中間推定）: BLOCKED**
ただしISR Writesは解決済み。Edge Requestsのみが残存課題。

Edge Requests要追加対策候補（A+B以外）:
1. クローラー制御強化（PR #239の効果検証後に追加ブロック検討）
2. Signageページのポーリング間隔最適化
3. 短時間での大量リクエスト源の特定（ログ解析必要）

Hobby復帰可能性: **約25〜35%**
（ISR Writesは高確率で解決、Edge Requestsの挙動によって全体判定が決まる）

---

## 5. 6/15 ダウングレード判断基準

Vercel Proプラン期限: 2026-06-15

| 判断基準 | 条件 | アクション |
|----------|------|-----------|
| 6/10時点 全クォータ ready | 全クォータ ≤ 80% 予測 | Hobby降格実行 |
| 6/10時点 borderline | ISR: ready、Edge: borderline | Hobby降格（超過時の暫定的サービス低下を許容） |
| 6/10時点 blocked | いずれかのクォータ > 100% | Pro継続 or 追加対策実施 |

注: Hobbyプランでクォータ超過となった場合、そのクォータに依存する機能が停止する（ISR Writesオーバーでページ更新停止、Edge Requestsオーバーで全ページ返答不可）。

---

## 6. 次回再計測手順

再計測は以下のいずれかのタイミングで実施:

### A. Dispatch A完了後
1. 本番デプロイ後24〜48時間待機（日次平均の安定を待つ）
2. Vercelダッシュボードで Edge Requests / Function Invocations の日次推移を確認
3. `/admin/health-check?key=<STRATEGY_AUTH_PASSWORD>` でスナップショット取得
4. `docs/perf/hobby-post-dispatch-a-<date>.md` に記録
5. 本ベースライン比で Function Invocations の削減率を検証（目標: 40%以上）

### B. Dispatch B完了後
1. 本番デプロイ後48〜72時間待機（ISR Writesは新revalidate時間が経過しないと効果が出ない）
2. Vercelダッシュボードで ISR Writes の日次推移を確認
3. `/admin/health-check?key=<STRATEGY_AUTH_PASSWORD>` でスナップショット取得
4. `docs/perf/hobby-post-dispatch-b-<date>.md` に記録
5. 本ベースライン比で ISR Writes の削減率を検証（目標: 85%以上 → 5,400/日以下）

### C. 6/10時点（最終判断前）
1. 6/10に最終スナップショット取得
2. 全クォータの月間予測を確認
3. 6/15 ダウングレード可否を最終判定
4. `docs/perf/hobby-final-check-2026-06-10.md` に記録

---

## 7. 予測計算根拠

```
# 日次平均導出
ISR Writes/日 = 1,100,000 / 30 ≈ 36,667（引継ぎ 1.1M → mock 36,000に丸め）
Edge Requests/日 = 1,600,000 / 30 ≈ 53,333（引継ぎ 1.6M → mock 53,000に丸め）
Fast Origin/日 = 30 / 30 = 1.0 GB（引継ぎ 30GB）

# Hobby復帰判定モデル
projected_monthly = daily_avg_14d × 30
verdict = "ready" if projected_monthly <= limit × 0.80
verdict = "borderline" if projected_monthly <= limit
verdict = "blocked" if projected_monthly > limit

# ISR削減後の予測（シナリオ3）
isr_after_b = 36,000 / 10 = 3,600/日（10倍延長想定）
isr_monthly_after_b = 3,600 × 30 = 108,000 → 108,000/200,000 = 54% → ready

# Edge Requests削減推定（中間値）
isr_edge_contribution = 0.20  # 仮定: Edge Requestsの20%がISRに起因
edge_after_b = 53,000 × (1 - isr_edge_contribution × (1 - 1/10))
             = 53,000 × (1 - 0.20 × 0.90)
             = 53,000 × 0.82
             = 43,460/日
edge_monthly_after_b = 43,460 × 30 = 1,303,800 → 130% → blocked
```

---

## 8. データソース信頼性

- データソース: `mock`（VERCEL_TOKEN未設定のためモックデータ）
- キャリブレーション元: 引継ぎ文「5/1以降の超過実績」ISR ~1.1M/Edge ~1.6M/FastOrigin ~30GB
- 実測値との乖離リスク: 中程度
  - PR #239（AIクローラーブロック）の実際の効果が反映されていない可能性
  - JMAスケジュールクロン実行頻度の日変動
  - CI/CDビルドトリガー数の変動
- リアルデータ取得方法: Vercel環境変数に VERCEL_TOKEN + VERCEL_TEAM_ID を設定し /admin/health-check を参照

---

## 9. ISR Writes 高騰の推定原因

調査時点での仮説:

1. **高頻度ポーリングAPIルート**
   - `/api/signage/jma`: revalidate=300s → 最大288回/日の背景再生成
   - `/api/signage-data`: revalidate=3600s → 最大24回/日
   - `/api/weather-forecast`: revalidate=3600s → 最大24回/日
   - これらが複数のSignageクライアントからポーリングされると乗数倍増

2. **Googlebot等クローラーによる全ページ巡回**
   - sitemap.ts 推計 2,800〜3,500 URL
   - 各ページが1日1回以上巡回 + revalidate経過 → 1 ISR Write/ページ/巡回
   - 1,000ページ × 1回/日 = 1,000 ISR Writes/日
   - この仮説では36,000/日を説明するには36,000ページ分の巡回が必要（過大）

3. **CIビルドによるISRキャッシュ全体パージ**
   - Vercelは新デプロイ時にISRキャッシュをパージ
   - パージ後の初回リクエストがISR Write
   - 1日2デプロイ × 3,000ページ × 初回リクエスト率50% = 3,000 ISR Writes/日
   - [skip ci]徹底で削減可能

実際の高騰原因はVercelダッシュボードのログで特定が必要。

---

ファイル生成日: 2026-05-19
生成コミット: (PR作成後に記録)
比較対象: docs/perf/hobby-post-dispatch-a-*.md（Dispatch A完了後に作成）
