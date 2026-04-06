# クマ目撃情報 データソース調査結果

調査日: 2026-04-07（更新）

## 取得可能なデータソース

### 1. 秋田県 CKAN「クマダス」✅ (CC BY 4.0)
- **URL**: https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003
- **API**: `https://ckan.pref.akita.lg.jp/api/3/action/datastore_search?resource_id=0678f9b3-4bf7-4212-9c0e-c0cb9b09b3cf`
- **形式**: JSON / CSV / XML (CKAN DataStore API)
- **更新**: 月次（2022年〜）
- **ライセンス**: CC BY 4.0（帰属表示で商用利用可）
- **対応動物**: ツキノワグマ、イノシシ、ニホンジカ
- **実装**: APIルートでサーバーサイドfetch → 1時間キャッシュ

### 2. 東京都「TOKYOくまっぷ」✅
- **URL**: https://www.kankyo.metro.tokyo.lg.jp/nature/animals_plants/bear/data
- **形式**: CSV ダウンロード
- **更新**: 随時（FY2021〜FY2025）
- **エリア**: 奥多摩・高尾エリア
- **件数**: 約211件/年

### 3. 環境省 生物多様性センター（生息域分布）✅
- **URL**: http://gis.biodic.go.jp/webgis/sc-023.html
- **形式**: Shapefile (GIS)
- **内容**: 生息域・分布データ（個別目撃情報ではない）
- **更新**: FY2016〜2018調査、2019年公開

---

## 要スクレイピング / 取得困難なデータソース

### 4. 富山県「クマっぷ」❌ (ArcGIS地図のみ)
- **URL**: https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html
- **形式**: ArcGIS Webマップ埋め込み（ダウンロード不可）
- **データ**: 2015年（平成27年）〜現在、リアルタイム更新
- **対応**: 手動データ化（代表的な目撃情報を手入力）
- **オープンデータポータル**: https://opendata.pref.toyama.jp/ にクマデータなし

### 5. 環境省（国全体統計）❌ (PDF only)
- **URL**: https://www.env.go.jp/nature/choju/effort/effort12/effort12.html
- **形式**: PDF（都道府県別年次集計）
- **更新**: 四半期（最新: FY2025）
- **対応**: PDFパース必要

### 6. くまっぷ（Xenon社）⚠️ (テナントAPI)
- **URL**: https://kumap-xenon.web.app/
- **形式**: REST API（OpenAPI）
- **アクセス**: テナント登録が必要
- **対応予定**: Xenon社に問い合わせ中

### 7. kumamap.com ⚠️ (公開API無し)
- **URL**: https://kumamap.com/en
- **形式**: Firebaseバックエンド（非公開）
- **件数**: 129,198件（全国、2x/日更新）
- **対応**: 公開API待ち

---

## 対応予定（データ整備中）自治体

| 都道府県 | URL | 形式 | 状況 |
|---------|-----|------|------|
| 富山県 | https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html | ArcGIS | 手動データ化中 |
| 石川県 | https://www.pref.ishikawa.lg.jp/sizen/choju/kuma/ | HTML | 対応予定 |
| 長野県 | https://www.pref.nagano.lg.jp/yasei/documents/ | PDF | 対応予定 |
| 新潟県 | https://www.pref.niigata.lg.jp/sec/yasei/kumainfo.html | HTML | 対応予定 |
| 岩手県 | https://www.pref.iwate.jp/nature/chikujuhozen/kumajouhoumap/ | 地図 | 対応予定 |
| 山形県 | https://www.pref.yamagata.jp/090010/kurashi/kankyoshizen/shizen/choju/kuma/ | HTML | 対応予定 |
| 福島県 | https://www.pref.fukushima.lg.jp/sec/16025b/kuma.html | HTML | 対応予定 |
| 青森県 | https://www.pref.aomori.lg.jp/soshiki/kankyo/shizenhogo/kuma-jouhou.html | HTML | 対応予定 |
| 北海道（ヒグマ） | https://www.pref.hokkaido.lg.jp/ks/skn/higuma/ | PDF/HTML | 対応予定 |

---

## データ取得方針

1. **秋田県**: CKAN API → サーバーサイドfetch（実装済み）
2. **富山県**: 公開情報から手動データ化（2024年目撃情報を市町村単位で収録）
3. **その他**: モックデータで表示、サイドパネルに「対応予定」として案内
4. **将来**: 環境省PDF → tabula-py でパース自動化

---

## 2026-04-07 追加調査結果（手動データ化 全5県）

### 実装済みデータ（web/src/data/bear-sightings-real.ts）

| 都道府県 | 件数 | 期間 | 出典 |
|---------|------|------|------|
| 富山県 | 20件 | 2024-04〜2025-08 | クマっぷ（富山県環境政策課） |
| 秋田県 | 12件 | 2024-04〜2025-06 | pref.akita.lg.jp / クマダス |
| 石川県 | 11件 | 2024-05〜2025-07 | pref.ishikawa.lg.jp R6・R7年目撃痕跡情報 |
| 長野県 | 12件 | 2024-04〜2025-07 | けものおと2（長野県林務部） |
| 新潟県 | 8件 | 2024-05〜2025-08 | にいがたクマ出没マップ（ArcGISダッシュボード） |
| **合計** | **63件** | | |

### 各県データ詳細

#### 富山県「クマっぷ」
- URL: https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html
- 形式: ArcGIS ダッシュボード（CSV非公開）
- 収録開始: 2015年（平成27年）
- 対応状況: 手動抽出・対応済み

#### 秋田県「クマダス」
- URL: https://kumadas.net/ / https://www.pref.akita.lg.jp/pages/archive/23295
- 形式: インタラクティブマップ + PDF（人身被害記録）
- R7年度出没警報発令中（例年比多数）
- 対応状況: 手動抽出・対応済み

#### 石川県 ツキノワグマ目撃痕跡情報
- URL: https://www.pref.ishikawa.lg.jp/sizen/kuma/r7mokugeki.html
- 形式: PDF + JPG位置図 + HTML表
- 年度別PDF取得可能（テキスト抽出要）
- 対応状況: 手動抽出・対応済み

#### 長野県「けものおと2」
- URL: https://www.pref.nagano.lg.jp/shinrin/sangyo/ringyo/choju/joho/kuma-map.html
- 形式: スマホアプリ + 月次PDF
- R7年度月別PDFあり（2026-04-03最終更新）
- 対応状況: 手動抽出・対応済み

#### 新潟県「にいがたクマ出没マップ」
- URL: https://www.pref.niigata.lg.jp/site/tyoujyutaisakusienn/1319666477308.html
- ArcGIS: https://www.arcgis.com/apps/dashboards/20b4d06fb3b34776959a4e69c7a8511a
- 形式: ArcGIS + **Excelダウンロード（R6年度）**
- **オープンデータ規約あり → 自動取込に最適**
- 対応状況: 手動抽出・対応済み

### 今後の拡充計画
- [ ] 新潟県Excelデータの自動取込（優先度: 高）
- [ ] 石川県PDFテキスト抽出の自動化
- [ ] 岐阜県・福井県の追加調査
- [ ] 環境省統計グラフの可視化追加（全国年次推移）
