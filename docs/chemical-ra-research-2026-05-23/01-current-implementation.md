# 01: 現状実装の完全把握

調査日: 2026-05-23
対象: `/chemical-database`、`/chemical-ra`、`/chemical-ra/product-search` および関連 lib/data。

---

## 1. ページ構成

| URL | ファイル | 行数 | 役割 |
|-----|---------|------|------|
| `/chemical-database` | `web/src/app/(main)/chemical-database/page.tsx` | 86 | 化学物質マスタ検索 (MHLW統合) |
| `/chemical-ra` | `web/src/app/(main)/chemical-ra/page.tsx` | 106 | 物質名入力→GHS/PPE/CREATE-SIMPLE I-IV判定 |
| `/chemical-ra/product-search` | `web/src/app/(main)/chemical-ra/product-search/page.tsx` | 68 | 製品名→構成成分→自動RA |
| `/guides/chemical-ra-create-simple` | (別途) | - | CREATE-SIMPLE 使い方ガイド (SEO動線) |
| `/equipment-finder` | (別途) | - | 化学物質 → 推奨保護具マッピング |

## 2. データ層（最重要）

### 2.1 `web/src/lib/mhlw-chemicals.ts` (579行)

統合チャネル本体。以下4カテゴリを CAS でマージし、`MergedChemical` 型に正規化:

- `carcinogenic`: がん原性物質（30年保存義務）
- `concentration`: 8時間濃度基準値（安衛則第577条の2）
- `skin`: 皮膚等障害化学物質
- `label_sds`: SDS交付義務物質（安衛法第57条・57条の2）

**エクスポート定数:** `MHLW_MERGED_CHEMICAL_COUNT` = 約 8,400（実値は ETL 結果に依存）

**主要関数:**
- `getAllMergedChemicals()` - 全件取得
- `mergeByCas(entries)` - CAS番号で重複除外、最長の物質名を採用
- `searchMergedChemicals(query, limit)` - スコアリング検索（CAS完全一致 100pt / 物質名完全 80pt / 部分 20pt / 別名 10pt）
- `findByCas(cas)` - CAS 直引き
- `getSupplementalInfo(cas)` - 50物質専門解説DBとのクロスリファレンス
- `regulatoryLabels(flags)` / `relatedLawTexts(flags)` - 規制ラベル・関連法令の自動引用
- `normalizeCas(v)` - 全角→半角、空白除去

**データ階層:** `MHLW告示177 > JSOH > ACGIH > 参考値`

### 2.2 `web/src/data/concentration-limits.json` (25,242行 / 約25MB)

濃度基準値マスタ (v2.0.0、2026-05-16生成)。**1,546 CAS 収録**。内訳:

- 251 CAS - MHLW 告示177 8h/STEL基準値
- 91 CAS - JSOH (日本産業衛生学会) OEL
- 502 CAS - ACGIH TLV
- 415 CAS - IARC発がん性分類

各レコード: `twa`, `stel`, `ceiling`（出典付き）, `carcinogenicity.iarc`, `jsoh.*`, `acgih.*`, `mhlwSdsUrl`, `source`, `iarcGroup`, `jsohOel`, `acgihTlv`。

### 2.3 `web/src/data/chemicals-mhlw/compact.json` (約1.1MB)

ETL `scripts/etl/fetch-concentration-limits.mjs` の出力。約1,046 MHLW エントリの CAS マージ済データ。生成日: 2026-05-16。

### 2.4 `web/src/data/mock/chemical-substances-db.ts` (1,097行)

50物質の専門家アノテーション付きDB（cs-001〜cs-050）。Opus 4.7 で 2026-05-17 監査済。

**型スキーマ（要点）:**
```ts
type ChemicalSubstance = {
  id: string;             // cs-001 ...
  name: string;           // 日本語名
  name_en?: string;
  cas: string;            // "71-43-2" or "—（混合物）"
  synonyms?: string[];
  categories: ChemicalCategory[]; // 特化物-1/2、有機溶剤、鉛、アスベスト、etc.
  oel?: string;
  oel_source?: OelSource[];
  skin_hazard: boolean;
  uses: string;
  health_effects: string;
  related_laws: string[];
  ghs?: string[];
  signal_word?: "Danger" | "Warning";
  h_statements?: string[];
  p_statements?: string[];
  iarc?: IarcGroup;
  sds_url?: string;
};
```

代表物質: ベンゼン、トルエン、キシレン、メタノール、エタノール、塩酸、硫酸、ホルムアルデヒド、等。

### 2.5 `web/src/lib/sds-fetcher.ts` (236行)

製品名 → 構成成分の逆引きDB。10製品PoC収録（KURE 5-56、IPA 99%、アセトン、トルエン、ラッカーシンナー、希硫酸、塩酸、アンモニア水、ホルマリン、ベンゼン）。

**型:**
```ts
type SdsComponent = { cas; name; contentPct; contentLabel? };
type SdsProduct = {
  id; productName; manufacturer; category; use;
  sdsRevised; sdsUrl?; components: SdsComponent[]; aliases?;
};
```

NITE-CHRIP連携はスタブ実装（`null` 返却で内部DB フォールバック）。

### 2.6 `web/src/lib/chemical-equipment-mapping.ts` (220行)

26+ CAS → 推奨PPEプロファイル。型:
```ts
type ChemicalEquipmentProfile = {
  name; aliases; hazards;
  recommendedCategories;          // gas-mask / gloves / goggles / protective-clothing
  gasMaskAbsorber?: "有機ガス" | "ハロゲン" | "硫化水素" | "アンモニア";
  rationale;
};
```

`/equipment-finder` から呼ばれて、物質名既知時に PPE を文脈推奨。

### 2.7 `web/src/lib/ra-engine.ts` (約100行)

スタンドアロン CREATE-SIMPLE計算エンジン。`/api/chemical-ra` と同じロジックを product-search パイプラインで再利用。

## 3. RA ロジック実装の中核

### `/api/chemical-ra/route.ts` (463行)

**処理フロー:**
1. リクエスト受領 (chemicalName / casNumber / ventilation / amount / durationHours / workContent)
2. MHLW データ先行取得（findByCas → searchMergedChemicals フォールバック）
3. `buildCreateSimpleAssessment()` で I-IV 判定
4. `buildRelatedHazards()` で規制ラベル・関連法令を自動付加
5. Gemini API 呼び出し（gemini-2.5-flash）→ JSONブロック抽出
6. 失敗時は MHLW フォールバック応答
7. API キー未設定時は DEMO_RESPONSE (トルエン) + 関連ハザード

**CREATE-SIMPLE 計算式（実装そのまま）:**
```
baseExposure  = VENTILATION_FACTOR[v] * AMOUNT_FACTOR[a] * (duration / 8)
estimatedConc = baseExposure * 100              // 相対指標
ratio         = estimatedConc / max(limit, 0.0001)
isCarc        ? adj = ratio * 3 : adj = ratio
Level: adj < 0.1 → I, < 0.5 → II, < 1.0 → III, else IV
```

**係数:**
- VENTILATION: none=3.0, general=1.0, local=0.3
- AMOUNT: small=0.3, medium=1.0, large=3.0
- 限界値不明時: 50ppm（保守的、IV を不当に出さない）

**応答型:** `ChemicalRaResponse` = GHS hazards + PPE + safetyMeasures(優先度1-3) + emergencyMeasures + regulatoryNotes + createSimple + relatedHazards + aiStatus("ok"/"apikey_missing"/"ai_failed"/"demo")。

## 4. UI コンポーネント

| コンポーネント | 配置 | 役割 |
|--------------|------|------|
| `ChemicalDatabaseClient` | `components/chemical-database-client.tsx` | 統合DB検索UI |
| `ChemicalRaPanel` | `components/chemical-ra-panel.tsx` (270+行) | RA メインフォーム |
| `ChemicalRaExtras` | `components/chemical-ra-extras.tsx` (60+行) | localStorage の物質履歴 (`chemical-ra:site-list-v1`) |
| `MhlwChemicalSelector` | `components/mhlw-chemical-selector.tsx` | オートコンプリート |
| `MhlwChemicalInfoCard` | `components/mhlw-chemical-info-card.tsx` | 単一物質情報カード |
| `ProductSearchPanel` | `components/product-search-panel.tsx` (150+行) | 製品名→自動RAパイプライン |

## 5. API ルート

| ルート | メソッド | 入力 | 出力 |
|-------|---------|------|------|
| `/api/chemical-ra` | POST | chemicalName, casNumber?, ventilation?, amount?, durationHours?, workContent? | ChemicalRaResponse（Gemini + MHLW フォールバック） |
| `/api/sds/search` | POST | productName, manufacturer? | SDS hits + source（NITE スタブ + 内部DB） |
| `/api/ra/auto` | POST | SdsProduct | 構成成分ごとの RA + 全体判定 |

## 6. 物質マスタの出処（データソース）

| ソース | 取得手段 | 件数 | 状態 |
|--------|---------|------|------|
| MHLW 皮膚等障害化学物質 | ETL `fetch-concentration-limits.mjs` | (含) | ✅ 統合済 |
| MHLW SDS交付義務物質 | 同上 | (含) | ✅ 統合済 |
| MHLW がん原性物質 | 同上 | (含) | ✅ 統合済 |
| MHLW 告示177 濃度基準値 | 同上 | 251 | ✅ 統合済 |
| JSOH (日本産業衛生学会) | 同上 | 91 | ✅ 統合済 |
| ACGIH TLV | 同上 | 502 | ✅ 統合済 |
| IARC 発がん性 | 同上 | 415 | ✅ 統合済 |
| 50物質専門解説 | 手動アノテーション | 50 | ✅ 統合済 |
| 10製品 SDS | 手動収録 | 10 | ✅ PoC |
| **NITE-CHRIP GHS** | (スタブ) | 0 | ❌ 未統合（約3,300 物質） |
| **PRTR制対象物質** | 未取込 | 0 | ❌ 未統合（462 物質） |
| **化審法 第一種/第二種** | 未取込 | 0 | ❌ 未統合 |
| **毒劇法 対象** | 未取込 | 0 | ❌ 未統合 |
| **メーカー公開SDS（自動収集）** | 未実装 | 0 | ❌ 設計未着手 |

## 7. 検索・判定フロー（現状）

```
[ユーザー入力]
   ├─ /chemical-database で物質名/CAS検索
   │   └─ searchMergedChemicals() → MergedChemical[] 表示
   │
   ├─ /chemical-ra で物質名+作業条件入力
   │   └─ POST /api/chemical-ra
   │       ├─ 1) findByCas / searchMergedChemicals で MHLW データ取得
   │       ├─ 2) buildCreateSimpleAssessment() → I-IV 判定
   │       ├─ 3) buildRelatedHazards() → 規制ラベル自動付加
   │       ├─ 4) Gemini で GHS/PPE/緊急措置 生成
   │       │   └─ 失敗時 buildMhlwFallbackResponse()
   │       └─ 5) sortMeasuresByPriority() で工学→管理→保護具順
   │
   └─ /chemical-ra/product-search で製品名入力
       └─ POST /api/sds/search → 構成成分取得
           └─ POST /api/ra/auto → 各成分の自動RA
```

## 8. 既存ドキュメント

`docs/` 配下に化学物質RA専用の設計書はなし。関連:
- `docs/mhlw-integration-plan.md` - MHLW データ統合戦略 (一般)
- `docs/investigation-rag-prod-zero.md` - RAG ゼロヒット調査 (一般)
- `docs/rag-improvements-2026-05-17.md` - RAG 改善

→ **本ドキュメント群 (`docs/chemical-ra-research-2026-05-23/`) が化学物質RAの初の専用設計資料**となる。

## 9. 残存ギャップ（実装観点）

- ❌ 1枚紙RA UI（A4縦想定）= 現状はカード型表示で印刷適性低い
- ❌ 業種テンプレート（塗装/解体/防水/地盤改良）= 単一物質想定のみ
- ❌ 複合曝露（混合物・併用物質）の補正= ラッカーシンナー等で限界
- ❌ 経皮・経口・環境・火災爆発の独立判定軸 = 吸入のみ
- ❌ PDF出力 = HTML印刷依存
- ❌ NITE-CHRIP 等の外部物質マスタ統合 = 8,400 で頭打ち
- ❌ SDS 自動取込み = メーカーSDS のURL貼付のみ
- ❌ 法令条文への直リンク = 規制ラベル文字列のみで条文番号は文字列内
- ❌ 関連リーフレット連携 = 未実装
- ❌ 教育コンテンツ・KY/日誌からの遷移 = 一部実装、用紙ファースト型ではない

これらが Phase 1-5 の対象。
