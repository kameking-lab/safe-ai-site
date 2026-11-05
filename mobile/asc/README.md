# 安全AI App Store掲載専用ワークフロー

Codemagicアプリ `6aecfcc078eab65a32c8ab49` の `anzen-asc-metadata`。
既存 `App Store Key` integrationのみで認証し、新規の環境グループや秘密値は不要。
公式Codemagic CLI 0.70.2のcredential resolver/JWTを匿名パイプでSpaceshipへ渡します。
鍵/JWTをCM_ENV・引数・ディスクキャッシュ・成果物へ保存しません。

起動例: `asc-anzen-v1.0.0-blatest-r20261106-asca1-01`。
または `asc-anzen-v1.0.0-b17-r01` のように実ビルド番号を固定できます。
`latest` は当該アプリ・1.0.0・iOS・VALID・未期限切れの最新アップロードをASCで解決します。
固定番号では別番号にfallbackしません。最大30分処理完了を待ちます。

`SUBMIT_FOR_REVIEW=false` 固定。trueやsubmitタグを拒否し、fastlaneにもfalseを直接渡します。
審査連絡先・デモ情報の環境変数は参照しません。自動公開・既存審査の取り消し・IPA再送なし。
既存編集可能1.0.0または初期PREPARE_FOR_SUBMISSION下書きのみを利用します。
初回版のreview detailがnil/厳密なNo dataなら空属性だけ作成し、他のエラーは停止します。

カテゴリはビジネス（BUSINESS）・辞書／辞典／その他（REFERENCE）。
説明は同梱ソースの閲覧・KY・教材・検索等に限定し、課金・Push・将来機能を宣伝しません。
サポートは既存サイト `https://www.anzen-ai-portal.jp/contact`、Privacyは `/privacy`。

検証: `python scripts/asc_validate.py --screenshots`、`node scripts/asc_repository_check.mjs`。
Pythonテストは `python -m unittest discover -s scripts -p "asc*_test.py"`、
Rubyは `ruby scripts/asc_config_test.rb` / `asc_build_test.rb` / `asc_lane_test.rb` / `asc_token_test.rb`。
認証テストは `asc/auth-requirements.txt` を入れた隔離venvでダミー鍵のみ使用します。

元実装: 次の資格 `05f1acaf56d593bc77df815db123c88f3efd63e1`。
JWT連携・下書き版再利用・空review detailの実地修正を移植。提出経路は移植していません。

画像と制約は [repository-screenshots.md](repository-screenshots.md)、未設定項目は
[api-followup.md](api-followup.md) を参照。
