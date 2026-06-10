# 死蔵コード横断棚卸し — components・lib 全域（2026-06-10）

BACKLOG柱1タスク「参照0件の死蔵コード横断棚卸し: 前任はsignage配下のみ実施（4部品中2結線・1削除）。web/src/components・lib 全域に広げる」の実施記録。

## 前任の判断 → Fableの発見

- **前任の判断**: 死蔵部品の棚卸しはサイネージ配下4部品のみ実施（docs/third-party-reviews/signage-dead-component-inventory-2026-06-09.md）。それ以外の領域は未調査のまま「棚卸し済み」の印象が残っていた。
- **Fableの発見**: web/src 全1,183ファイルの import 逆参照マップを機械構築したところ、components・lib 配下に**本番参照0件のファイルが20件**残存していた。うち5件は3度の大型再設計（ホーム3柱化 #75、KY一本化 #284、安全日誌→打合せ書 #289）の削除漏れで、**テストだけが生き残って本体が死んでいる**逆転状態が4件あった（テスト実行時間とCI資源の無駄）。

## 調査方法

1. web/src 全 .ts/.tsx (1,183ファイル) の import / export-from / dynamic import / vi.mock の specifier を正規表現抽出し、`@/`エイリアスと相対パスを実体ファイルに解決して逆参照マップを構築（一時スクリプト、実施後削除）。
2. components/・lib/ 配下で「テスト・fixture 以外からの参照0件」を抽出 → 20件。
3. 誤検知排除のため、各候補名をリポジトリ全域（scripts・e2e・JSON含む）で再grep。文字列一致のみのもの（例: `"nite-chrip"` という source ラベル文字列）を import と区別。
4. 各ファイルについて (a)機能 (b)孤立した経緯（`git log -S`で参照削除コミット特定） (c)生きている同等/上位互換の有無 (d)独自価値（他に無いデータ・ロジック）の喪失有無 を個別判定。

## 判定結果（20件）

### 削除 17件（テスト2件含む）

| ファイル | 孤立の経緯 | 削除しても失われないことの確認 |
|---|---|---|
| components/ky-examples-panel.tsx | KY一本化(#284)で旧/ky画面ごと参照削除 | 事例DB150件は web/src/data/ky-examples/ に、提案ロジックは lib/ky-suggestion.ts（API 3ルートで稼働中）に独立存在 |
| components/ky-initial-wizard.tsx | 同上(#284) | プリセット11種は data/mock/ky-industry-presets.ts に存在し ky-industry-preset-picker.tsx 経由で home-screen から稼働中 |
| components/ky-signature-canvas.tsx | 同上(#284)。現行KY(用紙ファースト)に署名機能は存在しない（grep確認: 署名UIは foreign-workers/training-record.tsx の独自実装のみ） | 署名機能は再設計で意図的に落とされた仕様。再導入時はgit履歴から復元可能 |
| lib/ky/signatures.ts | 署名キャンバス孤立に伴い本番参照0（copy-latest.test.ts のテスト参照のみ） | 参加者削除機能自体が現行未実装のため実装価値0。copy-latest.test.ts から該当 describe 2個を除去（copyKyForToday のテストは温存） |
| lib/safety-diary/from-ky.ts + from-ky.test.ts | KY→日誌転記(#281)が日誌→打合せ書再設計(#289 Phase12)で参照元ごと削除。テストのみ削除漏れ | 現行は打合せ書⇔KYのdeep-link転記が別実装で稼働 |
| lib/safety-diary/monthly-summary.ts | #289 Phase12 で参照元 diary-monthly-client.tsx ごと削除 | 月次集計は現行アーキに存在しない機能（打合せ書一覧で代替）。テスト無し |
| lib/safety-diary/presets.ts | #289 Phase12 で参照元旧フォームごと削除 | estimateQualifications は lib/meeting/inference.ts に上位互換（14ルール、テスト付き、meeting-paper-view で稼働中） |
| components/today-safety-dashboard.tsx | ホーム3柱化(29f9cc86, #75)でホームから外され、以降データ参照が旧diary storeのまま陳腐化 | 「本日のダッシュボード」需要は /site-records ライブダッシュボードが上位互換で提供 |
| lib/affiliate-links.ts / lib/affiliate.ts | PR#51 で affiliate-url.ts に統合され thin re-export 化、呼び出し元0 | 全実装・env互換ロジック(新旧変数名フォールバック)は affiliate-url.ts に存在。収益導線は equipment-recommendation.ts → affiliate-url.ts で稼働中。アフィリエイトIDには一切触れない |
| components/NewsletterCTA.tsx | 同日実装の newsletter-form.tsx（業種選択付き上位互換）が採用され未結線のまま | API /api/newsletter/subscribe は共有で稼働継続 |
| components/header.tsx | app-shell.tsx に統合(#73/#76)され役割終了 | app-shell が全機能上位互換 |
| components/morning-digest.tsx | 実装(0001bb9a)直後のホーム再設計(ee049b73)で一度も結線されず | データソース(mhlw-notices/法改正/事故)は各ページで稼働中 |
| components/stat-source-cite.tsx | 導入先ページが実装されないまま放置 | 出典メタ(data/site-stats.ts)は home-value-hero 等10ファイルで稼働中。出典表示は各所で inline 実装が定着 |
| components/signage/signage-floor-plan.tsx | 同日実装の signage-floor-plan-editor.tsx（ピン配置編集つき上位互換）が /signage に採用 | editor がビューア機能を内包 |
| lib/signage-news-url.ts | 2026-04-04実装、一度も結線されず。現行サイネージはRSSが記事URLを直接保有 | 検索URL生成の需要自体が消滅 |
| lib/external/retry.ts + retry.test.ts | PR#223 で同時導入の circuit-breaker(19ルート採用)・fetch-with-timeout(9ファイル採用)が定着し、retry だけ一度も採用されず | レジリエンスは circuit-breaker + timeout で担保済み |

### 結線 1件

| ファイル | 結線先 | 価値 |
|---|---|---|
| components/ArticleFeedback.tsx | /circulars/[id]（通達詳細 全ページ・フッター直前） | ハルシネーション対策の「読者通報」層（090d42a4 で設計された第7層）が未結線で死んでいた。エラー種別（法令引用誤り/リンク切れ/事実誤認）は通達ページのリスクと完全一致。API /api/feedback はレート制限+Resend通知実装済みで即稼働 |

### 保留 2件（意図的温存・削除しない理由を明記）

| ファイル | 理由 |
|---|---|
| components/signage/signage-featured-goods.tsx | サイネージへのアフィリエイト掲出可否はオーナー判断事項（BACKLOG Path A 起票済み）。判断が出るまで温存 |
| lib/nite-chrip.ts (+integration test) | NITE-CHRIP 3,388物質のGHS詳細を lazy load する設計資産。SDS取込み（化学RAの残P1課題）のフェーズ2で必要になる蓋然性が高く、テストも充実。sds-fetcher.ts の searchNiteChrip がスタブのままである事実は別途機能実装時に解消 |

## ゲート

tsc=0 / lint errors=0 / vitest 162ファイル1338件 全pass / build成功。
削除17・結線1・保留2。捏造0・水増し0・既存破壊0（全削除対象は本番参照0を機械確認+全域grepで二重確認）。env/DB変更なし。
