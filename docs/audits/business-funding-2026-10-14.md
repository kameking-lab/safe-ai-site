# 企業向け補助金・助成金案内

公式情報確認日: 2026-10-14（日本時間）

## 変更範囲

- 正規公開URL: https://www.anzen-ai-portal.jp/services/automation
- `/services/automation` にAI研修・安全教育・業務自動化の目的別ガイドを追加。
- `/subsidies` は同じ `web/src/data/business-funding.ts` とガイドを利用。4月確認の旧7制度・根拠未特定の労災損失試算を置き換え、誤認につながる旧データ・未使用推薦UIを削除。
- `/subsidies/calculator` は人数・業種のみの受給判定を廃止。公式窓口で対象条件確認済みのリスキリング研修について、1人分の経費助成だけを参考試算する。率・時間別上限・eラーニング上限は共通データを参照。
- 機能カタログ・試算ページのmetadataも実際の機能範囲に合わせた。URLは維持。

## 主な根拠・区別

1. 事業展開等リスキリング支援: [8月3日改正](https://www.mhlw.go.jp/content/11800000/001731966.pdf)、[コース要領](https://www.mhlw.go.jp/content/11800000/001731978.pdf)。職務直結・原則10時間以上、eラーニングの回数/上限を反映。60分/90分の既存講習だけでは時間要件を満たさないことを常時表示。
2. 建設労働者技能実習: [令和8年度8月24日版](https://www.mhlw.go.jp/content/11600000/001741807.pdf)、[概要](https://www.mhlw.go.jp/content/11600000/001687871.pdf)。所定の法定教育は別コースで対象となり得る。一般研修との一律扱いをしない。
3. 省力化一般型: [第8回要領](https://shoryokuka.smrj.go.jp/assets/pdf/application_guidelines_ippan_08.pdf)、[日程](https://shoryokuka.smrj.go.jp/ippan/schedule/)。個別システムの候補だが単価50万円等・工数/生産性/賃上げ条件がある。直前相談で10月16日の締切に間に合うとは約束しない。
4. デジタル化・AI導入: [通常枠](https://it-shien.smrj.go.jp/applicant/subsidy/normal/)、[公募要領](https://it-shien.smrj.go.jp/pdf/it2026_koubo_tsujyo.pdf)、[ITツール要領](https://it-shien.smrj.go.jp/pdf/it2026_manual_it_tool.pdf)。登録ツールと個別開発を分ける。運営者・サービスの登録は未確認。
5. 業務改善: [令和8年度案内](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/zigyonushi/shienjigyou/03.html)、[手引き](https://www.mhlw.go.jp/content/11200000/001746707.pdf)。地域の最低賃金発効前日と11月30日の早い方。東京は9月30日終了。人数ではなく事業場内最低賃金に基づく率を表示。
6. 有償申請書作成・提出代行: [東京労働局の注意](https://jsite.mhlw.go.jp/tokyo-roudoukyoku/content/contents/002091323.pdf)。制度情報、研修設計、工数・効果、記録などの準備支援と、専門家が担う業務を分ける。提携専門家確保済み・認定・採択保証を主張しない。

その他の職務研修・高度デジタル・定額制は詳細内に補足。ものづくり等は今回の社内自動化の主力候補にしていない。

## 検証

- 対象Vitest: 7ファイル55件成功（期限境界、対象区別、計算の率/時間帯/上限、無効値、相談受付モード、既存フォーム、機能ポートフォリオ）。
- リポジトリ設定のstrict型検査を変更ページ・関連依存に限定して成功。共通データと計算・テストは `noUncheckedIndexedAccess=true` でも成功。
- 変更ファイルの既存Next.js ESLint設定で成功。`git diff --check` 成功。
- Next.js 16.2.11・同じTailwindで変更した実コンポーネントを隔離描画。390px/1280pxで目的選択、キーボード開閉、計算結果・入力変更時の結果消去、横スクロールなしを確認。ガイド・計算ともaxe違反0件、ブラウザ例外0件。
- JS無効で5制度すべてを表示。Tailwindの `hidden !important` と競合しないCSSレイヤーを実ブラウザ検証。
- 2026-10-16 17:00 JSTちょうどで省力化の終了表示を実ブラウザ確認。全期限を純関数の境界テストでも確認。未確認時にも「募集中」と断定しない。
- ローカル証拠: `web/.cache/funding-browser/report.json` と同フォルダのモバイル/PC画像。プレビューはサイト全体のshell・素材・本番外部サービスを含まない。無意味な全サイト再ビルドと依存コピーは行っていない。

## 分離・公開条件

- 専用worktree: `C:\Users\kanet\20260522\note-automation\.worktrees\safe-ai-automation-grants-20261014`
- 起点: `origin/main` `08b78d37cbeade46b947f7fac05e7b4e0086f3ac`。
- `fix/safeai-final-regression-20261013` の `265a73549a87d68dfd751d2ddf19871a29c9fa88` は取り込まず、refを保持。共有checkoutには変更しない。
- 本番公開は既存のmain限定production guardと独立最終レビューを通す。実装済みと公開済みは区別して報告する。
- 次回更新時は共通データの確認日、日程、要領、率/上限と試算ルールを一緒に確認。自動の終了表示は次回公募の存在・受付再開を意味しない。
