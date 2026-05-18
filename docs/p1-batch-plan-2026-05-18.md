# P1残7件 段階的解消計画 — 激辛UX/SEO監査 2026-05-17

- 監査スナップショット: `docs/audit-snapshot-2026-05-17-ux-seo.md`
- 監査ページ: `/audits/2026-05-17-ux-seo`
- ベースHEAD: `504cb8d` (PR #238 mergeされた後)
- 計画作成日: 2026-05-18
- 計画公開URL: `/audits/p1-batch-plan`
- Pro plan期間想定: 2026-05-18 〜 2026-06-15 (28日)

---

## 経緯と前提

監査PR #235で検出された 54件 (P1=12 / P2=30 / P3=12) のうち、**P0級即時対応** として PR #238 で 5件解消済:

| 解消テーマ | 関連finding |
|---|---|
| /api-docs削除 | UX-028 (P1) + SEO-021 (P1) |
| hreflang除去 | SEO-004 (P1) + SEO-005 (P1) |
| BreadcrumbList修正 | SEO-009 (P1) |
| 7目玉統一 | UX-004 (P2) + UX-009 (P2) |
| description短縮 | SEO-007 (P2) |

→ **P1=12件のうち5件処理済 → P1残=7件**。本計画はこの残7件をPro plan期間28日内に確実に消化するもの。

### P1残7件 一覧

| ID | カテゴリ | タイトル要約 | 推定工数 | 該当URL |
|---|---|---|---|---|
| UX-001 | UX-A | トップCTAがメイン3機能と非整合 | 4h | / |
| UX-002 | UX-A | モバイルボトムナビ5項目がメイン3機能と非整合 | 2h | / (mobile) |
| UX-005 | UX-A | Footer『主要機能』7項目がメイン3機能と非整合 | 2h | 全ページfooter |
| SEO-001 | SEO-A | 主要検索クエリで Google圏外 | 4h | /chatbot, /accidents-reports, /strategy/plan-generator |
| SEO-012 | SEO-D | メイン3機能 相互の内部リンク密度低 | 6h | 同上 |
| SEO-015 | SEO-E | 英語コンテンツ client-side i18n のみ → SEO実質ゼロ | 2h (撤去) / 40h (本格) | 全ページ |
| SEO-023 | SEO-H | html lang SSR時 `ja` 固定 | 2h (撤去) / 8h (本格) | 全ページ |

**合計工数:** 22h(撤去案) / 70h+(本格対応案)。Pro 28日内では撤去案を推奨。

---

## Phase A: P1残7件 詳細

### UX-001 [P1/UX-A] メイン3機能がトップCTA・ヒーロー外、戦略との乖離

- **該当URL:** `/`
- **該当機能:** `web/src/components/new-home-hero.tsx`, `web/src/components/home-three-pillars.tsx`
- **修正方針:**
  - ヒーローCTAを3項目に拡張: 安衛法AIチャット (/chatbot) / 業種別 事故分析レポート (/accidents-reports) / 年次安全衛生計画 (/strategy/plan-generator)
  - HomeThreePillars 事故カードの遷移先を `/accidents-reports` に変更
  - 既存 `/accidents` (10年事故DB) はセカンダリリンクに格下げ
- **影響範囲:** ホームページ ヒーロー + HomeThreePillars
- **依存関係:** なし (即時着手可)
- **推定工数:** 4h

### UX-002 [P1/UX-A] モバイルボトムナビ5項目がメイン3機能と非整合

- **該当URL:** `/` (mobile <480px), 全ページ (mobile)
- **該当機能:** `web/src/components/MobileBottomNav.tsx`
- **修正方針:**
  - ITEMS を `[home, chatbot, accidents-reports, strategy/plan-generator, account]` の5項目構成にリプレイス
  - 検索とKYは2タップ以内 (ホーム+1) で到達できるよう、ホーム最上部に専用ショートカット配置
- **影響範囲:** モバイル全ページの底部ナビ
- **依存関係:** なし (即時着手可)
- **推定工数:** 2h

### UX-005 [P1/UX-A] Footer『主要機能』7項目がオーナー戦略メイン3機能と非整合

- **該当URL:** 全ページフッター
- **該当機能:** `web/src/components/footer.tsx:34-70`
- **修正方針:**
  - 『主要機能』カラムを上位3項目 (chatbot / accidents-reports / strategy/plan-generator) に整理
  - 残り4項目は『ツール』『データ』別カラムに移動
  - フッターの順序を docs/homepage の戦略3項目化と一致
- **影響範囲:** 全ページのフッター
- **依存関係:** なし (UX-001/002 と並行可だが Batch1 でまとめると整合性高)
- **推定工数:** 2h

### SEO-001 [P1/SEO-A] 主要検索クエリで安全AIポータルが Google検索結果トップ10圏外

- **該当URL:** `/chatbot`, `/accidents-reports`, `/strategy/plan-generator`
- **該当機能:** 各ページ metadata + ハブ&スポーク構造
- **修正方針:**
  - `/chatbot`, `/accidents-reports`, `/strategy/plan-generator` の title/description を主要キーワード前半に再構成
  - 例: title「安衛法AIチャットボット | 労働安全衛生法を24時間AI質問 — 安全AIポータル」
  - 各ページ冒頭 H2に E-E-A-T シグナル (監修: 労働安全衛生コンサルタント・登録番号) を明示
  - Google Search Console での当該クエリ監視ドキュメントを `docs/seo-kpi-monitoring-2026-05.md` として作成
- **影響範囲:** メイン3機能ページの metadata + ヘッダー文言
- **依存関係:** Batch 1 (メイン3機能のサイト内整合確定後) 完了を推奨
- **推定工数:** 4h

### SEO-012 [P1/SEO-D] メイン3機能 (/chatbot, /accidents-reports, /strategy/plan-generator) 相互の内部リンク密度が低い

- **該当URL:** メイン3機能ページ
- **該当機能:** 各ページのテンプレート (Related modules / Footer CTA)
- **修正方針:**
  - `/accidents-reports` 各業種カードに『この業種の年次計画を作る (/strategy/plan-generator?industry=...)』リンク追加
  - `/strategy/plan-generator` フォーム結果末尾に『生成計画書を AI に質問 (/chatbot)』リンク追加
  - `/chatbot` サイドバーに『関連機能: 業種別事故レポート / 年次計画ジェネレーター』を常時表示
- **影響範囲:** メイン3機能 + 共有 RelatedPageCards コンポーネント
- **依存関係:** Batch 1 完了 (メイン3機能のIA固定後)
- **推定工数:** 6h

### SEO-015 [P1/SEO-E] 英語コンテンツが client-side i18n のみ — Googlebot は静的 HTML の日本語版しか見えない、英語SEO実質ゼロ

- **該当URL:** 全ページ
- **該当機能:** `web/src/contexts/language-context.tsx`, `web/src/components/EnglishBetaBanner.tsx`
- **修正方針:**
  - **撤去案 (推奨, 2h):** EnglishBetaBanner 撤去 + LANGUAGE_LABELS.en を 'English (limited)' に格下げ + EN_FEATURE_COPY を残しつつ Googlebot からは ja のみ index 化を明文化
  - **本格対応案 (40h):** `/en/` プレフィックスルートを Next.js App Router で実装し SSR で英語HTMLを emit
  - Pro 28日内では **撤去案** を採用推奨。本格対応は法人化後の課題に繰り越し
- **影響範囲:** Header, Footer, Banner, EN辞書
- **依存関係:** SEO-023 と必ずセット (同一PR推奨)
- **推定工数:** 2h (撤去案) / 40h (本格案)

### SEO-023 [P1/SEO-H] html lang 属性が SSR では常に `ja` — Googlebot 視点で英語版が存在しないと判定

- **該当URL:** 全ページ
- **該当機能:** `web/src/app/layout.tsx:98`, `web/src/contexts/language-context.tsx`
- **修正方針:**
  - **撤去案 (推奨, 2h):** `<html lang='ja'>` を固定維持。client-side の `applyHtmlLang` 動的変更も停止 (常に ja)。Banner/Toggle 撤去で UX矛盾も解消
  - **本格対応案 (8h):** `[locale]` 動的ルートに変更し SSR で lang を切替
- **影響範囲:** layout.tsx, language-context.tsx
- **依存関係:** SEO-015 と必ずセット (同一PR推奨)
- **推定工数:** 2h (撤去案) / 8h (本格案)

---

## Phase B: 依存関係マップ

```
[Batch 1] 戦略一致 (UX系)
  UX-001 (トップCTA)        ─┐
  UX-002 (モバイルボトムナビ) ─┼─ 並行可・即時着手可 (依存なし)
  UX-005 (Footer)            ─┘
            │
            ▼
[Batch 2] SEO最適化
  SEO-001 (title/desc + E-E-A-T)
  SEO-012 (相互内部リンク強化)
    ↑ メイン3機能のIA確定後 = Batch 1 完了が前提
            │
            ▼ (順序的に後だが、依存なし)
[Batch 3] 多言語SEO決着
  SEO-015 ─┬─ 同一PR (片方だけ修正すると整合性破綻)
  SEO-023 ─┘
  独立 (Batch 1/2 と並行可、但しオーナー戦略判断必要)
```

### 単独実装可能なfinding
- なし。UX-001/002/005 は同じ「メイン3機能」方針なので同一PR推奨
- SEO-015/023 はセットでないと html lang と Banner が不整合
- SEO-001/012 はメイン3機能のIA確定後でないと title/description/internal-link 設計を二度手間

### バッチ実装が効率的なfinding群
- UX-001 + UX-002 + UX-005 → 同一PR (Batch 1)
- SEO-001 + SEO-012 → 同一PR (Batch 2)
- SEO-015 + SEO-023 → 同一PR (Batch 3)

---

## Phase C: バッチ計画 (3バッチ)

### Batch 1 — メイン3機能 戦略一致 (UX系)

| 項目 | 内容 |
|---|---|
| 含まれるfinding | UX-001, UX-002, UX-005 |
| 件数 | 3件 |
| 合計工数 | 8h |
| 推奨着手日 | 2026-05-19 |
| 完了目標 | 2026-05-22 (3-4日) |
| 依存関係 | なし (即時着手可) |
| PR名案 | `fix(ux-main3): align Hero CTA + MobileBottomNav + Footer with chatbot/accidents-reports/strategy main 3 features` |
| マージ後の期待効果 | サイト全体のナビ・CTA・Footer がオーナー戦略「メイン3機能」と一致。第三者監査の「戦略⇄実装の乖離」総評を解消 |

### Batch 2 — メイン3機能 SEO最適化

| 項目 | 内容 |
|---|---|
| 含まれるfinding | SEO-001, SEO-012 |
| 件数 | 2件 |
| 合計工数 | 10h |
| 推奨着手日 | 2026-05-23 |
| 完了目標 | 2026-05-29 (5-6日) |
| 依存関係 | Batch 1 完了 (メイン3機能のIA固定後でないと title/internal-link を再設計しがち) |
| PR名案 | `fix(seo-main3): rewrite title/description + add reciprocal internal links across main 3 features` |
| マージ後の期待効果 | メイン3機能の Google検索インプレッション向上の土台 (KPI: GSC で 1ヶ月後の impressions +50% 目標)。PageRank流通効率改善 |

### Batch 3 — 多言語SEO決着 (撤去案)

| 項目 | 内容 |
|---|---|
| 含まれるfinding | SEO-015, SEO-023 |
| 件数 | 2件 |
| 合計工数 | 4h (撤去案) |
| 推奨着手日 | 2026-05-30 |
| 完了目標 | 2026-06-02 (3-4日) |
| 依存関係 | なし (Batch 1/2 と並行可、ただしオーナー戦略判断必要) |
| PR名案 | `fix(seo-i18n): retire half-baked client-side English UI to stop GSC mixed-signal` |
| マージ後の期待効果 | GoogleSearchConsole の不適切判定リスク解消。SSR HTML が `lang=ja` のみで一貫し、Googlebot の混乱を排除。法人化後に `/en/` プレフィックスで本格再開を別計画化 |

### バッチ間の依存関係

```
Batch 1 ──► Batch 2 (前提依存)
Batch 3 ──► 独立 (どこに挟んでもOK)
```

### スケジュール概要

| バッチ | 推奨着手日 | 完了目標 | 工数 | finding数 |
|---|---|---|---|---|
| Batch 1 | 2026-05-19 | 2026-05-22 | 8h | 3件 |
| Batch 2 | 2026-05-23 | 2026-05-29 | 10h | 2件 |
| Batch 3 | 2026-05-30 | 2026-06-02 | 4h | 2件 |
| **合計** | **15日間** | **2026-06-02完了** | **22h** | **7件** |

Pro plan 28日 (〜2026-06-15) に対し約2週間の余裕あり。Batch 2/3 でブロックが発生しても Pro期間内完了は確実。

---

## Phase D 採用/不採用判断テンプレート

```
UX-001 ?  ?  ?  ?
UX-002 ?  ?  ?  ?
UX-005 ?  ?  ?  ?
SEO-001 ?  ?  ?  ?
SEO-012 ?  ?  ?  ?
SEO-015 ?  ?  ?  ?  ← 撤去 / 本格対応 の二択
SEO-023 ?  ?  ?  ?  ← 撤去 / 本格対応 の二択
```

形式: `<ID> <採否(adopt/defer/reject)> <担当者> <着手予定週> <備考>`

### オーナー判断ポイント

- **SEO-015 / SEO-023** で「撤去案 (推奨)」と「本格対応案」のどちらを採用するか。本格対応は単独で40h+ あり Pro 28日内では他バッチ犠牲必要。法人化後の課題に繰り越すなら撤去案で確定
- **Batch 2 の KPI 監視** を `docs/seo-kpi-monitoring-2026-05.md` として運用するか (週次GSC スナップショット保存)。Yes なら追加2h

---

## 関連リンク

- 監査スナップショット: `docs/audit-snapshot-2026-05-17-ux-seo.md`
- 監査ページ: `/audits/2026-05-17-ux-seo`
- P0処理PR: #238 (`701dfa9`)
- 本計画公開ページ: `/audits/p1-batch-plan`
- 過去のP1計画 (PR #187): `docs/p1-batch-plan-2026-05-16.md`
