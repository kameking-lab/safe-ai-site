# 攻めの実験ログ — 2026-05-30

各実験: 番号・テーマ・狙い・変更範囲・成功基準・検証結果・採否(理由)

---

## 事前調査メモ（重要）
- PR#311 で「命名統一(安全衛生日誌→安全工程打合せ書)・信頼性(footer登録番号260022)・SEO」は**実装済**。残存「安全衛生日誌」はmock/FAQ/internalのみ＝再対応不要。
- 既存ペルソナ入口は `/for/construction` のみ（約530行・法令引用/KYプリセット/統計の実データ充実＝品質基準）。
- ナビは2系統: ①PCサイドバー(app-shell.tsx, 6カテゴリ+α 約30項目) ②FlagshipNav(flagship-nav.tsx, 11項目横並び+ホバーPopover)。
- ベースラインテスト: 941 pass / 116 files（5/30 05:19実測）。

---

## 実験01: ペルソナ別入口の新設（トップ主役構成の再設計 #1）
- **狙い**: 初見の訪問者が「自分の立場」から1タップで実務エントリに入れる。現状は建設業のみ。一人親方/企業の安全衛生担当者/労働安全コンサルに専用ランディングを新設し、トップ最上部にペルソナ選択バンドを設置。
- **変更範囲**: 新規 `/for/solo` `/for/manager` `/for/consultant` の3ページ + 各page.test.tsx + 新コンポーネント `home-persona-entry.tsx` + `(main)/page.tsx`（建設業単独バナー→4ペルソナバンドへ）。
- **捏造防止方針**: 確立した法令事実（規模別義務・特別加入制度の存在等）と既存リポジトリの実データ(SITE_STATS等)のみ使用。具体施行日など不確実な点は断定せず法令チャット/法改正カレンダーへ誘導。新規統計値は作らない。
- **成功基準**: (1)3ページがconstruction同等の充実度(routing先が全て実在・thin templateでない) (2)トップ初見でペルソナ導線が明快 (3)既存941テスト維持+新規テストpass (4)lint/tsc/build 0エラー (5)既存導線(construction含む)非破壊。
- 検証結果:
  - lint **0 errors**（15 warningは全て既存・本変更由来0）/ tsc **0 errors**
  - test **955 pass / 119 files**（baseline 941 + 新規14、全pass）
  - build **成功**（3新規ルートを生成）
  - ローカル本番サーバ(`next start`)で実機確認: `/` `/for/solo` `/for/manager` `/for/consultant` `/for/construction` 全て **HTTP 200**。トップにペルソナバンド4枚＋各ページの見出し・規模別義務表(常時50人以上×10箇所)・主要内部リンク・登録番号260022 を実HTML上で確認。
  - Vercel preview: deploy **SUCCESS**（プレビューは保護で401・curl不可のためローカル本番で代替検証）
  - CI e2e/smoke: **両方 SUCCESS**（既存導線の回帰なしを確認）/ Vercel deploy SUCCESS
- 採否: **採用（squash merge PR #312 → main `c3e7cbe0`）**。理由: 初見の自己同定導線を1→4に拡張する mission #1 の高インパクト改善。3ページはthin templateでなく実データ・実ツールへ誘導、捏造なし、既存非破壊(e2e/smoke green)、/for/construction無改変。「やった気」でなく実務レベルへ前進。

---

## 実験02: 事故系4ルートの section サブナビ統合（事故ハブ化 / 初見の「どのツール?」解消）
- **狙い**: `/accidents`(DB検索) `/accidents-reports`(業種別分析) `/accidents-analytics`(統計) `/accident-news`(重大災害事例) の4ルートが初見で役割不明・相互移動しにくい問題を、既存 `LawHubNav` と同じ section サブナビパターンで解消。
- **判断**: PCナビ2系統統合は「導線ギャップ(例: /accidents-analytics は サイドバー未収録)を埋める追加作業＋高回帰リスク＋価値が主観的」のため後回し。代わりに低リスク高明快度の事故ハブ化を選択。新ルートは作らず(=5つ目の混乱を増やさない)、4ページ最上部に役割明示サブナビを置く。
- **変更範囲**: 新規 `AccidentHubNav`(+test) / 4ページに挿入 / accident-news の重複手動リンク3本→1本(別系統の whats-new のみ残置)に整理。
- **成功基準**: (1)4ページで現在地強調＋他3ツールの役割が1行で分かる (2)既存テスト維持+新規pass (3)lint/tsc/build 0 (4)既存非破壊。
- **検証結果**: lint 0 / tsc 0 / test **958 pass / 120 files**(+3) / build 成功。ローカル本番で4ページ全て HTTP 200・「事故情報ナビ」＋兄弟3リンク描画を確認。
- 採否: （CI green確認後に判断）

