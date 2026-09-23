# 保護具の実商品写真と評価の取得境界

## 実装状態

カテゴリ画像を押したときと、3択の作業・現場条件フローの結果で販売サイトへ進む前に、サイト内の商品パネルを開く。楽天市場の商品検索APIから実際の出品画像・購入者評価・レビュー件数・販売ページを同時取得できた場合に限り、在庫あり・★4.2以上・レビュー10件以上の商品を最大6件表示する。画像はAPIが返すURLを直接表示し、ローカルへ複製しない。画像や評価が欠ける商品は出さない。購入者評価は保護具の安全規格適合を示さない。

API未設定・接続失敗・条件合致0件は、それぞれ画面に明示する。欠測を0件の購入者評価や架空写真として表示しない。結果が出る場合、楽天公式のクレジットを表示する。Amazonのページから画像をコピーしない。

## 公式根拠と必要な接続

- [楽天市場商品検索API（2026-07-01版）](https://webservice.rakuten.co.jp/documentation/ichiba-item-search)は `applicationId` と `accessKey` を必須とし、`mediumImageUrls`、`reviewAverage`、`reviewCount`、`affiliateUrl` を返す。
- [楽天のクレジット表示規則](https://webservice.rakuten.co.jp/guide/credit)に従い、API利用時は指定のクレジットを画面に表示する。
- [楽天ウェブサービス利用規約](https://webservice.rakuten.co.jp/guide/rule)に従い、商品リンクは楽天アフィリエイトURLを使う。
- [Amazonの画像利用説明](https://affiliate.amazon.co.jp/help/node/topic/GKT6X2R3NGW5V23K)では、Amazonの商品画像を保存して別サーバーへ再アップロードする利用を認めていない。今回は取り込まない。

本番で画像を出すには、サイト運営者が楽天ウェブサービスで当サイト用のアプリを登録し、Vercel Productionに `RAKUTEN_APPLICATION_ID` と `RAKUTEN_ACCESS_KEY` を設定する必要がある。2026年9月23日のVercel環境変数名の読取では、`NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` は既存だが、この2値は未設定だった。Affiliate IDの値の有効性は未検証。値はリポジトリに保存しない。現時点で本番接続は検証できていないので、実画像の本番表示は未完了とする。設定後、3カテゴリ以上で実画像・評価・販売URLを本番表示と販売ページで照合する。
