# e-Gov 5法令のXML構造化試験

Webアプリから呼ばない、Python標準ライブラリだけのローカル実験。
法令本文の取得は無料公開APIの5件に限定する。対象日と許可法令/履歴は `egov_xml_lab.py` に固定。

保存先はリポジトリの兄弟 `../legal-rag-lab-2026-10-26/` のみ。既存コーパス、DB、公開ファイルに接続しない。
root・法令サブディレクトリ・出力ファイルのパスを解決してredirectを拒否する。既存内容が異なるファイルを上書きしない。

リポジトリルートで実行:

```powershell
python -B scripts/legal-rag-lab/egov_xml_lab.py fetch ../legal-rag-lab-2026-10-26
python -B scripts/legal-rag-lab/egov_xml_lab.py structure ../legal-rag-lab-2026-10-26
python -B scripts/legal-rag-lab/verify_experiment.py ../legal-rag-lab-2026-10-26 --report docs/legal-rag-five-law-xml-verification-2026-10-26.json
python -B -m unittest discover -s scripts/legal-rag-lab -p test_egov_xml_lab.py -v
```

`fetch` の再実行は既存response/metadataを照合し、完備した法令ではGETしない。片方だけ保存された場合は停止し、自動再取得しない。
`structure` と `verify_experiment` はオフライン。WindowsでJSONを保存するときはシェルパイプの文字コード変換を避け、`--report` を使う。

各法令フォルダのファイル:

- `response.json`: APIレスポンスの原bytes
- `retrieval.json`: URL、asof、取得UTC時刻、response hash、law_info、revision_info
- `source.xml`: Base64復号した原XML bytes（再保存・整形なし）
- `structure.json`: 全XMLのtag/属性/text/tail/子要素順序、附則/別表・条項号・表の位置索引。復元時の構造・本文一致を検査
- `manifest.json`: 原レスポンス・XML・構造化JSONのSHA256、サイズ、tag件数、図添付未取得・適用判定未実施の記録

Article/Paragraph/Item/Subitemの識別は `revision:path`。同じ第1条でも本則と複数の改正附則を混同しない。実際の令AppdxTableにはNum属性がないため、別表6と6の2は原タイトル・構造パスを保つ。表は行/列/ヘッダ/rowspan/colspanを保持し、平文化を原データにしない。

`verify_experiment` の11受入確認は原文・構造の保持確認。準用91→56の読み替えや玉掛け/酸欠の関連箇所を保存できたことを示すが、条文を適用して法律上の結論を出す試験ではない。

附則に含まれる過去・経過・未施行規定の適用判定、期間別XMLの比較、添付画像の取得、RAG本体への接続は対象外。APIのcurrent_revision_statusやscheduled_enforcement_dateを過去指定日の効力判定へ転用しない。
