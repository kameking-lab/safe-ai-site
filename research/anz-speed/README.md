# 会員・利用枠・チャットの応答改善（sp-1）

2026-11-14。サーバー／Webの変更は PR #1107。アプリ用ブランチにも同じWeb変更を取り込む。マージ、本番・プレビューへの配備、TestFlightビルドは実施しない。

## 比較の条件と秒数

本番の改善後の秒数は未確認。以下の比較は、変更前コミット `5a01d9ed` と変更後の実ソースを隔離VMで実行したローカル比較である。DB照会1回30ms、トランザクションの開始・終了を各20ms、ゲスト利用枠／販売状態の依存先を各100msとした。同じ条件で各5回、中央値。実DB・OAuth・RevenueCat・AIには接続していない。生の比較値は [controlled-benchmark.md](controlled-benchmark.md)。

| 処理 | 変更前（秒） | 変更後（秒） |
|---|---:|---:|
| ヘッダーの会員識別 | 0.342 | 0.031 |
| 権利照会 | 0.251 | 0.088 |
| 従来セッションAPIの会員情報構築 | 0.353 | 0.085 |
| ゲスト利用枠 | 0.324 | 0.103 |

通常の権利照会はDB照会8回→4回、トランザクション2回→1回。ヘッダーは表示に必要な名前・メール・画像だけの `/api/me/profile` を使い、購入元の応答を待たない。

ローカル本番ビルド／アプリの静的エクスポートをChromiumで操作した確認では、送信から考え中表示までWeb 0.103秒、アプリ0.100秒。動きを減らす設定ではWeb 0.069秒、アプリ0.070秒で静止画を表示した。アプリのOAuth復帰は模擬APIの交換・権利照会に各180msを与えた条件で0.854秒、ログアウトの画面反応は0.043秒だった。これは実サービスでのログインや購入の所要時間を示すものではない。

アプリの購入確認後は、サーバーの確定応答でPro表示へ進み、余分な権利GETを行わないことをE2Eで検証する。手動再読み込みは `refresh=1` を送る。通常照会の重複共有は処理中の呼び出しだけで、完了後の権利キャッシュは置かない。

## 本番で確認できたこと

未認証の公開APIを各3回計測した。結果と日時は [http-measurements.md](http-measurements.md)。

| API | HTTP | 初回（秒） | 2回目（秒） | 3回目（秒） |
|---|---:|---:|---:|---:|
| セッション | 200 | 0.366 | 0.252 | 0.215 |
| 権利（未認証） | 401 | 0.221 | 0.276 | 0.203 |
| 利用枠（未認証Web） | 401 | 0.219 | 0.216 | 0.205 |
| ゲスト利用枠（アプリ経路） | 200 | 2.664 | 0.894 | 0.869 |
| アプリ販売設定 | 200 | 0.567 | 0.440 | 0.426 |

本番チャットはWeb経路が429／2.708秒、アプリ経路が429／0.688秒で、最初の文字は取得できなかった。利用枠を回避するヘッダーの偽装や回数の初期化は行っていない。実会員のログイン、購入、Pro反映、会員の残数、本番の最初の文字は未確認。共有ブラウザの接続ホストが使えず、既存の会員セッションも取得できなかった。

ローカルの未認証APIは安全モードで認証・台帳が無効なため、401／503応答を含む。開発サーバーと本番ビルドの応答時間を改善率として比較しない。画面確認は外部通信を遮断し、HTTP・iOSプラグイン境界を模擬して行った。

## 待ちの内訳と変更

1. Webのヘッダーは `load` とidle callback（最大1.5秒）を待っていた。マウント直後に表示用の認証確認を始める。
2. セッション構築は会員存在、削除状態、旧購読、共通権利を直列で照会していた。独立処理を並列化し、台帳有効時の旧購読の重複照会を省く。会員存在・削除確認は維持する。
3. API・購入開始・購入完了の会員認証が共通権利も読み、その直後の処理本体が権利を再取得していた。識別用認証は課金情報を構築せず、処理本体が権利を確認する。Webの決済復帰はStripeセッションを確認してから新しい権利を読み、Webhook到着や事前の古い権利取得を待たない。
4. 通常の権利GETは台帳を読んだ後、同じ情報を再度読んでいた。プロバイダとの同期を行った場合だけ再読する。同期元ごとの独立コミット、所有者確認、Sandbox区分、失効条件を保つ。
5. 利用枠は2機能のそれぞれでリース回復とロックを実施していた。会員ごとに一度回復し、同じロック内で両方を集計する。
6. チャット予約はリース回復と予約が別トランザクションだった。同じロック内にまとめる。Web会員の識別も1回にし、Origin確認は維持する。
7. 手動再読み込みは、最近照会済みの購入元や、最初のApple権利がまだ台帳にない場合も照会する。通常の5分基準、購入直後の明示的な同期、サーバーの購入証明を維持する。
8. アプリは購入・復元・再確認の確定応答を表示に使い、直後の再取得による読み込み表示への戻りを省く。
9. アプリのログアウト表示は操作直後に切り替える。サーバー失効と端末資格情報の消去は待ち、失敗時は会員表示を復旧する。成功後の不要な会員GETを省く。
10. 購入SDKのログアウトは識別キューへ入れ、次のログインより前に完了させる。失敗時も次回は同じ会員を再識別する。
11. アプリ共通ヘッダーの販売設定・会員照会を並列にし、ログアウト成功通知では再取得・購入再開を行わない。バックグラウンド更新中は確認済み会員の表示を維持する。
12. 権利・利用枠・表示用認証APIに処理時間だけの `Server-Timing` を追加する。認証・権利・利用枠・販売状態などを区別でき、会員IDや資格情報は含めない。

料金、無料／Pro回数、AIモデル・プロバイダ・プロンプト、レート上限、月5万円の原価上限、費用確定の `await` は変更していない。

## 関数とDBの地域

本番レスポンスの `x-vercel-id` は `hnd1::iad1::…`。Vercelの仕様上、通過地域と関数実行地域を示す。[公式レスポンスヘッダー仕様](https://vercel.com/docs/headers/response-headers#x-vercel-id)

Neon接続済みツールのプロジェクト管理情報を読み、`safe-ai-db` の `region_id` が `aws-ap-southeast-1` であることを確認した。接続文字列、環境変数の値、DB本体は取得していない。本番の接続先がこのプロジェクトである対応付けまでは未確認である。

この管理情報を根拠に、両方の `vercel.json` の既定実行地域を `sin1` に設定した。`hnd1` は東京、`iad1` は米国東部、`sin1`／`ap-southeast-1` はシンガポール。[公式地域一覧](https://vercel.com/docs/regions#region-list)

関数をデータの近くに配置する設定であり、配備後の通信時間や実際の実行地域は未確認。[公式の関数地域設定](https://vercel.com/docs/functions/configuring-functions/region) 作業ブランチは `git.deploymentEnabled=false` とし、自動プレビューを停止している。[公式Git設定](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled)

## GIFと画面証跡

- `web/public/mascot/mascot-searching.gif`: 156,488 bytes、8フレーム、2.20秒のループ。
- `web/public/mascot/mascot-searching-still.webp`: 9,660 bytes。`prefers-reduced-motion: reduce` のpicture sourceで使用。
- [visual-verification.pdf](visual-verification.pdf): 3ページ。最終GIFをデコードした全フレーム、Web／アプリの390×844・上59pxの画面、減速設定の静止画選択を収録。PDFを全ページ画像へ描画して目視確認した。

全8フレームで、前足2本・後足2本、耳2つ、尾1本。前足の指先の区切りと後足の趾パッドに増減・重複・分裂がないことを確認した。服装は既存画像と同じ緑の安全ヘルメット。はちまきなし。首を傾ける、目で資料を追う、瞬きする動きである。利用者に追加の説明文や同意操作は出さない。

生成は組み込みimagegenを使用。参照は既存の `web/public/mascot/mascot-thinking.webp`。生成したシートをGIFへ組み立て、最終GIFの8フレームを検査した。最終プロンプトは次のとおり。

> Use case: identity-preserve. Create an animation sprite sheet for a short seamless loading GIF, using the reference as the exact Chihuahua character identity and illustration style. A single image with precisely 4 columns by 2 rows, 8 equal square cells on clean pure white background, no borders, no text. Every cell shows same full-body cream Chihuahua wearing the identical green safety helmet with white cross, NO headband, no other clothes. Chihuahua seated behind a small open law book, gently thinking and scanning the pages. Frame sequence left to right top to bottom: eyes on book; eyes gently shift left; eyes center; eyes right; eyes close in blink; eyes reopen; head gently tilted; head returns. Keep head movement tiny and body, paws and book absolutely consistent and aligned. Exactly 2 front paws resting on the book and 2 hind paws, natural rounded dog paws with no human fingers, one tail, two ears, identical anatomy in every cell. All four paws visible and never overlap or duplicate. No extra limbs, no detached paws. Keep generous identical margins and aligned baseline, all artwork fits each cell. Production quality matching reference warm bold outlines and adorable expression. White backdrop is intentional for GIF processing.

補助計測・描画スクリプトと生の画面は、このレーン用の実行フォルダ `tools/sp-1/` に保存する。リポジトリには要約と確認用PDF、アプリで実際に使う画像だけを置く。
