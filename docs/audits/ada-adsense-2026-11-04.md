# ADA: 安全AIポータル AdSense 再審査準備

基点: `49ccd11b`（INT4）、worktree `safe-batch1-20261105`、branch `release/batch1-20261105`。
メールによる不承認通知（安全AI10/16、過去問AI10/25、次の資格11/4）は「サイトは広告を掲載する準備がまだ整っていない」のみ。今回、管理画面の具体理由を取得していない。過去報告の「有用性の低いコンテンツ」という伝聞は、現在の確定理由として採用しない。他2サイトの修正・化学物質RAは対象外。

## 一次資料と判断

- [AdSenseプログラムポリシー](https://support.google.com/adsense/answer/48182?hl=ja): サイトの閲覧性、コンテンツのない画面、広告干渉を確認する。
- [準備が完了していない場合](https://support.google.com/adsense/answer/12176698?hl=ja): コード、アクセス、独自性、利便性のいずれも候補。通知文だけでは原因を区別できない。
- [コンテンツとUX](https://support.google.com/adsense/answer/10015918?hl=ja): 内容の少ないページ、重複、リンク・ナビゲーションを確認する。
- [価値の低い広告枠](https://support.google.com/publisherpolicies/answer/11112688?hl=ja)、[複製コンテンツ](https://support.google.com/publisherpolicies/answer/11190248?hl=ja): noindexだけでは広告品質の問題は解消しない。転載・自動生成の有無だけでなく、独自の説明・編集・使い道を確認する。
- [クローラの問題](https://support.google.com/adsense/answer/2381908?hl=ja): ログイン、robots、IP制限、404、リダイレクトを確認する。UAを変えたHTTP取得だけでは実GoogleのIPからの到達性を保証できない。
- [必須コンテンツ](https://support.google.com/adsense/answer/1348695?hl=ja): 第三者配信、過去の閲覧に基づくGoogle広告Cookie、広告設定・オプトアウトを確認する。
- [サイトとのリンク](https://support.google.com/adsense/answer/7584263?hl=ja): script以外にads.txt・メタタグの確認方法がある。同意を外して広告を増やすことを対策にしない。
- [検索スパムポリシー](https://developers.google.com/search/docs/essentials/spam-policies?hl=ja): 価値を加えない大量生成・転載・誤解させる機能を点検する。AI利用だけを不承認理由としない。

## 初回実測と既往対策

2026-11-04、匿名GET（urllib、TLS検証あり）。初回63要求。再取得・詳細棚卸しの最終結果は納品報告に記録する。

- apex / www / HTTP は最終的に HTTPS www のホーム200へ到達。
- `/ads.txt`: 200、`google.com, pub-8751260838396451, DIRECT, f08c47fec0942fa0`。
- `/robots.txt`: 200。一般UAは公開ページ許可。GooglebotとMediapartners-Googleのホーム・法令一覧も200。Google-Extendedの学習拒否と検索bot拒否を混同しない。
- ホーム、privacy、about、contact、laws、用語集、KY/サイネージガイドは200、自己canonical、公開HTMLに正しいgoogle-adsense-accountあり。初期HTMLにadsbygoogle scriptなし。ソースは任意同意後、限定した閲覧ページのみheadに挿入する設計。
- privacyにはCookie・第三者配信・Google広告Cookie・過去閲覧による広告・広告設定・拒否方法が既にある。運営窓口は安全AIポータル編集部。
- `/contact`はHTTP200でも、フォームが明示Suspenseのhiddenストリーム内に入り、JavaScriptなしの本文は読込表示が残る。存在しないと断定せず、初期本文の到達性の不足として修正する。
- `/laws/bcp`、`/laws/gig-work`、`/laws/freelance-rosai`は既にnoindex・広告対象外だが、実ページに「骨組み公開中」「解説本文…今後…拡充」と出る。完成した特集ではなく論点の箇条書きであり、公開を保留して共通ナビ・検索・sitemap境界にも適用する。
- 研修ハブは安全3件、AI1件が公開済み。一方で準備中の目次が安全17件、AI19件を占める。公開済み教材とその使い方を主本文とし、未完成テーマを公開一覧から外す。教材自体・問題数・広告配置は変更しない。
- `docs/audits/adsense-quality-2026-10-11.md`、`adsense-reconsideration-2026-10-17.md`と現在の実装を照合。既存の識別メタタグ、広告の閲覧ページ限定、任意同意、隔離対象の検索・sitemap除外、法令チャット提供方式・過去指標の区別は維持する。過去報告にある化学物質RAの改善は本タスクの新規成果に含めない。

検証、独立レビュー、最終コミット、デプロイ後のオーナー作業は、納品報告 `ada-report.md` に記録する。push、PR、mainマージ、デプロイ、再審査申請は実行しない。

## 最終受入れ

- 追加棚卸し348 URLのうち347件は200。残り1件は直接指定した未存在の確認用URL。実リンクから辿ったURLでHTTPエラーは確認しなかった。全サイト・全外部リンクの網羅検査ではない。
- 建設計算ハブにもComing Soon18件が残っていたため表示撤去。研修36件と合わせ、未公開計画54件を一覧から外した。公開済み4教材・17計算ツール・独自問題16問は維持。
- contactの重複queryが先頭値を失う初回独立レビュー指摘を修正。SSR/noJS、初期query、既存一般送信のmock回帰を検証した。
- 最終製品 `049c37f0`。指定gpt-6-astra read-onlyの差分レビューは `f8c31ff6` でPASS。以降の製品差分は3停止ページのCRLF→LFのみで、空白差分を除くと変更なし。
- `tsc --noEmit --incremental false`成功。全体lint成功（エラー0・既存警告32）。全テストは931ファイル中929成功・既存skip2、8,444件中8,442成功・既存skip2、exit 0。build成功（3,460静的ページ、公開identity/storage/source/build guard成功）。
- localhostの本番ビルドでHTTP14項目・ブラウザ11項目成功。停止3URLは実404/noindex、sitemapと主要本文のリンクからも除外。contactのPC/スマホ/JS無効画面を目視確認。既存問題の回答後解説・一次資料リンクも確認。
- 実測HTML・ログ・画像は公開リポジトリ外へ保存。guardを無効にしていない。テスト生成の既存評価CSVは成果へ含めず復元。実メール・AI・DB・決済へ接続せず、外部fetchとブラウザ外部要求は0。
- 上記はローカル受入れであり、本番反映・AdSense承認を意味しない。オーナーは別途デプロイ後に表示・識別情報・詳細な不承認理由を確認し、AdSenseのサイト詳細から審査をリクエストする。
