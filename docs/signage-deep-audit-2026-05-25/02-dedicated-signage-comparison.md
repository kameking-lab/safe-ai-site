# 02 専用サイネージ機との比較（軸2）

調査日 2026-05-26。出典は本ファイル末尾。具体数値は出典確認できたもののみ。

## 調査した専用サイネージ機（実在確認）
- シャープ e-Signage S（CMS、スケジュール/夜間自動/緊急割込配信、クラウド版あり）
- パナソニック コネクト AcroSign + AF1（時間/曜日/場所別出し分け、複数台一括管理、遠隔制御、災害多言語緊急配信、Android内蔵プレーヤー）
- NEC MultiSync（SNMP遠隔管理、電源スケジューリング標準、人感センサ、マルチ画面）
- キヤノン 業務用4K/8Kディスプレイ（高画質・マルチディスプレイ。自社CMSは未確認）
- EIZO DuraVision（24時間連続稼働・輝度自動調整Auto EcoView・高耐久）

## 概算コスト（出典記載値）
- ディスプレイ本体: 屋内43〜65型 約20万〜80万円、屋外 約60万〜200万円
- STB: 約1万〜25万円
- CMS（クラウド）: 1端末 月額 約4,000〜1万円
- 47型24時間運用の初期費例: 約55万円／保守: 1拠点 約5,000〜2万円

## 専用機が持ち、当社（ブラウザのみ）でE2E実現困難な機能
1. 通電だけで自動再生（パワーオンオートプレイ）。ブラウザはOS→ブラウザ→キオスク設定が前提。
2. 完全オフライン継続再生（内蔵ストレージへ事前キャッシュ）。Service Workerで部分的にしか不可。
3. 複数画面のフレーム同期/ワイヤレス同期（最大9面など）。
4. ディスプレイ電源スケジューリング（本体ON/OFF）。
5. 環境光に応じた輝度自動調整。
6. 人感センサ連動の画面/音声ON/OFF。
7. SNMP/専用ソフトによる遠隔稼働監視・資産管理・障害検知。
8. 緊急/防災の確実な全台一斉割込（オフライン端末含む到達保証）。
9. 24時間連続稼働を前提とする堅牢ハード・長期保証。

## 当社（無料・登録不要・スマホ/タブレット/汎用TV）が優位な点
1. 初期費ゼロ（手持ち端末＋無料）。専用は本体10〜80万＋STB＋CMS月額。
2. 月額CMS・保守費が不要（ランニングほぼ0）。
3. 導入即時・設置工事不要。
4. 端末非依存・URLを開くだけで台数無制限・機種縛りなし。
5. 登録不要・ベンダーロックインなし。短期/臨時現場に最適。

## 当社が現実的に埋められる差（Phase C候補）
- 「通電→自動再生」相当: フルスクリーンAPI＋Wake Lock＋URL直開きで“ほぼキオスク”に近づける。
- 「緊急割込」相当: 緊急表示モード（避難経路・連絡先の全画面割込）を内製。
- 「輝度/焼き付き」相当: ダーク基調＋定期リフレッシュ＋微小モーションで緩和。
- 「多言語緊急配信」相当: 多言語表示（軸7）。

## 結論
ハード由来の機能（電源制御・輝度センサ・人感・物理同期・オフライン保証）は**原理的に追えない**。
しかし中小現場の朝礼/掲示という用途では、フルスクリーン＋スリープ抑止＋多言語＋緊急モードを足せば、
「専用機を買う/借りる理由」を実務上かなり消せる。コスト差（初期数十万＋月額）が当社最大の武器。

## 出典
- シャープ e-Signage S: https://jp.sharp/business/lcd-display/lineup/e-signages/howto.html ／ https://smj.jp.sharp/bs/digital_signage/e-signages_cloud/
- パナソニック AcroSign: https://connect.panasonic.com/jp-ja/products-services/digitalsignage/top ／ /column/clm04
- NEC: https://jpn.nec.com/products/ds/display/digitalsignage/index.html ／ /lcd-x554hb/function.html
- キヤノン: https://canon.jp/business/solution/smb/list/signage/multidisplay
- EIZO DuraVision: https://www.eizo.co.jp/products/id/
- 緊急/防災: https://www.ricoh.co.jp/special/signage-disaster-prevention
- 同期/一括管理: https://www.otsuka-shokai.co.jp/products/digital-signage/utilization-scene/management/ ／ https://jmgs.jp/multidisplay_selection.html
- オフラインSTB: https://www.otsuka-shokai.co.jp/products/digital-signage/means/stb/ ／ https://vista-japan.com/column/digital-signage-stb/
- 価格: https://www.itscom.co.jp/forbiz/column/signage/169/ ／ https://www.proteras.co.jp/blog/1573/

注: キヤノンの自社CMS機能、各社「ハード+CMS年額」セット公開定価は今回の検索範囲では未確認。
