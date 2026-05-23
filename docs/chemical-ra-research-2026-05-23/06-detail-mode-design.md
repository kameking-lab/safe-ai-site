# 06: 詳細判定モード設計

作成日: 2026-05-23
目的: 1枚紙では収まらない条件入力に応じて、リスクレベルを動的変動させる詳細判定モードの設計。

---

## 1. ユーザーシナリオ

> 1枚紙RAで「III: 要改善」と出た。局所排気装置を追加・防毒マスクを高性能化したら、どう変わるか？

詳細モードは「対策をシミュレーション」する機能。**対策の効果を可視化することで、改善投資の意思決定を支援**。

## 2. 入力項目（拡張）

CREATE-SIMPLE互換の3項目に加え、以下を追加:

### 2.1 取扱量・物量
- 取扱量: g/日 または kg/日 / L/日（自由入力 + ガイド）
- 1回あたりの取扱時間: 分（連続/間欠を選択）
- 1日の作業回数

### 2.2 換気・隔離
- 換気形態: 換気なし / 全体換気 / 局所排気 / 密閉系 / 屋外
- 局所排気の制御風速: m/s（任意）
- フード形態: 外付け / 囲い / プッシュプル
- 屋内/屋外、天井高、室容積（任意・上級モード）

### 2.3 作業形態
- 開放系 / 半閉鎖系 / 完全閉鎖系
- 噴霧・刷毛塗り・浸漬・ピペット移し替え 等の操作種別
- 加熱の有無、温度

### 2.4 保護具レベル
- 呼吸用保護具: なし / 防塵DS1 / DS2 / DS3 / 防毒マスク（吸収缶種別）/ 送気マスク / 自給式呼吸器
- 手袋: なし / 一般作業手袋 / 耐溶剤手袋 / 耐酸/耐アルカリ / 二重手袋
- 保護衣: なし / 一般作業着 / 化学防護服Class○
- 保護眼鏡: なし / 一般 / 化学用ゴーグル / フェイスシールド
- 各保護具の保護係数（APF/PF）を反映

### 2.5 併用物質（複合曝露）
- 物質を複数選択可能
- 加算法（Σ Ci/TLVi）でリスク補正
- 相乗作用の警告（既知ペア）

### 2.6 作業者属性
- 熟練度: 新人 / 経験者 / 熟練（任意）
- 健康状態: 妊婦・既往症の選択（プライバシー配慮、ローカルのみ保存）
- 作業者数

## 3. 判定ロジックの拡張

### 3.1 ばく露濃度推定の高精度化

CREATE-SIMPLE互換（簡易）と詳細（精密）の2モードを切替:

**簡易モード（既存）:**
```
exposure = VENTILATION_FACTOR * AMOUNT_FACTOR * (duration/8)
```

**詳細モード（新規）:**
```
気化速度(g/h) = f(取扱量, 蒸気圧, 温度, 表面積, 気流)
換気除去 = ACH(回/h) × 室容積(m³) または 局所排気流量(m³/min)
推定ばく露濃度 = 気化速度 / 換気除去
PPE 補正後 = 推定ばく露濃度 / APF
比較 = PPE 補正後 ÷ 8時間基準値
```

ECETOC-TRA Tier 1 を参考にしたアルゴリズム。**完全実装は重いので、Phase 3 では簡易係数表で開始**。

### 3.2 経皮・経口・環境・火災爆発の独立判定

各経路の判定式:

| 経路 | 入力 | 判定 |
|------|------|------|
| 吸入 | 換気・取扱量・時間・APF | 8h基準値比 |
| 経皮 | 接触面積・接触時間・PPE・皮膚障害指定 | 区分A/B/C |
| 経口 | 飲食/喫煙可能性・手洗い設備 | LD50 区分 |
| 環境 | 排出経路・PRTR対象・水生毒性 | GHS環境区分 |
| 火災爆発 | 引火点・取扱温度・着火源 | 危険度区分 |

総合は5経路の **最大値**。1枚紙には総合と内訳を併記。

### 3.3 対策効果の可視化（差分表示）

```
[現状] 局所排気なし + 防毒マスクなし + 取扱量 5L/日
  → 推定ばく露 ○○ ppm / 基準値比 ○.○○ → IV: 直ちに改善

[改善案A] 局所排気導入 + DS2マスク
  → 推定ばく露 ○○ ppm / 基準値比 ○.○○ → II: 要注意 (▼ 2段階低減)

[改善案B] 取扱量を 5→1L/日 + 全体換気強化
  → 推定ばく露 ○○ ppm / 基準値比 ○.○○ → III: 要改善 (▼ 1段階低減)
```

「対策提案」ボタンで複数案を比較可能に。

### 3.4 法令遵守チェックリストの自動生成

物質と作業条件から、適用法令の遵守項目を自動展開:

```
☑ 安衛則 第577条の2 (濃度基準値以下とすること)
☑ 有機則 第5条 (発散源対策)
☐ 有機則 第28条 (作業環境測定 6か月以内ごと)
☐ 有機則 第29条 (健康診断 6か月以内ごと)
☐ 有機則 第32条 (有機溶剤作業主任者の選任)
☐ 安衛法 第57条 (表示)
☐ 安衛法 第57条の2 (SDS交付)
```

- チェック状態は localStorage に保存
- PDF 出力時にチェック状態を反映

## 4. CREATE-SIMPLE 互換モードの設置

オーナー判断必須事項（`09-owner-decisions.md`）に明記したが、設計案:

- UI上にトグル「行政提出向け（CREATE-SIMPLE互換） / 詳細判定」
- 互換モードでは詳細入力欄をグレーアウト、3係数のみ表示
- 判定アルゴリズムも互換式に固定
- 「行政提出向け」モードで生成したPDFには「CREATE-SIMPLE v3.0 互換式に基づく」と明記

## 5. UIフロー設計

```
[Step 1] 物質選択
  化学物質DB から検索 → MergedChemical 選択
  もしくは新規入力（CAS手入力 → 該当なしの場合は手作業データ追加）

[Step 2] 業種テンプレ選択（任意）
  塗装 / 防水 / 解体 / 地盤改良 / カスタム
  → 標準条件を自動入力

[Step 3] 作業条件入力
  簡易（CREATE-SIMPLE互換）/ 詳細 のタブ切替
  詳細モードでは 2.1〜2.6 の項目を展開

[Step 4] 判定結果
  5経路の I-IV を内訳と共に表示
  リスク判定理由（自然言語、Gemini 生成）

[Step 5] 対策シミュレーション
  「対策を追加してみる」ボタン → 改善案A/Bを生成
  差分表示

[Step 6] 1枚紙化
  「1枚紙RAとして出力」→ /chemical-ra/one-page に遷移
  作業条件・判定結果・対策後の値が引き継がれる

[Step 7] 法令チェックリスト
  自動生成 → ユーザーがチェック → PDF出力
```

## 6. データ構造（型定義案）

```ts
type RaDetailInput = {
  substance: { cas: string; name: string };
  workEnvironment: {
    ventilation: 'none' | 'general' | 'local' | 'sealed' | 'outdoor';
    localExhaustVelocity?: number;  // m/s
    hoodType?: 'external' | 'enclosure' | 'pushPull';
    roomVolume?: number;  // m³
    isOutdoor: boolean;
  };
  handling: {
    amountPerDay: number;  // g or L
    amountUnit: 'g' | 'kg' | 'L' | 'mL';
    durationMinutes: number;
    frequency: 'continuous' | 'intermittent';
    operations: ('spray' | 'brush' | 'dip' | 'pipette' | 'transfer')[];
    temperature?: number;  // C
  };
  ppe: {
    respirator?: { type: string; apf: number };
    gloves?: { type: string; rating: string };
    coverall?: { type: string; class: string };
    eyewear?: { type: string };
  };
  coExposures?: { cas: string; name: string }[];
  worker?: {
    skillLevel?: 'novice' | 'experienced' | 'expert';
    specialConditions?: ('pregnant' | 'preExisting')[];
    count?: number;
  };
  mode: 'createSimpleCompatible' | 'detail';
  industryTemplate?: 'painting' | 'waterproofing' | 'demolition' | 'soilImprovement';
};

type RaDetailResult = {
  routes: {
    inhalation: RouteResult;
    skin: RouteResult;
    ingestion: RouteResult;
    environment: RouteResult;
    fireExplosion: RouteResult;
  };
  overallLevel: 'I' | 'II' | 'III' | 'IV';
  exposureRatio: number;
  rationale: string[];
  improvements: ImprovementProposal[];
  legalChecklist: LegalCheckItem[];
};

type RouteResult = {
  level: 'I' | 'II' | 'III' | 'IV';
  ratio: number;
  factors: Record<string, number>;
  notes: string[];
};

type ImprovementProposal = {
  id: string;
  name: string;
  changes: Partial<RaDetailInput>;
  resultLevel: 'I' | 'II' | 'III' | 'IV';
  resultRatio: number;
  delta: number;
  cost?: 'low' | 'medium' | 'high';
};

type LegalCheckItem = {
  law: string;
  article: string;
  description: string;
  required: boolean;
  url?: string;
};
```

## 7. 業種テンプレートの初期スコープ

Phase 3 に4業種を実装:

| テンプレ | 想定物質トップ5 | 標準作業条件 |
|---------|-------------|----------|
| 塗装 | トルエン / キシレン / 酢酸エチル / MEK / イソプロピルアルコール | 開放系、刷毛・吹付、屋内/屋外切替、4時間/日 |
| 防水 | アスファルト乳剤 / ウレタン / エポキシ / 有機溶剤系プライマー / シンナー | 屋上・地下、施工面積入力、6時間/日 |
| 解体 | アスベスト / PCB / 鉛 / 結晶質シリカ / ダイオキシン類 | 解体方式選択、湿潤化、隔離養生レベル、8時間/日 |
| 地盤改良 | セメント(六価クロム生成) / 水ガラス系 / アクリルアミド系 | 改良工法、土壌pH、注入量 |

将来追加候補: 製造業（金属加工油剤）、清掃業（業務用洗剤）、印刷業（インキ・洗浄剤）、塗料製造、化学プラント。

## 8. CREATE-SIMPLE 互換動作の保証

互換モード時の出力結果が CREATE-SIMPLE v3.0 と一致するか、以下でテスト:

- 既知の入力例 10件（厚労省例題）を入力 → 同じ I-IV 判定が出るか
- 整合性テストは vitest で自動化
- 不一致時は警告ログを出す

## 9. 性能要件

- 詳細判定の応答: 2秒以内（Gemini 呼び出し含む）
- 5経路独立判定はクライアント側でも算出可能なロジックに（オフライン PWA 対応の伏線）
- 対策シミュレーション: 各案 500ms 以内

## 10. テスト方針

- ユニットテスト（vitest）: `ra-engine.ts` の各係数計算
- 統合テスト: 既知物質×標準条件で I-IV が期待通り
- E2E（Playwright）: 入力→判定→1枚紙遷移→PDF出力
- 性能テスト: Lighthouse + Core Web Vitals
