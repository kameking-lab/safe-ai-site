# アフィリエイトで収益を自分の口座に入れる手順

サイト内の「Amazonで見る」「楽天で見る」に、**あなた専用のトラッキングID**を付けると、条件を満たした購入でアフィリエイト報酬が発生します（各プログラムの規約に従います）。

## Amazon（アソシエイト）

1. [Amazonアソシエイト・プログラム（日本）](https://affiliate.amazon.co.jp/) に申し込み、審査に通過する。
2. 管理画面で **ストアID（Associate Tag）** を確認する（例: `yourname-22`）。
3. 本リポジトリの **Vercel（またはビルド環境）** に環境変数を追加する:
   - 名前: `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG`
   - 値: あなたのタグ（秘密ではない公開用ID）
4. 再デプロイ後、商品リンクの URL に `tag=` が自動付与されます。

検索結果ページ（`/s?k=...`）にも `tag` は付きますが、**Amazonの最新ポリシーと禁止事項**（自作クリック、誤解を招く表示など）は必ず確認してください。

## 楽天アフィリエイト

1. [楽天アフィリエイト](https://affiliate.rakuten.co.jp/) に登録する。
2. リンクツールや検索URL用の **afid**（アフィリエイトID）を取得する。
3. 環境変数を追加する:
   - 名前: `NEXT_PUBLIC_RAKUTEN_AFID`
   - 値: 発行されたID
4. 再デプロイ後、楽天の検索URLに `afid` クエリが付与されます。

楽天は公式の「リンク生成ツール」で得たURLに差し替える運用も可能です。その場合は `safety-goods.ts` の `rakutenUrl` を直接編集してください。

## Vercel で環境変数を入れる手順（ボタン単位）

※ こちら（開発側）でできること: リポジトリに `web/.env.example` を置き、コードが `process.env.NEXT_PUBLIC_*` を読むようにしてあります。**実際のタグの発行と Vercel への入力はあなたのアカウント作業**になります。

1. ブラウザで [https://vercel.com](https://vercel.com) を開き、ログインする。
2. 画面上部またはダッシュボードから **「Dashboard」** を選ぶ。
3. このサイトのプロジェクト（例: `safe-ai-site`）の **名前をクリック** してプロジェクト詳細へ入る。
4. 上部タブの **「Settings」** をクリックする。
5. 左メニューの **「Environment Variables」** をクリックする。
6. **「Key」** 欄に `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` と入力する。
7. **「Value」** 欄に、Amazonアソシエイトで発行したストアID（例 `yourname-22`）だけを貼り付ける。
8. **「Environments」** で Production（必要なら Preview も）にチェックが付いていることを確認する。
9. **「Save」** ボタンを押す。
10. 同様に **「Add Another」** または新しい行で Key に `NEXT_PUBLIC_RAKUTEN_AFID`、Value に楽天の afid を入れて **Save** する。
11. 画面上部の **「Deployments」** タブへ移動し、最新デプロイの **「⋯」メニュー → 「Redeploy」** から再デプロイする（環境変数はデプロイ時にビルドへ取り込まれるため）。

## ローカルで試す

`web/.env.local` を作成し（Git にコミットしない）、`.env.example` と同じキー名に値を入れる。`npm run dev` を再起動する。

## 注意

- **APIキーやログイン秘密情報はリポジトリにコミットしない**でください。`NEXT_PUBLIC_*` はブラウザに送られるため、公開前提のIDのみを使います。
- 報酬条件・税率・表示義務は各ASPの規約が正です。
