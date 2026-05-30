# モック/ダミー/サンプルデータ 全数監査 — 2026-05-30 (R3 軸1)

社長の問い「モック/ダミー/サンプルは本当に全部消えたか?」に対する全数監査。
grep でサイト全体(web/src)を走査し、ヒットを分類。本番表示に出る偽データは1つも残さない方針。

## 監査範囲と方法
- grep -rni で網羅検索: サンプル/sample/モック/mock/ダミー/dummy/テストデータ/placeholder/lorem/ipsum/TODO/FIXME/仮データ/例:/偽企業名/test@/example@ 等。
- 各ヒットを (a)本番表示の偽データ (b)テストfixture (c)devコメント (d)入力例コピー に分類。

## 結論: 本番表示に出る偽データは【ほぼ排除済み】。今回の新規是正は1件。
### (a) 本番表示の偽データ → 是正対象
- **inquiry メール送信元 `noreply@anzen-ai.example.com`（プレースホルダ・env上書き無し）** → 是正。
  他の通知メール(notify/newsletter)と同じ `NOTIFY_FROM` 規約に統一（example.com除去・env上書き追加）。
  ※ユーザー画面表示ではないが、実送信時にドメイン未検証で配信失敗し得る明確なプレースホルダ。PR: feat/exp-r3-01。
- （既是正）/stats のGA4/GSCモック数値 → #321/#323 で排除（本番はGA4/GSC実データのみ表示を確認済）。
- （既是正・前任）/qa-knowledge の虚偽UGC(community-cases・架空authorAlias) → ルート/データとも撤去済。

### (b)(c)(d) 正当なため残置（偽データではない）
- **統計用語の「サンプル N件」**（accidents-analytics/trend-summary/axis-analysis）= 実事例DBの「標本N件」の意。データは実在、「確定統計は厚労省公式」と明記済＝honest。
- **AIフォールバックの「サンプル文」**（safety-alert等）= APIキー未設定時のみ表示。**本番はGEMINI設定済で実AI生成**（prod /api/safety-alert で実テキスト返却を確認）→ 本番ユーザーには出ない。
- **入力プレースホルダ**: `example@example.com`(RFC2606標準), `例: 〇〇建設株式会社`/`例: 株式会社 安全工業`(自然な入力例) = 親切な例示。偽企業名「サンプル株式会社」のような露骨な偽名は無し。
- **/handover の「サンプル」**= noindex設定の社内引継ぎドキュメント（nav非掲載）。社内向け。
- **signage 図面サンプル**= 「図面サンプルを表示中」と正直に明示＋実図面アップロード導線あり＝デモ空状態。
- **「準備中/未実装」**= 全て audits/* の過去監査スナップショット（履歴）＋意図的な /pricing(PAID_MODE off・noindex)。稼働機能のplaceholder放置は無し。
- **`apiKey === "dummy"`** = バックエンドのsentinel判定（未表示）。
- **TODO/FIXME** = 表示コードに実害TODOは無し。

## オーナーへの申し送り（私が触れない/触れなかった点）
- メール送信元ドメインの分散: `NOTIFY_FROM ?? anzen-ai.com`(notify/newsletter/inquiry), `RESEND_FROM_EMAIL ?? safe-ai.jp`(feedback) と既定ドメインが不統一で、いずれも実ドメイン `anzen-ai-portal.jp` と不一致。どのドメインを Resend で検証済みかは管理画面/オーナー領域のため、正ドメインへの統一は env/インフラ判断として申し送り（私は example.com プレースホルダの除去と既存規約への統一のみ実施）。
