# 学会数値除去 監査ログ (Phase 1a)

- 実行日時: 2026-05-24T03:18:34.177Z
- 対象ファイル: `web/src/data/concentration-limits.json`
- 設計根拠: `docs/chemical-ra-research-2026-05-23/08-implementation-roadmap.md` D2/D3 (2026-05-23)

## サマリ

### 除去前
```json
{
  "total": 1546,
  "withMhlw": 251,
  "withJsoh": 91,
  "withAcgih": 502,
  "withIarc": 415,
  "bySource": {
    "mhlw": 251,
    "jsoh": 15,
    "acgih": 303,
    "reference": 977
  },
  "byIarc": {
    "group1": 111,
    "group2A": 79,
    "group2B": 134,
    "group3": 91
  }
}
```

### 除去後
```json
{
  "total": 1546,
  "withMhlw": 251,
  "withIarc": 415,
  "withExternalAcgihRef": 502,
  "withExternalJsohRef": 91,
  "bySource": {
    "mhlw": 251,
    "reference": 1295
  },
  "byIarc": {
    "group1": 111,
    "group2A": 79,
    "group2B": 134,
    "group3": 91
  }
}
```

## 除去対象内訳

- acgih: 502 件
- acgihTlv: 475 件
- jsoh: 91 件
- jsohOel: 85 件
- twa: 308 件

## 物質別削除レコード

| CAS | 物質名 | 削除フィールド |
|---|---|---|
| 34590-94-8 | １－（２－メトキシ－２－メチルエトキシ）－２－プロパノール | acgih / acgihTlv |
| 106-92-3 | １－アリルオキシ－２，３－エポキシプロパン | acgih / acgihTlv |
| 63-25-2 | １－ナフチル－Ｎ－メチルカルバメート（別名カルバリル）※４ | jsoh / acgih / jsohOel / acgihTlv |
| 106-94-5 | １－ブロモプロパン | jsoh / acgih / jsohOel / acgihTlv |
| 72-43-5 | １，１，１－トリクロロ－２，２－ビス（４－メトキシフェニル）エタン（別名メトキシクロル） | acgih / acgihTlv |
| 76-13-1 | １，１，２－トリクロロ－１，２，２－トリフルオロエタン | acgih / acgihTlv |
| 72-20-8 | １，２，３，４，１０，１０－ヘキサクロロ－６，７－エポキシ－１，４，４ａ，５，６，７，８，８ａ－オクタヒドロ－エンド－１，４－エンド－５，８－ジメタノナフタレン（別名エンドリン） | acgih / acgihTlv |
| 57-74-9 | １，２，４，５，６，７，８，８－オクタクロロ－２，３，３ａ，４，７，７ａ－ヘキサヒドロ－４，７－メタノ－１Ｈ－インデン（別名クロルデン）※６ | acgih / acgihTlv |
| 542-75-6 | １，３－ジクロロプロペン | acgih / acgihTlv |
| 100-37-8 | ２－（ジエチルアミノ）エタノール | acgih / acgihTlv |
| 1912-24-9 | ２－クロロ－４－エチルアミノ－６－イソプロピルアミノ－１，３，５－トリアジン（別名アトラジン） | acgih / acgihTlv |
| 122-60-1 | ２，３－エポキシプロピル＝フェニルエーテル | acgih / acgihTlv |
| 94-75-7 | ２，４－ジクロロフェノキシ酢酸 | acgih / acgihTlv |
| 93-76-5 | ２，４，５－トリクロロフェノキシ酢酸 | acgih / acgihTlv |
| 4098-71-9 | ３－イソシアナトメチル－３，５，５－トリメチルシクロヘキシル＝イソシアネート | acgih / acgihTlv |
| 101-77-9 | ４，４′－メチレンジアニリン | acgih / acgihTlv |
| 100-61-8 | Ｎ－メチルアニリン | acgih / acgihTlv |
| 127-19-5 | Ｎ，Ｎ－ジメチルアセトアミド | jsoh / acgih / jsohOel / acgihTlv |
| 121-69-7 | Ｎ，Ｎ－ジメチルアニリン | acgih / acgihTlv |
| 79-10-7 | アクリル酸 | jsoh / acgih / jsohOel / acgihTlv |
| 140-88-5 | アクリル酸エチル | acgih / acgihTlv |
| 141-32-2 | アクリル酸ノルマル－ブチル | acgih / acgihTlv |
| 96-33-3 | アクリル酸メチル | acgih / acgihTlv |
| 107-02-8 | アクロレイン | jsoh / acgih |
| 75-07-0 | アセトアルデヒド | twa(JSOH:50ppm) / jsoh / acgih / jsohOel |
| 75-05-8 | アセトニトリル | jsoh / acgih / jsohOel / acgihTlv |
| 75-86-5 | アセトンシアノヒドリン | acgih |
| 62-53-3 | アニリン | jsoh / acgih / jsohOel / acgihTlv |
| 2179-59-1 | アリル－ノルマル－プロピルジスルフィド | twa(ACGIH:0.5ppm) / acgih / acgihTlv |
| 107-18-6 | アリルアルコール | acgih / acgihTlv |
| 98-83-9 | アルファ－メチルスチレン | acgih / acgihTlv |
| 624-83-9 | イソシアン酸メチル | acgih / acgihTlv |
| 78-79-5 | イソプレン | acgih / acgihTlv |
| 75-31-0 | イソプロピルアミン | acgih / acgihTlv |
| 108-20-3 | イソプロピルエーテル | acgih / acgihTlv |
| 541-85-5 | エチル－セカンダリ－ペンチルケトン | acgih / acgihTlv |
| 75-04-7 | エチルアミン | acgih / acgihTlv |
| 107-21-1 | エチレングリコール | acgih |
| 112-07-2 | エチレングリコールモノブチルエーテルアセタート | acgih / acgihTlv |
| 110-49-6 | エチレングリコールモノメチルエーテルアセテート | acgih / acgihTlv |
| 107-15-3 | エチレンジアミン | acgih / acgihTlv |
| 106-89-8 | エピクロロヒドリン | jsoh / acgih / jsohOel / acgihTlv |
| 90-04-0 | オルト－アニシジン | acgih / acgihTlv |
| 1333-86-4 | カーボンブラック | acgih / acgihTlv |
| 98-82-8 | クメン | jsoh / acgih / jsohOel / acgihTlv |
| 111-30-8 | グルタルアルデヒド | acgih |
| 7440-47-3 | クロム | acgih / acgihTlv |
| 75-00-3 | クロロエタン（別名塩化エチル） | acgih / acgihTlv |
| 75-45-6 | クロロジフルオロメタン（別名ＨＣＦＣ－２２） | acgih / acgihTlv |
| 56-38-2 | ジエチル－パラ－ニトロフェニルチオホスフェイト（別名パラチオン） | acgih / acgihTlv |
| 109-89-7 | ジエチルアミン | acgih / acgihTlv |
| 96-22-0 | ジエチルケトン | twa(ACGIH:200ppm) / acgih / acgihTlv |
| 112-34-5 | ジエチレングリコールモノブチルエーテル※６ | acgih / acgihTlv |
| 110-82-7 | シクロヘキサン | jsoh / acgih / jsohOel / acgihTlv |
| 108-91-8 | シクロヘキシルアミン | twa(ACGIH:10ppm) / acgih / acgihTlv |
| 75-34-3 | ジクロロエタン（１，１－ジクロロエタンに限る。） | acgih / acgihTlv |
| 75-35-4 | ジクロロエチレン（１，１－ジクロロエチレンに限る。） | acgih / acgihTlv |
| 75-71-8 | ジクロロジフルオロメタン（別名ＣＦＣ－１２） | acgih / acgihTlv |
| 76-14-2 | ジクロロテトラフルオロエタン（別名ＣＦＣ－１１４） | acgih / acgihTlv |
| 75-43-4 | ジクロロフルオロメタン（別名ＨＣＦＣ－２１） | acgih / acgihTlv |
| 77-73-6 | ジシクロペンタジエン | acgih / acgihTlv |
| 122-39-4 | ジフェニルアミン※６ | acgih / acgihTlv |
| 124-40-3 | ジメチルアミン | acgih / acgihTlv |
| 7782-49-2 | セレン | acgih / acgihTlv |
| 7440-28-0 | タリウム | acgih / acgihTlv |
| 79-00-5 | トリクロロエタン（１，１，２－トリクロロエタンに限る。） | acgih / acgihTlv |
| 118-96-7 | トリニトロトルエン | acgih / acgihTlv |
| 75-25-2 | トリブロモメタン | acgih / acgihTlv |
| 75-50-3 | トリメチルアミン | acgih / acgihTlv |
| 7440-02-0 | ニッケル | jsoh / acgih / jsohOel / acgihTlv |
| 55-63-0 | ニトログリセリン | acgih / acgihTlv |
| 98-95-3 | ニトロベンゼン | jsoh / acgih / jsohOel / acgihTlv |
| 111-84-2 | ノナン（ノルマル－ノナンに限る。） | acgih / acgihTlv |
| 104-94-9 | パラ－アニシジン | acgih / acgihTlv |
| 106-46-7 | パラ－ジクロロベンゼン | acgih / acgihTlv |
| 302-01-2 | ヒドラジン及びその一水和物 | jsoh / acgih / jsohOel / acgihTlv |
| 123-31-9 | ヒドロキノン | acgih / acgihTlv |
| 110-86-1 | ピリジン | acgih / acgihTlv |
| 75-65-0 | ブタノール（ターシャリ－ブタノールに限る。） | acgih / acgihTlv |
| 84-74-2 | フタル酸ジ－ノルマル－ブチル | acgih / acgihTlv |
| 84-66-2 | フタル酸ジエチル※６ | acgih / acgihTlv |
| 117-81-7 | フタル酸ビス（２－エチルヘキシル）（別名ＤＥＨＰ） | jsoh / acgih / jsohOel / acgihTlv |
| 79-09-4 | プロピオン酸 | acgih / acgihTlv |
| 107-98-2 | プロピレングリコールモノメチルエーテル | acgih / acgihTlv |
| 67-72-1 | ヘキサクロロエタン | acgih / acgihTlv |
| 822-06-0 | ヘキサメチレン＝ジイソシアネート | acgih / acgihTlv |
| 142-82-5 | ヘプタン（ノルマル－ヘプタンに限る。） | acgih / acgihTlv |
| 109-66-0 | ペンタン（ノルマル－ペンタンに限る。） | acgih / acgihTlv |
| 1303-96-4 | ほう酸及びそのナトリウム塩（四ほう酸ナトリウム十水和物（別名ホウ砂）に限る。） | acgih / acgihTlv |
| 79-41-4 | メタクリル酸 | acgih / acgihTlv |
| 80-62-6 | メタクリル酸メチル | jsoh / acgih / jsohOel / acgihTlv |
| 109-87-5 | メチラール | acgih / acgihTlv |
| 1634-04-4 | メチル－ターシャリ－ブチルエーテル（別名ＭＴＢＥ） | acgih / acgihTlv |
| 74-89-5 | メチルアミン | acgih / acgihTlv |
| 5124-30-1 | メチレンビス（４，１－シクロヘキシレン）＝ジイソシアネート | acgih / acgihTlv |
| 7803-51-2 | りん化水素 | acgih / acgihTlv |
| 7664-38-2 | りん酸 | acgih / acgihTlv |
| 126-73-8 | りん酸トリ－ノルマル－ブチル※６ | acgih / acgihTlv |
| 78-30-8 | りん酸トリトリル（りん酸トリ（オルト－トリル）に限る。） | acgih / acgihTlv |
| 115-86-6 | りん酸トリフェニル | acgih / acgihTlv |
| 108-46-3 | レソルシノール | acgih / acgihTlv |
| 10024-97-2 | 一酸化二窒素 | acgih / acgihTlv |
| 10025-87-3 | 塩化ホスホリル | acgih / acgihTlv |
| 7722-84-1 | 過酸化水素 | acgih / acgihTlv |
| 7719-12-2 | 三塩化りん | acgih / acgihTlv |
| 1305-78-8 | 酸化カルシウム | acgih / acgihTlv |
| 1314-13-2 | 酸化亜鉛 | acgih / acgihTlv |
| 7726-95-6 | 臭素 | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 64-19-7 | 酢酸 | jsoh / acgih / jsohOel / acgihTlv |
| 108-05-4 | 酢酸ビニル | acgih / acgihTlv |
| 540-88-5 | 酢酸ブチル（酢酸ターシャリ－ブチルに限る。） | acgih / acgihTlv |
| 1305-62-0 | 水酸化カルシウム | acgih / acgihTlv |
| 10102-44-0 | 二酸化窒素 | acgih / acgihTlv |
| 108-31-6 | 無水マレイン酸 | jsoh / acgih / jsohOel / acgihTlv |
| 108-24-7 | 無水酢酸 | jsoh / acgih / jsohOel / acgihTlv |
| 7553-56-2 | 沃(よう)素 | acgih |
| 87-68-3 | 六塩化ブタジエン | acgih / acgihTlv |
| 71-43-2 | ベンゼン | jsoh / acgih / jsohOel / acgihTlv |
| 108-88-3 | トルエン | jsoh / acgih / jsohOel / acgihTlv |
| 1330-20-7 | キシレン | jsoh / acgih / jsohOel / acgihTlv |
| 100-41-4 | エチルベンゼン | jsoh / acgih / jsohOel / acgihTlv |
| 100-42-5 | スチレン | jsoh / acgih / jsohOel / acgihTlv |
| 108-67-8 | メシチレン | twa(ACGIH:25ppm) / acgih / acgihTlv |
| 95-63-6 | 1,2,4-トリメチルベンゼン | twa(ACGIH:25ppm) / acgih / acgihTlv |
| 526-73-8 | 1,2,3-トリメチルベンゼン | twa(ACGIH:25ppm) / acgih / acgihTlv |
| 110-54-3 | n-ヘキサン | jsoh / acgih / jsohOel / acgihTlv |
| 111-65-9 | n-オクタン | twa(ACGIH:300ppm) / acgih / acgihTlv |
| 78-78-4 | イソペンタン | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 75-28-5 | イソブタン | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 106-97-8 | n-ブタン | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 74-98-6 | プロパン | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 74-84-0 | エタン | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 74-82-8 | メタン | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 287-92-3 | シクロペンタン | twa(ACGIH:600ppm) / acgih / acgihTlv |
| 108-87-2 | メチルシクロヘキサン | twa(ACGIH:400ppm) / acgih / acgihTlv |
| 115-07-1 | プロピレン | twa(ACGIH:500ppm) / acgih / acgihTlv |
| 74-85-1 | エチレン | twa(ACGIH:200ppm) / acgih / acgihTlv |
| 106-99-0 | 1,3-ブタジエン | jsoh / acgih / jsohOel / acgihTlv |
| 115-11-7 | イソブチレン | twa(ACGIH:250ppm) / acgih / acgihTlv |
| 463-82-1 | ネオペンタン | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 8030-30-6 | ナフサ | twa(ACGIH:300ppm) / acgih / acgihTlv |
| 8052-41-3 | ストッダード溶剤 | twa(ACGIH:100ppm) / acgih / acgihTlv |
| 64742-89-8 | 脂肪族系石油ナフサ | twa(ACGIH:300ppm) / acgih / acgihTlv |
| 8006-61-9 | ガソリン | twa(ACGIH:300ppm) / acgih / acgihTlv |
| 8008-20-6 | 灯油 | twa(ACGIH:200mg/m³) / acgih / acgihTlv |
| 68476-30-2 | 燃料油2号 | twa(ACGIH:100mg/m³) / acgih / acgihTlv |
| 64742-94-5 | 芳香族系石油ナフサ | twa(ACGIH:100ppm) / acgih / acgihTlv |
| 67-56-1 | メタノール | jsoh / acgih / jsohOel / acgihTlv |
| 64-17-5 | エタノール | twa(JSOH:1000ppm) / jsoh / acgih / jsohOel |
| 67-63-0 | イソプロピルアルコール | twa(ACGIH:200ppm) / jsoh / acgih / jsohOel / acgihTlv |
| 71-23-8 | n-プロピルアルコール | twa(ACGIH:100ppm) / acgih / acgihTlv |
| 71-36-3 | n-ブタノール | twa(ACGIH:20ppm) / jsoh / acgih / jsohOel / acgihTlv |
| 78-92-2 | sec-ブタノール | twa(ACGIH:100ppm) / acgih / acgihTlv |
| 78-83-1 | イソブタノール | twa(ACGIH:50ppm) / acgih / acgihTlv |
| 108-93-0 | シクロヘキサノール | twa(ACGIH:50ppm) / acgih / acgihTlv |
| 71-41-0 | n-アミルアルコール | twa(ACGIH:100ppm) / acgih / acgihTlv |
| 123-51-3 | イソアミルアルコール | twa(ACGIH:100ppm) / acgih / acgihTlv |
| 104-76-7 | 2-エチルヘキサノール | twa(ACGIH:1ppm) / acgih / acgihTlv |
| 107-19-7 | プロパルギルアルコール | twa(ACGIH:1ppm) / acgih / acgihTlv |
| 56-81-5 | グリセリン | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 110-80-5 | 2-エトキシエタノール | jsoh / acgih / jsohOel / acgihTlv |
| 109-86-4 | 2-メトキシエタノール | jsoh / acgih / jsohOel / acgihTlv |
| 111-76-2 | 2-ブトキシエタノール | jsoh / acgih / jsohOel / acgihTlv |
| 111-15-9 | 2-エトキシエチルアセテート | jsoh / acgih / jsohOel / acgihTlv |
| 108-65-6 | プロピレングリコールモノメチルエーテルアセテート | acgih / acgihTlv |
| 5131-66-8 | 1-ブトキシ-2-プロパノール | twa(ACGIH:20ppm) / acgih / acgihTlv |
| 111-90-0 | ジエチレングリコールモノエチルエーテル | acgih / acgihTlv |
| 67-64-1 | アセトン | jsoh / acgih / jsohOel / acgihTlv |
| 78-93-3 | メチルエチルケトン | jsoh / acgih / jsohOel / acgihTlv |
| 108-10-1 | メチルイソブチルケトン | jsoh / acgih / jsohOel / acgihTlv |
| 591-78-6 | メチル-n-ブチルケトン | acgih / acgihTlv |
| 110-43-0 | メチル-n-アミルケトン | twa(ACGIH:50ppm) / acgih / acgihTlv |
| 108-94-1 | シクロヘキサノン | jsoh / acgih / jsohOel / acgihTlv |
| 583-60-8 | 2-メチルシクロヘキサノン | twa(ACGIH:50ppm) / acgih / acgihTlv |
| 107-87-9 | メチルプロピルケトン | twa(ACGIH:200ppm) / acgih / acgihTlv |
| 563-80-4 | メチルイソプロピルケトン | twa(ACGIH:200ppm) / acgih / acgihTlv |
| 123-19-3 | ジプロピルケトン | twa(ACGIH:50ppm) / acgih / acgihTlv |
| 131-11-3 | フタル酸ジメチル | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 98-86-2 | アセトフェノン | twa(ACGIH:10ppm) / acgih / acgihTlv |
| 141-78-6 | 酢酸エチル | jsoh / acgih / jsohOel / acgihTlv |
| 79-20-9 | 酢酸メチル | acgih / acgihTlv |
| 109-60-4 | 酢酸プロピル | acgih / acgihTlv |
| 108-21-4 | 酢酸イソプロピル | twa(ACGIH:100ppm) / acgih / acgihTlv |
| 123-86-4 | 酢酸n-ブチル | jsoh / acgih / jsohOel / acgihTlv |
| 110-19-0 | 酢酸イソブチル | acgih / acgihTlv |
| 105-46-4 | 酢酸sec-ブチル | twa(ACGIH:200ppm) / acgih / acgihTlv |
| 628-63-7 | 酢酸n-アミル | twa(ACGIH:50ppm) / acgih / acgihTlv |
| 123-92-2 | 酢酸イソアミル | twa(ACGIH:50ppm) / acgih / acgihTlv |
| 108-84-9 | 酢酸メチルアミル | twa(ACGIH:50ppm) / acgih / acgihTlv |
| 97-63-2 | メタクリル酸エチル | twa(ACGIH:50ppm) / acgih / acgihTlv |
| 60-29-7 | ジエチルエーテル | twa(ACGIH:400ppm) / acgih / acgihTlv |
| 109-99-9 | テトラヒドロフラン | jsoh / acgih / jsohOel / acgihTlv |
| 123-91-1 | 1,4-ジオキサン | jsoh / acgih / jsohOel / acgihTlv |
| 111-44-4 | ビス(2-クロロエチル)エーテル | twa(ACGIH:5ppm) / acgih / acgihTlv |
| 111-77-3 | 2-(2-メトキシエトキシ)エタノール | twa(ACGIH:10ppm) / acgih / acgihTlv |
| 542-88-1 | ビス(クロロメチル)エーテル | twa(ACGIH:0.001ppm) / jsoh / acgih / jsohOel / acgihTlv |
| 75-21-8 | エチレンオキシド | jsoh / acgih / jsohOel / acgihTlv |
| 75-56-9 | プロピレンオキシド | jsoh / acgih / jsohOel / acgihTlv |
| 1768-31-6 | ブチルグリシジルエーテル | twa(ACGIH:3ppm) / acgih / acgihTlv |
| 75-09-2 | ジクロロメタン | jsoh / acgih / jsohOel / acgihTlv |
| 67-66-3 | クロロホルム | jsoh / acgih / jsohOel / acgihTlv |
| 56-23-5 | 四塩化炭素 | jsoh / acgih / jsohOel / acgihTlv |
| 74-87-3 | クロロメタン | jsoh / acgih / jsohOel / acgihTlv |
| 107-06-2 | 1,2-ジクロロエタン | jsoh / acgih / jsohOel / acgihTlv |
| 71-55-6 | 1,1,1-トリクロロエタン | jsoh / acgih / jsohOel / acgihTlv |
| 79-34-5 | 1,1,2,2-テトラクロロエタン | jsoh / acgih / jsohOel / acgihTlv |
| 75-01-4 | 塩化ビニル | jsoh / acgih / jsohOel / acgihTlv |
| 79-01-6 | トリクロロエチレン | jsoh / acgih / jsohOel / acgihTlv |
| 127-18-4 | テトラクロロエチレン | jsoh / acgih / jsohOel / acgihTlv |
| 75-29-6 | 2-クロロプロパン | twa(ACGIH:10ppm) / acgih / acgihTlv |
| 78-87-5 | 1,2-ジクロロプロパン | jsoh / acgih / jsohOel / acgihTlv |
| 108-90-7 | クロロベンゼン | jsoh / acgih / jsohOel / acgihTlv |
| 95-50-1 | 1,2-ジクロロベンゼン | jsoh / acgih / jsohOel / acgihTlv |
| 120-82-1 | 1,2,4-トリクロロベンゼン | twa(ACGIH:5ppm) / acgih / acgihTlv |
| 118-74-1 | ヘキサクロロベンゼン | twa(ACGIH:0.002mg/m³) / acgih / acgihTlv |
| 74-83-9 | ブロモメタン | twa(ACGIH:1ppm) / acgih / acgihTlv |
| 74-96-4 | ブロモエタン | twa(ACGIH:5ppm) / acgih / acgihTlv |
| 75-26-3 | 2-ブロモプロパン | acgih / acgihTlv |
| 110-57-6 | trans-1,4-ジクロロ-2-ブテン | twa(ACGIH:0.005ppm) / acgih / acgihTlv |
| 75-69-4 | トリクロロフルオロメタン (CFC-11) | acgih |
| 75-72-9 | クロロトリフルオロメタン (CFC-13) | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 811-97-2 | 1,1,1,2-テトラフルオロエタン (HFC-134a) | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 7647-01-0 | 塩化水素 | jsoh / acgih |
| 7664-39-3 | フッ化水素 | twa(ACGIH:0.5ppm) / jsoh / acgih / acgihTlv |
| 10035-10-6 | 臭化水素 | acgih |
| 74-90-8 | シアン化水素 | jsoh / acgih |
| 7783-06-4 | 硫化水素 | jsoh / acgih / jsohOel / acgihTlv |
| 7664-41-7 | アンモニア | jsoh / acgih / jsohOel / acgihTlv |
| 7664-93-9 | 硫酸 | jsoh / acgih / jsohOel / acgihTlv |
| 7697-37-2 | 硝酸 | jsoh / acgih / jsohOel / acgihTlv |
| 10026-13-8 | 五塩化リン | twa(ACGIH:0.85mg/m³) / acgih / acgihTlv |
| 7782-50-5 | 塩素 | twa(ACGIH:0.1ppm) / jsoh / acgih / acgihTlv |
| 7782-41-4 | フッ素 | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 7446-09-5 | 二酸化硫黄 | twa(JSOH:2ppm) / jsoh / acgih / jsohOel |
| 10102-43-9 | 一酸化窒素 | twa(ACGIH:25ppm) / acgih / acgihTlv |
| 630-08-0 | 一酸化炭素 | twa(ACGIH:25ppm) / jsoh / acgih / jsohOel / acgihTlv |
| 124-38-9 | 二酸化炭素 | twa(ACGIH:5000ppm) / acgih / acgihTlv |
| 10049-04-4 | 二酸化塩素 | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 75-44-5 | ホスゲン | twa(ACGIH:0.1ppm) / jsoh / acgih / jsohOel / acgihTlv |
| 7783-07-5 | セレン化水素 | twa(ACGIH:0.05ppm) / acgih / acgihTlv |
| 7784-42-1 | アルシン | acgih / acgihTlv |
| 7440-38-2 | ヒ素 | jsoh / acgih / jsohOel / acgihTlv |
| 1327-53-3 | 三酸化二ヒ素 | twa(ACGIH:0.01mg/m³) / acgih / acgihTlv |
| 7440-39-3 | バリウム | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 7440-41-7 | ベリリウム | jsoh / acgih / jsohOel / acgihTlv |
| 7440-43-9 | カドミウム | jsoh / acgih / jsohOel / acgihTlv |
| 7440-48-4 | コバルト | jsoh / acgih / jsohOel / acgihTlv |
| 7440-50-8 | 銅 | twa(ACGIH:0.2mg/m³) / acgih / acgihTlv |
| 7439-89-6 | 鉄 | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 7439-92-1 | 鉛 | twa(ACGIH:0.05mg/m³) / jsoh / acgih / jsohOel / acgihTlv |
| 7439-96-5 | マンガン | jsoh / acgih / jsohOel / acgihTlv |
| 7439-97-6 | 水銀 | jsoh / acgih / jsohOel / acgihTlv |
| 7439-98-7 | モリブデン | twa(ACGIH:3mg/m³) / acgih / acgihTlv |
| 13463-39-3 | ニッケルカルボニル | twa(ACGIH:0.05ppm) / acgih / acgihTlv |
| 7440-44-0 | 炭素 | twa(ACGIH:3mg/m³) / acgih / acgihTlv |
| 7440-22-4 | 銀 | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 7440-31-5 | 錫 | twa(ACGIH:2mg/m³) / acgih / acgihTlv |
| 7440-32-6 | チタン | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 13463-67-7 | 二酸化チタン | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 7440-61-1 | ウラン | twa(ACGIH:0.2mg/m³) / acgih / acgihTlv |
| 7440-62-2 | バナジウム | twa(ACGIH:0.05mg/m³) / acgih / acgihTlv |
| 7440-66-6 | 亜鉛 | twa(ACGIH:2mg/m³) / acgih / acgihTlv |
| 7440-58-6 | ハフニウム | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 7440-67-7 | ジルコニウム | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 7440-65-5 | イットリウム | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 7440-25-7 | タンタル | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 7440-21-3 | シリコン | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 7440-33-7 | タングステン | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 7440-74-6 | インジウム | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 7440-36-0 | アンチモン | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 1309-64-4 | 三酸化アンチモン | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 7440-70-2 | カルシウム | twa(ACGIH:2mg/m³) / acgih / acgihTlv |
| 1310-58-3 | 水酸化カリウム | acgih |
| 1310-73-2 | 水酸化ナトリウム | jsoh / acgih |
| 1333-82-0 | 三酸化クロム | twa(ACGIH:0.0002mg/m³) / jsoh / acgih / jsohOel / acgihTlv |
| 121-75-5 | マラチオン | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 298-00-0 | メチルパラチオン | twa(ACGIH:0.02mg/m³) / acgih / acgihTlv |
| 60-51-5 | ジメトエート | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 62-73-7 | ジクロロボス | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 115-29-7 | エンドサルファン | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 50-29-3 | DDT | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 58-89-9 | リンデン (γ-BHC) | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 76-44-8 | ヘプタクロル | twa(ACGIH:0.05mg/m³) / acgih / acgihTlv |
| 330-54-1 | ジウロン | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 85-00-7 | ジクワット | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 1910-42-5 | パラコート | twa(ACGIH:0.05mg/m³) / acgih / acgihTlv |
| 16752-77-5 | メソミル | twa(ACGIH:2.5mg/m³) / acgih / acgihTlv |
| 108-95-2 | フェノール | jsoh / acgih / jsohOel / acgihTlv |
| 95-48-7 | o-クレゾール | twa(ACGIH:5ppm) / acgih / acgihTlv |
| 108-39-4 | m-クレゾール | twa(ACGIH:5ppm) / acgih / acgihTlv |
| 106-44-5 | p-クレゾール | twa(ACGIH:5ppm) / acgih / acgihTlv |
| 1319-77-3 | クレゾール（混合） | twa(ACGIH:5ppm) / jsoh / acgih / jsohOel / acgihTlv |
| 120-80-9 | カテコール | twa(ACGIH:5ppm) / acgih / acgihTlv |
| 99-08-1 | m-ニトロトルエン | twa(ACGIH:2ppm) / acgih / acgihTlv |
| 99-99-0 | p-ニトロトルエン | twa(ACGIH:2ppm) / acgih / acgihTlv |
| 88-72-2 | o-ニトロトルエン | twa(ACGIH:2ppm) / acgih / acgihTlv |
| 121-14-2 | 2,4-ジニトロトルエン | twa(ACGIH:0.2mg/m³) / acgih / acgihTlv |
| 606-20-2 | 2,6-ジニトロトルエン | twa(ACGIH:0.2mg/m³) / acgih / acgihTlv |
| 100-25-4 | 1,4-ジニトロベンゼン | twa(ACGIH:0.15mg/m³) / acgih / acgihTlv |
| 92-87-5 | ベンジジン | acgih / acgihTlv |
| 101-14-4 | 4,4'-メチレンビス(2-クロロアニリン) (MOCA) | twa(ACGIH:0.01ppm) / acgih / acgihTlv |
| 95-53-4 | o-トルイジン | twa(ACGIH:2ppm) / acgih / acgihTlv |
| 106-49-0 | p-トルイジン | twa(ACGIH:2ppm) / acgih / acgihTlv |
| 108-44-1 | m-トルイジン | twa(ACGIH:2ppm) / acgih / acgihTlv |
| 91-20-3 | ナフタレン | twa(ACGIH:10ppm) / jsoh / acgih / jsohOel / acgihTlv |
| 50-00-0 | ホルムアルデヒド | jsoh / acgih / jsohOel |
| 123-72-8 | ブチルアルデヒド | twa(ACGIH:25ppm) / acgih / acgihTlv |
| 123-38-6 | プロピオンアルデヒド | twa(ACGIH:20ppm) / acgih / acgihTlv |
| 107-13-1 | アクリロニトリル | jsoh / acgih / jsohOel / acgihTlv |
| 151-56-4 | エチレンイミン | twa(ACGIH:0.05ppm) / jsoh / acgih / jsohOel / acgihTlv |
| 75-55-8 | プロピレンイミン | twa(ACGIH:2ppm) / acgih / acgihTlv |
| 584-84-9 | トルエン-2,4-ジイソシアネート (TDI) | jsoh / acgih / jsohOel / acgihTlv |
| 91-08-7 | トルエン-2,6-ジイソシアネート | twa(ACGIH:0.005ppm) / acgih / acgihTlv |
| 26471-62-5 | TDI（混合異性体） | twa(ACGIH:0.005ppm) / acgih / acgihTlv |
| 101-68-8 | メチレンビス(4,1-フェニレン)ジイソシアネート (MDI) | twa(ACGIH:0.005ppm) / acgih / acgihTlv |
| 57-14-7 | 1,1-ジメチルヒドラジン | twa(ACGIH:0.01ppm) / acgih / acgihTlv |
| 60-34-4 | メチルヒドラジン | twa(ACGIH:0.01ppm) / acgih / acgihTlv |
| 68-12-2 | N,N-ジメチルホルムアミド (DMF) | jsoh / acgih / jsohOel / acgihTlv |
| 75-12-7 | ホルムアミド | twa(ACGIH:10ppm) / acgih / acgihTlv |
| 872-50-4 | 1-メチル-2-ピロリドン (NMP) | jsoh / acgih / jsohOel / acgihTlv |
| 75-15-0 | 二硫化炭素 | jsoh / acgih / jsohOel / acgihTlv |
| 463-58-1 | 硫化カルボニル | twa(ACGIH:5ppm) / acgih / acgihTlv |
| 121-44-8 | トリエチルアミン | twa(ACGIH:1ppm) / acgih / acgihTlv |
| 111-40-0 | ジエチレントリアミン | twa(ACGIH:1ppm) / acgih / acgihTlv |
| 85-44-9 | 無水フタル酸 | jsoh / acgih / jsohOel / acgihTlv |
| 64-18-6 | ギ酸 | twa(ACGIH:5ppm) / acgih / acgihTlv |
| 79-06-1 | アクリルアミド | jsoh / acgih / jsohOel / acgihTlv |
| 1336-36-3 | ポリ塩化ビフェニル類 (PCB) | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 1332-21-4 | アスベスト | twa(ACGIH:0.1f/cc) / acgih / acgihTlv |
| 12001-29-5 | クリソタイル | twa(ACGIH:0.1f/cc) / acgih / acgihTlv |
| 12172-73-5 | アモサイト | twa(ACGIH:0.1f/cc) / acgih / acgihTlv |
| 12001-28-4 | クロシドライト | twa(ACGIH:0.1f/cc) / acgih / acgihTlv |
| 14808-60-7 | 結晶質シリカ（石英） | twa(ACGIH:0.025mg/m³) / acgih / acgihTlv |
| 14464-46-1 | クリストバライト | twa(ACGIH:0.025mg/m³) / acgih / acgihTlv |
| 15468-32-3 | トリジマイト | twa(ACGIH:0.025mg/m³) / acgih / acgihTlv |
| 7631-86-9 | 二酸化ケイ素（非晶質） | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 8001-58-9 | コールタール | twa(ACGIH:0.2mg/m³) / acgih / acgihTlv |
| 1318-74-7 | シリマナイト | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 1344-28-1 | 酸化アルミニウム | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 7429-90-5 | アルミニウム | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 21645-51-2 | 水酸化アルミニウム | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 1317-65-3 | 炭酸カルシウム | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 14807-96-6 | タルク | twa(ACGIH:2mg/m³) / acgih / acgihTlv |
| 1332-58-7 | カオリン | twa(ACGIH:2mg/m³) / acgih / acgihTlv |
| 12001-26-2 | 雲母 | twa(ACGIH:3mg/m³) / acgih / acgihTlv |
| 65997-15-1 | ポルトランドセメント | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 65997-17-3 | グラスファイバー | twa(ACGIH:1f/cc) / acgih / acgihTlv |
| 1313-13-9 | 二酸化マンガン | twa(ACGIH:0.02mg/m³) / acgih / acgihTlv |
| 12230-71-6 | ロックウール | twa(ACGIH:1f/cc) / acgih / acgihTlv |
| 1314-23-4 | 二酸化ジルコニウム | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 75-99-0 | ダラポン | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 126-99-8 | クロロプレン | twa(ACGIH:10ppm) / acgih / acgihTlv |
| 534-52-1 | 4,6-ジニトロ-o-クレゾール | twa(ACGIH:0.2mg/m³) / acgih / acgihTlv |
| 108-83-8 | ジイソブチルケトン | twa(ACGIH:25ppm) / acgih / acgihTlv |
| 108-11-2 | メチルイソブチルカルビノール | twa(ACGIH:25ppm) / acgih / acgihTlv |
| 13463-40-6 | ペンタカルボニル鉄 | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 94-36-0 | 過酸化ベンゾイル | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 10024-89-2 | モルホリン（CAS: 10024-89-2） | twa(ACGIH:20ppm) / acgih / acgihTlv |
| 110-91-8 | モルホリン | twa(ACGIH:20ppm) / acgih / acgihTlv |
| 139-13-9 | ニトリロ三酢酸 | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 100-44-7 | 塩化ベンジル | twa(ACGIH:1ppm) / acgih / acgihTlv |
| 98-87-3 | ベンザル塩化物 | acgih |
| 98-07-7 | ベンゾトリクロリド | acgih |
| 98-88-4 | 塩化ベンゾイル | acgih |
| 78-00-2 | テトラエチル鉛 | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 75-74-1 | テトラメチル鉛 | twa(ACGIH:0.15mg/m³) / acgih / acgihTlv |
| 1314-62-1 | 五酸化バナジウム | twa(ACGIH:0.05mg/m³) / acgih / acgihTlv |
| 78-10-4 | オルトケイ酸テトラエチル | twa(ACGIH:10ppm) / acgih / acgihTlv |
| 681-84-5 | オルトケイ酸テトラメチル | twa(ACGIH:1ppm) / acgih / acgihTlv |
| 10025-78-2 | トリクロロシラン | acgih |
| 1314-80-3 | 五硫化二リン | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 7723-14-0 | 黄リン | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 1306-19-0 | 酸化カドミウム | twa(ACGIH:0.002mg/m³) / acgih / acgihTlv |
| 13494-80-9 | テルル | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 7783-79-1 | 六フッ化セレン | twa(ACGIH:0.05ppm) / acgih / acgihTlv |
| 75-83-2 | 2,2-ジメチルブタン | twa(ACGIH:500ppm) / acgih / acgihTlv |
| 79-29-8 | 2,3-ジメチルブタン | twa(ACGIH:500ppm) / acgih / acgihTlv |
| 96-14-0 | 3-メチルペンタン | twa(ACGIH:500ppm) / acgih / acgihTlv |
| 107-83-5 | 2-メチルペンタン | twa(ACGIH:500ppm) / acgih / acgihTlv |
| 591-76-4 | 2-メチルヘキサン | twa(ACGIH:400ppm) / acgih / acgihTlv |
| 589-34-4 | 3-メチルヘキサン | twa(ACGIH:400ppm) / acgih / acgihTlv |
| 108-38-3 | m-キシレン | twa(ACGIH:100ppm) / acgih / acgihTlv |
| 95-47-6 | o-キシレン | twa(ACGIH:100ppm) / acgih / acgihTlv |
| 106-42-3 | p-キシレン | twa(ACGIH:100ppm) / acgih / acgihTlv |
| 150-76-5 | 4-メトキシフェノール | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 87-86-5 | ペンタクロロフェノール | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 100-00-5 | p-ニトロクロロベンゼン | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 88-73-3 | o-ニトロクロロベンゼン | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 121-73-3 | m-ニトロクロロベンゼン | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 100-40-3 | 4-ビニルシクロヘキセン | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 12108-13-3 | メチルシクロペンタジエニルマンガントリカルボニル | twa(ACGIH:0.2mg/m³) / acgih / acgihTlv |
| 563-12-2 | エチオン | twa(ACGIH:0.4mg/m³) / acgih / acgihTlv |
| 78-34-2 | ジオキサチオン | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 7778-18-9 | 硫酸カルシウム | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 7681-49-4 | フッ化ナトリウム | twa(ACGIH:2.5mg/m³) / acgih / acgihTlv |
| 12125-02-9 | 塩化アンモニウム | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 557-05-1 | ステアリン酸亜鉛 | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 7758-94-3 | 塩化鉄(II) | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 1309-37-1 | 酸化鉄(III) | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 471-34-1 | 炭酸カルシウム（アラゴナイト） | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 7727-21-1 | 過硫酸カリウム | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 100-22-1 | p-フェニレンジアミン | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 108-45-2 | m-フェニレンジアミン | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 95-54-5 | o-フェニレンジアミン | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 542-92-7 | シクロペンタジエン | twa(ACGIH:75ppm) / acgih / acgihTlv |
| 115-77-5 | ペンタエリトリトール | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 77-47-4 | ヘキサクロロシクロペンタジエン | twa(ACGIH:0.01ppm) / acgih / acgihTlv |
| 540-59-0 | 1,2-ジクロロエチレン | twa(ACGIH:200ppm) / acgih / acgihTlv |
| 156-59-2 | cis-1,2-ジクロロエチレン | twa(ACGIH:200ppm) / acgih / acgihTlv |
| 156-60-5 | trans-1,2-ジクロロエチレン | twa(ACGIH:200ppm) / acgih / acgihTlv |
| 75-94-5 | ビニルトリクロロシラン | twa(ACGIH:1ppm) / acgih / acgihTlv |
| 688-73-3 | 三ブチル錫水素化物 | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 56-35-9 | ビス(三-n-ブチル錫)オキシド | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 1303-86-2 | 三酸化二ホウ素 | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 10043-35-3 | ホウ酸 | twa(ACGIH:2mg/m³) / acgih / acgihTlv |
| 12179-04-3 | ホウ砂 | twa(ACGIH:2mg/m³) / acgih / acgihTlv |
| 1330-43-4 | ホウ砂（無水） | twa(ACGIH:2mg/m³) / acgih / acgihTlv |
| 10043-01-3 | 硫酸アルミニウム | twa(ACGIH:2mg/m³) / acgih / acgihTlv |
| 12125-01-8 | フッ化アンモニウム | twa(ACGIH:2.5mg/m³) / acgih / acgihTlv |
| 1336-21-6 | アンモニア水 | twa(ACGIH:25ppm) / acgih / acgihTlv |
| 1563-66-2 | カルボフラン | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 78-48-8 | DEF | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 122-34-9 | シマジン | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 1929-82-4 | ニトラピリン | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 133-06-2 | キャプタン | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 2425-06-1 | キャプタフォル | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 133-07-3 | フォルペット | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 2921-88-2 | クロルピリホス | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 62-38-4 | 酢酸フェニル水銀 | twa(ACGIH:0.01mg/m³) / acgih / acgihTlv |
| 150-50-5 | メリホス | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 8001-35-2 | トキサフェン | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 60-57-1 | ディルドリン | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 309-00-2 | アルドリン | twa(ACGIH:0.05mg/m³) / acgih / acgihTlv |
| 8012-95-1 | 鉱油（ミスト） | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 64742-65-0 | 鉱油 高度精製 | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 8002-74-2 | パラフィンワックス | twa(ACGIH:2mg/m³) / acgih / acgihTlv |
| 106-87-6 | ビニルシクロヘキセンジオキシド | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 80-05-7 | ビスフェノールA | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 76-15-3 | クロロペンタフルオロエタン (CFC-115) | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 754-12-1 | 2,3,3,3-テトラフルオロプロペン (HFO-1234yf) | twa(ACGIH:500ppm) / acgih / acgihTlv |
| 29118-24-9 | trans-1,3,3,3-テトラフルオロプロペン (HFO-1234ze) | twa(ACGIH:800ppm) / acgih / acgihTlv |
| 2551-62-4 | 六フッ化硫黄 | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 74-99-7 | プロピン | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 463-49-0 | プロパジエン | twa(ACGIH:1000ppm) / acgih / acgihTlv |
| 80-56-8 | α-ピネン | twa(ACGIH:20ppm) / acgih / acgihTlv |
| 8014-95-7 | オレウム | twa(ACGIH:0.2mg/m³) / acgih / acgihTlv |
| 8052-42-4 | アスファルト | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 57-57-8 | β-プロピオラクトン | acgih / acgihTlv |
| 684-16-2 | ヘキサフルオロアセトン | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 594-72-9 | 1,1-ジクロロ-1-ニトロエタン | twa(ACGIH:2ppm) / acgih / acgihTlv |
| 112-24-3 | トリエチレンテトラミン | twa(ACGIH:1ppm) / acgih / acgihTlv |
| 108-18-9 | ジイソプロピルアミン | twa(ACGIH:5ppm) / acgih / acgihTlv |
| 151-50-8 | シアン化カリウム | acgih |
| 143-33-9 | シアン化ナトリウム | acgih |
| 110-62-3 | n-ペンタナール | twa(ACGIH:50ppm) / acgih / acgihTlv |
| 97-88-1 | メタクリル酸ブチル | twa(ACGIH:50ppm) / acgih / acgihTlv |
| 101-94-0 | 2-アミノピリジン（CAS: 101-94-0） | twa(ACGIH:0.5ppm) / acgih / acgihTlv |
| 504-29-0 | 2-アミノピリジン | twa(ACGIH:0.5ppm) / acgih / acgihTlv |
| 120-94-5 | 1-メチル-2-ピロリドン | twa(ACGIH:1ppm) / acgih / acgihTlv |
| 121-82-4 | シクロトリメチレントリニトロアミン (RDX) | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 1303-28-2 | 五酸化二ヒ素 | twa(ACGIH:0.01mg/m³) / acgih / acgihTlv |
| 10101-39-0 | ケイ酸カルシウム | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 7727-54-0 | 過硫酸アンモニウム | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 12612-21-4 | ニッケル粉 | twa(ACGIH:1.5mg/m³) / acgih / acgihTlv |
| 1314-37-0 | 酸化イットリウム | twa(ACGIH:1mg/m³) / acgih / acgihTlv |
| 57-50-1 | スクロース（ショ糖） | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 7783-58-6 | ゲルマン（CAS: 7783-58-6） | twa(ACGIH:0.2ppm) / acgih / acgihTlv |
| 7783-80-4 | 六フッ化テルル | twa(ACGIH:0.02ppm) / acgih / acgihTlv |
| 16871-90-2 | ヘキサフルオロケイ酸カリウム | twa(ACGIH:2.5mg/m³) / acgih / acgihTlv |
| 7782-65-2 | ゲルマン | twa(ACGIH:0.2ppm) / acgih / acgihTlv |
| 7783-60-0 | 四フッ化硫黄 | acgih |
| 10025-67-9 | 二塩化二硫黄 | acgih |
| 10545-99-0 | 二塩化硫黄 | acgih |
| 7719-09-7 | 塩化チオニル | acgih |
| 10101-41-4 | 硫酸カルシウム二水和物（石膏） | twa(ACGIH:10mg/m³) / acgih / acgihTlv |
| 76-87-9 | 水酸化トリフェニル錫 | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 900-95-8 | 酢酸トリフェニル錫 | twa(ACGIH:0.1mg/m³) / acgih / acgihTlv |
| 513-77-9 | 炭酸バリウム | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 10361-37-2 | 塩化バリウム | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 7727-43-7 | 硫酸バリウム | twa(ACGIH:5mg/m³) / acgih / acgihTlv |
| 11097-69-1 | Aroclor 1254 | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 5283-67-0 | アジ化ナトリウム（CAS: 5283-67-0） | acgih |
| 26628-22-8 | アジ化ナトリウム | acgih |
| 96-18-4 | 1,2,3-トリクロロプロパン | twa(ACGIH:10ppm) / acgih / acgihTlv |
| 556-52-5 | 2,3-エポキシ-1-プロパノール（グリシドール） | twa(ACGIH:0.5ppm) / jsoh / acgih / jsohOel / acgihTlv |
| 2426-08-6 | ノルマル-ブチル-2,3-エポキシプロピルエーテル | twa(ACGIH:3ppm) / acgih / acgihTlv |
| 100-63-0 | フェニルヒドラジン | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 106-91-2 | メタクリル酸2,3-エポキシプロピル（グリシジルメタクリレート） | twa(ACGIH:0.2ppm) / acgih / acgihTlv |
| 7790-80-9 | カドミウム及びその化合物（塩化カドミウム） | twa(ACGIH:0.01mg/m³) / acgih / acgihTlv |
| 106-93-4 | 1,2-ジブロモエタン（EDB） | twa(ACGIH:0.05ppm) / acgih / acgihTlv |
| 593-60-2 | ブロモエチレン（塩化ビニルブロモ） | twa(ACGIH:0.5ppm) / acgih / acgihTlv |
| 64-67-5 | 硫酸ジエチル | twa(ACGIH:0.05ppm) / acgih / acgihTlv |
| 77-78-1 | 硫酸ジメチル | twa(ACGIH:0.1ppm) / acgih / acgihTlv |
| 79-46-9 | 2-ニトロプロパン | twa(ACGIH:10ppm) / acgih / acgihTlv |
| 116-14-3 | テトラフルオロエチレン | twa(ACGIH:2ppm) / acgih / acgihTlv |
| 75-02-5 | フッ化ビニル | twa(ACGIH:1ppm) / acgih / acgihTlv |
| 334-88-3 | ジアゾメタン | twa(ACGIH:0.2ppm) / acgih / acgihTlv |
| 7803-57-8 | ヒドラジン一水和物 | twa(ACGIH:0.01ppm) / acgih / acgihTlv |
| 540-73-8 | 1,1-ジメチルヒドラジン（CAS: 540-73-8） | twa(ACGIH:0.01ppm) / acgih / acgihTlv |
| 13510-89-9 | アンチモン及びその化合物（三酸化アンチモン） | twa(ACGIH:0.5mg/m³) / acgih / acgihTlv |
| 95-69-2 | 4-クロロ-2-メチルアニリン | twa(ACGIH:0.01ppm) / acgih / acgihTlv |
| 98-56-6 | パラ-クロロトリフルオロメチルベンゼン | twa(ACGIH:100ppm) / acgih / acgihTlv |

## 参照リンク (UI/APIから案内)

- ACGIH 公式: https://www.acgih.org/tlv-bei-guidelines/
- JSOH 公式: https://www.sanei.or.jp/topics/recommendation.html
