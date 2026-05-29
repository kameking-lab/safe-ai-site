# 10. 一貫性（デザイン・トーン）（軸10）

評価: **74 / 100**（最大の減点要因＝命名不統一）

## デザイン: 概ね良好
- **プライマリ色**: emerald-600/700 がCTA色として一貫。blue/indigo は二次/有料/装飾に限定（許容範囲）。
- **カード**: `rounded-2xl border border-slate-200 bg-white shadow-sm` が標準。`rounded-xl/lg/full` は要素サイズ階層に沿う（許容）。
- **ボタン**: `bg-emerald-600 text-white rounded-lg` が標準。逸脱は有料/認証ボタンの一部のみ。
- **見出し階層**: 重複H1や階層スキップは spot-check で未検出。
- **タグライン/サイト名**: 「現場の安全を、AIで変える。」「安全AIポータル」は全箇所一致 ✅。

## 命名: 重大な不統一（検証済み）

### 【P0】`/safety-diary` の名称が「打合せ書」と「日誌」で割れる
- **正式名（H1・title・metadata・ナビ・フッター・flagship）= 「安全工程打合せ書（・安全衛生指示書）」**（meeting-paper-view.tsx:207 のH1で確定）。
- しかし `/safety-diary` を指す**CTA9箇所が「安全衛生日誌」と誤表記**:
  - `components/accidents-reports/industry-report-view.tsx:699`
  - `components/main-feature-next-actions.tsx:37`
  - `components/today-safety-dashboard.tsx:164`
  - `components/flagship-grid.tsx:106`（機能列挙）
  - `app/(main)/chatbot/ChatbotBody.tsx:204`
  - `app/(main)/features/use-cases/page.tsx:315,317`
  - `app/(main)/for/construction/page.tsx:294,336`
  - `app/(main)/organization/page.tsx:177`
  - `app/(main)/profile/page.tsx:36`
- 職長が「打合せ書」と「日誌」を**別機能と誤解**する。ルート名が `safety-diary`（＝日誌）の名残で、リブランド時の取りこぼし。
**改修（本セッション実装）**: これらCTAを「安全工程打合せ書」（文脈により「安全工程打合せ書に記録／で月次まとめ」）に統一。

### 【P1】事故系4ページの名称混在
同一カテゴリ内で「重大災害事例」(nav) / 「重大事故・労災ニュース」(flagship cardTitle) / 「10年事故DB」(footer) / 「事故データベース」(canonical) が混在。
- 特にフッター「10年事故DB」は canonical「事故データベース」とずれ、検索一致を阻害。
**改修**: 各ページの“正式名”を1つ定め、nav/footer/flagship/相互リンクを揃える。最低限フッター「10年事故DB」→「事故データベース」。

## 改修方針
- 本セッション: 日誌→打合せ書の命名統一（P0）。
- 段階: 事故系4名称の整理＋命名ファクトチェックのテスト化（前回監査 design-rule 4「数値・命名の正確性」をテストで担保）。
