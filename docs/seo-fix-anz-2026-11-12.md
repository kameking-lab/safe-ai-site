# 安全AIポータル SEO修正確認（2026-11-12）

## ① やったこと・修正対象と根拠

指定資料（実行フォルダの `research/seo/AUDIT.md`）の「安全AIポータル」と同実行フォルダの `reports/seo-audit.md` を確認した。両資料とも安全AIの「致命的／確実に効く」は **新規の確定事項なし（0件）**。過去問AIのK1〜K4は別サイトの指摘であり、安全AIへ適用しない。

開始HEAD `209afcef` の既存修正を前提に、監査結果と現行コード・ローカルHTTP応答の整合を検証した。新しいアプリコード変更は0件。今回のリポジトリ変更はこの検証記録1ファイル。

| 項目 | 今回の扱い・根拠 | 影響数 |
| --- | --- | --- |
| 旧URLの恒久転送 | 既存コミットの完全一致308を維持。サービス案内・法人問い合わせ・管理領域へ移動した監査資料に後継が存在する | 10 URL（前ステップの変更） |
| 内部リンク | FAQの資格検索を `/education-certification/finder` へ、リモート勤務ページの安全学習を `/e-learning/safety` へ変更済み | 2ページ・2リンク（前ステップの変更） |
| 正規ドメイン・canonical | 既存の `SITE_URL` とwwwへの転送を維持。監査では本番apexが308であり、一時転送の指摘はない | 今回の変更0ページ |
| robots・サイトマップ | 公開ルートの許可、管理領域の除外、正規ドメインへの統一を維持 | 検証対象3,655 URL、変更0 URL |
| 災害・記事・通達の公開／index条件 | `public-content-policy.ts`、`seo/index-quality.ts` 等の既存条件を維持。監査で確認された404/noindexは現行方針と一致する | 今回の公開復帰・index変更0ページ |

「クロールの25%が404」はリクエスト比率であり、URLの25%の破損を示す資料ではない。発生元別の件数は未確認。後継のないページをトップへ一括転送したり、公開停止済みページを復活させたりする根拠はない。

前ステップの変更ファイルは `web/next.config.ts`、`web/src/app/(main)/faq/page.tsx`、`web/src/app/(main)/diversity/remote/page.tsx`、`web/src/lib/legacy-route-redirects.test.ts` の4件。今回これらを変更していない。

## ② コミット一覧

- `209afcef` 旧ページ10件の恒久転送と資格検索へのリンクを修正（開始前から存在）
- 今回のコミットはこの文書の追加。確定SHAは実行フォルダの `reports/seo-fix-anz.md` に記載する。

## ③ 検証結果

コマンドは特記以外 `web/` で実行。すべて既存コミットを含む現在のブランチで確認した。

| コマンド・検証 | 結果 |
| --- | --- |
| `git log --oneline -5` / `git status --short --branch` | 指定ブランチ `cx/anz-404-20261112`、開始HEAD `209afcef`、開始時clean |
| `npx tsc --noEmit` | 成功、終了コード0 |
| `npm run lint` | 成功、終了コード0。エラー0、既存警告32。警告は前ステップと同数 |
| `npx vitest run src/lib/legacy-route-redirects.test.ts src/lib/next-config-security.test.ts src/app/sitemap.test.ts src/app/sitemap-domain-single-source.test.ts src/app/robots.test.ts` | 5ファイル・91テスト成功 |
| `npm run build` | 成功、終了コード0。Next.js 16.4.1、静的ページ3,486件。public identity・storage deployment・production deploy各guard成功（source 746 / built routes 784）。DB移行はローカルビルドのためskip |
| `npm run start -- --hostname 127.0.0.1 --port 3404` + `python <実行フォルダ>/tools/seo-fix-anz/verify-local.py` | HTTP確認65件成功。旧URL39パターン、新規転送10件、クエリ保持、匿名管理領域、後継4ページ、FAQリンク、禁止ルート、robots・XMLを確認。監査の代表6ページで200・自己canonical・robots・title・description・h1・JSON-LD構文を確認、既知除外2ページと不存在1ページで404を確認 |
| 子サイトマップの全URL照合（上記スクリプト内） | 子5本・3,655 URL、重複0。すべてwww、ビルド済みルートと対応。旧削除パス・ビルド時notFoundの混入0。3,655件すべてへHTTP GETしたという意味ではない |
| `git diff --check` | 成功 |

補助スクリプトとHTTP結果 `local-http.json`、ビルドログ `build.log` は、指定実行フォルダの `tools/seo-fix-anz/` に保存。スクリプトは前ステップの `tools/anz-404/removed-routes.json`・`removed-handlers.json` を読み取り専用で利用する。先行レーンの証拠は上書きしていない。

ビルドには既存PDFフォント警告・Edge Runtime非推奨警告、vitestにはViteの設定プラグインに関する既存通知がある。今回の検証失敗ではない。初回のビルドログ保存は出力先ディレクトリ未作成で起動前に失敗し、ディレクトリ作成後の再実行は成功した。

## ④ 未確認・やり残し／公開時の確認手順

本番・プレビューへの配備、push、PR、main統合、vercelコマンド、クラウドビルドは実施していない。ローカル検証結果は公開後の本番応答を保証するものではない。

**生成物の片付けは未完了。** 検証用サーバーは停止したが、旧SEO検証worktreeの `web/.next` は残っている。通常ディレクトリであることを確認後、worktree内の期待パスとの一致・再解析ポイントでないことを検査して削除するPowerShellコマンドを送ったが、自動承認レビューが `blocked by policy` として拒否した。詳細理由は返されていない。別手段で削除を迂回しない。`.next` はgit管理対象外でコミットには含まれない。

公開担当者は以下を **GETで取得し、最初の応答と本文を別々に確認**する。`curl.exe -I` のHEADだけで済ませず、転送の初回確認には `-L` を付けない。実行間隔を1秒以上空ける。

```powershell
curl.exe -sS -D - -o NUL 'https://www.anzen-ai-portal.jp/services?from=bookmark&topic=safety'
Start-Sleep -Seconds 1
curl.exe -sS -D - -o NUL 'https://anzen-ai-portal.jp/services/automation?from=bookmark'
Start-Sleep -Seconds 1
curl.exe -sS 'https://www.anzen-ai-portal.jp/services/automation'
Start-Sleep -Seconds 1
curl.exe -sS 'https://www.anzen-ai-portal.jp/robots.txt'
Start-Sleep -Seconds 1
curl.exe -sS 'https://www.anzen-ai-portal.jp/sitemap-index.xml'
```

- `/services` は308、Locationは `/services/automation?from=bookmark&topic=safety`（絶対URLでも可）。`/enterprise/contact` は308→`/contact`。前ステップの監査資料8 URLも308→同slugの `/admin/audits/…`。
- apexの現行公開ページは301または308でwwwへ転送し、パス・クエリを保持。追従した最後の応答が200でループしないことも `curl.exe -sS -L --max-redirs 5 -o NUL -w '%{http_code} %{url_effective}' '<URL>'` で確認する。
- `/services/automation`、`/contact`、`/education-certification/finder`、`/e-learning/safety` は200で自己canonical。FAQ本文のリンクは `/education-certification/finder` を指し、`/qualifications` を指さない。
- 匿名の `/admin/audits/brand-consistency` は404かつ `X-Robots-Tag: noindex`。管理資料への転送で閲覧権限が開放されていないことを確認する。
- `/consulting`、`/services/proposal`、`/services/unknown`、`/exam-quiz`、`/e-learning/exams`、`/accidents/mhlw-100003`、`/articles/chemical-ra-mandatory-substances` は404を維持。無関係な200ページへの転送がないことを確認する。
- robotsの一般 `User-Agent: *` ブロックは公開ページを全面拒否せず、Sitemapは `https://www.anzen-ai-portal.jp/sitemap-index.xml`。学習用ボットの `Disallow: /` を一般規則と混同しない。
- sitemap-indexは200のXML。列挙された子XMLも200で取得し、`loc` の正規ドメイン、URL重複なし、旧URL・管理領域・公開停止ルートの混入なしを確認する。今回の基準は子5本・計3,655 URL（一般258、化学物質3,354、法令42、通達1、記事0）。将来の正当なコンテンツ更新による件数変動は別途照合する。
- `/`、`/chemical-database/108-88-3`、`/laws` は200・自己canonical・noindexなし。`/accidents`、`/accidents/mhlw-100620`、`/circulars/mhlw-notice-0001` は200・自己canonical・既存のnoindexを維持する。

GSCの404サンプルURL・取得日・参照元、Google選択canonical、全ページへのHTTP応答、全内部リンクグラフ、Rich Results Testの全要件、実利用者のCore Web Vitalsは未確認。これらを確認したという報告はしない。順位・CTR・売上への影響も未測定。

## ⑤人の判断が要ること

なし。
