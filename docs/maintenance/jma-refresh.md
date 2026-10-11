# JMA取得と再開条件

更新: 2026-10-11。今回の変更はdraft PR。ジョブ再開・本番マージ・デプロイは対象外。

## 日時の意味

- 気象庁の技術情報[634号 pp.2–3](https://www.data.jma.go.jp/suishin/jyouhou/pdf/634.pdf)はVPWW55–61を発表内容の変更通知として分割し、現在の全要素を伝える集約通報と区別する。[公式カタログ](https://www.data.jma.go.jp/suishin/cgi-bin/catalogue/make_product_page.cgi?id=Keiho)の配信頻度は随時。発表日時が古いという理由だけで、解除済みなど変更のない現在状態を失効させない。
- 現行公式R8 URLの配列を取得し、日時・既知コード/状態・対象地域・区域項目を検査する。旧形式や空/不正/地域違いを警報なしへ変換しない。JSON仕様は恒久保証された契約ではなく、形式変更時は安全側に停止する。
- reportDatetimeは実際の最新発表日時。fetchedAt / sourceFetchedAtは受理した取得時刻。sourceHttpDate / sourceHttpAgeSecondsはHTTP確認情報。表示は発表/取得を区別し、過去の発表を今日の発表へ書き換えない。
- HTTP DateとAgeを検査し、確認不能、未来5分超、応答齢15分超を停止する。Last-Modifiedの古さは発表内容に変更がない場合と区別できないため期限判定に使わない。HTTP鮮度だけで内容を信頼せず、現行URLと形式/地域検査を併用する。
- fallbackは保存時の取得日時を保持し、liveにしない。既存の15分表示鮮度検査、10分runtimeキャッシュ、部分障害の地域別停止を維持する。

## 費用を抑える再開案

- runtimeの直接取得・10分キャッシュを主経路に維持。新しいAPI契約、認証、永続権限は導入しない。
- YAMLの予定は6時間ごと、UTC 00:17/06:17/12:17/18:17の最大4 scheduled runs/日。警報57 + 予報7 + 地震1 = 65 HTTP要求/回、最大260/日。追加の自動再試行はない。手動repository_dispatchは別途運用判断であり、この上限には含めない。
- bundled snapshotの本文が同じなら、取得時刻/HTTP確認時刻だけでJSONを書き換えない。全4ファイルが不変となり、artifact/promotion/main commit/Vercel buildは作られない。保存済みJSONの日時を新しく見せず、最新確認はruntime経路で行う。
- 全件検証に成功した本文差分だけ、既存storage gateとexact allowlistを通して昇格する。最大4 scheduled promotions/日。Vercel全体のignore設定や権限を変更しない。

## 再開保留の理由

GitHub workflowはdisabled_manually。updated_atは2026-08-10 07:15:42 JST、直前8回は成功。最後のrun [31338234395](https://github.com/kameking-lab/safe-ai-site/actions/runs/31338234395)は47都道府県/予報7地域の生成・main昇格に成功した。ただし保存された東京の発表は旧URLの2026-05-28で、取得成功は内容の最新性を意味していなかった。

停止理由、操作実行者、費用/レート制限との関係は既存履歴から特定できない。停止時の意図を確認するまで有効化・dispatchしない。再開承認後も、最初の取得と差分なし実行を確認し、最新のHTTP確認と過去の発表の双方を確認する。
