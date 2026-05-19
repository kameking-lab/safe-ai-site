# P3残10件 段階的解消計画 — 激辛UX/SEO監査 2026-05-17

- 監査スナップショット: `docs/audit-snapshot-2026-05-17-ux-seo.md`
- 監査ページ: `/audits/2026-05-17-ux-seo`
- 計画公開URL: `/audits/p3-batch-plan`
- ベースHEAD: `79ca42c` (PR #246 merged)
- 計画作成日: 2026-05-19
- Pro plan期間想定: 2026-05-19 〜 2026-06-15 (28日)
- 関連先行PR: #238 (P0級5件) / #241 (P1 Batch 1) / #242 (SEO-001 hub) / #244 (P1 final close) / #245 (Copilot) / #246 (P2 Batch 1)

---

## 経緯と前提

監査PR #235 で検出された 54件 (P1=12 / P2=30 / P3=12) のうち、P3=12件 を段階的に解消する計画。
PRs #238/#241/#244/#246 の対応の中で **P3のうち2件が解消済**:

| 解消テーマ | 関連P3 finding |
|---|---|
| 言語機能の撤去 (PR #244: SEO-015/023対応の副作用) | UX-020 — 言語切替select重複 → select自体が消えた |
| CDNキャッシュヘッダ追加 (PR #239: AIクローラブロック対応) | SEO-019 — /api/og Cache-Control 未設定 → `public, max-age=86400, immutable` 設定済 |

→ **P3残=10件 / 推定合計工数=22h** を本計画で消化する。

---

## Phase A: P3残10件 詳細

### UXカテゴリ (7件 / 14h)

| ID | カテゴリ | タイトル要約 | 工数 |
|---|---|---|---|
| UX-011 | UX-C | メインCTA「安衛法AIに質問」が初見ユーザーには略語 | 1h |
| UX-012 | UX-C | HomeThreePillars 3カードの AlertGenerator 配置がCTA過多 | 2h |
| UX-014 | UX-D | /strategy ルートが孤立 (ハブなし) | 3h |
| UX-015 | UX-D | Footer「関連データ」にKY/メンタル/外国人/用品が混在 | 2h |
| UX-018 | UX-E | 統計バー (1,069件/5,026件/1,050点) CLS リスク | 2h |
| UX-019 | UX-F | 屋外モードトグル PC topbar + sidebar 底部の2箇所重複 | 1h |
| UX-023 | UX-G | Sidebar が lg (1024px) 以上でのみ表示、タブレット縦持ち体験悪 | 3h |

### SEOカテゴリ (3件 / 8h)

| ID | カテゴリ | タイトル要約 | 工数 |
|---|---|---|---|
| SEO-003 | SEO-A | h1「現場の安全を、AIで変える。」が検索意図ワードと不一致 | 1h |
| SEO-014 | SEO-D | Footerアンカーテキスト固定で多様性不足 | 4h |
| SEO-017 | SEO-E | 機能リストが home/footer/meta で3-4箇所重複 — thin content | 3h |

---

## Phase A 詳細 (finding別)

### UX-011 — メインCTA略語解消
- **該当ファイル**: `web/src/components/new-home-hero.tsx:78`
- **現状**: `安衛法AIに質問` (PR #241 で「する」を削除したが略語は残存)
- **修正方針**: `労働安全衛生法をAIに質問` または `現場の安全ルールをAIに質問` に変更
- **影響範囲**: new-home-hero.tsx 1箇所 (en版は "Ask the OSH-Law AI" のまま可)
- **依存関係**: なし
- **推定工数**: 1h

### UX-012 — AlertGenerator CTA過多解消
- **該当ファイル**: `web/src/components/home-three-pillars.tsx`
- **現状**: AlertGenerator が line:209 / 292 / 347 の3箇所 (計6 CTA + ヒーロー3 = 合計9 CTA)
- **修正方針**: (a) 3カード共通のAlertGeneratorを1つに統合し末尾配置、または (b) 初期非表示→ホバー/タップで露出
- **影響範囲**: home-three-pillars.tsx のみ
- **依存関係**: なし
- **推定工数**: 2h

### UX-014 — /strategy ハブ化または301
- **該当ファイル**: `web/src/app/(main)/strategy/page.tsx`
- **現状**: /strategy は内部戦略ドキュメント (noindex, パスワード保護)。ユーザーが /strategy/plan-generator からURLを一段削ると戦略文書にアクセス (または404)
- **修正方針**: (a) /strategy に StrategyHub コンポーネント (plan-generator / chemical-ra / education) を作成 + 内部戦略文書は /strategy/internal に移動、または (b) /strategy を /strategy/plan-generator に301リダイレクト (内部文書は別パスに退避)
- **影響範囲**: strategy/page.tsx + vercel.json (redirects)、パンくず中間URL修正
- **依存関係**: UX-013 (BreadcrumbList) は PR #238 で解消済、本taskは別途
- **推定工数**: 3h

### UX-015 — Footer 関連データカラム再分類
- **該当ファイル**: `web/src/components/footer.tsx`
- **現状**: 「関連データ」カラムにKY事例DB(ツール) / メンタル対策(機能) / 外国人労働者支援(機能) / 安全用品カタログ(ツール) が混在
- **修正方針**: 「機能」(操作系) と「データ」(参照系) で再分類。KY事例DB/安全用品 → 現場ツールカラムへ移動、メンタル/外国人 → 機能ハブカラムへ移動
- **影響範囲**: footer.tsx のリンク並び替えのみ (URLは変更しない)
- **依存関係**: Batch 2でSEO-014と同時対応が効率的 (footer.tsxを1回だけ触る)
- **推定工数**: 2h

### UX-018 — 統計バー CLS リスク修正
- **該当ファイル**: `web/src/components/new-home-hero.tsx:90-124`
- **現状**: 統計バーはgrid-cols-3、viewport 375pxでは1カラム25px幅。フォントロード後にレイアウトシフト発生リスク
- **修正方針**: (a) コンテナに `min-h-[64px]` を付与しスケルトン確保、(b) テキスト部分に `font-display: optional` 相当の対策
- **影響範囲**: new-home-hero.tsx のスタイル調整 (Batch 1のUX-011と同ファイル → 同時対応効率的)
- **依存関係**: UX-022 (フォントサイズ) は PR #246 で解消済
- **推定工数**: 2h

### UX-019 — 屋外モードトグル重複解消
- **該当ファイル**: `web/src/components/app-shell.tsx`
- **現状**: `屋外モード` ボタンが line:403-406 (サイドバー底部) と line:565-575 (PC topbar) の2箇所
- **修正方針**: サイドバー底部の屋外ボタン (line:403-406) を削除。topbarのみに集約
- **影響範囲**: app-shell.tsx 1箇所削除のみ
- **依存関係**: なし
- **推定工数**: 1h

### UX-023 — Sidebar breakpoint lg→md
- **該当ファイル**: `web/src/components/app-shell.tsx:325`
- **現状**: `<aside className="hidden ... lg:flex">` → 1024px未満で常にモバイルドロワー必須
- **修正方針**: lg→md に変更してタブレット縦持ち (768×1024) でもサイドバー固定表示
- **影響範囲**: app-shell.tsx のブレイクポイント変更。モバイルボトムナビの表示条件も連動調整が必要
- **依存関係**: Batch 2 (UX-015/SEO-014) でapp-shell.tsxを触るなら衝突回避が必要。Batch 4で別途
- **推定工数**: 3h (内部ブレイクポイント調整 + 動作確認 1h含む)
  ※ 監査原文は4h想定だが、UX-023をBreakpoint変更のみに絞れば3hで可能

### SEO-003 — ホーム h1 キーワード整合
- **該当ファイル**: `web/src/components/new-home-hero.tsx:63` + `web/src/app/(main)/page.tsx`
- **現状**: `h1 = "現場の安全を、AIで変える。"` (情緒コピー)、月間検索ゼロのフレーズ
- **修正方針**: h1 を「労働安全衛生のAI・DX活用ポータル」等の検索意図ワードに変更し、現在の情緒コピーはサブヘッドに格下げ
- **影響範囲**: new-home-hero.tsx (h1タグ) + page.tsx (og:image テキスト)
- **依存関係**: Batch 1のUX-011/UX-018と同ファイル → 同時対応
- **推定工数**: 1h

### SEO-014 — Footerアンカーテキスト多様性
- **該当ファイル**: `web/src/components/footer.tsx`
- **現状**: 「安衛法AIチャット」「化学物質RA」等の固定短縮語。Googleがキーワード重要度を認識しにくい
- **修正方針**: (a) 主要リンクのアンカーテキストをロングテール表現に置換 (例: '安衛法AIチャット' → '労働安全衛生法AIチャット')、(b) related-page-cards の CTA テキストでロングテール語句を組み込む
- **影響範囲**: footer.tsx リンクテキスト変更のみ (URLは変えない)
- **依存関係**: UX-015 (footer再分類) と同ファイル → Batch 2で同時対応
- **推定工数**: 4h (ロングテール語句の設計含む)

### SEO-017 — 機能リスト重複 thin content 解消
- **該当ファイル**: `web/src/components/flagship-grid.tsx` + `web/src/components/footer.tsx` + `web/src/app/(main)/page.tsx`
- **現状**: 機能リストが (a) flagship-grid のh2サブテキスト、(b) footer 主要機能カラム、(c) page.tsx metadata.description で3-4箇所ほぼ同文
- **修正方針**: (a) ホームは「メイン3機能 + 関連機能セット」に整理、(b) Footer は機能ハブへの誘導1リンクのみ (/features)、(c) metadata.description は主要キーワード3つ + 差別化要素に凝縮
- **影響範囲**: flagship-grid.tsx (h2 subtext) + footer.tsx (機能カラム縮小) + page.tsx (description)
- **依存関係**: UX-015/SEO-014 (Batch 2 footer改修) 完了後に着手が安全
- **推定工数**: 3h

---

## Phase B: 依存関係マップ

### 単独実装可能 (依存なし、即時着手可)

- UX-011 (CTA略語)
- UX-019 (屋外toggle削除)
- UX-018 (統計バーCLS) ← UX-011と同ファイル、Batch 1同時
- SEO-003 (h1) ← UX-011/UX-018と同ファイル、Batch 1同時

### footer.tsx を触る findings (同バッチで統合)

- UX-015 (footer再分類)
- SEO-014 (アンカーテキスト)

### footer.tsx 改修後に着手が安全

- SEO-017 (thin content) ← UX-015/SEO-014完了後

### 最後に実施 (app-shell.tsx 大規模変更、他バッチと衝突回避)

- UX-023 (sidebar breakpoint)
- UX-012 (AlertGenerator) ← home-three-pillars.tsx、単独可

### 中位 (依存あり)

- UX-014 (/strategy hub) ← UX-013 breadcrumb は PR #238 解消済、本item単独可。Batch 3で

---

## Phase C: バッチ計画 (4バッチ / Pro期間 6/15 まで)

### Batch 1 — Copy & CLS Quick Wins (5h) | 2026-05-21 着手予定

| ID | 工数 | 修正内容 |
|---|---|---|
| UX-011 | 1h | CTA "安衛法AIに質問" → "労働安全衛生法をAIに質問" |
| UX-019 | 1h | サイドバー屋外ボタン削除 (topbar集約) |
| SEO-003 | 1h | h1 → "労働安全衛生のAI・DX活用ポータル"、情緒コピーをサブヘッドに格下げ |
| UX-018 | 2h | 統計バー min-h + フォントロード前後のレイアウト安定化 |

- **合計**: 5h
- **PR候補**: `fix(ux-p3): CTA/h1 plain language + stats bar CLS (UX-011/018/019, SEO-003)`
- **期待効果**: ファーストビューの初見ユーザー認知コスト削減、CLS スコア改善、略語解消
- **衝突リスク**: なし (new-home-hero.tsx と app-shell.tsx の局所変更)

### Batch 2 — Footer Restructure (6h) | 2026-05-28 着手予定

| ID | 工数 | 修正内容 |
|---|---|---|
| UX-015 | 2h | Footer「関連データ」カラムを機能/データ軸で再分類 |
| SEO-014 | 4h | Footerアンカーテキストをロングテール語句にリライト |

- **合計**: 6h
- **PR候補**: `fix(seo-p3): footer classification + anchor-text diversity (UX-015, SEO-014)`
- **期待効果**: Footer信頼性向上、Google内部リンクシグナルのロングテールカバレッジ拡大
- **衝突リスク**: P2 Batch 2 (UX-007/008/016/024/027) との footer 同時編集に注意 (スケジュール調整)

### Batch 3 — Alert & Strategy Hub (5h) | 2026-06-04 着手予定

| ID | 工数 | 修正内容 |
|---|---|---|
| UX-012 | 2h | AlertGenerator を1つに統合 (home-three-pillars.tsx) |
| UX-014 | 3h | /strategy を /strategy/plan-generator に301リダイレクト + 内部文書を /strategy/internal に退避 |

- **合計**: 5h
- **PR候補**: `fix(ux-p3): alert consolidation + strategy redirect (UX-012/014)`
- **期待効果**: First View CTA 数を 9→6 に削減、/strategy 孤立URL解消、パンくず整合
- **衝突リスク**: UX-014 は vercel.json を触る → 同時期に他の redirect PR と衝突しないよう確認

### Batch 4 — Navigation & Thin Content (6h) | 2026-06-10 着手予定

| ID | 工数 | 修正内容 |
|---|---|---|
| UX-023 | 3h | Sidebar breakpoint lg→md (タブレット縦持ち対応) |
| SEO-017 | 3h | 機能リスト重複解消 (flagship-grid/footer/meta) |

- **合計**: 6h
- **PR候補**: `fix(ux-p3): sidebar tablet breakpoint + thin-content dedup (UX-023, SEO-017)`
- **期待効果**: タブレット縦持ち (768×1024) でサイドバー常時表示、thin content シグナル解消
- **衝突リスク**: UX-023 は app-shell.tsx の大規模変更 → Batch 3 (UX-019) との衝突なし (Batch 1で先に済ませる)

---

## 消化スケジュール (Pro期間 2026-05-19 〜 2026-06-15)

```
Week 1 (05/19-05/25): Batch 1 着手 → 05/21 merge 目標
Week 2 (05/26-06/01): Batch 2 着手 → 05/28 merge 目標
Week 3 (06/02-06/07): Batch 3 着手 → 06/04 merge 目標
Week 4 (06/08-06/14): Batch 4 着手 → 06/10 merge 目標
                                        6/15 Pro期間終了
```

全4バッチ完了予定: **2026-06-12** (Pro期間終了3日前)

---

## 解消済一覧 (除外findingの根拠)

| Finding ID | 解消PR | 解消内容 |
|---|---|---|
| UX-020 | #244 | 言語切替機能撤去により `<select>` 要素自体が消滅 |
| SEO-019 | #239 | `/api/og/route.tsx:112` に `Cache-Control: public, max-age=86400, immutable` 設定済 |
