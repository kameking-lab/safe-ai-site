# 安全AIポータル App Store スクリーンショット更新（2026-11-10）

ステップ: `c-rel-anz-shots`。ストアへのアップロード、push、PR、配備は行わない。

## 成果物

保存先: 実行フォルダと同じ親フォルダの `appstore-shots-20261110/anz/`

- iPhone 6.9インチ用 `1320×2868` PNG 6枚（01〜06）
- `00-overview.png`: 全6枚の一覧
- `headlines.txt`: 見出し・説明・操作手順
- `raw/`: 実画面の撮影原本6枚
- `html/`・`overview.html`: HTML/CSSの合成用データ
- `capture-manifest.json`・`evidence/`: 撮影元、入力条件、SHA-256、通信監査

撮影順はホーム、化学物質RA、ビジュアルKYT、法令検索、安全看板、安全研修ライブラリ。最初の3枚でアプリ全体、作業条件からのリスク見積り、現場イラストによる学習を伝える。

## 撮影元と再生成

iOS統合ブランチ `53025727` の既存 `mobile/out` を読み取り専用で配信した。書き出し後の2コミットは検査結果とテストのみで、製品コードの差分はない。新しいビルドは実施していない。

Windows上の新規Playwright Chromiumで撮影（CSS 440×956、3倍）。既存Chromeや9222/9223には接続していない。iOS実機・Simulatorによる撮影ではない。

補助スクリプト: 実行フォルダ内の `tools/c-rel-anz-shots/`

1. `node serve.mjs`（127.0.0.1:3267、同梱静的画面のみ）
2. `node capture.mjs`
3. `node render.mjs`
4. `node verify.mjs`（画像の完全decode、RGB寸法、ハッシュ、レイアウト、撮影用データと検証対象ソースの一致を検査）

AI・認証・課金を含む外部通信はPlaywrightの送信前に遮断する。化学RAの物質取得のみ、実装の静的Route Handlerが返す既存JSONをそのままローカル応答する。判定結果はアプリ自身が計算し、置き換えない。画面内の操作・スクロールだけで状態を作り、UIの文言・警告・会員状態は書き換えない。

## 旧画像との比較・確認事項

公開URL `https://apps.apple.com/jp/app/id6831079439` は取得できず、日本のApple Lookup APIも `resultCount: 0`。実際の公開掲載画像は未確認。

新規Playwrightブラウザで公開URLを開いた結果もHTTP 404だった。状態と画面は成果物の `evidence/appstore-public-status.json`・`appstore-public-page.png` に保存した。

比較元はiOSリポジトリに保存された11/6撮影の旧5枚（事故速報・法改正・事故統計・KY事例・法令検索）。公開中の画像と一致するとは断定しない。

旧画像は機能画面のみの構成。新画像は現行のホーム・共通ナビと作業用ツールを撮影し、短い見出しと操作手順を追加する。最新ニュースやAI回答の生成結果は捏造しない。

現行の `mobile/scripts/configure-ios.rb` と `verify-ios.rb` は `TARGETED_DEVICE_FAMILY=1`（iPhoneのみ）。今回のiPad画像は作成しない。旧ストア説明にはiPad対応の文言が残っており、アプリ対応端末と説明の整合確認が別途必要。

## 最終検証

- `web/` で `node node_modules/typescript/bin/tsc --noEmit --incremental false`: 終了0。
- `web/` で `node node_modules/vitest/vitest.mjs run src/lib/create-simple/create-simple.unit.test.ts src/lib/create-simple/official-parity.test.ts --maxWorkers=1`: 2ファイル・21テスト成功。
- `capture.mjs`: 全6画面を撮影。外部・AIへの送信0、ページ例外0。
- `render.mjs`: 全6枚が1320×2868 RGB PNG。説明・画面・手順の重なりなし。
- `verify.mjs`: 全PNGのdecode・ハッシュ・寸法と一覧画像を検査。撮影用iOSブランチとテスト対象WebブランチのRA計算・低減案・物質データ3ファイルは同一。
- 法令検索は第8条を使用し、画面に映る収録本文とe-Gov公式XMLが完全一致することを検証。アプリ自身の「未確認」表示は変更していない。
- 画像6枚と一覧を目視確認。読み込み中表示、空画像、個人情報なし。

撮影検討時に第61条の収録文とe-Gov原文の語句差分を見つけたため、成果画像では第8条へ検索対象を変更した。第61条の収録データは変更せず、詳細をレーンレポートへ残した。

変更ファイルは本書のみ。アプリの実装・料金・AI設定は変更していない。

詳細な検証結果、未確認項目、各画像のねらいは実行フォルダ内の `reports/c-rel-anz-shots.md` を参照。
