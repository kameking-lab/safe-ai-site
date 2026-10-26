# 公開候補の検証資料

承認済み候補 b7170629 の画像・JSON証跡40件は、既存の非実行メディア容量ガードを満たすため公開用ツリーから除外した。サイトの実行コードと `web/public/mascot/anzen-wanko-v1` は変更していない。

原資料は候補commit b7170629のGit履歴に保存されている。PC上では `<workspace>\release-evidence-b7170629` に同じ相対パスで保存し、manifest.jsonに各ファイルのSHA256・bytesを記録した。全40件についてコピー元とのhash一致を確認した。

main 6e1ba8df の既存更新は通常mergeで取り込み、競合なし。実験RAG f004707f のコード・データ・有効化設定はこの公開候補に含めない。
