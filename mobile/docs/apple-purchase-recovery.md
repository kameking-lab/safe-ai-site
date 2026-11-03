# StoreKit購入の調査と解除（IOS3D）

クライアントの結果報告は画面表示用で、予約解除の証明にはしない。経過時間やRevenueCatの購読なし応答だけでも解除しない。実キー呼出し、運用設定変更、DB変更、Sandbox・実機試験は本タスクでは実施していない。

## 状態と利用者の操作

| 状態 | 判定 | 操作 |
| --- | --- | --- |
| prepared | サーバーがStoreKit開始を許可する前 | 同じ予約を再開、または「ストア起動前の購入予約を取り消す」。サーバーがpreparedを確認できた場合だけ自動解除 |
| store_cancelled_reported | SDKエラーコード1（取消結果） | 取消結果と予約の確認待ちを別表示。復元・再確認、未解消なら運営調査 |
| store_deferred | SDKエラーコード20（Ask to Buy等） | 購入を再発行しない。元のApple Accountで承認・拒否を確認し、承認後は復元・再確認 |
| store_unknown / store_started | 通信断・SDKの他エラー・SDK成功後の照合失敗 | 結果不明として新規購入を停止。元のApple Accountで復元・再確認 |
| store_not_opened_reported | 開始APIの応答が得られずSDKを呼んでいない | preparedなら解除可能。開始APIがサーバーで確定済みの場合は調査扱いを維持 |

再表示・再起動後も台帳のstageを表示する。保留・不明の予約を同じIDで再発行して購入シートを開くことも止める。`userCancelled`だけの例外は結果不明扱い。承認済み等の正のストア購読は既存のサーバーreconcileで所有者・環境を検証して予約を完了する。別Apple Accountの空の復元結果は解除根拠にしない。

## 確証が得られない場合

1. 利用者に購入を繰り返させず、会員、予約ID、購入元、商品、環境、発生時刻を確認。秘密値・レシート本文はチケットやログに貼らない。
2. 元の会員と購入時のApple Accountで復元・再確認する。正の購読が見つかれば所有者照合を行いProを復旧する。別会員・別Apple Accountの場合は元の組合せへ戻す。権利の移し替えは行わない。
3. 取消またはSDK未起動でも、RevenueCatの「購読なし」、現在のentitlements、未完了transaction一覧が空という情報だけではAsk to Buyの未決済終了は証明できない。保護者の承認・拒否状態、購入履歴、Appleの調査結果を照合する。元のApple Accountを確認できない、承認待ちが残る、通信が回復しない場合は解除しない。
4. 本番の手動解除にはAppleサポートによる当該商品・元のApple Accountの取消／未成立と未決済終了の確認を取得する。利用者の取消申告やスクリーンショット単独は不可。確証がなければ保留を継続しAppleへエスカレーションする。Sandboxのみ、担当者が管理する同一StoreKitテストセッションでAsk to Buyの拒否・全保留の終了を直接確認した記録も可。Xcodeローカルテスト結果を本番へ流用しない。
5. 解除前に利用者の全端末の購入画面を閉じ、アプリを終了させる。進行中の購入を再開させない。権利・Webhookの未処理を調査し、ストア確認後15分以内に管理者が次のAPIを実行する。時間が過ぎた場合はストア状態から再確認する。

## 管理者専用の解除経路

`POST /api/admin/mobile/apple-purchase-review` は既存のADMIN_EMAILSに登録された管理者のログインセッションと同一Originを必須とする。一般会員のBearerセッションや`/api/billing/store-outcome`からは解除できない。設定追加は本タスクで行わない。

以下は形式例（架空の値）。管理者用の同一Originセッションから送る。証拠本体はアクセス制限した調査記録で保持し、このAPIには参照番号とSHA-256だけを渡す。

```json
{
  "userId": "member-under-review",
  "intentId": "88888888-2222-4222-8222-222222222222",
  "appUserId": "88888888-1111-4111-8111-111111111111",
  "environment": "PRODUCTION",
  "productId": "configured-product-id",
  "checkedAt": "2026-11-04T00:00:00.000Z",
  "evidenceSource": "apple_support",
  "evidenceReference": "restricted-case-reference",
  "evidenceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "resolution": "cancelled",
  "originalAppleAccountConfirmed": true,
  "pendingTransactionsClosed": true,
  "activeSubscriptionAbsent": true
}
```

未成立の場合はresolution=`failed_before_transaction`。Sandboxの担当者直接確認はevidenceSource=`storekit_test_session`。APIはサーバーで改めて購読を照合し、会員・不変appUserId・予約ID・商品・環境・確認時刻・無料かつ照合済みの権利を検証する。会員ロック下で当該pending予約だけを`store_closed_verified`へ変更し、管理者IDと証拠参照をproviderRequestへ記録する。証拠は運営によるストア調査の証明であり、Appleによる署名検証を自動化したAPIではない。

解除後は同じ会員で権利を再確認し、WebまたはiOSのどちらか一方だけで開始する。調査記録に解除結果と時刻を追記する。すでにPro、会員・環境相違、ストア照合不能、古い証拠、別予約の場合は解除されない。DBの直接UPDATEや時間による解除は行わない。

一次資料：[RevenueCatのエラー処理](https://www.revenuecat.com/docs/test-and-launch/errors)、[Appleのpending購入](https://developer.apple.com/documentation/storekit/product/purchaseresult/pending)、[Appleのunfinished](https://developer.apple.com/documentation/storekit/transaction/unfinished)。pending成功はtransaction updatesで届き、未完了transaction一覧の用途は完了済み購入の未処理分の取得であるため、一覧が空という条件を「未決済なし」の証明に拡張しない。
